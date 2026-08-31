import type { OpportunityContext } from "@/lib/domain/opportunity-context";

type OpportunityWorkspaceProps = {
  context: OpportunityContext;
};

export function OpportunityWorkspace({ context }: OpportunityWorkspaceProps) {
  const {
    opportunity,
    currentState,
    nextAction,
    nextActionDueAt,
    nextScheduledEvent,
    notes,
    events,
    submission,
    artefacts,
    actions,
    scheduledEvents,
    contacts,
    communications,
  } = context;

  return (
    <section
      aria-labelledby="opportunity-workspace-title"
      className="space-y-6"
    >
      <header className="space-y-2">
        <p className="text-sm">{currentState.label}</p>

        <h1 id="opportunity-workspace-title" className="text-3xl font-semibold">
          {opportunity.positionTitle}
        </h1>

        <p className="text-lg">{opportunity.companyName}</p>

        {opportunity.location || opportunity.country ? (
          <p>
            {[opportunity.location, opportunity.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="opportunity-details-title">
        <h2 id="opportunity-details-title" className="text-xl font-semibold">
          Opportunity
        </h2>

        <dl className="mt-3 space-y-2">
          {opportunity.source ? (
            <div>
              <dt className="font-medium">Source</dt>
              <dd>{opportunity.source}</dd>
            </div>
          ) : null}

          {opportunity.fitScore !== null ? (
            <div>
              <dt className="font-medium">Fit score</dt>
              <dd>{opportunity.fitScore}</dd>
            </div>
          ) : null}

          {opportunity.jobUrl ? (
            <div>
              <dt className="font-medium">Job URL</dt>
              <dd>
                <a href={opportunity.jobUrl} target="_blank" rel="noreferrer">
                  {opportunity.jobUrl}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="next-action-title">
        <h2 id="next-action-title" className="text-xl font-semibold">
          Next Action
        </h2>

        {nextAction ? (
          <div className="mt-3">
            <p>{nextAction}</p>

            {nextActionDueAt ? (
              <time dateTime={nextActionDueAt.toISOString()}>
                Due {nextActionDueAt.toLocaleString()}
              </time>
            ) : null}
          </div>
        ) : (
          <p className="mt-3">No next action.</p>
        )}
      </section>

      <section aria-labelledby="scheduled-event-title">
        <h2 id="scheduled-event-title" className="text-xl font-semibold">
          Next Scheduled Event
        </h2>

        {nextScheduledEvent ? (
          <div className="mt-3">
            <p>{nextScheduledEvent.title}</p>
            <time dateTime={nextScheduledEvent.scheduledAt.toISOString()}>
              {nextScheduledEvent.scheduledAt.toLocaleString()}
            </time>
          </div>
        ) : (
          <p className="mt-3">No upcoming scheduled event.</p>
        )}
      </section>

      <section aria-labelledby="submission-title">
        <h2 id="submission-title" className="text-xl font-semibold">
          Submission
        </h2>

        {submission ? (
          <p className="mt-3">Submission recorded.</p>
        ) : (
          <p className="mt-3">No submission recorded.</p>
        )}
      </section>

      <section aria-labelledby="notes-title">
        <h2 id="notes-title" className="text-xl font-semibold">
          Notes
        </h2>

        {notes.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {notes.map((note) => (
              <li key={note.id}>{note.bodyMarkdown}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No notes.</p>
        )}
      </section>

      <section aria-labelledby="events-title">
        <h2 id="events-title" className="text-xl font-semibold">
          Events
        </h2>

        {events.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <span>{event.title}</span>{" "}
                <time dateTime={event.occurredAt.toISOString()}>
                  {event.occurredAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No events.</p>
        )}
      </section>

      <section aria-labelledby="artefacts-title">
        <h2 id="artefacts-title" className="text-xl font-semibold">
          Artefacts
        </h2>

        {artefacts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {artefacts.map((artefact) => (
              <li key={artefact.id}>{artefact.name}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No artefacts.</p>
        )}
      </section>

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="text-xl font-semibold">
          Actions
        </h2>

        {actions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {actions.map((action) => (
              <li key={action.id}>{action.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No outstanding actions.</p>
        )}
      </section>

      <section aria-labelledby="scheduled-events-title">
        <h2 id="scheduled-events-title" className="text-xl font-semibold">
          Scheduled Events
        </h2>

        {scheduledEvents.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {scheduledEvents.map((event) => (
              <li key={event.id}>
                {event.title} — {event.scheduledAt.toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No scheduled events.</p>
        )}
      </section>

      <section aria-labelledby="contacts-title">
        <h2 id="contacts-title" className="text-xl font-semibold">
          Contacts
        </h2>

        {contacts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id}>{contact.name}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No contacts.</p>
        )}
      </section>

      <section aria-labelledby="communications-title">
        <h2 id="communications-title" className="text-xl font-semibold">
          Communications
        </h2>

        {communications.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {communications.map((communication) => (
              <li key={communication.id}>
                {communication.subject ?? "Communication"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">No communications.</p>
        )}
      </section>
    </section>
  );
}
