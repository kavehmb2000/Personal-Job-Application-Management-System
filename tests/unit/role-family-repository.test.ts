import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { RoleFamilyRepository } from "@/lib/repositories/role-family-repository";

describe("RoleFamilyRepository", () => {
  const repository = new RoleFamilyRepository();

  let ownerId: string;
  let otherOwnerId: string;

  let roleFamilyId: string;

  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        email,
        googleSubject: `test:${email}`,
        displayName: email,
      },
    });
  }

  beforeEach(async () => {
    const [owner, otherOwner] = await Promise.all([
      createOwner(`role-family-a-${crypto.randomUUID()}@example.com`),
      createOwner(`role-family-b-${crypto.randomUUID()}@example.com`),
    ]);

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const roleFamily = await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Software Engineering",
        sortOrder: 10,
        isActive: true,
      },
    });

    roleFamilyId = roleFamily.id;

    await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Product Management",
        sortOrder: 20,
        isActive: true,
      },
    });

    await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Inactive Family",
        sortOrder: 30,
        isActive: false,
      },
    });

    await prisma.roleFamily.create({
      data: {
        ownerId: otherOwnerId,
        name: "Software Engineering",
        sortOrder: 10,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    await prisma.roleFamily.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerId, otherOwnerId],
        },
      },
    });
  });

  it("gets a role family within the owner's scope", async () => {
    const roleFamily = await repository.getById(ownerId, roleFamilyId);

    expect(roleFamily).not.toBeNull();
    expect(roleFamily?.id).toBe(roleFamilyId);
    expect(roleFamily?.ownerId).toBe(ownerId);
    expect(roleFamily?.name).toBe("Software Engineering");
  });

  it("does not get a role family outside the owner's scope", async () => {
    const roleFamily = await repository.getById(otherOwnerId, roleFamilyId);

    expect(roleFamily).toBeNull();
  });

  it("lists active role families in sort order", async () => {
    const roleFamilies = await repository.listActive(ownerId);

    expect(roleFamilies.map((roleFamily) => roleFamily.name)).toEqual([
      "Software Engineering",
      "Product Management",
    ]);
  });

  it("does not return inactive role families", async () => {
    const roleFamilies = await repository.listActive(ownerId);

    expect(
      roleFamilies.some((roleFamily) => roleFamily.name === "Inactive Family"),
    ).toBe(false);
  });

  it("does not return another owner's role families", async () => {
    const roleFamilies = await repository.listActive(ownerId);

    expect(
      roleFamilies.every((roleFamily) => roleFamily.ownerId === ownerId),
    ).toBe(true);
  });
});
