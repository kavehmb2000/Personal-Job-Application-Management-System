import { describe, expect, it } from "vitest";

import {
  ConcurrencyError,
  assertVersionMatches,
  createETag,
  parseETag,
  parseVersion,
} from "@/lib/domain/concurrency";

describe("parseVersion", () => {
  it("accepts a positive integer", () => {
    expect(parseVersion(3)).toBe(3);
  });

  it("accepts a positive integer string", () => {
    expect(parseVersion("7")).toBe(7);
  });

  it("trims whitespace from a numeric string", () => {
    expect(parseVersion(" 12 ")).toBe(12);
  });

  it("rejects zero", () => {
    expect(() => parseVersion(0)).toThrow(ConcurrencyError);
  });

  it("rejects negative values", () => {
    expect(() => parseVersion(-1)).toThrow(ConcurrencyError);
  });

  it("rejects decimal values", () => {
    expect(() => parseVersion(1.5)).toThrow(ConcurrencyError);
  });

  it("rejects malformed strings", () => {
    expect(() => parseVersion("1.5")).toThrow(ConcurrencyError);
    expect(() => parseVersion("version-1")).toThrow(ConcurrencyError);
  });

  it("rejects unsafe integers", () => {
    expect(() => parseVersion(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      ConcurrencyError,
    );
  });

  it("rejects unsupported types", () => {
    expect(() => parseVersion(null)).toThrow(ConcurrencyError);
    expect(() => parseVersion(undefined)).toThrow(ConcurrencyError);
    expect(() => parseVersion(true)).toThrow(ConcurrencyError);
    expect(() => parseVersion({})).toThrow(ConcurrencyError);
  });
});

describe("ETag helpers", () => {
  it("creates an ETag from a version", () => {
    expect(createETag(4)).toBe('"4"');
  });

  it("creates an ETag from a numeric version string", () => {
    expect(createETag("8" as unknown as number)).toBe('"8"');
  });

  it("parses a quoted numeric ETag", () => {
    expect(parseETag('"15"')).toBe(15);
  });

  it("rejects an unquoted ETag", () => {
    expect(() => parseETag("15")).toThrow(ConcurrencyError);
  });

  it("rejects a weak ETag", () => {
    expect(() => parseETag('W/"15"')).toThrow(ConcurrencyError);
  });

  it("rejects a malformed ETag", () => {
    expect(() => parseETag('"abc"')).toThrow(ConcurrencyError);
    expect(() => parseETag("")).toThrow(ConcurrencyError);
    expect(() => parseETag(undefined)).toThrow(ConcurrencyError);
  });
});

describe("assertVersionMatches", () => {
  it("does not throw when versions match", () => {
    expect(() => assertVersionMatches(5, 5)).not.toThrow();
  });

  it("throws when versions differ", () => {
    expect(() => assertVersionMatches(5, 6)).toThrow(ConcurrencyError);
  });

  it("includes the expected and current versions in the error", () => {
    expect(() => assertVersionMatches(5, 6)).toThrow(
      "expected 5, current version is 6",
    );
  });
});
