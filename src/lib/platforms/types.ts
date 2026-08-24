/**
 * Shared types for platform adapters.
 *
 * Each platform (Facebook, Instagram, WhatsApp, LinkedIn, etc.) implements
 * the PlatformAdapter interface. The scheduler dispatch loop calls
 * `adapter.sendMessage(...)` for due messages — adapters are responsible
 * for knowing their platform's specific API.
 */

export type PlatformId =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "WHATSAPP"
  | "LINKEDIN"
  | "GOOGLE"
  | "TWITTER"
  | "EMAIL";

export type PlatformStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING";

export type ScheduledMessageStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export type SendResult =
  | { ok: true; platformMessageId?: string }
  | { ok: false; error: string; retryable: boolean };

export type AccountInfo = {
  accountId: string;
  accountName: string;
  accountHandle?: string;
  scopes?: string[];
  tokenExpiresAt?: Date;
  refreshToken?: string;
};

export type OAuthAuthorizeUrlParams = {
  state: string;
  redirectUri: string;
};

export type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
};

export type OAuthConfig = {
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  scope: string[];
  redirectPath: string;
};

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly name: string;
  readonly usesOAuth: boolean;
  readonly oauthConfig: OAuthConfig | null;
  getAuthorizeUrl(params: OAuthAuthorizeUrlParams): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResponse>;
  getAccountInfo(accessToken: string): Promise<AccountInfo>;
  sendMessage(params: {
    accessToken: string;
    recipientId?: string;
    recipientHandle?: string;
    content: string;
    mediaUrl?: string;
  }): Promise<SendResult>;
  refreshToken?(refreshToken: string): Promise<OAuthTokenResponse>;
  validateEnvConfig?(): string[];
}
