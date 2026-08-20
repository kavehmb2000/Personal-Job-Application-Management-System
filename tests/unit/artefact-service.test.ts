import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArtefactService } from "@/lib/services/artefact-service";

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

        expect(repository.create).toHaveBeenCalledWith(
            ownerA,
            input,
        );

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

        const result = await service.getById(
            ownerA,
            "artefact-1",
        );

        expect(repository.getById).toHaveBeenCalledWith(
            ownerA,
            "artefact-1",
        );

        expect(result).toBe(artefact);
    });

    it("rejects creation when no representation is supplied", async () => {
        repository.create.mockRejectedValue(
            new Error(
                "Artefact must have at least one representation",
            ),
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
        ).rejects.toThrow(
            "Artefact must have at least one representation",
        );
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

        const result = await service.archive(
            ownerA,
            "artefact-1",
        );

        expect(repository.archive).toHaveBeenCalledWith(
            ownerA,
            "artefact-1",
        );

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

        await service.getById(
            ownerB,
            "artefact-1",
        );

        await service.archive(
            ownerB,
            "artefact-1",
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerB,
            expect.any(Object),
        );

        expect(repository.getById).toHaveBeenCalledWith(
            ownerB,
            "artefact-1",
        );

        expect(repository.archive).toHaveBeenCalledWith(
            ownerB,
            "artefact-1",
        );
    });
});