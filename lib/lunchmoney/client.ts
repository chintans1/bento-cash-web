const API_BASE = "https://api.lunchmoney.dev/v2"

export interface UserInfo {
  name: string
  email: string
  budget_name: string
  api_key_label: string
  primary_currency: string
}

export interface Transaction {
  id: number
  date: string
  amount: string
  currency: string
  to_base: number
  recurring_id: number | null
  payee: string
  original_name: string | null
  category_id: number | null
  notes: string | null
  status: "reviewed" | "unreviewed" | "delete_pending"
  is_pending: boolean
  created_at: string
  updated_at: string
  is_split_parent: boolean
  split_parent_id: number | null
  is_group_parent: boolean
  group_parent_id: number | null
  manual_account_id: number | null
  plaid_account_id: number | null
  tag_ids: number[]
  source: string | null
  external_id: string | null
}

export interface TransactionsResponse {
  transactions: Transaction[]
  has_more: boolean
}

export interface ChildCategory {
  id: number
  name: string
  description: string | null
  is_income: boolean
  exclude_from_budget: boolean
  exclude_from_totals: boolean
  is_group: false
  group_id: number | null
  archived: boolean
  archived_at: string | null
  order: number | null
  collapsed: boolean | null
  updated_at: string
  created_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  is_income: boolean
  exclude_from_budget: boolean
  exclude_from_totals: boolean
  is_group: boolean
  group_id: number | null
  children?: ChildCategory[]
}

export interface CategoriesResponse {
  categories: Category[]
}

async function request<T>(
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    method: "GET",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getMe(token: string): Promise<UserInfo> {
  return request<UserInfo>(token, "/me")
}

export function getTransactionsForMonth(
  token: string,
  year: number,
  month: number // 1-indexed
): Promise<TransactionsResponse> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return request<TransactionsResponse>(token, "/transactions", {
    start_date: start,
    end_date: end,
    limit: String(250),
    offset: String(0),
  }).then((response) => ({
    ...response,
    transactions: response.transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  }))
}

export function getCategories(token: string): Promise<CategoriesResponse> {
  return request<CategoriesResponse>(token, "/categories")
}
