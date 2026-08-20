import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";

describe("ArtefactRepository", () => {
    const ownerA = "artefact-repository-owner-a";
    const ownerB = "artefact-repository-owner-b";

    let repository: ArtefactRepository;

    beforeEach(async () => {
        repository = new ArtefactRepository(prisma);

        await prisma.opportunityArtefact.deleteMany({
            where: {
                artefact: {
                    ownerId: {
                        in: [ownerA, ownerB],
                    },
                },
            },
        });

        await prisma.eventArtefact.deleteMany({
            where: {
                artefact: {
                    ownerId: {
                        in: [ownerA, ownerB],
                    },
                },
            },
        });

        await prisma.submission.deleteMany({
            where: {
                OR: [
                    {
                        cvArtefact: {
                            ownerId: {
                                in: [ownerA, ownerB],
                            },
                        },
                    },
                    {
                        coverLetterArtefact: {
                            ownerId: {
                                in: [ownerA, ownerB],
                            },
                        },
                    },
                ],
            },
        });

        await prisma.artefact.deleteMany({
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
                    googleSubject: `artefact-repository-${ownerA}`,
                    email: `${ownerA}@example.com`,
                },
                {
                    id: ownerB,
                    googleSubject: `artefact-repository-${ownerB}`,
                    email: `${ownerB}@example.com`,
                },
            ],
        });
    });

    it("creates an Artefact within the owner's scope", async () => {
        const artefact = await repository.create(ownerA, {
            name: "Senior Engineer CV",
            type: "CV",
            contentMarkdown: "# CV",
        });

        expect(artefact.ownerId).toBe(ownerA);
        expect(artefact.name).toBe("Senior Engineer CV");
        expect(artefact.contentMarkdown).toBe("# CV");
    });

    it("rejects an Artefact without a representation", async () => {
        await expect(
            repository.create(ownerA, {
                name: "Invalid Artefact",
                type: "CV",
            }),
        ).rejects.toThrow();
    });

    it("gets an Artefact within the owner's scope", async () => {
        const artefact = await repository.create(ownerA, {
            name: "CV",
            type: "CV",
            contentMarkdown: "# CV",
        });

        const result = await repository.getById(
            ownerA,
            artefact.id,
        );

        expect(result?.id).toBe(artefact.id);
        expect(result?.ownerId).toBe(ownerA);
    });

    it("does not get an Artefact belonging to another owner", async () => {
        const artefact = await repository.create(ownerA, {
            name: "Private CV",
            type: "CV",
            contentMarkdown: "# Private CV",
        });

        const result = await repository.getById(
            ownerB,
            artefact.id,
        );

        expect(result).toBeNull();
    });

    it("archives an Artefact within the owner's scope", async () => {
        const artefact = await repository.create(ownerA, {
            name: "CV",
            type: "CV",
            contentMarkdown: "# CV",
        });

        const archived = await repository.archive(
            ownerA,
            artefact.id,
        );

        expect(archived.archivedAt).not.toBeNull();
    });

    it("does not archive an Artefact belonging to another owner", async () => {
        const artefact = await repository.create(ownerA, {
            name: "Private CV",
            type: "CV",
            contentMarkdown: "# Private CV",
        });

        await expect(
            repository.archive(ownerB, artefact.id),
        ).rejects.toThrow();

        const unchanged = await prisma.artefact.findUnique({
            where: {
                id: artefact.id,
            },
        });

        expect(unchanged?.archivedAt).toBeNull();
    });

    it("does not archive an already archived Artefact", async () => {
        const artefact = await repository.create(ownerA, {
            name: "CV",
            type: "CV",
            contentMarkdown: "# CV",
        });

        await repository.archive(ownerA, artefact.id);

        await expect(
            repository.archive(ownerA, artefact.id),
        ).rejects.toThrow();
    });
});