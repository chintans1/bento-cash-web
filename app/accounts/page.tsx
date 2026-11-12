"use client";

import { ChevronRight, Search, TriangleAlert, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import type { NormalizedAccount } from "@/lib/account-utils";
import { getAccountStatus } from "@/lib/account-status";
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
import { AccountRow } from "@/components/accounts/account-row";
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
import { PlaidRefreshButton } from "@/components/accounts/plaid-refresh-button";

const SPEND_LOOKBACK_MONTHS = 3;

function AccountDisclosure({
  label,
  count,
  ref,
  children,
}: {
  label: string;
  count: number;
  ref?: Ref<HTMLDetailsElement>;
  children: ReactNode;
}) {
  return (
    <details ref={ref} className="group/disclosure mt-2">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg text-xs text-bento-subtle hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-4 group-open/disclosure:rotate-90"
        />
        {label}
        <span className="rounded-md bg-bento-raised px-1.5 py-0.5 tabular-nums">
          {count}
        </span>
      </summary>
      <Card className="gap-0 py-0">{children}</Card>
    </details>
  );
}

export default function AccountsPage() {
  const { hasDataSource, dataScopeKey, activeConnection, isDemo } = useAuth();
  const { accounts, primaryCurrency, categoryMap, loading, error } =
    useAppData();
  const { months: floorMonths } = useInvestableMonths();
  const history = useTransactionHistory(SPEND_LOOKBACK_MONTHS, dataScopeKey);
  const netWorthHistory = useBalanceHistory(dataScopeKey);
  const [grouping, setGrouping] = useState<AccountGrouping>("type");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const attentionDisclosure = useRef<HTMLDetailsElement>(null);
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
  const needsAttention = accounts.filter(
    (account) => getAccountStatus(account.status).tone === "attention"
  );
  const syncing = accounts.filter((account) => account.status === "syncing");
  const inactive = accounts.filter(
    (account) =>
      account.status !== "active" &&
      account.status !== "syncing" &&
      getAccountStatus(account.status).tone !== "attention"
  );
  const search = query.trim().toLowerCase();
  const matches = (account: (typeof accounts)[number]) =>
    [
      account.name,
      account.institution,
      account.type,
      account.subtype,
      account.status,
      getAccountStatus(account.status).label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  const visibleActive = active.filter(matches);
  const visibleInactive = inactive.filter(matches);
  const attentionRows = needsAttention
    .filter(matches)
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const syncingRows = syncing
    .filter(matches)
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const groups = groupAccounts(visibleActive, grouping);
  const inactiveGroups = groupAccounts(visibleInactive, grouping);
  const institutionCount = new Set(
    accounts.map((account) => account.institution?.trim()).filter(Boolean)
  ).size;
  const matchCount =
    visibleActive.length +
    attentionRows.length +
    syncingRows.length +
    visibleInactive.length;
  const showRefresh =
    !isDemo &&
    activeConnection &&
    accounts.some((account) => account.source === "plaid");

  function showAttention() {
    const details = attentionDisclosure.current;
    if (!details) return;
    setQuery("");
    details.open = true;
    const summary = details.querySelector("summary");
    summary?.scrollIntoView({ block: "nearest" });
    summary?.focus({ preventScroll: true });
  }

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
                <span className="ml-1 text-bento-subtle">
                  {accounts.length}
                </span>
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
              {(needsAttention.length > 0 || showRefresh) && (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-bento-hairline px-(--card-spacing) py-panel-row">
                  {needsAttention.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="bg-warning/10 text-xs text-warning-foreground hover:bg-warning/20 hover:text-warning-foreground dark:hover:bg-warning/20"
                      onClick={showAttention}
                    >
                      <TriangleAlert aria-hidden="true" className="size-3.5" />
                      {needsAttention.length}{" "}
                      {needsAttention.length === 1
                        ? "account requires"
                        : "accounts require"}{" "}
                      attention
                    </Button>
                  )}
                  {showRefresh && (
                    <PlaidRefreshButton
                      key={activeConnection.id}
                      connectionId={activeConnection.id}
                      budgetId={activeConnection.externalAccountId}
                    />
                  )}
                </div>
              )}
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
              {syncingRows.length > 0 && (
                <AccountSection
                  groupId="syncing"
                  title="Syncing"
                  accounts={syncingRows}
                  primaryCurrency={primaryCurrency}
                  onSelect={selectAccount}
                />
              )}
              {groups.length === 0 && syncingRows.length === 0 && (
                <div role="status" className="px-5 py-12 text-center">
                  <p className="text-sm font-medium">
                    {search && matchCount === 0
                      ? "No matching accounts"
                      : "No active accounts to show"}
                  </p>
                  {search && (
                    <p className="mt-2 text-xs text-bento-subtle">
                      {matchCount > 0
                        ? "Matching accounts are in the sections below."
                        : "Try another account name, institution, type, or status."}
                    </p>
                  )}
                </div>
              )}
              <div className="border-t border-bento-hairline px-(--card-spacing) py-panel-row text-xs text-bento-subtle">
                {search
                  ? `${matchCount} of ${accounts.length} accounts`
                  : "Balances shown in " + primaryCurrency.toUpperCase()}
                {grouping === "institution" &&
                  " · Institution totals are net of liabilities"}
              </div>
            </Card>
            {needsAttention.length > 0 && (
              <AccountDisclosure
                label="Needs attention"
                count={attentionRows.length}
                ref={attentionDisclosure}
              >
                {attentionRows.length > 0 ? (
                  <ul aria-label="Accounts that need attention">
                    {attentionRows.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        primaryCurrency={primaryCurrency}
                        onSelect={selectAccount}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-bento-subtle">
                    No matching accounts that need attention.
                  </p>
                )}
              </AccountDisclosure>
            )}
            {inactive.length > 0 && (
              <AccountDisclosure
                label="Inactive accounts"
                count={visibleInactive.length}
              >
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
              </AccountDisclosure>
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
          key={selectedAccount.id}
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
