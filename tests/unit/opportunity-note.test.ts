import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { OpportunityNoteRepository } from "@/lib/repositories/opportunity-note-repository";

describe("OpportunityNoteRepository", () => {
  const repository = new OpportunityNoteRepository();

  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

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
      createOwner(`opportunity-note-a-${crypto.randomUUID()}@example.com`),
      createOwner(`opportunity-note-b-${crypto.randomUUID()}@example.com`),
    ]);

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const status = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 10,
        isTerminal: false,
        isActive: true,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: status.id,
      },
    });

    opportunityId = opportunity.id;
  });

  afterEach(async () => {
    await prisma.opportunityNote.deleteMany({
      where: {
        opportunityId,
      },
    });

    await prisma.opportunity.deleteMany({
      where: {
        id: opportunityId,
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId,
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

  it("creates a note for an Opportunity", async () => {
    const repository = new OpportunityNoteRepository();

    const note = await repository.create(ownerId, opportunityId, {
      title: "Initial assessment",
      bodyMarkdown: "This looks like a strong match.",
    });

    expect(note.opportunityId).toBe(opportunityId);
    expect(note.title).toBe("Initial assessment");
    expect(note.bodyMarkdown).toBe("This looks like a strong match.");
  });

  it("reads a note within the Opportunity owner's scope", async () => {
    const repository = new OpportunityNoteRepository();

    const created = await repository.create(ownerId, opportunityId, {
      title: "Initial assessment",
      bodyMarkdown: "Strong technical fit.",
    });

    const found = await repository.getById(ownerId, opportunityId, created.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.opportunityId).toBe(opportunityId);
  });

  it("does not read a note outside the Opportunity owner's scope", async () => {
    const repository = new OpportunityNoteRepository();

    const created = await repository.create(ownerId, opportunityId, {
      title: "Private note",
      bodyMarkdown: "Confidential assessment.",
    });

    const found = await repository.getById(
      otherOwnerId,
      opportunityId,
      created.id,
    );

    expect(found).toBeNull();
  });

  it("updates a note independently", async () => {
    const repository = new OpportunityNoteRepository();

    const created = await repository.create(ownerId, opportunityId, {
      title: "Initial assessment",
      bodyMarkdown: "Initial assessment text.",
    });

    const updated = await repository.update(
      ownerId,
      opportunityId,
      created.id,
      {
        title: "Updated assessment",
        bodyMarkdown: "Updated assessment text.",
      },
    );

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe("Updated assessment");
    expect(updated.bodyMarkdown).toBe("Updated assessment text.");
  });

  it("does not update a note outside the Opportunity owner's scope", async () => {
    const repository = new OpportunityNoteRepository();

    const created = await repository.create(ownerId, opportunityId, {
      title: "Private note",
      bodyMarkdown: "Original text.",
    });

    await expect(
      repository.update(otherOwnerId, opportunityId, created.id, {
        bodyMarkdown: "Unauthorized change.",
      }),
    ).rejects.toThrow();

    const unchanged = await repository.getById(
      ownerId,
      opportunityId,
      created.id,
    );

    expect(unchanged?.bodyMarkdown).toBe("Original text.");
  });

  it("does not create an OpportunityEvent when a note is created or updated", async () => {
    const repository = new OpportunityNoteRepository();

    const before = await prisma.opportunityEvent.count({
      where: {
        opportunityId,
      },
    });

    const created = await repository.create(ownerId, opportunityId, {
      title: "Assessment",
      bodyMarkdown: "Initial assessment.",
    });

    await repository.update(ownerId, opportunityId, created.id, {
      bodyMarkdown: "Updated assessment.",
    });

    const after = await prisma.opportunityEvent.count({
      where: {
        opportunityId,
      },
    });

    expect(after).toBe(before);
  });
});
