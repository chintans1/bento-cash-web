import { z } from "zod";
import type { TransactionPatch } from "@/lib/lunchmoney/client";
import { SUPPORTED_CURRENCIES } from "@/lib/lunchmoney/currencies";
import { isCurrencyUpdateAllowed } from "@/lib/lunchmoney/transaction-state";
import {
  connectionQuery,
  InvalidLunchMoneyRequest,
  lunchMoneyRoute,
  positiveId,
  recordBody,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({
  transactions: z
    .array(
      recordBody.and(
        z.object({
          id: positiveId,
          currency: z.enum(SUPPORTED_CURRENCIES).optional(),
        })
      )
    )
    .min(1),
});

export const PATCH = (request: Request) =>
  lunchMoneyRoute(request, updateSchema, async (client, { transactions }) => {
    const changes = transactions as (TransactionPatch & { id: number })[];
    const movesToPlaid = new Set(
      changes
        .filter((change) => change.plaid_account_id != null)
        .map(({ id }) => id)
    );
    for (const change of changes) {
      if (change.currency === undefined) continue;
      const current = await client.getTransaction(change.id);
      if (
        !isCurrencyUpdateAllowed(current, change) ||
        (change.currency !== current.currency && movesToPlaid.has(change.id))
      ) {
        throw new InvalidLunchMoneyRequest(
          "Currency can only be changed on manual transactions."
        );
      }
    }
    return client.updateTransactions(changes);
  });
