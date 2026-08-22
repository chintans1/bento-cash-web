"use client";

import { useEffect, useState } from "react";
import { getAccounts, getMe } from "@/lib/lunchmoney/client";
import { normalizeAccounts, type NormalizedAccount } from "@/lib/account-utils";

/** Stable identity, so effects and memos keyed on `accounts` don't re-run while loading. */
const NO_ACCOUNTS: NormalizedAccount[] = [];

type Loaded = {
  accounts: NormalizedAccount[];
  /** The user's primary currency, e.g. "usd". */
  primaryCurrency: string;
};

/**
 * Account balances and the user's primary currency — the pair every page needs
 * and each used to fetch for itself.
 *
 * Both requests are cached at the client boundary, so mounting this on several
 * pages costs one round-trip per session, not one per page.
 */
export function useAccounts(enabled: boolean): Loaded & {
  loading: boolean;
  error: string | null;
} {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    Promise.all([getAccounts(), getMe()])
      .then(([{ manual, plaid }, user]) => {
        if (cancelled) return;
        setLoaded({
          accounts: normalizeAccounts(manual, plaid),
          primaryCurrency: user.primary_currency,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    accounts: loaded?.accounts ?? NO_ACCOUNTS,
    primaryCurrency: loaded?.primaryCurrency ?? "usd",
    // Derived rather than a flag: enabled with neither result yet means the
    // request is still out.
    loading: enabled && !loaded && !error,
    error,
  };
}
