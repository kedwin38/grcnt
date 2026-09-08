// Production start: migrate database → seed defaults → serve.
import { spawnSync, spawn } from "node:child_process";

try {
  process.loadEnvFile();
} catch {
  /* no .env in production — Railway provides real env vars */
}

console.log("→ running database migrations…");
const migrate = spawnSync("npx prisma migrate deploy", {
  shell: true,
  stdio: "inherit",
  env: process.env,
});
if (migrate.status !== 0) {
  console.error("✗ migrations failed — exiting");
  process.exit(1);
}

console.log("→ bootstrapping defaults…");
const bootstrap = spawnSync("node scripts/bootstrap.mjs", {
  shell: true,
  stdio: "inherit",
  env: process.env,
});
if (bootstrap.status !== 0) {
  console.error("✗ bootstrap failed — exiting");
  process.exit(1);
}

const port = process.env.PORT || 3000;
console.log(`→ starting Next.js on 0.0.0.0:${port}…`);
const server = spawn(`npx next start -H 0.0.0.0 -p ${port}`, {
  shell: true,
  stdio: "inherit",
  env: process.env,
});
server.on("exit", (code) => process.exit(code ?? 0));
