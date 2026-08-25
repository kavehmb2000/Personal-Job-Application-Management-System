import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentOwner: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/lib/auth/current-owner", () => ({
  CurrentOwnerError: class CurrentOwnerError extends Error {
    constructor(message = "Authenticated owner could not be resolved") {
      super(message);
      this.name = "CurrentOwnerError";
    }
  },
  getCurrentOwner: mocks.getCurrentOwner,
}));

vi.mock("@/lib/services/opportunity-service", () => ({
  OpportunityService: class {
    create = mocks.create;
    list = mocks.list;
  },
}));

vi.mock("@/lib/repositories/opportunity-repository", () => ({
  OpportunityRepository: class {},
}));

import { GET, POST } from "@/app/api/opportunities/route";

describe("Opportunity API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/opportunities", () => {
    it("returns the current owner's opportunities", async () => {
      const owner = {
        id: "owner-1",
      };

      const opportunities = [
        {
          id: "opportunity-1",
          ownerId: "owner-1",
          companyName: "Acme",
          positionTitle: "Software Engineer",
        },
      ];

      mocks.getCurrentOwner.mockResolvedValue(owner);
      mocks.list.mockResolvedValue(opportunities);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(opportunities);
      expect(mocks.getCurrentOwner).toHaveBeenCalledOnce();
      expect(mocks.list).toHaveBeenCalledWith("owner-1");
    });

    it("returns 401 when there is no authenticated owner", async () => {
      const { CurrentOwnerError } = await import("@/lib/auth/current-owner");

      mocks.getCurrentOwner.mockRejectedValue(
        new CurrentOwnerError("Authentication is required"),
      );

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      });

      expect(mocks.list).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/opportunities", () => {
    it("creates an opportunity for the current owner", async () => {
      const owner = {
        id: "owner-1",
      };

      const input = {
        companyName: "Acme",
        positionTitle: "Software Engineer",
        location: "Berlin",
        country: "Germany",
      };

      const createdOpportunity = {
        id: "opportunity-1",
        ownerId: "owner-1",
        ...input,
      };

      mocks.getCurrentOwner.mockResolvedValue(owner);
      mocks.create.mockResolvedValue(createdOpportunity);

      const request = new Request("http://localhost/api/opportunities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(createdOpportunity);
      expect(mocks.getCurrentOwner).toHaveBeenCalledOnce();
      expect(mocks.create).toHaveBeenCalledWith("owner-1", input);
    });

    it("returns 401 when there is no authenticated owner", async () => {
      const { CurrentOwnerError } = await import("@/lib/auth/current-owner");

      mocks.getCurrentOwner.mockRejectedValue(
        new CurrentOwnerError("Authentication is required"),
      );

      const request = new Request("http://localhost/api/opportunities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companyName: "Acme",
          positionTitle: "Software Engineer",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      });

      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid request body", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });

      const request = new Request("http://localhost/api/opportunities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companyName: "",
          positionTitle: "Software Engineer",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Request validation failed");
      expect(body.error.details).toBeDefined();
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed JSON", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });

      const request = new Request("http://localhost/api/opportunities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{invalid json",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Request body must contain valid JSON");
      expect(mocks.create).not.toHaveBeenCalled();
    });
  });
});
