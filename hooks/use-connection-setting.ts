"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-token";

export function useConnectionSetting(key: string, defaultValue: string) {
  const { activeAccount, isDemo } = useAuth();
  const scope = isDemo ? "demo" : (activeAccount?.id ?? null);
  const [stored, setStored] = useState<{
    scope: string;
    key: string;
    value: string;
  } | null>(null);
  const revision = useRef(0);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (!scope) return;
    if (scope === "demo") {
      const value = localStorage.getItem(`${key}:demo`) ?? defaultValue;
      const timeout = window.setTimeout(
        () => setStored({ scope, key, value }),
        0
      );
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    const startingRevision = revision.current;
    fetch(
      `/api/settings/${encodeURIComponent(key)}?connectionId=${encodeURIComponent(scope)}`
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Couldn't load setting");
        return (await response.json()) as { value: string | null };
      })
      .then(({ value }) => {
        if (!cancelled && revision.current === startingRevision) {
          setStored({ scope, key, value: value ?? defaultValue });
        }
      })
      .catch(() => {
        if (!cancelled && revision.current === startingRevision) {
          setStored({ scope, key, value: defaultValue });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [defaultValue, key, scope]);

  function setValue(value: string) {
    if (!scope) return;
    revision.current += 1;
    const previous =
      stored?.scope === scope && stored.key === key
        ? stored.value
        : defaultValue;
    setStored({ scope, key, value });
    if (scope === "demo") {
      localStorage.setItem(`${key}:demo`, value);
      return;
    }
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch(
          `/api/settings/${encodeURIComponent(key)}?connectionId=${encodeURIComponent(scope)}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ value }),
          }
        );
        if (!response.ok) {
          setStored((current) =>
            current?.scope === scope &&
            current.key === key &&
            current.value === value
              ? { scope, key, value: previous }
              : current
          );
        }
      })
      .catch(() => {
        setStored((current) =>
          current?.scope === scope &&
          current.key === key &&
          current.value === value
            ? { scope, key, value: previous }
            : current
        );
      });
  }

  return {
    value:
      stored?.scope === scope && stored.key === key
        ? stored.value
        : defaultValue,
    setValue,
  };
}
