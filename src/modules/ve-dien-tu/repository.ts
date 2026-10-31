// SQL của kho vé điện tử (`vdt_*`, migration 0131, ADR-0153 Đ1 — ĐỀ XUẤT chờ chủ duyệt). Câu tĩnh qua defineSql (module nghiêm).
// Mã vé, nội dung QR, khoá kho KHÔNG bao giờ vào nhật ký / phản hồi ghi / câu lỗi: hàm đọc ở đây không có bản trả mã vé thô ra ngoài module.
import { defineSql } from "../../shared/sql-registry.ts";

const DEM_VE_THEO_TRANG_THAI = defineSql("ve-dien-tu", "dem_ve_theo_trang_thai", "SELECT status, count(*) AS so FROM vdt_ticket GROUP BY status");

/** Số vé theo trạng thái (không mã, không ảnh). Dùng làm câu chạm đầu tiên của khung; thống kê theo dịch vụ/nhóm làm ở Task 4c. */
export const demVeTheoTrangThai = async (db: D1Database): Promise<Record<string, number>> => {
  const { results } = await db.prepare(DEM_VE_THEO_TRANG_THAI).all<{ status: string; so: number }>();
  return Object.fromEntries(results.map((r) => [r.status, r.so]));
};

// ===== Giữ chỗ (ADR-0153 Đ1 mục 3). Ba câu tĩnh; CHẠY TRONG MỘT `db.batch` do cap-ve.ts dựng: UPDATE vé → INSERT phân bổ → (nhật ký, gác `changes() > 0`).
// Tự giới hạn bằng chính SQL: số vé lấy = max(0, cần − đang giữ của dịch vụ/nhóm đó LÚC CHẠY) nên hai lô soạn cùng lúc không thể giữ thừa (D1 chạy từng lô trọn vẹn).
// KHÔNG đọc `audit_log` (module nghiêm): cổng là chính trạng thái vé.
const GIU_VE = defineSql(
  "ve-dien-tu",
  "giu_ve",
  `UPDATE vdt_ticket SET status = 'ALLOCATED', updated_at = ?6, updated_by = ?7
   WHERE id IN (
     SELECT t.id FROM vdt_ticket t JOIN vdt_batch b ON b.id = t.batch_id
     WHERE b.catalog_code = ?1 AND b.pax_group = ?2 AND b.status = 'ACTIVE' AND t.status = 'AVAILABLE' AND t.valid_from <= ?3 AND t.valid_to >= ?3
     ORDER BY t.valid_to, t.id
     LIMIT max(0, ?4 - (SELECT count(*) FROM vdt_allocation a WHERE a.order_service_id = ?5 AND a.pax_group = ?2 AND a.released_at IS NULL)))`,
);
const GHI_PHAN_BO = defineSql(
  "ve-dien-tu",
  "ghi_phan_bo",
  `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, allocated_by, created_at, created_by, updated_at, updated_by)
   SELECT lower(hex(randomblob(16))), t.id, ?3, ?4, ?2, 
          ROW_NUMBER() OVER (ORDER BY t.valid_to, t.id) + (SELECT COALESCE(MAX(a.slot_no), 0) FROM vdt_allocation a WHERE a.order_service_id = ?4 AND a.pax_group = ?2 AND a.released_at IS NULL),
          ?5, ?6, ?5, ?6, ?5, ?6
   FROM vdt_ticket t JOIN vdt_batch b ON b.id = t.batch_id
   WHERE t.status = 'ALLOCATED' AND b.catalog_code = ?1 AND b.pax_group = ?2
     AND NOT EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = t.id AND a.released_at IS NULL)`,
);
const DEM_DANG_GIU = defineSql(
  "ve-dien-tu",
  "dem_dang_giu",
  "SELECT pax_group, count(*) AS so FROM vdt_allocation WHERE order_service_id = ?1 AND released_at IS NULL GROUP BY pax_group",
);

export interface GiuChoVe { catalogCode: string; nhom: string; ngayDi: string; can: number; orderId: string; serviceId: string; at: string; by: string | null }

/** Câu UPDATE vé: AVAILABLE → ALLOCATED (chưa chạy). */
export const cauGiuVe = (db: D1Database, p: GiuChoVe): D1PreparedStatement => db.prepare(GIU_VE).bind(p.catalogCode, p.nhom, p.ngayDi, p.can, p.serviceId, p.at, p.by);
/** Câu INSERT phân bổ cho mọi vé vừa chuyển ALLOCATED mà chưa có chỗ (chưa chạy). */
export const cauGhiPhanBo = (db: D1Database, p: GiuChoVe): D1PreparedStatement => db.prepare(GHI_PHAN_BO).bind(p.catalogCode, p.nhom, p.orderId, p.serviceId, p.at, p.by);

