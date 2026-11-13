"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBudgetSummary,
  type AlignedSummaryResponse,
} from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { CategoryGroupEntry } from "@/lib/lunchmoney/analytics";
import { formatCurrency } from "@/lib/format";
import { formatMonthKey, monthKeyOf } from "@/lib/date-utils";
import { EmptyBreakdown, ReportMetric } from "./report-ui";
import { compareBudget } from "@/lib/lunchmoney/report-comparisons";

export function PlanReport({
  year,
  month,
  currency,
  categories,
  groups,
}: {
  year: number;
  month: number;
  currency: string;
  categories: Map<number, CategoryInfo>;
  groups: CategoryGroupEntry[];
}) {
  const [summary, setSummary] = useState<AlignedSummaryResponse | "failed">();
  useEffect(() => {
    let active = true;
    void getBudgetSummary(year, month).then(
      (value) => {
        if (active) setSummary(value);
      },
      () => {
        if (active) setSummary("failed");
      }
    );
    return () => {
      active = false;
    };
  }, [year, month]);

  if (!summary)
    return (
      <Skeleton
        aria-label="Loading plan comparison"
        className="h-48 rounded-2xl"
      />
    );
  const data =
    summary === "failed" ? null : compareBudget(summary, categories, groups);
  const key = monthKeyOf(year, month);
  const money = (value: number) => formatCurrency(value, currency, true);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Plan vs. actual for {formatMonthKey(key)}
        </CardTitle>
        {data && data.rows.length > 0 && (
          <p className="text-sm text-bento-subtle">
            {data.over === 0
              ? "Every planned category stayed within its budget."
              : `${data.over} ${data.over === 1 ? "category went" : "categories went"} over budget.`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary === "failed" ? (
          <p role="alert">
            Couldn’t load the Lunch Money budget for this month.
          </p>
        ) : data === null ? (
          <EmptyBreakdown>
            Your budget periods don’t align with this calendar month.
          </EmptyBreakdown>
        ) : data.rows.length === 0 ? (
          <EmptyBreakdown>
            No planned spending categories this month. Set category budgets in
            Lunch Money to see them here.
          </EmptyBreakdown>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ReportMetric
                label="Planned"
                value={money(data.planned)}
                note="Budgeted categories"
              />
              <ReportMetric
                label="Spent"
                value={money(data.spent)}
                note="Actual activity"
              />
              <ReportMetric
                label={data.spent > data.planned ? "Over plan" : "Left in plan"}
                value={money(Math.abs(data.planned - data.spent))}
                note="Across budgeted categories"
                tone={data.spent > data.planned ? "negative" : "default"}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-bento-hairline text-bento-subtle">
                    {["Category", "Planned", "Spent", "Remaining"].map(
                      (label, index) => (
                        <th
                          key={label}
                          scope="col"
                          className={
                            index
                              ? "py-2 pl-3 text-right font-medium"
                              : "py-2 font-medium"
                          }
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bento-hairline">
                  {data.rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="py-3 font-medium">
                        {row.group ? (
                          row.name
                        ) : (
                          <Link
                            href={`/transactions?month=${key}&category=${row.id}&direction=spending`}
                            className="inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {row.name}
                            <ArrowUpRight
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                          </Link>
                        )}
                      </th>
                      <td className="py-3 pl-3 text-right">
                        {money(row.planned)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {money(row.spent)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {money(row.planned - row.spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-bento-subtle">
              Actuals come from the Lunch Money budget summary and include
              recurring activity. The totals cover categories with a budget.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
