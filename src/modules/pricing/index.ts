// Module pricing — bảng mức hoa hồng, điều khoản người bán (ADR-0077, ADR-0078 B1; đặc tả 2026-10-08 sổ đại lý đợt 1). Route: /api/pricing/*.
// Hàm công bố cho orders: docBangChoChup (đọc mọi thứ để chụp lúc Xác nhận / đổi bên đặt), laNguoiHuong (bên đặt tổ chức có được gắn vào đơn không).
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { ownerCompany, tenLoaiVai } from "../parties";
import type { CommissionRuleDto, CommissionRuleListResponse, NguoiHuongTimResponse, SupplyTermDto, SupplyTermListResponse, ThuTraResponse } from "../../shared/contracts";
import { error, escapeLike, json, kemLocation, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { allRules, allTerms, beneficiaryRoles, closeRuleStatement, closeTermStatement, findBeneficiaries, groupsOf, insertRuleStatement, insertTermStatement, isBeneficiary,
  openRolesOf, ruleById, rulesOn, suppliers, termById, termsOn, type RuleRow, type TermRow } from "./repository";
import { MA_RE, PARTY_RE, chonMuc, hieuLuc, kiemNgayDong, kiemThanDieuKhoan, kiemThanMuc, laNgay, moTaMuc, nguoiHuongCua, type DongDieuKhoan, type DongMuc, type LyDoThieu,
  type NguoiHuong } from "./rules";

export { chupDon, soKhachTinhHoaHong, tinhDongDoiTac, type BanChup, type DongPhanDoiTac, type KieuMuc, type LyDoThieu, type NguoiHuong } from "./rules";

const dongMuc = (r: RuleRow): DongMuc => ({ id: r.id, targetPartyId: r.target_party_id, targetRoleCode: r.target_role_code, scope: r.scope, catalogCode: r.catalog_code,
  groupCode: r.group_code, kind: r.kind, rateBp: r.rate_bp, perPaxAmount: r.per_pax_amount, validFrom: r.valid_from_date, validTo: r.valid_to_date });
const dongDk = (r: TermRow): DongDieuKhoan => ({ id: r.id, scope: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, sellerPartyId: r.seller_party_id,
  supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp, validFrom: r.valid_from_date, validTo: r.valid_to_date });

export interface DuLieuChup { nguoiHuong: NguoiHuong; muc: DongMuc[]; dieuKhoan: DongDieuKhoan[]; nhom: ReadonlyMap<string, string | null> }
/** Đọc MỘT lần mọi thứ để chụp một đơn ở `ngay` (đặc tả §5): vai của bên đặt, mức và điều khoản hiệu lực ở `ngay`, nhóm hiện hành của các mã. */
export async function docBangChoChup(db: D1Database, v: { bookerPartyId: string | null; catalogCodes: readonly string[]; ngay: string }): Promise<DuLieuChup> {
  const [vai, duocHuong, cty, muc, dk, nhom] = await Promise.all([
    v.bookerPartyId ? openRolesOf(db, v.bookerPartyId) : Promise.resolve([]), beneficiaryRoles(db), ownerCompany(db), rulesOn(db, v.ngay), termsOn(db, v.ngay), groupsOf(db, v.catalogCodes),
  ]);
  const nguoiHuong = nguoiHuongCua({ bookerPartyId: v.bookerPartyId, vaiMo: vai.map((r) => ({ roleTypeCode: r.role_type_code, roleGroup: r.role_group })), vaiDuocHuong: new Set(duocHuong), congTyChuId: cty?.partyId ?? null });
  return { nguoiHuong, muc: muc.map(dongMuc), dieuKhoan: dk.map(dongDk), nhom };
}
export const laNguoiHuong = (db: D1Database, partyId: string): Promise<boolean> => isBeneficiary(db, partyId);

// Bảng tạm: năm câu lý do thiếu mức bằng tiếng Việt, đúng chữ của NHAN_LY_DO_THIEU ở kế hoạch Task 5. Task 5 chuyển sang dùng src/shared/so-dai-ly-nhan.ts và XOÁ bảng này.
const NHAN_LY_DO_TAM: Readonly<Record<LyDoThieu, string>> = {
  NO_RULE: "Chưa có mức cho dịch vụ này",
  RULE_CONFLICT: "Hai mức khác nhau cùng áp — Kế toán chọn một",
  MANUAL_LINE: "Dòng nhập tay — Kế toán ghi mức",
  BOOKER_NOT_BENEFICIARY: "Bên đặt không thuộc loại được hưởng hoa hồng",
  NOT_CAPTURED: "Đơn xác nhận trước khi có bảng mức",
};

/** Cùng câu cho trigger `prc_supplier_mismatch` và cho lời kiểm trước ở route (ràng buộc CHECK của bảng không có tiền tố mã nên không dịch được từ lỗi). */
const CAU_TY_LE_MUA_LAI = "Tour Đảo bán thì không ghi tỷ lệ mua lại; nhà cung cấp bán thì phải ghi.";
/** Lỗi trigger của prc_* → câu tiếng Việt; không khớp → null (ném lại). */
function loiBang(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bprc_overlap:/.test(m)) return error(409, "prc_overlap", "Đã có mức / điều khoản cùng đối tượng, cùng phạm vi trong khoảng ngày này — đóng dòng cũ trước.");
  if (/\bprc_target_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Hồ sơ này không mang vai được hưởng hoa hồng.");
  if (/\bprc_role_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Loại đối tác này không nằm trong danh sách được hưởng hoa hồng.");
  if (/\bprc_seller_not_supplier:/.test(m)) return error(400, "invalid_input", "Người bán phải là Tour Đảo hoặc hồ sơ mang vai Nhà cung cấp.");
  if (/\bprc_supplier_mismatch:/.test(m)) return error(400, "invalid_input", CAU_TY_LE_MUA_LAI);
  if (/\bprc_all_owner_only:/.test(m)) return error(400, "invalid_input", "Dòng \"mọi dịch vụ\" chỉ dành cho Tour Đảo.");
  if (/\bprc_transfer_no_supplier:/.test(m)) return error(409, "prc_transfer_no_supplier", "Dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (để khỏi tính tiền xe hai lần).");
  if (/\bprc_append_only:/.test(m)) return error(409, "stale", "Dòng này vừa được người khác đóng — tải lại.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Nhóm dịch vụ hoặc hồ sơ không có.");
  return null;
}
async function chayLo(db: D1Database, lo: D1PreparedStatement[]): Promise<D1Result[] | Response> {
  try { return await db.batch(lo); } catch (e) { const r = loiBang(e); if (r) return r; throw e; }
}
const FORBIDDEN = () => error(403, "forbidden", "Bạn không có quyền với bảng mức này.");
const dongDaDong = (res: D1Result[]): boolean => (res[0]?.meta.changes ?? 0) === 0;

const dtoMuc = (r: RuleRow, tenVai: ReadonlyMap<string, string>, homNay: string): CommissionRuleDto => ({
  id: r.id,
  doiTuong: r.target_role_code !== null
    ? { loai: "VAI", code: r.target_role_code, ten: tenVai.get(r.target_role_code) ?? r.target_role_code }
    : { loai: "DOI_TAC", partyId: r.target_party_id ?? "", ten: r.target_name ?? "Hồ sơ không còn" },
  phamVi: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, kieu: r.kind, tyLeBp: r.rate_bp, moiKhach: r.per_pax_amount,
  tuNgay: r.valid_from_date, denNgay: r.valid_to_date, ghiChu: r.note, conHieuLuc: hieuLuc({ validFrom: r.valid_from_date, validTo: r.valid_to_date }, homNay),
});
const dtoDk = (r: TermRow, congTyId: string | null, homNay: string): SupplyTermDto => ({
  id: r.id, phamVi: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code,
  nguoiBan: { partyId: r.seller_party_id, ten: r.seller_name ?? "Hồ sơ không còn", laCongTy: congTyId !== null && r.seller_party_id === congTyId },
  tyLeMuaBp: r.cost_rate_bp, tuNgay: r.valid_from_date, denNgay: r.valid_to_date, ghiChu: r.note, conHieuLuc: hieuLuc({ validFrom: r.valid_from_date, validTo: r.valid_to_date }, homNay),
});
/** Tên đối tượng của một dòng mức cho nhật ký: tên vai bằng tiếng Việt, hoặc "đối tác <mã hồ sơ>" (không tên riêng, không liên hệ). */
const tenDoiTuongNhatKy = (r: { target_role_code: string | null; target_party_id: string | null }, tenVai: ReadonlyMap<string, string>): string =>
  r.target_role_code !== null ? tenVai.get(r.target_role_code) ?? r.target_role_code : `đối tác ${r.target_party_id}`;

export const pricingModule: AppModule = {
  name: "pricing",
  routes: [
    // Đường cố định trước đường có :id. Mọi route hỏi `can()` ở dòng đầu thân (cổng `office` chỉ lọc thô — ADR-0019).
    route("GET", "/api/pricing/hoa-hong", "office", async ({ env, staff }) => {
      if (!can(staff, "partner.commission.view")) return FORBIDDEN();
      const [dong, vaiHuong, tenVai] = await Promise.all([allRules(env.DB), beneficiaryRoles(env.DB), tenLoaiVai(env.DB)]);
      const homNay = vnToday(new Date());
      return json({ homNay, dong: dong.map((r) => dtoMuc(r, tenVai, homNay)), vai: vaiHuong.map((code) => ({ code, ten: tenVai.get(code) ?? code })) } satisfies CommissionRuleListResponse);
    }),
    route("POST", "/api/pricing/hoa-hong", "office", async ({ env, request, staff }) => {
      if (!can(staff, "partner.commission.write")) return FORBIDDEN();
      const kq = kiemThanMuc(await readJson(request));
      if (!kq.ok) return error(400, "invalid_input", kq.message);
      const v = kq.value;
      if (v.scope === "SERVICE" && !(await getEffectiveServices(env.DB, [v.catalogCode!])).has(v.catalogCode!)) return error(400, "invalid_input", "Không có dịch vụ này trong danh mục.");
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const res = await chayLo(env.DB, [
        insertRuleStatement(env.DB, id, v, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: moTaMuc({ doiTuong: tenDoiTuongNhatKy({ target_role_code: v.targetRoleCode, target_party_id: v.targetPartyId }, tenVai), ...v }) }),
      ]);
      if (res instanceof Response) return res;
      const dong = await ruleById(env.DB, id);
      return kemLocation(json({ dong: dtoMuc(dong!, tenVai, vnToday(new Date())) }, 201), "/hoa-hong");
    }),
    route("POST", "/api/pricing/hoa-hong/:id/dong", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "partner.commission.write")) return FORBIDDEN();
      const id = params.id!;
      const row = PARTY_RE.test(id) ? await ruleById(env.DB, id) : null;
      if (!row) return error(404, "not_found", "Không tìm thấy dòng mức.");
      const den = kiemNgayDong(await readJson(request), row.valid_from_date);
      if (!den.ok) return error(400, "invalid_input", den.message);
      const tenVai = await tenLoaiVai(env.DB);
      const at = new Date().toISOString();
      const res = await chayLo(env.DB, [
        closeRuleStatement(env.DB, id, den.value, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_closed", at,
          detail: `${moTaMuc({ doiTuong: tenDoiTuongNhatKy(row, tenVai), scope: row.scope, catalogCode: row.catalog_code, groupCode: row.group_code, kind: row.kind, rateBp: row.rate_bp, perPaxAmount: row.per_pax_amount })} · đến ${den.value}` }, "changes() > 0"),
      ]);
      if (res instanceof Response) return res;
      if (dongDaDong(res)) return error(409, "stale", "Dòng mức vừa được đóng — tải lại.");
      return json({ dong: dtoMuc((await ruleById(env.DB, id))!, tenVai, vnToday(new Date())) });
    }),
    // "Thử tra" cho văn phòng: một đối tác + một dịch vụ + một ngày ⇒ mức nào thắng (cùng hàm `chonMuc` với lúc Xác nhận đơn). Chỉ đọc.
    route("GET", "/api/pricing/thu-tra", "office", async ({ env, url, staff }) => {
      if (!can(staff, "partner.commission.view")) return FORBIDDEN();
      const doiTac = url.searchParams.get("doiTac") ?? "";
      const dichVu = url.searchParams.get("dichVu") ?? "";
      const ngay = url.searchParams.get("ngay") || vnToday(new Date());
      if (!PARTY_RE.test(doiTac) || !MA_RE.test(dichVu) || !laNgay(ngay)) return error(400, "invalid_input", "Chọn đối tác, dịch vụ và ngày hợp lệ.");
      const [bang, tenVai] = await Promise.all([docBangChoChup(env.DB, { bookerPartyId: doiTac, catalogCodes: [dichVu], ngay }), tenLoaiVai(env.DB)]);
      const nh = bang.nguoiHuong;
      const nguoiHuong = { loai: nh.loai, vai: nh.loai === "HUONG" ? nh.vai.map((c) => tenVai.get(c) ?? c) : [] };
      const kq = chonMuc({ nguoiHuong: nh, ngay, catalogCode: dichVu, groupCode: bang.nhom.get(dichVu) ?? null, dong: bang.muc });
      if (kq.trangThai === "NONE") return json({ ngay, nguoiHuong, ketQua: { trangThai: "NONE" } } satisfies ThuTraResponse);
      if (kq.trangThai === "MISSING") return json({ ngay, nguoiHuong, ketQua: { trangThai: "MISSING", lyDo: NHAN_LY_DO_TAM[kq.lyDo] } } satisfies ThuTraResponse);
      const dong = await ruleById(env.DB, kq.dong.id);
      if (!dong) return error(409, "stale", "Bảng mức vừa đổi — thử lại.");
      return json({ ngay, nguoiHuong, ketQua: { trangThai: "SET", bac: kq.bac, muc: dtoMuc(dong, tenVai, ngay) } } satisfies ThuTraResponse);
    }),
    route("GET", "/api/pricing/cung-ung", "office", async ({ env, staff }) => {
      if (!can(staff, "supply.terms.view")) return FORBIDDEN();
      const [dong, ncc, cty] = await Promise.all([allTerms(env.DB), suppliers(env.DB), ownerCompany(env.DB)]);
      const homNay = vnToday(new Date());
      return json({
        homNay, dong: dong.map((r) => dtoDk(r, cty?.partyId ?? null, homNay)), nhaCungCap: ncc.map((r) => ({ partyId: r.id, ten: r.display_name })),
        congTyChu: cty ? { partyId: cty.partyId, ten: cty.displayName } : null,
      } satisfies SupplyTermListResponse);
    }),
    route("POST", "/api/pricing/cung-ung", "office", async ({ env, request, staff }) => {
      if (!can(staff, "supply.terms.write")) return FORBIDDEN();
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
      if (!can(staff, "supply.terms.write")) return FORBIDDEN();
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
    // Tìm người hưởng theo tên cho form lập đơn (bên đặt là công ty lữ hành…): người LẬP ĐƠN (văn phòng), không phải tài khoản Đối tác. Chỉ id, tên, loại hồ sơ — không liên hệ.
    route("GET", "/api/pricing/nguoi-huong", "orders", async ({ env, url, staff }) => {
      if (!can(staff, "order.create") || holdsPartner(staff)) return FORBIDDEN();
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
      const rows = await findBeneficiaries(env.DB, escapeLike(q));
      return json({ ketQua: rows.map((r) => ({ partyId: r.id, ten: r.display_name, loai: r.party_kind })) } satisfies NguoiHuongTimResponse);
    }),
  ],
};
