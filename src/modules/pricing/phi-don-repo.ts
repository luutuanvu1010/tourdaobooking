// SQL của BẢNG PHÍ ĐƯA ĐÓN (ADR-0147 Đ2, ADR-0203 ĐB1; kế hoạch Phí đưa đón Đợt B, Task 7): các bảng prc_transfer_fee_*. Module nghiêm: câu TĨNH qua `defineSql`, tham số ?N.
// KHÔNG nhắc bảng của module khác (vùng thuộc `locations` đến qua `ctx.vungDon`, không đọc bảng của vùng). Import kèm đuôi .ts, không import index.ts (bài kiểm nạp tệp này thẳng bằng Node).
// BẤT BIẾN GÁC CỔNG: CSDL KHÔNG có trigger chặn chèn thêm điều kiện vào dòng mức đã có (chèn thêm sẽ đổi nghĩa mức mà không đổi `condition_sig`). Vì vậy câu chèn điều kiện
// chỉ được dùng trong `cauThemMucPhiDon` — dòng mức và mọi điều kiện của nó đi CÙNG MỘT lô — và không có hàm nào khác xuất câu đó (bài `phi-don-route.test.ts` khoá điều này).
import { defineSql } from "../../shared/sql-registry.ts";
import { capCuaHoSoNgay, chuKyDieuKien, tinhPhiDonThuan, type ChangDauVao, type KetQuaPhiDonDon, type CapCuaHoSo, type DieuKienPhiDon, type KhoaPhiDon, type KieuPhiDon, type MucPhiDon } from "./phi-don-rules.ts";
import { groupsOf, openRolesOf, partyTiersOf, roleTiersOn } from "./repository.ts";
import { hieuLuc } from "./rules.ts";

export interface DongMucPhiDon { muc: MucPhiDon; ghiChu: string | null; updatedAt: string }
interface HangMuc { id: string; kind: KieuPhiDon; amount: number; valid_from_date: string; valid_to_date: string | null; note: string | null; updated_at: string; key_code: string | null; value: string | null }
export interface DongQuyTac { id: string; kind: KieuPhiDon; valid_from_date: string; valid_to_date: string | null; updated_at: string }
export interface DongBatDauAp { start_date: string | null; valid_from_at: string }

// Dòng mức + điều kiện bằng MỘT câu LEFT JOIN: mọi dòng chưa hết hạn từ ngày ?1 (kể cả dòng chưa tới ngày — màn quản lý cần thấy).
const MUC_TU = defineSql("pricing", "transfer_fee_rules_from",
  `SELECT r.id, r.kind, r.amount, r.valid_from_date, r.valid_to_date, r.note, r.updated_at, c.key_code, c.value
   FROM prc_transfer_fee_rule r LEFT JOIN prc_transfer_fee_condition c ON c.rule_id = r.id
   WHERE r.valid_to_date IS NULL OR r.valid_to_date >= ?1
   ORDER BY r.valid_from_date, r.id, c.key_code`);
const MUC_TIM = defineSql("pricing", "transfer_fee_rule_find", `SELECT id, kind, valid_from_date, valid_to_date, updated_at FROM prc_transfer_fee_rule WHERE id = ?1`);
const MUC_THEM = defineSql("pricing", "transfer_fee_rule_insert",
  `INSERT INTO prc_transfer_fee_rule (id, kind, amount, valid_from_date, valid_to_date, condition_sig, note, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9
   WHERE ?10 IS NULL OR EXISTS (SELECT 1 FROM prc_transfer_fee_rule WHERE id = ?10 AND valid_to_date = ?11 AND updated_at = ?12)`);
// Câu chèn điều kiện DUY NHẤT (xem đầu tệp): chỉ `cauThemMucPhiDon` được dùng hằng này.
const CAU_THEM_DIEU_KIEN = defineSql("pricing", "transfer_fee_condition_insert",
  `INSERT INTO prc_transfer_fee_condition (rule_id, key_code, value, created_at, created_by, updated_at, updated_by) SELECT ?1, ?2, ?3, ?4, ?5, ?4, ?5 WHERE EXISTS (SELECT 1 FROM prc_transfer_fee_rule WHERE id = ?1)`);
