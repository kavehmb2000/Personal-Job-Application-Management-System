import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleDriveStorageProvider } from "@/lib/storage/google-drive-storage-provider";

describe("GoogleDriveStorageProvider", () => {
  const accessToken = "test-access-token";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports authorization when Google Drive accepts the token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ user: { emailAddress: "owner@example.com" } }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider = new GoogleDriveStorageProvider(accessToken);

    await expect(provider.getAuthorization()).resolves.toEqual({
      provider: "google-drive",
      authorized: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://www.googleapis.com/drive/v3/about?fields=user",
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );
  });

  it("reports unauthorized when Google Drive rejects the token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", {
        status: 401,
      }),
    );

    const provider = new GoogleDriveStorageProvider(accessToken);

    await expect(provider.getAuthorization()).resolves.toEqual({
      provider: "google-drive",
      authorized: false,
    });
  });

  it("retrieves provider-neutral metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "drive-file-123",
          name: "cv.pdf",
          mimeType: "application/pdf",
          size: "12345",
          md5Checksum: "abc123",
          webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
          modifiedTime: "2026-08-31T12:00:00.000Z",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider = new GoogleDriveStorageProvider(accessToken);
    const reference = provider.createReference("drive-file-123");

    await expect(provider.getMetadata(reference)).resolves.toEqual({
      reference,
      name: "cv.pdf",
      originalFilename: "cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345,
      checksum: "abc123",
      externalUrl: "https://drive.google.com/file/d/drive-file-123/view",
      modifiedAt: new Date("2026-08-31T12:00:00.000Z"),
    });
  });

  it("downloads file content", async () => {
    const metadataResponse = new Response(
      JSON.stringify({
        id: "drive-file-123",
        name: "cv.pdf",
        mimeType: "application/pdf",
        size: "3",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const contentResponse = new Response(new Uint8Array([10, 20, 30]), {
      status: 200,
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(metadataResponse)
      .mockResolvedValueOnce(contentResponse);

    const provider = new GoogleDriveStorageProvider(accessToken);
    const reference = provider.createReference("drive-file-123");

    const result = await provider.download(reference);

    expect(result.metadata.reference).toEqual(reference);
    expect(result.metadata.name).toBe("cv.pdf");
    expect(Array.from(result.content)).toEqual([10, 20, 30]);

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/drive/v3/files/drive-file-123?alt=media",
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );
  });

  it("fails safely when the referenced file does not exist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not found", {
        status: 404,
      }),
    );

    const provider = new GoogleDriveStorageProvider(accessToken);
    const reference = provider.createReference("missing-file");

    await expect(provider.getMetadata(reference)).rejects.toThrow(
      "Google Drive file not found",
    );
  });

  it("fails safely when authorization is revoked during metadata retrieval", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", {
        status: 403,
      }),
    );

    const provider = new GoogleDriveStorageProvider(accessToken);
    const reference = provider.createReference("drive-file-123");

    await expect(provider.getMetadata(reference)).rejects.toThrow(
      "Google Drive authorization failed",
    );
  });

  it("fails safely when authorization is revoked during download", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "drive-file-123",
            name: "cv.pdf",
            mimeType: "application/pdf",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response("Forbidden", {
          status: 403,
        }),
      );

    const provider = new GoogleDriveStorageProvider(accessToken);
    const reference = provider.createReference("drive-file-123");

    await expect(provider.download(reference)).rejects.toThrow(
      "Google Drive content retrieval failed: 403",
    );
  });

  it("rejects references belonging to another provider", async () => {
    const provider = new GoogleDriveStorageProvider(accessToken);

    await expect(
      provider.getMetadata({
        provider: "google-drive",
        reference: "",
      }),
    ).rejects.toThrow("Google Drive reference is required");
  });

  it("rejects an empty access token", () => {
    expect(() => new GoogleDriveStorageProvider("")).toThrow(
      "Google Drive access token is required",
    );
  });
});
