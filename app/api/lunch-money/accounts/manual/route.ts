import type { LMClient } from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  lunchMoneyRoute,
  recordBody,
} from "@/lib/server/lunch-money-route";

const createSchema = connectionQuery.extend({ data: recordBody });

export const GET = (request: Request) =>
  lunchMoneyRoute(request, connectionQuery, (client) =>
    client.getManualAccounts()
  );

export const POST = (request: Request) =>
  lunchMoneyRoute(request, createSchema, (client, { data }) =>
    client.createManualAccount(
      data as Parameters<LMClient["createManualAccount"]>[0]
    )
  );
