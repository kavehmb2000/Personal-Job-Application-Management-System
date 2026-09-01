import Link from "next/link";

import type { Dashboard } from "@/lib/domain/dashboard";

type DashboardProps = {
  dashboard: Dashboard;
};

export function DashboardView({ dashboard }: DashboardProps) {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-8">
      <header className="space-y-2">
        <h1 id="dashboard-title" className="text-3xl font-semibold">
          Dashboard
        </h1>
        <p>What needs your attention?</p>
      </header>

      <section
        aria-labelledby="actionable-opportunities-title"
        className="space-y-3"
      >
        <h2
          id="actionable-opportunities-title"
          className="text-xl font-semibold"
        >
          Opportunities Requiring Attention
        </h2>

        {dashboard.actionableOpportunities.length > 0 ? (
          <ul className="space-y-3">
            {dashboard.actionableOpportunities.map((opportunity) => (
              <li key={opportunity.id}>
                <article className="space-y-1">
                  <h3 className="font-semibold">
                    <Link href={`/opportunities/${opportunity.id}`}>
                      {opportunity.positionTitle}
                    </Link>
                  </h3>

                  <p>{opportunity.companyName}</p>

                  {opportunity.location || opportunity.country ? (
                    <p>
                      {[opportunity.location, opportunity.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}

                  <p>Status: {opportunity.status}</p>

                  {opportunity.nextAction ? (
                    <p>
                      Next action: {opportunity.nextAction}
                      {opportunity.nextActionDueAt ? (
                        <>
                          {" "}
                          — due{" "}
                          <time
                            dateTime={opportunity.nextActionDueAt.toISOString()}
                          >
                            {opportunity.nextActionDueAt.toLocaleString()}
                          </time>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>No Opportunities currently require attention.</p>
        )}
      </section>

      <section aria-labelledby="upcoming-events-title" className="space-y-3">
        <h2 id="upcoming-events-title" className="text-xl font-semibold">
          Upcoming Events
        </h2>

        {dashboard.upcomingScheduledEvents.length > 0 ? (
          <ul className="space-y-3">
            {dashboard.upcomingScheduledEvents.map((event) => (
              <li key={event.id}>
                <article>
                  <h3 className="font-semibold">{event.title}</h3>

                  <Link href={`/opportunities/${event.opportunityId}`}>
                    View Opportunity
                  </Link>

                  <p>
                    <time dateTime={event.scheduledAt.toISOString()}>
                      {event.scheduledAt.toLocaleString()}
                    </time>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming scheduled events.</p>
        )}
      </section>

      <section aria-labelledby="overdue-actions-title" className="space-y-3">
        <h2 id="overdue-actions-title" className="text-xl font-semibold">
          Overdue Actions
        </h2>

        {dashboard.overdueUserActions.length > 0 ? (
          <ul className="space-y-3">
            {dashboard.overdueUserActions.map((action) => (
              <li key={action.id}>
                <article>
                  <h3 className="font-semibold">{action.title}</h3>

                  <p>Priority: {action.priority}</p>
                  <p>Status: {action.status}</p>

                  <p>
                    Due{" "}
                    <time dateTime={action.dueAt?.toISOString()}>
                      {action.dueAt?.toLocaleString()}
                    </time>
                  </p>

                  <Link href={`/opportunities/${action.opportunityId}`}>
                    View Opportunity
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>No overdue actions.</p>
        )}
      </section>

      <section aria-labelledby="offers-title" className="space-y-3">
        <h2 id="offers-title" className="text-xl font-semibold">
          Offers
        </h2>

        {dashboard.offers.length > 0 ? (
          <ul className="space-y-3">
            {dashboard.offers.map((opportunity) => (
              <li key={opportunity.id}>
                <article>
                  <h3 className="font-semibold">
                    <Link href={`/opportunities/${opportunity.id}`}>
                      {opportunity.positionTitle}
                    </Link>
                  </h3>

                  <p>{opportunity.companyName}</p>

                  {opportunity.location || opportunity.country ? (
                    <p>
                      {[opportunity.location, opportunity.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}

                  {opportunity.nextAction ? (
                    <p>Next action: {opportunity.nextAction}</p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>No current offers.</p>
        )}
      </section>
    </section>
  );
}
