import { beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { LifecycleService } from "@/lib/services/lifecycle-service";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

describe("Lifecycle transition transaction", () => {
  const ownerEmail = `lifecycle-${Date.now()}@example.com`;

  let ownerId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;
  let opportunityId: string;

  beforeEach(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        email: `${Date.now()}-${Math.random()}@example.com`,
        googleSubject: `test-${Date.now()}-${Math.random()}`,
        displayName: "Lifecycle Test Owner",
      },
    });

    ownerId = owner.id;

    const discovered = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 10,
        isTerminal: false,
        isActive: true,
      },
    });

    const submitted = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "SUBMITTED",
        label: "Submitted",
        sortOrder: 20,
        isTerminal: false,
        isActive: true,
      },
    });

    discoveredStatusId = discovered.id;
    submittedStatusId = submitted.id;

    await prisma.lifecycleTransition.create({
      data: {
        fromStatusId: discoveredStatusId,
        toStatusId: submittedStatusId,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    opportunityId = opportunity.id;
  });

  it("commits the Opportunity state change and corresponding event together", async () => {
    const service = new LifecycleService(prisma);

    await service.transition(ownerId, opportunityId, "SUBMITTED");

    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
    });

    const events = await prisma.opportunityEvent.findMany({
      where: {
        opportunityId,
      },
    });

    expect(opportunity?.statusId).toBe(submittedStatusId);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("OPPORTUNITY_SUBMITTED");
    expect(events[0]?.systemGenerated).toBe(true);
  });

  it("rolls back the Opportunity state change when event creation fails", async () => {
    const service = new LifecycleService(prisma);

    await expect(
      service.transition(ownerId, opportunityId, "SUBMITTED", {
        simulateEventFailure: true,
      }),
    ).rejects.toThrow();

    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
    });

    const events = await prisma.opportunityEvent.findMany({
      where: {
        opportunityId,
      },
    });

    expect(opportunity?.statusId).toBe(discoveredStatusId);
    expect(events).toHaveLength(0);
  });
});
