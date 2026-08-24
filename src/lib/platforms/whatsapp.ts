/**
 * WhatsApp Business adapter — uses the WhatsApp Cloud API (Meta for
 * Developers).
 *
 * Unlike Facebook/Instagram OAuth, WhatsApp uses a static System User
 * access token + a Phone Number ID. The "connect" flow is therefore
 * not OAuth — the user pastes their token and phone number ID into
 * the connections page, and we validate by fetching the phone number
 * metadata.
 *
 * Env vars required (server-side only, never exposed to client):
 *   - none (user provides their own token in the connect flow)
 *
 * However, for a self-serve OAuth-style flow, you can set:
 *   - WHATSAPP_BUSINESS_VERIFICATION_TOKEN (your verification token
 *     used for the Meta webhook verification step).
 */

import type {
  AccountInfo,
  OAuthAuthorizeUrlParams,
  OAuthConfig,
  OAuthTokenResponse,
  PlatformAdapter,
  SendResult,
} from "./types";

export const whatsapp: PlatformAdapter = {
  id: "WHATSAPP",
  name: "WhatsApp",
  usesOAuth: false,
  oauthConfig: null,

  // Not an OAuth flow — user provides token + phone number ID directly.
  // The connect page will POST to /api/connections/WHATSAPP/connect with
  // { accessToken, phoneNumberId } in the body, which we pass to a
  // static method on this adapter. The getAuthorizeUrl/exchangeCodeForToken
  // methods below are unused for this adapter.

  getAuthorizeUrl(): string {
    throw new Error("WhatsApp does not use OAuth — connect via direct token entry.");
  },

  async exchangeCodeForToken(): Promise<OAuthTokenResponse> {
    throw new Error("WhatsApp does not use OAuth — connect via direct token entry.");
  },

  /** Validate a user-provided token + phone number ID by calling /whatsapp_business_account. */
  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    // The accessToken here is actually the user-provided "phoneNumberId:token" pair,
    // packed by the connect endpoint. We unpack here.
    const [phoneNumberId, token] = accessToken.split(":", 2);
    if (!phoneNumberId || !token) {
      throw new Error("Malformed WhatsApp credentials.");
    }
    const url = new URL(`https://graph.facebook.com/v19.0/${phoneNumberId}`);
    url.searchParams.set("fields", "display_phone_number,verified_name,quality");
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`WA validation failed: ${data.error?.message ?? res.statusText}`);
    }
    return {
      accountId: phoneNumberId,
      accountName: data.display_phone_number || "WhatsApp number",
      accountHandle: data.display_phone_number,
      scopes: [],
    };
  },

  async sendMessage({ accessToken, recipientId, content }): Promise<SendResult> {
    if (!recipientId) {
      return { ok: false, error: "recipientId (phone number) is required for WhatsApp", retryable: false };
    }
    const [phoneNumberId, token] = accessToken.split(":", 2);
    if (!phoneNumberId || !token) {
      return { ok: false, error: "Malformed WhatsApp credentials", retryable: false };
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientId,
          type: "text",
          text: { body: content },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error?.message ?? res.statusText;
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        return { ok: false, error: `WA: ${msg}`, retryable };
      }
      return { ok: true, platformMessageId: data.messages?.[0]?.id };
    } catch (err) {
      return { ok: false, error: String(err), retryable: true };
    }
  },

  validateEnvConfig(): string[] {
    // WhatsApp doesn't need any server-side env vars — user provides token directly.
    return [];
  },
};
