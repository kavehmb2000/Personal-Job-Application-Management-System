import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { ScheduledEventRepository } from "@/lib/repositories/scheduled-event-repository";

describe("ScheduledEventRepository", () => {
  const ownerA = "scheduled-event-repository-owner-a";
  const ownerB = "scheduled-event-repository-owner-b";

  let repository: ScheduledEventRepository;
  let opportunityA: { id: string };
  let opportunityB: { id: string };

  beforeEach(async () => {
    repository = new ScheduledEventRepository(prisma);

    await prisma.scheduledEvent.deleteMany({
      where: {
        opportunity: {
          ownerId: {
            in: [ownerA, ownerB],
          },
        },
      },
    });

    await prisma.opportunity.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.lifecycleTransition.deleteMany({
      where: {
        OR: [
          {
            fromStatus: {
              ownerId: {
                in: [ownerA, ownerB],
              },
            },
          },
          {
            toStatus: {
              ownerId: {
                in: [ownerA, ownerB],
              },
            },
          },
        ],
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: {
          in: [ownerA, ownerB],
        },
      },
    });

    await prisma.ownerAccount.createMany({
      data: [
        {
          id: ownerA,
          googleSubject: `scheduled-event-${ownerA}`,
          email: `${ownerA}@example.com`,
        },
        {
          id: ownerB,
          googleSubject: `scheduled-event-${ownerB}`,
          email: `${ownerB}@example.com`,
        },
      ],
    });

    const discoveredA = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerA,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    const discoveredB = await prisma.lifecycleStatus.create({
      data: {
        ownerId: ownerB,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    opportunityA = await prisma.opportunity.create({
      data: {
        ownerId: ownerA,
        companyName: "Acme A",
        positionTitle: "Engineer",
        statusId: discoveredA.id,
      },
    });

    opportunityB = await prisma.opportunity.create({
      data: {
        ownerId: ownerB,
        companyName: "Acme B",
        positionTitle: "Engineer",
        statusId: discoveredB.id,
      },
    });
  });

  it("creates a ScheduledEvent within the Opportunity owner scope", async () => {
    const scheduledAt = new Date("2026-08-25T10:00:00.000Z");

    const event = await repository.create(ownerA, opportunityA.id, {
      type: "INTERVIEW",
      title: "Technical interview",
      scheduledAt,
      timeZone: "Europe/Berlin",
    });

    expect(event.opportunityId).toBe(opportunityA.id);
    expect(event.type).toBe("INTERVIEW");
    expect(event.title).toBe("Technical interview");
    expect(event.scheduledAt).toEqual(scheduledAt);
    expect(event.timeZone).toBe("Europe/Berlin");
  });

  it("rejects creation against another owner's Opportunity", async () => {
    await expect(
      repository.create(ownerA, opportunityB.id, {
        type: "INTERVIEW",
        title: "Should not be created",
        scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
      }),
    ).rejects.toThrow();
  });

  it("gets a ScheduledEvent within the owner's Opportunity scope", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "FOLLOW_UP",
      title: "Follow up",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    const result = await repository.getById(ownerA, opportunityA.id, event.id);

    expect(result?.id).toBe(event.id);
    expect(result?.opportunityId).toBe(opportunityA.id);
  });

  it("does not expose another owner's ScheduledEvent", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "INTERVIEW",
      title: "Private interview",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    const result = await repository.getById(ownerB, opportunityA.id, event.id);

    expect(result).toBeNull();
  });

  it("updates a ScheduledEvent within the owner's Opportunity scope", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "INTERVIEW",
      title: "Initial interview",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    const scheduledAt = new Date("2026-08-26T09:00:00.000Z");

    const updated = await repository.update(ownerA, opportunityA.id, event.id, {
      title: "Updated interview",
      scheduledAt,
      endAt: new Date("2026-08-26T10:30:00.000Z"),
      timeZone: "Europe/Berlin",
      platform: "Google Meet",
      meetingUrl: "https://meet.example.com/test",
      notesMarkdown: "Bring portfolio.",
    });

    expect(updated.title).toBe("Updated interview");
    expect(updated.scheduledAt).toEqual(scheduledAt);
    expect(updated.timeZone).toBe("Europe/Berlin");
    expect(updated.platform).toBe("Google Meet");
    expect(updated.meetingUrl).toBe("https://meet.example.com/test");
    expect(updated.notesMarkdown).toBe("Bring portfolio.");
  });

  it("preserves end time and timezone", async () => {
    const scheduledAt = new Date("2026-08-25T10:00:00.000Z");
    const endAt = new Date("2026-08-25T11:00:00.000Z");

    const event = await repository.create(ownerA, opportunityA.id, {
      type: "INTERVIEW",
      title: "Interview",
      scheduledAt,
      endAt,
      timeZone: "Europe/Berlin",
    });

    expect(event.scheduledAt).toEqual(scheduledAt);
    expect(event.endAt).toEqual(endAt);
    expect(event.timeZone).toBe("Europe/Berlin");
  });

  it("rejects an update outside the owner's Opportunity scope", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "FOLLOW_UP",
      title: "Private follow-up",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    await expect(
      repository.update(ownerB, opportunityA.id, event.id, {
        title: "Unauthorized update",
      }),
    ).rejects.toThrow();
  });

  it("rejects deletion outside the owner's Opportunity scope", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "FOLLOW_UP",
      title: "Private follow-up",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    await expect(
      repository.delete(ownerB, opportunityA.id, event.id),
    ).rejects.toThrow();

    const stillExists = await prisma.scheduledEvent.findUnique({
      where: {
        id: event.id,
      },
    });

    expect(stillExists).not.toBeNull();
  });

  it("deletes a ScheduledEvent within the owner's Opportunity scope", async () => {
    const event = await repository.create(ownerA, opportunityA.id, {
      type: "FOLLOW_UP",
      title: "Follow up",
      scheduledAt: new Date("2026-08-25T10:00:00.000Z"),
    });

    await repository.delete(ownerA, opportunityA.id, event.id);

    const deleted = await prisma.scheduledEvent.findUnique({
      where: {
        id: event.id,
      },
    });

    expect(deleted).toBeNull();
  });
});
