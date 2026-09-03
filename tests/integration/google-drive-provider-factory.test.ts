import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { createGoogleDriveStorageProvider } from "@/lib/storage/google-drive-provider-factory";

describe("Google Drive provider factory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        googleSubject: `google-${crypto.randomUUID()}`,
        email,
        displayName: "Test Owner",
      },
    });
  }

  it("creates a provider using a refreshed access token", async () => {
    const owner = await createOwner(
      `drive-provider-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "refresh-token-test",
      },
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "fresh-access-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider = await createGoogleDriveStorageProvider(owner.id);

    expect(provider.provider).toBe("google-drive");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(options).toMatchObject({
      method: "POST",
    });

    const body = String(options?.body);

    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=refresh-token-test");
  });

  it("rejects an owner without Google Drive authorization", async () => {
    const owner = await createOwner(
      `drive-provider-missing-${crypto.randomUUID()}@example.com`,
    );

    await expect(createGoogleDriveStorageProvider(owner.id)).rejects.toThrow(
      "Google Drive authorization is not configured",
    );
  });

  it("rejects a revoked authorization", async () => {
    const owner = await createOwner(
      `drive-provider-revoked-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "revoked-refresh-token",
        revokedAt: new Date(),
      },
    });

    await expect(createGoogleDriveStorageProvider(owner.id)).rejects.toThrow(
      "Google Drive authorization is revoked",
    );
  });

  it("fails when Google rejects the refresh token", async () => {
    const owner = await createOwner(
      `drive-provider-refresh-failure-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "invalid-refresh-token",
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await expect(createGoogleDriveStorageProvider(owner.id)).rejects.toThrow(
      "Google Drive token refresh failed: 400",
    );
  });
});
