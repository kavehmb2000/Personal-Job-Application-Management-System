import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArtefactService } from "@/lib/services/artefact-service";
import type { StorageProviderResolver } from "@/lib/storage/storage-provider-resolver";
import type {
  StorageFileContent,
  StorageFileMetadata,
  StorageProvider,
} from "@/lib/storage/storage-provider";

describe("ArtefactService", () => {
  const ownerA = "owner-a";
  const ownerB = "owner-b";

  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    archive: vi.fn(),
  };

  let service: ArtefactService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ArtefactService(repository as any);
  });

  function createStorageProvider(): StorageProvider {
    return {
      provider: "google-drive",
      getAuthorization: vi.fn(),
      getMetadata: vi.fn(),
      download: vi.fn(),
      createReference: vi.fn(),
    };
  }

  function createStorageResolver(
    provider: StorageProvider,
  ): StorageProviderResolver {
    return {
      resolve: vi.fn(async () => provider),
    };
  }

  it("creates an Artefact independently of any Opportunity", async () => {
    const created = {
      id: "artefact-1",
      ownerId: ownerA,
      name: "Senior Engineer CV",
      type: "CV",
      description: "CV tailored for software engineering roles.",
      contentMarkdown: "# Curriculum Vitae",
      externalUrl: null,
      storageProvider: null,
      storageReference: null,
      mimeType: "text/markdown",
      archivedAt: null,
    };

    const input = {
      name: "Senior Engineer CV",
      type: "CV",
      description: "CV tailored for software engineering roles.",
      contentMarkdown: "# Curriculum Vitae",
      externalUrl: null,
      storageProvider: null,
      storageReference: null,
      mimeType: "text/markdown",
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, input);

    expect(repository.create).toHaveBeenCalledWith(ownerA, input);
    expect(result).toBe(created);
  });

  it("retrieves an Artefact within the owner's scope", async () => {
    const artefact = {
      id: "artefact-1",
      ownerId: ownerA,
      name: "Portfolio",
      type: "PORTFOLIO_EVIDENCE",
      contentMarkdown: null,
      externalUrl: "https://example.com/portfolio",
      archivedAt: null,
    };

    repository.getById.mockResolvedValue(artefact);

    const result = await service.getById(ownerA, "artefact-1");

    expect(repository.getById).toHaveBeenCalledWith(ownerA, "artefact-1");
    expect(result).toBe(artefact);
  });

  it("rejects creation when no representation is supplied", async () => {
    repository.create.mockRejectedValue(
      new Error("Artefact must have at least one representation"),
    );

    await expect(
      service.create(ownerA, {
        name: "Empty Artefact",
        type: "OTHER",
        contentMarkdown: null,
        externalUrl: null,
        storageProvider: null,
        storageReference: null,
      }),
    ).rejects.toThrow("Artefact must have at least one representation");
  });

  it("archives an Artefact without deleting it", async () => {
    const archived = {
      id: "artefact-1",
      ownerId: ownerA,
      name: "Old CV",
      type: "CV",
      archivedAt: new Date(),
    };

    repository.archive.mockResolvedValue(archived);

    const result = await service.archive(ownerA, "artefact-1");

    expect(repository.archive).toHaveBeenCalledWith(ownerA, "artefact-1");
    expect(result).toBe(archived);
    expect(result.archivedAt).not.toBeNull();
  });

  it("does not expose restore behavior", () => {
    expect("restore" in service).toBe(false);
  });

  it("passes the owner scope to every repository operation", async () => {
    repository.create.mockResolvedValue({
      id: "artefact-1",
      ownerId: ownerB,
    });

    repository.getById.mockResolvedValue({
      id: "artefact-1",
      ownerId: ownerB,
    });

    repository.archive.mockResolvedValue({
      id: "artefact-1",
      ownerId: ownerB,
    });

    await service.create(ownerB, {
      name: "CV",
      type: "CV",
      contentMarkdown: "# CV",
    });

    await service.getById(ownerB, "artefact-1");

    await service.archive(ownerB, "artefact-1");

    expect(repository.create).toHaveBeenCalledWith(ownerB, expect.any(Object));
    expect(repository.getById).toHaveBeenCalledWith(ownerB, "artefact-1");
    expect(repository.archive).toHaveBeenCalledWith(ownerB, "artefact-1");
  });

  it("translates the persisted provider into a provider-neutral storage reference", async () => {
    const provider = createStorageProvider();
    const resolver = createStorageResolver(provider);

    const metadata: StorageFileMetadata = {
      reference: {
        provider: "google-drive",
        reference: "drive-file-1",
      },
      name: "CV.pdf",
      mimeType: "application/pdf",
    };

    vi.mocked(provider.getMetadata).mockResolvedValue(metadata);

    repository.getById.mockResolvedValue({
      id: "artefact-storage-1",
      ownerId: ownerA,
      name: "CV",
      type: "CV",
      description: null,
      contentMarkdown: null,
      externalUrl: null,
      storageProvider: "GOOGLE_DRIVE",
      storageReference: "drive-file-1",
      mimeType: "application/pdf",
      archivedAt: null,
    });

    const serviceWithStorage = new ArtefactService(repository as any, resolver);

    const result = await serviceWithStorage.getStorageMetadata(
      ownerA,
      "artefact-storage-1",
    );

    expect(resolver.resolve).toHaveBeenCalledWith(ownerA, "GOOGLE_DRIVE");

    expect(provider.getMetadata).toHaveBeenCalledWith({
      provider: "google-drive",
      reference: "drive-file-1",
    });

    expect(result).toBe(metadata);
  });

  it("passes the owner scope to the storage provider resolver", async () => {
    const provider = createStorageProvider();
    const resolver = createStorageResolver(provider);

    vi.mocked(provider.getMetadata).mockResolvedValue({
      reference: {
        provider: "google-drive",
        reference: "drive-file-2",
      },
      name: "portfolio.pdf",
    });

    repository.getById.mockResolvedValue({
      id: "artefact-storage-2",
      ownerId: ownerB,
      name: "Portfolio",
      type: "PORTFOLIO_EVIDENCE",
      description: null,
      contentMarkdown: null,
      externalUrl: null,
      storageProvider: "GOOGLE_DRIVE",
      storageReference: "drive-file-2",
      mimeType: "application/pdf",
      archivedAt: null,
    });

    const serviceWithStorage = new ArtefactService(repository as any, resolver);

    await serviceWithStorage.getStorageMetadata(ownerB, "artefact-storage-2");

    expect(resolver.resolve).toHaveBeenCalledWith(ownerB, "GOOGLE_DRIVE");
  });

  it("does not expose provider-specific credentials or API behavior", async () => {
    const provider = createStorageProvider();
    const resolver = createStorageResolver(provider);

    const content: StorageFileContent = {
      metadata: {
        reference: {
          provider: "google-drive",
          reference: "drive-file-3",
        },
        name: "CV.pdf",
        mimeType: "application/pdf",
      },
      content: new Uint8Array([1, 2, 3]),
    };

    vi.mocked(provider.download).mockResolvedValue(content);

    repository.getById.mockResolvedValue({
      id: "artefact-storage-3",
      ownerId: ownerA,
      name: "CV",
      type: "CV",
      description: null,
      contentMarkdown: null,
      externalUrl: null,
      storageProvider: "GOOGLE_DRIVE",
      storageReference: "drive-file-3",
      mimeType: "application/pdf",
      archivedAt: null,
    });

    const serviceWithStorage = new ArtefactService(repository as any, resolver);

    const result = await serviceWithStorage.download(
      ownerA,
      "artefact-storage-3",
    );

    expect(result).toBe(content);
    expect(provider.download).toHaveBeenCalledWith({
      provider: "google-drive",
      reference: "drive-file-3",
    });
  });

  it("rejects an unsupported persisted storage provider", async () => {
    const provider = createStorageProvider();
    const resolver = createStorageResolver(provider);

    repository.getById.mockResolvedValue({
      id: "artefact-storage-4",
      ownerId: ownerA,
      name: "Unknown",
      type: "OTHER",
      description: null,
      contentMarkdown: null,
      externalUrl: null,
      storageProvider: "DROPBOX",
      storageReference: "dropbox-file-1",
      mimeType: null,
    });

    const serviceWithStorage = new ArtefactService(repository as any, resolver);

    await expect(
      serviceWithStorage.getStorageMetadata(ownerA, "artefact-storage-4"),
    ).rejects.toThrow("Unsupported storage provider: DROPBOX");

    expect(resolver.resolve).not.toHaveBeenCalled();
  });
});
