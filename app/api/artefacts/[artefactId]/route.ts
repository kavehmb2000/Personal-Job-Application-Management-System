import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";

const artefactIdSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { artefactId } = await context.params;
    const id = artefactIdSchema.parse(artefactId);
    const owner = await getOwner();

    const service = new ArtefactService(new ArtefactRepository());
    const artefact = await service.getById(owner.id, id);

    if (!artefact) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Artefact not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(artefact);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { artefactId } = await context.params;
    const id = artefactIdSchema.parse(artefactId);
    const owner = await getOwner();

    const service = new ArtefactService(new ArtefactRepository());
    await service.archive(owner.id, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorToResponse(error);
  }
}
