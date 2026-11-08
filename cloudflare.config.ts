import { bindings, defineConfig, defineWorker } from "cf/config";
import { existsSync } from "node:fs";

// The Cloudflare Vite plugin reads .dev.vars/.env, while this project uses
// .env.local for both runtimes. Load it into the dev process for secret bindings.
if (process.env.NODE_ENV !== "production" && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export function databaseWorkerForMode(mode?: string) {
  return defineWorker({
    name:
      mode === "staging"
        ? "bento-cash-web-oauth-test-database"
        : "bento-cash-web-database",
    entrypoint: "./lib/server/database-object.ts",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    exports: { BentoDatabase: { type: "durable-object", storage: "sqlite" } },
  });
}

export default defineConfig(({ mode }) => {
  const databaseWorker = databaseWorkerForMode(mode);
  return {
    worker: defineWorker({
      name: mode === "staging" ? "bento-cash-web-oauth-test" : "bento-cash-web",
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-10-01",
      compatibilityFlags: ["nodejs_compat"],
      assets: { notFoundHandling: "none" },
      env: {
        ASSETS: bindings.assets(),
        IMAGES: bindings.images(),
        BETTER_AUTH_SECRET: bindings.secret(),
        LUNCH_MONEY_CLIENT_ID: bindings.secret(),
        LUNCH_MONEY_CLIENT_SECRET: bindings.secret(),
        LUNCH_MONEY_OAUTH_ISSUER: bindings.secret(),
        BENTO_CREDENTIAL_ENCRYPTION_KEY: bindings.secret(),
        BENTO_DB: bindings.durableObject({
          worker: databaseWorker,
          exportName: "BentoDatabase",
        }),
      },
    }),
  };
});
