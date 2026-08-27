import {
  UserActionRepository,
  type CreateUserActionInput,
  type UpdateUserActionInput,
} from "@/lib/repositories/user-action-repository";

export class UserActionService {
  constructor(private readonly repository: UserActionRepository) {}

  async create(
      ownerId: string,
      opportunityId: string,
      input: CreateUserActionInput,
  ) {
    return this.repository.create(ownerId, opportunityId, input);
  }

  async getById(
      ownerId: string,
      opportunityId: string,
      actionId: string,
  ) {
    return this.repository.getById(ownerId, opportunityId, actionId);
  }

  async update(
      ownerId: string,
      opportunityId: string,
      actionId: string,
      expectedVersion: number,
      input: UpdateUserActionInput,
  ) {
    return this.repository.update(
        ownerId,
        opportunityId,
        actionId,
        expectedVersion,
        input,
    );
  }

  async listForOpportunity(ownerId: string, opportunityId: string) {
    return this.repository.listForOpportunity(ownerId, opportunityId);
  }

  async delete(
      ownerId: string,
      opportunityId: string,
      actionId: string,
      expectedVersion: number,
  ) {
    return this.repository.delete(
        ownerId,
        opportunityId,
        actionId,
        expectedVersion,
    );
  }
}