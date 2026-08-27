import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import {
  UnauthorizedError,
  ValidationError,
  errorToResponse,
} from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { SubmissionRepository } from "@/lib/repositories/submission-repository";
import { SubmissionService } from "@/lib/services/submission-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";
import {getExpectedVersion} from "@/lib/http/if-match";

const opportunityIdSchema = z.string().uuid();

const submissionSchema = z.object({
  submittedAt: z.coerce.date(),
  method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  cvArtefactId: z.string().uuid().nullable().optional(),
  coverLetterArtefactId: z.string().uuid().nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    opportunityId: string;
  }>;
};

function parseIfMatch(request: Request): number {
  const value = request.headers.get("If-Match");

  if (!value) {
    throw new ValidationError("If-Match header is required");
  }

  const version = Number(value.replace(/^"|"$/g, ""));

  if (!Number.isInteger(version) || version < 1) {
    throw new ValidationError("If-Match must contain a valid version");
  }

  return version;
}

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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);

    const owner = await getOwner();
    const expectedVersion = getExpectedVersion(request);

    const input = await validateJsonRequest(submissionSchema, request);

    const service = new SubmissionService(new SubmissionRepository(prisma));

    const result = await service.submit(owner.id, id, expectedVersion, input);

    return NextResponse.json(result, {
      status: 201,
      headers: {
        ETag: `"${result.opportunity.version}"`,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
