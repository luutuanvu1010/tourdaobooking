// SQL của «Ảnh bàn giao» (ADR-0232; migration 0190): bảng abg_photo, abg_erasure_request (chỉ module anh-ban-giao ghi). Module NGHIÊM: mọi câu qua `defineSql`
// (câu TĨNH), chịu bài EXPLAIN. Đơn đọc qua view công bố v_ord_order_state (không JOIN bảng của orders). thumb_key, view_key, content_hash, hidden_reason là N3:
// chỉ đi trong câu lệnh, KHÔNG BAO GIỜ ra DTO, nhật ký, câu lỗi. Khuôn: billing/bien-lai-repo.ts (ADR-0196). Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

const TRANG_THAI_DON = defineSql("anh-ban-giao", "order_state_of", "SELECT status FROM v_ord_order_state WHERE id = ?1");

// Chèn MỘT dòng ảnh (trigger kiểm đơn đã xác nhận, đích thuộc đơn, trần giờ, trần mỗi đơn — chạm thì CẢ lô huỷ).
// ?1 id, ?2 đơn, ?3 dịch vụ, ?4 lượt đón, ?5 loại việc, ?6 ghi chú, ?7 khoá ảnh nhỏ, ?8 khoá ảnh xem, ?9 cỡ nhỏ, ?10 cỡ xem, ?11 băm, ?12 hạn giữ, ?13 bây giờ, ?14 người tải.
const INSERT_ANH = defineSql(
  "anh-ban-giao",
  "photo_insert",
  `INSERT INTO abg_photo (id, order_id, order_service_id, transfer_leg_id, task_kind, note, thumb_key, view_key, thumb_size, view_size, content_hash, retain_until,
     created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14)`,
);
const DEM_GAN_DAY = defineSql("anh-ban-giao", "photo_count_recent", "SELECT count(*) AS n FROM abg_photo WHERE created_by = ?1 AND created_at > ?2");
const CHO_DAT = defineSql("anh-ban-giao", "photo_to_store", "SELECT id, thumb_key, view_key FROM abg_photo WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL");
const DANH_DAU_DA_LUU = defineSql(
  "anh-ban-giao",
  "photo_mark_stored",
  "UPDATE abg_photo SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
// Ảnh của đơn ?1 chưa gỡ (gồm cả ảnh đã ẩn — route lọc theo ô). Không chọn băm, lý do ẩn. Khoá ảnh nhỏ chỉ để route đọc kho, không ra DTO.
const ANH_CUA_DON = defineSql(
  "anh-ban-giao",
  "photos_of_order",
  `SELECT id, order_service_id, transfer_leg_id, task_kind, note, thumb_key, stored_at, hidden_at, created_at, created_by
   FROM abg_photo WHERE order_id = ?1 AND purged_at IS NULL ORDER BY created_at, id`,
);
const ANH_THEO_ID = defineSql(
  "anh-ban-giao",
  "photo_by_id",
  "SELECT id, order_id, thumb_key, view_key, stored_at, purged_at, hidden_at, retain_until, erasure_request_id, created_by FROM abg_photo WHERE id = ?1",
);
// Ẩn (Đ7): một chiều, chỉ ảnh chưa gỡ, chưa ẩn. ?1 ảnh, ?2 bây giờ, ?3 người, ?4 lý do.
const AN_ANH = defineSql(
  "anh-ban-giao",
  "photo_hide",
  "UPDATE abg_photo SET hidden_at = ?2, hidden_by = ?3, hidden_reason = ?4, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND hidden_at IS NULL AND purged_at IS NULL",
);
// Quyết gỡ MỘT ảnh: purged_at + lý do + băm và ghi chú về rỗng; gắn yêu cầu xoá nếu có. Trigger hạn giữ quyết lý do nào qua được. ?5: điều kiện thêm cho ảnh tải
// dở dang (NULL = không điều kiện; có = chỉ khi stored_at rỗng và created_at < ?5). ?1 ảnh, ?2 bây giờ, ?3 lý do, ?4 người, ?6 mã yêu cầu xoá hoặc NULL.
const QUYET_GO = defineSql(
  "anh-ban-giao",
  "photo_purge",
  `UPDATE abg_photo SET purged_at = ?2, purge_reason = ?3, purge_note = ?7, content_hash = NULL, note = NULL, erasure_request_id = COALESCE(erasure_request_id, ?6), updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND purged_at IS NULL AND (?5 IS NULL OR (stored_at IS NULL AND created_at < ?5))`,
);
const CHEN_YEU_CAU = defineSql(
  "anh-ban-giao",
  "erasure_request_insert",
  `INSERT INTO abg_erasure_request (id, source, phieu_id, channel_note, executed_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`,
);
// Đánh dấu ảnh ?1 vào yêu cầu ?2 (biến thể 7B, nguồn PHIEU): chưa gỡ, chưa đánh dấu.
const DANH_DAU_YEU_CAU = defineSql(
  "anh-ban-giao",
  "photo_mark_erasure",
  "UPDATE abg_photo SET erasure_request_id = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND erasure_request_id IS NULL AND purged_at IS NULL",
);
// Lính gác cùng lô với parties (khuôn DA_THANG_XOA của parties/repository.ts): chỉ chạy khi chính dòng phiếu đã mang người ?3 + lúc ?2 của lô này — lô thua cuộc
// đua (phiếu vừa bị rút / từ chối) thì hai câu dưới không đổi dòng nào. Đọc qua view công bố v_pty_erasure_decision (0190).
const DA_THANG_PHIEU = "EXISTS (SELECT 1 FROM v_pty_erasure_decision d WHERE d.id = ?1 AND d.status = 'DA_THUC_HIEN' AND d.decided_by = ?3 AND d.decided_at = ?2)";
// Lô thực hiện phiếu xoá (ADR-0126) của parties: quyết gỡ mọi ảnh đã đánh dấu vào yêu cầu của phiếu ?1, rồi ghi mốc thực hiện của yêu cầu.
const GO_THEO_PHIEU = defineSql(
  "anh-ban-giao",
  "photo_purge_by_erasure_ticket",
  `UPDATE abg_photo SET purged_at = ?2, purge_reason = 'XOA_THEO_YEU_CAU', content_hash = NULL, note = NULL, updated_at = ?2, updated_by = ?3
   WHERE purged_at IS NULL AND erasure_request_id IN (SELECT id FROM abg_erasure_request WHERE phieu_id = ?1) AND ${DA_THANG_PHIEU}`,
);
const XONG_YEU_CAU_PHIEU = defineSql(
  "anh-ban-giao",
  "erasure_request_executed_by_ticket",
  `UPDATE abg_erasure_request SET executed_at = ?2, updated_at = ?2, updated_by = ?3 WHERE phieu_id = ?1 AND executed_at IS NULL AND ${DA_THANG_PHIEU}`,
);
// Phiếu ?1 đang chờ xử lý (đánh dấu ảnh chỉ cho phiếu còn chờ — view công bố của parties).
const PHIEU_DANG_CHO = defineSql("anh-ban-giao", "erasure_ticket_pending", "SELECT 1 AS co FROM v_pty_erasure_decision WHERE id = ?1 AND status = 'CHO_XU_LY'");
const KHO_CUA_PHIEU = defineSql(
  "anh-ban-giao",
  "photo_keys_purged_by_ticket",
  `SELECT id, thumb_key, view_key FROM abg_photo
   WHERE purged_at IS NOT NULL AND r2_deleted_at IS NULL AND erasure_request_id IN (SELECT id FROM abg_erasure_request WHERE phieu_id = ?1)`,
);
const DANH_DAU_DA_XOA_KHO = defineSql(
  "anh-ban-giao",
  "photo_mark_r2_deleted",
  "UPDATE abg_photo SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND purged_at IS NOT NULL AND r2_deleted_at IS NULL",
);
// Hàng «chờ xoá» (Hiến chương 5.16, 5.25): đã quyết gỡ mà kho chưa xoá xong; tải dở dang tạo trước ?1; quá hạn giữ (?2 = bây giờ) chưa gỡ. Tối đa 50 dòng (+1).
const CHO_XOA = defineSql(
  "anh-ban-giao",
  "photo_pending",
  `SELECT id, order_id, thumb_key, view_key, stored_at, purged_at, purge_reason, retain_until, created_at FROM abg_photo
   WHERE (r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR (stored_at IS NULL AND created_at < ?1))) OR (purged_at IS NULL AND retain_until <= ?2)
   ORDER BY created_at, id LIMIT 51`,
);

export interface KhoaAnhRow { id: string; thumb_key: string; view_key: string }
export interface AnhDongRow {
  id: string; order_service_id: string | null; transfer_leg_id: string | null; task_kind: string; note: string | null; thumb_key: string; stored_at: string | null;
  hidden_at: string | null; created_at: string; created_by: string;
}
export interface AnhTheoIdRow {
  id: string; order_id: string; thumb_key: string; view_key: string; stored_at: string | null; purged_at: string | null; hidden_at: string | null; retain_until: string;
  erasure_request_id: string | null; created_by: string;
}
export interface AnhChoXoaRow extends KhoaAnhRow { order_id: string; stored_at: string | null; purged_at: string | null; purge_reason: string | null; retain_until: string; created_at: string }
export const ANH_CHO_XOA_MOT_LUOT = 50;

export async function trangThaiDon(db: D1Database, orderId: string): Promise<string | null> {
  return (await db.prepare(TRANG_THAI_DON).bind(orderId).first<{ status: string }>())?.status ?? null;
}
export const chenAnhStatement = (
  db: D1Database,
  v: { id: string; orderId: string; dichVuId: string | null; changId: string | null; loaiViec: string; ghiChu: string | null; khoaNho: string; khoaXem: string; coNho: number; coXem: number; bam: string; hanGiu: string; at: string; by: string },
): D1PreparedStatement =>
  db.prepare(INSERT_ANH).bind(v.id, v.orderId, v.dichVuId, v.changId, v.loaiViec, v.ghiChu, v.khoaNho, v.khoaXem, v.coNho, v.coXem, v.bam, v.hanGiu, v.at, v.by);
export async function demAnhGanDay(db: D1Database, staffId: string, dauCuaSo: string): Promise<number> {
  return Number((await db.prepare(DEM_GAN_DAY).bind(staffId, dauCuaSo).first<{ n: number }>())?.n ?? 0);
}
export const anhChoDat = (db: D1Database, id: string): Promise<KhoaAnhRow | null> => db.prepare(CHO_DAT).bind(id).first<KhoaAnhRow>();
export async function danhDauDaLuu(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_LUU).bind(id, at).run()).meta.changes ?? 0;
}
export async function anhCuaDon(db: D1Database, orderId: string): Promise<AnhDongRow[]> {
  return (await db.prepare(ANH_CUA_DON).bind(orderId).all<AnhDongRow>()).results;
}
export const anhTheoId = (db: D1Database, id: string): Promise<AnhTheoIdRow | null> => db.prepare(ANH_THEO_ID).bind(id).first<AnhTheoIdRow>();
export const anAnhStatement = (db: D1Database, v: { id: string; at: string; by: string; lyDo: string }): D1PreparedStatement =>
  db.prepare(AN_ANH).bind(v.id, v.at, v.by, v.lyDo);
