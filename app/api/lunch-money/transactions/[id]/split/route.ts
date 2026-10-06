import { z } from "zod";
import type { SplitParts } from "@/lib/lunchmoney/client";
import {
  splitCategoryError,
  splitError,
} from "@/lib/lunchmoney/transaction-structure";
import {
  connectionQuery,
  InvalidLunchMoneyRequest,
  lunchMoneyRoute,
  positiveId,
} from "@/lib/server/lunch-money-route";

const child = z.object({
  amount: z.union([z.string(), z.number()]),
  payee: z.string().min(1),
  date: z.iso.date().optional(),
  category_id: positiveId.nullable().optional(),
  tag_ids: z.array(positiveId).optional(),
  notes: z.string().nullable().optional(),
});
const splitBody = connectionQuery.extend({
  children: z.array(child).min(2),
  recurringIds: z.array(positiveId.nullable()).optional(),
});
type Context = { params: Promise<{ id: string }> };

async function write(request: Request, context: Context, replace: boolean) {
  const { id } = await context.params;
  const parsedId = z.coerce.number().int().positive().safeParse(id);
  if (!parsedId.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return lunchMoneyRoute(
    request,
    splitBody,
    async (client, { children, recurringIds }) => {
      const parent = await client.getTransaction(parsedId.data);
      const error =
        splitError(parent, children) ??
        splitCategoryError(
          children,
          recurringIds ?? children.map(() => null),
          parent.category_id
        );
      if (error) throw new InvalidLunchMoneyRequest(error);
      if (replace !== Boolean(parent.is_split_parent)) {
        throw new InvalidLunchMoneyRequest(
          replace
            ? "This transaction is no longer split."
            : "This transaction is already split."
        );
      }
      return replace
        ? client.replaceSplit(parsedId.data, children as SplitParts)
        : client.splitTransaction(parsedId.data, children as SplitParts);
    }
  );
}

export const POST = (request: Request, context: Context) =>
  write(request, context, false);
export const PUT = (request: Request, context: Context) =>
  write(request, context, true);

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const parsedId = z.coerce.number().int().positive().safeParse(id);
  if (!parsedId.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return lunchMoneyRoute(request, connectionQuery, (client) =>
    client.unsplitTransaction(parsedId.data)
  );
}
