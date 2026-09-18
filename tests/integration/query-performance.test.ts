import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { KanbanRepository } from "@/lib/repositories/kanban-repository";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";
import { DashboardService } from "@/lib/services/dashboard-service";
import { OpportunityContextRepository } from "@/lib/repositories/opportunity-context-repository";
import { UserActionPriority } from "@prisma/client";

describe("Query performance smoke tests", () => {
  const kanbanRepository = new KanbanRepository();
  const opportunityRepository = new OpportunityRepository();
  const dashboardService = new DashboardService();
  const opportunityContextRepository = new OpportunityContextRepository(prisma);

  let ownerId: string;
  let otherOwnerId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;
  let contextOpportunityId: string;
  let contextContactIds: string[] = [];
  let contextArtefactIds: string[] = [];

  const activeOpportunityCount = 200;
  const archivedOpportunityCount = 50;
  const otherOwnerOpportunityCount = 50;

  beforeAll(async () => {
    const [owner, otherOwner] = await Promise.all([
      prisma.ownerAccount.create({
        data: {
          googleSubject: "query-performance-owner",
          email: "query-performance-owner@example.test",
          displayName: "Query Performance Owner",
        },
      }),
      prisma.ownerAccount.create({
        data: {
          googleSubject: "query-performance-other-owner",
          email: "query-performance-other@example.test",
          displayName: "Query Performance Other Owner",
        },
      }),
    ]);

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const [discoveredStatus, submittedStatus, otherOwnerDiscoveredStatus] =
      await Promise.all([
        prisma.lifecycleStatus.create({
          data: {
            ownerId,
            key: "DISCOVERED",
            label: "Discovered",
            sortOrder: 1,
            isTerminal: false,
            isActive: true,
          },
        }),
        prisma.lifecycleStatus.create({
          data: {
            ownerId,
            key: "SUBMITTED",
            label: "Submitted",
            sortOrder: 2,
            isTerminal: false,
            isActive: true,
          },
        }),
        prisma.lifecycleStatus.create({
          data: {
            ownerId: otherOwnerId,
            key: "DISCOVERED",
            label: "Discovered",
            sortOrder: 1,
            isTerminal: false,
            isActive: true,
          },
        }),
      ]);

    discoveredStatusId = discoveredStatus.id;
    submittedStatusId = submittedStatus.id;

    const otherOwnerStatusId = otherOwnerDiscoveredStatus.id;

    await prisma.opportunity.createMany({
      data: [
        ...Array.from({ length: activeOpportunityCount }, (_, index) => ({
          ownerId,
          companyName:
            index % 10 === 0
              ? `Performance Target Company ${index}`
              : `Company ${index}`,
          positionTitle:
            index % 15 === 0
              ? `Performance Target Engineer ${index}`
              : `Software Engineer ${index}`,
          location: index % 2 === 0 ? "Berlin" : "Amsterdam",
          country: index % 2 === 0 ? "Germany" : "Netherlands",
          source: index % 3 === 0 ? "LinkedIn" : "Company Website",
          discoveredAt: new Date(
            `2026-08-${String(1 + (index % 28)).padStart(2, "0")}T10:00:00.000Z`,
          ),
          statusId: index % 2 === 0 ? discoveredStatusId : submittedStatusId,
          archivedAt: null,
        })),

        ...Array.from({ length: archivedOpportunityCount }, (_, index) => ({
          ownerId,
          companyName: `Archived Company ${index}`,
          positionTitle: `Archived Engineer ${index}`,
          location: "Berlin",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date(
            `2026-07-${String(1 + (index % 28)).padStart(2, "0")}T10:00:00.000Z`,
          ),
          statusId: discoveredStatusId,
          archivedAt: new Date("2026-08-01T10:00:00.000Z"),
        })),

        ...Array.from({ length: otherOwnerOpportunityCount }, (_, index) => ({
          ownerId: otherOwnerId,
          companyName: `Other Owner Company ${index}`,
          positionTitle: `Other Owner Engineer ${index}`,
          location: "Munich",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date(
            `2026-08-${String(1 + (index % 28)).padStart(2, "0")}T10:00:00.000Z`,
          ),
          statusId: otherOwnerStatusId,
          archivedAt: null,
        })),
      ],
    });

    const contextOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Context Performance Company",
        positionTitle: "Senior Product Engineer",
        location: "Berlin",
        country: "Germany",
        source: "Company Website",
        discoveredAt: new Date("2026-08-31T10:00:00.000Z"),
        statusId: submittedStatusId,
        nextAction: "Prepare technical interview",
        nextActionDueAt: new Date("2026-09-25T09:00:00.000Z"),
      },
    });

    contextOpportunityId = contextOpportunity.id;

    const contacts = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        prisma.contact.create({
          data: {
            ownerId,
            name: `Context Contact ${index}`,
            roleType: "RECRUITER",
            organization: "Context Performance Company",
            email: `context-contact-${index}@example.test`,
          },
        }),
      ),
    );

    contextContactIds = contacts.map((contact) => contact.id);

    await prisma.opportunityContact.createMany({
      data: contextContactIds.map((contactId) => ({
        opportunityId: contextOpportunityId,
        contactId,
      })),
    });

    const artefacts = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        prisma.artefact.create({
          data: {
            ownerId,
            name: `Context Artefact ${index}`,
            type: index === 0 ? "CV" : "OTHER",
            contentMarkdown: `# Context Artefact ${index}`,
          },
        }),
      ),
    );

    contextArtefactIds = artefacts.map((artefact) => artefact.id);

    await prisma.opportunityArtefact.createMany({
      data: contextArtefactIds.map((artefactId) => ({
        opportunityId: contextOpportunityId,
        artefactId,
      })),
    });

    await prisma.opportunityNote.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        opportunityId: contextOpportunityId,
        title: `Context Note ${index}`,
        bodyMarkdown: `Context note ${index}.`,
      })),
    });

    const events = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        prisma.opportunityEvent.create({
          data: {
            opportunityId: contextOpportunityId,
            occurredAt: new Date(
              `2026-08-${String(10 + index).padStart(2, "0")}T10:00:00.000Z`,
            ),
            type: "INTERVIEW_SCHEDULED",
            title: `Context Event ${index}`,
            systemGenerated: false,
          },
        }),
      ),
    );

    await prisma.eventArtefact.createMany({
      data: events.slice(0, 5).map((event, index) => ({
        eventId: event.id,
        artefactId: contextArtefactIds[index % contextArtefactIds.length]!,
      })),
    });

    await prisma.submission.create({
      data: {
        opportunityId: contextOpportunityId,
        submittedAt: new Date("2026-08-09T09:00:00.000Z"),
        method: "Company portal",
      },
    });

    await prisma.userAction.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        opportunityId: contextOpportunityId,
        title: `Context Action ${index}`,
        status: index % 3 === 0 ? "IN_PROGRESS" : "TODO",
        priority:
          index % 2 === 0 ? UserActionPriority.HIGH : UserActionPriority.NORMAL,
        dueAt: new Date(
          `2026-09-${String(20 + index).padStart(2, "0")}T09:00:00.000Z`,
        ),
      })),
    });

    await prisma.scheduledEvent.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        opportunityId: contextOpportunityId,
        type: "INTERVIEW",
        title: `Context Scheduled Event ${index}`,
        scheduledAt: new Date(
          `2026-10-${String(1 + index).padStart(2, "0")}T10:00:00.000Z`,
        ),
        timeZone: "Europe/Berlin",
      })),
    });

    await prisma.communication.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        opportunityId: contextOpportunityId,
        occurredAt: new Date(
          `2026-08-${String(10 + index).padStart(2, "0")}T11:00:00.000Z`,
        ),
        contact: `context-contact-${index % contextContactIds.length}@example.test`,
        subject: `Context Communication ${index}`,
        bodyMarkdown: `Communication ${index}.`,
      })),
    });
  });

  afterAll(async () => {
    await prisma.opportunity.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.opportunityArtefact.deleteMany({
      where: {
        artefact: {
          ownerId: {
            in: [ownerId, otherOwnerId],
          },
        },
      },
    });

    await prisma.artefact.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.contact.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerId, otherOwnerId],
        },
      },
    });
  });

  it("keeps Kanban queries within the smoke threshold", async () => {
    const startedAt = performance.now();

    const opportunities = await kanbanRepository.listForOwner(ownerId);

    const elapsedMs = performance.now() - startedAt;

    expect(opportunities).toHaveLength(activeOpportunityCount + 1);
    expect(opportunities.every((opportunity) => opportunity.status)).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });

  it("keeps the Opportunities list query within the smoke threshold", async () => {
    const startedAt = performance.now();

    const opportunities = await opportunityRepository.list(ownerId);

    const elapsedMs = performance.now() - startedAt;

    expect(opportunities).toHaveLength(activeOpportunityCount + 1);
    expect(
      opportunities.every((opportunity) => opportunity.archivedAt === null),
    ).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });

  it("keeps Opportunities text search within the smoke threshold", async () => {
    const startedAt = performance.now();

    const opportunities = await opportunityRepository.list(ownerId, {
      search: "Performance Target",
    });

    const elapsedMs = performance.now() - startedAt;

    expect(opportunities.length).toBeGreaterThan(0);
    expect(
      opportunities.every(
        (opportunity) =>
          opportunity.companyName
            .toLowerCase()
            .includes("performance target") ||
          opportunity.positionTitle
            .toLowerCase()
            .includes("performance target"),
      ),
    ).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });

  it("keeps the Dashboard projection within the smoke threshold", async () => {
    const startedAt = performance.now();

    const dashboard = await dashboardService.getDashboard(ownerId);

    const elapsedMs = performance.now() - startedAt;

    expect(dashboard.actionableOpportunities.length).toBe(
      activeOpportunityCount + 1,
    );

    expect(dashboard.upcomingScheduledEvents).toEqual(expect.any(Array));

    expect(dashboard.overdueUserActions).toEqual(expect.any(Array));

    expect(dashboard.offers).toEqual(expect.any(Array));

    expect(
      dashboard.actionableOpportunities.some(
        (opportunity) => opportunity.id === contextOpportunityId,
      ),
    ).toBe(true);

    expect(elapsedMs).toBeLessThan(500);
  });

  it("keeps deep Opportunity context within the smoke threshold", async () => {
    const startedAt = performance.now();

    const context = await opportunityContextRepository.getContext(
      ownerId,
      contextOpportunityId,
    );

    const elapsedMs = performance.now() - startedAt;

    expect(context).not.toBeNull();

    expect(context?.opportunity.id).toBe(contextOpportunityId);
    expect(context?.notes).toHaveLength(10);
    expect(context?.events).toHaveLength(10);
    expect(context?.submission).not.toBeNull();
    expect(context?.artefacts).toHaveLength(5);
    expect(context?.actions).toHaveLength(10);
    expect(context?.scheduledEvents).toHaveLength(10);
    expect(context?.contacts).toHaveLength(5);
    expect(context?.communications).toHaveLength(10);

    expect(
      context?.events.every((event) => event.artefacts !== undefined),
    ).toBe(true);

    expect(elapsedMs).toBeLessThan(500);
  });
});
