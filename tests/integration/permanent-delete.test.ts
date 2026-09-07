import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtefactType, AuditEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { PermanentDeleteService } from "@/lib/services/permanent-delete-service";
import { recordAuditEventStrict } from "@/lib/services/audit-service";

const ownerId = "00000000-0000-0000-0000-000000000001";
const otherOwnerId = "00000000-0000-0000-0000-000000000002";

async function createOwner(id: string, email: string, googleSubject: string) {
  return prisma.ownerAccount.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email,
      googleSubject,
    },
  });
}

async function createLifecycleStatus(id: string, ownerId: string) {
  return prisma.lifecycleStatus.create({
    data: {
      id,
      ownerId,
      key: "DISCOVERED",
      label: `Discovered ${id}`,
      sortOrder: 1,
      isTerminal: false,
      isActive: true,
    },
  });
}

describe("PermanentDeleteService", () => {
  let service: PermanentDeleteService;

  beforeEach(async () => {
    await createOwner(
      ownerId,
      "permanent-delete-owner@example.com",
      "google-subject-permanent-delete-owner",
    );

    await createOwner(
      otherOwnerId,
      "permanent-delete-other@example.com",
      "google-subject-permanent-delete-other",
    );

    service = new PermanentDeleteService();
  });

  afterEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.opportunityArtefact.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.opportunityEvent.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.opportunityNote.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
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

    await prisma.artefact.deleteMany({
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
  });

  it("previews an archived opportunity before permanent deletion", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000001",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Delete Company",
        positionTitle: "Delete Position",
        archivedAt: new Date(),
      },
    });

    const preview = await service.preview(ownerId, opportunity.id);

    expect(preview).toMatchObject({
      opportunityId: opportunity.id,
      companyName: "Delete Company",
      positionTitle: "Delete Position",
    });
  });

  it("requires an archived opportunity for permanent deletion", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000002",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Active Company",
        positionTitle: "Active Position",
      },
    });

    await expect(service.delete(ownerId, opportunity.id)).rejects.toThrow();
  });

  it("does not allow one owner to permanently delete another owner's opportunity", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000003",
      otherOwnerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId: otherOwnerId,
        statusId: status.id,
        companyName: "Other Company",
        positionTitle: "Other Position",
        archivedAt: new Date(),
      },
    });

    await expect(service.delete(ownerId, opportunity.id)).rejects.toThrow();

    await expect(
      prisma.opportunity.findUnique({
        where: { id: opportunity.id },
      }),
    ).resolves.not.toBeNull();
  });

  it("permanently deletes an archived opportunity", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000004",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Delete Company",
        positionTitle: "Delete Position",
        archivedAt: new Date(),
      },
    });

    await service.delete(ownerId, opportunity.id);

    await expect(
      prisma.opportunity.findUnique({
        where: { id: opportunity.id },
      }),
    ).resolves.toBeNull();
  });

  it("records a permanent-delete audit event", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000005",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Audited Delete Company",
        positionTitle: "Audited Delete Position",
        archivedAt: new Date(),
      },
    });

    await service.delete(ownerId, opportunity.id);

    const events = await prisma.auditEvent.findMany({
      where: {
        ownerId,
        type: AuditEventType.PERMANENT_DELETE,
        targetType: "Opportunity",
        targetId: opportunity.id,
      },
    });

    expect(events).toHaveLength(1);
  });

  it("does not delete the opportunity when destructive audit recording fails", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000006",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Audit Failure Company",
        positionTitle: "Audit Failure Position",
        archivedAt: new Date(),
      },
    });

    const auditSpy = vi
      .spyOn(
        await import("@/lib/services/audit-service"),
        "recordAuditEventStrict",
      )
      .mockRejectedValueOnce(new Error("audit database unavailable"));

    await expect(service.delete(ownerId, opportunity.id)).rejects.toThrow(
      "audit database unavailable",
    );

    auditSpy.mockRestore();

    await expect(
      prisma.opportunity.findUnique({
        where: { id: opportunity.id },
      }),
    ).resolves.not.toBeNull();
  });

  it("includes related artefacts in the deletion preview", async () => {
    const status = await createLifecycleStatus(
      "10000000-0000-0000-0000-000000000007",
      ownerId,
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Related Company",
        positionTitle: "Related Position",
        archivedAt: new Date(),
      },
    });

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Related CV",
        type: ArtefactType.CV,
      },
    });

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId: opportunity.id,
        artefactId: artefact.id,
      },
    });

    const preview = await service.preview(ownerId, opportunity.id);

    expect(preview.artefacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: artefact.id,
          name: "Related CV",
        }),
      ]),
    );
  });
});
