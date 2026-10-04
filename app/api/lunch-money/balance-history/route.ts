import { z } from "zod";
import type {
  BalanceHistoryAccountType,
  BalanceHistoryUpdate,
} from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  lunchMoneyRoute,
  positiveId,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({
  accountType: z.enum(["manual", "plaid", "crypto_manual", "deleted"]),
  accountId: positiveId,
  balances: z.array(z.record(z.string(), z.unknown())),
});

export const GET = (request: Request) =>
  lunchMoneyRoute(request, connectionQuery, (client) =>
    client.getBalanceHistory()
  );

export const PUT = (request: Request) =>
  lunchMoneyRoute(request, updateSchema, (client, input) =>
    client.upsertBalanceHistory(
      input.accountType as BalanceHistoryAccountType,
      input.accountId,
      input.balances as BalanceHistoryUpdate[]
    )
  );
