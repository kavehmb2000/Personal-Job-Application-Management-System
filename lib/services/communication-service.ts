import { CommunicationRepository } from "@/lib/repositories/communication-repository";

export interface CreateCommunicationInput {
  occurredAt: Date;
  contact?: string | null;
  subject?: string | null;
  bodyMarkdown?: string | null;
}

export interface UpdateCommunicationInput {
  occurredAt?: Date;
  contact?: string | null;
  subject?: string | null;
  bodyMarkdown?: string | null;
}

export class CommunicationService {
  constructor(private readonly repository: CommunicationRepository) {}

  async create(
    ownerId: string,
    opportunityId: string,
    input: CreateCommunicationInput,
  ) {
    return this.repository.create(ownerId, opportunityId, input);
  }

  async getById(
    ownerId: string,
    opportunityId: string,
    communicationId: string,
  ) {
    return this.repository.getById(ownerId, opportunityId, communicationId);
  }

  async update(
    ownerId: string,
    opportunityId: string,
    communicationId: string,
    input: UpdateCommunicationInput,
  ) {
    return this.repository.update(
      ownerId,
      opportunityId,
      communicationId,
      input,
    );
  }

  async addArtefact(
    ownerId: string,
    opportunityId: string,
    communicationId: string,
    artefactId: string,
  ) {
    return this.repository.addArtefact(
      ownerId,
      opportunityId,
      communicationId,
      artefactId,
    );
  }

  async removeArtefact(
    ownerId: string,
    opportunityId: string,
    communicationId: string,
    artefactId: string,
  ) {
    return this.repository.removeArtefact(
      ownerId,
      opportunityId,
      communicationId,
      artefactId,
    );
  }

  async getArtefacts(
    ownerId: string,
    opportunityId: string,
    communicationId: string,
  ) {
    return this.repository.getArtefacts(
      ownerId,
      opportunityId,
      communicationId,
    );
  }

  async list(ownerId: string, opportunityId: string) {
    return this.repository.list(ownerId, opportunityId);
  }

  async delete(
      ownerId: string,
      opportunityId: string,
      communicationId: string,
  ) {
    return this.repository.delete(
        ownerId,
        opportunityId,
        communicationId,
    );
  }
}
