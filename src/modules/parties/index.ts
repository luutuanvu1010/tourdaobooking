// Module parties — hồ sơ (cá nhân/tổ chức), liên hệ, vai trò theo nơi, quan hệ (ADR-0001, ADR-0008). Route: /api/parties*.
// Phụ thuộc: locations (khoá ngoại + nhãn nơi qua view công bố) và audit (dấu vết). Module khác CHỈ import từ file này.
// Ghi dữ liệu trả CÂU LỆNH chưa chạy (newPersonStatements…) để module gọi gộp vào một db.batch() — `staff` tạo tài khoản kèm hồ sơ như vậy.
import { auditStatement } from "../audit";
import type {
  ContactPointDto, MergeItemDto, MergePreviewResponse, PartyDto, PartyDuplicatesResponse, PartyListItemDto, PartyListResponse, PartyLookupResponse, PartyMergeRef, PartyMetaResponse,
  PartyRelationshipDto, PartyResponse, PartyRoleDto, PersonDocumentDto, PersonDocumentListResponse, PersonDocumentMetaResponse, PersonDocumentRevealResponse,
  TaiKhoanNhanTienResponse,
} from "../../shared/contracts";
import { LOAI_CO_DINH, MA_LOAI_GIAY_TO_RE, kiemLoaiGiayToMoi, kiemSuaLoaiGiayTo, soNgayConLai } from "../../shared/giay-to";
import { OWNER_COMPANY_ROLE, thieuChoCongTyChu } from "../../shared/cong-ty-chu";
import { capNghiTrung, chuanHoaTen } from "../../shared/ho-so-trung";
import type { RoleCode } from "../../shared/roles";
import { UUID_RE, error, intParam, mauLikeChua, json, kemLocation, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { normalizePhone } from "../../shared/phone";
import { route, type AppModule, type Ctx } from "../../shared/router";
import type { DonCuaNguoiDatTom, PartyAccountVerdict } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { gioiTinhHopLe } from "../../shared/xung-ho";
import {
  activeBanks, bankAccountCloseStatement, bankAccountInsertStatement, bankAccountOpenOf, bankActive, ownerBankAccountRows,
  accountRolesOf as accountRoleRows, addContactStatements, addRelationshipStatement, addRoleStatement, endContactStatement, endRelationshipStatement, endRoleStatement,
  companyIdentityOf, docsForMerge, driverDocsForDispatch, driversForDispatch, expiringDocumentsOfRoles, findLicenseClass, findParty, findPartiesByPhone, findPersonDocument, findPersonDocumentNumber, findPersonDocumentType, getPartyDetail,
  insertLicenseClassStatement, insertPersonDocTypeStatement, updateLicenseClassStatement, updatePersonDocTypeStatement, insertPersonDocStatement, isCarrierParty, isOwnerCompanyParty, listLicenseClasses, listParties,
  listCarriers, listPartiesByIds, openPersonPhones, personsForMatch, listPersonDocumentTypes, listPersonDocuments, listRelationshipTypes, listRoleTypes, mergedFromOf, newOrganizationStatements, newPersonStatements, updatePersonDocStatement,
  voidPersonDocStatement,
  hoSoMangNhan, openRoleCodesFor, ownerCompanyRows, relationshipEnds, renamePersonStatements, reopenRoleStatement, roleRowOf, roleTypeOf, updatePartyStatements, vaiDangMo,
  type BankAccountRow, type BankRow, type GopDocRow, type PartyListRow, type PartyRow, type ContactRow, type PersonDocFull, type PersonDocRow, type PersonDocValues, type RelationshipRow, type RoleRow,
} from "./repository";
import { chanCo, keHoachGop, type CongViecGop, type GiayToGop, type HoSoGop, type KeHoachGop, type NhomVai } from "./gop";
import { loGop } from "./gop-lo";
import { docTaiKhoanNhanTien } from "./tai-khoan-nhan-tien";
import { MA_HANG_RE, cheSo, chiTietNhatKy, chuanHoaSo, kiemGiaHan, kiemHangMoi, kiemSuaHang, kiemSuaSai, kiemThemGiayTo, type DanhMucGiayTo, type GiayToNhap } from "./giay-to";
import {
  PARTY_ID_RE, QUAN_HE_TAI_XE_CUA, ROW_ID_RE, composePersonName, hoSoNoiBo, ownerCompanyAssignProblem, splitPersonName, validateContact, validateEndDate, validatePartyCreate, validatePartyUpdate,
  validatePersonFullName, validateRelationship, validateRole,
} from "./rules";

export { composePersonName, newOrganizationStatements, newPersonStatements, findPartiesByPhone, renamePersonStatements, splitPersonName, validatePersonFullName };
export type { ContactInput, OrgFields, PersonName, RoleInput } from "./rules";

/** Một dòng vai với Tour Đảo (không gắn nơi) của hồ sơ gắn tài khoản. */
export interface AccountRole { id: string; roleTypeCode: string; validFrom: string; validTo: string | null }

/**
 * Vai của hồ sơ gắn tài khoản: đang mở + đã đóng từ `today` (ADR-0018 điều 3). CHỈ hàm sinh quyền của module staff gọi — vai KHÔNG phải cổng
 * cho phép (ADR-0001 điều 4); ngoài parties không mã nào đọc bảng vai (R-N1-12).
 */
export async function accountRolesOf(db: D1Database, partyId: string, today: string): Promise<AccountRole[]> {
  return (await accountRoleRows(db, partyId, today)).map((r) => ({ id: r.id, roleTypeCode: r.role_type_code, validFrom: r.valid_from_date, validTo: r.valid_to_date }));
}
/** Mã vai đang mở của nhiều hồ sơ trong MỘT truy vấn (danh sách tài khoản). */
export const openRoleCodesByParty = openRoleCodesFor;
/** Câu mở một vai với Tour Đảo (không gắn nơi) từ `from` — module staff gộp vào một db.batch() cùng quyền + nhật ký. */
export const openAccountRoleStatement = (db: D1Database, partyId: string, roleTypeCode: string, from: string, actorId: string, at: string): D1PreparedStatement =>
  addRoleStatement(db, partyId, { roleTypeCode, locationId: null, from, to: null }, actorId, at);
/** Câu đóng một vai với Tour Đảo tại ngày `to`. */
export const closeAccountRoleStatement = (db: D1Database, partyId: string, roleId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  endRoleStatement(db, partyId, roleId, to, actorId, at);
/**
 * HÀM CÔNG BỐ (ADR-0117 điều 4) cho module staff: các hồ sơ (trong `partyIds`) đang mang loại đối tác được hưởng hoa hồng — đọc view v_pty_party_partner_label
 * (cùng định nghĩa với trigger chặn quyền nội bộ). Chỉ trả id, không tên loại.
 */
export const hoSoMangNhanDoiTac = (db: D1Database, partyIds: readonly string[]): Promise<Set<string>> => hoSoMangNhan(db, partyIds);
/** Câu mở lại một vai đã đóng trong hôm nay (tránh chèn dòng chồng lấn khi gỡ rồi gán lại cùng ngày). */
export const reopenAccountRoleStatement = reopenRoleStatement;
/** Tóm tắt hồ sơ cho module staff (tạo tài khoản trên hồ sơ có sẵn). */
export async function partySummary(
  db: D1Database,
  id: string,
): Promise<{ kind: "PERSON" | "ORGANIZATION"; active: boolean; displayName: string; mergedIntoId: string | null } | null> {
  const p = await findParty(db, id);
  return p ? { kind: p.party_kind, active: p.active === 1, displayName: p.display_name, mergedIntoId: p.merged_into_id } : null;
}

/**
 * HÀM CÔNG BỐ (ADR-0068 Đ9 — C1, C2) cho module staff: hồ sơ CÁ NHÂN đang dùng, chưa gộp, khớp SĐT liên hệ đang mở (`phone` đã chuẩn hoá) HOẶC tên chuẩn hoá
 * (`chuanHoaTen`, giữ dấu). Kèm tên công việc hôm nay. KHÔNG trả SĐT.
 */
export async function hoSoCaNhanKhop(db: D1Database, v: { phone: string | null; ten: string | null }): Promise<{ id: string; displayName: string; lyDo: ("PHONE" | "NAME")[]; vai: string[] }[]> {
  const today = vnToday(new Date());
  const tenChuan = v.ten ? chuanHoaTen(v.ten) : "";
  const [nguoi, theoSo, loai] = await Promise.all([
    tenChuan ? personsForMatch(db) : Promise.resolve([]),
    v.phone ? findPartiesByPhone(db, v.phone, today) : Promise.resolve([]),
    listRoleTypes(db),
  ]);
  const lyDo = new Map<string, ("PHONE" | "NAME")[]>();
  for (const r of theoSo) if (r.party_kind === "PERSON" && r.active === 1) lyDo.set(r.id, ["PHONE"]);
  for (const p of nguoi) if (chuanHoaTen(p.display_name) === tenChuan) lyDo.set(p.id, [...(lyDo.get(p.id) ?? []), "NAME"]);
  const tenVai = new Map(loai.map((t) => [t.code, t.name]));
  return (await listPartiesByIds(db, [...lyDo.keys()], today)).map((r) => ({
    id: r.id,
    displayName: r.display_name,
    lyDo: lyDo.get(r.id)!,
    vai: [...new Set((r.role_codes ?? "").split(",").filter(Boolean))].map((c) => tenVai.get(c) ?? c),
  }));
}

/** Định danh Tour Đảo cho nơi đọc ngoài module (ADR-0024 điều 6 + 6.2). Trường có thể null: dữ liệu hồ sơ tổ chức cho phép trống. */
export interface OwnerCompany { partyId: string; displayName: string; legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null }
/**
 * HÀM CÔNG BỐ DUY NHẤT về định danh Tour Đảo (ADR-0024 điều 6, 6.2; Hiến chương 2.1): hồ sơ đang mở vai OWNER_COMPANY_ROLE ("Công ty chủ").
 * Mọi nơi đọc tên / MST / địa chỉ / hotline / email của công ty đi qua đây (GET /api/company, GET /api/auth/config). Không viết cứng id: đổi công ty chủ
 * (chủ dự án 2026-09-28) thì hàm tự trả hồ sơ mới. null khi không có ĐÚNG một hồ sơ như vậy; nơi gọi tự quyết khi thiếu trường (GET /api/company: 404).
 */
export async function ownerCompany(db: D1Database): Promise<OwnerCompany | null> {
  const rows = await ownerCompanyRows(db, OWNER_COMPANY_ROLE);
  if (rows.length !== 1) return null;
  const r = rows[0]!;
  return { partyId: r.id, displayName: r.display_name, legalName: r.legal_name, taxCode: r.tax_code, address: r.address, hotline: r.hotline, email: r.email };
}

/** Tài khoản nhận tiền HIỆN HÀNH của công ty chủ (ADR-0108 đ2) — HÀM CÔNG BỐ cho module `receipt` (QR thanh toán). Theo công ty chủ HIỆN TẠI: đổi công ty chủ
 * sang hồ sơ chưa cài ⇒ null (không dùng tài khoản của công ty cũ — đặc tả §4.1). KHÔNG tự kiểm quyền; nơi gọi không ghi số này vào nhật ký. */
export interface TaiKhoanNhanTien { congTy: string; nganHang: string; bin: string; soTaiKhoan: string; chuTaiKhoan: string }
export async function taiKhoanNhanTienHienHanh(db: D1Database): Promise<TaiKhoanNhanTien | null> {
  const rows = await ownerBankAccountRows(db, OWNER_COMPANY_ROLE);
  if (rows.length !== 1) return null;
  const r = rows[0]!;
  return { congTy: r.cong_ty, nganHang: r.bank_short_name, bin: r.bin, soTaiKhoan: r.account_number, chuTaiKhoan: r.account_name };
}

/**
 * HÀM CÔNG BỐ về tên vai (sổ đại lý đợt 1): tên tiếng Việt của MỌI mã vai hồ sơ, kể cả vai đã ngưng — chỉ nhãn, KHÔNG phải điều kiện cho phép
 * (vai hồ sơ không bao giờ là điều kiện cho phép). Dùng ở màn bảng mức hoa hồng (pricing) để hiện "Công ty lữ hành" thay vì mã. Đọc lại câu `role_types`
 * của chính parties, không thêm câu SQL mới.
 */
export async function tenLoaiVai(db: D1Database): Promise<Map<string, string>> {
  return new Map((await listRoleTypes(db)).map((r) => [r.code, r.name]));
}

/** Mã vai tài khoản "Tài xế công ty" (ADR-0040 D3; Ruling R12) — lấy kiểu từ ROLE_CODES để không viết chuỗi rời lệch danh mục vai. */
const VAI_TAI_XE_CONG_TY = "DRIVER_INTERNAL" satisfies RoleCode;
/** Mã vai tài khoản "Tài xế đối tác" (ADR-0048 D2) — cùng cách lấy kiểu. */
const VAI_TAI_XE_DOI_TAC = "DRIVER_EXTERNAL" satisfies RoleCode;
/**
 * Một dòng "giấy tờ sắp hết hạn" của tài xế (ADR-0040 D1; ADR-0048 D1) cho module van-chuyen. KHÔNG có số giấy tờ, nơi cấp, id giấy tờ — chỉ đủ để hiện dòng
 * (tên người, loại, hạng, ngày hết hạn, tên nhà xe) và mở hồ sơ người đó (partyId). `carrierName` = TÊN các nhà xe người đó đang "thuộc" (nối ", "), null =
 * không thuộc nhà xe nào (tài xế công ty) — chỉ tên hiển thị, không liên hệ, không MST.
 */
export interface ExpiringPersonDocument { partyId: string; displayName: string; typeName: string; className: string | null; expiryDate: string; carrierName: string | null }
/**
 * Giấy tờ sắp hết / đã hết hạn của TÀI XẾ (ADR-0040 D1, mở rộng bởi ADR-0048 D1): hồ sơ đang dùng, đang mở vai tài khoản "Tài xế công ty" HOẶC "Tài xế đối tác"
 * (lọc BÁO CÁO trong parties — vai hồ sơ không bao giờ là điều kiện cho phép, R-N1-12; giả định G7), chỉ dòng hiện hành có ngày hết hạn ≤ `until` (kể cả đã
 * quá hạn). HÀM CÔNG BỐ DUY NHẤT về giấy tờ của người cho module khác — không trả số, nơi cấp, id giấy tờ.
 */
export async function expiringDriverDocuments(db: D1Database, v: { today: string; until: string }): Promise<ExpiringPersonDocument[]> {
  return (await expiringDocumentsOfRoles(db, [VAI_TAI_XE_CONG_TY, VAI_TAI_XE_DOI_TAC], v.today, v.until)).map((r) => ({
    partyId: r.party_id, displayName: r.display_name, typeName: r.type_name, className: r.class_name, expiryDate: r.expiry_date, carrierName: r.carrier_names,
  }));
}

/** Nhà xe đang hợp tác (ADR-0048 D1): hồ sơ đang mở vai CARRIER — tên, loại hồ sơ, số tài xế "thuộc" (luật ở v_pty_carrier_driver). KHÔNG liên hệ, MST. */
export interface CarrierSummary { partyId: string; displayName: string; kind: "PERSON" | "ORGANIZATION"; driverCount: number }
/**
 * HÀM CÔNG BỐ DUY NHẤT về nhà xe cho module khác (ADR-0048 D1: "dữ liệu nhà xe lấy qua hàm công bố"): Vận chuyển dùng cho danh sách nhà xe và để kiểm
 * "chủ xe là nhà xe đang hợp tác" ở route xe (không xuất thêm hàm "isCarrier"). Xếp theo tên.
 */
export async function nhaXeDangHopTac(db: D1Database): Promise<CarrierSummary[]> {
  return (await listCarriers(db)).map((r) => ({ partyId: r.party_id, displayName: r.display_name, kind: r.party_kind, driverCount: r.driver_count }));
}

/**
 * Một tài xế cho điều phối xe (ADR-0049 D2; kế hoạch mục 1.1). `loai` = "CONG_TY" khi hồ sơ đang mở vai tài khoản "Tài xế công ty", ngược lại "NHA_XE";
 * `carrierPartyIds` = khoá các nhà xe người đó đang "thuộc" (luật ở v_pty_carrier_driver; tài xế công ty cũng có thể thuộc nhà xe — T-2). `giayTo` = mọi
 * giấy tờ HIỆN HÀNH: khoá dòng, mã loại, hạng, ngày hết hạn. KHÔNG số giấy tờ, khoá số, nơi cấp, ngày cấp.
 */
export interface TaiXeDieuPhoi {
  partyId: string;
  displayName: string;
  loai: "CONG_TY" | "NHA_XE";
  carrierPartyIds: string[];
  giayTo: { rowId: string; typeCode: string; classCode: string | null; expiryDate: string | null }[];
}
/**
 * HÀM CÔNG BỐ về tài xế cho điều phối (ADR-0049 D2: "giấy tờ đọc qua hàm công bố của parties, không lấy số"): hồ sơ cá nhân đang dùng, đang mở vai "Tài xế
 * công ty" hoặc "thuộc" một nhà xe đang hợp tác (kể cả người chưa có tài khoản). Van-chuyen không tự đọc vai (R-N1-12) — lọc vai nằm ở đây. Xếp theo tên.
 * "Đang mở vai" = chưa kết thúc (`valid_to_date IS NULL` — R-P8), cùng cách với quyền đăng nhập và v_pty_carrier_driver; KHÔNG theo ngày. `v.today` giữ
 * trong chữ ký theo hợp đồng kế hoạch mục 1.1 nhưng hiện không dùng.
 */
export async function taiXeChoDieuPhoi(db: D1Database, v: { today: string }): Promise<TaiXeDieuPhoi[]> {
  void v; // R-P8: điều kiện vai không theo ngày — chữ ký giữ nguyên để nơi gọi (A13/A15) không đổi khi lượt 1b cần "vào ngày chạy"
  const taiXe = await driversForDispatch(db, VAI_TAI_XE_CONG_TY);
  if (taiXe.length === 0) return [];
  const theoNguoi = new Map<string, TaiXeDieuPhoi["giayTo"]>();
  for (const g of await driverDocsForDispatch(db, taiXe.map((r) => r.party_id))) {
    const ds = theoNguoi.get(g.party_id) ?? [];
    ds.push({ rowId: g.row_id, typeCode: g.document_type_code, classCode: g.license_class_code, expiryDate: g.expiry_date });
    theoNguoi.set(g.party_id, ds);
  }
  return taiXe.map((r) => ({
    partyId: r.party_id,
    displayName: r.display_name,
    loai: r.la_cong_ty ? "CONG_TY" : "NHA_XE",
    carrierPartyIds: r.carrier_ids === null ? [] : r.carrier_ids.split(",").sort(),
    giayTo: theoNguoi.get(r.party_id) ?? [],
  }));
}

const ACCOUNT_ROLE = () => error(409, "role_via_account", "Vai này quyết định quyền đăng nhập nên chỉ gán hoặc gỡ ở màn Quản lý tài khoản.");
// Ruling R6 (điều phối 2026-09-28; ADR-0040 D3): loại công việc đã ngưng dùng (active = 0) không gán mới — áp cho MỌI loại đã ngưng, trừ đổi công ty chủ.
const ROLE_TYPE_INACTIVE = () => error(409, "role_type_inactive", "Loại công việc này đã ngưng dùng nên không gán mới được. Chọn loại khác trong danh sách.");
const isAccountGroup = (g: string | null): boolean => g === "INTERNAL" || g === "EXTERNAL";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy hồ sơ.");
const STALE = () => error(409, "stale", "Hồ sơ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const NOT_OPEN = () => error(409, "not_open", "Dòng này không còn đang hiệu lực (đã đóng hoặc không tồn tại), hoặc ngày kết thúc trước ngày bắt đầu.");
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không xem được hồ sơ.");
const FORBIDDEN_WRITE = () => error(403, "forbidden", "Tài khoản này không được sửa hồ sơ này. Hồ sơ của người có tài khoản chỉ quản trị viên cấp trên sửa.");
const ACTIVE_BY_ACCOUNT = () => error(409, "account_rule", "Người này có tài khoản: tạm khoá hoặc cho nghỉ việc ở màn Quản lý tài khoản.");
// ADR-0024 6.4 + ADR-0038 điều 7: hồ sơ công ty chủ chỉ người giữ ô company.legal.write sửa. Chữ nói "người phụ trách hệ thống", KHÔNG "Toàn quyền"
// (Toàn quyền là vai ẩn — ADR-0038 điều 8 / ADR-0042; chỉ đạo D5 của nhật ký thi công T2b).
const OWNER_COMPANY_FORBIDDEN = () =>
  error(403, "forbidden", "Chỉ người phụ trách hệ thống được sửa hồ sơ công ty chủ (tên, mã số thuế, địa chỉ, liên hệ, công việc) và đổi công ty chủ.");
/** Hồ sơ `id` có đang giữ vai "Công ty chủ" không — câu tra dữ liệu (không phải kiểm quyền), KHÔNG xuất ra ngoài module. */
const laCongTyChu = (db: D1Database, id: string): Promise<boolean> => isOwnerCompanyParty(db, id, OWNER_COMPANY_ROLE);
const NOT_OWNER_COMPANY = () => error(409, "not_owner_company", "Chỉ hồ sơ đang là công ty chủ có tài khoản nhận tiền.");
const taiKhoanDto = (r: BankAccountRow) => ({ id: r.id, maNganHang: r.bank_code, nganHang: r.bank_short_name, soTaiKhoan: r.account_number, chuTaiKhoan: r.account_name, tuLuc: r.valid_from });
const nganHangDto = (b: BankRow) => ({ ma: b.code, ten: `${b.short_name} — ${b.name}` });
async function tlTaiKhoan(db: D1Database, id: string): Promise<Response> {
  const [hienTai, banks] = await Promise.all([bankAccountOpenOf(db, id), activeBanks(db)]);
  return json({ hienTai: hienTai ? taiKhoanDto(hienTai) : null, nganHang: banks.map(nganHangDto) } satisfies TaiKhoanNhanTienResponse);
}
// Chủ dự án 2026-09-28 ("cho Super Admin đổi"): vai "Công ty chủ" không kết thúc được — đổi bằng cách gán cho hồ sơ tổ chức khác. Lớp route (lớp 1) của bất
// biến "đúng một, không lúc nào trống"; lớp CSDL là trigger *_keep_last của migration *_ho_so_cong_ty_chu (ánh xạ riêng ở constraintProblem).
const KHONG_KET_THUC_CONG_TY_CHU = "Không kết thúc được công việc “Công ty chủ”: hệ thống luôn cần một công ty chủ. Muốn đổi thì gán “Công ty chủ” cho hồ sơ tổ chức khác.";
const OWNER_COMPANY_LOCKED = () => error(409, "owner_company_locked", KHONG_KET_THUC_CONG_TY_CHU);
// ADR-0043 điều 2: hai giới hạn chấp nhận được của việc đổi, báo bằng câu hợp ngữ cảnh (không câu chung "trùng thời gian").
const OWNER_COMPANY_ALREADY = () => error(409, "owner_company_already", "Hồ sơ này đang là công ty chủ.");
const OWNER_COMPANY_SAME_DAY = () => error(409, "owner_company_same_day", "Hồ sơ này vừa thôi làm công ty chủ hôm nay, gán lại vào ngày mai.");
const NGAY_BAT_DAU_HOM_NAY = "Đổi công ty chủ có hiệu lực từ hôm nay — để trống ô ngày bắt đầu.";
// Ruling T8 (điều phối, áp ADR-0043 "không lúc nào trống"): hồ sơ sắp làm công ty chủ phải đủ các mục biên nhận cần (một nguồn: thieuChoCongTyChu).
const OWNER_COMPANY_INCOMPLETE = (thieu: string[]) =>
  error(409, "owner_company_incomplete", `Hồ sơ này chưa đủ thông tin để làm công ty chủ — còn thiếu: ${thieu.join(", ")}. Bổ sung ở Danh bạ rồi thử lại.`);
// Ruling D17 (điều phối, cùng loại T8 — điều kiện trước thao tác, không trigger): công ty chủ luôn là hồ sơ ĐANG DÙNG.
const OWNER_COMPANY_INACTIVE = () =>
  error(409, "owner_company_inactive", "Hồ sơ này đang ngưng dùng nên chưa làm công ty chủ được. Bật lại “Đang dùng” cho hồ sơ rồi thử lại.");
const OWNER_COMPANY_KEEP_ACTIVE = () =>
  error(409, "owner_company_keep_active", "Hồ sơ này đang là công ty chủ nên không ngưng dùng được. Muốn thôi dùng thì đổi công ty chủ sang hồ sơ khác trước.");

// ADR-0117 điều 4, chiều 1: hồ sơ «nội bộ» (rules.ts hoSoNoiBo) không mang loại đối tác được hưởng hoa hồng. Câu nêu "loại đối tác": người gọi giữ admin.manage.
const ROLE_PARTNER_LABEL_CONFLICT = () => error(409, "role_partner_label_conflict", "Nhân viên nội bộ không mang loại đối tác được hưởng hoa hồng.");
/** ADR-0117 quy ước đọc cờ vế 3: thiếu cờ ⇒ coi là có quyền nội bộ (siết). KHÔNG dùng `acc.linked` một mình (đếm cả tài khoản Đối tác). */
const coQuyenNoiBoCua = (acc: PartyAccountVerdict): boolean => acc.linked && acc.coQuyenNoiBo !== false;

/** Lỗi ràng buộc của CSDL → phản hồi rõ nghĩa; lỗi lạ trả null để ném lên (500 có requestId). */
function constraintProblem(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  // Lớp CSDL của vai "Công ty chủ" (trigger *_keep_last, *_start_today): chỉ tới đây khi lớp route bị vượt — mã riêng để phân biệt với lớp route (P16).
  if (/owner_company_last_open/.test(m)) return error(409, "owner_company_last_open", KHONG_KET_THUC_CONG_TY_CHU);
  if (/owner_company_start_not_today/.test(m)) return error(409, "owner_company_start_not_today", NGAY_BAT_DAU_HOM_NAY);
  if (/party_role_group_conflict/.test(m)) return error(409, "role_group_conflict", "Một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài.");
  // ADR-0117 điều 4: lưới cuối của luật «nội bộ» (trigger *_partner_label_conflict) — cùng mã/câu với lớp route (người gọi ở đây giữ admin.manage).
  if (/partner_label_conflict/.test(m)) return ROLE_PARTNER_LABEL_CONFLICT();
  if (/party_role_overlap|pty_party_role_open_uq/.test(m)) return error(409, "role_overlap", "Hồ sơ này đã có công việc đó ở nơi đó trong khoảng thời gian trùng.");
  // ADR-0048 B1.2 lớp CSDL (trigger *_drives_for_person / *_drives_for_carrier của migration *_nha_xe_doi_tac): chỉ tới đây khi lời kiểm route bị vượt —
  // mã riêng, KHÁC drives_for_not_person / drives_for_not_carrier của lớp route (P16).
  if (/party_relationship_drives_for_(person|carrier)/.test(m)) {
    return error(409, "drives_for_rule", "Quan hệ “Tài xế của” phải đi từ hồ sơ cá nhân tới hồ sơ đang là nhà xe đối tác.");
  }
  if (/party_relationship_overlap|UNIQUE constraint failed: pty_party_relationship/.test(m)) return error(409, "relationship_overlap", "Quan hệ này đã được ghi trong khoảng thời gian trùng.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại công việc, địa điểm hoặc hồ sơ liên quan không tồn tại.");
  return null;
}

// ---- Gộp hồ sơ cá nhân (ADR-0068) ----------------------------------------------------------------------------------------------------------------------
const DA_GOP = () => error(409, "party_merged", "Hồ sơ này đã gộp vào hồ sơ khác — mở hồ sơ chính để sửa.");
const MERGE_FORBIDDEN = () =>
  error(403, "forbidden", "Tài khoản này không gộp được: hồ sơ chính (hoặc hồ sơ liên quan) gắn tài khoản mà bạn không quản lý được.");
const MERGE_LOST_RACE = () => error(409, "merge_lost_race", "Hồ sơ vừa được gộp hoặc sửa ở nơi khác — tải lại, xem trước lại rồi thử lại.");
// Hợp đồng lỗi của lô (phán quyết điều phối, Task 5–6): lô ném lỗi mà A chưa gộp → dữ liệu đổi giữa lúc tính kế hoạch và lúc ghi (cả lô đã huỷ, không đổi gì).
const MERGE_STALE = () => error(409, "merge_stale", "Dữ liệu vừa thay đổi, hãy xem trước lại.");
// Lô ném lỗi trigger tiền của đơn (cột cọc cũ không đọc được lúc tính kế hoạch — phán quyết Task 4). ADR-0068 Đ1 bước 5: câu lỗi NÊU MÃ ĐƠN — trigger không nói
// đơn nào nên nêu các đơn lô định đổi người đặt (đọc lại sau khi lô huỷ); không đọc được thì câu chung.
const MERGE_ORDER_INVALID = (maDon: string[]) =>
  error(409, "merge_order_invalid", maDon.length > 0
    ? `Có đơn của hồ sơ phụ đang lệch số tiền nên chưa đổi được người đặt — một trong các đơn: ${maDon.join(", ")}. Sửa đơn đó trước khi gộp.`
    : "Có đơn của hồ sơ phụ đang lệch số tiền nên chưa đổi được người đặt — sửa đơn đó trước khi gộp.");
/**
 * Tên ràng buộc / trigger trong câu lỗi CSDL, để ghi log khi lô gộp hỏng vì lý do lạ — CHỈ tên (chữ thường, gạch dưới, dấu chấm), KHÔNG BAO GIỜ giá trị
 * (SĐT, email, số giấy tờ không lọt: mẫu không nhận chữ số, '@', khoảng trắng trong tên).
 */
function tenRangBuoc(m: string): string {
  const r = /(?:UNIQUE|NOT NULL|CHECK) constraint failed: [a-z_.]+(?:, [a-z_.]+)*|FOREIGN KEY constraint failed|\b[a-z]+(?:_[a-z]+)+\b/.exec(m);
  return r ? r[0] : "khong_ro";
}
const MERGE_CONFIRM = () => error(409, "merge_confirm_mismatch", "Gõ lại đúng tên hồ sơ phụ để xác nhận gộp.");
const LY_DO_HUY_GIAY_TO_GOP = "đã gộp vào hồ sơ khác"; // ADR-0068 Đ1 bước 4 — bảng giấy tờ không có cột lý do (kế hoạch R5): lý do nằm ở nhật ký
const intoParam = (b: Record<string, unknown> | null): string | null =>
  typeof b?.intoPartyId === "string" && PARTY_ID_RE.test(b.intoPartyId) ? b.intoPartyId : null;

interface HoSoDoc { hs: HoSoGop; giayToDu: GopDocRow[]; acc: PartyAccountVerdict }
interface TinhGop { A: HoSoDoc; B: HoSoDoc; ke: KeHoachGop; don: DonCuaNguoiDatTom; soNo: number; homNay: string }

async function docHoSoGop(ctx: Ctx<"admin">, id: string, nhom: ReadonlyMap<string, NhomVai>, nhan: ReadonlySet<string>, homNay: string): Promise<HoSoDoc | null> {
  const db = ctx.env.DB;
  const [detail, acc, chu, docs, vao] = await Promise.all([getPartyDetail(db, id), ctx.partyAccount(id), laCongTyChu(db, id), docsForMerge(db, id), mergedFromOf(db, id)]);
  if (!detail) return null;
  const p = detail.party;
  // ADR-0117 điều 4: hai cờ cho lý do chặn merge_partner_label_internal. "Còn mở" theo đúng nghĩa của gộp (gop.ts conMo: chưa đóng hoặc đóng sau hôm nay).
  const vaiMo = detail.roles.filter((r) => r.valid_to_date === null || r.valid_to_date > homNay).map((r) => ({ code: r.role_type_code, group: nhom.get(r.role_type_code) ?? "OTHER" }));
  return {
    acc,
    giayToDu: docs,
    hs: {
      id, kind: p.party_kind, displayName: p.display_name, active: p.active === 1, mergedIntoId: p.merged_into_id, laCongTyChu: chu, coTaiKhoan: acc.linked,
      coHoSoTroVao: vao.length > 0,
      nhanDoiTac: vaiMo.some((r) => nhan.has(r.code)),
      noiBo: hoSoNoiBo({ vaiMo, coQuyenNoiBo: coQuyenNoiBoCua(acc) }),
      lienHe: detail.contacts.map((c) => ({
        id: c.id, kind: c.contact_kind_code, value: c.value, valueNormalized: c.value_normalized, label: c.label, isPrimary: c.is_primary === 1, validFrom: c.valid_from_date,
        validTo: c.valid_to_date,
      })),
      congViec: detail.roles.map((r) => ({
        id: r.id, code: r.role_type_code, name: r.role_name, group: nhom.get(r.role_type_code) ?? "OTHER", locationId: r.location_id, locationName: r.location_name,
        validFrom: r.valid_from_date, validTo: r.valid_to_date,
      })),
      quanHe: detail.relationships.map((x) => ({
        id: x.id, typeCode: x.relationship_type_code, typeName: x.type_name, fromId: x.from_party_id, fromName: x.from_name, toId: x.to_party_id, toName: x.to_name,
        validFrom: x.valid_from_date, validTo: x.valid_to_date,
      })),
      giayTo: docs.map((d) => ({
        id: d.id, typeCode: d.document_type_code, typeName: d.type_name, className: d.class_name, previousId: d.previous_id, voided: d.voided_at !== null, current: d.is_current === 1,
      })),
    },
  };
}

/** Đọc hai hồ sơ + phần của module khác rồi tính kế hoạch (dùng cho CẢ xem trước lẫn gộp — gộp luôn tính lại, không tin xem trước). */
async function tinhGop(ctx: Ctx<"admin">, aId: string, bId: string, homNay: string): Promise<Response | TinhGop> {
  const loai = await listRoleTypes(ctx.env.DB);
  const nhom = new Map(loai.map((t) => [t.code, t.role_group as NhomVai]));
  const nhan = new Set(loai.filter((t) => t.partnerLabel).map((t) => t.code)); // ADR-0117: mã loại đối tác được hưởng
  const [A, B] = await Promise.all([docHoSoGop(ctx, aId, nhom, nhan, homNay), docHoSoGop(ctx, bId, nhom, nhan, homNay)]);
  if (!A || !B) return NOT_FOUND();
  // G12: hồ sơ chính gắn tài khoản mà người gộp không quản được (Quản trị khác / Toàn quyền) → 403 — luật cấp bậc có sẵn (staff tính qua ctx.partyAccount).
  if (B.acc.linked && !B.acc.manageable) return MERGE_FORBIDDEN();
  const [viec, don, soNo] = await Promise.all([ctx.gopHoSo.viecCua(aId), ctx.gopHoSo.donNguoiDat(aId), ctx.gopHoSo.soDongNo(aId)]);
  const ke = keHoachGop(A.hs, B.hs, { ...viec, donLechTien: don.lechTien }, homNay);
  // Kế hoạch R4: bên thứ ba của quan hệ bị chuyển / đóng cũng qua luật cấp bậc (như route kết thúc quan hệ xét cả hai đầu).
  for (const khac of ke.benThu3) {
    const v = await ctx.partyAccount(khac);
    if (v.linked && !v.manageable) return MERGE_FORBIDDEN();
  }
  return { A, B, ke, don, soNo, homNay };
}

const NHAN_BO_VAI = { DA_CO: "hồ sơ chính đã có", VUA_KET_THUC: "hồ sơ chính vừa kết thúc công việc này hôm nay" } as const;
const NHAN_CHI_DONG = {
  HAI_DAU_LA_MOT: "quan hệ giữa hai hồ sơ đang gộp — chỉ kết thúc",
  DA_CO: "hồ sơ chính đã có",
  VUA_KET_THUC: "hồ sơ chính vừa kết thúc quan hệ này hôm nay",
} as const;
/** Bảng xem trước (G10). Liên hệ hiện nguyên giá trị (người xem giữ admin.manage); giấy tờ chỉ loại + hạng, KHÔNG số. */
function xemTruocDto(t: TinhGop): MergePreviewResponse {
  const { A, B, ke } = t;
  const tenSau = (id: string, ten: string) => (id === B.hs.id ? B.hs.displayName : ten);
  const nhanLienHe = (c: { kind: string; value: string }) => `${c.kind === "PHONE" ? "Điện thoại" : "Email"} ${c.value}`;
  const nhanViec = (r: CongViecGop) => `${r.name} — ${r.locationName ?? "mọi nơi"}`;
  const nhanGiayTo = (d: GiayToGop) => (d.className ? `${d.typeName} ${d.className}` : d.typeName);
  const muc = (loai: MergeItemDto["loai"], nhan: string, ghiChu: string | null = null): MergeItemDto => ({ loai, nhan, ghiChu });
  return {
    source: { id: A.hs.id, displayName: A.hs.displayName },
    target: { id: B.hs.id, displayName: B.hs.displayName },
    chan: ke.chan.map((c) => ({ code: c.code, message: c.message })),
    chuyen: [
      ...ke.lienHe.mo.map((m) => muc("LIEN_HE", nhanLienHe(m.tu), m.chinh ? "liên hệ chính" : null)),
      ...ke.congViec.mo.map((r) => muc("CONG_VIEC", nhanViec(r))),
      ...ke.quanHe.mo.map((m) => muc("QUAN_HE", `${tenSau(m.fromId, m.tu.fromName)} — ${m.tu.typeName} — ${tenSau(m.toId, m.tu.toName)}`)),
      ...ke.giayTo.chep.map((d) => muc("GIAY_TO", nhanGiayTo(d))),
    ],
    giu: ke.giayTo.giu.map((d) => muc("GIAY_TO", nhanGiayTo(d), "hồ sơ chính đã có loại giấy tờ này")),
    bo: [
      ...ke.lienHe.bo.map((c) => muc("LIEN_HE", nhanLienHe(c), "hồ sơ chính đã có")),
      ...ke.congViec.bo.map((x) => muc("CONG_VIEC", nhanViec(x.cv), NHAN_BO_VAI[x.lyDo])),
      ...ke.quanHe.chiDong.map((x) => muc("QUAN_HE", `${x.qh.fromName} — ${x.qh.typeName} — ${x.qh.toName}`, NHAN_CHI_DONG[x.lyDo])),
    ],
    donDoi: t.don.doi,
    donGiu: t.don.giuDaGiao + t.don.giuDaHuy,
    dongNoGiu: t.soNo,
  };
}
/** Chi tiết nhật ký party_merged (G9): tên hai hồ sơ + số dòng theo loại. KHÔNG SĐT, email, số giấy tờ. */
function chiTietGop(t: TinhGop): string {
  const k = t.ke;
  const giayTo = k.giayTo.huy.length > 0 ? ` (${k.giayTo.huy.length} dòng ở hồ sơ phụ huỷ, lý do: ${LY_DO_HUY_GIAY_TO_GOP})` : "";
  return `gộp "${t.A.hs.displayName}" vào "${t.B.hs.displayName}": liên hệ ${k.lienHe.mo.length}, công việc ${k.congViec.mo.length}, quan hệ ${k.quanHe.mo.length}, `
    + `giấy tờ ${k.giayTo.chep.length}${giayTo}, đơn đổi người đặt ${t.don.doi}`;
}

const toListItem = (r: PartyListRow): PartyListItemDto => ({
  id: r.id,
  kind: r.party_kind,
  displayName: r.display_name,
  active: r.active === 1,
  primaryPhone: r.primary_phone,
  roleCodes: r.role_codes ? [...new Set(r.role_codes.split(","))] : [],
});

const toContact = (c: ContactRow): ContactPointDto => ({
  id: c.id,
  kind: c.contact_kind_code as ContactPointDto["kind"],
  value: c.value,
  label: c.label,
  isPrimary: c.is_primary === 1,
  validFrom: c.valid_from_date,
  validTo: c.valid_to_date,
});
const toRole = (r: RoleRow): PartyRoleDto => ({
  id: r.id,
  roleTypeCode: r.role_type_code,
  roleName: r.role_name,
  locationId: r.location_id,
  locationName: r.location_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});
const toRelationship = (r: RelationshipRow): PartyRelationshipDto => ({
  id: r.id,
  typeCode: r.relationship_type_code,
  typeName: r.type_name,
  fromPartyId: r.from_party_id,
  fromPartyName: r.from_name,
  toPartyId: r.to_party_id,
  toPartyName: r.to_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});

function toDetail(
  d: { party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] },
  today: string,
  access: { accountLinked: boolean; editable: boolean },
  vao: { id: string; display_name: string; merged_at: string }[],
): PartyDto {
  const p = d.party;
  const roles = d.roles.map(toRole);
  const openRoleCodes = roles.filter((r) => r.validFrom <= today && (r.validTo === null || r.validTo >= today)).map((r) => r.roleTypeCode);
  const mergedInto: PartyMergeRef | null = p.merged_into_id ? { id: p.merged_into_id, displayName: p.merged_into_name ?? "", mergedAt: p.merged_at ?? "" } : null;
  return {
    id: p.id,
    kind: p.party_kind,
    displayName: p.display_name,
    active: p.active === 1,
    primaryPhone: d.contacts.find((c) => c.contact_kind_code === "PHONE" && c.is_primary === 1 && c.valid_to_date === null)?.value ?? null,
    roleCodes: [...new Set(openRoleCodes)],
    familyName: p.family_name,
    middleName: p.middle_name,
    givenName: p.given_name,
    gender: gioiTinhHopLe(p.gender),
    legalName: p.legal_name,
    taxCode: p.tax_code,
    address: p.address,
    invoiceEmail: p.invoice_email,
    contacts: d.contacts.map(toContact),
    roles,
    relationships: d.relationships.map(toRelationship),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    ...access,
    mergedInto,
    mergedFrom: vao.map((r) => ({ id: r.id, displayName: r.display_name, mergedAt: r.merged_at })),
  };
}

// ---- Giấy tờ của người (ADR-0040 D2) — số LUÔN che ở mọi DTO; KHÔNG chép `number_key`/`document_number` ra DTO (số đầy đủ chỉ ở route "xem đủ số"). ----
const DOC_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không xem hay sửa được giấy tờ của người khác.");
const toPersonDocDto = (r: PersonDocRow, today: string): PersonDocumentDto => ({
  id: r.id,
  typeCode: r.document_type_code,
  typeName: r.type_name,
  classCode: r.license_class_code,
  className: r.class_name,
  maskedNumber: cheSo(r.number_key),
  issuedDate: r.issued_date,
  issuedPlace: r.issued_place,
  expiryDate: r.expiry_date,
  daysLeft: r.expiry_date === null ? null : soNgayConLai(r.expiry_date, today),
  previousId: r.previous_id,
  current: r.is_current === 1,
  voided: r.voided_at !== null,
  updatedAt: r.updated_at,
});

const DOC_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy giấy tờ này ở hồ sơ.");
// Lớp ROUTE của "chỉ dòng hiện hành gia hạn / sửa sai được"; lớp CSDL (trigger *_superseded, *_voided, *_renew_mismatch, chỉ mục *_next_uq) trả mã KHÁC
// (document_changed) — để phép đột biến bỏ lời kiểm ở route thấy đỏ (Review Focus 1).
const DOC_NOT_CURRENT = () => error(409, "document_not_current", "Dòng này đã được gia hạn hoặc đã huỷ — chỉ dòng hiện hành mới gia hạn hay sửa sai được.");
const DOC_STALE = () => error(409, "stale", "Giấy tờ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const DOC_ID_RE = /^[0-9a-f-]{36}$/;

/** Lỗi ràng buộc CSDL của giấy tờ → phản hồi rõ nghĩa, KHÔNG nhắc số; lỗi lạ trả null để ném lên (500 có requestId). */
function docProblem(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/person_document_cccd_other_person/.test(m)) return error(409, "cccd_taken", "Số CCCD này đã có ở một hồ sơ khác. Kiểm tra lại số hoặc hồ sơ.");
  if (/person_document_superseded|person_document_voided|person_document_renew_mismatch|UNIQUE constraint failed: pty_person_document\.previous_id/.test(m)) {
    return error(409, "document_changed", "Giấy tờ này vừa được người khác gia hạn hoặc sửa — tải lại rồi làm tiếp.");
  }
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại giấy tờ, hạng hoặc hồ sơ không tồn tại.");
  return null;
}

/** Danh mục của một lần kiểm (mọi loại + mọi hạng) và tra tên để dựng chi tiết nhật ký. */
async function danhMucGiayTo(db: D1Database, homNay: string): Promise<{ dm: DanhMucGiayTo; tenLoai: (c: string) => string; tenHang: (c: string | null) => string | null }> {
  const [types, classes] = await Promise.all([listPersonDocumentTypes(db), listLicenseClasses(db)]);
  return {
    dm: {
      loai: new Map(types.map((t) => [t.code, { hasExpiry: t.has_expiry === 1, active: t.active === 1 }])),
      hang: new Map(classes.map((c) => [c.code, { active: c.active === 1 }])),
      homNay,
    },
    tenLoai: (c) => types.find((t) => t.code === c)?.name ?? c,
    tenHang: (c) => (c === null ? null : (classes.find((x) => x.code === c)?.name ?? c)),
  };
}
const hienHanhCua = (d: PersonDocFull): GiayToNhap => ({
  typeCode: d.document_type_code, number: d.document_number, numberKey: d.number_key, classCode: d.license_class_code,
  issuedDate: d.issued_date, issuedPlace: d.issued_place, expiryDate: d.expiry_date,
});
/** Danh mục loại giấy tờ của người + hạng GPLX (route 2 và sau mỗi lần sửa danh mục). */
async function respondDocMeta(db: D1Database, status = 200): Promise<Response> {
  const [types, classes] = await Promise.all([listPersonDocumentTypes(db), listLicenseClasses(db)]);
  return json({
    types: types.map((t) => ({ code: t.code, name: t.name, hasExpiry: t.has_expiry === 1, sortOrder: t.sort_order, active: t.active === 1, updatedAt: t.updated_at })),
    classes: classes.map((c) => ({ code: c.code, name: c.name, sortOrder: c.sort_order, active: c.active === 1, updatedAt: c.updated_at })),
  } satisfies PersonDocumentMetaResponse, status);
}
const ADMIN_ONLY = () => error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
const CATALOG_STALE = () => error(409, "stale", "Danh mục vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const CODE_TAKEN = () => error(409, "code_taken", "Mã này đã có trong danh mục.");
/** Danh sách giấy tờ (đủ lịch sử, số che) của hồ sơ sau khi ghi. */
async function respondDocs(db: D1Database, partyId: string, status: number, warnDays: number): Promise<Response> {
  const today = vnToday(new Date());
  return json({ documents: (await listPersonDocuments(db, partyId, false)).map((r) => toPersonDocDto(r, today)), warnDays } satisfies PersonDocumentListResponse, status);
}

const KIND_LABEL = { PERSON: "cá nhân", ORGANIZATION: "tổ chức" } as const;
const idParam = (params: Record<string, string>, name: string, re: RegExp): string | null => (re.test(params[name] ?? "") ? params[name]! : null);

/**
 * Hồ sơ đầy đủ cho NGƯỜI ĐANG XEM: `editable` = đúng điều kiện mà route ghi hỏi (ADR-0013 điều 3; hồ sơ công ty chủ: ô company.legal.write — ADR-0024 6.4).
 * Gọi được từ route "office" hoặc "admin" (cả hai luôn có `staff`).
 */
async function respondParty<A extends "office" | "admin">(ctx: Ctx<A>, id: string, status = 200): Promise<Response> {
  const [detail, acc, chu, vao] = await Promise.all([getPartyDetail(ctx.env.DB, id), ctx.partyAccount(id), laCongTyChu(ctx.env.DB, id), mergedFromOf(ctx.env.DB, id)]);
  if (!detail) return NOT_FOUND();
  // ADR-0068 G16: hồ sơ đã gộp chỉ đọc (mọi route ghi trả 409 party_merged).
  const editable = detail.party.merged_into_id === null
    && (chu ? can(ctx.staff, "company.legal.write") : acc.linked ? can(ctx.staff, "party.staff.write") && acc.manageable : can(ctx.staff, "party.write"));
  const today = vnToday(new Date());
  const party = toDetail(detail, today, { accountLinked: acc.linked, editable }, vao);
  // ADR-0044 (chủ chọn 28/9): hồ sơ của tài khoản Toàn quyền — người xem không giữ Toàn quyền chỉ thấy vai ĐANG MỞ, không thấy lịch sử vai.
  if (acc.linked && acc.vaiAn && !can(ctx.staff, "admin.manage.superadmin")) party.roles = party.roles.filter((r) => r.validFrom <= today && (r.validTo === null || r.validTo >= today));
  return json({ party } satisfies PartyResponse, status);
}

export const partiesModule: AppModule = {
  name: "parties",
  routes: [
    // ---- Tra cứu (khai TRƯỚC :id để "meta"/"lookup" không bị hiểu là id) ------------------------------------------------
    route("GET", "/api/parties/meta", "office", async ({ env, staff }) => {
      if (!can(staff, "party.view")) return FORBIDDEN_VIEW();
      const [roleTypes, relationshipTypes] = await Promise.all([listRoleTypes(env.DB), listRelationshipTypes(env.DB)]);
      return json({
        roleTypes: roleTypes.map((t) => ({ code: t.code, name: t.name, group: t.role_group as "INTERNAL" | "EXTERNAL" | "OTHER", active: t.active === 1, partnerLabel: t.partnerLabel })),
        relationshipTypes,
      } satisfies PartyMetaResponse);
    }),

    route("GET", "/api/parties/lookup", "office", async ({ env, url, staff }) => {
      if (!can(staff, "party.view")) return FORBIDDEN_VIEW();
      const phone = normalizePhone(url.searchParams.get("phone") ?? "");
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      const rows = await findPartiesByPhone(env.DB, phone, vnToday(new Date()));
      return json({ matches: rows.map(toListItem) } satisfies PartyLookupResponse);
    }),

    // ---- Hồ sơ nghi trùng (ADR-0068 Đ8; T1) — chỉ đọc, admin.manage. Khai TRƯỚC GET /api/parties/:id. SĐT đăng nhập tới qua ctx.gopHoSo (parties không import staff).
    route("GET", "/api/parties/duplicates", "admin", async (ctx) => {
      const { env, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const today = vnToday(new Date());
      const [nguoi, soLienHe, dangNhap] = await Promise.all([personsForMatch(env.DB), openPersonPhones(env.DB), ctx.gopHoSo.soDangNhap()]);
      const { cap, conNua } = capNghiTrung({
        hoSo: nguoi.map((p) => ({ id: p.id, ten: p.display_name })),
        sdtLienHe: soLienHe.map((c) => ({ partyId: c.party_id, so: c.value_normalized })),
        sdtDangNhap: dangNhap.map((d) => ({ partyId: d.partyId, so: d.phone })),
      });
      const theoId = new Map((await listPartiesByIds(env.DB, [...new Set(cap.flatMap((c) => [c.aId, c.bId]))], today)).map((r) => [r.id, toListItem(r)]));
      const coTaiKhoan = new Set(dangNhap.map((d) => d.partyId));
      return json({
        pairs: cap.flatMap((c) => {
          const a = theoId.get(c.aId);
          const b = theoId.get(c.bId);
          return a && b ? [{ a, b, lyDo: c.lyDo, aCoTaiKhoan: coTaiKhoan.has(c.aId), bCoTaiKhoan: coTaiKhoan.has(c.bId) }] : [];
        }),
        conNua,
      } satisfies PartyDuplicatesResponse);
    }),

    route("GET", "/api/parties", "office", async ({ env, url, staff }) => {
      if (!can(staff, "party.view")) return FORBIDDEN_VIEW();
      const kindRaw = url.searchParams.get("kind");
      if (kindRaw && kindRaw !== "PERSON" && kindRaw !== "ORGANIZATION") return error(400, "invalid_input", "Loại hồ sơ lọc không hợp lệ.");
      const role = url.searchParams.get("role") || null;
      if (role && !/^[A-Z][A-Z_]{1,29}$/.test(role)) return error(400, "invalid_input", "Mã công việc để lọc không hợp lệ.");
      const location = url.searchParams.get("location") || null;
      if (location && !UUID_RE.test(location)) return error(400, "invalid_input", "Địa điểm lọc không hợp lệ.");
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const digits = q.replace(/\D/g, "");
      const limit = intParam(url.searchParams.get("limit"), 30, 1, 100);
      const { rows, hasMore } = await listParties(env.DB, {
        today: vnToday(new Date()),
        kind: (kindRaw as "PERSON" | "ORGANIZATION" | null) || null,
        q: q ? mauLikeChua(q) : null, // D1 từ chối mẫu LIKE > 50 byte: chữ dài cắt theo byte (mauLikeChua)
        phoneLike: q && digits.length >= 3 ? mauLikeChua(digits) : null, // chỉ chữ số nên không có dấu thoát; vẫn cắt ở 48 chữ số
        roleCode: role,
        locationId: location,
        includeInactive: url.searchParams.get("includeInactive") === "1",
        limit,
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      });
      return json({ parties: rows.map(toListItem), hasMore } satisfies PartyListResponse);
    }),

    // ---- Giấy tờ của người (ADR-0040 D2) — hai route tra cứu khai TRƯỚC các route :id (thói quen của tệp) ----------------------------------------------
    route("GET", "/api/parties/documents/mine", "staff", async ({ env, staff, nguongHetHan }) => {
      // Ruling R4 + R5 (chủ 28/9: mọi nhân viên nội bộ): cổng "staff"; ô own chặn Đối tác; CHỈ giấy tờ của chính người gọi, CHỈ dòng hiện hành (R15 điểm 6),
      // ngày hết hạn tăng dần; số che.
      if (!can(staff, "party.document.view", { ownerId: staff.id })) return error(403, "forbidden", "Tài khoản này không có mục giấy tờ.");
      // Ruling R18 (điều phối 2026-09-28): tài khoản CÓ quyền Đối tác — kể cả LAI với quyền nội bộ (ô `own` của quyền nội bộ làm `can()` ở trên qua) —
      // cũng không có mục này; tiền lệ "chặn tài khoản lai" của ADR-0030 (hàng chờ nhận, `holdsPartner`).
      if (holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không có mục giấy tờ.");
      const warnDays = await nguongHetHan();
      if (!staff.partyId) return json({ documents: [], warnDays } satisfies PersonDocumentListResponse);
      const today = vnToday(new Date());
      return json({ documents: (await listPersonDocuments(env.DB, staff.partyId, true)).map((r) => toPersonDocDto(r, today)), warnDays } satisfies PersonDocumentListResponse);
    }),

    route("GET", "/api/parties/documents/meta", "office", async ({ env, staff }) => {
      // Danh mục loại giấy tờ của người + hạng GPLX: cho người ghi giấy tờ (chọn loại/hạng) và người sửa danh mục (admin.manage).
      if (!can(staff, "party.document.write") && !can(staff, "admin.manage")) return DOC_FORBIDDEN();
      return respondDocMeta(env.DB);
    }),

    // Danh mục loại giấy tờ của người + hạng GPLX — Quản trị sửa (ADR-0040 D2; ô admin.manage viết thẳng — luật (4) của hàng rào 2). Hai mã loại CỐ ĐỊNH
    // (CCCD, GPLX — CHECK/trigger và mã nguồn dựa vào) không ngưng được. Nhật ký cùng lô, chỉ mã + tên (danh mục, không phải dữ liệu cá nhân).
    route("POST", "/api/parties/document-types", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemLoaiGiayToMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertPersonDocTypeStatement(env.DB, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_document_catalog_changed", at, detail: `loại giấy tờ: ${v.code} — ${v.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: pty_person_document_type\.code/.test(e.message)) return CODE_TAKEN();
        throw e;
      }
      return kemLocation(await respondDocMeta(env.DB, 201), "/loai-giay-to-nguoi");
    }),

    route("PUT", "/api/parties/document-types/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!MA_LOAI_GIAY_TO_RE.test(code) || !(await findPersonDocumentType(env.DB, code))) return error(404, "not_found", "Không tìm thấy loại giấy tờ.");
      const parsed = kiemSuaLoaiGiayTo(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      if (!v.active && (code === LOAI_CO_DINH.CCCD || code === LOAI_CO_DINH.GPLX)) return error(409, "fixed_type", "Loại giấy tờ này hệ thống cần dùng, không ngưng được.");
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updatePersonDocTypeStatement(env.DB, code, v, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_document_catalog_changed", at, detail: `loại giấy tờ: ${code} — ${v.name}` }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return CATALOG_STALE();
      return respondDocMeta(env.DB);
    }),

    route("POST", "/api/parties/license-classes", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemHangMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertLicenseClassStatement(env.DB, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_document_catalog_changed", at, detail: `hạng: ${v.code} — ${v.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: pty_license_class\.code/.test(e.message)) return CODE_TAKEN();
        throw e;
      }
      return kemLocation(await respondDocMeta(env.DB, 201), "/loai-giay-to-nguoi");
    }),

    route("PUT", "/api/parties/license-classes/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!MA_HANG_RE.test(code) || !(await findLicenseClass(env.DB, code))) return error(404, "not_found", "Không tìm thấy hạng giấy phép lái xe.");
      const parsed = kiemSuaHang(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateLicenseClassStatement(env.DB, code, v, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_document_catalog_changed", at, detail: `hạng: ${code} — ${v.name}` }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return CATALOG_STALE();
      return respondDocMeta(env.DB);
    }),

    route("GET", "/api/parties/:id/documents", "office", async ({ env, params, staff, nguongHetHan }) => {
      // ADR-0040 D2: party.view KHÔNG mở giấy tờ; người ghi giấy tờ (Quản trị, Toàn quyền) xem danh sách (số che) của người khác — đủ dòng lịch sử.
      if (!can(staff, "party.document.write")) return DOC_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const party = id ? await findParty(env.DB, id) : null;
      if (!id || !party) return NOT_FOUND();
      const warnDays = await nguongHetHan();
      if (party.party_kind !== "PERSON") return json({ documents: [], warnDays } satisfies PersonDocumentListResponse);
      const today = vnToday(new Date());
      return json({ documents: (await listPersonDocuments(env.DB, id, false)).map((r) => toPersonDocDto(r, today)), warnDays } satisfies PersonDocumentListResponse);
    }),

    // Ghi giấy tờ của người (ADR-0040 D2): thứ tự 403 ô → 404 hồ sơ → 403 cấp bậc (Ruling R8 = Q1: Quản trị không ghi giấy tờ của tài khoản cấp trên) →
    // 400 thân → 409 dòng hiện hành → ghi + nhật ký cùng lô (chi tiết KHÔNG số) → 409 stale (khoá lạc quan).
    route("POST", "/api/parties/:id/documents", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.document.write")) return DOC_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const party = id ? await findParty(env.DB, id) : null;
      if (!id || !party) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return DOC_FORBIDDEN();
      if (party.merged_into_id) return DA_GOP();
      if (party.party_kind !== "PERSON") return error(400, "invalid_input", "Giấy tờ chỉ gắn với hồ sơ cá nhân.");
      const now = new Date();
      const d = await danhMucGiayTo(env.DB, vnToday(now));
      const parsed = kiemThemGiayTo(await readJson(request), d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v: PersonDocValues = parsed.value;
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertPersonDocStatement(env.DB, crypto.randomUUID(), id, v, null, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_document_added", at, targetType: "party", targetId: id, detail: chiTietNhatKy({ loai: d.tenLoai(v.typeCode), hang: d.tenHang(v.classCode), hetHan: v.expiryDate }) }),
        ]);
      } catch (e) {
        const problem = docProblem(e);
        if (problem) return problem;
        throw e;
      }
      return kemLocation(await respondDocs(env.DB, id, 201, await ctx.nguongHetHan()), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/documents/:did/renew", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.document.write")) return DOC_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !hoSo) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return DOC_FORBIDDEN();
      if (hoSo.merged_into_id) return DA_GOP();
      const did = idParam(params, "did", DOC_ID_RE);
      const cu = did ? await findPersonDocument(env.DB, did, id) : null;
      if (!did || !cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucGiayTo(env.DB, vnToday(now));
      // Gia hạn = dòng MỚI; không gửi số thì chép số (và hạng) của dòng trước — số đầy đủ không phải ra trình duyệt (Review Focus 3).
      const parsed = kiemGiaHan(await readJson(request), { typeCode: cu.document_type_code, number: cu.document_number, classCode: cu.license_class_code }, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const v: PersonDocValues = parsed.value;
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertPersonDocStatement(env.DB, crypto.randomUUID(), id, v, did, staff.id, at),
          auditStatement(env.DB, {
            staffId: staff.id, action: "party_document_renewed", at, targetType: "party", targetId: id,
            detail: chiTietNhatKy({ loai: d.tenLoai(v.typeCode), hang: d.tenHang(v.classCode), giaHan: true, truoc: cu.expiry_date, sau: v.expiryDate }),
          }),
        ]);
      } catch (e) {
        const problem = docProblem(e);
        if (problem) return problem;
        throw e;
      }
      return kemLocation(await respondDocs(env.DB, id, 201, await ctx.nguongHetHan()), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/documents/:did/correct", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.document.write")) return DOC_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !hoSo) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return DOC_FORBIDDEN();
      if (hoSo.merged_into_id) return DA_GOP();
      const did = idParam(params, "did", DOC_ID_RE);
      const cu = did ? await findPersonDocument(env.DB, did, id) : null;
      if (!did || !cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucGiayTo(env.DB, vnToday(now));
      const hienHanh = hienHanhCua(cu);
      const parsed = kiemSuaSai(await readJson(request), hienHanh, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const s = parsed.value;
      const at = now.toISOString();
      const loai = d.tenLoai(cu.document_type_code);
      let ghi: D1PreparedStatement;
      let detail: string;
      if (s.huy) {
        ghi = voidPersonDocStatement(env.DB, did, id, s.expectedUpdatedAt, staff.id, at);
        detail = chiTietNhatKy({ loai, lyDo: s.lyDo });
      } else {
        const moi: PersonDocValues = { ...hienHanh };
        if (s.truong === "number") Object.assign(moi, { number: s.giaTri, numberKey: s.giaTri === null ? null : chuanHoaSo(s.giaTri) });
        else moi[s.truong] = s.giaTri;
        ghi = updatePersonDocStatement(env.DB, did, id, s.expectedUpdatedAt, moi, staff.id, at);
        // Trước → sau CHỈ cho ngày (YYYY-MM-DD) và hạng (tên hạng); số và nơi cấp không bao giờ vào nhật ký (chiTietNhatKy còn tự bỏ nếu lỡ truyền).
        const [truoc, sau] =
          s.truong === "issuedDate" || s.truong === "expiryDate" ? [hienHanh[s.truong], moi[s.truong]]
          : s.truong === "classCode" ? [d.tenHang(hienHanh.classCode), d.tenHang(moi.classCode)]
          : [null, null];
        detail = chiTietNhatKy({ loai, lyDo: s.lyDo, truoc, sau });
      }
      let results: D1Result[];
      try {
        results = await env.DB.batch([ghi, auditStatement(env.DB, { staffId: staff.id, action: "party_document_corrected", at, targetType: "party", targetId: id, detail }, "changes() > 0")]);
      } catch (e) {
        const problem = docProblem(e);
        if (problem) return problem;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return DOC_STALE();
      return respondDocs(env.DB, id, 200, await ctx.nguongHetHan());
    }),

    // "Xem đủ số" (ADR-0040 D2; R15 điểm 5): route DUY NHẤT trả số đầy đủ. POST (có ghi, và để router chặn gọi chéo trang). Thứ tự: 403 ô → 404 hồ sơ → 403
    // cấp bậc (Ruling R8) → 404 dòng → GHI NHẬT KÝ (chi tiết = tên loại, KHÔNG số) → rồi mới trả số: ghi nhật ký lỗi thì ném lên (500), không trả số.
    route("POST", "/api/parties/:id/documents/:did/reveal", "office", async (ctx) => {
      const { env, params, staff } = ctx;
      if (!can(staff, "party.document.reveal")) return error(403, "forbidden", "Tài khoản này không được xem đủ số giấy tờ.");
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return error(403, "forbidden", "Tài khoản này không được xem đủ số giấy tờ của người này.");
      const did = idParam(params, "did", DOC_ID_RE);
      const row = did ? await findPersonDocumentNumber(env.DB, did, id) : null;
      if (!did || !row) return DOC_NOT_FOUND();
      if (row.document_number === null) return error(409, "no_number", "Giấy tờ này không có số để xem.");
      await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "party_document_number_viewed", at: new Date().toISOString(), targetType: "party", targetId: id, detail: row.type_name })]);
      return json({ number: row.document_number } satisfies PersonDocumentRevealResponse);
    }),

    // ---- Gộp hồ sơ cá nhân (ADR-0068 Đ1, Đ2, Đ5): admin.manage + cấp bậc; xem trước không ghi gì; gộp TÍNH LẠI kế hoạch rồi chạy MỘT db.batch() --------------
    route("POST", "/api/parties/:id/merge/preview", "admin", async (ctx) => {
      const { request, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id) return NOT_FOUND();
      const into = intoParam(await readJson(request));
      if (!into) return error(400, "invalid_input", "Chọn hồ sơ chính để gộp vào.");
      const t = await tinhGop(ctx, id, into, vnToday(new Date()));
      return t instanceof Response ? t : json(xemTruocDto(t) satisfies MergePreviewResponse);
    }),

    route("POST", "/api/parties/:id/merge", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id) return NOT_FOUND();
      const body = await readJson(request);
      const into = intoParam(body);
      if (!into) return error(400, "invalid_input", "Chọn hồ sơ chính để gộp vào.");
      const now = new Date();
      const t = await tinhGop(ctx, id, into, vnToday(now));
      if (t instanceof Response) return t;
      // Đặc tả G13 (phán quyết F7): A vừa gộp xong vào CHÍNH hồ sơ này (bấm đúp / người khác vừa gộp) = thua cuộc đua. A đã gộp vào hồ sơ KHÁC thì để kế
      // hoạch trả lời (merge_inactive).
      if (t.A.hs.mergedIntoId === into) return MERGE_LOST_RACE();
      const dau = t.ke.chan[0];
      if (dau) return error(409, dau.code, dau.message);
      if (chuanHoaTen(typeof body?.xacNhan === "string" ? body.xacNhan : "") !== chuanHoaTen(t.A.hs.displayName)) return MERGE_CONFIRM();
      const at = now.toISOString();
      const lo = loGop(env.DB, { a: id, b: into, ke: t.ke, giayToDu: new Map(t.A.giayToDu.map((d) => [d.id, d])), homNay: t.homNay, at, actorId: staff.id });
      const detail = chiTietGop(t);
      // Thứ tự (kế hoạch R1, R2): phần parties → câu đổi người đặt đơn (thấy "A còn đang dùng") → câu LẬT A → hai dòng nhật ký `changes() > 0`.
      const stmts = [
        ...lo.truocDon,
        ctx.gopHoSo.cauDoiDon(id, into, at),
        lo.lat,
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: id, detail }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: into, detail }, "changes() > 0"),
      ];
      let results: D1Result[];
      try {
        results = await env.DB.batch(stmts);
      } catch (e) {
        // Hợp đồng lỗi của lô (phán quyết điều phối): mọi lệch giữa lúc tính và lúc ghi (lô thua có giấy tờ, dòng mở mới của A, giấy tờ / liên hệ chính đổi
        // trong khe…) làm trigger / chỉ mục / NOT NULL huỷ CẢ lô — không dòng nào đổi. Không bao giờ 500, không lộ câu lỗi CSDL.
        // Phán quyết Task 6 Minor 2 (như kiểm trước ở trên): chỉ "thua cuộc đua" khi A vừa gộp vào ĐÚNG hồ sơ chính này; gộp vào hồ sơ khác → merge_inactive.
        const daGop = (await findParty(env.DB, id))?.merged_into_id;
        if (daGop === into) return MERGE_LOST_RACE();
        if (daGop) {
          const c = chanCo("merge_inactive");
          return error(409, c.code, c.message);
        }
        const m = e instanceof Error ? e.message : "";
        if (/money_invariant/.test(m)) return MERGE_ORDER_INVALID(await ctx.gopHoSo.donNguoiDat(id).then((d) => d.maDoi, () => []));
        console.error(JSON.stringify({ level: "error", event: "merge_batch_failed", constraint: tenRangBuoc(m) }));
        return MERGE_STALE();
      }
      if ((results[stmts.length - 3]!.meta.changes ?? 0) === 0) return MERGE_LOST_RACE();
      return respondParty(ctx, into);
    }),

    // ---- Tạo / xem / sửa -----------------------------------------------------------------------------------------------
    route("POST", "/api/parties", "office", async (ctx) => {
      const { request, env, staff } = ctx;
      if (!can(staff, "party.write")) return FORBIDDEN_WRITE();
      const parsed = validatePartyCreate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const made =
        v.kind === "PERSON"
          ? newPersonStatements(env.DB, { name: v.name, gender: v.gender, contacts: v.contacts, contactsFrom: today }, staff.id, at)
          : newOrganizationStatements(env.DB, { org: v.org, contacts: v.contacts, contactsFrom: today }, staff.id, at);
      const name = v.kind === "PERSON" ? composePersonName(v.name) : v.org.displayName;
      // Không ghi SĐT/email/MST vào nhật ký (chỉ tên và loại) — đặc tả N1 §5.
      await env.DB.batch([...made.statements, auditStatement(env.DB, { staffId: staff.id, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `${KIND_LABEL[v.kind]} "${name}"` })]);
      return kemLocation(await respondParty(ctx, made.partyId, 201), `/parties?id=${made.partyId}`);
    }),

    route("GET", "/api/parties/:id", "office", async (ctx) => {
      const { params, staff } = ctx;
      if (!can(staff, "party.view")) return FORBIDDEN_VIEW();
      const id = idParam(params, "id", PARTY_ID_RE);
      return id ? respondParty(ctx, id) : NOT_FOUND();
    }),

    route("PUT", "/api/parties/:id", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      const id = idParam(params, "id", PARTY_ID_RE);
      const current = id ? await findParty(env.DB, id) : null;
      if (!id || !current) return NOT_FOUND();
      const [acc, chu]: [PartyAccountVerdict, boolean] = await Promise.all([ctx.partyAccount(id), laCongTyChu(env.DB, id)]);
      // ADR-0024 6.4 + ADR-0038 điều 7: hồ sơ công ty chủ — chỉ ô company.legal.write; party.write và party.staff.write từ chối hồ sơ này. Hỏi TRƯỚC khi đọc thân.
      if (chu ? !can(staff, "company.legal.write") : acc.linked ? !(can(staff, "party.staff.write") && acc.manageable) : !can(staff, "party.write")) {
        return chu ? OWNER_COMPANY_FORBIDDEN() : FORBIDDEN_WRITE();
      }
      // ADR-0068 G16: hồ sơ đã gộp chỉ đọc — chặn TRƯỚC khi đọc thân (bật lại "đang dùng" không bao giờ chạm tới trigger party_merge_no_reopen).
      if (current.merged_into_id) return DA_GOP();
      const parsed = validatePartyUpdate(await readJson(request), current.party_kind);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (acc.linked && parsed.value.active !== (current.active === 1)) return ACTIVE_BY_ACCOUNT();
      // Ruling D17 (b): hồ sơ công ty chủ không ngưng dùng được (kể cả người giữ ô) — muốn thôi dùng thì đổi công ty chủ trước. PUT là đường DUY NHẤT đặt active.
      if (chu && !parsed.value.active) return OWNER_COMPANY_KEEP_ACTIVE();
      const at = new Date().toISOString();
      // ADR-0084 Đ1: vắng ô giới tính ⇒ giữ giá trị đang lưu. Nhật ký chỉ ghi "đổi giới tính" — KHÔNG giá trị cũ / mới (cùng lối dữ liệu cá nhân).
      const pv = parsed.value;
      const gioiTinhCu = gioiTinhHopLe(current.gender);
      const v = pv.kind === "PERSON" ? { ...pv, gender: pv.gender === undefined ? gioiTinhCu : pv.gender } : pv;
      const doiGioiTinh = v.kind === "PERSON" && v.gender !== gioiTinhCu;
      const stmts = updatePartyStatements(env.DB, id, v, staff.id, at);
      const detail = `${KIND_LABEL[current.party_kind]}${doiGioiTinh ? " — đổi giới tính" : ""}`;
      const results = await env.DB.batch([...stmts, auditStatement(env.DB, { staffId: staff.id, action: "party_updated", at, targetType: "party", targetId: id, detail }, "changes() > 0")]);
      if ((results[stmts.length - 1]!.meta.changes ?? 0) === 0) return STALE();
      return respondParty(ctx, id);
    }),

    // ---- Liên hệ (SALES/ACCOUNTING/ADMIN: như sửa hồ sơ) ------------------------------------------------------------------
    route("POST", "/api/parties/:id/contacts", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      const id = idParam(params, "id", PARTY_ID_RE);
      const detail = id ? await getPartyDetail(env.DB, id) : null;
      if (!id || !detail) return NOT_FOUND();
      const [acc, chu]: [PartyAccountVerdict, boolean] = await Promise.all([ctx.partyAccount(id), laCongTyChu(env.DB, id)]);
      // ADR-0024 6.4: liên hệ của hồ sơ công ty chủ (Hotline, Zalo, email in trên biên nhận) — chỉ ô company.legal.write.
      if (chu ? !can(staff, "company.legal.write") : acc.linked ? !(can(staff, "party.staff.write") && acc.manageable) : !can(staff, "party.write")) {
        return chu ? OWNER_COMPANY_FORBIDDEN() : FORBIDDEN_WRITE();
      }
      if (detail.party.merged_into_id) return DA_GOP();
      const parsed = validateContact(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const c = parsed.value;
      // Chưa có liên hệ CHÍNH đang mở cùng loại thì liên hệ này tự thành liên hệ chính. Hỏi "chính đang mở" chứ không phải "còn dòng
      // nào đang mở": sau khi đóng liên hệ chính mà vẫn còn dòng phụ, hồ sơ sẽ kẹt ở trạng thái không có liên hệ chính.
      const hasOpenPrimary = detail.contacts.some((x) => x.contact_kind_code === c.kind && x.is_primary === 1 && x.valid_to_date === null);
      if (!hasOpenPrimary) c.isPrimary = true;
      const now = new Date();
      const at = now.toISOString();
      await env.DB.batch([
        ...addContactStatements(env.DB, id, c, vnToday(now), staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: c.kind === "PHONE" ? "thêm số điện thoại" : "thêm email" }),
      ]);
      return kemLocation(await respondParty(ctx, id, 201), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/contacts/:cid/end", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      const id = idParam(params, "id", PARTY_ID_RE);
      const cid = idParam(params, "cid", ROW_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !cid || !hoSo) return NOT_FOUND();
      const [acc, chu]: [PartyAccountVerdict, boolean] = await Promise.all([ctx.partyAccount(id), laCongTyChu(env.DB, id)]);
      // ADR-0024 6.4: đóng liên hệ của hồ sơ công ty chủ (vd Hotline — biên nhận báo lỗi nếu hết Hotline) — chỉ ô company.legal.write.
      if (chu ? !can(staff, "company.legal.write") : acc.linked ? !(can(staff, "party.staff.write") && acc.manageable) : !can(staff, "party.write")) {
        return chu ? OWNER_COMPANY_FORBIDDEN() : FORBIDDEN_WRITE();
      }
      if (hoSo.merged_into_id) return DA_GOP();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endContactStatement(env.DB, id, cid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: "đóng một liên hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(ctx, id);
    }),

    // ---- Tài khoản nhận tiền của công ty chủ (ADR-0108 đ2; đặc tả QR §4.1): ô company.legal.write (chỉ Toàn quyền — ô MỞ RỘNG NGHĨA sang tài khoản nhận
    // tiền); chỉ hồ sơ ĐANG là công ty chủ. Đổi = đóng dòng cũ + mở dòng mới + nhật ký trong MỘT lô; nhật ký KHÔNG chép số tài khoản (Hiến chương 5.12).
    route("GET", "/api/parties/:id/tai-khoan-nhan-tien", "office", async ({ env, params, staff }) => {
      if (!can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      if (!(await laCongTyChu(env.DB, id))) return NOT_OWNER_COMPANY();
      return tlTaiKhoan(env.DB, id);
    }),

    route("PUT", "/api/parties/:id/tai-khoan-nhan-tien", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      if (!(await laCongTyChu(env.DB, id))) return NOT_OWNER_COMPANY();
      const doc = docTaiKhoanNhanTien(await readJson(request));
      if (!doc.ok) return error(400, "invalid_input", doc.cau);
      const v = doc.value;
      if (!(await bankActive(env.DB, v.maNganHang))) return error(400, "invalid_input", "Chọn ngân hàng trong danh sách.");
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const stmts = [
        ...(v.truocDo ? [bankAccountCloseStatement(env.DB, { id: v.truocDo, partyId: id, at, by: staff.id })] : []),
        bankAccountInsertStatement(env.DB, { id: moiId, partyId: id, bankCode: v.maNganHang, accountNumber: v.soTaiKhoan, accountName: v.chuTaiKhoan, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "party_bank_account_changed", at, targetType: "party", targetId: id, detail: `${v.truocDo ? "đổi" : "cài"} tài khoản nhận tiền` }, "changes() > 0"),
      ];
      let kq: D1Result[];
      try {
        kq = await env.DB.batch(stmts);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (/bank_account_not_owner/.test(m)) return NOT_OWNER_COMPANY();
        if (/UNIQUE constraint failed: pty_bank_account/.test(m)) return STALE();
        throw e;
      }
      if ((kq[stmts.length - 2]!.meta.changes ?? 0) === 0) return STALE();
      return tlTaiKhoan(env.DB, id);
    }),

    // ---- Vai trò theo nơi (chỉ quản trị viên: ADR-0007 "vai trò hồ sơ") ----------------------------------------------------------
    // ADR-0019 điều 2 / Q11 (25/9): luật cấp bậc áp cho vai/quan hệ của hồ sơ gắn tài khoản (sửa một phần ADR-0014 điều 8) — Quản trị không
    // thêm/kết thúc vai của Quản trị khác hay Toàn quyền; hồ sơ không gắn tài khoản chỉ cần ô admin.manage. Kiểm quyền đứng trước đọc thân yêu cầu.
    route("POST", "/api/parties/:id/roles", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return FORBIDDEN_WRITE();
      const id = idParam(params, "id", PARTY_ID_RE);
      const party = id ? await findParty(env.DB, id) : null;
      if (!id || !party) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return FORBIDDEN_WRITE();
      if (party.merged_into_id) return DA_GOP();
      // ADR-0024 6.4: MỌI công việc trên hồ sơ công ty chủ — chỉ company.legal.write; hỏi TRƯỚC khi đọc thân (không để 400 lộ trước 403).
      const chu = await laCongTyChu(env.DB, id);
      if (chu && !can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      const now = new Date();
      const today = vnToday(now);
      const parsed = validateRole(await readJson(request), today);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const loai = await roleTypeOf(env.DB, parsed.value.roleTypeCode);
      if (isAccountGroup(loai?.group ?? null)) return ACCOUNT_ROLE();
      // `today` (ngày bắt đầu mặc định) và `at` (created_at) lấy từ CÙNG một `now` — trigger *_start_today của migration đòi valid_from_date = ngày giờ VN của
      // created_at cho dòng "Công ty chủ"; hai giá trị từ hai lần đọc đồng hồ có thể lệch ngày lúc nửa đêm (ADR-0043 điều 2).
      const at = now.toISOString();
      const doiCongTyChu = parsed.value.roleTypeCode === OWNER_COMPANY_ROLE;
      // ADR-0040 D3 + Ruling R1, R6: loại vai đang ngưng (active = 0) KHÔNG gán mới được — trước đây chỉ bị ẩn ở giao diện (web/parties.ts). Áp cho mọi loại đã
      // ngưng (mã cũ mơ hồ của 0024, mã hồ sơ cũ DRIVER của 0031). Ngoại lệ: đổi công ty chủ (OWNER_COMPANY gieo active = 0 để ô "Thêm công việc" chung không
      // liệt kê — Ruling T2 của T2b; đường riêng ở dưới). Mã lạ (loai = null) đi tiếp như cũ: câu chèn vấp khoá ngoại → 400.
      if (!doiCongTyChu && loai !== null && !loai.active) return ROLE_TYPE_INACTIVE();
      // ADR-0117 điều 4, chiều 1 (lớp route; lớp CSDL: trigger *_partner_label_conflict, nhưng vế 3 — tài khoản có quyền nội bộ mà hồ sơ không có vai nội bộ —
      // CHỈ lớp này canh): hồ sơ nội bộ không nhận loại đối tác được hưởng hoa hồng.
      if (loai?.partnerLabel && hoSoNoiBo({ vaiMo: await vaiDangMo(env.DB, id), coQuyenNoiBo: coQuyenNoiBoCua(acc) })) return ROLE_PARTNER_LABEL_CONFLICT();
      const stmts: D1PreparedStatement[] = [addRoleStatement(env.DB, id, parsed.value, staff.id, at)];
      if (doiCongTyChu) {
        // 6.5 (i) + ADR-0043: gán "Công ty chủ" = ĐỔI công ty chủ — chỉ company.legal.write, trên BẤT KỲ hồ sơ nào (mã vai gửi lên chỉ biết sau khi đọc thân);
        // hồ sơ tổ chức, không gắn nơi, không ngày kết thúc, bắt đầu HÔM NAY (ngày lùi ghi sai lịch sử; ngày tới hiện hồ sơ mới trước ngày hiệu lực). Trigger
        // *_switch của migration đóng dòng công ty chủ cũ trong cùng câu chèn; nhật ký ghi ở CẢ hai hồ sơ, chỉ tên (không MST/SĐT/email).
        if (!can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
        const problem = ownerCompanyAssignProblem(party.party_kind, parsed.value, today);
        if (problem) return error(400, "invalid_input", problem);
        if (chu) return OWNER_COMPANY_ALREADY(); // câu hợp ngữ cảnh thay cho câu chung "trùng thời gian" của trigger chồng lấn 0011 (ADR-0043 điều 2)
        if (party.active !== 1) return OWNER_COMPANY_INACTIVE(); // Ruling D17 (a): công ty chủ luôn là hồ sơ đang dùng
        // Ruling T8: điều kiện TRƯỚC khi đổi (không phải bất biến — không trigger): hồ sơ mới phải đủ mục mà GET /api/company cần, để không lúc nào trống.
        const d = await companyIdentityOf(env.DB, id);
        const thieu = thieuChoCongTyChu({ legalName: d?.legal_name ?? null, taxCode: d?.tax_code ?? null, address: d?.address ?? null, hotline: d?.hotline ?? null });
        if (thieu.length > 0) return OWNER_COMPANY_INCOMPLETE(thieu);
        const cu = (await ownerCompanyRows(env.DB, OWNER_COMPANY_ROLE)).find((r) => r.id !== id);
        stmts.push(auditStatement(env.DB, { staffId: staff.id, action: "party_role_added", at, targetType: "party", targetId: id, detail: cu ? `công ty chủ (thay "${cu.display_name}")` : "công ty chủ" }));
        if (cu) stmts.push(auditStatement(env.DB, { staffId: staff.id, action: "party_role_ended", at, targetType: "party", targetId: cu.id, detail: `thôi là công ty chủ (chuyển sang "${party.display_name}")` }));
      } else {
        stmts.push(auditStatement(env.DB, { staffId: staff.id, action: "party_role_added", at, targetType: "party", targetId: id, detail: parsed.value.roleTypeCode }));
      }
      try {
        await env.DB.batch(stmts);
      } catch (e) {
        // ADR-0043 điều 2: đổi LẠI trong cùng ngày về hồ sơ vừa thôi vai → trigger chồng lấn 0011 chặn; báo câu hợp ngữ cảnh, không câu chung "trùng thời gian".
        if (doiCongTyChu && e instanceof Error && /party_role_overlap/.test(e.message)) return OWNER_COMPANY_SAME_DAY();
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return kemLocation(await respondParty(ctx, id, 201), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/roles/:rid/end", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return FORBIDDEN_WRITE();
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !rid || !hoSo) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return FORBIDDEN_WRITE();
      if (hoSo.merged_into_id) return DA_GOP();
      const row = await roleRowOf(env.DB, id, rid);
      if (isAccountGroup(row?.group ?? null)) return ACCOUNT_ROLE();
      // ADR-0024 6.4 + 6.5 (i): công việc trên hồ sơ công ty chủ, hoặc chính dòng "Công ty chủ" — chỉ company.legal.write (403 trước mọi thứ khác).
      if ((row?.code === OWNER_COMPANY_ROLE || (await laCongTyChu(env.DB, id))) && !can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      // Chủ 2026-09-28: vai "Công ty chủ" không kết thúc được, kể cả người giữ ô — đổi bằng cách gán cho hồ sơ khác (lớp route; lớp CSDL ở dưới).
      if (row?.code === OWNER_COMPANY_ROLE) return OWNER_COMPANY_LOCKED();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      let results: D1Result[];
      try {
        results = await env.DB.batch([
          endRoleStatement(env.DB, id, rid, to.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_role_ended", at, targetType: "party", targetId: id }, "changes() > 0"),
        ]);
      } catch (e) {
        // Không lộ lỗi SQLite thô (trigger của vai "Công ty chủ" nếu lớp route bị vượt).
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(ctx, id);
    }),

    // ---- Quan hệ giữa hai hồ sơ (chỉ quản trị viên — đề xuất của đặc tả N1 §7.2, đã duyệt) ------------------------------------------
    // ADR-0019 điều 2 / Q11: một quan hệ chạm HAI hồ sơ nên luật cấp bậc xét CẢ HAI đầu (siết, AI hiểu vậy — ghi ở commit).
    route("POST", "/api/parties/:id/relationships", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return FORBIDDEN_WRITE();
      const id = idParam(params, "id", PARTY_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !hoSo) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return FORBIDDEN_WRITE();
      if (hoSo.merged_into_id) return DA_GOP();
      const now = new Date();
      const parsed = validateRelationship(await readJson(request), id, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (parsed.value.typeCode === QUAN_HE_TAI_XE_CUA) {
        // ADR-0048 B1.2 (lớp route, TRƯỚC trigger 0038): G2 — không đặt trước ngày kết thúc ("đang mở" = không có ngày kết thúc; thôi thì bấm Kết thúc).
        if (parsed.value.to !== null) return error(400, "invalid_input", "Quan hệ “Tài xế của” không đặt trước ngày kết thúc — khi tài xế thôi thì bấm “Kết thúc”.");
        const tu = await findParty(env.DB, parsed.value.fromPartyId);
        if (!tu) return error(400, "invalid_input", "Loại công việc, địa điểm hoặc hồ sơ liên quan không tồn tại.");
        if (tu.party_kind !== "PERSON") return error(409, "drives_for_not_person", "Quan hệ “Tài xế của” phải đi từ hồ sơ cá nhân (người lái), không từ hồ sơ tổ chức.");
        if (!(await isCarrierParty(env.DB, parsed.value.toPartyId))) {
          return error(409, "drives_for_not_carrier", "Quan hệ “Tài xế của” phải trỏ tới hồ sơ đang là nhà xe đối tác — gán công việc “Nhà xe đối tác” cho hồ sơ đó trước.");
        }
      }
      // Đầu kia chỉ biết SAU khi đọc thân, nên 403 này đứng sau 400 thân sai (không ghi gì trước đó).
      const other = parsed.value.fromPartyId === id ? parsed.value.toPartyId : parsed.value.fromPartyId;
      if ((await findParty(env.DB, other))?.merged_into_id) return DA_GOP(); // đầu kia đã gộp → trỏ quan hệ vào hồ sơ chính
      const otherAcc: PartyAccountVerdict = await ctx.partyAccount(other);
      if (otherAcc.linked && !otherAcc.manageable) return FORBIDDEN_WRITE();
      const at = now.toISOString();
      try {
        await env.DB.batch([
          addRelationshipStatement(env.DB, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: `thêm quan hệ ${parsed.value.typeCode}` }),
        ]);
      } catch (e) {
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return kemLocation(await respondParty(ctx, id, 201), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/relationships/:rid/end", "admin", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "admin.manage")) return FORBIDDEN_WRITE();
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      const hoSo = id ? await findParty(env.DB, id) : null;
      if (!id || !rid || !hoSo) return NOT_FOUND();
      const ends = await relationshipEnds(env.DB, id, rid);
      for (const partyId of new Set(ends ? [id, ends.from, ends.to] : [id])) {
        const acc: PartyAccountVerdict = await ctx.partyAccount(partyId);
        if (acc.linked && !acc.manageable) return FORBIDDEN_WRITE();
      }
      if (hoSo.merged_into_id) return DA_GOP();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endRelationshipStatement(env.DB, id, rid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: "kết thúc một quan hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(ctx, id);
    }),
  ],
};
