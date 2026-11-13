"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ListChecks,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { MonthlyBarChart } from "@/components/reports/monthly-bar-chart";
import { PlanReport } from "@/components/reports/plan-report";
import {
  ReportBreakdown,
  amountChange,
} from "@/components/reports/report-breakdown";
import { EmptyBreakdown, ReportMetric } from "@/components/reports/report-ui";
import { SpendingPaceReport } from "@/components/reports/spending-pace-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompositionBar } from "@/components/ui/composition-bar";
import { PageTitle } from "@/components/ui/page-title";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useMonthTransactions } from "@/hooks/use-month-transactions";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import {
  formatMonthKey,
  lastFullMonths,
  monthKeyOf,
  prevMonthOf,
} from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import {
  compareIncome,
  compareSpending,
  spendingPace,
} from "@/lib/lunchmoney/report-comparisons";
import {
  buildMonthlyReports,
  type MonthlyReport,
} from "@/lib/lunchmoney/reports";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const reports = [
  {
    value: "cash-flow",
    label: "Cash flow",
    question: "How much did I keep?",
    icon: PiggyBank,
  },
  {
    value: "spending",
    label: "Spending",
    question: "Where did it go?",
    icon: Wallet,
  },
  {
    value: "income",
    label: "Income",
    question: "Where did it come from?",
    icon: Banknote,
  },
  {
    value: "pace",
    label: "Spending pace",
    question: "How is this month going?",
    icon: CalendarDays,
  },
  {
    value: "plan",
    label: "Plan vs. actual",
    question: "Did I stay on budget?",
    icon: ListChecks,
  },
] as const;

type Report = (typeof reports)[number]["value"];

const ranges = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

function dateRange(periods: ReturnType<typeof lastFullMonths>) {
  const names = periods.map(({ year, month }) =>
    formatMonthKey(monthKeyOf(year, month))
  );
  return names.length === 1 ? names[0] : `${names[0]} – ${names.at(-1)}`;
}

