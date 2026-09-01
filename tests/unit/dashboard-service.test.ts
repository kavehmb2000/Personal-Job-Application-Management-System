import { describe, expect, it, vi } from "vitest";

import { DashboardService } from "@/lib/services/dashboard-service";

const NOW = new Date("2026-09-01T12:00:00.000Z");

type DashboardRepositoryMock = {
  listActionableOpportunities: ReturnType<typeof vi.fn>;
  listUpcomingScheduledEvents: ReturnType<typeof vi.fn>;
  listOverdueUserActions: ReturnType<typeof vi.fn>;
  listOffers: ReturnType<typeof vi.fn>;
};

function createRepository(data: {
  opportunities?: Awaited<
    ReturnType<
      import("@/lib/repositories/dashboard-repository").DashboardRepository["listActionableOpportunities"]
    >
  >;
  scheduledEvents?: Awaited<
    ReturnType<
      import("@/lib/repositories/dashboard-repository").DashboardRepository["listUpcomingScheduledEvents"]
    >
  >;
  userActions?: Awaited<
    ReturnType<
      import("@/lib/repositories/dashboard-repository").DashboardRepository["listOverdueUserActions"]
    >
  >;
  offers?: Awaited<
    ReturnType<
      import("@/lib/repositories/dashboard-repository").DashboardRepository["listOffers"]
    >
  >;
}): DashboardRepositoryMock {
  return {
    listActionableOpportunities: vi
      .fn()
      .mockResolvedValue(data.opportunities ?? []),
    listUpcomingScheduledEvents: vi
      .fn()
      .mockResolvedValue(data.scheduledEvents ?? []),
    listOverdueUserActions: vi.fn().mockResolvedValue(data.userActions ?? []),
    listOffers: vi.fn().mockResolvedValue(data.offers ?? []),
  };
}

function opportunity(
  status: "DISCOVERED" | "SUBMITTED" | "IN_PROGRESS" | "OFFER",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `opportunity-${status.toLowerCase()}`,
    version: 1,
    positionTitle: "Software Engineer",
    companyName: "Acme GmbH",
    location: "Frankfurt",
    country: "Germany",
    status: {
      key: status,
    },
    nextAction: null,
    nextActionDueAt: null,
    ...overrides,
  };
}

