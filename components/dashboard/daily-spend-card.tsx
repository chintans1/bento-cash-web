"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySpendChart } from "./daily-spend-chart";
import { MONTH_NAMES } from "@/lib/date-utils";
import type { DailySpend } from "@/lib/lunchmoney/analytics";

export function DailySpendCard({
  data,
  month,
  primaryCurrency,
}: {
  data: DailySpend[];
  month: number;
  primaryCurrency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Daily Spend — {MONTH_NAMES[month - 1]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DailySpendChart data={data} primaryCurrency={primaryCurrency} />
      </CardContent>
    </Card>
  );
}
