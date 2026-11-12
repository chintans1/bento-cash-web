import "server-only";

import { z } from "zod";
import { LunchMoneyError } from "@lunch-money/lunch-money-js-v2";
import { createOAuthClient } from "@/lib/lunchmoney/client";
import type { ServerLMClient } from "@/lib/lunchmoney/client";
import {
  refreshOAuthConnection,
  resolveLunchMoneyClient,
} from "@/lib/server/lunch-money-client";
import { lunchMoneyOAuthIssuer } from "@/lib/server/lunch-money-oauth";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

export const connectionQuery = z.object({ connectionId: z.string().min(1) });
export const monthQuery = connectionQuery.extend({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export const recordBody = z.record(z.string(), z.unknown());
export const positiveId = z.number().int().positive();

export class InvalidLunchMoneyRequest extends Error {}

export function lunchMoneyJson(
  body: object,
  status = 200,
  headers?: Record<string, string>
): Response {
  return Response.json(body, {
    status,
    headers: { ...headers, "cache-control": "private, no-store" },
  });
}

/** Authentication, connection ownership and error handling shared by each LM route. */
export async function lunchMoneyRoute<T extends { connectionId: string }>(
  request: Request,
  schema: z.ZodType<T>,
  run: (client: ServerLMClient, input: T, userId: string) => Promise<unknown>
): Promise<Response> {
  const json = lunchMoneyJson;
  if (request.method !== "GET" && !hasSameOrigin(request)) {
    return json({ error: "Invalid origin" }, 403);
  }
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const raw =
    request.method === "GET"
      ? Object.fromEntries(new URL(request.url).searchParams)
      : await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid request" }, 400);
  }

  const resolved = await resolveLunchMoneyClient(
    user.id,
    parsed.data.connectionId
  );
  if (resolved.status === "not_found") {
    return json({ error: "Connection not found" }, 404);
  }
  if (resolved.status === "reauthorization_required") {
    return json(
      { error: "Reconnect this Lunch Money budget to continue." },
      401
    );
  }

  async function respond(client: ServerLMClient, input: T, userId: string) {
    const result = await run(client, input, userId);
    return result instanceof Response ? result : json({ data: result });
  }

  try {
    return await respond(resolved.client, parsed.data, user.id);
  } catch (error) {
    if (
      resolved.authMethod === "oauth" &&
      error instanceof LunchMoneyError &&
      error.status === 401
    ) {
      try {
        const { credential } = await refreshOAuthConnection(
          user.id,
          parsed.data.connectionId,
          resolved.ciphertext
        );
        const client = createOAuthClient(
          credential.accessToken,
          lunchMoneyOAuthIssuer()
        );
        return await respond(client, parsed.data, user.id);
      } catch {
        return json(
          { error: "Reconnect this Lunch Money budget to continue." },
          401
        );
      }
    }
    const message =
      error instanceof Error ? error.message : "Lunch Money request failed";
    return json(
      { error: message },
      error instanceof InvalidLunchMoneyRequest ? 400 : 502
    );
  }
}
