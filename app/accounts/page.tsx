"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { NormalizedAccount } from "@/lib/account-utils";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useInvestableMonths } from "@/hooks/use-investable-months";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import {
  computeInvestable,
  type InvestableState,
} from "@/lib/investable-utils";
import { groupAccounts, type AccountGrouping } from "@/lib/account-groups";
import { InvestableCashCard } from "@/components/accounts/investable-cash-card";
import { AccountSection } from "@/components/accounts/account-section";
import { AccountSummary } from "@/components/accounts/account-summary";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBalanceHistory } from "@/hooks/use-balance-history";
import { NetWorthPerformanceCard } from "@/components/accounts/net-worth-performance-card";
import { AccountSegmentedControl } from "@/components/accounts/account-segmented-control";
import { AccountDetailSheet } from "@/components/accounts/account-detail-sheet";

const SPEND_LOOKBACK_MONTHS = 3;

export default function AccountsPage() {
  const { hasDataSource, dataScopeKey } = useAuth();
  const { accounts, primaryCurrency, categoryMap, loading, error } =
    useAppData();
  const { months: floorMonths } = useInvestableMonths();
  const history = useTransactionHistory(SPEND_LOOKBACK_MONTHS, dataScopeKey);
  const netWorthHistory = useBalanceHistory(dataScopeKey);
  const [showInactive, setShowInactive] = useState(false);
  const [grouping, setGrouping] = useState<AccountGrouping>("type");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const selectedAccount = accounts.find((account) => account.id === selectedId);

  function selectAccount(
    account: NormalizedAccount,
    trigger: HTMLButtonElement
  ) {
    detailsTrigger.current = trigger;
    setSelectedId(account.id);
    setDetailsOpen(true);
  }
  const active = useMemo(
    () => accounts.filter((account) => account.status === "active"),
    [accounts]
  );
  const inactive = accounts.filter((account) => account.status !== "active");
  const search = query.trim().toLowerCase();
  const matches = (account: (typeof accounts)[number]) =>
    [account.name, account.institution, account.type, account.subtype]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  const visibleActive = active.filter(matches);
  const visibleInactive = inactive.filter(matches);
  const groups = groupAccounts(visibleActive, grouping);
  const inactiveGroups = groupAccounts(visibleInactive, grouping);
  const institutionCount = new Set(
    active.map((account) => account.institution?.trim()).filter(Boolean)
  ).size;

  const investable = useMemo<InvestableState>(() => {
    if (history.error) return { status: "error", message: history.error };
    if (!history.months) return { status: "loading" };
    return {
      status: "ready",
      ...computeInvestable(active, history.months, categoryMap, floorMonths),
    };
  }, [history, active, categoryMap, floorMonths]);

  if (!hasDataSource) return <ConnectionPrompt />;

  return (
    <div>
      <header className="mb-page-gap">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Accounts
        </h1>
      </header>
      {loading ? (
        <div
          aria-label="Loading accounts"
          role="status"
          className="grid gap-page-gap @4xl/main:grid-cols-accounts"
        >
          <Skeleton className="h-96 rounded-4xl" />
          <Skeleton className="h-120 rounded-4xl" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-bento-danger">
          {error}
        </p>
      ) : accounts.length === 0 ? (
        <Card className="items-center px-6 py-14 text-center">
          <h2 className="font-heading text-xl">No accounts in this budget</h2>
        </Card>
      ) : (
        <div className="grid items-start gap-page-gap @4xl/main:grid-cols-accounts">
          <section aria-label="Account list" className="min-w-0">
            <div className="mb-panel-row flex min-h-6 flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">
                All accounts{" "}
                <span className="ml-1 text-bento-subtle">{active.length}</span>
              </h2>
              <span className="text-xs text-bento-subtle">
                {institutionCount}{" "}
                {institutionCount === 1 ? "institution" : "institutions"} ·{" "}
                {primaryCurrency.toUpperCase()}
              </span>
            </div>
            <Card className="gap-0 py-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bento-hairline px-(--card-spacing) py-panel-row">
                <AccountSegmentedControl
                  label="Group accounts by"
                  options={[
                    { value: "type", label: "By type" },
                    { value: "institution", label: "By institution" },
                  ]}
                  value={grouping}
                  onChange={setGrouping}
                />
                <div className="relative min-w-36 flex-1 sm:max-w-52">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 left-2.5 size-4 text-bento-subtle"
                  />
                  <Input
                    type="search"
                    aria-label="Search accounts"
                    placeholder="Search accounts"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={cn(
                      "h-8 rounded-lg pl-8 text-sm md:text-xs [&::-webkit-search-cancel-button]:appearance-none",
                      query ? "pr-8" : "pr-2.5"
                    )}
                  />
                  {query && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Clear search"
                      className="absolute top-0 right-0 size-8 rounded-lg"
                      onClick={() => setQuery("")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {groups.map((group) => (
                <AccountSection
                  key={group.id}
                  groupId={group.id}
                  title={group.label}
                  accounts={group.accounts}
                  total={group.total}
                  primaryCurrency={primaryCurrency}
                  isLiability={group.isLiability}
                  byInstitution={grouping === "institution"}
                  onSelect={selectAccount}
                />
              ))}
              {groups.length === 0 && (
                <div role="status" className="px-5 py-12 text-center">
                  <p className="text-sm font-medium">
                    {search
                      ? "No matching active accounts"
                      : "No active accounts"}
                  </p>
                  <p className="mt-2 text-xs text-bento-subtle">
                    {search
                      ? "Try another account name, institution, or type."
                      : "Check your inactive accounts below."}
                  </p>
                </div>
              )}
              <div className="border-t border-bento-hairline px-(--card-spacing) py-panel-row text-xs text-bento-subtle">
                {search
                  ? `${visibleActive.length} of ${active.length} active accounts`
                  : "Balances shown in " + primaryCurrency.toUpperCase()}
                {grouping === "institution" &&
                  " · Institution totals are net of liabilities"}
              </div>
            </Card>
            {inactive.length > 0 && (
              <div className="mt-4">
                <button
                  aria-expanded={showInactive}
                  aria-controls="inactive-accounts"
                  onClick={() => setShowInactive((value) => !value)}
                  className="flex min-h-10 items-center gap-2 rounded-lg text-xs text-bento-subtle hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-4", !showInactive && "-rotate-90")}
                  />
                  Inactive accounts{" "}
                  <span className="rounded-md bg-bento-raised px-1.5 py-0.5 tabular-nums">
                    {visibleInactive.length}
                  </span>
                </button>
                <div
                  id="inactive-accounts"
                  hidden={!showInactive}
                  className="mt-3"
                >
                  <Card className="gap-0 py-0">
                    {inactiveGroups.map((group) => (
                      <AccountSection
                        key={group.id}
                        groupId={group.id}
                        title={group.label}
                        accounts={group.accounts}
                        total={group.total}
                        primaryCurrency={primaryCurrency}
                        isLiability={group.isLiability}
                        byInstitution={grouping === "institution"}
                        onSelect={selectAccount}
                      />
                    ))}
                    {inactiveGroups.length === 0 && (
                      <p className="px-5 py-8 text-center text-sm text-bento-subtle">
                        No matching inactive accounts.
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </section>
          <aside aria-label="Account summary" className="min-w-0">
            <h2 className="mb-panel-row flex min-h-6 items-center text-sm font-semibold">
              Summary
            </h2>
            <div className="space-y-page-gap">
              <AccountSummary
                accounts={accounts}
                primaryCurrency={primaryCurrency}
              />
              <NetWorthPerformanceCard
                compact
                history={netWorthHistory.history}
                error={netWorthHistory.error}
                accounts={accounts}
                primaryCurrency={primaryCurrency}
              />
              <InvestableCashCard
                compact
                state={investable}
                primaryCurrency={primaryCurrency}
              />
            </div>
          </aside>
        </div>
      )}
      {selectedAccount && (
        <AccountDetailSheet
          account={selectedAccount}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          finalFocus={() => detailsTrigger.current}
          history={netWorthHistory.history}
          historyError={netWorthHistory.error}
          primaryCurrency={primaryCurrency}
        />
      )}
    </div>
  );
}
