import { z } from "zod";
import {
  connectionQuery,
  lunchMoneyRoute,
  monthQuery,
} from "@/lib/server/lunch-money-route";

const recurringQuery = z.union([
  monthQuery,
  connectionQuery.extend({
    year: z.never().optional(),
    month: z.never().optional(),
  }),
]);

export const GET = (request: Request) =>
  lunchMoneyRoute(request, recurringQuery, (client, { year, month }) =>
    year === undefined || month === undefined
      ? client.getRecurringItems()
      : client.getRecurringItems({ year, month })
  );
