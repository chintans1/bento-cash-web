"use client";

import { Suspense, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { PayrollForm } from "@/components/salary/payroll-form";
import { SalaryFlow } from "@/components/salary/salary-flow";
import { buildCategoryOptions } from "@/components/transactions/category-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useMonthTransactions } from "@/hooks/use-month-transactions";
import { useSalaryPlan } from "@/hooks/use-salary-plan";
import { projectAnnualPayroll, salaryCashFlow } from "@/lib/salary-cash-flow";
import { isCurrentOrFutureMonth, monthKeyOf } from "@/lib/date-utils";

function SalaryPage() {
  const { hasDataSource, dataScopeKey, activeConnection, isDemo } = useAuth();
  if (!hasDataSource) return <ConnectionPrompt />;
  return (
    <SalaryWorkspace
      key={dataScopeKey}
      connectionId={activeConnection?.id ?? null}
      isDemo={isDemo}
      scope={dataScopeKey}
    />
  );
}

function SalaryWorkspace({
  connectionId,
  isDemo,
  scope,
}: {
  connectionId: string | null;
  isDemo: boolean;
  scope: string | null;
}) {
  const { primaryCurrency, categoryMap, catGroups, loading, error } =
    useAppData();
  const month = useMonthNavigation();
  const ledger = useMonthTransactions(month.year, month.month, scope);
  const { plan, loadError, retry, save } = useSalaryPlan(connectionId, isDemo);
  const [editing, setEditing] = useState(false);
  const [payBasis, setPayBasis] = useState<"scheduled" | "recorded">(
    "scheduled"
  );
  const categories = useMemo(
    () => buildCategoryOptions(catGroups),
    [catGroups]
  );
  const waiting = !plan || loading || ledger.loading || month.pending;
  const configured = !!plan && plan.annualSalary > 0;
  const flow =
    configured && !waiting && !ledger.error && !error
      ? salaryCashFlow(
          plan,
          month.year,
          month.month,
          ledger.transactions,
          categoryMap,
          payBasis === "recorded"
        )
      : null;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-page-gap flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageTitle>Salary</PageTitle>
          <p className="mt-1 text-sm text-bento-subtle">
            Track where your pay goes, from gross salary to savings.
          </p>
        </div>
        {configured && !editing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" /> Edit payroll
          </Button>
        )}
      </header>
      {loadError ? (
        <Card className="items-start px-(--card-spacing)">
          <p role="alert">Couldn’t load your salary plan.</p>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </Card>
      ) : plan && editing ? (
        <PayrollForm
          plan={plan}
          currency={primaryCurrency}
          categories={categories}
          onCancel={() => setEditing(false)}
          onSave={async (next) => {
            await save(next);
            setEditing(false);
          }}
        />
      ) : !plan ? (
        <Skeleton
          aria-label="Loading salary plan"
          className="h-48 rounded-2xl"
        />
      ) : !configured ? (
        <Card className="items-start px-(--card-spacing)">
          <h2 className="font-heading text-xl">Set up your paycheck</h2>
          <p className="max-w-lg text-bento-subtle">
            Add your salary, pay schedule, and deductions to see how much you
            take home and save each month.
          </p>
          <Button onClick={() => setEditing(true)}>Set up paycheck</Button>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Monthly cash flow</h2>
            <MonthSelector {...month} className="mb-0" refreshing={waiting} />
          </div>
          {waiting ? (
            <Skeleton
              aria-label="Loading monthly cash flow"
              className="h-72 rounded-2xl"
            />
          ) : flow ? (
            <>
              <SalaryFlow
                flow={flow}
                currency={primaryCurrency}
                cashSavingsTarget={plan.cashSavingsTarget}
                rentSelected={plan.rentCategoryId !== null}
                paycheckCategorySelected={plan.paycheckCategoryId !== null}
                payBasis={payBasis}
                onPayBasisChange={setPayBasis}
                monthKey={monthKeyOf(month.year, month.month)}
                year={month.year}
                annual={projectAnnualPayroll(plan, month.year)}
              />
              <p className="mt-4 text-xs text-bento-subtle">
                {isCurrentOrFutureMonth(month.year, month.month)
                  ? "This month’s spending reflects posted transactions so far."
                  : "Spending reflects posted transactions in your budget."}{" "}
                Payroll estimates use your current plan.
              </p>
            </>
          ) : (
            <Card className="px-(--card-spacing)">
              <p role="alert">Couldn’t load transactions for this month.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function SalaryPageWrapper() {
  return (
    <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
      <SalaryPage />
    </Suspense>
  );
}
