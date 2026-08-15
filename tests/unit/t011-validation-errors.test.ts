import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ConflictError,
  DomainError,
  errorToResponse,
  NotFoundError,
  ValidationError,
} from "@/lib/domain/errors";
import { validateRequest } from "@/lib/validation/request-validation";

describe("domain errors", () => {
  it("preserves the typed error contract", () => {
    const error = new ConflictError("Version conflict", {
      currentVersion: 4,
    });

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("CONFLICT");
    expect(error.status).toBe(409);
    expect(error.details).toEqual({
      currentVersion: 4,
    });
  });

  it("maps a domain error to an HTTP response", async () => {
    const response = errorToResponse(
      new NotFoundError("Application not found"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Application not found",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    const response = errorToResponse(new Error("database password"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });
});

describe("validateRequest", () => {
  const schema = z.object({
    companyName: z.string().min(1),
    fitScore: z.number().int().min(0).max(100),
  });

  it("returns validated data", () => {
    expect(
      validateRequest(schema, {
        companyName: "Example Corp",
        fitScore: 85,
      }),
    ).toEqual({
      companyName: "Example Corp",
      fitScore: 85,
    });
  });

  it("throws ValidationError for invalid input", () => {
    expect(() =>
      validateRequest(schema, {
        companyName: "",
        fitScore: 101,
      }),
    ).toThrow(ValidationError);
  });
});
