// -----------------------------------------------------------------------------
// Opportunity domain model
// -----------------------------------------------------------------------------
//
// This module is deliberately persistence-agnostic.
// Prisma mapping belongs to the persistence layer, not the domain model.
// -----------------------------------------------------------------------------

export const OPPORTUNITY_INITIAL_VERSION = 1;

export const OPPORTUNITY_INITIAL_STATUS = "DISCOVERED" as const;

export type OpportunityLifecycleStatus =
  | "DISCOVERED"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "OFFER"
  | "CLOSED"
  | "CANCELLED"
  | "REJECTED";

export interface OpportunityProps {
  id: string;
  ownerId: string;

  companyName: string;
  positionTitle: string;

  jobUrl?: string;
  location?: string;
  country?: string;
  source?: string;
  roleFamily?: string;
  fitScore?: number;

  nextAction?: string;
  nextActionDueAt?: Date;

  status?: OpportunityLifecycleStatus;

  version?: number;
  archivedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface Opportunity {
  readonly id: string;
  readonly ownerId: string;

  readonly companyName: string;
  readonly positionTitle: string;

  readonly jobUrl?: string;
  readonly location?: string;
  readonly country?: string;
  readonly source?: string;
  readonly roleFamily?: string;
  readonly fitScore?: number;

  readonly nextAction?: string;
  readonly nextActionDueAt?: Date;

  readonly status: OpportunityLifecycleStatus;

  readonly version: number;
  readonly archivedAt: Date | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class OpportunityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpportunityValidationError";
  }
}

function requireNonBlank(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OpportunityValidationError(
      `${fieldName} must be a non-empty string`,
    );
  }

  return value.trim();
}

function validateFitScore(fitScore: number | undefined): void {
  if (fitScore === undefined) {
    return;
  }

  if (!Number.isInteger(fitScore) || fitScore < 0 || fitScore > 100) {
    throw new OpportunityValidationError(
      "fitScore must be an integer between 0 and 100",
    );
  }
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

/**
 * Creates a new Opportunity.
 *
 * New Opportunities always begin in DISCOVERED with version 1.
 * Lifecycle transitions are intentionally handled elsewhere.
 */
export function createOpportunity(
  props: OpportunityProps,
  now: Date = new Date(),
): Opportunity {
  const id = requireNonBlank(props.id, "id");
  const ownerId = requireNonBlank(props.ownerId, "ownerId");
  const companyName = requireNonBlank(props.companyName, "companyName");
  const positionTitle = requireNonBlank(props.positionTitle, "positionTitle");

  validateFitScore(props.fitScore);

  if (props.status !== undefined && props.status !== "DISCOVERED") {
    throw new OpportunityValidationError(
      "A new Opportunity must start in DISCOVERED",
    );
  }

  if (props.version !== undefined && props.version !== 1) {
    throw new OpportunityValidationError(
      "A new Opportunity must start at version 1",
    );
  }

  const timestamp = cloneDate(now);

  return {
    id,
    ownerId,

    companyName,
    positionTitle,

    jobUrl: props.jobUrl,
    location: props.location,
    country: props.country,
    source: props.source,
    roleFamily: props.roleFamily,
    fitScore: props.fitScore,

    nextAction: props.nextAction,
    nextActionDueAt: props.nextActionDueAt
      ? cloneDate(props.nextActionDueAt)
      : undefined,

    status: OPPORTUNITY_INITIAL_STATUS,

    version: OPPORTUNITY_INITIAL_VERSION,
    archivedAt: props.archivedAt ?? null,

    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Archives an Opportunity.
 *
 * Archiving does not change lifecycle status.
 */
export function archiveOpportunity(
  opportunity: Opportunity,
  archivedAt: Date = new Date(),
): Opportunity {
  if (opportunity.archivedAt !== null) {
    return opportunity;
  }

  return {
    ...opportunity,
    archivedAt: cloneDate(archivedAt),
    updatedAt: cloneDate(archivedAt),
  };
}

/**
 * Restores an archived Opportunity.
 *
 * Restoring does not change lifecycle status.
 */
export function restoreOpportunity(
  opportunity: Opportunity,
  restoredAt: Date = new Date(),
): Opportunity {
  if (opportunity.archivedAt === null) {
    return opportunity;
  }

  return {
    ...opportunity,
    archivedAt: null,
    updatedAt: cloneDate(restoredAt),
  };
}

/**
 * Applies an optimistic-concurrency version increment.
 *
 * Persistence code is responsible for enforcing the compare-and-swap
 * operation against the database.
 */
export function incrementOpportunityVersion(
  opportunity: Opportunity,
): Opportunity {
  return {
    ...opportunity,
    version: opportunity.version + 1,
  };
}
