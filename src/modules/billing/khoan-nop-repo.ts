// SQL của KHOẢN NỘP đại lý và ảnh biên lai của khoản nộp (ADR-0182 phần B, migration 0159): bảng `bil_agent_remittance`, `bil_remittance_proof` (chỉ billing ghi).
// Module NGHIÊM cho tệp này: mọi câu qua `defineSql` (câu TĨNH), chịu bài EXPLAIN. storage_key và content_hash là N3: CHỈ đi trong câu lệnh, KHÔNG BAO GIỜ ra DTO, nhật ký, câu lỗi.
// Khuôn: bien-lai-repo.ts (ADR-0196). Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";
import type { LoaiTep } from "../../shared/tep-dinh-kem.ts";

// Chèn khoản nộp — câu ĐẦU của lô (Đ2 mục 13). Lính gác: đơn ĐÃ XÁC NHẬN, và khi lô ghi kèm khoản «Khách đã trả đại lý» (?8 = 1) thì đơn CHƯA «Khách đã trả đủ» (cùng điều kiện câu khoản thu
// `receipt_before_delivered` — khe đọc–ghi không để lại khoản nộp mồ côi không có dòng giữ hộ). Hai khoản chờ cùng đơn ⇒ chỉ mục duy nhất một phần huỷ CẢ lô.
// ?1 id, ?2 đơn, ?3 hồ sơ đại lý, ?4 số tiền, ?5 ngày chuyển, ?6 người ghi, ?7 bây giờ, ?8 có khoản thu kèm (0/1).
const CHEN_NOP = defineSql(
  "billing",
  "remittance_insert",
  `INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, 'PENDING', ?7, ?6, ?7, ?6
   WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ?2 AND status = 'confirmed' AND (?8 = 0 OR delivered_at IS NULL))`,
);
const COT_NOP = `a.id, a.order_id, a.agent_party_id, a.amount, a.transfer_date, a.status_code, a.reject_reason, a.posting_id, a.created_at, a.created_by, a.decided_at, a.decided_by`;
const NOP_CUA_DON = defineSql("billing", "remittances_of_order", `SELECT ${COT_NOP} FROM bil_agent_remittance a WHERE a.order_id = ?1 ORDER BY a.created_at, a.rowid`);
const NOP_THEO_ID = defineSql("billing", "remittance_by_id", `SELECT ${COT_NOP} FROM bil_agent_remittance a WHERE a.id = ?2 AND a.order_id = ?1`);
// Đơn ?1 có khoản nộp CHỜ của hồ sơ ?2 (Đ2 mục 13 — siết quyết toán «nộp»).
const CHO_CUA_BEN = defineSql(
  "billing",
  "remittance_pending_of_party",
  "SELECT 1 AS co FROM bil_agent_remittance WHERE order_id = ?1 AND agent_party_id = ?2 AND status_code = 'PENDING' LIMIT 1",
);
// Đơn ?1 có khoản nộp CHỜ do tài khoản ?2 ghi (Đ2 mục 13 chiều ngược — chặn «Công ty thu» của chính người đó; trigger `bil_payment_receipt_nop_cho_cong_ty` là lớp sau).
const CHO_CUA_NGUOI = defineSql(
  "billing",
  "remittance_pending_of_staff",
  "SELECT 1 AS co FROM bil_agent_remittance WHERE order_id = ?1 AND created_by = ?2 AND status_code = 'PENDING' LIMIT 1",
);
// Xác nhận — CHỈ khi phiếu quyết toán ?2 của chính lô đã chèn và khoản còn chờ. Người quyết ≠ người ghi: CHECK của bảng.
const XAC_NHAN = defineSql(
  "billing",
  "remittance_confirm",
  `UPDATE bil_agent_remittance SET status_code = 'CONFIRMED', posting_id = ?2, decided_at = ?3, decided_by = ?4, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status_code = 'PENDING' AND EXISTS (SELECT 1 FROM bil_posting WHERE id = ?2)`,
);
const TU_CHOI = defineSql(
  "billing",
  "remittance_reject",
  `UPDATE bil_agent_remittance SET status_code = 'REJECTED', reject_reason = ?2, decided_at = ?3, decided_by = ?4, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status_code = 'PENDING'`,
);
// Danh sách khoản CHỜ cho Kế toán (màn Sổ công nợ): kèm mã đơn, tên đại lý, và đơn còn khoản «Công ty thu» đang chờ đối chiếu không (Đ2 mục 4 — hiện cạnh nhau). Tối đa 200.
const CHO_TAT_CA = defineSql(
  "billing",
  "remittances_pending",
  `SELECT a.id, a.order_id, ol.order_code, pl.display_name AS dai_ly, a.amount, a.transfer_date, a.created_at,
     EXISTS (SELECT 1 FROM bil_payment_receipt r JOIN bil_receipt_recon d ON d.receipt_id = r.id AND d.kind_code = 'DECLARED'
             WHERE r.order_id = a.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)
               AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon c WHERE c.receipt_id = r.id AND c.kind_code = 'CONFIRMED')) AS co_cong_ty_cho
   FROM bil_agent_remittance a LEFT JOIN v_ord_order_label ol ON ol.id = a.order_id LEFT JOIN v_pty_party_label pl ON pl.id = a.agent_party_id
   WHERE a.status_code = 'PENDING' ORDER BY a.created_at, a.rowid LIMIT 200`,
);

