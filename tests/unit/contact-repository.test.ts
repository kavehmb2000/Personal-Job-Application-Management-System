import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { ContactRepository } from "@/lib/repositories/contact-repository";

describe("ContactRepository", () => {
  const ownerA = "contact-repository-owner-a";
  const ownerB = "contact-repository-owner-b";

  let repository: ContactRepository;
  let opportunityA: { id: string };
  let opportunityB: { id: string };

  beforeEach(async () => {
    repository = new ContactRepository(prisma);

    await prisma.scheduledEventContact.deleteMany({
      where: {
        contact: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.opportunityContact.deleteMany({
      where: {
        contact: {
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

    await prisma.opportunity.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.lifecycleTransition.deleteMany({
      where: {
        OR: [
          {
            fromStatus: {
              ownerId: {
                in: [ownerA, ownerB],
              },
            },
          },
          {
            toStatus: {
              ownerId: {
                in: [ownerA, ownerB],
              },
            },
          },
        ],
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

    await prisma.ownerAccount.createMany({
      data: [
        {
          id: ownerA,
          googleSubject: `contact-${ownerA}`,
          email: `${ownerA}@example.com`,
        },
        {
          id: ownerB,
          googleSubject: `contact-${ownerB}`,
          email: `${ownerB}@example.com`,
        },
      ],
    });

    const discoveredA = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerA,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    const discoveredB = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerB,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    opportunityA = await prisma.opportunity.create({
      data: {
        ownerId: ownerA,
        companyName: "Acme A",
        positionTitle: "Engineer",
        statusId: discoveredA.id,
      },
    });

    opportunityB = await prisma.opportunity.create({
      data: {
        ownerId: ownerB,
        companyName: "Acme B",
        positionTitle: "Engineer",
        statusId: discoveredB.id,
      },
    });
  });

  it("creates a Contact within the owner's scope", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
      email: "jane@example.com",
      phone: "+49 123 456789",
      organization: "Acme",
      roleType: "RECRUITER",
      notes: "Primary recruiter.",
    });

    expect(contact.ownerId).toBe(ownerA);
    expect(contact.name).toBe("Jane Recruiter");
    expect(contact.email).toBe("jane@example.com");
    expect(contact.organization).toBe("Acme");
    expect(contact.roleType).toBe("RECRUITER");
  });

  it("gets a Contact within the owner's scope", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    const result = await repository.getById(ownerA, contact.id);

    expect(result?.id).toBe(contact.id);
    expect(result?.ownerId).toBe(ownerA);
  });

  it("does not expose another owner's Contact", async () => {
    const contact = await repository.create(ownerA, {
      name: "Private Contact",
    });

    const result = await repository.getById(ownerB, contact.id);

    expect(result).toBeNull();
  });

  it("updates a Contact within the owner's scope", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    const updated = await repository.update(ownerA, contact.id, {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      roleType: "HIRING_MANAGER",
    });

    expect(updated.name).toBe("Jane Smith");
    expect(updated.email).toBe("jane.smith@example.com");
    expect(updated.roleType).toBe("HIRING_MANAGER");
  });

  it("rejects updating another owner's Contact", async () => {
    const contact = await repository.create(ownerA, {
      name: "Private Contact",
    });

    await expect(
      repository.update(ownerB, contact.id, {
        name: "Unauthorized update",
      }),
    ).rejects.toThrow();
  });

  it("associates a Contact with an Opportunity owned by the same owner", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    const association = await repository.addToOpportunity(
      ownerA,
      opportunityA.id,
      contact.id,
    );

    expect(association.opportunityId).toBe(opportunityA.id);
    expect(association.contactId).toBe(contact.id);
  });

  it("rejects associating another owner's Contact", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    await expect(
      repository.addToOpportunity(ownerB, opportunityB.id, contact.id),
    ).rejects.toThrow();
  });

  it("rejects associating a Contact with another owner's Opportunity", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    await expect(
      repository.addToOpportunity(ownerA, opportunityB.id, contact.id),
    ).rejects.toThrow();
  });

  it("rejects duplicate OpportunityContact associations", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    await repository.addToOpportunity(ownerA, opportunityA.id, contact.id);

    await expect(
      repository.addToOpportunity(ownerA, opportunityA.id, contact.id),
    ).rejects.toThrow();
  });

  it("gets Contacts associated with an Opportunity", async () => {
    const contact1 = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    const contact2 = await repository.create(ownerA, {
      name: "John Hiring Manager",
    });

    await repository.addToOpportunity(ownerA, opportunityA.id, contact1.id);

    await repository.addToOpportunity(ownerA, opportunityA.id, contact2.id);

    const contacts = await repository.getForOpportunity(
      ownerA,
      opportunityA.id,
    );

    expect(contacts).toHaveLength(2);
    expect(contacts.map((contact) => contact.id)).toEqual(
      expect.arrayContaining([contact1.id, contact2.id]),
    );
  });

  it("does not expose another owner's Opportunity contacts", async () => {
    const contact = await repository.create(ownerA, {
      name: "Private Contact",
    });

    await repository.addToOpportunity(ownerA, opportunityA.id, contact.id);

    const contacts = await repository.getForOpportunity(
      ownerB,
      opportunityA.id,
    );

    expect(contacts).toEqual([]);
  });

  it("removes an OpportunityContact association", async () => {
    const contact = await repository.create(ownerA, {
      name: "Jane Recruiter",
    });

    await repository.addToOpportunity(ownerA, opportunityA.id, contact.id);

    await repository.removeFromOpportunity(ownerA, opportunityA.id, contact.id);

    const contacts = await repository.getForOpportunity(
      ownerA,
      opportunityA.id,
    );

    expect(contacts).toEqual([]);
  });

  it("rejects removing an association outside the owner's scope", async () => {
    const contact = await repository.create(ownerA, {
      name: "Private Contact",
    });

    await repository.addToOpportunity(ownerA, opportunityA.id, contact.id);

    await expect(
      repository.removeFromOpportunity(ownerB, opportunityA.id, contact.id),
    ).rejects.toThrow();
  });
});
