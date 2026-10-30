// Module pricing — bảng mức hoa hồng, điều khoản người bán (ADR-0077, ADR-0078 B1; đặc tả 2026-10-08 sổ đại lý đợt 1). Route: /api/pricing/*.
// Hàm công bố cho orders: docBangChoChup (đọc mọi thứ để chụp lúc Xác nhận / đổi bên đặt), laNguoiHuong (bên đặt tổ chức có được gắn vào đơn không).
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { datHoatDongLoaiDoiTacStatement, kiemTenLoaiDoiTac, loaiVaiChiTiet, maLoaiDoiTac, ownerCompany, tenLoaiVai, themLoaiDoiTacStatement } from "../parties";
import type { CommissionRuleDto, DoiMucResponse, HoaHongHoSoResponse, CommissionRuleListResponse, GanLoaiMucDto, GanLoaiMucResponse, LoaiDoiTacDto, LoaiDoiTacListResponse, LoaiDoiTacResponse, MucTaDto, MucTaListResponse, MucTaResponse,
  NguoiHuongTimResponse, SuaGanLoaiResponse, SuaMucResponse, SuaXemTruocResponse, SupplyTermDto, SupplyTermListResponse, ThuTraResponse } from "../../shared/contracts";
import { error, json, mauLikeChua, kemLocation, readJson } from "../../shared/http";
import { coTheTimDoiTac } from "../../shared/hoa-hong-hien-thi";
import { can, holdsPartner } from "../../shared/permissions";
import { route, type AppModule, type HoiDaChup } from "../../shared/router";
import { CAU_X3_THUE_XE, NHAN_LY_DO_THIEU } from "../../shared/so-dai-ly-nhan";
import { vnToday } from "../../shared/vn-date";
import { cauDoiChinhSach, cauSuaGanLoai, cauSuaGanRieng, cauSuaMuc, partyTiersCurrent, cauDoiMuc, allRules, allTerms, beneficiaryRoles, beneficiaryRolesAll, closeRoleTierStatement, closeRuleStatement, closeTermStatement, findBeneficiaries, groupsOf, huongCuaHoSo, insertBeneficiaryStatement,
  insertRateTierStatement, insertRoleTierStatement, insertRulePaxStatement, insertRuleStatement, insertTermStatement, isBeneficiary, openRolesOf, partyTiersHistory, partyTiersOf, partyTierById, insertPartyTierStatement, closePartyTierStatement, rateTierByCode, rateTiers, roleRulesForTierLink, roleTierById, roleTiersAll,
  roleTiersOn, ruleById, rulesOn, setBeneficiaryActiveStatement, setRateTierActiveStatement, suppliers, termById, termsOn, type PartyTierRow, type RoleTierRow, type RuleRow, type TermRow, type TierRow, type XuLyDongCu } from "./repository";
import { MA_RE, MUC_TA_RE, PARTY_RE, chonMuc, cungMuc, hieuLuc, tomTatHoaHongHoSo, kiemDoi, kiemNgayDong, kiemNgung, kiemSua, xemTruocSua, kiemThanDoiChinhSach, kiemThanDieuKhoan, kiemThanDoiMuc, kiemThanDongMucTa, kiemThanGan, kiemThanGanRieng, kiemThanMuc, kiemTenMucTa, laNgay, maMucTa, moTaMuc, nguoiHuongCua,
  type DongDieuKhoan, type DongMuc, type GanLoaiMuc, type GanRieng, type MucTheoLoai, type NguoiHuong } from "./rules";

export { chupDon, soKhachTinhHoaHong, tinhDongDoiTac, type BanChup, type DongPhanDoiTac, type KieuMuc, type LyDoThieu, type NguoiHuong } from "./rules";

/** ADR-0133: ba số tiền của dòng phụ; người lớn = per_pax_amount. null khi dòng không khai theo loại (không có dòng phụ). */
const theoLoaiCua = (r: RuleRow): MucTheoLoai | null =>
  r.pax_child === null || r.pax_senior === null || r.per_pax_amount === null ? null : { adult: r.per_pax_amount, child: r.pax_child, senior: r.pax_senior };
const dongMuc = (r: RuleRow): DongMuc => ({ id: r.id, targetPartyId: r.target_party_id, targetRoleCode: r.target_role_code, targetTierCode: r.target_tier_code, scope: r.scope,
  catalogCode: r.catalog_code, groupCode: r.group_code, kind: r.kind, rateBp: r.rate_bp, perPaxAmount: r.per_pax_amount, theoLoai: theoLoaiCua(r), validFrom: r.valid_from_date, validTo: r.valid_to_date });
const dongGanRieng = (r: PartyTierRow): GanRieng => ({ partyId: r.party_id, tierCode: r.tier_code, validFrom: r.valid_from_date, validTo: r.valid_to_date });
const dongGan = (r: RoleTierRow): GanLoaiMuc => ({ roleTypeCode: r.role_type_code, tierCode: r.tier_code, validFrom: r.valid_from_date, validTo: r.valid_to_date });
const dongDk = (r: TermRow): DongDieuKhoan => ({ id: r.id, scope: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, sellerPartyId: r.seller_party_id,
  supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp, validFrom: r.valid_from_date, validTo: r.valid_to_date });

/** `ganRieng` (ADR-0138): mức TA gắn riêng của BÊN ĐẶT — nơi gọi truyền cho `chupDon` (tham số bắt buộc) cùng `gan`. */
export interface DuLieuChup { nguoiHuong: NguoiHuong; muc: DongMuc[]; gan: GanLoaiMuc[]; ganRieng: GanRieng[]; dieuKhoan: DongDieuKhoan[]; nhom: ReadonlyMap<string, string | null> }
/**
 * Đọc MỘT lần mọi thứ để chụp một đơn ở `ngay` (đặc tả §5): vai của bên đặt, mức (cả dòng đích mức TA) và điều khoản hiệu lực ở `ngay`, gắn loại↔mức TA hiệu lực ở `ngay`
 * (ADR-0117 lần 2 — không lọc theo mức đang bật: mức tắt vẫn áp cho gắn đang có), nhóm hiện hành của các mã. Nơi gọi truyền `gan` cho `chupDon` / `chonMuc`.
 */
export async function docBangChoChup(db: D1Database, v: { bookerPartyId: string | null; catalogCodes: readonly string[]; ngay: string }): Promise<DuLieuChup> {
  const [vai, duocHuong, cty, muc, gan, dk, nhom, ganRieng] = await Promise.all([
    v.bookerPartyId ? openRolesOf(db, v.bookerPartyId) : Promise.resolve([]), beneficiaryRoles(db), ownerCompany(db), rulesOn(db, v.ngay), roleTiersOn(db, v.ngay), termsOn(db, v.ngay),
    groupsOf(db, v.catalogCodes), v.bookerPartyId ? partyTiersOf(db, v.bookerPartyId) : Promise.resolve([]),
  ]);
  const nguoiHuong = nguoiHuongCua({ bookerPartyId: v.bookerPartyId, vaiMo: vai.map((r) => ({ roleTypeCode: r.role_type_code, roleGroup: r.role_group, nhanDoiTac: r.is_partner_label === 1 })), vaiDuocHuong: new Set(duocHuong), congTyChuId: cty?.partyId ?? null });
  return { nguoiHuong, muc: muc.map(dongMuc), gan: gan.map(dongGan), ganRieng: ganRieng.map(dongGanRieng), dieuKhoan: dk.map(dongDk), nhom };
}
export const laNguoiHuong = (db: D1Database, partyId: string): Promise<boolean> => isBeneficiary(db, partyId);
/**
 * Task 11 (Ruling 21): hồ sơ `partyId` đang mang vai được hưởng (CÙNG điều kiện `laNguoiHuong`) ⇒ `{ partyId, ten }`, không thì null. CHỈ gốc lắp ráp gọi, để `GET /api/auth/me` báo
 * "bên đặt máy chủ sẽ ép cho tài khoản Đối tác này" (`auth` không import `pricing`). Chỉ id và tên hồ sơ — không liên hệ.
 */
export const nguoiHuongCuaHoSo = (db: D1Database, partyId: string): Promise<{ partyId: string; ten: string } | null> => huongCuaHoSo(db, partyId);

