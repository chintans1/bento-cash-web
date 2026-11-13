import { expect, it } from "vitest";
import {
  parsePlaidMetadata,
  plaidCategorySuggestion,
  plaidMerchantLogo,
  plaidTransactionContext,
} from "../plaid-metadata";

const logo = "https://plaid-merchant-logos.plaid.com/example.png";

it("reads the transaction logo from structured or serialized metadata", () => {
  const data = { logo_url: logo };
  expect(plaidMerchantLogo(parsePlaidMetadata(data))).toBe(logo);
  expect(plaidMerchantLogo(parsePlaidMetadata(JSON.stringify(data)))).toBe(
    logo
  );
});

it("falls back to the merchant counterparty and rejects other origins", () => {
  const data = {
    logo_url: "https://example.com/logo.png",
    counterparties: [
      { type: "payment_app", logo_url: logo.replace("example", "payment") },
      { type: "merchant", logo_url: logo },
    ],
  };
  expect(plaidMerchantLogo(data)).toBe(logo);
  expect(plaidMerchantLogo({ logo_url: data.logo_url })).toBeNull();
  expect(plaidMerchantLogo(parsePlaidMetadata("{"))).toBeNull();
});

it("reads merchant context and both dates from flat or wrapped metadata", () => {
  const transaction = {
    logo_url: logo,
    date: "2026-11-09",
    authorized_date: "2026-11-08",
    pending: false,
    payment_channel: "online",
    counterparties: [
      { type: "merchant", name: "Example Cable", website: "example.com" },
    ],
  };
  const details = plaidTransactionContext(transaction);
  expect(plaidTransactionContext({ transaction })).toEqual(details);
  expect(details).toMatchObject({
    logo,
    merchantName: "Example Cable",
    website: { href: "https://example.com", label: "example.com" },
    channel: "Online",
    authorizedDate: "2026-11-08",
    postedDate: "2026-11-09",
  });
});

it("omits invalid dates, unsafe URLs, and a pending transaction's posted date", () => {
  expect(
    plaidTransactionContext({
      date: "2026-11-09",
      pending: true,
      authorized_date: "2026-02-30",
      website: "https://example.com@unrelated.example",
    })
  ).toMatchObject({
    website: null,
    authorizedDate: null,
    postedDate: null,
  });
});

it("prefers a matching budget category and skips ambiguous or unrelated names", () => {
  const { category } = plaidTransactionContext({
    category: ["Loans and Mortgages"],
    personal_finance_category: {
      primary: "RENT_AND_UTILITIES",
      detailed: "RENT_AND_UTILITIES_INTERNET_AND_CABLE",
    },
  });
  const exact = { id: 1, name: "Internet & Cable" };
  const fallback = { id: 2, name: "Utilities" };
  const unrelated = { id: 3, name: "Loans and Mortgages" };
  expect(plaidCategorySuggestion(category, [fallback, exact])).toBe(exact);
  expect(plaidCategorySuggestion(category, [fallback])).toBe(fallback);
  expect(plaidCategorySuggestion(category, [unrelated])).toBeNull();
  expect(
    plaidCategorySuggestion(category, [exact, { ...exact, id: 4 }, fallback])
  ).toBeNull();
});
