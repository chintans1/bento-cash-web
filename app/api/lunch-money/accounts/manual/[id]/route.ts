import { z } from "zod";
import type { LMClient } from "@/lib/lunchmoney/client";
import {
  connectionQuery,
  lunchMoneyRoute,
  recordBody,
} from "@/lib/server/lunch-money-route";

const updateSchema = connectionQuery.extend({ data: recordBody });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const accountId = z.coerce.number().int().positive().safeParse(id);
  if (!accountId.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  return lunchMoneyRoute(request, updateSchema, (client, { data }) =>
    client.updateManualAccount(
      accountId.data,
      data as Parameters<LMClient["updateManualAccount"]>[1]
    )
  );
}