/** Cùng câu cho trigger `prc_supplier_mismatch` và cho lời kiểm trước ở route (ràng buộc CHECK của bảng không có tiền tố mã nên không dịch được từ lỗi). */
const CAU_TY_LE_MUA_LAI = "Tour Đảo bán thì không ghi tỷ lệ mua lại; nhà cung cấp bán thì phải ghi.";
/** Lỗi trigger của prc_* → câu tiếng Việt; không khớp → null (ném lại). */
function loiBang(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bprc_overlap:/.test(m)) return error(409, "prc_overlap", "Đã có mức / điều khoản cùng đối tượng, cùng phạm vi trong khoảng ngày này — đóng dòng cũ trước.");
  if (/\bprc_target_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Hồ sơ này không mang vai trò được hưởng hoa hồng.");
  if (/\bprc_role_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Loại đối tác này không nằm trong danh sách được hưởng hoa hồng.");
  if (/\bprc_beneficiary_kind:/.test(m)) return error(400, "invalid_input", "Loại này không được hưởng hoa hồng.");
  if (/\bprc_seller_not_supplier:/.test(m)) return error(400, "invalid_input", "Người bán phải là Tour Đảo hoặc hồ sơ mang vai trò Nhà cung cấp.");
  if (/\bprc_supplier_mismatch:/.test(m)) return error(400, "invalid_input", CAU_TY_LE_MUA_LAI);
  if (/\bprc_all_owner_only:/.test(m)) return error(400, "invalid_input", "Dòng \"mọi dịch vụ\" chỉ dành cho Tour Đảo.");
  if (/\bprc_transfer_no_supplier:/.test(m)) return error(409, "prc_transfer_no_supplier", CAU_X3_THUE_XE);
  // ADR-0117 lần 2 (migration 0096 / 0097): mức TA và gắn loại↔mức. Trùng tên do cột `name_key` UNIQUE quyết (một nơi — đúng cả khi hai lần thêm đồng thời).
  if (/UNIQUE constraint failed: prc_rate_tier\.name_key/.test(m)) return error(409, "muc_trung", "Đã có cấp đại lý với tên này.");
  if (/UNIQUE constraint failed: prc_rate_tier\.code/.test(m)) return error(409, "stale", "Trùng mã mức vừa sinh — thử lại.");
  if (/\bprc_party_tier_overlap:/.test(m)) return error(409, "prc_tier_overlap", "Hồ sơ này đã có một cấp riêng trong khoảng ngày này — ngừng cấp riêng cũ trước.");
  if (/\bprc_tier_overlap:/.test(m)) return error(409, "prc_tier_overlap", "Loại này đã theo một cấp đại lý trong khoảng ngày này — ngừng áp dụng cấp cũ trước.");
  if (/\bprc_tier_target:/.test(m)) return error(400, "invalid_input", "Loại đối tác này không nằm trong danh sách được hưởng hoa hồng hoặc đã tắt.");
  if (/\bprc_tier_inactive:/.test(m)) return error(409, "muc_tat", "Cấp đại lý này đang khoá — mở lại cấp trước khi áp dụng cho loại, đặt cấp riêng hay thêm mức.");
  if (/NOT NULL constraint failed: prc_role_tier\.valid_from_date/.test(m)) return error(409, "stale", "Lần áp dụng cấp đại lý này vừa được người khác ngừng hoặc đổi. Tải lại trang."); // câu chèn của Đổi chính sách: gắn cũ không còn đóng được
  if (/NOT NULL constraint failed: prc_commission_rule\.valid_from_date/.test(m)) return error(409, "stale", "Dòng này vừa được người khác ngừng hoặc đổi. Tải lại trang."); // câu chèn của Đổi mức: dòng cũ không còn đóng được
  // ADR-0148 «Sửa»: câu huỷ / đóng dòng cũ thua khoá lạc quan (người khác vừa sửa / ngừng / huỷ) ⇒ câu chèn dòng thay thế lỗi NOT NULL hoặc trigger dòng thay thế.
  if (/NOT NULL constraint failed: prc_party_tier\.valid_from_date/.test(m) || /\bprc_replaces_mismatch:/.test(m)) return error(409, "stale", "Dòng này vừa được người khác sửa hoặc ngừng. Tải lại trang.");
  if (/\bprc_append_only:/.test(m)) return error(409, "stale", "Dòng này vừa được người khác ngừng — tải lại.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Nhóm dịch vụ hoặc hồ sơ không có.");
  return null;
}
async function chayLo(db: D1Database, lo: D1PreparedStatement[]): Promise<D1Result[] | Response> {
  try { return await db.batch(lo); } catch (e) { const r = loiBang(e); if (r) return r; throw e; }
}
const FORBIDDEN = () => error(403, "forbidden", "Bạn không có quyền với bảng mức này.");
/** ADR-0148 Đ1: hàm tiêm «đã chụp chưa» vắng (khung thử cố ý) ⇒ từ chối kín — đoán «chưa chụp» sẽ mở đường huỷ dòng đã có đơn. */
const CHUA_KIEM_CHUP = () => error(503, "chua_kiem_chup", "Chưa kiểm được mức này đã có đơn dùng hay chưa — thử lại sau ít phút.");
/** Hỏi `ctx.hoiDaChup` MỘT lần: `{ ngay }` hoặc Response 503. */
async function ngayChupCua(hoi: (q: HoiDaChup) => Promise<{ ngay: string | null } | null>, q: HoiDaChup): Promise<{ ngay: string | null } | Response> {
  return (await hoi(q)) ?? CHUA_KIEM_CHUP();
}
const qMuc = (r: RuleRow): HoiDaChup => ({ loai: "MUC", ruleId: r.id });
const qGanLoai = (r: RoleTierRow): HoiDaChup => ({ loai: "GAN", tierCode: r.tier_code, tu: r.valid_from_date, den: r.valid_to_date, partyId: null });
const qGanRieng = (r: PartyTierRow): HoiDaChup => ({ loai: "GAN", tierCode: r.tier_code, tu: r.valid_from_date, den: r.valid_to_date, partyId: r.party_id });
const dongCoNgay = (r: { valid_from_date: string; valid_to_date: string | null; voided_at: string | null }) => ({ validFrom: r.valid_from_date, validTo: r.valid_to_date, daHuy: r.voided_at !== null });
/** Thân xem trước «Sửa» (ba loại dòng): đường + ngày sớm nhất, hoặc 400 câu tiếng Việt (đã huỷ / hết hạn / hết ngày). */
function xemTruoc(r: { valid_from_date: string; valid_to_date: string | null; voided_at: string | null }, ngayChup: string | null): Response {
  const homNay = vnToday(new Date());
  const xt = xemTruocSua({ cu: dongCoNgay(r), ngayChup, homNay });
  if (!xt.ok) return error(400, "invalid_input", xt.error);
  const { ok: _ok, ...duong } = xt;
  return json({ homNay, ...duong } satisfies SuaXemTruocResponse);
}
const xuLyCu = (k: { duong: "HUY_THAY" } | { duong: "TU_NGAY"; denNgayCu: string }): XuLyDongCu => (k.duong === "HUY_THAY" ? { cach: "HUY" } : { cach: "DONG", den: k.denNgayCu });
/** Thân «Sửa» chung cho gắn loại / gắn đối tác: { muc, tuNgay, denNgay?, lyDo } — chính sách mới + khoảng ngày (cùng dạng thân gắn riêng). */
const kiemThanSuaGan = (raw: unknown) => kiemThanGanRieng(raw);
const lyDoCua = (raw: unknown): unknown => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>).lyDo : undefined);
const dongDaDong = (res: D1Result[]): boolean => (res[0]?.meta.changes ?? 0) === 0;