// ---- Ảnh biên lai của khoản nộp (khuôn bien-lai-repo.ts) ----
// Chèn MỘT dòng ảnh CÙNG lô, CHỈ khi khoản nộp ?2 vừa chèn có mặt và do chính người tải ?7 ghi — khoản nộp thua lính gác thì câu này không chèn gì (không 5xx).
const CHEN_ANH = defineSql(
  "billing",
  "remittance_proof_insert",
  `INSERT INTO bil_remittance_proof (id, remittance_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?8, ?7, ?8, ?7
   WHERE EXISTS (SELECT 1 FROM bil_agent_remittance WHERE id = ?2 AND created_by = ?7)`,
);
const DEM_GAN_DAY = defineSql("billing", "remittance_proof_count_recent", "SELECT count(*) AS n FROM bil_remittance_proof WHERE created_by = ?1 AND created_at > ?2");
const CHO_DAT = defineSql(
  "billing",
  "remittance_proof_to_store",
  "SELECT id, storage_key FROM bil_remittance_proof WHERE remittance_id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
const DANH_DAU_DA_LUU = defineSql(
  "billing",
  "remittance_proof_mark_stored",
  "UPDATE bil_remittance_proof SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
const QUYET_XOA = defineSql(
  "billing",
  "remittance_proof_purge",
  `UPDATE bil_remittance_proof SET purged_at = ?2, purge_reason = ?3, content_hash = NULL, updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND purged_at IS NULL AND (?5 IS NULL OR (stored_at IS NULL AND created_at < ?5))`,
);
const DANH_DAU_DA_XOA_KHO = defineSql(
  "billing",
  "remittance_proof_mark_r2_deleted",
  "UPDATE bil_remittance_proof SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND purged_at IS NOT NULL AND r2_deleted_at IS NULL",
);
const TRANG_THAI_CUA_KHOAN = defineSql(
  "billing",
  "remittance_proof_status",
  "SELECT remittance_id, stored_at, purged_at, purge_reason FROM bil_remittance_proof WHERE remittance_id IN (SELECT value FROM json_each(?1))",
);
const ANH_CUA_KHOAN = defineSql(
  "billing",
  "remittance_proof_of_order",
  `SELECT p.id, p.storage_key, p.content_kind, p.stored_at, p.purged_at FROM bil_remittance_proof p JOIN bil_agent_remittance a ON a.id = p.remittance_id
   WHERE p.remittance_id = ?2 AND a.order_id = ?1`,
);
const CHO_XOA = defineSql(
  "billing",
  "remittance_proof_pending_purge",
  `SELECT p.id, a.order_id, p.storage_key, p.purged_at, p.purge_reason, p.created_at FROM bil_remittance_proof p JOIN bil_agent_remittance a ON a.id = p.remittance_id
   WHERE p.r2_deleted_at IS NULL AND (p.purged_at IS NOT NULL OR (p.stored_at IS NULL AND p.created_at < ?1))
   ORDER BY p.created_at, p.id LIMIT 51`,
);

export type TrangThaiNop = "PENDING" | "CONFIRMED" | "REJECTED";
export interface NopRow {
  id: string; order_id: string; agent_party_id: string; amount: number; transfer_date: string; status_code: TrangThaiNop; reject_reason: string | null; posting_id: string | null;
  created_at: string; created_by: string; decided_at: string | null; decided_by: string | null;
}
export interface NopChoRow { id: string; order_id: string; order_code: string | null; dai_ly: string | null; amount: number; transfer_date: string; created_at: string; co_cong_ty_cho: number }
export interface AnhNopCanXoaRow { id: string; storage_key: string }
export interface AnhNopRow { id: string; storage_key: string; content_kind: LoaiTep; stored_at: string | null; purged_at: string | null }
export interface TrangThaiAnhNopRow { remittance_id: string; stored_at: string | null; purged_at: string | null; purge_reason: string | null }
export interface AnhNopChoXoaRow { id: string; order_id: string; storage_key: string; purged_at: string | null; purge_reason: string | null; created_at: string }

export const chenNopStatement = (
  db: D1Database, v: { id: string; orderId: string; partyId: string; soTien: number; ngayChuyen: string; by: string; at: string; coThuKem: boolean },
): D1PreparedStatement => db.prepare(CHEN_NOP).bind(v.id, v.orderId, v.partyId, v.soTien, v.ngayChuyen, v.by, v.at, v.coThuKem ? 1 : 0);
export async function nopCuaDon(db: D1Database, orderId: string): Promise<NopRow[]> {
  return (await db.prepare(NOP_CUA_DON).bind(orderId).all<NopRow>()).results;
}
export const nopTheoId = (db: D1Database, orderId: string, id: string): Promise<NopRow | null> => db.prepare(NOP_THEO_ID).bind(orderId, id).first<NopRow>();
export async function coNopChoCuaBen(db: D1Database, orderId: string, partyId: string): Promise<boolean> {
  return (await db.prepare(CHO_CUA_BEN).bind(orderId, partyId).first()) !== null;
}
export async function coNopChoCuaNguoi(db: D1Database, orderId: string, staffId: string): Promise<boolean> {
  return (await db.prepare(CHO_CUA_NGUOI).bind(orderId, staffId).first()) !== null;
}
export const xacNhanNopStatement = (db: D1Database, v: { id: string; postingId: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(XAC_NHAN).bind(v.id, v.postingId, v.at, v.by);
export const tuChoiNopStatement = (db: D1Database, v: { id: string; lyDo: string; at: string; by: string }): D1PreparedStatement => db.prepare(TU_CHOI).bind(v.id, v.lyDo, v.at, v.by);
export async function nopChoTatCa(db: D1Database): Promise<NopChoRow[]> {
  return (await db.prepare(CHO_TAT_CA).all<NopChoRow>()).results;
}

export const chenAnhNopStatement = (
  db: D1Database, v: { id: string; remittanceId: string; key: string; loai: LoaiTep; kichThuoc: number; bam: string; by: string; at: string },
): D1PreparedStatement => db.prepare(CHEN_ANH).bind(v.id, v.remittanceId, v.key, v.loai, v.kichThuoc, v.bam, v.by, v.at);
export async function demAnhNopGanDay(db: D1Database, staffId: string, dauCuaSo: string): Promise<number> {
  return Number((await db.prepare(DEM_GAN_DAY).bind(staffId, dauCuaSo).first<{ n: number }>())?.n ?? 0);
}
export async function anhNopChoDat(db: D1Database, remittanceId: string): Promise<AnhNopCanXoaRow[]> {
  return (await db.prepare(CHO_DAT).bind(remittanceId).all<AnhNopCanXoaRow>()).results;
}
export async function danhDauAnhNopDaLuu(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_LUU).bind(id, at).run()).meta.changes ?? 0;
}
export const quyetXoaAnhNopStatement = (db: D1Database, v: { id: string; lyDo: string; at: string; by: string; doDangTruoc?: string }): D1PreparedStatement =>
  db.prepare(QUYET_XOA).bind(v.id, v.at, v.lyDo, v.by, v.doDangTruoc ?? null);
export async function danhDauAnhNopDaXoaKho(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(DANH_DAU_DA_XOA_KHO).bind(id, at).run()).meta.changes ?? 0;
}
export async function trangThaiAnhNop(db: D1Database, ids: readonly string[]): Promise<TrangThaiAnhNopRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(TRANG_THAI_CUA_KHOAN).bind(JSON.stringify(ids)).all<TrangThaiAnhNopRow>()).results;
}
export const anhCuaKhoanNop = (db: D1Database, orderId: string, remittanceId: string): Promise<AnhNopRow | null> =>
  db.prepare(ANH_CUA_KHOAN).bind(orderId, remittanceId).first<AnhNopRow>();
