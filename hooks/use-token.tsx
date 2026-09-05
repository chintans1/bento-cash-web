"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { setActiveClient, createRealClient } from "@/lib/lunchmoney/client";
import { createDemoClient } from "@/lib/lunchmoney/demo-client";

const STORAGE_KEY = "lm_token";
const DEMO_KEY = "lm_demo";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readDemo = () => localStorage.getItem(DEMO_KEY) === "true";
const readToken = () => (readDemo() ? null : localStorage.getItem(STORAGE_KEY));

/** Points the API client at whatever localStorage currently says, then re-renders. */
function sync() {
  if (readDemo()) setActiveClient(createDemoClient());
  else {
    const token = localStorage.getItem(STORAGE_KEY);
    setActiveClient(token ? createRealClient(token) : null);
  }
  listeners.forEach((l) => l());
}

// The client must be set before any React rendering, so an API call can never
// go out without one.
if (typeof window !== "undefined") sync();

function setToken(value: string) {
  localStorage.setItem(STORAGE_KEY, value);
  localStorage.removeItem(DEMO_KEY);
  sync();
}

/** Leaves both a real session and the demo — they are the same exit. */
function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DEMO_KEY);
  sync();
}

function enterDemo() {
  localStorage.setItem(DEMO_KEY, "true");
  localStorage.removeItem(STORAGE_KEY);
  sync();
}

interface TokenContextValue {
  token: string | null;
  isDemo: boolean;
  isAuthenticated: boolean;
  setToken: (value: string) => void;
  signOut: () => void;
  enterDemo: () => void;
}

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: React.ReactNode }) {
  // Server snapshot (SSR) is null/false; the client snapshot reads
  // localStorage. React reconciles the difference after hydration.
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  const isDemo = useSyncExternalStore(subscribe, readDemo, () => false);

  return (
    <TokenContext.Provider
      value={{
        token,
        isDemo,
        isAuthenticated: token !== null || isDemo,
        setToken,
        signOut,
        enterDemo,
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
