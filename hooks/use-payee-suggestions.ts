"use client";

import { useEffect, useState } from "react";
import { getTransactionsForMonth } from "@/lib/lunchmoney/client";

/**
 * How far back to look for payee names. Lunch Money has no payees endpoint, so
 * the list is derived from transactions — six months is enough to cover the
 * recurring names without making the first edit wait on a dozen requests.
 */
const LOOKBACK_MONTHS = 6;

/** Stable identity, so consumers' memo deps don't churn while loading. */
const NO_PAYEES: string[] = [];

/**
 * Every payee name used in the last few months, most-used first.
 *
 * Anchored to today rather than the month on screen: the names you want to
 * reuse don't change as you page through months, and a fixed window means the
 * request cache is hit rather than refetched on every step.
 *
 * Non-blocking — the field is editable before this resolves, it just has
 * nothing to suggest yet.
 */
export function usePayeeSuggestions(enabled: boolean): string[] {
  const [payees, setPayees] = useState<string[]>(NO_PAYEES);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const now = new Date();
    const months = Array.from({ length: LOOKBACK_MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

    Promise.all(
      months.map(({ year, month }) =>
        getTransactionsForMonth(year, month).then((r) => r.transactions)
      )
    )
      .then((monthly) => {
        if (cancelled) return;

        const counts = new Map<string, number>();
        for (const transactions of monthly) {
          for (const tx of transactions) {
            const payee = tx.payee?.trim();
            if (payee) counts.set(payee, (counts.get(payee) ?? 0) + 1);
          }
        }

        setPayees(
          [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([payee]) => payee)
        );
      })
      // Non-critical: an empty list degrades to a plain text field.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return payees;
}
