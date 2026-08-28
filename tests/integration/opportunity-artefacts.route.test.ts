import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  GET as LIST_ARTEFACTS,
  POST as ADD_ARTEFACT,
} from "@/app/api/opportunities/[opportunityId]/artefacts/route";
import { DELETE as REMOVE_ARTEFACT } from "@/app/api/opportunities/[opportunityId]/artefacts/[artefactId]/route";

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

describe("Opportunity artefact routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;
  let statusId: string;

  beforeEach(async () => {
    await prisma.communicationArtefact.deleteMany();
    await prisma.eventArtefact.deleteMany();
    await prisma.opportunityArtefact.deleteMany();
    await prisma.artefact.deleteMany();
    await prisma.scheduledEventContact.deleteMany();
    await prisma.scheduledEvent.deleteMany();
    await prisma.opportunityContact.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.opportunity.deleteMany();
    await prisma.lifecycleTransition.deleteMany();
    await prisma.lifecycleStatus.deleteMany();

    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `opportunity-artefacts-${crypto.randomUUID()}`,
        displayName: "Opportunity Artefacts Test Owner",
      },
    });

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        email: `${crypto.randomUUID()}@example.com`,
        googleSubject: `opportunity-artefacts-other-${crypto.randomUUID()}`,
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

    statusId = status.id;

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: statusId,
      },
    });

    opportunityId = opportunity.id;

    mockGetCurrentOwner.mockResolvedValue(owner);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function opportunityParams(opportunity = opportunityId) {
    return {
      params: Promise.resolve({
        opportunityId: opportunity,
      }),
    };
  }

  function opportunityArtefactParams(
    opportunity = opportunityId,
    artefactId: string,
  ) {
    return {
      params: Promise.resolve({
        opportunityId: opportunity,
        artefactId,
      }),
    };
  }
  function params(opportunity = opportunityId, artefactId?: string) {
    return {
      params: Promise.resolve({
        opportunityId: opportunity,
        ...(artefactId ? { artefactId } : {}),
      }),
    };
  }

  function postRequest(body: unknown, opportunity = opportunityId) {
    return new Request(
      `http://localhost/api/opportunities/${opportunity}/artefacts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  }

  it("adds an Artefact to an Opportunity", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "My CV",
        storageReference: "test/my-cv.pdf",
      },
    });

    const response = await ADD_ARTEFACT(
      postRequest({
        artefactId: artefact.id,
      }),
      opportunityParams(),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      opportunityId,
      artefactId: artefact.id,
    });

    const association = await prisma.opportunityArtefact.findUnique({
      where: {
        opportunityId_artefactId: {
          opportunityId,
          artefactId: artefact.id,
        },
      },
    });

    expect(association).not.toBeNull();
    expect(association?.opportunityId).toBe(opportunityId);
    expect(association?.artefactId).toBe(artefact.id);
  });

  it("lists Artefacts associated with an Opportunity", async () => {
    const firstArtefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "First CV",
        storageReference: "test/first-cv.pdf",
      },
    });

    const secondArtefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "JOB_DESCRIPTION",
        name: "Job Description",
        storageReference: "test/job-description.pdf",
      },
    });

    await prisma.opportunityArtefact.createMany({
      data: [
        {
          opportunityId,
          artefactId: firstArtefact.id,
        },
        {
          opportunityId,
          artefactId: secondArtefact.id,
        },
      ],
    });

    const response = await LIST_ARTEFACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts`,
      ),
      params(),
    );

    //expect(response.status).toBe(200);
    if (response.status === 500) {
      console.log(await response.clone().text());
    }

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveLength(2);
    expect(body.map((artefact: { id: string }) => artefact.id)).toEqual(
      expect.arrayContaining([firstArtefact.id, secondArtefact.id]),
    );
  });

  it("does not return Artefacts belonging to another Opportunity", async () => {
    const otherOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Other Corporation",
        positionTitle: "Other Engineer",
        statusId: statusId,
      },
    });

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "Private CV",
        storageReference: "test/private-cv.pdf",
      },
    });

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId: otherOpportunity.id,
        artefactId: artefact.id,
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts`,
      ),
      params(),
    );

    //expect(response.status).toBe(200);
    if (response.status === 500) {
      console.log(await response.clone().text());
    }

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual([]);
  });

  it("does not expose Artefacts associated with another owner's Opportunity", async () => {
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

    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        type: "CV",
        name: "Other owner's CV",
        storageReference: "test/other-owner-cv.pdf",
      },
    });

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId: otherOpportunity.id,
        artefactId: artefact.id,
      },
    });

    const response = await LIST_ARTEFACTS(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/artefacts`,
      ),
      opportunityParams(otherOpportunity.id),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects adding an Artefact belonging to another owner", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        type: "CV",
        name: "Other owner's CV",
        storageReference: "test/other-owner-cv.pdf",
      },
    });

    const response = await ADD_ARTEFACT(
      postRequest({
        artefactId: artefact.id,
      }),
      opportunityParams(),
    );

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects adding an Artefact to another owner's Opportunity", async () => {
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

    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "My CV",
        storageReference: "test/my-cv.pdf",
      },
    });

    const response = await ADD_ARTEFACT(
      postRequest(
        {
          artefactId: artefact.id,
        },
        otherOpportunity.id,
      ),
      opportunityParams(otherOpportunity.id),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("removes an Artefact from an Opportunity", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId,
        type: "CV",
        name: "CV to remove",
        storageReference: "test/remove-cv.pdf",
      },
    });

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId,
        artefactId: artefact.id,
      },
    });

    const response = await REMOVE_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts/${artefact.id}`,
        {
          method: "DELETE",
        },
      ),
      opportunityArtefactParams(opportunityId, artefact.id),
    );

    expect(response.status).toBe(204);

    const association = await prisma.opportunityArtefact.findUnique({
      where: {
        opportunityId_artefactId: {
          opportunityId,
          artefactId: artefact.id,
        },
      },
    });

    expect(association).toBeNull();
  });

  it("does not remove an Artefact outside the owner scope", async () => {
    const artefact = await prisma.artefact.create({
      data: {
        ownerId: otherOwnerId,
        type: "CV",
        name: "Other owner's CV",
        storageReference: "test/other-owner-cv.pdf",
      },
    });

    await prisma.opportunityArtefact.create({
      data: {
        opportunityId,
        artefactId: artefact.id,
      },
    });

    const response = await REMOVE_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts/${artefact.id}`,
        {
          method: "DELETE",
        },
      ),
      opportunityArtefactParams(opportunityId, artefact.id),
    );

    expect(response.status).toBe(403);

    const association = await prisma.opportunityArtefact.findUnique({
      where: {
        opportunityId_artefactId: {
          opportunityId,
          artefactId: artefact.id,
        },
      },
    });

    expect(association).not.toBeNull();
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockGetCurrentOwner.mockRejectedValue(
      new MockCurrentOwnerError("Authentication is required"),
    );

    const response = await LIST_ARTEFACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts`,
      ),
      opportunityParams(),
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for an invalid Opportunity id", async () => {
    const response = await LIST_ARTEFACTS(
      new Request("http://localhost/api/opportunities/not-a-uuid/artefacts"),
      opportunityParams("not-a-uuid"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid Artefact input", async () => {
    const response = await ADD_ARTEFACT(
      postRequest({
        artefactId: "not-a-uuid",
      }),
      opportunityParams(),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid Artefact id on DELETE", async () => {
    const response = await REMOVE_ARTEFACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/artefacts/not-a-uuid`,
        {
          method: "DELETE",
        },
      ),
      opportunityArtefactParams(opportunityId, "not-a-uuid"),
    );

    expect(response.status).toBe(400);
  });
});
