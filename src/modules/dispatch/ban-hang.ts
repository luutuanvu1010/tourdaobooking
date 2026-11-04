// SQL của «Bán hàng phụ trách đơn» (ADR-0142; migration 0138): ô riêng `dsp_sales_owner` (không phải người phụ trách HANDLE), lời mời có ưu tiên
// `dsp_sales_invite`, chính sách giờ hành chính `dsp_sales_policy`. Module nghiêm: mọi câu qua defineSql (câu TĨNH), có trong STRICT của src/architecture.test.ts.
//
// Luật lô (Global Constraints của kế hoạch): câu nối vào lô có sẵn phải gác «lệnh chính đã thắng».
//  - Câu của `dispatch` nối vào lô của `orders` gác bằng id dòng nhật ký của lệnh đơn, qua view `v_aud_order_ban_hang` (dispatch không đọc audit_log trực tiếp).
//  - Câu đi sau câu chính của chính `dispatch` gác bằng id dòng vừa mở (`dsp_sales_owner.id`).
// Các hàm `cau…` chỉ DỰNG câu D1 chưa chạy; người gọi gộp vào `db.batch()` của mình. Không ghi nhật ký ở đây (nhật ký là việc của route).
import { defineSql } from "../../shared/sql-registry.ts";
import type { KetQuaLoiMoi, KhungGioHanhChinh } from "../../shared/ban-hang-phu-trach.ts";

// ---- Đọc ------------------------------------------------------------------------------------------------------------------------------------------
// Bán hàng phụ trách trên đơn NHÁP không sinh quyền (khuôn IS_HANDLER, ADR-0135 Đ5): trạng thái đơn đọc qua view công bố v_ord_order_state.
const LA_BAN_HANG = defineSql(
  "dispatch",
  "la_ban_hang_phu_trach",
  `SELECT 1 AS ok FROM v_dsp_sales_owner s JOIN v_ord_order_state o ON o.id = s.order_id WHERE s.order_id = ?1 AND s.staff_id = ?2 AND o.status <> 'draft'`,
);
const BAN_HANG_CUA_DON = defineSql(
  "dispatch",
  "ban_hang_cua_don",
  `SELECT order_id, staff_id, party_id, name FROM v_dsp_sales_owner WHERE order_id IN (SELECT value FROM json_each(?1))`,
);
const LOI_MOI_MO = defineSql(
  "dispatch",
  "loi_moi_mo_cua_don",
  `SELECT staff_id, name, priority_until_at FROM v_dsp_sales_invite_open WHERE order_id = ?1`,
);
const CHINH_SACH = defineSql(
  "dispatch",
  "chinh_sach_ban_hang",
  `SELECT priority_minutes, work_start_minute, work_end_minute, release_cutoff_at FROM v_dsp_sales_policy_current`,
);

// Chính sách: dòng MỚI NHẤT (mốc `valid_from_at` để dòng kế tiếp đi sau nó) và câu thêm dòng (bảng chỉ-thêm; UNIQUE `valid_from_at` là lưới va nhau).
const CHINH_SACH_MOI_NHAT = defineSql("dispatch", "chinh_sach_ban_hang_moi_nhat", `SELECT max(valid_from_at) AS luc FROM dsp_sales_policy`);
const THEM_CHINH_SACH = defineSql(
  "dispatch",
  "them_chinh_sach_ban_hang",
  `INSERT INTO dsp_sales_policy (id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?2, ?6, ?2, ?6)`,
);

