"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatMonthKey } from "@/lib/date-utils";
import { EmptyBreakdown } from "./report-ui";

export function amountChange(change: number, currency: string) {
  const rounded = Math.round(change * 100) / 100;
  return rounded === 0
    ? "No change"
    : `${formatCurrency(Math.abs(rounded), currency, true)} ${rounded < 0 ? "less" : "more"}`;
}

type Row = {
  key: string;
  name: string;
  amount: number;
  previous: number;
  categoryId?: number;
  payee?: string;
  latestMonth: string | null;
  payments?: number;
};

export function ReportBreakdown({
  rows,
  currency,
  previousLabel,
  total,
  kind,
}: {
  rows: Row[];
  currency: string;
  previousLabel: string;
  total: number;
  kind: "category" | "merchant" | "source";
}) {
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<"amount" | "change">("amount");
  if (rows.length === 0)
    return (
      <EmptyBreakdown>
        No matching transactions in either period.
      </EmptyBreakdown>
    );
  const ranked =
    sort === "amount"
      ? rows
      : rows.toSorted(
          (a, b) =>
            Math.abs(b.amount - b.previous) - Math.abs(a.amount - a.previous)
        );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-bento-subtle">
          Compared with {previousLabel}.
        </p>
        <Button
          size="sm"
          variant="outline"
          aria-pressed={sort === "change"}
          onClick={() => setSort(sort === "amount" ? "change" : "amount")}
        >
          Biggest changes
        </Button>
      </div>
      <ul className="divide-y divide-bento-hairline">
        {(expanded ? ranked : ranked.slice(0, 6)).map((row) => {
          const params = new URLSearchParams();
          params.set("direction", kind === "source" ? "income" : "spending");
          if (row.latestMonth) params.set("month", row.latestMonth);
          if (row.categoryId !== undefined)
            params.set("category", String(row.categoryId));
          else if (row.payee !== undefined) params.set("payee", row.payee);
          return (
            <li key={row.key} className="grid grid-cols-2 gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="font-medium wrap-anywhere">{row.name}</p>
                <p className="mt-0.5 text-xs text-bento-subtle">
                  {row.amount > 0 && total > 0
                    ? `${Math.round((row.amount / total) * 100)}% of ${kind === "source" ? "income" : "spending"}`
                    : "No activity in this period"}
                  {!!row.payments &&
                    ` · ${row.payments} ${row.payments === 1 ? "payment" : "payments"}`}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-semibold">
                  {formatCurrency(row.amount, currency, true)}
                </p>
                <p className="mt-0.5 text-xs text-bento-subtle">
                  {amountChange(row.amount - row.previous, currency)}
                  {" · "}
                  {formatCurrency(row.previous, currency, true)} before
                </p>
              </div>
              {row.latestMonth && (
                <Link
                  href={`/transactions?${params}`}
                  className="col-span-2 -ml-1 flex min-h-7 w-fit items-center gap-1 rounded-md px-1 text-xs font-medium text-bento-subtle hover:text-bento-default hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`View ${row.name} transactions for ${formatMonthKey(row.latestMonth)}`}
                >
                  View {formatMonthKey(row.latestMonth)}{" "}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {ranked.length > 6 && (
        <Button
          size="sm"
          variant="secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer" : `Show all ${ranked.length}`}
        </Button>
      )}
    </div>
  );
}
