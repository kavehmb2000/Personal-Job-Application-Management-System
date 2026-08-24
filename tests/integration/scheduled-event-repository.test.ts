import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";

describe("ScheduledEventRepository contact associations", () => {
  let ownerId: string;
  let otherOwnerId: string;

  let lifecycleStatusId: string;
  let otherLifecycleStatusId: string;

  let opportunityId: string;
  let otherOpportunityId: string;

  let scheduledEventId: string;
  let otherScheduledEventId: string;

  let contactId: string;
  let secondContactId: string;
  let otherOwnerContactId: string;

  let repository: ScheduledEventRepository;

  beforeAll(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        googleSubject: "integration-test-scheduled-event-owner",
        email: "integration-scheduled-event-owner@example.test",
        displayName: "Scheduled Event Integration Owner",
      },
    });

    ownerId = owner.id;

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        googleSubject: "integration-test-scheduled-event-other-owner",
        email: "integration-scheduled-event-other-owner@example.test",
        displayName: "Scheduled Event Integration Other Owner",
      },
    });

    otherOwnerId = otherOwner.id;

    const lifecycleStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    lifecycleStatusId = lifecycleStatus.id;

    const otherLifecycleStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId: otherOwnerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    otherLifecycleStatusId = otherLifecycleStatus.id;

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: lifecycleStatusId,
        companyName: "Owner A Company",
        positionTitle: "Senior Software Engineer",
      },
    });

    opportunityId = opportunity.id;

    const otherOpportunity = await prisma.opportunity.create({
      data: {
        ownerId: otherOwnerId,
        statusId: otherLifecycleStatusId,
        companyName: "Owner B Company",
        positionTitle: "Principal Engineer",
      },
    });

    otherOpportunityId = otherOpportunity.id;

    const scheduledEvent = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "INTERVIEW",
        title: "Owner A Interview",
        scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
      },
    });

    scheduledEventId = scheduledEvent.id;

    const otherScheduledEvent = await prisma.scheduledEvent.create({
      data: {
        opportunityId: otherOpportunityId,
        type: "INTERVIEW",
        title: "Owner B Interview",
        scheduledAt: new Date("2026-08-26T10:00:00.000Z"),
      },
    });

    otherScheduledEventId = otherScheduledEvent.id;

    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Owner A Contact",
        roleType: "RECRUITER",
        organization: "Owner A Company",
        email: "contact-a@example.test",
      },
    });

    contactId = contact.id;

    const secondContact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Owner A Second Contact",
        roleType: "HIRING_MANAGER",
        organization: "Owner A Company",
        email: "contact-a2@example.test",
      },
    });

    secondContactId = secondContact.id;

    const otherOwnerContact = await prisma.contact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Owner B Contact",
        roleType: "RECRUITER",
        organization: "Owner B Company",
        email: "contact-b@example.test",
      },
    });

    otherOwnerContactId = otherOwnerContact.id;

    repository = new ScheduledEventRepository(prisma);
  });

  afterAll(async () => {
    await prisma.scheduledEventContact.deleteMany({
      where: {
        scheduledEvent: {
          opportunity: {
            ownerId: {
              in: [ownerId, otherOwnerId],
            },
          },
        },
      },
    });

    await prisma.scheduledEvent.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.contact.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.opportunity.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
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

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.$disconnect();
  });

  it("adds a Contact to a ScheduledEvent within the owner's scope", async () => {
    const association = await repository.addContact(
      ownerId,
      opportunityId,
      scheduledEventId,
      contactId,
    );

    expect(association.scheduledEventId).toBe(scheduledEventId);
    expect(association.contactId).toBe(contactId);
  });

  it("gets Contacts associated with a ScheduledEvent within the owner's scope", async () => {
    const contacts = await repository.getContacts(
      ownerId,
      opportunityId,
      scheduledEventId,
    );

    expect(contacts).toHaveLength(1);
    expect(contacts[0].id).toBe(contactId);
    expect(contacts[0].name).toBe("Owner A Contact");
  });

  it("supports multiple Contacts on the same ScheduledEvent", async () => {
    const association = await repository.addContact(
      ownerId,
      opportunityId,
      scheduledEventId,
      secondContactId,
    );

    expect(association.scheduledEventId).toBe(scheduledEventId);
    expect(association.contactId).toBe(secondContactId);

    const contacts = await repository.getContacts(
      ownerId,
      opportunityId,
      scheduledEventId,
    );

    expect(contacts).toHaveLength(2);
    expect(contacts.map((contact) => contact.id)).toEqual(
      expect.arrayContaining([contactId, secondContactId]),
    );
  });

  it("removes a Contact from a ScheduledEvent within the owner's scope", async () => {
    await repository.removeContact(
      ownerId,
      opportunityId,
      scheduledEventId,
      secondContactId,
    );

    const contacts = await repository.getContacts(
      ownerId,
      opportunityId,
      scheduledEventId,
    );

    expect(contacts).toHaveLength(1);
    expect(contacts[0].id).toBe(contactId);
  });

  it("rejects adding a Contact owned by another owner", async () => {
    await expect(
      repository.addContact(
        ownerId,
        opportunityId,
        scheduledEventId,
        otherOwnerContactId,
      ),
    ).rejects.toThrow(/Contact .* was not found in owner scope/);
  });

  it("rejects adding a Contact to another owner's ScheduledEvent", async () => {
    await expect(
      repository.addContact(
        ownerId,
        otherOpportunityId,
        otherScheduledEventId,
        contactId,
      ),
    ).rejects.toThrow(/ScheduledEvent .* was not found in owner scope/);
  });

  it("does not expose another owner's Contacts", async () => {
    const contacts = await repository.getContacts(
      ownerId,
      otherOpportunityId,
      otherScheduledEventId,
    );

    expect(contacts).toEqual([]);
  });

  it("rejects removing another owner's association", async () => {
    await prisma.scheduledEventContact.create({
      data: {
        scheduledEventId: otherScheduledEventId,
        contactId: otherOwnerContactId,
      },
    });

    await expect(
      repository.removeContact(
        ownerId,
        otherOpportunityId,
        otherScheduledEventId,
        otherOwnerContactId,
      ),
    ).rejects.toThrow(
      /ScheduledEventContact association was not found in owner scope/,
    );
  });

  it("returns an empty list when the ScheduledEvent is outside the owner's scope", async () => {
    const contacts = await repository.getContacts(
      ownerId,
      otherOpportunityId,
      otherScheduledEventId,
    );

    expect(contacts).toEqual([]);
  });

  it("rejects removing an association that does not exist", async () => {
    await expect(
      repository.removeContact(
        ownerId,
        opportunityId,
        scheduledEventId,
        secondContactId,
      ),
    ).rejects.toThrow(
      /ScheduledEventContact association was not found in owner scope/,
    );
  });
});
