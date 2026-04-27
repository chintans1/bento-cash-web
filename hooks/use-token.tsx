"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { setActiveClient, createRealClient } from "@/lib/lunchmoney/client";
import { createDemoClient } from "@/lib/lunchmoney/demo-client";

const STORAGE_KEY = "lm_token";
const DEMO_KEY = "lm_demo";

// Initialize the active client from localStorage when this module first loads on
// the client. Must happen before any React rendering so API calls are never made
// without a client set.
if (typeof window !== "undefined") {
  const storedDemo = localStorage.getItem(DEMO_KEY) === "true";
  const storedToken = localStorage.getItem(STORAGE_KEY);
  if (storedDemo) setActiveClient(createDemoClient());
  else if (storedToken) setActiveClient(createRealClient(storedToken));
}

// ── External store ────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const notify = () => listeners.forEach((l) => l());

// ── Context ───────────────────────────────────────────────────────────────────

interface TokenContextValue {
  token: string | null;
  isDemo: boolean;
  isAuthenticated: boolean;
  setToken: (value: string) => void;
  clearToken: () => void;
  enterDemo: () => void;
  exitDemo: () => void;
}

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore: server snapshot (SSR) is null/false; client snapshot
  // reads localStorage. React reconciles the difference after hydration.
  const token = useSyncExternalStore(
    subscribe,
    () => {
      const storedDemo = localStorage.getItem(DEMO_KEY) === "true";
      return storedDemo ? null : localStorage.getItem(STORAGE_KEY);
    },
    () => null
  );
  const isDemo = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(DEMO_KEY) === "true",
    () => false
  );

  function setToken(value: string) {
    localStorage.setItem(STORAGE_KEY, value);
    localStorage.removeItem(DEMO_KEY);
    setActiveClient(createRealClient(value));
    notify();
  }

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY);
    setActiveClient(null);
    notify();
  }

  function enterDemo() {
    localStorage.setItem(DEMO_KEY, "true");
    localStorage.removeItem(STORAGE_KEY);
    setActiveClient(createDemoClient());
    notify();
  }

  function exitDemo() {
    localStorage.removeItem(DEMO_KEY);
    setActiveClient(null);
    notify();
  }

  const isAuthenticated = token !== null || isDemo;

  return (
    <TokenContext.Provider
      value={{
        token,
        isDemo,
        isAuthenticated,
        setToken,
        clearToken,
        enterDemo,
        exitDemo,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken(): TokenContextValue {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useToken must be used within TokenProvider");
  return ctx;
}
