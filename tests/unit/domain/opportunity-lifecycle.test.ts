import { describe, expect, it } from "vitest";

import {
  getValidOpportunityNextStatuses,
  InvalidOpportunityLifecycleTransitionError,
  isTerminalOpportunityStatus,
  isValidOpportunityLifecycleTransition,
  OPPORTUNITY_LIFECYCLE_STATUSES,
  OPPORTUNITY_LIFECYCLE_TRANSITIONS,
  TERMINAL_OPPORTUNITY_STATUSES,
  transitionOpportunityLifecycle,
} from "@/lib/domain/opportunity-lifecycle";
import type { OpportunityLifecycleStatus } from "@/lib/domain/opportunity";

describe("Opportunity lifecycle", () => {
  describe("canonical states", () => {
    it("defines exactly seven lifecycle states", () => {
      expect(OPPORTUNITY_LIFECYCLE_STATUSES).toEqual([
        "DISCOVERED",
        "SUBMITTED",
        "IN_PROGRESS",
        "OFFER",
        "CLOSED",
        "CANCELLED",
        "REJECTED",
      ]);
    });

    it("defines exactly three terminal states", () => {
      expect(TERMINAL_OPPORTUNITY_STATUSES).toEqual([
        "CLOSED",
        "CANCELLED",
        "REJECTED",
      ]);
    });
  });

  describe("canonical transition matrix", () => {
    const validTransitions: readonly [
      OpportunityLifecycleStatus,
      OpportunityLifecycleStatus,
    ][] = [
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
    ];

    it("contains exactly fourteen valid transitions", () => {
      expect(OPPORTUNITY_LIFECYCLE_TRANSITIONS).toHaveLength(14);
    });

    it.each(validTransitions)("allows %s → %s", (from, to) => {
      expect(isValidOpportunityLifecycleTransition(from, to)).toBe(true);
      expect(transitionOpportunityLifecycle(from, to)).toBe(to);
    });

    it("contains exactly the canonical transition set", () => {
      expect(OPPORTUNITY_LIFECYCLE_TRANSITIONS).toEqual(validTransitions);
    });
  });

  describe("invalid transitions", () => {
    const invalidTransitions: readonly [
      OpportunityLifecycleStatus,
      OpportunityLifecycleStatus,
    ][] = [
      ["DISCOVERED", "IN_PROGRESS"],
      ["DISCOVERED", "OFFER"],
      ["DISCOVERED", "REJECTED"],

      ["SUBMITTED", "DISCOVERED"],
      ["SUBMITTED", "OFFER"],

      ["IN_PROGRESS", "DISCOVERED"],
      ["IN_PROGRESS", "SUBMITTED"],
      ["IN_PROGRESS", "IN_PROGRESS"],

      ["OFFER", "DISCOVERED"],
      ["OFFER", "SUBMITTED"],
      ["OFFER", "IN_PROGRESS"],
      ["OFFER", "OFFER"],

      ["CLOSED", "DISCOVERED"],
      ["CLOSED", "SUBMITTED"],
      ["CLOSED", "IN_PROGRESS"],
      ["CLOSED", "OFFER"],
      ["CLOSED", "CLOSED"],
      ["CLOSED", "CANCELLED"],
      ["CLOSED", "REJECTED"],

      ["CANCELLED", "DISCOVERED"],
      ["CANCELLED", "SUBMITTED"],
      ["CANCELLED", "IN_PROGRESS"],
      ["CANCELLED", "OFFER"],
      ["CANCELLED", "CLOSED"],
      ["CANCELLED", "CANCELLED"],
      ["CANCELLED", "REJECTED"],

      ["REJECTED", "DISCOVERED"],
      ["REJECTED", "SUBMITTED"],
      ["REJECTED", "IN_PROGRESS"],
      ["REJECTED", "OFFER"],
      ["REJECTED", "CLOSED"],
      ["REJECTED", "CANCELLED"],
      ["REJECTED", "REJECTED"],
    ];

    it.each(invalidTransitions)("rejects %s → %s", (from, to) => {
      expect(isValidOpportunityLifecycleTransition(from, to)).toBe(false);

      expect(() => transitionOpportunityLifecycle(from, to)).toThrow(
        InvalidOpportunityLifecycleTransitionError,
      );
    });
  });

  describe("terminal states", () => {
    it.each(["CLOSED", "CANCELLED", "REJECTED"] as const)(
      "recognizes %s as terminal",
      (status) => {
        expect(isTerminalOpportunityStatus(status)).toBe(true);
        expect(getValidOpportunityNextStatuses(status)).toEqual([]);
      },
    );

    it.each(["DISCOVERED", "SUBMITTED", "IN_PROGRESS", "OFFER"] as const)(
      "recognizes %s as non-terminal",
      (status) => {
        expect(isTerminalOpportunityStatus(status)).toBe(false);
        expect(getValidOpportunityNextStatuses(status).length).toBeGreaterThan(
          0,
        );
      },
    );
  });

  describe("next statuses", () => {
    it("returns the three valid next states from DISCOVERED", () => {
      expect(getValidOpportunityNextStatuses("DISCOVERED")).toEqual([
        "SUBMITTED",
        "CLOSED",
        "CANCELLED",
      ]);
    });

    it("returns the four valid next states from SUBMITTED", () => {
      expect(getValidOpportunityNextStatuses("SUBMITTED")).toEqual([
        "IN_PROGRESS",
        "CLOSED",
        "CANCELLED",
        "REJECTED",
      ]);
    });

    it("returns the four valid next states from IN_PROGRESS", () => {
      expect(getValidOpportunityNextStatuses("IN_PROGRESS")).toEqual([
        "OFFER",
        "CLOSED",
        "CANCELLED",
        "REJECTED",
      ]);
    });

    it("returns the three valid next states from OFFER", () => {
      expect(getValidOpportunityNextStatuses("OFFER")).toEqual([
        "CLOSED",
        "CANCELLED",
        "REJECTED",
      ]);
    });
  });

  describe("happy-path lifecycle", () => {
    it("supports the canonical progression to OFFER", () => {
      let status: OpportunityLifecycleStatus = "DISCOVERED";

      status = transitionOpportunityLifecycle(status, "SUBMITTED");
      expect(status).toBe("SUBMITTED");

      status = transitionOpportunityLifecycle(status, "IN_PROGRESS");
      expect(status).toBe("IN_PROGRESS");

      status = transitionOpportunityLifecycle(status, "OFFER");
      expect(status).toBe("OFFER");
    });

    it("allows terminal closure from every active state", () => {
      const activeStates = [
        "DISCOVERED",
        "SUBMITTED",
        "IN_PROGRESS",
        "OFFER",
      ] as const;

      for (const state of activeStates) {
        expect(transitionOpportunityLifecycle(state, "CLOSED")).toBe("CLOSED");
      }
    });

    it("allows cancellation from every active state", () => {
      const activeStates = [
        "DISCOVERED",
        "SUBMITTED",
        "IN_PROGRESS",
        "OFFER",
      ] as const;

      for (const state of activeStates) {
        expect(transitionOpportunityLifecycle(state, "CANCELLED")).toBe(
          "CANCELLED",
        );
      }
    });

    it("allows rejection from every state where rejection is valid", () => {
      const rejectableStates = ["SUBMITTED", "IN_PROGRESS", "OFFER"] as const;

      for (const state of rejectableStates) {
        expect(transitionOpportunityLifecycle(state, "REJECTED")).toBe(
          "REJECTED",
        );
      }
    });
  });
});
