import type { Prisma } from "@prisma/client";

export function ownerAccountWhere(
  ownerId: string,
): Prisma.OwnerAccountWhereUniqueInput {
  return {
    id: ownerId,
  };
}

export function opportunityOwnerWhere(
  ownerId: string,
): Prisma.OpportunityWhereInput {
  return {
    ownerId,
  };
}

export function artefactOwnerWhere(ownerId: string): Prisma.ArtefactWhereInput {
  return {
    ownerId,
  };
}

export function contactOwnerWhere(ownerId: string): Prisma.ContactWhereInput {
  return {
    ownerId,
  };
}

export function roleFamilyOwnerWhere(
  ownerId: string,
): Prisma.RoleFamilyWhereInput {
  return {
    ownerId,
  };
}

export function lifecycleStatusOwnerWhere(
  ownerId: string,
): Prisma.LifecycleStatusWhereInput {
  return {
    ownerId,
  };
}