// ---- Ghi: ô Bán hàng phụ trách --------------------------------------------------------------------------------------------------------------------
const COT_O = "id, order_id, party_id, valid_from_at, created_at, created_by, updated_at, updated_by";
// ?1 id, ?2 đơn, ?3 hồ sơ, ?4 lúc, ?5 người thao tác, ?6 id nhật ký của lệnh đơn.
const MO_BAT_BUOC = defineSql(
  "dispatch",
  "mo_ban_hang_bat_buoc",
  `INSERT INTO dsp_sales_owner (${COT_O})
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5
   WHERE EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = ?6 AND order_id = ?2)`,
);
// ?1 id, ?2 đơn, ?3 hồ sơ, ?4 lúc, ?5 người thao tác. Chính câu mở là câu chốt: chỉ chèn khi lúc ghi chưa có dòng mở (chỉ mục duy nhất là lưới cuối).
const MO_NEU_TRONG = defineSql(
  "dispatch",
  "mo_ban_hang_neu_trong",
  `INSERT INTO dsp_sales_owner (${COT_O})
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5
   WHERE NOT EXISTS (SELECT 1 FROM dsp_sales_owner WHERE order_id = ?2 AND valid_to_at IS NULL)`,
);
// Đổi người, câu 1: khép dòng mở đúng ?2 (khoá lạc quan theo giá trị party_id — cùng lý lẽ CLOSE_HANDLER). ?1 đơn, ?2 hồ sơ cũ, ?3 lúc, ?4 người thao tác.
const KHEP_O = defineSql(
  "dispatch",
  "khep_ban_hang",
  `UPDATE dsp_sales_owner SET valid_to_at = max(?3, valid_from_at), updated_at = ?3, updated_by = ?4, closed_by = ?4
   WHERE order_id = ?1 AND valid_to_at IS NULL AND party_id = ?2`,
);
// Đổi người, câu 2: mở dòng ?1 nếu ?3 khác NULL và (sau câu khép) không còn dòng mở. ?1 id mới, ?2 đơn, ?3 hồ sơ mới, ?4 lúc, ?5 người thao tác.
const MO_SAU_DOI = defineSql(
  "dispatch",
  "mo_ban_hang_sau_doi",
  `INSERT INTO dsp_sales_owner (${COT_O})
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5
   WHERE ?3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dsp_sales_owner WHERE order_id = ?2 AND valid_to_at IS NULL)`,
);

// ---- Ghi: lời mời ---------------------------------------------------------------------------------------------------------------------------------
// ?1 id, ?2 đơn, ?3 người được mời (hồ sơ), ?4 người mời, ?5 lúc ghi nhận, ?6 hạn ưu tiên, ?7 id nhật ký của lệnh đơn.
const MO_LOI_MOI = defineSql(
  "dispatch",
  "mo_loi_moi",
  `INSERT INTO dsp_sales_invite (id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?4, ?5, ?4
   WHERE EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = ?7 AND order_id = ?2)`,
);
// Khép lời mời đang mở. ?1 đơn, ?2 kết quả, ?3 lúc, ?4 người thao tác (cột closed_by bắt buộc có người: CHECK ba cột cùng có), ?5 id nhật ký của lệnh đơn.
const KHEP_SAU_LENH_DON = defineSql(
  "dispatch",
  "khep_loi_moi_sau_lenh_don",
  `UPDATE dsp_sales_invite SET closed_at = ?3, closed_by = ?4, outcome = ?2, updated_at = ?3, updated_by = ?4
   WHERE order_id = ?1 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = ?5 AND order_id = ?1)`,
);
// Khép sau Nhận / sau Đổi: gác bằng dòng ô vừa mở (?5 = id dòng dsp_sales_owner, phải thuộc đúng đơn ?1).
const KHEP_SAU_NHAN = defineSql(
  "dispatch",
  "khep_loi_moi_sau_nhan",
  `UPDATE dsp_sales_invite SET closed_at = ?3, closed_by = ?4, outcome = ?2, updated_at = ?3, updated_by = ?4
   WHERE order_id = ?1 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM dsp_sales_owner WHERE id = ?5 AND order_id = ?1)`,
);
// Từ chối: câu chính, chỉ đúng người được mời. ?1 đơn, ?2 hồ sơ người được mời, ?3 lúc, ?4 người thao tác.
const TU_CHOI = defineSql(
  "dispatch",
  "tu_choi_loi_moi",
  `UPDATE dsp_sales_invite SET closed_at = ?3, closed_by = ?4, outcome = 'TU_CHOI', updated_at = ?3, updated_by = ?4
   WHERE order_id = ?1 AND invitee_party_id = ?2 AND closed_at IS NULL`,
);

