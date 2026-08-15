import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const lifecycleStatuses = [
  { name: "Discovered", sortOrder: 10, isTerminal: false },
  { name: "Evaluating", sortOrder: 20, isTerminal: false },
  { name: "Preparing", sortOrder: 30, isTerminal: false },
  { name: "Ready to Apply", sortOrder: 40, isTerminal: false },
  { name: "Applied", sortOrder: 50, isTerminal: false },
  { name: "Recruiter Contact", sortOrder: 60, isTerminal: false },
  { name: "Screening", sortOrder: 70, isTerminal: false },
  { name: "Interview", sortOrder: 80, isTerminal: false },
  { name: "Technical Challenge", sortOrder: 90, isTerminal: false },
  { name: "Final Interview", sortOrder: 100, isTerminal: false },
  { name: "Offer", sortOrder: 110, isTerminal: true },
  { name: "Rejected", sortOrder: 120, isTerminal: true },
  { name: "Withdrawn", sortOrder: 130, isTerminal: true },
  { name: "Closed / No Response", sortOrder: 140, isTerminal: true },
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

  for (const status of lifecycleStatuses) {
    await prisma.lifecycleStatus.upsert({
      where: {
        ownerId_name: {
          ownerId: owner.id,
          name: status.name,
        },
      },
      update: {
        sortOrder: status.sortOrder,
        isTerminal: status.isTerminal,
        isActive: true,
      },
      create: {
        ownerId: owner.id,
        ...status,
      },
    });
  }

  for (const roleFamily of roleFamilies) {
    await prisma.roleFamily.upsert({
      where: {
        name: roleFamily.name,
      },
      update: {
        sortOrder: roleFamily.sortOrder,
        isActive: true,
      },
      create: roleFamily,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
