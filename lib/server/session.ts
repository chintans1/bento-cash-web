import { getAuth } from "@/lib/server/auth";

export async function getRequestUser(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

/** Custom cookie-authenticated mutations require a same-origin browser request. */
export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
