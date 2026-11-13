import {
  ArrowDown,
  Banknote,
  CircleDollarSign,
  PiggyBank,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CompositionBar } from "@/components/ui/composition-bar";
import { SummaryAmount, SummaryCard } from "@/components/ui/summary-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatCurrency } from "@/lib/format";
import type {
  projectAnnualPayroll,
  salaryCashFlow,
} from "@/lib/salary-cash-flow";
import { cn } from "@/lib/utils";

type Flow = ReturnType<typeof salaryCashFlow>;

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function Step({
  title,
  amount,
  currency,
  icon,
  footer,
  children,
}: {
  title: string;
  amount: number;
  currency: string;
  icon: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="relative">
      <Card className="gap-0 px-(--card-spacing)">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-bento-raised text-bento-subtle">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <strong
            className={cn(
              "text-lg tabular-nums",
              amount < 0 && "text-bento-negative"
            )}
          >
            {formatCurrency(amount, currency, true)}
          </strong>
        </div>
        {children && (
          <dl className="mt-4 space-y-2 border-t border-bento-hairline pt-3">
            {children}
          </dl>
        )}
        {footer && <div className="mt-3">{footer}</div>}
      </Card>
    </li>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-bento-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const connector = (
  <li
    aria-hidden="true"
    className="flex h-7 items-center justify-center text-bento-subtle"
  >
    <ArrowDown className="size-4" />
  </li>
);

export function SalaryFlow({
  flow,
  currency,
  cashSavingsTarget,
  rentSelected,
  paycheckCategorySelected,
  payBasis,
  onPayBasisChange,
  monthKey,
  year,
  annual,
}: {
  flow: Flow;
  currency: string;
  cashSavingsTarget: number;
  rentSelected: boolean;
  paycheckCategorySelected: boolean;
  payBasis: "scheduled" | "recorded";
  onPayBasisChange: (value: "scheduled" | "recorded") => void;
  monthKey: string;
  year: number;
  annual: ReturnType<typeof projectAnnualPayroll>;
}) {
  const money = (value: number) => formatCurrency(value, currency, true);
  const ratio = (value: number | null) =>
    value === null ? "—" : percent.format(value);
  const recorded = payBasis === "recorded" && flow.recordedPay !== null;
  const savingsGap = flow.cashRemaining - cashSavingsTarget;
  const progress =
    cashSavingsTarget > 0
      ? Math.min(
          100,
          Math.max(0, (flow.cashRemaining / cashSavingsTarget) * 100)
        )
      : 0;
  const grossBreakdown = [
    { id: "pay", amount: flow.takeHome, color: "var(--bento-positive)" },
    { id: "tax", amount: flow.taxes, color: "var(--cat-2)" },
    { id: "benefits", amount: flow.benefits, color: "var(--cat-5)" },
    { id: "investment", amount: flow.invested, color: "var(--cat-4)" },
  ].filter(({ amount }) => amount > 0);
  return (
    <div className="grid items-start gap-page-gap lg:grid-cols-3">
      <ol aria-label="Salary cash flow" className="min-w-0 lg:col-span-2">
        <Step
          title="Gross salary"
          amount={flow.gross}
          currency={currency}
          icon={<Banknote className="size-4" aria-hidden="true" />}
          footer={
            flow.gross > 0 && (
              <CompositionBar
                segments={grossBreakdown.map(({ id, amount, color }) => ({
                  id,
                  color,
                  percent: (amount / flow.gross) * 100,
                }))}
              />
            )
          }
        >
          <Line label="Scheduled paychecks" value={String(flow.checks)} />
          {flow.taxes > 0 && (
            <Line label="Tax withholding" value={money(-flow.taxes)} />
          )}
          {flow.benefits > 0 && (
            <Line
              label="Benefits and other costs"
              value={money(-flow.benefits)}
            />
          )}
          {flow.invested > 0 && (
            <Line label="Payroll investments" value={money(-flow.invested)} />
          )}
        </Step>
        {connector}
        <Step
          title={
            recorded ? "Recorded take-home pay" : "Estimated take-home pay"
          }
          amount={flow.netPay}
          currency={currency}
          icon={<Wallet className="size-4" aria-hidden="true" />}
          footer={
            flow.recordedPay !== null ? (
              <SegmentedControl
                label="Take-home pay source"
                options={[
                  { value: "scheduled", label: "Estimated" },
                  { value: "recorded", label: "Recorded" },
                ]}
                value={payBasis}
                onChange={onPayBasisChange}
              />
            ) : paycheckCategorySelected ? (
              <p className="text-xs text-bento-subtle">
                No matching paycheck deposits this month.
              </p>
            ) : null
          }
        >
          {flow.recordedPay !== null && (
            <Line
              label={
                recorded
                  ? "Estimated take-home pay"
                  : "Recorded paycheck deposits"
              }
              value={money(recorded ? flow.takeHome : flow.recordedPay)}
            />
          )}
        </Step>
        {connector}
        <Step
          title="Expenses after payday"
          amount={flow.spending}
          currency={currency}
          icon={<CircleDollarSign className="size-4" aria-hidden="true" />}
        >
          {rentSelected && (
            <Line label="Rent included in spending" value={money(flow.rent)} />
          )}
        </Step>
        {connector}
        <Step
          title="Total savings"
          amount={flow.savings}
          currency={currency}
          icon={<PiggyBank className="size-4" aria-hidden="true" />}
        >
          <Line
            label="Cash remaining after expenses"
            value={money(flow.cashRemaining)}
          />
          <Line label="Invested through payroll" value={money(flow.invested)} />
          {flow.employerMatch > 0 && (
            <Line
              label="Employer contribution (additional)"
              value={money(flow.employerMatch)}
            />
          )}
        </Step>
      </ol>
      <div className="space-y-page-gap">
        <SummaryCard>
          <SummaryAmount
            label="Monthly savings"
            amount={flow.savings}
            primaryCurrency={currency}
            emphasizePositive
          />
          <dl className="mt-4 space-y-3 border-t border-bento-hairline pt-4">
            <Line
              label="Savings rate of gross pay"
              value={ratio(flow.savingsRate)}
            />
            {rentSelected && (
              <>
                <Line
                  label="Rent as a share of gross pay"
                  value={ratio(flow.rentToGross)}
                />
                <Line
                  label="Rent as a share of take-home pay"
                  value={ratio(flow.rentToTakeHome)}
                />
              </>
            )}
          </dl>
          {cashSavingsTarget > 0 && (
            <div className="mt-4 space-y-2 border-t border-bento-hairline pt-4">
              <div className="flex justify-between gap-2 text-xs">
                <h3 className="font-medium">Cash savings target</h3>
                <span className="tabular-nums">{money(cashSavingsTarget)}</span>
              </div>
              <progress
                aria-label="Cash savings target progress"
                value={progress}
                max={100}
                className="block h-2 w-full overflow-hidden rounded-full bg-bento-raised accent-primary [&::-webkit-progress-bar]:bg-bento-raised [&::-webkit-progress-value]:bg-primary"
              />
              <p className="text-xs text-bento-subtle">
                {savingsGap >= 0
                  ? `${money(savingsGap)} above target`
                  : `${money(-savingsGap)} short of target`}
              </p>
            </div>
          )}
        </SummaryCard>
        {flow.deductions.length > 0 && (
          <Card className="gap-3 px-(--card-spacing)">
            <h3 className="font-semibold">Payroll deductions</h3>
            <dl className="space-y-2">
              {flow.deductions.map((line, index) => (
                <Line
                  key={index}
                  label={line.label}
                  value={money(line.monthly)}
                />
              ))}
            </dl>
          </Card>
        )}
        {flow.spendingCategories.length > 0 && (
          <Card className="gap-3 px-(--card-spacing)">
            <h3 className="font-semibold">Spending by category</h3>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {flow.spendingCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/transactions?month=${monthKey}&category=${category.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="min-w-0 wrap-anywhere">
                      {category.label}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {money(category.amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card className="gap-3 px-(--card-spacing)">
          <details className="group">
            <summary className="cursor-pointer rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {year} payroll projection
            </summary>
            <dl className="mt-3 space-y-2">
              <Line label="Scheduled paychecks" value={String(annual.checks)} />
              <Line label="Take-home pay" value={money(annual.takeHome)} />
              <Line label="Tax withholding" value={money(annual.taxes)} />
              <Line
                label="Investments including employer contributions"
                value={money(annual.invested)}
              />
            </dl>
          </details>
        </Card>
      </div>
    </div>
  );
}
