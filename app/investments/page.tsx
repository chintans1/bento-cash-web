"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/hooks/use-token";
import {
  getTransactionsForMonth,
  type Transaction,
} from "@/lib/lunchmoney/client";
import { groupByInstitution } from "@/lib/account-utils";
import { isInvestment } from "@/lib/investment-utils";
import { isCheckingAccount, isSavingsAccount } from "@/lib/investable-utils";
import {
  computeAverageMonthlySpend,
  computeAverageMonthlyIncome,
} from "@/lib/lunchmoney/analytics";
import { useAppData } from "@/hooks/use-app-data";
import { AccountRow } from "@/components/investments/account-row";
import { AllocationBreakdown } from "@/components/investments/allocation-breakdown";
import { GrowthProjection } from "@/components/investments/growth-projection";
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
import { cn } from "@/lib/utils";

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

  const [monthlyHistories, setMonthlyHistories] = useState<Transaction[][]>([]);
  const [txHistoryReady, setTxHistoryReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadTransactionHistory() {
      try {
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
          return { year: d.getFullYear(), month: d.getMonth() + 1 };
        }).reverse();

        const txResults = await Promise.all(
          months.map(({ year, month }) =>
            getTransactionsForMonth(year, month).then((r) => r.transactions)
          )
        );

        setMonthlyHistories(txResults);
      } catch {
        // Non-critical; silently ignore
      } finally {
        setTxHistoryReady(true);
      }
    }

    loadTransactionHistory();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <NoTokenPrompt />;

  const accounts = allAccounts.filter((a) => a.status !== "closed");

  const avgMonthlySpend = txHistoryReady
    ? computeAverageMonthlySpend(monthlyHistories, categoryMap)
    : null;
  const avgMonthlyIncome = txHistoryReady
    ? computeAverageMonthlyIncome(monthlyHistories, categoryMap)
    : null;

  const investmentAccounts = accounts.filter(isInvestment);
  const nonInvestmentAccounts = accounts.filter((a) => !isInvestment(a));

  const checkingAccounts = nonInvestmentAccounts.filter(isCheckingAccount);
  const savingsAccounts = nonInvestmentAccounts.filter(isSavingsAccount);
  const otherAccounts = nonInvestmentAccounts.filter(
    (a) => !isCheckingAccount(a) && !isSavingsAccount(a)
  );

  const totalPortfolio = investmentAccounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  const cashTotal = [...checkingAccounts, ...savingsAccounts].reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  const liabilityTotal = otherAccounts
    .filter((a) => a.isLiability)
    .reduce((sum, a) => sum + (a.balanceValid ? a.toBase : 0), 0);

  const investmentGroups = groupByInstitution(investmentAccounts);
  const otherGroups = groupByInstitution(otherAccounts);

  function renderBody() {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      );
    }

    if (error) {
      return <p className="text-sm text-bento-danger">{error}</p>;
    }

    return (
      <>
        <StatsStrip
          investmentTotal={totalPortfolio}
          cashTotal={cashTotal}
          liabilityTotal={liabilityTotal}
          primaryCurrency={primaryCurrency}
          avgMonthlyIncome={avgMonthlyIncome}
          avgMonthlySpend={avgMonthlySpend}
          txHistoryReady={txHistoryReady}
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
                  {investmentGroups.map(([institution, group], i) => {
                    const groupTotal = group.reduce(
                      (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
                      0
                    );
                    return (
                      <div
                        key={institution}
                        className={cn(
                          i > 0 && "border-t border-bento-hairline"
                        )}
                      >
                        <div className="flex items-baseline justify-between bg-bento-raised px-6 py-2">
                          <span className="text-xs font-semibold tracking-wide text-bento-subtle uppercase">
                            {institution}
                          </span>
                          <span className="font-mono text-xs font-medium tabular-nums">
                            {formatCurrency(groupTotal, primaryCurrency, true)}
                          </span>
                        </div>
                        <ul className="flex flex-col px-6">
                          {group.map((a) => (
                            <AccountRow
                              key={a.id}
                              account={a}
                              primaryCurrency={primaryCurrency}
                              onSaved={patchAccount}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Growth projection card */}
        {investmentAccounts.length > 0 && (
          <GrowthProjection
            currentPortfolio={totalPortfolio}
            primaryCurrency={primaryCurrency}
            monthlyHistories={txHistoryReady ? monthlyHistories : undefined}
            catMap={txHistoryReady ? categoryMap : undefined}
          />
        )}

        {/* Other accounts card */}
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
              {otherGroups.map(([institution, group], i) => (
                <div
                  key={institution}
                  className={cn(i > 0 && "border-t border-bento-hairline")}
                >
                  <div className="flex items-baseline justify-between bg-bento-raised px-6 py-2">
                    <span className="text-xs font-semibold tracking-wide text-bento-subtle uppercase">
                      {institution}
                    </span>
                  </div>
                  <ul className="flex flex-col px-6">
                    {group.map((a) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        primaryCurrency={primaryCurrency}
                        onSaved={patchAccount}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </>
    );
  }

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

      {renderBody()}
    </div>
  );
}
