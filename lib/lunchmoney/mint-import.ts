import type { ManualAccount } from "@lunch-money/lunch-money-js-v2";
import {
  accountKey,
  isLiabilityType,
  type NormalizedAccount,
} from "../account-utils";
import type { BalanceHistoryAccount } from "./client";

export const MINT_IMPORT_INSTITUTION = "Bento Cash import";
export const MINT_IMPORT_ACCOUNTS = {
  assets: {
    name: "Mint historical assets",
    externalId: "bento-cash:mint-aggregate-assets:v1",
    type: "other asset",
  },
  debts: {
    name: "Mint historical debts",
    externalId: "bento-cash:mint-aggregate-debts:v1",
    type: "other liability",
  },
} as const;

export type MintConflictPolicy = "keep_lunch_money" | "match_mint";
export type MintImportSide = keyof typeof MINT_IMPORT_ACCOUNTS;

export type MintBalanceRow = {
  month: string;
  assets: number;
  debts: number;
  net: number;
};

export type MintCsvData = {
  rows: MintBalanceRow[];
  warnings: string[];
};

export type MintImportTarget = {
  accountType: "manual" | "deleted";
  accountId: number;
  side: MintImportSide;
};

export type MintImportPreviewRow = MintBalanceRow & {
  lunchMoneyAssets: number;
  lunchMoneyDebts: number;
  lunchMoneyNet: number;
  hasLunchMoneyHistory: boolean;
  assetAdjustment: number;
  debtAdjustment: number;
  resultNet: number;
  action: "import" | "keep" | "match";
};

export type MintImportPreview = {
  rows: MintImportPreviewRow[];
  firstMonth: string;
  lastMonth: string;
  conflictMonths: number;
  emptyMonths: number;
  keptMonths: number;
  matchedMonths: number;
  negativeAdjustments: number;
  signature: string;
};

export class MintImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MintImportError";
  }
}

