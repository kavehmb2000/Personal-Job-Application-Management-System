import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
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
