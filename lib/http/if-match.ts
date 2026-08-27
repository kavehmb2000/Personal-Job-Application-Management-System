import { ValidationError } from "@/lib/domain/errors";

export function getExpectedVersion(request: Request): number {
  const value = request.headers.get("If-Match");

  if (!value) {
    throw new ValidationError("If-Match header is required");
  }
  const normalized = value.trim().replace(/^"|"$/g, "");
  const expectedVersion = Number(normalized);

  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new ValidationError("If-Match must contain a positive integer");
  }

  return expectedVersion;
}
