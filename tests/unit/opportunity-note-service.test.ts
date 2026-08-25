import { describe, expect, it, vi } from "vitest";

import { OpportunityNoteRepository } from "@/lib/repositories/opportunity-note-repository";
import { OpportunityNoteService } from "@/lib/services/opportunity-note-service";

describe("OpportunityNoteService", () => {
  const repository = {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
  } as unknown as OpportunityNoteRepository;

  const service = new OpportunityNoteService(repository);

  const createdAt = new Date("2026-08-19T10:00:00.000Z");
  const updatedAt = new Date("2026-08-19T10:05:00.000Z");

  it("creates an OpportunityNote", async () => {
    const input = {
      title: "Recruiter follow-up",
      bodyMarkdown: "Follow up with the recruiter next week.",
      createdAt,
      updatedAt,
    };

    const created = {
      id: "note-1",
      opportunityId: "opportunity-1",
      ...input,
    };

    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create("owner-1", "opportunity-1", input);

    expect(repository.create).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
      input,
    );

    expect(result).toBe(created);
  });

  it("gets an OpportunityNote within the owner's scope", async () => {
    const note = {
      id: "note-1",
      opportunityId: "opportunity-1",
      title: "Recruiter follow-up",
      bodyMarkdown: "Follow up next week.",
      createdAt,
      updatedAt,
    };

    vi.mocked(repository.getById).mockResolvedValue(note);

    const result = await service.getById("owner-1", "opportunity-1", "note-1");

    expect(repository.getById).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
      "note-1",
    );

    expect(result).toBe(note);
  });

  it("updates an OpportunityNote independently", async () => {
    const input = {
      title: "Recruiter follow-up updated",
      bodyMarkdown: "Follow up with the recruiter tomorrow.",
      createdAt,
      updatedAt,
    };

    const updated = {
      id: "note-1",
      opportunityId: "opportunity-1",
      ...input,
    };

    vi.mocked(repository.update).mockResolvedValue(updated);

    const result = await service.update(
      "owner-1",
      "opportunity-1",
      "note-1",
      input,
    );

    expect(repository.update).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
      "note-1",
      input,
    );

    expect(result).toBe(updated);
  });

  it("preserves owner and Opportunity scope when updating", async () => {
    const input = {
      title: "Updated note",
      bodyMarkdown: "Updated content.",
    };

    vi.mocked(repository.update).mockResolvedValue({
      id: "note-1",
      opportunityId: "opportunity-1",
      ...input,
    });

    await service.update("owner-1", "opportunity-1", "note-1", input);

    expect(repository.update).toHaveBeenCalledWith(
      "owner-1",
      "opportunity-1",
      "note-1",
      input,
    );
  });

  it("propagates repository errors when creating a note", async () => {
    vi.mocked(repository.create).mockRejectedValue(
      new Error("Opportunity was not found in owner scope"),
    );

    await expect(
      service.create("owner-1", "opportunity-1", {
        title: "Note",
        bodyMarkdown: "Content",
      }),
    ).rejects.toThrow("Opportunity was not found in owner scope");
  });

  it("propagates repository errors when updating a note", async () => {
    vi.mocked(repository.update).mockRejectedValue(
      new Error("Opportunity note was not found in owner scope"),
    );

    await expect(
      service.update("owner-1", "opportunity-1", "note-1", {
        title: "Updated",
        bodyMarkdown: "Updated content",
      }),
    ).rejects.toThrow("Opportunity note was not found in owner scope");
  });
});
