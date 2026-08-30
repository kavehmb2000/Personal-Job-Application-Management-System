import { spawnSync } from "node:child_process";

function run(command: string): number {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.error) {
    console.error(result.error);
    return 1;
  }

  return result.status ?? 1;
}

let testExitCode = 1;

try {
  console.log("\n=== Resetting test database before test run ===\n");

  const resetBefore = run("npm run db:test:reset");

  if (resetBefore !== 0) {
    process.exitCode = resetBefore;
    process.exit();
  }

  console.log("\n=== Running integration tests ===\n");

  testExitCode = run("npx vitest run --project integration --maxWorkers=1");
} finally {
  console.log("\n=== Resetting test database after test run ===\n");

  const cleanupExitCode = run("npm run db:test:reset");

  if (testExitCode === 0 && cleanupExitCode !== 0) {
    testExitCode = cleanupExitCode;
  }
}

process.exitCode = testExitCode;
