import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ReportMetric({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="min-w-0 rounded-xl bg-bento-raised p-4">
      <p className="text-xs font-medium text-bento-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-semibold break-words tabular-nums @2xl/main:text-2xl",
          tone === "positive" && "text-bento-positive",
          tone === "negative" && "text-bento-negative"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-bento-subtle">{note}</p>
    </div>
  );
}

export function EmptyBreakdown({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-bento-raised px-6 py-10 text-center text-sm text-bento-subtle">
      {children}
    </div>
  );
}

export function formatCompactCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, currency);
  }
}
