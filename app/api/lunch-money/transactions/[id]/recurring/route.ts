import { z } from "zod";
import {
  connectionQuery,
  InvalidLunchMoneyRequest,
  lunchMoneyRoute,
} from "@/lib/server/lunch-money-route";

const schema = connectionQuery.extend({
  recurringId: z.number().int().positive().nullable(),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const transactionId = z.coerce.number().int().positive().safeParse(id);
  if (!transactionId.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return lunchMoneyRoute(request, schema, async (client, { recurringId }) => {
    if (recurringId == null) {
      const current = await client.getTransaction(transactionId.data);
      if (current.split_parent_id != null && current.category_id == null)
        throw new InvalidLunchMoneyRequest(
          "Choose a category before removing this recurring link."
        );
    }
    return client.updateSplitChildRecurring(transactionId.data, recurringId);
  });
}
