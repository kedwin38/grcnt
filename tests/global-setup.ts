import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_PATH = path.resolve(__dirname, "./test.sqlite");

export async function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(TEST_DB_PATH + suffix, { force: true });
  }
  execSync("npx prisma db push --skip-generate", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "inherit",
  });
}

export async function teardown() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(TEST_DB_PATH + suffix, { force: true });
  }
}
