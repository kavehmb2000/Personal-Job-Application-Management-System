import type { CreateOpportunityEventInput } from "@/lib/repositories/opportunity-event-repository";
import { OpportunityEventRepository } from "@/lib/repositories/opportunity-event-repository";

export class OpportunityEventService {
  constructor(private readonly repository: OpportunityEventRepository) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateOpportunityEventInput,
  ) {
    return this.repository.create(ownerId, opportunityId, input);
  }

  async getById(ownerId: string, opportunityId: string, eventId: string) {
    return this.repository.getById(ownerId, opportunityId, eventId);
  }

  async listForOpportunity(ownerId: string, opportunityId: string) {
    return this.repository.listForOpportunity(ownerId, opportunityId);
  }
}
