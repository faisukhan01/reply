/**
 * Platform registry — maps platform ids to their adapters.
 *
 * To add a new platform:
 *   1. Implement PlatformAdapter in src/lib/platforms/<name>.ts
 *   2. Import it here and add to `platforms`.
 *   3. Add the platform id to the PlatformId union in types.ts.
 *
 * Everything else (UI, API routes, cron dispatch) automatically picks up
 * the new platform from this registry — no other code changes needed.
 */

import type { PlatformAdapter, PlatformId } from "./types";
import { facebook } from "./facebook";
import { instagram } from "./instagram";
import { whatsapp } from "./whatsapp";
import { linkedin } from "./linkedin";
import { google } from "./google";

export const platforms: Record<PlatformId, PlatformAdapter> = {
  FACEBOOK: facebook,
  INSTAGRAM: instagram,
  WHATSAPP: whatsapp,
  LINKEDIN: linkedin,
  GOOGLE: google,
  // Future platforms (placeholders for the registry; the adapter is
  // imported lazily only when these are needed):
  TWITTER: undefined as unknown as PlatformAdapter,
  EMAIL: undefined as unknown as PlatformAdapter,
};

/** Look up an adapter by platform id. Throws if not registered. */
export function getAdapter(platform: string): PlatformAdapter {
  const adapter = platforms[platform as PlatformId];
  if (!adapter) {
    throw new Error(`Unknown or unregistered platform: ${platform}`);
  }
  return adapter;
}

/** List all registered (non-placeholder) adapters. */
export function listAdapters(): PlatformAdapter[] {
  return Object.values(platforms).filter(Boolean);
}

export type { PlatformAdapter, PlatformId } from "./types";
export type { SendResult, AccountInfo, OAuthTokenResponse } from "./types";
