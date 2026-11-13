"use client";

import type { ReactNode } from "react";
import {
  CompositionBar,
  useCompositionHighlight,
} from "@/components/ui/composition-bar";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type CompositionEntry<Id> = {
  id: Id;
  label: string;
  detail?: string;
  percent: number;
  amount: number;
  color: string;
  onSelect?: () => void;
};

export function CompositionBreakdown<Id extends string | number>({
  title,
  entries,
  primaryCurrency,
  emptyMessage,
  separated,
  footer,
  selectedId,
}: {
  title: string;
  entries: readonly CompositionEntry<Id>[];
  primaryCurrency: string;
  emptyMessage: string;
  separated?: boolean;
  footer?: ReactNode;
  selectedId?: Id | null;
}) {
  const { activeId, onHover, clearHighlight, rowHandlers } =
    useCompositionHighlight<Id>();
  const selectedEntry = entries.find((entry) => entry.id === selectedId);

  return (
    <section
      className={cn(
        "pt-panel",
        separated && "mt-panel border-t border-bento-hairline"
      )}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-bento-subtle">{emptyMessage}</p>
      ) : (
        <>
          <CompositionBar
            segments={entries}
            activeId={activeId ?? selectedEntry?.id}
            onHover={onHover}
            className="mt-3 mb-2"
          />
          <ul className="space-y-0.5">
            {entries.map((entry) => {
              const selected = selectedEntry?.id === entry.id;
              const rowClassName = cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                (selected || activeId === entry.id) && "bg-bento-raised",
                selected && "inset-ring inset-ring-ring/50"
              );
              const content = (
                <>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full bg-(--item-background)"
                      style={
                        {
                          "--item-background": entry.color,
                        } as React.CSSProperties
                      }
                    />
                    <span className="min-w-0 wrap-anywhere">
                      {entry.label}
                      {entry.detail && (
                        <span className="block text-bento-subtle tabular-nums">
                          {entry.detail}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-bento-subtle tabular-nums">
                    {entry.percent < 0.05
                      ? "<0.1%"
                      : `${entry.percent.toFixed(1)}%`}
                  </span>
                  <span className="min-w-20 shrink-0 text-right font-medium tabular-nums">
                    {formatCurrency(entry.amount, primaryCurrency, true)}
                  </span>
                </>
              );
              return (
                <li key={entry.id} className="-mx-2">
                  {entry.onSelect ? (
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        clearHighlight();
                        entry.onSelect?.();
                      }}
                      className={rowClassName}
                      {...rowHandlers(entry.id)}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      tabIndex={0}
                      className={rowClassName}
                      {...rowHandlers(entry.id)}
                    >
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {footer}
    </section>
  );
}
