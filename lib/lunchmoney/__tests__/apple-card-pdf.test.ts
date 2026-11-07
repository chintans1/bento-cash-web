import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAppleCardPdf } from "../apple-card-pdf";

const fixturePath = fileURLToPath(
  new URL(
    "../../../test/fixtures/apple-card-statement-synthetic.pdf",
    import.meta.url
  )
);

describe("Apple Card PDF extraction", () => {
  it("reads a statement through PDF.js and excludes the installment section", async () => {
    const bytes = await readFile(fixturePath);
    const file = new File([bytes], "apple-card-statement-synthetic.pdf", {
      type: "application/pdf",
    });

    const result = await parseAppleCardPdf(file);

    expect(result.source).toBe("pdf");
    expect(
      result.rows.map(({ date, payee, amount }) => ({ date, payee, amount }))
    ).toEqual([
      {
        date: "2026-09-02",
        payee: "SAMPLE PAYMENT FROM ACCOUNT 0000",
        amount: -50,
      },
      { date: "2026-09-03", payee: "SAMPLE BOOKSTORE", amount: 100 },
      { date: "2026-09-07", payee: "SAMPLE GROCERY", amount: 23.45 },
    ]);
  });
});
