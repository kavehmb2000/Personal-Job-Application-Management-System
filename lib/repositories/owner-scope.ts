import type { Prisma } from "@prisma/client";

export function ownerAccountWhere(
  ownerId: string,
): Prisma.OwnerAccountWhereUniqueInput {
  return {
    id: ownerId,
  };
}

export function applicationOwnerWhere(
  ownerId: string,
): Prisma.ApplicationWhereInput {
  return {
    ownerId,
  };
}

export function documentAssetOwnerWhere(
  ownerId: string,
): Prisma.DocumentAssetWhereInput {
  return {
    ownerId,
  };
}

export function cvProfileOwnerWhere(
  ownerId: string,
): Prisma.CVProfileWhereInput {
  return {
    ownerId,
  };
}

export function coverLetterOwnerWhere(
  ownerId: string,
): Prisma.CoverLetterWhereInput {
  return {
    ownerId,
  };
}

export function evidenceItemOwnerWhere(
  ownerId: string,
): Prisma.EvidenceItemWhereInput {
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
