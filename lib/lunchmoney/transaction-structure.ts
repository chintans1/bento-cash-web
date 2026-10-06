import type {
  GroupInput,
  RecurringItem,
  SplitParts,
  Transaction,
} from "./client";

/** Lunch Money amounts have up to four decimal places. Keep sums exact. */
export function amountUnits(value: number | string): number | null {
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d{1,4}))?$/);
  if (!match) return null;
  const units =
    Number(match[2]) * 10000 + Number((match[3] ?? "").padEnd(4, "0"));
  if (!Number.isSafeInteger(units)) return null;
  return match[1] ? -units : units;
}

/** Show ordinary cent amounts with two places without rounding meaningful API precision. */
export function amountForEditing(value: string): string {
  const units = amountUnits(value);
  return units !== null && units % 100 === 0
    ? (units / 10000).toFixed(2)
    : value;
}

function unitsText(units: number): string {
  const absolute = Math.abs(units);
  const fraction = (absolute % 10000)
    .toString()
    .padStart(4, "0")
    .replace(/0+$/, "");
  return `${units < 0 ? "-" : ""}${Math.floor(absolute / 10000)}${fraction ? `.${fraction}` : ""}`;
}

export function equalSplitAmounts(
  value: string,
  count: number
): string[] | null {
  const total = amountUnits(value);
  if (total === null || count < 2 || !Number.isInteger(count)) return null;
  const sign = Math.sign(total);
  const quantum = total % 100 === 0 && Math.abs(total) >= count * 100 ? 100 : 1;
  const totalQuanta = Math.abs(total) / quantum;
  const base = Math.floor(totalQuanta / count);
  const extra = totalQuanta % count;
  return Array.from({ length: count }, (_, index) =>
    amountForEditing(
      unitsText(sign * (base + (index < extra ? 1 : 0)) * quantum)
    )
  );
}

export function defaultSplitAmounts(value: string): [string, string] | null {
  const amounts = equalSplitAmounts(value, 2);
  return amounts ? [amounts[0], amounts[1]] : null;
}

export function remainingSplitAmount(
  total: string,
  otherAmounts: string[]
): string | null {
  const totalUnits = amountUnits(total);
  const otherUnits = otherAmounts.map(amountUnits);
  if (totalUnits === null || otherUnits.some((units) => units === null))
    return null;
  return amountForEditing(
    unitsText(totalUnits - (otherUnits as number[]).reduce((a, b) => a + b, 0))
  );
}

export function recurringItemName(item: RecurringItem): string {
  return (
    item.overrides.payee ??
    item.transaction_criteria.payee ??
    item.description ??
    `Recurring item #${item.id}`
  );
}

function normalizedWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 4);
}

