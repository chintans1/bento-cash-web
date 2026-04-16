"use client";

import Link from "next/link";
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
import {
  type NormalizedAccount,
  normalizeManual,
  normalizePlaid,
  formatSubtype,
  formatUpdated,
  groupByInstitution,
} from "@/lib/account-utils";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getLastThreeFullMonths(
  now: Date
): Array<{ year: number; month: number }> {
  return [1, 2, 3].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// Manual accounts use type="cash" with subtype="checking"/"savings".
// Plaid accounts vary (type="depository" or "cash") but subtype is always authoritative.
function isCheckingAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "checking";
}

function isSavingsAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "savings";
}

type InvestableState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      investableAmount: number;
      totalCheckingBalance: number;
      checkingFloor: number; // 1× avg monthly spend
      totalSavingsBalance: number;
      savingsTarget: number; // N× avg monthly spend
      savingsFunded: boolean; // savings >= savingsTarget
      savingsShortfall: number; // max(0, savingsTarget - savingsBalance)
      avgMonthlySpend: number;
      savingsMonths: number; // the configured N
    };

function InvestableCashCard({
  state,
  primaryCurrency,
}: {
  state: InvestableState;
  primaryCurrency: string;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Investable Cash</CardTitle>
          <Link
            href="/settings"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Adjust target
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "idle" || state.status === "loading" ? (
          <div className="space-y-3">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : state.status === "error" ? (
          <p className="text-sm text-muted-foreground">
            Could not compute — {state.message}
          </p>
        ) : (
          <>
            {/* Hero answer */}
            <div>
              <p
                className={cn(
                  "font-mono text-3xl font-bold tabular-nums",
                  state.investableAmount > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {formatCurrency(state.investableAmount, primaryCurrency, true)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {state.investableAmount > 0
                  ? "ready to invest"
                  : state.savingsFunded
                    ? "checking is at its floor"
                    : "fund your savings first"}
              </p>
            </div>

            {/* Conditions */}
            <div className="space-y-2 border-t border-border pt-3">
              {/* Condition 1: checking buffer */}
              {(() => {
                const surplus = Math.max(
                  0,
                  state.totalCheckingBalance - state.checkingFloor
                );
                const ok = state.totalCheckingBalance >= state.checkingFloor;
                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          ok
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {ok ? "✓" : "✗"}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        Checking buffer (1mo)
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(
                        state.totalCheckingBalance,
                        primaryCurrency,
                        true
                      )}
                      {" − "}
                      {formatCurrency(
                        state.checkingFloor,
                        primaryCurrency,
                        true
                      )}
                      {" = "}
                      <span
                        className={cn(
                          "font-medium",
                          ok
                            ? "text-foreground"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {formatCurrency(surplus, primaryCurrency, true)}
                      </span>
                    </span>
                  </div>
                );
              })()}

              {/* Condition 2: savings emergency fund */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      state.savingsFunded
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {state.savingsFunded ? "✓" : "✗"}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    Emergency fund ({state.savingsMonths}mo)
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                  {formatCurrency(
                    state.totalSavingsBalance,
                    primaryCurrency,
                    true
                  )}
                  {" / "}
                  <span
                    className={cn(
                      "font-medium",
                      state.savingsFunded
                        ? "text-foreground"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {formatCurrency(state.savingsTarget, primaryCurrency, true)}
                  </span>
                  {!state.savingsFunded && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {" (−"}
                      {formatCurrency(
                        state.savingsShortfall,
                        primaryCurrency,
                        true
                      )}
                      {")"}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              avg{" "}
              {formatCurrency(state.avgMonthlySpend, primaryCurrency, false)}/mo
              · last 3 months
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AccountRow({
  account,
  primaryCurrency,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
}) {
  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";

  return (
    <li className="flex items-center gap-3 border-b border-border/50 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isInactive && "text-muted-foreground"
            )}
          >
            {account.name}
          </span>
          {account.subtype && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {formatSubtype(account.subtype)}
            </span>
          )}
          {isInactive && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {account.status}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {account.balanceValid ? (
          <>
            <span className="font-mono text-sm font-medium tabular-nums">
              {showNative
                ? formatCurrency(account.balance, account.currency, true)
                : formatCurrency(account.toBase, primaryCurrency, true)}
            </span>
            {showNative && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                ≈ {formatCurrency(account.toBase, primaryCurrency, true)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatUpdated(account.lastUpdated)}
        </span>
      </div>
    </li>
  );
}

function AccountSection({
  title,
  accounts,
  total,
  primaryCurrency,
}: {
  title: string;
  accounts: NormalizedAccount[];
  total: number;
  primaryCurrency: string;
}) {
  if (accounts.length === 0) return null;

  const groups = groupByInstitution(accounts);

  return (
    <Card className="pb-0">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatCurrency(total, primaryCurrency, true)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {groups.map(([institution, groupAccounts], i) => {
          const groupTotal = groupAccounts.reduce(
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
                  {formatCurrency(groupTotal, primaryCurrency, true)}
                </span>
              </div>
              <ul className="flex flex-col px-6">
                {groupAccounts.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    primaryCurrency={primaryCurrency}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function AccountsPage() {
  const { token } = useToken();
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });
  const [investable, setInvestable] = useState<InvestableState>({
    status: "idle",
  });
  const [floorMonths, setFloorMonths] = useState<number>(3);

  // SSR-safe: read localStorage preference for floor months
  useEffect(() => {
    const raw = localStorage.getItem("investable_months");
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFloorMonths(Number.isFinite(parsed) && parsed > 0 ? parsed : 3);
  }, []);

  // Non-blocking secondary fetch: triggers after accounts load
  useEffect(() => {
    if (!token || accounts.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvestable({ status: "loading" });

    const months = getLastThreeFullMonths(new Date());
    const catMapPromise = getCategories(token).then((r) => buildCategoryMap(r));
    const txPromises = months.map(({ year, month }) =>
      getTransactionsForMonth(token, year, month).then((r) => r.transactions)
    );

    Promise.all([catMapPromise, Promise.all(txPromises)])
      .then(([catMap, monthlyTxArrays]) => {
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

        // Checking must always hold 1 month of expenses for cash flow
        const checkingFloor = avgMonthlySpend;
        // Savings must hold N months as the emergency fund
        const savingsTarget = avgMonthlySpend * floorMonths;
        const savingsFunded = totalSavingsBalance >= savingsTarget;
        const savingsShortfall = Math.max(
          0,
          savingsTarget - totalSavingsBalance
        );

        // Only the checking surplus is investable, and only once savings is funded
        const checkingSurplus = Math.max(
          0,
          totalCheckingBalance - checkingFloor
        );
        const investableAmount = savingsFunded ? checkingSurplus : 0;

        setInvestable({
          status: "ready",
          investableAmount,
          totalCheckingBalance,
          checkingFloor,
          totalSavingsBalance,
          savingsTarget,
          savingsFunded,
          savingsShortfall,
          avgMonthlySpend,
          savingsMonths: floorMonths,
        });
      })
      .catch((err) => {
        setInvestable({
          status: "error",
          message:
            err instanceof Error ? err.message : "Could not load transactions",
        });
      });
  }, [token, accounts, floorMonths]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchStatus({ loading: true, error: null });

    getMe(token)
      .then((user) => setPrimaryCurrency(user.primary_currency))
      .catch(() => {}); // Non-fatal — fall back to usd

    getAccounts(token)
      .then(({ manual, plaid }) => {
        const all = [
          ...manual.map(normalizeManual),
          ...plaid.map(normalizePlaid),
        ];
        setAccounts(all);
        setFetchStatus({ loading: false, error: null });
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      });
  }, [token]);

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
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10">
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
          <div className="mt-4 grid grid-cols-3 items-center">
            <div className="-mr-36 text-right">
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                {formatCurrency(totalAssets, primaryCurrency, true)}
              </p>
            </div>
            <div className="flex justify-center">
              <div className="-px-36 h-10 w-px bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="-ml-36 text-left">
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
          <div className="grid grid-cols-2 items-start gap-6">
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
