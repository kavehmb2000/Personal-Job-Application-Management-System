import { prisma } from "@/lib/db";

const GOOGLE_TOKEN_REVOCATION_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export async function revokeGoogleDriveAuthorization(
  ownerId: string,
): Promise<void> {
  if (!ownerId.trim()) {
    throw new Error("Owner ID is required");
  }

  const authorization = await prisma.googleDriveAuthorization.findUnique({
    where: {
      ownerId,
    },
  });

  if (!authorization) {
    throw new Error("Google Drive authorization is not configured");
  }

  if (authorization.revokedAt) {
    throw new Error("Google Drive authorization is already revoked");
  }

  const response = await fetch(GOOGLE_TOKEN_REVOCATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: authorization.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Drive revocation failed: ${response.status}`);
  }

  const revokedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.googleDriveAuthorization.update({
      where: {
        ownerId,
      },
      data: {
        revokedAt,
      },
    });

    await tx.auditEvent.create({
      data: {
        ownerId,
        type: "DRIVE_AUTH_REVOKED",
        targetType: "GoogleDriveAuthorization",
        targetId: ownerId,
        metadata: {
          provider: "google-drive",
        },
      },
    });
  });
}
