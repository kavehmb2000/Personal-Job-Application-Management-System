import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";

export interface CreateScheduledEventInput {
    type:
        | "INTERVIEW"
        | "RECRUITER_CALL"
        | "PRESENTATION"
        | "CHALLENGE_DEADLINE"
        | "FOLLOW_UP"
        | "OTHER";
    title: string;
    scheduledAt: Date;
    endAt?: Date | null;
    timeZone?: string | null;
    platform?: string | null;
    meetingUrl?: string | null;
    notesMarkdown?: string | null;
}

export interface UpdateScheduledEventInput {
    type?: CreateScheduledEventInput["type"];
    title?: string;
    scheduledAt?: Date;
    endAt?: Date | null;
    timeZone?: string | null;
    platform?: string | null;
    meetingUrl?: string | null;
    notesMarkdown?: string | null;
}

export class ScheduledEventService {
    constructor(
        private readonly repository: ScheduledEventRepository,
    ) {}

    async create(
        ownerId: string,
        opportunityId: string,
        input: CreateScheduledEventInput,
    ) {
        return this.repository.create(
            ownerId,
            opportunityId,
            input,
        );
    }

    async getById(
        ownerId: string,
        opportunityId: string,
        scheduledEventId: string,
    ) {
        return this.repository.getById(
            ownerId,
            opportunityId,
            scheduledEventId,
        );
    }

    async update(
        ownerId: string,
        opportunityId: string,
        scheduledEventId: string,
        input: UpdateScheduledEventInput,
    ) {
        return this.repository.update(
            ownerId,
            opportunityId,
            scheduledEventId,
            input,
        );
    }

    async delete(
        ownerId: string,
        opportunityId: string,
        scheduledEventId: string,
    ) {
        return this.repository.delete(
            ownerId,
            opportunityId,
            scheduledEventId,
        );
    }
}