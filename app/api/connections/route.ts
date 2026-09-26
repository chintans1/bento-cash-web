import { createRealClient } from "@/lib/lunchmoney/client";
import {
  listConnections,
  upsertApiKeyConnection,
} from "@/lib/server/connections";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(listConnections(user.id));
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  if (
    typeof body?.token !== "string" ||
    body.token.length < 8 ||
    body.token.length > 2048
  ) {
    return Response.json({ error: "Invalid API key" }, { status: 400 });
  }

  try {
    const profile = await createRealClient(body.token).getMe();
    const account = upsertApiKeyConnection(user.id, body.token, {
      name: profile.name,
      budgetName: profile.budget_name,
      email: profile.email,
      externalAccountId: profile.account_id,
    });
    return Response.json({ account }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Couldn't connect — check your token and try again." },
      { status: 400 }
    );
  }
}
