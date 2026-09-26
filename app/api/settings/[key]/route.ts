import {
  getFeatureSetting,
  ownsConnection,
  setFeatureSetting,
} from "@/lib/server/feature-settings";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

type RouteContext = { params: Promise<{ key: string }> };

function connectionId(request: Request) {
  return new URL(request.url).searchParams.get("connectionId");
}

function validKey(key: string) {
  return /^[a-z0-9_]{1,64}$/.test(key);
}

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = connectionId(request);
  if (!id)
    return Response.json({ error: "Missing connection" }, { status: 400 });
  const { key } = await params;
  if (!validKey(key)) {
    return Response.json({ error: "Invalid setting key" }, { status: 400 });
  }
  if (!ownsConnection(user.id, id)) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }
  return Response.json({ value: getFeatureSetting(user.id, id, key) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = connectionId(request);
  const body = (await request.json().catch(() => null)) as {
    value?: unknown;
  } | null;
  if (!id || typeof body?.value !== "string" || body.value.length > 4096) {
    return Response.json({ error: "Invalid setting" }, { status: 400 });
  }
  const { key } = await params;
  if (!validKey(key)) {
    return Response.json({ error: "Invalid setting key" }, { status: 400 });
  }
  if (!setFeatureSetting(user.id, id, key, body.value)) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
