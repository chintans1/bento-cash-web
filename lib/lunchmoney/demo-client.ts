import type {
  User,
  Category,
  ManualAccount,
  RecurringItem,
  AlignedSummaryResponse,
  Transaction,
} from "@lunch-money/lunch-money-js-v2";
import type {
  LMClient,
  BalanceHistoryAccount,
  CategoriesResponse,
  TransactionsResponse,
} from "./client";

// ── Fixture builders ─────────────────────────────────────────────────────────

/**
 * Demo objects are assembled from complete defaults plus a checked partial,
 * rather than cast into shape with `as unknown as T`.
 *
 * The casts switched the type checker off in the one place the app fabricates
 * LM-shaped data, so a field that didn't exist compiled without complaint —
 * the old DEMO_USER carried `user_id` and `user_name`, which `User` has never
 * had, and demo transactions were missing `to_base` entirely. A builder keeps
 * the fixtures as short as the casts did while checking what they supply
 * against the real schema.
 */
const TS = "2025-01-01T00:00:00.000Z";

function demoCategory(seed: Pick<Category, "id" | "name">): Category {
  return {
    description: null,
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    created_at: TS,
    updated_at: TS,
    group_id: null,
    is_group: false,
    archived: false,
    archived_at: null,
    order: null,
    collapsed: false,
    ...seed,
  };
}

function demoAccount(
  seed: Pick<
    ManualAccount,
    | "id"
    | "name"
    | "display_name"
    | "institution_name"
    | "type"
    | "subtype"
    | "balance"
    | "to_base"
  >
): ManualAccount {
  return {
    currency: "usd",
    balance_as_of: "2025-01-20",
    status: "active",
    closed_on: null,
    external_id: null,
    exclude_from_transactions: false,
    created_by_name: "Alex Demo",
    created_at: TS,
    updated_at: TS,
    ...seed,
  };
}

function demoRecurring(seed: {
  id: number;
  payee: string;
  amount: string;
}): RecurringItem {
  return {
    id: seed.id,
    description: null,
    status: "reviewed",
    transaction_criteria: {
      start_date: null,
      end_date: null,
      granularity: "month",
      quantity: 1,
      anchor_date: "2025-01-01",
      payee: seed.payee,
      amount: seed.amount,
      to_base: parseFloat(seed.amount),
      currency: "usd",
      plaid_account_id: null,
      manual_account_id: null,
    },
    overrides: {},
    matches: null,
    created_by: 99999,
    created_at: TS,
    updated_at: TS,
    source: "manual",
  };
}

function demoTransaction(
  seed: Pick<
    Transaction,
    "id" | "date" | "payee" | "amount" | "category_id" | "notes"
  > & { recurring_id?: number | null }
): Transaction {
  return {
    currency: "usd",
    // Every analytics figure sums `to_base`, so a demo transaction without one
    // would contribute nothing at all to the numbers it is meant to populate.
    to_base: parseFloat(seed.amount),
    recurring_id: null,
    original_name: null,
    plaid_account_id: null,
    manual_account_id: null,
    external_id: null,
    tag_ids: [],
    status: "reviewed",
    is_pending: false,
    created_at: `${seed.date}T12:00:00.000Z`,
    updated_at: `${seed.date}T12:00:00.000Z`,
    split_parent_id: null,
    is_group_parent: false,
    group_parent_id: null,
    source: "manual",
    ...seed,
  };
}

// ── Static demo data ─────────────────────────────────────────────────────────

const DEMO_USER: User = {
  id: 99999,
  account_id: 99999,
  name: "Alex Demo",
  email: "demo@bentocash.app",
  primary_currency: "usd",
  api_key_label: "Demo Mode",
  budget_name: "Demo Budget",
};

