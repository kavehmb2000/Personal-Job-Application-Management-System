import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { CommunicationRepository } from "@/lib/repositories/communication-repository";

describe("CommunicationRepository", () => {
  const ownerA = "communication-repository-owner-a";
  const ownerB = "communication-repository-owner-b";

  let repository: CommunicationRepository;
  let opportunityA: { id: string };
  let opportunityB: { id: string };
  let artefactA: { id: string };
  let artefactB: { id: string };

  beforeEach(async () => {
    repository = new CommunicationRepository(prisma);

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

    await prisma.communication.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
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

    await prisma.ownerAccount.createMany({
      data: [
        {
          id: ownerA,
          googleSubject: `communication-${ownerA}`,
          email: `${ownerA}@example.com`,
        },
        {
          id: ownerB,
          googleSubject: `communication-${ownerB}`,
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

    artefactA = await prisma.artefact.create({
      data: {
        ownerId: ownerA,
        name: "CV A",
        type: "CV",
        contentMarkdown: "# CV A",
      },
    });
    artefactB = await prisma.artefact.create({
      data: {
        ownerId: ownerB,
        name: "CV B",
        type: "CV",
        contentMarkdown: "# CV B",
      },
    });
  });

  it("creates a Communication within the Opportunity owner's scope", async () => {
    const occurredAt = new Date("2026-08-20T10:00:00.000Z");

    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt,
      contact: "marc@mistral.ai",
      subject: "Question about the position",
      bodyMarkdown: "Hello Marc, ...",
    });

    expect(communication.opportunityId).toBe(opportunityA.id);
    expect(communication.occurredAt).toEqual(occurredAt);
    expect(communication.contact).toBe("marc@mistral.ai");
    expect(communication.subject).toBe("Question about the position");
    expect(communication.bodyMarkdown).toBe("Hello Marc, ...");
  });

  it("rejects creation against another owner's Opportunity", async () => {
    await expect(
      repository.create(ownerA, opportunityB.id, {
        occurredAt: new Date("2026-08-20T10:00:00.000Z"),
        contact: "telegram:@other",
        subject: "Should not be created",
      }),
    ).rejects.toThrow();
  });

  it("gets a Communication within the owner's scope", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      contact: "whatsapp:a.j",
      subject: "Referral question",
    });

    const result = await repository.getById(
      ownerA,
      opportunityA.id,
      communication.id,
    );

    expect(result?.id).toBe(communication.id);
    expect(result?.opportunityId).toBe(opportunityA.id);
  });

  it("does not expose another owner's Communication", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      contact: "linkedin:marc",
      subject: "Question",
    });

    const result = await repository.getById(
      ownerB,
      opportunityA.id,
      communication.id,
    );

    expect(result).toBeNull();
  });

  it("updates a Communication within the owner's scope", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      contact: "marc@mistral.ai",
      subject: "Initial question",
      bodyMarkdown: "Initial message",
    });

    const updated = await repository.update(
      ownerA,
      opportunityA.id,
      communication.id,
      {
        occurredAt: new Date("2026-08-20T11:00:00.000Z"),
        contact: "marc@mistral.ai",
        subject: "Follow-up question",
        bodyMarkdown: "Follow-up message",
      },
    );

    expect(updated.occurredAt).toEqual(new Date("2026-08-20T11:00:00.000Z"));
    expect(updated.contact).toBe("marc@mistral.ai");
    expect(updated.subject).toBe("Follow-up question");
    expect(updated.bodyMarkdown).toBe("Follow-up message");
  });

  it("rejects updating another owner's Communication", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      contact: "marc@mistral.ai",
      subject: "Private communication",
    });

    await expect(
      repository.update(ownerB, opportunityA.id, communication.id, {
        subject: "Unauthorized update",
      }),
    ).rejects.toThrow();
  });

  it("associates an Artefact with a Communication within the same owner scope", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      contact: "marc@mistral.ai",
      subject: "CV discussion",
    });

    const association = await repository.addArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    expect(association.communicationId).toBe(communication.id);
    expect(association.artefactId).toBe(artefactA.id);
  });

  it("rejects a cross-owner Communication-Artefact association", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      subject: "Cross-owner test",
    });

    await expect(
      repository.addArtefact(
        ownerA,
        opportunityA.id,
        communication.id,
        artefactB.id,
      ),
    ).rejects.toThrow();
  });

  it("rejects duplicate Communication-Artefact associations", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      subject: "Duplicate test",
    });

    await repository.addArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    await expect(
      repository.addArtefact(
        ownerA,
        opportunityA.id,
        communication.id,
        artefactA.id,
      ),
    ).rejects.toThrow();
  });

  it("gets Artefacts associated with a Communication", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      subject: "Artefact lookup",
    });

    await repository.addArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    const result = await repository.getArtefacts(
      ownerA,
      opportunityA.id,
      communication.id,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(artefactA.id);
  });

  it("removes a Communication-Artefact association", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      subject: "Remove artefact",
    });

    await repository.addArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    await repository.removeArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    const result = await repository.getArtefacts(
      ownerA,
      opportunityA.id,
      communication.id,
    );

    expect(result).toHaveLength(0);
  });

  it("rejects removing an association outside the owner's scope", async () => {
    const communication = await repository.create(ownerA, opportunityA.id, {
      occurredAt: new Date("2026-08-20T10:00:00.000Z"),
      subject: "Ownership test",
    });

    await repository.addArtefact(
      ownerA,
      opportunityA.id,
      communication.id,
      artefactA.id,
    );

    await expect(
      repository.removeArtefact(
        ownerB,
        opportunityA.id,
        communication.id,
        artefactA.id,
      ),
    ).rejects.toThrow();
  });
});
