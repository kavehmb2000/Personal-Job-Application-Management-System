import { prisma } from "@/lib/db";

export class LifecycleTransitionRepository {
    async findTransition(
        ownerId: string,
        fromStatusId: string,
        toStatusId: string,
    ) {
        return prisma.lifecycleTransition.findFirst({
            where: {
                fromStatusId,
                toStatusId,
                fromStatus: {
                    ownerId,
                },
                toStatus: {
                    ownerId,
                },
            },
            include: {
                fromStatus: true,
                toStatus: true,
            },
        });
    }

    async listFromStatus(
        ownerId: string,
        fromStatusId: string,
    ) {
        return prisma.lifecycleTransition.findMany({
            where: {
                fromStatusId,
                fromStatus: {
                    ownerId,
                },
            },
            include: {
                fromStatus: true,
                toStatus: true,
            },
            orderBy: {
                toStatus: {
                    sortOrder: "asc",
                },
            },
        });
    }
}