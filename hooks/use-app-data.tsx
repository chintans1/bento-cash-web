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

interface AppDataContextValue {
  user: UserInfo | null;
  primaryCurrency: string;
  accounts: NormalizedAccount[];
  categoryMap: Map<number, CategoryInfo>;
  catGroups: CategoryGroupEntry[];
  loading: boolean;
  error: string | null;
  patchAccount: (id: string, type: AccountType, subtype: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useToken();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  );
  const [catGroups, setCatGroups] = useState<CategoryGroupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!isAuthenticated) {
        setUser(null);
        setPrimaryCurrency("usd");
        setAccounts([]);
        setCategoryMap(new Map());
        setCatGroups([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [fetchedUser, { manual, plaid }, catRes] = await Promise.all([
          getMe(),
          getAccounts(),
          getCategories(),
        ]);
        setUser(fetchedUser);
        setPrimaryCurrency(fetchedUser.primary_currency);
        setAccounts(normalizeAccounts(manual, plaid));
        const { categoryMap, catGroups } = buildCategoryData(catRes);
        setCategoryMap(categoryMap);
        setCatGroups(catGroups);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [isAuthenticated]);

  function patchAccount(id: string, type: AccountType, subtype: string) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, type, subtype: subtype || null } : a
      )
    );
  }

  return (
    <AppDataContext.Provider
      value={{
        user,
        primaryCurrency,
        accounts,
        categoryMap,
        catGroups,
        loading,
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
