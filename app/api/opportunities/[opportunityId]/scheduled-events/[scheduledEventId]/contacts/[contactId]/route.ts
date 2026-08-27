import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  errorToResponse,
} from "@/lib/domain/errors";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";
import { ScheduledEventService } from "@/lib/services/scheduled-event-service";

const uuidSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{
    opportunityId: string;
    scheduledEventId: string;
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

function getScheduledEventService() {
  return new ScheduledEventService(new ScheduledEventRepository(prisma));
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { opportunityId, scheduledEventId, contactId } = await context.params;

    if (!uuidSchema.safeParse(opportunityId).success) {
      throw new BadRequestError("Invalid opportunityId");
    }

    if (!uuidSchema.safeParse(scheduledEventId).success) {
      throw new BadRequestError("Invalid scheduledEventId");
    }

    if (!uuidSchema.safeParse(contactId).success) {
      throw new BadRequestError("Invalid contactId");
    }

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

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId: owner.id,
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      throw new NotFoundError(`Contact ${contactId} was not found`);
    }

    await service.removeContact(
      owner.id,
      opportunityId,
      scheduledEventId,
      contactId,
    );

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
