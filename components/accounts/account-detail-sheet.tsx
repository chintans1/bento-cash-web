"use client";

import { Tabs } from "@base-ui/react/tabs";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accountKey,
  creditUsage,
  formatSubtype,
  type NormalizedAccount,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import type { BalanceHistoryAccount } from "@/lib/lunchmoney/client";
import { cn } from "@/lib/utils";
import { AccountActivity } from "./account-activity";
import { detailDate, DetailFields, Metadata } from "./account-detail-fields";

const chartConfig = { balance: { label: "Balance", color: "var(--series-1)" } };
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const compactAmount = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 3,
});
const tabClass =
  "flex min-h-10 items-center border-b-2 border-transparent px-1 text-sm font-medium text-bento-subtle hover:text-bento-default focus-visible:rounded-sm focus-visible:outline-ring data-active:border-foreground data-active:text-bento-default";
const panelClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-panel pt-panel-row pb-panel focus-visible:outline-ring";

function monthLabel(month: string) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

function AccountBalanceHistory({
  account,
  history,
  error,
  primaryCurrency,
}: {
  account: NormalizedAccount;
  history: BalanceHistoryAccount[] | null;
  error: string | null;
  primaryCurrency: string;
}) {
  const snapshots =
    history?.find(({ source }) => {
      if (source.type === "manual")
        return account.id === accountKey("manual", source.manual_account_id);
      if (source.type === "plaid")
        return account.id === accountKey("plaid", source.plaid_account_id);
      return false;
    })?.balances ?? [];
  const points = snapshots
    .toSorted((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({
      ...entry,
      value:
        entry.currency.toLowerCase() === account.currency.toLowerCase()
          ? Number(entry.balance)
          : null,
    }));
  const useNative = points.every(
    (entry) => entry.value !== null && Number.isFinite(entry.value)
  );
  const currency = useNative ? account.currency : primaryCurrency;
  const chartPoints = points.map((entry) => ({
    month: entry.month,
    balance: useNative ? entry.value : entry.to_base,
  }));

  return (
    <section aria-label="Balance history" className="space-y-2">
      <h3 className="font-semibold">Balance history</h3>
      {error ? (
        <p role="alert" className="text-xs text-bento-danger">
          {error}
        </p>
      ) : !history ? (
        <Skeleton
          role="status"
          aria-label="Loading balance history"
          className="h-32 w-full"
        />
      ) : !points.length ? (
        <p className="text-xs text-bento-subtle">
          No monthly balances available.
        </p>
      ) : (
        <>
          {points.length > 1 && (
            <ChartContainer config={chartConfig} className="h-36 w-full">
              <LineChart
                data={chartPoints}
                margin={{ left: 0, right: 14, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--bento-hairline)"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value: number) => compactAmount.format(value)}
                  tickLine={false}
                  axisLine={false}
                  width={49}
                />
                <ChartTooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-bento-hairline bg-popover p-2 text-xs shadow-sm">
                        <p className="text-bento-subtle">
                          {monthLabel(payload[0].payload.month)}
                        </p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(
                            Number(payload[0].value),
                            currency,
                            true
                          )}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Line
                  type="linear"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
          <details open={points.length === 1} className="text-xs">
            <summary className="cursor-pointer rounded-sm text-bento-subtle hover:text-bento-default focus-visible:outline-ring">
              Monthly balances · {points.length}
            </summary>
            <ul className="mt-1 divide-y divide-bento-hairline">
              {points.toReversed().map((entry) => (
                <li
                  key={entry.month}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-1.5"
                >
                  <span className="text-bento-subtle">
                    {monthLabel(entry.month)}
                    {entry.type === "current" && " · Current"}
                  </span>
                  <span className="text-right font-medium tabular-nums">
                    {formatCurrency(
                      Number(entry.balance),
                      entry.currency,
                      true
                    )}
                    {entry.currency.toLowerCase() !==
                      primaryCurrency.toLowerCase() && (
                      <span className="ml-2 text-bento-subtle">
                        {formatCurrency(entry.to_base, primaryCurrency, true)}{" "}
                        {primaryCurrency.toUpperCase()}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

function LiabilityDetails({ account }: { account: NormalizedAccount }) {
  const usage = creditUsage(account);
  const reportedLimit =
    account.details?.source === "plaid"
      ? account.details.account.limit
      : account.creditLimit;
  // Keep provider-specific liability data separate from account balances and activity.
  return (
    <section aria-label="Liability details" className="space-y-2">
      <h3 className="font-semibold">Liability details</h3>
      {reportedLimit != null ? (
        <DetailFields
          fields={[
            [
              "Credit limit",
              formatCurrency(reportedLimit, account.currency, true),
            ],
            [
              "Available credit",
              usage && formatCurrency(usage.available, account.currency, true),
            ],
            [
              "Credit utilization",
              usage && `${Math.round(usage.percentUsed)}%`,
            ],
          ]}
        />
      ) : (
        <p className="text-xs text-bento-subtle">
          No additional liability details available.
        </p>
      )}
    </section>
  );
}

function AccountInformation({ account }: { account: NormalizedAccount }) {
  const manual =
    account.details?.source === "manual" ? account.details.account : null;
  const plaid =
    account.details?.source === "plaid" ? account.details.account : null;
  const sourceName = manual?.name ?? plaid?.name;

  return (
    <>
      <section aria-label="Account information" className="space-y-2">
        <h3 className="font-semibold">Account information</h3>
        <DetailFields
          fields={[
            ["Account name", sourceName !== account.name ? sourceName : null],
            ["Institution", account.institution],
            ["Type", formatSubtype(account.type)],
            ["Subtype", account.subtype && formatSubtype(account.subtype)],
            ["Currency", account.currency.toUpperCase()],
            ["Source", account.source === "plaid" ? "Plaid" : "Manual"],
            ["Closed on", detailDate(manual?.closed_on)],
            ["Created by", manual?.created_by_name],
            ["Created", detailDate(manual?.created_at, true)],
            ["Account last updated", detailDate(manual?.updated_at, true)],
            [
              "Available for manual transactions",
              manual && (manual.exclude_from_transactions ? "No" : "Yes"),
            ],
            ["Lunch Money account ID", account.rawId],
            ["External ID", manual?.external_id],
          ]}
        />
        <Metadata label="Custom account data" data={manual?.custom_metadata} />
      </section>
      {plaid && (
        <section aria-label="Plaid connection" className="space-y-2">
          <h3 className="font-semibold">Plaid connection</h3>
          <DetailFields
            fields={[
              ["Linked by", plaid.linked_by_name],
              ["Linked on", detailDate(plaid.date_linked)],
              ["Import start date", detailDate(plaid.import_start_date)],
              ["Last transaction import", detailDate(plaid.last_import, true)],
              ["Last Plaid check", detailDate(plaid.last_fetch, true)],
              [
                "Last successful bank sync",
                detailDate(plaid.plaid_last_successful_update, true),
              ],
              [
                "Allow transaction edits",
                account.allowTransactionModifications ? "Yes" : "No",
              ],
              ["Plaid connection ID", plaid.plaid_item_id],
            ]}
          />
        </section>
      )}
    </>
  );
}

export function AccountDetailSheet({
  account,
  open,
  onOpenChange,
  finalFocus,
  history,
  historyError,
  primaryCurrency,
}: {
  account: NormalizedAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: () => HTMLButtonElement | null;
  history: BalanceHistoryAccount[] | null;
  historyError: string | null;
  primaryCurrency: string;
}) {
  const mask =
    account.details?.source === "plaid" ? account.details.account.mask : null;
  const subtitle = [
    account.institution,
    formatSubtype(account.subtype || account.type),
    mask && `Ending in ${mask}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const nativeBalance = Number.isFinite(account.balance)
    ? formatCurrency(account.balance, account.currency, true)
    : null;
  const alternateCurrency =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        finalFocus={finalFocus}
        className="min-w-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <div className="px-panel pt-panel pr-14 pb-panel-row">
          <SheetTitle className="font-heading text-xl leading-tight wrap-break-word">
            {account.name}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs text-bento-subtle">
            {subtitle}
          </SheetDescription>
        </div>
        <Tabs.Root
          key={account.id}
          defaultValue="overview"
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs.List
            aria-label="Account detail views"
            className="flex shrink-0 gap-5 border-b border-bento-hairline px-panel"
          >
            <Tabs.Tab value="overview" className={tabClass}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="transactions" className={tabClass}>
              Transactions
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview" className={panelClass}>
            <div className="space-y-page-gap py-panel-row">
              <section aria-label="Current balance">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-medium text-bento-subtle">
                    {account.balanceValid
                      ? "Current balance"
                      : nativeBalance
                        ? "Last reported balance"
                        : "Current balance"}
                  </h3>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs",
                      account.status === "revoked"
                        ? "bg-warning/10 text-warning-foreground"
                        : "bg-bento-raised text-bento-subtle"
                    )}
                  >
                    {formatSubtype(account.status)}
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {nativeBalance ?? "Balance unavailable"}
                  {alternateCurrency && nativeBalance && (
                    <span className="ml-2 text-xs tracking-normal text-bento-subtle">
                      {account.currency.toUpperCase()}
                    </span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-bento-subtle">
                  {alternateCurrency &&
                    nativeBalance &&
                    Number.isFinite(account.toBase) && (
                      <span className="tabular-nums">
                        {formatCurrency(account.toBase, primaryCurrency, true)}{" "}
                        {primaryCurrency.toUpperCase()}
                      </span>
                    )}
                  {account.lastUpdated && (
                    <span>
                      Balance as of {detailDate(account.lastUpdated, true)}
                    </span>
                  )}
                </div>
              </section>
              {account.isLiability && <LiabilityDetails account={account} />}
              <AccountBalanceHistory
                account={account}
                history={history}
                error={historyError}
                primaryCurrency={primaryCurrency}
              />
              <AccountInformation account={account} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="transactions" keepMounted className={panelClass}>
            <AccountActivity account={account} />
          </Tabs.Panel>
        </Tabs.Root>
      </SheetContent>
    </Sheet>
  );
}
