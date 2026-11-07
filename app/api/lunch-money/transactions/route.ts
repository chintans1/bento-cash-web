import { z } from "zod";
import type { CreateTransactionsBody } from "@lunch-money/lunch-money-js-v2";
import {
  connectionQuery,
  lunchMoneyRoute,
  monthQuery,
} from "@/lib/server/lunch-money-route";

export const GET = (request: Request) =>
  lunchMoneyRoute(request, monthQuery, (client, { year, month }) =>
    client.getTransactionsForMonth(year, month)
  );

const createSchema = connectionQuery.extend({
  data: z.object({
    transactions: z
      .array(
        z.object({
          date: z.iso.date(),
          amount: z.number().finite(),
          payee: z.string().min(1),
          currency: z.literal("usd"),
          manual_account_id: z.number().int().positive(),
          external_id: z.string().min(1),
        })
      )
      .min(1)
      .max(500),
    skip_balance_update: z.literal(true),
  }),
});

export const POST = (request: Request) =>
  lunchMoneyRoute(request, createSchema, (client, { data }) =>
    client.createTransactions(data as CreateTransactionsBody)
  );
