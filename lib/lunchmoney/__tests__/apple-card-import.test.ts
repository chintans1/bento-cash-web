import { describe, expect, it } from "vitest";
import {
  findAppleCardDuplicateIds,
  parseAppleCardCsv,
  parseAppleCardPdfLines,
} from "../apple-card-import";

describe("Apple Card imports", () => {
  it("reads Apple's CSV columns, quoted descriptions, payments, and repeated charges", () => {
    const csv = [
      "Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD)",
      '10/03/2026,10/04/2026,"SHOP, INC",Shop,Shopping,Purchase,64.31',
      '10/03/2026,10/04/2026,"SHOP, INC",Shop,Shopping,Purchase,64.31',
      "10/05/2026,10/06/2026,Payment,Payment,,Payment,100.00",
    ].join("\n");
    const result = parseAppleCardCsv(csv);
    expect(
      result.rows.map(({ date, payee, amount }) => ({ date, payee, amount }))
    ).toEqual([
      { date: "2026-10-03", payee: "SHOP, INC", amount: 64.31 },
      { date: "2026-10-03", payee: "SHOP, INC", amount: 64.31 },
      { date: "2026-10-05", payee: "Payment", amount: -100 },
    ]);
    expect(result.rows[0].id).not.toBe(result.rows[1].id);
    expect(parseAppleCardCsv(csv).rows).toEqual(result.rows);
  });

  it("rejects invalid dates rather than silently skipping charges", () => {
    expect(() =>
      parseAppleCardCsv(
        "Transaction Date,Description,Amount (USD)\n02/30/2026,Shop,12.00"
      )
    ).toThrow(/row 2/);
  });

  it("reads PDF transaction, payment, and interest sections without Daily Cash columns", () => {
    const result = parseAppleCardPdfLines([
      "Apple Card Statement October 2026",
      "Transactions",
      "10/03/2026 FOO BAR 2% $1.29 $64.31",
      "Payments",
      "10/05/2026 PAYMENT RECEIVED $100.00",
      "Apple Card Monthly Installments",
      "06/12/2026 OLD FINANCED PURCHASE $599.00",
      "Daily Cash",
      "10/03/2026 REWARD $1.29",
      "Interest Charged",
      "10/31/2026 PURCHASE INTEREST $4.20",
    ]);
    expect(result.rows.map(({ payee, amount }) => ({ payee, amount }))).toEqual(
      [
        { payee: "FOO BAR", amount: 64.31 },
        { payee: "PAYMENT RECEIVED", amount: -100 },
        { payee: "PURCHASE INTEREST", amount: 4.2 },
      ]
    );
  });

  it("rejects a partially unreadable PDF table", () => {
    expect(() =>
      parseAppleCardPdfLines([
        "Apple Card",
        "Transactions",
        "10/01/2026 SHOP $12.00",
        "10/02/2026 BROKEN ROW",
      ])
    ).toThrow(/could not be read reliably/);
  });

  it("matches prior imports by external ID and counts identical charges separately", () => {
    const rows = parseAppleCardCsv(
      [
        "Transaction Date,Description,Amount (USD)",
        "10/03/2026,Shop,12.00",
        "10/03/2026,Shop,12.00",
      ].join("\n")
    ).rows;
    const duplicates = findAppleCardDuplicateIds(rows, [
      {
        date: "2026-10-03",
        payee: "Renamed merchant",
        amount: "12.00",
        external_id: rows[0].id,
      },
    ]);
    expect([...duplicates]).toEqual([rows[0].id]);
  });
});
