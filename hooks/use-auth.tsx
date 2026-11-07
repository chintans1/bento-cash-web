"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { createRemoteClient, setActiveClient } from "@/lib/lunchmoney/client";
import { createDemoClient } from "@/lib/lunchmoney/demo-client";
import type {
  LunchMoneyConnection,
  LunchMoneyConnectionsState,
} from "@/lib/lunchmoney/connection-types";

interface AuthContextValue {
  isDemo: boolean;
  isSignedIn: boolean;
  hasDataSource: boolean;
  isReady: boolean;
  user: { id: string; name: string; email: string } | null;
  userId: string | null;
  connections: LunchMoneyConnection[];
  activeConnection: LunchMoneyConnection | null;
  dataScopeKey: string | null;
  error: string | null;
  clearError: () => void;
  switchConnection: (connectionId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(payload?.error ?? "Request failed");
  return payload as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;
  const [connectionState, setConnectionState] = useState<
    (LunchMoneyConnectionsState & { userId: string }) | null
  >(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get("error");
    if (!authError) return;
    const message =
      authError === "account_not_linked"
        ? "This Lunch Money email is not linked to your Bento Cash account. Sign in with the matching email."
        : authError === "oauth_identity_mismatch"
          ? "Your Lunch Money email does not match this Bento Cash account."
          : authError === "oauth_connection_failed"
            ? "Signed in, but couldn't connect the selected Lunch Money budget. Try again."
            : "Couldn't sign in with Lunch Money. Please try again.";
    queueMicrotask(() => setError(message));
    url.searchParams.delete("error");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiRequest<LunchMoneyConnectionsState>("/api/connections")
      .then((connections) => {
        if (!cancelled) {
          setConnectionState({ ...connections, userId: user.id });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Couldn't load connections"
          );
          setConnectionState({
            connections: [],
            activeConnectionId: null,
            userId: user.id,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const current = connectionState?.userId === user?.id ? connectionState : null;
  const connections = current?.connections ?? [];
  const activeConnection =
    connections.find(
      (connection) => connection.id === current?.activeConnectionId
    ) ?? null;
  const dataScopeKey = isDemo
    ? "demo"
    : user && activeConnection
      ? `${user.id}:${activeConnection.id}`
      : null;

  // Layout effects run before the page's passive data-fetching effects.
  useLayoutEffect(() => {
    if (isDemo) setActiveClient(createDemoClient());
    else if (activeConnection)
      setActiveClient(createRemoteClient(activeConnection.id));
    else setActiveClient(null);
  }, [activeConnection, isDemo]);

  async function switchConnection(connectionId: string) {
    setError(null);
    try {
      await apiRequest(`/api/connections/${encodeURIComponent(connectionId)}`, {
        method: "PATCH",
      });
      setIsDemo(false);
      setConnectionState((previous) =>
        previous ? { ...previous, activeConnectionId: connectionId } : previous
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't switch budget"
      );
      throw cause;
    }
  }

  async function removeConnection(connectionId: string) {
    setError(null);
    const state = await apiRequest<LunchMoneyConnectionsState>(
      `/api/connections/${encodeURIComponent(connectionId)}`,
      { method: "DELETE" }
    );
    if (user) setConnectionState({ ...state, userId: user.id });
  }

  async function signOut() {
    if (isDemo) {
      setIsDemo(false);
      return;
    }
    await authClient.signOut();
    setConnectionState(null);
    setError(null);
  }

  function enterDemo() {
    setError(null);
    setIsDemo(true);
  }

  const isReady =
    !sessionPending && (isDemo || !user || connectionState?.userId === user.id);

  return (
    <AuthContext.Provider
      value={{
        isDemo,
        isSignedIn: !!user,
        hasDataSource: dataScopeKey !== null,
        isReady,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
        userId: user?.id ?? null,
        connections,
        activeConnection,
        dataScopeKey,
        error,
        clearError: () => setError(null),
        switchConnection,
        removeConnection,
        signOut,
        enterDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
