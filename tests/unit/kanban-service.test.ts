import { describe, expect, it, vi } from "vitest";

import { KanbanService } from "@/lib/services/kanban-service";
import type { KanbanRepository } from "@/lib/repositories/kanban-repository";

function createRepositoryMock(
  opportunities: Awaited<ReturnType<KanbanRepository["listForOwner"]>>,
): KanbanRepository {
  return {
    listForOwner: vi.fn().mockResolvedValue(opportunities),
  } as unknown as KanbanRepository;
}

function createOpportunity(
  status:
    | "DISCOVERED"
    | "SUBMITTED"
    | "IN_PROGRESS"
    | "OFFER"
    | "CLOSED"
    | "CANCELLED"
    | "REJECTED",
  overrides: Partial<
    Omit<
      Awaited<ReturnType<KanbanRepository["listForOwner"]>>[number],
      "version"
    >
  > = {},
) {
  return {
    id: `opportunity-${status.toLowerCase()}`,
    version: 1,
    positionTitle: "Software Engineer",
    companyName: "Example Company",
    location: "Frankfurt",
    country: "Germany",
    status: {
      key: status,
    },
    scheduledEvents: [],
    ...overrides,
  };
}

describe("KanbanService", () => {
  it("returns all five Kanban columns in the defined order", async () => {
    const repository = createRepositoryMock([]);
    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    expect(board.columns.map((column) => column.key)).toEqual([
      "DISCOVERED",
      "SUBMITTED",
      "IN_PROGRESS",
      "OFFER",
      "TERMINAL",
    ]);
  });

  it("places the four non-terminal lifecycle states in their matching columns", async () => {
    const repository = createRepositoryMock([
      createOpportunity("DISCOVERED"),
      createOpportunity("SUBMITTED"),
      createOpportunity("IN_PROGRESS"),
      createOpportunity("OFFER"),
    ]);

    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    expect(
      board.columns.find((column) => column.key === "DISCOVERED")?.cards,
    ).toHaveLength(1);

    expect(
      board.columns.find((column) => column.key === "SUBMITTED")?.cards,
    ).toHaveLength(1);

    expect(
      board.columns.find((column) => column.key === "IN_PROGRESS")?.cards,
    ).toHaveLength(1);

    expect(
      board.columns.find((column) => column.key === "OFFER")?.cards,
    ).toHaveLength(1);

    expect(
      board.columns.find((column) => column.key === "TERMINAL")?.cards,
    ).toHaveLength(0);
  });

  it("groups CLOSED, CANCELLED, and REJECTED into the terminal column while preserving their actual status", async () => {
    const repository = createRepositoryMock([
      createOpportunity("CLOSED"),
      createOpportunity("CANCELLED"),
      createOpportunity("REJECTED"),
    ]);

    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    const terminalColumn = board.columns.find(
      (column) => column.key === "TERMINAL",
    );

    expect(terminalColumn?.cards).toHaveLength(3);
    expect(terminalColumn?.cards.map((card) => card.status)).toEqual([
      "CLOSED",
      "CANCELLED",
      "REJECTED",
    ]);
  });

  it("maps the card fields without exposing persistence-specific fields", async () => {
    const repository = createRepositoryMock([
      createOpportunity("SUBMITTED", {
        id: "opportunity-1",
        positionTitle: "Senior Backend Engineer",
        companyName: "Acme GmbH",
        location: "Berlin",
        country: "Germany",
      }),
    ]);

    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    const card = board.columns.find((column) => column.key === "SUBMITTED")
      ?.cards[0];

    expect(card).toEqual({
      id: "opportunity-1",
      version: 1,
      positionTitle: "Senior Backend Engineer",
      companyName: "Acme GmbH",
      location: "Berlin",
      country: "Germany",
      status: "SUBMITTED",
      nextScheduledEvent: null,
    });
  });

  it("uses the earliest scheduled event returned by the repository as the next event", async () => {
    const scheduledAt = new Date("2026-09-01T10:00:00.000Z");

    const repository = createRepositoryMock([
      createOpportunity("IN_PROGRESS", {
        scheduledEvents: [
          {
            id: "event-1",
            scheduledAt,
            title: "Recruiter Call",
          },
        ],
      }),
    ]);

    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    const card = board.columns.find((column) => column.key === "IN_PROGRESS")
      ?.cards[0];

    expect(card?.nextScheduledEvent).toEqual({
      id: "event-1",
      scheduledAt,
      title: "Recruiter Call",
    });
  });

  it("sets nextScheduledEvent to null when there is no upcoming scheduled event", async () => {
    const repository = createRepositoryMock([createOpportunity("DISCOVERED")]);

    const service = new KanbanService(repository);

    const board = await service.getBoard("owner-1");

    const card = board.columns.find((column) => column.key === "DISCOVERED")
      ?.cards[0];

    expect(card?.nextScheduledEvent).toBeNull();
  });

  it("requests opportunities using the supplied owner id", async () => {
    const repository = createRepositoryMock([]);
    const service = new KanbanService(repository);

    await service.getBoard("owner-42");

    expect(repository.listForOwner).toHaveBeenCalledWith("owner-42");
  });
});
