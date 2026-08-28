import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import {
  validateJsonRequest,
  validateRequest,
} from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const addArtefactSchema = z.object({
  artefactId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    opportunityId: string;
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = validateRequest(opportunityIdSchema, opportunityId);
    const owner = await getOwner();

    const service = new ArtefactService(new ArtefactRepository());

    const artefacts = await service.getForOpportunity(owner.id, id);

    return NextResponse.json(artefacts);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = validateRequest(opportunityIdSchema, opportunityId);
    const owner = await getOwner();

    const input = await validateJsonRequest(addArtefactSchema, request);

    const service = new ArtefactService(new ArtefactRepository());

    const result = await service.addToOpportunity(
      owner.id,
      id,
      input.artefactId,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
