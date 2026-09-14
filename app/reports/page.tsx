"use client";

import { useMemo, useState } from "react";
import { CashFlowReport } from "@/components/reports/cash-flow-report";
import { IncomeReport } from "@/components/reports/income-report";
import { SpendingReport } from "@/components/reports/spending-report";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/hooks/use-app-data";
import { useToken } from "@/hooks/use-token";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import { lastFullMonths } from "@/lib/date-utils";
import { buildReportData } from "@/lib/lunchmoney/reports";
import { cn } from "@/lib/utils";

const REPORTS = [
  {
    id: "cash-flow",
    label: "Cash Flow",
    description:
      "See whether income is consistently staying ahead of spending.",
  },
  {
    id: "spending",
    label: "Spending",
    description: "Find where your money goes and what changed recently.",
  },
  {
    id: "income",
    label: "Income",
    description: "Understand the stability and mix of your income.",
  },
] as const;

const RANGES = [
  { months: 3, label: "3M" },
  { months: 6, label: "6M" },
  { months: 12, label: "1Y" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-fit rounded-full bg-bento-raised p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-10 rounded-full px-4 text-sm font-medium transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.96]",
            value === option.value
              ? "bg-bento-surface text-bento-default shadow-sm"
              : "text-bento-subtle hover:text-bento-default"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { isAuthenticated } = useToken();
  const { categoryMap, primaryCurrency } = useAppData();
  const [activeReport, setActiveReport] = useState<ReportId>("cash-flow");
  const [range, setRange] = useState(6);
  const history = useTransactionHistory(range, isAuthenticated);
  const periods = useMemo(() => lastFullMonths(range), [range]);
  const report = useMemo(
    () =>
      history.months?.length === periods.length
        ? buildReportData(history.months, periods, categoryMap)
        : null,
    [history.months, periods, categoryMap]
  );
  const selected = REPORTS.find(({ id }) => id === activeReport)!;

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            Reports
          </h1>
          <p className="mt-1 text-sm text-pretty text-bento-subtle">
            Clear answers from your completed months.
          </p>
        </div>
        <SegmentedControl
          label="Report period"
          value={range}
          onChange={setRange}
          options={RANGES.map(({ months, label }) => ({
            value: months,
            label,
          }))}
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-5 px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="overflow-x-auto pb-1">
            <SegmentedControl
              label="Report type"
              value={activeReport}
              onChange={setActiveReport}
              options={REPORTS.map(({ id, label }) => ({ value: id, label }))}
            />
          </div>
          <div className="border-b border-bento-hairline pb-5">
            <h2 className="font-heading text-xl font-semibold text-balance">
              {selected.label}
            </h2>
            <p className="mt-1 text-sm text-pretty text-bento-subtle">
              {selected.description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-6 sm:px-6 sm:py-8">
          {history.error ? (
            <p className="py-12 text-center text-sm text-bento-danger">
              {history.error}
            </p>
          ) : !report ? (
            <div className="space-y-6" aria-label="Loading report">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : activeReport === "cash-flow" ? (
            <CashFlowReport data={report} currency={primaryCurrency} />
          ) : activeReport === "spending" ? (
            <SpendingReport data={report} currency={primaryCurrency} />
          ) : (
            <IncomeReport data={report} currency={primaryCurrency} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
