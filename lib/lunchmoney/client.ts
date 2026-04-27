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

// ── Client interface ────────────────────────────────────────────────────────

export interface LMClient {
  getMe(): Promise<User>;
  getTransactionsForMonth(
    year: number,
    month: number
  ): Promise<TransactionsResponse>;
  getCategories(): Promise<CategoriesResponse>;
  getAccounts(): Promise<{ manual: ManualAccount[]; plaid: PlaidAccount[] }>;
  getRecurringItems(): Promise<RecurringItem[]>;
  getBudgetSummary(
    year: number,
    month: number
  ): Promise<AlignedSummaryResponse>;
  updateManualAccount(id: number, data: UpdateManualAccountBody): Promise<void>;
  updateTransactionCategory(
    transactionId: number,
    categoryId: number | null
  ): Promise<void>;
  updateTransactionNotes(
    transactionId: number,
    notes: string | null
  ): Promise<void>;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createRealClient(token: string): LMClient {
  const sdk = new LunchMoneyClient({ apiKey: token });

  return {
    getMe: () => sdk.user.getMe(),

    async getTransactionsForMonth(year, month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { transactions, hasMore } = await sdk.transactions.getAll({
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
    },

    async getCategories() {
      const categories = await sdk.categories.getAll();
      return { categories };
    },

    async getAccounts() {
      const [manual, plaid] = await Promise.all([
        sdk.manualAccounts.getAll(),
        sdk.plaidAccounts.getAll(),
      ]);
      return { manual, plaid };
    },

    getRecurringItems: () => sdk.recurringItems.getAll(),

    async getBudgetSummary(year, month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const res = await sdk.summary.get({ start_date: start, end_date: end });
      return res as AlignedSummaryResponse;
    },

    updateManualAccount: (id, data) =>
      sdk.manualAccounts.update(id, data).then(() => undefined),

    async updateTransactionCategory(transactionId, categoryId) {
      await sdk.transactions.update(transactionId, {
        category_id: categoryId ?? null,
      });
    },

    async updateTransactionNotes(transactionId, notes) {
      await sdk.transactions.update(transactionId, { notes: notes ?? null });
    },
  };
}

// ── Active client singleton ──────────────────────────────────────────────────

let _activeClient: LMClient | null = null;

export function setActiveClient(client: LMClient | null): void {
  _activeClient = client;
}

function activeClient(): LMClient {
  if (!_activeClient) throw new Error("No active client");
  return _activeClient;
}

// ── Public API (no token param — baked in at factory time) ──────────────────

export const getMe = (): Promise<User> => activeClient().getMe();

export const getTransactionsForMonth = (
  year: number,
  month: number
): Promise<TransactionsResponse> =>
  activeClient().getTransactionsForMonth(year, month);

export const getCategories = (): Promise<CategoriesResponse> =>
  activeClient().getCategories();

export const getAccounts = (): Promise<{
  manual: ManualAccount[];
  plaid: PlaidAccount[];
}> => activeClient().getAccounts();

export const getRecurringItems = (): Promise<RecurringItem[]> =>
  activeClient().getRecurringItems();

export const getBudgetSummary = (
  year: number,
  month: number
): Promise<AlignedSummaryResponse> =>
  activeClient().getBudgetSummary(year, month);

export const updateManualAccount = (
  id: number,
  data: UpdateManualAccountBody
): Promise<void> => activeClient().updateManualAccount(id, data);

export const updateTransactionCategory = (
  transactionId: number,
  categoryId: number | null
): Promise<void> =>
  activeClient().updateTransactionCategory(transactionId, categoryId);

export const updateTransactionNotes = (
  transactionId: number,
  notes: string | null
): Promise<void> => activeClient().updateTransactionNotes(transactionId, notes);
