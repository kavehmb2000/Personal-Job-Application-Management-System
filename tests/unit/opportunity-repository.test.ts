import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LifecycleStateKey } from "@prisma/client";

import { prisma } from "@/lib/db";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";

describe("OpportunityRepository", () => {
    const repository = new OpportunityRepository();

    let ownerA: string;
    let ownerB: string;

    async function createOwner(email: string) {
        return prisma.ownerAccount.create({
            data: {
                email,
                googleSubject: `test:${email}`,
                displayName: email,
            },
        });
    }

    async function createLifecycleStatuses(ownerId: string) {
        const statusDefinitions: Array<{
            key: LifecycleStateKey;
            label: string;
            sortOrder: number;
            isTerminal: boolean;
        }> = [
            {
                key: "DISCOVERED",
                label: "Discovered",
                sortOrder: 10,
                isTerminal: false,
            },
            {
                key: "SUBMITTED",
                label: "Submitted",
                sortOrder: 20,
                isTerminal: false,
            },
            {
                key: "IN_PROGRESS",
                label: "In Progress",
                sortOrder: 30,
                isTerminal: false,
            },
            {
                key: "OFFER",
                label: "Offer",
                sortOrder: 40,
                isTerminal: false,
            },
            {
                key: "CLOSED",
                label: "Closed",
                sortOrder: 50,
                isTerminal: true,
            },
            {
                key: "CANCELLED",
                label: "Cancelled",
                sortOrder: 60,
                isTerminal: true,
            },
            {
                key: "REJECTED",
                label: "Rejected",
                sortOrder: 70,
                isTerminal: true,
            },
        ];

        await prisma.lifecycleStatus.createMany({
            data: statusDefinitions.map((status) => ({
                ownerId,
                key: status.key,
                label: status.label,
                sortOrder: status.sortOrder,
                isTerminal: status.isTerminal,
                isActive: true,
            })),
        });
    }

    beforeEach(async () => {
        const [createdOwnerA, createdOwnerB] = await Promise.all([
            createOwner(`repository-test-a-${crypto.randomUUID()}@example.com`),
            createOwner(`repository-test-b-${crypto.randomUUID()}@example.com`),
        ]);

        ownerA = createdOwnerA.id;
        ownerB = createdOwnerB.id;

        await Promise.all([
            createLifecycleStatuses(ownerA),
            createLifecycleStatuses(ownerB),
        ]);
    });

    afterEach(async () => {
        await prisma.opportunity.deleteMany({
            where: {
                ownerId: {
                    in: [ownerA, ownerB],
                },
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
    });

    it("creates an Opportunity with version 1", async () => {
        const opportunity = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        expect(opportunity.ownerId).toBe(ownerA);
        expect(opportunity.companyName).toBe("Acme Corporation");
        expect(opportunity.positionTitle).toBe("Senior Software Engineer");
        expect(opportunity.version).toBe(1);
        expect(opportunity.archivedAt).toBeNull();
        expect(opportunity.status.key).toBe("DISCOVERED");
    });

    it("reads an Opportunity within the owner's scope", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        const found = await repository.getById(ownerA, created.id);

        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
        expect(found?.ownerId).toBe(ownerA);
    });

    it("does not return an Opportunity belonging to another owner", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        const found = await repository.getById(ownerB, created.id);

        expect(found).toBeNull();
    });

    it("updates an Opportunity when the expected version matches", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        const updated = await repository.update(
            ownerA,
            created.id,
            created.version,
            {
                positionTitle: "Principal Software Engineer",
            },
        );

        expect(updated.positionTitle).toBe("Principal Software Engineer");
        expect(updated.version).toBe(2);
    });

    it("rejects an update when the expected version is stale", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        await repository.update(ownerA, created.id, created.version, {
            positionTitle: "Principal Software Engineer",
        });

        await expect(
            repository.update(ownerA, created.id, created.version, {
                positionTitle: "Engineering Manager",
            }),
        ).rejects.toThrow();
    });

    it("archives an Opportunity using optimistic concurrency", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        const archived = await repository.archive(
            ownerA,
            created.id,
            created.version,
        );

        expect(archived.archivedAt).not.toBeNull();
        expect(archived.version).toBe(2);
        expect(archived.status.key).toBe("DISCOVERED");
    });
    

    it("does not update an Opportunity outside the owner's scope", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        await expect(
            repository.update(ownerB, created.id, created.version, {
                positionTitle: "Principal Software Engineer",
            }),
        ).rejects.toThrow();
    });

    it("does not archive an Opportunity outside the owner's scope", async () => {
        const created = await repository.create(ownerA, {
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
        });

        await expect(
            repository.archive(ownerB, created.id, created.version),
        ).rejects.toThrow();
    });
    
});