import type {
  StorageAuthorization,
  StorageFileContent,
  StorageFileMetadata,
  StorageProvider,
  StorageProviderReference,
} from "@/lib/storage/storage-provider";

export class FakeStorageProvider implements StorageProvider {
  readonly provider = "google-drive" as const;

  private readonly files = new Map<string, StorageFileContent>();

  constructor(
    private readonly authorization: StorageAuthorization = {
      provider: "google-drive",
      authorized: true,
    },
  ) {}

  getAuthorization(): Promise<StorageAuthorization> {
    return Promise.resolve(this.authorization);
  }

  getMetadata(
    reference: StorageProviderReference,
  ): Promise<StorageFileMetadata> {
    const file = this.files.get(reference.reference);

    if (!file) {
      return Promise.reject(
        new Error(`Storage file not found: ${reference.reference}`),
      );
    }

    return Promise.resolve(file.metadata);
  }

  download(reference: StorageProviderReference): Promise<StorageFileContent> {
    const file = this.files.get(reference.reference);

    if (!file) {
      return Promise.reject(
        new Error(`Storage file not found: ${reference.reference}`),
      );
    }

    return Promise.resolve({
      metadata: file.metadata,
      content: new Uint8Array(file.content),
    });
  }

  createReference(reference: string): StorageProviderReference {
    return {
      provider: this.provider,
      reference,
    };
  }

  addFile(
    reference: string,
    metadata: Omit<StorageFileMetadata, "reference">,
    content: Uint8Array,
  ): StorageProviderReference {
    const storageReference = this.createReference(reference);

    this.files.set(reference, {
      metadata: {
        ...metadata,
        reference: storageReference,
      },
      content: new Uint8Array(content),
    });

    return storageReference;
  }

  clear(): void {
    this.files.clear();
  }
}
