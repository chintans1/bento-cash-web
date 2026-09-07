"use client";

import { useMemo, useState } from "react";
import { useToken } from "@/hooks/use-token";
import { computeNetWorth } from "@/lib/account-utils";
import { useAppData } from "@/hooks/use-app-data";
import { useInvestableMonths } from "@/hooks/use-investable-months";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import {
  computeInvestable,
  type InvestableState,
} from "@/lib/investable-utils";
import { InvestableCashCard } from "@/components/accounts/investable-cash-card";
import { AccountSection } from "@/components/accounts/account-section";
import { AnimatedCollapse } from "@/components/animated-collapse";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Months of spend history the investable-cash figure averages over. */
const SPEND_LOOKBACK_MONTHS = 3;

export default function AccountsPage() {
  const { isAuthenticated } = useToken();
  const { accounts, primaryCurrency, categoryMap, loading, error } =
    useAppData();
  const { months: floorMonths } = useInvestableMonths();
  const history = useTransactionHistory(SPEND_LOOKBACK_MONTHS, isAuthenticated);
  const [showInactive, setShowInactive] = useState(false);

  const active = useMemo(
    () => accounts.filter((a) => a.status === "active"),
    [accounts]
  );
  const inactive = accounts.filter((a) => a.status !== "active");
  const { totalAssets, totalLiabilities, netWorth } = computeNetWorth(accounts);

  const investable = useMemo<InvestableState>(() => {
    if (history.error) return { status: "error", message: history.error };
    if (!history.months) return { status: "loading" };
    return {
      status: "ready",
      ...computeInvestable(active, history.months, categoryMap, floorMonths),
    };
  }, [history, active, categoryMap, floorMonths]);

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <h1 className="mb-5 font-heading text-2xl font-bold">Accounts</h1>
      {/* Net worth hero */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm text-bento-subtle">Net Worth</p>
        {loading ? (
          <Skeleton className="h-12 rounded-lg" />
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
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bento-danger">{error}</p>
      ) : accounts.length === 0 ? (
        <p className="text-center text-sm text-bento-subtle">
          No accounts found.
        </p>
      ) : (
        <>
          <InvestableCashCard
            state={investable}
            primaryCurrency={primaryCurrency}
          />
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6">
            <AccountSection
              title="Assets"
              accounts={active.filter((a) => !a.isLiability)}
              total={totalAssets}
              primaryCurrency={primaryCurrency}
            />
            <AccountSection
              title="Liabilities"
              accounts={active.filter((a) => a.isLiability)}
              total={totalLiabilities}
              primaryCurrency={primaryCurrency}
            />
          </div>
          {inactive.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => setShowInactive((v) => !v)}
                className="mb-3 flex items-center gap-1.5 text-sm text-bento-subtle transition-colors hover:text-bento-default"
              >
                <span>{showInactive ? "▾" : "▸"}</span>
                {inactive.length} inactive or revoked{" "}
                {inactive.length === 1 ? "account" : "accounts"}
              </button>
              <AnimatedCollapse open={showInactive}>
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6">
                  <AccountSection
                    title="Inactive / Revoked"
                    accounts={inactive.filter((a) => !a.isLiability)}
                    total={0}
                    primaryCurrency={primaryCurrency}
                  />
                  <AccountSection
                    title="Inactive / Revoked"
                    accounts={inactive.filter((a) => a.isLiability)}
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
