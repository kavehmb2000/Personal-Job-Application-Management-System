import { describe, expect, it } from "vitest";

import {
  OFFLINE_DOCUMENT_CACHE_NAME,
  OFFLINE_DOCUMENT_MAX_AGE_SECONDS,
  OFFLINE_DOCUMENT_MAX_ENTRIES,
  isCriticalOfflinePath,
  isOfflineCacheableRequest,
} from "@/lib/offline/cache-policy";

describe("offline cache policy", () => {
  it("defines a dedicated bounded cache", () => {
    expect(OFFLINE_DOCUMENT_CACHE_NAME).toBe(
      "job-application-offline-documents-v1",
    );
    expect(OFFLINE_DOCUMENT_MAX_ENTRIES).toBe(12);
    expect(OFFLINE_DOCUMENT_MAX_AGE_SECONDS).toBe(24 * 60 * 60);
  });

  describe("isCriticalOfflinePath", () => {
    it.each([
      "/dashboard",
      "/opportunities",
      "/opportunities/123e4567-e89b-12d3-a456-426614174000",
    ])("accepts %s", (pathname) => {
      expect(isCriticalOfflinePath(pathname)).toBe(true);
    });

    it.each([
      "/",
      "/login",
      "/settings",
      "/artefacts",
      "/api/opportunities",
      "/api/opportunities/123e4567-e89b-12d3-a456-426614174000",
      "/opportunities/not-an-uuid",
      "/opportunities/123e4567-e89b-12d3-a456-426614174000/edit",
    ])("rejects %s", (pathname) => {
      expect(isCriticalOfflinePath(pathname)).toBe(false);
    });
  });

  describe("isOfflineCacheableRequest", () => {
    const origin = "http://127.0.0.1:3000";

    function request(
      url: string,
      options: RequestInit & { destination?: RequestDestination } = {},
    ) {
      const { destination, ...requestInit } = options;

      const requestObject = new Request(url, requestInit);

      Object.defineProperty(requestObject, "destination", {
        value: destination ?? "document",
      });

      return requestObject;
    }

    it("accepts a same-origin critical document GET", () => {
      const url = new URL(
        "/opportunities/123e4567-e89b-12d3-a456-426614174000",
        origin,
      );

      expect(
        isOfflineCacheableRequest(request(url.toString()), url, origin),
      ).toBe(true);
    });

    it("rejects non-GET requests", () => {
      const url = new URL("/dashboard", origin);

      expect(
        isOfflineCacheableRequest(
          request(url.toString(), { method: "POST" }),
          url,
          origin,
        ),
      ).toBe(false);
    });

    it("rejects non-document requests", () => {
      const url = new URL(
        "/opportunities/123e4567-e89b-12d3-a456-426614174000",
        origin,
      );

      expect(
        isOfflineCacheableRequest(
          request(url.toString(), { destination: "script" }),
          url,
          origin,
        ),
      ).toBe(false);
    });

    it("rejects cross-origin requests", () => {
      const url = new URL("https://drive.google.com/file/example");

      expect(
        isOfflineCacheableRequest(request(url.toString()), url, origin),
      ).toBe(false);
    });

    it("rejects non-critical same-origin documents", () => {
      const url = new URL("/artefacts", origin);

      expect(
        isOfflineCacheableRequest(request(url.toString()), url, origin),
      ).toBe(false);
    });
  });
});
