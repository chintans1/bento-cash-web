import {
  accountKey,
  isLiabilityType,
  type NetWorth,
  type NormalizedAccount,
} from "../account-utils";
import type { BalanceHistoryAccount } from "./client";

/** A month's net worth, in the same shape as today's — see `computeNetWorth`. */
export type NetWorthPoint = NetWorth & {
  /** YYYY-MM. */
  month: string;
};

/**
 * Which side of the ledger a history entry belongs on.
 *
 * The history response identifies an account but not its type, so manual and
 * Plaid sources are looked up in the accounts list. Crypto is always an asset.
 * A deleted account carries its own archived type — that's the only record of
 * it left, and dropping it would leave a hole in every month it was open.
 */
function isLiabilitySource(
  source: BalanceHistoryAccount["source"],
  byId: Map<string, boolean>
): boolean {
  switch (source.type) {
    case "manual":
      return byId.get(accountKey("manual", source.manual_account_id)) ?? false;
    case "plaid":
      return byId.get(accountKey("plaid", source.plaid_account_id)) ?? false;
    case "deleted":
      return source.account_type ? isLiabilityType(source.account_type) : false;
    default:
      return false;
  }
}

/**
 * Month-end net worth for every month LM has balance history for, ascending.
 *
 * Balances are summed in `to_base` — the user's primary currency — the same
 * basis `computeNetWorth` uses for today's figure.
 *
 * Two rules about missing months, because LM omits months an account has no
 * data for. A gap _inside_ an account's range carries the last known balance
 * forward: the account existed, it just wasn't snapshotted, and treating it as
 * zero would draw a cliff that never happened. A month _outside_ that range is
 * genuinely absent — the account didn't exist yet, or stopped being tracked —
 * so it contributes nothing.
 *
 * Closed accounts are not filtered out the way `computeNetWorth` filters them
 * from today's total: their balance was real in the months it was recorded,
 * and dropping it would rewrite history every time an account is closed.
 */
export function computeNetWorthHistory(
  history: BalanceHistoryAccount[],
  accounts: NormalizedAccount[]
): NetWorthPoint[] {
  const byId = new Map(accounts.map((a) => [a.id, a.isLiability]));

  const months = Array.from(
    new Set(history.flatMap((a) => a.balances.map((b) => b.month)))
  ).sort();

  const assets = new Map<string, number>();
  const liabilities = new Map<string, number>();

  for (const account of history) {
    const byMonth = new Map(account.balances.map((b) => [b.month, b.to_base]));
    const recorded = Array.from(byMonth.keys()).sort();
    if (recorded.length === 0) continue;

    const side = isLiabilitySource(account.source, byId) ? liabilities : assets;
    const first = recorded[0];
    const last = recorded[recorded.length - 1];

    let carried = 0;
    for (const month of months) {
      if (month < first || month > last) continue;
      carried = byMonth.get(month) ?? carried;
      side.set(month, (side.get(month) ?? 0) + carried);
    }
  }

  return months.map((month) => {
    const totalAssets = assets.get(month) ?? 0;
    const totalLiabilities = liabilities.get(month) ?? 0;
    return {
      month,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  });
}

/**
 * The `count` months ending at `endMonth`, for the hero's trailing window.
 *
 * Months after `endMonth` are dropped rather than the window being centred, so
 * stepping back to March shows the year up to March — not a chart that already
 * knows what happens next.
 */
export function trailingMonths(
  points: NetWorthPoint[],
  endMonth: string,
  count: number
): NetWorthPoint[] {
  return points.filter((p) => p.month <= endMonth).slice(-count);
}
