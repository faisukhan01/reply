/**
 * LinkedIn adapter — uses the LinkedIn Marketing API + Messaging API.
 *
 * LinkedIn auth uses OAuth 2.0 with the `authorization_code` grant.
 * After getting the access token, you can:
 *   - Post to the user's feed (w_member_social scope)
 *   - Send direct messages (w_member_social scope via Messaging API)
 *
 * LinkedIn's API is stricter than Meta's — they enforce per-member
 * invitation limits (e.g. 100 invites/week), rate limits per app, and
 * require your app to be reviewed for production access. We automatically
 * throttle and retry on 429s.
 *
 * Env vars required:
 *   - LINKEDIN_CLIENT_ID
 *   - LINKEDIN_CLIENT_SECRET
 */

import type {
  AccountInfo,
  OAuthAuthorizeUrlParams,
  OAuthConfig,
  OAuthTokenResponse,
  PlatformAdapter,
  SendResult,
} from "./types";

export const linkedin: PlatformAdapter = {
  id: "LINKEDIN",
  name: "LinkedIn",
  usesOAuth: true,
  oauthConfig: {
    clientIdEnvVar: "LINKEDIN_CLIENT_ID",
    clientSecretEnvVar: "LINKEDIN_CLIENT_SECRET",
    scope: ["openid", "profile", "email", "w_member_social", "r_organization_social", "rw_organization"],
    redirectPath: "/api/connections/LINKEDIN/callback",
  },

  getAuthorizeUrl({ state, redirectUri }: OAuthAuthorizeUrlParams): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      throw new Error("LINKEDIN_CLIENT_ID is not set.");
    }
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", this.oauthConfig!.scope.join(" "));
    return url.toString();
  },

  async exchangeCodeForToken(code, redirectUri): Promise<OAuthTokenResponse> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not set.");
    }
    // LinkedIn requires the token exchange as a form-encoded POST.
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`LI token exchange failed: ${data.error_description ?? data.error ?? res.statusText}`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope ? data.scope.split(" ") : undefined,
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not set.");
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`LI refresh failed: ${data.error_description ?? data.error}`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    // Get the user's "urn:li:person:<id>" + name.
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`LI /userinfo failed: ${JSON.stringify(data)}`);
    }
    return {
      accountId: data.sub, // LinkedIn person id (numeric)
      accountName: data.name || `${data.given_name} ${data.family_name}` || "LinkedIn user",
      accountHandle: data.email ? data.email : undefined,
      scopes: this.oauthConfig!.scope,
    };
  },

  async sendMessage({ accessToken, recipientId, content }): Promise<SendResult> {
    if (!recipientId) {
      return { ok: false, error: "recipientId (urn:li:person:<id>) is required for LinkedIn", retryable: false };
    }
    try {
      // LinkedIn's Messaging API: POST to /v2/messages with a conversation create payload.
      // Note: LinkedIn's invite API has very strict limits (100/week per sender).
      const res = await fetch("https://api.linkedin.com/v2/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Method": "create",
        },
        body: JSON.stringify({
          // recipientId is expected to be a URN like "urn:li:person:12345"
         Recipients: { values: [{ "person": { "path": "/identity/" + recipientId } }] },
          eventAttributes: {},
          messageContext: {},
          body: { text: content },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message ?? res.statusText;
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        return { ok: false, error: `LI: ${msg}`, retryable };
      }
      return { ok: true, platformMessageId: data?.id };
    } catch (err) {
      return { ok: false, error: String(err), retryable: true };
    }
  },

  validateEnvConfig(): string[] {
    const missing: string[] = [];
    if (!process.env.LINKEDIN_CLIENT_ID) missing.push("LINKEDIN_CLIENT_ID");
    if (!process.env.LINKEDIN_CLIENT_SECRET) missing.push("LINKEDIN_CLIENT_SECRET");
    return missing;
  },
};
