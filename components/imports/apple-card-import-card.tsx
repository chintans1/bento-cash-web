"use client";

import { useState } from "react";
import type {
  ManualAccount,
  Transaction,
} from "@lunch-money/lunch-money-js-v2";
import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  createManualAccount,
  createTransactions,
  getAccounts,
  getTransactionsForMonth,
} from "@/lib/lunchmoney/client";
import { invalidate, KEY } from "@/lib/lunchmoney/cache";
import {
  findAppleCardDuplicateIds,
  parseAppleCardCsv,
  type AppleCardFile,
} from "@/lib/lunchmoney/apple-card-import";

type Phase = "idle" | "reading" | "review" | "importing" | "complete";

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The Apple Card import could not be completed.";
}

async function readApplePdfFile(file: File): Promise<AppleCardFile> {
  try {
    const { parseAppleCardPdf } =
      await import("@/lib/lunchmoney/apple-card-pdf");
    return await parseAppleCardPdf(file);
  } catch (cause) {
    if (
      /failed to fetch dynamically imported module|outdated optimize dep/i.test(
        errorText(cause)
      )
    ) {
      throw new Error(
        "The PDF reader did not load. Refresh this page, then choose the file again."
      );
    }
    throw cause;
  }
}

async function existingTransactions(
  rows: AppleCardFile["rows"],
  accountId: number
): Promise<Transaction[]> {
  invalidate(KEY.allTx);
  const months = [...new Set(rows.map((row) => row.date.slice(0, 7)))];
  const results = await Promise.all(
    months.map(async (month) => {
      const [year, number] = month.split("-").map(Number);
      const response = await getTransactionsForMonth(year, number);
      if (response.has_more)
        throw new Error(
          `Could not check every transaction in ${month}. Try again later.`
        );
      return response.transactions.filter(
        (tx) => tx.manual_account_id === accountId
      );
    })
  );
  return results.flat();
}

