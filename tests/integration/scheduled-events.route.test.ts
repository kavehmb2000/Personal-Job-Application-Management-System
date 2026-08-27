import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  GET as GET_EVENT,
  PATCH,
  DELETE,
} from "@/app/api/opportunities/[opportunityId]/scheduled-events/[scheduledEventId]/route";
import { POST } from "@/app/api/opportunities/[opportunityId]/scheduled-events/route";
import {
  GET as GET_CONTACTS,
  POST as ADD_CONTACT,
} from "@/app/api/opportunities/[opportunityId]/scheduled-events/[scheduledEventId]/contacts/route";

import { POST as addScheduledEventContact } from "@/app/api/opportunities/[opportunityId]/scheduled-events/[scheduledEventId]/contacts/route";

import { DELETE as deleteScheduledEventContact } from "@/app/api/opportunities/[opportunityId]/scheduled-events/[scheduledEventId]/contacts/[contactId]/route";

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

describe("ScheduledEvent routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `scheduled-events-${crypto.randomUUID()}`,
        displayName: "Scheduled Event Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `scheduled-events-other-${crypto.randomUUID()}`,
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

  function itemParams(scheduledEventId: string, id = opportunityId) {
    return {
      params: Promise.resolve({
        opportunityId: id,
        scheduledEventId,
      }),
    };
  }

  function contactParams(
    scheduledEventId: string,
    contactId: string,
    id = opportunityId,
  ) {
    return {
      params: Promise.resolve({
        opportunityId: id,
        scheduledEventId,
        contactId,
      }),
    };
  }

  function jsonRequest(url: string, method: string, body?: unknown) {
    return new Request(url, {
      method,
      headers:
        body !== undefined
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
          }
        : {}),
    });
  }

  it("creates a ScheduledEvent", async () => {
    const response = await POST(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events`,
        "POST",
        {
          type: "INTERVIEW",
          title: "Technical interview",
          scheduledAt: "2026-09-01T10:00:00.000Z",
          endAt: "2026-09-01T11:00:00.000Z",
          timeZone: "Europe/Istanbul",
          platform: "Google Meet",
          meetingUrl: "https://meet.example.com/interview",
          notesMarkdown: "Technical interview with the engineering team.",
        },
      ),
      collectionParams(),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.opportunityId).toBe(opportunityId);
    expect(body.type).toBe("INTERVIEW");
    expect(body.title).toBe("Technical interview");
    expect(body.scheduledAt).toBe("2026-09-01T10:00:00.000Z");
    expect(body.endAt).toBe("2026-09-01T11:00:00.000Z");
    expect(body.timeZone).toBe("Europe/Istanbul");
    expect(body.platform).toBe("Google Meet");
    expect(body.meetingUrl).toBe("https://meet.example.com/interview");

    const event = await prisma.scheduledEvent.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(event).not.toBeNull();
    expect(event?.opportunityId).toBe(opportunityId);
  });

  it("gets a ScheduledEvent by id", async () => {
    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "RECRUITER_CALL",
        title: "Recruiter call",
        scheduledAt: new Date("2026-09-02T12:00:00.000Z"),
        endAt: null,
        timeZone: "Europe/Istanbul",
        platform: "Phone",
        meetingUrl: null,
        notesMarkdown: "Initial recruiter conversation.",
      },
    });

    const response = await GET_EVENT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}`,
      ),
      itemParams(event.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(event.id);
    expect(body.type).toBe("RECRUITER_CALL");
    expect(body.title).toBe("Recruiter call");
  });

  it("updates a ScheduledEvent", async () => {
    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "RECRUITER_CALL",
        title: "Recruiter call",
        scheduledAt: new Date("2026-09-02T12:00:00.000Z"),
      },
    });

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}`,
        "PATCH",
        {
          type: "INTERVIEW",
          title: "Technical interview",
          scheduledAt: "2026-09-03T13:00:00.000Z",
          timeZone: "Europe/Istanbul",
          platform: "Google Meet",
        },
      ),
      itemParams(event.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(event.id);
    expect(body.type).toBe("INTERVIEW");
    expect(body.title).toBe("Technical interview");
    expect(body.scheduledAt).toBe("2026-09-03T13:00:00.000Z");
    expect(body.platform).toBe("Google Meet");
  });

  it("deletes a ScheduledEvent", async () => {
    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "FOLLOW_UP",
        title: "Follow-up",
        scheduledAt: new Date("2026-09-04T10:00:00.000Z"),
      },
    });

    const response = await DELETE(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}`,
        {
          method: "DELETE",
        },
      ),
      itemParams(event.id),
    );

    expect(response.status).toBe(204);

    const deleted = await prisma.scheduledEvent.findUnique({
      where: {
        id: event.id,
      },
    });

    expect(deleted).toBeNull();
  });

  it("adds a Contact to a ScheduledEvent", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
        organization: "Acme Corporation",
      },
    });

    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "INTERVIEW",
        title: "Recruiter interview",
        scheduledAt: new Date("2026-09-05T10:00:00.000Z"),
      },
    });

    const response = await ADD_CONTACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}/contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactId: contact.id,
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          scheduledEventId: event.id,
        }),
      },
    );

    expect(response.status).toBe(201);

    const association = await prisma.scheduledEventContact.findFirst({
      where: {
        scheduledEventId: event.id,
        contactId: contact.id,
      },
    });

    expect(association).not.toBeNull();
  });

  it("lists Contacts associated with a ScheduledEvent", async () => {
    const contact1 = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    const contact2 = await prisma.contact.create({
      data: {
        ownerId,
        name: "John Hiring Manager",
        roleType: "HIRING_MANAGER",
      },
    });

    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "INTERVIEW",
        title: "Panel interview",
        scheduledAt: new Date("2026-09-05T10:00:00.000Z"),
      },
    });

    await prisma.scheduledEventContact.createMany({
      data: [
        {
          scheduledEventId: event.id,
          contactId: contact1.id,
        },
        {
          scheduledEventId: event.id,
          contactId: contact2.id,
        },
      ],
    });

    const response = await GET_CONTACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}/contacts`,
      ),
      itemParams(event.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((contact: { id: string }) => contact.id)).toEqual(
      expect.arrayContaining([contact1.id, contact2.id]),
    );
  });

  it("removes a contact from a scheduled event", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "INTERVIEW",
        title: "Recruiter interview",
        scheduledAt: new Date("2026-09-05T10:00:00.000Z"),
      },
    });

    await prisma.scheduledEventContact.create({
      data: {
        scheduledEventId: event.id,
        contactId: contact.id,
      },
    });

    const response = await deleteScheduledEventContact(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}/contacts/${contact.id}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          scheduledEventId: event.id,
          contactId: contact.id,
        }),
      },
    );

    expect(response.status).toBe(204);

    const association = await prisma.scheduledEventContact.findFirst({
      where: {
        scheduledEventId: event.id,
        contactId: contact.id,
      },
    });

    expect(association).toBeNull();
  });

  it("does not expose another owner's ScheduledEvent", async () => {
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

    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId: otherOpportunity.id,
        type: "INTERVIEW",
        title: "Other owner's interview",
        scheduledAt: new Date("2026-09-06T10:00:00.000Z"),
      },
    });

    const response = await GET_EVENT(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/scheduled-events/${event.id}`,
      ),
      itemParams(event.id, otherOpportunity.id),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a Contact belonging to another owner", async () => {
    const otherContact = await prisma.contact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other Owner Contact",
        roleType: "RECRUITER",
      },
    });
    const event = await prisma.scheduledEvent.create({
      data: {
        opportunityId,
        type: "INTERVIEW",
        title: "Interview",
        scheduledAt: new Date("2026-09-07T10:00:00.000Z"),
      },
    });
    const response = await ADD_CONTACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events/${event.id}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: otherContact.id }),
        },
      ),
      {
        params: Promise.resolve({ opportunityId, scheduledEventId: event.id }),
      },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await POST(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events`,
        "POST",
        {
          type: "INTERVIEW",
          title: "Interview",
          scheduledAt: "2026-09-08T10:00:00.000Z",
        },
      ),
      collectionParams(),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid ScheduledEvent input", async () => {
    const response = await POST(
      jsonRequest(
        `http://localhost/api/opportunities/${opportunityId}/scheduled-events`,
        "POST",
        {
          type: "NOT_A_REAL_TYPE",
          title: "",
          scheduledAt: "not-a-date",
        },
      ),
      collectionParams(),
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
