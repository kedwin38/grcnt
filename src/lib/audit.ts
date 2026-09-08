import { db } from "./db";

type AuditActor = { id: number; name: string } | null;

export async function audit(
  actor: AuditActor,
  action: string,
  entity: string,
  entityId?: string | number,
  details?: unknown
) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.id,
        actorName: actor?.name ?? "system",
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    console.error("audit log failed:", err);
  }
}