describe("DashboardService", () => {
  it("returns the four dashboard projections", async () => {
    const actionable = [
      opportunity("DISCOVERED", {
        id: "opportunity-1",
        nextAction: "Evaluate fit",
      }),
      opportunity("SUBMITTED", {
        id: "opportunity-2",
        nextAction: "Wait for response",
      }),
      opportunity("IN_PROGRESS", {
        id: "opportunity-3",
        nextAction: "Prepare interview",
      }),
    ];

    const upcomingEvent = {
      id: "event-1",
      opportunityId: "opportunity-3",
      title: "Technical interview",
      scheduledAt: new Date("2026-09-03T10:00:00.000Z"),
    };

    const overdueAction = {
      id: "action-1",
      opportunityId: "opportunity-2",
      title: "Follow up with recruiter",
      status: "TODO" as const,
      priority: "HIGH" as const,
      dueAt: new Date("2026-08-30T10:00:00.000Z"),
    };

    const offer = opportunity("OFFER", {
      id: "opportunity-offer",
      companyName: "Offer GmbH",
      positionTitle: "Senior Engineer",
    });

    const repository = createRepository({
      opportunities: actionable,
      scheduledEvents: [upcomingEvent],
      userActions: [overdueAction],
    });

    repository.listOffers.mockResolvedValue([offer]);

    const service = new DashboardService(repository as never, () => NOW);

    const result = await service.getDashboard("owner-1");

    expect(result).toEqual({
      actionableOpportunities: [
        {
          id: "opportunity-1",
          version: 1,
          positionTitle: "Software Engineer",
          companyName: "Acme GmbH",
          location: "Frankfurt",
          country: "Germany",
          status: "DISCOVERED",
          nextAction: "Evaluate fit",
          nextActionDueAt: null,
        },
        {
          id: "opportunity-2",
          version: 1,
          positionTitle: "Software Engineer",
          companyName: "Acme GmbH",
          location: "Frankfurt",
          country: "Germany",
          status: "SUBMITTED",
          nextAction: "Wait for response",
          nextActionDueAt: null,
        },
        {
          id: "opportunity-3",
          version: 1,
          positionTitle: "Software Engineer",
          companyName: "Acme GmbH",
          location: "Frankfurt",
          country: "Germany",
          status: "IN_PROGRESS",
          nextAction: "Prepare interview",
          nextActionDueAt: null,
        },
      ],
      upcomingScheduledEvents: [upcomingEvent],
      overdueUserActions: [overdueAction],
      offers: [
        {
          id: "opportunity-offer",
          version: 1,
          positionTitle: "Senior Engineer",
          companyName: "Offer GmbH",
          location: "Frankfurt",
          country: "Germany",
          status: "OFFER",
          nextAction: null,
          nextActionDueAt: null,
        },
      ],
    });
  });

  it("requests every projection using the supplied owner id", async () => {
    const repository = createRepository({});

    const service = new DashboardService(repository as never, () => NOW);

    await service.getDashboard("owner-42");

    expect(repository.listActionableOpportunities).toHaveBeenCalledWith(
      "owner-42",
    );
    expect(repository.listUpcomingScheduledEvents).toHaveBeenCalledWith(
      "owner-42",
      NOW,
    );
    expect(repository.listOverdueUserActions).toHaveBeenCalledWith(
      "owner-42",
      NOW,
    );
    expect(repository.listOffers).toHaveBeenCalledWith("owner-42");
  });

  it("keeps Offers separate from actionable Opportunities", async () => {
    const offer = opportunity("OFFER");

    const repository = createRepository({
      opportunities: [],
    });

    repository.listOffers.mockResolvedValue([offer]);

    const service = new DashboardService(repository as never, () => NOW);

    const result = await service.getDashboard("owner-1");

    expect(result.actionableOpportunities).toEqual([]);
    expect(result.offers).toEqual([
      {
        id: "opportunity-offer",
        version: 1,
        positionTitle: "Software Engineer",
        companyName: "Acme GmbH",
        location: "Frankfurt",
        country: "Germany",
        status: "OFFER",
        nextAction: null,
        nextActionDueAt: null,
      },
    ]);
  });

  it("does not collapse overdue UserActions into Opportunity next-action data", async () => {
    const opportunityNextAction = {
      id: "opportunity-1",
      version: 1,
      companyName: "Acme GmbH",
      positionTitle: "Software Engineer",
      country: "Germany",
      location: "Frankfurt",
      status: {
        key: "IN_PROGRESS" as const,
      },
      nextAction: "Review interview feedback",
      nextActionDueAt: new Date("2026-09-05T12:00:00.000Z"),
    };

    const overdueUserAction = {
      id: "action-1",
      opportunityId: "opportunity-1",
      title: "Send thank-you email",
      status: "TODO" as const,
      priority: "HIGH" as const,
      dueAt: new Date("2026-08-30T12:00:00.000Z"),
    };

    const repository = createRepository({
      opportunities: [opportunityNextAction],
      userActions: [overdueUserAction],
    });

    const service = new DashboardService(repository as never, () => NOW);

    const result = await service.getDashboard("owner-1");

    expect(result.actionableOpportunities).toEqual([
      {
        id: "opportunity-1",
        version: 1,
        companyName: "Acme GmbH",
        positionTitle: "Software Engineer",
        country: "Germany",
        location: "Frankfurt",
        status: "IN_PROGRESS",
        nextAction: "Review interview feedback",
        nextActionDueAt: new Date("2026-09-05T12:00:00.000Z"),
      },
    ]);
    expect(result.overdueUserActions).toEqual([overdueUserAction]);

    expect(result.actionableOpportunities[0]).not.toHaveProperty(
      "overdueUserActions",
    );
  });

  it("returns empty projections when there is nothing requiring attention", async () => {
    const repository = createRepository({});

    const service = new DashboardService(repository as never, () => NOW);

    const result = await service.getDashboard("owner-1");

    expect(result).toEqual({
      actionableOpportunities: [],
      upcomingScheduledEvents: [],
      overdueUserActions: [],
      offers: [],
    });
  });
});
