import { AuditEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/domain/errors";
import { recordAuditEventStrict } from "@/lib/services/audit-service";

export type PermanentDeletePreview = {
  opportunityId: string;
  companyName: string;
  positionTitle: string;
  archived: boolean;
  artefacts: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  counts: {
    events: number;
    notes: number;
    actions: number;
    scheduledEvents: number;
    communications: number;
    contacts: number;
    artefacts: number;
  };
};

export class PermanentDeleteService {
  async preview(
    ownerId: string,
    opportunityId: string,
  ): Promise<PermanentDeletePreview> {
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
      include: {
        artefacts: {
          include: {
            artefact: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            events: true,
            notes: true,
            actions: true,
            scheduledEvents: true,
            communications: true,
            contacts: true,
            artefacts: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundError(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    return {
      opportunityId: opportunity.id,
      companyName: opportunity.companyName,
      positionTitle: opportunity.positionTitle,
      archived: opportunity.archivedAt !== null,
      artefacts: opportunity.artefacts.map(({ artefact }) => ({
        id: artefact.id,
        name: artefact.name,
        type: artefact.type,
      })),
      counts: {
        events: opportunity._count.events,
        notes: opportunity._count.notes,
        actions: opportunity._count.actions,
        scheduledEvents: opportunity._count.scheduledEvents,
        communications: opportunity._count.communications,
        contacts: opportunity._count.contacts,
        artefacts: opportunity._count.artefacts,
      },
    };
  }

  async delete(ownerId: string, opportunityId: string) {
    const preview = await this.preview(ownerId, opportunityId);

    if (!preview.archived) {
      throw new Error(
        `Opportunity ${opportunityId} must be archived before permanent deletion`,
      );
    }

    await prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: {
          id: opportunityId,
          ownerId,
          archivedAt: {
            not: null,
          },
        },
        select: {
          id: true,
        },
      });

      if (!opportunity) {
        throw new NotFoundError(
          `Opportunity ${opportunityId} was not found in owner scope or is not archived`,
        );
      }

      await recordAuditEventStrict(
        {
          ownerId,
          type: AuditEventType.PERMANENT_DELETE,
          targetType: "Opportunity",
          targetId: opportunityId,
          metadata: {
            companyName: preview.companyName,
            positionTitle: preview.positionTitle,
            counts: preview.counts,
          },
        },
        tx,
      );

      await tx.opportunityArtefact.deleteMany({
        where: {
          opportunityId,
        },
      });

      await tx.opportunityContact.deleteMany({
        where: {
          opportunityId,
        },
      });

      await tx.opportunity.delete({
        where: {
          id: opportunityId,
        },
      });
    });

    return {
      opportunityId,
      deleted: true,
    };
  }
}
