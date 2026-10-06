import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "../client";
import { createDemoClient } from "../demo-client";
import {
  amountForEditing,
  amountUnits,
  applySplitRecurringLinks,
  canGroupTransaction,
  defaultSplitAmounts,
  equalSplitAmounts,
  groupError,
  replaceSplitWithRestore,
  remainingSplitAmount,
  reviewSplitChildren,
  splitCategoryError,
  splitError,
  suggestRecurringItems,
} from "../transaction-structure";

describe("transaction structure validation", () => {
  it("adds four decimal place allocations exactly, including credits", () => {
    expect(amountForEditing("12.0000")).toBe("12.00");
    expect(amountForEditing("12.3400")).toBe("12.34");
    expect(amountForEditing("12.3456")).toBe("12.3456");
    expect(amountUnits("0.0001")).toBe(1);
    expect(amountUnits("-12.3456")).toBe(-123456);
    expect(
      splitError({ amount: "0.30" }, [
        { amount: "0.10", payee: "A" },
        { amount: "0.20", payee: "B" },
      ])
    ).toBeNull();
    expect(
      splitError({ amount: "-1.0001" }, [
        { amount: "-0.5000", payee: "A" },
        { amount: "-0.5001", payee: "B" },
      ])
    ).toBeNull();
    expect(
      splitError({ amount: "0.30" }, [
        { amount: "0.10", payee: "A" },
        { amount: "0.19", payee: "B" },
      ])
    ).toMatch(/add up/);
  });

  it("starts ordinary splits in cents, even for an odd cent total", () => {
    expect(defaultSplitAmounts("85.25")).toEqual(["42.63", "42.62"]);
    expect(defaultSplitAmounts("-85.25")).toEqual(["-42.63", "-42.62"]);
    expect(defaultSplitAmounts("0.01")).toEqual(["0.005", "0.005"]);
    expect(equalSplitAmounts("10.01", 3)).toEqual(["3.34", "3.34", "3.33"]);
    expect(remainingSplitAmount("2250.00", ["2100.00"])).toBe("150.00");
    expect(remainingSplitAmount("2250.00", ["bad"])).toBeNull();
  });

  it("suggests existing recurring items by payee and amount without assigning them", async () => {
    const items = await createDemoClient().getRecurringItems();
    const draft = {
      payee: "Utilities",
      amount: "145.00",
      currency: "usd" as const,
      date: "2026-09-01",
      manual_account_id: null,
      plaid_account_id: null,
    };
    expect(suggestRecurringItems(items, draft)[0]?.id).toBe(2004);
    expect(
      suggestRecurringItems(items, {
        ...draft,
        payee: "Rent",
        amount: "2100.00",
      })[0]?.id
    ).toBe(2001);
    expect(suggestRecurringItems(items, { ...draft, currency: "eur" })).toEqual(
      []
    );
    expect(
      suggestRecurringItems(
        [
          {
            ...items[3],
            transaction_criteria: {
              ...items[3].transaction_criteria,
              plaid_account_id: 999,
            },
          },
        ],
        draft
      )
    ).toEqual([]);
    expect(
      suggestRecurringItems([{ ...items[3], status: "suggested" }], draft)
    ).toEqual([]);
  });

  it("keeps successful recurring links when another split child fails", async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ recurring_id: 21 })
      .mockRejectedValueOnce(new Error("Child update rejected"));
    expect(
      await applySplitRecurringLinks(
        [
          { id: 10, recurring_id: null },
          { id: 11, recurring_id: null },
        ],
        [21, 22],
        update
      )
    ).toEqual({ actual: [21, null], failures: [1] });
    expect(update.mock.calls).toEqual([
      [10, 21],
      [11, 22],
    ]);
  });

  it("requires a category for each part without a recurring link", () => {
    const parts = [
      { amount: "6", payee: "Rent", category_id: 7 },
      { amount: "4", payee: "Utilities", category_id: null },
    ];
    expect(splitCategoryError(parts, [null, null])).toMatch(/split 2/);
    expect(splitCategoryError(parts, [null, 2004])).toBeNull();
    expect(splitCategoryError(parts, [null])).toMatch(/each split/i);
    expect(
      splitCategoryError(
        [
          { amount: "6", payee: "A" },
          { amount: "4", payee: "B" },
        ],
        [null, null],
        2
      )
    ).toBeNull();
  });

  it("marks every saved part reviewed and keeps failed reviews retryable", async () => {
    const children = [
      { id: 10, status: "reviewed" as const },
      { id: 11, status: "unreviewed" as const },
      { id: 12, status: "unreviewed" as const },
    ];
    const update = vi
      .fn()
      .mockResolvedValueOnce({ status: "reviewed" })
      .mockRejectedValueOnce(new Error("Temporary failure"));
    expect(await reviewSplitChildren(children, update)).toEqual({
      statuses: ["reviewed", "reviewed", "unreviewed"],
      failures: [2],
    });
    expect(update.mock.calls).toEqual([[11], [12]]);
  });

  it("rejects missing, reversed, or malformed split values", () => {
    expect(
      splitError({ amount: "10" }, [{ amount: "10", payee: "A" }])
    ).toMatch(/two/);
    expect(
      splitError({ amount: "10" }, [
        { amount: "-1", payee: "A" },
        { amount: "11", payee: "B" },
      ])
    ).toMatch(/direction/);
    expect(
      splitError({ amount: "10" }, [
        { amount: "0", payee: "A" },
        { amount: "10", payee: "B" },
      ])
    ).toMatch(/nonzero/);
    expect(
      splitError({ amount: "10" }, [
        { amount: "1.00001", payee: "A" },
        { amount: "8.99999", payee: "B" },
      ])
    ).toMatch(/nonzero/);
    expect(
      splitError({ amount: "10" }, [
        { amount: "5", payee: " " },
        { amount: "5", payee: "B" },
      ])
    ).toMatch(/payee/);
  });

  it("rejects duplicate groups and ineligible transactions", () => {
    expect(groupError({ ids: [1, 1], payee: "A", date: "2026-09-01" })).toMatch(
      /different/
    );
    expect(
      groupError({ ids: [1, 2], payee: "A", date: "2026-09-01" })
    ).toBeNull();
    const eligible = {
      is_pending: false,
      status: "reviewed" as const,
      recurring_id: null,
      is_split_parent: false,
      split_parent_id: null,
      is_group_parent: false,
      group_parent_id: null,
    };
    expect(canGroupTransaction(eligible)).toBe(true);
    expect(canGroupTransaction({ ...eligible, split_parent_id: 9 })).toBe(
      false
    );
    expect(canGroupTransaction({ ...eligible, recurring_id: 9 })).toBe(false);
    expect(canGroupTransaction({ ...eligible, is_pending: true })).toBe(false);
  });
});

