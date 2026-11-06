import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

// Token security model (spec section 13.3): HS256 via TOKEN_SECRET; each token
// carries a `purpose` claim so a token minted for one flow can never be
// replayed in another. Expiries are deliberately short where the token grants
// write access.
//
//   respondent   employee survey link            14 days
//   magic-link   operator sign-in                15 minutes
//   connect      client admin workspace connect  7 days
//   oauth-state  OAuth round-trip binding        10 minutes
//   sign         policy sign-off link            30 days

const RESPONDENT_PURPOSE = "respondent";
const MAGIC_LINK_PURPOSE = "magic-link";
const CONNECT_PURPOSE = "connect";
const OAUTH_STATE_PURPOSE = "oauth-state";
const SIGN_PURPOSE = "sign";

const RESPONDENT_DEFAULT_EXPIRY = "14d";
const MAGIC_LINK_DEFAULT_EXPIRY = "15m";
const CONNECT_DEFAULT_EXPIRY = "7d";
const OAUTH_STATE_EXPIRY = "10m";
const SIGN_DEFAULT_EXPIRY = "30d";

function secretKey(): Uint8Array {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error("TOKEN_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function sign(
  payload: Record<string, string>,
  purpose: string,
  expiresIn: string,
  options: { singleUse?: boolean } = {}
): Promise<string> {
  const jwt = new SignJWT({ ...payload, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  // Single-use tokens carry a jti that the consumer records on first use.
  if (options.singleUse) jwt.setJti(randomBytes(16).toString("hex"));
  return jwt.sign(secretKey());
}

async function verify(token: string, purpose: string) {
  const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
  if (payload.purpose !== purpose) {
    throw new Error(`Token purpose mismatch: expected ${purpose}`);
  }
  return payload;
}

// Optional access code: only its sha256 hash is encoded in the token, so the
// link alone never reveals the code and the server stores nothing.
export function hashAccessCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export async function signRespondentToken(
  payload: { engagementId: string; accessCodeHash?: string },
  options: { expiresIn?: string } = {}
): Promise<string> {
  const claims: Record<string, string> = { engagementId: payload.engagementId };
  if (payload.accessCodeHash) claims.accessCodeHash = payload.accessCodeHash;
  return sign(
    claims,
    RESPONDENT_PURPOSE,
    options.expiresIn ?? RESPONDENT_DEFAULT_EXPIRY
  );
}

export async function verifyRespondentToken(
  token: string
): Promise<{ engagementId: string; accessCodeHash?: string }> {
  const payload = await verify(token, RESPONDENT_PURPOSE);
  return {
    engagementId: payload.engagementId as string,
    accessCodeHash: payload.accessCodeHash as string | undefined,
  };
}

export async function signMagicLinkToken(
  payload: { email: string },
  options: { expiresIn?: string } = {}
): Promise<string> {
  return sign(payload, MAGIC_LINK_PURPOSE, options.expiresIn ?? MAGIC_LINK_DEFAULT_EXPIRY, { singleUse: true });
}

/** Verifies and returns the claims; the caller must still consume `jti` once. */
export async function verifyMagicLinkToken(
  token: string
): Promise<{ email: string; jti: string; expiresAt: Date }> {
  const payload = await verify(token, MAGIC_LINK_PURPOSE);
  if (!payload.jti || !payload.exp) throw new Error("Magic link token missing jti");
  return { email: payload.email as string, jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
}

// ---- Workspace connect (client admin) ------------------------------------

export async function signConnectToken(
  payload: { organizationId: string },
  options: { expiresIn?: string } = {}
): Promise<string> {
  return sign(payload, CONNECT_PURPOSE, options.expiresIn ?? CONNECT_DEFAULT_EXPIRY);
}

export async function verifyConnectToken(
  token: string
): Promise<{ organizationId: string }> {
  const payload = await verify(token, CONNECT_PURPOSE);
  return { organizationId: payload.organizationId as string };
}

/**
 * OAuth state: signed, single-use (jti), and bound to the browser that started
 * the flow through `nonce`, which is also set as an HttpOnly cookie. The
 * callback must see the same nonce in both places.
 */
export async function signOAuthState(payload: {
  organizationId: string;
  provider: "google" | "microsoft";
}): Promise<{ state: string; nonce: string }> {
  const nonce = randomBytes(16).toString("hex");
  const state = await sign({ ...payload, nonce }, OAUTH_STATE_PURPOSE, OAUTH_STATE_EXPIRY, { singleUse: true });
  return { state, nonce };
}

export async function verifyOAuthState(
  state: string
): Promise<{ organizationId: string; provider: "google" | "microsoft"; nonce: string; jti: string; expiresAt: Date }> {
  const payload = await verify(state, OAUTH_STATE_PURPOSE);
  const provider = payload.provider;
  if (provider !== "google" && provider !== "microsoft") {
    throw new Error("Unknown provider in state");
  }
  if (!payload.jti || !payload.exp || typeof payload.nonce !== "string") throw new Error("Malformed state");
  return { organizationId: payload.organizationId as string, provider, nonce: payload.nonce, jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
}

// ---- Policy sign-off (employee) ------------------------------------------

/**
 * Sign-off links come in two kinds: a general link (no email) that lets anyone
 * on the roster sign, and a personal link (email claim) sent to one invitee,
 * which pins the signer's identity server-side.
 */
export async function signSignoffToken(
  payload: { engagementId: string; documentId: string; email?: string },
  options: { expiresIn?: string } = {}
): Promise<string> {
  const claims: Record<string, string> = { engagementId: payload.engagementId, documentId: payload.documentId };
  if (payload.email) claims.email = payload.email.toLowerCase();
  return sign(claims, SIGN_PURPOSE, options.expiresIn ?? SIGN_DEFAULT_EXPIRY);
}

export async function verifySignoffToken(
  token: string
): Promise<{ engagementId: string; documentId: string; email: string | null }> {
  const payload = await verify(token, SIGN_PURPOSE);
  return {
    engagementId: payload.engagementId as string,
    documentId: payload.documentId as string,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}
