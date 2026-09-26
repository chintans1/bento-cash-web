import { betterAuth } from "better-auth";
import { database } from "@/lib/server/database";

export const auth = betterAuth({
  database,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});
