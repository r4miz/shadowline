import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Field-level encryption at rest (spec section 8). Survey answer values are
// encrypted with AES-256-GCM before they reach the database; the auth tag
// makes tampering detectable. Payload format: "v1:<iv>:<tag>:<ciphertext>"
// (all base64) so the scheme can be rotated later without a migration.

const VERSION = "v1";
const IV_LENGTH = 12;

function encryptionKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  return key;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptJson<T = unknown>(payload: string): T {
  const [version, ivB64, tagB64, ctB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error("Unrecognized encrypted payload format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
