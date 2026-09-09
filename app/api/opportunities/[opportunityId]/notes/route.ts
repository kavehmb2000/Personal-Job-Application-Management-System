import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { OpportunityNoteRepository } from "@/lib/repositories/opportunity-note-repository";
import { OpportunityNoteService } from "@/lib/services/opportunity-note-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const createNoteSchema = z.object({
  title: z.string().nullable().optional(),
  bodyMarkdown: z.string().min(1),
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);
    const owner = await getOwner();

    const input = await validateJsonRequest(createNoteSchema, request);

    const service = new OpportunityNoteService(new OpportunityNoteRepository());

    const note = await service.create(owner.id, id, input);

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
