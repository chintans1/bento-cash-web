import {
  listConnections,
  removeConnection,
  setActiveConnection,
} from "@/lib/server/connections";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await setActiveConnection(user.id, id))) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }
  return Response.json({ activeConnectionId: id });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await removeConnection(user.id, id))) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }
  return Response.json(await listConnections(user.id));
}
