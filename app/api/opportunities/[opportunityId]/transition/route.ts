import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import {
  UnauthorizedError,
  ValidationError,
  errorToResponse,
} from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { LifecycleService } from "@/lib/services/lifecycle-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";
import {getExpectedVersion} from "@/lib/http/if-match";

const opportunityIdSchema = z.string().uuid();

const transitionSchema = z.object({
  toStatus: z.enum([
    "DISCOVERED",
    "SUBMITTED",
    "IN_PROGRESS",
    "OFFER",
    "CLOSED",
    "CANCELLED",
    "REJECTED",
  ]),
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

    const input = await validateJsonRequest(transitionSchema, request);

    const service = new LifecycleService(prisma);

    const opportunity = await service.transition(
      owner.id,
      id,
      input.toStatus,
      {},
      expectedVersion,
    );

    return NextResponse.json(opportunity, {
      headers: {
        ETag: `"${opportunity.version}"`,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