/** Tối đa 50 dòng cũ nhất (+1 để biết «còn nữa»). */
export async function anhNopChoXoa(db: D1Database, doDangTruoc: string): Promise<{ ds: AnhNopChoXoaRow[]; conNua: boolean }> {
  const r = (await db.prepare(CHO_XOA).bind(doDangTruoc).all<AnhNopChoXoaRow>()).results;
  return { ds: r.slice(0, 50), conNua: r.length > 50 };
}

// ---- Dữ kiện của vị từ «đơn có phiếu» (ADR-0182 Đ2 mục 11, 12): người lập + bên đặt (view công bố của orders), quyền đang mở của người lập (view của staff). ----
const BEN_DAT_CUA_DON = defineSql(
  "billing",
  "order_booker_of_order",
  "SELECT b.staff_id, b.booker_party_id, l.order_code FROM v_ord_order_booker b LEFT JOIN v_ord_order_label l ON l.id = b.id WHERE b.id = ?1",
);
const QUYEN_MO_CUA = defineSql("billing", "open_permissions_of_staff", "SELECT permission_code FROM v_stf_quyen_mo WHERE staff_id = ?1");
export interface BenDatRow { staff_id: string; booker_party_id: string | null; order_code: string | null }
export const benDatCuaDon = (db: D1Database, orderId: string): Promise<BenDatRow | null> => db.prepare(BEN_DAT_CUA_DON).bind(orderId).first<BenDatRow>();
export async function quyenMoCua(db: D1Database, staffId: string): Promise<string[]> {
  return (await db.prepare(QUYEN_MO_CUA).bind(staffId).all<{ permission_code: string }>()).results.map((r) => r.permission_code);
}
