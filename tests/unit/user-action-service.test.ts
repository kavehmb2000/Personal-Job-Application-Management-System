import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserActionService } from "@/lib/services/user-action-service";

describe("UserActionService", () => {
  const ownerA = "owner-a";
  const ownerB = "owner-b";

  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  let service: UserActionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserActionService(repository as any);
  });

  it("creates a UserAction for an Opportunity", async () => {
    const created = {
      id: "action-1",
      opportunityId: "opportunity-1",
      title: "Prepare interview questions",
      descriptionMarkdown: "Review likely technical questions.",
      status: "TODO",
      priority: "HIGH",
      dueAt: new Date("2026-08-25T10:00:00.000Z"),
      completedAt: null,
      version: 1,
    };

    repository.create.mockResolvedValue(created);

    const result = await service.create(ownerA, "opportunity-1", {
      title: "Prepare interview questions",
      descriptionMarkdown: "Review likely technical questions.",
      priority: "HIGH",
      dueAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    expect(repository.create).toHaveBeenCalledWith(ownerA, "opportunity-1", {
      title: "Prepare interview questions",
      descriptionMarkdown: "Review likely technical questions.",
      priority: "HIGH",
      dueAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    expect(result).toBe(created);
  });

  it("updates status, priority, due date, and completion timestamp", async () => {
    const updated = {
      id: "action-1",
      opportunityId: "opportunity-1",
      title: "Prepare interview questions",
      descriptionMarkdown: null,
      status: "COMPLETED",
      priority: "NORMAL",
      dueAt: new Date("2026-08-25T10:00:00.000Z"),
      completedAt: new Date("2026-08-24T15:00:00.000Z"),
      version: 2,
    };

    repository.update.mockResolvedValue(updated);

    const result = await service.update(
      ownerA,
      "opportunity-1",
      "action-1",
      1,
      {
        status: "COMPLETED",
        priority: "NORMAL",
        dueAt: new Date("2026-08-25T10:00:00.000Z"),
        completedAt: new Date("2026-08-24T15:00:00.000Z"),
      },
    );

    expect(repository.update).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "action-1",
      1,
      {
        status: "COMPLETED",
        priority: "NORMAL",
        dueAt: new Date("2026-08-25T10:00:00.000Z"),
        completedAt: new Date("2026-08-24T15:00:00.000Z"),
      },
    );

    expect(result).toBe(updated);
  });

  it("gets a UserAction within the owner's Opportunity scope", async () => {
    const action = {
      id: "action-1",
      opportunityId: "opportunity-1",
      title: "Follow up",
      status: "TODO",
      priority: "NORMAL",
      dueAt: null,
      completedAt: null,
      version: 1,
    };

    repository.getById.mockResolvedValue(action);

    const result = await service.getById(ownerA, "opportunity-1", "action-1");

    expect(repository.getById).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "action-1",
    );

    expect(result).toBe(action);
  });

  it("propagates optimistic-concurrency failures", async () => {
    repository.update.mockRejectedValue(
      new Error("UserAction could not be modified with expected version 1"),
    );

    await expect(
      service.update(ownerA, "opportunity-1", "action-1", 1, {
        title: "Updated action",
      }),
    ).rejects.toThrow();

    expect(repository.update).toHaveBeenCalledWith(
      ownerA,
      "opportunity-1",
      "action-1",
      1,
      {
        title: "Updated action",
      },
    );
  });

  it("passes the owner scope to every repository operation", async () => {
    repository.create.mockResolvedValue({
      id: "action-1",
    });
    repository.getById.mockResolvedValue({
      id: "action-1",
    });
    repository.update.mockResolvedValue({
      id: "action-1",
    });

    await service.create(ownerB, "opportunity-1", {
      title: "Contact recruiter",
    });

    await service.getById(ownerB, "opportunity-1", "action-1");

    await service.update(ownerB, "opportunity-1", "action-1", 1, {
      status: "IN_PROGRESS",
    });

    expect(repository.create).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      expect.any(Object),
    );

    expect(repository.getById).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "action-1",
    );

    expect(repository.update).toHaveBeenCalledWith(
      ownerB,
      "opportunity-1",
      "action-1",
      1,
      expect.any(Object),
    );
  });

  it("does not introduce lifecycle transition behavior", () => {
    expect("transition" in service).toBe(false);
  });
});
