import type {
  User,
  Category,
  ManualAccount,
  RecurringItem,
  AlignedSummaryResponse,
} from "@lunch-money/lunch-money-js-v2";
import type { LMClient, CategoriesResponse, TransactionsResponse } from "./client";

// ── Static demo data ─────────────────────────────────────────────────────────

const DEMO_USER: User = {
  user_id: 99999,
  user_name: "alex_demo",
  name: "Alex Demo",
  email: "demo@bentocash.app",
  primary_currency: "usd",
  api_key_label: "Demo Mode",
  budget_name: "Demo Budget",
} as unknown as User;

const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: "Food & Dining", is_income: false, exclude_from_totals: false },
  { id: 2, name: "Shopping", is_income: false, exclude_from_totals: false },
  { id: 3, name: "Transportation", is_income: false, exclude_from_totals: false },
  { id: 4, name: "Entertainment", is_income: false, exclude_from_totals: false },
  { id: 5, name: "Health & Fitness", is_income: false, exclude_from_totals: false },
  { id: 6, name: "Utilities", is_income: false, exclude_from_totals: false },
  { id: 7, name: "Travel", is_income: false, exclude_from_totals: false },
  { id: 8, name: "Personal Care", is_income: false, exclude_from_totals: false },
  { id: 9, name: "Housing", is_income: false, exclude_from_totals: false },
] as unknown as Category[];

const DEMO_ACCOUNTS: ManualAccount[] = [
  {
    id: 1001,
    name: "Total Checking",
    display_name: "Chase Total Checking",
    institution_name: "Chase",
    type: "depository",
    subtype: "checking",
    balance: "4532.18",
    currency: "usd",
    to_base: 4532.18,
    balance_as_of: "2025-01-20",
    status: "active",
  },
  {
    id: 1002,
    name: "High-Yield Savings",
    display_name: "Ally High-Yield Savings",
    institution_name: "Ally",
    type: "depository",
    subtype: "savings",
    balance: "15200.00",
    currency: "usd",
    to_base: 15200.0,
    balance_as_of: "2025-01-20",
    status: "active",
  },
  {
    id: 1003,
    name: "Sapphire Preferred",
    display_name: "Chase Sapphire Preferred",
    institution_name: "Chase",
    type: "credit",
    subtype: "credit card",
    balance: "2341.50",
    currency: "usd",
    to_base: 2341.5,
    balance_as_of: "2025-01-20",
    status: "active",
  },
  {
    id: 1004,
    name: "401k",
    display_name: "Vanguard 401k",
    institution_name: "Vanguard",
    type: "investment",
    subtype: "401k",
    balance: "48250.00",
    currency: "usd",
    to_base: 48250.0,
    balance_as_of: "2025-01-20",
    status: "active",
  },
] as unknown as ManualAccount[];

const DEMO_RECURRING: RecurringItem[] = [
  { id: 2001, status: "reviewed", transaction_criteria: { amount: "2100.00", granularity: "month", currency: "usd", payee: "Landlord" } },
  { id: 2002, status: "reviewed", transaction_criteria: { amount: "15.99", granularity: "month", currency: "usd", payee: "Netflix" } },
  { id: 2003, status: "reviewed", transaction_criteria: { amount: "9.99", granularity: "month", currency: "usd", payee: "Spotify" } },
  { id: 2004, status: "reviewed", transaction_criteria: { amount: "145.00", granularity: "month", currency: "usd", payee: "Con Edison" } },
  { id: 2005, status: "reviewed", transaction_criteria: { amount: "24.99", granularity: "month", currency: "usd", payee: "Planet Fitness" } },
] as unknown as RecurringItem[];

// Budget amounts: [budgeted, other_activity]. Food and Shopping are over budget.
const DEMO_BUDGET_SUMMARY: AlignedSummaryResponse = {
  categories: [
    { category_id: 1, totals: { budgeted: 600, other_activity: 654.11, recurring_activity: 0 } },
    { category_id: 2, totals: { budgeted: 350, other_activity: 773.43, recurring_activity: 0 } },
    { category_id: 4, totals: { budgeted: 40, other_activity: 35.97, recurring_activity: 0 } },
    { category_id: 6, totals: { budgeted: 200, other_activity: 156.0, recurring_activity: 89.0 } },
  ],
} as unknown as AlignedSummaryResponse;

// Deterministic per-(year, month, index) so navigation is consistent.
function seededRandom(year: number, month: number, index: number): number {
  const x = Math.sin(year * 374761 + month * 1234567 + index * 97531) * 1e9;
  return x - Math.floor(x); // [0, 1)
}

function randAmount(min: number, max: number, year: number, month: number, index: number): string {
  return (min + seededRandom(year, month, index) * (max - min)).toFixed(2);
}

type TxTemplate = {
  payee: string;
  min: number;
  max: number;
  category_id: number | null;
  day: number;
  notes: string | null;
};

