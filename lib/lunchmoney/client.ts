import { LunchMoneyClient } from "@lunch-money/lunch-money-js-v2";
import { cached, clearCache, invalidate, KEY } from "./cache";
import { replaceSplitWithRestore } from "./transaction-structure";
import type {
  Category,
  Transaction,
  User,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  Tag,
  AlignedSummaryResponse,
  CreateManualAccountBody,
  UpdateManualAccountBody,
  UpdateTransaction,
  SplitTransactionBody,
  GroupTransactionsBody,
  components,
} from "@lunch-money/lunch-money-js-v2";
export type {
  Transaction,
  Category,
  User as UserInfo,
  ManualAccount,
  PlaidAccount,
  RecurringItem,
  Tag,
  AlignedSummaryResponse,
} from "@lunch-money/lunch-money-js-v2";

/** One account's monthly balance snapshots, as `/balance_history` groups them. */
export type BalanceHistoryAccount =
  components["schemas"]["balanceHistoryAccountObject"];
export type BalanceHistoryUpdate =
  components["schemas"]["balanceHistoryUpdateItemObject"];
export type BalanceHistoryAccountType =
  | "manual"
  | "plaid"
  | "crypto_manual"
  | "deleted";

export type CategoriesResponse = { categories: Category[] };
export type TransactionsResponse = {
  transactions: Transaction[];
  has_more: boolean;
};
export type TransactionPatch = Pick<
  UpdateTransaction,
  | "date"
  | "currency"
  | "recurring_id"
  | "payee"
  | "category_id"
  | "notes"
  | "manual_account_id"
  | "plaid_account_id"
  | "tag_ids"
  | "status"
> &
  Partial<Pick<Transaction, "amount">>;
export type SplitParts = SplitTransactionBody["child_transactions"];
export type GroupInput = GroupTransactionsBody;

// ── Client interface ────────────────────────────────────────────────────────

export interface LMClient {
  getMe(): Promise<User>;
  getTransactionsForMonth(
    year: number,
    month: number
  ): Promise<TransactionsResponse>;
  getCategories(): Promise<CategoriesResponse>;
  getTags(): Promise<Tag[]>;
  getManualAccounts(): Promise<ManualAccount[]>;
  getPlaidAccounts(): Promise<PlaidAccount[]>;
  getAccounts(): Promise<{ manual: ManualAccount[]; plaid: PlaidAccount[] }>;
  getRecurringItems(): Promise<RecurringItem[]>;
  getBalanceHistory(): Promise<BalanceHistoryAccount[]>;
  getBudgetSummary(
    year: number,
    month: number
  ): Promise<AlignedSummaryResponse>;
  createManualAccount(data: CreateManualAccountBody): Promise<ManualAccount>;
  upsertBalanceHistory(
    accountType: BalanceHistoryAccountType,
    accountId: number,
    balances: BalanceHistoryUpdate[]
  ): Promise<BalanceHistoryAccount>;
  updateManualAccount(id: number, data: UpdateManualAccountBody): Promise<void>;
  updateTransaction(
    transactionId: number,
    patch: TransactionPatch
  ): Promise<Transaction>;
  deleteTransaction(transactionId: number): Promise<void>;
  updateSplitChildRecurring(
    transactionId: number,
    recurringId: number | null
  ): Promise<Transaction>;
  updateTransactions(
    transactions: (TransactionPatch & { id: number })[]
  ): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction>;
  splitTransaction(
    id: number,
    children: SplitParts,
    recurringIds?: (number | null)[]
  ): Promise<Transaction>;
  replaceSplit(
    id: number,
    children: SplitParts,
    recurringIds?: (number | null)[]
  ): Promise<Transaction>;
  unsplitTransaction(id: number): Promise<void>;
  groupTransactions(input: GroupInput): Promise<Transaction>;
  ungroupTransaction(id: number): Promise<void>;
}

const TRANSACTION_PAGE_SIZE = 250;
const MAX_TRANSACTION_PAGES = 40;

// ── Factory ─────────────────────────────────────────────────────────────────

