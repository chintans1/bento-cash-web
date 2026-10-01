import { betterAuth } from "better-auth";
import { DatabaseSync } from "node:sqlite";

/** Static config for Better Auth's schema generator. */
export const auth = betterAuth({
  database: new DatabaseSync(":memory:"),
  emailAndPassword: { enabled: false },
  account: { accountLinking: { updateUserInfoOnLink: true } },
});
