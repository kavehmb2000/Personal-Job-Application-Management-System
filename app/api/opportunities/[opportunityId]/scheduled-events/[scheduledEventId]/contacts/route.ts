import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentOwner, CurrentOwnerError } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  errorToResponse,
  ForbiddenError,
} from "@/lib/domain/errors";
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";
import { ContactService } from "@/lib/services/contact-service";
import { ScheduledEventService } from "@/lib/services/scheduled-event-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const uuidSchema = z.string().uuid();

const associationSchema = z.object({
  contactId: uuidSchema,
});

type RouteContext = {
  params: Promise<{
    opportunityId: string;
    scheduledEventId: string;
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

function getScheduledEventService() {
  return new ScheduledEventService(new ScheduledEventRepository(prisma));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, scheduledEventId } = await context.params;

    uuidSchema.parse(opportunityId);
    uuidSchema.parse(scheduledEventId);

    const owner = await getOwner();

    const service = getScheduledEventService();

    const scheduledEvent = await service.getById(
      owner.id,
      opportunityId,
      scheduledEventId,
    );

    if (!scheduledEvent) {
      throw new NotFoundError(
        `ScheduledEvent ${scheduledEventId} was not found`,
      );
    }

    const contacts = await service.getContacts(
      owner.id,
      opportunityId,
      scheduledEventId,
    );

    return NextResponse.json(contacts);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { opportunityId, scheduledEventId } = await context.params;

    uuidSchema.parse(opportunityId);
    uuidSchema.parse(scheduledEventId);

    const owner = await getOwner();

    const input = await validateJsonRequest(associationSchema, request);

    const service = getScheduledEventService();

    const scheduledEvent = await service.getById(
      owner.id,
      opportunityId,
      scheduledEventId,
    );

    if (!scheduledEvent) {
      throw new NotFoundError(
        `ScheduledEvent ${scheduledEventId} was not found`,
      );
    }

    const contact = await prisma.contact.findUnique({
      where: {
        id: input.contactId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!contact) {
      throw new NotFoundError(`Contact ${input.contactId} was not found`);
    }

    if (contact.ownerId !== owner.id) {
      throw new ForbiddenError(
        `Contact ${input.contactId} does not belong to the current owner`,
      );
    }

    const association = await service.addContact(
      owner.id,
      opportunityId,
      scheduledEventId,
      input.contactId,
    );

    return NextResponse.json(association, {
      status: 201,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
