import type { Prisma, PrismaClient } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/domain/errors";
import { opportunityOwnerWhere } from "@/lib/repositories/owner-scope";
export type CreateUserActionInput = {
  title: string;
  descriptionMarkdown?: string | null;
  status?: Prisma.UserActionCreateInput["status"];
  priority?: Prisma.UserActionCreateInput["priority"];
  dueAt?: Date | null;
  completedAt?: Date | null;
};

export type UpdateUserActionInput = {
  title?: string;
  descriptionMarkdown?: string | null;
  status?: Prisma.UserActionUpdateInput["status"];
  priority?: Prisma.UserActionUpdateInput["priority"];
  dueAt?: Date | null;
  completedAt?: Date | null;
};

export class UserActionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateUserActionInput,
  ) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        ...opportunityOwnerWhere(ownerId),
      },
      select: { id: true },
    });
    if (!opportunity) {
      throw new NotFoundError(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }
    return this.prisma.userAction.create({
      data: {
        opportunityId,
        title: input.title,
        descriptionMarkdown: input.descriptionMarkdown ?? null,
        status: input.status ?? "TODO",
        priority: input.priority ?? "NORMAL",
        dueAt: input.dueAt ?? null,
        completedAt: input.completedAt ?? null,
      },
    });
  }

  async getById(ownerId: string, opportunityId: string, actionId: string) {
    return this.prisma.userAction.findFirst({
      where: {
        id: actionId,
        opportunityId,
        opportunity: { ...opportunityOwnerWhere(ownerId) },
      },
    });
  }

  async update(
    ownerId: string,
    opportunityId: string,
    actionId: string,
    expectedVersion: number,
    input: UpdateUserActionInput,
  ) {
    const existing = await this.prisma.userAction.findFirst({
      where: {
        id: actionId,
        opportunityId,
        opportunity: { ...opportunityOwnerWhere(ownerId) },
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (!existing) {
      throw new NotFoundError(
        `UserAction ${actionId} was not found in owner scope`,
      );
    }

    const updateResult = await this.prisma.userAction.updateMany({
      where: {
        id: actionId,
        opportunityId,
        version: expectedVersion,
        opportunity: { ...opportunityOwnerWhere(ownerId) },
      },
      data: {
        ...input,
        version: {
          increment: 1,
        },
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictError(
        `UserAction could not be modified with expected version ${expectedVersion}`,
      );
    }

    return this.prisma.userAction.findFirstOrThrow({
      where: {
        id: actionId,
        opportunityId,
        opportunity: { ...opportunityOwnerWhere(ownerId) },
      },
    });
  }

  async listForOpportunity(ownerId: string, opportunityId: string) {
    return this.prisma.userAction.findMany({
      where: {
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
      orderBy: [
        {
          dueAt: "asc",
        },
        {
          id: "asc",
        },
      ],
    });
  }

  async delete(
    ownerId: string,
    opportunityId: string,
    actionId: string,
    expectedVersion: number,
  ) {
    const result = await this.prisma.userAction.deleteMany({
      where: {
        id: actionId,
        opportunityId,
        version: expectedVersion,
        opportunity: {
          ownerId,
        },
      },
    });

    if (result.count !== 1) {
      throw new Error(
        `UserAction ${actionId} could not be deleted with expected version ${expectedVersion}`,
      );
    }
  }
}
