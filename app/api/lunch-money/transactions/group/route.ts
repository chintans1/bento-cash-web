import { z } from "zod";
import { groupError } from "@/lib/lunchmoney/transaction-structure";
import {
  connectionQuery,
  InvalidLunchMoneyRequest,
  lunchMoneyRoute,
  positiveId,
} from "@/lib/server/lunch-money-route";

const groupBody = connectionQuery.extend({
  input: z.object({
    ids: z.array(positiveId).min(2),
    date: z.iso.date(),
    payee: z.string().trim().min(1),
    category_id: positiveId.nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.enum(["reviewed", "unreviewed"]).optional(),
    tag_ids: z.array(positiveId).optional(),
  }),
});

export const POST = (request: Request) =>
  lunchMoneyRoute(request, groupBody, (client, { input }) => {
    const error = groupError(input);
    if (error) throw new InvalidLunchMoneyRequest(error);
    return client.groupTransactions(input);
  });
