import { describe, expect, it } from "vitest";

import {
  ConflictError,
  createConflictDetails,
} from "@/lib/services/conflict-service";

describe("ConflictError", () => {
  it("creates a conflict error with current record and draft", () => {
    const current = {
      id: "application-1",
      version: 4,
      status: "Interview",
    };

    const draft = {
      version: 3,
      status: "Offer",
    };

    const error = new ConflictError(current, draft);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ConflictError");
    expect(error.code).toBe("CONFLICT");
    expect(error.current).toEqual(current);
    expect(error.draft).toEqual(draft);
    expect(error.message).toBe("The record was changed by another request.");
  });

  it("supports a custom conflict message", () => {
    const error = new ConflictError(
      { version: 7 },
      { version: 6 },
      "Application changed while you were editing it.",
    );

    expect(error.message).toBe(
      "Application changed while you were editing it.",
    );
  });
});

describe("createConflictDetails", () => {
  it("returns the standardized conflict payload", () => {
    const current = {
      id: "application-1",
      version: 5,
    };

    const draft = {
      version: 4,
      companyName: "Example Corp",
    };

    expect(createConflictDetails(current, draft)).toEqual({
      code: "CONFLICT",
      message: "The record was changed by another request.",
      current,
      draft,
    });
  });

  it("supports a custom message", () => {
    expect(
      createConflictDetails(
        { version: 8 },
        { version: 7 },
        "Please review the latest changes.",
      ),
    ).toEqual({
      code: "CONFLICT",
      message: "Please review the latest changes.",
      current: { version: 8 },
      draft: { version: 7 },
    });
  });

  it("preserves arbitrary current and draft values", () => {
    const current = {
      application: {
        id: "app-1",
        version: 10,
      },
      metadata: ["current"],
    };

    const draft = {
      application: {
        id: "app-1",
        version: 9,
      },
      metadata: ["draft"],
    };

    const result = createConflictDetails(current, draft);

    expect(result.current).toBe(current);
    expect(result.draft).toBe(draft);
  });
});
