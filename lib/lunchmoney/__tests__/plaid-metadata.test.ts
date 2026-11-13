import { expect, it } from "vitest";
import { parsePlaidMetadata, plaidMerchantLogo } from "../plaid-metadata";

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
