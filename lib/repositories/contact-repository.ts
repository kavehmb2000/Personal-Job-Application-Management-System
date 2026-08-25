import type { PrismaClient } from "@prisma/client";

import type {
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/services/contact-service";

export class ContactRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(ownerId: string, input: CreateContactInput) {
    return this.db.contact.create({
      data: {
        ownerId,
        name: input.name,
        roleType: input.roleType ?? null,
        organization: input.organization ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        profileUrl: input.profileUrl ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  async getById(ownerId: string, contactId: string) {
    return this.db.contact.findFirst({
      where: {
        id: contactId,
        ownerId,
      },
    });
  }

  async update(ownerId: string, contactId: string, input: UpdateContactInput) {
    const result = await this.db.contact.updateMany({
      where: {
        id: contactId,
        ownerId,
      },
      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),
        ...(input.roleType !== undefined && {
          roleType: input.roleType,
        }),
        ...(input.organization !== undefined && {
          organization: input.organization,
        }),
        ...(input.email !== undefined && {
          email: input.email,
        }),
        ...(input.phone !== undefined && {
          phone: input.phone,
        }),
        ...(input.profileUrl !== undefined && {
          profileUrl: input.profileUrl,
        }),
        ...(input.notes !== undefined && {
          notes: input.notes,
        }),
      },
    });

    if (result.count !== 1) {
      throw new Error(
        `Contact ${contactId} could not be modified within owner scope`,
      );
    }

    const updated = await this.db.contact.findFirst({
      where: {
        id: contactId,
        ownerId,
      },
    });

    if (!updated) {
      throw new Error(`Contact ${contactId} could not be found after update`);
    }

    return updated;
  }

  async addToOpportunity(
    ownerId: string,
    opportunityId: string,
    contactId: string,
  ) {
    const [opportunity, contact] = await Promise.all([
      this.db.opportunity.findFirst({
        where: {
          id: opportunityId,
          ownerId,
        },
        select: {
          id: true,
        },
      }),
      this.db.contact.findFirst({
        where: {
          id: contactId,
          ownerId,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!opportunity) {
      throw new Error(
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    if (!contact) {
      throw new Error(`Contact ${contactId} was not found in owner scope`);
    }

    return this.db.opportunityContact.create({
      data: {
        opportunityId,
        contactId,
      },
    });
  }

  async removeFromOpportunity(
    ownerId: string,
    opportunityId: string,
    contactId: string,
  ) {
    const association = await this.db.opportunityContact.findFirst({
      where: {
        opportunityId,
        contactId,
        opportunity: {
          ownerId,
        },
        contact: {
          ownerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!association) {
      throw new Error(
        "OpportunityContact association was not found in owner scope",
      );
    }

    await this.db.opportunityContact.delete({
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
      select: {
        id: true,
      },
    });

    if (!opportunity) {
      return [];
    }

    const associations = await this.db.opportunityContact.findMany({
      where: {
        opportunityId,
        opportunity: {
          ownerId,
        },
        contact: {
          ownerId,
        },
      },
      include: {
        contact: true,
      },
    });

    return associations.map((association) => association.contact);
  }
}
