import { config } from "dotenv";

config({ path: ".env.local" });

const developmentDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is not configured");
}

if (testDatabaseUrl === developmentDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_TEST must point to a separate database from DATABASE_URL",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
