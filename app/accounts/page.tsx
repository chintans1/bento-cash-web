"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useToken } from "@/hooks/use-token"
import {
  getAccounts,
  getMe,
  type ManualAccount,
  type PlaidAccount,
} from "@/lib/lunchmoney/client"
import { formatCurrency } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Account types that represent debt (balance = what you owe)
const LIABILITY_TYPES = new Set(["credit", "loan", "other liability"])

type NormalizedAccount = {
  id: string
  name: string
  institution: string | null
  type: string
  subtype: string | null
  balance: number
  currency: string
  toBase: number
  balanceValid: boolean // false when balance is stale/unreliable (e.g. revoked)
  isLiability: boolean
  lastUpdated: string | null
  source: "plaid" | "manual"
  status: string
}

function normalizeManual(a: ManualAccount): NormalizedAccount {
  return {
    id: `manual-${a.id}`,
    name: a.display_name ?? a.name,
    institution: a.institution_name,
    type: a.type,
    subtype: a.subtype,
    balance: parseFloat(a.balance),
    currency: a.currency,
    toBase: a.to_base,
    balanceValid: true,
    isLiability: LIABILITY_TYPES.has(a.type),
    lastUpdated: a.balance_as_of,
    source: "manual",
    status: a.status,
  }
}

function normalizePlaid(a: PlaidAccount): NormalizedAccount {
  const revoked = a.status === "revoked"
  return {
    id: `plaid-${a.id}`,
    name: a.display_name ?? a.name,
    institution: a.institution_name,
    type: a.type,
    subtype: a.subtype ?? null,
    balance: parseFloat(a.balance),
    currency: a.currency,
    toBase: a.to_base,
    balanceValid: !revoked,
    isLiability: LIABILITY_TYPES.has(a.type),
    lastUpdated: a.balance_last_update,
    source: "plaid",
    status: a.status,
  }
}

const ALL_CAPS_SUBTYPES = new Set(["ira", "tfsa", "hsa", "401k", "403b", "529"])

function formatSubtype(subtype: string): string {
  const lower = subtype.toLowerCase()
  if (ALL_CAPS_SUBTYPES.has(lower)) return subtype.toUpperCase()
  return subtype.charAt(0).toUpperCase() + subtype.slice(1)
}

function formatUpdated(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function AccountRow({
  account,
  primaryCurrency,
}: {
  account: NormalizedAccount
  primaryCurrency: string
}) {
  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase()
  const isInactive = account.status !== "active"

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
  )
}

function groupByInstitution(
  accounts: NormalizedAccount[]
): [string, NormalizedAccount[]][] {
  const map = new Map<string, NormalizedAccount[]>()
  for (const a of accounts) {
    const key = a.institution ?? "Other"
    const group = map.get(key) ?? []
    group.push(a)
    map.set(key, group)
  }
  return Array.from(map.entries())
}

function AccountSection({
  title,
  accounts,
  total,
  primaryCurrency,
}: {
  title: string
  accounts: NormalizedAccount[]
  total: number
  primaryCurrency: string
}) {
  if (accounts.length === 0) return null

  const groups = groupByInstitution(accounts)

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
          )
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
          )
        })}
      </CardContent>
    </Card>
  )
}

export default function AccountsPage() {
  const { token } = useToken()
  const [accounts, setAccounts] = useState<NormalizedAccount[]>([])
  const [primaryCurrency, setPrimaryCurrency] = useState("usd")
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean
    error: string | null
  }>({ loading: false, error: null })

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchStatus({ loading: true, error: null })

    getMe(token)
      .then((user) => setPrimaryCurrency(user.primary_currency))
      .catch(() => {}) // Non-fatal — fall back to usd

    getAccounts(token)
      .then(({ manual, plaid }) => {
        const all = [
          ...manual.map(normalizeManual),
          ...plaid.map(normalizePlaid),
        ]
        setAccounts(all)
        setFetchStatus({ loading: false, error: null })
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        })
      })
  }, [token])

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 pt-12">
        <p className="text-base text-muted-foreground">
          Connect your Lunch Money account in{" "}
          <Link
            href="/settings"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Settings
          </Link>{" "}
          to get started.
        </p>
      </div>
    )
  }

  const assets = accounts.filter((a) => !a.isLiability && a.status !== "closed")
  const liabilities = accounts.filter(
    (a) => a.isLiability && a.status !== "closed"
  )

  const totalAssets = assets.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  )
  const totalLiabilities = liabilities.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  )
  const netWorth = totalAssets - totalLiabilities

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
      )}
    </div>
  )
}
