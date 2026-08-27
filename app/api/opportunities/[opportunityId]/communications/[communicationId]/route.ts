import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { CommunicationRepository } from "@/lib/repositories/communication-repository";
import {
  CommunicationService,
  type UpdateCommunicationInput,
} from "@/lib/services/communication-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const idSchema = z.string().uuid();

const updateCommunicationSchema = z.object({
  occurredAt: z.coerce.date().optional(),
  contact: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  bodyMarkdown: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    opportunityId: string;
    communicationId: string;
  }>;
};

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

function createService() {
  return new CommunicationService(new CommunicationRepository(prisma));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, communicationId } = await context.params;

    const opportunityIdValue = idSchema.parse(opportunityId);
    const communicationIdValue = idSchema.parse(communicationId);

    const owner = await getOwner();
    const service = createService();

    const communication = await service.getById(
      owner.id,
      opportunityIdValue,
      communicationIdValue,
    );

    if (!communication) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Communication not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(communication);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { opportunityId, communicationId } = await context.params;

    const opportunityIdValue = idSchema.parse(opportunityId);
    const communicationIdValue = idSchema.parse(communicationId);

    const owner = await getOwner();

    const input = await validateJsonRequest(updateCommunicationSchema, request);

    const service = createService();

    const communication = await service.update(
      owner.id,
      opportunityIdValue,
      communicationIdValue,
      input satisfies UpdateCommunicationInput,
    );

    return NextResponse.json(communication);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, communicationId } = await context.params;

    const opportunityIdValue = idSchema.parse(opportunityId);
    const communicationIdValue = idSchema.parse(communicationId);

    const owner = await getOwner();
    const service = createService();

    await service.delete(owner.id, opportunityIdValue, communicationIdValue);

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
