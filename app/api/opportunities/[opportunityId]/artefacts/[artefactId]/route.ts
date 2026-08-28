import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import { validateRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();
const artefactIdSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{
    opportunityId: string;
    artefactId: string;
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, artefactId } = await context.params;

    const opportunityIdValue = validateRequest(
      opportunityIdSchema,
      opportunityId,
    );

    const artefactIdValue = validateRequest(artefactIdSchema, artefactId);

    const owner = await getOwner();

    const service = new ArtefactService(new ArtefactRepository());

    await service.removeFromOpportunity(
      owner.id,
      opportunityIdValue,
      artefactIdValue,
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorToResponse(error);
  }
}
