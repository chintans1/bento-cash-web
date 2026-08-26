"use client";

import { useEffect, useMemo, useState } from "react";
import { useToken } from "@/hooks/use-token";
import { groupByInstitution, sumBalances } from "@/lib/account-utils";
import {
  computeAllocation,
  computeContributions,
  isInvestment,
} from "@/lib/investment-utils";
import { isCheckingAccount, isSavingsAccount } from "@/lib/investable-utils";
import {
  computeAverageMonthlyIncome,
  computeAverageMonthlySpend,
} from "@/lib/lunchmoney/analytics";
import {
  getTransactionsForMonth,
  type Transaction,
} from "@/lib/lunchmoney/client";
import { useAppData } from "@/hooks/use-app-data";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import { AllocationBreakdown } from "@/components/investments/allocation-breakdown";
import { AllocationDonut } from "@/components/investments/allocation-donut";
import { CashOverview } from "@/components/investments/cash-overview";
import { ContributionsCard } from "@/components/investments/contributions-card";
import { GrowthProjection } from "@/components/investments/growth-projection";
import { HoldingsTable } from "@/components/investments/holdings-table";
import { InstitutionGroups } from "@/components/investments/institution-groups";
import { PortfolioGoalCard } from "@/components/investments/portfolio-goal-card";
import { StatsStrip } from "@/components/investments/stats-strip";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Months of history the averages and the projection's contribution run on. */
const LOOKBACK_MONTHS = 6;

export default function InvestmentsPage() {
  const { isAuthenticated } = useToken();
  const {
    accounts: allAccounts,
    primaryCurrency,
    categoryMap,
    loading,
    error,
    patchAccount,
  } = useAppData();
  // Non-critical: the page renders without it, the averages just stay blank.
  const { months: history } = useTransactionHistory(
    LOOKBACK_MONTHS,
    isAuthenticated
  );

  // Contributions use the current month. The client request cache shares this
  // fetch with any other page that asks for the same month.
  const now = useMemo(() => new Date(), []);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    getTransactionsForMonth(now.getFullYear(), now.getMonth() + 1)
      .then(({ transactions }) => {
        if (!cancelled) setMonthTransactions(transactions);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, now]);

  if (!isAuthenticated) return <NoTokenPrompt />;

  const accounts = allAccounts.filter((account) => account.status !== "closed");
  const investmentAccounts = accounts.filter(isInvestment);
  const rest = accounts.filter((account) => !isInvestment(account));
  const checkingAccounts = rest.filter(isCheckingAccount);
  const savingsAccounts = rest.filter(isSavingsAccount);
  const otherAccounts = rest.filter(
    (account) => !isCheckingAccount(account) && !isSavingsAccount(account)
  );

  const slices = computeAllocation(accounts);
  const totalPortfolio = sumBalances(investmentAccounts);
  const contributions = computeContributions(monthTransactions, accounts);
  const cashTotal = sumBalances([...checkingAccounts, ...savingsAccounts]);
  const liabilityTotal = sumBalances(
    otherAccounts.filter((account) => account.isLiability)
  );

  const avgMonthlySpend = history
    ? computeAverageMonthlySpend(history, categoryMap)
    : null;
  const avgMonthlyIncome = history
    ? computeAverageMonthlyIncome(history, categoryMap)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <h1 className="mb-5 font-heading text-2xl font-bold">Investments</h1>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-4xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-4xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-bento-danger">{error}</p>
      ) : (
        <>
          <StatsStrip
            investmentTotal={totalPortfolio}
            cashTotal={cashTotal}
            liabilityTotal={liabilityTotal}
            primaryCurrency={primaryCurrency}
            avgMonthlyIncome={avgMonthlyIncome}
            avgMonthlySpend={avgMonthlySpend}
          />

          {investmentAccounts.length === 0 ? (
            <Card className="mb-6">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-bento-subtle">
                  No investment accounts found.
                </p>
                <p className="mt-1 text-xs text-bento-subtle">
                  Set an account&apos;s type to{" "}
                  <span className="font-medium">investment</span> or{" "}
                  <span className="font-medium">brokerage</span>, or set a
                  subtype like <span className="font-medium">401k</span> or{" "}
                  <span className="font-medium">IRA</span> below.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <AllocationDonut
                    slices={slices}
                    total={totalPortfolio}
                    primaryCurrency={primaryCurrency}
                    loading={loading}
                  />
                </div>
                <div className="flex flex-col gap-6">
                  <PortfolioGoalCard
                    total={totalPortfolio}
                    primaryCurrency={primaryCurrency}
                  />
                  <ContributionsCard
                    net={contributions.net}
                    contributed={contributions.contributed}
                    withdrawn={contributions.withdrawn}
                    month={now.getMonth() + 1}
                    primaryCurrency={primaryCurrency}
                    loading={loading}
                  />
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <HoldingsTable
                    slices={slices}
                    primaryCurrency={primaryCurrency}
                  />
                </div>
                <AllocationBreakdown
                  accounts={investmentAccounts}
                  primaryCurrency={primaryCurrency}
                />
              </div>
            </>
          )}

          <CashOverview
            checkingAccounts={checkingAccounts}
            savingsAccounts={savingsAccounts}
            primaryCurrency={primaryCurrency}
            avgMonthlySpend={avgMonthlySpend}
          />

          {investmentAccounts.length > 0 && (
            <GrowthProjection
              currentPortfolio={totalPortfolio}
              primaryCurrency={primaryCurrency}
              monthlyHistories={history ?? undefined}
              catMap={history ? categoryMap : undefined}
            />
          )}

          {accounts.length > 0 && (
            <Card className="mt-6 pb-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-bento-subtle">
                  Account classification
                </CardTitle>
                <CardDescription>
                  Edit an account&apos;s type or subtype to move it in or out of
                  your portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InstitutionGroups
                  groups={groupByInstitution(accounts)}
                  primaryCurrency={primaryCurrency}
                  onSaved={patchAccount}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
