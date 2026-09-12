import type { Transaction, TransactionPatch } from "./client";
import type { NormalizedAccount } from "../account-utils";

export type { TransactionPatch } from "./client";

export type ReviewFilter = "all" | "unreviewed" | "pending" | "attention";

/** Keeps pending bank activity above posted transactions in every sorted view. */
export function comparePendingFirst(
  a: Pick<Transaction, "is_pending">,
  b: Pick<Transaction, "is_pending">
): number {
  if (a.is_pending === b.is_pending) return 0;
  return a.is_pending ? -1 : 1;
}

export function isTransactionAccountOption(
  account: Pick<NormalizedAccount, "status" | "allowTransactionModifications">
): boolean {
  return account.status !== "closed" && account.allowTransactionModifications;
}

export function isStructurallyLockedTransaction(
  transaction: Pick<
    Transaction,
    | "is_split_parent"
    | "split_parent_id"
    | "is_group_parent"
    | "group_parent_id"
  >
): boolean {
  return Boolean(
    transaction.is_split_parent ||
    transaction.split_parent_id ||
    transaction.is_group_parent ||
    transaction.group_parent_id
  );
}

export function isReviewableTransaction(transaction: Transaction): boolean {
  return (
    !transaction.is_pending &&
    transaction.status !== "delete_pending" &&
    !isStructurallyLockedTransaction(transaction)
  );
}

export function transactionAccountPatch(account?: {
  source: "manual" | "plaid";
  rawId: number;
}): Pick<TransactionPatch, "manual_account_id" | "plaid_account_id"> {
  return {
    manual_account_id: account?.source === "manual" ? account.rawId : null,
    plaid_account_id: account?.source === "plaid" ? account.rawId : null,
  };
}

export function isInMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(`${year}-${String(month).padStart(2, "0")}-`);
}

export function matchesReviewFilter(
  transaction: Transaction,
  filter: ReviewFilter
): boolean {
  if (filter === "unreviewed") {
    return (
      transaction.status === "unreviewed" &&
      isReviewableTransaction(transaction)
    );
  }
  if (filter === "pending") return transaction.is_pending;
  if (filter === "attention") {
    return transaction.status === "delete_pending";
  }
  return true;
}

export function reviewCounts(transactions: Transaction[]) {
  return transactions.reduce(
    (counts, transaction) => {
      if (
        transaction.status === "unreviewed" &&
        isReviewableTransaction(transaction)
      ) {
        counts.unreviewed++;
      }
      if (transaction.is_pending) counts.pending++;
      if (transaction.status === "delete_pending") counts.attention++;
      return counts;
    },
    { unreviewed: 0, pending: 0, attention: 0 }
  );
}

export function changedPatch(
  transaction: Transaction,
  next: TransactionPatch
): TransactionPatch {
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      const before = transaction[key as keyof Transaction];
      return Array.isArray(value)
        ? JSON.stringify(value) !== JSON.stringify(before)
        : value !== before;
    })
  ) as TransactionPatch;
}

export function fieldsAtRevision<T extends object>(
  values: T,
  revisions: Map<string, number>,
  transactionId: number,
  revision: number
): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) => revisions.get(`${transactionId}:${key}`) === revision
    )
  ) as Partial<T>;
}

export function canonicalFieldsAtRevision(
  canonical: Partial<Transaction>,
  requested: TransactionPatch,
  revisions: Map<string, number>,
  transactionId: number,
  revision: number
): Partial<Transaction> {
  const accepted = fieldsAtRevision(
    canonical,
    revisions,
    transactionId,
    revision
  );
  const conversionFields = (["amount", "currency"] as const).filter(
    (field) => field in requested
  );

  if (
    canonical.to_base !== undefined &&
    conversionFields.length > 0 &&
    conversionFields.every(
      (field) => revisions.get(`${transactionId}:${field}`) === revision
    )
  ) {
    accepted.to_base = canonical.to_base;
  }

  return accepted;
}
