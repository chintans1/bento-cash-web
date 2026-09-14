import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type {
  MintConflictPolicy,
  MintImportPreview,
  MintImportPreviewRow,
} from "@/lib/lunchmoney/mint-import";
import { cn } from "@/lib/utils";

type MintImportReviewProps = {
  preview: MintImportPreview;
  currency: string;
  policy: MintConflictPolicy;
  onPolicyChange: (policy: MintConflictPolicy) => void;
};

const CONFLICT_OPTIONS: Array<{
  value: MintConflictPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "keep_lunch_money",
    label: "Keep Lunch Money",
    description:
      "Recommended. Mint fills only months without existing history.",
  },
  {
    value: "match_mint",
    label: "Match Mint totals",
    description:
      "Adds adjustments so assets and debts equal Mint in every overlap month.",
  },
];

export function formatMintMonth(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function actionLabel(action: MintImportPreviewRow["action"]): string {
  if (action === "import") return "Import Mint";
  if (action === "match") return "Match Mint";
  return "Keep Lunch Money";
}

export function MintImportReview({
  preview,
  currency,
  policy,
  onPolicyChange,
}: MintImportReviewProps) {
  const summary = [
    ["Months", String(preview.rows.length)],
    [
      "Date range",
      `${formatMintMonth(preview.firstMonth)} – ${formatMintMonth(preview.lastMonth)}`,
    ],
    ["Empty in LM", String(preview.emptyMonths)],
    ["Overlaps", String(preview.conflictMonths)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-bento-raised p-3">
            <p className="text-xs text-bento-subtle">{label}</p>
            <p className="mt-1 font-medium tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {preview.conflictMonths > 0 && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium sm:col-span-2">
            When a month overlaps
          </legend>
          {CONFLICT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex min-h-20 cursor-pointer items-start gap-3 rounded-xl bg-bento-raised px-4 py-3 shadow-[inset_0_0_0_1px_var(--surface-hairline)] transition-[background-color,box-shadow,scale] active:scale-[0.99]",
                policy === option.value &&
                  "bg-bento-brand/10 shadow-[inset_0_0_0_1px_var(--bento-brand)]"
              )}
            >
              <input
                type="radio"
                name="mint-conflict-policy"
                value={option.value}
                checked={policy === option.value}
                onChange={() => onPolicyChange(option.value)}
                className="mt-1 size-4"
              />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="block text-xs text-bento-subtle">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {preview.negativeAdjustments > 0 && (
        <Alert>
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>
            Negative adjustments in {preview.negativeAdjustments} months
          </AlertTitle>
          <AlertDescription>
            Lunch Money is higher than Mint for assets or debts in these months.
            The adjustment account will use a negative balance to match Mint
            exactly.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-[28rem] overflow-auto rounded-2xl shadow-[inset_0_0_0_1px_var(--surface-hairline)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-bento-surface">
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Mint net</TableHead>
              <TableHead className="text-right">LM net</TableHead>
              <TableHead className="text-right">Adjustment</TableHead>
              <TableHead className="text-right">Result</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">
                  {formatMintMonth(row.month)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.net, currency, true)}
                </TableCell>
                <TableCell className="text-right text-bento-subtle tabular-nums">
                  {row.hasLunchMoneyHistory
                    ? formatCurrency(row.lunchMoneyNet, currency, true)
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  <span className="block">
                    A {formatCurrency(row.assetAdjustment, currency, true)}
                  </span>
                  <span className="block text-bento-subtle">
                    D {formatCurrency(row.debtAdjustment, currency, true)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(row.resultNet, currency, true)}
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full bg-bento-raised px-2.5 py-1 text-xs font-medium">
                    {actionLabel(row.action)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Review before importing</AlertTitle>
        <AlertDescription>
          Bento Cash creates two closed manual accounts and writes monthly
          balance history to them. API changes are permanent, but repeating this
          import updates the same months instead of creating duplicates.
        </AlertDescription>
      </Alert>
    </div>
  );
}
