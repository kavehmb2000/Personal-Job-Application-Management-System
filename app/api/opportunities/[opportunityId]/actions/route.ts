import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserActionPriority, UserActionStatus } from "@prisma/client";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { UserActionRepository } from "@/lib/repositories/user-action-repository";
import { UserActionService } from "@/lib/services/user-action-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const createActionSchema = z.object({
  title: z.string().min(1),
  descriptionMarkdown: z.string().nullable().optional(),
  status: z.enum(UserActionStatus).optional(),
  priority: z.enum(UserActionPriority).optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

async function getOwner() {
  try {
    return await getCurrentOwner();
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      throw new UnauthorizedError(error.message);
    }

    throw error;
  }
}

type RouteContext = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const service = new UserActionService(new UserActionRepository(prisma));

    const actions = await service.listForOpportunity(owner.id, id);

    return NextResponse.json(actions);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const input = await validateJsonRequest(createActionSchema, request);

    const service = new UserActionService(new UserActionRepository(prisma));

    const action = await service.create(owner.id, id, input);

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
