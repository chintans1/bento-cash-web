import { LunchMoneyError } from "@lunch-money/lunch-money-js-v2";
import { z } from "zod";
import {
  connectionQuery,
  lunchMoneyJson,
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
    async (client, { source, accountId, offset }) => {
      try {
        return await client.getAccountActivity({ source, accountId, offset });
      } catch (error) {
        const message = "Could not load account transactions.";
        if (error instanceof LunchMoneyError && error.status === 401) {
          // Preserve the status for the shared OAuth retry without forwarding
          // the upstream error payload to the browser.
          throw new LunchMoneyError(message, 401);
        }
        return lunchMoneyJson({ error: message }, 502);
      }
    }
  );
