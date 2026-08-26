import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { POST } from "@/app/api/opportunities/[opportunityId]/transition/route";
import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";

vi.mock("@/lib/auth/current-owner", () => ({
  CurrentOwnerError: class CurrentOwnerError extends Error {
    constructor(message = "Authenticated owner could not be resolved") {
      super(message);
      this.name = "CurrentOwnerError";
    }
  },
  getCurrentOwner: mockGetCurrentOwner,
}));

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const { mockGetCurrentOwner } = vi.hoisted(() => ({
  mockGetCurrentOwner: vi.fn(),
}));

describe("POST /api/opportunities/[opportunityId]/transition", () => {
  let ownerId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;
  let opportunityId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    const owner = await prisma.ownerAccount.create({
      data: {
        email: `transition-${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `transition-${Date.now()}-${Math.random()}`,
        displayName: "Transition Test Owner",
      },
    });

    ownerId = owner.id;
    mockGetCurrentOwner.mockResolvedValue(owner);

    const discovered = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 10,
        isTerminal: false,
        isActive: true,
      },
    });

    const submitted = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "SUBMITTED",
        label: "Submitted",
        sortOrder: 20,
        isTerminal: false,
        isActive: true,
      },
    });

    discoveredStatusId = discovered.id;
    submittedStatusId = submitted.id;

    await prisma.lifecycleTransition.create({
      data: {
        fromStatusId: discoveredStatusId,
        toStatusId: submittedStatusId,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    opportunityId = opportunity.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function createRequest(body: unknown, version?: number): Request {
    return new Request(
      `http://localhost/api/opportunities/${opportunityId}/transition`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(version !== undefined ? { "If-Match": `"${version}"` } : {}),
        },
        body: JSON.stringify(body),
      },
    );
  }

  it("transitions the opportunity and returns the new version", async () => {
    const response = await POST(createRequest({ toStatus: "SUBMITTED" }, 1), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"2"');

    const body = await response.json();

    expect(body.id).toBe(opportunityId);
    expect(body.status.key).toBe("SUBMITTED");
    expect(body.version).toBe(2);

    const event = await prisma.opportunityEvent.findFirst({
      where: {
        opportunityId,
      },
    });

    expect(event?.type).toBe("OPPORTUNITY_SUBMITTED");
    expect(event?.systemGenerated).toBe(true);
  });

  it("rejects a request without If-Match", async () => {
    const response = await POST(createRequest({ toStatus: "SUBMITTED" }), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid lifecycle target", async () => {
    const response = await POST(createRequest({ toStatus: "OFFER" }, 1), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.error.code).toBe("CONFLICT");

    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
    });

    expect(opportunity?.statusId).toBe(discoveredStatusId);
    expect(opportunity?.version).toBe(1);
  });

  it("returns 409 when If-Match contains a stale version", async () => {
    const response = await POST(createRequest({ toStatus: "SUBMITTED" }, 99), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.error.code).toBe("CONFLICT");

    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
    });

    expect(opportunity?.statusId).toBe(discoveredStatusId);
    expect(opportunity?.version).toBe(1);

    const events = await prisma.opportunityEvent.findMany({
      where: {
        opportunityId,
      },
    });

    expect(events).toHaveLength(0);
  });

  it("returns 404 for an opportunity outside the owner scope", async () => {
    const response = await POST(createRequest({ toStatus: "SUBMITTED" }, 1), {
      params: Promise.resolve({
        opportunityId: crypto.randomUUID(),
      }),
    });

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new CurrentOwnerError("Authentication is required"),
    );

    const response = await POST(createRequest({ toStatus: "SUBMITTED" }, 1), {
      params: Promise.resolve({ opportunityId }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
