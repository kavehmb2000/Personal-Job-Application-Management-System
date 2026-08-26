import { prisma } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/domain/errors";
import { SubmissionRepository } from "@/lib/repositories/submission-repository";

export type CreateSubmissionInput = {
  submittedAt: Date;
  method?: string | null;
  notes?: string | null;
  cvArtefactId?: string | null;
  coverLetterArtefactId?: string | null;
};

export type SubmitSubmissionInput = CreateSubmissionInput & {
  simulateEventFailure?: boolean;
};

export class SubmissionService {
  constructor(
    private readonly repository: SubmissionRepository,
    private readonly db = prisma,
  ) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateSubmissionInput,
  ) {
    return this.repository.create(ownerId, opportunityId, input);
  }

  async getByOpportunityId(ownerId: string, opportunityId: string) {
    return this.repository.getByOpportunityId(ownerId, opportunityId);
  }

  async submit(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
    input: SubmitSubmissionInput,
  ) {
    return this.db.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: {
          id: opportunityId,
          ownerId,
        },
        include: {
          status: true,
          submission: true,
        },
      });

      if (!opportunity) {
        throw new NotFoundError(
          `Opportunity ${opportunityId} was not found in owner scope`,
        );
      }

      if (opportunity.version !== expectedVersion) {
        throw new ConflictError(
          `Opportunity ${opportunityId} has changed since version ${expectedVersion}`,
          {
            expectedVersion,
            actualVersion: opportunity.version,
          },
        );
      }

      if (opportunity.submission) {
        throw new ConflictError(
          `Opportunity ${opportunityId} already has a submission`,
        );
      }

      if (opportunity.status.key !== "DISCOVERED") {
        throw new ConflictError(
          `Opportunity ${opportunityId} cannot be submitted from ${opportunity.status.key}`,
        );
      }

      const discoveredStatus = await tx.lifecycleStatus.findFirst({
        where: {
          ownerId,
          key: "DISCOVERED",
          isActive: true,
        },
      });

      const submittedStatus = await tx.lifecycleStatus.findFirst({
        where: {
          ownerId,
          key: "SUBMITTED",
          isActive: true,
        },
      });

      if (!discoveredStatus || !submittedStatus) {
        throw new ConflictError(
          "Required lifecycle statuses are not configured",
        );
      }

      const lifecycleTransition = await tx.lifecycleTransition.findUnique({
        where: {
          fromStatusId_toStatusId: {
            fromStatusId: discoveredStatus.id,
            toStatusId: submittedStatus.id,
          },
        },
      });

      if (!lifecycleTransition) {
        throw new ConflictError(
          "DISCOVERED -> SUBMITTED lifecycle transition is not configured",
        );
      }

      const artefactIds = [
        input.cvArtefactId,
        input.coverLetterArtefactId,
      ].filter((id): id is string => id !== null && id !== undefined);

      if (artefactIds.length > 0) {
        const distinctArtefactIds = [...new Set(artefactIds)];

        const artefacts = await tx.artefact.findMany({
          where: {
            id: {
              in: distinctArtefactIds,
            },
            ownerId,
          },
          select: {
            id: true,
          },
        });

        if (artefacts.length !== distinctArtefactIds.length) {
          throw new ForbiddenError(
            "Submission references an Artefact outside the owner's scope",
          );
        }
      }

      const submission = await tx.submission.create({
        data: {
          opportunityId,
          submittedAt: input.submittedAt,
          method: input.method ?? null,
          notes: input.notes ?? null,
          cvArtefactId: input.cvArtefactId ?? null,
          coverLetterArtefactId: input.coverLetterArtefactId ?? null,
        },
      });

      const updateResult = await tx.opportunity.updateMany({
        where: {
          id: opportunityId,
          ownerId,
          version: expectedVersion,
          statusId: discoveredStatus.id,
        },
        data: {
          statusId: submittedStatus.id,
          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictError(
          `Opportunity ${opportunityId} changed before submission could be committed`,
        );
      }

      if (input.simulateEventFailure) {
        throw new Error("Simulated OpportunityEvent creation failure");
      }

      await tx.opportunityEvent.create({
        data: {
          opportunityId,
          occurredAt: input.submittedAt,
          type: "OPPORTUNITY_SUBMITTED",
          title: `${discoveredStatus.label} → ${submittedStatus.label}`,
          descriptionMarkdown: null,
          systemGenerated: true,
        },
      });

      const updatedOpportunity = await tx.opportunity.findFirstOrThrow({
        where: {
          id: opportunityId,
          ownerId,
        },
        include: {
          status: true,
          submission: true,
        },
      });

      return {
        submission,
        opportunity: updatedOpportunity,
      };
    });
  }
}
