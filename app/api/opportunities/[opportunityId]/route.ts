import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import {
  UnauthorizedError,
  ValidationError,
  errorToResponse,
} from "@/lib/domain/errors";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import { OpportunityService } from "@/lib/services/opportunity-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";
import { getExpectedVersion } from "@/lib/http/if-match";

const opportunityIdSchema = z.string().uuid();

const updateOpportunitySchema = z.object({
  companyName: z.string().min(1).optional(),
  positionTitle: z.string().min(1).optional(),
  jobUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  fitScore: z.number().nullable().optional(),
  discoveredAt: z.coerce.date().optional(),
  roleFamilyId: z.string().uuid().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDueAt: z.coerce.date().nullable().optional(),
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const repository = new OpportunityRepository();
    const opportunity = await repository.getById(owner.id, id);

    if (!opportunity) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const expectedVersion = getExpectedVersion(request);
    const input = await validateJsonRequest(updateOpportunitySchema, request);

    const service = new OpportunityService(new OpportunityRepository());

    const opportunity = await service.update(
      owner.id,
      id,
      expectedVersion,
      input,
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const expectedVersion = getExpectedVersion(request);

    const service = new OpportunityService(new OpportunityRepository());

    await service.archive(owner.id, id, expectedVersion);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorToResponse(error);
  }
}
