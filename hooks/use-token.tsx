"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { createRemoteClient, setActiveClient } from "@/lib/lunchmoney/client";
import { createDemoClient } from "@/lib/lunchmoney/demo-client";

const LEGACY_AUTH_KEY = "bento_auth_v1";
const LEGACY_TOKEN_KEY = "lm_token";

export type AuthMethod = "api_key" | "oauth";

export interface LinkedAccount {
  id: string;
  userId: string;
  provider: "lunch_money";
  authMethod: AuthMethod;
  label: string;
  budgetName: string | null;
  email: string | null;
  externalAccountId: string;
  createdAt: string;
}

interface ConnectionsResponse {
  accounts: LinkedAccount[];
  activeAccountId: string | null;
}

interface ConnectionCreatedResponse {
  account: LinkedAccount;
}

export interface LegacyImportNotice {
  accounts: LinkedAccount[];
}

interface TokenContextValue {
  /** API keys never enter client state; retained as a null compatibility field. */
  token: null;
  isDemo: boolean;
  isSignedIn: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  user: { id: string; name: string; email: string } | null;
  userId: string | null;
  accounts: LinkedAccount[];
  activeAccount: LinkedAccount | null;
  sessionKey: string | null;
  error: string | null;
  legacyImportNotice: LegacyImportNotice | null;
  dismissLegacyImportNotice: () => void;
  connectAccount: (token: string) => Promise<LinkedAccount>;
  switchAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  setToken: (value: string) => Promise<LinkedAccount>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  refreshConnections: () => Promise<void>;
}

const TokenContext = createContext<TokenContextValue | null>(null);

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(payload?.error ?? "Request failed");
  return payload as T;
}

/** Moves previously browser-local keys into encrypted, user-owned DB rows. */
async function migrateLegacyConnections(): Promise<LinkedAccount[]> {
  const raw = localStorage.getItem(LEGACY_AUTH_KEY);
  const tokens: string[] = [];
  if (raw) {
    try {
      const state = JSON.parse(raw) as {
        accounts?: Array<{ credential?: { type?: string; token?: unknown } }>;
      };
      for (const account of state.accounts ?? []) {
        if (
          account.credential?.type === "api_key" &&
          typeof account.credential.token === "string"
        ) {
          tokens.push(account.credential.token);
        }
      }
    } catch {
      // A corrupt legacy record is ignored; the new server session still works.
    }
  }
  const singleToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (singleToken) tokens.push(singleToken);
  if (tokens.length === 0) return [];

  const results = await Promise.allSettled(
    [...new Set(tokens)].map((token) =>
      apiRequest<ConnectionCreatedResponse>("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
    )
  );
  if (results.every((result) => result.status === "fulfilled")) {
    localStorage.removeItem(LEGACY_AUTH_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem("lm_demo");
  }
  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.account] : []
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;
  const [connectionState, setConnectionState] = useState<
    (ConnectionsResponse & { userId: string }) | null
  >(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacyImportNotice, setLegacyImportNotice] =
    useState<LegacyImportNotice | null>(null);

  const refreshConnections = useCallback(async () => {
    if (!user) return;
    const data = await apiRequest<ConnectionsResponse>("/api/connections");
    setConnectionState({ ...data, userId: user.id });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    migrateLegacyConnections()
      .then(async (importedAccounts) => ({
        importedAccounts,
        connections: await apiRequest<ConnectionsResponse>("/api/connections"),
      }))
      .then(({ importedAccounts, connections }) => {
        if (!cancelled) {
          setConnectionState({ ...connections, userId: user.id });
          if (importedAccounts.length > 0) {
            const uniqueAccounts = [
              ...new Map(
                importedAccounts.map((account) => [account.id, account])
              ).values(),
            ];
            setLegacyImportNotice({ accounts: uniqueAccounts });
          }
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Couldn't load accounts"
          );
          setConnectionState({
            accounts: [],
            activeAccountId: null,
            userId: user.id,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const current = connectionState?.userId === user?.id ? connectionState : null;
  const accounts = current?.accounts ?? [];
  const activeAccount =
    accounts.find((account) => account.id === current?.activeAccountId) ?? null;
  const sessionKey = isDemo
    ? "demo"
    : user && activeAccount
      ? `${user.id}:${activeAccount.id}`
      : null;

  // Layout effects run before the page's passive data-fetching effects.
  useLayoutEffect(() => {
    if (isDemo) setActiveClient(createDemoClient());
    else if (activeAccount)
      setActiveClient(createRemoteClient(activeAccount.id));
    else setActiveClient(null);
  }, [activeAccount, isDemo]);

  async function connectAccount(token: string) {
    setError(null);
    try {
      const { account } = await apiRequest<ConnectionCreatedResponse>(
        "/api/connections",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      setIsDemo(false);
      await refreshConnections();
      return account;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't connect account"
      );
      throw cause;
    }
  }

  async function switchAccount(accountId: string) {
    try {
      await apiRequest(`/api/connections/${encodeURIComponent(accountId)}`, {
        method: "PATCH",
      });
      setIsDemo(false);
      await refreshConnections();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't switch account"
      );
    }
  }

  async function removeAccount(accountId: string) {
    try {
      await apiRequest(`/api/connections/${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      await refreshConnections();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't remove account"
      );
      throw cause;
    }
  }

  async function signOut() {
    if (isDemo) {
      setIsDemo(false);
      return;
    }
    await authClient.signOut();
    setConnectionState(null);
    setLegacyImportNotice(null);
  }

  function enterDemo() {
    setIsDemo(true);
  }

  const isReady =
    !sessionPending && (isDemo || !user || connectionState?.userId === user.id);

  return (
    <TokenContext.Provider
      value={{
        token: null,
        isDemo,
        isSignedIn: !!user,
        isAuthenticated: sessionKey !== null,
        isReady,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
        userId: user?.id ?? null,
        accounts,
        activeAccount,
        sessionKey,
        error,
        legacyImportNotice,
        dismissLegacyImportNotice: () => setLegacyImportNotice(null),
        connectAccount,
        switchAccount,
        removeAccount,
        setToken: connectAccount,
        signOut,
        enterDemo,
        refreshConnections,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useAuth(): TokenContextValue {
  const context = useContext(TokenContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

/** Compatibility aliases while callers migrate from the single-token model. */
export const TokenProvider = AuthProvider;
export const useToken = useAuth;
