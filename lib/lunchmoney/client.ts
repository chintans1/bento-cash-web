import { LunchMoneyClient } from "@lunch-money/lunch-money-js-v2";
import { cached, clearCache, invalidate, KEY } from "./cache";
import type {
  Category,
  Transaction,
  User,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  AlignedSummaryResponse,
  UpdateManualAccountBody,
  components,
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

/** One account's monthly balance snapshots, as `/balance_history` groups them. */
export type BalanceHistoryAccount =
  components["schemas"]["balanceHistoryAccountObject"];

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
  getBalanceHistory(): Promise<BalanceHistoryAccount[]>;
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
  updateTransactionPayee(transactionId: number, payee: string): Promise<void>;
}

const TRANSACTION_PAGE_SIZE = 250;
const MAX_TRANSACTION_PAGES = 40;

// ── Factory ─────────────────────────────────────────────────────────────────

export function createRealClient(token: string): LMClient {
  const sdk = new LunchMoneyClient({ apiKey: token });

  return {
    getMe: () => sdk.user.getMe(),

    /**
     * Every transaction in the month, following LM's pagination.
     *
     * A single page used to be fetched and `has_more` thrown away, so any
     * month past PAGE_SIZE transactions silently lost the rest — and every
     * total, chart and category breakdown built on it was quietly wrong.
     */
    async getTransactionsForMonth(year, month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const all: Transaction[] = [];
      let offset = 0;
      let hasMore = true;

      // The cap is a guard against a server that never stops saying "more",
      // not an expected limit: 40 pages is far past any real month.
      for (let page = 0; page < MAX_TRANSACTION_PAGES && hasMore; page++) {
        const result = await sdk.transactions.getAll({
          start_date: start,
          end_date: end,
          limit: TRANSACTION_PAGE_SIZE,
          offset,
        });
        all.push(...result.transactions);
        hasMore = result.hasMore;
        offset += TRANSACTION_PAGE_SIZE;
      }

      return {
        transactions: all.sort(
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

    /**
     * Every month of balance history LM holds, for every account.
     *
     * The SDK has no wrapper for this endpoint yet, so it goes through the raw
     * openapi-fetch client — which is generated from the same spec, so the
     * response is still typed. Passing no range asks for all of it, including
     * the ephemeral entry for the current month; one request then answers for
     * any month the user navigates to, rather than one per month on screen.
     */
    async getBalanceHistory() {
      const { data, error } = await sdk.rawClient.GET("/balance_history");
      // openapi-fetch reports failures in the result rather than throwing, so
      // this is where a non-2xx becomes an error the callers can catch.
      if (!data)
        throw new Error(error?.message ?? "Couldn't load balance history");
      return data.balance_history;
    },

    async getBudgetSummary(year, month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return sdk.summary.get({ start_date: start, end_date: end });
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

    async updateTransactionPayee(transactionId, payee) {
      await sdk.transactions.update(transactionId, { payee });
    },
  };
}

// ── Active client singleton ──────────────────────────────────────────────────

let _activeClient: LMClient | null = null;

export function setActiveClient(client: LMClient | null): void {
  _activeClient = client;
  // Never serve one account's cached data to another's session.
  clearCache();
}

function activeClient(): LMClient {
  if (!_activeClient) throw new Error("No active client");
  return _activeClient;
}

// ── Public API (no token param — baked in at factory time) ──────────────────

export const getMe = (): Promise<User> =>
  cached(KEY.me, () => activeClient().getMe());

export const getTransactionsForMonth = (
  year: number,
  month: number
): Promise<TransactionsResponse> =>
  cached(KEY.tx(year, month), () =>
    activeClient().getTransactionsForMonth(year, month)
  );

export const getCategories = (): Promise<CategoriesResponse> =>
  cached(KEY.categories, () => activeClient().getCategories());

export const getAccounts = (): Promise<{
  manual: ManualAccount[];
  plaid: PlaidAccount[];
}> => cached(KEY.accounts, () => activeClient().getAccounts());

export const getRecurringItems = (): Promise<RecurringItem[]> =>
  cached(KEY.recurring, () => activeClient().getRecurringItems());

export const getBalanceHistory = (): Promise<BalanceHistoryAccount[]> =>
  cached(KEY.balanceHistory, () => activeClient().getBalanceHistory());

export const getBudgetSummary = (
  year: number,
  month: number
): Promise<AlignedSummaryResponse> =>
  cached(KEY.budget(year, month), () =>
    activeClient().getBudgetSummary(year, month)
  );

export const updateManualAccount = async (
  id: number,
  data: UpdateManualAccountBody
): Promise<void> => {
  await activeClient().updateManualAccount(id, data);
  invalidate(KEY.accounts);
  // Editing a balance moves the current month's snapshot too.
  invalidate(KEY.balanceHistory);
};

/** A transaction edit can move month totals and budget actuals, so drop both. */
async function afterTransactionWrite(write: Promise<void>): Promise<void> {
  await write;
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
}

export const updateTransactionCategory = (
  transactionId: number,
  categoryId: number | null
): Promise<void> =>
  afterTransactionWrite(
    activeClient().updateTransactionCategory(transactionId, categoryId)
  );

export const updateTransactionNotes = (
  transactionId: number,
  notes: string | null
): Promise<void> =>
  afterTransactionWrite(
    activeClient().updateTransactionNotes(transactionId, notes)
  );

export const updateTransactionPayee = (
  transactionId: number,
  payee: string
): Promise<void> =>
  afterTransactionWrite(
    activeClient().updateTransactionPayee(transactionId, payee)
  );
