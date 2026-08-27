import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  POST,
  GET,
} from "@/app/api/opportunities/[opportunityId]/events/route";

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

describe("Opportunity events routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `events-${Date.now()}-${Math.random()}`,
        displayName: "Events Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `events-other-${Date.now()}-${Math.random()}`,
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

    mockGetCurrentOwner.mockResolvedValue(owner);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function params(id = opportunityId) {
    return {
      params: Promise.resolve({
        opportunityId: id,
      }),
    };
  }

  function postRequest(body: unknown, id = opportunityId) {
    return new Request(`http://localhost/api/opportunities/${id}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("creates a user-generated OpportunityEvent", async () => {
    const response = await POST(
      postRequest({
        occurredAt: "2026-08-26T10:00:00.000Z",
        type: "COMMUNICATION",
        title: "Recruiter contacted me",
        descriptionMarkdown: "Recruiter sent an email.",
      }),
      params(),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.opportunityId).toBe(opportunityId);
    expect(body.occurredAt).toBe("2026-08-26T10:00:00.000Z");
    expect(body.type).toBe("COMMUNICATION");
    expect(body.title).toBe("Recruiter contacted me");
    expect(body.descriptionMarkdown).toBe("Recruiter sent an email.");
    expect(body.systemGenerated).toBe(false);

    const event = await prisma.opportunityEvent.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(event).not.toBeNull();
    expect(event?.opportunityId).toBe(opportunityId);
    expect(event?.systemGenerated).toBe(false);
  });

  it("creates an event with artefacts", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "PRESENTATION",
        name: "Candidate's presentation",
      },
    });

    const response = await POST(
      postRequest({
        occurredAt: "2026-08-26T11:00:00.000Z",
        type: "COMMUNICATION",
        title: "Recruiter email",
        artefactIds: [artefact.id],
      }),
      params(),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.artefacts).toHaveLength(1);
    expect(body.artefacts[0].artefact.id).toBe(artefact.id);
  });

  it("returns 404 for an opportunity outside the owner scope", async () => {
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

    const response = await POST(
      postRequest(
        {
          occurredAt: "2026-08-26T10:00:00.000Z",
          type: "COMMUNICATION",
          title: "Should not be created",
        },
        otherOpportunity.id,
      ),
      params(otherOpportunity.id),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when an artefact belongs to another owner", async () => {
    const otherArtefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        type: "CV",
        name: "Other owner's CV",
      },
    });

    const response = await POST(
      postRequest({
        occurredAt: "2026-08-26T10:00:00.000Z",
        type: "COMMUNICATION",
        title: "Invalid artefact",
        artefactIds: [otherArtefact.id],
      }),
      params(),
    );

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for an invalid event type", async () => {
    const response = await POST(
      postRequest({
        occurredAt: "2026-08-26T10:00:00.000Z",
        type: "NOT_A_REAL_EVENT_TYPE",
        title: "Invalid event",
      }),
      params(),
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await POST(
      postRequest({
        occurredAt: "2026-08-26T10:00:00.000Z",
        type: "NOTE_ADDED",
        title: "Should not be created",
      }),
      params(),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("lists events for the opportunity", async () => {
    await prisma.opportunityEvent.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-08-26T10:00:00.000Z"),
        type: "CHALLENGE_RECEIVED",
        title: "First event",
        descriptionMarkdown: null,
        systemGenerated: false,
      },
    });

    await prisma.opportunityEvent.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-08-26T11:00:00.000Z"),
        type: "LANGUAGE_PROOF_REQUESTED",
        title: "Second event",
        descriptionMarkdown: "Language competency",
        systemGenerated: false,
      },
    });

    const response = await GET(
      new Request(`http://localhost/api/opportunities/${opportunityId}/events`),
      params(),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("First event");
    expect(body[1].title).toBe("Second event");
  });

  it("does not return events belonging to another owner", async () => {
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

    await prisma.opportunityEvent.create({
      data: {
        opportunityId: otherOpportunity.id,
        occurredAt: new Date("2026-08-26T10:00:00.000Z"),
        type: "COMMUNICATION",
        title: "Other owner's event",
        descriptionMarkdown: null,
        systemGenerated: false,
      },
    });

    const response = await GET(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/events`,
      ),
      params(otherOpportunity.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual([]);
  });

  it("returns 401 when listing events without an owner", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await GET(
      new Request(`http://localhost/api/opportunities/${opportunityId}/events`),
      params(),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
