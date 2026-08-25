import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommunicationService } from "@/lib/services/communication-service";

describe("CommunicationService", () => {
  const ownerA = "communication-service-owner-a";
  const ownerB = "communication-service-owner-b";

  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    addArtefact: vi.fn(),
    removeArtefact: vi.fn(),
    getArtefacts: vi.fn(),
  };

  let service: CommunicationService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new CommunicationService(repository as any);
  });

  it("creates a Communication for an Opportunity", async () => {
    const occurredAt = new Date("2026-08-21T10:00:00.000Z");

    const input = {
      occurredAt,
      contact: "marc@mistral.ai",
      subject: "Question about the position",
      bodyMarkdown: "Hello Marc, ...",
    };

    const created = {
      id: "communication-1",
      opportunityId: "opportunity-1",
      ...input,
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, "opportunity-1", input);

    expect(repository.create).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      input,
    );

    expect(result).toBe(created);
  });

  it("supports a Communication without optional fields", async () => {
    const input = {
      occurredAt: new Date("2026-08-21T11:00:00.000Z"),
    };

    const created = {
      id: "communication-1",
      opportunityId: "opportunity-1",
      ...input,
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, "opportunity-1", input);

    expect(repository.create).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      input,
    );

    expect(result).toBe(created);
  });

  it("gets a Communication within the owner's Opportunity scope", async () => {
    const communication = {
      id: "communication-1",
      opportunityId: "opportunity-1",
    };

    repository.getById.mockResolvedValue(communication);

    const result = await service.getById(
      ownerA,
      "opportunity-1",
      "communication-1",
    );

    expect(repository.getById).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "communication-1",
    );

    expect(result).toBe(communication);
  });

  it("updates a Communication", async () => {
    const input = {
      contact: "new-contact@example.com",
      subject: "Updated subject",
      bodyMarkdown: "Updated body",
    };

    const updated = {
      id: "communication-1",
      opportunityId: "opportunity-1",
      ...input,
    };

    repository.update.mockResolvedValue(updated);

    const result = await service.update(
      ownerA,
      "opportunity-1",
      "communication-1",
      input,
    );

    expect(repository.update).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "communication-1",
      input,
    );

    expect(result).toBe(updated);
  });

  it("associates an Artefact with a Communication", async () => {
    const association = {
      id: "communication-artefact-1",
      communicationId: "communication-1",
      artefactId: "artefact-1",
    };

    repository.addArtefact.mockResolvedValue(association);

    const result = await service.addArtefact(
      ownerA,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    expect(repository.addArtefact).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    expect(result).toBe(association);
  });

  it("removes an Artefact from a Communication", async () => {
    repository.removeArtefact.mockResolvedValue(undefined);

    await service.removeArtefact(
      ownerA,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    expect(repository.removeArtefact).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );
  });

  it("gets Artefacts associated with a Communication", async () => {
    const artefacts = [
      {
        id: "artefact-1",
        name: "CV.pdf",
      },
      {
        id: "artefact-2",
        name: "Interview notes.pdf",
      },
    ];

    repository.getArtefacts.mockResolvedValue(artefacts);

    const result = await service.getArtefacts(
      ownerA,
      "opportunity-1",
      "communication-1",
    );

    expect(repository.getArtefacts).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "communication-1",
    );

    expect(result).toBe(artefacts);
  });

  it("passes owner scope to every repository operation", async () => {
    repository.create.mockResolvedValue({});
    repository.getById.mockResolvedValue({});
    repository.update.mockResolvedValue({});
    repository.addArtefact.mockResolvedValue({});
    repository.removeArtefact.mockResolvedValue(undefined);
    repository.getArtefacts.mockResolvedValue([]);

    const createInput = {
      occurredAt: new Date("2026-08-21T10:00:00.000Z"),
    };

    const updateInput = {
      subject: "Updated",
    };

    await service.create(ownerB, "opportunity-1", createInput);

    await service.getById(ownerB, "opportunity-1", "communication-1");

    await service.update(
      ownerB,
      "opportunity-1",
      "communication-1",
      updateInput,
    );

    await service.addArtefact(
      ownerB,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    await service.removeArtefact(
      ownerB,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    await service.getArtefacts(ownerB, "opportunity-1", "communication-1");

    expect(repository.create).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      createInput,
    );

    expect(repository.getById).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "communication-1",
    );

    expect(repository.update).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "communication-1",
      updateInput,
    );

    expect(repository.addArtefact).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    expect(repository.removeArtefact).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "communication-1",
      "artefact-1",
    );

    expect(repository.getArtefacts).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "communication-1",
    );
  });

  it("does not introduce lifecycle transition behavior", () => {
    expect("transition" in service).toBe(false);
  });
});
