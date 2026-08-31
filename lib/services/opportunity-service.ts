import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "@/lib/repositories/opportunity-repository";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import type { LifecycleStateKey } from "@prisma/client";

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
}