/** Số vé đang giữ của một dòng dịch vụ theo nhóm (đếm, không mã vé). */
export const demDangGiu = async (db: D1Database, serviceId: string): Promise<Record<string, number>> => {
  const { results } = await db.prepare(DEM_DANG_GIU).bind(serviceId).all<{ pax_group: string; so: number }>();
  return Object.fromEntries(results.map((r) => [r.pax_group, r.so]));
};

// ===== Trả vé (ADR-0153 Đ1 mục 6). Hai câu tĩnh + nhật ký gác `changes() > 0` sau câu vé; chạy TRONG lô huỷ / sửa của orders (Task 5).
// Chọn dòng trả: theo nhóm (khi giảm số khách) — vé CHƯA lộ trước, vị trí lớn trước; `?5` = số cần giữ lại, `?6` = 1 nếu CHỈ được trả vé chưa lộ (giảm số khách), 0 nếu trả hết (huỷ).
const TRA_PHAN_BO = defineSql(
  "ve-dien-tu",
  "tra_phan_bo",
  `UPDATE vdt_allocation SET released_at = ?3, release_reason = ?4, updated_at = ?3, updated_by = ?7
   WHERE id IN (
     SELECT a.id FROM vdt_allocation a
     WHERE a.order_id = ?1 AND a.released_at IS NULL AND (?2 IS NULL OR a.order_service_id = ?2) AND a.pax_group = ?8 AND (?6 = 0 OR a.revealed_at IS NULL)
     ORDER BY (a.revealed_at IS NULL) DESC, a.slot_no DESC
     LIMIT max(0, (SELECT count(*) FROM vdt_allocation c WHERE c.order_id = ?1 AND c.released_at IS NULL AND (?2 IS NULL OR c.order_service_id = ?2) AND c.pax_group = ?8) - ?5))`,
);
const TRA_VE_VE_KHO = defineSql(
  "ve-dien-tu",
  "tra_ve_ve_kho",
  `UPDATE vdt_ticket SET updated_at = ?3, updated_by = ?4,
          status = CASE WHEN EXISTS (SELECT 1 FROM vdt_allocation r WHERE r.ticket_id = vdt_ticket.id AND r.revealed_at IS NOT NULL) OR valid_to < ?5 THEN 'VOID' ELSE 'AVAILABLE' END
   WHERE status = 'ALLOCATED' AND id IN (SELECT ticket_id FROM vdt_allocation WHERE order_id = ?1 AND released_at = ?3 AND release_reason = ?2)`,
);
const DEM_TRA = defineSql(
  "ve-dien-tu",
  "dem_tra",
  `SELECT pax_group, count(*) AS dang_giu, sum(revealed_at IS NULL) AS chua_lo FROM vdt_allocation
   WHERE order_id = ?1 AND released_at IS NULL AND (?2 IS NULL OR order_service_id = ?2) GROUP BY pax_group`,
);

export interface TraVeNhom { orderId: string; serviceId: string | null; nhom: string; lyDo: string; at: string; by: string | null; conLai: number; chiVeChuaLo: boolean }
export const cauTraPhanBo = (db: D1Database, p: TraVeNhom): D1PreparedStatement =>
  db.prepare(TRA_PHAN_BO).bind(p.orderId, p.serviceId, p.at, p.lyDo, p.conLai, p.chiVeChuaLo ? 1 : 0, p.by, p.nhom);
export const cauVeVeKho = (db: D1Database, p: { orderId: string; lyDo: string; at: string; by: string | null; homNay: string }): D1PreparedStatement =>
  db.prepare(TRA_VE_VE_KHO).bind(p.orderId, p.lyDo, p.at, p.by, p.homNay);
/** Đếm vé đang giữ của đơn (tuỳ chọn một dòng dịch vụ) theo nhóm: tổng và số CHƯA lộ — để biết có cảnh báo «vé đã giao còn thừa» hay không. */
export const demTraTheoNhom = async (db: D1Database, orderId: string, serviceId: string | null): Promise<Record<string, { dangGiu: number; chuaLo: number }>> => {
  const { results } = await db.prepare(DEM_TRA).bind(orderId, serviceId).all<{ pax_group: string; dang_giu: number; chua_lo: number }>();
  return Object.fromEntries(results.map((r) => [r.pax_group, { dangGiu: r.dang_giu, chuaLo: r.chua_lo ?? 0 }]));
};
