import { describe, expect, it } from "vitest";
import type { Transaction } from "../client";
import {
  canonicalFieldsAtRevision,
  changedPatch,
  comparePendingFirst,
  fieldsAtRevision,
  isInMonth,
  isReviewableTransaction,
  isStructurallyLockedTransaction,
  isTransactionAccountOption,
  matchesReviewFilter,
  reviewCounts,
  transactionAccountPatch,
} from "../transaction-state";

const transaction: Transaction = {
  id: 1,
  date: "2026-09-01",
  amount: "12.0000",
  currency: "usd",
  payee: "Market",
  category_id: null,
  notes: null,
  status: "unreviewed",
  is_pending: false,
  tag_ids: [],
  to_base: 12,
  recurring_id: null,
  original_name: "MARKET 001",
  plaid_account_id: null,
  manual_account_id: 10,
  external_id: null,
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z",
  split_parent_id: null,
  is_group_parent: false,
  group_parent_id: null,
  source: "manual",
};

describe("transaction state", () => {
  it("separates actionable review from pending and attention states", () => {
    const pending = { ...transaction, id: 2, is_pending: true };
    const attention = {
      ...transaction,
      id: 3,
      status: "delete_pending" as const,
    };
    const grouped = { ...transaction, id: 4, is_group_parent: true };

    expect(matchesReviewFilter(transaction, "unreviewed")).toBe(true);
    expect(matchesReviewFilter(pending, "unreviewed")).toBe(false);
    expect(matchesReviewFilter(transaction, "all")).toBe(true);
    expect(matchesReviewFilter(pending, "all")).toBe(true);
    expect(matchesReviewFilter(pending, "pending")).toBe(true);
    expect(matchesReviewFilter(attention, "attention")).toBe(true);
    expect(matchesReviewFilter(grouped, "unreviewed")).toBe(false);
    expect(reviewCounts([transaction, pending, attention, grouped])).toEqual({
      unreviewed: 1,
      pending: 1,
      attention: 1,
    });
  });

  it("pins pending transactions ahead of posted transactions", () => {
    const posted = { ...transaction, id: 2 };
    const pending = { ...transaction, id: 3, is_pending: true };

    expect(comparePendingFirst(pending, posted)).toBe(-1);
    expect(comparePendingFirst(posted, pending)).toBe(1);
    expect(comparePendingFirst(pending, { is_pending: true })).toBe(0);
  });

  it("sends only fields that changed", () => {
    expect(
      changedPatch(transaction, {
        payee: "Market",
        notes: "Groceries",
        tag_ids: [],
      })
    ).toEqual({ notes: "Groceries" });
  });

  it("does not let an older request settle a field edited again", () => {
    const revisions = new Map([
      ["1:payee", 2],
      ["1:category_id", 1],
    ]);

    expect(
      fieldsAtRevision(
        { payee: "Old response", category_id: 4 },
        revisions,
        1,
        1
      )
    ).toEqual({ category_id: 4 });
  });

  it("accepts a current server conversion without installing a stale one", () => {
    const current = new Map([["1:amount", 2]]);

    expect(
      canonicalFieldsAtRevision(
        { amount: "20.00", to_base: 27.5 },
        { amount: "20.00" },
        current,
        1,
        2
      )
    ).toEqual({ amount: "20.00", to_base: 27.5 });
    expect(
      canonicalFieldsAtRevision(
        { amount: "10.00", to_base: 13.75 },
        { amount: "10.00" },
        current,
        1,
        1
      )
    ).toEqual({});
  });

  it("clears the previous account type when moving a transaction", () => {
    expect(transactionAccountPatch({ source: "manual", rawId: 42 })).toEqual({
      manual_account_id: 42,
      plaid_account_id: null,
    });
    expect(transactionAccountPatch()).toEqual({
      manual_account_id: null,
      plaid_account_id: null,
    });
  });

  it("offers only accounts that can accept transaction updates", () => {
    expect(
      isTransactionAccountOption({
        status: "active",
        allowTransactionModifications: true,
      })
    ).toBe(true);
    expect(
      isTransactionAccountOption({
        status: "active",
        allowTransactionModifications: false,
      })
    ).toBe(false);
    expect(
      isTransactionAccountOption({
        status: "closed",
        allowTransactionModifications: true,
      })
    ).toBe(false);
  });

  it("recognizes every transaction shape the update endpoint locks", () => {
    const editable = {
      is_split_parent: false,
      split_parent_id: null,
      is_group_parent: false,
      group_parent_id: null,
    };

    expect(isStructurallyLockedTransaction(editable)).toBe(false);
    expect(
      isStructurallyLockedTransaction({
        ...editable,
        group_parent_id: 12,
      })
    ).toBe(true);
    expect(
      isStructurallyLockedTransaction({
        ...editable,
        is_split_parent: true,
      })
    ).toBe(true);
    expect(isReviewableTransaction(transaction)).toBe(true);
    expect(
      isReviewableTransaction({ ...transaction, is_group_parent: true })
    ).toBe(false);
  });

  it("recognizes whether an edited date remains in the loaded month", () => {
    expect(isInMonth("2026-09-30", 2026, 9)).toBe(true);
    expect(isInMonth("2026-10-01", 2026, 9)).toBe(false);
  });
});
