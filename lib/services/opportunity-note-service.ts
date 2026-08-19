import type {
    CreateOpportunityNoteInput,
    UpdateOpportunityNoteInput,
} from "@/lib/repositories/opportunity-note-repository";
import { OpportunityNoteRepository } from "@/lib/repositories/opportunity-note-repository";

export class OpportunityNoteService {
    constructor(
        private readonly repository: OpportunityNoteRepository,
    ) {}

    async create(
        ownerId: string,
        opportunityId: string,
        input: CreateOpportunityNoteInput,
    ) {
        return this.repository.create(ownerId, opportunityId, input);
    }

    async getById(
        ownerId: string,
        opportunityId: string,
        noteId: string,
    ) {
        return this.repository.getById(
            ownerId,
            opportunityId,
            noteId,
        );
    }

    async update(
        ownerId: string,
        opportunityId: string,
        noteId: string,
        input: UpdateOpportunityNoteInput,
    ) {
        return this.repository.update(
            ownerId,
            opportunityId,
            noteId,
            input,
        );
    }
}