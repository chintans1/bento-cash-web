import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/lunchmoney/client";
import {
  DEMO_SALARY_PLAN,
  EMPTY_SALARY_PLAN,
  paychecksInMonth,
  readSalaryPlan,
  salaryCashFlow,
} from "./salary-cash-flow";

describe("salary cash flow", () => {
  it("counts three biweekly paydays in a month when the schedule calls for it", () => {
    const plan = {
      ...EMPTY_SALARY_PLAN,
      schedule: "biweekly" as const,
      payday: "2026-01-02",
    };
    expect(paychecksInMonth(plan, 2026, 1)).toBe(3);
    expect(paychecksInMonth(plan, 2026, 2)).toBe(2);
  });

  it("reconciles paycheck deductions, expenses, and cash and investment savings", () => {
    const plan = { ...DEMO_SALARY_PLAN, paycheckCategoryId: 5 };
    const tx = (fields: Partial<Transaction>): Transaction =>
      ({
        to_base: 0,
        category_id: null,
        is_pending: false,
        status: "reviewed",
        group_parent_id: null,
        ...fields,
      }) as Transaction;
    const result = salaryCashFlow(
      plan,
      2026,
      11,
      [
        tx({ to_base: -4000, category_id: 5 }),
        tx({ to_base: 2100, category_id: 9 }),
        tx({ to_base: 300 }),
        tx({ to_base: 900, category_id: 8 }),
        tx({ to_base: 200, is_pending: true }),
        tx({ to_base: 100, is_split_parent: true }),
        tx({ to_base: 50, group_parent_id: 1 }),
      ],
      new Map([
        [8, { name: "Transfers", exclude_from_totals: true, is_income: false }],
      ])
    );
    expect(result).toMatchObject({
      gross: 9000,
      taxes: 2160,
      benefits: 170,
      invested: 990,
      takeHome: 5680,
      spending: 2400,
      rent: 2100,
      cashRemaining: 3280,
      savings: 4270,
      recordedPay: 4000,
    });
    expect(result.rentToGross).toBeCloseTo(2100 / 9000);
    expect(result.rentToTakeHome).toBeCloseTo(2100 / 5680);
    expect(result.savingsRate).toBeCloseTo(4270 / 9000);
  });

  it("rejects invalid or incomplete plans", () => {
    expect(readSalaryPlan("not json")).toBeNull();
    expect(
      readSalaryPlan(
        JSON.stringify({ ...EMPTY_SALARY_PLAN, schedule: "weekly" })
      )
    ).toBeNull();
    expect(readSalaryPlan(JSON.stringify(DEMO_SALARY_PLAN))).toEqual(
      DEMO_SALARY_PLAN
    );
  });
});
