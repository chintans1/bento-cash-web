import { listConnections } from "@/lib/server/connections";
import { getRequestUser } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listConnections(user.id));
}