const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: "Food & Dining" },
  { id: 2, name: "Shopping" },
  { id: 3, name: "Transportation" },
  { id: 4, name: "Entertainment" },
  { id: 5, name: "Health & Fitness" },
  { id: 6, name: "Utilities" },
  { id: 7, name: "Travel" },
  { id: 8, name: "Personal Care" },
  { id: 9, name: "Housing" },
].map(demoCategory);

const DEMO_ACCOUNTS: ManualAccount[] = [
  {
    id: 1001,
    name: "Total Checking",
    display_name: "Chase Total Checking",
    institution_name: "Chase",
    type: "cash" as const,
    subtype: "checking",
    balance: "8347.62",
    to_base: 8347.62,
  },
  {
    id: 1002,
    name: "High-Yield Savings",
    display_name: "Ally High-Yield Savings",
    institution_name: "Ally",
    type: "cash" as const,
    subtype: "savings",
    balance: "15200.00",
    to_base: 15200.0,
  },
  {
    id: 1003,
    name: "Sapphire Preferred",
    display_name: "Chase Sapphire Preferred",
    institution_name: "Chase",
    type: "credit" as const,
    subtype: "credit card",
    balance: "2341.50",
    to_base: 2341.5,
  },
  {
    id: 1004,
    name: "401k",
    display_name: "Vanguard 401k",
    institution_name: "Vanguard",
    type: "investment" as const,
    subtype: "401k",
    balance: "48250.00",
    to_base: 48250.0,
  },
].map(demoAccount);

const DEMO_RECURRING: RecurringItem[] = [
  { id: 2001, payee: "Landlord", amount: "2100.00" },
  { id: 2002, payee: "Netflix", amount: "15.99" },
  { id: 2003, payee: "Spotify", amount: "9.99" },
  { id: 2004, payee: "Con Edison", amount: "145.00" },
  { id: 2005, payee: "Planet Fitness", amount: "24.99" },
].map(demoRecurring);

// Budget amounts: [budgeted, other_activity]. Food and Shopping are over budget.
const DEMO_BUDGET_SUMMARY: AlignedSummaryResponse = {
  aligned: true,
  categories: [
    {
      category_id: 1,
      totals: {
        budgeted: 600,
        other_activity: 654.11,
        recurring_activity: 0,
        recurring_expected: 0,
        recurring_remaining: 0,
      },
    },
    {
      category_id: 2,
      totals: {
        budgeted: 350,
        other_activity: 773.43,
        recurring_activity: 0,
        recurring_expected: 0,
        recurring_remaining: 0,
      },
    },
    {
      category_id: 4,
      totals: {
        budgeted: 40,
        other_activity: 35.97,
        recurring_activity: 0,
        recurring_expected: 0,
        recurring_remaining: 0,
      },
    },
    {
      category_id: 6,
      totals: {
        budgeted: 200,
        other_activity: 156.0,
        recurring_activity: 89.0,
        recurring_expected: 89.0,
        recurring_remaining: 0,
      },
    },
  ],
};

// Deterministic per-(year, month, index) so navigation is consistent.
function seededRandom(year: number, month: number, index: number): number {
  const x = Math.sin(year * 374761 + month * 1234567 + index * 97531) * 1e9;
  return x - Math.floor(x); // [0, 1)
}

function randAmount(
  min: number,
  max: number,
  year: number,
  month: number,
  index: number
): string {
  return (min + seededRandom(year, month, index) * (max - min)).toFixed(2);
}

type TxTemplate = {
  payee: string;
  min: number;
  max: number;
  category_id: number | null;
  day: number;
  notes: string | null;
  recurring_id?: number;
};

