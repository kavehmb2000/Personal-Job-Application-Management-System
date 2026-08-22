import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduledEventService } from "@/lib/services/scheduled-event-service";

describe("ScheduledEventService", () => {
    const ownerA = "owner-a";
    const ownerB = "owner-b";

    const repository = {
        create: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    let service: ScheduledEventService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ScheduledEventService(repository as any);
    });

    it("creates a ScheduledEvent for an Opportunity", async () => {
        const scheduledAt = new Date("2026-08-25T10:00:00.000Z");

        const created = {
            id: "event-1",
            opportunityId: "opportunity-1",
            type: "INTERVIEW",
            title: "Technical interview",
            scheduledAt,
            timeZone: "Europe/Berlin",
        };

        repository.create.mockResolvedValue(created);

        const result = await service.create(
            ownerA,
            "opportunity-1",
            {
                type: "INTERVIEW",
                title: "Technical interview",
                scheduledAt,
                timeZone: "Europe/Berlin",
            },
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            {
                type: "INTERVIEW",
                title: "Technical interview",
                scheduledAt,
                timeZone: "Europe/Berlin",
            },
        );

        expect(result).toBe(created);
    });

    it("supports all defined ScheduledEvent types", async () => {
        const types = [
            "INTERVIEW",
            "RECRUITER_CALL",
            "PRESENTATION",
            "CHALLENGE_DEADLINE",
            "FOLLOW_UP",
            "OTHER",
        ] as const;

        for (const type of types) {
            repository.create.mockResolvedValue({
                id: `event-${type}`,
                type,
            });

            const result = await service.create(
                ownerA,
                "opportunity-1",
                {
                    type,
                    title: `${type} event`,
                    scheduledAt: new Date(
                        "2026-08-25T10:00:00.000Z",
                    ),
                    timeZone: "Europe/Berlin",
                },
            );

            expect(result.type).toBe(type);
        }
    });

    it("preserves scheduled time and timezone", async () => {
        const scheduledAt = new Date(
            "2026-08-25T08:30:00.000Z",
        );

        const created = {
            id: "event-1",
            scheduledAt,
            timeZone: "Europe/Berlin",
        };

        repository.create.mockResolvedValue(created);

        const result = await service.create(
            ownerA,
            "opportunity-1",
            {
                type: "INTERVIEW",
                title: "Interview",
                scheduledAt,
                timeZone: "Europe/Berlin",
            },
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            expect.objectContaining({
                scheduledAt,
                timeZone: "Europe/Berlin",
            }),
        );

        expect(result.scheduledAt).toEqual(scheduledAt);
        expect(result.timeZone).toBe("Europe/Berlin");
    });

    it("updates scheduled time, timezone, title, and notes", async () => {
        const scheduledAt = new Date(
            "2026-08-26T09:00:00.000Z",
        );

        const updated = {
            id: "event-1",
            title: "Updated interview",
            scheduledAt,
            timeZone: "Europe/Berlin",
            notesMarkdown: "Bring portfolio.",
        };

        repository.update.mockResolvedValue(updated);

        const result = await service.update(
            ownerA,
            "opportunity-1",
            "event-1",
            {
                title: "Updated interview",
                scheduledAt,
                timeZone: "Europe/Berlin",
                notesMarkdown: "Bring portfolio.",
            },
        );

        expect(repository.update).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            "event-1",
            {
                title: "Updated interview",
                scheduledAt,
                timeZone: "Europe/Berlin",
                notesMarkdown: "Bring portfolio.",
            },
        );

        expect(result).toBe(updated);
    });

    it("gets a ScheduledEvent within the owner's Opportunity scope", async () => {
        const event = {
            id: "event-1",
            opportunityId: "opportunity-1",
            type: "FOLLOW_UP",
            title: "Follow up",
        };

        repository.getById.mockResolvedValue(event);

        const result = await service.getById(
            ownerA,
            "opportunity-1",
            "event-1",
        );

        expect(repository.getById).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            "event-1",
        );

        expect(result).toBe(event);
    });

    it("passes the owner scope to every repository operation", async () => {
        repository.create.mockResolvedValue({
            id: "event-1",
        });

        repository.getById.mockResolvedValue({
            id: "event-1",
        });

        repository.update.mockResolvedValue({
            id: "event-1",
        });

        await service.create(
            ownerB,
            "opportunity-1",
            {
                type: "FOLLOW_UP",
                title: "Follow up",
                scheduledAt: new Date(
                    "2026-08-25T10:00:00.000Z",
                ),
                timeZone: "Europe/Berlin",
            },
        );

        await service.getById(
            ownerB,
            "opportunity-1",
            "event-1",
        );

        await service.update(
            ownerB,
            "opportunity-1",
            "event-1",
            {
                title: "Updated follow-up",
            },
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerB,
            "opportunity-1",
            expect.any(Object),
        );

        expect(repository.getById).toHaveBeenCalledWith(
            ownerB,
            "opportunity-1",
            "event-1",
        );

        expect(repository.update).toHaveBeenCalledWith(
            ownerB,
            "opportunity-1",
            "event-1",
            expect.any(Object),
        );
    });

    it("does not introduce lifecycle transition behavior", () => {
        expect("transition" in service).toBe(false);
    });
});