const TX_TEMPLATES: TxTemplate[] = [
  // Housing
  { payee: "Landlord",          min: 2100,  max: 2100,  category_id: 9,    day: 1,  notes: "Monthly rent" },
  // Income — salary fixed, freelance varies
  { payee: "ACME Corp",         min: -4850, max: -4850, category_id: null, day: 1,  notes: "Paycheck" },
  { payee: "ACME Corp",         min: -4850, max: -4850, category_id: null, day: 15, notes: "Paycheck" },
  { payee: "Freelance Design",  min: -200,  max: -1400, category_id: null, day: 20, notes: null },
  // Food & Dining
  { payee: "Whole Foods",       min: 70,  max: 175, category_id: 1, day: 3,  notes: null },
  { payee: "Chipotle",          min: 9,   max: 22,  category_id: 1, day: 5,  notes: null },
  { payee: "Starbucks",         min: 5,   max: 14,  category_id: 1, day: 7,  notes: null },
  { payee: "Trader Joe's",      min: 50,  max: 140, category_id: 1, day: 9,  notes: null },
  { payee: "Nobu Restaurant",   min: 80,  max: 240, category_id: 1, day: 12, notes: "Date night" },
  { payee: "Starbucks",         min: 5,   max: 13,  category_id: 1, day: 16, notes: null },
  { payee: "Whole Foods",       min: 60,  max: 150, category_id: 1, day: 18, notes: null },
  { payee: "Chipotle",          min: 10,  max: 25,  category_id: 1, day: 21, notes: null },
  { payee: "Starbucks",         min: 6,   max: 16,  category_id: 1, day: 24, notes: null },
  { payee: "Chipotle",          min: 8,   max: 20,  category_id: 1, day: 26, notes: null },
  { payee: "Whole Foods",       min: 80,  max: 160, category_id: 1, day: 28, notes: null },
  // Shopping
  { payee: "Amazon",            min: 30,  max: 220, category_id: 2, day: 4,  notes: null },
  { payee: "Target",            min: 25,  max: 130, category_id: 2, day: 8,  notes: null },
  { payee: "IKEA",              min: 40,  max: 320, category_id: 2, day: 11, notes: "New bookshelf" },
  { payee: "H&M",               min: 30,  max: 110, category_id: 2, day: 14, notes: null },
  { payee: "Amazon",            min: 50,  max: 280, category_id: 2, day: 19, notes: null },
  { payee: "Target",            min: 35,  max: 120, category_id: 2, day: 23, notes: null },
  { payee: "Zara",              min: 50,  max: 200, category_id: 2, day: 27, notes: null },
  // Transportation
  { payee: "Uber",              min: 12,  max: 55,  category_id: 3, day: 6,  notes: null },
  { payee: "Lyft",              min: 10,  max: 40,  category_id: 3, day: 13, notes: null },
  { payee: "Uber",              min: 18,  max: 60,  category_id: 3, day: 22, notes: null },
  // Entertainment — subscriptions fixed, Apple varies
  { payee: "Netflix",           min: 15.99, max: 15.99, category_id: 4, day: 7,  notes: null },
  { payee: "Spotify",           min: 9.99,  max: 9.99,  category_id: 4, day: 7,  notes: null },
  { payee: "Apple",             min: 9.99,  max: 29.99, category_id: 4, day: 20, notes: null },
  // Health & Fitness
  { payee: "CVS Pharmacy",      min: 15,  max: 90,  category_id: 5, day: 8,  notes: null },
  { payee: "Planet Fitness",    min: 24.99, max: 24.99, category_id: 5, day: 9, notes: null },
  { payee: "Equinox",           min: 150, max: 220, category_id: 5, day: 25, notes: null },
  // Utilities
  { payee: "Con Edison",        min: 85,  max: 210, category_id: 6, day: 10, notes: null },
  { payee: "AT&T",              min: 89,  max: 89,  category_id: 6, day: 28, notes: null },
  // Travel — sporadic; some months nothing, some months a flight
  { payee: "Delta Airlines",    min: 0,   max: 650, category_id: 7, day: 15, notes: "Round trip NYC–Miami" },
  // Personal Care
  { payee: "Walgreens",         min: 12,  max: 75,  category_id: 8, day: 17, notes: null },
  { payee: "Sephora",           min: 25,  max: 140, category_id: 8, day: 26, notes: null },
];

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
        return [{
          id: 10000 + i,
          date,
          payee: tmpl.payee,
          amount,
          currency: "usd",
          category_id: tmpl.category_id,
          notes: tmpl.notes,
          status: "cleared",
          is_pending: false,
          created_at: `${date}T12:00:00.000Z`,
        }];
      });
      transactions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Promise.resolve({ transactions: transactions as any, has_more: false } as TransactionsResponse);
    },

    getCategories: () => Promise.resolve({ categories: DEMO_CATEGORIES } as CategoriesResponse),

    getAccounts: () => Promise.resolve({ manual: DEMO_ACCOUNTS, plaid: [] }),

    getRecurringItems: () => Promise.resolve(DEMO_RECURRING),

    getBudgetSummary: () => Promise.resolve(DEMO_BUDGET_SUMMARY),

    updateManualAccount: () => Promise.resolve(),
    updateTransactionCategory: () => Promise.resolve(),
    updateTransactionNotes: () => Promise.resolve(),
  };
}
