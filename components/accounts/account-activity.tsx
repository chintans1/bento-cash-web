"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/hooks/use-app-data";
import { formatSubtype, type NormalizedAccount } from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { getAccountActivity, type Transaction } from "@/lib/lunchmoney/client";
import { cn } from "@/lib/utils";
import { detailDate, DetailFields, Metadata } from "./account-detail-fields";

function metadataText(data: unknown, key: string): string | null {
  if (!data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function ActivityRow({
  transaction: tx,
  category,
  tagNames,
  recurringName,
  primaryCurrency,
}: {
  transaction: Transaction;
  category?: string;
  tagNames: string[];
  recurringName?: string;
  primaryCurrency: string;
}) {
  const payee = tx.payee || "Unknown payee";
  const amount = Number(tx.amount);
  const isCredit = amount < 0;
  const sign = isCredit ? "+" : amount > 0 ? "−" : "";
  const metadata = tx.plaid_metadata;
  const merchant = metadataText(metadata, "merchant_name");
  const paymentChannel = metadataText(metadata, "payment_channel");
  const status =
    tx.status === "delete_pending"
      ? "Deletion pending"
      : formatSubtype(tx.status);
  const alternateCurrency =
    tx.currency.toLowerCase() !== primaryCurrency.toLowerCase();

  return (
    <li className="border-b border-bento-hairline/60 last:border-0">
      <details className="group/transaction">
        <summary className="flex cursor-pointer list-none items-start gap-2.5 rounded-md py-panel-row text-left focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <span className="block font-medium wrap-break-word">{payee}</span>
            <span className="mt-0.5 block text-xs text-bento-subtle">
              {detailDate(tx.date)} · {category ?? "Uncategorized"}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={cn(
                "block font-medium tabular-nums",
                isCredit && !tx.is_pending && "text-bento-positive"
              )}
            >
              {sign}
              {formatCurrency(Math.abs(amount), tx.currency, true)}
            </span>
            {(tx.is_pending || tx.status === "delete_pending") && (
              <span className="mt-0.5 block text-xs text-warning-foreground">
                {tx.is_pending ? "Pending" : status}
              </span>
            )}
          </div>
          <ChevronRight
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-bento-subtle group-open/transaction:rotate-90"
          />
        </summary>
        <div className="mb-2 space-y-3 rounded-lg bg-bento-raised/50 p-3">
          <DetailFields
            fields={[
              ["Notes", tx.notes],
              ["Tags", tagNames.join(", ")],
              ["Recurring item", recurringName ?? tx.recurring_id],
              ["Review status", status],
              [
                "Converted amount",
                alternateCurrency
                  ? sign +
                    formatCurrency(
                      Math.abs(tx.to_base),
                      primaryCurrency,
                      true
                    ) +
                    " " +
                    primaryCurrency.toUpperCase()
                  : null,
              ],
              [
                "Original payee",
                tx.original_name !== payee ? tx.original_name : null,
              ],
              ["Plaid merchant", merchant !== payee ? merchant : null],
              [
                "Authorized on",
                detailDate(metadataText(metadata, "authorized_date")),
              ],
              [
                "Payment channel",
                paymentChannel
                  ? formatSubtype(paymentChannel.replaceAll("_", " "))
                  : null,
              ],
              [
                "Source",
                tx.source === "plaid"
                  ? "Plaid"
                  : tx.source
                    ? formatSubtype(tx.source)
                    : null,
              ],
              ["Created", detailDate(tx.created_at, true)],
              ["Last updated", detailDate(tx.updated_at, true)],
              ["Transaction ID", tx.id],
              ["External ID", tx.external_id],
              ["Split parent ID", tx.split_parent_id],
              ["Group ID", tx.group_parent_id],
            ]}
          />
          {Boolean(tx.files?.length) && (
            <ul
              aria-label="Attachments"
              className="space-y-1 text-xs text-bento-subtle"
            >
              {tx.files?.map((file, index) => (
                <li key={file.id ?? index}>
                  {file.name ?? "Attachment"}
                  {file.size != null ? ` · ${file.size} KB` : ""}
                  {file.notes ? ` · ${file.notes}` : ""}
                </li>
              ))}
            </ul>
          )}
          <Metadata label="Plaid transaction data" data={metadata} />
          <Metadata label="Custom transaction data" data={tx.custom_metadata} />
        </div>
      </details>
    </li>
  );
}

export function AccountActivity({ account }: { account: NormalizedAccount }) {
  const { categoryMap, tags, recurringItems, primaryCurrency } = useAppData();
  const { source, rawId } = account;
  const [request, setRequest] = useState({ offset: 0 });
  const [result, setResult] = useState<{
    request: { offset: number };
    rows: Transaction[];
    nextOffset: number | null;
    error: boolean;
  } | null>(null);
  const loading = result?.request !== request;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const page = await getAccountActivity({
          source,
          accountId: rawId,
          offset: request.offset,
        });
        if (cancelled) return;
        setResult((previous) => {
          const rows = new Map(
            (request.offset === 0 ? [] : (previous?.rows ?? [])).map((tx) => [
              tx.id,
              tx,
            ])
          );
          for (const tx of page.transactions) rows.set(tx.id, tx);
          return {
            request,
            rows: Array.from(rows.values()).sort(
              (a, b) => b.date.localeCompare(a.date) || b.id - a.id
            ),
            nextOffset:
              page.has_more && page.transactions.length
                ? request.offset + page.transactions.length
                : null,
            error: false,
          };
        });
      } catch {
        if (!cancelled) {
          setResult((previous) => ({
            request,
            rows: previous?.rows ?? [],
            nextOffset: null,
            error: true,
          }));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [rawId, request, source]);

  return (
    <section aria-label="Recent transactions">
      {!result && (
        <div
          role="status"
          aria-label="Loading transactions"
          className="space-y-3 py-2"
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}
      {result && !result.rows.length && !result.error && !loading && (
        <p role="status" className="py-4 text-sm text-bento-subtle">
          No transactions for this account.
        </p>
      )}
      {!!result?.rows.length && (
        <ul>
          {result.rows.map((tx) => (
            <ActivityRow
              key={tx.id}
              transaction={tx}
              category={
                tx.category_id == null
                  ? undefined
                  : categoryMap.get(tx.category_id)?.name
              }
              tagNames={tx.tag_ids.map(
                (id) => tags.find((tag) => tag.id === id)?.name ?? `#${id}`
              )}
              recurringName={
                recurringItems.find((item) => item.id === tx.recurring_id)
                  ?.transaction_criteria.payee ?? undefined
              }
              primaryCurrency={primaryCurrency}
            />
          ))}
        </ul>
      )}
      {result?.error && !loading && (
        <p role="alert" className="mt-3 text-sm text-bento-danger">
          Could not load transactions.
        </p>
      )}
      {result && (result.error || result.nextOffset !== null) && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={loading}
          onClick={() =>
            setRequest({
              offset: result.error ? request.offset : result.nextOffset!,
            })
          }
        >
          {loading
            ? "Loading…"
            : result.error
              ? "Try again"
              : "Load older transactions"}
        </Button>
      )}
    </section>
  );
}
