import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ContactService } from "@/lib/services/contact-service";

const opportunityIdSchema = z.string().uuid();
const contactIdSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{
    opportunityId: string;
    contactId: string;
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, contactId } = await context.params;

    const id = opportunityIdSchema.parse(opportunityId);
    const contact = contactIdSchema.parse(contactId);

    const owner = await getOwner();

    await createService().removeFromOpportunity(owner.id, id, contact);

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
