import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { createGoogleDriveAuthorizationUrl } from "@/lib/storage/google-drive-oauth";

const OAUTH_STATE_COOKIE = "google-drive-oauth-state";

export async function GET() {
  try {
    await getCurrentOwner();

    const state = randomBytes(32).toString("hex");

    const response = NextResponse.redirect(
      createGoogleDriveAuthorizationUrl(state),
    );

    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/storage/google-drive",
      maxAge: 10 * 60,
    });

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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Google Drive authorization",
      },
      { status: 500 },
    );
  }
}
