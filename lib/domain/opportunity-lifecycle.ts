// -----------------------------------------------------------------------------
// Opportunity lifecycle finite-state machine
// -----------------------------------------------------------------------------
//
// Canonical MVP lifecycle:
//
// DISCOVERED → SUBMITTED
// DISCOVERED → CLOSED
// DISCOVERED → CANCELLED
//
// SUBMITTED → IN_PROGRESS
// SUBMITTED → CLOSED
// SUBMITTED → CANCELLED
// SUBMITTED → REJECTED
//
// IN_PROGRESS → OFFER
// IN_PROGRESS → CLOSED
// IN_PROGRESS → CANCELLED
// IN_PROGRESS → REJECTED
//
// OFFER → CLOSED
// OFFER → CANCELLED
// OFFER → REJECTED
//
// CLOSED, CANCELLED and REJECTED are terminal.
// -----------------------------------------------------------------------------

import type { OpportunityLifecycleStatus } from "./opportunity";
import { ConflictError } from "@/lib/domain/errors";

export const OPPORTUNITY_LIFECYCLE_STATUSES = [
  "DISCOVERED",
  "SUBMITTED",
  "IN_PROGRESS",
  "OFFER",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
] as const satisfies readonly OpportunityLifecycleStatus[];

export type OpportunityLifecycleTransition = readonly [
  from: OpportunityLifecycleStatus,
  to: OpportunityLifecycleStatus,
];

export const OPPORTUNITY_LIFECYCLE_TRANSITIONS = [
  ["DISCOVERED", "SUBMITTED"],
  ["DISCOVERED", "CLOSED"],
  ["DISCOVERED", "CANCELLED"],

  ["SUBMITTED", "IN_PROGRESS"],
  ["SUBMITTED", "CLOSED"],
  ["SUBMITTED", "CANCELLED"],
  ["SUBMITTED", "REJECTED"],

  ["IN_PROGRESS", "OFFER"],
  ["IN_PROGRESS", "CLOSED"],
  ["IN_PROGRESS", "CANCELLED"],
  ["IN_PROGRESS", "REJECTED"],

  ["OFFER", "CLOSED"],
  ["OFFER", "CANCELLED"],
  ["OFFER", "REJECTED"],
] as const satisfies readonly OpportunityLifecycleTransition[];

export const TERMINAL_OPPORTUNITY_STATUSES = [
  "CLOSED",
  "CANCELLED",
  "REJECTED",
] as const satisfies readonly OpportunityLifecycleStatus[];

export class InvalidOpportunityLifecycleTransitionError extends ConflictError {
  constructor(
    public readonly from: OpportunityLifecycleStatus,
    public readonly to: OpportunityLifecycleStatus,
  ) {
    super(`Invalid Opportunity lifecycle transition: ${from} → ${to}`);
    this.name = "InvalidOpportunityLifecycleTransitionError";
  }
}

function transitionKey(
  from: OpportunityLifecycleStatus,
  to: OpportunityLifecycleStatus,
): string {
  return `${from}->${to}`;
}

const VALID_TRANSITION_KEYS = new Set(
  OPPORTUNITY_LIFECYCLE_TRANSITIONS.map(([from, to]) =>
    transitionKey(from, to),
  ),
);

const TERMINAL_STATUS_SET = new Set<OpportunityLifecycleStatus>(
  TERMINAL_OPPORTUNITY_STATUSES,
);

/**
 * Returns true when the supplied status is terminal.
 */
export function isTerminalOpportunityStatus(
  status: OpportunityLifecycleStatus,
): boolean {
  return TERMINAL_STATUS_SET.has(status);
}

/**
 * Returns true when the supplied lifecycle transition is valid.
 */
export function isValidOpportunityLifecycleTransition(
  from: OpportunityLifecycleStatus,
  to: OpportunityLifecycleStatus,
): boolean {
  return VALID_TRANSITION_KEYS.has(transitionKey(from, to));
}

/**
 * Returns all valid next states for a given state.
 */
export function getValidOpportunityNextStatuses(
  from: OpportunityLifecycleStatus,
): OpportunityLifecycleStatus[] {
  return OPPORTUNITY_LIFECYCLE_TRANSITIONS.filter(
    ([source]) => source === from,
  ).map(([, target]) => target);
}

/**
 * Applies a lifecycle transition.
 *
 * This function only changes lifecycle state.
 * Lifecycle event creation belongs to T019.
 */
export function transitionOpportunityLifecycle(
  from: OpportunityLifecycleStatus,
  to: OpportunityLifecycleStatus,
): OpportunityLifecycleStatus {
  if (!isValidOpportunityLifecycleTransition(from, to)) {
    throw new InvalidOpportunityLifecycleTransitionError(from, to);
  }

  return to;
}