/** A small RFC 4180 parser so quoted currency values retain their commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted)
    throw new MintImportError("The CSV has an unclosed quoted value.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseMonth(value: string, line: number): string {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(value.trim());
  const monthIndex = match
    ? MONTHS.findIndex(
        (month) => month.toLowerCase() === match[1].toLowerCase()
      )
    : -1;
  if (!match || monthIndex < 0) {
    throw new MintImportError(
      `Line ${line}: expected a month such as “May 2018”.`
    );
  }
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseMoney(value: string, label: string, line: number): number {
  const normalized = value.trim();
  const parenthesized = normalized.startsWith("(") && normalized.endsWith(")");
  const unsigned = parenthesized ? normalized.slice(1, -1).trim() : normalized;
  const sign = unsigned.startsWith("-") ? -1 : 1;
  const magnitude = unsigned.replace(/^-/, "").replace(/^\$/, "");

  if (!/^(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?$/.test(magnitude)) {
    throw new MintImportError(
      `Line ${line}: ${label} is not a valid currency value.`
    );
  }

  const valueInCents = Math.round(Number(magnitude.replaceAll(",", "")) * 100);
  if (!Number.isSafeInteger(valueInCents)) {
    throw new MintImportError(
      `Line ${line}: ${label} is outside the supported currency range.`
    );
  }
  return ((parenthesized ? -1 : sign) * valueInCents) / 100;
}

function currentMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function followingMonth(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseMintTrendsCsv(
  text: string,
  now = new Date()
): MintCsvData {
  const csv = parseCsv(text.replace(/^\uFEFF/, ""));
  if (csv.length < 2)
    throw new MintImportError("The CSV does not contain any balance rows.");

  const headers = csv[0].map((header) => header.trim().toLowerCase());
  const expected = ["dates", "assets", "debts", "net"];
  if (
    headers.length !== expected.length ||
    expected.some((value, i) => headers[i] !== value)
  ) {
    throw new MintImportError(
      "Expected the Mint trends columns DATES, Assets, Debts, and NET in that order."
    );
  }

  const rows = csv.slice(1).map((values, index) => {
    const line = index + 2;
    if (values.length !== 4) {
      throw new MintImportError(
        `Line ${line}: expected 4 columns, found ${values.length}.`
      );
    }
    const month = parseMonth(values[0], line);
    const assets = parseMoney(values[1], "Assets", line);
    const debts = parseMoney(values[2], "Debts", line);
    const net = parseMoney(values[3], "NET", line);

    if (assets < 0 || debts < 0) {
      throw new MintImportError(
        `Line ${line}: Assets and Debts must be positive balances.`
      );
    }
    if (Math.round((assets - debts - net) * 100) !== 0) {
      throw new MintImportError(
        `Line ${line}: NET does not equal Assets minus Debts.`
      );
    }
    if (month >= currentMonth(now)) {
      throw new MintImportError(
        `Line ${line}: ${month} is not a past month and cannot be written to balance history.`
      );
    }
    return { month, assets, debts, net };
  });

  rows.sort((a, b) => a.month.localeCompare(b.month));
  const duplicate = rows.find(
    (row, index) => rows[index - 1]?.month === row.month
  );
  if (duplicate)
    throw new MintImportError(
      `The CSV contains ${duplicate.month} more than once.`
    );

  const gaps: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (followingMonth(rows[i - 1].month) !== rows[i].month) {
      gaps.push(`${rows[i - 1].month} to ${rows[i].month}`);
    }
  }

  return {
    rows,
    warnings:
      gaps.length === 0
        ? []
        : [
            `The export skips ${gaps.length} month range${gaps.length === 1 ? "" : "s"}. Missing months will not be changed.`,
          ],
  };
}

function sourceKey(source: BalanceHistoryAccount["source"]): string {
  switch (source.type) {
    case "manual":
      return `manual-${source.manual_account_id}`;
    case "plaid":
      return `plaid-${source.plaid_account_id}`;
    case "crypto_manual":
      return `crypto_manual-${source.crypto_manual_id}`;
    case "crypto_synced":
      return `crypto_synced-${source.crypto_synced_id}-${source.symbol}`;
    case "deleted":
      return `deleted-${source.deleted_account_id}`;
  }
}

function targetKey(target: MintImportTarget): string {
  return `${target.accountType}-${target.accountId}`;
}

function sideForSource(
  source: BalanceHistoryAccount["source"],
  accountLiabilities: Map<string, boolean>
): "assets" | "debts" {
  if (source.type === "manual") {
    return accountLiabilities.get(
      accountKey("manual", source.manual_account_id)
    )
      ? "debts"
      : "assets";
  }
  if (source.type === "plaid") {
    return accountLiabilities.get(accountKey("plaid", source.plaid_account_id))
      ? "debts"
      : "assets";
  }
  if (source.type === "deleted") {
    return source.account_type && isLiabilityType(source.account_type)
      ? "debts"
      : "assets";
  }
  return "assets";
}

export type EffectiveMonthTotal = {
  month: string;
  assets: number;
  debts: number;
  hasHistory: boolean;
};

export function effectiveHistoryForMonths(
  months: string[],
  history: BalanceHistoryAccount[],
  accounts: NormalizedAccount[],
  excludedTargets: MintImportTarget[] = []
): EffectiveMonthTotal[] {
  const accountLiabilities = new Map(
    accounts.map((account) => [account.id, account.isLiability])
  );
  const excluded = new Set(excludedTargets.map(targetKey));
  const totals = new Map(
    months.map((month) => [
      month,
      { month, assets: 0, debts: 0, hasHistory: false },
    ])
  );

  for (const account of history) {
    if (excluded.has(sourceKey(account.source))) continue;

    const balances = [...account.balances]
      .filter((balance) => balance.type === "historical")
      .sort((a, b) => a.month.localeCompare(b.month));
    const first = balances[0]?.month;
    const last = balances.at(-1)?.month;
    if (!first || !last) continue;

    const side = sideForSource(account.source, accountLiabilities);
    let carried: number | null = null;
    let balanceIndex = 0;

    for (const month of months) {
      if (month < first || month > last) continue;
      while (
        balanceIndex < balances.length &&
        balances[balanceIndex].month <= month
      ) {
        carried = balances[balanceIndex].to_base;
        balanceIndex++;
      }
      if (carried === null) continue;
      const total = totals.get(month)!;
      total[side] += carried;
      total.hasHistory = true;
    }
  }

  return months.map((month) => {
    const total = totals.get(month)!;
    return {
      ...total,
      assets: Math.round(total.assets * 100) / 100,
      debts: Math.round(total.debts * 100) / 100,
    };
  });
}

function targetForManual(
  accounts: ManualAccount[],
  side: MintImportSide
): MintImportTarget | null {
  const { externalId } = MINT_IMPORT_ACCOUNTS[side];
  const matches = accounts.filter(
    (account) => account.external_id === externalId
  );
  if (matches.length > 1) {
    throw new MintImportError(
      `More than one ${side} import account has the same external ID.`
    );
  }
  return matches[0]
    ? { accountType: "manual", accountId: matches[0].id, side }
    : null;
}

function targetForDeleted(
  history: BalanceHistoryAccount[],
  side: MintImportSide
): MintImportTarget | null {
  const definition = MINT_IMPORT_ACCOUNTS[side];
  const matches = history.filter(
    ({ source }) =>
      source.type === "deleted" &&
      source.name === definition.name &&
      source.institution_name === MINT_IMPORT_INSTITUTION &&
      source.account_type === definition.type
  );
  if (matches.length > 1) {
    throw new MintImportError(
      `More than one deleted ${side} import account was found.`
    );
  }
  const source = matches[0]?.source;
  return source?.type === "deleted"
    ? { accountType: "deleted", accountId: source.deleted_account_id, side }
    : null;
}

export function findMintImportTargets(
  manualAccounts: ManualAccount[],
  history: BalanceHistoryAccount[]
): MintImportTarget[] {
  return (["assets", "debts"] as const).flatMap((side) => {
    const manual = targetForManual(manualAccounts, side);
    const deleted = targetForDeleted(history, side);
    if (manual && deleted) {
      throw new MintImportError(
        `Both an active and deleted ${side} import account were found.`
      );
    }
    return manual ?? deleted ?? [];
  });
}

export function buildMintImportPreview(
  rows: MintBalanceRow[],
  history: BalanceHistoryAccount[],
  accounts: NormalizedAccount[],
  targets: MintImportTarget[],
  policy: MintConflictPolicy
): MintImportPreview {
  if (rows.length === 0)
    throw new MintImportError("There are no Mint rows to import.");
  const existing = effectiveHistoryForMonths(
    rows.map((row) => row.month),
    history,
    accounts,
    targets
  );

  const previewRows = rows.map<MintImportPreviewRow>((row, index) => {
    const lunchMoney = existing[index];
    const action = !lunchMoney.hasHistory
      ? "import"
      : policy === "keep_lunch_money"
        ? "keep"
        : "match";
    const assetAdjustment =
      action === "keep"
        ? 0
        : Math.round((row.assets - lunchMoney.assets) * 100) / 100;
    const debtAdjustment =
      action === "keep"
        ? 0
        : Math.round((row.debts - lunchMoney.debts) * 100) / 100;
    const resultNet =
      Math.round(
        (lunchMoney.assets +
          assetAdjustment -
          lunchMoney.debts -
          debtAdjustment) *
          100
      ) / 100;

    return {
      ...row,
      lunchMoneyAssets: lunchMoney.assets,
      lunchMoneyDebts: lunchMoney.debts,
      lunchMoneyNet:
        Math.round((lunchMoney.assets - lunchMoney.debts) * 100) / 100,
      hasLunchMoneyHistory: lunchMoney.hasHistory,
      assetAdjustment,
      debtAdjustment,
      resultNet,
      action,
    };
  });

  const signature = previewRows
    .map((row) =>
      [
        row.month,
        row.lunchMoneyAssets.toFixed(2),
        row.lunchMoneyDebts.toFixed(2),
        row.hasLunchMoneyHistory ? "1" : "0",
      ].join(":")
    )
    .join("|");

  return {
    rows: previewRows,
    firstMonth: rows[0].month,
    lastMonth: rows.at(-1)!.month,
    conflictMonths: previewRows.filter((row) => row.hasLunchMoneyHistory)
      .length,
    emptyMonths: previewRows.filter((row) => !row.hasLunchMoneyHistory).length,
    keptMonths: previewRows.filter((row) => row.action === "keep").length,
    matchedMonths: previewRows.filter((row) => row.action === "match").length,
    negativeAdjustments: previewRows.filter(
      (row) => row.assetAdjustment < 0 || row.debtAdjustment < 0
    ).length,
    signature,
  };
}
