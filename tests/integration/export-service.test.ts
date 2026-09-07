import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditEventType, ArtefactType } from "@prisma/client";
import { strFromU8, unzipSync } from "fflate";

import { prisma } from "@/lib/db";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import {
  ExportService,
  type ExportManifest,
} from "@/lib/services/export-service";
import type {
  StorageFileContent,
  StorageFileMetadata,
  StorageProvider,
  StorageProviderReference,
} from "@/lib/storage/storage-provider";
import type { StorageProviderResolver } from "@/lib/storage/storage-provider-resolver";

const ownerId = "00000000-0000-0000-0000-000000000001";
const otherOwnerId = "00000000-0000-0000-0000-000000000002";

class FakeStorageProvider implements StorageProvider {
  readonly provider = "google-drive" as const;

  constructor(
    private readonly files: Map<
      string,
      {
        content: Uint8Array;
        metadata: StorageFileMetadata;
      }
    >,
  ) {}

  async getAuthorization() {
    return {
      provider: this.provider,
      authorized: true,
    };
  }

  async getMetadata(
    reference: StorageProviderReference,
  ): Promise<StorageFileMetadata> {
    const file = this.files.get(reference.reference);

    if (!file) {
      throw new Error("External binary is unavailable");
    }

    return file.metadata;
  }

  async download(
    reference: StorageProviderReference,
  ): Promise<StorageFileContent> {
    const file = this.files.get(reference.reference);

    if (!file) {
      throw new Error("External binary is unavailable");
    }

    return {
      content: file.content,
      metadata: file.metadata,
    };
  }

  createReference(reference: string): StorageProviderReference {
    return {
      provider: this.provider,
      reference,
    };
  }
}

class FakeStorageProviderResolver implements StorageProviderResolver {
  constructor(private readonly provider: StorageProvider) {}

  async resolve(_ownerId: string, _provider: string): Promise<StorageProvider> {
    return this.provider;
  }
}

async function createLifecycleStatus(ownerId: string) {
  return prisma.lifecycleStatus.create({
    data: {
      ownerId,
      key: "DISCOVERED",
      label: "Discovered",
      sortOrder: 1,
      isTerminal: false,
      isActive: true,
    },
  });
}

