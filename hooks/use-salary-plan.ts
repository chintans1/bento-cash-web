"use client";

import { useEffect, useState } from "react";
import {
  DEMO_SALARY_PLAN,
  EMPTY_SALARY_PLAN,
  readSalaryPlan,
  SALARY_PLAN_KEY,
  type SalaryPlan,
} from "@/lib/salary-cash-flow";

export function useSalaryPlan(connectionId: string | null, isDemo: boolean) {
  const [plan, setPlan] = useState<SalaryPlan | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/api/settings/${SALARY_PLAN_KEY}?connectionId=${encodeURIComponent(connectionId ?? "")}`;
  const storageKey = `${SALARY_PLAN_KEY}:demo`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        let value: string | null;
        if (isDemo) {
          value = localStorage.getItem(storageKey);
        } else {
          const response = await fetch(endpoint, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) throw new Error();
          ({ value } = (await response.json()) as { value: string | null });
        }
        const next =
          value === null
            ? isDemo
              ? DEMO_SALARY_PLAN
              : EMPTY_SALARY_PLAN
            : readSalaryPlan(value);
        if (!next) throw new Error();
        if (!controller.signal.aborted) setPlan(next);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, endpoint, isDemo, storageKey]);

  async function save(next: SalaryPlan) {
    const value = JSON.stringify(next);
    if (isDemo) {
      localStorage.setItem(storageKey, value);
    } else {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok)
        throw new Error("Couldn’t save the salary plan. Try again.");
    }
    setPlan(next);
  }

  return {
    plan,
    loadError,
    save,
    retry: () => {
      setLoadError(false);
      setAttempt((current) => current + 1);
    },
  };
}
