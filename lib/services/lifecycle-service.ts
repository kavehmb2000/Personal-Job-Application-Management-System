import type {
    LifecycleStateKey,
    OpportunityEventType,
    PrismaClient,
} from "@prisma/client";

import { InvalidOpportunityLifecycleTransitionError } from "@/lib/domain/opportunity-lifecycle";

type LifecycleTransitionEventInput = {
    occurredAt?: Date;
    title?: string;
    descriptionMarkdown?: string | null;
    simulateEventFailure?: boolean;
};

const transitionEventTypes: Partial<
    Record<`${LifecycleStateKey}->${LifecycleStateKey}`, OpportunityEventType>
> = {
    "DISCOVERED->SUBMITTED": "OPPORTUNITY_SUBMITTED",
    "DISCOVERED->CLOSED": "OPPORTUNITY_CLOSED",
    "DISCOVERED->CANCELLED": "OPPORTUNITY_CANCELLED",

    "SUBMITTED->IN_PROGRESS": "OPPORTUNITY_IN_PROGRESS",
    "SUBMITTED->CLOSED": "OPPORTUNITY_CLOSED",
    "SUBMITTED->CANCELLED": "OPPORTUNITY_CANCELLED",
    "SUBMITTED->REJECTED": "OPPORTUNITY_REJECTED",

    "IN_PROGRESS->OFFER": "OFFER_RECEIVED",
    "IN_PROGRESS->CLOSED": "OPPORTUNITY_CLOSED",
    "IN_PROGRESS->CANCELLED": "OPPORTUNITY_CANCELLED",
    "IN_PROGRESS->REJECTED": "OPPORTUNITY_REJECTED",

    "OFFER->CLOSED": "OPPORTUNITY_CLOSED",
    "OFFER->CANCELLED": "OPPORTUNITY_CANCELLED",
    "OFFER->REJECTED": "OPPORTUNITY_REJECTED",
};

export class LifecycleService {
    constructor(private readonly prisma: PrismaClient) {}

    async validateTransition(
        ownerId: string,
        from: LifecycleStateKey,
        to: LifecycleStateKey,
    ): Promise<void> {
        const fromStatus = await this.prisma.lifecycleStatus.findFirst({
            where: {
                ownerId,
                key: from,
                isActive: true,
            },
        });

        if (!fromStatus) {
            throw new Error(
                `Lifecycle status ${from} was not found for owner ${ownerId}`,
            );
        }

        const toStatus = await this.prisma.lifecycleStatus.findFirst({
            where: {
                ownerId,
                key: to,
                isActive: true,
            },
        });

        if (!toStatus) {
            throw new Error(
                `Lifecycle status ${to} was not found for owner ${ownerId}`,
            );
        }

        if (fromStatus.isTerminal) {
            throw new InvalidOpportunityLifecycleTransitionError(from, to);
        }

        const transition =
            await this.prisma.lifecycleTransition.findUnique({
                where: {
                    fromStatusId_toStatusId: {
                        fromStatusId: fromStatus.id,
                        toStatusId: toStatus.id,
                    },
                },
            });

        if (!transition) {
            throw new InvalidOpportunityLifecycleTransitionError(from, to);
        }
    }

    async transition(
        ownerId: string,
        opportunityId: string,
        to: LifecycleStateKey,
        event: LifecycleTransitionEventInput = {},
    ) {
        return this.prisma.$transaction(async (tx) => {
            const opportunity = await tx.opportunity.findFirst({
                where: {
                    id: opportunityId,
                    ownerId,
                },
                include: {
                    status: true,
                },
            });

            if (!opportunity) {
                throw new Error(
                    `Opportunity ${opportunityId} was not found in owner scope`,
                );
            }

            const from = opportunity.status.key;

            const fromStatus = await tx.lifecycleStatus.findFirst({
                where: {
                    ownerId,
                    key: from,
                    isActive: true,
                },
            });

            const toStatus = await tx.lifecycleStatus.findFirst({
                where: {
                    ownerId,
                    key: to,
                    isActive: true,
                },
            });

            if (!fromStatus) {
                throw new Error(
                    `Lifecycle status ${from} was not found for owner ${ownerId}`,
                );
            }

            if (!toStatus) {
                throw new Error(
                    `Lifecycle status ${to} was not found for owner ${ownerId}`,
                );
            }

            if (fromStatus.isTerminal) {
                throw new InvalidOpportunityLifecycleTransitionError(
                    from,
                    to,
                );
            }

            const transition =
                await tx.lifecycleTransition.findUnique({
                    where: {
                        fromStatusId_toStatusId: {
                            fromStatusId: fromStatus.id,
                            toStatusId: toStatus.id,
                        },
                    },
                });

            if (!transition) {
                throw new InvalidOpportunityLifecycleTransitionError(
                    from,
                    to,
                );
            }

            const eventType =
                transitionEventTypes[
                    `${from}->${to}` as `${LifecycleStateKey}->${LifecycleStateKey}`
                ];

            if (!eventType) {
                throw new Error(
                    `No OpportunityEventType is defined for ${from} -> ${to}`,
                );
            }

            const updateResult = await tx.opportunity.updateMany({
                where: {
                    id: opportunityId,
                    ownerId,
                    version: opportunity.version,
                    statusId: fromStatus.id,
                },
                data: {
                    statusId: toStatus.id,
                    version: {
                        increment: 1,
                    },
                },
            });

            if (updateResult.count !== 1) {
                throw new Error(
                    `Opportunity ${opportunityId} changed before lifecycle transition could be committed`,
                );
            }

            if (event.simulateEventFailure) {
                throw new Error(
                    "Simulated OpportunityEvent creation failure",
                );
            }

            await tx.opportunityEvent.create({
                data: {
                    opportunityId,
                    occurredAt: event.occurredAt ?? new Date(),
                    type: eventType,
                    title:
                        event.title ??
                        `${fromStatus.label} → ${toStatus.label}`,
                    descriptionMarkdown:
                        event.descriptionMarkdown ?? null,
                    systemGenerated: true,
                },
            });

            return tx.opportunity.findFirstOrThrow({
                where: {
                    id: opportunityId,
                    ownerId,
                },
                include: {
                    status: true,
                },
            });
        });
    }
}