export function createApiKeyClient(token: string): LMClient {
  const sdk = new LunchMoneyClient({ apiKey: token });

  const updateTransaction = async (
    id: number,
    patch: TransactionPatch
  ): Promise<Transaction> => {
    try {
      const updated = await sdk.transactions.update(id, patch);
      if (
        updated.split_parent_id != null &&
        Object.entries(patch).some(
          ([key, value]) =>
            JSON.stringify(updated[key as keyof Transaction]) !==
            JSON.stringify(value)
        )
      )
        throw new Error("Split child update was not confirmed by v2");
      return updated;
    } catch (v2Error) {
      // The v2 update endpoint currently rejects split children. v1 supports
      // edits to their ordinary fields; amounts still belong in the split editor.
      const current = await sdk.transactions.get(id).catch(() => null);
      if (!current?.split_parent_id) throw v2Error;
      const allowed = new Set([
        "payee",
        "date",
        "category_id",
        "notes",
        "tag_ids",
        "status",
        "recurring_id",
      ]);
      if (Object.keys(patch).some((key) => !allowed.has(key))) throw v2Error;
      const { tag_ids, status, ...fields } = patch;
      const legacyPatch = {
        ...fields,
        ...(tag_ids !== undefined && { tags: tag_ids }),
        ...(status !== undefined && {
          status: status === "reviewed" ? "cleared" : "uncleared",
        }),
      };
      const response = await fetch(
        `https://dev.lunchmoney.app/v1/transactions/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ transaction: { id, ...legacyPatch } }),
        }
      );
      const payload = (await response.json().catch(() => null)) as {
        updated?: boolean;
        error?: string | string[];
      } | null;
      if (!response.ok || payload?.updated !== true) {
        const reason = Array.isArray(payload?.error)
          ? payload.error.join(" ")
          : payload?.error;
        throw new Error(
          reason || "Lunch Money could not update this split part."
        );
      }
      const updated = await sdk.transactions.get(id);
      if (
        Object.entries(patch).some(
          ([key, value]) =>
            JSON.stringify(updated[key as keyof Transaction]) !==
            JSON.stringify(value)
        )
      )
        throw new Error("Lunch Money did not confirm the split part update.");
      return updated;
    }
  };

  const updateSplitChildRecurring = async (
    id: number,
    recurringId: number | null
  ): Promise<Transaction> => {
    // v2 currently documents split children as locked. Try it first so this
    // path can move off v1 as soon as Lunch Money permits recurring changes.
    try {
      const updated = await sdk.transactions.update(id, {
        recurring_id: recurringId,
      });
      if (updated.recurring_id === recurringId) return updated;
    } catch {
      // The legacy update endpoint can link an existing split child.
    }
    const response = await fetch(
      `https://dev.lunchmoney.app/v1/transactions/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          transaction: { id, recurring_id: recurringId },
        }),
      }
    );
    const payload = (await response.json().catch(() => null)) as {
      updated?: boolean;
      error?: string | string[];
    } | null;
    if (!response.ok || payload?.updated !== true) {
      const reason = Array.isArray(payload?.error)
        ? payload.error.join(" ")
        : payload?.error;
      throw new Error(reason || "Lunch Money could not link this split part.");
    }
    const updated = await sdk.transactions.get(id);
    if (updated.recurring_id !== recurringId)
      throw new Error("Lunch Money did not confirm the recurring link.");
    return updated;
  };

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
          include_pending: true,
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

    getTags: () => sdk.tags.getAll(),

    getManualAccounts: () => sdk.manualAccounts.getAll(),
    getPlaidAccounts: () => sdk.plaidAccounts.getAll(),

    async getAccounts() {
      const [manual, plaid] = await Promise.all([
        sdk.manualAccounts.getAll(),
        sdk.plaidAccounts.getAll(),
      ]);
      return { manual, plaid };
    },

    getRecurringItems: () =>
      sdk.recurringItems.getAll({ include_suggested: true }),

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

    createManualAccount: (data) => sdk.manualAccounts.create(data),

    async upsertBalanceHistory(accountType, accountId, balances) {
      const { data, error } = await sdk.rawClient.PUT(
        "/balance_history/{account_type}/{account_id}",
        {
          params: {
            path: { account_type: accountType, account_id: accountId },
          },
          body: { balances },
        }
      );
      if (!data) {
        throw new Error(error?.message ?? "Couldn't save balance history");
      }
      return data;
    },

    updateManualAccount: (id, data) =>
      sdk.manualAccounts.update(id, data).then(() => undefined),

    updateTransaction,
    deleteTransaction: (id) => sdk.transactions.delete(id),
    updateSplitChildRecurring,
    updateTransactions: (transactions) =>
      sdk.transactions.updateMany({ transactions }).then((r) => r.transactions),
    getTransaction: (id) => sdk.transactions.get(id),
    splitTransaction: (id, children) =>
      sdk.transactions.split(id, { child_transactions: children }),
    replaceSplit: (id, children) =>
      replaceSplitWithRestore(id, children, {
        get: (id) => sdk.transactions.get(id),
        unsplit: (id) => sdk.transactions.unsplit(id),
        split: (id, parts) =>
          sdk.transactions.split(id, { child_transactions: parts }),
        updateRecurring: updateSplitChildRecurring,
      }),
    unsplitTransaction: (id) => sdk.transactions.unsplit(id),
    groupTransactions: (input) => sdk.transactions.group(input),
    ungroupTransaction: (id) => sdk.transactions.ungroup(id),
  };
}

