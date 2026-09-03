import { z } from "zod";

const googleDriveOAuthConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.url(),
});

function getGoogleDriveOAuthConfig() {
  return googleDriveOAuthConfigSchema.parse({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI,
  });
}

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
];

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function createGoogleDriveAuthorizationUrl(state: string): string {
  if (!state) {
    throw new Error("OAuth state is required");
  }

  const config = getGoogleDriveOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

export interface GoogleDriveTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeGoogleDriveAuthorizationCode(
  code: string,
): Promise<GoogleDriveTokenResponse> {
  if (!code) {
    throw new Error("OAuth authorization code is required");
  }

  const config = getGoogleDriveOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;

  return z
    .object({
      access_token: z.string().min(1),
      expires_in: z.number(),
      token_type: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      scope: z.string().optional(),
    })
    .parse(payload);
}
