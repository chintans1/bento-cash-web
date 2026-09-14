import type { Currency, ManualAccount } from "@lunch-money/lunch-money-js-v2";
import { normalizeAccounts } from "../account-utils";
import {
  createManualAccount,
  getFreshBalanceImportData,
  updateManualAccount,
  upsertBalanceHistory,
  type BalanceHistoryAccount,
} from "./client";
import {
  buildMintImportPreview,
  effectiveHistoryForMonths,
  findMintImportTargets,
  MINT_IMPORT_ACCOUNTS,
  MINT_IMPORT_INSTITUTION,
  MintImportError,
  type MintBalanceRow,
  type MintConflictPolicy,
  type MintImportPreview,
  type MintImportSide,
  type MintImportTarget,
} from "./mint-import";

export type MintImportResult = {
  monthsProcessed: number;
  emptyMonthsFilled: number;
  keptMonths: number;
  matchedMonths: number;
  firstMonth: string;
  lastMonth: string;
};

export class StaleMintImportError extends MintImportError {
  constructor() {
    super(
      "Lunch Money balance history changed after this preview. Review the refreshed values before importing."
    );
    this.name = "StaleMintImportError";
  }
}

function lastDayOfMonth(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function targetForSide(
  targets: MintImportTarget[],
  side: MintImportSide
): MintImportTarget | null {
  return targets.find((target) => target.side === side) ?? null;
}

function validateManualTarget(
  target: MintImportTarget,
  manualAccounts: ManualAccount[],
  currency: Currency
): void {
  const account = manualAccounts.find((item) => item.id === target.accountId);
  const definition = MINT_IMPORT_ACCOUNTS[target.side];
  if (!account)
    throw new MintImportError(
      `The ${target.side} import account no longer exists.`
    );
  if (account.type !== definition.type || account.currency !== currency) {
    throw new MintImportError(
      `The existing ${definition.name} account no longer matches the required type and currency.`
    );
  }
}

function validateExistingTargets(
  targets: MintImportTarget[],
  manualAccounts: ManualAccount[],
  currency: Currency
): void {
  for (const target of targets) {
    if (target.accountType === "manual") {
      validateManualTarget(target, manualAccounts, currency);
    }
  }
}

async function ensureTarget(
  side: MintImportSide,
  targets: MintImportTarget[],
  currency: Currency,
  closedOn: string
): Promise<MintImportTarget> {
  const existing = targetForSide(targets, side);
  if (existing?.accountType === "deleted") return existing;

  if (existing) {
    await updateManualAccount(existing.accountId, {
      balance: 0,
      balance_as_of: closedOn,
      status: "closed",
      closed_on: closedOn,
      exclude_from_transactions: true,
    });
    return existing;
  }

  const definition = MINT_IMPORT_ACCOUNTS[side];
  const account = await createManualAccount({
    name: definition.name,
    institution_name: MINT_IMPORT_INSTITUTION,
    type: definition.type,
    balance: 0,
    balance_as_of: closedOn,
    currency,
    status: "closed",
    closed_on: closedOn,
    external_id: definition.externalId,
    exclude_from_transactions: true,
    custom_metadata: {
      bento_cash: {
        kind: "mint_aggregate_balance_history",
        side,
        version: 1,
      },
    },
  });
  return { accountType: "manual", accountId: account.id, side };
}

function prepareFromData(
  rows: MintBalanceRow[],
  policy: MintConflictPolicy,
  data: Awaited<ReturnType<typeof getFreshBalanceImportData>>
): MintImportPreview {
  const targets = findMintImportTargets(data.manual, data.history);
  const accounts = normalizeAccounts(data.manual, data.plaid);
  return buildMintImportPreview(rows, data.history, accounts, targets, policy);
}

export async function prepareMintImport(
  rows: MintBalanceRow[],
  policy: MintConflictPolicy
): Promise<MintImportPreview> {
  return prepareFromData(rows, policy, await getFreshBalanceImportData());
}

function expectedTotals(row: MintImportPreview["rows"][number]) {
  return row.action === "keep"
    ? { assets: row.lunchMoneyAssets, debts: row.lunchMoneyDebts }
    : { assets: row.assets, debts: row.debts };
}

function assertVerified(
  preview: MintImportPreview,
  history: BalanceHistoryAccount[],
  accounts: ReturnType<typeof normalizeAccounts>
) {
  const actual = effectiveHistoryForMonths(
    preview.rows.map((row) => row.month),
    history,
    accounts
  );
  const failed = preview.rows.find((row, index) => {
    const expected = expectedTotals(row);
    return (
      Math.round((actual[index].assets - expected.assets) * 100) !== 0 ||
      Math.round((actual[index].debts - expected.debts) * 100) !== 0
    );
  });
  if (failed) {
    throw new MintImportError(
      `The API accepted the import, but ${failed.month} did not reconcile. Refresh and review the balance history before retrying.`
    );
  }
}

export async function applyMintImport(
  rows: MintBalanceRow[],
  policy: MintConflictPolicy,
  currency: Currency,
  expectedSignature: string
): Promise<MintImportResult> {
  const fresh = await getFreshBalanceImportData();
  const preview = prepareFromData(rows, policy, fresh);
  if (preview.signature !== expectedSignature) {
    throw new StaleMintImportError();
  }

  const closedOn = lastDayOfMonth(preview.lastMonth);
  const existingTargets = findMintImportTargets(fresh.manual, fresh.history);
  validateExistingTargets(existingTargets, fresh.manual, currency);
  const assetTarget = await ensureTarget(
    "assets",
    existingTargets,
    currency,
    closedOn
  );
  const debtTarget = await ensureTarget(
    "debts",
    existingTargets,
    currency,
    closedOn
  );

  await upsertBalanceHistory(
    assetTarget.accountType,
    assetTarget.accountId,
    preview.rows.map((row) => ({
      month: row.month,
      balance: row.assetAdjustment.toFixed(2),
      currency,
    }))
  );
  await upsertBalanceHistory(
    debtTarget.accountType,
    debtTarget.accountId,
    preview.rows.map((row) => ({
      month: row.month,
      balance: row.debtAdjustment.toFixed(2),
      currency,
    }))
  );

  const verified = await getFreshBalanceImportData();
  assertVerified(
    preview,
    verified.history,
    normalizeAccounts(verified.manual, verified.plaid)
  );

  return {
    monthsProcessed: preview.rows.length,
    emptyMonthsFilled: preview.emptyMonths,
    keptMonths: preview.keptMonths,
    matchedMonths: preview.matchedMonths,
    firstMonth: preview.firstMonth,
    lastMonth: preview.lastMonth,
  };
}
