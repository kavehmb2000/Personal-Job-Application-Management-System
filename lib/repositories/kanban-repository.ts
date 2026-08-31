// -----------------------------------------------------------------------------
// Kanban repository
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { opportunityOwnerWhere } from "@/lib/repositories/owner-scope";

export class KanbanRepository {
  async listForOwner(ownerId: string) {
    return prisma.opportunity.findMany({
      where: {
        ...opportunityOwnerWhere(ownerId),
        archivedAt: null,
      },
      select: {
        id: true,
        version: true,
        positionTitle: true,
        companyName: true,
        location: true,
        country: true,
        status: {
          select: {
            key: true,
          },
        },
        scheduledEvents: {
          where: {
            scheduledAt: {
              gte: new Date(),
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            title: true,
          },
        },
      },
      orderBy: {
        discoveredAt: "desc",
      },
    });
  }
}
