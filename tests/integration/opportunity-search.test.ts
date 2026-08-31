import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { OpportunityRepository } from "@/lib/repositories/opportunity-repository";

describe("Opportunity search and filtering", () => {
  const repository = new OpportunityRepository();

  let ownerId: string;
  let otherOwnerId: string;
  let discoveredStatusId: string;
  let submittedStatusId: string;
  let otherDiscoveredStatusId: string;
  let roleFamilyId: string;
  let otherRoleFamilyId: string;

  beforeAll(async () => {
    const owner = await prisma.ownerAccount.create({
      data: {
        googleSubject: "integration-search-owner",
        email: "integration-search-owner@example.test",
        displayName: "Integration Search Owner",
      },
    });

    ownerId = owner.id;

    const otherOwner = await prisma.ownerAccount.create({
      data: {
        googleSubject: "integration-search-other-owner",
        email: "integration-search-other-owner@example.test",
        displayName: "Integration Search Other Owner",
      },
    });

    otherOwnerId = otherOwner.id;

    const discoveredStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    discoveredStatusId = discoveredStatus.id;

    const submittedStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId,
        key: "SUBMITTED",
        label: "Submitted",
        sortOrder: 2,
        isTerminal: false,
        isActive: true,
      },
    });

    submittedStatusId = submittedStatus.id;

    const otherDiscoveredStatus = await prisma.lifecycleStatus.create({
      data: {
        ownerId: otherOwnerId,
        key: "DISCOVERED",
        label: "Discovered",
        sortOrder: 1,
        isTerminal: false,
        isActive: true,
      },
    });

    otherDiscoveredStatusId = otherDiscoveredStatus.id;

    const roleFamily = await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Software Engineering",
        sortOrder: 1,
        isActive: true,
      },
    });

    roleFamilyId = roleFamily.id;

    const otherRoleFamily = await prisma.roleFamily.create({
      data: {
        ownerId,
        name: "Product Management",
        sortOrder: 2,
        isActive: true,
      },
    });

    otherRoleFamilyId = otherRoleFamily.id;

    await prisma.opportunity.createMany({
      data: [
        {
          ownerId,
          statusId: discoveredStatusId,
          roleFamilyId,
          companyName: "Acme Technologies",
          positionTitle: "Senior Backend Engineer",
          location: "Frankfurt",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date("2026-08-01T10:00:00.000Z"),
        },
        {
          ownerId,
          statusId: submittedStatusId,
          roleFamilyId,
          companyName: "Globex Corporation",
          positionTitle: "Platform Engineer",
          location: "Berlin",
          country: "Germany",
          source: "Company Website",
          discoveredAt: new Date("2026-08-02T10:00:00.000Z"),
        },
        {
          ownerId,
          statusId: discoveredStatusId,
          roleFamilyId: otherRoleFamilyId,
          companyName: "Initech",
          positionTitle: "Product Manager",
          location: "Munich",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date("2026-08-03T10:00:00.000Z"),
        },
        {
          ownerId,
          statusId: discoveredStatusId,
          roleFamilyId,
          companyName: "Northwind",
          positionTitle: "Data Engineer",
          location: "Paris",
          country: "France",
          source: "LinkedIn",
          discoveredAt: new Date("2026-08-04T10:00:00.000Z"),
        },
        {
          ownerId,
          statusId: discoveredStatusId,
          roleFamilyId,
          companyName: "Archived Systems",
          positionTitle: "Backend Engineer",
          location: "Frankfurt",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date("2026-08-05T10:00:00.000Z"),
          archivedAt: new Date("2026-08-06T10:00:00.000Z"),
        },
        {
          ownerId: otherOwnerId,
          statusId: otherDiscoveredStatusId,
          companyName: "Acme Technologies",
          positionTitle: "Backend Engineer",
          location: "Frankfurt",
          country: "Germany",
          source: "LinkedIn",
          discoveredAt: new Date("2026-08-10T10:00:00.000Z"),
        },
      ],
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

    await prisma.lifecycleStatus.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.roleFamily.deleteMany({
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

    await prisma.$disconnect();
  });

  it("returns all non-archived opportunities for the owner", async () => {
    const opportunities = await repository.list(ownerId);

    expect(opportunities).toHaveLength(4);

    expect(opportunities.map((opportunity) => opportunity.companyName)).toEqual(
      ["Northwind", "Initech", "Globex Corporation", "Acme Technologies"],
    );
  });

  it("searches case-insensitively across company name and position title", async () => {
    const byCompany = await repository.list(ownerId, {
      search: "ACME",
    });

    expect(byCompany).toHaveLength(1);
    expect(byCompany[0]?.companyName).toBe("Acme Technologies");

    const byPosition = await repository.list(ownerId, {
      search: "BACKEND",
    });

    expect(byPosition).toHaveLength(1);
    expect(byPosition[0]?.companyName).toBe("Acme Technologies");
  });

  it("uses substring matching for search", async () => {
    const opportunities = await repository.list(ownerId, {
      search: "engine",
    });

    expect(opportunities.map((opportunity) => opportunity.companyName)).toEqual(
      ["Northwind", "Globex Corporation", "Acme Technologies"],
    );
  });

  it("treats an empty or whitespace-only search as no search filter", async () => {
    const opportunities = await repository.list(ownerId, {
      search: "   ",
    });

    expect(opportunities).toHaveLength(4);
  });

  it("filters by lifecycle status", async () => {
    const opportunities = await repository.list(ownerId, {
      status: "SUBMITTED",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Globex Corporation");
  });

  it("filters by country", async () => {
    const opportunities = await repository.list(ownerId, {
      country: "France",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Northwind");
  });

  it("filters by location", async () => {
    const opportunities = await repository.list(ownerId, {
      location: "Frankfurt",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Acme Technologies");
  });

  it("filters by role family", async () => {
    const opportunities = await repository.list(ownerId, {
      roleFamilyId,
    });

    expect(opportunities).toHaveLength(3);

    expect(opportunities.map((opportunity) => opportunity.companyName)).toEqual(
      ["Northwind", "Globex Corporation", "Acme Technologies"],
    );
  });

  it("filters by source", async () => {
    const opportunities = await repository.list(ownerId, {
      source: "Company Website",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Globex Corporation");
  });

  it("combines filters with AND semantics", async () => {
    const opportunities = await repository.list(ownerId, {
      search: "engine",
      country: "Germany",
      location: "Frankfurt",
      roleFamilyId,
      source: "LinkedIn",
      status: "DISCOVERED",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Acme Technologies");
  });

  it("never returns archived opportunities", async () => {
    const opportunities = await repository.list(ownerId, {
      search: "Archived",
    });

    expect(opportunities).toHaveLength(0);
  });

  it("never returns another owner's opportunities", async () => {
    const opportunities = await repository.list(ownerId, {
      search: "Acme",
    });

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.companyName).toBe("Acme Technologies");
    expect(opportunities[0]?.ownerId).toBe(ownerId);
  });

  it("preserves discoveredAt descending ordering after filtering", async () => {
    const opportunities = await repository.list(ownerId, {
      roleFamilyId,
    });

    expect(
      opportunities.map((opportunity) => opportunity.discoveredAt),
    ).toEqual([
      new Date("2026-08-04T10:00:00.000Z"),
      new Date("2026-08-02T10:00:00.000Z"),
      new Date("2026-08-01T10:00:00.000Z"),
    ]);
  });
});
