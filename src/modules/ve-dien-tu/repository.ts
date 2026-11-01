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
     WHERE b.catalog_code = ?1 AND b.pax_group = ?2 AND b.status = 'ACTIVE' AND t.status = 'AVAILABLE' AND t.stored_at IS NOT NULL AND t.valid_from <= ?3 AND t.valid_to >= ?3
     ORDER BY t.valid_to, t.id
     LIMIT max(0, ?4 - (SELECT count(*) FROM vdt_allocation a WHERE a.order_service_id = ?5 AND a.pax_group = ?2 AND a.released_at IS NULL)))`,
);
const GHI_PHAN_BO = defineSql(
  "ve-dien-tu",
  "ghi_phan_bo",
  `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, allocated_by, created_at, created_by, updated_at, updated_by)
   SELECT lower(hex(randomblob(16))), x.id, ?3, ?4, ?2,
          x.rn + (SELECT COALESCE(MAX(a.slot_no), 0) FROM vdt_allocation a WHERE a.order_service_id = ?4 AND a.pax_group = ?2 AND a.released_at IS NULL),
          ?5, ?6, ?5, ?6, ?5, ?6
   FROM (SELECT t.id AS id, ROW_NUMBER() OVER (ORDER BY t.valid_to, t.id) AS rn
         FROM vdt_ticket t JOIN vdt_batch b ON b.id = t.batch_id
         WHERE t.status = 'ALLOCATED' AND t.updated_at = ?5 AND b.catalog_code = ?1 AND b.pax_group = ?2
           AND NOT EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = t.id AND a.released_at IS NULL)) x
   WHERE x.rn <= max(0, ?7 - (SELECT count(*) FROM vdt_allocation a WHERE a.order_service_id = ?4 AND a.pax_group = ?2 AND a.released_at IS NULL))`,
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
export const cauGhiPhanBo = (db: D1Database, p: GiuChoVe): D1PreparedStatement => db.prepare(GHI_PHAN_BO).bind(p.catalogCode, p.nhom, p.orderId, p.serviceId, p.at, p.by, p.can);

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
     LIMIT max(0, (SELECT count(*) FROM vdt_allocation c WHERE c.order_id = ?1 AND c.released_at IS NULL AND (?2 IS NULL OR c.order_service_id = ?2) AND c.pax_group = ?8) - ?5))
     AND (?9 IS NULL OR EXISTS (SELECT 1 FROM v_ord_order_state s WHERE s.id = ?1 AND s.status = ?9))`,
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

export interface TraVeNhom { orderId: string; serviceId: string | null; nhom: string; lyDo: string; at: string; by: string | null; conLai: number; chiVeChuaLo: boolean;
  /** Cổng trạng thái đơn (view công bố `v_ord_order_state` của orders): chỉ trả khi đơn ĐANG ở trạng thái này — lô huỷ thua thì không trả nhầm vé của đơn còn sống. null = không cổng. */
  chiKhiDon: "cancelled" | "draft" | null }
export const cauTraPhanBo = (db: D1Database, p: TraVeNhom): D1PreparedStatement =>
  db.prepare(TRA_PHAN_BO).bind(p.orderId, p.serviceId, p.at, p.lyDo, p.conLai, p.chiVeChuaLo ? 1 : 0, p.by, p.nhom, p.chiKhiDon);
export const cauVeVeKho = (db: D1Database, p: { orderId: string; lyDo: string; at: string; by: string | null; homNay: string }): D1PreparedStatement =>
  db.prepare(TRA_VE_VE_KHO).bind(p.orderId, p.lyDo, p.at, p.by, p.homNay);
/** Đếm vé đang giữ của đơn (tuỳ chọn một dòng dịch vụ) theo nhóm: tổng và số CHƯA lộ — để biết có cảnh báo «vé đã giao còn thừa» hay không. */
export const demTraTheoNhom = async (db: D1Database, orderId: string, serviceId: string | null): Promise<Record<string, { dangGiu: number; chuaLo: number }>> => {
  const { results } = await db.prepare(DEM_TRA).bind(orderId, serviceId).all<{ pax_group: string; dang_giu: number; chua_lo: number }>();
  return Object.fromEntries(results.map((r) => [r.pax_group, { dangGiu: r.dang_giu, chuaLo: r.chua_lo ?? 0 }]));
};

