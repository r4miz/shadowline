/**
 * OAuth round-trip protection shared by the Google and Microsoft callbacks.
 *
 *  - `state` is a signed, single-use token (jti recorded on first use).
 *  - The same random nonce is set as an HttpOnly cookie when the flow starts
 *    and must match the nonce inside `state` when the provider redirects back,
 *    which ties the callback to the browser that began the flow.
 */
import { NextResponse } from "next/server";
import { consumeOnce } from "@/lib/token-store";
import { verifyOAuthState } from "@/lib/tokens";

export const OAUTH_NONCE_COOKIE = "sl_oauth_nonce";

export function setNonceCookie(response: NextResponse, nonce: string) {
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/connect",
    maxAge: 600,
  });
  return response;
}

export function clearNonceCookie(response: NextResponse) {
  response.cookies.set(OAUTH_NONCE_COOKIE, "", { httpOnly: true, path: "/api/connect", maxAge: 0 });
  return response;
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export type StateCheck =
  | { ok: true; organizationId: string }
  | { ok: false; reason: "state" | "nonce" | "replay" };

export async function checkOAuthState(
  request: Request,
  state: string | null,
  expectedProvider: "google" | "microsoft"
): Promise<StateCheck> {
  if (!state) return { ok: false, reason: "state" };
  let verified;
  try {
    verified = await verifyOAuthState(state);
  } catch {
    return { ok: false, reason: "state" };
  }
  if (verified.provider !== expectedProvider) return { ok: false, reason: "state" };
  const cookieNonce = cookieValue(request, OAUTH_NONCE_COOKIE);
  if (!cookieNonce || cookieNonce !== verified.nonce) return { ok: false, reason: "nonce" };
  const fresh = await consumeOnce(verified.jti, "oauth-state", verified.expiresAt);
  if (!fresh) return { ok: false, reason: "replay" };
  return { ok: true, organizationId: verified.organizationId };
}
