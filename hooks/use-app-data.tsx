"use client";

import { createContext, use, useEffect, useState } from "react";
import type { AccountType } from "@lunch-money/lunch-money-js-v2";
import {
  getAccounts,
  getCategories,
  getMe,
  type UserInfo,
} from "@/lib/lunchmoney/client";
import {
  buildCategoryData,
  type CategoryGroupEntry,
} from "@/lib/lunchmoney/analytics";
import { type NormalizedAccount, normalizeAccounts } from "@/lib/account-utils";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import { useToken } from "@/hooks/use-token";

/** Everything that depends only on the account, not on the month on screen. */
type AppData = {
  user: UserInfo | null;
  primaryCurrency: string;
  accounts: NormalizedAccount[];
  categoryMap: Map<number, CategoryInfo>;
  catGroups: CategoryGroupEntry[];
};

interface AppDataContextValue extends AppData {
  loading: boolean;
  error: string | null;
  patchAccount: (id: string, type: AccountType, subtype: string) => void;
}

/** Stable identities, so consumers' memo deps don't churn while loading. */
const EMPTY: AppData = {
  user: null,
  primaryCurrency: "usd",
  accounts: [],
  categoryMap: new Map(),
  catGroups: [],
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { token, isDemo } = useToken();
  /** Which account this data belongs to; null when signed out. */
  const session = isDemo ? "demo" : token;

  const [loaded, setLoaded] = useState<{
    session: string;
    data: AppData;
  } | null>(null);
  const [failure, setFailure] = useState<{
    session: string;
    message: string;
  } | null>(null);

  // Both results are tagged with the session they were fetched for, so signing
  // out or switching accounts drops them without a reset step.
  const data = loaded?.session === session ? loaded.data : null;
  const error = failure?.session === session ? failure.message : null;

  useEffect(() => {
    if (session === null) return;

    let cancelled = false;

    Promise.all([getMe(), getAccounts(), getCategories()])
      .then(([user, { manual, plaid }, catRes]) => {
        if (cancelled) return;
        setLoaded({
          session,
          data: {
            user,
            primaryCurrency: user.primary_currency,
            accounts: normalizeAccounts(manual, plaid),
            ...buildCategoryData(catRes),
          },
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          session,
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  function patchAccount(id: string, type: AccountType, subtype: string) {
    setLoaded((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            data: {
              ...prev.data,
              accounts: prev.data.accounts.map((a) =>
                a.id === id ? { ...a, type, subtype: subtype || null } : a
              ),
            },
          }
    );
  }

  return (
    <AppDataContext.Provider
      value={{
        ...(data ?? EMPTY),
        // Derived rather than a flag: signed in with neither result yet means
        // the request is still out.
        loading: session !== null && data === null && error === null,
        error,
        patchAccount,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = use(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
