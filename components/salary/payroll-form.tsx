"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategoryPicker,
  type CategoryOption,
} from "@/components/transactions/category-picker";
import { formatCurrency } from "@/lib/format";
import {
  calculatePaycheck,
  PAY_SCHEDULES,
  salaryPlanSchema,
  type PayrollDeduction,
  type SalaryPlan,
} from "@/lib/salary-cash-flow";

const deductionTypes = {
  tax: "Tax withholding",
  benefit: "Benefits and other costs",
  "pretax-investment": "Pre-tax investment",
  "posttax-investment": "Post-tax investment",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="px-1 text-xs font-medium">{label}</p>
      {children}
    </div>
  );
}

export function PayrollForm({
  plan,
  categories,
  currency,
  onSave,
  onCancel,
}: {
  plan: SalaryPlan;
  categories: CategoryOption[];
  currency: string;
  onSave: (plan: SalaryPlan) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(plan);
  const [rowIds, setRowIds] = useState(() =>
    plan.deductions.map((_, index) => index)
  );
  const nextId = useRef(plan.deductions.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);
  const titleId = useId();
  const preview = calculatePaycheck(draft);
  const categoryName = (id: number | null, fallback: string) =>
    categories.find((category) => category.id === id)?.name ?? fallback;

  function updateDeduction(index: number, patch: Partial<PayrollDeduction>) {
    setDraft((current) => ({
      ...current,
      deductions: current.deductions.map((line, row) =>
        row === index ? { ...line, ...patch } : line
      ),
    }));
  }

  async function save() {
    if (savingRef.current) return;
    const result = salaryPlanSchema.safeParse(draft);
    if (!result.success) {
      setError(
        result.error.issues.find((issue) => issue.path.length === 0)?.message ??
          "Check deduction names, amounts, and percentages."
      );
      return;
    }
    if (draft.annualSalary <= 0 || preview.takeHome < 0) {
      setError(
        "Enter a salary above zero and make sure deductions fit within gross pay."
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      await onSave(result.data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn’t save the salary plan."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId} className="text-xl">
          Paycheck setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={saving} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Annual gross salary (${currency.toUpperCase()})`}>
                <Input
                  aria-label="Annual gross salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.annualSalary || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      annualSalary: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Pay schedule">
                <Select
                  value={draft.schedule}
                  onValueChange={(schedule) =>
                    schedule && setDraft({ ...draft, schedule })
                  }
                >
                  <SelectTrigger aria-label="Pay schedule" className="w-full">
                    <SelectValue>
                      {() => PAY_SCHEDULES[draft.schedule]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {Object.entries(PAY_SCHEDULES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {(draft.schedule === "weekly" ||
                draft.schedule === "biweekly") && (
                <Field label="Known payday">
                  <Input
                    aria-label="Known payday"
                    type="date"
                    value={draft.payday ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, payday: event.target.value || null })
                    }
                  />
                </Field>
              )}
            </div>

            <div className="space-y-3 border-y border-bento-hairline py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">Payroll deductions</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={draft.deductions.length >= 20}
                  onClick={() => {
                    const id = nextId.current++;
                    setRowIds((current) => [...current, id]);
                    setDraft((current) => ({
                      ...current,
                      deductions: [
                        ...current.deductions,
                        { label: "", type: "tax", unit: "fixed", amount: 0 },
                      ],
                    }));
                  }}
                >
                  <Plus aria-hidden="true" />
                  Add deduction
                </Button>
              </div>
              <p className="text-xs text-bento-subtle">
                Use an amount per paycheck or a percentage of gross pay.
              </p>
              {draft.deductions.map((line, index) => (
                <div
                  key={rowIds[index]}
                  className="grid grid-cols-3 gap-2 rounded-xl bg-bento-raised p-3 sm:grid-cols-5"
                >
                  <Input
                    className="col-span-2 sm:col-span-1"
                    aria-label={`Deduction ${index + 1} name`}
                    placeholder="e.g. 401(k)"
                    maxLength={40}
                    value={line.label}
                    onChange={(event) =>
                      updateDeduction(index, { label: event.target.value })
                    }
                  />
                  <Select
                    value={line.type}
                    onValueChange={(type) =>
                      type && updateDeduction(index, { type })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Deduction ${index + 1} type`}
                      className="col-span-2 w-full min-w-0 sm:col-span-1"
                    >
                      <SelectValue>
                        {() => deductionTypes[line.type]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {Object.entries(deductionTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    max={line.unit === "percent" ? "100" : undefined}
                    step="0.01"
                    aria-label={`Deduction ${index + 1} amount`}
                    value={line.amount || ""}
                    placeholder="0"
                    onChange={(event) =>
                      updateDeduction(index, {
                        amount: Number(event.target.value),
                      })
                    }
                  />
                  <Select
                    value={line.unit}
                    onValueChange={(unit) =>
                      unit && updateDeduction(index, { unit })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Deduction ${index + 1} unit`}
                      className="w-full"
                    >
                      <SelectValue>
                        {() => (line.unit === "fixed" ? "Fixed" : "% gross")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                      <SelectItem value="percent">% of gross</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove deduction ${index + 1}`}
                    className="col-start-3 row-start-1 sm:col-start-auto"
                    onClick={() => {
                      setRowIds((current) =>
                        current.filter((_, row) => row !== index)
                      );
                      setDraft((current) => ({
                        ...current,
                        deductions: current.deductions.filter(
                          (_, row) => row !== index
                        ),
                      }));
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between gap-3 text-sm">
                <span>Estimated take-home per paycheck</span>
                <strong className="tabular-nums">
                  {formatCurrency(preview.takeHome, currency, true)}
                </strong>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rent category">
                <CategoryPicker
                  categoryId={draft.rentCategoryId}
                  categoryName={categoryName(
                    draft.rentCategoryId,
                    "Select rent category"
                  )}
                  options={categories}
                  onChange={(rentCategoryId) =>
                    setDraft({ ...draft, rentCategoryId })
                  }
                  appearance="field"
                />
              </Field>
              <Field label="Paycheck category for deposit comparison">
                <CategoryPicker
                  categoryId={draft.paycheckCategoryId}
                  categoryName={categoryName(
                    draft.paycheckCategoryId,
                    "Select paycheck category"
                  )}
                  options={categories}
                  onChange={(paycheckCategoryId) =>
                    setDraft({ ...draft, paycheckCategoryId })
                  }
                  appearance="field"
                />
              </Field>
              <Field label="Monthly cash savings target">
                <Input
                  aria-label="Monthly cash savings target"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.cashSavingsTarget || ""}
                  placeholder="Optional"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cashSavingsTarget: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Employer contribution per paycheck">
                <Input
                  aria-label="Employer contribution per paycheck"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={draft.employerMatchPerPaycheck || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      employerMatchPerPaycheck: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-bento-negative">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
