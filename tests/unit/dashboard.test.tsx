import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardView } from "@/components/dashboard/dashboard";
import type { Dashboard } from "@/lib/domain/dashboard";

const dashboard: Dashboard = {
  actionableOpportunities: [
    {
      id: "opportunity-1",
      version: 3,
      positionTitle: "Senior Software Engineer",
      companyName: "Acme GmbH",
      location: "Frankfurt",
      country: "Germany",
      status: "IN_PROGRESS",
      nextAction: "Prepare for interview",
      nextActionDueAt: new Date("2026-09-05T12:00:00.000Z"),
    },
  ],
  upcomingScheduledEvents: [
    {
      id: "event-1",
      opportunityId: "opportunity-1",
      title: "Technical interview",
      scheduledAt: new Date("2026-09-04T10:00:00.000Z"),
    },
  ],
  overdueUserActions: [
    {
      id: "action-1",
      opportunityId: "opportunity-1",
      title: "Send follow-up",
      status: "TODO",
      priority: "HIGH",
      dueAt: new Date("2026-08-30T10:00:00.000Z"),
    },
  ],
  offers: [
    {
      id: "opportunity-2",
      version: 1,
      positionTitle: "Product Engineer",
      companyName: "Example Corp",
      location: "Berlin",
      country: "Germany",
      status: "OFFER",
      nextAction: "Review offer",
      nextActionDueAt: null,
    },
  ],
};

describe("DashboardView", () => {
  it("renders all dashboard sections and their content", () => {
    const html = renderToStaticMarkup(<DashboardView dashboard={dashboard} />);

    expect(html).toContain("Opportunities Requiring Attention");
    expect(html).toContain("Upcoming Events");
    expect(html).toContain("Overdue Actions");
    expect(html).toContain("Offers");

    expect(html).toContain("Senior Software Engineer");
    expect(html).toContain("Acme GmbH");
    expect(html).toContain("Prepare for interview");

    expect(html).toContain("Technical interview");

    expect(html).toContain("Send follow-up");
    expect(html).toContain("HIGH");

    expect(html).toContain("Product Engineer");
    expect(html).toContain("Example Corp");
    expect(html).toContain("Review offer");
  });

  it("links opportunity content to the opportunity detail route", () => {
    const html = renderToStaticMarkup(<DashboardView dashboard={dashboard} />);

    expect(html).toContain('href="/opportunities/opportunity-1"');
    expect(html).toContain('href="/opportunities/opportunity-2"');
  });

  it("renders empty states when there is nothing to show", () => {
    const emptyDashboard: Dashboard = {
      actionableOpportunities: [],
      upcomingScheduledEvents: [],
      overdueUserActions: [],
      offers: [],
    };

    const html = renderToStaticMarkup(
      <DashboardView dashboard={emptyDashboard} />,
    );

    expect(html).toContain("No Opportunities currently require attention.");
    expect(html).toContain("No upcoming scheduled events.");
    expect(html).toContain("No overdue actions.");
    expect(html).toContain("No current offers.");
  });
});
