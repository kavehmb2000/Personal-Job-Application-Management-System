import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContactService } from "@/lib/services/contact-service";

describe("ContactService", () => {
  const ownerA = "contact-service-owner-a";
  const ownerB = "contact-service-owner-b";

  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addToOpportunity: vi.fn(),
    removeFromOpportunity: vi.fn(),
    getForOpportunity: vi.fn(),
  };

  let service: ContactService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContactService(repository as any);
  });

  it("creates a Contact for the owner", async () => {
    const created = {
      id: "contact-1",
      ownerId: ownerA,
      name: "Jane Recruiter",
      email: "jane@example.com",
      phone: null,
      companyName: "Acme",
      jobTitle: "Recruiter",
      notesMarkdown: null,
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, {
      name: "Jane Recruiter",
      email: "jane@example.com",
      organization: "Acme",
      roleType: "RECRUITER",
    });

    expect(repository.create).toHaveBeenCalledWith(ownerA, {
      name: "Jane Recruiter",
      email: "jane@example.com",
      organization: "Acme",
      roleType: "RECRUITER",
    });

    expect(result).toBe(created);
  });

  it("gets a Contact within the owner's scope", async () => {
    const contact = {
      id: "contact-1",
      ownerId: ownerA,
      name: "Jane Recruiter",
    };

    repository.getById.mockResolvedValue(contact);

    const result = await service.getById(ownerA, "contact-1");

    expect(repository.getById).toHaveBeenCalledWith(ownerA, "contact-1");

    expect(result).toBe(contact);
  });

  it("updates a Contact within the owner's scope", async () => {
    const updated = {
      id: "contact-1",
      ownerId: ownerA,
      name: "Jane Smith",
      email: "jane.smith@example.com",
    };

    repository.update.mockResolvedValue(updated);

    const result = await service.update(ownerA, "contact-1", {
      name: "Jane Smith",
      email: "jane.smith@example.com",
    });

    expect(repository.update).toHaveBeenCalledWith(ownerA, "contact-1", {
      name: "Jane Smith",
      email: "jane.smith@example.com",
    });

    expect(result).toBe(updated);
  });

  it("adds a Contact to an Opportunity", async () => {
    const association = {
      id: "opportunity-contact-1",
      opportunityId: "opportunity-1",
      contactId: "contact-1",
    };

    repository.addToOpportunity.mockResolvedValue(association);

    const result = await service.addToOpportunity(
      ownerA,
      "opportunity-1",
      "contact-1",
    );

    expect(repository.addToOpportunity).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "contact-1",
    );

    expect(result).toBe(association);
  });

  it("removes a Contact from an Opportunity", async () => {
    repository.removeFromOpportunity.mockResolvedValue(undefined);

    await service.removeFromOpportunity(ownerA, "opportunity-1", "contact-1");

    expect(repository.removeFromOpportunity).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "contact-1",
    );
  });

  it("gets Contacts associated with an Opportunity", async () => {
    const contacts = [
      {
        id: "contact-1",
        ownerId: ownerA,
        name: "Jane Recruiter",
      },
      {
        id: "contact-2",
        ownerId: ownerA,
        name: "John Hiring Manager",
      },
    ];

    repository.getForOpportunity.mockResolvedValue(contacts);

    const result = await service.getForOpportunity(ownerA, "opportunity-1");

    expect(repository.getForOpportunity).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
    );

    expect(result).toBe(contacts);
  });

  it("passes owner scope to every operation", async () => {
    repository.create.mockResolvedValue({});
    repository.getById.mockResolvedValue({});
    repository.update.mockResolvedValue({});
    repository.addToOpportunity.mockResolvedValue({});
    repository.removeFromOpportunity.mockResolvedValue(undefined);
    repository.getForOpportunity.mockResolvedValue([]);

    await service.create(ownerB, {
      name: "Contact B",
    });

    await service.getById(ownerB, "contact-1");

    await service.update(ownerB, "contact-1", {
      name: "Updated Contact B",
    });

    await service.addToOpportunity(ownerB, "opportunity-1", "contact-1");

    await service.removeFromOpportunity(ownerB, "opportunity-1", "contact-1");

    await service.getForOpportunity(ownerB, "opportunity-1");

    expect(repository.create).toHaveBeenCalledWith(ownerB, expect.any(Object));

    expect(repository.getById).toHaveBeenCalledWith(ownerB, "contact-1");

    expect(repository.update).toHaveBeenCalledWith(
      ownerB,
      "contact-1",
      expect.any(Object),
    );

    expect(repository.addToOpportunity).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "contact-1",
    );

    expect(repository.removeFromOpportunity).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "contact-1",
    );

    expect(repository.getForOpportunity).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
    );
  });

  it("does not introduce lifecycle transition behavior", () => {
    expect("transition" in service).toBe(false);
  });
});
