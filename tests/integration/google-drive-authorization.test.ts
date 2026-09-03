import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

describe("Google Drive authorization persistence", () => {
  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        googleSubject: `google-${crypto.randomUUID()}`,
        email,
        displayName: "Test Owner",
      },
    });
  }

  it("stores one authorization for an owner", async () => {
    const owner = await createOwner(
      `google-drive-auth-${crypto.randomUUID()}@example.com`,
    );

    const authorizedAt = new Date();

    const authorization = await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "refresh-token-test",
        authorizedAt,
      },
    });

    const stored = await prisma.googleDriveAuthorization.findUnique({
      where: {
        ownerId: owner.id,
      },
    });

    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(authorization.id);
    expect(stored?.ownerId).toBe(owner.id);
    expect(stored?.refreshToken).toBe("refresh-token-test");
    expect(stored?.revokedAt).toBeNull();
    expect(stored?.authorizedAt).toEqual(authorizedAt);
  });

  it("enforces one authorization per owner", async () => {
    const owner = await createOwner(
      `google-drive-auth-unique-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "first-refresh-token",
      },
    });

    await expect(
      prisma.googleDriveAuthorization.create({
        data: {
          ownerId: owner.id,
          refreshToken: "second-refresh-token",
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("can revoke an authorization without deleting it", async () => {
    const owner = await createOwner(
      `google-drive-auth-revoke-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "refresh-token-to-revoke",
      },
    });

    const revokedAt = new Date();

    await prisma.googleDriveAuthorization.update({
      where: {
        ownerId: owner.id,
      },
      data: {
        revokedAt,
      },
    });

    const stored = await prisma.googleDriveAuthorization.findUnique({
      where: {
        ownerId: owner.id,
      },
    });

    expect(stored).not.toBeNull();
    expect(stored?.refreshToken).toBe("refresh-token-to-revoke");
    expect(stored?.revokedAt).toEqual(revokedAt);
  });

  it("keeps authorizations isolated between owners", async () => {
    const ownerA = await createOwner(
      `google-drive-auth-owner-a-${crypto.randomUUID()}@example.com`,
    );

    const ownerB = await createOwner(
      `google-drive-auth-owner-b-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: ownerA.id,
        refreshToken: "owner-a-refresh-token",
      },
    });

    const ownerBAuthorization =
      await prisma.googleDriveAuthorization.findUnique({
        where: {
          ownerId: ownerB.id,
        },
      });

    expect(ownerBAuthorization).toBeNull();

    const ownerAAuthorization =
      await prisma.googleDriveAuthorization.findUnique({
        where: {
          ownerId: ownerA.id,
        },
      });

    expect(ownerAAuthorization?.refreshToken).toBe("owner-a-refresh-token");
  });

  it("supports replacing an existing authorization for the same owner", async () => {
    const owner = await createOwner(
      `google-drive-auth-replace-${crypto.randomUUID()}@example.com`,
    );

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId: owner.id,
        refreshToken: "old-refresh-token",
        revokedAt: new Date(),
      },
    });

    const authorizedAt = new Date();

    const replaced = await prisma.googleDriveAuthorization.update({
      where: {
        ownerId: owner.id,
      },
      data: {
        refreshToken: "new-refresh-token",
        authorizedAt,
        revokedAt: null,
      },
    });

    expect(replaced.ownerId).toBe(owner.id);
    expect(replaced.refreshToken).toBe("new-refresh-token");
    expect(replaced.authorizedAt).toEqual(authorizedAt);
    expect(replaced.revokedAt).toBeNull();
  });
});
