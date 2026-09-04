import { afterEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { ArtefactType, StorageProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import { ExportService } from "@/lib/services/export-service";
import type { StorageProviderResolver } from "@/lib/storage/storage-provider-resolver";
import { FakeStorageProvider } from "@/tests/fakes/storage-provider";

const ownerId = "00000000-0000-0000-0000-000000000001";
const otherOwnerId = "00000000-0000-0000-0000-000000000002";

describe("ExportService integration", () => {
  afterEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.googleDriveAuthorization.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
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

    await prisma.eventArtefact.deleteMany({
      where: {
        event: {
          opportunity: {
            ownerId: {
              in: [ownerId, otherOwnerId],
            },
          },
        },
      },
    });

    await prisma.communicationArtefact.deleteMany({
      where: {
        communication: {
          opportunity: {
            ownerId: {
              in: [ownerId, otherOwnerId],
            },
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

    await prisma.communication.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

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

    await prisma.opportunityContact.deleteMany({
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

    await prisma.lifecycleTransition.deleteMany({
      where: {
        OR: [
          {
            fromStatus: {
              ownerId: {
                in: [ownerId, otherOwnerId],
              },
            },
          },
          {
            toStatus: {
              ownerId: {
                in: [ownerId, otherOwnerId],
              },
            },
          },
        ],
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.roleFamily.deleteMany({
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

  async function createOwner(id: string, email: string) {
    return prisma.ownerAccount.create({
      data: {
        id,
        googleSubject: `google-${id}`,
        email,
        displayName: email,
      },
    });
  }

  async function createDiscoveredStatus(id: string) {
    return prisma.lifecycleStatus.create({
      data: {
        id,
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });
  }

  function readZipEntry(
    archive: Record<string, Uint8Array>,
    path: string,
  ): unknown {
    const content = archive[path];

    expect(content).toBeDefined();

    return JSON.parse(strFromU8(content));
  }

  it("exports owner-scoped structured data as a portable ZIP", async () => {
    await createOwner(ownerId, "owner@example.com");
    await createOwner(otherOwnerId, "other@example.com");

    const status = await createDiscoveredStatus(
      "10000000-0000-0000-0000-000000000001",
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        id: "20000000-0000-0000-0000-000000000001",
        ownerId,
        companyName: "Example Corp",
        positionTitle: "Senior Engineer",
        jobUrl: "https://example.com/jobs/1",
        location: "Remote",
        country: "Germany",
        source: "LinkedIn",
        fitScore: 90,
        statusId: status.id,
        nextAction: "Prepare application",
      },
    });

    await prisma.opportunityNote.create({
      data: {
        id: "30000000-0000-0000-0000-000000000001",
        opportunityId: opportunity.id,
        bodyMarkdown: "Important opportunity.",
      },
    });

    await prisma.opportunityEvent.create({
      data: {
        id: "40000000-0000-0000-0000-000000000001",
        opportunityId: opportunity.id,
        type: "OPPORTUNITY_CREATED",
        title: "Created",
        occurredAt: new Date(),
        systemGenerated: true,
      },
    });

    const otherStatus = await prisma.lifecycleStatus.create({
      data: {
        id: "10000000-0000-0000-0000-000000000002",
        ownerId: otherOwnerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    await prisma.opportunity.create({
      data: {
        id: "20000000-0000-0000-0000-000000000002",
        ownerId: otherOwnerId,
        companyName: "Other Corp",
        positionTitle: "Other Position",
        statusId: otherStatus.id,
      },
    });

    const service = new ExportService();

    const result = await service.exportOwner(ownerId);

    expect(result.filename).toMatch(
      /^job-application-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.zip$/,
    );
    expect(result.content).toBeInstanceOf(Uint8Array);

    const archive = unzipSync(result.content);

    expect(archive["manifest.json"]).toBeDefined();
    expect(archive["data/opportunities.json"]).toBeDefined();
    expect(archive["data/events.json"]).toBeDefined();
    expect(archive["data/notes.json"]).toBeDefined();

    const opportunities = readZipEntry(
      archive,
      "data/opportunities.json",
    ) as Array<{ id: string; companyName: string }>;

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      id: opportunity.id,
      companyName: "Example Corp",
    });

    const events = readZipEntry(archive, "data/events.json") as Array<{
      id: string;
    }>;

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("40000000-0000-0000-0000-000000000001");

    const notes = readZipEntry(archive, "data/notes.json") as Array<{
      id: string;
      bodyMarkdown: string;
    }>;

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      id: "30000000-0000-0000-0000-000000000001",
      bodyMarkdown: "Important opportunity.",
    });

    const exportedText = Object.entries(archive)
      .map(([path, bytes]) => `${path}\n${strFromU8(bytes)}`)
      .join("\n");

    expect(exportedText).not.toContain("Other Corp");
    expect(exportedText).not.toContain("Other Position");
  });

  it("includes retrievable external artefact content and its metadata", async () => {
    await createOwner(ownerId, "owner@example.com");

    const provider = new FakeStorageProvider();

    provider.addFile(
      "drive-file-export-1",
      {
        name: "CV.pdf",
        originalFilename: "CV.pdf",
        mimeType: "application/pdf",
        sizeBytes: 3,
      },
      new Uint8Array([1, 2, 3]),
    );

    const artefact = await prisma.artefact.create({
      data: {
        id: "50000000-0000-0000-0000-000000000001",
        ownerId,
        name: "CV",
        type: ArtefactType.CV,
        description: "Primary CV",
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: StorageProvider.GOOGLE_DRIVE,
        storageReference: "drive-file-export-1",
        mimeType: "application/pdf",
      },
    });

    const repository = {
      getById: vi.fn(async () => artefact),
      list: vi.fn(),
    } as unknown as ArtefactRepository;

    const resolver: StorageProviderResolver = {
      resolve: vi.fn(async () => provider),
    };

    const artefactService = new ArtefactService(repository, resolver);
    const service = new ExportService(artefactService);

    const result = await service.exportOwner(ownerId);
    const archive = unzipSync(result.content);

    expect(archive["manifest.json"]).toBeDefined();

    const manifest = readZipEntry(archive, "manifest.json") as {
      files: Array<{
        artefactId: string;
        name: string;
        included: boolean;
        path?: string;
        reason?: string;
      }>;
    };

    expect(manifest.files).toContainEqual(
      expect.objectContaining({
        artefactId: artefact.id,
        included: true,
      }),
    );

    const artefactEntry = Object.entries(archive).find(
      ([path]) => path.startsWith("artefacts/") && path.includes(artefact.id),
    );

    expect(artefactEntry).toBeDefined();
    expect([...artefactEntry![1]]).toEqual([1, 2, 3]);
  });

  it("records unavailable external artefacts in the manifest without aborting export", async () => {
    await createOwner(ownerId, "owner@example.com");

    const provider = new FakeStorageProvider({
      provider: "google-drive",
      authorized: false,
    });

    const artefact = await prisma.artefact.create({
      data: {
        id: "50000000-0000-0000-0000-000000000002",
        ownerId,
        name: "Unavailable CV",
        type: ArtefactType.CV,
        storageProvider: StorageProvider.GOOGLE_DRIVE,
        description: "CV whose external content is unavailable",
        contentMarkdown: null,
        externalUrl: null,
        storageReference: "drive-file-unavailable",
        mimeType: "application/pdf",
      },
    });

    const repository = {
      getById: vi.fn(async () => artefact),
      list: vi.fn(),
    } as unknown as ArtefactRepository;

    const resolver: StorageProviderResolver = {
      resolve: vi.fn(async () => provider),
    };

    const artefactService = new ArtefactService(repository, resolver);
    const service = new ExportService(artefactService);

    const result = await service.exportOwner(ownerId);
    const archive = unzipSync(result.content);

    const artefacts = readZipEntry(archive, "data/artefacts.json") as Array<{
      id: string;
    }>;

    const manifest = readZipEntry(archive, "manifest.json") as {
      files: Array<{
        artefactId: string;
        name: string;
        included: boolean;
        path?: string;
        reason?: string;
      }>;
    };

    expect(artefacts).toContainEqual(
      expect.objectContaining({
        id: artefact.id,
      }),
    );

    const entry = manifest.files.find(
      (item) => item.artefactId === artefact.id,
    );

    expect(entry).toBeDefined();
    expect(entry?.included).toBe(false);
    expect(entry?.reason).toBeTruthy();
  });

  it("does not export Google Drive authorization credentials", async () => {
    await createOwner(ownerId, "owner@example.com");

    await prisma.googleDriveAuthorization.create({
      data: {
        ownerId,
        refreshToken: "THIS-MUST-NEVER-BE-EXPORTED",
      },
    });

    const service = new ExportService();
    const result = await service.exportOwner(ownerId);

    const archive = unzipSync(result.content);

    const exportedText = Object.entries(archive)
      .map(([path, bytes]) => `${path}\n${strFromU8(bytes)}`)
      .join("\n");

    expect(exportedText).not.toContain("THIS-MUST-NEVER-BE-EXPORTED");
    expect(exportedText).not.toContain("refreshToken");
  });
});
