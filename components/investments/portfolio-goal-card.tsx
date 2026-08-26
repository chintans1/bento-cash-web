"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioGoal } from "@/hooks/use-portfolio-goal";
import { formatCurrency } from "@/lib/format";

/**
 * Progress toward a portfolio target.
 *
 * The target is the user's own number, kept in this browser — Lunch Money has
 * nowhere to store it.
 */
export function PortfolioGoalCard({
  total,
  primaryCurrency,
}: {
  total: number;
  primaryCurrency: string;
}) {
  const { goal, setGoal } = usePortfolioGoal();
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - total, 0);

  function commit() {
    setGoal(Number.parseFloat((draft ?? "").replace(/[^0-9.]/g, "")));
    setDraft(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-lg">Portfolio goal</CardTitle>
          {goal > 0 && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-bento-subtle hover:text-bento-default"
              onClick={() => setDraft(String(goal))}
            >
              Edit goal
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing || goal === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-bento-subtle">
              Set a target to track progress against.
            </p>
            <div className="flex gap-2">
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="200000"
                aria-label="Portfolio goal"
                value={draft ?? ""}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  else if (e.key === "Escape") setDraft(null);
                }}
                className="h-9 font-mono"
              />
              <Button size="sm" className="h-9" onClick={commit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {formatCurrency(total, primaryCurrency)}
              <span className="text-base font-normal text-bento-subtle">
                {" / "}
                {formatCurrency(goal, primaryCurrency)}
              </span>
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bento-hairline">
                <div
                  className="h-full rounded-full bg-bento-brand transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-xs font-medium tabular-nums">
                {Math.round(pct)}%
              </span>
            </div>

            <p className="mt-3 text-xs text-bento-subtle">
              {remaining > 0 ? (
                <>{formatCurrency(remaining, primaryCurrency)} to go</>
              ) : (
                "Target reached."
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
