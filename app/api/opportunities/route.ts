import { NextResponse } from "next/server";
import { z } from "zod";
import type { LifecycleStateKey } from "@prisma/client";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import { OpportunityService } from "@/lib/services/opportunity-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const createOpportunitySchema = z.object({
  companyName: z.string().min(1),
  positionTitle: z.string().min(1),
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

const opportunityService = new OpportunityService(new OpportunityRepository());

export async function GET(request: Request) {
  try {
    const owner = await getCurrentOwner();
    const repository = new OpportunityRepository();
    const service = new OpportunityService(repository);

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || undefined;
    const roleFamilyId = searchParams.get("roleFamilyId")?.trim() || undefined;
    const country = searchParams.get("country")?.trim() || undefined;
    const location = searchParams.get("location")?.trim() || undefined;
    const status = searchParams.get("status")?.trim() || undefined;
    const source = searchParams.get("source")?.trim() || undefined;

    const opportunities = await service.list(owner.id, {
      search,
      roleFamilyId,
      country,
      location,
      status: status as LifecycleStateKey | undefined,
      source,
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: error.message,
          },
        },
        { status: 401 },
      );
    }

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const owner = await getCurrentOwner();

    const input = await validateJsonRequest(createOpportunitySchema, request);

    const opportunity = await opportunityService.create(owner.id, input);

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return errorToResponse(new UnauthorizedError(error.message));
    }

    return errorToResponse(error);
  }
}
