"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/hooks/use-token";
import { getAccounts, getMe } from "@/lib/lunchmoney/client";
import type { AccountType } from "@lunch-money/lunch-money-js-v2";
import {
  type NormalizedAccount,
  normalizeAccounts,
  groupByInstitution,
} from "@/lib/account-utils";
import { useFetchStatus } from "@/hooks/use-fetch-status";
import { isInvestment } from "@/lib/investment-utils";
import { AccountRow } from "@/components/investments/account-row";
import { AllocationBreakdown } from "@/components/investments/allocation-breakdown";
import { NoTokenPrompt } from "@/components/no-token-prompt";
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
  const { token } = useToken();
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [{ loading, error }, setFetchStatus] = useFetchStatus();

  useEffect(() => {
    if (!token) return;
    const t = token;

    async function load() {
      setFetchStatus({ loading: true, error: null });
      try {
        const [user, { manual, plaid }] = await Promise.all([
          getMe(t),
          getAccounts(t),
        ]);
        setPrimaryCurrency(user.primary_currency);
        setAccounts(
          normalizeAccounts(manual, plaid).filter((a) => a.status !== "closed")
        );
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

  function handleSaved(id: string, type: AccountType, subtype: string) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, type, subtype: subtype || null } : a
      )
    );
  }

  if (!token) return <NoTokenPrompt />;

  const investmentAccounts = accounts.filter(isInvestment);
  const otherAccounts = accounts.filter((a) => !isInvestment(a));

  const totalPortfolio = investmentAccounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10">
      {/* Hero */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Portfolio Value</p>
        {loading ? (
          <div className="mx-auto h-12 w-56 animate-pulse rounded-lg bg-muted" />
        ) : (
          <p className="font-heading text-5xl font-bold">
            {formatCurrency(totalPortfolio, primaryCurrency, true)}
          </p>
        )}
        {!loading && !error && investmentAccounts.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            across {investmentAccounts.length} account
            {investmentAccounts.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 items-start gap-6">
            <div>
              {investmentAccounts.length > 0 ? (
                <AllocationBreakdown
                  accounts={investmentAccounts}
                  primaryCurrency={primaryCurrency}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No investment accounts found.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set an account&apos;s type to{" "}
                      <span className="font-medium">investment</span> or{" "}
                      <span className="font-medium">brokerage</span>, or set a
                      subtype like <span className="font-medium">401k</span> or{" "}
                      <span className="font-medium">IRA</span> below.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              {investmentAccounts.length > 0 && (
                <Card className="pb-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-baseline justify-between">
                      <CardTitle className="text-lg">
                        Investment Accounts
                      </CardTitle>
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(totalPortfolio, primaryCurrency, true)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {groupByInstitution(investmentAccounts).map(
                      ([institution, group], i) => {
                        const groupTotal = group.reduce(
                          (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
                          0
                        );
                        return (
                          <div
                            key={institution}
                            className={cn(i > 0 && "border-t border-border")}
                          >
                            <div className="flex items-baseline justify-between bg-muted/90 px-6 py-2">
                              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {institution}
                              </span>
                              <span className="font-mono text-xs font-medium tabular-nums">
                                {formatCurrency(
                                  groupTotal,
                                  primaryCurrency,
                                  true
                                )}
                              </span>
                            </div>
                            <ul className="flex flex-col px-6">
                              {group.map((a) => (
                                <AccountRow
                                  key={a.id}
                                  account={a}
                                  primaryCurrency={primaryCurrency}
                                  token={token}
                                  onSaved={handleSaved}
                                />
                              ))}
                            </ul>
                          </div>
                        );
                      }
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {otherAccounts.length > 0 && (
            <Card className="mt-6 pb-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">
                  Other Accounts
                </CardTitle>
                <CardDescription>
                  Reclassify accounts by editing their type or subtype to move
                  them into your portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-border">
                  {groupByInstitution(otherAccounts).map(
                    ([institution, group]) => (
                      <div key={institution}>
                        <div className="flex items-baseline justify-between bg-muted/90 px-6 py-2">
                          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {institution}
                          </span>
                        </div>
                        <ul className="flex flex-col px-6">
                          {group.map((a) => (
                            <AccountRow
                              key={a.id}
                              account={a}
                              primaryCurrency={primaryCurrency}
                              token={token}
                              onSaved={handleSaved}
                            />
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
