import { z } from "zod";
import type { TransactionPatch } from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  lunchMoneyRoute,
  positiveId,
  recordBody,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({
  transactions: z.array(recordBody.and(z.object({ id: positiveId }))).min(1),
});

export const PATCH = (request: Request) =>
  lunchMoneyRoute(request, updateSchema, (client, { transactions }) =>
    client.updateTransactions(
      transactions as (TransactionPatch & { id: number })[]
    )
  );