describe("group parent edits", () => {
  it("updates review, payee, and category without changing group membership", async () => {
    const client = createDemoClient();
    const { transactions } = await client.getTransactionsForMonth(2026, 9);
    const members = transactions.filter(canGroupTransaction).slice(0, 2);
    expect(members).toHaveLength(2);

    const group = await client.groupTransactions({
      ids: members.map(({ id }) => id),
      payee: "Original group",
      date: "2026-09-01",
      category_id: null,
      status: "unreviewed",
    });
    const updated = await client.updateTransaction(group.id, {
      status: "reviewed",
      payee: "Shared purchase",
      category_id: 2,
    });

    expect(updated).toMatchObject({
      id: group.id,
      status: "reviewed",
      payee: "Shared purchase",
      category_id: 2,
    });
    expect(updated.children?.map(({ id }) => id)).toEqual(
      members.map(({ id }) => id)
    );
    const month = await client.getTransactionsForMonth(2026, 9);
    expect(month.transactions.find(({ id }) => id === group.id)).toMatchObject({
      status: "reviewed",
      payee: "Shared purchase",
      category_id: 2,
    });
    expect(
      month.transactions.some(({ id }) =>
        members.some((member) => member.id === id)
      )
    ).toBe(false);
    expect((await client.getTransaction(members[0].id)).group_parent_id).toBe(
      group.id
    );
  });
});

