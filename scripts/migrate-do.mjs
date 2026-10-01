import { existsSync } from "node:fs";
import { URL } from "node:url";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseUrl = process.env.BENTO_MIGRATE_URL ?? "http://localhost:3000";
const url = new URL("/api/database/ready", baseUrl);

try {
  const response = await globalThis.fetch(url, {
    headers: { "cache-control": "no-store" },
  });
  if (response.status !== 204) {
    throw new Error(`Database check returned HTTP ${response.status}`);
  }
  process.stdout.write("Durable Object migrations are up to date.\n");
} catch (error) {
  process.stderr.write(
    `Could not apply or verify Durable Object migrations at ${url.origin}: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.stderr.write(
    "Start pnpm dev first, or set BENTO_MIGRATE_URL to a running deployment.\n"
  );
  process.exitCode = 1;
}
