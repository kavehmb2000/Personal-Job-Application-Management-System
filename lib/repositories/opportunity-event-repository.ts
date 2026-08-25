import type { OpportunityEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { opportunityOwnerWhere } from "@/lib/repositories/owner-scope";

export type CreateOpportunityEventInput = {
  occurredAt: Date;
  type: OpportunityEventType;
  title: string;
  descriptionMarkdown?: string | null;
  artefactIds?: string[];
};

export class OpportunityEventRepository {
  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateOpportunityEventInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: {
          id: opportunityId,
          ...opportunityOwnerWhere(ownerId),
        },
      });

      if (!opportunity) {
        throw new Error(
          `Opportunity ${opportunityId} was not found in owner scope`,
        );
      }

      const artefactIds = input.artefactIds ?? [];

      if (artefactIds.length > 0) {
        const artefactCount = await tx.artefact.count({
          where: {
            id: {
              in: artefactIds,
            },
            ownerId,
          },
        });

        if (artefactCount !== artefactIds.length) {
          throw new Error(
            "One or more artefacts were not found in owner scope",
          );
        }
      }

      return tx.opportunityEvent.create({
        data: {
          opportunityId,
          occurredAt: input.occurredAt,
          type: input.type,
          title: input.title,
          descriptionMarkdown: input.descriptionMarkdown ?? null,
          systemGenerated: false,
          artefacts:
            artefactIds.length > 0
              ? {
                  create: artefactIds.map((artefactId) => ({
                    artefact: {
                      connect: {
                        id: artefactId,
                      },
                    },
                  })),
                }
              : undefined,
        },
        include: {
          artefacts: {
            include: {
              artefact: true,
            },
          },
        },
      });
    });
  }

  async getById(ownerId: string, opportunityId: string, eventId: string) {
    return prisma.opportunityEvent.findFirst({
      where: {
        id: eventId,
        opportunityId,
        opportunity: {
          ...opportunityOwnerWhere(ownerId),
        },
      },
      include: {
        artefacts: {
          include: {
            artefact: true,
          },
        },
      },
    });
  }

  async listForOpportunity(ownerId: string, opportunityId: string) {
    return prisma.opportunityEvent.findMany({
      where: {
        opportunityId,
        opportunity: {
          ...opportunityOwnerWhere(ownerId),
        },
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
    });
  }
}
