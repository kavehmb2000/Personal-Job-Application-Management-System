import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  GET as GET_ACTIONS,
  POST,
} from "@/app/api/opportunities/[opportunityId]/actions/route";
import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/opportunities/[opportunityId]/actions/[actionId]/route";

const { mockGetCurrentOwner, MockCurrentOwnerError } = vi.hoisted(() => {
  class MockCurrentOwnerError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CurrentOwnerError";
    }
  }

  return {
    mockGetCurrentOwner: vi.fn(),
    MockCurrentOwnerError,
  };
});

vi.mock("@/lib/auth/current-owner", () => ({
  getCurrentOwner: mockGetCurrentOwner,
  CurrentOwnerError: MockCurrentOwnerError,
}));

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

describe("UserAction routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `actions-${crypto.randomUUID()}`,
        displayName: "Actions Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `actions-other-${crypto.randomUUID()}`,
        displayName: "Other Owner",
      },
    });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const status = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 10,
        isTerminal: false,
        isActive: true,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: status.id,
      },
    });

    opportunityId = opportunity.id;

    mockGetCurrentOwner.mockReset();
    mockGetCurrentOwner.mockResolvedValue(owner);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function collectionParams(id = opportunityId) {
    return {
      params: Promise.resolve({
        opportunityId: id,
      }),
    };
  }

  function itemParams(actionId: string, id = opportunityId) {
    return {
      params: Promise.resolve({
        opportunityId: id,
        actionId,
      }),
    };
  }

  function jsonRequest(
    url: string,
    method: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return new Request(url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  it("creates a UserAction", async () => {
    const response = await POST(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/actions`,
        "POST",
        {
          title: "Follow up with recruiter",
          descriptionMarkdown: "Send a follow-up email.",
          priority: "HIGH",
          dueAt: "2026-08-30T10:00:00.000Z",
        },
      ),
      collectionParams(),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.opportunityId).toBe(opportunityId);
    expect(body.title).toBe("Follow up with recruiter");
    expect(body.descriptionMarkdown).toBe("Send a follow-up email.");
    expect(body.priority).toBe("HIGH");
    expect(body.status).toBe("TODO");
    expect(body.version).toBe(1);

    const action = await prisma.userAction.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(action).not.toBeNull();
    expect(action?.opportunityId).toBe(opportunityId);
  });

  it("lists UserActions for an Opportunity", async () => {
    await prisma.userAction.createMany({
      data: [
        {
          opportunityId,
          title: "First action",
          status: "TODO",
          priority: "NORMAL",
          dueAt: new Date("2026-08-28T10:00:00.000Z"),
        },
        {
          opportunityId,
          title: "Second action",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueAt: new Date("2026-08-29T10:00:00.000Z"),
        },
      ],
    });

    const response = await GET_ACTIONS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/actions`,
      ),
      collectionParams(),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("First action");
    expect(body[1].title).toBe("Second action");
  });

  it("gets a UserAction by id", async () => {
    const action = await prisma.userAction.create({
      data: {
        opportunityId,
        title: "Prepare interview questions",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await GET(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/actions/${action.id}`,
      ),
      itemParams(action.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(action.id);
    expect(body.title).toBe("Prepare interview questions");
  });

  it("updates a UserAction with the expected version", async () => {
    const action = await prisma.userAction.create({
      data: {
        opportunityId,
        title: "Prepare interview questions",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/actions/${action.id}`,
        "PATCH",
        {
          title: "Prepare technical interview questions",
          status: "IN_PROGRESS",
        },
        {
          "If-Match": "1",
        },
      ),
      itemParams(action.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.title).toBe("Prepare technical interview questions");
    expect(body.status).toBe("IN_PROGRESS");
    expect(body.version).toBe(2);
  });

  it("rejects an update with a stale expected version", async () => {
    const action = await prisma.userAction.create({
      data: {
        opportunityId,
        title: "Prepare interview questions",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/actions/${action.id}`,
        "PATCH",
        {
          title: "Changed title",
        },
        {
          "If-Match": "2",
        },
      ),
      itemParams(action.id),
    );

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.error.code).toBe("CONFLICT");

    const unchanged = await prisma.userAction.findUnique({
      where: {
        id: action.id,
      },
    });

    expect(unchanged?.title).toBe("Prepare interview questions");
    expect(unchanged?.version).toBe(1);
  });

  it("requires If-Match when updating a UserAction", async () => {
    const action = await prisma.userAction.create({
      data: {
        opportunityId,
        title: "Prepare interview questions",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/actions/${action.id}`,
        "PATCH",
        {
          title: "Changed title",
        },
      ),
      itemParams(action.id),
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("deletes a UserAction with the expected version", async () => {
    const action = await prisma.userAction.create({
      data: {
        opportunityId,
        title: "Delete this action",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await DELETE(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/actions/${action.id}`,
        {
          method: "DELETE",
          headers: {
            "If-Match": "1",
          },
        },
      ),
      itemParams(action.id),
    );

    expect(response.status).toBe(204);

    const deleted = await prisma.userAction.findUnique({
      where: {
        id: action.id,
      },
    });

    expect(deleted).toBeNull();
  });

  it("returns 404 when getting an action outside the owner scope", async () => {
    const otherStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId: otherOwnerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 10,
        isTerminal: false,
        isActive: true,
      },
    });

    const otherOpportunity = await prisma.opportunity.create({
      data: {
        ownerId: otherOwnerId,
        companyName: "Other Corporation",
        positionTitle: "Engineer",
        statusId: otherStatus.id,
      },
    });

    const action = await prisma.userAction.create({
      data: {
        opportunityId: otherOpportunity.id,
        title: "Other owner's action",
        status: "TODO",
        priority: "NORMAL",
      },
    });

    const response = await GET(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/actions/${action.id}`,
      ),
      itemParams(action.id, otherOpportunity.id),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await GET_ACTIONS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/actions`,
      ),
      collectionParams(),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid action input", async () => {
    const response = await POST(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/actions`,
        "POST",
        {
          title: "",
          priority: "NOT_A_PRIORITY",
        },
      ),
      collectionParams(),
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
