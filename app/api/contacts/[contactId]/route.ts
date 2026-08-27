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
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ContactService } from "@/lib/services/contact-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const contactIdSchema = z.string().uuid();

const contactRoleTypeSchema = z.enum([
    "RECRUITER",
    "HIRING_MANAGER",
    "INTERVIEWER",
    "REFERRAL",
    "HR",
    "OTHER",
]);

const updateContactSchema = z.object({
    name: z.string().min(1).optional(),
    roleType: contactRoleTypeSchema.nullable().optional(),
    organization: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    profileUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

type RouteContext = {
    params: Promise<{
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

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { contactId } = await context.params;
        const id = contactIdSchema.parse(contactId);

        const owner = await getOwner();

        const contact = await createService().getById(
            owner.id,
            id,
        );

        if (!contact) {
            return NextResponse.json(
                {
                    error: {
                        code: "NOT_FOUND",
                        message: "Contact not found",
                    },
                },
                { status: 404 },
            );
        }

        return NextResponse.json(contact);
    } catch (error) {
        return errorToResponse(error);
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        const { contactId } = await context.params;
        const id = contactIdSchema.parse(contactId);

        const owner = await getOwner();

        const input = await validateJsonRequest(
            updateContactSchema,
            request,
        );

        const contact = await createService().update(
            owner.id,
            id,
            input,
        );

        return NextResponse.json(contact);
    } catch (error) {
        return errorToResponse(error);
    }
}