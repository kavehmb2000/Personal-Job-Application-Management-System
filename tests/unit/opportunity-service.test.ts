import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpportunityService } from "@/lib/services/opportunity-service";

describe("OpportunityService", () => {
  const ownerA = "owner-a";
  const ownerB = "owner-b";

  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  let service: OpportunityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpportunityService(repository as any);
  });

  it("creates an Opportunity through the repository", async () => {
    const created = {
      id: "opportunity-1",
      ownerId: ownerA,
      companyName: "Acme Corporation",
      positionTitle: "Senior Software Engineer",
      version: 1,
      archivedAt: null,
      status: {
        key: "DISCOVERED",
      },
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, {
      companyName: "Acme Corporation",
      positionTitle: "Senior Software Engineer",
    });

    expect(repository.create).toHaveBeenCalledWith(ownerA, {
      companyName: "Acme Corporation",
      positionTitle: "Senior Software Engineer",
    });

    expect(result).toBe(created);
  });

  it("updates an Opportunity using the expected version", async () => {
    const updated = {
      id: "opportunity-1",
      ownerId: ownerA,
      companyName: "Acme Corporation",
      positionTitle: "Principal Software Engineer",
      version: 2,
      archivedAt: null,
    };

    repository.update.mockResolvedValue(updated);

    const result = await service.update(ownerA, "opportunity-1", 1, {
      positionTitle: "Principal Software Engineer",
    });

    expect(repository.update).toHaveBeenCalledWith(ownerA, "opportunity-1", 1, {
      positionTitle: "Principal Software Engineer",
    });

    expect(result).toBe(updated);
  });

  it("propagates a stale-version update failure", async () => {
    repository.update.mockRejectedValue(
      new Error("Opportunity could not be modified with expected version 1"),
    );

    await expect(
      service.update(ownerA, "opportunity-1", 1, {
        positionTitle: "Engineering Manager",
      }),
    ).rejects.toThrow();

    expect(repository.update).toHaveBeenCalledWith(ownerA, "opportunity-1", 1, {
      positionTitle: "Engineering Manager",
    });
  });

  it("archives an Opportunity using the expected version", async () => {
    const archived = {
      id: "opportunity-1",
      ownerId: ownerA,
      companyName: "Acme Corporation",
      positionTitle: "Senior Software Engineer",
      version: 2,
      archivedAt: new Date(),
      status: {
        key: "DISCOVERED",
      },
    };

    repository.archive.mockResolvedValue(archived);

    const result = await service.archive(ownerA, "opportunity-1", 1);

    expect(repository.archive).toHaveBeenCalledWith(ownerA, "opportunity-1", 1);

    expect(result).toBe(archived);
    expect(result.status.key).toBe("DISCOVERED");
  });

  it("propagates a stale-version archive failure", async () => {
    repository.archive.mockRejectedValue(
      new Error("Opportunity could not be modified with expected version 1"),
    );

    await expect(service.archive(ownerA, "opportunity-1", 1)).rejects.toThrow();

    expect(repository.archive).toHaveBeenCalledWith(ownerA, "opportunity-1", 1);
  });

  it("passes the owner scope to every repository operation", async () => {
    repository.create.mockResolvedValue({ id: "opportunity-1" });
    repository.update.mockResolvedValue({ id: "opportunity-1" });
    repository.archive.mockResolvedValue({ id: "opportunity-1" });

    await service.create(ownerB, {
      companyName: "Acme Corporation",
      positionTitle: "Engineer",
    });

    await service.update(ownerB, "opportunity-1", 1, {
      positionTitle: "Principal Engineer",
    });

    await service.archive(ownerB, "opportunity-1", 2);

    expect(repository.create).toHaveBeenCalledWith(ownerB, expect.any(Object));

    expect(repository.update).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      1,
      expect.any(Object),
    );

    expect(repository.archive).toHaveBeenCalledWith(ownerB, "opportunity-1", 2);
  });

  it("does not expose restore behavior", () => {
    expect("restore" in service).toBe(false);
  });
});
