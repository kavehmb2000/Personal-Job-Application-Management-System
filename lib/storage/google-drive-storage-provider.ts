import type {
  StorageAuthorization,
  StorageFileContent,
  StorageFileMetadata,
  StorageProvider,
  StorageProviderReference,
} from "@/lib/storage/storage-provider";

const DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

interface GoogleDriveFileResponse {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export class GoogleDriveStorageProvider implements StorageProvider {
  readonly provider = "google-drive" as const;

  constructor(private readonly accessToken: string) {
    if (!accessToken.trim()) {
      throw new Error("Google Drive access token is required");
    }
  }

  async getAuthorization(): Promise<StorageAuthorization> {
    const response = await fetch(`${DRIVE_API_BASE_URL}/about?fields=user`, {
      headers: this.authorizationHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        provider: this.provider,
        authorized: false,
      };
    }

    if (!response.ok) {
      throw new Error(
        `Google Drive authorization check failed: ${response.status}`,
      );
    }

    return {
      provider: this.provider,
      authorized: true,
    };
  }

  async getMetadata(
    reference: StorageProviderReference,
  ): Promise<StorageFileMetadata> {
    this.assertReference(reference);

    const file = await this.request<GoogleDriveFileResponse>(
      `/files/${encodeURIComponent(reference.reference)}?fields=id,name,mimeType,size,md5Checksum,webViewLink,modifiedTime`,
    );

    if (!file.id || !file.name) {
      throw new Error("Google Drive returned incomplete file metadata");
    }

    return {
      reference,
      name: file.name,
      originalFilename: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.size ? Number(file.size) : undefined,
      checksum: file.md5Checksum,
      externalUrl: file.webViewLink,
      modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    };
  }

  async download(
    reference: StorageProviderReference,
  ): Promise<StorageFileContent> {
    this.assertReference(reference);

    const metadata = await this.getMetadata(reference);

    const response = await fetch(
      `${DRIVE_API_BASE_URL}/files/${encodeURIComponent(reference.reference)}?alt=media`,
      {
        headers: this.authorizationHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Google Drive content retrieval failed: ${response.status}`,
      );
    }

    const content = new Uint8Array(await response.arrayBuffer());

    return {
      metadata,
      content,
    };
  }

  createReference(reference: string): StorageProviderReference {
    if (!reference.trim()) {
      throw new Error("Google Drive reference is required");
    }

    return {
      provider: this.provider,
      reference,
    };
  }

  private authorizationHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private assertReference(reference: StorageProviderReference): void {
    if (reference.provider !== this.provider) {
      throw new Error(
        `Storage reference belongs to provider "${reference.provider}"`,
      );
    }

    if (!reference.reference.trim()) {
      throw new Error("Google Drive reference is required");
    }
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${DRIVE_API_BASE_URL}${path}`, {
      headers: this.authorizationHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Google Drive authorization failed");
    }

    if (response.status === 404) {
      throw new Error("Google Drive file not found");
    }

    if (!response.ok) {
      throw new Error(`Google Drive request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