export const quyetGoStatement = (db: D1Database, v: { id: string; at: string; lyDo: string; by: string; doDangTruoc?: string; yeuCauId?: string | null; ghiChu?: string | null }): D1PreparedStatement =>
  db.prepare(QUYET_GO).bind(v.id, v.at, v.lyDo, v.by, v.doDangTruoc ?? null, v.yeuCauId ?? null, v.ghiChu ?? null);
export const chenYeuCauStatement = (
  db: D1Database, v: { id: string; nguon: "PHIEU" | "KHACH"; phieuId: string | null; ghiChu: string | null; xongLuc: string | null; at: string; by: string },
): D1PreparedStatement => db.prepare(CHEN_YEU_CAU).bind(v.id, v.nguon, v.phieuId, v.ghiChu, v.xongLuc, v.at, v.by);
export const danhDauYeuCauStatement = (db: D1Database, v: { id: string; yeuCauId: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(DANH_DAU_YEU_CAU).bind(v.id, v.yeuCauId, v.at, v.by);
export const goTheoPhieuStatements = (db: D1Database, v: { phieuId: string; at: string; by: string }): D1PreparedStatement[] => [
  db.prepare(GO_THEO_PHIEU).bind(v.phieuId, v.at, v.by),
  db.prepare(XONG_YEU_CAU_PHIEU).bind(v.phieuId, v.at, v.by),
];
export async function phieuDangCho(db: D1Database, phieuId: string): Promise<boolean> {
  return (await db.prepare(PHIEU_DANG_CHO).bind(phieuId).first<{ co: number }>()) !== null;
}
export async function khoCuaPhieu(db: D1Database, phieuId: string): Promise<KhoaAnhRow[]> {
  return (await db.prepare(KHO_CUA_PHIEU).bind(phieuId).all<KhoaAnhRow>()).results;
}
export async function danhDauDaXoaKho(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_XOA_KHO).bind(id, at).run()).meta.changes ?? 0;
}
export async function anhChoXoa(db: D1Database, doDangTruoc: string, now: string): Promise<{ ds: AnhChoXoaRow[]; conNua: boolean }> {
  const r = (await db.prepare(CHO_XOA).bind(doDangTruoc, now).all<AnhChoXoaRow>()).results;
  return { ds: r.slice(0, ANH_CHO_XOA_MOT_LUOT), conNua: r.length > ANH_CHO_XOA_MOT_LUOT };
}
