import type {
  Artefact,
  ArtefactType,
  PrismaClient,
  StorageProvider,
} from "@prisma/client";
import { prisma } from "@/lib/db";

import { ForbiddenError, NotFoundError } from "@/lib/domain/errors";

export interface CreateArtefactRepositoryInput {
  name: string;
  type: string;
  description?: string | null;
  contentMarkdown?: string | null;
  externalUrl?: string | null;
  storageProvider?: string | null;
  storageReference?: string | null;
  mimeType?: string | null;
}

export class ArtefactRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    ownerId: string,
    input: CreateArtefactRepositoryInput,
  ): Promise<Artefact> {
    if (
      !input.contentMarkdown &&
      !input.externalUrl &&
      !input.storageReference
    ) {
      throw new Error(
        "Artefact requires contentMarkdown, externalUrl, or storageReference",
      );
    }

    return this.db.artefact.create({
      data: {
        ownerId,
        name: input.name,
        type: input.type as ArtefactType,
        description: input.description ?? null,
        contentMarkdown: input.contentMarkdown ?? null,
        externalUrl: input.externalUrl ?? null,
        storageProvider:
          (input.storageProvider as StorageProvider | undefined) ?? null,
        storageReference: input.storageReference ?? null,
        mimeType: input.mimeType ?? null,
      },
    });
  }

  async getById(ownerId: string, artefactId: string): Promise<Artefact | null> {
    return this.db.artefact.findFirst({
      where: {
        id: artefactId,
        ownerId,
      },
    });
  }

  async archive(ownerId: string, artefactId: string): Promise<Artefact> {
    const result = await this.db.artefact.updateMany({
      where: {
        id: artefactId,
        ownerId,
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      throw new NotFoundError(
        `Artefact ${artefactId} was not found in owner scope or is already archived`,
      );
    }

    const artefact = await this.db.artefact.findFirst({
      where: {
        id: artefactId,
        ownerId,
      },
    });

    if (!artefact) {
      throw new NotFoundError(
        `Artefact ${artefactId} was not found after archive`,
      );
    }
    return artefact;
  }

  async list(
    ownerId: string,
    options?: {
      type?: ArtefactType;
      includeArchived?: boolean;
    },
  ): Promise<Artefact[]> {
    return this.db.artefact.findMany({
      where: {
        ownerId,
        ...(options?.type !== undefined ? { type: options.type } : {}),
        ...(options?.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async addToOpportunity(
    ownerId: string,
    opportunityId: string,
    artefactId: string,
  ) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
      select: { id: true },
    });

    if (!opportunity) {
      throw new NotFoundError(
        "Opportunity could not be found within the owner's scope",
      );
    }

    const artefact = await this.db.artefact.findFirst({
      where: {
        id: artefactId,
        ownerId,
      },
      select: { id: true },
    });

    if (!artefact) {
      throw new ForbiddenError("Artefact does not belong to the current owner");
    }

    return this.db.opportunityArtefact.create({
      data: {
        opportunityId,
        artefactId,
      },
    });
  }

  async removeFromOpportunity(
    ownerId: string,
    opportunityId: string,
    artefactId: string,
  ) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
      select: { id: true },
    });

    if (!opportunity) {
      throw new NotFoundError(
        "Opportunity could not be found within the owner's scope",
      );
    }

    const association = await this.db.opportunityArtefact.findFirst({
      where: {
        opportunityId,
        artefactId,
      },
      include: {
        artefact: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!association) {
      throw new NotFoundError(
        "OpportunityArtefact association could not be found",
      );
    }

    if (association.artefact.ownerId !== ownerId) {
      throw new ForbiddenError("Artefact does not belong to the current owner");
    }

    return this.db.opportunityArtefact.delete({
      where: {
        id: association.id,
      },
    });
  }

  async getForOpportunity(ownerId: string, opportunityId: string) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        ownerId,
      },
      select: { id: true },
    });

    if (!opportunity) {
      throw new NotFoundError(
        "Opportunity could not be found within the owner's scope",
      );
    }

    const links = await this.db.opportunityArtefact.findMany({
      where: {
        opportunityId,
        artefact: {
          ownerId,
        },
      },
      include: {
        artefact: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return links.map((link) => link.artefact);
  }
}