async function cleanupExportFixtures() {
  await prisma.auditEvent.deleteMany({
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
}

describe("ExportService", () => {
  beforeEach(async () => {
    await cleanupExportFixtures();

    await prisma.ownerAccount.createMany({
      data: [
        {
          id: ownerId,
          email: "export-owner@example.com",
          googleSubject: "google-subject-export-owner",
        },
        {
          id: otherOwnerId,
          email: "export-other@example.com",
          googleSubject: "google-subject-export-other",
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.communicationArtefact.deleteMany({
      where: {
        artefact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.eventArtefact.deleteMany({
      where: {
        artefact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.opportunityArtefact.deleteMany({
      where: {
        artefact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.scheduledEventContact.deleteMany({
      where: {
        contact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.opportunityContact.deleteMany({
      where: {
        contact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.communication.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
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

    await prisma.userAction.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.submission.deleteMany({
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

    await prisma.opportunityEvent.deleteMany({
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

    await prisma.contact.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.auditEvent.deleteMany({
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

  it("exports structured owner data even when an external Artefact binary is unavailable", async () => {
    const status = await createLifecycleStatus(ownerId);

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: status.id,
        companyName: "Export Test Company",
        positionTitle: "Senior Engineer",
      },
    });

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Unavailable CV",
        type: ArtefactType.CV,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: "missing-drive-file",
        mimeType: "application/pdf",
      },
    });

    const storageProvider = new FakeStorageProvider(new Map());
    const storageResolver = new FakeStorageProviderResolver(storageProvider);

    const service = new ExportService(
      new ArtefactService(new ArtefactRepository(), storageResolver),
    );

    const result = await service.exportOwner(ownerId);

    expect(result.content).toBeInstanceOf(Uint8Array);
    expect(result.filename).toMatch(
      /^job-application-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.zip$/,
    );

    const files = unzipSync(result.content);

    expect(files["manifest.json"]).toBeDefined();
    expect(files["data/opportunities.json"]).toBeDefined();
    expect(files["data/artefacts.json"]).toBeDefined();

    const manifest = JSON.parse(
      strFromU8(files["manifest.json"]),
    ) as ExportManifest;

    expect(manifest.ownerId).toBe(ownerId);
    expect(manifest.version).toBe(1);

    const manifestEntry = manifest.files.find(
      (entry) => entry.artefactId === artefact.id,
    );

    expect(manifestEntry).toMatchObject({
      artefactId: artefact.id,
      name: artefact.name,
      included: false,
      reason: "External binary is unavailable",
    });

    const opportunities = JSON.parse(
      strFromU8(files["data/opportunities.json"]),
    ) as Array<{
      id: string;
      ownerId: string;
    }>;

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      id: opportunity.id,
      ownerId,
    });
  });

  it("includes an available external Artefact binary in the export", async () => {
    const binary = new TextEncoder().encode("CV binary content");

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Available CV",
        type: ArtefactType.CV,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: "available-drive-file",
        mimeType: "application/pdf",
      },
    });

    const metadata: StorageFileMetadata = {
      reference: {
        provider: "google-drive",
        reference: "available-drive-file",
      },
      name: "original-cv.pdf",
      originalFilename: "original-cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: binary.byteLength,
    };

    const storageProvider = new FakeStorageProvider(
      new Map([
        [
          "available-drive-file",
          {
            content: binary,
            metadata,
          },
        ],
      ]),
    );

    const service = new ExportService(
      new ArtefactService(
        new ArtefactRepository(),
        new FakeStorageProviderResolver(storageProvider),
      ),
    );

    const result = await service.exportOwner(ownerId);
    const files = unzipSync(result.content);

    const manifest = JSON.parse(
      strFromU8(files["manifest.json"]),
    ) as ExportManifest;

    const entry = manifest.files.find(
      (item) => item.artefactId === artefact.id,
    );

    expect(entry).toMatchObject({
      artefactId: artefact.id,
      name: artefact.name,
      included: true,
      path: `artefacts/${artefact.id}-original-cv.pdf`,
    });

    expect(files[entry!.path!]).toEqual(binary);
  });

  it("exports archived artefacts as part of the recovery backup", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Archived CV",
        type: ArtefactType.CV,
        contentMarkdown: "# Archived CV",
        archivedAt: new Date(),
      },
    });

    const service = new ExportService();

    const result = await service.exportOwner(ownerId);
    const files = unzipSync(result.content);

    const artefacts = JSON.parse(
      strFromU8(files["data/artefacts.json"]),
    ) as Array<{
      id: string;
      ownerId: string;
      archivedAt: string | null;
    }>;

    expect(artefacts).toHaveLength(1);
    expect(artefacts[0]).toMatchObject({
      id: artefact.id,
      ownerId,
    });
    expect(artefacts[0].archivedAt).not.toBeNull();
  });

  it("does not export another owner's data", async () => {
    const ownerStatus = await createLifecycleStatus(ownerId);
    const otherOwnerStatus = await createLifecycleStatus(otherOwnerId);

    const ownOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        statusId: ownerStatus.id,
        companyName: "Own Company",
        positionTitle: "Own Position",
      },
    });

    await prisma.opportunity.create({
      data: {
        ownerId: otherOwnerId,
        statusId: otherOwnerStatus.id,
        companyName: "Other Company",
        positionTitle: "Other Position",
      },
    });

    const service = new ExportService();

    const result = await service.exportOwner(ownerId);
    const files = unzipSync(result.content);

    const opportunities = JSON.parse(
      strFromU8(files["data/opportunities.json"]),
    ) as Array<{
      id: string;
      ownerId: string;
    }>;

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      id: ownOpportunity.id,
      ownerId,
    });

    expect(
      opportunities.some((opportunity) => opportunity.ownerId === otherOwnerId),
    ).toBe(false);
  });

  it("does not export Google Drive authorization secrets", async () => {
    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId,
        refreshToken: "super-secret-refresh-token",
      },
    });

    const service = new ExportService();

    const result = await service.exportOwner(ownerId);
    const files = unzipSync(result.content);

    const serializedExport = Object.values(files)
      .map((file) => strFromU8(file))
      .join("\n");

    expect(serializedExport).not.toContain("super-secret-refresh-token");
    expect(serializedExport).not.toContain("refreshToken");
  });

  it("records an audit event when an export succeeds", async () => {
    const service = new ExportService();

    await service.exportOwner(ownerId);

    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        ownerId,
        type: AuditEventType.EXPORT_REQUESTED,
      },
    });

    expect(auditEvents).toHaveLength(1);
  });
});
