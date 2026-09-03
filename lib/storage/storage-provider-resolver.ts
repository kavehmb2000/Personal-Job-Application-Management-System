import { createGoogleDriveStorageProvider } from "@/lib/storage/google-drive-provider-factory";
import type { StorageProvider } from "@/lib/storage/storage-provider";

export interface StorageProviderResolver {
  resolve(ownerId: string, provider: string): Promise<StorageProvider>;
}

export class DefaultStorageProviderResolver implements StorageProviderResolver {
  async resolve(ownerId: string, provider: string): Promise<StorageProvider> {
    if (!ownerId.trim()) {
      throw new Error("Owner ID is required");
    }

    switch (provider) {
      case "GOOGLE_DRIVE":
        return createGoogleDriveStorageProvider(ownerId);

      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }
}
