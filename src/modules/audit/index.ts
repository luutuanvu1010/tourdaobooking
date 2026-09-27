// API công khai của module audit — module khác CHỈ import từ file này.
// Nhật ký chỉ ghi thêm (append-only). Hàm ghi trả về câu lệnh D1 chưa chạy để module gọi gộp vào
// cùng một db.batch() với thay đổi dữ liệu → ghi nhật ký và đổi dữ liệu thành công/thất bại cùng nhau.
// Route riêng: GET /api/audit (nhật ký toàn hệ thống) — chỉ admin. Module không phụ thuộc module nào.
import { error, intParam, json } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
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

export const auditModule: AppModule = {
  name: "audit",
  routes: [
    route("GET", "/api/audit", "admin", async ({ env, url, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (!can(staff, "audit.view")) return error(403, "forbidden", "Trang Nhật ký chỉ người phụ trách hệ thống xem được."); // ADR-0038 điều 6
      const raw = url.searchParams.get("action");
      const action = raw ? (isAuditAction(raw) ? raw : undefined) : null;
      if (action === undefined) return error(400, "invalid_input", "Hành động lọc không hợp lệ.");
      return json(
        await listAll(env.DB, {
          action,
          q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
          limit: intParam(url.searchParams.get("limit"), 50, 1, 100),
          offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
          hideSilent: !can(staff, "admin.manage.superadmin"), // ADR-0038: chỉ Toàn quyền xem thao tác im lặng của Toàn quyền
        }),
      );
    }),
  ],
};
