import "server-only";

import { z } from "zod";
import type { LMClient } from "@/lib/lunchmoney/client";
import { resolveLunchMoneyClient } from "@/lib/server/lunch-money-client";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

export const connectionQuery = z.object({ connectionId: z.string().min(1) });
export const monthQuery = connectionQuery.extend({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export const recordBody = z.record(z.string(), z.unknown());
export const positiveId = z.number().int().positive();

function json(body: object, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

/** Authentication, connection ownership and error handling shared by each LM route. */
export async function lunchMoneyRoute<T extends { connectionId: string }>(
  request: Request,
  schema: z.ZodType<T>,
  run: (client: LMClient, input: T) => Promise<unknown>
): Promise<Response> {
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
  if (resolved.status === "unsupported_auth") {
    return json({ error: "This connection method is not available yet" }, 409);
  }

  try {
    return json({ data: await run(resolved.client, parsed.data) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lunch Money request failed";
    return json({ error: message }, 502);
  }
}