// Đóng dòng: khoá lạc quan theo `updated_at` đã đọc; chỉ rút ngắn (trigger `close_only` là lưới CSDL).
const MUC_DONG = defineSql("pricing", "transfer_fee_rule_close",
  `UPDATE prc_transfer_fee_rule SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND updated_at = ?5 AND (valid_to_date IS NULL OR valid_to_date > ?2)`);
const AP_MOI_NHAT = defineSql("pricing", "transfer_fee_start_latest", `SELECT start_date, valid_from_at FROM prc_transfer_fee_start ORDER BY valid_from_at DESC LIMIT 1`);
// Khoá lạc quan NẰM TRONG câu chèn (khuôn `entry_limit_insert`): `IS ?6` vì bảng ban đầu RỖNG (mốc đã đọc là NULL).
const AP_THEM = defineSql("pricing", "transfer_fee_start_insert",
  `INSERT INTO prc_transfer_fee_start (id, start_date, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?4, ?5 WHERE (SELECT max(valid_from_at) FROM prc_transfer_fee_start) IS ?6`);

const KHOA_HOP_LE = new Set<string>(["ZONE", "DIRECTION", "SERVICE_GROUP", "EXCLUSIVE", "TIER", "SERVICE"]);

/** Gom các hàng JOIN thành dòng mức. Dòng KHÔNG có điều kiện ZONE (không thể sinh qua route) bị bỏ: khớp rộng là nguy hiểm, thiếu mức an toàn hơn (không bao giờ là 0 đồng). */
export async function docMucPhiDonTu(db: D1Database, ngay: string): Promise<DongMucPhiDon[]> {
  const hang = (await db.prepare(MUC_TU).bind(ngay).all<HangMuc>()).results;
  const ra = new Map<string, DongMucPhiDon>();
  for (const h of hang) {
    let d = ra.get(h.id);
    if (!d) {
      d = { muc: { id: h.id, kind: h.kind, amount: h.amount, validFrom: h.valid_from_date, validTo: h.valid_to_date, dieuKien: {} }, ghiChu: h.note, updatedAt: h.updated_at };
      ra.set(h.id, d);
    }
    if (h.key_code !== null && h.value !== null && KHOA_HOP_LE.has(h.key_code)) d.muc.dieuKien[h.key_code as KhoaPhiDon] = h.value;
  }
  return [...ra.values()].filter((d) => d.muc.dieuKien.ZONE !== undefined);
}
export const quyTacTheoId = async (db: D1Database, id: string): Promise<DongQuyTac | null> => (await db.prepare(MUC_TIM).bind(id).first<DongQuyTac>()) ?? null;
export const batDauApMoiNhat = async (db: D1Database): Promise<DongBatDauAp | null> => (await db.prepare(AP_MOI_NHAT).first<DongBatDauAp>()) ?? null;
/** «Ngày bắt đầu áp» phí đưa đón đang hiệu lực (giờ Việt Nam, YYYY-MM-DD); null = tắt. Từ ADR-0214 đây là CÔNG TẮC duy nhất `orders` đọc của pricing cho phí trên đơn. Chỉ đọc. */
export const ngayBatDauApPhiDon = async (db: D1Database): Promise<string | null> => (await batDauApMoiNhat(db))?.start_date ?? null;

export interface ThemMucPhiDon { id: string; kind: KieuPhiDon; amount: number; validFrom: string; validTo: string | null; note: string | null; dieuKien: DieuKienPhiDon; at: string; by: string;
  /** Chỉ khi đổi mức (`thayCho`): dòng mới chỉ được chèn nếu dòng cũ SAU câu đóng đang ở `denNgay` với `updated_at` = `updatedAt` (mốc câu đóng vừa ghi, hoặc mốc đã đọc khi dòng đã đóng sẵn). Sai ⇒ không chèn gì (route trả 409 stale). */
  chiKhiDongCu?: { id: string; denNgay: string; updatedAt: string } }
