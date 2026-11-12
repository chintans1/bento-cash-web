import { type NormalizedAccount, sumBalances } from "@/lib/account-utils";
import {
  getInvestmentBucket,
  INVESTMENT_GROUPS,
  isInvestmentKind,
  OTHER_INVESTMENTS,
} from "@/lib/investment-utils";

export const ACCOUNT_GROUPS = [
  { id: "checking", label: "Checking", color: "var(--cat-5)" },
  { id: "savings", label: "Savings", color: "var(--cat-4)" },
  { id: "other-cash", label: "Other cash", color: "var(--bento-subtle)" },
  ...INVESTMENT_GROUPS,
  { id: "other-assets", label: "Other assets", color: "var(--cat-3)" },
  { id: "credit", label: "Credit cards", color: "var(--cat-1)" },
  { id: "loans", label: "Loans", color: "var(--cat-2)" },
  {
    id: "other-liabilities",
    label: "Other liabilities",
    color: "var(--cat-7)",
  },
] as const;

export type AccountGroupId = (typeof ACCOUNT_GROUPS)[number]["id"];
export type AccountGrouping = "type" | "institution";

export function getAccountGroup(
  account: Pick<NormalizedAccount, "name" | "subtype" | "isLiability"> & {
    type: string;
  }
): AccountGroupId {
  if (account.isLiability) {
    if (account.type === "credit") return "credit";
    if (account.type === "loan") return "loans";
    return "other-liabilities";
  }
  if (isInvestmentKind(account.type, account.subtype)) {
    return (getInvestmentBucket(account) ?? OTHER_INVESTMENTS).id;
  }
  if (account.type.toLowerCase() === "cash") {
    const subtype = account.subtype?.trim().toLowerCase();
    if (subtype === "checking" || subtype === "savings") return subtype;
    return "other-cash";
  }
  return "other-assets";
}

/** A liability reduces an institution's total, just as it reduces net worth. */
export function accountNetBalance(accounts: NormalizedAccount[]): number {
  return accounts.reduce(
    (total, account) =>
      total +
      (account.balanceValid
        ? account.toBase * (account.isLiability ? -1 : 1)
        : 0),
    0
  );
}

function accountInstitution(account: NormalizedAccount): string {
  return account.institution?.trim() || "Other";
}

function accountRowOrder(
  account: NormalizedAccount,
  group: AccountGroupId
): number {
  if (group === "checking" || group === "savings" || group === "other-cash")
    return 0;
  if (group === "credit") return 1;
  if (group === "taxable-brokerage") {
    return account.subtype?.trim().toLowerCase() === "brokerage" ? 2 : 3;
  }
  if (!INVESTMENT_GROUPS.some(({ id }) => id === group)) return 7;

  const retirementPlan = /\b(401\s*\(?k|ira)\b/i;
  const plan =
    retirementPlan.exec(account.subtype ?? "") ??
    retirementPlan.exec(account.name);
  if (plan) return plan[1].toLowerCase() === "ira" ? 5 : 4;
  if (
    group === "other-investments" &&
    account.type.toLowerCase() === "brokerage"
  )
    return 2;
  return 6;
}

export function groupAccounts(
  accounts: NormalizedAccount[],
  by: AccountGrouping
) {
  type Row = { account: NormalizedAccount; institution: string; order: number };
  const groups = new Map<string, Row[]>();
  for (const account of accounts) {
    const group = getAccountGroup(account);
    const institution = accountInstitution(account);
    const key = by === "type" ? group : institution;
    const row = {
      account,
      institution,
      order: accountRowOrder(account, group),
    };
    const rows = groups.get(key);
    if (rows) rows.push(row);
    else groups.set(key, [row]);
  }

  function summarize(id: string, label: string, rows: Row[]) {
    const items = rows
      .sort(
        (a, b) =>
          (by === "type" ? a.institution.localeCompare(b.institution) : 0) ||
          a.order - b.order ||
          a.account.name.localeCompare(b.account.name)
      )
      .map(({ account }) => account);
    return {
      id,
      label,
      accounts: items,
      total:
        by === "institution" ? accountNetBalance(items) : sumBalances(items),
      isLiability:
        by === "type" && items.every((account) => account.isLiability),
    };
  }

  if (by === "type") {
    return ACCOUNT_GROUPS.flatMap(({ id, label }) => {
      const rows = groups.get(id);
      return rows ? [summarize(id, label, rows)] : [];
    });
  }
  return Array.from(groups, ([id, rows]) => summarize(id, id, rows)).sort(
    (a, b) => a.label.localeCompare(b.label)
  );
}

/** Closed and invalid balances never contribute to composition. */
function balanceComposition(
  accounts: NormalizedAccount[],
  isLiability: boolean
) {
  const totals = new Map<AccountGroupId, number>();
  for (const account of accounts) {
    if (
      account.status === "closed" ||
      !account.balanceValid ||
      account.isLiability !== isLiability
    )
      continue;
    const group = getAccountGroup(account);
    totals.set(group, (totals.get(group) ?? 0) + account.toBase);
  }
  const rows = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    amount: totals.get(group.id) ?? 0,
  })).filter((group) => group.amount > 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row) => ({ ...row, percent: (row.amount / total) * 100 }));
}

export function assetComposition(accounts: NormalizedAccount[]) {
  return balanceComposition(accounts, false);
}

export function liabilityComposition(accounts: NormalizedAccount[]) {
  return balanceComposition(accounts, true).sort((a, b) => b.amount - a.amount);
}
