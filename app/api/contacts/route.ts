import { NextResponse } from "next/server";
import { z } from "zod";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { UnauthorizedError, errorToResponse } from "@/lib/domain/errors";
import { prisma } from "@/lib/db";
import { ContactRepository } from "@/lib/repositories/contact-repository";
import { ContactService } from "@/lib/services/contact-service";
import { validateJsonRequest } from "@/lib/validation/request-validation";

const contactRoleTypeSchema = z.enum([
  "RECRUITER",
  "HIRING_MANAGER",
  "INTERVIEWER",
  "REFERRAL",
  "HR",
  "OTHER",
]);

const createContactSchema = z.object({
  name: z.string().min(1),
  roleType: contactRoleTypeSchema.nullable().optional(),
  organization: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  profileUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<Record<string, never>>;
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

export async function POST(request: Request, _context: RouteContext) {
  try {
    const owner = await getOwner();

    const input = await validateJsonRequest(createContactSchema, request);

    const contact = await createService().create(owner.id, input);

    return NextResponse.json(contact, {
      status: 201,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
