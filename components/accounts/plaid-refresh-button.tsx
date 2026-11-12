"use client";

import { Check, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlaidRefresh } from "@/hooks/use-plaid-refresh";
import { cn } from "@/lib/utils";
import { PLAID_REFRESH_COOLDOWN_MS } from "@/lib/lunchmoney/plaid-refresh";

export function PlaidRefreshButton({
  connectionId,
  budgetId,
}: {
  connectionId: string;
  budgetId: string;
}) {
  const { checking, pending, seconds, refreshQueued, error, refresh } =
    usePlaidRefresh(connectionId, budgetId);
  const coolingDown = seconds > 0;
  const timeLeft = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const queued = refreshQueued && coolingDown;
  const unavailable = checking || pending || coolingDown;
  const label = pending
    ? "Requesting refresh"
    : error
      ? "Refresh issue"
      : queued
        ? "Refresh queued"
        : coolingDown
          ? "Available in"
          : "Checking refresh status";
  const Icon = queued ? Check : RefreshCw;

  return (
    <>
      {unavailable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          static
          disabled
          className="relative gap-2 overflow-hidden rounded-xl text-xs disabled:border-bento-hairline disabled:bg-bento-raised/50 disabled:text-bento-subtle disabled:opacity-100 dark:disabled:bg-bento-raised/50"
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              (checking || pending) && "motion-safe:animate-spin",
              queued &&
                "text-bento-positive motion-safe:animate-in motion-safe:duration-200 motion-safe:zoom-in-75"
            )}
          />
          <span
            key={label}
            className="motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in-0"
          >
            {label}
            {coolingDown && (
              <span className="ml-1 font-normal text-bento-subtle tabular-nums">
                {label !== "Available in" && (
                  <>
                    <span aria-hidden="true">· </span>
                    <span className="sr-only">. Available in </span>
                  </>
                )}
                {timeLeft}
              </span>
            )}
          </span>
          {coolingDown && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-(--cooldown-progress) bg-primary/50 motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-linear"
              style={
                {
                  "--cooldown-progress":
                    1 -
                    Math.min(1, (seconds * 1000) / PLAID_REFRESH_COOLDOWN_MS),
                } as CSSProperties
              }
            />
          )}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl text-xs"
                onClick={refresh}
              />
            }
          >
            <RefreshCw aria-hidden="true" />
            {error ? "Retry Plaid refresh" : "Refresh Plaid accounts"}
          </TooltipTrigger>
          <TooltipContent>
            <span>
              {error && <span className="mb-1 block">{error}</span>}
              Once every 5 minutes
            </span>
          </TooltipContent>
        </Tooltip>
      )}
      <span role="status" className="sr-only">
        {error ??
          (pending
            ? "Requesting refresh."
            : queued
              ? "Refresh queued. Lunch Money syncs in the background."
              : "")}
      </span>
    </>
  );
}
