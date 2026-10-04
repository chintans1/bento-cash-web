import { lunchMoneyRoute, monthQuery } from "@/lib/server/lunch-money-route";

export const GET = (request: Request) =>
  lunchMoneyRoute(request, monthQuery, (client, { year, month }) =>
    client.getTransactionsForMonth(year, month)
  );
