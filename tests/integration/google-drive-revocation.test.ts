import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { revokeGoogleDriveAuthorization } from "@/lib/storage/google-drive-authorization-service";

describe("Google Drive authorization revocation", () => {
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

  it("revokes the Google authorization and records the audit event", async () => {
    const owner = await createOwner(
      `drive-revoke-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "refresh-token-to-revoke",
      },
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );

    await revokeGoogleDriveAuthorization(owner.id);

    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(options).toMatchObject({
      method: "POST",
    });

    const body = String(options?.body);

    expect(body).toContain("token=refresh-token-to-revoke");

    const authorization = await prisma.googleDriveAuthorization.findUnique({
      where: {
        ownerId: owner.id,
      },
    });

    expect(authorization).not.toBeNull();
    expect(authorization?.revokedAt).toBeInstanceOf(Date);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        ownerId: owner.id,
        type: "DRIVE_AUTH_REVOKED",
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

    expect(auditEvent).not.toBeNull();
    expect(auditEvent?.targetType).toBe("GoogleDriveAuthorization");
    expect(auditEvent?.targetId).toBe(owner.id);
    expect(auditEvent?.metadata).toEqual({
      provider: "google-drive",
    });
  });

  it("does not mark authorization revoked when Google rejects revocation", async () => {
    const owner = await createOwner(
      `drive-revoke-failure-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "refresh-token-revoke-failure",
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 400,
      }),
    );

    await expect(revokeGoogleDriveAuthorization(owner.id)).rejects.toThrow(
      "Google Drive revocation failed: 400",
    );

    const authorization = await prisma.googleDriveAuthorization.findUnique({
      where: {
        ownerId: owner.id,
      },
    });

    expect(authorization?.revokedAt).toBeNull();

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        ownerId: owner.id,
        type: "DRIVE_AUTH_REVOKED",
      },
    });

    expect(auditEvent).toBeNull();
  });

  it("rejects an owner without Google Drive authorization", async () => {
    const owner = await createOwner(
      `drive-revoke-missing-${crypto.randomUUID()}@example.com`,
    );

    await expect(revokeGoogleDriveAuthorization(owner.id)).rejects.toThrow(
      "Google Drive authorization is not configured",
    );
  });

  it("does not revoke an authorization that is already revoked", async () => {
    const owner = await createOwner(
      `drive-revoke-existing-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "already-revoked-token",
        revokedAt: new Date(),
      },
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(revokeGoogleDriveAuthorization(owner.id)).rejects.toThrow(
      "Google Drive authorization is already revoked",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose the refresh token in the audit event", async () => {
    const owner = await createOwner(
      `drive-revoke-audit-${crypto.randomUUID()}@example.com`,
    );

    const refreshToken = "secret-refresh-token";

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken,
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );

    await revokeGoogleDriveAuthorization(owner.id);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        ownerId: owner.id,
        type: "DRIVE_AUTH_REVOKED",
      },
    });

    expect(JSON.stringify(auditEvent?.metadata)).not.toContain(refreshToken);
  });
});
