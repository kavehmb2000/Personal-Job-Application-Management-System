import { describe, expect, it } from "vitest";

import {
  archiveOpportunity,
  createOpportunity,
  incrementOpportunityVersion,
  OpportunityValidationError,
  restoreOpportunity,
} from "@/lib/domain/opportunity";

describe("Opportunity domain", () => {
  const now = new Date("2026-08-18T10:00:00.000Z");

  function createTestOpportunity() {
    return createOpportunity(
      {
        id: "opp-001",
        ownerId: "owner-001",
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
      },
      now,
    );
  }

  describe("creation", () => {
    it("creates an Opportunity with the canonical initial state", () => {
      const opportunity = createTestOpportunity();

      expect(opportunity.id).toBe("opp-001");
      expect(opportunity.ownerId).toBe("owner-001");
      expect(opportunity.companyName).toBe("Acme Corporation");
      expect(opportunity.positionTitle).toBe("Senior Software Engineer");

      expect(opportunity.status).toBe("DISCOVERED");
      expect(opportunity.version).toBe(1);
      expect(opportunity.archivedAt).toBeNull();

      expect(opportunity.createdAt).toEqual(now);
      expect(opportunity.updatedAt).toEqual(now);
    });

    it("requires an owner", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-001",
            ownerId: " ",
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });

    it("requires a company name", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-001",
            ownerId: "owner-001",
            companyName: " ",
            positionTitle: "Senior Software Engineer",
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });

    it("requires a position title", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-001",
            ownerId: "owner-001",
            companyName: "Acme Corporation",
            positionTitle: "",
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });

    it("does not allow creation directly in another lifecycle state", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-001",
            ownerId: "owner-001",
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
            status: "SUBMITTED",
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });

    it("does not allow creation with a version other than one", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-001",
            ownerId: "owner-001",
            companyName: "Acme Corporation",
            positionTitle: "Senior Software Engineer",
            version: 2,
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });
  });

  describe("optional opportunity data", () => {
    it("supports the canonical optional fields", () => {
      const dueAt = new Date("2026-08-20T09:00:00.000Z");

      const opportunity = createOpportunity(
        {
          id: "opp-002",
          ownerId: "owner-001",
          companyName: "Acme Corporation",
          positionTitle: "Principal Engineer",
          jobUrl: "https://example.com/jobs/123",
          location: "Frankfurt",
          country: "Germany",
          source: "LinkedIn",
          roleFamily: "Software Engineering",
          fitScore: 85,
          nextAction: "Prepare technical interview",
          nextActionDueAt: dueAt,
        },
        now,
      );

      expect(opportunity.jobUrl).toBe("https://example.com/jobs/123");
      expect(opportunity.location).toBe("Frankfurt");
      expect(opportunity.country).toBe("Germany");
      expect(opportunity.source).toBe("LinkedIn");
      expect(opportunity.roleFamily).toBe("Software Engineering");
      expect(opportunity.fitScore).toBe(85);
      expect(opportunity.nextAction).toBe("Prepare technical interview");
      expect(opportunity.nextActionDueAt).toEqual(dueAt);
    });

    it("accepts a fit score from 0 through 100", () => {
      expect(
        createOpportunity(
          {
            id: "opp-003",
            ownerId: "owner-001",
            companyName: "Acme",
            positionTitle: "Engineer",
            fitScore: 0,
          },
          now,
        ).fitScore,
      ).toBe(0);

      expect(
        createOpportunity(
          {
            id: "opp-004",
            ownerId: "owner-001",
            companyName: "Acme",
            positionTitle: "Engineer",
            fitScore: 100,
          },
          now,
        ).fitScore,
      ).toBe(100);
    });

    it("rejects an invalid fit score", () => {
      expect(() =>
        createOpportunity(
          {
            id: "opp-005",
            ownerId: "owner-001",
            companyName: "Acme",
            positionTitle: "Engineer",
            fitScore: 101,
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);

      expect(() =>
        createOpportunity(
          {
            id: "opp-006",
            ownerId: "owner-001",
            companyName: "Acme",
            positionTitle: "Engineer",
            fitScore: -1,
          },
          now,
        ),
      ).toThrow(OpportunityValidationError);
    });
  });

  describe("archive and restore", () => {
    it("archives an Opportunity without changing its lifecycle state", () => {
      const opportunity = createTestOpportunity();
      const archivedAt = new Date("2026-08-18T11:00:00.000Z");

      const archived = archiveOpportunity(opportunity, archivedAt);

      expect(archived.archivedAt).toEqual(archivedAt);
      expect(archived.status).toBe("DISCOVERED");
      expect(archived.updatedAt).toEqual(archivedAt);
    });

    it("restores an archived Opportunity without changing its lifecycle state", () => {
      const opportunity = createTestOpportunity();
      const archived = archiveOpportunity(
        opportunity,
        new Date("2026-08-18T11:00:00.000Z"),
      );

      const restoredAt = new Date("2026-08-18T12:00:00.000Z");
      const restored = restoreOpportunity(archived, restoredAt);

      expect(restored.archivedAt).toBeNull();
      expect(restored.status).toBe("DISCOVERED");
      expect(restored.updatedAt).toEqual(restoredAt);
    });

    it("is idempotent when archiving an already archived Opportunity", () => {
      const archivedAt = new Date("2026-08-18T11:00:00.000Z");

      const opportunity = archiveOpportunity(
        createTestOpportunity(),
        archivedAt,
      );

      const result = archiveOpportunity(
        opportunity,
        new Date("2026-08-18T12:00:00.000Z"),
      );

      expect(result).toBe(opportunity);
    });

    it("is idempotent when restoring an active Opportunity", () => {
      const opportunity = createTestOpportunity();

      const result = restoreOpportunity(
        opportunity,
        new Date("2026-08-18T12:00:00.000Z"),
      );

      expect(result).toBe(opportunity);
    });
  });

  describe("optimistic concurrency version", () => {
    it("increments the Opportunity version by one", () => {
      const opportunity = createTestOpportunity();

      const updated = incrementOpportunityVersion(opportunity);

      expect(updated.version).toBe(2);
      expect(opportunity.version).toBe(1);
    });

    it("does not mutate the original Opportunity", () => {
      const opportunity = createTestOpportunity();

      const updated = incrementOpportunityVersion(opportunity);

      expect(updated).not.toBe(opportunity);
      expect(updated.id).toBe(opportunity.id);
      expect(updated.ownerId).toBe(opportunity.ownerId);
    });
  });

  describe("MVP domain boundaries", () => {
    it("does not expose a priority field", () => {
      const opportunity = createTestOpportunity();

      expect("priority" in opportunity).toBe(false);
    });

    it("uses nextAction rather than nextActionTitle", () => {
      const opportunity = createTestOpportunity();

      expect("nextAction" in opportunity).toBe(true);
      expect("nextActionTitle" in opportunity).toBe(false);
    });
  });
});
