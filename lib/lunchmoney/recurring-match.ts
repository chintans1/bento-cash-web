import type { RecurringItem, Transaction } from "./client";
import { differenceInCalendarDays, parseISO } from "date-fns";

export type RecurringMatch = "confirmed" | "possible" | null;

/** Classify a transaction's link against recurring items returned by Lunch Money. */
export function recurringMatch(
  recurringId: number | null,
  items: Pick<RecurringItem, "id" | "status">[]
): RecurringMatch {
  if (recurringId == null) return null;

  const item = items.find(({ id }) => id === recurringId);
  if (item?.status === "reviewed") return "confirmed";
  if (item?.status === "suggested") return "possible";
  return null;
}

/** Only reviewed items count as an assigned recurring item in an editor. */
export function confirmedRecurringId(
  recurringId: number | null,
  items: Pick<RecurringItem, "id" | "status">[]
): number | null {
  return recurringMatch(recurringId, items) === "confirmed"
    ? recurringId
    : null;
}

export function postedRecurringIds(
  transactions: Pick<
    Transaction,
    "id" | "recurring_id" | "is_pending" | "status"
  >[],
  editingId: number
): Set<number> {
  const ids = new Set<number>();
  for (const transaction of transactions) {
    if (
      transaction.id !== editingId &&
      transaction.recurring_id != null &&
      !transaction.is_pending &&
      transaction.status !== "delete_pending"
    ) {
      ids.add(transaction.recurring_id);
    }
  }
  return ids;
}

/** Choose the expected occurrence closest to the transaction being edited. */
export function expectedRecurringDate(
  dates: readonly string[] | undefined,
  transactionDate: string
): string | null {
  const month = transactionDate.slice(0, 7);
  const target = parseISO(transactionDate);
  let closest = null;
  let distance = Infinity;
  for (const date of dates ?? []) {
    if (!date.startsWith(`${month}-`)) continue;
    const days = Math.abs(differenceInCalendarDays(parseISO(date), target));
    if (days < distance || (days === distance && closest && date < closest)) {
      closest = date;
      distance = days;
    }
  }
  return closest;
}
