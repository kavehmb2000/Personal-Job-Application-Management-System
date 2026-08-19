import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifecycleStateKey } from "@prisma/client";

import { LifecycleService } from "@/lib/services/lifecycle-service";
import { InvalidOpportunityLifecycleTransitionError } from "@/lib/domain/opportunity-lifecycle";

const ownerId = "owner-a";

const statusIds: Record<LifecycleStateKey, string> = {
    DISCOVERED: "status-discovered",
    SUBMITTED: "status-submitted",
    IN_PROGRESS: "status-in-progress",
    OFFER: "status-offer",
    CLOSED: "status-closed",
    CANCELLED: "status-cancelled",
    REJECTED: "status-rejected",
};

const terminalStates = new Set<LifecycleStateKey>([
    "CLOSED",
    "CANCELLED",
    "REJECTED",
]);

const validTransitions: Array<
    [LifecycleStateKey, LifecycleStateKey]
> = [
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

function makeStatus(key: LifecycleStateKey) {
    return {
        id: statusIds[key],
        ownerId,
        key,
        label:
            key === "IN_PROGRESS"
                ? "In Progress"
                : key.charAt(0) + key.slice(1).toLowerCase(),
        sortOrder: 10,
        isTerminal: terminalStates.has(key),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makePrismaMock() {
    const statuses = new Map(
        (
            Object.keys(statusIds) as LifecycleStateKey[]
        ).map((key) => [key, makeStatus(key)]),
    );

    const validTransitionKeys = new Set(
        validTransitions.map(
            ([from, to]) => `${from}->${to}`,
        ),
    );

    return {
        lifecycleStatus: {
            findFirst: vi.fn(async ({ where }: any) => {
                return statuses.get(where.key) ?? null;
            }),
        },

        lifecycleTransition: {
            findUnique: vi.fn(async ({ where }: any) => {
                const from = (
                    Object.entries(statusIds) as Array<
                        [LifecycleStateKey, string]
                    >
                ).find(
                    ([, id]) =>
                        id === where.fromStatusId_toStatusId.fromStatusId,
                )?.[0];

                const to = (
                    Object.entries(statusIds) as Array<
                        [LifecycleStateKey, string]
                    >
                ).find(
                    ([, id]) =>
                        id === where.fromStatusId_toStatusId.toStatusId,
                )?.[0];

                if (
                    from &&
                    to &&
                    validTransitionKeys.has(`${from}->${to}`)
                ) {
                    return {
                        id: `${from}-${to}`,
                        fromStatusId: statusIds[from],
                        toStatusId: statusIds[to],
                        createdAt: new Date(),
                    };
                }

                return null;
            }),
        },
    };
}

describe("LifecycleService", () => {
    let prisma: ReturnType<typeof makePrismaMock>;
    let service: LifecycleService;

    beforeEach(() => {
        prisma = makePrismaMock();

        service = new LifecycleService(
            prisma as never,
        );
    });

    describe("validateTransition", () => {
        it.each(validTransitions)(
            "accepts %s -> %s",
            async (from, to) => {
                await expect(
                    service.validateTransition(
                        ownerId,
                        from,
                        to,
                    ),
                ).resolves.toBeUndefined();
            },
        );

        it.each([
            ["DISCOVERED", "DISCOVERED"],
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
        ] as Array<[LifecycleStateKey, LifecycleStateKey]>)(
            "rejects %s -> %s",
            async (from, to) => {
                await expect(
                    service.validateTransition(
                        ownerId,
                        from,
                        to,
                    ),
                ).rejects.toBeInstanceOf(
                    InvalidOpportunityLifecycleTransitionError,
                );
            },
        );

        it("rejects an inactive or missing source status", async () => {
            prisma.lifecycleStatus.findFirst
                .mockResolvedValueOnce(null);

            await expect(
                service.validateTransition(
                    ownerId,
                    "DISCOVERED",
                    "SUBMITTED",
                ),
            ).rejects.toThrow(
                "Lifecycle status DISCOVERED was not found",
            );
        });

        it("rejects an inactive or missing target status", async () => {
            prisma.lifecycleStatus.findFirst
                .mockResolvedValueOnce(makeStatus("DISCOVERED"))
                .mockResolvedValueOnce(null);

            await expect(
                service.validateTransition(
                    ownerId,
                    "DISCOVERED",
                    "SUBMITTED",
                ),
            ).rejects.toThrow(
                "Lifecycle status SUBMITTED was not found",
            );
        });
    });
});