async function remoteRequest<T>(
  connectionId: string,
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const url = `/api/lunch-money/${path}${
    method === "GET"
      ? `${path.includes("?") ? "&" : "?"}connectionId=${encodeURIComponent(connectionId)}`
      : ""
  }`;
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(body && {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectionId, ...body }),
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Lunch Money request failed");
  }
  return payload?.data as T;
}

/** Browser client backed by an authenticated server-side LM connection. */
export function createRemoteClient(connectionId: string): LMClient {
  const getManualAccounts = (): Promise<ManualAccount[]> =>
    remoteRequest(connectionId, "accounts/manual");
  const getPlaidAccounts = (): Promise<PlaidAccount[]> =>
    remoteRequest(connectionId, "accounts/plaid");

  return {
    getMe: () => remoteRequest(connectionId, "me"),
    getTransactionsForMonth: (year, month) =>
      remoteRequest(connectionId, `transactions?year=${year}&month=${month}`),
    getCategories: () => remoteRequest(connectionId, "categories"),
    getTags: () => remoteRequest(connectionId, "tags"),
    getManualAccounts,
    getPlaidAccounts,
    async getAccounts() {
      const [manual, plaid] = await Promise.all([
        getManualAccounts(),
        getPlaidAccounts(),
      ]);
      return { manual, plaid };
    },
    getRecurringItems: () => remoteRequest(connectionId, "recurring-items"),
    getBalanceHistory: () => remoteRequest(connectionId, "balance-history"),
    getBudgetSummary: (year, month) =>
      remoteRequest(connectionId, `budget-summary?year=${year}&month=${month}`),
    createManualAccount: (data) =>
      remoteRequest(connectionId, "accounts/manual", "POST", { data }),
    upsertBalanceHistory: (accountType, accountId, balances) =>
      remoteRequest(connectionId, "balance-history", "PUT", {
        accountType,
        accountId,
        balances,
      }),
    updateManualAccount: (id, data) =>
      remoteRequest(connectionId, `accounts/manual/${id}`, "PATCH", { data }),
    updateTransaction: (id, patch) =>
      remoteRequest(connectionId, `transactions/${id}`, "PATCH", { patch }),
    deleteTransaction: (id) =>
      remoteRequest(connectionId, `transactions/${id}`, "DELETE", {
        connectionId,
      }),
    updateSplitChildRecurring: (id, recurringId) =>
      remoteRequest(connectionId, `transactions/${id}/recurring`, "PATCH", {
        recurringId,
      }),
    updateTransactions: (transactions) =>
      remoteRequest(connectionId, "transactions/bulk", "PATCH", {
        transactions,
      }),
    getTransaction: (id) => remoteRequest(connectionId, `transactions/${id}`),
    splitTransaction: (id, children, recurringIds) =>
      remoteRequest(connectionId, `transactions/${id}/split`, "POST", {
        children,
        recurringIds: recurringIds ?? children.map(() => null),
      }),
    replaceSplit: (id, children, recurringIds) =>
      remoteRequest(connectionId, `transactions/${id}/split`, "PUT", {
        children,
        recurringIds: recurringIds ?? children.map(() => null),
      }),
    unsplitTransaction: (id) =>
      remoteRequest(connectionId, `transactions/${id}/split`, "DELETE", {
        connectionId,
      }),
    groupTransactions: (input) =>
      remoteRequest(connectionId, "transactions/group", "POST", { input }),
    ungroupTransaction: (id) =>
      remoteRequest(connectionId, `transactions/group/${id}`, "DELETE", {
        connectionId,
      }),
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

export const getTags = (): Promise<Tag[]> =>
  cached(KEY.tags, () => activeClient().getTags());

export const getAccounts = (): Promise<{
  manual: ManualAccount[];
  plaid: PlaidAccount[];
}> => cached(KEY.accounts, () => activeClient().getAccounts());

export const getRecurringItems = (): Promise<RecurringItem[]> =>
  cached(KEY.recurring, () => activeClient().getRecurringItems());

export const getBalanceHistory = (): Promise<BalanceHistoryAccount[]> =>
  cached(KEY.balanceHistory, () => activeClient().getBalanceHistory());

/** Bypasses the request cache before a balance import preview or commit. */
export async function getFreshBalanceImportData(): Promise<{
  manual: ManualAccount[];
  plaid: PlaidAccount[];
  history: BalanceHistoryAccount[];
}> {
  invalidate(KEY.accounts);
  invalidate(KEY.balanceHistory);
  const [{ manual, plaid }, history] = await Promise.all([
    getAccounts(),
    getBalanceHistory(),
  ]);
  return { manual, plaid, history };
}

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

export async function createManualAccount(
  data: CreateManualAccountBody
): Promise<ManualAccount> {
  const account = await activeClient().createManualAccount(data);
  invalidate(KEY.accounts);
  invalidate(KEY.balanceHistory);
  return account;
}

export async function upsertBalanceHistory(
  accountType: BalanceHistoryAccountType,
  accountId: number,
  balances: BalanceHistoryUpdate[]
): Promise<BalanceHistoryAccount> {
  const result = await activeClient().upsertBalanceHistory(
    accountType,
    accountId,
    balances
  );
  invalidate(KEY.balanceHistory);
  return result;
}

export async function updateTransaction(
  transactionId: number,
  patch: TransactionPatch
): Promise<Transaction> {
  const transaction = await activeClient().updateTransaction(
    transactionId,
    patch
  );
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
  return transaction;
}

export async function deleteTransaction(transactionId: number): Promise<void> {
  await activeClient().deleteTransaction(transactionId);
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
}

export async function updateSplitChildRecurring(
  transactionId: number,
  recurringId: number | null
): Promise<Transaction> {
  const transaction = await activeClient().updateSplitChildRecurring(
    transactionId,
    recurringId
  );
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
  return transaction;
}

export async function updateTransactions(
  transactions: (TransactionPatch & { id: number })[]
): Promise<Transaction[]> {
  const updated = await activeClient().updateTransactions(transactions);
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
  return updated;
}

function invalidateTransactionViews() {
  invalidate(KEY.allTx);
  invalidate(KEY.allBudgets);
}

export const getTransaction = (id: number) => activeClient().getTransaction(id);

export async function splitTransaction(
  id: number,
  children: SplitParts,
  recurringIds?: (number | null)[]
) {
  const result = await activeClient().splitTransaction(
    id,
    children,
    recurringIds
  );
  invalidateTransactionViews();
  return result;
}

export async function replaceSplit(
  id: number,
  children: SplitParts,
  recurringIds?: (number | null)[]
) {
  try {
    return await activeClient().replaceSplit(id, children, recurringIds);
  } finally {
    invalidateTransactionViews();
  }
}

export async function unsplitTransaction(id: number) {
  await activeClient().unsplitTransaction(id);
  invalidateTransactionViews();
}

export async function groupTransactions(input: GroupInput) {
  const result = await activeClient().groupTransactions(input);
  invalidateTransactionViews();
  return result;
}

export async function ungroupTransaction(id: number) {
  await activeClient().ungroupTransaction(id);
  invalidateTransactionViews();
}
