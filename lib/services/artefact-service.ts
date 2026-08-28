import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactType } from "@prisma/client";

export interface CreateArtefactInput {
  name: string;
  type: string;
  description?: string | null;
  contentMarkdown?: string | null;
  externalUrl?: string | null;
  storageProvider?: string | null;
  storageReference?: string | null;
  mimeType?: string | null;
}

export class ArtefactService {
  constructor(private readonly repository: ArtefactRepository) {}

  async create(ownerId: string, input: CreateArtefactInput) {
    return this.repository.create(ownerId, input);
  }

  async getById(ownerId: string, artefactId: string) {
    return this.repository.getById(ownerId, artefactId);
  }

  async archive(ownerId: string, artefactId: string) {
    return this.repository.archive(ownerId, artefactId);
  }

  async list(
    ownerId: string,
    options?: {
      type?: ArtefactType;
      includeArchived?: boolean;
    },
  ) {
    return this.repository.list(ownerId, options);
  }

  async addToOpportunity(
    ownerId: string,
    opportunityId: string,
    artefactId: string,
  ) {
    return this.repository.addToOpportunity(ownerId, opportunityId, artefactId);
  }

  async removeFromOpportunity(
    ownerId: string,
    opportunityId: string,
    artefactId: string,
  ) {
    return this.repository.removeFromOpportunity(
      ownerId,
      opportunityId,
      artefactId,
    );
  }

  async getForOpportunity(ownerId: string, opportunityId: string) {
    return this.repository.getForOpportunity(ownerId, opportunityId);
  }
}
