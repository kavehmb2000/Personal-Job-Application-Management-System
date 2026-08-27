import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ContactService } from "@/lib/services/contact-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const addContactSchema = z.object({
  contactId: z.string().uuid(),
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

function createService() {
  return new ContactService(new ContactRepository(prisma));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);

    const owner = await getOwner();

    const contacts = await createService().getForOpportunity(owner.id, id);

    return NextResponse.json(contacts);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId } = await context.params;
    const id = opportunityIdSchema.parse(opportunityId);

    const owner = await getOwner();

    const input = await validateJsonRequest(addContactSchema, request);

    const association = await createService().addToOpportunity(
      owner.id,
      id,
      input.contactId,
    );

    return NextResponse.json(association, {
      status: 201,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
