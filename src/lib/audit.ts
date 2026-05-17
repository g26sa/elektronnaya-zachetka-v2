import { prisma } from "@/lib/db";
import type { AuditAction } from "@/types/enums";

export async function audit(params: {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  const diff =
    params.before !== undefined || params.after !== undefined
      ? JSON.stringify({ before: params.before, after: params.after })
      : null;
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      diff,
      ip: params.ip ?? null,
    },
  });
}