export function AppleCardImportCard({
  isDemo,
  onImported,
}: {
  isDemo: boolean;
  onImported: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<AppleCardFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [accounts, setAccounts] = useState<ManualAccount[]>([]);
  const [accountChoice, setAccountChoice] = useState("new");
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [pdfConfirmed, setPdfConfirmed] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function compare(data: AppleCardFile, choice: string) {
    setChecking(true);
    try {
      const matches =
        choice === "new"
          ? new Set<string>()
          : findAppleCardDuplicateIds(
              data.rows,
              await existingTransactions(data.rows, Number(choice))
            );
      setDuplicates(matches);
      setPhase("review");
    } catch (cause) {
      setError(errorText(cause));
      setPhase("idle");
    } finally {
      setChecking(false);
    }
  }

  async function readFile(chosen: File | undefined) {
    if (!chosen) return;
    setPhase("reading");
    setError(null);
    setFile(null);
    setFileName(chosen.name);
    setExcluded(new Set());
    setPdfConfirmed(false);
    setImportedCount(null);
    try {
      if (chosen.size > 10_000_000)
        throw new Error("Choose a file smaller than 10 MB.");
      const pdf =
        chosen.name.toLowerCase().endsWith(".pdf") ||
        chosen.type === "application/pdf";
      const data = pdf
        ? await readApplePdfFile(chosen)
        : parseAppleCardCsv(await chosen.text());
      const { manual } = await getAccounts();
      const eligible = manual.filter(
        (account) =>
          account.currency.toLowerCase() === "usd" &&
          !account.exclude_from_transactions &&
          account.status === "active"
      );
      const appleAccount = eligible.find((account) =>
        /apple card/i.test(`${account.name} ${account.display_name ?? ""}`)
      );
      const choice = appleAccount ? String(appleAccount.id) : "new";
      setAccounts(eligible);
      setAccountChoice(choice);
      setFile(data);
      await compare(data, choice);
    } catch (cause) {
      setError(errorText(cause));
      setPhase("idle");
    }
  }

  function changeAccount(choice: string) {
    setAccountChoice(choice);
    setError(null);
    if (file) void compare(file, choice);
  }

  function toggle(id: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function importRows() {
    if (!file || phase !== "review") return;
    setPhase("importing");
    setError(null);
    let imported = 0;
    try {
      let accountId = accountChoice === "new" ? null : Number(accountChoice);
      if (accountId !== null) {
        const fresh = findAppleCardDuplicateIds(
          file.rows,
          await existingTransactions(file.rows, accountId)
        );
        setDuplicates(fresh);
        if ([...fresh].some((id) => !duplicates.has(id) && !excluded.has(id))) {
          setPhase("review");
          setError(
            "New matching transactions appeared. Review the updated list before importing."
          );
          return;
        }
      }
      const selected = file.rows.filter(
        (row) => !excluded.has(row.id) && !duplicates.has(row.id)
      );
      if (!selected.length) {
        setPhase("review");
        return;
      }
      if (accountId === null) {
        const account = await createManualAccount({
          name: "Apple Card",
          institution_name: "Apple",
          type: "credit",
          balance: 0,
          currency: "usd",
        });
        accountId = account.id;
        setAccountChoice(String(account.id));
        setAccounts((current) => [...current, account]);
      }
      for (let offset = 0; offset < selected.length; offset += 100) {
        const chunk = selected.slice(offset, offset + 100);
        const response = await createTransactions({
          transactions: chunk.map((row) => ({
            date: row.date,
            amount: row.amount,
            payee: row.payee,
            currency: "usd",
            manual_account_id: accountId,
            external_id: row.id,
          })),
          skip_balance_update: true,
        });
        imported += response.transactions.length;
      }
      setImportedCount(imported);
      setPhase("complete");
      try {
        await onImported();
      } catch {
        setError(
          "Transactions were imported, but the account list could not refresh. Reload the page to see them."
        );
      }
    } catch (cause) {
      setError(
        `${errorText(cause)}${imported ? ` ${imported} transactions were already imported; retrying will skip them.` : ""}`
      );
      setPhase("review");
    }
  }

  function reset() {
    setPhase("idle");
    setFile(null);
    setFileName("");
    setError(null);
    setImportedCount(null);
  }

  const busy = phase === "reading" || phase === "importing" || checking;
  const selected =
    file?.rows.filter(
      (row) => !duplicates.has(row.id) && !excluded.has(row.id)
    ) ?? [];
  const selectedTotal = selected.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          <h2>Apple Card transactions</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isDemo ? (
          <p className="text-bento-subtle">Apple Card CSV or PDF statement</p>
        ) : (
          <>
            <div className="rounded-2xl bg-bento-raised p-4 text-sm leading-6 text-bento-subtle">
              <p className="font-medium text-foreground">
                Get your Apple Card file
              </p>
              <ol className="mt-1 list-inside list-decimal">
                <li>Open Wallet → Apple Card → Card Balance.</li>
                <li>
                  Choose a monthly statement, then Export Transactions (CSV) or
                  Download PDF Statement.
                </li>
              </ol>
              <p className="mt-1">
                Statements are also available at{" "}
                <a
                  className="text-bento-brand underline underline-offset-2"
                  href="https://card.apple.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  card.apple.com
                </a>
                .
              </p>
            </div>
            <input
              id="apple-card-file"
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              className="peer sr-only"
              disabled={busy}
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                event.target.value = "";
                void readFile(chosen);
              }}
            />
            <label
              htmlFor="apple-card-file"
              className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-bento-raised/40 px-4 py-5 text-center transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30 hover:border-bento-brand/50 hover:bg-bento-raised"
            >
              {fileName ? (
                <FileText className="size-5 shrink-0 text-bento-brand" />
              ) : (
                <UploadCloud className="size-5 shrink-0 text-bento-brand" />
              )}
              <span className="text-sm font-medium">
                {fileName || "Choose Apple Card CSV or PDF"}
              </span>
            </label>
            <p className="-mt-3 text-xs text-bento-subtle">
              CSV is recommended. The file is read in this browser; the
              statement itself is not uploaded.
            </p>
            {busy && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-bento-subtle"
              >
                <LoaderCircle className="size-4 animate-spin" />
                {phase === "importing"
                  ? "Importing transactions…"
                  : "Reading and checking transactions…"}
              </p>
            )}
            {error && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Import needs attention</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {phase === "complete" && importedCount !== null && (
              <div
                role="status"
                className="rounded-2xl bg-bento-positive/10 p-5 text-center"
              >
                <CheckCircle2 className="mx-auto size-7 text-bento-positive" />
                <p className="mt-2 font-heading text-lg font-medium">
                  {importedCount} transactions imported
                </p>
                <Button className="mt-4" variant="outline" onClick={reset}>
                  Import another file
                </Button>
              </div>
            )}
            {(phase === "review" || phase === "importing") && file && (
              <>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="apple-card-account"
                    className="text-sm font-medium"
                  >
                    Import into
                  </label>
                  <select
                    id="apple-card-account"
                    value={accountChoice}
                    disabled={busy}
                    onChange={(event) => changeAccount(event.target.value)}
                    className="min-h-11 rounded-xl bg-bento-raised px-3 text-sm shadow-(--shadow-surface-outline) focus-visible:outline-2 focus-visible:outline-bento-brand"
                  >
                    <option value="new">Create a new Apple Card account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.display_name || account.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-pretty text-bento-subtle">
                    Historical transactions will not change the account&apos;s
                    current balance. Set its current balance separately in Lunch
                    Money.
                  </p>
                </div>
                {file.warnings.map((warning) => (
                  <Alert key={warning}>
                    <TriangleAlert />
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                ))}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-heading text-base font-medium">
                    Review transactions
                  </h3>
                  <p className="text-sm text-bento-subtle tabular-nums">
                    {selected.length} selected · {duplicates.size} matched ·{" "}
                    {formatCurrency(selectedTotal, "usd", true)} net
                  </p>
                </div>
                <div className="max-h-96 overflow-auto rounded-2xl shadow-(--shadow-surface-outline)">
                  <table className="w-full min-w-125 text-left text-sm">
                    <thead className="sticky top-0 bg-bento-raised text-xs text-bento-subtle">
                      <tr>
                        <th className="px-4 py-3">Import</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Description</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {file.rows.map((row) => {
                        const duplicate = duplicates.has(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={duplicate ? "text-bento-subtle" : ""}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Import ${row.payee} on ${row.date}`}
                                checked={!duplicate && !excluded.has(row.id)}
                                disabled={duplicate || busy}
                                onChange={() => toggle(row.id)}
                                className="size-4 accent-bento-brand"
                              />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                              {formatShortDate(row.date)}
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-medium">{row.payee}</span>
                              {duplicate && (
                                <span className="ml-2 text-xs">
                                  Already in Lunch Money
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                              {formatCurrency(row.amount, "usd", true)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {file.source === "pdf" && (
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={pdfConfirmed}
                      onChange={(event) =>
                        setPdfConfirmed(event.target.checked)
                      }
                      className="size-4 accent-bento-brand"
                    />
                    I checked these rows against my PDF statement.
                  </label>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      {!isDemo && (phase === "review" || phase === "importing") && file && (
        <CardFooter className="flex justify-end gap-2 border-t">
          <Button variant="outline" disabled={busy} onClick={reset}>
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              !selected.length ||
              (file.source === "pdf" && !pdfConfirmed)
            }
            onClick={() => void importRows()}
          >
            Import {selected.length} transactions
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
