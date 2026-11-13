import { UNCATEGORIZED_ID, type CategoryInfo } from "./categories";
import type { AlignedSummaryResponse, Transaction } from "./client";
import { filterIncomeTxs, filterSpendTransactions } from "./analytics";
import type { CategoryGroupEntry } from "./analytics";
import type { ReportPeriod } from "./reports";

export function reportableTransactions(transactions: Transaction[]) {
  return transactions.filter(isReportableTransaction);
}

export function isReportableTransaction(tx: Transaction) {
  return (
    !tx.is_pending &&
    tx.status !== "delete_pending" &&
    !tx.is_split_parent &&
    tx.group_parent_id == null
  );
}

type Breakdown = {
  key: string;
  name: string;
  categoryId?: number;
  payee?: string;
  amount: number;
  previous: number;
  months: Map<string, number>;
};

function addBreakdownAmount(
  row: Breakdown,
  field: "amount" | "previous",
  date: string,
  amount: number
) {
  row[field] += amount;
  const month = date.slice(0, 7);
  row.months.set(month, (row.months.get(month) ?? 0) + amount);
}

export function compareSpending(
  current: Transaction[],
  previous: Transaction[],
  categories: Map<number, CategoryInfo>,
  group: "category" | "merchant"
) {
  const rows = new Map<string, Breakdown>();
  function add(transactions: Transaction[], field: "amount" | "previous") {
    for (const tx of filterSpendTransactions(
      reportableTransactions(transactions),
      categories
    )) {
      const categoryId = tx.category_id ?? UNCATEGORIZED_ID;
      const payee = tx.payee?.trim() ?? "";
      const name =
        group === "category"
          ? (categories.get(categoryId)?.name ?? "Uncategorized")
          : payee || "Unknown merchant";
      const key =
        group === "category" ? String(categoryId) : payee.toLowerCase();
      const row = rows.get(key) ?? {
        key,
        name,
        categoryId: group === "category" ? categoryId : undefined,
        payee: group === "merchant" ? payee : undefined,
        amount: 0,
        previous: 0,
        months: new Map<string, number>(),
      };
      addBreakdownAmount(row, field, tx.date, tx.to_base);
      rows.set(key, row);
    }
  }
  add(current, "amount");
  add(previous, "previous");
  return [...rows.values()].sort(
    (a, b) => b.amount - a.amount || b.previous - a.previous
  );
}

export function compareIncome(
  current: Transaction[],
  previous: Transaction[],
  categories: Map<number, CategoryInfo>
) {
  const rows = new Map<string, Breakdown & { payments: number }>();
  function add(transactions: Transaction[], field: "amount" | "previous") {
    for (const tx of filterIncomeTxs(
      reportableTransactions(transactions),
      categories
    )) {
      const payee = tx.payee?.trim() ?? "";
      const name = payee || "Unknown source";
      const key = payee.toLowerCase();
      const row = rows.get(key) ?? {
        key,
        name,
        payee,
        amount: 0,
        previous: 0,
        months: new Map<string, number>(),
        payments: 0,
      };
      addBreakdownAmount(row, field, tx.date, -tx.to_base);
      if (field === "amount") row.payments++;
      rows.set(key, row);
    }
  }
  add(current, "amount");
  add(previous, "previous");
  return [...rows.values()].sort(
    (a, b) => b.amount - a.amount || b.previous - a.previous
  );
}

export function spendingPace(
  current: Transaction[],
  prior: { period: ReportPeriod; transactions: Transaction[] }[],
  today: Date,
  categories: Map<number, CategoryInfo>
) {
  const through = today.getDate();
  function daily(transactions: Transaction[], lastDay: number) {
    const totals = Array<number>(lastDay + 1).fill(0);
    for (const tx of filterSpendTransactions(
      reportableTransactions(transactions),
      categories
    )) {
      const day = Number(tx.date.slice(8, 10));
      if (day > 0 && day <= lastDay) totals[day] += tx.to_base;
    }
    for (let day = 1; day <= lastDay; day++) totals[day] += totals[day - 1];
    return totals;
  }
  const actual = daily(current, through);
  const available = prior.filter(({ transactions }) =>
    transactions.some(isReportableTransaction)
  );
  const baselines = available.map(({ period, transactions }) =>
    daily(transactions, new Date(period.year, period.month, 0).getDate())
  );
  const days = Array.from({ length: through }, (_, index) => {
    const day = index + 1;
    const typical = baselines.length
      ? baselines.reduce(
          (sum, values) => sum + values[Math.min(day, values.length - 1)],
          0
        ) / baselines.length
      : null;
    return { day, actual: actual[day], typical };
  });
  const typical = days.at(-1)?.typical ?? null;
  const monthDays = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const drivers = compareSpending(
    current.filter((tx) => Number(tx.date.slice(8, 10)) <= through),
    available.flatMap(({ transactions }) =>
      transactions.filter((tx) => Number(tx.date.slice(8, 10)) <= through)
    ),
    categories,
    "category"
  )
    .map((row) => ({
      ...row,
      previous: baselines.length ? row.previous / baselines.length : 0,
    }))
    .filter((row) => Math.abs(row.amount - row.previous) >= 0.01)
    .sort(
      (a, b) =>
        Math.abs(b.amount - b.previous) - Math.abs(a.amount - a.previous)
    );
  return {
    days,
    through,
    current: actual[through],
    typical,
    baselineCount: baselines.length,
    projected:
      typical === null
        ? null
        : actual[through] +
          baselines.reduce(
            (sum, values) =>
              sum + values[Math.min(monthDays, values.length - 1)],
            0
          ) /
            baselines.length -
          typical,
    drivers,
  };
}

export function compareBudget(
  summary: AlignedSummaryResponse,
  categories: Map<number, CategoryInfo>,
  groups: CategoryGroupEntry[] = []
) {
  if (!summary.aligned) return null;
  const plannedIds = new Set(
    summary.categories
      .filter(({ totals }) => (totals.budgeted ?? 0) > 0)
      .map(({ category_id }) => category_id)
  );
  const groupIds = new Set<number>();
  const coveredChildren = new Set<number>();
  for (const group of groups) {
    if (group.groupId == null) continue;
    groupIds.add(group.groupId);
    if (plannedIds.has(group.groupId)) {
      for (const child of group.items) coveredChildren.add(child.id);
    }
  }
  const rows = summary.categories
    .flatMap(({ category_id: id, totals }) => {
      const category = categories.get(id);
      if (
        !category ||
        coveredChildren.has(id) ||
        category.is_income ||
        category.exclude_from_totals ||
        totals.budgeted == null ||
        totals.budgeted <= 0
      )
        return [];
      return [
        {
          id,
          name: category.name,
          group: groupIds.has(id),
          planned: totals.budgeted,
          spent:
            (totals.other_activity ?? 0) + (totals.recurring_activity ?? 0),
        },
      ];
    })
    .sort((a, b) => b.spent - b.planned - (a.spent - a.planned));
  return {
    rows,
    planned: rows.reduce((total, row) => total + row.planned, 0),
    spent: rows.reduce((total, row) => total + row.spent, 0),
    over: rows.filter((row) => row.spent - row.planned >= 0.005).length,
  };
}
