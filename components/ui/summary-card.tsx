import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SummaryCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("gap-0 px-(--card-spacing)", className)}>
      {children}
    </Card>
  );
}

export function SummaryAmount({
  label,
  amount,
  primaryCurrency,
  emphasizePositive,
}: {
  label: string;
  amount: number;
  primaryCurrency: string;
  emphasizePositive?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm text-bento-subtle">{label}</h3>
      <p
        className={cn(
          "mt-2 font-heading text-4xl font-semibold tracking-tight wrap-anywhere tabular-nums",
          amount < 0 && "text-bento-negative",
          emphasizePositive && amount > 0 && "text-bento-positive"
        )}
      >
        {formatCurrency(amount, primaryCurrency, true)}
      </p>
    </div>
  );
}

export function SummaryTotals({
  first,
  second,
  primaryCurrency,
}: {
  first: { label: string; amount: number };
  second: { label: string; amount: number };
  primaryCurrency: string;
}) {
  return (
    <dl className="mt-panel grid grid-cols-2 gap-4 border-b border-bento-hairline pb-panel">
      {[first, second].map(({ label, amount }, index) => (
        <div
          key={label}
          className={cn(
            "min-w-0",
            index === 1 && "border-l border-bento-hairline pl-4"
          )}
        >
          <dt className="flex items-center gap-1.5 text-xs text-bento-subtle">
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                index === 0 ? "bg-bento-positive" : "bg-bento-negative"
              )}
            />
            {label}
          </dt>
          <dd className="mt-1.5 text-base font-medium wrap-anywhere tabular-nums">
            {formatCurrency(amount, primaryCurrency, true)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
