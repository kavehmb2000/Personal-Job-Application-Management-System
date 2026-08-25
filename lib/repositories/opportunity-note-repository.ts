import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { opportunityOwnerWhere } from "@/lib/repositories/owner-scope";

export type CreateOpportunityNoteInput = {
  title?: string | null;
  bodyMarkdown: string;
};

export type UpdateOpportunityNoteInput = {
  title?: string | null;
  bodyMarkdown?: string;
};

export class OpportunityNoteRepository {
  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateOpportunityNoteInput,
  ) {
    await this.getOpportunityOrThrow(ownerId, opportunityId);

    return prisma.opportunityNote.create({
      data: {
        opportunityId,
        title: input.title ?? null,
        bodyMarkdown: input.bodyMarkdown,
      },
    });
  }

  async getById(ownerId: string, opportunityId: string, noteId: string) {
    return prisma.opportunityNote.findFirst({
      where: {
        id: noteId,
        opportunityId,
        opportunity: opportunityOwnerWhere(ownerId),
      },
    });
  }

  async update(
    ownerId: string,
    opportunityId: string,
    noteId: string,
    input: UpdateOpportunityNoteInput,
  ) {
    const existing = await this.getById(ownerId, opportunityId, noteId);

    if (!existing) {
      throw new Error(
        `Opportunity note ${noteId} was not found in owner scope`,
      );
    }

    const data: Prisma.OpportunityNoteUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.bodyMarkdown !== undefined
        ? { bodyMarkdown: input.bodyMarkdown }
        : {}),
    };

    return prisma.opportunityNote.update({
      where: {
        id: existing.id,
      },
      data,
    });
  }

  private async getOpportunityOrThrow(ownerId: string, opportunityId: string) {
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        ...opportunityOwnerWhere(ownerId),
      },
      select: {
        id: true,
      },
    });

    if (!opportunity) {
      throw new Error(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    return opportunity;
  }
}
