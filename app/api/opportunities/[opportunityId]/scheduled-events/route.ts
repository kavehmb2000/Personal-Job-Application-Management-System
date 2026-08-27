import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";
import { ScheduledEventService } from "@/lib/services/scheduled-event-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const uuidSchema = z.string().uuid();

const scheduledEventSchema = z.object({
  type: z.enum([
    "INTERVIEW",
    "RECRUITER_CALL",
    "PRESENTATION",
    "CHALLENGE_DEADLINE",
    "FOLLOW_UP",
    "OTHER",
  ]),
  title: z.string().min(1),
  scheduledAt: z.coerce.date(),
  endAt: z.coerce.date().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  meetingUrl: z.string().url().nullable().optional(),
  notesMarkdown: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ opportunityId: string }>;
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
    const owner = await getOwner();

    const input = await validateJsonRequest(scheduledEventSchema, request);

    const service = new ScheduledEventService(
      new ScheduledEventRepository(prisma),
    );

    const event = await service.create(
      owner.id,
      uuidSchema.parse(opportunityId),
      input,
    );

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
