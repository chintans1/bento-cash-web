import { z } from "zod";
import type { Transaction } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import { UNCATEGORIZED_ID } from "@/lib/lunchmoney/categories";

export const SALARY_PLAN_KEY = "salary_cash_flow";

export const PAY_SCHEDULES = {
  monthly: "Monthly",
  semimonthly: "Twice a month",
  biweekly: "Every two weeks",
  weekly: "Weekly",
} as const;

const money = z.number().min(0).max(1_000_000_000);
const deduction = z
  .object({
    label: z.string().trim().min(1).max(40),
    type: z.enum(["tax", "benefit", "pretax-investment", "posttax-investment"]),
    unit: z.enum(["fixed", "percent"]),
    amount: money,
  })
  .refine((line) => line.unit !== "percent" || line.amount <= 100);

export const salaryPlanSchema = z
  .object({
    annualSalary: money,
    schedule: z.enum(["monthly", "semimonthly", "biweekly", "weekly"]),
    payday: z.iso.date().nullable(),
    deductions: z.array(deduction).max(20),
    rentCategoryId: z.number().int().positive().nullable(),
    paycheckCategoryId: z.number().int().positive().nullable(),
    cashSavingsTarget: money,
    employerMatchPerPaycheck: money.default(0),
  })
  .refine(
    (plan) =>
      (plan.schedule !== "weekly" && plan.schedule !== "biweekly") ||
      plan.payday !== null,
    { message: "Enter a known payday for this pay schedule." }
  );

export type SalaryPlan = z.infer<typeof salaryPlanSchema>;
export type PayrollDeduction = SalaryPlan["deductions"][number];

export const EMPTY_SALARY_PLAN: SalaryPlan = {
  annualSalary: 0,
  schedule: "semimonthly",
  payday: null,
  deductions: [],
  rentCategoryId: null,
  paycheckCategoryId: null,
  cashSavingsTarget: 0,
  employerMatchPerPaycheck: 0,
};

export const DEMO_SALARY_PLAN: SalaryPlan = {
  ...EMPTY_SALARY_PLAN,
  annualSalary: 108_000,
  deductions: [
    {
      label: "Income tax withholding",
      type: "tax",
      unit: "percent",
      amount: 24,
    },
    { label: "Health insurance", type: "benefit", unit: "fixed", amount: 85 },
    {
      label: "Workplace retirement",
      type: "pretax-investment",
      unit: "percent",
      amount: 8,
    },
    {
      label: "Employee stock plan",
      type: "posttax-investment",
      unit: "percent",
      amount: 3,
    },
  ],
  rentCategoryId: 9,
  paycheckCategoryId: 10,
  cashSavingsTarget: 800,
  employerMatchPerPaycheck: 135,
};

export function readSalaryPlan(value: string) {
  try {
    return salaryPlanSchema.safeParse(JSON.parse(value)).data ?? null;
  } catch {
    return null;
  }
}

const checksPerYear = {
  monthly: 12,
  semimonthly: 24,
  biweekly: 26,
  weekly: 52,
};
const dayMs = 86_400_000;
const round = (amount: number) => Math.round(amount * 100) / 100;

export function paychecksInMonth(
  plan: SalaryPlan,
  year: number,
  month: number
) {
  if (plan.schedule === "monthly") return 1;
  if (plan.schedule === "semimonthly") return 2;
  if (!plan.payday) return 0;
  const step = (plan.schedule === "weekly" ? 7 : 14) * dayMs;
  const anchor = Date.parse(plan.payday);
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1);
  const first = anchor + Math.ceil((start - anchor) / step) * step;
  return Math.ceil((end - first) / step);
}

export function calculatePaycheck(plan: SalaryPlan) {
  const gross = round(plan.annualSalary / checksPerYear[plan.schedule]);
  const deductions = plan.deductions.map((line) => ({
    ...line,
    perCheck: round(
      line.unit === "percent" ? (gross * line.amount) / 100 : line.amount
    ),
  }));
  return {
    gross,
    deductions,
    takeHome: round(
      gross - deductions.reduce((total, line) => total + line.perCheck, 0)
    ),
  };
}

