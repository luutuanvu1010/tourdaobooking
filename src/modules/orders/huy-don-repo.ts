// TỆP SQL "NỬA NGHIÊM" của module orders cho LÝ DO HUỶ ĐƠN (ADR-0089 đ8, X-2; migration 0078; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu đăng ký
// bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN. Chỉ chạm bảng của orders. Import kèm đuôi .ts, không import module khác.
//
// LÔ HUỶ (một `db.batch`, ADR-0094 V1): (1) chèn dòng lý do CHỈ KHI đơn còn đúng trạng thái + `updated_at` đã đọc (cùng điều kiện khoá lạc quan với câu 2 ⇒
// hai câu cùng áp hoặc cùng không — không để dòng lý do mồ côi khi thua), (2) đổi trạng thái (trigger `orders_cancel_requires_reason` canh), (3) nhật ký
// `changes() > 0` (do repository.ts nối).
import { defineSql } from "../../shared/sql-registry.ts";
import type { LyDoHuy } from "../../shared/ly-do-huy.ts";

const LY_DO_COLS = "id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by";

const LY_DO_NEU_CON_TRANG_THAI = defineSql(
  "orders",
  "cancel_reason_insert",
  `INSERT INTO ord_cancel_reason (${LY_DO_COLS})
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, NULL, 0, ?7, ?8, ?7, ?8
   WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?2 AND status = ?9 AND updated_at = ?10)`,
);
const HUY_DON = defineSql(
  "orders",
  "cancel_order",
  `UPDATE orders SET status = 'cancelled', updated_at = ?1 WHERE id = ?2 AND status = ?3 AND updated_at = ?4`,
);

/** Hai câu đầu của lô huỷ (lý do → đổi trạng thái). `at` = mốc mới của đơn; `homNay` = ngày huỷ (ngày VN, máy chủ truyền). */
export function cauHuyCoLyDo(
  db: D1Database,
  input: { orderId: string; staffId: string; from: string; prevUpdatedAt: string; at: string; homNay: string; lyDo: LyDoHuy },
): D1PreparedStatement[] {
  return [
    db.prepare(LY_DO_NEU_CON_TRANG_THAI).bind(crypto.randomUUID(), input.orderId, input.lyDo.ma, input.lyDo.nhom, input.lyDo.ghiChu, input.homNay, input.at, input.staffId, input.from, input.prevUpdatedAt),
    db.prepare(HUY_DON).bind(input.at, input.orderId, input.from, input.prevUpdatedAt),
  ];
}

const LY_DO_HIEN_HANH = defineSql(
  "orders",
  "cancel_reason_current",
  `SELECT r.id, r.reason_code, r.group_code, r.note, r.cancelled_date, r.legacy,
     (SELECT g.reason_code FROM ord_cancel_reason g WHERE g.order_id = r.order_id AND g.reclassifies_id IS NULL) AS first_reason_code,
     (SELECT g.note FROM ord_cancel_reason g WHERE g.order_id = r.order_id AND g.reclassifies_id IS NULL) AS first_note
   FROM ord_cancel_reason r
   WHERE r.order_id = ?1 AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason x WHERE x.reclassifies_id = r.id)`,
);
export interface LyDoHienHanhRow {
  id: string;
  reason_code: string;
  group_code: string;
  note: string | null;
  cancelled_date: string;
  legacy: number;
  /** Lý do LÚC HUỶ (dòng gốc) — dòng hiện hành có thể là dòng phân loại. */
  first_reason_code: string;
  first_note: string | null;
}
/** Dòng lý do hiện hành của một đơn (null = đơn chưa huỷ / chưa có dòng). */
export const lyDoHienHanh = (db: D1Database, orderId: string): Promise<LyDoHienHanhRow | null> => db.prepare(LY_DO_HIEN_HANH).bind(orderId).first<LyDoHienHanhRow>();

/**
 * Phân loại (Quản trị/Toàn quyền — NT-L5, NT-L6): chèn dòng phân loại trỏ đúng dòng hiện hành đã đọc (`?2`), CHỈ KHI dòng đó còn hiện hành và là
 * "chưa kết luận" (người khác vừa phân loại ⇒ không chèn — `changes() = 0`). Giữ ngày huỷ + cờ legacy của dòng gốc (trigger cũng canh).
 */
const PHAN_LOAI = defineSql(
  "orders",
  "cancel_reason_reclassify",
  `INSERT INTO ord_cancel_reason (${LY_DO_COLS})
   SELECT ?1, g.order_id, 'PHAN_LOAI', ?3, ?4, g.cancelled_date, g.id, g.legacy, ?5, ?6, ?5, ?6
   FROM ord_cancel_reason g
   WHERE g.id = ?2 AND g.order_id = ?7 AND g.group_code = 'CHUA_KET_LUAN' AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason x WHERE x.reclassifies_id = g.id)`,
);
export const phanLoaiStatement = (
  db: D1Database,
  input: { orderId: string; hienHanhId: string; nhom: string; ghiChu: string; at: string; staffId: string },
): D1PreparedStatement => db.prepare(PHAN_LOAI).bind(crypto.randomUUID(), input.hienHanhId, input.nhom, input.ghiChu, input.at, input.staffId, input.orderId);
