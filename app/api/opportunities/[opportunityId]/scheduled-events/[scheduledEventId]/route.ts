import { NextResponse } from "next/server";
import { z } from "zod";

import {
    CurrentOwnerError,
    getCurrentOwner,
} from "@/lib/auth/current-owner";
import {
    UnauthorizedError,
    errorToResponse,
} from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";
import { ScheduledEventService } from "@/lib/services/scheduled-event-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();
const scheduledEventIdSchema = z.string().uuid();

const scheduledEventTypeSchema = z.enum([
    "INTERVIEW",
    "RECRUITER_CALL",
    "PRESENTATION",
    "CHALLENGE_DEADLINE",
    "FOLLOW_UP",
    "OTHER",
]);

const updateScheduledEventSchema = z.object({
    type: scheduledEventTypeSchema.optional(),
    title: z.string().min(1).optional(),
    scheduledAt: z.coerce.date().optional(),
    endAt: z.coerce.date().nullable().optional(),
    timeZone: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    meetingUrl: z.string().nullable().optional(),
    notesMarkdown: z.string().nullable().optional(),
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

function createService() {
    return new ScheduledEventService(
        new ScheduledEventRepository(prisma),
    );
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, scheduledEventId } = await context.params;

        const id = opportunityIdSchema.parse(opportunityId);
        const eventId = scheduledEventIdSchema.parse(scheduledEventId);

        const owner = await getOwner();

        const event = await createService().getById(
            owner.id,
            id,
            eventId,
        );

        if (!event) {
            return NextResponse.json(
                {
                    error: {
                        code: "NOT_FOUND",
                        message: "Scheduled event not found",
                    },
                },
                { status: 404 },
            );
        }

        return NextResponse.json(event);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, scheduledEventId } = await context.params;

        const id = opportunityIdSchema.parse(opportunityId);
        const eventId = scheduledEventIdSchema.parse(scheduledEventId);

        const owner = await getOwner();

        const input = await validateJsonRequest(
            updateScheduledEventSchema,
            request,
        );

        const event = await createService().update(
            owner.id,
            id,
            eventId,
            input,
        );

        return NextResponse.json(event);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, scheduledEventId } = await context.params;

        const id = opportunityIdSchema.parse(opportunityId);
        const eventId = scheduledEventIdSchema.parse(scheduledEventId);

        const owner = await getOwner();

        await createService().delete(
            owner.id,
            id,
            eventId,
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return errorToResponse(error);
    }
}