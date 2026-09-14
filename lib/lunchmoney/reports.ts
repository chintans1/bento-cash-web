import { formatMonthKey, monthKeyOf } from "../date-utils";
import type { CategoryInfo } from "./categories";
import type { Transaction } from "./client";
import {
  computeCategoryTotals,
  computeMonthTotals,
  filterIncomeTxs,
} from "./analytics";

export type ReportPeriod = { year: number; month: number };

export type MonthlyReport = {
  key: string;
  label: string;
  income: number;
  spend: number;
  saved: number;
  savingsRate: number;
};

export type SpendingCategoryReport = {
  id: number;
  name: string;
  total: number;
  share: number;
  latest: number;
  change: number | null;
};

export type IncomeSourceReport = {
  name: string;
  total: number;
  share: number;
  activeMonths: number;
  averagePayment: number;
};

export type ReportData = {
  months: MonthlyReport[];
  averageIncome: number;
  averageSpend: number;
  averageSaved: number;
  savingsRate: number;
  spendingCategories: SpendingCategoryReport[];
  incomeSources: IncomeSourceReport[];
};

function average(total: number, count: number) {
  return count ? total / count : 0;
}

export function buildReportData(
  monthlyTransactions: Transaction[][],
  periods: ReportPeriod[],
  categoryMap: Map<number, CategoryInfo>
): ReportData {
  const months = monthlyTransactions.map((transactions, index) => {
    const period = periods[index];
    const { income, spend } = computeMonthTotals(transactions, categoryMap);
    const saved = income - spend;

    return {
      key: monthKeyOf(period.year, period.month),
      label: formatMonthKey(monthKeyOf(period.year, period.month)),
      income,
      spend,
      saved,
      savingsRate: income ? (saved / income) * 100 : 0,
    };
  });

  const totalIncome = months.reduce((sum, month) => sum + month.income, 0);
  const totalSpend = months.reduce((sum, month) => sum + month.spend, 0);
  const allTransactions = monthlyTransactions.flat();
  const latestTransactions = monthlyTransactions.at(-1) ?? [];
  const previousTransactions = monthlyTransactions.at(-2) ?? [];
  const latestByCategory = new Map(
    computeCategoryTotals(latestTransactions, categoryMap, Infinity).map(
      (category) => [category.id, category.spend]
    )
  );
  const previousByCategory = new Map(
    computeCategoryTotals(previousTransactions, categoryMap, Infinity).map(
      (category) => [category.id, category.spend]
    )
  );

  const spendingCategories = computeCategoryTotals(
    allTransactions,
    categoryMap,
    8
  ).map((category) => {
    const latest = latestByCategory.get(category.id) ?? 0;
    const previous = previousByCategory.get(category.id);

    return {
      id: category.id,
      name: category.name,
      total: category.spend,
      share: totalSpend ? (category.spend / totalSpend) * 100 : 0,
      latest,
      change: previous ? ((latest - previous) / previous) * 100 : null,
    };
  });

  const sources = new Map<
    string,
    { total: number; payments: number; activeMonths: Set<number> }
  >();
  monthlyTransactions.forEach((transactions, monthIndex) => {
    for (const transaction of filterIncomeTxs(transactions, categoryMap)) {
      const name = transaction.payee?.trim() || "Unknown source";
      const source = sources.get(name) ?? {
        total: 0,
        payments: 0,
        activeMonths: new Set<number>(),
      };
      source.total += Math.abs(transaction.to_base);
      source.payments += 1;
      source.activeMonths.add(monthIndex);
      sources.set(name, source);
    }
  });

  const incomeSources = Array.from(sources, ([name, source]) => ({
    name,
    total: source.total,
    share: totalIncome ? (source.total / totalIncome) * 100 : 0,
    activeMonths: source.activeMonths.size,
    averagePayment: average(source.total, source.payments),
  }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const count = months.length;
  const totalSaved = totalIncome - totalSpend;

  return {
    months,
    averageIncome: average(totalIncome, count),
    averageSpend: average(totalSpend, count),
    averageSaved: average(totalSaved, count),
    savingsRate: totalIncome ? (totalSaved / totalIncome) * 100 : 0,
    spendingCategories,
    incomeSources,
  };
}
