// SQL của ảnh biên lai chuyển khoản (ADR-0196 Đ2, Đ3, Đ6, Đ7; migration 0158): bảng `bil_receipt_proof` (chỉ billing ghi). Module NGHIÊM cho tệp này: mọi câu qua
// `defineSql` (câu TĨNH), chịu bài EXPLAIN. storage_key và content_hash là N3: CHỈ đi trong câu lệnh, KHÔNG BAO GIỜ ra DTO, nhật ký, câu lỗi.
// Khuôn: SQL tệp kèm tin vé hỗ trợ (feedback/repository.ts, migration 0124). Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";
import type { LoaiTep } from "../../shared/tep-dinh-kem.ts";

// Chèn MỘT dòng ảnh CÙNG lô với khoản thu (ADR-0196 Đ3 «lính gác cùng lô»): CHỈ khi khoản thu ?2 vừa chèn có mặt, do chính người tải ?7 ghi, là CUSTOMER_PAYMENT —
// khoản thu thua lính gác (đơn vừa «Khách đã trả đủ» xen giữa) thì câu này không chèn gì ⇒ trigger người tải không chạy ⇒ lô ra 409, không 5xx. Trần giờ ở trigger
// `bil_receipt_proof_rate_ins` (chạm trần ⇒ CẢ lô huỷ). ?1 id, ?2 khoản thu, ?3 khoá kho, ?4 loại, ?5 cỡ, ?6 băm, ?7 người tải, ?8 bây giờ.
const INSERT_ANH = defineSql(
  "billing",
  "receipt_proof_insert",
  `INSERT INTO bil_receipt_proof (id, receipt_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?8, ?7, ?8, ?7
   WHERE EXISTS (SELECT 1 FROM bil_payment_receipt WHERE id = ?2 AND created_by = ?7 AND kind_code = 'CUSTOMER_PAYMENT')`,
);
// Đếm trước lô (route chặn 429 khi đã chạm trần — không ghi khoản thu rồi mới thiếu ảnh). ?1 người tải, ?2 đầu cửa sổ.
const DEM_GAN_DAY = defineSql("billing", "receipt_proof_count_recent", "SELECT count(*) AS n FROM bil_receipt_proof WHERE created_by = ?1 AND created_at > ?2");
// Đọc lại sau lô: dòng ảnh CÓ THẬT của khoản thu ?1 còn chờ đặt kho — chỉ dòng này được đặt (mọi đối tượng trong kho luôn có dòng).
const CHO_DAT = defineSql(
  "billing",
  "receipt_proof_to_store",
  "SELECT id, storage_key FROM bil_receipt_proof WHERE receipt_id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
const DANH_DAU_DA_LUU = defineSql(
  "billing",
  "receipt_proof_mark_stored",
  "UPDATE bil_receipt_proof SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
// Quyết xoá (ADR-0196 Đ2, Đ7): purged_at + mã lý do + băm về rỗng, MỘT lần (trigger một chiều). ?5 = điều kiện thêm cho ảnh tải dở dang: NULL = không điều kiện;
// có giá trị = chỉ khi stored_at còn rỗng và created_at < ?5 (ảnh vừa lưu xong trong khe KHÔNG bị quyết xoá). ?1 ảnh, ?2 bây giờ, ?3 lý do, ?4 người làm.
const QUYET_XOA = defineSql(
  "billing",
  "receipt_proof_purge",
  `UPDATE bil_receipt_proof SET purged_at = ?2, purge_reason = ?3, content_hash = NULL, updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND purged_at IS NULL AND (?5 IS NULL OR (stored_at IS NULL AND created_at < ?5))`,
);
const DANH_DAU_DA_XOA_KHO = defineSql(
  "billing",
  "receipt_proof_mark_r2_deleted",
  "UPDATE bil_receipt_proof SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND purged_at IS NOT NULL AND r2_deleted_at IS NULL",
);
// Trạng thái ảnh của các khoản thu ?1 (mảng JSON mã khoản thu của MỘT đơn — route đã kiểm quyền xem). Không chọn storage_key / content_hash.
const TRANG_THAI_CUA_KHOAN = defineSql(
  "billing",
  "receipt_proof_status_of_receipts",
  "SELECT receipt_id, stored_at, purged_at, purge_reason FROM bil_receipt_proof WHERE receipt_id IN (SELECT value FROM json_each(?1))",
);
// Ảnh của khoản thu ?2 THUỘC đơn ?1 (mọi trạng thái — route quyết theo stored_at / purged_at). Khoản thuộc đơn khác ⇒ không thấy ⇒ 404. storage_key chỉ để đọc/xoá kho.
const ANH_CUA_KHOAN = defineSql(
  "billing",
  "receipt_proof_of_order_receipt",
  `SELECT p.id, p.storage_key, p.content_kind, p.stored_at, p.purged_at FROM bil_receipt_proof p JOIN bil_payment_receipt r ON r.id = p.receipt_id
   WHERE p.receipt_id = ?2 AND r.order_id = ?1`,
);
// Hàng «chờ xoá» (Hiến chương 5.16): đã quyết xoá mà kho chưa xoá xong, HOẶC tải dở dang (chưa lưu, chưa quyết xoá) tạo trước ?1. Tối đa 50 dòng (+1), cũ trước.
// order_id để nhật ký quyết xoá gắn đúng đơn; storage_key chỉ để lệnh chạy lại xoá kho — route KHÔNG đưa ra DTO.
const CHO_XOA = defineSql(
  "billing",
  "receipt_proof_pending_purge",
  `SELECT p.id, r.order_id, p.storage_key, p.purged_at, p.purge_reason, p.created_at FROM bil_receipt_proof p JOIN bil_payment_receipt r ON r.id = p.receipt_id
   WHERE p.r2_deleted_at IS NULL AND (p.purged_at IS NOT NULL OR (p.stored_at IS NULL AND p.created_at < ?1))
   ORDER BY p.created_at, p.id LIMIT 51`,
);

export interface AnhCanXoaRow { id: string; storage_key: string }
export interface AnhCuaKhoanRow { id: string; storage_key: string; content_kind: LoaiTep; stored_at: string | null; purged_at: string | null }
export interface TrangThaiAnhRow { receipt_id: string; stored_at: string | null; purged_at: string | null; purge_reason: string | null }
export interface AnhChoXoaRow { id: string; order_id: string; storage_key: string; purged_at: string | null; purge_reason: string | null; created_at: string }
/** Trần một lượt của hàng «chờ xoá» (như parties, feedback): cũ trước; câu đọc lấy thêm MỘT dòng để biết «còn nữa». */
export const ANH_CHO_XOA_MOT_LUOT = 50;

export const chenAnhStatement = (
  db: D1Database, v: { id: string; receiptId: string; key: string; loai: LoaiTep; kichThuoc: number; bam: string; by: string; at: string },
): D1PreparedStatement => db.prepare(INSERT_ANH).bind(v.id, v.receiptId, v.key, v.loai, v.kichThuoc, v.bam, v.by, v.at);
export async function demAnhGanDay(db: D1Database, staffId: string, dauCuaSo: string): Promise<number> {
  return Number((await db.prepare(DEM_GAN_DAY).bind(staffId, dauCuaSo).first<{ n: number }>())?.n ?? 0);
}
export async function anhChoDat(db: D1Database, receiptId: string): Promise<AnhCanXoaRow[]> {
  return (await db.prepare(CHO_DAT).bind(receiptId).all<AnhCanXoaRow>()).results;
}
export async function danhDauDaLuu(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_LUU).bind(id, at).run()).meta.changes ?? 0;
}
export const quyetXoaAnhStatement = (db: D1Database, v: { id: string; lyDo: string; at: string; by: string; doDangTruoc?: string }): D1PreparedStatement =>
  db.prepare(QUYET_XOA).bind(v.id, v.at, v.lyDo, v.by, v.doDangTruoc ?? null);
