import type { PrismaClient } from "@prisma/client";

export type CreateCommunicationInput = {
    occurredAt: Date;
    contact?: string | null;
    subject?: string | null;
    bodyMarkdown?: string | null;
};

export type UpdateCommunicationInput = {
    occurredAt?: Date;
    contact?: string | null;
    subject?: string | null;
    bodyMarkdown?: string | null;
};

export class CommunicationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async create(
        ownerId: string,
        opportunityId: string,
        input: CreateCommunicationInput,
    ) {
        await this.requireOpportunityOwner(ownerId, opportunityId);

        return this.prisma.communication.create({
            data: {
                opportunityId,
                occurredAt: input.occurredAt,
                contact: input.contact ?? null,
                subject: input.subject ?? null,
                bodyMarkdown: input.bodyMarkdown ?? null,
            },
        });
    }

    async getById(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
    ) {
        return this.prisma.communication.findFirst({
            where: {
                id: communicationId,
                opportunityId,
                opportunity: {
                    ownerId,
                },
            },
        });
    }

    async list(
        ownerId: string,
        opportunityId: string,
    ) {
        return this.prisma.communication.findMany({
            where: {
                opportunityId,
                opportunity: {
                    ownerId,
                },
            },
            orderBy: {
                occurredAt: "asc",
            },
        });
    }

    async update(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
        input: UpdateCommunicationInput,
    ) {
        const existing = await this.prisma.communication.findFirst({
            where: {
                id: communicationId,
                opportunityId,
                opportunity: {
                    ownerId,
                },
            },
        });

        if (!existing) {
            throw new Error(
                "Communication could not be found within the owner's Opportunity scope",
            );
        }

        return this.prisma.communication.update({
            where: {
                id: existing.id,
            },
            data: {
                ...(input.occurredAt !== undefined && {
                    occurredAt: input.occurredAt,
                }),
                ...(input.contact !== undefined && {
                    contact: input.contact,
                }),
                ...(input.subject !== undefined && {
                    subject: input.subject,
                }),
                ...(input.bodyMarkdown !== undefined && {
                    bodyMarkdown: input.bodyMarkdown,
                }),
            },
        });
    }

    async delete(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
    ) {
        const existing = await this.prisma.communication.findFirst({
            where: {
                id: communicationId,
                opportunityId,
                opportunity: {
                    ownerId,
                },
            },
        });

        if (!existing) {
            throw new Error(
                "Communication could not be found within the owner's Opportunity scope",
            );
        }

        return this.prisma.communication.delete({
            where: {
                id: existing.id,
            },
        });
    }

    async addArtefact(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
        artefactId: string,
    ) {
        await this.requireCommunicationOwner(
            ownerId,
            opportunityId,
            communicationId,
        );

        await this.requireArtefactOwner(ownerId, artefactId);

        return this.prisma.communicationArtefact.create({
            data: {
                communicationId,
                artefactId,
            },
        });
    }

    async removeArtefact(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
        artefactId: string,
    ) {
        await this.requireCommunicationOwner(
            ownerId,
            opportunityId,
            communicationId,
        );

        const association =
            await this.prisma.communicationArtefact.findFirst({
                where: {
                    communicationId,
                    artefactId,
                },
            });

        if (!association) {
            throw new Error(
                "CommunicationArtefact association could not be found",
            );
        }

        return this.prisma.communicationArtefact.delete({
            where: {
                id: association.id,
            },
        });
    }

    async listArtefacts(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
    ) {
        await this.requireCommunicationOwner(
            ownerId,
            opportunityId,
            communicationId,
        );

        return this.prisma.communicationArtefact.findMany({
            where: {
                communicationId,
            },
            include: {
                artefact: true,
            },
        });
    }

    async getArtefacts(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
    ) {
        await this.requireCommunicationOwner(
            ownerId,
            opportunityId,
            communicationId,
        );

        const links = await this.prisma.communicationArtefact.findMany({
            where: {
                communicationId,
            },
            include: {
                artefact: true,
            },
        });

        return links.map((link) => link.artefact);
    }

    private async requireOpportunityOwner(
        ownerId: string,
        opportunityId: string,
    ) {
        const opportunity = await this.prisma.opportunity.findFirst({
            where: {
                id: opportunityId,
                ownerId,
            },
            select: {
                id: true,
            },
        });

        if (!opportunity) {
            throw new Error(
                "Opportunity could not be found within the owner's scope",
            );
        }

        return opportunity;
    }

    private async requireCommunicationOwner(
        ownerId: string,
        opportunityId: string,
        communicationId: string,
    ) {
        const communication =
            await this.prisma.communication.findFirst({
                where: {
                    id: communicationId,
                    opportunityId,
                    opportunity: {
                        ownerId,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (!communication) {
            throw new Error(
                "Communication could not be found within the owner's Opportunity scope",
            );
        }

        return communication;
    }

    private async requireArtefactOwner(
        ownerId: string,
        artefactId: string,
    ) {
        const artefact = await this.prisma.artefact.findFirst({
            where: {
                id: artefactId,
                ownerId,
            },
            select: {
                id: true,
            },
        });

        if (!artefact) {
            throw new Error(
                "Artefact could not be found within the owner's scope",
            );
        }

        return artefact;
    }
}
