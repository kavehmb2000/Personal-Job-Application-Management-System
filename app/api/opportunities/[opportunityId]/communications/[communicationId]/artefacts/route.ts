import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { CommunicationRepository } from "@/lib/repositories/communication-repository";
import { CommunicationService } from "@/lib/services/communication-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const idSchema = z.string().uuid();

const artefactSchema = z.object({
  artefactId: z.string().uuid(),
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

    const artefacts = await service.getArtefacts(
      owner.id,
      opportunityIdValue,
      communicationIdValue,
    );

    return NextResponse.json(artefacts);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId, communicationId } = await context.params;

    const opportunityIdValue = idSchema.parse(opportunityId);
    const communicationIdValue = idSchema.parse(communicationId);

    const owner = await getOwner();

    const input = await validateJsonRequest(artefactSchema, request);

    const service = createService();

    const association = await service.addArtefact(
      owner.id,
      opportunityIdValue,
      communicationIdValue,
      input.artefactId,
    );

    return NextResponse.json(association, {
      status: 201,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { opportunityId, communicationId } = await context.params;

    const opportunityIdValue = idSchema.parse(opportunityId);
    const communicationIdValue = idSchema.parse(communicationId);

    const body = await request.json();
    const input = artefactSchema.parse(body);

    const owner = await getOwner();
    const service = createService();

    await service.removeArtefact(
      owner.id,
      opportunityIdValue,
      communicationIdValue,
      input.artefactId,
    );

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
