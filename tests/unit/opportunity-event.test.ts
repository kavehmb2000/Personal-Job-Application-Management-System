import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { LifecycleService } from "@/lib/services/lifecycle-service";
import { InvalidOpportunityLifecycleTransitionError } from "@/lib/domain/opportunity-lifecycle";

describe("OpportunityEvent", () => {
    let ownerId: string;
    let opportunityId: string;

    async function createOwner(email: string) {
        return prisma.ownerAccount.create({
            data: {
                email,
                googleSubject: `test:${email}`,
                displayName: email,
            },
        });
    }

    beforeEach(async () => {
        const owner = await createOwner(
            `opportunity-event-${crypto.randomUUID()}@example.com`,
        );

        ownerId = owner.id;

        const statuses = await Promise.all([
            prisma.lifecycleStatus.create({
                data: {
                    ownerId,
                    key: "DISCOVERED",
                    label: "Discovered",
                    sortOrder: 10,
                    isTerminal: false,
                    isActive: true,
                },
            }),
            prisma.lifecycleStatus.create({
                data: {
                    ownerId,
                    key: "SUBMITTED",
                    label: "Submitted",
                    sortOrder: 20,
                    isTerminal: false,
                    isActive: true,
                },
            }),
            prisma.lifecycleStatus.create({
                data: {
                    ownerId,
                    key: "IN_PROGRESS",
                    label: "In Progress",
                    sortOrder: 30,
                    isTerminal: false,
                    isActive: true,
                },
            }),
            prisma.lifecycleStatus.create({
                data: {
                    ownerId,
                    key: "OFFER",
                    label: "Offer",
                    sortOrder: 40,
                    isTerminal: false,
                    isActive: true,
                },
            }),
        ]);

        const inProgressStatus = statuses.find(
            (status) => status.key === "IN_PROGRESS",
        );

        if (!inProgressStatus) {
            throw new Error("IN_PROGRESS lifecycle status was not created");
        }

        const opportunity = await prisma.opportunity.create({
            data: {
                ownerId,
                companyName: "Acme Corporation",
                positionTitle: "Senior Software Engineer",
                statusId: inProgressStatus.id,
            },
        });

        opportunityId = opportunity.id;
    });

    afterEach(async () => {
        await prisma.opportunityEvent.deleteMany({
            where: {
                opportunityId,
            },
        });

        await prisma.opportunity.deleteMany({
            where: {
                id: opportunityId,
            },
        });

        await prisma.lifecycleTransition.deleteMany({
            where: {
                fromStatus: {
                    ownerId,
                },
            },
        });

        await prisma.lifecycleStatus.deleteMany({
            where: {
                ownerId,
            },
        });

        await prisma.ownerAccount.deleteMany({
            where: {
                id: ownerId,
            },
        });
    });

    it("does not allow In Progress -> In Progress as a lifecycle transition", async () => {
        const service = new LifecycleService(prisma);

        await expect(
            service.validateTransition(
                ownerId,
                "IN_PROGRESS",
                "IN_PROGRESS",
            ),
        ).rejects.toBeInstanceOf(
            InvalidOpportunityLifecycleTransitionError,
        );
    });

    it("allows a non-state-changing OpportunityEvent while the Opportunity remains In Progress", async () => {
        const event = await prisma.opportunityEvent.create({
            data: {
                opportunityId,
                occurredAt: new Date(),
                type: "COMMUNICATION",
                title: "Follow-up email sent",
                descriptionMarkdown:
                    "Sent a follow-up email to the hiring contact.",
                systemGenerated: false,
            },
        });

        const opportunity = await prisma.opportunity.findUniqueOrThrow({
            where: {
                id: opportunityId,
            },
            include: {
                status: true,
            },
        });

        expect(event.type).toBe("COMMUNICATION");
        expect(event.systemGenerated).toBe(false);
        expect(opportunity.status.key).toBe("IN_PROGRESS");
    });

    it("does not change lifecycle state when a non-state-changing event is recorded", async () => {
        const before = await prisma.opportunity.findUniqueOrThrow({
            where: {
                id: opportunityId,
            },
            include: {
                status: true,
            },
        });

        await prisma.opportunityEvent.create({
            data: {
                opportunityId,
                occurredAt: new Date(),
                type: "INTERVIEW_SCHEDULED",
                title: "Interview scheduled",
                systemGenerated: false,
            },
        });

        const after = await prisma.opportunity.findUniqueOrThrow({
            where: {
                id: opportunityId,
            },
            include: {
                status: true,
            },
        });

        expect(after.statusId).toBe(before.statusId);
        expect(after.status.key).toBe("IN_PROGRESS");
        expect(after.version).toBe(before.version);
    });
});