const dtoTheoLoai = (t: MucTheoLoai | null) => (t ? { nguoiLon: t.adult, treEm: t.child, nguoiCaoTuoi: t.senior } : null);
const dtoMuc = (r: RuleRow, tenVai: ReadonlyMap<string, string>, homNay: string): CommissionRuleDto => ({
  id: r.id,
  doiTuong: r.target_role_code !== null
    ? { loai: "VAI", code: r.target_role_code, ten: tenVai.get(r.target_role_code) ?? r.target_role_code }
    : r.target_tier_code !== null
      ? { loai: "MUC", code: r.target_tier_code, ten: r.tier_name ?? r.target_tier_code }
      : { loai: "DOI_TAC", partyId: r.target_party_id ?? "", ten: r.target_name ?? "Hồ sơ không còn" },
  phamVi: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, kieu: r.kind, tyLeBp: r.rate_bp, moiKhach: r.per_pax_amount, theoLoai: dtoTheoLoai(theoLoaiCua(r)),
  tuNgay: r.valid_from_date, denNgay: r.valid_to_date, ghiChu: r.note, conHieuLuc: r.voided_at === null && hieuLuc({ validFrom: r.valid_from_date, validTo: r.valid_to_date }, homNay),
  daHuy: r.voided_at !== null, thayCho: r.replaces_id, lyDoSua: r.change_reason,
});
const dtoDk = (r: TermRow, congTyId: string | null, homNay: string): SupplyTermDto => ({
  id: r.id, phamVi: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code,
  nguoiBan: { partyId: r.seller_party_id, ten: r.seller_name ?? "Hồ sơ không còn", laCongTy: congTyId !== null && r.seller_party_id === congTyId },
  tyLeMuaBp: r.cost_rate_bp, tuNgay: r.valid_from_date, denNgay: r.valid_to_date, ghiChu: r.note, conHieuLuc: hieuLuc({ validFrom: r.valid_from_date, validTo: r.valid_to_date }, homNay),
});
/** Tên đối tượng của một dòng mức cho nhật ký: tên vai bằng tiếng Việt, "mức TA <tên mức>", hoặc "đối tác <mã hồ sơ>" (không tên riêng, không liên hệ). */
const tenDoiTuongNhatKy = (r: { target_role_code: string | null; target_party_id: string | null; target_tier_code?: string | null; tier_name?: string | null }, tenVai: ReadonlyMap<string, string>): string =>
  r.target_role_code !== null ? tenVai.get(r.target_role_code) ?? r.target_role_code
    : r.target_tier_code != null ? `chính sách ${r.tier_name ?? r.target_tier_code}` : `đối tác ${r.target_party_id}`;

/**
 * Loại đối tác được hưởng (ADR-0117): mỗi dòng của danh sách được hưởng, tên + cờ loại đối tác lấy từ parties (hàm công bố `loaiVaiChiTiet`). `dangBat` = CẢ HAI cờ cùng bật
 * (`pty_role_type.active` của parties VÀ `prc_beneficiary_role.active` của pricing) — lệch một cờ (đặt tay) thì false (Ruling 2). Chỉ mã và tên.
 */
async function docLoaiDoiTac(db: D1Database): Promise<LoaiDoiTacDto[]> {
  const [huong, loai] = await Promise.all([beneficiaryRolesAll(db), loaiVaiChiTiet(db)]);
  const theoMa = new Map(loai.map((t) => [t.code, t]));
  return huong.flatMap((h) => {
    const t = theoMa.get(h.role_type_code);
    return t ? [{ code: t.code, ten: t.ten, coSan: !t.partnerLabel, dangBat: h.active === 1 && t.dangBat }] : [];
  }).sort((a, b) => Number(b.coSan) - Number(a.coSan) || a.ten.localeCompare(b.ten, "vi") || a.code.localeCompare(b.code));
}
const LOAI_KHONG_CO = () => error(404, "not_found", "Không tìm thấy loại đối tác này.");

/**
 * Tắt / bật một loại đối tác (thân chung của hai route `/tat`, `/bat`; người gọi đã qua `can` + `holdsPartner`). Chỉ loại do người dùng thêm (cờ loại đối tác) mới đổi được: năm vai bên
 * ngoài có sẵn là vai đăng nhập, mã lạ hay vai nội bộ ⇒ 404 (Ruling 3). Câu một chỉ đổi dòng khi loại CHƯA ở trạng thái đích; câu hai (cờ danh sách được hưởng) và nhật ký đi theo
 * `changes() > 0` của câu đứng ngay trước ⇒ bên thua một lượt tranh chấp không ghi gì và nhận 409.
 */
async function doiTrangThaiLoai(db: D1Database, code: string, bat: boolean, staffId: string): Promise<Response> {
  const loai = MA_RE.test(code) ? (await loaiVaiChiTiet(db)).find((t) => t.code === code) : undefined;
  if (!loai || !loai.partnerLabel) return LOAI_KHONG_CO();
  const at = new Date().toISOString();
  const res = await chayLo(db, [
    datHoatDongLoaiDoiTacStatement(db, code, bat),
    setBeneficiaryActiveStatement(db, code, bat, at, staffId),
    auditStatement(db, { staffId, action: bat ? "prc_partner_type_on" : "prc_partner_type_off", at, detail: loai.ten }, "changes() > 0"),
  ]);
  if (res instanceof Response) return res;
  if (dongDaDong(res)) return error(409, "stale", bat ? "Loại này đang bật rồi — tải lại." : "Loại này đã tắt rồi — tải lại.");
  return json({ loai: (await docLoaiDoiTac(db)).find((x) => x.code === code)! } satisfies LoaiDoiTacResponse);
}

// ===== Mức TA dùng chung (ADR-0117 lần 2) =====
/** Khối «Hoa hồng hiện hành» của một hồ sơ (YC-0020; ADR-0138 thêm mức riêng) — dùng chung cho GET và phản hồi hai lệnh gắn / kết thúc mức riêng. Chỉ đọc. */
async function hoaHongHoSo(db: D1Database, id: string): Promise<HoaHongHoSoResponse> {
  const homNay = vnToday(new Date());
  const [vaiMo, duocHuong, gan, muc, tenMuc, tenVai, ganRieng, lichSu] = await Promise.all([
    openRolesOf(db, id), beneficiaryRoles(db), roleTiersOn(db, homNay), rulesOn(db, homNay), rateTiers(db), tenLoaiVai(db), partyTiersOf(db, id), partyTiersHistory(db, id),
  ]);
  const t = tomTatHoaHongHoSo({ partyId: id, vaiMo: vaiMo.map((r) => r.role_type_code), vaiDuocHuong: new Set(duocHuong), gan: gan.map(dongGan), ganRieng: ganRieng.map(dongGanRieng), muc: muc.map(dongMuc), ngay: homNay });
  const tenCuaMuc = new Map(tenMuc.map((m) => [m.code, m]));
  const rieng = t.mucRieng ? ganRieng.find((g) => g.tier_code === t.mucRieng!.mucCode && g.valid_from_date === t.mucRieng!.tuNgay) : undefined;
  const mRieng = rieng ? tenCuaMuc.get(rieng.tier_code) : undefined;
  return {
    homNay, laNguoiHuong: t.laNguoiHuong, xungDot: t.xungDot, dongRiengLoai: t.dongRiengLoai, dongRiengDoiTac: t.dongRiengDoiTac,
    mucRieng: rieng ? { id: rieng.id, muc: { code: rieng.tier_code, ten: mRieng?.name ?? rieng.tier_code, dangBat: mRieng?.active === 1 }, tuNgay: rieng.valid_from_date, denNgay: rieng.valid_to_date } : null,
    vai: t.vai.map((x) => {
      const m = x.mucCode ? tenCuaMuc.get(x.mucCode) : undefined;
      return { loai: { code: x.loaiCode, ten: tenVai.get(x.loaiCode) ?? x.loaiCode }, muc: m ? { code: m.code, ten: m.name, dangBat: m.active === 1 } : null, tuNgay: x.tuNgay };
    }),
    // N5: lịch sử chỉ để hiển thị — đọc bằng câu riêng (`party_tiers_history`), không trộn vào phần tra ở trên.
    ganRieng: lichSu.map((g) => {
      const m = tenCuaMuc.get(g.tier_code);
      return { id: g.id, muc: { code: g.tier_code, ten: m?.name ?? g.tier_code, dangBat: m?.active === 1 }, tuNgay: g.valid_from_date, denNgay: g.valid_to_date,
        conHieuLuc: g.voided_at === null && hieuLuc({ validFrom: g.valid_from_date, validTo: g.valid_to_date }, homNay), daHuy: g.voided_at !== null };
    }),
  } satisfies HoaHongHoSoResponse;
}
const MUC_KHONG_CO = () => error(404, "not_found", "Không tìm thấy cấp đại lý này.");
const dtoGan = (r: RoleTierRow, tenVai: ReadonlyMap<string, string>, tenMuc: ReadonlyMap<string, string>, homNay: string): GanLoaiMucDto => ({
  id: r.id, loai: { code: r.role_type_code, ten: tenVai.get(r.role_type_code) ?? r.role_type_code }, muc: { code: r.tier_code, ten: tenMuc.get(r.tier_code) ?? r.tier_code },
  tuNgay: r.valid_from_date, denNgay: r.valid_to_date, conHieuLuc: r.voided_at === null && hieuLuc({ validFrom: r.valid_from_date, validTo: r.valid_to_date }, homNay),
  daHuy: r.voided_at !== null, thayCho: r.replaces_id, lyDoSua: r.change_reason,
});
/** Mọi mức TA kèm dòng và gắn của từng mức (màn «Mức TA»). Chỉ mã, tên, số mức — không số liệu hồ sơ. Khoá tên `name_key` không đọc ra. */
async function docMucTa(db: D1Database, homNay: string): Promise<MucTaDto[]> {
  const [muc, dong, gan, tenVai] = await Promise.all([rateTiers(db), allRules(db), roleTiersAll(db), tenLoaiVai(db)]);
  const tenMuc = new Map(muc.map((m) => [m.code, m.name]));
  return muc.map((m: TierRow) => ({
    code: m.code, ten: m.name, dangBat: m.active === 1,
    dong: dong.filter((r) => r.target_tier_code === m.code).map((r) => dtoMuc(r, tenVai, homNay)),
    gan: gan.filter((g) => g.tier_code === m.code).map((g) => dtoGan(g, tenVai, tenMuc, homNay)),
  }));
}
/** Mức `code` (đã qua `can` + `holdsPartner` ở route) ⇒ DTO hiện hành, hoặc null khi mã sai dạng / không có. */
const timMuc = async (db: D1Database, code: string): Promise<TierRow | null> => (MUC_TA_RE.test(code) ? rateTierByCode(db, code) : null);
/**
 * Tắt / bật một mức TA (thân chung của `/tat`, `/bat`). Tắt chỉ chặn gắn mới và thêm dòng mới (trigger 0096 / 0097); dòng và gắn đang có VẪN áp — muốn ngừng áp thì kết thúc gắn
 * (giả định kế hoạch, N-23). Câu cập nhật chỉ đổi dòng khi mức CHƯA ở trạng thái đích; nhật ký đi theo `changes() > 0` ⇒ bên thua một lượt tranh chấp không ghi gì, nhận 409.
 */
