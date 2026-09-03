import { prisma } from "@/lib/db";
import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { exchangeGoogleDriveAuthorizationCode } from "@/lib/storage/google-drive-oauth";
import { NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "google-drive-oauth-state";

export async function GET(request: Request) {
  const redirectUrl = new URL("/settings", request.url);

  try {
    const owner = await getCurrentOwner();
    const requestUrl = new URL(request.url);

    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");

    const storedState = request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${OAUTH_STATE_COOKIE}=`))
      ?.slice(`${OAUTH_STATE_COOKIE}=`.length);

    if (!state || !storedState || state !== storedState) {
      redirectUrl.searchParams.set("error", "invalid_oauth_state");

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(OAUTH_STATE_COOKIE);

      return response;
    }

    if (error) {
      redirectUrl.searchParams.set("error", error);

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(OAUTH_STATE_COOKIE);

      return response;
    }

    if (!code) {
      redirectUrl.searchParams.set("error", "missing_authorization_code");

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(OAUTH_STATE_COOKIE);

      return response;
    }

    const tokenResponse = await exchangeGoogleDriveAuthorizationCode(code);

    const existingAuthorization =
      await prisma.googleDriveAuthorization.findUnique({
        where: {
          ownerId: owner.id,
        },
      });

    const refreshToken =
      tokenResponse.refresh_token ?? existingAuthorization?.refreshToken;

    if (!refreshToken) {
      redirectUrl.searchParams.set("error", "missing_refresh_token");

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(OAUTH_STATE_COOKIE);

      return response;
    }

    await prisma.$transaction(async (tx) => {
      await tx.googleDriveAuthorization.upsert({
        where: {
          ownerId: owner.id,
        },
        create: {
          ownerId: owner.id,
          refreshToken,
          authorizedAt: new Date(),
          revokedAt: null,
        },
        update: {
          refreshToken,
          authorizedAt: new Date(),
          revokedAt: null,
        },
      });

      await tx.auditEvent.create({
        data: {
          ownerId: owner.id,
          type: "DRIVE_AUTHORIZED",
          targetType: "GoogleDriveAuthorization",
          targetId: owner.id,
          metadata: {
            provider: "google-drive",
          },
        },
      });
    });

    redirectUrl.searchParams.set("googleDrive", "authorized");

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(OAUTH_STATE_COOKIE);

    return response;
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 401 },
      );
    }

    redirectUrl.searchParams.set(
      "error",
      error instanceof Error
        ? error.message
        : "google_drive_authorization_failed",
    );

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(OAUTH_STATE_COOKIE);

    return response;
  }
}
