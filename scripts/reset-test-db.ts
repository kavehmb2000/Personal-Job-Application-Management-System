import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

const developmentDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is not configured");
}

if (!developmentDatabaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

if (testDatabaseUrl === developmentDatabaseUrl) {
  throw new Error(
    "Refusing to reset test database: DATABASE_URL_TEST matches DATABASE_URL",
  );
}

const env = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
};

function run(command: string) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx prisma migrate reset --force");
run("npx prisma db seed");