async function doiTrangThaiMuc(db: D1Database, code: string, bat: boolean, staffId: string): Promise<Response> {
  const muc = await timMuc(db, code);
  if (!muc) return MUC_KHONG_CO();
  const at = new Date().toISOString();
  const res = await chayLo(db, [
    setRateTierActiveStatement(db, code, bat, at, staffId),
    auditStatement(db, { staffId, action: bat ? "prc_rate_tier_on" : "prc_rate_tier_off", at, detail: muc.name }, "changes() > 0"),
  ]);
  if (res instanceof Response) return res;
  if (dongDaDong(res)) return error(409, "stale", bat ? "Cấp này đang mở rồi — tải lại." : "Cấp này đã khoá rồi — tải lại.");
  return json({ muc: (await docMucTa(db, vnToday(new Date()))).find((m) => m.code === code)! } satisfies MucTaResponse);
}

export const pricingModule: AppModule = {
  name: "pricing",
  routes: [
    // Đường cố định trước đường có :id. Mọi route hỏi `can()` ở dòng đầu thân (cổng `office` chỉ lọc thô — ADR-0019). Tài khoản có quyền Đối tác (kể cả tài khoản lai, có thêm
    // quyền nội bộ) KHÔNG đọc, không ghi bảng tỷ lệ / người bán: "có quyền Đối tác là áp" — `holdsPartner` cùng một điều kiện với ô quyền ở dòng đầu mỗi route.
    route("GET", "/api/pricing/hoa-hong", "office", async ({ env, staff }) => {
      if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
      const [dong, vaiHuong, tenVai] = await Promise.all([allRules(env.DB), beneficiaryRoles(env.DB), tenLoaiVai(env.DB)]);
      const homNay = vnToday(new Date());
      return json({ homNay, dong: dong.map((r) => dtoMuc(r, tenVai, homNay)), vai: vaiHuong.map((code) => ({ code, ten: tenVai.get(code) ?? code })) } satisfies CommissionRuleListResponse);
    }),
    route("POST", "/api/pricing/hoa-hong", "office", async ({ env, request, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const kq = kiemThanMuc(await readJson(request));
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      if (v.scope === "SERVICE" && !(await getEffectiveServices(env.DB, [v.catalogCode!])).has(v.catalogCode!)) return error(400, "invalid_input", "Không có dịch vụ này trong danh mục.");
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        insertRuleStatement(env.DB, id, v, at, staff.id),
        ...(v.theoLoai ? [insertRulePaxStatement(env.DB, id, v.theoLoai, at, staff.id)] : []),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: moTaMuc({ doiTuong: tenDoiTuongNhatKy({ target_role_code: v.targetRoleCode, target_party_id: v.targetPartyId }, tenVai), ...v }) }),
      ]);
      if (res instanceof Response) return res;
      const dong = await ruleById(env.DB, id);
      return kemLocation(json({ dong: dtoMuc(dong!, tenVai, vnToday(new Date())) }, 201), "/hoa-hong");
    }),
    // «Ngừng» (ADR-0148 Q4): đặt hoặc rút ngắn ngày kết thúc; dòng đã có đơn chụp không đóng qua ngày đã chụp, không đóng lùi trước hôm qua (`kiemNgung`).
    route("POST", "/api/pricing/hoa-hong/:id/dong", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await ruleById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy dòng mức.");
      const chup = await ngayChupCua(hoiDaChup, qMuc(row));
      if (chup instanceof Response) return chup;
      const den = kiemNgung({ raw: await readJson(request), cu: dongCoNgay(row), ngayChup: chup.ngay, homNay: vnToday(new Date()) });
      if (!den.ok) return error(400, "invalid_input", den.message);
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        closeRuleStatement(env.DB, id, den.value, row.valid_to_date, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_closed", at,
          detail: `${moTaMuc({ doiTuong: tenDoiTuongNhatKy(row, tenVai), scope: row.scope, catalogCode: row.catalog_code, groupCode: row.group_code, kind: row.kind, rateBp: row.rate_bp, perPaxAmount: row.per_pax_amount, theoLoai: theoLoaiCua(row) })} · đến ${den.value}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Dòng mức vừa được đóng — tải lại.");
      return json({ dong: dtoMuc((await ruleById(env.DB, id))!, tenVai, vnToday(new Date())) });
    }),
    // «Đổi» một dòng mức đang áp dụng (đặc tả A3): ngừng dòng cũ hết ngày liền trước `tuNgay` và mở dòng mới (cùng đích, cùng phạm vi) trong MỘT lô. Thân chỉ mang phần mức + ngày + ghi chú.
    route("POST", "/api/pricing/hoa-hong/:id/doi", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await ruleById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy dòng mức.");
      const body = await readJson(request);
      const than = kiemThanDoiMuc(body);
      if (!than.ok) return error(400, "invalid_input", than.message);
      const chup = await ngayChupCua(hoiDaChup, qMuc(row));
      if (chup instanceof Response) return chup;
      const homNay = vnToday(new Date());
      const doi = kiemDoi({ cu: dongCoNgay(row), tuNgay: than.value.validFrom, homNay, ngayChup: chup.ngay });
      if (!doi.ok) return error(400, "invalid_input", doi.error);
      if (cungMuc(dongMuc(row), than.value)) return error(400, "invalid_input", "Mức mới giống hệt mức cũ.");
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const chiTiet = `đổi mức · dòng ${id} → ${moiId} · từ ${doi.tuNgay}`;
      const res = await chayLo(env.DB, [
        ...cauDoiMuc(env.DB, id, moiId, doi.denNgayCu, { targetPartyId: row.target_party_id, targetRoleCode: row.target_role_code, targetTierCode: row.target_tier_code, scope: row.scope, catalogCode: row.catalog_code, groupCode: row.group_code }, than.value, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_closed", at, detail: chiTiet }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: chiTiet }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      // Lưới dự phòng (giữ): với câu chèn VALUES + CASE, dòng cũ không đóng được thì cả lô đã lỗi NOT NULL (→ 409 ở loiBang) nên thường không tới đây; giữ để nếu câu chèn đổi dạng thì vẫn 409 chứ không ghi sai.
      if (dongDaDong(res)) return error(409, "stale", "Dòng này vừa được người khác ngừng hoặc đổi. Tải lại trang.");
      const [cu, moi] = await Promise.all([ruleById(env.DB, id), ruleById(env.DB, moiId)]);
      return json({ cu: dtoMuc(cu!, tenVai, homNay), moi: dtoMuc(moi!, tenVai, homNay) } satisfies DoiMucResponse);
    }),
    // ADR-0148 Đ1 — «Sửa» một dòng mức (Kế toán, Quản trị, Toàn quyền; không tài khoản mang quyền Đối tác). GET = xem trước đường + ngày sớm nhất cho hộp Sửa. POST thân như «Đổi»
    // (phần mức + hai ngày + ghi chú) kèm `lyDo`. Chưa đơn nào chụp ⇒ huỷ dòng cũ, thêm dòng mới (đổi được cả hai ngày); đã có đơn chụp ⇒ dòng cũ đóng hết ngày liền trước phần sửa.
    // MỘT lô: huỷ / đóng (khoá lạc quan theo ngày kết thúc đã đọc) → chèn dòng mới mang `replaces_id` + lý do → (số theo loại) → nhật ký `changes() > 0`. Nhật ký không chép lý do.
    route("GET", "/api/pricing/hoa-hong/:id/sua", "office", async ({ env, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await ruleById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy dòng mức.");
      const chup = await ngayChupCua(hoiDaChup, qMuc(row));
      return chup instanceof Response ? chup : xemTruoc(row, chup.ngay);
    }),
    route("POST", "/api/pricing/hoa-hong/:id/sua", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await ruleById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy dòng mức.");
      const body = await readJson(request);
      const than = kiemThanDoiMuc(body);
      if (!than.ok) return error(400, "invalid_input", than.message);
      const chup = await ngayChupCua(hoiDaChup, qMuc(row));
      if (chup instanceof Response) return chup;
      const homNay = vnToday(new Date());
      const giongSo = cungMuc(dongMuc(row), than.value) && than.value.note === row.note;
      const k = kiemSua({ cu: dongCoNgay(row), moi: { validFrom: than.value.validFrom, validTo: than.value.validTo }, ngayChup: chup.ngay, homNay, lyDo: lyDoCua(body), giongSo });
      if (!k.ok) return error(400, "invalid_input", k.error);
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const chiTiet = `sửa mức · dòng ${id} → ${moiId} · ${k.duong === "HUY_THAY" ? "huỷ dòng cũ" : `từ ${k.tuNgay}`}`;
      const res = await chayLo(env.DB, [
        ...cauSuaMuc(env.DB, id, row.valid_to_date, xuLyCu(k), moiId, { targetPartyId: row.target_party_id, targetRoleCode: row.target_role_code, targetTierCode: row.target_tier_code, scope: row.scope,
          catalogCode: row.catalog_code, groupCode: row.group_code }, than.value, k.lyDo, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: k.duong === "HUY_THAY" ? "prc_commission_rule_voided" : "prc_commission_rule_closed", at, detail: chiTiet }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: chiTiet }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Dòng này vừa được người khác sửa hoặc ngừng. Tải lại trang.");
      const [cu, moi] = await Promise.all([ruleById(env.DB, id), ruleById(env.DB, moiId)]);
      return json({ duong: k.duong, cu: dtoMuc(cu!, tenVai, homNay), moi: dtoMuc(moi!, tenVai, homNay) } satisfies SuaMucResponse);
    }),
    // ADR-0117 lần 1: loại đối tác là DỮ LIỆU. Thêm / tắt / bật do Kế toán, Quản trị, Toàn quyền (ô partner.commission.write); xem do ô partner.commission.view. Tên đi vào nhật ký (đã cấm
    // số điện thoại / email trong tên). Mã `LD_` + 8 chữ hoa do máy chủ sinh. Đường cố định trước đường có :code.
    route("GET", "/api/pricing/loai-doi-tac", "office", async ({ env, staff }) => {
      if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
      return json({ loai: await docLoaiDoiTac(env.DB) } satisfies LoaiDoiTacListResponse);
    }),
    route("POST", "/api/pricing/loai-doi-tac", "office", async ({ env, request, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const daCo = await loaiVaiChiTiet(env.DB);
      const kq = kiemTenLoaiDoiTac((await readJson(request))?.ten, daCo.map((x) => x.ten));
      if (!kq.ok) return error(kq.code === "loai_trung" ? 409 : 400, kq.code, kq.message);
      let code = maLoaiDoiTac(crypto.getRandomValues(new Uint8Array(8)));
      while (daCo.some((x) => x.code === code)) code = maLoaiDoiTac(crypto.getRandomValues(new Uint8Array(8)));
      const at = new Date().toISOString();
      // Thứ tự: loại vai TRƯỚC (prc_beneficiary_role.role_type_code có khoá ngoại tới pty_role_type), rồi danh sách được hưởng, rồi nhật ký.
      const res = await chayLo(env.DB, [
        themLoaiDoiTacStatement(env.DB, { code, ten: kq.value }),
        insertBeneficiaryStatement(env.DB, code, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_partner_type_added", at, detail: kq.value }),
      ]);
      if (res instanceof Response) return res;
      return kemLocation(json({ loai: { code, ten: kq.value, coSan: false, dangBat: true } } satisfies LoaiDoiTacResponse, 201), "/hoa-hong");
    }),
    route("POST", "/api/pricing/loai-doi-tac/:code/tat", "office", async ({ env, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      return doiTrangThaiLoai(env.DB, params.code!, false, staff.id);
    }),
    route("POST", "/api/pricing/loai-doi-tac/:code/bat", "office", async ({ env, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      return doiTrangThaiLoai(env.DB, params.code!, true, staff.id);
    }),
    // ADR-0117 lần 2: MỨC TA dùng chung. Tạo / tắt / bật mức, thêm dòng cho mức, gắn loại↔mức theo ngày, kết thúc gắn: Kế toán, Quản trị, Toàn quyền (ô partner.commission.write);
    // xem: ô partner.commission.view. Tài khoản giữ quyền Đối tác (kể cả lai) không đọc, không ghi (`holdsPartner`). Mỗi lệnh ghi là MỘT lô: câu ghi → nhật ký. Đóng một dòng của
    // mức đi qua route đóng dòng chung `POST /api/pricing/hoa-hong/:id/dong`. Đường cố định («gan») trước đường có :code / :id; mã mức luôn `MT_` + 8 chữ hoa nên không trùng «gan».
    route("GET", "/api/pricing/muc-ta", "office", async ({ env, staff }) => {
      if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
      const homNay = vnToday(new Date());
      const [muc, vaiHuong, tenVai, ganRieng] = await Promise.all([docMucTa(env.DB, homNay), beneficiaryRoles(env.DB), tenLoaiVai(env.DB), partyTiersCurrent(env.DB, homNay)]);
      return json({ homNay, muc, loai: vaiHuong.map((code) => ({ code, ten: tenVai.get(code) ?? code })),
        ganRieng: ganRieng.map((g) => ({ id: g.id, partyId: g.party_id, ten: g.party_name, muc: g.tier_code, tenMuc: g.tier_name, tuNgay: g.valid_from_date, denNgay: g.valid_to_date })) } satisfies MucTaListResponse);
    }),
    route("POST", "/api/pricing/muc-ta", "office", async ({ env, request, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const kq = kiemTenMucTa((await readJson(request))?.ten);
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const code = maMucTa(crypto.getRandomValues(new Uint8Array(8)));
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        insertRateTierStatement(env.DB, { code, ten: kq.value.ten, khoa: kq.value.khoa }, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_rate_tier_added", at, detail: kq.value.ten }),
      ]);
      if (res instanceof Response) return res;
      return kemLocation(json({ muc: { code, ten: kq.value.ten, dangBat: true, dong: [], gan: [] } } satisfies MucTaResponse, 201), "/hoa-hong");
    }),
    route("POST", "/api/pricing/muc-ta/gan", "office", async ({ env, request, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const kq = kiemThanGan(await readJson(request));
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      const muc = await timMuc(env.DB, v.tierCode);
      if (!muc) return MUC_KHONG_CO();
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        insertRoleTierStatement(env.DB, id, v, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_role_tier_set", at,
          detail: `${tenVai.get(v.roleTypeCode) ?? v.roleTypeCode} → ${muc.name} · từ ${v.validFrom}${v.validTo === null ? "" : ` đến ${v.validTo}`}` }),
      ]);
      if (res instanceof Response) return res;
      const homNay = vnToday(new Date());
      const [gan, dongRieng] = await Promise.all([roleTierById(env.DB, id), roleRulesForTierLink(env.DB, v.roleTypeCode, v.validFrom, v.validTo)]);
      const than: GanLoaiMucResponse = { gan: dtoGan(gan!, tenVai, new Map([[muc.code, muc.name]]), homNay), dongRieng: dongRieng.map((r) => dtoMuc(r, tenVai, homNay)) };
      return kemLocation(json(than, 201), "/hoa-hong");
    }),
    route("POST", "/api/pricing/muc-ta/gan/:id/ket-thuc", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await roleTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy lần áp dụng cấp đại lý này cho loại.");
      const chup = await ngayChupCua(hoiDaChup, qGanLoai(row));
      if (chup instanceof Response) return chup;
      const den = kiemNgung({ raw: await readJson(request), cu: dongCoNgay(row), ngayChup: chup.ngay, homNay: vnToday(new Date()) });
      if (!den.ok) return error(400, "invalid_input", den.message);
      const [tenVai, muc] = await Promise.all([tenLoaiVai(env.DB), rateTierByCode(env.DB, row.tier_code)]);
      const tenMuc = new Map([[row.tier_code, muc?.name ?? row.tier_code]]);
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        closeRoleTierStatement(env.DB, id, den.value, row.valid_to_date, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_role_tier_closed", at,
          detail: `${tenVai.get(row.role_type_code) ?? row.role_type_code} → ${tenMuc.get(row.tier_code)} · đến ${den.value}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Lần áp dụng cấp đại lý này vừa được ngừng — tải lại.");
      return json({ gan: dtoGan((await roleTierById(env.DB, id))!, tenVai, tenMuc, vnToday(new Date())) });
    }),
    // «Đổi chính sách» của một loại (đặc tả A3): ngừng gắn cũ hết ngày liền trước `tuNgay` và gắn loại đó vào mức mới từ `tuNgay` trong MỘT lô (khuôn «Đổi mức»).
    route("POST", "/api/pricing/muc-ta/gan/:id/doi", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await roleTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy lần áp dụng cấp đại lý này cho loại.");
      const than = kiemThanDoiChinhSach(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const chup = await ngayChupCua(hoiDaChup, qGanLoai(row));
      if (chup instanceof Response) return chup;
      const homNay = vnToday(new Date());
      const doi = kiemDoi({ cu: dongCoNgay(row), tuNgay: than.value.tuNgay, homNay, ngayChup: chup.ngay });
      if (!doi.ok) return error(400, "invalid_input", doi.error);
      if (than.value.tierCode === row.tier_code) return error(400, "invalid_input", "Cấp mới giống hệt cấp đang áp dụng.");
      const [tenVai, mucCu, mucMoi] = await Promise.all([tenLoaiVai(env.DB), rateTierByCode(env.DB, row.tier_code), timMuc(env.DB, than.value.tierCode)]);
      if (!mucMoi) return MUC_KHONG_CO();
      const tenLoai = tenVai.get(row.role_type_code) ?? row.role_type_code;
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        ...cauDoiChinhSach(env.DB, id, moiId, doi.denNgayCu, row.role_type_code, mucMoi.code, doi.tuNgay, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_role_tier_closed", at, detail: `${tenLoai} → ${mucCu?.name ?? row.tier_code} · đến ${doi.denNgayCu}` }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_role_tier_set", at, detail: `${tenLoai} → ${mucMoi.name} · từ ${doi.tuNgay}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      // Lưới dự phòng (giữ): câu chèn VALUES + CASE làm cả lô lỗi NOT NULL (→ 409 ở loiBang) khi gắn cũ không đóng được nên thường không tới đây.
      if (dongDaDong(res)) return error(409, "stale", "Lần áp dụng cấp đại lý này vừa được người khác ngừng hoặc đổi. Tải lại trang.");
      const [moi, dongRieng] = await Promise.all([roleTierById(env.DB, moiId), roleRulesForTierLink(env.DB, row.role_type_code, doi.tuNgay, null)]);
      return json({ gan: dtoGan(moi!, tenVai, new Map([[mucMoi.code, mucMoi.name]]), homNay), dongRieng: dongRieng.map((r) => dtoMuc(r, tenVai, homNay)) } satisfies GanLoaiMucResponse);
    }),
    // ADR-0148 Đ1 — «Sửa» một lần áp dụng chính sách cho loại: thân { muc, tuNgay, denNgay?, lyDo } (chính sách và hai ngày đổi được; loại giữ). Cùng luật, cùng khuôn lô với Sửa dòng mức.
    // «Đã chụp» của gắn (Q1) = có bản chụp trỏ dòng của chính sách đó, ngày chụp trong khoảng gắn — thừa chứ không thiếu.
    route("GET", "/api/pricing/muc-ta/gan/:id/sua", "office", async ({ env, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await roleTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy lần áp dụng cấp đại lý này cho loại.");
      const chup = await ngayChupCua(hoiDaChup, qGanLoai(row));
      return chup instanceof Response ? chup : xemTruoc(row, chup.ngay);
    }),
    route("POST", "/api/pricing/muc-ta/gan/:id/sua", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await roleTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy lần áp dụng cấp đại lý này cho loại.");
      const body = await readJson(request);
      const than = kiemThanSuaGan(body);
      if (!than.ok) return error(400, "invalid_input", than.message);
      const mucMoi = await timMuc(env.DB, than.value.tierCode);
      if (!mucMoi) return MUC_KHONG_CO();
      const chup = await ngayChupCua(hoiDaChup, qGanLoai(row));
      if (chup instanceof Response) return chup;
      const homNay = vnToday(new Date());
      const k = kiemSua({ cu: dongCoNgay(row), moi: { validFrom: than.value.validFrom, validTo: than.value.validTo }, ngayChup: chup.ngay, homNay, lyDo: lyDoCua(body), giongSo: than.value.tierCode === row.tier_code });
      if (!k.ok) return error(400, "invalid_input", k.error);
      const [tenVai, mucCu] = await Promise.all([tenLoaiVai(env.DB), rateTierByCode(env.DB, row.tier_code)]);
      const tenLoai = tenVai.get(row.role_type_code) ?? row.role_type_code;
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        ...cauSuaGanLoai(env.DB, id, row.valid_to_date, xuLyCu(k), moiId, row.role_type_code, than.value, k.lyDo, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: k.duong === "HUY_THAY" ? "prc_role_tier_voided" : "prc_role_tier_closed", at,
          detail: `${tenLoai} → ${mucCu?.name ?? row.tier_code} · ${k.duong === "HUY_THAY" ? "huỷ, thay bằng dòng sửa" : `đến ${k.denNgayCu}`}` }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_role_tier_set", at,
          detail: `${tenLoai} → ${mucMoi.name} · từ ${than.value.validFrom}${than.value.validTo === null ? "" : ` đến ${than.value.validTo}`} · sửa` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Lần áp dụng cấp đại lý này vừa được người khác sửa hoặc ngừng. Tải lại trang.");
      const tenMuc = new Map([[row.tier_code, mucCu?.name ?? row.tier_code], [mucMoi.code, mucMoi.name]]);
      const [cu, moi, dongRieng] = await Promise.all([roleTierById(env.DB, id), roleTierById(env.DB, moiId), roleRulesForTierLink(env.DB, row.role_type_code, than.value.validFrom, than.value.validTo)]);
      return json({ duong: k.duong, cu: dtoGan(cu!, tenVai, tenMuc, homNay), moi: dtoGan(moi!, tenVai, tenMuc, homNay), dongRieng: dongRieng.map((r) => dtoMuc(r, tenVai, homNay)) } satisfies SuaGanLoaiResponse);
    }),
    route("POST", "/api/pricing/muc-ta/:code/tat", "office", async ({ env, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      return doiTrangThaiMuc(env.DB, params.code!, false, staff.id);
    }),
    route("POST", "/api/pricing/muc-ta/:code/bat", "office", async ({ env, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      return doiTrangThaiMuc(env.DB, params.code!, true, staff.id);
    }),
    // Thêm MỘT DÒNG cho mức (đích = mức). Mức đã tắt ⇒ trigger chặn (409 muc_tat). Đóng dòng: route đóng dòng chung.
    route("POST", "/api/pricing/muc-ta/:code/dong", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const muc = await timMuc(env.DB, params.code!);
      if (!muc) return MUC_KHONG_CO();
      const kq = kiemThanDongMucTa(await readJson(request), muc.code);
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      if (v.scope === "SERVICE" && !(await getEffectiveServices(env.DB, [v.catalogCode!])).has(v.catalogCode!)) return error(400, "invalid_input", "Không có dịch vụ này trong danh mục.");
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        insertRuleStatement(env.DB, id, v, at, staff.id),
        ...(v.theoLoai ? [insertRulePaxStatement(env.DB, id, v.theoLoai, at, staff.id)] : []),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: moTaMuc({ doiTuong: `chính sách ${muc.name}`, ...v }) }),
      ]);
      if (res instanceof Response) return res;
      return kemLocation(json({ dong: dtoMuc((await ruleById(env.DB, id))!, await tenLoaiVai(env.DB), vnToday(new Date())) }, 201), "/hoa-hong");
    }),
    // Góp ý YC-0020: khối «Hoa hồng hiện hành» trên hồ sơ đại lý — loại hồ sơ đang mang, mức TA mỗi loại gắn hôm nay, có dòng riêng đè lên không, có xung đột mức không. Chỉ đọc, cùng quyền «Thử tra».
    route("GET", "/api/pricing/ho-so/:id/hoa-hong", "office", async ({ env, params, staff }) => {
      if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      if (!PARTY_RE.test(id)) return error(400, "invalid_input", "Mã hồ sơ không hợp lệ.");
      return json(await hoaHongHoSo(env.DB, id));
    }),
    // ADR-0138: gắn mức TA RIÊNG cho một hồ sơ đối tác (Kế toán, Quản trị, Toàn quyền — `partner.commission.write`; giữ quyền Đối tác thì không). CSDL chặn: hồ sơ không mang
    // loại được hưởng, mức tắt, chồng ngày. Một lô: câu ghi → nhật ký (chỉ tên mức + ngày). Trả lại khối «Hoa hồng hiện hành» của hồ sơ.
    route("POST", "/api/pricing/ho-so/:id/muc-rieng", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const partyId = params.id!;
      if (!PARTY_RE.test(partyId)) return error(400, "invalid_input", "Mã hồ sơ không hợp lệ.");
      const kq = kiemThanGanRieng(await readJson(request));
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      const muc = await timMuc(env.DB, v.tierCode);
      if (!muc) return MUC_KHONG_CO();
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        insertPartyTierStatement(env.DB, crypto.randomUUID(), { partyId, ...v }, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_party_tier_set", at, detail: `mức riêng ${muc.name} · từ ${v.validFrom}${v.validTo === null ? "" : ` đến ${v.validTo}`}` }),
      ]);
      if (res instanceof Response) return res;
      return kemLocation(json(await hoaHongHoSo(env.DB, partyId), 201), `/parties?id=${partyId}`);
    }),
    route("POST", "/api/pricing/muc-rieng/:id/ket-thuc", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await partyTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy cấp riêng này.");
      const chup = await ngayChupCua(hoiDaChup, qGanRieng(row));
      if (chup instanceof Response) return chup;
      const den = kiemNgung({ raw: await readJson(request), cu: dongCoNgay(row), ngayChup: chup.ngay, homNay: vnToday(new Date()) });
      if (!den.ok) return error(400, "invalid_input", den.message);
      const muc = await rateTierByCode(env.DB, row.tier_code);
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        closePartyTierStatement(env.DB, id, den.value, row.valid_to_date, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_party_tier_closed", at, detail: `mức riêng ${muc?.name ?? row.tier_code} · đến ${den.value}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Cấp riêng này vừa được ngừng — tải lại.");
      return json(await hoaHongHoSo(env.DB, row.party_id));
    }),
    // ADR-0148 Đ1 — «Sửa» chính sách riêng của một đối tác: thân { muc, tuNgay, denNgay?, lyDo }; hồ sơ giữ. Cùng luật với Sửa dòng mức; «đã chụp» thêm điều kiện người hưởng = hồ sơ.
    // Trả lại khối «Hoa hồng hiện hành» của hồ sơ (khuôn route gắn / kết thúc mức riêng).
    route("GET", "/api/pricing/muc-rieng/:id/sua", "office", async ({ env, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await partyTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy cấp riêng này.");
      const chup = await ngayChupCua(hoiDaChup, qGanRieng(row));
      return chup instanceof Response ? chup : xemTruoc(row, chup.ngay);
    }),
    route("POST", "/api/pricing/muc-rieng/:id/sua", "office", async ({ env, request, params, staff, hoiDaChup }) => {
      if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await partyTierById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy cấp riêng này.");
      const body = await readJson(request);
      const than = kiemThanSuaGan(body);
      if (!than.ok) return error(400, "invalid_input", than.message);
      const mucMoi = await timMuc(env.DB, than.value.tierCode);
      if (!mucMoi) return MUC_KHONG_CO();
      const chup = await ngayChupCua(hoiDaChup, qGanRieng(row));
      if (chup instanceof Response) return chup;
      const k = kiemSua({ cu: dongCoNgay(row), moi: { validFrom: than.value.validFrom, validTo: than.value.validTo }, ngayChup: chup.ngay, homNay: vnToday(new Date()), lyDo: lyDoCua(body),
        giongSo: than.value.tierCode === row.tier_code });
      if (!k.ok) return error(400, "invalid_input", k.error);
      const mucCu = await rateTierByCode(env.DB, row.tier_code);
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        ...cauSuaGanRieng(env.DB, id, row.valid_to_date, xuLyCu(k), crypto.randomUUID(), row.party_id, than.value, k.lyDo, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: k.duong === "HUY_THAY" ? "prc_party_tier_voided" : "prc_party_tier_closed", at,
          detail: `mức riêng ${mucCu?.name ?? row.tier_code} · ${k.duong === "HUY_THAY" ? "huỷ, thay bằng dòng sửa" : `đến ${k.denNgayCu}`}` }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_party_tier_set", at,
          detail: `mức riêng ${mucMoi.name} · từ ${than.value.validFrom}${than.value.validTo === null ? "" : ` đến ${than.value.validTo}`} · sửa` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Cấp riêng này vừa được người khác sửa hoặc ngừng. Tải lại trang.");
      return json(await hoaHongHoSo(env.DB, row.party_id));
    }),
    // "Thử tra" cho văn phòng: một đối tác + một dịch vụ + một ngày ⇒ mức nào thắng (cùng hàm `chonMuc` với lúc Xác nhận đơn, cùng `gan` của `docBangChoChup`). Chỉ đọc.
    route("GET", "/api/pricing/thu-tra", "office", async ({ env, url, staff }) => {
      if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
      const doiTac = url.searchParams.get("doiTac") ?? "";
      const loai = url.searchParams.get("loai") ?? "";
      const dichVu = url.searchParams.get("dichVu") ?? "";
      const ngay = url.searchParams.get("ngay") || vnToday(new Date());
      // Đúng MỘT trong hai: doiTac (hồ sơ) hoặc loai (mã loại đối tác).
      if ((doiTac === "") === (loai === "") || (doiTac !== "" && !PARTY_RE.test(doiTac)) || (loai !== "" && !MA_RE.test(loai)) || !MA_RE.test(dichVu) || !laNgay(ngay)) {
        return error(400, "invalid_input", "Chọn một đối tác hoặc một loại đối tác, dịch vụ và ngày hợp lệ.");
      }
      let theoLoai: { code: string; ten: string } | undefined;
      if (loai !== "") {
        const l = (await docLoaiDoiTac(env.DB)).find((x) => x.code === loai);
        if (!l || !l.dangBat) return error(400, "invalid_input", "Loại đối tác này không có trong danh sách được hưởng hoa hồng hoặc đã tắt.");
        theoLoai = { code: l.code, ten: l.ten };
      }
      const [bang, tenVai] = await Promise.all([docBangChoChup(env.DB, { bookerPartyId: theoLoai ? null : doiTac, catalogCodes: [dichVu], ngay }), tenLoaiVai(env.DB)]);
      // Tra theo loại: người hưởng dựng sẵn, chuỗi rỗng không khớp hồ sơ nào ⇒ bậc 1–3 và 10–12 không bao giờ khớp; ganRieng bỏ trống. Cùng MỘT chonMuc.
      const nh: NguoiHuong = theoLoai ? { loai: "HUONG", partyId: "", vai: [theoLoai.code] } : bang.nguoiHuong;
      const nguoiHuong = theoLoai ? { loai: "HUONG" as const, vai: [theoLoai.code] } : { loai: nh.loai, vai: nh.loai === "HUONG" ? nh.vai.map((c) => tenVai.get(c) ?? c) : [] };
      const them = theoLoai ? { theoLoai } : {};
      const kq = chonMuc({ nguoiHuong: nh, ngay, catalogCode: dichVu, groupCode: bang.nhom.get(dichVu) ?? null, dong: bang.muc, gan: bang.gan, ganRieng: theoLoai ? [] : bang.ganRieng });
      if (kq.trangThai === "NONE") return json({ ngay, nguoiHuong, ...them, ketQua: { trangThai: "NONE" } } satisfies ThuTraResponse);
      if (kq.trangThai === "MISSING") return json({ ngay, nguoiHuong, ...them, ketQua: { trangThai: "MISSING", lyDo: NHAN_LY_DO_THIEU[kq.lyDo] } } satisfies ThuTraResponse);
      const dong = await ruleById(env.DB, kq.dong.id);
      if (!dong) return error(409, "stale", "Bảng mức vừa đổi — thử lại.");
      return json({ ngay, nguoiHuong, ...them, ketQua: { trangThai: "SET", bac: kq.bac, muc: dtoMuc(dong, tenVai, ngay) } } satisfies ThuTraResponse);
    }),
    route("GET", "/api/pricing/cung-ung", "office", async ({ env, staff }) => {
      if (!can(staff, "supply.terms.view") || holdsPartner(staff)) return FORBIDDEN();
      const [dong, ncc, cty] = await Promise.all([allTerms(env.DB), suppliers(env.DB), ownerCompany(env.DB)]);
      const homNay = vnToday(new Date());
      return json({
        homNay, dong: dong.map((r) => dtoDk(r, cty?.partyId ?? null, homNay)), nhaCungCap: ncc.map((r) => ({ partyId: r.id, ten: r.display_name })),
        congTyChu: cty ? { partyId: cty.partyId, ten: cty.displayName } : null,
      } satisfies SupplyTermListResponse);
    }),
    route("POST", "/api/pricing/cung-ung", "office", async ({ env, request, staff }) => {
      if (!can(staff, "supply.terms.write") || holdsPartner(staff)) return FORBIDDEN();
      const kq = kiemThanDieuKhoan(await readJson(request));
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      const cty = await ownerCompany(env.DB);
      if (!cty) return error(503, "owner_company_missing", "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống.");
      const supplierPartyId = v.sellerPartyId === cty.partyId ? null : v.sellerPartyId;
      // Trigger chỉ kiểm "có nhà cung cấp ⇔ người bán không phải công ty", còn "có nhà cung cấp ⇔ có tỷ lệ" là ràng buộc CHECK của bảng (lỗi không có mã) ⇒ kiểm trước ở đây.
      if ((supplierPartyId === null) !== (v.costRateBp === null)) return error(400, "invalid_input", CAU_TY_LE_MUA_LAI);
      if (v.scope === "SERVICE" && !(await getEffectiveServices(env.DB, [v.catalogCode!])).has(v.catalogCode!)) return error(400, "invalid_input", "Không có dịch vụ này trong danh mục.");
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const phamVi = v.scope === "ALL" ? "mọi dịch vụ" : v.scope === "GROUP" ? `nhóm ${v.groupCode}` : `dịch vụ ${v.catalogCode}`;
      const res = await chayLo(env.DB, [
        insertTermStatement(env.DB, id, { ...v, supplierPartyId }, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_supply_term_added", at, detail: `${phamVi} · người bán ${supplierPartyId === null ? "Tour Đảo" : `nhà cung cấp ${supplierPartyId}`}` }),
      ]);
      if (res instanceof Response) return res;
      return kemLocation(json({ dong: dtoDk((await termById(env.DB, id))!, cty.partyId, vnToday(new Date())) }, 201), "/nguoi-ban");
    }),
    route("POST", "/api/pricing/cung-ung/:id/dong", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "supply.terms.write") || holdsPartner(staff)) return FORBIDDEN();
      const id = params.id!;
      // Mã dòng gieo sẵn (`prc-st-goc-all`) không phải UUID ⇒ chỉ kiểm dạng chữ-số-gạch, rồi tra.
      const row = PARTY_RE.test(id) ? await termById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy điều khoản.");
      const den = kiemNgayDong(await readJson(request), row.valid_from_date);
      if (!den.ok) return error(400, "invalid_input", den.message);
      const cty = await ownerCompany(env.DB);
      const at = new Date().toISOString();
      const phamVi = row.scope === "ALL" ? "mọi dịch vụ" : row.scope === "GROUP" ? `nhóm ${row.group_code}` : `dịch vụ ${row.catalog_code}`;
      const res = await chayLo(env.DB, [
        closeTermStatement(env.DB, id, den.value, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_supply_term_closed", at, detail: `${phamVi} · đến ${den.value}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Điều khoản vừa được đóng — tải lại.");
      return json({ dong: dtoDk((await termById(env.DB, id))!, cty?.partyId ?? null, vnToday(new Date())) });
    }),
    // Tìm người hưởng theo tên cho form lập đơn (bên đặt là công ty lữ hành…) và trang Hoa hồng: người LẬP ĐƠN hoặc người ĐẶT MỨC (Kế toán), không phải tài khoản Đối tác (ADR-0141, cổng = `coTheTimDoiTac`). Chỉ id, tên, loại hồ sơ — không liên hệ.
    route("GET", "/api/pricing/nguoi-huong", "orders", async ({ env, url, staff }) => {
      // Hai vế cố ý trùng: `can(` trực tiếp để hàng rào route-write-guard (không thêm tên vào GUARDS) nhận ra cổng; `coTheTimDoiTac` để máy chủ và trang dùng chung một hàm (ADR-0141 Đ1).
      if (!(can(staff, "order.create") || can(staff, "partner.commission.write")) || !coTheTimDoiTac(staff)) return FORBIDDEN();
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
      // Câu SQL tự bọc '%' || ?1 || '%': đưa vào phần giữa của mauLikeChua (≤ 48 byte) để cả mẫu ≤ 50 byte (D1 từ chối quá giới hạn).
      const rows = await findBeneficiaries(env.DB, mauLikeChua(q).slice(1, -1));
      return json({ ketQua: rows.map((r) => ({ partyId: r.id, ten: r.display_name, loai: r.party_kind })) } satisfies NguoiHuongTimResponse);
    }),
  ],
};
