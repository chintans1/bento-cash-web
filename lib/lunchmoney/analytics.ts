import type { Transaction } from "./client"

export type DayCell = {
  date: string
  spend: number
  txCount: number
  inRange: boolean
}

export type HeatmapData = {
  weeks: DayCell[][]
  monthLabels: { label: string; col: number }[]
  maxDailySpend: number
}

export type CategoryTotal = {
  id: number
  name: string
  spend: number
  txCount: number
}

export type AnalyticsStats = {
  totalSpend: number
  txCount: number
  avgPerDay: number
  topDate: { date: string; spend: number }
}

export function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function filterExpenses(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => parseFloat(tx.amount) > 0)
}

export function computeDailyTotals(
  transactions: Transaction[]
): Map<string, { spend: number; count: number }> {
  const map = new Map<string, { spend: number; count: number }>()
  for (const tx of filterExpenses(transactions)) {
    const amount = parseFloat(tx.amount)
    const prev = map.get(tx.date) ?? { spend: 0, count: 0 }
    map.set(tx.date, { spend: prev.spend + amount, count: prev.count + 1 })
  }
  return map
}

export function buildHeatmap(
  startDate: Date,
  endDate: Date,
  dailyTotals: Map<string, { spend: number; count: number }>
): HeatmapData {
  // Align grid to the Monday of the week containing startDate
  const gridStart = new Date(startDate)
  gridStart.setHours(12, 0, 0, 0)
  const dow = (gridStart.getDay() + 6) % 7 // Mon=0, Sun=6
  gridStart.setDate(gridStart.getDate() - dow)

  const endNoon = new Date(endDate)
  endNoon.setHours(23, 59, 59, 0)

  const weeks: DayCell[][] = []
  const monthLabels: { label: string; col: number }[] = []
  let maxDailySpend = 0
  const cursor = new Date(gridStart)
  let weekIdx = 0

  while (cursor <= endNoon) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = toYMD(cursor)
      const inRange = cursor >= startDate && cursor <= endNoon
      const data = dailyTotals.get(dateStr)
      const spend = data?.spend ?? 0
      if (inRange && spend > maxDailySpend) maxDailySpend = spend
      week.push({ date: dateStr, spend, txCount: data?.count ?? 0, inRange })

      // First of month — record where this month's label column starts
      if (inRange && cursor.getDate() === 1) {
        monthLabels.push({
          label: cursor.toLocaleDateString("en-US", { month: "short" }),
          col: weekIdx,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    weekIdx++
  }

  return { weeks, monthLabels, maxDailySpend }
}

export function computeCategoryTotals(
  transactions: Transaction[],
  catMap: Map<number, { name: string; is_income: boolean }>
): CategoryTotal[] {
  const map = new Map<number, CategoryTotal>()
  for (const tx of filterExpenses(transactions)) {
    const amount = parseFloat(tx.amount)
    const catId = tx.category_id ?? -1
    const cat = catMap.get(catId)
    if (cat?.is_income) continue
    const name = cat?.name ?? "Uncategorized"
    const prev = map.get(catId) ?? { id: catId, name, spend: 0, txCount: 0 }
    map.set(catId, { ...prev, spend: prev.spend + amount, txCount: prev.txCount + 1 })
  }
  return Array.from(map.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 7)
}

// Derives totals from dailyTotals to avoid re-scanning transactions.
export function computeStats(
  dailyTotals: Map<string, { spend: number; count: number }>,
  startDate: Date,
  endDate: Date
): AnalyticsStats {
  let totalSpend = 0
  let txCount = 0
  let topDate = { date: "", spend: 0 }

  for (const [date, { spend, count }] of dailyTotals) {
    totalSpend += spend
    txCount += count
    if (spend > topDate.spend) topDate = { date, spend }
  }

  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  const avgPerDay = numDays > 0 ? totalSpend / numDays : 0

  return { totalSpend, txCount, avgPerDay, topDate }
}