/** Lô tạo mức: [chèn dòng mức, chèn từng điều kiện]. Đây là NƠI DUY NHẤT chèn điều kiện; nơi gọi nối nhật ký rồi chạy MỘT `db.batch`. */
export function cauThemMucPhiDon(db: D1Database, v: ThemMucPhiDon): D1PreparedStatement[] {
  const dieuKien = Object.entries(v.dieuKien).filter((e): e is [string, string] => typeof e[1] === "string").sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return [
    db.prepare(MUC_THEM).bind(v.id, v.kind, v.amount, v.validFrom, v.validTo, chuKyDieuKien(v.dieuKien), v.note, v.at, v.by, v.chiKhiDongCu?.id ?? null, v.chiKhiDongCu?.denNgay ?? null, v.chiKhiDongCu?.updatedAt ?? null),
    ...dieuKien.map(([khoa, giaTri]) => db.prepare(CAU_THEM_DIEU_KIEN).bind(v.id, khoa, giaTri, v.at, v.by)),
  ];
}
export const cauDongMucPhiDon = (db: D1Database, v: { id: string; denNgay: string; at: string; by: string; truocLuc: string }): D1PreparedStatement =>
  db.prepare(MUC_DONG).bind(v.id, v.denNgay, v.at, v.by, v.truocLuc);
export const cauDatBatDauAp = (db: D1Database, v: { id: string; ngay: string | null; tuLuc: string; tuLucDaDoc: string | null; at: string; by: string }): D1PreparedStatement =>
  db.prepare(AP_THEM).bind(v.id, v.ngay, v.tuLuc, v.at, v.by, v.tuLucDaDoc);

export interface BangPhiDonChoDon { batDauAp: string | null; muc: MucPhiDon[]; cap: CapCuaHoSo }
/**
 * Hàm công bố cho Đợt C (gốc lắp ráp / `orders` gọi qua `pricing/index.ts`): ngày bắt đầu áp hiện hành, các mức hiệu lực ngày `ngay` kèm điều kiện, và cấp của hồ sơ bên đặt tại ngày đó
 * (cùng nguồn vai + cấp với `docBangChoChup`, cùng MỘT `capCuaHoSoNgay`). KHÔNG tự kiểm quyền. `bookerPartyId` null ⇒ KHONG_CAP.
 * Cố ý đọc vai đang mở HÔM NAY (`openRolesOf`): ngày tính phí luôn là hôm nay (ràng buộc của kế hoạch Đợt C), nên không cần vai theo ngày khác.
 */
export async function docBangPhiDonChoDon(db: D1Database, v: { bookerPartyId: string | null; ngay: string }): Promise<BangPhiDonChoDon> {
  const [ap, dong, vai, gan, ganRieng] = await Promise.all([
    batDauApMoiNhat(db), docMucPhiDonTu(db, v.ngay),
    v.bookerPartyId ? openRolesOf(db, v.bookerPartyId) : Promise.resolve([]), roleTiersOn(db, v.ngay), v.bookerPartyId ? partyTiersOf(db, v.bookerPartyId) : Promise.resolve([]),
  ]);
  const cap = capCuaHoSoNgay({
    partyId: v.bookerPartyId, vai: vai.map((r) => r.role_type_code), ngay: v.ngay,
    gan: gan.map((r) => ({ roleTypeCode: r.role_type_code, tierCode: r.tier_code, validFrom: r.valid_from_date, validTo: r.valid_to_date })),
    ganRieng: ganRieng.map((r) => ({ partyId: r.party_id, tierCode: r.tier_code, validFrom: r.valid_from_date, validTo: r.valid_to_date })),
  });
  return { batDauAp: ap?.start_date ?? null, muc: dong.map((d) => d.muc).filter((m) => hieuLuc(m, v.ngay)), cap };
}

/** Phí đưa đón của MỘT đơn: đọc bảng + cấp bên đặt + nhóm dịch vụ, rồi gọi hàm thuần `tinhPhiDonThuan` (cùng hàm với «Thử tra»). Không ghi gì. */
export async function tinhPhiDonChoDon(db: D1Database, v: { bookerPartyId: string | null; ngay: string; chang: readonly ChangDauVao[] }): Promise<KetQuaPhiDonDon> {
  const bang = await docBangPhiDonChoDon(db, { bookerPartyId: v.bookerPartyId, ngay: v.ngay });
  if (bang.batDauAp === null || v.ngay < bang.batDauAp || v.chang.length === 0) return tinhPhiDonThuan({ bang, nhom: new Map(), ngay: v.ngay, chang: v.chang });
  const ma = [...new Set(v.chang.map((c) => c.catalogCode).filter((x): x is string => x !== null))];
  const nhom = ma.length === 0 ? new Map<string, string | null>() : await groupsOf(db, ma);
  return tinhPhiDonThuan({ bang, nhom, ngay: v.ngay, chang: v.chang });
}
