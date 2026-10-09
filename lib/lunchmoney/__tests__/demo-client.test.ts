import { describe, expect, it } from "vitest";
import { createDemoClient } from "../demo-client";
import { recurringMatch } from "../recurring-match";
import {
  computeNetWorth,
  creditUsage,
  normalizeAccounts,
} from "../../account-utils";
import { computeNetWorthHistory } from "../net-worth-history";

describe("demo transaction data", () => {
  it("keeps the Plaid card limit in its own currency and handles credit usage edges", async () => {
    const { manual, plaid } = await createDemoClient().getAccounts();
    const accounts = normalizeAccounts(manual, plaid);
    const card = accounts.find((account) => account.id === "plaid-1101")!;

    expect(card.creditLimit).toBe(15000);
    expect(creditUsage(card)?.used).toBe(1284.62);
    expect(creditUsage(card)?.available).toBeCloseTo(13715.38);
    expect(
      accounts.find((account) => account.id === "manual-1003")?.creditLimit
    ).toBeNull();
    expect(creditUsage({ ...card, balance: -50 })).toMatchObject({
      used: 0,
      available: 15000,
      percentUsed: 0,
    });
    expect(creditUsage({ ...card, balance: 16000 })).toMatchObject({
      available: 0,
      percentUsed: (16000 / 15000) * 100,
    });
    expect(creditUsage({ ...card, balanceValid: false })).toBeNull();
  });

  it("keeps account balance history aligned with current balances", async () => {
    const client = createDemoClient();
    const [{ manual, plaid }, history] = await Promise.all([
      client.getAccounts(),
      client.getBalanceHistory(),
    ]);
    const accounts = normalizeAccounts(manual, plaid);

    expect(history).toHaveLength(accounts.length);
    expect(history.some(({ source }) => source.type === "plaid")).toBe(true);
    expect(computeNetWorthHistory(history, accounts).at(-1)).toMatchObject(
      computeNetWorth(accounts)
    );
  });

  it("covers the states and relationships exercised by the transaction UI", async () => {
    const client = createDemoClient();
    const [{ transactions }, tags, accounts] = await Promise.all([
      client.getTransactionsForMonth(2026, 9),
      client.getTags(),
      client.getAccounts(),
    ]);

    expect(transactions.some((transaction) => transaction.is_pending)).toBe(
      true
    );
    expect(
      transactions.some(
        (transaction) =>
          transaction.status === "unreviewed" && !transaction.is_pending
      )
    ).toBe(true);
    expect(
      transactions.some((transaction) => transaction.status === "reviewed")
    ).toBe(true);
    expect(
      transactions.some(
        (transaction) => transaction.status === "delete_pending"
      )
    ).toBe(true);
    expect(
      transactions.some((transaction) => transaction.manual_account_id)
    ).toBe(true);
    expect(
      transactions.some((transaction) => transaction.plaid_account_id)
    ).toBe(true);
    expect(
      transactions.every(
        (transaction) =>
          !transaction.is_pending || transaction.plaid_account_id !== null
      )
    ).toBe(true);
    expect(accounts.plaid).toHaveLength(1);
    expect(tags.length).toBeGreaterThan(0);
    expect(
      transactions.some((transaction) => transaction.tag_ids.length > 0)
    ).toBe(true);
  });

  it("includes a linked suggestion without treating it as confirmed recurring", async () => {
    const client = createDemoClient();
    const [{ transactions }, recurringItems] = await Promise.all([
      client.getTransactionsForMonth(2026, 10),
      client.getRecurringItems(),
    ]);
    const suggested = recurringItems.find(
      (item) => item.status === "suggested"
    );

    expect(suggested?.transaction_criteria.payee).toBe("AT&T");
    expect(
      recurringMatch(
        transactions.find((transaction) => transaction.payee === "AT&T")
          ?.recurring_id ?? null,
        recurringItems
      )
    ).toBe("possible");
  });

  it("accepts the editable transaction fields used by the demo", async () => {
    const client = createDemoClient();
    const before = await client.getTransactionsForMonth(2026, 9);
    const id = before.transactions[0].id;

    await expect(
      client.updateTransaction(id, {
        amount: "42.50",
        manual_account_id: 1002,
        plaid_account_id: null,
        tag_ids: [3001, 3002],
      })
    ).resolves.toMatchObject({
      id,
      amount: "42.50",
      to_base: 42.5,
      manual_account_id: 1002,
      plaid_account_id: null,
      tag_ids: [3001, 3002],
    });

    const after = await client.getTransactionsForMonth(2026, 9);
    expect(
      after.transactions.find((transaction) => transaction.id === id)
    ).toMatchObject({
      amount: "42.50",
      to_base: 42.5,
      manual_account_id: 1002,
      tag_ids: [3001, 3002],
    });
  });

  it("moves a dated transaction into its new month", async () => {
    const client = createDemoClient();
    const september = await client.getTransactionsForMonth(2026, 9);
    const transaction = september.transactions[0];

    await client.updateTransaction(transaction.id, { date: "2026-10-02" });

    const [updatedSeptember, october] = await Promise.all([
      client.getTransactionsForMonth(2026, 9),
      client.getTransactionsForMonth(2026, 10),
    ]);
    expect(
      updatedSeptember.transactions.some(({ id }) => id === transaction.id)
    ).toBe(false);
    expect(
      october.transactions.find(({ id }) => id === transaction.id)
    ).toMatchObject({ date: "2026-10-02" });
  });

  it("deletes a transaction from the demo list", async () => {
    const client = createDemoClient();
    const before = await client.getTransactionsForMonth(2026, 9);
    const id = before.transactions[0].id;

    await client.deleteTransaction(id);

    const after = await client.getTransactionsForMonth(2026, 9);
    expect(
      after.transactions.some((transaction) => transaction.id === id)
    ).toBe(false);
    await expect(client.getTransaction(id)).rejects.toThrow(
      "Unknown demo transaction"
    );
  });
});
