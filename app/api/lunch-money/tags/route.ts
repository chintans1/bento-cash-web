import {
  connectionQuery,
  lunchMoneyRoute,
} from "@/lib/server/lunch-money-route";

export const GET = (request: Request) =>
  lunchMoneyRoute(request, connectionQuery, (client) => client.getTags());
