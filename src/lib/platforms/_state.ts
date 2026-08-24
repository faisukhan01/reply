/**
 * OAuth state token helpers — used for CSRF protection in the OAuth flow.
 *
 * State is `base64url(randomBytes(16))` + `.` + `base64url(hmac(state, secret))`.
 * The HMAC prevents an attacker from forging a state and tricking the
 * user into connecting an attacker-controlled account.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

function getSecret(): string {
  const raw = process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error("[platforms/state] NEXTAUTH_SECRET is not set");
  }
  return raw;
}

export function issueState(): string {
  const nonce = randomBytes(16).toString("base64url");
  const hmac = createHmac("sha256", getSecret()).update(nonce).digest("base64url");
  return `${nonce}.${hmac}`;
}

export function verifyState(state: string): boolean {
  try {
    const [nonce, hmac] = state.split(".");
    if (!nonce || !hmac) return false;
    const expected = createHmac("sha256", getSecret()).update(nonce).digest("base64url");
    const a = Buffer.from(hmac);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
