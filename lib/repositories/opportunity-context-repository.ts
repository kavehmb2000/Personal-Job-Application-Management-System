import type { PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/db";

export class OpportunityContextRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async getContext(ownerId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
      include: {
        status: true,
      },
    });

    if (!opportunity) {
      return null;
    }

    const [
      notes,
      events,
      submission,
      artefactLinks,
      actions,
      scheduledEvents,
      contactLinks,
      communications,
    ] = await Promise.all([
      this.prisma.opportunityNote.findMany({
        where: {
          opportunityId,
        },
      }),

      this.prisma.opportunityEvent.findMany({
        where: {
          opportunityId,
        },
        orderBy: [
          {
            occurredAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        include: {
          artefacts: {
            include: {
              artefact: true,
            },
          },
        },
      }),

      this.prisma.submission.findUnique({
        where: {
          opportunityId,
        },
      }),

      this.prisma.opportunityArtefact.findMany({
        where: {
          opportunityId,
          artefact: {
            ownerId,
          },
        },
        include: {
          artefact: true,
        },
      }),

      this.prisma.userAction.findMany({
        where: {
          opportunityId,
        },
        orderBy: [
          {
            dueAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      }),

      this.prisma.scheduledEvent.findMany({
        where: {
          opportunityId,
        },
        orderBy: [
          {
            scheduledAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      }),

      this.prisma.opportunityContact.findMany({
        where: {
          opportunityId,
          contact: {
            ownerId,
          },
        },
        include: {
          contact: true,
        },
      }),

      this.prisma.communication.findMany({
        where: {
          opportunityId,
        },
        orderBy: [
          {
            occurredAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      }),
    ]);

    return {
      opportunity,
      notes,
      events,
      submission,
      artefacts: artefactLinks.map((link) => link.artefact),
      actions,
      scheduledEvents,
      contacts: contactLinks.map((link) => link.contact),
      communications,
    };
  }
}
