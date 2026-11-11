import {
  describeMonthlyChange,
  type ReportData,
} from "@/lib/lunchmoney/reports";
import { formatCurrency } from "@/lib/format";
import {
  EmptyBreakdown,
  RankingRow,
  ReportMetric,
  ReportSection,
} from "./report-ui";
import { MonthlyBarChart } from "./monthly-bar-chart";

function describeChange(change: number | null, latest: number) {
  if (change == null) {
    return latest ? "New in the latest month" : "No spend in the latest month";
  }
  return describeMonthlyChange(change);
}

export function SpendingReport({
  data,
  currency,
}: {
  data: ReportData;
  currency: string;
}) {
  const latest = data.months.at(-1);
  const change = data.latestSpendChange;
  const changeTone =
    change == null || Math.abs(change) < 0.5
      ? "default"
      : change < 0
        ? "positive"
        : "negative";

  return (
    <div className="space-y-page-gap">
      <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-3 [&>*:last-child]:col-span-2 @4xl/main:[&>*:last-child]:col-span-1">
        <ReportMetric
          label="Average spending"
          value={formatCurrency(data.averageSpend, currency)}
          note="per month"
        />
        <ReportMetric
          label="Latest month"
          value={formatCurrency(latest?.spend ?? 0, currency)}
          note={latest?.label ?? "No complete month"}
        />
        <ReportMetric
          label="Monthly change"
          value={change == null ? "—" : `${Math.abs(change).toFixed(0)}%`}
          note={describeMonthlyChange(change)}
          tone={changeTone}
        />
      </div>

      <ReportSection title="Monthly spending">
        <MonthlyBarChart
          data={data.months}
          dataKey="spend"
          label="Spending"
          color="var(--cat-2)"
          currency={currency}
        />
      </ReportSection>

      <ReportSection title="Spending by category">
        {data.spendingCategories.length ? (
          <ul className="divide-y divide-bento-hairline">
            {data.spendingCategories.map((category) => (
              <RankingRow
                key={category.id}
                name={category.name}
                value={category.total}
                share={category.share}
                currency={currency}
                detail={describeChange(category.change, category.latest)}
              />
            ))}
          </ul>
        ) : (
          <EmptyBreakdown>No spending found for this period.</EmptyBreakdown>
        )}
      </ReportSection>
    </div>
  );
}
