// Types, fetching, and analytics for the balance history endpoint.
// This endpoint lives on a separate testing API and returns per-account
// balance snapshots over time, which we aggregate into a net worth series.

const BALANCE_HISTORY_BASE =
  "https://lm-v2-api-next-a7fabcab8e9a.herokuapp.com/v2";

// --- Types ---

export type BalanceHistorySourceType =
  | "manual"
  | "plaid"
  | "crypto_manual"
  | "crypto_synced"
  | "deleted";

export interface BalanceHistorySource {
  type: BalanceHistorySourceType;
  // manual
  manual_account_id?: number;
  // plaid
  plaid_account_id?: number;
  // crypto_manual | crypto_synced
  crypto_manual_id?: number;
  crypto_synced_id?: number;
  symbol?: string | null;
  // deleted — includes display metadata for labelling in the UI
  deleted_account_id?: number;
  name?: string;
  institution_name?: string;
  display_name?: string;
  account_type?: string;
  subtype?: string;
  mask?: string;
}

export interface BalanceHistoryEntry {
  id: number;
  date: string; // YYYY-MM-DD
  balance: string; // numeric string, native currency
  currency: string;
  to_base: number; // converted to user's primary currency
  crypto_balance: string | null;
}

export interface BalanceHistoryItem {
  source: BalanceHistorySource;
  balances: BalanceHistoryEntry[];
}

export interface BalanceHistoryResponse {
  balance_history: BalanceHistoryItem[];
}

// A single aggregated net worth snapshot: the sum of all account balances
// (in primary currency) for a given date.
export interface NetWorthPoint {
  date: string; // YYYY-MM-DD
  total: number;
}

// --- API ---

export async function getBalanceHistory(
  token: string
): Promise<BalanceHistoryResponse> {
  const res = await fetch(`${BALANCE_HISTORY_BASE}/balance_history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch balance history (${res.status})`);
  }
  return res.json() as Promise<BalanceHistoryResponse>;
}

// --- Analytics ---

// Sums all account to_base values per date into a chronological series.
// Dates with no data are omitted (no interpolation).
export function computeNetWorthTimeSeries(
  data: BalanceHistoryResponse
): NetWorthPoint[] {
  const totals = new Map<string, number>();
  for (const item of data.balance_history) {
    for (const entry of item.balances) {
      totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.to_base);
    }
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}
