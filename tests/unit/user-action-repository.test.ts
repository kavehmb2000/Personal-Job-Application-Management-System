import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { UserActionRepository } from "@/lib/repositories/user-action-repository";

describe("UserActionRepository", () => {
    const ownerA = "user-action-repository-owner-a";
    const ownerB = "user-action-repository-owner-b";

    let repository: UserActionRepository;
    let opportunityA: { id: string };
    let opportunityB: { id: string };

    beforeEach(async () => {
        repository = new UserActionRepository(prisma);

        await prisma.userAction.deleteMany({
            where: {
                opportunity: {
                    ownerId: {
                        in: [ownerA, ownerB],
                    },
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

        await prisma.lifecycleTransition.deleteMany({
            where: {
                OR: [
                    {
                        fromStatus: {
                            ownerId: {
                                in: [ownerA, ownerB],
                            },
                        },
                    },
                    {
                        toStatus: {
                            ownerId: {
                                in: [ownerA, ownerB],
                            },
                        },
                    },
                ],
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
                    googleSubject: `user-action-${ownerA}`,
                    email: `${ownerA}@example.com`,
                },
                {
                    id: ownerB,
                    googleSubject: `user-action-${ownerB}`,
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
    });

    it("creates a UserAction within the Opportunity owner scope", async () => {
        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Prepare interview questions",
                descriptionMarkdown: "Review technical questions.",
                priority: "HIGH",
                dueAt: new Date("2026-08-25T10:00:00.000Z"),
            },
        );

        expect(action.opportunityId).toBe(opportunityA.id);
        expect(action.title).toBe("Prepare interview questions");
        expect(action.status).toBe("TODO");
        expect(action.priority).toBe("HIGH");
        expect(action.version).toBe(1);
    });

    it("rejects creation against another owner's Opportunity", async () => {
        await expect(
            repository.create(
                ownerA,
                opportunityB.id,
                {
                    title: "Should not be created",
                },
            ),
        ).rejects.toThrow();
    });

    it("gets a UserAction within the owner's Opportunity scope", async () => {
        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Follow up",
            },
        );

        const result = await repository.getById(
            ownerA,
            opportunityA.id,
            action.id,
        );

        expect(result?.id).toBe(action.id);
        expect(result?.opportunityId).toBe(opportunityA.id);
    });

    it("does not expose another owner's UserAction", async () => {
        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Private action",
            },
        );

        const result = await repository.getById(
            ownerB,
            opportunityA.id,
            action.id,
        );

        expect(result).toBeNull();
    });

    it("updates a UserAction using the expected version", async () => {
        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Prepare interview",
            },
        );

        const updated = await repository.update(
            ownerA,
            opportunityA.id,
            action.id,
            1,
            {
                status: "COMPLETED",
                priority: "HIGH",
                dueAt: new Date("2026-08-25T10:00:00.000Z"),
                completedAt: new Date("2026-08-24T15:00:00.000Z"),
            },
        );

        expect(updated.status).toBe("COMPLETED");
        expect(updated.priority).toBe("HIGH");
        expect(updated.completedAt).not.toBeNull();
        expect(updated.version).toBe(2);
    });

    it("rejects a stale-version update", async () => {
        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Prepare interview",
            },
        );

        await repository.update(
            ownerA,
            opportunityA.id,
            action.id,
            1,
            {
                title: "First update",
            },
        );

        await expect(
            repository.update(
                ownerA,
                opportunityA.id,
                action.id,
                1,
                {
                    title: "Stale update",
                },
            ),
        ).rejects.toThrow(
            "UserAction could not be modified with expected version 1",
        );
    });

    it("preserves status, priority, due date, and completion timestamp", async () => {
        const dueAt = new Date("2026-08-25T10:00:00.000Z");
        const completedAt = new Date("2026-08-24T15:00:00.000Z");

        const action = await repository.create(
            ownerA,
            opportunityA.id,
            {
                title: "Complete preparation",
                priority: "HIGH",
                dueAt,
            },
        );

        const updated = await repository.update(
            ownerA,
            opportunityA.id,
            action.id,
            1,
            {
                status: "COMPLETED",
                priority: "NORMAL",
                dueAt,
                completedAt,
            },
        );

        expect(updated.status).toBe("COMPLETED");
        expect(updated.priority).toBe("NORMAL");
        expect(updated.dueAt).toEqual(dueAt);
        expect(updated.completedAt).toEqual(completedAt);
    });
});