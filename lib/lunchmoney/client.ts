import { LunchMoneyClient } from "@lunch-money/lunch-money-js-v2"
import type { Category } from "@lunch-money/lunch-money-js-v2"
export type {
  Transaction,
  Category,
  User as UserInfo,
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
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      has_more: hasMore,
    }))
}

export function getCategories(token: string): Promise<CategoriesResponse> {
  return getClient(token)
    .categories.getAll()
    .then((categories) => ({ categories }))
}
