import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";

import {
  GET as LIST_ARTEFACTS,
  POST as CREATE_ARTEFACT,
} from "@/app/api/artefacts/route";
import {
  DELETE as ARCHIVE_ARTEFACT,
  GET as GET_ARTEFACT,
} from "@/app/api/artefacts/[artefactId]/route";

vi.mock("@/lib/auth/current-owner", () => ({
  getCurrentOwner: vi.fn(),
  CurrentOwnerError: class CurrentOwnerError extends Error {},
}));

const mockedGetCurrentOwner = vi.mocked(getCurrentOwner);

describe("Artefact routes", () => {
  let ownerId: string;
  let otherOwnerId: string;

  beforeEach(async () => {
    await prisma.communicationArtefact.deleteMany();
    await prisma.eventArtefact.deleteMany();
    await prisma.opportunityArtefact.deleteMany();
    await prisma.artefact.deleteMany();

    await prisma.submission.deleteMany();
    await prisma.communication.deleteMany();
    await prisma.scheduledEventContact.deleteMany();
    await prisma.scheduledEvent.deleteMany();
    await prisma.opportunityContact.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.opportunity.deleteMany();
    await prisma.lifecycleStatus.deleteMany();

    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `artefacts-${crypto.randomUUID()}`,
        displayName: "Artefacts Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `artefacts-other-${crypto.randomUUID()}`,
        displayName: "Other Owner",
      },
    });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    mockedGetCurrentOwner.mockResolvedValue(owner);
  });

  it("creates an Artefact", async () => {
    const response = await CREATE_ARTEFACT(
      new Request("http://localhost/api/artefacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Senior Software Engineer CV",
          type: "CV",
          description: "CV tailored for the application",
          contentMarkdown: "# Kaveh Moghimbeigi\n\nSenior Software Engineer",
          mimeType: "text/markdown",
        }),
      }),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      ownerId,
      name: "Senior Software Engineer CV",
      type: "CV",
      description: "CV tailored for the application",
      contentMarkdown: "# Kaveh Moghimbeigi\n\nSenior Software Engineer",
      mimeType: "text/markdown",
      externalUrl: null,
      storageProvider: null,
      storageReference: null,
      archivedAt: null,
    });

    const artefact = await prisma.artefact.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(artefact).not.toBeNull();
    expect(artefact?.ownerId).toBe(ownerId);
    expect(artefact?.type).toBe("CV");
  });

  it("lists Artefacts for the current owner", async () => {
    const first = await prisma.artefact.create({
      data: {
        ownerId,
        name: "CV",
        type: "CV",
        contentMarkdown: "# CV",
      },
    });

    const second = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Job Description",
        type: "JOB_DESCRIPTION",
        externalUrl: "https://example.com/job",
      },
    });

    await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other Owner CV",
        type: "CV",
        contentMarkdown: "# Private CV",
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/artefacts"),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((artefact: { id: string }) => artefact.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );

    expect(
      body.every(
        (artefact: { ownerId: string }) => artefact.ownerId === ownerId,
      ),
    ).toBe(true);
  });

  it("filters the Artefact list by type", async () => {
    const cv = await prisma.artefact.create({
      data: {
        ownerId,
        name: "CV",
        type: "CV",
        contentMarkdown: "# CV",
      },
    });

    await prisma.artefact.create({
      data: {
        ownerId,
        name: "Job Description",
        type: "JOB_DESCRIPTION",
        externalUrl: "https://example.com/job",
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/artefacts?type=CV"),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(cv.id);
    expect(body[0].type).toBe("CV");
  });

  it("does not include archived Artefacts by default", async () => {
    const active = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Active CV",
        type: "CV",
        contentMarkdown: "# Active CV",
      },
    });

    await prisma.artefact.create({
      data: {
        ownerId,
        name: "Archived CV",
        type: "CV",
        contentMarkdown: "# Archived CV",
        archivedAt: new Date(),
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/artefacts"),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(active.id);
  });

  it("includes archived Artefacts when requested", async () => {
    const active = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Active CV",
        type: "CV",
        contentMarkdown: "# Active CV",
      },
    });

    const archived = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Archived CV",
        type: "CV",
        contentMarkdown: "# Archived CV",
        archivedAt: new Date(),
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/artefacts?includeArchived=true"),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((artefact: { id: string }) => artefact.id)).toEqual(
      expect.arrayContaining([active.id, archived.id]),
    );
  });

  it("gets an Artefact by id", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "Portfolio Evidence",
        type: "PORTFOLIO_EVIDENCE",
        storageReference: "test/portfolio-evidence.pdf",
        mimeType: "application/pdf",
      },
    });

    const response = await GET_ARTEFACT(
      new Request(`http://localhost/api/artefacts/${artefact.id}`),
      {
        params: Promise.resolve({
          artefactId: artefact.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      id: artefact.id,
      ownerId,
      name: "Portfolio Evidence",
      type: "PORTFOLIO_EVIDENCE",
      storageReference: "test/portfolio-evidence.pdf",
      mimeType: "application/pdf",
    });
  });

  it("does not expose another owner's Artefact", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Private CV",
        type: "CV",
        contentMarkdown: "# Private CV",
      },
    });

    const response = await GET_ARTEFACT(
      new Request(`http://localhost/api/artefacts/${artefact.id}`),
      {
        params: Promise.resolve({
          artefactId: artefact.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("archives an Artefact", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        name: "CV to archive",
        type: "CV",
        contentMarkdown: "# CV",
      },
    });

    const response = await ARCHIVE_ARTEFACT(
      new Request(`http://localhost/api/artefacts/${artefact.id}`, {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          artefactId: artefact.id,
        }),
      },
    );

    expect(response.status).toBe(204);

    const archived = await prisma.artefact.findUnique({
      where: {
        id: artefact.id,
      },
    });

    expect(archived).not.toBeNull();
    expect(archived?.archivedAt).not.toBeNull();
  });

  it("does not archive another owner's Artefact", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Private CV",
        type: "CV",
        contentMarkdown: "# Private CV",
      },
    });

    const response = await ARCHIVE_ARTEFACT(
      new Request(`http://localhost/api/artefacts/${artefact.id}`, {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          artefactId: artefact.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const unchanged = await prisma.artefact.findUnique({
      where: {
        id: artefact.id,
      },
    });

    expect(unchanged?.archivedAt).toBeNull();
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockedGetCurrentOwner.mockRejectedValueOnce(
      new CurrentOwnerError("No current owner"),
    );

    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/artefacts"),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid Artefact input", async () => {
    const response = await CREATE_ARTEFACT(
      new Request("http://localhost/api/artefacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Invalid Artefact",
          type: "NOT_A_REAL_ARTEFACT_TYPE",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
