import { UserActionRepository } from "@/lib/repositories/user-action-repository";

export interface CreateUserActionInput {
    title: string;
    descriptionMarkdown?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    priority?: "LOW" | "NORMAL" | "HIGH";
    dueAt?: Date | null;
    completedAt?: Date | null;
}

export interface UpdateUserActionInput {
    title?: string;
    descriptionMarkdown?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    priority?: "LOW" | "NORMAL" | "HIGH";
    dueAt?: Date | null;
    completedAt?: Date | null;
}

export class UserActionService {
    constructor(
        private readonly repository: UserActionRepository,
    ) {}

    async create(
        ownerId: string,
        opportunityId: string,
        input: CreateUserActionInput,
    ) {
        return this.repository.create(
            ownerId,
            opportunityId,
            input,
        );
    }

    async getById(
        ownerId: string,
        opportunityId: string,
        actionId: string,
    ) {
        return this.repository.getById(
            ownerId,
            opportunityId,
            actionId,
        );
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
}