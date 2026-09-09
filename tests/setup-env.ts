import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "./test.sqlite")}`;
process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long-ok";
process.env.APP_URL = "http://localhost:3000";
process.env.MPESA_SIMULATE = "false";
// NODE_ENV is already "test" under Vitest by default.
