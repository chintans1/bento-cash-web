import { z } from "zod";
import type { TransactionPatch } from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  lunchMoneyRoute,
  recordBody,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({ patch: recordBody });

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const transactionId = z.coerce.number().int().positive().safeParse(id);
  if (!transactionId.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  return lunchMoneyRoute(request, updateSchema, (client, { patch }) =>
    client.updateTransaction(transactionId.data, patch as TransactionPatch)
  );
}
