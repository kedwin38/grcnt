import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { db } from "./db";
import { getSettingGroup, saveSettingGroup, type BackupSettings } from "./settings";
import { audit } from "./audit";

export class BackupError extends Error {}

function client(cfg: BackupSettings): S3Client {
  return new S3Client({
    region: cfg.region || "auto",
    endpoint: cfg.endpoint || undefined,
    // Path-style addressing is what every non-AWS S3-compatible provider
    // (R2, B2, Spaces, MinIO) expects; real AWS S3 also accepts it.
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

function keyPrefix(cfg: BackupSettings): string {
  return cfg.prefix ? `${cfg.prefix.replace(/\/+$/, "")}/` : "";
}

async function enforceRetention(s3: S3Client, cfg: BackupSettings) {
  if (!cfg.retentionCount) return;
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: keyPrefix(cfg) })
  );
  const objects = (list.Contents || [])
    .filter((o) => o.Key?.includes("gcn-backup-"))
    .sort((a, b) => (a.LastModified?.getTime() ?? 0) - (b.LastModified?.getTime() ?? 0));
  const excess = objects.length - cfg.retentionCount;
  for (const obj of excess > 0 ? objects.slice(0, excess) : []) {
    if (obj.Key) await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: obj.Key }));
  }
}

/**
 * Snapshots the live SQLite database (via VACUUM INTO, which produces a
 * consistent copy even while the app keeps writing to it) and uploads it to
 * the admin-configured S3-compatible bucket. Safe to call concurrently with
 * normal app traffic; not safe to call twice at once (guarded by the caller).
 */
export async function runBackup(): Promise<{ key: string; size: number }> {
  const cfg = await getSettingGroup("backup");
  if (!cfg.bucket || !cfg.region || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new BackupError(
      "Fill in region, bucket and access credentials first, then save."
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tmpPath = path.join(os.tmpdir(), `gcn-backup-${stamp}.sqlite`);

  try {
    await db.$executeRaw`VACUUM INTO ${tmpPath}`;
    const data = await fs.readFile(tmpPath);
    const key = `${keyPrefix(cfg)}gcn-backup-${stamp}.sqlite`;

    const s3 = client(cfg);
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: data,
        ContentType: "application/x-sqlite3",
      })
    );
    await enforceRetention(s3, cfg);

    await saveSettingGroup("backup", {
      lastRunAt: new Date().toISOString(),
      lastRunOk: true,
      lastRunMessage: `Backed up ${(data.length / 1024).toFixed(0)} KB to ${key}`,
    });
    await audit(null, "backup.success", "backup", key, { size: data.length });

    return { key, size: data.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown backup error.";
    await saveSettingGroup("backup", {
      lastRunAt: new Date().toISOString(),
      lastRunOk: false,
      lastRunMessage: message,
    });
    await audit(null, "backup.failed", "backup", undefined, { message });
    throw err instanceof BackupError ? err : new BackupError(message);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

/** Whether a scheduled backup is due, based on the last recorded run. */
export function isBackupDue(cfg: BackupSettings): boolean {
  if (!cfg.enabled || !cfg.intervalHours) return false;
  const last = cfg.lastRunAt ? new Date(cfg.lastRunAt).getTime() : 0;
  return Date.now() >= last + cfg.intervalHours * 3600_000;
}