const TX_TEMPLATES: TxTemplate[] = [
  // Housing
  {
    payee: "Landlord",
    min: 2100,
    max: 2100,
    category_id: 9,
    day: 1,
    notes: "Monthly rent",
    recurring_id: 2001,
  },
  // Income — salary fixed, freelance varies
  {
    payee: "ACME Corp",
    min: -4850,
    max: -4850,
    category_id: null,
    day: 1,
    notes: "Paycheck",
  },
  {
    payee: "ACME Corp",
    min: -4850,
    max: -4850,
    category_id: null,
    day: 15,
    notes: "Paycheck",
  },
  {
    payee: "Freelance Design",
    min: -200,
    max: -1400,
    category_id: null,
    day: 20,
    notes: null,
  },
  // Food & Dining
  {
    payee: "Whole Foods",
    min: 70,
    max: 175,
    category_id: 1,
    day: 3,
    notes: null,
  },
  { payee: "Chipotle", min: 9, max: 22, category_id: 1, day: 5, notes: null },
  { payee: "Starbucks", min: 5, max: 14, category_id: 1, day: 7, notes: null },
  {
    payee: "Trader Joe's",
    min: 50,
    max: 140,
    category_id: 1,
    day: 9,
    notes: null,
  },
  {
    payee: "Nobu Restaurant",
    min: 80,
    max: 240,
    category_id: 1,
    day: 12,
    notes: "Date night",
  },
  { payee: "Starbucks", min: 5, max: 13, category_id: 1, day: 16, notes: null },
  {
    payee: "Whole Foods",
    min: 60,
    max: 150,
    category_id: 1,
    day: 18,
    notes: null,
  },
  { payee: "Chipotle", min: 10, max: 25, category_id: 1, day: 21, notes: null },
  { payee: "Starbucks", min: 6, max: 16, category_id: 1, day: 24, notes: null },
  { payee: "Chipotle", min: 8, max: 20, category_id: 1, day: 26, notes: null },
  {
    payee: "Whole Foods",
    min: 80,
    max: 160,
    category_id: 1,
    day: 28,
    notes: null,
  },
  // Shopping
  { payee: "Amazon", min: 30, max: 220, category_id: 2, day: 4, notes: null },
  { payee: "Target", min: 25, max: 130, category_id: 2, day: 8, notes: null },
  {
    payee: "IKEA",
    min: 40,
    max: 320,
    category_id: 2,
    day: 11,
    notes: "New bookshelf",
  },
  { payee: "H&M", min: 30, max: 110, category_id: 2, day: 14, notes: null },
  { payee: "Amazon", min: 50, max: 280, category_id: 2, day: 19, notes: null },
  { payee: "Target", min: 35, max: 120, category_id: 2, day: 23, notes: null },
  { payee: "Zara", min: 50, max: 200, category_id: 2, day: 27, notes: null },
  // Transportation
  { payee: "Uber", min: 12, max: 55, category_id: 3, day: 6, notes: null },
  { payee: "Lyft", min: 10, max: 40, category_id: 3, day: 13, notes: null },
  { payee: "Uber", min: 18, max: 60, category_id: 3, day: 22, notes: null },
  // Entertainment — subscriptions fixed, Apple varies
  {
    payee: "Netflix",
    min: 15.99,
    max: 15.99,
    category_id: 4,
    day: 7,
    notes: null,
    recurring_id: 2002,
  },
  {
    payee: "Spotify",
    min: 9.99,
    max: 9.99,
    category_id: 4,
    day: 7,
    notes: null,
    recurring_id: 2003,
  },
  {
    payee: "Apple",
    min: 9.99,
    max: 29.99,
    category_id: 4,
    day: 20,
    notes: null,
  },
  // Health & Fitness
  {
    payee: "CVS Pharmacy",
    min: 15,
    max: 90,
    category_id: 5,
    day: 8,
    notes: null,
  },
  {
    payee: "Planet Fitness",
    min: 24.99,
    max: 24.99,
    category_id: 5,
    day: 9,
    notes: null,
    recurring_id: 2005,
  },
  {
    payee: "Equinox",
    min: 150,
    max: 220,
    category_id: 5,
    day: 25,
    notes: null,
  },
  // Utilities
  {
    payee: "Con Edison",
    min: 85,
    max: 210,
    category_id: 6,
    day: 10,
    notes: null,
    recurring_id: 2004,
  },
  { payee: "AT&T", min: 89, max: 89, category_id: 6, day: 28, notes: null },
  // Travel — sporadic; some months nothing, some months a flight
  {
    payee: "Delta Airlines",
    min: 0,
    max: 650,
    category_id: 7,
    day: 15,
    notes: "Round trip NYC–Miami",
  },
  // Personal Care
  {
    payee: "Walgreens",
    min: 12,
    max: 75,
    category_id: 8,
    day: 17,
    notes: null,
  },
  { payee: "Sephora", min: 25, max: 140, category_id: 8, day: 26, notes: null },
];

