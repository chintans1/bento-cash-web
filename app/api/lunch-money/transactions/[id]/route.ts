import { z } from "zod";
import type { TransactionPatch } from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  InvalidLunchMoneyRequest,
  lunchMoneyRoute,
  recordBody,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({ patch: recordBody });

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const transactionId = z.coerce.number().int().positive().safeParse(id);
  if (!transactionId.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return lunchMoneyRoute(request, connectionQuery, (client) =>
    client.getTransaction(transactionId.data)
  );
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const transactionId = z.coerce.number().int().positive().safeParse(id);
  if (!transactionId.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  return lunchMoneyRoute(request, updateSchema, async (client, { patch }) => {
    const current = await client.getTransaction(transactionId.data);
    const change = patch as TransactionPatch;
    if (
      current.split_parent_id != null &&
      ("category_id" in change ? change.category_id : current.category_id) ==
        null &&
      ("recurring_id" in change ? change.recurring_id : current.recurring_id) ==
        null
    )
      throw new InvalidLunchMoneyRequest(
        "Choose a category or recurring item for this split part."
      );
    return client.updateTransaction(transactionId.data, change);
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const transactionId = z.coerce.number().int().positive().safeParse(id);
  if (!transactionId.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  return lunchMoneyRoute(request, connectionQuery, async (client) => {
    const current = await client.getTransaction(transactionId.data);
    if (
      current.is_split_parent ||
      current.split_parent_id != null ||
      current.is_group_parent ||
      current.group_parent_id != null
    ) {
      throw new InvalidLunchMoneyRequest(
        "Open the split or group editor to manage this transaction."
      );
    }
    await client.deleteTransaction(transactionId.data);
  });
}
