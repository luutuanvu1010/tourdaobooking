// API công khai của module audit — module khác CHỈ import từ file này.
// Nhật ký chỉ ghi thêm (append-only). Hàm ghi trả về câu lệnh D1 chưa chạy để module gọi gộp vào
// cùng một db.batch() với thay đổi dữ liệu → ghi nhật ký và đổi dữ liệu thành công/thất bại cùng nhau.
// Route riêng: GET /api/audit (nhật ký toàn hệ thống) — chỉ admin.
import { requireAdmin } from "../auth";
import { error, json, type AppModule } from "../../shared/http";
import {
  insertStatement, isAuditAction, listAll, listByOrder,
  type AuditAction, type AuditEntry, type AuditInput, type AuditRecord,
} from "./repository";

export type { AuditAction, AuditEntry, AuditInput, AuditRecord };

/**
 * Câu lệnh ghi nhật ký. `onlyIf` (mệnh đề SQL, ví dụ "changes() > 0") làm dòng chỉ được ghi khi
 * mệnh đề đúng — để không ghi dấu vết cho thao tác đã bị chặn bởi điều kiện tranh chấp.
 */
export function auditStatement(db: D1Database, entry: AuditInput, onlyIf?: string): D1PreparedStatement {
  return insertStatement(db, entry, onlyIf);
}

export function getAuditTrail(db: D1Database, orderId: string): Promise<AuditEntry[]> {
  return listByOrder(db, orderId);
}

function intParam(v: string | null, fallback: number, min: number, max: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

export const auditModule: AppModule = {
  name: "audit",
  async handle(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/audit") return null;

    const staff = await requireAdmin(request, env);
    if (staff instanceof Response) return staff;
    if (request.method !== "GET") return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");

    const action = url.searchParams.get("action");
    if (action && !isAuditAction(action)) return error(400, "invalid_input", "Hành động lọc không hợp lệ.");
    return json(
      await listAll(env.DB, {
        action: (action as AuditAction | null) || null,
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        limit: intParam(url.searchParams.get("limit"), 50, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      }),
    );
  },
};
