import type { RecurringItem } from "./client";

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
