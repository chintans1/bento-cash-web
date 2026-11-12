import { z } from "zod";
import {
  connectionQuery,
  lunchMoneyRoute,
} from "@/lib/server/lunch-money-route";

const activityQuery = connectionQuery.extend({
  source: z.enum(["manual", "plaid"]),
  accountId: z.coerce.number().int().positive(),
  offset: z.coerce.number().int().nonnegative(),
});

export const GET = (request: Request) =>
  lunchMoneyRoute(
    request,
    activityQuery,
    (client, { source, accountId, offset }) =>
      client.getAccountActivity({ source, accountId, offset })
  );