// ---- Hàm công bố ----------------------------------------------------------------------------------------------------------------------------------
export async function khungGioHanhChinh(db: D1Database): Promise<KhungGioHanhChinh | null> {
  const r = await db.prepare(CHINH_SACH).first<{ priority_minutes: number; work_start_minute: number; work_end_minute: number; release_cutoff_at: string | null }>();
  if (!r || r.release_cutoff_at === null) return null;
  return { phutUuTien: r.priority_minutes, tuPhut: r.work_start_minute, denPhut: r.work_end_minute, mocPhatHanh: r.release_cutoff_at };
}

/** Mốc `valid_from_at` của dòng chính sách mới nhất (null nếu bảng rỗng — không xảy ra vì dòng gieo). */
export async function moiNhatChinhSach(db: D1Database): Promise<string | null> {
  return (await db.prepare(CHINH_SACH_MOI_NHAT).first<{ luc: string | null }>())?.luc ?? null;
}
/** Câu thêm MỘT dòng chính sách (chưa chạy). */
export const cauThemChinhSach = (db: D1Database, x: { id: string; at: string; phutUuTien: number; tuPhut: number; denPhut: number; by: string }): D1PreparedStatement =>
  db.prepare(THEM_CHINH_SACH).bind(x.id, x.at, x.phutUuTien, x.tuPhut, x.denPhut, x.by);

export async function laBanHangPhuTrach(db: D1Database, staffId: string, orderId: string): Promise<boolean> {
  return (await db.prepare(LA_BAN_HANG).bind(orderId, staffId).first()) !== null;
}

/** Bán hàng phụ trách (dòng mở) của các đơn. `staffId` null khi hồ sơ không có tài khoản. Mảng rỗng: không truy vấn. */
export async function banHangCuaDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, { staffId: string | null; name: string; partyId: string }>> {
  const out = new Map<string, { staffId: string | null; name: string; partyId: string }>();
  if (orderIds.length === 0) return out;
  const { results } = await db.prepare(BAN_HANG_CUA_DON).bind(JSON.stringify(orderIds)).all<{ order_id: string; staff_id: string | null; party_id: string; name: string }>();
  for (const r of results) out.set(r.order_id, { staffId: r.staff_id, name: r.name, partyId: r.party_id });
  return out;
}

/** Lời mời đang mở của đơn, CHƯA xét người được mời còn hợp lệ không (việc đó cần module staff: `ban-hang-moi.ts`). `staffId` null khi hồ sơ không có tài khoản. */
export async function loiMoiMoTho(db: D1Database, orderId: string): Promise<{ staffId: string | null; name: string; hanIso: string } | null> {
  const r = await db.prepare(LOI_MOI_MO).bind(orderId).first<{ staff_id: string | null; name: string; priority_until_at: string }>();
  return r ? { staffId: r.staff_id, name: r.name, hanIso: r.priority_until_at } : null;
}

// ---- Câu lệnh chưa chạy ---------------------------------------------------------------------------------------------------------------------------
/** Mở lời mời khi lệnh đơn ghi nhận (gửi xác nhận / xác nhận). Gác theo nhật ký của lệnh đơn: lệnh đơn thua ⇒ 0 dòng. */
export const cauMoLoiMoi = (db: D1Database, x: { orderId: string; inviteePartyId: string; invitedBy: string | null; at: string; hanIso: string; auditId: string }): D1PreparedStatement =>
  db.prepare(MO_LOI_MOI).bind(crypto.randomUUID(), x.orderId, x.inviteePartyId, x.invitedBy, x.at, x.hanIso, x.auditId);

/**
 * Mở Bán hàng phụ trách BẮT BUỘC (Còn vé, tự mời mình): `INSERT … SELECT … WHERE <gác nhật ký>`, KHÔNG có `NOT EXISTS`. Lệnh đơn thua ⇒ 0 dòng; ô đã có người
 * ⇒ chỉ mục duy nhất làm CẢ LÔ hỏng (ADR Đ4) — người gọi bắt bằng `laVaChamOBanHang`.
 */
