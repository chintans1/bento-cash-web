import type { Category } from "./client";

/**
 * The slice of an LM category the app actually reads.
 *
 * Picked from the SDK's `Category` rather than redeclared, so a field that
 * changes shape upstream breaks here instead of drifting silently.
 */
export type CategoryInfo = Pick<
  Category,
  "name" | "is_income" | "exclude_from_totals"
>;

/**
 * Stand-in id for "no category".
 *
 * LM models uncategorized as `category_id: null`, but the category map, the
 * filter dropdown and the drill-down all key on a number, so they need one id
 * that cannot collide with a real category. Negative ids are never issued.
 */
export const UNCATEGORIZED_ID = -1;

export const UNCATEGORIZED: CategoryInfo = {
  name: "Uncategorized",
  is_income: false, // Could be income if its positive?
  exclude_from_totals: false,
};
