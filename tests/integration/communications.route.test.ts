import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";

import {
  GET as LIST_COMMUNICATIONS,
  POST as CREATE_COMMUNICATION,
} from "@/app/api/opportunities/[opportunityId]/communications/route";
import {
  DELETE as DELETE_COMMUNICATION,
  GET as GET_COMMUNICATION,
  PATCH as UPDATE_COMMUNICATION,
} from "@/app/api/opportunities/[opportunityId]/communications/[communicationId]/route";
import {
  DELETE as REMOVE_ARTEFACT,
  GET as LIST_ARTEFACTS,
  POST as ADD_ARTEFACT,
} from "@/app/api/opportunities/[opportunityId]/communications/[communicationId]/artefacts/route";

vi.mock("@/lib/auth/current-owner", () => ({
  getCurrentOwner: vi.fn(),
  CurrentOwnerError: class CurrentOwnerError extends Error {},
}));

const mockedGetCurrentOwner = vi.mocked(getCurrentOwner);

describe("Communication routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    await prisma.communicationArtefact.deleteMany();
    await prisma.communication.deleteMany();
    await prisma.eventArtefact.deleteMany();
    await prisma.artefact.deleteMany();
    await prisma.scheduledEventContact.deleteMany();
    await prisma.scheduledEvent.deleteMany();
    await prisma.opportunityContact.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.opportunity.deleteMany();
    await prisma.lifecycleStatus.deleteMany();

    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `communications-${crypto.randomUUID()}`,
        displayName: "Communications Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `communications-other-${crypto.randomUUID()}`,
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

    mockedGetCurrentOwner.mockResolvedValue(owner);
  });

  it("creates a Communication", async () => {
    const occurredAt = "2026-09-01T10:00:00.000Z";

    const response = await CREATE_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occurredAt,
            contact: "Jane Recruiter",
            subject: "Interview confirmation",
            bodyMarkdown: "The interview is confirmed.",
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      opportunityId,
      contact: "Jane Recruiter",
      subject: "Interview confirmation",
      bodyMarkdown: "The interview is confirmed.",
    });

    expect(new Date(body.occurredAt).toISOString()).toBe(occurredAt);

    const communication = await prisma.communication.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(communication).not.toBeNull();
    expect(communication?.opportunityId).toBe(opportunityId);
  });

  it("lists Communications for an Opportunity", async () => {
    const first = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        contact: "Jane Recruiter",
        subject: "First contact",
        bodyMarkdown: "First message",
      },
    });

    const second = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-02T10:00:00.000Z"),
        contact: "Jane Recruiter",
        subject: "Second contact",
        bodyMarkdown: "Second message",
      },
    });

    const response = await LIST_COMMUNICATIONS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications`,
      ),
      {
        params: Promise.resolve({
          opportunityId,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((item: { id: string }) => item.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it("gets a Communication by id", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        contact: "Jane Recruiter",
        subject: "Interview confirmation",
        bodyMarkdown: "Confirmed.",
      },
    });

    const response = await GET_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}`,
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      id: communication.id,
      opportunityId,
      contact: "Jane Recruiter",
      subject: "Interview confirmation",
      bodyMarkdown: "Confirmed.",
    });
  });

  it("does not expose another owner's Communication", async () => {
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

    const communication = await prisma.communication.create({
      data: {
        opportunityId: otherOpportunity.id,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "Private communication",
        bodyMarkdown: "Private message",
      },
    });

    const response = await GET_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/communications/${communication.id}`,
      ),
      {
        params: Promise.resolve({
          opportunityId: otherOpportunity.id,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("updates a Communication", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        contact: "Jane Recruiter",
        subject: "Original subject",
        bodyMarkdown: "Original message",
      },
    });

    const newOccurredAt = "2026-09-03T14:30:00.000Z";

    const response = await UPDATE_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occurredAt: newOccurredAt,
            subject: "Updated subject",
            bodyMarkdown: "Updated message",
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      id: communication.id,
      opportunityId,
      contact: "Jane Recruiter",
      subject: "Updated subject",
      bodyMarkdown: "Updated message",
    });

    expect(new Date(body.occurredAt).toISOString()).toBe(newOccurredAt);

    const updated = await prisma.communication.findUnique({
      where: {
        id: communication.id,
      },
    });

    expect(updated?.subject).toBe("Updated subject");
    expect(updated?.bodyMarkdown).toBe("Updated message");
  });

  it("deletes a Communication", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "To be deleted",
      },
    });

    const response = await DELETE_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(204);

    const deleted = await prisma.communication.findUnique({
      where: {
        id: communication.id,
      },
    });

    expect(deleted).toBeNull();
  });

  it("rejects creating a Communication for another owner's Opportunity", async () => {
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

    const response = await CREATE_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/communications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occurredAt: "2026-09-01T10:00:00.000Z",
            subject: "Should not be created",
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId: otherOpportunity.id,
        }),
      },
    );

    expect(response.status).toBe(500);
  });

  it("adds an Artefact to a Communication", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "Interview confirmation",
      },
    });

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "CV",
        storageReference: "test/resume.pdf",
      },
    });

    const response = await ADD_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}/artefacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artefactId: artefact.id,
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      communicationId: communication.id,
      artefactId: artefact.id,
    });

    const association = await prisma.communicationArtefact.findFirst({
      where: {
        communicationId: communication.id,
        artefactId: artefact.id,
      },
    });

    expect(association).not.toBeNull();
  });

  it("lists Artefacts associated with a Communication", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "Interview confirmation",
      },
    });

    const firstArtefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "first.pdf",
        mimeType: "application/pdf",
        type: "JOB_DESCRIPTION",
        storageReference: "test/first.pdf",
      },
    });

    const secondArtefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "second.pdf",
        mimeType: "application/pdf",
        type: "JOB_DESCRIPTION",
        storageReference: "test/second.pdf",
      },
    });

    await prisma.communicationArtefact.createMany({
      data: [
        {
          communicationId: communication.id,
          artefactId: firstArtefact.id,
        },
        {
          communicationId: communication.id,
          artefactId: secondArtefact.id,
        },
      ],
    });

    const response = await LIST_ARTEFACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}/artefacts`,
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((artefact: { id: string }) => artefact.id)).toEqual(
      expect.arrayContaining([firstArtefact.id, secondArtefact.id]),
    );
  });

  it("removes an Artefact from a Communication", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "Interview confirmation",
      },
    });

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "to-remove.pdf",
        mimeType: "application/pdf",
        type: "JOB_DESCRIPTION",
        storageReference: `communications/${crypto.randomUUID()}`,
      },
    });

    await prisma.communicationArtefact.create({
      data: {
        communicationId: communication.id,
        artefactId: artefact.id,
      },
    });

    const response = await REMOVE_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}/artefacts`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artefactId: artefact.id,
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(204);

    const association = await prisma.communicationArtefact.findFirst({
      where: {
        communicationId: communication.id,
        artefactId: artefact.id,
      },
    });

    expect(association).toBeNull();
  });

  it("rejects adding an Artefact belonging to another owner", async () => {
    const communication = await prisma.communication.create({
      data: {
        opportunityId,
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        subject: "Interview confirmation",
      },
    });

    const otherArtefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        name: "other-owner.pdf",
        mimeType: "application/pdf",
        type: "COVER_LETTER",
        storageReference: `communications/${crypto.randomUUID()}`,
      },
    });

    const response = await ADD_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications/${communication.id}/artefacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artefactId: otherArtefact.id,
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          communicationId: communication.id,
        }),
      },
    );

    expect(response.status).toBe(500);
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockedGetCurrentOwner.mockRejectedValue(
      new CurrentOwnerError("Current owner could not be resolved"),
    );

    const response = await LIST_COMMUNICATIONS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications`,
      ),
      {
        params: Promise.resolve({
          opportunityId,
        }),
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid Communication input", async () => {
    const response = await CREATE_COMMUNICATION(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/communications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occurredAt: "not-a-date",
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});
