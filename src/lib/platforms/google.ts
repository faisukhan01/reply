/**
 * Google adapter — covers Gmail, Google Calendar, and Google Drive via
 * the same OAuth flow (Google's API supports incremental scopes).
 *
 * Google's OAuth uses the `authorization_code` grant with PKCE (for
 * mobile) — for a Next.js server-side flow we use the plain confidential
 * client flow (client_id + client_secret + redirect_uri + code).
 *
 * Supported inbound events (via Google Pub/Sub webhook):
 *   - EMAIL_RECEIVED: Gmail push notification when a new email arrives
 *   - CALENDAR_STARTING: Calendar event about to start (15-min reminder)
 *
 * Supported outbound actions:
 *   - sendMessage() → sends a Gmail email (recipientId = email address,
 *     content = plain text body). We do NOT send Calendar invites or
 *     Drive files via this adapter — that's a separate integration.
 *
 * Env vars required:
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 *
 * Webhook registration:
 *   - In Google Cloud Console, create a Pub/Sub topic + a push subscription
 *     pointing to https://reply-beryl.vercel.app/api/webhooks/google
 *   - In Gmail API settings, register the topic for the user's mailbox:
 *     POST https://gmail.googleapis.com/gmail/v1/users/me/stop
 *     POST https://gmail.googleapis.com/gmail/v1/users/me/watch
 *         { topicName: "projects/your-project/topics/gmail-inbox" }
 *   - We auto-register the watch on the first connect callback.
 */

import type {
  AccountInfo,
  OAuthAuthorizeUrlParams,
  OAuthConfig,
  OAuthTokenResponse,
  PlatformAdapter,
  SendResult,
} from "./types";

export const google: PlatformAdapter = {
  id: "GOOGLE",
  name: "Google (Gmail + Calendar + Drive)",
  usesOAuth: true,
  oauthConfig: {
    clientIdEnvVar: "GOOGLE_CLIENT_ID",
    clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.file",
      "openid",
      "email",
      "profile",
    ],
    redirectPath: "/api/connections/GOOGLE/callback",
  },

  getAuthorizeUrl({ state, redirectUri }: OAuthAuthorizeUrlParams): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID is not set in the environment.");
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", this.oauthConfig!.scope.join(" "));
    url.searchParams.set("access_type", "offline"); // request a refresh token
    url.searchParams.set("prompt", "consent"); // force consent so we always get a refresh_token
    return url.toString();
  },

  async exchangeCodeForToken(code, redirectUri): Promise<OAuthTokenResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.");
    }
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`Google token exchange failed: ${data.error_description ?? data.error ?? res.statusText}`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope ? data.scope.split(" ") : undefined,
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.");
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`Google refresh failed: ${data.error_description ?? data.error}`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: undefined, // Google returns the same refresh_token (or none) — keep the existing one
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope ? data.scope.split(" ") : undefined,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Google userinfo failed: ${JSON.stringify(data)}`);
    }
    return {
      accountId: data.sub,
      accountName: data.name || data.email,
      accountHandle: data.email,
      scopes: this.oauthConfig!.scope,
    };
  },

  async sendMessage({ accessToken, recipientId, content }): Promise<SendResult> {
    if (!recipientId) {
      return { ok: false, error: "recipientId (email address) is required for Google", retryable: false };
    }
    try {
      // Gmail API: send a basic plain-text email.
      // We construct RFC-822 message and base64url-encode it.
      const to = recipientId;
      const subject = "Reply from ReplyAI";
      const rfc822 = [
        `To: ${to}`,
        `From: me`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        content,
      ].join("\r\n");
      const encoded = Buffer.from(rfc822)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error?.message ?? res.statusText;
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        return { ok: false, error: `Gmail: ${msg}`, retryable };
      }
      return { ok: true, platformMessageId: data.id };
    } catch (err) {
      return { ok: false, error: String(err), retryable: true };
    }
  },

  validateEnvConfig(): string[] {
    const missing: string[] = [];
    if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
    if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
    return missing;
  },
};
