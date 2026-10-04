import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

const args = new Set(process.argv.slice(2));
const bootstrapRequested = args.delete("--bootstrap");
const dryRun = args.delete("--dry-run");
const appOnly = args.delete("--app-only");
const prebuilt = args.delete("--prebuilt");
if (args.size > 0)
  throw new Error(`Unknown deploy option: ${[...args].join(", ")}`);
if (process.env.WORKERS_CI && !appOnly) {
  throw new Error(
    "Workers Builds can deploy only its connected Worker. Use pnpm run deploy:app for the app Worker and pnpm run deploy:database for the database Worker."
  );
}

function hasAppVersion() {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "cf",
      "workers",
      "versions",
      "list",
      "--worker-id",
      "bento-cash-web",
      "--per-page",
      "1",
    ],
    { encoding: "utf8" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (`${result.stdout}${result.stderr}`.includes("[10007]")) return false;
    throw new Error("Could not check whether the app Worker has a version.");
  }
  const versions = JSON.parse(result.stdout);
  if (!Array.isArray(versions)) {
    throw new Error("Unexpected Worker versions response from cf.");
  }
  return versions.length > 0;
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} failed with exit code ${result.status ?? "unknown"}`
    );
  }
}

function createSecretsFile() {
  const source = existsSync(".env.production")
    ? parseEnv(readFileSync(".env.production", "utf8"))
    : {};
  const required = [
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];
  const secrets = Object.fromEntries(
    required.map((key) => [key, process.env[key] || source[key]])
  );
  const missing = required.filter((key) => !secrets[key]);
  if (missing.length > 0) {
    throw new Error(
      `Bootstrap needs ${missing.join(", ")} in .env.production or the shell.`
    );
  }
  secrets.BENTO_CREDENTIAL_ENCRYPTION_KEY =
    process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY ||
    source.BENTO_CREDENTIAL_ENCRYPTION_KEY ||
    secrets.BETTER_AUTH_SECRET;

  const directory = mkdtempSync(join(tmpdir(), "bento-deploy-"));
  const path = join(directory, "secrets.json");
  writeFileSync(path, JSON.stringify(secrets), { mode: 0o600, flag: "wx" });
  return { directory, path };
}

const bootstrap = bootstrapRequested || !hasAppVersion();
if (bootstrap) {
  process.stdout.write("First app Worker deployment: supplying secrets.\n");
}
const secretsFile = bootstrap ? createSecretsFile() : null;
try {
  if (!prebuilt) run("pnpm", ["run", "build"]);
  if (!appOnly) {
    run("pnpm", [
      "exec",
      "cf",
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--worker",
      "bento-cash-web-database",
      ...(dryRun ? ["--dry-run"] : []),
    ]);
  }
  run("pnpm", [
    "exec",
    "cf",
    "deploy",
    "--prebuilt",
    "--mode",
    "production",
    ...(secretsFile ? ["--secrets-file", secretsFile.path] : []),
    ...(dryRun ? ["--dry-run"] : []),
  ]);
} finally {
  if (secretsFile)
    rmSync(secretsFile.directory, { recursive: true, force: true });
}
