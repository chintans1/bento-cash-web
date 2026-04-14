"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useToken } from "@/hooks/use-token"
import {
  getCategories,
  getMe,
  getTransactionsForMonth,
  getRecurringItems,
  getBudgetSummary,
  updateTransactionCategory,
  type Transaction,
  type RecurringItem,
  type AlignedSummaryResponse,
} from "@/lib/lunchmoney/client"
import {
  buildCategoryMap,
  computeCategoryTotals,
  computeMerchantTotals,
  computeDailySpend,
  computeMoMDeltas,
  countUncategorized,
  filterSpendTransactions,
  getTransactionsForCategory,
  type CategoryTotal,
  type MoMDelta,
} from "@/lib/lunchmoney/analytics"
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons"
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories"
import { formatAmount, formatShortDate, formatCurrency } from "@/lib/format"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function isCurrentOrFutureMonth(year: number, month: number) {
  const now = new Date()
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1)
  )
}

function prevMonthOf(year: number, month: number) {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

function nextMonthOf(year: number, month: number) {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }
}

const CAT_COLORS = [
  "#e85d4a",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function MoMBadge({ delta }: { delta: MoMDelta | undefined }) {
  if (!delta || delta.pct === null) return null
  const pct = delta.pct
  const isUp = pct > 0
  const label = `${isUp ? "+" : ""}${pct.toFixed(0)}%`
  return (
    <span
      className={cn(
        "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        isUp
          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      )}
    >
      {label} vs last mo.
    </span>
  )
}

function CategoryRow({
  cat,
  color,
  maxSpend,
  delta,
  primaryCurrency,
  transactions,
  categoryMap,
  token,
  onCategoryUpdated,
}: {
  cat: CategoryTotal
  color: string
  maxSpend: number
  delta: MoMDelta | undefined
  primaryCurrency: string
  transactions: Transaction[]
  categoryMap: Map<number, CategoryInfo>
  token: string
  onCategoryUpdated: (txId: number, newCatId: number | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getCategoryIcon(cat.name)
  const topTxs = useMemo(
    () => getTransactionsForCategory(transactions, cat.id),
    [transactions, cat.id]
  )
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  async function handleCategoryChange(txId: number, newCatId: number | null) {
    setUpdatingId(txId)
    try {
      await updateTransactionCategory(token, txId, newCatId)
      onCategoryUpdated(txId, newCatId)
    } finally {
      setUpdatingId(null)
      setEditingId(null)
    }
  }

  return (
    <li>
      <button
        className="flex w-full items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon className="size-3.5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center">
              <span className="truncate text-xs font-medium">{cat.name}</span>
              <MoMBadge delta={delta} />
            </div>
            <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {formatCurrency(cat.spend, primaryCurrency, false)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: maxSpend > 0 ? `${(cat.spend / maxSpend) * 100}%` : "0%",
                backgroundColor: color,
              }}
            />
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && topTxs.length > 0 && (
        <ul className="mt-1 mb-2 ml-10 flex flex-col gap-0.5 border-l-2 border-border pl-3">
          {topTxs.map((tx) => {
            const isEditing = editingId === tx.id
            const isUpdating = updatingId === tx.id
            const catInfo =
              tx.category_id != null
                ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                : UNCATEGORIZED
            return (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded py-1 text-xs"
              >
                <span className="truncate text-muted-foreground">
                  {tx.payee}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {isEditing ? (
                    <select
                      autoFocus
                      disabled={isUpdating}
                      className="h-6 rounded border border-input bg-background px-1 text-[11px] text-foreground"
                      defaultValue={tx.category_id ?? ""}
                      onBlur={() => setEditingId(null)}
                      onChange={(e) => {
                        const val = e.target.value
                        handleCategoryChange(
                          tx.id,
                          val === "" ? null : Number(val)
                        )
                      }}
                    >
                      <option value="">Uncategorized</option>
                      {Array.from(categoryMap.entries()).map(([id, info]) => (
                        <option key={id} value={id}>
                          {info.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(tx.id)
                      }}
                    >
                      {catInfo.name}
                    </button>
                  )}
                  <span className="font-mono tabular-nums">
                    {formatAmount(parseFloat(tx.amount), true)}
                  </span>
                </div>
              </li>
            )
          })}
          {cat.txCount > 5 && (
            <li className="pt-1">
              <Link
                href="/transactions"
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                +{cat.txCount - 5} more →
              </Link>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

function DailySpendChart({
  data,
  primaryCurrency,
}: {
  data: { date: string; amount: number }[]
  primaryCurrency: string
}) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  const [hovered, setHovered] = useState<{
    date: string
    amount: number
  } | null>(null)

  return (
    <div className="relative">
      {hovered && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-xs whitespace-nowrap text-background">
          {formatShortDate(hovered.date)}:{" "}
          {formatCurrency(hovered.amount, primaryCurrency, false)}
        </div>
      )}
      <div className="flex items-end gap-px" style={{ height: 80 }}>
        {data.map((d) => {
          const heightPct = max > 0 ? (d.amount / max) * 100 : 0
          const isHov = hovered?.date === d.date
          return (
            <div
              key={d.date}
              className="relative flex-1 cursor-pointer"
              style={{ height: "100%" }}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-sm transition-colors",
                  isHov ? "bg-primary" : "bg-primary/30"
                )}
                style={{
                  height: `${heightPct}%`,
                  minHeight: d.amount > 0 ? 2 : 0,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>1</span>
        <span>{Math.ceil(data.length / 2)}</span>
        <span>{data.length}</span>
      </div>
    </div>
  )
}

function NetCashFlowBar({
  income,
  spend,
  primaryCurrency,
}: {
  income: number
  spend: number
  primaryCurrency: string
}) {
  const surplus = income - spend
  const isPositive = surplus >= 0
  const total = income + spend
  const incomeWidth = total > 0 ? (income / total) * 100 : 50
  const spendWidth = total > 0 ? (spend / total) * 100 : 50

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Cash Flow
          </CardTitle>
          <span
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              isPositive
                ? "text-green-600 dark:text-green-400"
                : "text-rose-500"
            )}
          >
            {isPositive ? "+" : "−"}
            {formatCurrency(Math.abs(surplus), primaryCurrency, false)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div
            className="h-full rounded-l-full bg-green-500"
            style={{ width: `${incomeWidth}%` }}
          />
          <div
            className="h-full rounded-r-full bg-rose-500"
            style={{ width: `${spendWidth}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(income, primaryCurrency, false)} in
          </span>
          <span className="font-medium text-rose-500">
            {formatCurrency(spend, primaryCurrency, false)} out
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function BudgetProgressCard({
  summary,
  categoryMap,
  primaryCurrency,
}: {
  summary: AlignedSummaryResponse
  categoryMap: Map<number, CategoryInfo>
  primaryCurrency: string
}) {
  const budgeted = summary.categories
    .filter((c) => c.totals.budgeted != null && c.totals.budgeted > 0)
    .map((c) => {
      const spent = c.totals.other_activity + c.totals.recurring_activity
      const budget = c.totals.budgeted!
      const catInfo = categoryMap.get(c.category_id)
      return {
        id: c.category_id,
        name: catInfo?.name ?? "Unknown",
        spent,
        budget,
      }
    })
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget)

  if (budgeted.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {budgeted.map((item) => {
            const pct = Math.min((item.spent / item.budget) * 100, 100)
            const over = item.spent > item.budget
            return (
              <li key={item.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{item.name}</span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      over && "text-rose-500"
                    )}
                  >
                    {formatCurrency(item.spent, primaryCurrency, false)}{" "}
                    <span className="text-muted-foreground">
                      / {formatCurrency(item.budget, primaryCurrency, false)}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-rose-500" : "bg-primary"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function SubscriptionsCard({
  items,
  primaryCurrency,
}: {
  items: RecurringItem[]
  primaryCurrency: string
}) {
  const monthly = items
    .filter((item) => item.status === "reviewed")
    .map((item) => {
      const c = item.transaction_criteria
      let monthlyAmount = Math.abs(parseFloat(c.amount))
      if (c.granularity === "week") monthlyAmount = (monthlyAmount * 52) / 12
      else if (c.granularity === "year") monthlyAmount = monthlyAmount / 12
      else if (c.granularity === "day") monthlyAmount = monthlyAmount * 30
      monthlyAmount = monthlyAmount / (c.quantity ?? 1)
      const name = item.overrides?.payee ?? c.payee ?? "Unknown"
      return { id: item.id, name, monthlyAmount, currency: c.currency }
    })
    .filter((i) => i.monthlyAmount > 0)
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  if (monthly.length === 0) return null

  const total = monthly.reduce((s, i) => s + i.monthlyAmount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Subscriptions & Recurring</CardTitle>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatCurrency(total, primaryCurrency, false)}/mo
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {monthly.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border-b border-border/50 py-2.5 first:pt-0 last:border-0 last:pb-0"
            >
              <span className="text-sm">{item.name}</span>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {formatCurrency(item.monthlyAmount, primaryCurrency, false)}/mo
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { token } = useToken()
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  )
  const [primaryCurrency, setPrimaryCurrency] = useState("usd")
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([])
  const [budgetSummary, setBudgetSummary] =
    useState<AlignedSummaryResponse | null>(null)
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean
    error: string | null
  }>({ loading: false, error: null })
  const uncategorizedDismissed = false

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchStatus({ loading: true, error: null })

    getMe(token)
      .then((user) => setPrimaryCurrency(user.primary_currency))
      .catch(() => {})

    const prev = prevMonthOf(selectedYear, selectedMonth)

    Promise.all([
      getTransactionsForMonth(token, selectedYear, selectedMonth),
      getTransactionsForMonth(token, prev.year, prev.month),
      getCategories(token),
    ])
      .then(([txRes, prevTxRes, catRes]) => {
        setTransactions(txRes.transactions)
        setPrevTransactions(prevTxRes.transactions)
        setCategoryMap(buildCategoryMap(catRes))
        setFetchStatus({ loading: false, error: null })
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        })
      })

    // Non-critical: recurring items + budget
    getRecurringItems(token)
      .then(setRecurringItems)
      .catch(() => {})

    getBudgetSummary(token, selectedYear, selectedMonth)
      .then(setBudgetSummary)
      .catch(() => {})
  }, [token, selectedYear, selectedMonth])

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryTotals = useMemo(
    () => computeCategoryTotals(transactions, categoryMap),
    [transactions, categoryMap]
  )

  const prevCategoryTotals = useMemo(
    () => computeCategoryTotals(prevTransactions, categoryMap),
    [prevTransactions, categoryMap]
  )

  const momDeltas = useMemo(
    () => computeMoMDeltas(categoryTotals, prevCategoryTotals),
    [categoryTotals, prevCategoryTotals]
  )

  const merchantTotals = useMemo(
    () => computeMerchantTotals(transactions, categoryMap, 8),
    [transactions, categoryMap]
  )

  const dailySpend = useMemo(
    () => computeDailySpend(transactions, categoryMap, selectedYear, selectedMonth),
    [transactions, categoryMap, selectedYear, selectedMonth]
  )

  const uncategorizedCount = useMemo(
    () => countUncategorized(transactions, categoryMap),
    [transactions, categoryMap]
  )

  const quickStats = useMemo(() => {
    if (transactions.length === 0) return null

    const expenses = filterSpendTransactions(transactions, categoryMap)
    const incomeTransactions = transactions.filter(
      (tx) => parseFloat(tx.amount) < 0
    )

    const totalSpend = expenses.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    )
    const totalIncome = incomeTransactions.reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
      0
    )

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1
    const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth
    const avgSpendPerDay = daysElapsed > 0 ? totalSpend / daysElapsed : 0

    const spendByDay = new Map<string, number>()
    for (const tx of expenses) {
      spendByDay.set(
        tx.date,
        (spendByDay.get(tx.date) ?? 0) + parseFloat(tx.amount)
      )
    }
    let peakDay = ""
    let peakAmount = 0
    for (const [date, amount] of spendByDay.entries()) {
      if (amount > peakAmount) {
        peakAmount = amount
        peakDay = date
      }
    }

    return { totalSpend, totalIncome, avgSpendPerDay, peakDay, peakAmount }
  }, [transactions, categoryMap, selectedYear, selectedMonth, now])

  const maxCatSpend = categoryTotals[0]?.spend ?? 0

  function handleCategoryUpdated(txId: number, newCatId: number | null) {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category_id: newCatId } : tx))
    )
  }

  // ── No-token state ────────────────────────────────────────────────────────

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

  return (
    <div className="mx-auto max-w-6xl pt-6 pb-10">
      {/* Month Selector */}
      <div className="mb-6 flex items-center justify-end gap-1">
        <span className="text-sm text-muted-foreground">viewing for</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const p = prevMonthOf(selectedYear, selectedMonth)
            setSelectedYear(p.year)
            setSelectedMonth(p.month)
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isCurrentOrFutureMonth(selectedYear, selectedMonth)}
          onClick={() => {
            const n = nextMonthOf(selectedYear, selectedMonth)
            setSelectedYear(n.year)
            setSelectedMonth(n.month)
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Uncategorized Banner */}
      {!loading && uncategorizedCount > 0 && !uncategorizedDismissed && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">
              {uncategorizedCount} uncategorized transaction
              {uncategorizedCount !== 1 ? "s" : ""}
            </span>
            {" — "}
            <Link
              href="/transactions"
              className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              assign categories →
            </Link>
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : quickStats ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl text-green-500">
                  {formatCurrency(
                    quickStats.totalIncome,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Income{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (
                    {
                      transactions.filter((tx) => parseFloat(tx.amount) < 0)
                        .length
                    }{" "}
                    deposits)
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl text-rose-500">
                  {formatCurrency(
                    quickStats.totalSpend,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Spend{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (
                    {filterSpendTransactions(transactions, categoryMap).length}{" "}
                    transactions)
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl text-blue-500">
                  {formatCurrency(
                    quickStats.avgSpendPerDay,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Avg / Day{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (this {MONTH_NAMES[selectedMonth - 1].toLowerCase()})
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl text-amber-500">
                  {formatCurrency(
                    quickStats.peakAmount,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Peak Day{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (
                    {quickStats.peakDay
                      ? formatShortDate(quickStats.peakDay)
                      : "—"}
                    )
                  </span>
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Net Cash Flow + Daily Chart row */}
      {!loading && quickStats && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <NetCashFlowBar
            income={quickStats.totalIncome}
            spend={quickStats.totalSpend}
            primaryCurrency={primaryCurrency}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Spend — {MONTH_NAMES[selectedMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DailySpendChart
                data={dailySpend}
                primaryCurrency={primaryCurrency}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category drill-down + Top Merchants */}
      <div className="mb-4 grid grid-cols-2 items-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : categoryTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending data found.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categoryTotals.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    color={CAT_COLORS[i % CAT_COLORS.length]}
                    maxSpend={maxCatSpend}
                    delta={momDeltas.get(cat.id)}
                    primaryCurrency={primaryCurrency}
                    transactions={transactions}
                    categoryMap={categoryMap}
                    token={token}
                    onCategoryUpdated={handleCategoryUpdated}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : merchantTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending data found.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {merchantTotals.map((m, i) => {
                  const maxMerchant = merchantTotals[0].spend
                  return (
                    <li key={m.payee} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground/60 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="truncate text-xs font-medium">
                            {m.payee}
                          </span>
                          <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(m.spend, primaryCurrency, false)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-blue-500/70"
                            style={{
                              width:
                                maxMerchant > 0
                                  ? `${(m.spend / maxMerchant) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {m.txCount} transaction{m.txCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <Link
              href="/transactions"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all transactions →
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Budget Progress + Subscriptions */}
      {!loading && (
        <div
          className={cn(
            "grid items-start gap-4",
            budgetSummary && recurringItems.length > 0
              ? "grid-cols-2"
              : "grid-cols-1"
          )}
        >
          {budgetSummary && (
            <BudgetProgressCard
              summary={budgetSummary}
              categoryMap={categoryMap}
              primaryCurrency={primaryCurrency}
            />
          )}
          {recurringItems.length > 0 && (
            <SubscriptionsCard
              items={recurringItems}
              primaryCurrency={primaryCurrency}
            />
          )}
        </div>
      )}
    </div>
  )
}
