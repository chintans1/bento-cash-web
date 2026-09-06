"use client";

import { useToken } from "@/hooks/use-token";
import { groupByInstitution, sumBalances } from "@/lib/account-utils";
import { isInvestment } from "@/lib/investment-utils";
import { isCheckingAccount, isSavingsAccount } from "@/lib/investable-utils";
import {
  computeAverageMonthlySpend,
  computeAverageMonthlyIncome,
} from "@/lib/lunchmoney/analytics";
import { useAppData } from "@/hooks/use-app-data";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import { AllocationBreakdown } from "@/components/investments/allocation-breakdown";
import { GrowthProjection } from "@/components/investments/growth-projection";
import { InstitutionGroups } from "@/components/investments/institution-groups";
import { CashOverview } from "@/components/investments/cash-overview";
import { StatsStrip } from "@/components/investments/stats-strip";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

  if (!isAuthenticated) return <NoTokenPrompt />;

  const accounts = allAccounts.filter((a) => a.status !== "closed");
  const investmentAccounts = accounts.filter(isInvestment);
  const rest = accounts.filter((a) => !isInvestment(a));

  const checkingAccounts = rest.filter(isCheckingAccount);
  const savingsAccounts = rest.filter(isSavingsAccount);
  const otherAccounts = rest.filter(
    (a) => !isCheckingAccount(a) && !isSavingsAccount(a)
  );

  const totalPortfolio = sumBalances(investmentAccounts);
  const cashTotal = sumBalances([...checkingAccounts, ...savingsAccounts]);
  const liabilityTotal = sumBalances(
    otherAccounts.filter((a) => a.isLiability)
  );

  const avgMonthlySpend = history
    ? computeAverageMonthlySpend(history, categoryMap)
    : null;
  const avgMonthlyIncome = history
    ? computeAverageMonthlyIncome(history, categoryMap)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10">
      {/* Hero */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm text-bento-subtle">Portfolio Value</p>
        {loading ? (
          <Skeleton className="mx-auto h-12 w-56 rounded-lg" />
        ) : (
          <p className="font-heading text-4xl font-bold sm:text-5xl">
            {formatCurrency(totalPortfolio, primaryCurrency, true)}
          </p>
        )}
        {!loading && !error && investmentAccounts.length > 0 && (
          <p className="mt-1 text-sm text-bento-subtle">
            across {investmentAccounts.length} account
            {investmentAccounts.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
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

          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
            {/* Left column: allocation + cash */}
            <div>
              {investmentAccounts.length > 0 ? (
                <AllocationBreakdown
                  accounts={investmentAccounts}
                  primaryCurrency={primaryCurrency}
                />
              ) : (
                <Card className="mb-6">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-bento-subtle">
                      No investment accounts found.
                    </p>
                    <p className="mt-1 text-xs text-bento-subtle">
                      Set one of your accounts type to{" "}
                      <span className="font-medium">investment</span> or{" "}
                      <span className="font-medium">brokerage</span>, or set a
                      subtype like <span className="font-medium">401k</span> or{" "}
                      <span className="font-medium">IRA</span> below.
                    </p>
                  </CardContent>
                </Card>
              )}

              <CashOverview
                checkingAccounts={checkingAccounts}
                savingsAccounts={savingsAccounts}
                primaryCurrency={primaryCurrency}
                avgMonthlySpend={avgMonthlySpend}
              />
            </div>

            {/* Right column: investment accounts (scrollable) */}
            <div>
              {investmentAccounts.length > 0 && (
                <Card className="pb-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-baseline justify-between">
                      <CardTitle className="text-lg">
                        Investment Accounts
                      </CardTitle>
                      <span className="font-mono text-sm text-bento-subtle tabular-nums">
                        {formatCurrency(totalPortfolio, primaryCurrency, true)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[480px] overflow-y-auto p-0">
                    <InstitutionGroups
                      groups={groupByInstitution(investmentAccounts)}
                      primaryCurrency={primaryCurrency}
                      showTotals
                      onSaved={patchAccount}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {investmentAccounts.length > 0 && (
            <GrowthProjection
              currentPortfolio={totalPortfolio}
              primaryCurrency={primaryCurrency}
              monthlyHistories={history ?? undefined}
              catMap={history ? categoryMap : undefined}
            />
          )}

          {otherAccounts.length > 0 && (
            <Card className="mt-6 pb-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-bento-subtle">
                  Other Accounts
                </CardTitle>
                <CardDescription>
                  Reclassify accounts by editing their type or subtype to move
                  them into your portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InstitutionGroups
                  groups={groupByInstitution(otherAccounts)}
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
