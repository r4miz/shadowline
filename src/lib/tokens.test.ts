import { describe, it, expect, beforeAll } from "vitest";
import {
  signRespondentToken,
  verifyRespondentToken,
  signMagicLinkToken,
  verifyMagicLinkToken,
  hashAccessCode,
} from "./tokens";

beforeAll(() => {
  process.env.TOKEN_SECRET = "test-secret-at-least-32-chars-long!!";
});

describe("respondent tokens", () => {
  it("round-trips engagementId", async () => {
    const token = await signRespondentToken({ engagementId: "eng_123" });
    const payload = await verifyRespondentToken(token);
    expect(payload.engagementId).toBe("eng_123");
  });

  it("rejects a tampered token", async () => {
    const token = await signRespondentToken({ engagementId: "eng_123" });
    await expect(verifyRespondentToken(token + "x")).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signRespondentToken(
      { engagementId: "eng_123" },
      { expiresIn: "-1s" }
    );
    await expect(verifyRespondentToken(token)).rejects.toThrow();
  });

  it("rejects a magic-link token passed as a respondent token", async () => {
    const token = await signMagicLinkToken({ email: "a@b.co" });
    await expect(verifyRespondentToken(token)).rejects.toThrow();
  });

  it("round-trips an access-code hash when present", async () => {
    const accessCodeHash = hashAccessCode("dental-2026");
    const token = await signRespondentToken({
      engagementId: "eng_123",
      accessCodeHash,
    });
    const payload = await verifyRespondentToken(token);
    expect(payload.accessCodeHash).toBe(accessCodeHash);
  });

  it("returns undefined access-code hash when not set", async () => {
    const token = await signRespondentToken({ engagementId: "eng_123" });
    const payload = await verifyRespondentToken(token);
    expect(payload.accessCodeHash).toBeUndefined();
  });
});

describe("hashAccessCode", () => {
  it("is deterministic and hex-encoded", () => {
    expect(hashAccessCode("code-1")).toBe(hashAccessCode("code-1"));
    expect(hashAccessCode("code-1")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAccessCode("code-1")).not.toBe(hashAccessCode("code-2"));
  });
});

describe("magic link tokens", () => {
  it("round-trips email", async () => {
    const token = await signMagicLinkToken({ email: "consultant@example.com" });
    const payload = await verifyMagicLinkToken(token);
    expect(payload.email).toBe("consultant@example.com");
  });

  it("rejects a respondent token passed as a magic-link token", async () => {
    const token = await signRespondentToken({ engagementId: "eng_123" });
    await expect(verifyMagicLinkToken(token)).rejects.toThrow();
  });
});
