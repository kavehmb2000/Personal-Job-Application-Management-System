import { prisma } from "@/lib/db";
import { SubmissionRepository } from "@/lib/repositories/submission-repository";

export interface CreateSubmissionInput {
  submittedAt: Date;
  method?: string | null;
  notes?: string | null;
  cvArtefactId?: string | null;
  coverLetterArtefactId?: string | null;
}

export interface SubmitSubmissionInput extends CreateSubmissionInput {
  simulateEventFailure?: boolean;
}

export class SubmissionService {
  constructor(
    private readonly repository: SubmissionRepository,
    private readonly db: typeof prisma = prisma,
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
        },
      });

      if (!opportunity) {
        throw new Error(
          `Opportunity ${opportunityId} was not found in owner scope`,
        );
      }

      if (opportunity.status.key !== "DISCOVERED") {
        throw new Error(
          `Opportunity ${opportunityId} must be in DISCOVERED state before submission`,
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
        throw new Error("Required lifecycle status was not found");
      }

      const transition = await tx.lifecycleTransition.findUnique({
        where: {
          fromStatusId_toStatusId: {
            fromStatusId: discoveredStatus.id,
            toStatusId: submittedStatus.id,
          },
        },
      });

      if (!transition) {
        throw new Error(
          "DISCOVERED -> SUBMITTED lifecycle transition is not configured",
        );
      }

      if (input.cvArtefactId || input.coverLetterArtefactId) {
        const artefactIds = [
          input.cvArtefactId,
          input.coverLetterArtefactId,
        ].filter((id): id is string => Boolean(id));

        const artefacts = await tx.artefact.findMany({
          where: {
            id: {
              in: artefactIds,
            },
            ownerId,
          },
        });

        if (artefacts.length !== artefactIds.length) {
          throw new Error(
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
          version: opportunity.version,
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
        throw new Error(
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
          title: "Discovered → Submitted",
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
        },
      });

      return {
        submission,
        opportunity: updatedOpportunity,
      };
    });
  }
}
