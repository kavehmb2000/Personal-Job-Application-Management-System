import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { CommunicationRepository } from "@/lib/repositories/communication-repository";
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";

describe("domain ownership boundaries", () => {
  let ownerA: string;
  let ownerB: string;

  let statusA: string;
  let statusB: string;

  let opportunityA: string;
  let opportunityB: string;

  let contactA: string;
  let contactB: string;

  let scheduledEventA: string;
  let scheduledEventB: string;

  let communicationA: string;
  let communicationB: string;

  let artefactA: string;
  let artefactB: string;

  const contactRepository = new ContactRepository(prisma);

  const communicationRepository = new CommunicationRepository(prisma);

  const scheduledEventRepository = new ScheduledEventRepository(prisma);

  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  beforeAll(async () => {
    const ownerRecordA = await prisma.ownerAccount.create({
      data: {
        googleSubject: `integration-domain-ownership-owner-a-${testRunId}`,
        email: `domain-ownership-owner-a-${testRunId}@example.test`,
        displayName: "Domain Ownership Owner A",
      },
    });

    ownerA = ownerRecordA.id;

    const ownerRecordB = await prisma.ownerAccount.create({
      data: {
        googleSubject: `integration-domain-ownership-owner-b-${testRunId}`,
        email: `domain-ownership-owner-b-${testRunId}@example.test`,
        displayName: "Domain Ownership Owner B",
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

    const contactRecordA = await prisma.contact.create({
      data: {
        ownerId: ownerA,
        name: "Owner A Contact",
        roleType: "RECRUITER",
        organization: "Owner A Company",
        email: "contact-a@example.test",
      },
    });

    contactA = contactRecordA.id;

    const contactRecordB = await prisma.contact.create({
      data: {
        ownerId: ownerB,
        name: "Owner B Contact",
        roleType: "RECRUITER",
        organization: "Owner B Company",
        email: "contact-b@example.test",
      },
    });

    contactB = contactRecordB.id;

    const scheduledEventRecordA = await prisma.scheduledEvent.create({
      data: {
        opportunityId: opportunityA,
        type: "INTERVIEW",
        title: "Owner A Interview",
        scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
      },
    });

    scheduledEventA = scheduledEventRecordA.id;

    const scheduledEventRecordB = await prisma.scheduledEvent.create({
      data: {
        opportunityId: opportunityB,
        type: "INTERVIEW",
        title: "Owner B Interview",
        scheduledAt: new Date("2026-08-26T10:00:00.000Z"),
      },
    });

    scheduledEventB = scheduledEventRecordB.id;

    const communicationRecordA = await prisma.communication.create({
      data: {
        opportunityId: opportunityA,
        occurredAt: new Date("2026-08-20T10:00:00.000Z"),
        contact: "recruiter-a@example.test",
        subject: "Application follow-up",
        bodyMarkdown: "Owner A communication.",
      },
    });

    communicationA = communicationRecordA.id;

    const communicationRecordB = await prisma.communication.create({
      data: {
        opportunityId: opportunityB,
        occurredAt: new Date("2026-08-20T11:00:00.000Z"),
        contact: "recruiter-b@example.test",
        subject: "Application follow-up",
        bodyMarkdown: "Owner B communication.",
      },
    });

    communicationB = communicationRecordB.id;

    const artefactRecordA = await prisma.artefact.create({
      data: {
        ownerId: ownerA,
        type: "CV",
        name: "Owner A CV",
      },
    });

    artefactA = artefactRecordA.id;

    const artefactRecordB = await prisma.artefact.create({
      data: {
        ownerId: ownerB,
        type: "CV",
        name: "Owner B CV",
      },
    });

    artefactB = artefactRecordB.id;
  });

  afterAll(async () => {
    if (!ownerA || !ownerB) {
      await prisma.$disconnect();
      return;
    }

    await prisma.communicationArtefact.deleteMany({
      where: {
        communication: {
          opportunity: {
            ownerId: {
              in: [ownerA, ownerB],
            },
          },
        },
      },
    });

    await prisma.opportunityArtefact.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.scheduledEventContact.deleteMany({
      where: {
        scheduledEvent: {
          opportunity: {
            ownerId: {
              in: [ownerA, ownerB],
            },
          },
        },
      },
    });

    await prisma.opportunityContact.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.communication.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.scheduledEvent.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.contact.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.artefact.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

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

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.$disconnect();
  });

  describe("Opportunity ↔ Contact", () => {
    it("allows an owner to associate their Contact with their Opportunity", async () => {
      const association = await contactRepository.addToOpportunity(
        ownerA,
        opportunityA,
        contactA,
      );

      expect(association.opportunityId).toBe(opportunityA);

      expect(association.contactId).toBe(contactA);
    });

    it("rejects associating another owner's Contact", async () => {
      await expect(
        contactRepository.addToOpportunity(ownerA, opportunityA, contactB),
      ).rejects.toThrow(/Contact .* was not found in owner scope/);
    });

    it("does not expose another owner's Opportunity contacts", async () => {
      const contacts = await contactRepository.getForOpportunity(
        ownerA,
        opportunityB,
      );

      expect(contacts).toEqual([]);
    });
  });

  describe("ScheduledEvent ↔ Contact", () => {
    it("allows an owner to associate their Contact with their ScheduledEvent", async () => {
      const association = await scheduledEventRepository.addContact(
        ownerA,
        opportunityA,
        scheduledEventA,
        contactA,
      );

      expect(association.scheduledEventId).toBe(scheduledEventA);

      expect(association.contactId).toBe(contactA);
    });

    it("rejects associating another owner's Contact", async () => {
      await expect(
        scheduledEventRepository.addContact(
          ownerA,
          opportunityA,
          scheduledEventA,
          contactB,
        ),
      ).rejects.toThrow(/Contact .* was not found in owner scope/);
    });

    it("does not expose another owner's ScheduledEvent contacts", async () => {
      const contacts = await scheduledEventRepository.getContacts(
        ownerA,
        opportunityB,
        scheduledEventB,
      );

      expect(contacts).toEqual([]);
    });
  });

  describe("Communication ownership", () => {
    it("allows an owner to read their Communication", async () => {
      const communication = await communicationRepository.getById(
        ownerA,
        opportunityA,
        communicationA,
      );

      expect(communication?.id).toBe(communicationA);
    });

    it("does not allow an owner to read another owner's Communication", async () => {
      const communication = await communicationRepository.getById(
        ownerA,
        opportunityB,
        communicationB,
      );

      expect(communication).toBeNull();
    });
  });

  describe("Communication ↔ Artefact", () => {
    it("allows an owner to associate their Artefact with their Communication", async () => {
      const association = await communicationRepository.addArtefact(
        ownerA,
        opportunityA,
        communicationA,
        artefactA,
      );

      expect(association.communicationId).toBe(communicationA);

      expect(association.artefactId).toBe(artefactA);
    });

    it("rejects associating another owner's Artefact", async () => {
      await expect(
        communicationRepository.addArtefact(
          ownerA,
          opportunityA,
          communicationA,
          artefactB,
        ),
      ).rejects.toThrow(
        /Artefact .* not found in owner scope|Artefact could not be found within the owner's scope/,
      );
    });

    it("does not allow an owner to read another owner's Communication", async () => {
      const communication = await communicationRepository.getById(
        ownerA,
        opportunityB,
        communicationB,
      );

      expect(communication).toBeNull();
    });
  });
});
