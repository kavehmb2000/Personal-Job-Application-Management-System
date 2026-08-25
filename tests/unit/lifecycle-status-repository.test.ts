import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LifecycleStateKey } from "@prisma/client";

import { prisma } from "@/lib/db";
import { LifecycleStatusRepository } from "@/lib/repositories/lifecycle-status-repository";

describe("LifecycleStatusRepository", () => {
  const repository = new LifecycleStatusRepository();

  let ownerId: string;
  let otherOwnerId: string;

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
      createOwner(`lifecycle-status-a-${crypto.randomUUID()}@example.com`),
      createOwner(`lifecycle-status-b-${crypto.randomUUID()}@example.com`),
    ]);

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    await prisma.lifecycleStatus.createMany({
      data: [
        {
          ownerId,
          key: "DISCOVERED",
          label: "Discovered",
          sortOrder: 10,
          isTerminal: false,
          isActive: true,
        },
        {
          ownerId,
          key: "SUBMITTED",
          label: "Submitted",
          sortOrder: 20,
          isTerminal: false,
          isActive: true,
        },
        {
          ownerId,
          key: "CLOSED",
          label: "Closed",
          sortOrder: 50,
          isTerminal: true,
          isActive: false,
        },
        {
          ownerId: otherOwnerId,
          key: "DISCOVERED",
          label: "Discovered",
          sortOrder: 10,
          isTerminal: false,
          isActive: true,
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.lifecycleStatus.deleteMany({
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

  it("gets an active lifecycle status by key within owner scope", async () => {
    const status = await repository.getByKey(ownerId, "DISCOVERED");

    expect(status).not.toBeNull();
    expect(status?.ownerId).toBe(ownerId);
    expect(status?.key).toBe("DISCOVERED");
    expect(status?.isActive).toBe(true);
  });

  it("does not return a lifecycle status belonging to another owner", async () => {
    const status = await repository.getByKey(ownerId, "DISCOVERED");

    expect(status?.ownerId).not.toBe(otherOwnerId);
  });

  it("does not return an inactive lifecycle status", async () => {
    const status = await repository.getByKey(ownerId, "CLOSED");

    expect(status).toBeNull();
  });

  it("returns active lifecycle statuses in sort order", async () => {
    const statuses = await repository.listActive(ownerId);

    expect(statuses.map((status) => status.key)).toEqual([
      "DISCOVERED",
      "SUBMITTED",
    ]);
  });

  it("does not expose another owner's statuses when listing", async () => {
    const statuses = await repository.listActive(ownerId);

    expect(statuses.every((status) => status.ownerId === ownerId)).toBe(true);
  });
});
