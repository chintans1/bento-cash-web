export const PLAID_REFRESH_COOLDOWN_MS = 5 * 60_000;

export type PlaidRefreshResponse = {
  retryAt?: number | null;
  error?: string;
};

export const PLAID_REFRESH_PATH = "/api/lunch-money/accounts/plaid/refresh";
