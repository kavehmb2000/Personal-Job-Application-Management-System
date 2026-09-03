import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactType } from "@prisma/client";
import type {
  StorageFileContent,
  StorageFileMetadata,
  StorageProviderReference,
} from "@/lib/storage/storage-provider";
import {
  DefaultStorageProviderResolver,
  type StorageProviderResolver,
} from "@/lib/storage/storage-provider-resolver";

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
  private readonly storageProviderResolver: StorageProviderResolver;
  constructor(
    private readonly repository: ArtefactRepository,
    storageProviderResolver?: StorageProviderResolver,
  ) {
    this.storageProviderResolver =
      storageProviderResolver ?? new DefaultStorageProviderResolver();
  }

  async create(ownerId: string, input: CreateArtefactInput) {
    return this.repository.create(ownerId, input);
  }

  async getById(ownerId: string, artefactId: string) {
    return this.repository.getById(ownerId, artefactId);
  }

  async getStorageMetadata(
    ownerId: string,
    artefactId: string,
  ): Promise<StorageFileMetadata> {
    const artefact = await this.repository.getById(ownerId, artefactId);

    if (!artefact) {
      throw new Error("Artefact not found");
    }

    const reference = this.createStorageReference(artefact);

    const provider = await this.storageProviderResolver.resolve(
      ownerId,
      artefact.storageProvider!,
    );

    return provider.getMetadata(reference);
  }

  async download(
    ownerId: string,
    artefactId: string,
  ): Promise<StorageFileContent> {
    const artefact = await this.repository.getById(ownerId, artefactId);

    if (!artefact) {
      throw new Error("Artefact not found");
    }

    const reference = this.createStorageReference(artefact);

    const provider = await this.storageProviderResolver.resolve(
      ownerId,
      artefact.storageProvider!,
    );

    return provider.download(reference);
  }

  private createStorageReference(artefact: {
    storageProvider: string | null;
    storageReference: string | null;
  }): StorageProviderReference {
    if (!artefact.storageProvider) {
      throw new Error("Artefact storage provider is missing");
    }

    if (!artefact.storageReference) {
      throw new Error("Artefact storage reference is missing");
    }

    if (artefact.storageProvider === "GOOGLE_DRIVE") {
      return {
        provider: "google-drive",
        reference: artefact.storageReference,
      };
    }

    throw new Error(
      `Unsupported storage provider: ${artefact.storageProvider}`,
    );
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
