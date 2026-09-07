import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { AuditEventType } from "@prisma/client";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import { OpportunityService } from "@/lib/services/opportunity-service";

describe("Opportunity archive and restore", () => {
  let ownerA: string;
  let ownerB: string;
  let statusA: string;
  let statusB: string;
  let opportunityA: string;
  let opportunityB: string;

  const repository = new OpportunityRepository();
  const service = new OpportunityService(repository);
  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  beforeEach(async () => {
    await prisma.opportunity.update({
      where: {
        id: opportunityA,
      },
      data: {
        archivedAt: null,
      },
    });

    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });
  });

  beforeAll(async () => {
    const ownerRecordA = await prisma.ownerAccount.create({
      data: {
        googleSubject: `integration-opportunity-archive-owner-a-${testRunId}`,
        email: `opportunity-archive-owner-a-${testRunId}@example.test`,
        displayName: "Opportunity Archive Owner A",
      },
    });

    ownerA = ownerRecordA.id;

    const ownerRecordB = await prisma.ownerAccount.create({
      data: {
        googleSubject: `integration-opportunity-archive-owner-b-${testRunId}`,
        email: `opportunity-archive-owner-b-${testRunId}@example.test`,
        displayName: "Opportunity Archive Owner B",
      },
    });

    ownerB = ownerRecordB.id;

    const statusRecordA = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerA,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    statusA = statusRecordA.id;

    const statusRecordB = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerB,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    statusB = statusRecordB.id;

    const opportunityRecordA = await prisma.opportunity.create({
      data: {
        ownerId: ownerA,
        statusId: statusA,
        companyName: "Owner A Company",
        positionTitle: "Software Engineer",
      },
    });

    opportunityA = opportunityRecordA.id;

    const opportunityRecordB = await prisma.opportunity.create({
      data: {
        ownerId: ownerB,
        statusId: statusB,
        companyName: "Owner B Company",
        positionTitle: "Software Engineer",
      },
    });

    opportunityB = opportunityRecordB.id;
  });

  afterAll(async () => {
    if (!ownerA || !ownerB) {
      await prisma.$disconnect();
      return;
    }

    await prisma.opportunity.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.$disconnect();
  });

  it("archives an opportunity and excludes it from the active list", async () => {
    const opportunity = await repository.getById(ownerA, opportunityA);

    expect(opportunity).not.toBeNull();
    expect(opportunity?.archivedAt).toBeNull();

    const archived = await repository.archive(
      ownerA,
      opportunityA,
      opportunity!.version,
    );

    expect(archived.id).toBe(opportunityA);
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.version).toBe(opportunity!.version + 1);

    const activeOpportunities = await repository.list(ownerA);

    expect(activeOpportunities.some(({ id }) => id === opportunityA)).toBe(
      false,
    );
  });

  it("records an audit event when an opportunity is archived", async () => {
    const opportunity = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    await service.archive(ownerA, opportunityA, opportunity.version);

    const events = await prisma.auditEvent.findMany({
      where: {
        ownerId: ownerA,
        type: AuditEventType.ARCHIVE,
        targetType: "Opportunity",
        targetId: opportunityA,
      },
    });

    expect(events).toHaveLength(1);
  });

  it("records an audit event when an opportunity is restored", async () => {
    const opportunity = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    if (opportunity.archivedAt === null) {
      await repository.archive(ownerA, opportunityA, opportunity.version);
    }

    const archived = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    await service.restore(ownerA, opportunityA, archived.version);

    const events = await prisma.auditEvent.findMany({
      where: {
        ownerId: ownerA,
        type: AuditEventType.RESTORE,
        targetType: "Opportunity",
        targetId: opportunityA,
      },
    });

    expect(events).toHaveLength(1);
  });

  it("restores an archived opportunity and returns it to the active list", async () => {
    const active = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    const archived = await repository.archive(
      ownerA,
      opportunityA,
      active.version,
    );

    expect(archived.archivedAt).not.toBeNull();

    const restored = await repository.restore(
      ownerA,
      opportunityA,
      archived.version,
    );

    expect(archived.archivedAt).not.toBeNull();

    expect(restored.id).toBe(opportunityA);
    expect(restored.archivedAt).toBeNull();
    expect(restored.version).toBe(archived.version + 1);

    const activeOpportunities = await repository.list(ownerA);

    expect(activeOpportunities.some(({ id }) => id === opportunityA)).toBe(
      true,
    );
  });

  it("does not allow one owner to restore another owner's opportunity", async () => {
    await expect(repository.restore(ownerA, opportunityB, 1)).rejects.toThrow(
      /Opportunity .* could not be modified with expected version/,
    );

    const otherOwnerOpportunity = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityB,
      },
    });

    expect(otherOwnerOpportunity.archivedAt).toBeNull();
  });

  it("rejects restoring an opportunity that is already active", async () => {
    const active = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    expect(active.archivedAt).toBeNull();

    await expect(
      repository.restore(ownerA, opportunityA, active.version),
    ).rejects.toThrow(
      /Opportunity .* could not be modified with expected version/,
    );
  });

  it("rejects restoring with a stale version", async () => {
    const active = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    await repository.archive(ownerA, opportunityA, active.version);

    const archived = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityA,
      },
    });

    await expect(
      repository.restore(ownerA, opportunityA, archived.version - 1),
    ).rejects.toThrow(
      /Opportunity .* could not be modified with expected version/,
    );

    await repository.restore(ownerA, opportunityA, archived.version);
  });
});
