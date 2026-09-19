import { isAuditAction, type AuditAction, type AuditTargetType } from "../../shared/audit-actions";
import type { AuditEntryDto, AuditListResponse, AuditRecordDto } from "../../shared/contracts";

export { isAuditAction, type AuditAction, type AuditTargetType };

export interface AuditInput {
  /** Người thao tác; bỏ trống (null) = hệ thống tự làm (vd Cron đồng bộ Sheet). */
  staffId?: string | null;
  action: AuditAction;
  at: string;
  orderId?: string; // hành động thuộc một đơn
  targetType?: AuditTargetType;
  targetId?: string;
  /** Mô tả ngắn cho người đọc. KHÔNG bao giờ đưa PIN hay bí mật vào đây. */
  detail?: string;
}

export type AuditEntry = AuditEntryDto;
export type AuditRecord = AuditRecordDto;

export function insertStatement(db: D1Database, e: AuditInput, onlyIf?: string): D1PreparedStatement {
  // SQL không còn CHECK liệt kê (0007) → chốt ở đây để giá trị lạ không bao giờ vào nhật ký.
  if (!isAuditAction(e.action)) throw new Error(`Hành động nhật ký không hợp lệ: ${String(e.action)}`);
  const targetType = e.targetType ?? (e.orderId ? "order" : null);
  const targetId = e.targetId ?? e.orderId ?? null;
  return db
    .prepare(
      `INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ? ${onlyIf ? `WHERE ${onlyIf}` : ""}`,
    )
    .bind(crypto.randomUUID(), e.orderId ?? null, e.staffId ?? null, e.action, targetType, targetId, e.detail ?? null, e.at);
}

export const SYSTEM_ACTOR_NAME = "Hệ thống (tự động)";

export async function listByOrder(db: D1Database, orderId: string): Promise<AuditEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT a.action, a.staff_id, s.full_name AS staff_name, a.detail, a.created_at
       FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id
       WHERE a.order_id = ? ORDER BY a.created_at, a.rowid`,
    )
    .bind(orderId)
    .all<{ action: AuditAction; staff_id: string | null; staff_name: string | null; detail: string | null; created_at: string }>();
  return results.map((r) => ({ action: r.action, staffId: r.staff_id, staffName: r.staff_name ?? SYSTEM_ACTOR_NAME, at: r.created_at, detail: r.detail }));
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Nhật ký toàn hệ thống, mới nhất trước; lọc theo hành động và/hoặc tìm theo đối tượng / tên người thao tác. */
export async function listAll(
  db: D1Database,
  opts: { action: AuditAction | null; q: string; limit: number; offset: number },
): Promise<AuditListResponse> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.action) {
    where.push("a.action = ?");
    binds.push(opts.action);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(
      "(o.order_code LIKE ? ESCAPE '\\' OR s.full_name LIKE ? ESCAPE '\\' OR t.full_name LIKE ? ESCAPE '\\' OR (a.target_type = 'catalog' AND a.target_id LIKE ? ESCAPE '\\'))",
    );
    binds.push(like, like, like, like);
  }
  // LEFT JOIN: hành động không gắn với đơn (order_id NULL) vẫn phải hiện ra.
  const { results } = await db
    .prepare(
      `SELECT a.id, a.action, a.staff_id, s.full_name AS staff_name, a.order_id, o.order_code,
              a.target_type, a.target_id, t.full_name AS target_staff_name, a.detail, a.created_at
       FROM audit_log a
       LEFT JOIN staff s ON s.id = a.staff_id
       LEFT JOIN orders o ON o.id = a.order_id
       LEFT JOIN staff t ON a.target_type = 'staff' AND t.id = a.target_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY a.created_at DESC, a.rowid DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<{
      id: string; action: AuditAction; staff_id: string | null; staff_name: string | null; order_id: string | null; order_code: string | null;
      target_type: AuditTargetType | null; target_id: string | null; target_staff_name: string | null; detail: string | null; created_at: string;
    }>();
  const entries = results.slice(0, opts.limit).map((r) => ({
    id: r.id,
    action: r.action,
    staffId: r.staff_id,
    staffName: r.staff_name ?? SYSTEM_ACTOR_NAME,
    at: r.created_at,
    detail: r.detail,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.order_code ?? r.target_staff_name ?? (r.target_type === "catalog" ? r.target_id : null),
    orderId: r.order_id,
  }));
  return { entries, hasMore: results.length > opts.limit };
}
