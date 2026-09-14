"use client";

import { useRef, useState } from "react";
import type { Currency } from "@lunch-money/lunch-money-js-v2";
import {
  CircleCheckBig,
  FileCheck2,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatMintMonth,
  MintImportReview,
} from "@/components/settings/mint-import-review";
import { cn } from "@/lib/utils";
import {
  applyMintImport,
  prepareMintImport,
  StaleMintImportError,
  type MintImportResult,
} from "@/lib/lunchmoney/mint-import-service";
import {
  MintImportError,
  parseMintTrendsCsv,
  type MintConflictPolicy,
  type MintCsvData,
  type MintImportPreview,
} from "@/lib/lunchmoney/mint-import";

type Phase = "idle" | "loading" | "review" | "importing" | "complete";
type MintBalanceImportCardProps = {
  currency: Currency;
  isDemo: boolean;
  accountLoading: boolean;
  onImported: () => Promise<void>;
};

const MAX_CSV_BYTES = 2_000_000;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong while preparing the import.";
}

export function MintBalanceImportCard({
  currency,
  isDemo,
  accountLoading,
  onImported,
}: MintBalanceImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<MintCsvData | null>(null);
  const [policy, setPolicy] = useState<MintConflictPolicy>("keep_lunch_money");
  const [preview, setPreview] = useState<MintImportPreview | null>(null);
  const [result, setResult] = useState<MintImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview(
    data: MintCsvData,
    nextPolicy: MintConflictPolicy
  ): Promise<boolean> {
    const request = ++requestRef.current;
    setPhase("loading");
    setError(null);
    try {
      const next = await prepareMintImport(data.rows, nextPolicy);
      if (request !== requestRef.current) return false;
      setPreview(next);
      setPhase("review");
      return true;
    } catch (err) {
      if (request !== requestRef.current) return false;
      setPreview(null);
      setError(errorMessage(err));
      setPhase("idle");
      return false;
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const request = ++requestRef.current;
    setResult(null);
    setPreview(null);
    setFileName(file.name);
    setError(null);
    try {
      if (file.size > MAX_CSV_BYTES) {
        throw new MintImportError("Choose a Mint CSV smaller than 2 MB.");
      }
      const data = parseMintTrendsCsv(await file.text());
      if (request !== requestRef.current) return;
      setCsv(data);
      await loadPreview(data, policy);
    } catch (err) {
      if (request !== requestRef.current) return;
      setCsv(null);
      setPhase("idle");
      setError(errorMessage(err));
    }
  }

  function handlePolicy(nextPolicy: MintConflictPolicy) {
    setPolicy(nextPolicy);
    if (csv) void loadPreview(csv, nextPolicy);
  }

  async function handleImport() {
    if (!csv || !preview) return;
    setPhase("importing");
    setError(null);

    let imported: MintImportResult;
    try {
      imported = await applyMintImport(
        csv.rows,
        policy,
        currency,
        preview.signature
      );
    } catch (err) {
      if (err instanceof StaleMintImportError) {
        if (await loadPreview(csv, policy)) setError(err.message);
        return;
      }
      setError(errorMessage(err));
      setPhase("review");
      return;
    }

    setResult(imported);
    setPhase("complete");
    try {
      await onImported();
    } catch {
      setError(
        "The import succeeded, but the account list could not refresh. Reload the page to see the import accounts."
      );
    }
  }

  function reset() {
    requestRef.current++;
    setPhase("idle");
    setFileName(null);
    setCsv(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = phase === "loading" || phase === "importing";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Mint balance history</CardTitle>
        <CardDescription className="max-w-2xl text-pretty">
          Restore Mint&apos;s monthly net worth without inventing account-level
          history.
        </CardDescription>
        <CardAction>
          <span className="inline-flex h-7 items-center rounded-full bg-bento-raised px-3 font-mono text-xs font-medium text-bento-subtle uppercase tabular-nums">
            {currency}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {isDemo ? (
          <Alert>
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Connect a Lunch Money account to import</AlertTitle>
            <AlertDescription>
              Demo mode cannot write balance history. Your CSV stays in this
              browser and is sent only to Lunch Money when you confirm the
              import.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <Input
                ref={inputRef}
                id="mint-trends-file"
                type="file"
                accept=".csv,text/csv"
                disabled={busy || accountLoading}
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                onChange={(event) => void handleFile(event.target.files?.[0])}
                className="peer sr-only"
              />

              {fileName ? (
                <div className="flex min-h-16 items-center gap-3 rounded-xl bg-bento-raised px-4 py-3 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bento-brand/10 text-bento-brand">
                    <FileCheck2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="mt-0.5 text-xs text-bento-subtle">
                      Mint trends CSV
                    </p>
                  </div>
                  <label
                    htmlFor="mint-trends-file"
                    className={cn(
                      "inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-full px-4 text-sm font-medium shadow-[inset_0_0_0_1px_var(--surface-hairline)] transition-[background-color,scale] hover:bg-bento-surface active:scale-[0.96]",
                      (busy || accountLoading) &&
                        "pointer-events-none opacity-50"
                    )}
                  >
                    Replace file
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="mint-trends-file"
                  className={cn(
                    "group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bento-raised/50 px-5 py-6 text-center transition-[background-color,border-color,scale] peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30 hover:border-bento-brand/50 hover:bg-bento-raised active:scale-[0.99]",
                    (busy || accountLoading) && "pointer-events-none opacity-50"
                  )}
                >
                  <UploadCloud
                    className="size-6 text-bento-brand transition-transform group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                  <span className="mt-3 text-sm font-medium">
                    Choose Mint trends CSV
                  </span>
                  <span className="mt-1 text-xs text-pretty text-bento-subtle">
                    DATES, Assets, Debts, NET · up to 2 MB
                  </span>
                </label>
              )}

              <p className="mt-2 text-xs text-pretty text-bento-subtle">
                Aggregate Mint history is imported in your default currency. No
                account mapping is needed.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Import needs attention</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {phase === "loading" && (
              <div
                role="status"
                className="flex min-h-28 items-center justify-center gap-2 rounded-2xl bg-bento-raised text-sm text-bento-subtle"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Comparing {fileName} with Lunch Money…
              </div>
            )}

            {csv?.warnings.map((warning) => (
              <Alert key={warning}>
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Incomplete timeline</AlertTitle>
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}

            {phase === "complete" && result ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-bento-positive/10 px-5 py-8 text-center">
                <CircleCheckBig
                  className="size-8 text-bento-positive"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-heading text-lg font-medium">
                    Balance history imported
                  </h3>
                  <p className="mt-1 text-sm text-bento-subtle">
                    {result.monthsProcessed} months processed from{" "}
                    {formatMintMonth(result.firstMonth)}
                    {" through "}
                    {formatMintMonth(result.lastMonth)}.{" "}
                    {result.emptyMonthsFilled} empty months filled
                    {result.keptMonths > 0 &&
                      `, ${result.keptMonths} Lunch Money months kept`}
                    {result.matchedMonths > 0 &&
                      `, ${result.matchedMonths} overlap months matched to Mint`}
                    .
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={reset}
                >
                  Import another file
                </Button>
              </div>
            ) : null}

            {(phase === "review" || phase === "importing") && preview ? (
              <MintImportReview
                preview={preview}
                currency={currency}
                policy={policy}
                onPolicyChange={handlePolicy}
              />
            ) : null}
          </>
        )}
      </CardContent>

      {!isDemo && (phase === "review" || phase === "importing") && preview && (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={reset}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => void handleImport()}
          >
            {phase === "importing" ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Importing…
              </>
            ) : (
              `Import ${preview.rows.length} months`
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
