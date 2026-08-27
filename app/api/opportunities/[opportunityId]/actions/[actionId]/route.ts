import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
    UserActionPriority,
    UserActionStatus,
} from "@prisma/client";
import { z } from "zod";

import {
    CurrentOwnerError,
    getCurrentOwner,
} from "@/lib/auth/current-owner";
import {
    UnauthorizedError,
    errorToResponse,
} from "@/lib/domain/errors";
import { UserActionRepository } from "@/lib/repositories/user-action-repository";
import { UserActionService } from "@/lib/services/user-action-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";
import {getExpectedVersion} from "@/lib/http/if-match";

const uuidSchema = z.string().uuid();

const updateActionSchema = z.object({
    title: z.string().min(1).optional(),
    descriptionMarkdown: z.string().nullable().optional(),
    status: z.enum(UserActionStatus).optional(),
    priority: z.enum(UserActionPriority).optional(),
    dueAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
});

type RouteContext = {
    params: Promise<{
        opportunityId: string;
        actionId: string;
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

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, actionId } = await context.params;

        const owner = await getOwner();

        const service = new UserActionService(
            new UserActionRepository(prisma),
        );

        const action = await service.getById(
            owner.id,
            uuidSchema.parse(opportunityId),
            uuidSchema.parse(actionId),
        );

        if (!action) {
            return NextResponse.json(
                {
                    error: {
                        code: "NOT_FOUND",
                        message: "User action not found",
                    },
                },
                { status: 404 },
            );
        }

        return NextResponse.json(action);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, actionId } = await context.params;

        const owner = await getOwner();

        const input = await validateJsonRequest(
            updateActionSchema,
            request,
        );

        const service = new UserActionService(
            new UserActionRepository(prisma),
        );
        const expectedVersion = getExpectedVersion(request);

        const action = await service.update(
            owner.id,
            opportunityId,
            actionId,
            expectedVersion,
            input,
        );

        return NextResponse.json(action);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function DELETE(
    request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId, actionId } = await context.params;

        const id = uuidSchema.parse(opportunityId);
        const actionIdValue = uuidSchema.parse(actionId);

        const owner = await getOwner();

        const expectedVersion = getExpectedVersion(request);

        const service = new UserActionService(
            new UserActionRepository(prisma),
        );

        await service.delete(
            owner.id,
            id,
            actionIdValue,
            expectedVersion,
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return errorToResponse(error);
    }
}