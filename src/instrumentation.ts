// Runs once when the Next.js server process starts. The edge/middleware
// bundler still statically resolves everything inside register(), so the
// actual (Node-only) scheduler logic lives in a separate file imported only
// on the nodejs runtime branch — otherwise bundling middleware.ts fails on
// node:crypto/node:fs pulled in transitively via the backup/settings libs.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
