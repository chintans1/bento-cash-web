import type { ReportData } from "@/lib/lunchmoney/reports";
import { formatCurrency } from "@/lib/format";
import {
  EmptyBreakdown,
  RankingRow,
  ReportMetric,
  ReportSection,
} from "./report-ui";
import { MonthlyBarChart } from "./monthly-bar-chart";

export function IncomeReport({
  data,
  currency,
}: {
  data: ReportData;
  currency: string;
}) {
  const latest = data.months.at(-1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <ReportMetric
          label="Average income"
          value={formatCurrency(data.averageIncome, currency)}
          note="per month"
        />
        <ReportMetric
          label="Latest month"
          value={formatCurrency(latest?.income ?? 0, currency)}
          note={latest?.label ?? "No complete month"}
        />
        <ReportMetric
          label="Lowest month"
          value={formatCurrency(data.lowestIncome, currency)}
          note="helps reveal income volatility"
        />
      </div>

      <ReportSection
        title="Monthly income"
        description="See whether take-home income is steady, seasonal, or changing over time."
      >
        <MonthlyBarChart
          data={data.months}
          dataKey="income"
          label="Income"
          color="var(--cat-4)"
          currency={currency}
        />
      </ReportSection>

      <ReportSection
        title="Income sources"
        description="See how much each source contributes and how often it appeared."
      >
        {data.incomeSources.length ? (
          <ul className="divide-y divide-bento-hairline">
            {data.incomeSources.map((source) => (
              <RankingRow
                key={source.name}
                name={source.name}
                value={source.total}
                share={source.share}
                currency={currency}
                detail={`${source.activeMonths} of ${data.months.length} months · ${formatCurrency(source.averagePayment, currency)} average payment`}
              />
            ))}
          </ul>
        ) : (
          <EmptyBreakdown>No income found for this period.</EmptyBreakdown>
        )}
      </ReportSection>
    </div>
  );
}
