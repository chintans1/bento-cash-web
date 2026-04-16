"use client";

import { useEffect, useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import { useToken } from "@/hooks/use-token";
import {
  getAccounts,
  getMe,
  updateManualAccount,
} from "@/lib/lunchmoney/client";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Investment classification
// ---------------------------------------------------------------------------

const INVESTMENT_TYPES = new Set(["investment", "brokerage"]);

const INVESTMENT_SUBTYPES = new Set([
  "401k",
  "403b",
  "457b",
  "ira",
  "roth ira",
  "roth 401k",
  "sep ira",
  "simple ira",
  "brokerage",
  "hsa",
  "529",
  "tfsa",
  "crypto",
  "annuity",
  "mutual fund",
  "etf",
  "pension",
  "stock plan",
]);

function isInvestment(a: NormalizedAccount): boolean {
  return (
    INVESTMENT_TYPES.has(a.type.toLowerCase()) ||
    (a.subtype !== null && INVESTMENT_SUBTYPES.has(a.subtype.toLowerCase()))
  );
}

// ---------------------------------------------------------------------------
// Allocation buckets
// ---------------------------------------------------------------------------

type Bucket = {
  label: string;
  color: string;
  subtypes: Set<string>;
};

const BUCKETS: Bucket[] = [
  {
    label: "Retirement — Tax Deferred",
    color: "bg-blue-500",
    subtypes: new Set([
      "401k",
      "403b",
      "457b",
      "sep ira",
      "simple ira",
      "pension",
    ]),
  },
  {
    label: "Retirement — Tax Free",
    color: "bg-emerald-500",
    subtypes: new Set(["roth ira", "roth 401k", "tfsa"]),
  },
  {
    label: "Traditional IRA",
    color: "bg-cyan-500",
    subtypes: new Set(["ira"]),
  },
  {
    label: "Taxable Brokerage",
    color: "bg-violet-500",
    subtypes: new Set(["brokerage", "etf", "mutual fund", "stock plan"]),
  },
  {
    label: "HSA",
    color: "bg-amber-500",
    subtypes: new Set(["hsa"]),
  },
  {
    label: "Education (529)",
    color: "bg-orange-500",
    subtypes: new Set(["529"]),
  },
  {
    label: "Crypto",
    color: "bg-rose-500",
    subtypes: new Set(["crypto"]),
  },
];

// ---------------------------------------------------------------------------
// Edit options
// ---------------------------------------------------------------------------

const ACCOUNT_TYPES = [
  "cash",
  "credit",
  "investment",
  "brokerage",
  "loan",
  "other asset",
  "other liability",
];

const INVESTMENT_SUBTYPE_OPTIONS = [
  "401k",
  "403b",
  "457b",
  "ira",
  "roth ira",
  "roth 401k",
  "sep ira",
  "simple ira",
  "brokerage",
  "hsa",
  "529",
  "tfsa",
  "crypto",
  "annuity",
  "mutual fund",
  "etf",
  "pension",
  "stock plan",
];

const OTHER_SUBTYPE_OPTIONS = [
  "checking",
  "savings",
  "credit card",
  "auto",
  "mortgage",
  "student",
  "home equity",
  "prepaid",
  "other",
];

// ---------------------------------------------------------------------------
// AccountRow
// ---------------------------------------------------------------------------

function AccountRow({
  account,
  primaryCurrency,
  token,
  onSaved,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
  token: string;
  onSaved: (id: string, type: string, subtype: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(account.type);
  const [editSubtype, setEditSubtype] = useState(account.subtype ?? "");
  const [saving, setSaving] = useState(false);

  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";

  function startEdit() {
    setEditType(account.type);
    setEditSubtype(account.subtype ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateManualAccount(token, account.rawId, {
        type: editType,
        subtype: editSubtype || undefined,
      });
      onSaved(account.id, editType, editSubtype);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-b border-border/50 py-3 last:border-0">
      {editing ? (
        /* Edit mode */
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">{account.name}</span>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v ?? "")}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Subtype</label>
              <Select
                value={editSubtype}
                onValueChange={(v) => setEditSubtype(v ?? "")}
              >
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— none —</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Investment</SelectLabel>
                    {INVESTMENT_SUBTYPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatSubtype(s)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    {OTHER_SUBTYPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatSubtype(s)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* View mode */
        <div className="flex items-center gap-3">
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
              {account.source === "manual" && (
                <button
                  onClick={startEdit}
                  className="text-muted-foreground/60 transition-colors hover:text-foreground"
                  title="Edit type / subtype"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground capitalize">
              {account.type}
            </p>
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
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// AllocationBreakdown
// ---------------------------------------------------------------------------

function AllocationBreakdown({
  accounts,
  primaryCurrency,
}: {
  accounts: NormalizedAccount[];
  primaryCurrency: string;
}) {
  const total = accounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  if (total === 0) return null;

  // Group accounts into named buckets
  const bucketRows = BUCKETS.map((bucket) => {
    const bucketAccounts = accounts.filter((a) =>
      bucket.subtypes.has((a.subtype ?? "").toLowerCase())
    );
    const amount = bucketAccounts.reduce(
      (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
      0
    );
    return { bucket, bucketAccounts, amount };
  }).filter((r) => r.amount > 0);

  // "Other" = investment accounts not matched by any named bucket
  const matchedIds = new Set(
    bucketRows.flatMap((r) => r.bucketAccounts.map((a) => a.id))
  );
  const otherAccounts = accounts.filter((a) => !matchedIds.has(a.id));
  const otherAmount = otherAccounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  const rows = [
    ...bucketRows,
    ...(otherAmount > 0.01
      ? [
          {
            bucket: {
              label: "Other",
              color: "bg-gray-400",
              subtypes: new Set<string>(),
            },
            bucketAccounts: otherAccounts,
            amount: otherAmount,
          },
        ]
      : []),
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Allocation</CardTitle>
        <CardDescription>Hover a row to see accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ bucket, bucketAccounts, amount }) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <HoverCard key={bucket.label}>
              <HoverCardTrigger
                render={<div className="block w-full cursor-default" />}
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {bucket.label}
                  </span>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(amount, primaryCurrency, true)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", bucket.color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" sideOffset={12}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {bucket.label}
                </p>
                <ul className="space-y-1.5">
                  {bucketAccounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="min-w-0 truncate text-sm">{a.name}</span>
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {a.balanceValid
                          ? formatCurrency(a.toBase, primaryCurrency, true)
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                {bucketAccounts.length > 1 && (
                  <div className="mt-2 flex justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="font-mono text-xs font-medium tabular-nums">
                      {formatCurrency(amount, primaryCurrency, true)}
                    </span>
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InvestmentsPage() {
  const { token } = useToken();
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchStatus({ loading: true, error: null });

    Promise.all([getMe(token), getAccounts(token)])
      .then(([user, { manual, plaid }]) => {
        setPrimaryCurrency(user.primary_currency);
        const all = [
          ...manual.map(normalizeManual),
          ...plaid.map(normalizePlaid),
        ].filter((a) => a.status !== "closed");
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

  function handleSaved(id: string, type: string, subtype: string) {
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
          {/* Main 2-column grid: allocation left, accounts right */}
          <div className="grid grid-cols-2 items-start gap-6">
            {/* Left column: allocation breakdown */}
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

            {/* Right column: investment account list */}
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

          {/* Other accounts — full width, below the main grid */}
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
