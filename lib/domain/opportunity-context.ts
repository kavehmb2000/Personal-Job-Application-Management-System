import type {
  Artefact,
  Communication,
  Contact,
  LifecycleStatus,
  Opportunity,
  OpportunityEvent,
  OpportunityNote,
  Submission,
  UserAction,
  ScheduledEvent,
} from "@prisma/client";

export type OpportunityContext = {
  opportunity: Opportunity;
  currentState: LifecycleStatus;

  nextAction: string | null;
  nextActionDueAt: Date | null;

  nextScheduledEvent: ScheduledEvent | null;

  notes: OpportunityNote[];
  events: OpportunityEvent[];
  submission: Submission | null;
  artefacts: Artefact[];
  actions: UserAction[];
  scheduledEvents: ScheduledEvent[];
  contacts: Contact[];
  communications: Communication[];
};
