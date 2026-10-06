import { z } from "zod";
import {
  connectionQuery,
  lunchMoneyRoute,
} from "@/lib/server/lunch-money-route";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const parsedId = z.coerce.number().int().positive().safeParse(id);
  if (!parsedId.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return lunchMoneyRoute(request, connectionQuery, (client) =>
    client.ungroupTransaction(parsedId.data)
  );
}
