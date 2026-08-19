import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("Opportunity persistence", () => {
  let ownerId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;
  let roleFamilyId: string;

  beforeAll(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        googleSubject: "integration-test-opportunity-owner",
        email: "integration-opportunity-owner@example.test",
        displayName: "Integration Test Owner",
      },
    });

    ownerId = owner.id;

    const discoveredStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    discoveredStatusId = discoveredStatus.id;

    const submittedStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "SUBMITTED",
        label: "Submitted",
        sortOrder: 2,
        isTerminal: false,
        isActive: true,
      },
    });

    submittedStatusId = submittedStatus.id;

    const roleFamily = await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Software Engineering",
        sortOrder: 1,
        isActive: true,
      },
    });

    roleFamilyId = roleFamily.id;
  });

  afterAll(async () => {
    await prisma.opportunity.deleteMany({
      where: {
        ownerId,
      },
    });

    await prisma.roleFamily.deleteMany({
      where: {
        ownerId,
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId,
      },
    });

    await prisma.ownerAccount.delete({
      where: {
        id: ownerId,
      },
    });

    await prisma.$disconnect();
  });

  it("persists a new Opportunity with DISCOVERED as its initial status", async () => {
    const opportunity = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
      },
      include: {
        status: true,
      },
    });

    expect(opportunity.companyName).toBe("Acme Corporation");
    expect(opportunity.positionTitle).toBe("Senior Software Engineer");

    expect(opportunity.status.key).toBe("DISCOVERED");
    expect(opportunity.version).toBe(1);
    expect(opportunity.archivedAt).toBeNull();
  });

  it("persists the canonical optional Opportunity fields", async () => {
    const nextActionDueAt = new Date("2026-08-20T09:00:00.000Z");

    const created = await prisma.opportunity.create({
      data: {
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
        companyName: "Acme Corporation",
        positionTitle: "Principal Engineer",
        jobUrl: "https://example.test/jobs/123",
        location: "Frankfurt",
        country: "Germany",
        source: "LinkedIn",
        roleFamily: {
          connect: {
            id: roleFamilyId,
          },
        },
        fitScore: 85,
        nextAction: "Prepare technical interview",
        nextActionDueAt,
      },
    });

    const reloaded = await prisma.opportunity.findUnique({
      where: {
        id: created.id,
      },
      include: {
        roleFamily: true,
      },
    });

    expect(reloaded).not.toBeNull();

    expect(reloaded?.jobUrl).toBe("https://example.test/jobs/123");
    expect(reloaded?.location).toBe("Frankfurt");
    expect(reloaded?.country).toBe("Germany");
    expect(reloaded?.source).toBe("LinkedIn");
    expect(reloaded?.roleFamily?.name).toBe("Software Engineering");
    expect(reloaded?.fitScore).toBe(85);
    expect(reloaded?.nextAction).toBe("Prepare technical interview");
    expect(reloaded?.nextActionDueAt).toEqual(nextActionDueAt);
  });

  it("persists and reloads an Opportunity without losing its owner boundary", async () => {
    const created = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
      },
    });

    const reloaded = await prisma.opportunity.findUnique({
      where: {
        id: created.id,
      },
      include: {
        owner: true,
      },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.ownerId).toBe(ownerId);
    expect(reloaded?.owner.id).toBe(ownerId);
  });

  it("persists an updated lifecycle status", async () => {
    const created = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
      },
    });

    await prisma.opportunity.update({
      where: {
        id: created.id,
      },
      data: {
        status: {
          connect: {
            id: submittedStatusId,
          },
        },
      },
    });

    const reloaded = await prisma.opportunity.findUnique({
      where: {
        id: created.id,
      },
      include: {
        status: true,
      },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.status.key).toBe("SUBMITTED");
  });

  it("persists archive state without changing lifecycle status", async () => {
    const created = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
      },
      include: {
        status: true,
      },
    });

    const archivedAt = new Date("2026-08-18T12:00:00.000Z");

    await prisma.opportunity.update({
      where: {
        id: created.id,
      },
      data: {
        archivedAt,
      },
    });

    const reloaded = await prisma.opportunity.findUnique({
      where: {
        id: created.id,
      },
      include: {
        status: true,
      },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.archivedAt).toEqual(archivedAt);
    expect(reloaded?.status.key).toBe("DISCOVERED");
  });

  it("persists restore state without changing lifecycle status", async () => {
    const created = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
        archivedAt: new Date("2026-08-18T12:00:00.000Z"),
      },
      include: {
        status: true,
      },
    });

    await prisma.opportunity.update({
      where: {
        id: created.id,
      },
      data: {
        archivedAt: null,
      },
    });

    const reloaded = await prisma.opportunity.findUnique({
      where: {
        id: created.id,
      },
      include: {
        status: true,
      },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.archivedAt).toBeNull();
    expect(reloaded?.status.key).toBe("DISCOVERED");
  });

  it("preserves the Opportunity version value", async () => {
    const created = await prisma.opportunity.create({
      data: {
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        owner: {
          connect: {
            id: ownerId,
          },
        },
        status: {
          connect: {
            id: discoveredStatusId,
          },
        },
      },
    });

    expect(created.version).toBe(1);

    const updated = await prisma.opportunity.update({
      where: {
        id: created.id,
      },
      data: {
        version: {
          increment: 1,
        },
      },
    });

    expect(updated.version).toBe(2);
  });
});