export const cauMoBanHangBatBuoc = (db: D1Database, x: { id: string; orderId: string; partyId: string; actorId: string; at: string; auditId: string }): D1PreparedStatement =>
  db.prepare(MO_BAT_BUOC).bind(x.id, x.orderId, x.partyId, x.at, x.actorId, x.auditId);

/** Khép lời mời đang mở (nếu có) sau lệnh đơn: Còn vé, Hết vé / Huỷ, Rút lại, `/status` huỷ, `handler-cancel`. Gác theo nhật ký. `actorId` = người thao tác. */
export const cauKhepLoiMoiSauLenhDon = (db: D1Database, x: { orderId: string; outcome: KetQuaLoiMoi; at: string; actorId: string; auditId: string }): D1PreparedStatement =>
  db.prepare(KHEP_SAU_LENH_DON).bind(x.orderId, x.outcome, x.at, x.actorId, x.auditId);

/** Câu chính của route Nhận phụ trách: chỉ chèn khi lúc ghi đơn chưa có Bán hàng phụ trách (khuôn `insertHandlerIfNoneStatement`). */
export const cauMoBanHangNeuTrong = (db: D1Database, x: { id: string; orderId: string; partyId: string; actorId: string; at: string }): D1PreparedStatement =>
  db.prepare(MO_NEU_TRONG).bind(x.id, x.orderId, x.partyId, x.at, x.actorId);

/** Khép lời mời sau Nhận / Đổi: gác bằng dòng ô `ownerRowId` đã có (bên thua đua ⇒ dòng đó không có ⇒ 0 dòng). */
export const cauKhepLoiMoiSauNhan = (db: D1Database, x: { orderId: string; outcome: "NHAN" | "NGUOI_KHAC"; at: string; actorId: string; ownerRowId: string }): D1PreparedStatement =>
  db.prepare(KHEP_SAU_NHAN).bind(x.orderId, x.outcome, x.at, x.actorId, x.ownerRowId);

/** Câu chính của Từ chối: khép bằng `TU_CHOI` dòng mở của đúng người được mời. */
export const cauTuChoiLoiMoi = (db: D1Database, x: { orderId: string; inviteePartyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(TU_CHOI).bind(x.orderId, x.inviteePartyId, x.at, x.actorId);

/**
 * Đổi / gỡ Bán hàng phụ trách — LUÔN ba câu, theo thứ tự (chỉ số cố định để người gọi dùng `banHangThang`):
 *  [0] khép dòng mở đúng `partyIdCu` (khoá lạc quan: người khác vừa đổi ⇒ 0 dòng; `partyIdCu` null ⇒ luôn 0 dòng, người gọi dựa vào [1]);
 *  [1] mở dòng `idMoi` khi `partyIdMoi` khác null và không còn dòng mở (`partyIdMoi` null ⇒ 0 dòng);
 *  [2] khi có người mới: khép lời mời mở bằng `NGUOI_KHAC`, gác bằng dòng `idMoi` (không có dòng ⇒ 0 dòng).
 */
export const cauDoiBanHang = (
  db: D1Database,
  x: { orderId: string; partyIdCu: string | null; idMoi: string; partyIdMoi: string | null; actorId: string; at: string },
): D1PreparedStatement[] => [
  db.prepare(KHEP_O).bind(x.orderId, x.partyIdCu, x.at, x.actorId),
  db.prepare(MO_SAU_DOI).bind(x.idMoi, x.orderId, x.partyIdMoi, x.at, x.actorId),
  db.prepare(KHEP_SAU_NHAN).bind(x.orderId, "NGUOI_KHAC", x.at, x.actorId, x.idMoi),
];

/** Câu thứ `viTri` của lô đã ghi ít nhất một dòng (thắng). */
export const banHangThang = (kq: D1Result[], viTri: number): boolean => (kq[viTri]?.meta.changes ?? 0) > 0;