// ===== Kho tệp (ADR-0153 Đ1 mục 7; khuôn feedback/repository.ts của ADR-0144). Dòng vé chèn trước với `stored_at` rỗng ("tải dở dang"); chỉ vé ĐÃ lưu vào kho (`stored_at`
// có giá trị) mới được giữ chỗ (xem GIU_VE). Thu hồi = đặt `purged_at` + `VOID`; đối tượng R2 xoá SAU, `r2_deleted_at` ghi khi đã xoá (còn rỗng = "chờ xoá", thấy được và chạy lại được).
const LIST_VE_CHO_DAT = defineSql(
  "ve-dien-tu",
  "list_ve_cho_dat",
  "SELECT id, storage_key, content_kind FROM vdt_ticket WHERE batch_id = ?1 AND stored_at IS NULL AND purged_at IS NULL ORDER BY id",
);
const DANH_DAU_DA_LUU = defineSql("ve-dien-tu", "danh_dau_da_luu", "UPDATE vdt_ticket SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL");
const DAT_CHO_XOA = defineSql(
  "ve-dien-tu",
  "dat_cho_xoa",
  // Chỉ thu hồi vé KHÔNG còn phân bổ mở: vé đang giữ cho đơn phải được trả đúng đường (soanTraVe, lý do THU_HOI) — không để phân bổ «ma» trỏ vào vé đã VOID.
  "UPDATE vdt_ticket SET purged_at = ?2, status = 'VOID', updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND purged_at IS NULL AND NOT EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = ?1 AND a.released_at IS NULL)",
);
const LIST_CHO_XOA = defineSql(
  "ve-dien-tu",
  "list_cho_xoa",
  "SELECT id, storage_key FROM vdt_ticket WHERE purged_at IS NOT NULL AND r2_deleted_at IS NULL ORDER BY purged_at, id LIMIT ?1",
);
const DANH_DAU_DA_XOA_R2 = defineSql("ve-dien-tu", "danh_dau_da_xoa_r2", "UPDATE vdt_ticket SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND r2_deleted_at IS NULL");

export interface VeChoDat { id: string; storage_key: string; content_kind: string }
export interface VeCanXoa { id: string; storage_key: string }
export const listVeChoDat = async (db: D1Database, batchId: string): Promise<VeChoDat[]> => (await db.prepare(LIST_VE_CHO_DAT).bind(batchId).all<VeChoDat>()).results;
export const danhDauDaLuu = async (db: D1Database, id: string, at: string): Promise<number> => (await db.prepare(DANH_DAU_DA_LUU).bind(id, at).run()).meta.changes;
/** Câu thu hồi (chưa chạy) — người gọi gộp với nhật ký trong một lô. */
export const cauDatChoXoa = (db: D1Database, id: string, at: string, by: string | null): D1PreparedStatement => db.prepare(DAT_CHO_XOA).bind(id, at, by);
export const listChoXoa = async (db: D1Database, gioiHan: number): Promise<VeCanXoa[]> => (await db.prepare(LIST_CHO_XOA).bind(gioiHan).all<VeCanXoa>()).results;
export const danhDauDaXoaR2 = async (db: D1Database, id: string, at: string): Promise<number> => (await db.prepare(DANH_DAU_DA_XOA_R2).bind(id, at).run()).meta.changes;

