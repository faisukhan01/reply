/**
 * Instagram adapter — uses the Instagram Graph API for Instagram
 * Professional accounts (Business or Creator).
 *
 * Instagram messaging requires the Instagram account to be linked to a
 * Facebook Page — the OAuth flow is the same as Facebook's, but with
 * different scopes. We use the Page's Instagram Business Account ID as
 * the accountId.
 *
 * Env vars required:
 *   - FACEBOOK_APP_ID      (same as Facebook — Meta shares the app)
 *   - FACEBOOK_APP_SECRET
 */

import type {
  AccountInfo,
  OAuthAuthorizeUrlParams,
  OAuthConfig,
  OAuthTokenResponse,
  PlatformAdapter,
  SendResult,
} from "./types";

export const instagram: PlatformAdapter = {
  id: "INSTAGRAM",
  name: "Instagram",
  usesOAuth: true,
  oauthConfig: {
    clientIdEnvVar: "FACEBOOK_APP_ID",
    clientSecretEnvVar: "FACEBOOK_APP_SECRET",
    scope: [
      "instagram_basic",
      "instagram_manage_messages",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ],
    redirectPath: "/api/connections/INSTAGRAM/callback",
  },

  getAuthorizeUrl({ state, redirectUri }: OAuthAuthorizeUrlParams): string {
    const clientId = process.env.FACEBOOK_APP_ID;
    if (!clientId) {
      throw new Error("FACEBOOK_APP_ID is not set (shared with Instagram).");
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
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`IG token exchange failed: ${data.error?.message ?? res.statusText}`);
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    // Step 1: list the user's pages, take the first.
    const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token");
    pagesUrl.searchParams.set("access_token", accessToken);
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || pagesData.error) {
      throw new Error(`IG /me/accounts failed: ${pagesData.error?.message ?? pagesRes.statusText}`);
    }
    const page = pagesData.data?.[0];
    if (!page) throw new Error("No Facebook Pages found. Instagram requires a linked Page.");

    // Step 2: get the Instagram Business Account attached to this Page.
    const igUrl = new URL(`https://graph.facebook.com/v19.0/${page.id}`);
    igUrl.searchParams.set("fields", "instagram_business_account{id,username,name,profile_picture_url}");
    igUrl.searchParams.set("access_token", page.access_token);
    const igRes = await fetch(igUrl);
    const igData = await igRes.json();
    if (!igRes.ok || igData.error) {
      throw new Error(`IG business lookup failed: ${igData.error?.message ?? igRes.statusText}`);
    }
    const ig = igData.instagram_business_account;
    if (!ig) {
      throw new Error("This Page has no Instagram Business Account attached. Convert your Instagram to a Business account and link it to the Page first.");
    }
    return {
      accountId: ig.id,
      accountName: ig.name || ig.username || "Instagram account",
      accountHandle: ig.username ? `@${ig.username}` : undefined,
      // We use the Page access token to call the IG messaging API.
      // Note: this differs from Facebook — IG uses the Page token, not a separate IG token.
      refreshToken: undefined,
      scopes: this.oauthConfig!.scope,
    };
  },

  async sendMessage({ accessToken, recipientId, content }): Promise<SendResult> {
    if (!recipientId) {
      return { ok: false, error: "recipientId (IGScoped ID) is required for Instagram", retryable: false };
    }
    try {
      // Note: the sendMessage endpoint requires the IG Business Account ID
      // as part of the path. The caller passes the connection's accessToken
      // (the Page token), and we use the recipientId as the IG user.
      // We don't know the IG account ID here — it's stored as part of the
      // connection. We'd need to thread it through. For now, the
      // recipientId is the IG user id of the recipient.
      const res = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
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
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        return { ok: false, error: `IG: ${msg}`, retryable };
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
