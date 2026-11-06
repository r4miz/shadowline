import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptJson, decryptJson } from "./crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("field encryption", () => {
  it("round-trips arbitrary JSON values", () => {
    const value = { answer: ["ChatGPT", "Claude"], note: "uses personal acct" };
    const payload = encryptJson(value);
    expect(decryptJson(payload)).toEqual(value);
  });

  it("round-trips primitives", () => {
    expect(decryptJson(encryptJson("Commonly"))).toBe("Commonly");
    expect(decryptJson(encryptJson(true))).toBe(true);
  });

  it("produces the v1 payload format", () => {
    const payload = encryptJson("x");
    expect(payload).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it("produces different ciphertexts for the same value (random IV)", () => {
    expect(encryptJson("same")).not.toBe(encryptJson("same"));
  });

  it("rejects tampered ciphertext", () => {
    const payload = encryptJson({ secret: "data" });
    const parts = payload.split(":");
    const ct = Buffer.from(parts[3], "base64");
    ct[0] ^= 0xff;
    parts[3] = ct.toString("base64");
    expect(() => decryptJson(parts.join(":"))).toThrow();
  });

  it("throws when FIELD_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.FIELD_ENCRYPTION_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(() => encryptJson("x")).toThrow();
    process.env.FIELD_ENCRYPTION_KEY = saved;
  });
});
