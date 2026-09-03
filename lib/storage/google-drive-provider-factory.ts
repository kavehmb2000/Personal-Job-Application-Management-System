import { z } from "zod";

import { prisma } from "@/lib/db";
import { GoogleDriveStorageProvider } from "@/lib/storage/google-drive-storage-provider";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const googleDriveOAuthConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

function getGoogleDriveOAuthConfig() {
  return googleDriveOAuthConfigSchema.parse({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  });
}

const googleDriveTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number(),
  token_type: z.string().min(1),
});

async function refreshGoogleDriveAccessToken(
  refreshToken: string,
): Promise<string> {
  const config = getGoogleDriveOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Drive token refresh failed: ${response.status}`);
  }

  const payload = googleDriveTokenResponseSchema.parse(await response.json());

  return payload.access_token;
}

export async function createGoogleDriveStorageProvider(
  ownerId: string,
): Promise<GoogleDriveStorageProvider> {
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
    throw new Error("Google Drive authorization is revoked");
  }

  const accessToken = await refreshGoogleDriveAccessToken(
    authorization.refreshToken,
  );

  return new GoogleDriveStorageProvider(accessToken);
}
