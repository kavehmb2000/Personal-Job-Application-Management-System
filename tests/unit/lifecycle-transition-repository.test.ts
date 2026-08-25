import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { LifecycleTransitionRepository } from "@/lib/repositories/lifecycle-transition-repository";

describe("LifecycleTransitionRepository", () => {
  const repository = new LifecycleTransitionRepository();

  let ownerId: string;
  let otherOwnerId: string;

  let fromStatusId: string;
  let toStatusId: string;

  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        email,
        googleSubject: `test:${email}`,
        displayName: email,
      },
    });
  }

  async function createStatus(
    ownerId: string,
    key: "DISCOVERED" | "SUBMITTED",
    label: string,
    sortOrder: number,
  ) {
    return prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key,
        label,
        sortOrder,
        isTerminal: false,
        isActive: true,
      },
    });
  }

  beforeEach(async () => {
    const [owner, otherOwner] = await Promise.all([
      createOwner(`lifecycle-transition-a-${crypto.randomUUID()}@example.com`),
      createOwner(`lifecycle-transition-b-${crypto.randomUUID()}@example.com`),
    ]);

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const [fromStatus, toStatus] = await Promise.all([
      createStatus(ownerId, "DISCOVERED", "Discovered", 10),
      createStatus(ownerId, "SUBMITTED", "Submitted", 20),
    ]);

    fromStatusId = fromStatus.id;
    toStatusId = toStatus.id;

    await prisma.lifecycleTransition.create({
      data: {
        fromStatusId,
        toStatusId,
      },
    });
  });

  afterEach(async () => {
    await prisma.lifecycleTransition.deleteMany({
      where: {
        OR: [{ fromStatusId }, { toStatusId }],
      },
    });

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

  it("finds an existing transition", async () => {
    const transition = await repository.findTransition(
      ownerId,
      fromStatusId,
      toStatusId,
    );

    expect(transition).not.toBeNull();
    expect(transition?.fromStatusId).toBe(fromStatusId);
    expect(transition?.toStatusId).toBe(toStatusId);
  });

  it("returns null for a transition that does not exist", async () => {
    const transition = await repository.findTransition(
      ownerId,
      toStatusId,
      fromStatusId,
    );

    expect(transition).toBeNull();
  });

  it("does not return a transition outside the owner's scope", async () => {
    const transition = await repository.findTransition(
      otherOwnerId,
      fromStatusId,
      toStatusId,
    );

    expect(transition).toBeNull();
  });

  it("returns transitions originating from a status within the owner's scope", async () => {
    const transitions = await repository.listFromStatus(ownerId, fromStatusId);

    expect(transitions).toHaveLength(1);
    expect(transitions[0].fromStatusId).toBe(fromStatusId);
    expect(transitions[0].toStatusId).toBe(toStatusId);
  });

  it("does not list transitions from another owner's status", async () => {
    const transitions = await repository.listFromStatus(
      otherOwnerId,
      fromStatusId,
    );

    expect(transitions).toHaveLength(0);
  });
});
