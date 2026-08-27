import { NextResponse } from "next/server";
import { OpportunityEventType } from "@prisma/client";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { OpportunityEventRepository } from "@/lib/repositories/opportunity-event-repository";
import { OpportunityEventService } from "@/lib/services/opportunity-event-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const eventSchema = z.object({
  occurredAt: z.coerce.date(),
  type: z.enum(OpportunityEventType),
  title: z.string().min(1),
  descriptionMarkdown: z.string().nullable().optional(),
  artefactIds: z.array(z.string().uuid()).optional(),
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
    const id = opportunityIdSchema.parse(opportunityId);

    const owner = await getOwner();

    const service = new OpportunityEventService(
      new OpportunityEventRepository(),
    );

    const events = await service.listForOpportunity(owner.id, id);

    return NextResponse.json(events);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);

    const owner = await getOwner();

    const input = await validateJsonRequest(eventSchema, request);

    const service = new OpportunityEventService(
      new OpportunityEventRepository(),
    );

    const event = await service.create(owner.id, id, input);

    return NextResponse.json(event, {
      status: 201,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