export async function danhDauDaXoaKho(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_XOA_KHO).bind(id, at).run()).meta.changes ?? 0;
}
export async function trangThaiAnhCuaKhoan(db: D1Database, receiptIds: readonly string[]): Promise<TrangThaiAnhRow[]> {
  if (receiptIds.length === 0) return [];
  return (await db.prepare(TRANG_THAI_CUA_KHOAN).bind(JSON.stringify(receiptIds)).all<TrangThaiAnhRow>()).results;
}
export function anhCuaKhoan(db: D1Database, orderId: string, receiptId: string): Promise<AnhCuaKhoanRow | null> {
  return db.prepare(ANH_CUA_KHOAN).bind(orderId, receiptId).first<AnhCuaKhoanRow>();
}
/** Tối đa `ANH_CHO_XOA_MOT_LUOT` dòng cũ nhất; `conNua` = còn dòng sau lượt này. */
export async function anhChoXoa(db: D1Database, doDangTruoc: string): Promise<{ ds: AnhChoXoaRow[]; conNua: boolean }> {
  const r = (await db.prepare(CHO_XOA).bind(doDangTruoc).all<AnhChoXoaRow>()).results;
  return { ds: r.slice(0, ANH_CHO_XOA_MOT_LUOT), conNua: r.length > ANH_CHO_XOA_MOT_LUOT };
}
