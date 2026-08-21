"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/hooks/use-token";
import { getTransactionsForMonth } from "@/lib/lunchmoney/client";
import { computeAverageMonthlySpend } from "@/lib/lunchmoney/analytics";
import { computeNetWorth } from "@/lib/account-utils";
import { useAppData } from "@/hooks/use-app-data";
import {
  type InvestableState,
  isCheckingAccount,
  isSavingsAccount,
  getLastThreeFullMonths,
} from "@/lib/investable-utils";
import { InvestableCashCard } from "@/components/accounts/investable-cash-card";
import { AccountSection } from "@/components/accounts/account-section";
import { AnimatedCollapse } from "@/components/animated-collapse";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const { isAuthenticated } = useToken();
  const { accounts, primaryCurrency, categoryMap, loading, error } =
    useAppData();
  const [investable, setInvestable] = useState<InvestableState>({
    status: "idle",
  });
  const [showInactive, setShowInactive] = useState(false);
  const [floorMonths] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const raw = localStorage.getItem("investable_months");
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  });

  useEffect(() => {
    const activeAccounts = accounts.filter((a) => a.status === "active");
    if (!isAuthenticated || activeAccounts.length === 0) return;

    let ignore = false;

    async function run() {
      setInvestable({ status: "loading" });

      const months = getLastThreeFullMonths(new Date());
      try {
        const monthlyTxArrays = await Promise.all(
          months.map(({ year, month }) =>
            getTransactionsForMonth(year, month).then((r) => r.transactions)
          )
        );

        if (ignore) return;

        const avgMonthlySpend = computeAverageMonthlySpend(
          monthlyTxArrays,
          categoryMap
        );
        const totalCheckingBalance = activeAccounts
          .filter(isCheckingAccount)
          .reduce((sum, a) => sum + a.toBase, 0);
        const totalSavingsBalance = activeAccounts
          .filter(isSavingsAccount)
          .reduce((sum, a) => sum + a.toBase, 0);

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
        if (ignore) return;
        setInvestable({
          status: "error",
          message:
            err instanceof Error ? err.message : "Could not load transactions",
        });
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [isAuthenticated, accounts, categoryMap, floorMonths]);

  if (!isAuthenticated) return <NoTokenPrompt />;

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const inactiveAccounts = accounts.filter((a) => a.status !== "active");

  const assets = activeAccounts.filter((a) => !a.isLiability);
  const liabilities = activeAccounts.filter((a) => a.isLiability);

  const { totalAssets, totalLiabilities, netWorth } = computeNetWorth(accounts);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      {/* Net worth hero */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm text-bento-subtle">Net Worth</p>
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-bento-muted" />
        ) : (
          <p
            className={cn(
              "font-heading text-5xl font-bold",
              netWorth < 0 && "text-bento-danger"
            )}
          >
            {formatCurrency(netWorth, primaryCurrency, true)}
          </p>
        )}

        {!loading && !error && accounts.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-10 sm:gap-16">
            <div className="text-right">
              <p className="text-xs text-bento-subtle">Assets</p>
              <p className="font-mono text-sm font-medium text-bento-positive">
                {formatCurrency(totalAssets, primaryCurrency, true)}
              </p>
            </div>
            <div className="h-10 w-px bg-bento-hairline" />
            <div className="text-left">
              <p className="text-xs text-bento-subtle">Liabilities</p>
              <p className="font-mono text-sm font-medium text-bento-danger">
                {formatCurrency(totalLiabilities, primaryCurrency, true)}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-bento-muted"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bento-danger">{error}</p>
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
              <p className="text-center text-sm text-bento-subtle">
                No accounts found.
              </p>
            )}
          </div>
          {inactiveAccounts.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => setShowInactive((v) => !v)}
                className="mb-3 flex items-center gap-1.5 text-sm text-bento-subtle transition-colors hover:text-bento-default"
              >
                <span>{showInactive ? "▾" : "▸"}</span>
                {inactiveAccounts.length} inactive or revoked{" "}
                {inactiveAccounts.length === 1 ? "account" : "accounts"}
              </button>
              <AnimatedCollapse open={showInactive}>
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6">
                  <AccountSection
                    title="Inactive / Revoked"
                    accounts={inactiveAccounts.filter((a) => !a.isLiability)}
                    total={0}
                    primaryCurrency={primaryCurrency}
                  />
                  <AccountSection
                    title="Inactive / Revoked"
                    accounts={inactiveAccounts.filter((a) => a.isLiability)}
                    total={0}
                    primaryCurrency={primaryCurrency}
                  />
                </div>
              </AnimatedCollapse>
            </div>
          )}
        </>
      )}
    </div>
  );
}
