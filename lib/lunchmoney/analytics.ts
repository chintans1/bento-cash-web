import type { CategoriesResponse, Transaction } from "./client"
import type { CategoryInfo } from "./categories"

export type CategoryTotal = {
  id: number
  name: string
  spend: number
  txCount: number
}

export function buildCategoryMap(
  res: CategoriesResponse
): Map<number, CategoryInfo> {
  const map = new Map<number, CategoryInfo>()
  for (const cat of res.categories) {
    map.set(cat.id, {
      name: cat.name,
      is_income: cat.is_income,
      exclude_from_totals: cat.exclude_from_totals,
    })
    for (const child of cat.children ?? []) {
      map.set(child.id, {
        name: child.name,
        is_income: child.is_income,
        exclude_from_totals: child.exclude_from_totals,
      })
    }
  }
  return map
}

export function filterExpenses(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => parseFloat(tx.amount) > 0)
}

export function computeCategoryTotals(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  limit = 10
): CategoryTotal[] {
  const map = new Map<number, CategoryTotal>()
  for (const tx of filterExpenses(transactions)) {
    const catId = tx.category_id ?? -1
    const cat = catMap.get(catId)
    if (cat?.exclude_from_totals) continue
    const name = cat?.name ?? "Uncategorized"
    const prev = map.get(catId) ?? { id: catId, name, spend: 0, txCount: 0 }
    map.set(catId, {
      ...prev,
      spend: prev.spend + parseFloat(tx.amount),
      txCount: prev.txCount + 1,
    })
  }
  return Array.from(map.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit)
}
