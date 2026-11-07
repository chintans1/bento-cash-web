import { getAuth } from "@/lib/server/auth";

const blockedPaths = new Set([
  "/api/auth/get-access-token",
  "/api/auth/refresh-token",
  "/api/auth/account-info",
]);

function handle(request: Request) {
  const path = decodeURIComponent(new URL(request.url).pathname).replace(
    /\/+$/,
    ""
  );
  if (blockedPaths.has(path)) {
    return new Response(null, { status: 404 });
  }
  return getAuth().then((auth) => auth.handler(request));
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
