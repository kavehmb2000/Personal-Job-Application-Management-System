import type { OpportunityContext } from "@/lib/domain/opportunity-context";

import { OpportunityContextRepository } from "@/lib/repositories/opportunity-context-repository";

export class OpportunityContextService {
  constructor(private readonly repository: OpportunityContextRepository) {}

  async getContext(
    ownerId: string,
    opportunityId: string,
  ): Promise<OpportunityContext | null> {
    const context = await this.repository.getContext(ownerId, opportunityId);

    if (!context) {
      return null;
    }

    const nextScheduledEvent = this.selectNextScheduledEvent(
      context.scheduledEvents,
    );

    return {
      opportunity: context.opportunity,
      currentState: context.opportunity.status,

      // These are explicitly maintained on Opportunity.
      // They are NOT derived from UserAction.
      nextAction: context.opportunity.nextAction,
      nextActionDueAt: context.opportunity.nextActionDueAt,

      nextScheduledEvent,

      notes: context.notes,
      events: context.events,
      submission: context.submission,
      artefacts: context.artefacts,
      actions: context.actions,
      scheduledEvents: context.scheduledEvents,
      contacts: context.contacts,
      communications: context.communications,
    };
  }

  private selectNextScheduledEvent(
    scheduledEvents: OpportunityContext["scheduledEvents"],
  ) {
    const now = new Date();

    return scheduledEvents.find((event) => event.scheduledAt >= now) ?? null;
  }
}
