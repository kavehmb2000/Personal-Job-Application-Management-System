import { NextResponse } from "next/server";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { revokeGoogleDriveAuthorization } from "@/lib/storage/google-drive-authorization-service";

export async function POST() {
  try {
    const owner = await getCurrentOwner();

    await revokeGoogleDriveAuthorization(owner.id);

    return NextResponse.json({
      revoked: true,
    });
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return errorToResponse(new UnauthorizedError(error.message));
    }

    return errorToResponse(error);
  }
}
