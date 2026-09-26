"use client";

import { useConnectionSetting } from "@/hooks/use-connection-setting";

const DEFAULT_MONTHS = 3;

export function useInvestableMonths(): {
  months: number;
  setMonths: (value: number) => void;
} {
  const { value, setValue } = useConnectionSetting(
    "investable_months",
    String(DEFAULT_MONTHS)
  );
  const parsed = Number(value);
  const months =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 24
      ? parsed
      : DEFAULT_MONTHS;

  return {
    months,
    setMonths: (next) => {
      if (Number.isInteger(next) && next >= 1 && next <= 24) {
        setValue(String(next));
      }
    },
  };
}
