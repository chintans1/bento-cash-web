"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import {
  PLAID_REFRESH_COOLDOWN_MS,
  PLAID_REFRESH_PATH,
  type PlaidRefreshResponse,
} from "@/lib/lunchmoney/plaid-refresh";

const ACCOUNT_RECHECK_DELAYS = [5_000, 15_000, 40_000];

function storedCooldown(key: string) {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function PlaidRefreshButton({
  connectionId,
  budgetId,
}: {
  connectionId: string;
  budgetId: string;
}) {
  const { refreshAccounts } = useAppData();
  const helpId = useId();
  const storageKey = `bento:plaid-refresh:${budgetId}`;
  const statusUrl = `${PLAID_REFRESH_PATH}?connectionId=${encodeURIComponent(connectionId)}`;
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const coolingDown = seconds > 0;

  useEffect(() => {
    const controller = new AbortController();

    function syncStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      setRetryAt(storedCooldown(storageKey));
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
            Math.max(current, storedCooldown(storageKey), payload.retryAt ?? 0)
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRetryAt(storedCooldown(storageKey));
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
    if (queuedAt === null) return;
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
  }, [queuedAt, refreshAccounts]);

  function rememberCooldown(value: number) {
    setRetryAt(value);
    setNow(Date.now());
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // The server still enforces the cooldown when storage is unavailable.
    }
  }

  async function refresh() {
    if (
      checking ||
      inFlight.current ||
      Math.max(retryAt, storedCooldown(storageKey)) > Date.now()
    )
      return;

    const controller = new AbortController();
    request.current = controller;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setQueuedAt(null);

    try {
      const response = await fetch(PLAID_REFRESH_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId }),
        signal: controller.signal,
      });
      const payload: PlaidRefreshResponse = await response.json();
      if (controller.signal.aborted) return;
      if (typeof payload.retryAt === "number")
        rememberCooldown(payload.retryAt);
      if (response.status === 202) setQueuedAt(Date.now());
      else if (response.status !== 429)
        setError(payload.error ?? "Could not request a Plaid refresh.");
    } catch {
      if (controller.signal.aborted) return;
      // A dropped response may have reached Lunch Money.
      rememberCooldown(Date.now() + PLAID_REFRESH_COOLDOWN_MS);
      setError("Could not confirm whether Lunch Money queued the refresh.");
    } finally {
      inFlight.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  const timeLeft = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-describedby={helpId}
        disabled={checking || pending || seconds > 0}
        onClick={refresh}
      >
        <RefreshCw
          aria-hidden="true"
          className={pending ? "motion-safe:animate-spin" : undefined}
        />
        {pending ? "Requesting…" : "Refresh Plaid accounts"}
      </Button>
      <p id={helpId} className="text-xs text-bento-subtle">
        {seconds > 0 ? (
          <>
            Available in <span className="tabular-nums">{timeLeft}</span> · Once
            every 5 minutes
          </>
        ) : (
          "Once every 5 minutes"
        )}
      </p>
      {error && (
        <p role="alert" className="basis-full text-xs text-bento-danger">
          {error}
        </p>
      )}
      {!error && queuedAt !== null && seconds > 0 && (
        <p role="status" className="basis-full text-xs text-bento-subtle">
          Refresh queued. Lunch Money syncs in the background.
        </p>
      )}
    </div>
  );
}
