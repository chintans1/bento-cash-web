import { LunchMoneyClient } from "@lunch-money/lunch-money-js-v2"
import type {
  Category,
  RecurringItem,
  AlignedSummaryResponse,
} from "@lunch-money/lunch-money-js-v2"
export type {
  Transaction,
  Category,
  User as UserInfo,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  AlignedSummaryResponse,
} from "@lunch-money/lunch-money-js-v2"

export type CategoriesResponse = { categories: Category[] }

let _client: LunchMoneyClient | null = null
let _clientToken: string | null = null

function getClient(token: string): LunchMoneyClient {
  if (!_client || _clientToken !== token) {
    _client = new LunchMoneyClient({ apiKey: token })
    _clientToken = token
  }
  return _client
}

export function getMe(token: string) {
  return getClient(token).user.getMe()
}

export function getTransactionsForMonth(
  token: string,
  year: number,
  month: number // 1-indexed
) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return getClient(token)
    .transactions.getAll({
      start_date: start,
      end_date: end,
      limit: 250,
      offset: 0,
    })
    .then(({ transactions, hasMore }) => ({
      transactions: transactions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      has_more: hasMore,
    }))
}

export function getCategories(token: string): Promise<CategoriesResponse> {
  return getClient(token)
    .categories.getAll()
    .then((categories) => ({ categories }))
}

export function getAccounts(token: string) {
  const client = getClient(token)
  return Promise.all([
    client.manualAccounts.getAll(),
    client.plaidAccounts.getAll(),
  ]).then(([manual, plaid]) => ({ manual, plaid }))
}

export function getRecurringItems(token: string): Promise<RecurringItem[]> {
  return getClient(token).recurringItems.getAll()
}

export function getBudgetSummary(
  token: string,
  year: number,
  month: number
): Promise<AlignedSummaryResponse> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return getClient(token)
    .summary.get({ start_date: start, end_date: end })
    .then((res) => res as AlignedSummaryResponse)
}

export function updateManualAccount(
  token: string,
  id: number,
  data: { type?: string; subtype?: string }
): Promise<void> {
  return getClient(token)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .manualAccounts.update(id, data as any)
    .then(() => undefined)
}

export function updateTransactionCategory(
  token: string,
  transactionId: number,
  categoryId: number | null
): Promise<void> {
  return getClient(token)
    .transactions.update(transactionId, { category_id: categoryId ?? null })
    .then(() => undefined)
}
