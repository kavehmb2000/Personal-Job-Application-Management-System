import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

const developmentDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!developmentDatabaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is not configured");
}

if (developmentDatabaseUrl === testDatabaseUrl) {
  throw new Error(
    "Refusing to reset development database: DATABASE_URL matches DATABASE_URL_TEST",
  );
}

console.log("WARNING: This will permanently delete all data in:");
console.log("  DATABASE_URL");
console.log("  development database");
console.log("");
console.log("The test database will NOT be modified.");
console.log("");

if (process.env.CONFIRM_DEV_DB_RESET !== "yes") {
  throw new Error(
    "Development database reset not confirmed. " +
      "Set CONFIRM_DEV_DB_RESET=yes to continue.",
  );
}

const result = spawnSync("npx prisma migrate reset --force", {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: developmentDatabaseUrl,
  },
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const seedResult = spawnSync("npx prisma db seed", {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: developmentDatabaseUrl,
  },
});

if (seedResult.error) {
  throw seedResult.error;
}

if (seedResult.status !== 0) {
  process.exit(seedResult.status ?? 1);
}
