import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "@/lib/repositories/opportunity-repository";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";

export class OpportunityService {
  constructor(private readonly repository: OpportunityRepository) {}

  async create(ownerId: string, input: CreateOpportunityInput) {
    return this.repository.create(ownerId, input);
  }

  async list(ownerId: string) {
    return this.repository.list(ownerId);
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
