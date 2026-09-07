import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "@/lib/repositories/opportunity-repository";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import { AuditEventType, type LifecycleStateKey } from "@prisma/client";
import { recordAuditEvent } from "@/lib/services/audit-service";

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
    const opportunity = await this.repository.archive(
      ownerId,
      opportunityId,
      expectedVersion,
    );

    await recordAuditEvent({
      ownerId,
      type: AuditEventType.ARCHIVE,
      targetType: "Opportunity",
      targetId: opportunityId,
    });

    return opportunity;
  }

  async restore(
    ownerId: string,
    opportunityId: string,
    expectedVersion: number,
  ) {
    const opportunity = await this.repository.restore(
      ownerId,
      opportunityId,
      expectedVersion,
    );

    await recordAuditEvent({
      ownerId,
      type: AuditEventType.RESTORE,
      targetType: "Opportunity",
      targetId: opportunityId,
    });

    return opportunity;
  }
}