// ===== Nhập lô (ADR-0153; Task 4c). Lô tạo PENDING, thêm vé từng đợt (dòng vé `stored_at` rỗng tới khi kho nhận), xác nhận ⇒ ACTIVE (mới được giữ chỗ).
const CHEN_LO = defineSql(
  "ve-dien-tu",
  "chen_lo",
  `INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, 'PENDING', ?5, ?6, ?5, ?6)`,
);
const DOC_LO = defineSql("ve-dien-tu", "doc_lo", "SELECT id, catalog_code, pax_group, printed_name, status FROM vdt_batch WHERE id = ?1");
const CHEN_VE = defineSql(
  "ve-dien-tu",
  "chen_ve",
  `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, slot_time, storage_key, content_kind, byte_size, content_hash, status, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'AVAILABLE', ?11, ?12, ?11, ?12
   WHERE EXISTS (SELECT 1 FROM vdt_batch b WHERE b.id = ?2 AND b.status = 'PENDING') AND NOT EXISTS (SELECT 1 FROM vdt_ticket t WHERE t.ticket_code = ?3)`,
);
const MA_VE_DA_CO = defineSql("ve-dien-tu", "ma_ve_da_co", "SELECT ticket_code FROM vdt_ticket WHERE ticket_code IN (SELECT value FROM json_each(?1))");
const KICH_HOAT_LO = defineSql(
  "ve-dien-tu",
  "kich_hoat_lo",
  `UPDATE vdt_batch SET status = 'ACTIVE', updated_at = ?2, updated_by = ?3
   WHERE id = ?1 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vdt_ticket t WHERE t.batch_id = ?1 AND t.stored_at IS NOT NULL AND t.purged_at IS NULL)`,
);
const DEM_VE_CUA_LO = defineSql(
  "ve-dien-tu",
  "dem_ve_cua_lo",
  "SELECT count(*) AS tong, sum(stored_at IS NOT NULL AND purged_at IS NULL) AS da_luu FROM vdt_ticket WHERE batch_id = ?1",
);
const SUA_MA_TOUR = defineSql("ve-dien-tu", "sua_ma_tour", "UPDATE vdt_batch SET catalog_code = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status <> 'VOID'");
const THONG_KE_KHO = defineSql(
  "ve-dien-tu",
  "thong_ke_kho",
  `SELECT b.catalog_code AS catalog_code, b.pax_group AS pax_group,
          sum(t.status = 'AVAILABLE' AND t.stored_at IS NOT NULL AND t.valid_to >= ?1) AS con_trong,
          sum(t.status = 'AVAILABLE' AND t.stored_at IS NOT NULL AND t.valid_to >= ?1 AND t.valid_to <= ?2) AS sap_het_han,
          sum(t.status = 'ALLOCATED') AS da_giu,
          sum(EXISTS (SELECT 1 FROM vdt_allocation a JOIN vdt_delivery d ON d.allocation_id = a.id WHERE a.ticket_id = t.id)) AS da_giao
   FROM vdt_ticket t JOIN vdt_batch b ON b.id = t.batch_id
   WHERE b.status = 'ACTIVE' GROUP BY b.catalog_code, b.pax_group ORDER BY b.catalog_code, b.pax_group`,
);

export interface LoRow { id: string; catalog_code: string; pax_group: string; printed_name: string; status: string }
export interface VeMoi { id: string; batchId: string; maVe: string; tuNgay: string; denNgay: string; gio: string | null; khoa: string; loaiNoiDung: string; coBytes: number; bam: string; at: string; by: string | null }
export interface DongKho { catalog_code: string; pax_group: string; con_trong: number; sap_het_han: number; da_giu: number; da_giao: number }

export const cauChenLo = (db: D1Database, p: { id: string; catalogCode: string; nhom: string; tenSanPham: string; at: string; by: string | null }): D1PreparedStatement =>
  db.prepare(CHEN_LO).bind(p.id, p.catalogCode, p.nhom, p.tenSanPham, p.at, p.by);
export const docLo = (db: D1Database, id: string): Promise<LoRow | null> => db.prepare(DOC_LO).bind(id).first<LoRow>();
/** Chèn một vé vào lô PENDING; trùng mã vé hoặc lô không còn PENDING ⇒ câu không chèn gì (changes 0). */
export const cauChenVe = (db: D1Database, v: VeMoi): D1PreparedStatement =>
  db.prepare(CHEN_VE).bind(v.id, v.batchId, v.maVe, v.tuNgay, v.denNgay, v.gio, v.khoa, v.loaiNoiDung, v.coBytes, v.bam, v.at, v.by);
export const maVeDaCo = async (db: D1Database, ma: readonly string[]): Promise<Set<string>> =>
  new Set((await db.prepare(MA_VE_DA_CO).bind(JSON.stringify(ma)).all<{ ticket_code: string }>()).results.map((r) => r.ticket_code));
