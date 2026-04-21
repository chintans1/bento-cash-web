import { LunchMoneyClient } from "@lunch-money/lunch-money-js-v2";
import type {
  Category,
  Transaction,
  User,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  AlignedSummaryResponse,
  UpdateManualAccountBody,
} from "@lunch-money/lunch-money-js-v2";
export type {
  Transaction,
  Category,
  User as UserInfo,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  AlignedSummaryResponse,
} from "@lunch-money/lunch-money-js-v2";

export type CategoriesResponse = { categories: Category[] };
export type TransactionsResponse = {
  transactions: Transaction[];
  has_more: boolean;
};

let _client: LunchMoneyClient | null = null;
let _clientToken: string | null = null;

function getClient(token: string): LunchMoneyClient {
  if (!_client || _clientToken !== token) {
    _client = new LunchMoneyClient({ apiKey: token });
    _clientToken = token;
  }
  return _client;
}

export function getMe(token: string): Promise<User> {
  return getClient(token).user.getMe();
}

export async function getTransactionsForMonth(
  token: string,
  year: number,
  month: number // 1-indexed
): Promise<TransactionsResponse> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const { transactions, hasMore } = await getClient(token).transactions.getAll({
    start_date: start,
    end_date: end,
    limit: 250,
    offset: 0,
  });
  return {
    transactions: transactions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    has_more: hasMore,
  };
}

export async function getCategories(
  token: string
): Promise<CategoriesResponse> {
  const categories = await getClient(token).categories.getAll();
  return { categories };
}

export async function getAccounts(
  token: string
): Promise<{ manual: ManualAccount[]; plaid: PlaidAccount[] }> {
  const client = getClient(token);
  const [manual, plaid] = await Promise.all([
    client.manualAccounts.getAll(),
    client.plaidAccounts.getAll(),
  ]);
  return { manual, plaid };
}

export function getRecurringItems(token: string): Promise<RecurringItem[]> {
  return getClient(token).recurringItems.getAll();
}

export async function getBudgetSummary(
  token: string,
  year: number,
  month: number
): Promise<AlignedSummaryResponse> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const res = await getClient(token).summary.get({
    start_date: start,
    end_date: end,
  });
  return res as AlignedSummaryResponse;
}

export function updateManualAccount(
  token: string,
  id: number,
  data: UpdateManualAccountBody
): Promise<void> {
  return getClient(token)
    .manualAccounts.update(id, data)
    .then(() => undefined);
}

export async function updateTransactionCategory(
  token: string,
  transactionId: number,
  categoryId: number | null
): Promise<void> {
  await getClient(token).transactions.update(transactionId, {
    category_id: categoryId ?? null,
  });
  return undefined;
}
