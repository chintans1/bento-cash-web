import { getStore } from "@/lib/server/database";
import { migrations } from "@/lib/server/migrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  const rows = await store.all<{ name: string }>(
    'select "name" from "bento_migration" order by "name"'
  );
  const expected = migrations.map(([name]) => name);
  const applied = rows.map(({ name }) => name);
  if (expected.some((name) => !applied.includes(name))) {
    return new Response("Database migrations are incomplete", { status: 503 });
  }
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
