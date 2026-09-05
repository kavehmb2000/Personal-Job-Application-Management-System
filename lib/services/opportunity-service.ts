import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "@/lib/repositories/opportunity-repository";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import type { LifecycleStateKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/domain/errors";

export class OpportunityService {
  constructor(private readonly repository: OpportunityRepository) {}

  async create(ownerId: string, input: CreateOpportunityInput) {
    return this.repository.create(ownerId, input);
  }

  async list(
    ownerId: string,
    filters?: {
      search?: string;
      roleFamilyId?: string;
      country?: string;
      location?: string;
      status?: LifecycleStateKey;
      source?: string;
    },
  ) {
    return this.repository.list(ownerId, filters);
  }

  async update(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
    input: UpdateOpportunityInput,
  ) {
    return this.repository.update(
      ownerId,
      opportunityId,
      expectedVersion,
      input,
    );
  }

  async archive(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
  ) {
    return this.repository.archive(ownerId, opportunityId, expectedVersion);
  }

  async restore(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
  ) {
    return this.repository.restore(ownerId, opportunityId, expectedVersion);
  }
}
