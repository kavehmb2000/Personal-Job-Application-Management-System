import { describe, expect, it, vi } from "vitest";

import { OpportunityContextService } from "@/lib/services/opportunity-context-service";

describe("OpportunityContextService", () => {
  const ownerId = "owner-1";
  const opportunityId = "opportunity-1";

  const createRepository = (context: unknown) => ({
    getContext: vi.fn().mockResolvedValue(context),
  });

  const opportunity = {
    id: opportunityId,
    ownerId,
    companyName: "Acme",
    positionTitle: "Senior Software Engineer",
    nextAction: "Prepare for technical interview",
    nextActionDueAt: new Date("2026-09-01T09:00:00.000Z"),
    status: {
      id: "status-1",
      ownerId,
      key: "IN_PROGRESS",
      label: "In Progress",
      sortOrder: 3,
      isTerminal: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  it("projects the complete Opportunity Workspace context", async () => {
    const notes = [
      {
        id: "note-1",
        opportunityId,
        title: "Research",
        bodyMarkdown: "Research the company",
      },
    ];

    const events = [
      {
        id: "event-1",
        opportunityId,
        occurredAt: new Date("2026-08-20T10:00:00.000Z"),
        type: "OPPORTUNITY_IN_PROGRESS",
        title: "Moved to In Progress",
        descriptionMarkdown: null,
        systemGenerated: true,
        createdAt: new Date(),
      },
    ];

    const submission = {
      id: "submission-1",
      opportunityId,
      submittedAt: new Date("2026-08-21T12:00:00.000Z"),
      method: "Company portal",
      notes: null,
      cvArtefactId: null,
      coverLetterArtefactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const artefacts = [
      {
        id: "artefact-1",
        ownerId,
        name: "CV",
        type: "CV",
      },
    ];

    const actions = [
      {
        id: "action-1",
        opportunityId,
        title: "Follow up with recruiter",
        descriptionMarkdown: null,
        status: "TODO",
        priority: "NORMAL",
        dueAt: new Date("2026-08-30T09:00:00.000Z"),
        completedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scheduledEvents = [
      {
        id: "scheduled-event-1",
        opportunityId,
        type: "INTERVIEW",
        title: "Technical interview",
        scheduledAt: new Date("2026-08-28T10:00:00.000Z"),
        endAt: null,
        timeZone: "Europe/Berlin",
        platform: "Google Meet",
        meetingUrl: null,
        notesMarkdown: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "scheduled-event-2",
        opportunityId,
        type: "FOLLOW_UP",
        title: "Later follow-up",
        scheduledAt: new Date("2026-09-05T10:00:00.000Z"),
        endAt: null,
        timeZone: "Europe/Berlin",
        platform: null,
        meetingUrl: null,
        notesMarkdown: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const contacts = [
      {
        id: "contact-1",
        ownerId,
        name: "Jane Recruiter",
        roleType: "RECRUITER",
        organization: "Acme",
        email: "jane@example.com",
        phone: null,
        profileUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const communications = [
      {
        id: "communication-1",
        opportunityId,
        occurredAt: new Date("2026-08-22T14:00:00.000Z"),
        contact: "jane@example.com",
        subject: "Interview scheduling",
        bodyMarkdown: "Let's schedule the interview.",
      },
    ];

    const repository = createRepository({
      opportunity,
      notes,
      events,
      submission,
      artefacts,
      actions,
      scheduledEvents,
      contacts,
      communications,
    });

    const service = new OpportunityContextService(repository as never);

    const result = await service.getContext(ownerId, opportunityId);

    expect(result).toEqual({
      opportunity,
      currentState: opportunity.status,
      nextAction: opportunity.nextAction,
      nextActionDueAt: opportunity.nextActionDueAt,
      nextScheduledEvent: scheduledEvents[0],
      notes,
      events,
      submission,
      artefacts,
      actions,
      scheduledEvents,
      contacts,
      communications,
    });

    expect(repository.getContext).toHaveBeenCalledWith(ownerId, opportunityId);
  });

  it("returns null when the Opportunity is outside owner scope", async () => {
    const repository = createRepository(null);

    const service = new OpportunityContextService(repository as never);

    const result = await service.getContext(ownerId, opportunityId);

    expect(result).toBeNull();

    expect(repository.getContext).toHaveBeenCalledWith(ownerId, opportunityId);
  });

  it("keeps Opportunity-level next-action information independent from UserAction records", async () => {
    const actions = [
      {
        id: "action-1",
        opportunityId,
        title: "Different UserAction title",
        descriptionMarkdown: null,
        status: "TODO",
        priority: "HIGH",
        dueAt: new Date("2026-08-25T09:00:00.000Z"),
        completedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const repository = createRepository({
      opportunity: {
        ...opportunity,
        nextAction: "Send portfolio",
        nextActionDueAt: new Date("2026-09-02T12:00:00.000Z"),
      },
      notes: [],
      events: [],
      submission: null,
      artefacts: [],
      actions,
      scheduledEvents: [],
      contacts: [],
      communications: [],
    });

    const service = new OpportunityContextService(repository as never);

    const result = await service.getContext(ownerId, opportunityId);

    expect(result).not.toBeNull();

    expect(result?.nextAction).toBe("Send portfolio");

    expect(result?.nextActionDueAt).toEqual(
      new Date("2026-09-02T12:00:00.000Z"),
    );

    expect(result?.actions).toEqual(actions);

    expect(result?.nextAction).not.toBe(actions[0].title);

    expect(result?.nextActionDueAt).not.toEqual(actions[0].dueAt);
  });

  it("returns null for nextScheduledEvent when no scheduled event is upcoming", async () => {
    const repository = createRepository({
      opportunity: {
        ...opportunity,
        nextAction: null,
        nextActionDueAt: null,
      },
      notes: [],
      events: [],
      submission: null,
      artefacts: [],
      actions: [],
      scheduledEvents: [],
      contacts: [],
      communications: [],
    });

    const service = new OpportunityContextService(repository as never);

    const result = await service.getContext(ownerId, opportunityId);

    expect(result).not.toBeNull();
    expect(result?.nextScheduledEvent).toBeNull();
  });
});
