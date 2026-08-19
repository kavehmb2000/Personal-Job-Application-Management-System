import { prisma } from "@/lib/db";
import { roleFamilyOwnerWhere } from "@/lib/repositories/owner-scope";

export class RoleFamilyRepository {
    async getById(
        ownerId: string,
        roleFamilyId: string,
    ) {
        return prisma.roleFamily.findFirst({
            where: {
                id: roleFamilyId,
                ...roleFamilyOwnerWhere(ownerId),
            },
        });
    }

    async listActive(ownerId: string) {
        return prisma.roleFamily.findMany({
            where: {
                ...roleFamilyOwnerWhere(ownerId),
                isActive: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
        });
    }
}