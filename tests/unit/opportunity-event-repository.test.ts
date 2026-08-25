import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { OpportunityEventRepository } from "@/lib/repositories/opportunity-event-repository";

describe("OpportunityEventRepository", () => {
  const repository = new OpportunityEventRepository();

  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;
  let otherOpportunityId: string;

  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        email,
        googleSubject: `test:${email}`,
        displayName: email,
      },
    });
  }

  async function createOpportunity(ownerId: string, companyName: string) {
    const status = await prisma.lifecycleStatus.findFirst({
      where: {
        ownerId,
        key: "DISCOVERED",
        isActive: true,
      },
    });

    if (!status) {
      throw new Error(
        `DISCOVERED lifecycle status not found for owner ${ownerId}`,
      );
    }

    return prisma.opportunity.create({
      data: {
        ownerId,
        companyName,
        positionTitle: "Software Engineer",
        statusId: status.id,
      },
    });
  }

  beforeEach(async () => {
    const [owner, otherOwner] = await Promise.all([
      createOwner(
        `opportunity-event-repository-a-${crypto.randomUUID()}@example.com`,
      ),
      createOwner(
        `opportunity-event-repository-b-${crypto.randomUUID()}@example.com`,
      ),
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
          ownerId: otherOwnerId,
          key: "DISCOVERED",
          label: "Discovered",
          sortOrder: 10,
          isTerminal: false,
          isActive: true,
        },
      ],
    });

    const [opportunity, otherOpportunity] = await Promise.all([
      createOpportunity(ownerId, "Acme Corporation"),
      createOpportunity(otherOwnerId, "Other Corporation"),
    ]);

    opportunityId = opportunity.id;
    otherOpportunityId = otherOpportunity.id;
  });

  afterEach(async () => {
    await prisma.opportunityEvent.deleteMany({
      where: {
        opportunityId: {
          in: [opportunityId, otherOpportunityId],
        },
      },
    });

    await prisma.opportunity.deleteMany({
      where: {
        id: {
          in: [opportunityId, otherOpportunityId],
        },
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.artefact.deleteMany({
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

  it("creates an event within the Opportunity owner's scope", async () => {
    const occurredAt = new Date("2026-08-19T08:00:00.000Z");

    const event = await repository.create(ownerId, opportunityId, {
      occurredAt,
      type: "COMMUNICATION",
      title: "Follow-up email sent",
      descriptionMarkdown: "Sent a follow-up email.",
    });

    expect(event.opportunityId).toBe(opportunityId);
    expect(event.type).toBe("COMMUNICATION");
    expect(event.title).toBe("Follow-up email sent");
    expect(event.descriptionMarkdown).toBe("Sent a follow-up email.");
    expect(event.systemGenerated).toBe(false);
  });

  it("does not create an event for an Opportunity outside the owner's scope", async () => {
    await expect(
      repository.create(ownerId, otherOpportunityId, {
        occurredAt: new Date(),
        type: "COMMUNICATION",
        title: "Should not be created",
      }),
    ).rejects.toThrow();
  });

  it("gets an event within the owner's scope", async () => {
    const created = await repository.create(ownerId, opportunityId, {
      occurredAt: new Date(),
      type: "INTERVIEW_SCHEDULED",
      title: "Interview scheduled",
    });

    const event = await repository.getById(ownerId, opportunityId, created.id);

    expect(event).not.toBeNull();
    expect(event?.id).toBe(created.id);
    expect(event?.opportunityId).toBe(opportunityId);
  });

  it("does not get an event outside the owner's scope", async () => {
    const created = await repository.create(ownerId, opportunityId, {
      occurredAt: new Date(),
      type: "COMMUNICATION",
      title: "Private event",
    });

    const event = await repository.getById(
      otherOwnerId,
      opportunityId,
      created.id,
    );

    expect(event).toBeNull();
  });

  it("lists events chronologically", async () => {
    const later = new Date("2026-08-19T10:00:00.000Z");
    const earlier = new Date("2026-08-19T08:00:00.000Z");

    await repository.create(ownerId, opportunityId, {
      occurredAt: later,
      type: "COMMUNICATION",
      title: "Later event",
    });

    await repository.create(ownerId, opportunityId, {
      occurredAt: earlier,
      type: "INTERVIEW_SCHEDULED",
      title: "Earlier event",
    });

    const events = await repository.listForOpportunity(ownerId, opportunityId);

    expect(events.map((event) => event.title)).toEqual([
      "Earlier event",
      "Later event",
    ]);
  });

  it("does not list events outside the owner's scope", async () => {
    await repository.create(ownerId, opportunityId, {
      occurredAt: new Date(),
      type: "COMMUNICATION",
      title: "Owner event",
    });

    const events = await repository.listForOpportunity(
      otherOwnerId,
      opportunityId,
    );

    expect(events).toHaveLength(0);
  });

  it("does not change the Opportunity lifecycle state or version", async () => {
    const before = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityId,
      },
    });

    await repository.create(ownerId, opportunityId, {
      occurredAt: new Date(),
      type: "COMMUNICATION",
      title: "Communication recorded",
    });

    const after = await prisma.opportunity.findUniqueOrThrow({
      where: {
        id: opportunityId,
      },
    });

    expect(after.statusId).toBe(before.statusId);
    expect(after.version).toBe(before.version);
  });

  it("creates an event with optional artefact associations", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "CV",
        type: "CV",
        contentMarkdown: "# My CV",
      },
    });

    const event = await repository.create(ownerId, opportunityId, {
      occurredAt: new Date("2026-08-19T08:00:00.000Z"),
      type: "DOCUMENT_REQUESTED",
      title: "CV requested",
      artefactIds: [artefact.id],
    });

    const links = await prisma.eventArtefact.findMany({
      where: {
        eventId: event.id,
      },
    });

    expect(links).toHaveLength(1);
    expect(links[0].artefactId).toBe(artefact.id);
  });

  it("does not associate an artefact belonging to another owner", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other owner's CV",
        type: "CV",
        contentMarkdown: "# Other CV",
      },
    });

    await expect(
      repository.create(ownerId, opportunityId, {
        occurredAt: new Date(),
        type: "DOCUMENT_REQUESTED",
        title: "Invalid artefact association",
        artefactIds: [artefact.id],
      }),
    ).rejects.toThrow();

    const events = await prisma.opportunityEvent.findMany({
      where: {
        opportunityId,
      },
    });

    expect(events).toHaveLength(0);
  });
});
