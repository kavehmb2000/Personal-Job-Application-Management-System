import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ArtefactType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";

describe("Artefact library", () => {
  const ownerId = "00000000-0000-0000-0000-000000000001";
  const otherOwnerId = "00000000-0000-0000-0000-000000000002";

  let service: ArtefactService;

  beforeEach(() => {
    service = new ArtefactService(new ArtefactRepository());
  });

  async function createOwner(id: string, email: string, googleSubject: string) {
    return prisma.ownerAccount.create({
      data: {
        id,
        email,
        googleSubject,
      },
    });
  }

  afterEach(async () => {
    await prisma.artefact.deleteMany({
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

  it("lists active artefacts", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    await service.create(ownerId, {
      name: "Primary CV",
      type: ArtefactType.CV,
      contentMarkdown: "# CV",
    });

    await service.create(ownerId, {
      name: "Cover Letter",
      type: ArtefactType.COVER_LETTER,
      contentMarkdown: "# Cover Letter",
    });

    const artefacts = await service.list(ownerId);

    expect(artefacts).toHaveLength(2);
    expect(artefacts.map((artefact) => artefact.name)).toEqual([
      "Cover Letter",
      "Primary CV",
    ]);
  });

  it("excludes archived artefacts by default", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const active = await service.create(ownerId, {
      name: "Active CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Active",
    });

    const archived = await service.create(ownerId, {
      name: "Old CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Old",
    });

    await service.archive(ownerId, archived.id);

    const artefacts = await service.list(ownerId);

    expect(artefacts).toHaveLength(1);
    expect(artefacts[0].id).toBe(active.id);
  });

  it("includes archived artefacts when requested", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const archived = await service.create(ownerId, {
      name: "Old CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Old",
    });

    await service.archive(ownerId, archived.id);

    const artefacts = await service.list(ownerId, {
      includeArchived: true,
    });

    expect(artefacts).toHaveLength(1);
    expect(artefacts[0].id).toBe(archived.id);
    expect(artefacts[0].archivedAt).not.toBeNull();
  });

  it("filters artefacts by type", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    await service.create(ownerId, {
      name: "CV",
      type: ArtefactType.CV,
      contentMarkdown: "# CV",
    });

    await service.create(ownerId, {
      name: "Cover Letter",
      type: ArtefactType.COVER_LETTER,
      contentMarkdown: "# Cover Letter",
    });

    await service.create(ownerId, {
      name: "Second CV",
      type: ArtefactType.CV,
      contentMarkdown: "# CV 2",
    });

    const artefacts = await service.list(ownerId, {
      type: ArtefactType.CV,
    });

    expect(artefacts).toHaveLength(2);
    expect(
      artefacts.every((artefact) => artefact.type === ArtefactType.CV),
    ).toBe(true);
  });

  it("isolates artefacts by owner", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    await createOwner(
      otherOwnerId,
      "other-owner@example.com",
      "google-subject-other-owner",
    );

    await service.create(ownerId, {
      name: "Owner CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Owner",
    });

    await service.create(otherOwnerId, {
      name: "Other CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Other",
    });

    const ownerArtefacts = await service.list(ownerId);
    const otherArtefacts = await service.list(otherOwnerId);

    expect(ownerArtefacts).toHaveLength(1);
    expect(ownerArtefacts[0].name).toBe("Owner CV");

    expect(otherArtefacts).toHaveLength(1);
    expect(otherArtefacts[0].name).toBe("Other CV");
  });

  it("rejects creation without content, external URL, or storage reference", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    await expect(
      service.create(ownerId, {
        name: "Invalid Artefact",
        type: ArtefactType.OTHER,
      }),
    ).rejects.toThrow(
      "Artefact requires contentMarkdown, externalUrl, or storageReference",
    );
  });

  it("creates an artefact with Markdown content", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const artefact = await service.create(ownerId, {
      name: "CV Draft",
      type: ArtefactType.CV,
      contentMarkdown: "# Senior Software Engineer\n\n.NET and PostgreSQL",
    });

    expect(artefact.contentMarkdown).toBe(
      "# Senior Software Engineer\n\n.NET and PostgreSQL",
    );
    expect(artefact.externalUrl).toBeNull();
    expect(artefact.storageReference).toBeNull();
  });

  it("creates an artefact with an external URL", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const artefact = await service.create(ownerId, {
      name: "Job Description",
      type: ArtefactType.JOB_DESCRIPTION,
      externalUrl: "https://example.com/jobs/123",
    });

    expect(artefact.externalUrl).toBe("https://example.com/jobs/123");
  });

  it("archives an artefact", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const artefact = await service.create(ownerId, {
      name: "Old CV",
      type: ArtefactType.CV,
      contentMarkdown: "# Old",
    });

    expect(artefact.archivedAt).toBeNull();

    const archived = await service.archive(ownerId, artefact.id);

    expect(archived.archivedAt).not.toBeNull();

    const activeArtefacts = await service.list(ownerId);

    expect(activeArtefacts).toHaveLength(0);
  });

  describe("archive and restore", () => {
    it("restores an archived artefact and includes it in the active list", async () => {
      await createOwner(
        ownerId,
        "library-owner@example.com",
        "google-subject-owner",
      );

      const activeArtefact = await service.create(ownerId, {
        name: "Active CV",
        type: ArtefactType.CV,
        contentMarkdown: "# Active CV",
      });

      const artefact = await service.create(ownerId, {
        name: "Restore Test CV",
        type: ArtefactType.CV,
        description: "CV used to verify archive and restore",
        contentMarkdown: "# Restore Test CV\n\nSoftware Engineer",
      });

      const archived = await service.archive(ownerId, artefact.id);

      expect(archived.id).toBe(artefact.id);
      expect(archived.archivedAt).not.toBeNull();

      const activeAfterArchive = await service.list(ownerId);

      expect(activeAfterArchive).toHaveLength(1);
      expect(activeAfterArchive[0].id).toBe(activeArtefact.id);

      const restored = await service.restore(ownerId, artefact.id);

      expect(restored.id).toBe(artefact.id);
      expect(restored.archivedAt).toBeNull();
      expect(restored.name).toBe("Restore Test CV");
      expect(restored.type).toBe(ArtefactType.CV);
      expect(restored.description).toBe(
        "CV used to verify archive and restore",
      );
      expect(restored.contentMarkdown).toBe(
        "# Restore Test CV\n\nSoftware Engineer",
      );

      const activeAfterRestore = await service.list(ownerId);

      expect(activeAfterRestore).toHaveLength(2);
      expect(activeAfterRestore.some(({ id }) => id === artefact.id)).toBe(
        true,
      );
      expect(
        activeAfterRestore.some(({ id }) => id === activeArtefact.id),
      ).toBe(true);
    });

    it("restores only the targeted artefact", async () => {
      await createOwner(
        ownerId,
        "library-owner@example.com",
        "google-subject-owner",
      );

      const first = await service.create(ownerId, {
        name: "First CV",
        type: ArtefactType.CV,
        contentMarkdown: "# First CV",
      });

      const second = await service.create(ownerId, {
        name: "Second CV",
        type: ArtefactType.CV,
        contentMarkdown: "# Second CV",
      });

      await service.archive(ownerId, first.id);
      await service.archive(ownerId, second.id);

      const restored = await service.restore(ownerId, first.id);

      expect(restored.id).toBe(first.id);
      expect(restored.archivedAt).toBeNull();

      const activeArtefacts = await service.list(ownerId);

      expect(activeArtefacts).toHaveLength(1);
      expect(activeArtefacts[0].id).toBe(first.id);

      const allArtefacts = await service.list(ownerId, {
        includeArchived: true,
      });

      expect(allArtefacts).toHaveLength(2);

      const restoredFromList = allArtefacts.find(({ id }) => id === first.id);
      const stillArchived = allArtefacts.find(({ id }) => id === second.id);

      expect(restoredFromList?.archivedAt).toBeNull();
      expect(stillArchived?.archivedAt).not.toBeNull();
    });

    it("does not allow one owner to restore another owner's artefact", async () => {
      await createOwner(
        ownerId,
        "library-owner@example.com",
        "google-subject-owner",
      );

      await createOwner(
        otherOwnerId,
        "other-owner@example.com",
        "google-subject-other-owner",
      );

      const otherOwnerArtefact = await service.create(otherOwnerId, {
        name: "Owner B Restore Test CV",
        type: ArtefactType.CV,
        contentMarkdown: "# Owner B CV",
      });

      await service.archive(otherOwnerId, otherOwnerArtefact.id);

      await expect(
        service.restore(ownerId, otherOwnerArtefact.id),
      ).rejects.toThrow();

      const ownerArtefacts = await service.list(ownerId, {
        includeArchived: true,
      });

      expect(ownerArtefacts).toHaveLength(0);

      const otherOwnerArtefactAfterAttempt = await service.getById(
        otherOwnerId,
        otherOwnerArtefact.id,
      );

      expect(otherOwnerArtefactAfterAttempt).not.toBeNull();
      expect(otherOwnerArtefactAfterAttempt?.archivedAt).not.toBeNull();
    });

    it("rejects restoring an artefact that is already active", async () => {
      await createOwner(
        ownerId,
        "library-owner@example.com",
        "google-subject-owner",
      );

      const artefact = await service.create(ownerId, {
        name: "Already Active CV",
        type: ArtefactType.CV,
        contentMarkdown: "# Already Active",
      });

      expect(artefact.archivedAt).toBeNull();

      await expect(service.restore(ownerId, artefact.id)).rejects.toThrow();

      const unchanged = await service.getById(ownerId, artefact.id);

      expect(unchanged).not.toBeNull();
      expect(unchanged?.archivedAt).toBeNull();
    });

    it("rejects restoring a nonexistent artefact", async () => {
      await createOwner(
        ownerId,
        "library-owner@example.com",
        "google-subject-owner",
      );

      const nonexistentArtefactId = "00000000-0000-0000-0000-000000000099";

      await expect(
        service.restore(ownerId, nonexistentArtefactId),
      ).rejects.toThrow();

      const activeArtefacts = await service.list(ownerId);

      expect(activeArtefacts).toHaveLength(0);
    });
  });

  it("creates a storage-backed artefact without exposing provider-specific credentials", async () => {
    await createOwner(
      ownerId,
      "library-owner@example.com",
      "google-subject-owner",
    );

    const artefact = await service.create(ownerId, {
      name: "Stored CV",
      type: ArtefactType.CV,
      storageProvider: "GOOGLE_DRIVE",
      storageReference: "drive-file-123",
      mimeType: "application/pdf",
    });

    expect(artefact.storageProvider).toBe("GOOGLE_DRIVE");
    expect(artefact.storageReference).toBe("drive-file-123");
    expect(artefact.mimeType).toBe("application/pdf");
  });
});
