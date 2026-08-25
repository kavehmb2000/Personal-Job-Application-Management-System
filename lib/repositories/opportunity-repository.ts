import type { Prisma, Opportunity } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  lifecycleStatusOwnerWhere,
  opportunityOwnerWhere,
} from "@/lib/repositories/owner-scope";

export type CreateOpportunityInput = {
  companyName: string;
  positionTitle: string;
  jobUrl?: string | null;
  location?: string | null;
  country?: string | null;
  source?: string | null;
  fitScore?: number | null;
  discoveredAt?: Date;
  roleFamilyId?: string | null;
  nextAction?: string | null;
  nextActionDueAt?: Date | null;
};

export type UpdateOpportunityInput = {
  companyName?: string;
  positionTitle?: string;
  jobUrl?: string | null;
  location?: string | null;
  country?: string | null;
  source?: string | null;
  fitScore?: number | null;
  discoveredAt?: Date;
  roleFamilyId?: string | null;
  nextAction?: string | null;
  nextActionDueAt?: Date | null;
};

export class OpportunityRepository {
  async create(ownerId: string, input: CreateOpportunityInput) {
    const discoveredStatus = await prisma.lifecycleStatus.findFirst({
      where: {
        ...lifecycleStatusOwnerWhere(ownerId),
        key: "DISCOVERED",
        isActive: true,
      },
    });

    if (!discoveredStatus) {
      throw new Error(
        `Active DISCOVERED lifecycle status not found for owner ${ownerId}`,
      );
    }

    return prisma.opportunity.create({
      data: {
        ownerId,
        companyName: input.companyName,
        positionTitle: input.positionTitle,
        jobUrl: input.jobUrl ?? null,
        location: input.location ?? null,
        country: input.country ?? null,
        source: input.source ?? null,
        fitScore: input.fitScore ?? null,
        discoveredAt: input.discoveredAt ?? new Date(),
        statusId: discoveredStatus.id,
        roleFamilyId: input.roleFamilyId ?? null,
        nextAction: input.nextAction ?? null,
        nextActionDueAt: input.nextActionDueAt ?? null,
      },
      include: {
        status: true,
      },
    });
  }

  async list(ownerId: string) {
    return prisma.opportunity.findMany({
      where: opportunityOwnerWhere(ownerId),
      include: {
        status: true,
      },
      orderBy: {
        discoveredAt: "desc",
      },
    });
  }

  async getById(ownerId: string, opportunityId: string) {
    return prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        ...opportunityOwnerWhere(ownerId),
      },
      include: {
        status: true,
      },
    });
  }

  async update(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
    input: UpdateOpportunityInput,
  ) {
    const data: Prisma.OpportunityUpdateInput = {
      ...input,
      version: {
        increment: 1,
      },
    };

    const result = await prisma.opportunity.updateMany({
      where: {
        id: opportunityId,
        ...opportunityOwnerWhere(ownerId),
        version: expectedVersion,
      },
      data,
    });

    this.assertConcurrencySuccess(result.count, opportunityId, expectedVersion);

    return this.getByIdOrThrow(ownerId, opportunityId);
  }

  async archive(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
  ) {
    const result = await prisma.opportunity.updateMany({
      where: {
        id: opportunityId,
        ...opportunityOwnerWhere(ownerId),
        version: expectedVersion,
      },
      data: {
        archivedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    this.assertConcurrencySuccess(result.count, opportunityId, expectedVersion);

    return this.getByIdOrThrow(ownerId, opportunityId);
  }

  private async getByIdOrThrow(ownerId: string, opportunityId: string) {
    const opportunity = await this.getById(ownerId, opportunityId);

    if (!opportunity) {
      throw new Error(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    return opportunity;
  }

  private assertConcurrencySuccess(
    count: number,
    opportunityId: string,
    expectedVersion: number,
  ): asserts count is 1 {
    if (count !== 1) {
      throw new Error(
        `Opportunity ${opportunityId} could not be modified with expected version ${expectedVersion}`,
      );
    }
  }
}