export const cauKichHoatLo = (db: D1Database, id: string, at: string, by: string | null): D1PreparedStatement => db.prepare(KICH_HOAT_LO).bind(id, at, by);
export const demVeCuaLo = async (db: D1Database, id: string): Promise<{ tong: number; daLuu: number }> => {
  const r = await db.prepare(DEM_VE_CUA_LO).bind(id).first<{ tong: number; da_luu: number | null }>();
  return { tong: r?.tong ?? 0, daLuu: r?.da_luu ?? 0 };
};
export const cauSuaMaTour = (db: D1Database, id: string, maTour: string, at: string, by: string | null): D1PreparedStatement => db.prepare(SUA_MA_TOUR).bind(id, maTour, at, by);
export const thongKeKho = async (db: D1Database, homNay: string, hanSapHet: string): Promise<DongKho[]> => (await db.prepare(THONG_KE_KHO).bind(homNay, hanSapHet).all<DongKho>()).results;

// ===== Xem ảnh và giao vé (ADR-0153 Đ3; Task 6). Câu đọc KHÔNG trả mã vé / nội dung QR: ảnh đọc từ kho theo `storage_key` rồi trả thẳng thân phản hồi. =============
const PHAN_BO_DE_XEM = defineSql(
  "ve-dien-tu",
  "phan_bo_de_xem",
  `SELECT a.id, a.order_id, a.order_service_id, a.slot_no, a.revealed_at, t.storage_key, t.content_kind FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id
   WHERE a.id = ?1 AND a.released_at IS NULL AND t.stored_at IS NOT NULL AND t.purged_at IS NULL`,
);
const CHU_DON = defineSql("ve-dien-tu", "chu_don", "SELECT staff_id FROM v_ord_order_owner WHERE id = ?1");
const PHAN_BO_MO_CUA_DON = defineSql(
  "ve-dien-tu",
  "phan_bo_mo_cua_don",
  "SELECT id FROM vdt_allocation WHERE order_id = ?1 AND released_at IS NULL AND (?2 IS NULL OR order_service_id = ?2) ORDER BY order_service_id, pax_group, slot_no",
);
const DANH_DAU_LO = defineSql("ve-dien-tu", "danh_dau_lo", "UPDATE vdt_allocation SET revealed_at = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND revealed_at IS NULL AND released_at IS NULL");
const CHEN_GIAO = defineSql(
  "ve-dien-tu",
  "chen_giao",
  "INSERT OR IGNORE INTO vdt_delivery (id, allocation_id, channel, delivered_by, delivered_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?5, ?3, ?4, ?4, ?3, ?4, ?3)",
);

export interface PhanBoDeXem { id: string; order_id: string; order_service_id: string; slot_no: number; revealed_at: string | null; storage_key: string; content_kind: string }
export const docPhanBoDeXem = (db: D1Database, id: string): Promise<PhanBoDeXem | null> => db.prepare(PHAN_BO_DE_XEM).bind(id).first<PhanBoDeXem>();
/** Người lập đơn (view công bố của orders) — để hỏi `can(…, { ownerId })`. null = không có đơn. */
export const docChuDon = async (db: D1Database, orderId: string): Promise<string | null> => (await db.prepare(CHU_DON).bind(orderId).first<{ staff_id: string }>())?.staff_id ?? null;
export const docPhanBoMoCuaDon = async (db: D1Database, orderId: string, serviceId: string | null): Promise<string[]> =>
  (await db.prepare(PHAN_BO_MO_CUA_DON).bind(orderId, serviceId).all<{ id: string }>()).results.map((r) => r.id);
/** Đóng dấu «đã lộ» MỘT LẦN (dòng đã có dấu thì câu không đổi gì). */
export const cauDanhDauLo = (db: D1Database, allocId: string, at: string, by: string | null): D1PreparedStatement => db.prepare(DANH_DAU_LO).bind(allocId, at, by);
export const cauChenGiao = (db: D1Database, p: { id: string; allocId: string; by: string | null; at: string; kenh: "ZALO" | "LINK" }): D1PreparedStatement =>
  db.prepare(CHEN_GIAO).bind(p.id, p.allocId, p.by, p.at, p.kenh);
