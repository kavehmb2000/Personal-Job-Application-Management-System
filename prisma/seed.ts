import dotenv from "dotenv";
import { PrismaClient, LifecycleStateKey } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const lifecycleStatuses: Array<{
  key: LifecycleStateKey;
  label: string;
  sortOrder: number;
  isTerminal: boolean;
}> = [
  {
    key: "DISCOVERED",
    label: "Discovered",
    sortOrder: 10,
    isTerminal: false,
  },
  {
    key: "SUBMITTED",
    label: "Submitted",
    sortOrder: 20,
    isTerminal: false,
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    sortOrder: 30,
    isTerminal: false,
  },
  {
    key: "OFFER",
    label: "Offer",
    sortOrder: 40,
    isTerminal: false,
  },
  {
    key: "CLOSED",
    label: "Closed",
    sortOrder: 50,
    isTerminal: true,
  },
  {
    key: "CANCELLED",
    label: "Cancelled",
    sortOrder: 60,
    isTerminal: true,
  },
  {
    key: "REJECTED",
    label: "Rejected",
    sortOrder: 70,
    isTerminal: true,
  },
];

const lifecycleTransitions: Array<[LifecycleStateKey, LifecycleStateKey]> = [
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

const roleFamilies = [
  { name: "Data & AI", sortOrder: 10 },
  { name: "Software Engineering", sortOrder: 20 },
  { name: "Product Management", sortOrder: 30 },
  { name: "Product Engineering", sortOrder: 40 },
  { name: "Project / Program Management", sortOrder: 50 },
  { name: "Engineering Management", sortOrder: 60 },
];

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL is required");
  }

  const owner = await prisma.ownerAccount.upsert({
    where: {
      email: ownerEmail,
    },
    update: {},
    create: {
      email: ownerEmail,
      googleSubject: `seed:${ownerEmail}`,
      displayName: ownerEmail,
    },
  });

  const statusIds = new Map<LifecycleStateKey, string>();

  for (const status of lifecycleStatuses) {
    const lifecycleStatus = await prisma.lifecycleStatus.upsert({
      where: {
        ownerId_key: {
          ownerId: owner.id,
          key: status.key,
        },
      },
      update: {
        label: status.label,
        sortOrder: status.sortOrder,
        isTerminal: status.isTerminal,
        isActive: true,
      },
      create: {
        ownerId: owner.id,
        key: status.key,
        label: status.label,
        sortOrder: status.sortOrder,
        isTerminal: status.isTerminal,
        isActive: true,
      },
    });

    statusIds.set(status.key, lifecycleStatus.id);
  }

  for (const [fromKey, toKey] of lifecycleTransitions) {
    const fromStatusId = statusIds.get(fromKey);
    const toStatusId = statusIds.get(toKey);

    if (!fromStatusId || !toStatusId) {
      throw new Error(
        `Missing lifecycle status for transition ${fromKey} -> ${toKey}`,
      );
    }

    await prisma.lifecycleTransition.upsert({
      where: {
        fromStatusId_toStatusId: {
          fromStatusId,
          toStatusId,
        },
      },
      update: {},
      create: {
        fromStatusId,
        toStatusId,
      },
    });
  }

  for (const roleFamily of roleFamilies) {
    await prisma.roleFamily.upsert({
      where: {
        ownerId_name: {
          ownerId: owner.id,
          name: roleFamily.name,
        },
      },
      update: {
        sortOrder: roleFamily.sortOrder,
        isActive: true,
      },
      create: {
        ownerId: owner.id,
        ...roleFamily,
      },
    });
  }

  console.log(`Seeded owner: ${owner.email}`);
  console.log(`Seeded lifecycle states: ${lifecycleStatuses.length}`);
  console.log(`Seeded lifecycle transitions: ${lifecycleTransitions.length}`);
  console.log(`Seeded role families: ${roleFamilies.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