describe("split replacement", () => {
  const parent = {
    amount: "10",
    is_split_parent: true,
    children: [
      {
        amount: "4",
        payee: "Old A",
        date: "2026-09-01",
        category_id: 5,
        tag_ids: [3],
        notes: "old",
      },
      {
        amount: "6",
        payee: "Old B",
        date: "2026-09-01",
        category_id: null,
        tag_ids: [],
        notes: null,
      },
    ],
  } as Transaction;
  const next = [
    { amount: "3", payee: "New A" },
    { amount: "7", payee: "New B" },
  ];

  it("restores all old child fields when the new split fails", async () => {
    const failure = new Error("Rejected by API");
    const get = vi.fn().mockResolvedValue(parent);
    const unsplit = vi.fn().mockResolvedValue(undefined);
    const split = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(parent);
    await expect(
      replaceSplitWithRestore(7, next, { get, unsplit, split })
    ).rejects.toThrow(
      /original allocation was restored with new child IDs.*Rejected by API/
    );
    expect(unsplit).toHaveBeenCalledWith(7);
    expect(split).toHaveBeenNthCalledWith(1, 7, next);
    expect(split).toHaveBeenNthCalledWith(2, 7, [
      {
        amount: "4",
        payee: "Old A",
        date: "2026-09-01",
        category_id: 5,
        tag_ids: [3],
        notes: "old",
      },
      {
        amount: "6",
        payee: "Old B",
        date: "2026-09-01",
        category_id: null,
        tag_ids: [],
        notes: null,
      },
    ]);
  });

  it("restores recurring links to recreated children when replacement fails", async () => {
    const linkedParent = {
      ...parent,
      children: parent.children!.map((child, index) => ({
        ...child,
        recurring_id: index === 0 ? 201 : null,
      })),
    } as Transaction;
    const updateRecurring = vi.fn().mockResolvedValue(undefined);
    const split = vi
      .fn()
      .mockRejectedValueOnce(new Error("Replacement rejected"))
      .mockResolvedValueOnce({
        children: [{ id: 801 }, { id: 802 }],
      });

    await expect(
      replaceSplitWithRestore(7, next, {
        get: async () => linkedParent,
        unsplit: async () => undefined,
        split,
        updateRecurring,
      })
    ).rejects.toThrow(/original allocation was restored/);
    expect(updateRecurring).toHaveBeenCalledExactlyOnceWith(801, 201);
  });

  it("does not remove a split if children could not be loaded", async () => {
    const unsplit = vi.fn();
    await expect(
      replaceSplitWithRestore(7, next, {
        get: async () => ({ is_split_parent: true }) as Transaction,
        unsplit,
        split: vi.fn(),
      })
    ).rejects.toThrow(/load/);
    expect(unsplit).not.toHaveBeenCalled();
  });

  it("does not remove a split when the replacement total is invalid", async () => {
    const unsplit = vi.fn();
    await expect(
      replaceSplitWithRestore(
        7,
        [
          { amount: "2", payee: "A" },
          { amount: "7", payee: "B" },
        ],
        {
          get: async () => parent,
          unsplit,
          split: vi.fn(),
        }
      )
    ).rejects.toThrow(/add up/);
    expect(unsplit).not.toHaveBeenCalled();
  });

  it("reports a restore failure with the affected transaction id", async () => {
    await expect(
      replaceSplitWithRestore(7, next, {
        get: async () => parent,
        unsplit: async () => undefined,
        split: vi
          .fn()
          .mockRejectedValueOnce(new Error("new failed"))
          .mockRejectedValueOnce(new Error("restore failed")),
      })
    ).rejects.toThrow(/transaction 7.*restore failed/);
  });
});

