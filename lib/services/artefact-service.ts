import { ArtefactRepository } from "@/lib/repositories/artefact-repository";

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
}
