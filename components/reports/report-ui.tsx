import type { ReactNode } from "react";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
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
          "mt-1 truncate font-heading text-2xl font-semibold tabular-nums",
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

export function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-balance">
          {title}
        </h2>
        <p className="mt-1 text-sm text-pretty text-bento-subtle">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function RankingRow({
  name,
  value,
  share,
  detail,
  currency,
}: {
  name: string;
  value: number;
  share: number;
  detail: ReactNode;
  currency: string;
}) {
  const color = categoryColor(name);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <div className="mt-0.5 text-xs text-bento-subtle">{detail}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono font-medium tabular-nums">
            {formatCurrency(value, currency)}
          </p>
          <p className="text-xs text-bento-subtle tabular-nums">
            {share.toFixed(0)}%
          </p>
        </div>
      </div>
      <div className="mt-2.5 ml-5 h-1.5 overflow-hidden rounded-full bg-bento-raised">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, share)}%`, backgroundColor: color }}
        />
      </div>
    </li>
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