function MonthlyDetails({
  months,
  currency,
}: {
  months: MonthlyReport[];
  currency: string;
}) {
  const money = (value: number) => formatCurrency(value, currency, true);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-bento-subtle">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Month
            </th>
            {["Income", "Spending", "Saved"].map((label) => (
              <th
                key={label}
                scope="col"
                className="py-2 pl-3 text-right font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-bento-hairline border-t border-bento-hairline">
          {months.toReversed().map((month) => (
            <tr key={month.key}>
              <th scope="row" className="py-3 pr-3 font-medium">
                <Link
                  href={`/transactions?month=${month.key}`}
                  className="inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {month.label}
                  <ArrowUpRight
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </th>
              <td className="py-3 pl-3 text-right">{money(month.income)}</td>
              <td className="py-3 pl-3 text-right">{money(month.spend)}</td>
              <td
                className={cn(
                  "py-3 pl-3 text-right font-semibold",
                  month.saved < 0
                    ? "text-bento-negative"
                    : "text-bento-positive"
                )}
              >
                {money(month.saved)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashAllocation({
  income,
  spend,
  saved,
  currency,
}: {
  income: number;
  spend: number;
  saved: number;
  currency: string;
}) {
  const segments = [
    {
      id: "Covered by income",
      amount: Math.min(spend, income),
      color: "var(--cat-2)",
    },
    { id: "Saved", amount: Math.max(saved, 0), color: "var(--bento-positive)" },
    {
      id: "Spent beyond income",
      amount: Math.max(-saved, 0),
      color: "var(--bento-negative)",
    },
  ].filter(({ amount }) => amount > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where the money went</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CompositionBar
          segments={segments.map(({ id, amount, color }) => ({
            id,
            color,
            percent: (amount / Math.max(income, spend)) * 100,
          }))}
        />
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {segments.map(({ id, amount, color }) => (
            <li key={id} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-(--allocation-color)"
                style={{ "--allocation-color": color } as React.CSSProperties}
              />
              <span className="text-bento-subtle">{id}</span>
              <strong className="tabular-nums">
                {formatCurrency(amount, currency, true)}
              </strong>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { hasDataSource, dataScopeKey } = useAuth();
  return hasDataSource ? (
    <Suspense
      fallback={
        <Skeleton aria-label="Loading reports" className="h-72 rounded-2xl" />
      }
    >
      <ReportsWorkspace key={dataScopeKey} scope={dataScopeKey} />
    </Suspense>
  ) : (
    <ConnectionPrompt />
  );
}

function ReportsWorkspace({ scope }: { scope: string | null }) {
  const { categoryMap, catGroups, primaryCurrency, loading, error } =
    useAppData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const active =
    reports.find(({ value }) => value === searchParams.get("report"))?.value ??
    "cash-flow";
  const range =
    ranges.find(({ value }) => String(value) === searchParams.get("range"))
      ?.value ?? 3;
  const group =
    searchParams.get("group") === "merchant" ? "merchant" : "category";

  function setReportParam(key: "report" | "range" | "group", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`/reports?${params}`, { scroll: false });
  }
  const paceActive = active === "pace";
  const planActive = active === "plan";
  const [planOffset, setPlanOffset] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const count = paceActive ? 3 : range * 2;
  const history = useTransactionHistory(
    count,
    planActive ? null : scope,
    attempt
  );
  const budgetPeriod =
    planOffset === 0 ? { year, month } : prevMonthOf(year, month);
  const currentMonth = useMonthTransactions(
    year,
    month,
    paceActive ? scope : null
  );
  const periods = lastFullMonths(count);
  const periodLabel = dateRange(periods.slice(-range));
  const previousLabel = dateRange(periods.slice(0, range));
  const data = (() => {
    if (!history.months || paceActive) return null;
    const months = history.months.slice(-range);
    const previous = history.months.slice(0, range);
    return {
      current: buildMonthlyReports(months, periods.slice(-range), categoryMap),
      previous: buildMonthlyReports(
        previous,
        periods.slice(0, range),
        categoryMap
      ),
      spending: compareSpending(
        months.flat(),
        previous.flat(),
        categoryMap,
        active === "spending" ? group : "category"
      ),
      income:
        active === "income"
          ? compareIncome(months.flat(), previous.flat(), categoryMap)
          : [],
    };
  })();
  const pace =
    paceActive && history.months && !currentMonth.loading
      ? spendingPace(
          currentMonth.transactions,
          history.months.map((transactions, i) => ({
            transactions,
            period: periods[i],
          })),
          today,
          categoryMap
        )
      : null;
  const fail = error || history.error || (paceActive && currentMonth.error);

  return (
    <div className="mx-auto max-w-6xl space-y-page-gap">
      <header>
        <PageTitle>Reports</PageTitle>
      </header>
      <nav
        aria-label="Reports"
        className="grid grid-cols-2 gap-2 lg:grid-cols-5"
      >
        {reports.map(({ value, label, question, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={active === value}
            onClick={() => setReportParam("report", value)}
            className={cn(
              "flex min-h-16 items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active === value
                ? "border-bento-brand bg-bento-brand/10"
                : "border-bento-hairline bg-card hover:bg-bento-raised"
            )}
          >
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-bento-subtle"
            />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-bento-subtle">
                {question}
              </span>
            </span>
          </button>
        ))}
      </nav>

      {!paceActive && !planActive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <p className="font-medium">{periodLabel}</p>
            <p className="text-xs text-bento-subtle">
              Compared with {previousLabel}
            </p>
          </div>
          <SegmentedControl
            label="Report period"
            options={ranges}
            value={range}
            onChange={(value) => setReportParam("range", String(value))}
          />
        </div>
      )}

      {planActive && !error && !loading ? (
        <>
          <SegmentedControl
            label="Budget month"
            options={[
              { value: 1, label: "Last month" },
              { value: 0, label: "This month" },
            ]}
            value={planOffset}
            onChange={setPlanOffset}
          />
          <PlanReport
            key={monthKeyOf(budgetPeriod.year, budgetPeriod.month)}
            {...budgetPeriod}
            currency={primaryCurrency}
            categories={categoryMap}
            groups={catGroups}
          />
        </>
      ) : fail ? (
        <Card>
          <CardContent className="space-y-3">
            <p role="alert">Couldn’t load transactions for this report.</p>
            {history.error && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAttempt((current) => current + 1)}
              >
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      ) : loading || (paceActive ? !pace : !data) ? (
        <Skeleton aria-label="Loading report" className="h-72 rounded-2xl" />
      ) : paceActive && pace ? (
        <Card>
          <CardContent>
            <SpendingPaceReport
              pace={pace}
              currency={primaryCurrency}
              today={`${monthKeyOf(year, month)}-${String(today.getDate()).padStart(2, "0")}`}
            />
          </CardContent>
        </Card>
      ) : (
        data && (
          <PeriodReport
            data={data}
            report={active}
            currency={primaryCurrency}
            previousLabel={previousLabel}
            group={group}
            onGroupChange={(value) => setReportParam("group", value)}
          />
        )
      )}
      <details className="text-xs text-bento-subtle">
        <summary className="w-fit cursor-pointer rounded-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          How these numbers are calculated
        </summary>
        <p className="mt-2 max-w-prose leading-relaxed">
          Income and spending use posted transaction amounts in your budget
          currency. Categories excluded from totals are left out, along with
          pending and deleted transactions. Saved is income minus spending. For
          payroll investments and withholding, see{" "}
          <Link href="/salary" className="underline underline-offset-2">
            Salary
          </Link>
          .
        </p>
      </details>
    </div>
  );
}

function PeriodReport({
  data,
  report,
  currency,
  previousLabel,
  group,
  onGroupChange,
}: {
  data: {
    current: MonthlyReport[];
    previous: MonthlyReport[];
    spending: ReturnType<typeof compareSpending>;
    income: ReturnType<typeof compareIncome>;
  };
  report: Report;
  currency: string;
  previousLabel: string;
  group: "category" | "merchant";
  onGroupChange: (group: "category" | "merchant") => void;
}) {
  const { current, previous } = data;
  const income = current.reduce((sum, month) => sum + month.income, 0);
  const spend = current.reduce((sum, month) => sum + month.spend, 0);
  const saved = income - spend;
  const incomeChange =
    income - previous.reduce((sum, month) => sum + month.income, 0);
  const spendChange =
    spend - previous.reduce((sum, month) => sum + month.spend, 0);
  const savedChange = incomeChange - spendChange;
  const money = (value: number) => formatCurrency(value, currency, true);
  const isIncome = report === "income";
  const biggest = data.spending.reduce<
    (typeof data.spending)[number] | undefined
  >(
    (best, row) =>
      !best ||
      Math.abs(row.amount - row.previous) >
        Math.abs(best.amount - best.previous)
        ? row
        : best,
    undefined
  );
  const hasActivity = current.some(
    (month) => month.income > 0 || month.spend > 0
  );
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {report === "cash-flow"
              ? hasActivity
                ? saved < 0
                  ? `You spent ${money(-saved)} more than you received`
                  : `You kept ${money(saved)}`
                : "No cash flow for this period"
              : isIncome
                ? `${money(income)} received`
                : `${money(spend)} spent`}
          </CardTitle>
          <p className="text-sm text-bento-subtle">
            {report === "cash-flow"
              ? Math.abs(savedChange) < 0.005
                ? "Savings were unchanged"
                : amountChange(savedChange, currency) + " saved"
              : amountChange(
                  isIncome ? incomeChange : spendChange,
                  currency
                )}{" "}
            compared with {previousLabel}.
          </p>
        </CardHeader>
        <CardContent>
          {report === "cash-flow" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ReportMetric
                label="Income"
                value={money(income)}
                note={amountChange(incomeChange, currency)}
              />
              <ReportMetric
                label="Spending"
                value={money(spend)}
                note={amountChange(spendChange, currency)}
              />
              <ReportMetric
                label="Savings rate"
                value={
                  income > 0 ? `${((saved / income) * 100).toFixed(1)}%` : "—"
                }
                note="Saved ÷ income"
                tone={saved < 0 ? "negative" : "positive"}
              />
            </div>
          ) : !isIncome &&
            biggest &&
            Math.abs(biggest.amount - biggest.previous) >= 0.01 ? (
            <p className="text-sm">
              <strong>{biggest.name}</strong> had the biggest change:{" "}
              {amountChange(biggest.amount - biggest.previous, currency)}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {report === "cash-flow" && hasActivity && (
        <CashAllocation
          income={income}
          spend={spend}
          saved={saved}
          currency={currency}
        />
      )}

      {report === "cash-flow" ? (
        <Card>
          <CardHeader>
            <CardTitle>Month by month</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyDetails months={current} currency={currency} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-page-gap xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {isIncome ? "Income by source" : "Spending breakdown"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isIncome && (
                <SegmentedControl
                  label="Group spending by"
                  value={group}
                  onChange={onGroupChange}
                  options={[
                    { value: "category", label: "Category" },
                    { value: "merchant", label: "Merchant" },
                  ]}
                />
              )}
              <ReportBreakdown
                rows={isIncome ? data.income : data.spending}
                currency={currency}
                previousLabel={previousLabel}
                total={isIncome ? income : spend}
                kind={isIncome ? "source" : group}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                {isIncome ? "Monthly income" : "Monthly spending"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(isIncome ? income : spend) > 0 ? (
                <MonthlyBarChart
                  data={current}
                  dataKey={isIncome ? "income" : "spend"}
                  label={isIncome ? "Income" : "Spending"}
                  color="var(--bento-brand)"
                  currency={currency}
                />
              ) : (
                <EmptyBreakdown>
                  No {isIncome ? "income" : "spending"} in this period.
                </EmptyBreakdown>
              )}
              <details className="mt-4">
                <summary className="w-fit cursor-pointer rounded-sm text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  View monthly totals
                </summary>
                <MonthlyDetails months={current} currency={currency} />
              </details>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