const DEMO_HISTORY_MONTHS = 24;

/**
 * Two years of month-end balances for the demo accounts, walked backwards from
 * the balances above: each account drifts by a fixed monthly trend plus a
 * seeded wobble, so the net worth curve rises the way a real one does without
 * being a straight line. Generated relative to today, so the demo always has
 * history right up to the current month.
 */
function demoBalanceHistory(): BalanceHistoryAccount[] {
  // Monthly drift as a fraction of the account's current balance. Savings and
  // the 401k grow, the card balance stays roughly flat.
  const TREND: Record<number, number> = {
    1001: 0.004,
    1002: 0.012,
    1003: 0.0,
    1004: 0.018,
  };

  const now = new Date();
  const months: string[] = [];
  for (let back = DEMO_HISTORY_MONTHS - 1; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return DEMO_ACCOUNTS.map<BalanceHistoryAccount>((account) => ({
    source: { type: "manual", manual_account_id: account.id },
    balances: months.map((month, i) => {
      const back = months.length - 1 - i;
      const trend = (1 + TREND[account.id]) ** -back;
      const wobble = 0.97 + seededRandom(account.id, i, 3) * 0.06;
      const balance = account.to_base * trend * (back === 0 ? 1 : wobble);
      return {
        // The newest month is the API's ephemeral "current" snapshot: today's
        // balance, with no stored entry — and so no id — behind it.
        ...(back === 0
          ? { type: "current" as const }
          : { type: "historical" as const, id: account.id * 100 + i }),
        month,
        balance: balance.toFixed(4),
        currency: "usd",
        to_base: Number(balance.toFixed(2)),
        crypto_balance: null,
      };
    }),
  }));
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createDemoClient(): LMClient {
  return {
    getMe: () => Promise.resolve(DEMO_USER),

    getTransactionsForMonth(year, month) {
      const maxDay = new Date(year, month, 0).getDate();
      const transactions = TX_TEMPLATES.flatMap((tmpl, i) => {
        const amount = randAmount(tmpl.min, tmpl.max, year, month, i);
        // Skip $0 transactions (used for sporadic items like travel)
        if (parseFloat(amount) === 0) return [];
        const day = Math.min(tmpl.day, maxDay);
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return [
          demoTransaction({
            id: 10000 + i,
            date,
            payee: tmpl.payee,
            amount,
            category_id: tmpl.category_id,
            notes: tmpl.notes,
            recurring_id: tmpl.recurring_id,
          }),
        ];
      });
      transactions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return Promise.resolve<TransactionsResponse>({
        transactions,
        has_more: false,
      });
    },

    getCategories: () =>
      Promise.resolve<CategoriesResponse>({ categories: DEMO_CATEGORIES }),

    getAccounts: () => Promise.resolve({ manual: DEMO_ACCOUNTS, plaid: [] }),

    getRecurringItems: () => Promise.resolve(DEMO_RECURRING),

    getBalanceHistory: () => Promise.resolve(demoBalanceHistory()),

    getBudgetSummary: () => Promise.resolve(DEMO_BUDGET_SUMMARY),

    updateManualAccount: () => Promise.resolve(),
    updateTransactionCategory: () => Promise.resolve(),
    updateTransactionNotes: () => Promise.resolve(),
    updateTransactionPayee: () => Promise.resolve(),
  };
}