/** Transparent suggestions based on existing items; the user always chooses the link. */
export function suggestRecurringItems(
  items: RecurringItem[],
  draft: Pick<
    Transaction,
    | "payee"
    | "amount"
    | "currency"
    | "date"
    | "manual_account_id"
    | "plaid_account_id"
  >,
  limit = 3
): RecurringItem[] {
  const draftUnits = amountUnits(draft.amount);
  const draftWords = normalizedWords(draft.payee);
  const draftName = draftWords.join(" ");
  return items
    .filter((item) => {
      const criteria = item.transaction_criteria;
      return (
        item.status === "reviewed" &&
        criteria.currency.toLowerCase() === draft.currency.toLowerCase() &&
        (criteria.manual_account_id == null ||
          criteria.manual_account_id === draft.manual_account_id) &&
        (criteria.plaid_account_id == null ||
          criteria.plaid_account_id === draft.plaid_account_id)
      );
    })
    .map((item) => {
      const name = normalizedWords(recurringItemName(item)).join(" ");
      const itemUnits = amountUnits(item.transaction_criteria.amount);
      let score = 0;
      if (draftName && draftName === name) score += 6;
      else if (
        draftName &&
        name &&
        (draftName.includes(name) || name.includes(draftName))
      )
        score += 4;
      else if (draftWords.some((word) => name.split(" ").includes(word)))
        score += 3;
      if (
        draftUnits !== null &&
        itemUnits !== null &&
        Math.sign(draftUnits) === Math.sign(itemUnits)
      ) {
        const difference = Math.abs(draftUnits - itemUnits);
        if (difference === 0) score += 4;
        else if (difference <= Math.abs(itemUnits) * 0.05) score += 2;
      }
      const day = Number(draft.date.slice(8, 10));
      const expectedDay = Number(
        item.transaction_criteria.anchor_date.slice(8, 10)
      );
      if (day && expectedDay && Math.abs(day - expectedDay) <= 3) score += 1;
      if (
        item.transaction_criteria.manual_account_id != null ||
        item.transaction_criteria.plaid_account_id != null
      )
        score += 1;
      return { item, score };
    })
    .filter(({ score }) => score >= 2)
    .sort(
      (a, b) =>
        b.score - a.score ||
        recurringItemName(a.item).localeCompare(recurringItemName(b.item))
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

/** Link each saved split child separately and report partial success for a safe retry. */
export async function applySplitRecurringLinks(
  children: { id: number; recurring_id: number | null }[],
  desired: (number | null)[],
  update: (
    id: number,
    recurringId: number | null
  ) => Promise<{ recurring_id: number | null }>
): Promise<{ actual: (number | null)[]; failures: number[] }> {
  if (children.length !== desired.length)
    throw new Error(
      "Lunch Money returned a different number of split transactions."
    );
  const actual = children.map((child) => child.recurring_id);
  const failures: number[] = [];
  for (let index = 0; index < children.length; index++) {
    if (actual[index] === desired[index]) continue;
    try {
      const updated = await update(children[index].id, desired[index]);
      if (updated.recurring_id !== desired[index])
        throw new Error("Link not confirmed");
      actual[index] = updated.recurring_id;
    } catch {
      failures.push(index);
    }
  }
  return { actual, failures };
}

export function splitCategoryError(
  children: SplitParts,
  recurringIds: (number | null)[],
  inheritedCategoryId: number | null = null
): string | null {
  if (children.length !== recurringIds.length)
    return "Each split needs a recurring selection.";
  const missing = children.findIndex(
    (child, index) =>
      (child.category_id === undefined
        ? inheritedCategoryId
        : child.category_id) == null && recurringIds[index] == null
  );
  return missing === -1
    ? null
    : `Choose a category or recurring item for split ${missing + 1}.`;
}

/** Review each child after the API creates it; keep failures retryable. */
export async function reviewSplitChildren(
  children: { id: number; status: Transaction["status"] }[],
  update: (id: number) => Promise<{ status: Transaction["status"] }>
): Promise<{ statuses: Transaction["status"][]; failures: number[] }> {
  const statuses = children.map((child) => child.status);
  const failures: number[] = [];
  for (let index = 0; index < children.length; index++) {
    if (statuses[index] === "reviewed") continue;
    try {
      const result = await update(children[index].id);
      if (result.status !== "reviewed") throw new Error("Review not confirmed");
      statuses[index] = "reviewed";
    } catch {
      failures.push(index);
    }
  }
  return { statuses, failures };
}

export function splitError(
  parent: Pick<Transaction, "amount">,
  children: SplitParts
): string | null {
  const total = amountUnits(parent.amount);
  if (total === null || total === 0) return "This transaction cannot be split.";
  if (children.length < 2) return "Add at least two split transactions.";
  let allocated = 0;
  for (const child of children) {
    const amount = amountUnits(child.amount);
    if (amount === null || amount === 0 || amount > 0 !== total > 0) {
      return "Each split amount must be nonzero and have the same debit or credit direction.";
    }
    if (!child.payee?.trim())
      return "Enter a payee for every split transaction.";
    allocated += amount;
    if (!Number.isSafeInteger(allocated)) return "Split amounts are too large.";
  }
  if (allocated !== total)
    return "Split amounts must add up to the original amount.";
  return null;
}

export function canGroupTransaction(
  transaction: Pick<
    Transaction,
    | "is_pending"
    | "is_split_parent"
    | "split_parent_id"
    | "is_group_parent"
    | "group_parent_id"
    | "recurring_id"
    | "status"
  >
): boolean {
  return (
    !transaction.is_pending &&
    transaction.status !== "delete_pending" &&
    !transaction.is_split_parent &&
    transaction.split_parent_id == null &&
    !transaction.is_group_parent &&
    transaction.group_parent_id == null &&
    transaction.recurring_id == null
  );
}

export function groupError(input: GroupInput): string | null {
  if (input.ids.length < 2 || new Set(input.ids).size !== input.ids.length) {
    return "Select at least two different transactions.";
  }
  if (!input.payee.trim()) return "Enter a payee for the group.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return "Enter a valid group date.";
  return null;
}

/** Replacing a split requires two API writes; restore the old allocation on failure. */
export async function replaceSplitWithRestore(
  id: number,
  children: SplitParts,
  api: {
    get: (id: number) => Promise<Transaction>;
    unsplit: (id: number) => Promise<void>;
    split: (id: number, children: SplitParts) => Promise<Transaction>;
    updateRecurring?: (id: number, recurringId: number) => Promise<unknown>;
  }
): Promise<Transaction> {
  const parent = await api.get(id);
  if (!parent.is_split_parent || !parent.children?.length) {
    throw new Error("Could not load the existing split children");
  }
  const previous: SplitParts = parent.children.map((child) => ({
    amount: child.amount,
    payee: child.payee,
    date: child.date,
    category_id: child.category_id,
    tag_ids: child.tag_ids,
    notes: child.notes,
  }));
  const validation = splitError(parent, children);
  if (validation) throw new Error(validation);
  await api.unsplit(id);
  try {
    return await api.split(id, children);
  } catch (error) {
    try {
      const restored = await api.split(id, previous);
      const links = parent.children.map((child) => child.recurring_id);
      if (links.some((link) => link != null)) {
        if (
          !restored.children ||
          restored.children.length !== links.length ||
          !api.updateRecurring
        )
          throw new Error(
            "Could not restore recurring links to the split children"
          );
        for (let index = 0; index < links.length; index++) {
          if (links[index] != null)
            await api.updateRecurring(
              restored.children[index].id,
              links[index]!
            );
        }
      }
    } catch (restoreError) {
      throw new Error(
        `The split could not be saved or restored. Check transaction ${id} in Lunch Money. ${restoreError instanceof Error ? restoreError.message : "Restore failed"}`
      );
    }
    throw new Error(
      `Could not save the new split. The original allocation was restored with new child IDs. ${error instanceof Error ? error.message : "Split failed"}`
    );
  }
}
