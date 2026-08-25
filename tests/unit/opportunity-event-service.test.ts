import { describe, expect, it, vi } from "vitest";

import { OpportunityEventRepository } from "@/lib/repositories/opportunity-event-repository";
import { OpportunityEventService } from "@/lib/services/opportunity-event-service";

describe("OpportunityEventService", () => {
  it("creates an OpportunityEvent", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({
        id: "event-1",
      }),
      getById: vi.fn(),
      listForOpportunity: vi.fn(),
    } as unknown as OpportunityEventRepository;

    const service = new OpportunityEventService(repository);

    const result = await service.create("owner-1", "opportunity-1", {
      occurredAt: new Date("2026-08-19T10:00:00.000Z"),
      type: "COMMUNICATION",
      title: "Follow-up email",
      descriptionMarkdown: "Sent a follow-up.",
      artefactIds: ["artefact-1"],
    });

    expect(repository.create).toHaveBeenCalledWith("owner-1", "opportunity-1", {
      occurredAt: new Date("2026-08-19T10:00:00.000Z"),
      type: "COMMUNICATION",
      title: "Follow-up email",
      descriptionMarkdown: "Sent a follow-up.",
      artefactIds: ["artefact-1"],
    });

    expect(result).toEqual({
      id: "event-1",
    });
  });

  it("gets an event within the owner's scope", async () => {
    const repository = {
      create: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        id: "event-1",
      }),
      listForOpportunity: vi.fn(),
    } as unknown as OpportunityEventRepository;

    const service = new OpportunityEventService(repository);

    const result = await service.getById("owner-1", "opportunity-1", "event-1");

    expect(repository.getById).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
      "event-1",
    );

    expect(result).toEqual({
      id: "event-1",
    });
  });

  it("lists OpportunityEvents for an Opportunity", async () => {
    const repository = {
      create: vi.fn(),
      getById: vi.fn(),
      listForOpportunity: vi
        .fn()
        .mockResolvedValue([{ id: "event-1" }, { id: "event-2" }]),
    } as unknown as OpportunityEventRepository;

    const service = new OpportunityEventService(repository);

    const result = await service.listForOpportunity("owner-1", "opportunity-1");

    expect(repository.listForOpportunity).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
    );

    expect(result).toEqual([{ id: "event-1" }, { id: "event-2" }]);
  });
});
