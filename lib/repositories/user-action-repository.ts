import type { Prisma, PrismaClient } from "@prisma/client";

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
        ownerId,
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
        opportunity: {
          ownerId,
        },
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
        opportunity: {
          ownerId,
        },
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (!existing) {
      throw new Error(`UserAction ${actionId} was not found in owner scope`);
    }

    const updateResult = await this.prisma.userAction.updateMany({
      where: {
        id: actionId,
        opportunityId,
        version: expectedVersion,
        opportunity: {
          ownerId,
        },
      },
      data: {
        ...input,
        version: {
          increment: 1,
        },
      },
    });

    if (updateResult.count !== 1) {
      throw new Error(
        `UserAction could not be modified with expected version ${expectedVersion}`,
      );
    }

    return this.prisma.userAction.findFirstOrThrow({
      where: {
        id: actionId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
    });
  }
}
