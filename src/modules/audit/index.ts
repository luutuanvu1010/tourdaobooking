// API công khai của module audit — module khác CHỈ import từ file này.
// Nhật ký chỉ ghi thêm (append-only). Hàm ghi trả về câu lệnh D1 chưa chạy để module gọi gộp vào
// cùng một db.batch() với thay đổi dữ liệu → ghi nhật ký và đổi dữ liệu thành công/thất bại cùng nhau.
// Route riêng: GET /api/audit (nhật ký toàn hệ thống) — chỉ admin. Module không phụ thuộc module nào.
import { error, intParam, json } from "../../shared/http";
import { can, holdsPartner, laTacNhan, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import {
  insertStatement, isAuditAction, listAll, listByOrder, listReturnedOrders,
  type AuditAction, type AuditEntry, type AuditInput, type AuditRecord,
} from "./repository";

export type { AuditAction, AuditEntry, AuditInput, AuditRecord };
export { CHAM_TAI_KHOAN, CHI_TIET_DOI_SDT, type LoaiCham } from "./cham-tai-khoan";
// Đợt 2 sau kiểm toán: soát tiền hằng ngày (tác nhân SOAT_TIEN_HANG_NGAY, chỉ đọc) — gốc lắp ráp gọi ở Cron.
export { soatTienHangNgay } from "./soat-tien-hang-ngay";

/**
 * Câu lệnh ghi nhật ký. `onlyIf` (mệnh đề SQL, ví dụ "changes() > 0") làm dòng chỉ được ghi khi
 * mệnh đề đúng — để không ghi dấu vết cho thao tác đã bị chặn bởi điều kiện tranh chấp.
 */
export function auditStatement(db: D1Database, entry: AuditInput, onlyIf?: string): D1PreparedStatement {
  return insertStatement(db, entry, onlyIf);
}

/** Hành động quản trị tổ chức (ADR-0213 Đ6) — CHỈ chúng được ghi `acting_party_id` qua `auditToChucStatement`. */
const HANH_DONG_TO_CHUC: readonly AuditAction[] = [
  "org_manager_assigned", "org_manager_transferred", "org_manager_removed", "org_transfer_requested", "org_member_removed", "org_member_left", "org_notice_resent",
  "org_invite_created", "org_invite_cancelled", "org_invite_accepted", // ADR-0213 Đ7 (mốc B2, Task 15)
  "org_member_mode_set", // ADR-0213 Đ8.3 (mốc B2, Task 16)
];
/**
 * Ngoại lệ có tên của Đ3.5 (ruling PF18, mốc B1 Task 10): nhật ký quản trị tổ chức ghi THẲNG `acting_party_id` = hồ sơ tổ chức (đích của lệnh), không qua bối cảnh yêu cầu.
 * Hàm ghi chung `auditStatement` KHÔNG nhận trường này (Task 11 điền từ tư cách của yêu cầu); hành động ngoài danh sách trên ⇒ ném lỗi, không dựng câu.
 */
export function auditToChucStatement(db: D1Database, entry: AuditInput & { targetId: string }, onlyIf?: string): D1PreparedStatement {
  if (!HANH_DONG_TO_CHUC.includes(entry.action)) throw new Error(`auditToChucStatement: hành động ${entry.action} không phải quản trị tổ chức`);
  return insertStatement(db, { ...entry, targetType: "party" }, onlyIf, entry.targetId);
}

/** ADR-0186 Đ4: dấu người làm của dòng nhật ký theo NGƯỜI PHÁT LỆNH — người: `staffId`; tác nhân tự động: `agentCode` (không bao giờ rỗng cả hai). */
export function nguoiLam(who: PermissionHolder): Pick<AuditInput, "staffId" | "agentCode"> {
  return laTacNhan(who) ? { staffId: null, agentCode: who.tacNhan } : { staffId: who.id, agentCode: null };
}

/**
 * Hàm công bố cho `orders` (hàng chờ) và `dispatch` (trang đơn văn phòng): tập đơn «được trả lại» — lần thay đổi người phụ trách gần nhất là Từ chối (ADR-0030
 * điều 3). Chỉ cờ, không tên người trả, không lý do (ADR-0131). Mảng rỗng → tập rỗng, không truy vấn.
 */
export async function donDuocTraLai(db: D1Database, orderIds: readonly string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  return new Set(await listReturnedOrders(db, orderIds));
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
          hideThuongMai: holdsPartner(staff), // bước K-a sổ đại lý đợt 1: "có quyền Đối tác là áp" — kể cả tài khoản lai Toàn quyền + Đối tác (`laHanhDongThuongMai`)
        }),
      );
    }),
  ],
};
