export type StorageProviderId = "google-drive";

export interface StorageProviderReference {
  provider: StorageProviderId;
  reference: string;
}

export interface StorageFileMetadata {
  reference: StorageProviderReference;
  name: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
  externalUrl?: string;
  modifiedAt?: Date;
}

export interface StorageFileContent {
  metadata: StorageFileMetadata;
  content: Uint8Array;
}

export interface StorageAuthorization {
  provider: StorageProviderId;
  authorized: boolean;
}

export interface StorageProvider {
  readonly provider: StorageProviderId;

  getAuthorization(): Promise<StorageAuthorization>;

  getMetadata(
    reference: StorageProviderReference,
  ): Promise<StorageFileMetadata>;

  download(reference: StorageProviderReference): Promise<StorageFileContent>;

  createReference(reference: string): StorageProviderReference;
}
