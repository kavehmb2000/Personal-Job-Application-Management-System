import { describe, expect, it } from "vitest";

import { FakeStorageProvider } from "@/tests/fakes/storage-provider";

describe("StorageProvider contract", () => {
  it("reports authorization state", async () => {
    const provider = new FakeStorageProvider({
      provider: "google-drive",
      authorized: true,
    });

    await expect(provider.getAuthorization()).resolves.toEqual({
      provider: "google-drive",
      authorized: true,
    });
  });

  it("reports an unauthorized provider", async () => {
    const provider = new FakeStorageProvider({
      provider: "google-drive",
      authorized: false,
    });

    await expect(provider.getAuthorization()).resolves.toEqual({
      provider: "google-drive",
      authorized: false,
    });
  });

  it("creates provider-neutral references", () => {
    const provider = new FakeStorageProvider();

    expect(provider.createReference("drive-file-123")).toEqual({
      provider: "google-drive",
      reference: "drive-file-123",
    });
  });

  it("retrieves metadata for an existing reference", async () => {
    const provider = new FakeStorageProvider();

    const reference = provider.addFile(
      "drive-file-123",
      {
        name: "CV",
        originalFilename: "cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
        checksum: "checksum-123",
        externalUrl: "https://example.test/cv.pdf",
      },
      new Uint8Array([1, 2, 3]),
    );

    await expect(provider.getMetadata(reference)).resolves.toEqual({
      reference,
      name: "CV",
      originalFilename: "cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345,
      checksum: "checksum-123",
      externalUrl: "https://example.test/cv.pdf",
    });
  });

  it("downloads content together with metadata", async () => {
    const provider = new FakeStorageProvider();

    const reference = provider.addFile(
      "drive-file-123",
      {
        name: "CV",
        mimeType: "application/pdf",
      },
      new Uint8Array([10, 20, 30]),
    );

    const result = await provider.download(reference);

    expect(result.metadata.reference).toEqual(reference);
    expect(result.metadata.name).toBe("CV");
    expect(Array.from(result.content)).toEqual([10, 20, 30]);
  });

  it("returns a defensive copy of downloaded content", async () => {
    const provider = new FakeStorageProvider();

    const reference = provider.addFile(
      "drive-file-123",
      {
        name: "CV",
      },
      new Uint8Array([10, 20, 30]),
    );

    const firstDownload = await provider.download(reference);

    firstDownload.content[0] = 99;

    const secondDownload = await provider.download(reference);

    expect(Array.from(secondDownload.content)).toEqual([10, 20, 30]);
  });

  it("fails safely when metadata reference does not exist", async () => {
    const provider = new FakeStorageProvider();

    const reference = provider.createReference("missing-file");

    await expect(provider.getMetadata(reference)).rejects.toThrow(
      "Storage file not found: missing-file",
    );
  });

  it("fails safely when content reference does not exist", async () => {
    const provider = new FakeStorageProvider();

    const reference = provider.createReference("missing-file");

    await expect(provider.download(reference)).rejects.toThrow(
      "Storage file not found: missing-file",
    );
  });

  it("does not expose content from another reference", async () => {
    const provider = new FakeStorageProvider();

    const firstReference = provider.addFile(
      "drive-file-1",
      {
        name: "first.txt",
      },
      new Uint8Array([1]),
    );

    const secondReference = provider.addFile(
      "drive-file-2",
      {
        name: "second.txt",
      },
      new Uint8Array([2]),
    );

    const first = await provider.download(firstReference);
    const second = await provider.download(secondReference);

    expect(first.metadata.name).toBe("first.txt");
    expect(Array.from(first.content)).toEqual([1]);

    expect(second.metadata.name).toBe("second.txt");
    expect(Array.from(second.content)).toEqual([2]);
  });
});
