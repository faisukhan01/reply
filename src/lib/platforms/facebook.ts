/**
 * Facebook (Meta Graph API) adapter.
 *
 * Connects to a Facebook Page via OAuth. Messages are sent through the
 * Page's Messenger inbox to a user identified by their PSID (Page-Scoped
 * ID).
 *
 * Env vars required:
 *   - FACEBOOK_APP_ID
 *   - FACEBOOK_APP_SECRET
 *
 * The user must also whitelist the OAuth redirect URI in the Facebook
 * App Dashboard (Products → Facebook Login → Settings):
 *   https://reply-beryl.vercel.app/api/connections/FACEBOOK/callback
 *   http://localhost:3000/api/connections/FACEBOOK/callback  (dev)
 */

import type {
  AccountInfo,
  OAuthAuthorizeUrlParams,
  OAuthConfig,
  OAuthTokenResponse,
  PlatformAdapter,
  SendResult,
} from "./types";

export const facebook: PlatformAdapter = {
  id: "FACEBOOK",
  name: "Facebook",
  usesOAuth: true,
  oauthConfig: {
    clientIdEnvVar: "FACEBOOK_APP_ID",
    clientSecretEnvVar: "FACEBOOK_APP_SECRET",
    scope: [
      "pages_show_list",
      "pages_messaging",
      "pages_read_engagement",
      "pages_manage_posts",
      "read_page_mailboxes",
    ],
    redirectPath: "/api/connections/FACEBOOK/callback",
  },

  getAuthorizeUrl({ state, redirectUri }: OAuthAuthorizeUrlParams): string {
    const clientId = process.env.FACEBOOK_APP_ID;
    if (!clientId) {
      throw new Error("FACEBOOK_APP_ID is not set in the environment.");
    }
    const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", this.oauthConfig!.scope.join(","));
    url.searchParams.set("response_type", "code");
    return url.toString();
  },

  async exchangeCodeForToken(code, redirectUri): Promise<OAuthTokenResponse> {
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set.");
    }
    const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`FB token exchange failed: ${data.error?.message ?? res.statusText}`);
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    // Long-lived user tokens can list the user's pages. We use the first page.
    const url = new URL("https://graph.facebook.com/v19.0/me");
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`FB /me failed: ${data.error?.message ?? res.statusText}`);
    }

    // Now list the user's pages and pick the first one (the user can pick
    // a different one in the UI later if they have multiple).
    const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token");
    pagesUrl.searchParams.set("access_token", accessToken);
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || pagesData.error) {
      throw new Error(`FB /me/accounts failed: ${pagesData.error?.message ?? pagesRes.statusText}`);
    }
    const page = pagesData.data?.[0];
    if (!page) {
      throw new Error("No Facebook Pages found on this account. Create a Page first.");
    }
    return {
      accountId: page.id,
      accountName: page.name,
      // The Page's access_token is what we use to send messages from the
      // Page to a user. We return it here; the caller encrypts + persists it.
      // We do NOT save the user token — we save the Page token.
      refreshToken: undefined,
      scopes: this.oauthConfig!.scope,
    };
  },

  async sendMessage({ accessToken, recipientId, content }): Promise<SendResult> {
    if (!recipientId) {
      return { ok: false, error: "recipientId (PSID) is required for Facebook", retryable: false };
    }
    try {
      const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
          messaging_type: "MESSAGE_TAG",
          tag: "ACCOUNT_UPDATE",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error?.message ?? res.statusText;
        // Retry on rate-limit (429) and 5xx; do not retry on policy/auth errors.
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        return { ok: false, error: `FB: ${msg}`, retryable };
      }
      return { ok: true, platformMessageId: data.message_id };
    } catch (err) {
      return { ok: false, error: String(err), retryable: true };
    }
  },

  validateEnvConfig(): string[] {
    const missing: string[] = [];
    if (!process.env.FACEBOOK_APP_ID) missing.push("FACEBOOK_APP_ID");
    if (!process.env.FACEBOOK_APP_SECRET) missing.push("FACEBOOK_APP_SECRET");
    return missing;
  },
};
