import { getAuth } from "@/lib/server/auth";

const blockedPaths = new Set([
  "/api/auth/get-access-token",
  "/api/auth/refresh-token",
]);

async function handle(request: Request) {
  const path = decodeURIComponent(new URL(request.url).pathname).replace(
    /\/+$/,
    ""
  );
  if (blockedPaths.has(path)) {
    return new Response(null, { status: 404 });
  }
  return (await getAuth()).handler(request);
}

export const GET = handle;
export const POST = handle;
