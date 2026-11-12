"use client";

import { Check, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { cn } from "@/lib/utils";
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
  const labelId = useId();
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
  const queued = queuedAt !== null && coolingDown && !error;
  const label = pending
    ? "Requesting refresh"
    : queued
      ? "Refresh queued"
      : "Refresh Plaid accounts";
  const Icon = queued ? Check : RefreshCw;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative h-auto min-h-11 w-44 max-w-full justify-start gap-2 overflow-hidden rounded-xl py-1.5 text-left whitespace-normal disabled:opacity-100 aria-disabled:cursor-default"
        aria-labelledby={labelId}
        aria-describedby={helpId}
        disabled={checking || pending || coolingDown}
        focusableWhenDisabled
        onClick={refresh}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            pending && "motion-safe:animate-spin",
            queued &&
              "text-bento-positive motion-safe:animate-in motion-safe:duration-200 motion-safe:zoom-in-75"
          )}
        />
        <span className="min-w-0">
          <span
            id={labelId}
            key={label}
            className="block text-xs leading-4 motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in-0"
          >
            {label}
          </span>
          <span
            id={helpId}
            className="block text-xs leading-4 font-normal text-bento-subtle"
          >
            {coolingDown ? (
              <>
                Available in <span className="tabular-nums">{timeLeft}</span>
              </>
            ) : (
              "Once every 5 minutes"
            )}
            {error && <span className="block text-bento-danger">{error}</span>}
          </span>
        </span>
        {coolingDown && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-(--cooldown-progress) bg-primary/50 motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-linear"
            style={
              {
                "--cooldown-progress": Math.min(
                  1,
                  (seconds * 1000) / PLAID_REFRESH_COOLDOWN_MS
                ),
              } as CSSProperties
            }
          />
        )}
      </Button>
      <span role="status" className="sr-only">
        {error ??
          (queued
            ? "Refresh queued. Lunch Money syncs in the background."
            : "")}
      </span>
    </>
  );
}
