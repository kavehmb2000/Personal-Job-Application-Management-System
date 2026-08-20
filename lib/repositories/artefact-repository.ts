import type { Artefact, ArtefactType, PrismaClient, StorageProvider } from "@prisma/client";
import { prisma } from "@/lib/db";

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
    constructor(
        private readonly db: PrismaClient = prisma,
    ) {}

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
                    (input.storageProvider as StorageProvider | undefined) ??
                    null,
                storageReference: input.storageReference ?? null,
                mimeType: input.mimeType ?? null,
            },
        });
    }

    async getById(
        ownerId: string,
        artefactId: string,
    ): Promise<Artefact | null> {
        return this.db.artefact.findFirst({
            where: {
                id: artefactId,
                ownerId,
            },
        });
    }

    async archive(
        ownerId: string,
        artefactId: string,
    ): Promise<Artefact> {
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
            throw new Error(
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
            throw new Error(
                `Artefact ${artefactId} was not found after archive`,
            );
        }

        return artefact;
    }
}