import {
  ArrowDown,
  Banknote,
  CircleDollarSign,
  PiggyBank,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SummaryAmount, SummaryCard } from "@/components/ui/summary-card";
import { formatCurrency } from "@/lib/format";
import type { salaryCashFlow } from "@/lib/salary-cash-flow";
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
  children,
}: {
  title: string;
  amount: number;
  currency: string;
  icon: ReactNode;
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
}: {
  flow: Flow;
  currency: string;
  cashSavingsTarget: number;
  rentSelected: boolean;
}) {
  const money = (value: number) => formatCurrency(value, currency, true);
  const ratio = (value: number | null) =>
    value === null ? "—" : percent.format(value);
  return (
    <div className="grid items-start gap-page-gap lg:grid-cols-3">
      <ol aria-label="Salary cash flow" className="min-w-0 lg:col-span-2">
        <Step
          title="Gross salary"
          amount={flow.gross}
          currency={currency}
          icon={<Banknote className="size-4" aria-hidden="true" />}
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
          title="Take-home pay"
          amount={flow.takeHome}
          currency={currency}
          icon={<Wallet className="size-4" aria-hidden="true" />}
        >
          {flow.recordedPay !== null && (
            <Line
              label="Recorded paycheck deposits"
              value={money(flow.recordedPay)}
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
            {cashSavingsTarget > 0 && (
              <Line
                label="Monthly cash savings target"
                value={money(cashSavingsTarget)}
              />
            )}
          </dl>
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
      </div>
    </div>
  );
}
