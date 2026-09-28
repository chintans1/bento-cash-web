import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type StoredCredential =
  | { type: "api_key"; token: string }
  | {
      type: "oauth";
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
      scope?: string[];
    };

function encryptionKey(): Buffer {
  const secret =
    process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY ??
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? null
      : "bento-cash-development-credential-key");

  if (!secret) {
    throw new Error(
      "BENTO_CREDENTIAL_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required"
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptCredential(credential: StoredCredential): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credential), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCredential(value: string): StoredCredential {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted credential format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as StoredCredential;
}
