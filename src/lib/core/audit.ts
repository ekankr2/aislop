import { db } from "./db/client";
import { auditLog } from "./db/schema";
import { nowKst } from "./time";

// 중요한 운영 작업은 전부 여기를 지난다(브리핑 §5). 실패해도 본 작업을 되돌리지
// 않지만 조용히 넘어가지도 않는다 — 로그가 안 남은 걸 나중에 알 방법이 없기 때문이다.
export async function logAudit(entry: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  meta?: unknown;
}): Promise<void> {
  await db()
    .insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      reason: entry.reason ?? null,
      meta: entry.meta === undefined ? null : JSON.stringify(entry.meta),
      createdAt: nowKst(),
    });
}
