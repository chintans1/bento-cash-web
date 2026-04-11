"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { useToken } from "@/hooks/use-token"
import { getAllTransactions, getCategories, type Transaction } from "@/lib/lunchmoney/client"
import {
  toYMD,
  filterExpenses,
  computeDailyTotals,
  buildHeatmap,
  computeCategoryTotals,
  computeStats,
} from "@/lib/lunchmoney/analytics"
import { formatAmount, formatShortDate } from "@/lib/format"
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons"
import { SpendingHeatmap } from "@/components/spending-heatmap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CAT_COLORS = [
  "#e85d4a", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899",
]

function getDateRange() {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setMonth(start.getMonth() - 6)
  return { startDate: start, endDate: end }
}

export default function HomePage() {
  const { token } = useToken()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [catMap, setCatMap] = useState<Map<number, { name: string; is_income: boolean }>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [{ startDate, endDate }] = useState(getDateRange)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    Promise.all([
      getAllTransactions(token, { start_date: toYMD(startDate), end_date: toYMD(endDate) }),
      getCategories(token),
    ])
      .then(([txs, catRes]) => {
        setTransactions(txs)
        const map = new Map<number, { name: string; is_income: boolean }>()
        for (const cat of catRes.categories) {
          map.set(cat.id, cat)
          for (const child of cat.children ?? []) map.set(child.id, child)
        }
        setCatMap(map)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false))
  }, [token])

  const dailyTotals = useMemo(() => computeDailyTotals(transactions), [transactions])
  const heatmap = useMemo(() => buildHeatmap(startDate, endDate, dailyTotals), [startDate, endDate, dailyTotals])
  const categoryTotals = useMemo(() => computeCategoryTotals(transactions, catMap), [transactions, catMap])
  const stats = useMemo(() => computeStats(dailyTotals, startDate, endDate), [dailyTotals, startDate, endDate])
  const topTransactions = useMemo(
    () => filterExpenses(transactions).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 8),
    [transactions]
  )

  const maxCatSpend = categoryTotals[0]?.spend ?? 0

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 pt-12">
        <p className="text-base text-muted-foreground">
          Connect your Lunch Money account in{" "}
          <Link href="/settings" className="font-medium text-foreground underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          to get started.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm font-mono text-muted-foreground animate-pulse">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-destructive font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-12 pt-8 flex flex-col gap-6">

      <Card>
        <CardHeader>
          <CardTitle>Spending Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendingHeatmap {...heatmap} />
          <p className="mt-4 text-xs font-mono text-muted-foreground">
            {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" — "}
            {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Spend", value: formatAmount(stats.totalSpend) },
          { label: "Transactions", value: stats.txCount.toLocaleString() },
          { label: "Avg / Day", value: formatAmount(stats.avgPerDay) },
          {
            label: "Top Date",
            value: stats.topDate.date ? formatAmount(stats.topDate.spend) : "—",
            sub: stats.topDate.date ? formatShortDate(stats.topDate.date) : undefined,
          },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <p className="text-xl font-mono font-semibold tabular-nums">{s.value}</p>
              {s.sub && <p className="text-xs font-mono text-muted-foreground">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {categoryTotals.map((cat, i) => {
                const Icon = getCategoryIcon(cat.name)
                const color = CAT_COLORS[i % CAT_COLORS.length]
                return (
                  <li key={cat.id} className="flex items-center gap-3">
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: color + "22" }}
                    >
                      <Icon className="size-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        <span className="text-xs font-mono tabular-nums text-muted-foreground ml-3 shrink-0">
                          {formatAmount(cat.spend)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: maxCatSpend > 0 ? `${(cat.spend / maxCatSpend) * 100}%` : "0%",
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {topTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions found.</p>
          ) : (
            <ul className="flex flex-col">
              {topTransactions.map((tx) => {
                const cat = tx.category_id ? catMap.get(tx.category_id) : null
                const Icon = getCategoryIcon(cat?.name ?? null)
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{tx.payee}</span>
                      {cat && <span className="text-xs text-muted-foreground">{cat.name}</span>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-sm font-mono tabular-nums">{formatAmount(parseFloat(tx.amount))}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(tx.date)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {stats.txCount > 8 && (
            <Link
              href="/transactions"
              className="block mt-4 pt-3 border-t border-border/50 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all transactions →
            </Link>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