export function projectAnnualPayroll(plan: SalaryPlan, year: number) {
  const checks = Array.from({ length: 12 }, (_, index) =>
    paychecksInMonth(plan, year, index + 1)
  ).reduce((total, count) => total + count, 0);
  const paycheck = calculatePaycheck(plan);
  const sum = (kind: "tax" | "investment") =>
    round(
      checks *
        paycheck.deductions.reduce(
          (total, line) =>
            total + (line.type.endsWith(kind) ? line.perCheck : 0),
          0
        )
    );
  return {
    checks,
    takeHome: round(paycheck.takeHome * checks),
    taxes: sum("tax"),
    invested: round(sum("investment") + plan.employerMatchPerPaycheck * checks),
  };
}

export function salaryCashFlow(
  plan: SalaryPlan,
  year: number,
  month: number,
  transactions: Transaction[],
  categories: Map<number, CategoryInfo>,
  useRecordedPay = false
) {
  const checks = paychecksInMonth(plan, year, month);
  const paycheck = calculatePaycheck(plan);
  const gross = round(paycheck.gross * checks);
  const takeHome = round(paycheck.takeHome * checks);
  const deductions = paycheck.deductions.map((line) => ({
    ...line,
    monthly: round(line.perCheck * checks),
  }));
  const taxes = round(
    deductions.reduce(
      (total, line) => total + (line.type === "tax" ? line.monthly : 0),
      0
    )
  );
  const benefits = round(
    deductions.reduce(
      (total, line) => total + (line.type === "benefit" ? line.monthly : 0),
      0
    )
  );
  const invested = round(
    deductions.reduce(
      (total, line) =>
        total + (line.type.endsWith("investment") ? line.monthly : 0),
      0
    )
  );
  let spending = 0;
  let rent = 0;
  let recordedPay = 0;
  let paycheckDeposits = 0;
  const spendingByCategory = new Map<number, number>();
  for (const tx of transactions) {
    if (
      tx.is_pending ||
      tx.status === "delete_pending" ||
      tx.is_split_parent ||
      tx.group_parent_id != null
    )
      continue;
    if (
      plan.paycheckCategoryId != null &&
      tx.category_id === plan.paycheckCategoryId &&
      tx.to_base < 0
    ) {
      recordedPay -= tx.to_base;
      paycheckDeposits++;
      continue;
    }
    const category =
      tx.category_id == null ? undefined : categories.get(tx.category_id);
    if (category?.exclude_from_totals || category?.is_income || tx.to_base <= 0)
      continue;
    spending += tx.to_base;
    const categoryId = tx.category_id ?? UNCATEGORIZED_ID;
    spendingByCategory.set(
      categoryId,
      (spendingByCategory.get(categoryId) ?? 0) + tx.to_base
    );
    if (tx.category_id === plan.rentCategoryId && plan.rentCategoryId !== null)
      rent += tx.to_base;
  }
  spending = round(spending);
  rent = round(rent);
  const recorded = paycheckDeposits ? round(recordedPay) : null;
  const netPay = useRecordedPay && recorded !== null ? recorded : takeHome;
  const cashRemaining = round(netPay - spending);
  const employerMatch = round(plan.employerMatchPerPaycheck * checks);
  const savings = round(cashRemaining + invested);
  const spendingCategories = [...spendingByCategory]
    .map(([id, amount]) => ({
      id,
      amount: round(amount),
      label:
        categories.get(id)?.name ??
        (id === UNCATEGORIZED_ID ? "Uncategorized" : "Unknown category"),
    }))
    .sort((a, b) => b.amount - a.amount);
  return {
    checks,
    gross,
    takeHome,
    netPay,
    deductions,
    taxes,
    benefits,
    invested,
    employerMatch,
    spending,
    rent,
    cashRemaining,
    savings,
    spendingCategories,
    savingsRate: gross > 0 ? savings / gross : null,
    rentToGross:
      plan.rentCategoryId !== null && gross > 0 ? rent / gross : null,
    rentToTakeHome:
      plan.rentCategoryId !== null && netPay > 0 ? rent / netPay : null,
    recordedPay: recorded,
  };
}
