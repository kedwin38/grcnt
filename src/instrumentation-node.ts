// Node-only backup scheduler — imported exclusively from instrumentation.ts's
// nodejs branch, never bundled for the edge runtime. See that file for why
// this logic can't simply live inline there.
import { getSettingGroup } from "./lib/settings";
import { isBackupDue, runBackup } from "./lib/backup";

const g = globalThis as unknown as { __gcnBackupTimer?: NodeJS.Timeout };

if (!g.__gcnBackupTimer) {
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  let running = false;

  const checkAndRun = async () => {
    if (running) return;
    running = true;
    try {
      const cfg = await getSettingGroup("backup");
      if (isBackupDue(cfg)) await runBackup();
    } catch (err) {
      console.error("scheduled backup failed:", err);
    } finally {
      running = false;
    }
  };

  void checkAndRun();
  g.__gcnBackupTimer = setInterval(checkAndRun, CHECK_INTERVAL_MS);
}
