// Node-only backup scheduler — imported exclusively from instrumentation.ts's
// nodejs branch, never bundled for the edge runtime. See that file for why
// this logic can't simply live inline there.
import { getSettingGroup } from "./lib/settings";
import { isBackupDue, runBackup } from "./lib/backup";
import { reconcileStalePayments } from "./lib/payment-reconciliation";

const g = globalThis as unknown as {
  __gcnBackupTimer?: NodeJS.Timeout;
  __gcnPaymentReconcileTimer?: NodeJS.Timeout;
};

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

// A customer can close the checkout tab before their payment resolves — this
// sweep keeps resolving pending M-Pesa payments (success/failure/timeout)
// independently of anyone polling the status endpoint, so an order is never
// left hanging in PENDING_PAYMENT indefinitely just because nobody's
// watching.
if (!g.__gcnPaymentReconcileTimer) {
  const CHECK_INTERVAL_MS = 20 * 1000;
  let running = false;

  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await reconcileStalePayments();
    } catch (err) {
      console.error("payment reconciliation sweep failed:", err);
    } finally {
      running = false;
    }
  };

  void sweep();
  g.__gcnPaymentReconcileTimer = setInterval(sweep, CHECK_INTERVAL_MS);
}
