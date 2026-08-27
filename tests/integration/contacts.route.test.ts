import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { CurrentOwnerError } from "@/lib/auth/current-owner";

import { POST as CREATE_CONTACT } from "@/app/api/contacts/route";
import {
  GET as GET_CONTACT,
  PATCH as UPDATE_CONTACT,
} from "@/app/api/contacts/[contactId]/route";
import {
  GET as LIST_OPPORTUNITY_CONTACTS,
  POST as ADD_OPPORTUNITY_CONTACT,
} from "@/app/api/opportunities/[opportunityId]/contacts/route";
import { DELETE as REMOVE_OPPORTUNITY_CONTACT } from "@/app/api/opportunities/[opportunityId]/contacts/[contactId]/route";

vi.mock("@/lib/auth/current-owner", () => ({
  getCurrentOwner: vi.fn(),
  CurrentOwnerError: class CurrentOwnerError extends Error {},
}));

import { getCurrentOwner } from "@/lib/auth/current-owner";

const mockedGetCurrentOwner = vi.mocked(getCurrentOwner);

describe("Contact routes", () => {
  let ownerId: string;
  let otherOwnerId: string;
  let opportunityId: string;

  beforeEach(async () => {
    await prisma.scheduledEventContact.deleteMany();
    await prisma.opportunityContact.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.opportunity.deleteMany();

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

    mockedGetCurrentOwner.mockResolvedValue(owner);
  });

  it("creates a Contact", async () => {
    const response = await CREATE_CONTACT(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Jane Recruiter",
          roleType: "RECRUITER",
          organization: "Acme Corp",
          email: "jane@example.com",
          phone: "+123456789",
          profileUrl: "https://example.com/jane",
          notes: "Primary recruiter",
        }),
      }),
      {
        params: Promise.resolve({}),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      ownerId,
      name: "Jane Recruiter",
      roleType: "RECRUITER",
      organization: "Acme Corp",
      email: "jane@example.com",
      phone: "+123456789",
      profileUrl: "https://example.com/jane",
      notes: "Primary recruiter",
    });

    const contact = await prisma.contact.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.ownerId).toBe(ownerId);
  });

  it("gets a Contact by id", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    const response = await GET_CONTACT(
      new Request(`http://localhost/api/contacts/${contact.id}`),
      {
        params: Promise.resolve({
          contactId: contact.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      id: contact.id,
      ownerId,
      name: "Jane Recruiter",
      roleType: "RECRUITER",
    });
  });

  it("does not expose another owner's Contact", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other Owner Contact",
        roleType: "RECRUITER",
      },
    });

    const response = await GET_CONTACT(
      new Request(`http://localhost/api/contacts/${contact.id}`),
      {
        params: Promise.resolve({
          contactId: contact.id,
        }),
      },
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("updates a Contact", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
        organization: "Old Company",
      },
    });

    const response = await UPDATE_CONTACT(
      new Request(`http://localhost/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Jane Hiring Manager",
          roleType: "HIRING_MANAGER",
          organization: "New Company",
        }),
      }),
      {
        params: Promise.resolve({
          contactId: contact.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      id: contact.id,
      ownerId,
      name: "Jane Hiring Manager",
      roleType: "HIRING_MANAGER",
      organization: "New Company",
    });

    const updated = await prisma.contact.findUnique({
      where: {
        id: contact.id,
      },
    });

    expect(updated?.name).toBe("Jane Hiring Manager");
    expect(updated?.roleType).toBe("HIRING_MANAGER");
    expect(updated?.organization).toBe("New Company");
  });

  it("lists Contacts associated with an Opportunity", async () => {
    const firstContact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    const secondContact = await prisma.contact.create({
      data: {
        ownerId,
        name: "John Hiring Manager",
        roleType: "HIRING_MANAGER",
      },
    });

    await prisma.opportunityContact.createMany({
      data: [
        {
          opportunityId,
          contactId: firstContact.id,
        },
        {
          opportunityId,
          contactId: secondContact.id,
        },
      ],
    });

    const response = await LIST_OPPORTUNITY_CONTACTS(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/contacts`,
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
    expect(body.map((contact: { id: string }) => contact.id)).toEqual(
      expect.arrayContaining([firstContact.id, secondContact.id]),
    );
  });

  it("adds a Contact to an Opportunity", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    const response = await ADD_OPPORTUNITY_CONTACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/contacts`,
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
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      opportunityId,
      contactId: contact.id,
    });

    const association = await prisma.opportunityContact.findFirst({
      where: {
        opportunityId,
        contactId: contact.id,
      },
    });

    expect(association).not.toBeNull();
  });

  it("removes a Contact from an Opportunity", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
      },
    });

    await prisma.opportunityContact.create({
      data: {
        opportunityId,
        contactId: contact.id,
      },
    });

    const response = await REMOVE_OPPORTUNITY_CONTACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/contacts/${contact.id}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
          contactId: contact.id,
        }),
      },
    );

    expect(response.status).toBe(204);

    const association = await prisma.opportunityContact.findFirst({
      where: {
        opportunityId,
        contactId: contact.id,
      },
    });

    expect(association).toBeNull();
  });

  it("rejects adding a Contact belonging to another owner", async () => {
    const otherContact = await prisma.contact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other Owner Contact",
        roleType: "RECRUITER",
      },
    });

    const response = await ADD_OPPORTUNITY_CONTACT(
      new Request(
        `http://localhost/api/opportunities/${opportunityId}/contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactId: otherContact.id,
          }),
        },
      ),
      {
        params: Promise.resolve({
          opportunityId,
        }),
      },
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("does not expose another owner's Opportunity contacts", async () => {
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

    const contact = await prisma.contact.create({
      data: {
        ownerId: otherOwnerId,
        name: "Other Owner Contact",
        roleType: "RECRUITER",
      },
    });

    await prisma.opportunityContact.create({
      data: {
        opportunityId: otherOpportunity.id,
        contactId: contact.id,
      },
    });

    const response = await LIST_OPPORTUNITY_CONTACTS(
      new Request(
        `http://localhost/api/opportunities/${otherOpportunity.id}/contacts`,
      ),
      {
        params: Promise.resolve({
          opportunityId: otherOpportunity.id,
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual([]);
  });

  it("returns 401 when the current owner cannot be resolved", async () => {
    mockedGetCurrentOwner.mockRejectedValue(
      new CurrentOwnerError("Current owner could not be resolved"),
    );

    const response = await CREATE_CONTACT(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Jane Recruiter",
        }),
      }),
      {
        params: Promise.resolve({}),
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid Contact input", async () => {
    const response = await CREATE_CONTACT(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "",
          roleType: "INVALID_ROLE",
        }),
      }),
      {
        params: Promise.resolve({}),
      },
    );

    expect(response.status).toBe(400);
  });
});
