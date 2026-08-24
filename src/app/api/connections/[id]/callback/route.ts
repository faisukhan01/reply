/**
 * GET /api/connections/[id]/callback
 *
 * OAuth callback handler. Verifies the state token, exchanges the code
 * for an access token, fetches the account info, and persists the
 * PlatformConnection.
 *
 * On success: redirect to /connections?connected=PLATFORM
 * On error:   redirect to /connections?error=MSG
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdapter } from "@/lib/platforms";
import { verifyState } from "@/lib/platforms/_state";
import { encryptToken } from "@/lib/platforms/_crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const platform = id;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const origin = req.nextUrl.origin;
  const baseUrl = `${origin}/connections`;

  // OAuth provider can return an error directly (user denied, etc.)
  if (errorParam) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorDesc || errorParam)}&platform=${platform}`
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("Missing code or state in callback.")}&platform=${platform}`
    );
  }

  // Verify the state matches what we issued in /connect.
  const cookieState = req.cookies.get("replyai.oauth.state")?.value;
  const cookieUid = req.cookies.get("replyai.oauth.uid")?.value;
  if (!cookieState || !cookieUid) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("OAuth session expired. Try connecting again.")}&platform=${platform}`
    );
  }
  if (!verifyState(state) || state !== cookieState) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("Invalid OAuth state token.")}&platform=${platform}`
    );
  }

  let adapter;
  try {
    adapter = getAdapter(platform);
  } catch (err) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(String(err))}&platform=${platform}`
    );
  }

  const redirectUri = `${origin}${adapter.oauthConfig!.redirectPath}`;

  try {
    const tokenResp = await adapter.exchangeCodeForToken(code, redirectUri);
    const accountInfo = await adapter.getAccountInfo(tokenResp.accessToken);

    // Look up the user (from the cookie) to make sure they still exist
    // and get the orgId.
    const user = await db.user.findUnique({
      where: { id: cookieUid },
      select: { id: true, orgId: true },
    });
    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}?error=${encodeURIComponent("User not found.")}&platform=${platform}`
      );
    }

    const accessTokenEnc = encryptToken(tokenResp.accessToken);
    const refreshTokenEnc = tokenResp.refreshToken
      ? encryptToken(tokenResp.refreshToken)
      : null;

    // Upsert in case the user is reconnecting the same account.
    await db.platformConnection.upsert({
      where: {
        orgId_platform_accountId: {
          orgId: user.orgId,
          platform,
          accountId: accountInfo.accountId,
        },
      },
      update: {
        userId: user.id,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: accountInfo.tokenExpiresAt ?? tokenResp.expiresAt ?? null,
        accountName: accountInfo.accountName,
        accountHandle: accountInfo.accountHandle,
        scopes: JSON.stringify(accountInfo.scopes ?? tokenResp.scopes ?? []),
        status: "ACTIVE",
      },
      create: {
        orgId: user.orgId,
        userId: user.id,
        platform,
        accountId: accountInfo.accountId,
        accountName: accountInfo.accountName,
        accountHandle: accountInfo.accountHandle,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: accountInfo.tokenExpiresAt ?? tokenResp.expiresAt ?? null,
        scopes: JSON.stringify(accountInfo.scopes ?? tokenResp.scopes ?? []),
        status: "ACTIVE",
      },
    });

    // Clear the OAuth cookies — they've served their purpose.
    const res = NextResponse.redirect(
      `${baseUrl}?connected=${platform}&account=${encodeURIComponent(accountInfo.accountName)}`
    );
    res.cookies.delete("replyai.oauth.state");
    res.cookies.delete("replyai.oauth.uid");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(msg)}&platform=${platform}`
    );
  }
}
