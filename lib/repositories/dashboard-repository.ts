// -----------------------------------------------------------------------------
// Dashboard repository
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { opportunityOwnerWhere } from "@/lib/repositories/owner-scope";

const ACTIONABLE_STATES = ["DISCOVERED", "SUBMITTED", "IN_PROGRESS"] as const;

export class DashboardRepository {
  async listActionableOpportunities(ownerId: string) {
    return prisma.opportunity.findMany({
      where: {
        ...opportunityOwnerWhere(ownerId),
        archivedAt: null,
        status: {
          key: {
            in: [...ACTIONABLE_STATES],
          },
        },
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
        nextAction: true,
        nextActionDueAt: true,
      },
      orderBy: [
        {
          nextActionDueAt: "asc",
        },
        {
          discoveredAt: "desc",
        },
      ],
    });
  }

  async listUpcomingScheduledEvents(ownerId: string, now: Date) {
    return prisma.scheduledEvent.findMany({
      where: {
        scheduledAt: {
          gte: now,
        },
        opportunity: {
          ...opportunityOwnerWhere(ownerId),
          archivedAt: null,
        },
      },
      select: {
        id: true,
        opportunityId: true,
        title: true,
        scheduledAt: true,
      },
      orderBy: [
        {
          scheduledAt: "asc",
        },
        {
          id: "asc",
        },
      ],
    });
  }

  async listOverdueUserActions(ownerId: string, now: Date) {
    return prisma.userAction.findMany({
      where: {
        status: {
          in: ["TODO", "IN_PROGRESS"],
        },
        dueAt: {
          lt: now,
        },
        opportunity: {
          ...opportunityOwnerWhere(ownerId),
          archivedAt: null,
        },
      },
      select: {
        id: true,
        opportunityId: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
      },
      orderBy: [
        {
          dueAt: "asc",
        },
        {
          id: "asc",
        },
      ],
    });
  }

  async listOffers(ownerId: string) {
    return prisma.opportunity.findMany({
      where: {
        ...opportunityOwnerWhere(ownerId),
        archivedAt: null,
        status: {
          key: "OFFER",
        },
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
        nextAction: true,
        nextActionDueAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}
