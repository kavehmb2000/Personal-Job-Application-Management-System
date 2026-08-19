import type { LifecycleStateKey } from "@prisma/client";

import { prisma } from "@/lib/db";
import { lifecycleStatusOwnerWhere } from "@/lib/repositories/owner-scope";

export class LifecycleStatusRepository {
    async getByKey(
        ownerId: string,
        key: LifecycleStateKey,
    ) {
        return prisma.lifecycleStatus.findFirst({
            where: {
                ...lifecycleStatusOwnerWhere(ownerId),
                key,
                isActive: true,
            },
        });
    }

    async listActive(ownerId: string) {
        return prisma.lifecycleStatus.findMany({
            where: {
                ...lifecycleStatusOwnerWhere(ownerId),
                isActive: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
        });
    }
}