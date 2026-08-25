import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { SubmissionRepository } from "@/lib/repositories/submission-repository";
import { SubmissionService } from "@/lib/services/submission-service";

describe("SubmissionService formal submission", () => {
  let ownerId: string;
  let opportunityId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;

  const submissionRepository = new SubmissionRepository(prisma);
  const submissionService = new SubmissionService(submissionRepository, prisma);

  async function createOwner(email: string) {
    return prisma.ownerAccount.create({
      data: {
        email,
        googleSubject: `test:${email}`,
        displayName: email,
      },
    });
  }

  beforeEach(async () => {
    const owner = await createOwner(
      `submission-transition-${crypto.randomUUID()}@example.com`,
    );

    ownerId = owner.id;

    const [discovered, submitted] = await Promise.all([
      prisma.lifecycleStatus.create({
        data: {
          ownerId,
          key: "DISCOVERED",
          label: "Discovered",
          sortOrder: 10,
          isTerminal: false,
          isActive: true,
        },
      }),
      prisma.lifecycleStatus.create({
        data: {
          ownerId,
          key: "SUBMITTED",
          label: "Submitted",
          sortOrder: 20,
          isTerminal: false,
          isActive: true,
        },
      }),
    ]);

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

  afterEach(async () => {
    await prisma.opportunityEvent.deleteMany({
      where: { opportunityId },
    });

    await prisma.submission.deleteMany({
      where: { opportunityId },
    });

    await prisma.opportunity.deleteMany({
      where: {
        ownerId,
      },
    });

    await prisma.lifecycleTransition.deleteMany({
      where: {
        fromStatusId: discoveredStatusId,
      },
    });

    await prisma.lifecycleStatus.deleteMany({
      where: { ownerId },
    });

    await prisma.ownerAccount.deleteMany({
      where: { id: ownerId },
    });
  });

  function createService() {
    return new SubmissionService(new SubmissionRepository(prisma), prisma);
  }

  it("creates a Submission and changes Discovered to Submitted atomically", async () => {
    const service = createService();

    const submittedAt = new Date("2026-08-19T12:00:00.000Z");

    const result = await service.submit(ownerId, opportunityId, {
      submittedAt,
      method: "Company website",
      notes: "Submitted through the careers portal.",
    });

    expect(result.opportunity.status.key).toBe("SUBMITTED");

    expect(result.submission.opportunityId).toBe(opportunityId);

    expect(result.submission.submittedAt).toEqual(submittedAt);

    const opportunity = await prisma.opportunity.findUniqueOrThrow({
      where: { id: opportunityId },
      include: { status: true },
    });

    expect(opportunity.status.key).toBe("SUBMITTED");
    expect(opportunity.version).toBe(2);

    const events = await prisma.opportunityEvent.findMany({
      where: { opportunityId },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("OPPORTUNITY_SUBMITTED");
    expect(events[0].systemGenerated).toBe(true);
  });

  it("does not allow a second Submission for the same Opportunity", async () => {
    const service = createService();

    await service.submit(ownerId, opportunityId, {
      submittedAt: new Date(),
    });

    await expect(
      service.submit(ownerId, opportunityId, {
        submittedAt: new Date(),
      }),
    ).rejects.toThrow();

    const submissions = await prisma.submission.findMany({
      where: { opportunityId },
    });

    expect(submissions).toHaveLength(1);
  });

  it("does not submit an Opportunity that is not in Discovered state", async () => {
    const service = createService();

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        statusId: submittedStatusId,
      },
    });

    await expect(
      service.submit(ownerId, opportunityId, {
        submittedAt: new Date(),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.submission.count({
        where: { opportunityId },
      }),
    ).toBe(0);

    expect(
      await prisma.opportunityEvent.count({
        where: { opportunityId },
      }),
    ).toBe(0);
  });

  it("rolls back the Submission when event creation fails", async () => {
    const service = createService();

    await expect(
      service.submit(ownerId, opportunityId, {
        submittedAt: new Date(),
        simulateEventFailure: true,
      }),
    ).rejects.toThrow();

    const opportunity = await prisma.opportunity.findUniqueOrThrow({
      where: { id: opportunityId },
      include: { status: true },
    });

    expect(opportunity.status.key).toBe("DISCOVERED");
    expect(opportunity.version).toBe(1);

    expect(
      await prisma.submission.count({
        where: { opportunityId },
      }),
    ).toBe(0);

    expect(
      await prisma.opportunityEvent.count({
        where: { opportunityId },
      }),
    ).toBe(0);
  });

  it("represents a reapplication with a new Opportunity rather than a second Submission", async () => {
    const firstOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    const firstSubmission = await submissionService.submit(
      ownerId,
      firstOpportunity.id,
      {
        submittedAt: new Date("2026-08-19T10:00:00Z"),
        method: "Company website",
      },
    );

    const secondOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    const secondSubmission = await submissionService.submit(
      ownerId,
      secondOpportunity.id,
      {
        submittedAt: new Date("2026-08-20T10:00:00Z"),
        method: "Company website",
      },
    );

    expect(firstSubmission.submission.opportunityId).toBe(firstOpportunity.id);

    expect(secondSubmission.submission.opportunityId).toBe(
      secondOpportunity.id,
    );

    expect(secondOpportunity.id).not.toBe(firstOpportunity.id);

    const submissions = await prisma.submission.findMany({
      where: {
        opportunityId: {
          in: [firstOpportunity.id, secondOpportunity.id],
        },
      },
    });

    expect(submissions).toHaveLength(2);
  });

  it("supports reapplication through a new Opportunity", async () => {
    const firstOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Senior Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    const firstSubmission = await submissionService.submit(
      ownerId,
      firstOpportunity.id,
      {
        submittedAt: new Date("2026-08-19T10:00:00.000Z"),
        method: "Company website",
      },
    );

    const secondOpportunity = await prisma.opportunity.create({
      data: {
        ownerId,
        companyName: "Acme Corporation",
        positionTitle: "Staff Software Engineer",
        statusId: discoveredStatusId,
      },
    });

    const secondSubmission = await submissionService.submit(
      ownerId,
      secondOpportunity.id,
      {
        submittedAt: new Date("2026-08-20T10:00:00.000Z"),
        method: "Company website",
      },
    );

    expect(secondOpportunity.id).not.toBe(firstOpportunity.id);

    expect(firstSubmission.submission.opportunityId).toBe(firstOpportunity.id);

    expect(secondSubmission.submission.opportunityId).toBe(
      secondOpportunity.id,
    );

    expect(firstSubmission.submission.id).not.toBe(
      secondSubmission.submission.id,
    );

    expect(firstSubmission.opportunity.status.key).toBe("SUBMITTED");

    expect(secondSubmission.opportunity.status.key).toBe("SUBMITTED");

    const submissions = await prisma.submission.findMany({
      where: {
        opportunity: {
          ownerId,
          companyName: "Acme Corporation",
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    expect(submissions).toHaveLength(2);
    expect(submissions.map((submission) => submission.opportunityId)).toEqual([
      firstOpportunity.id,
      secondOpportunity.id,
    ]);
  });
});
