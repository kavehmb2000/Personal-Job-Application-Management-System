export class ConcurrencyError extends Error {
  constructor(message = "A valid version is required") {
    super(message);
    this.name = "ConcurrencyError";
  }
}

export function parseVersion(value: unknown): number {
  if (typeof value === "number") {
    if (Number.isSafeInteger(value) && value >= 1) {
      return value;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d+$/.test(trimmed)) {
      const version = Number(trimmed);

      if (Number.isSafeInteger(version) && version >= 1) {
        return version;
      }
    }
  }

  throw new ConcurrencyError();
}

export function createETag(version: number): string {
  const parsedVersion = parseVersion(version);
  return `"${parsedVersion}"`;
}

export function parseETag(value: string | null | undefined): number {
  if (!value) {
    throw new ConcurrencyError("A valid ETag is required");
  }

  const trimmed = value.trim();

  const match = trimmed.match(/^"(\d+)"$/);

  if (!match) {
    throw new ConcurrencyError("A valid ETag is required");
  }

  return parseVersion(match[1]);
}

export function assertVersionMatches(
  expectedVersion: number,
  actualVersion: number,
): void {
  const expected = parseVersion(expectedVersion);
  const actual = parseVersion(actualVersion);

  if (expected !== actual) {
    throw new ConcurrencyError(
      `Version conflict: expected ${expected}, current version is ${actual}`,
    );
  }
}