describe("demo structure lifecycle", () => {
  it("rejects an uncategorized split unless each part has a category or recurring choice", async () => {
    const client = createDemoClient();
    const month = await client.getTransactionsForMonth(2026, 9);
    const original = month.transactions.find(
      (tx) =>
        !tx.is_pending && tx.category_id == null && tx.recurring_id == null
    )!;
    const [first, second] = defaultSplitAmounts(original.amount)!;
    await expect(
      client.splitTransaction(original.id, [
        { amount: first, payee: "A" },
        { amount: second, payee: "B" },
      ])
    ).rejects.toThrow(/category or recurring/);
  });

  it("edits an ordinary split part after creation without replacing it", async () => {
    const client = createDemoClient();
    const month = await client.getTransactionsForMonth(2026, 9);
    const original = month.transactions.find(
      (tx) =>
        !tx.is_pending &&
        tx.recurring_id == null &&
        tx.category_id != null &&
        Number(tx.amount) > 0
    )!;
    const [first, second] = defaultSplitAmounts(original.amount)!;
    const split = await client.splitTransaction(original.id, [
      { amount: first, payee: "Rent", category_id: 2 },
      { amount: second, payee: "Utilities", category_id: 3 },
    ]);
    const childId = split.children![0].id;
    await client.updateTransaction(childId, {
      payee: "Apartment rent",
      category_id: 4,
      status: "reviewed",
      notes: "Updated after splitting",
    });
    expect(await client.getTransaction(childId)).toMatchObject({
      id: childId,
      split_parent_id: original.id,
      payee: "Apartment rent",
      category_id: 4,
      status: "reviewed",
      notes: "Updated after splitting",
    });
    expect(
      (await client.getTransaction(original.id)).children?.[0]
    ).toMatchObject({
      id: childId,
      payee: "Apartment rent",
      category_id: 4,
    });
    await expect(
      client.updateTransaction(childId, { category_id: null })
    ).rejects.toThrow(/category or recurring/);
  });

  it("links a saved split child to recurring without replacing the split", async () => {
    const client = createDemoClient();
    const month = await client.getTransactionsForMonth(2026, 9);
    const original = month.transactions.find(
      (tx) => !tx.is_pending && tx.recurring_id == null && Number(tx.amount) > 0
    )!;
    const [first, second] = defaultSplitAmounts(original.amount)!;
    const split = await client.splitTransaction(original.id, [
      { amount: first, payee: "Rent" },
      { amount: second, payee: "Utilities" },
    ]);
    const [rentId, utilitiesId] = split.children!.map((child) => child.id);

    await client.updateSplitChildRecurring(rentId, 2001);
    await client.updateSplitChildRecurring(utilitiesId, 2004);
    expect((await client.getTransaction(original.id)).children).toMatchObject([
      { id: rentId, recurring_id: 2001 },
      { id: utilitiesId, recurring_id: 2004 },
    ]);
    expect(
      (await client.getTransactionsForMonth(2026, 9)).transactions.find(
        (tx) => tx.id === rentId
      )?.recurring_id
    ).toBe(2001);
    expect(
      (await client.getTransactionsForMonth(2026, 9)).transactions.find(
        (tx) => tx.id === utilitiesId
      )?.recurring_id
    ).toBe(2004);
  });

  it("creates, replaces, and removes a split in the monthly list", async () => {
    const client = createDemoClient();
    const before = await client.getTransactionsForMonth(2026, 9);
    const transaction = before.transactions.find(
      (tx) => !tx.is_pending && tx.recurring_id == null && Number(tx.amount) > 0
    )!;
    const half = Number(transaction.amount) / 2;
    const children = [
      { amount: String(half), payee: "Part A" },
      { amount: String(half), payee: "Part B" },
    ];
    const split = await client.splitTransaction(transaction.id, children);
    expect(split.children).toHaveLength(2);
    let month = await client.getTransactionsForMonth(2026, 9);
    expect(month.transactions.some((tx) => tx.id === transaction.id)).toBe(
      false
    );
    expect(
      month.transactions.filter((tx) => tx.split_parent_id === transaction.id)
    ).toHaveLength(2);

    const replaced = await client.replaceSplit(transaction.id, [
      { amount: String(half), payee: "Edited A" },
      { amount: String(half), payee: "Edited B" },
    ]);
    expect(replaced.children?.[0].payee).toBe("Edited A");
    expect(replaced.children?.[0].id).not.toBe(split.children?.[0].id);
    await client.unsplitTransaction(transaction.id);
    month = await client.getTransactionsForMonth(2026, 9);
    expect(
      month.transactions.find((tx) => tx.id === transaction.id)?.is_split_parent
    ).toBe(false);
    expect(
      month.transactions.some((tx) => tx.split_parent_id === transaction.id)
    ).toBe(false);
  });

  it("groups and restores selected transactions", async () => {
    const client = createDemoClient();
    const before = await client.getTransactionsForMonth(2026, 9);
    const selected = before.transactions
      .filter(canGroupTransaction)
      .slice(0, 2);
    const group = await client.groupTransactions({
      ids: selected.map((tx) => tx.id),
      date: "2026-09-15",
      payee: "Household",
    });
    expect(group.children?.map((tx) => tx.id)).toEqual(
      selected.map((tx) => tx.id)
    );
    const during = await client.getTransactionsForMonth(2026, 9);
    expect(during.transactions.some((tx) => tx.id === group.id)).toBe(true);
    expect(
      during.transactions.some((tx) =>
        selected.some((item) => item.id === tx.id)
      )
    ).toBe(false);
    await client.ungroupTransaction(group.id);
    const after = await client.getTransactionsForMonth(2026, 9);
    expect(after.transactions.some((tx) => tx.id === group.id)).toBe(false);
    expect(
      selected.every((item) =>
        after.transactions.some((tx) => tx.id === item.id)
      )
    ).toBe(true);
  });
});
