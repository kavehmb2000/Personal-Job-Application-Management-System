import { NextResponse } from "next/server";
import { z } from "zod";

import {
    CurrentOwnerError,
    getCurrentOwner,
} from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { CommunicationRepository } from "@/lib/repositories/communication-repository";
import {
    CommunicationService,
    type CreateCommunicationInput,
} from "@/lib/services/communication-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const opportunityIdSchema = z.string().uuid();

const createCommunicationSchema = z.object({
    occurredAt: z.coerce.date(),
    contact: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    bodyMarkdown: z.string().nullable().optional(),
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
    return new CommunicationService(
        new CommunicationRepository(prisma),
    );
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId } = await context.params;
        const id = opportunityIdSchema.parse(opportunityId);

        const owner = await getOwner();
        const service = createService();

        const communications = await service.list(owner.id, id);

        return NextResponse.json(communications);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function POST(
    request: Request,
    context: RouteContext,
) {
    try {
        const { opportunityId } = await context.params;
        const id = opportunityIdSchema.parse(opportunityId);

        const owner = await getOwner();

        const input = await validateJsonRequest(
            createCommunicationSchema,
            request,
        );

        const service = createService();

        const communication = await service.create(
            owner.id,
            id,
            input satisfies CreateCommunicationInput,
        );

        return NextResponse.json(communication, {
            status: 201,
        });
    } catch (error) {
        return errorToResponse(error);
    }
}