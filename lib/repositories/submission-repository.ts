import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db";

export interface CreateSubmissionInput {
  submittedAt: Date;
  method?: string | null;
  notes?: string | null;
  cvArtefactId?: string | null;
  coverLetterArtefactId?: string | null;
}

export class SubmissionRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateSubmissionInput,
  ) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
    });

    if (!opportunity) {
      throw new Error(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    return this.db.submission.create({
      data: {
        opportunityId,
        submittedAt: input.submittedAt,
        method: input.method ?? null,
        notes: input.notes ?? null,
        cvArtefactId: input.cvArtefactId ?? null,
        coverLetterArtefactId: input.coverLetterArtefactId ?? null,
      },
    });
  }

  async getByOpportunityId(ownerId: string, opportunityId: string) {
    return this.db.submission.findFirst({
      where: {
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
    });
  }
}
