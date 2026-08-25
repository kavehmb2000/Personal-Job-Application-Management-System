import { NextResponse } from "next/server";
import { z } from "zod";

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

export async function GET() {
  try {
    const owner = await getCurrentOwner();
    const opportunities = await opportunityService.list(owner.id);

    return NextResponse.json(opportunities);
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
