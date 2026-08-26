import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { POST } from "@/app/api/opportunities/[opportunityId]/submission/route";
import { getCurrentOwner } from "@/lib/auth/current-owner";

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

describe("POST /api/opportunities/[opportunityId]/submission", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `submission-${Date.now()}-${Math.random()}`,
        displayName: "Submission Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `submission-other-${Date.now()}-${Math.random()}`,
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

    const submittedStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "SUBMITTED",
        label: "Submitted",
        sortOrder: 20,
        isTerminal: false,
        isActive: true,
      },
    });

    await prisma.lifecycleTransition.create({
      data: {
        fromStatusId: status.id,
        toStatusId: submittedStatus.id,
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

    mockGetCurrentOwner.mockResolvedValue(owner);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function request(
    body: unknown = {
      submittedAt: "2026-08-26T10:00:00.000Z",
    },
    version = 1,
  ) {
    return new Request(
      `http://localhost/api/opportunities/${opportunityId}/submission`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${version}"`,
        },
        body: JSON.stringify(body),
      },
    );
  }

  it("creates a submission and increments the opportunity version", async () => {
    const response = await POST(
      request({
        submittedAt: "2026-08-26T10:00:00.000Z",
        method: "Company website",
      }),
      {
        params: Promise.resolve({ opportunityId }),
      },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("ETag")).toBe('"2"');

    const body = await response.json();

    expect(body.submission.opportunityId).toBe(opportunityId);
    expect(body.opportunity.version).toBe(2);

    const submissions = await prisma.submission.findMany({
      where: {
        opportunityId,
      },
    });

    expect(submissions).toHaveLength(1);
  });

  it("rejects a second submission with 409", async () => {
    const firstResponse = await POST(request(), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await POST(request(undefined, 2), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(secondResponse.status).toBe(409);

    const body = await secondResponse.json();

    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 409 when If-Match contains a stale version", async () => {
    await prisma.opportunity.update({
      where: {
        id: opportunityId,
      },
      data: {
        version: 2,
      },
    });

    const response = await POST(request(undefined, 1), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 404 for an opportunity outside the owner scope", async () => {
    const status = await prisma.lifecycleStatus.create({
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
        statusId: status.id,
      },
    });

    const response = await POST(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "If-Match": '"1"',
          },
          body: JSON.stringify({
            submittedAt: "2026-08-26T10:00:00.000Z",
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId: otherOpportunity.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await POST(request(), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(401);
  });

  it("requires If-Match", async () => {
    const response = await POST(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      ),
      {
        params: Promise.resolve({ opportunityId }),
      },
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
