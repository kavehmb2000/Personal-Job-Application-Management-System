import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentOwner: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
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
    update = mocks.update;
    archive = mocks.archive;
  },
}));

vi.mock("@/lib/repositories/opportunity-repository", () => ({
  OpportunityRepository: class {},
}));

import { GET, POST } from "@/app/api/opportunities/route";
import { DELETE, PATCH } from "@/app/api/opportunities/[opportunityId]/route";

describe("Opportunity API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/opportunities/:opportunityId", () => {
    const context = {
      params: Promise.resolve({
        opportunityId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    };

    it("updates an opportunity for the current owner", async () => {
      const owner = {
        id: "owner-1",
      };

      const input = {
        companyName: "Acme",
        positionTitle: "Senior Software Engineer",
        location: "Berlin",
      };

      const updatedOpportunity = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        ownerId: "owner-1",
        ...input,
        version: 3,
      };

      mocks.getCurrentOwner.mockResolvedValue(owner);
      mocks.update.mockResolvedValue(updatedOpportunity);

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "if-match": '"2"',
          },
          body: JSON.stringify(input),
        },
      );

      const response = await PATCH(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updatedOpportunity);
      expect(response.headers.get("ETag")).toBe('"3"');

      expect(mocks.getCurrentOwner).toHaveBeenCalledOnce();
      expect(mocks.update).toHaveBeenCalledWith(
        "owner-1",
        "550e8400-e29b-41d4-a716-446655440000",
        2,
        input,
      );
    });

    it("returns 401 when there is no authenticated owner", async () => {
      const { CurrentOwnerError } = await import("@/lib/auth/current-owner");

      mocks.getCurrentOwner.mockRejectedValue(
        new CurrentOwnerError("Authentication is required"),
      );

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "if-match": '"2"',
          },
          body: JSON.stringify({
            companyName: "Acme",
          }),
        },
      );

      const response = await PATCH(request, context);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      });

      expect(mocks.update).not.toHaveBeenCalled();
    });

    it("returns 400 when If-Match is missing", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            companyName: "Acme",
          }),
        },
      );

      const response = await PATCH(request, context);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("If-Match header is required");
      expect(mocks.update).not.toHaveBeenCalled();
    });
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

      const request = new Request("http://localhost/api/opportunities");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(opportunities);
      expect(mocks.getCurrentOwner).toHaveBeenCalledOnce();
      expect(mocks.list).toHaveBeenCalledWith("owner-1", {
        search: undefined,
        roleFamilyId: undefined,
        country: undefined,
        location: undefined,
        status: undefined,
        source: undefined,
      });
    });

    it("forwards supported query parameters to the opportunity service", async () => {
      const owner = {
        id: "owner-1",
      };

      const opportunities = [
        {
          id: "opportunity-1",
          ownerId: "owner-1",
          companyName: "Acme",
          positionTitle: "Senior Engineer",
        },
      ];

      mocks.getCurrentOwner.mockResolvedValue(owner);
      mocks.list.mockResolvedValue(opportunities);

      const request = new Request(
        "http://localhost/api/opportunities?search=engine&roleFamilyId=role-1&country=Germany&location=Frankfurt&status=SUBMITTED&source=LinkedIn",
      );

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(opportunities);

      expect(mocks.list).toHaveBeenCalledWith("owner-1", {
        search: "engine",
        roleFamilyId: "role-1",
        country: "Germany",
        location: "Frankfurt",
        status: "SUBMITTED",
        source: "LinkedIn",
      });
    });

    it("trims query parameters and treats empty values as undefined", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });
      mocks.list.mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/opportunities?search=%20%20engine%20%20&roleFamilyId=%20&country=%20Germany%20&location=%20&status=%20SUBMITTED%20&source=%20",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);

      expect(mocks.list).toHaveBeenCalledWith("owner-1", {
        search: "engine",
        roleFamilyId: undefined,
        country: "Germany",
        location: undefined,
        status: "SUBMITTED",
        source: undefined,
      });
    });

    it("returns 401 when there is no authenticated owner", async () => {
      const { CurrentOwnerError } = await import("@/lib/auth/current-owner");

      mocks.getCurrentOwner.mockRejectedValue(
        new CurrentOwnerError("Authentication is required"),
      );

      const request = new Request("http://localhost/api/opportunities");

      const response = await GET(request);
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

  describe("DELETE /api/opportunities/:opportunityId", () => {
    const context = {
      params: Promise.resolve({
        opportunityId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    };

    it("archives an opportunity for the current owner", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });
      mocks.archive.mockResolvedValue(undefined);

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "DELETE",
          headers: {
            "if-match": '"2"',
          },
        },
      );

      const response = await DELETE(request, context);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");

      expect(mocks.getCurrentOwner).toHaveBeenCalledOnce();
      expect(mocks.archive).toHaveBeenCalledWith(
        "owner-1",
        "550e8400-e29b-41d4-a716-446655440000",
        2,
      );
    });

    it("returns 401 when there is no authenticated owner", async () => {
      const { CurrentOwnerError } = await import("@/lib/auth/current-owner");

      mocks.getCurrentOwner.mockRejectedValue(
        new CurrentOwnerError("Authentication is required"),
      );

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "DELETE",
          headers: {
            "if-match": '"2"',
          },
        },
      );

      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      });

      expect(mocks.archive).not.toHaveBeenCalled();
    });

    it("returns 400 when If-Match is missing", async () => {
      mocks.getCurrentOwner.mockResolvedValue({
        id: "owner-1",
      });

      const request = new Request(
        "http://localhost/api/opportunities/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("If-Match header is required");
      expect(mocks.archive).not.toHaveBeenCalled();
    });
  });
});
