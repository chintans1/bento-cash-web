"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useToken } from "@/hooks/use-token"
import {
  getCategories,
  getTransactionsForMonth,
  type Transaction,
} from "@/lib/lunchmoney/client"
import {
  buildCategoryMap,
  computeCategoryTotals,
  type CategoryTotal,
} from "@/lib/lunchmoney/analytics"
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons"
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories"
import { formatAmount, formatShortDate } from "@/lib/format"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
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

function prevMonth(year: number, month: number) {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
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

export default function HomePage() {
  const { token } = useToken()
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  )
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean
    error: string | null
  }>({ loading: false, error: null })

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sets loading before async fetch, cleared in .then/.catch
    setFetchStatus({ loading: true, error: null })
    Promise.all([
      getTransactionsForMonth(token, selectedYear, selectedMonth),
      getCategories(token),
    ])
      .then(([txRes, catRes]) => {
        setTransactions(txRes.transactions)
        setCategoryMap(buildCategoryMap(catRes))
        setFetchStatus({ loading: false, error: null })
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        })
      })
  }, [token, selectedYear, selectedMonth])

  const categoryTotals: CategoryTotal[] = useMemo(
    () => computeCategoryTotals(transactions, categoryMap),
    [transactions, categoryMap]
  )

  const recentTransactions = useMemo(() => transactions, [transactions])

  const maxCatSpend = categoryTotals[0]?.spend ?? 0

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
    <div className="mx-auto max-w-6xl pt-6 pb-6">
      {/* Month Selector */}
      <div className="align-left mb-6 flex items-center justify-end">
        <span className="text-sm text-muted-foreground">viewing for</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const p = prevMonth(selectedYear, selectedMonth)
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
            const n = nextMonth(selectedYear, selectedMonth)
            setSelectedYear(n.year)
            setSelectedMonth(n.month)
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 items-start gap-6">
        {/* Spend by Category */}
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
              <ul className="flex flex-col gap-4">
                {categoryTotals.map((cat, i) => {
                  const Icon = getCategoryIcon(cat.name)
                  const color = CAT_COLORS[i % CAT_COLORS.length]
                  return (
                    <li key={cat.id} className="flex items-center gap-3">
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}22` }}
                      >
                        <Icon className="size-3.5" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="truncate text-xs font-medium">
                            {cat.name}
                          </span>
                          <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                            {formatAmount(cat.spend)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:
                                maxCatSpend > 0
                                  ? `${(cat.spend / maxCatSpend) * 100}%`
                                  : "0%",
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

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions found.
              </p>
            ) : (
              <ul className="flex flex-col">
                {recentTransactions.map((tx) => {
                  const category = tx.category_id
                    ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                    : UNCATEGORIZED
                  const Icon = getCategoryIcon(category.name)
                  const isCredit = parseFloat(tx.amount) < 0
                  const isUncategorized = category === UNCATEGORIZED

                  return (
                    <li
                      key={tx.id}
                      className="flex items-center gap-3 border-b border-border/50 py-3 first:pt-0 last:border-0 last:pb-0"
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {tx.payee}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            isUncategorized
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {category.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            isCredit && "text-green-600 dark:text-green-400"
                          )}
                        >
                          {isCredit ? "+" : "−"}
                          {formatAmount(Math.abs(parseFloat(tx.amount)), true)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatShortDate(tx.date)}
                        </span>
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
              View more →
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
