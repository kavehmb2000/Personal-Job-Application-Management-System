import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { OpportunityContextService } from "@/lib/services/opportunity-context-service";
import { OpportunityContextRepository } from "@/lib/repositories/opportunity-context-repository";

describe("Opportunity context integration", () => {
  let ownerAId: string;
  let ownerBId: string;

  let ownerAStatusId: string;
  let ownerBStatusId: string;

  let ownerAOpportunityId: string;
  let ownerBOpportunityId: string;

  let ownerAContactId: string;
  let ownerBContactId: string;

  let ownerAArtefactId: string;
  let ownerBArtefactId: string;

  let ownerAScheduledEventId: string;

  const repository = new OpportunityContextRepository(prisma);

  const service = new OpportunityContextService(repository);

  beforeAll(async () => {
    const suffix = Date.now().toString();

    const ownerA = await prisma.ownerAccount.create({
      data: {
        googleSubject: `opportunity-context-owner-a-${suffix}`,
        email: `opportunity-context-a-${suffix}@example.test`,
        displayName: "Opportunity Context Owner A",
      },
    });

    const ownerB = await prisma.ownerAccount.create({
      data: {
        googleSubject: `opportunity-context-owner-b-${suffix}`,
        email: `opportunity-context-b-${suffix}@example.test`,
        displayName: "Opportunity Context Owner B",
      },
    });

    ownerAId = ownerA.id;
    ownerBId = ownerB.id;

    const ownerAStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerAId,
        key: "IN_PROGRESS",
        label: "In Progress",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    const ownerBStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerBId,
        key: "IN_PROGRESS",
        label: "In Progress",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    ownerAStatusId = ownerAStatus.id;
    ownerBStatusId = ownerBStatus.id;

    const ownerAOpportunity = await prisma.opportunity.create({
      data: {
        ownerId: ownerAId,
        statusId: ownerAStatusId,
        companyName: "Owner A Company",
        positionTitle: "Owner A Engineer",
        nextAction: "Prepare interview",
        nextActionDueAt: new Date("2099-08-30T09:00:00.000Z"),
      },
    });

    const ownerBOpportunity = await prisma.opportunity.create({
      data: {
        ownerId: ownerBId,
        statusId: ownerBStatusId,
        companyName: "Owner B Company",
        positionTitle: "Owner B Engineer",
        nextAction: "Contact recruiter",
        nextActionDueAt: new Date("2099-09-01T09:00:00.000Z"),
      },
    });

    ownerAOpportunityId = ownerAOpportunity.id;
    ownerBOpportunityId = ownerBOpportunity.id;

    const ownerAContact = await prisma.contact.create({
      data: {
        ownerId: ownerAId,
        name: "Owner A Contact",
        email: "owner-a-contact@example.test",
      },
    });

    const ownerBContact = await prisma.contact.create({
      data: {
        ownerId: ownerBId,
        name: "Owner B Contact",
        email: "owner-b-contact@example.test",
      },
    });

    ownerAContactId = ownerAContact.id;
    ownerBContactId = ownerBContact.id;

    await prisma.opportunityContact.create({
      data: {
        opportunityId: ownerAOpportunityId,
        contactId: ownerAContactId,
      },
    });

    // Deliberately create a cross-owner association at the
    // persistence level. The context projection must not expose it.
    await prisma.opportunityContact.create({
      data: {
        opportunityId: ownerAOpportunityId,
        contactId: ownerBContactId,
      },
    });

    const ownerAArtefact = await prisma.artefact.create({
      data: {
        ownerId: ownerAId,
        name: "Owner A CV",
        type: "CV",
        contentMarkdown: "# Owner A CV",
      },
    });

    const ownerBArtefact = await prisma.artefact.create({
      data: {
        ownerId: ownerBId,
        name: "Owner B CV",
        type: "CV",
        contentMarkdown: "# Owner B CV",
      },
    });

    ownerAArtefactId = ownerAArtefact.id;
    ownerBArtefactId = ownerBArtefact.id;

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId: ownerAOpportunityId,
        artefactId: ownerAArtefactId,
      },
    });

    // Deliberately create a cross-owner association at the
    // persistence level. The context projection must not expose it.
    await prisma.opportunityArtefact.create({
      data: {
        opportunityId: ownerAOpportunityId,
        artefactId: ownerBArtefactId,
      },
    });

    const scheduledEvent = await prisma.scheduledEvent.create({
      data: {
        opportunityId: ownerAOpportunityId,
        type: "INTERVIEW",
        title: "Technical interview",
        scheduledAt: new Date("2099-08-28T10:00:00.000Z"),
        timeZone: "Europe/Berlin",
      },
    });

    ownerAScheduledEventId = scheduledEvent.id;

    await prisma.userAction.create({
      data: {
        opportunityId: ownerAOpportunityId,
        title: "Prepare interview questions",
        status: "TODO",
        priority: "HIGH",
        dueAt: new Date("2099-08-27T09:00:00.000Z"),
      },
    });

    await prisma.communication.create({
      data: {
        opportunityId: ownerAOpportunityId,
        occurredAt: new Date("2099-08-20T10:00:00.000Z"),
        contact: "owner-a-contact@example.test",
        subject: "Interview scheduling",
        bodyMarkdown: "Interview has been scheduled.",
      },
    });

    await prisma.opportunityNote.create({
      data: {
        opportunityId: ownerAOpportunityId,
        title: "Preparation",
        bodyMarkdown: "Prepare for the technical interview.",
      },
    });

    await prisma.opportunityEvent.create({
      data: {
        opportunityId: ownerAOpportunityId,
        occurredAt: new Date("2099-08-20T09:00:00.000Z"),
        type: "INTERVIEW_SCHEDULED",
        title: "Interview scheduled",
        systemGenerated: false,
      },
    });

    await prisma.submission.create({
      data: {
        opportunityId: ownerAOpportunityId,
        submittedAt: new Date("2099-08-19T09:00:00.000Z"),
        method: "Company portal",
      },
    });
  });

  afterAll(async () => {
    await prisma.opportunity.deleteMany({
      where: {
        id: {
          in: [ownerAOpportunityId, ownerBOpportunityId],
        },
      },
    });

    await prisma.artefact.deleteMany({
      where: {
        id: {
          in: [ownerAArtefactId, ownerBArtefactId],
        },
      },
    });

    await prisma.contact.deleteMany({
      where: {
        id: {
          in: [ownerAContactId, ownerBContactId],
        },
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        id: {
          in: [ownerAStatusId, ownerBStatusId],
        },
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerAId, ownerBId],
        },
      },
    });
  });

  it("returns the complete owner-scoped Opportunity context", async () => {
    const context = await service.getContext(ownerAId, ownerAOpportunityId);

    expect(context).not.toBeNull();

    expect(context?.opportunity.id).toBe(ownerAOpportunityId);

    expect(context?.opportunity.ownerId).toBe(ownerAId);

    expect(context?.currentState.id).toBe(ownerAStatusId);

    expect(context?.notes).toHaveLength(1);
    expect(context?.events).toHaveLength(1);
    expect(context?.submission).not.toBeNull();
    expect(context?.artefacts).toHaveLength(1);
    expect(context?.actions).toHaveLength(1);
    expect(context?.scheduledEvents).toHaveLength(1);
    expect(context?.contacts).toHaveLength(1);
    expect(context?.communications).toHaveLength(1);

    expect(context?.contacts[0]?.id).toBe(ownerAContactId);

    expect(context?.artefacts[0]?.id).toBe(ownerAArtefactId);

    expect(context?.nextScheduledEvent?.id).toBe(ownerAScheduledEventId);
  });

  it("does not return an Opportunity belonging to another owner", async () => {
    const context = await service.getContext(ownerAId, ownerBOpportunityId);

    expect(context).toBeNull();
  });

  it("does not expose cross-owner Contact or Artefact associations", async () => {
    const context = await service.getContext(ownerAId, ownerAOpportunityId);

    expect(context).not.toBeNull();

    expect(context?.contacts.map((contact) => contact.id)).toEqual([
      ownerAContactId,
    ]);

    expect(context?.artefacts.map((artefact) => artefact.id)).toEqual([
      ownerAArtefactId,
    ]);

    expect(
      context?.contacts.some((contact) => contact.ownerId === ownerBId),
    ).toBe(false);

    expect(
      context?.artefacts.some((artefact) => artefact.ownerId === ownerBId),
    ).toBe(false);
  });
});
