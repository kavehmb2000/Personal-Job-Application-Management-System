import type { Prisma, PrismaClient, ScheduledEventType } from "@prisma/client";

export interface CreateScheduledEventRepositoryInput {
  type: ScheduledEventType;
  title: string;
  scheduledAt: Date;
  endAt?: Date | null;
  timeZone?: string | null;
  platform?: string | null;
  meetingUrl?: string | null;
  notesMarkdown?: string | null;
}

export interface UpdateScheduledEventRepositoryInput {
  type?: ScheduledEventType;
  title?: string;
  scheduledAt?: Date;
  endAt?: Date | null;
  timeZone?: string | null;
  platform?: string | null;
  meetingUrl?: string | null;
  notesMarkdown?: string | null;
}

export class ScheduledEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateScheduledEventRepositoryInput,
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
        `Opportunity ${opportunityId} was not found in owner scope`,
      );
    }

    return this.prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: input.type,
        title: input.title,
        scheduledAt: input.scheduledAt,
        endAt: input.endAt ?? null,
        timeZone: input.timeZone ?? null,
        platform: input.platform ?? null,
        meetingUrl: input.meetingUrl ?? null,
        notesMarkdown: input.notesMarkdown ?? null,
      },
    });
  }

  async getById(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
  ) {
    return this.prisma.scheduledEvent.findFirst({
      where: {
        id: scheduledEventId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
    });
  }

  async update(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
    input: UpdateScheduledEventRepositoryInput,
  ) {
    const existing = await this.prisma.scheduledEvent.findFirst({
      where: {
        id: scheduledEventId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error(
        `ScheduledEvent ${scheduledEventId} was not found in owner scope`,
      );
    }

    const data: Prisma.ScheduledEventUpdateInput = {};

    if (input.type !== undefined) {
      data.type = input.type;
    }

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.scheduledAt !== undefined) {
      data.scheduledAt = input.scheduledAt;
    }

    if (input.endAt !== undefined) {
      data.endAt = input.endAt;
    }

    if (input.timeZone !== undefined) {
      data.timeZone = input.timeZone;
    }

    if (input.platform !== undefined) {
      data.platform = input.platform;
    }

    if (input.meetingUrl !== undefined) {
      data.meetingUrl = input.meetingUrl;
    }

    if (input.notesMarkdown !== undefined) {
      data.notesMarkdown = input.notesMarkdown;
    }

    return this.prisma.scheduledEvent.update({
      where: {
        id: scheduledEventId,
      },
      data,
    });
  }

  async delete(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
  ) {
    const existing = await this.prisma.scheduledEvent.findFirst({
      where: {
        id: scheduledEventId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error(
        `ScheduledEvent ${scheduledEventId} was not found in owner scope`,
      );
    }

    return this.prisma.scheduledEvent.delete({
      where: {
        id: scheduledEventId,
      },
    });
  }

  async addContact(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
    contactId: string,
  ) {
    const scheduledEvent = await this.prisma.scheduledEvent.findFirst({
      where: {
        id: scheduledEventId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!scheduledEvent) {
      throw new Error(
        `ScheduledEvent ${scheduledEventId} was not found in owner scope`,
      );
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId,
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} was not found in owner scope`);
    }

    return this.prisma.scheduledEventContact.create({
      data: {
        scheduledEventId,
        contactId,
      },
    });
  }

  async removeContact(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
    contactId: string,
  ) {
    const association = await this.prisma.scheduledEventContact.findFirst({
      where: {
        scheduledEventId,
        contactId,
        scheduledEvent: {
          opportunityId,
          opportunity: {
            ownerId,
          },
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
        "ScheduledEventContact association was not found in owner scope",
      );
    }

    return this.prisma.scheduledEventContact.delete({
      where: {
        id: association.id,
      },
    });
  }

  async getContacts(
    ownerId: string,
    opportunityId: string,
    scheduledEventId: string,
  ) {
    const scheduledEvent = await this.prisma.scheduledEvent.findFirst({
      where: {
        id: scheduledEventId,
        opportunityId,
        opportunity: {
          ownerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!scheduledEvent) {
      return [];
    }

    const associations = await this.prisma.scheduledEventContact.findMany({
      where: {
        scheduledEventId,
        scheduledEvent: {
          opportunityId,
          opportunity: {
            ownerId,
          },
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
