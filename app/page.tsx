"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useToken } from "@/hooks/use-token"
import {
  getCategories,
  getMostRecentTransactions,
  type Transaction,
} from "@/lib/lunchmoney/client"
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons"
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

function formatAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(parseFloat(amount)))
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default function HomePage() {
  const { token } = useToken()
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
    Promise.all([getMostRecentTransactions(token), getCategories(token)])
      .then(([txRes, catRes]) => {
        setTransactions(txRes.transactions.splice(0, 10))
        const map = new Map<number, { name: string; is_income: boolean }>()
        for (const cat of catRes.categories) {
          map.set(cat.id, cat)
          for (const child of cat.children ?? []) {
            map.set(child.id, child)
          }
        }
        setCategoryMap(map)
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

  return (
    <div className="mx-auto max-w-2xl p-6 pt-12">
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions found.
              </p>
            ) : (
              <ul className="flex flex-col">
                {transactions.map((tx) => {
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
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.date)}
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
