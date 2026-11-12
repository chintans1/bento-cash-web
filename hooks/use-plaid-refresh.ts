"use client";

import { useEffect, useRef, useState } from "react";
import { useAppData } from "@/hooks/use-app-data";
import {
  PLAID_REFRESH_COOLDOWN_MS,
  PLAID_REFRESH_PATH,
  type PlaidRefreshResponse,
} from "@/lib/lunchmoney/plaid-refresh";

const ACCOUNT_RECHECK_DELAYS = [5_000, 15_000, 40_000];

function validRetryAt(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 0;
}

function storedCooldown(key: string) {
  try {
    return validRetryAt(Number(window.localStorage.getItem(key)));
  } catch {
    return 0;
  }
}

export function usePlaidRefresh(connectionId: string, budgetId: string) {
  const { refreshAccounts } = useAppData();
  const storageKey = `bento:plaid-refresh:${budgetId}`;
  const statusUrl = `${PLAID_REFRESH_PATH}?connectionId=${encodeURIComponent(connectionId)}`;
  const request = useRef<AbortController | null>(null);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [refreshQueued, setRefreshQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const coolingDown = seconds > 0;

  useEffect(() => {
    const controller = new AbortController();

    function syncStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      setRetryAt((current) => Math.max(current, storedCooldown(storageKey)));
      setNow(Date.now());
    }

    window.addEventListener("storage", syncStorage);
    fetch(statusUrl, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload: PlaidRefreshResponse = response.ok
          ? await response.json()
          : {};
        if (!controller.signal.aborted) {
          setRetryAt((current) =>
            Math.max(
              current,
              storedCooldown(storageKey),
              validRetryAt(payload.retryAt)
            )
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRetryAt((current) =>
            Math.max(current, storedCooldown(storageKey))
          );
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setNow(Date.now());
        setChecking(false);
      });

    return () => {
      controller.abort();
      request.current?.abort();
      window.removeEventListener("storage", syncStorage);
    };
  }, [statusUrl, storageKey]);

  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [coolingDown]);

  useEffect(() => {
    if (!refreshQueued) return;
    let cancelled = false;
    let timer: number;

    function schedule(index: number) {
      if (cancelled || index >= ACCOUNT_RECHECK_DELAYS.length) return;
      timer = window.setTimeout(async () => {
        await refreshAccounts({ fresh: true }).catch(() => {});
        schedule(index + 1);
      }, ACCOUNT_RECHECK_DELAYS[index]);
    }

    schedule(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refreshQueued, refreshAccounts]);

  function rememberCooldown(value: number) {
    const latest = Math.max(value, storedCooldown(storageKey));
    setRetryAt((current) => Math.max(current, latest));
    setNow(Date.now());
    try {
      window.localStorage.setItem(storageKey, String(latest));
    } catch {
      // The server still enforces the cooldown when storage is unavailable.
    }
  }

  async function refresh() {
    if (
      checking ||
      request.current ||
      Math.max(retryAt, storedCooldown(storageKey)) > Date.now()
    )
      return;

    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setRefreshQueued(false);

    try {
      const response = await fetch(PLAID_REFRESH_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId }),
        signal: controller.signal,
      });
      const payload: PlaidRefreshResponse = await response.json();
      if (controller.signal.aborted) return;
      const retryAt = validRetryAt(payload.retryAt);
      if (retryAt) rememberCooldown(retryAt);
      if (response.status === 202) setRefreshQueued(true);
      else if (response.status !== 429)
        setError(payload.error ?? "Could not request a Plaid refresh.");
    } catch {
      if (controller.signal.aborted) return;
      // A dropped response may have reached Lunch Money.
      rememberCooldown(Date.now() + PLAID_REFRESH_COOLDOWN_MS);
      setError("Could not confirm whether Lunch Money queued the refresh.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return { checking, pending, seconds, refreshQueued, error, refresh };
}
