import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";
import { ArtefactType } from "@prisma/client";

const createArtefactSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ArtefactType),
  description: z.string().nullable().optional(),
  contentMarkdown: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
  storageProvider: z.string().nullable().optional(),
  storageReference: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

const artefactService = new ArtefactService(new ArtefactRepository());

export async function GET(request: Request) {
  try {
    const owner = await getCurrentOwner();
    const { searchParams } = new URL(request.url);

    const typeParam = searchParams.get("type");
    const includeArchivedParam = searchParams.get("includeArchived");

    const type = typeParam ? z.enum(ArtefactType).parse(typeParam) : undefined;

    const includeArchived = includeArchivedParam === "true";

    const artefacts = await artefactService.list(owner.id, {
      type,
      includeArchived,
    });

    return NextResponse.json(artefacts);
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return errorToResponse(new UnauthorizedError(error.message));
    }

    return errorToResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await getCurrentOwner();

    const input = await validateJsonRequest(createArtefactSchema, request);

    const artefact = await artefactService.create(owner.id, input);

    return NextResponse.json(artefact, { status: 201 });
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return errorToResponse(new UnauthorizedError(error.message));
    }

    return errorToResponse(error);
  }
}
