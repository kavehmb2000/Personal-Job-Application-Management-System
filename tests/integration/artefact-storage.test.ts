import { describe, expect, it, vi } from "vitest";

import { ArtefactService } from "@/lib/services/artefact-service";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { FakeStorageProvider } from "@/tests/fakes/storage-provider";
import type { StorageProviderResolver } from "@/lib/storage/storage-provider-resolver";

describe("ArtefactService storage integration", () => {
  it("retrieves metadata through the provider for a stored artefact", async () => {
    const provider = new FakeStorageProvider();

    provider.addFile(
      "drive-file-1",
      {
        name: "CV.pdf",
        originalFilename: "CV.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1234,
      },
      new Uint8Array([1, 2, 3]),
    );

    const repository = {
      getById: async () => ({
        id: "artefact-1",
        ownerId: "owner-1",
        name: "My CV",
        type: "CV",
        description: null,
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: "drive-file-1",
        mimeType: "application/pdf",
        archivedAt: null,
        createdAt: new Date(),
      }),
    } as unknown as ArtefactRepository;

    const resolver: StorageProviderResolver = {
      resolve: vi.fn(async () => provider),
    };

    const service = new ArtefactService(repository, resolver);

    const result = await service.getStorageMetadata("owner-1", "artefact-1");

    expect(result.name).toBe("CV.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.reference.reference).toBe("drive-file-1");
  });

  it("retrieves content through the provider for a stored artefact", async () => {
    const provider = new FakeStorageProvider();

    provider.addFile(
      "drive-file-2",
      {
        name: "cover-letter.pdf",
        mimeType: "application/pdf",
      },
      new Uint8Array([10, 20, 30]),
    );

    const repository = {
      getById: async () => ({
        id: "artefact-2",
        ownerId: "owner-1",
        name: "Cover Letter",
        type: "COVER_LETTER",
        description: null,
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: "drive-file-2",
        mimeType: "application/pdf",
        archivedAt: null,
        createdAt: new Date(),
      }),
    } as unknown as ArtefactRepository;

    const resolver: StorageProviderResolver = {
      resolve: vi.fn(async () => provider),
    };

    const service = new ArtefactService(repository, resolver);

    const result = await service.download("owner-1", "artefact-2");

    expect([...result.content]).toEqual([10, 20, 30]);
    expect(result.metadata.name).toBe("cover-letter.pdf");
  });

  it("does not require external storage for inline artefacts", async () => {
    const repository = {
      getById: async () => ({
        id: "artefact-3",
        ownerId: "owner-1",
        name: "Research Notes",
        type: "RESEARCH",
        description: null,
        contentMarkdown: "# Research",
        externalUrl: null,
        storageProvider: null,
        storageReference: null,
        mimeType: null,
        archivedAt: null,
        createdAt: new Date(),
      }),
    } as unknown as ArtefactRepository;

    const service = new ArtefactService(repository);

    const result = await service.getById("owner-1", "artefact-3");

    expect(result).not.toBeNull();
    expect(result?.contentMarkdown).toBe("# Research");
  });

  it("rejects a stored artefact without a storage reference", async () => {
    const provider = new FakeStorageProvider();

    const repository = {
      getById: async () => ({
        id: "artefact-4",
        ownerId: "owner-1",
        name: "Broken CV",
        type: "CV",
        description: null,
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: null,
        mimeType: null,
        archivedAt: null,
        createdAt: new Date(),
      }),
    } as unknown as ArtefactRepository;

    const service = new ArtefactService(repository);

    await expect(
      service.getStorageMetadata("owner-1", "artefact-4"),
    ).rejects.toThrow("Artefact storage reference is missing");
  });

  it("propagates provider failures without exposing provider-specific behavior", async () => {
    const provider = new FakeStorageProvider({
      provider: "google-drive",
      authorized: false,
    });

    const repository = {
      getById: async () => ({
        id: "artefact-5",
        ownerId: "owner-1",
        name: "CV",
        type: "CV",
        description: null,
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: "GOOGLE_DRIVE",
        storageReference: "drive-file-5",
        mimeType: "application/pdf",
        archivedAt: null,
        createdAt: new Date(),
      }),
    } as unknown as ArtefactRepository;

    const resolver: StorageProviderResolver = {
      resolve: vi.fn(async () => provider),
    };

    const service = new ArtefactService(repository, resolver);

    await expect(
      service.getStorageMetadata("owner-1", "artefact-5"),
    ).rejects.toThrow();
  });
});
