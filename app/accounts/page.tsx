"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/hooks/use-token";
import {
  getAccounts,
  getCategories,
  getMe,
  getTransactionsForMonth,
} from "@/lib/lunchmoney/client";
import {
  buildCategoryMap,
  computeAverageMonthlySpend,
} from "@/lib/lunchmoney/analytics";
import { type NormalizedAccount, normalizeAccounts } from "@/lib/account-utils";
import { useFetchStatus } from "@/hooks/use-fetch-status";
import {
  type InvestableState,
  isCheckingAccount,
  isSavingsAccount,
  getLastThreeFullMonths,
} from "@/lib/investable-utils";
import { InvestableCashCard } from "@/components/accounts/investable-cash-card";
import { AccountSection } from "@/components/accounts/account-section";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const { token } = useToken();
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [{ loading, error }, setFetchStatus] = useFetchStatus();
  const [investable, setInvestable] = useState<InvestableState>({
    status: "idle",
  });
  const [floorMonths] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const raw = localStorage.getItem("investable_months");
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  });

  // Non-blocking secondary fetch: triggers after accounts load
  useEffect(() => {
    if (!token || accounts.length === 0) return;
    const t = token;

    async function load() {
      setInvestable({ status: "loading" });

      const months = getLastThreeFullMonths(new Date());
      try {
        const [catMap, monthlyTxArrays] = await Promise.all([
          getCategories(t).then((r) => buildCategoryMap(r)),
          Promise.all(
            months.map(({ year, month }) =>
              getTransactionsForMonth(t, year, month).then(
                (r) => r.transactions
              )
            )
          ),
        ]);

        const avgMonthlySpend = computeAverageMonthlySpend(
          monthlyTxArrays,
          catMap
        );
        const totalCheckingBalance = accounts
          .filter(isCheckingAccount)
          .reduce((sum, a) => sum + (a.balanceValid ? a.toBase : 0), 0);
        const totalSavingsBalance = accounts
          .filter(isSavingsAccount)
          .reduce((sum, a) => sum + (a.balanceValid ? a.toBase : 0), 0);

        const savingsTarget = avgMonthlySpend * floorMonths;
        const savingsFunded = totalSavingsBalance >= savingsTarget;
        const savingsShortfall = Math.max(
          0,
          savingsTarget - totalSavingsBalance
        );
        const checkingSurplus = Math.max(
          0,
          totalCheckingBalance - avgMonthlySpend
        );

        setInvestable({
          status: "ready",
          investableAmount: savingsFunded ? checkingSurplus : 0,
          totalCheckingBalance,
          checkingFloor: avgMonthlySpend,
          totalSavingsBalance,
          savingsTarget,
          savingsFunded,
          savingsShortfall,
          avgMonthlySpend,
          savingsMonths: floorMonths,
        });
      } catch (err) {
        setInvestable({
          status: "error",
          message:
            err instanceof Error ? err.message : "Could not load transactions",
        });
      }
    }

    load();
  }, [token, accounts, floorMonths]);

  useEffect(() => {
    if (!token) return;
    const t = token;

    async function load() {
      setFetchStatus({ loading: true, error: null });
      getMe(t)
        .then((user) => setPrimaryCurrency(user.primary_currency))
        .catch(() => {});
      try {
        const { manual, plaid } = await getAccounts(t);
        setAccounts(normalizeAccounts(manual, plaid));
        setFetchStatus({ loading: false, error: null });
      } catch (err) {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }

    load();
  }, [token, setFetchStatus]);

  if (!token) return <NoTokenPrompt />;

  const assets = accounts.filter(
    (a) => !a.isLiability && a.status !== "closed"
  );
  const liabilities = accounts.filter(
    (a) => a.isLiability && a.status !== "closed"
  );

  const totalAssets = assets.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );
  const totalLiabilities = liabilities.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      {/* Net worth hero */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Net Worth</p>
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        ) : (
          <p
            className={cn(
              "font-heading text-5xl font-bold",
              netWorth < 0 && "text-destructive"
            )}
          >
            {formatCurrency(netWorth, primaryCurrency, true)}
          </p>
        )}

        {!loading && !error && accounts.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-10 sm:gap-16">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                {formatCurrency(totalAssets, primaryCurrency, true)}
              </p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Liabilities</p>
              <p className="font-mono text-sm font-medium text-destructive">
                {formatCurrency(totalLiabilities, primaryCurrency, true)}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          {accounts.length > 0 && (
            <InvestableCashCard
              state={investable}
              primaryCurrency={primaryCurrency}
            />
          )}
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6">
            <AccountSection
              title="Assets"
              accounts={assets}
              total={totalAssets}
              primaryCurrency={primaryCurrency}
            />
            <AccountSection
              title="Liabilities"
              accounts={liabilities}
              total={totalLiabilities}
              primaryCurrency={primaryCurrency}
            />
            {accounts.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No accounts found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
