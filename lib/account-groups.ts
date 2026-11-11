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

function institutionAccountOrder(account: NormalizedAccount): number {
  const group = getAccountGroup(account);
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
  const groups = new Map<string, NormalizedAccount[]>();
  for (const account of accounts) {
    const key =
      by === "type"
        ? getAccountGroup(account)
        : account.institution?.trim() || "Other";
    groups.set(key, [...(groups.get(key) ?? []), account]);
  }

  return Array.from(groups, ([id, items]) => {
    const definition = ACCOUNT_GROUPS.find((group) => group.id === id);
    return {
      id,
      label: by === "type" ? definition!.label : id,
      accounts: items.sort((a, b) => {
        const order =
          by === "institution"
            ? institutionAccountOrder(a) - institutionAccountOrder(b)
            : 0;
        return order || a.name.localeCompare(b.name);
      }),
      total:
        by === "institution" ? accountNetBalance(items) : sumBalances(items),
      isLiability:
        by === "type" && items.every((account) => account.isLiability),
    };
  }).sort((a, b) =>
    by === "type"
      ? ACCOUNT_GROUPS.findIndex((group) => group.id === a.id) -
        ACCOUNT_GROUPS.findIndex((group) => group.id === b.id)
      : a.label.localeCompare(b.label)
  );
}

/** Closed and invalid balances never contribute to composition. */
export function assetComposition(accounts: NormalizedAccount[]) {
  const assets = accounts.filter(
    (account) =>
      account.status !== "closed" &&
      account.balanceValid &&
      !account.isLiability
  );
  const rows = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    amount: sumBalances(
      assets.filter((account) => getAccountGroup(account) === group.id)
    ),
  })).filter((group) => group.amount > 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row) => ({ ...row, percent: (row.amount / total) * 100 }));
}
