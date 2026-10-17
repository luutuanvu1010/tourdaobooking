// Module parties — hồ sơ (cá nhân/tổ chức), liên hệ, vai trò theo nơi, quan hệ (ADR-0001, ADR-0008). Route: /api/parties*.
// Phụ thuộc: locations (khoá ngoại + nhãn nơi qua view công bố) và audit (dấu vết). Module khác CHỈ import từ file này.
// Ghi dữ liệu trả CÂU LỆNH chưa chạy (newPersonStatements…) để module gọi gộp vào một db.batch() — `staff` tạo tài khoản kèm hồ sơ như vậy.
import { auditStatement } from "../audit";
import type {
  ContactPointDto, MergeItemDto, MergePreviewResponse, PartyDto, PartyDuplicatesResponse, PartyListItemDto, PartyListResponse, PartyLookupResponse, PartyMergeRef, PartyMetaResponse,
  PartyRelationshipDto, PartyResponse, PartyRoleDto, PersonDocumentDto, PersonDocumentListResponse, PersonDocumentMetaResponse, PersonDocumentRevealResponse,
  StaffProfile, TaiKhoanNhanTienResponse, HoSoTepChayLaiResponse, HoSoTepChoXoaResponse, HoSoTepCreatedResponse, HoSoTepListResponse,
  ChinhSachDangResponse, DongYResponse, HoSoCuaToiDto, HoSoCuaToiResponse, PhieuTuKhaiDto, TrangThaiPhieuTuKhai, PhieuTuKhaiTaoResponse, PhieuTuKhaiRutResponse,
  PhieuChoXacMinhDto, PhieuDaXuLyDto, PhieuXacMinhChiTietDto, PhieuXemSoResponse,
} from "../../shared/contracts";
import { LOAI_CO_DINH, MA_LOAI_GIAY_TO_RE, kiemLoaiGiayToMoi, kiemSuaLoaiGiayTo, soNgayConLai } from "../../shared/giay-to";
import { OWNER_COMPANY_ROLE, thieuChoCongTyChu } from "../../shared/cong-ty-chu";
import { capNghiTrung, chuanHoaTen } from "../../shared/ho-so-trung";
import { nhanLoaiLienHe } from "../../shared/lien-he";
import type { RoleCode } from "../../shared/roles";
import { UUID_RE, error, intParam, mauLikeChua, json, kemLocation, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { normalizePhone } from "../../shared/phone";
import { route, type AppModule, type Ctx } from "../../shared/router";
import type { DonCuaNguoiDatTom, PartyAccountVerdict, TaiKhoanXacMinh } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { gioiTinhHopLe } from "../../shared/xung-ho";
import {
  activeBanks, bankAccountCloseStatement, bankAccountInsertStatement, bankAccountOpenOf, bankActive, ownerBankAccountRows,
  accountRolesOf as accountRoleRows, addContactStatements, addRelationshipStatement, addRoleStatement, endContactStatement, endRelationshipStatement, endRoleStatement,
  companyIdentityOf, docsForMerge, driverDocsForDispatch, driversForDispatch, expiringDocumentsOfRoles, findLicenseClass, findParty, findPartiesByPhone, findPersonDocument, findPersonDocumentNumber, findPersonDocumentType, getPartyDetail,
  insertLicenseClassStatement, insertPersonDocTypeStatement, updateLicenseClassStatement, updatePersonDocTypeStatement, insertPersonDocStatement, isCarrierParty, isOwnerCompanyParty, listLicenseClasses, listParties,
  listCarriers, listPartiesByIds, openPersonPhones, personsForMatch, listPersonDocumentTypes, listPersonDocuments, listRelationshipTypes, listRoleTypes, mergedFromOf, newOrganizationStatements, newPersonStatements, updatePersonDocStatement,
  voidPersonDocStatement,
  datChoXoaTepStatement, findTepDeTai, insertTepLinkStatement, insertTepStatement, listTepChoXoa, listTepCuaGiayTo, markTepStored, tepCuaGiayTo,
  chinhSachHienHanh, phienBanLonNhat, dangChinhSachStatement, phienBanDangDongY, ghiDongYStatement, rutMoiPhieuChoStatement, listPhieuCuaHoSo, type PhieuRow,
  ghiPhieuStatement, timPhieuCuaHoSo, rutPhieuStatement,
  canXacMinhLaiStatement, chamCuaTaiKhoan, ghiDiaChiTuPhieuStatement, ghiGiayToTuPhieuStatement, ghiNgaySinhTuPhieuStatement, ghiXacMinhTuPhieuStatement, lamMoiHoSoTuPhieuStatement, quyetPhieuStatement, listPhieuCho, listPhieuDaXuLy, soDuCuaPhieuCho, timPhieuChoXet, trungSoHoSoKhac,
  datHoatDongLoaiDoiTacStatement, hoSoMangNhan, openRoleCodesFor, themLoaiDoiTacStatement, ownerCompanyRows, relationshipEnds, renamePersonStatements, reopenRoleStatement, roleRowOf, roleTypeOf, updatePartyStatements, vaiDangMo,
  type BankAccountRow, type BankRow, type GopDocRow, type PartyListRow, type PartyRow, type ContactRow, type PersonDocFull, type PersonDocRow, type PersonDocValues, type RelationshipRow, type RoleRow,
} from "./repository";
import { chanCo, keHoachGop, type CongViecGop, type GiayToGop, type HoSoGop, type KeHoachGop, type NhomVai } from "./gop";
import { loGop } from "./gop-lo";
import { anTruongRiengTu, ghiDuocRiengTu, laLienHeRiengTu, xemDuocRiengTu, type NguoiXem } from "./rieng-tu";
import { docTaiKhoanNhanTien } from "./tai-khoan-nhan-tien";
import { DO_DANG_SAU_MS, LOAI_NOI_DUNG, LY_DO_XOA_TEP, TOI_DA_THAN, bamSha256, dauPhanHoiTep, khoaNgauNhien, kiemTepTaiLen } from "./tep";
import { ghiRoiXoaKho, xoaKhoiKho } from "./kho-tep";
import { CAU_KHONG_GUI, kiemChinhSach, kiemPhieuTuKhai, lyDoKhongGhi, lyDoKhongGui, type LoaiPhieu, type TinhTrangTuKhai } from "./tu-khai";
import { nhanLoaiPhieu } from "../../shared/tu-khai-hien-thi";
import { NHAN_LY_DO_CHAN, nhanLyDoTuChoi } from "../../shared/xac-minh-hien-thi";
import { chuyenToanQuyen, kiemTuChoi, loiLoChapNhan, lyDoKhongChapNhan, xetNguoiXacMinh, type KetLuanXet, type PhieuXet, type TaiKhoanTom } from "./xac-minh";
import { MA_HANG_RE, cheSo, chiTietNhatKy, chuanHoaSo, kiemGiaHan, kiemHangMoi, kiemSuaHang, kiemSuaSai, kiemThemGiayTo, type DanhMucGiayTo, type GiayToNhap } from "./giay-to";
import {
  PARTY_ID_RE, QUAN_HE_TAI_XE_CUA, ROW_ID_RE, composePersonName, hoSoNoiBo, ownerCompanyAssignProblem, splitPersonName, validateContact, validateEndDate, validatePartyCreate, validatePartyUpdate,
  validatePersonFullName, validateRelationship, validateRole,
} from "./rules";

export { kiemTenLoaiDoiTac, maLoaiDoiTac } from "./rules";
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
/**
 * HÀM CÔNG BỐ (ADR-0117 điều 1) cho module pricing: MỌI loại vai kèm nhóm, cờ loại đối tác và cờ "đang dùng" của chính `pty_role_type` (pricing tự ghép cờ của danh sách
 * được hưởng). Đọc lại `listRoleTypes`, không thêm câu SQL.
 */
export async function loaiVaiChiTiet(db: D1Database): Promise<{ code: string; ten: string; nhom: string; partnerLabel: boolean; dangBat: boolean }[]> {
  return (await listRoleTypes(db)).map((t) => ({ code: t.code, ten: t.name, nhom: t.role_group, partnerLabel: t.partnerLabel, dangBat: t.active === 1 }));
}
/** CÂU CHƯA CHẠY: thêm một loại đối tác (nhóm OTHER, nhãn, đang dùng) — pricing gộp vào cùng `db.batch()` với dòng danh sách được hưởng và nhật ký. Chỉ module parties ghi `pty_role_type`. */
export { themLoaiDoiTacStatement };
/** CÂU CHƯA CHẠY: tắt / bật một loại đối tác (chỉ loại có nhãn; loại khác hoặc đã đúng trạng thái ⇒ 0 dòng đổi). */
export { datHoatDongLoaiDoiTacStatement };
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
/**
 * Bảng xem trước (G10). Liên hệ hiện nguyên giá trị (người xem giữ admin.manage); giấy tờ chỉ loại + hạng, KHÔNG số. ADR-0122 đ5: liên hệ ĐỊA CHỈ của hồ sơ
 * phụ chỉ hiện khi người xem được xem trường riêng tư của hồ sơ đó (`xemDiaChiA`) — hồ sơ phụ gắn tài khoản cấp trên chỉ bị CHẶN gộp, bảng vẫn kê liên hệ.
 */
function xemTruocDto(t: TinhGop, xemDiaChiA: boolean): MergePreviewResponse {
  const { A, B, ke } = t;
  const tenSau = (id: string, ten: string) => (id === B.hs.id ? B.hs.displayName : ten);
  const nhanLienHe = (c: { kind: string; value: string }) => `${nhanLoaiLienHe(c.kind)} ${c.value}`;
  const hienLienHe = (c: { kind: string }) => xemDiaChiA || !laLienHeRiengTu(c.kind);
  const nhanViec = (r: CongViecGop) => `${r.name} — ${r.locationName ?? "mọi nơi"}`;
  const nhanGiayTo = (d: GiayToGop) => (d.className ? `${d.typeName} ${d.className}` : d.typeName);
  const muc = (loai: MergeItemDto["loai"], nhan: string, ghiChu: string | null = null): MergeItemDto => ({ loai, nhan, ghiChu });
  return {
    source: { id: A.hs.id, displayName: A.hs.displayName },
    target: { id: B.hs.id, displayName: B.hs.displayName },
    chan: ke.chan.map((c) => ({ code: c.code, message: c.message })),
    chuyen: [
      ...ke.lienHe.mo.filter((m) => hienLienHe(m.tu)).map((m) => muc("LIEN_HE", nhanLienHe(m.tu), m.chinh ? "liên hệ chính" : null)),
      ...ke.congViec.mo.map((r) => muc("CONG_VIEC", nhanViec(r))),
      ...ke.quanHe.mo.map((m) => muc("QUAN_HE", `${tenSau(m.fromId, m.tu.fromName)} — ${m.tu.typeName} — ${tenSau(m.toId, m.tu.toName)}`)),
      ...ke.giayTo.chep.map((d) => muc("GIAY_TO", nhanGiayTo(d))),
    ],
    giu: ke.giayTo.giu.map((d) => muc("GIAY_TO", nhanGiayTo(d), "hồ sơ chính đã có loại giấy tờ này")),
    bo: [
      ...ke.lienHe.bo.filter(hienLienHe).map((c) => muc("LIEN_HE", nhanLienHe(c), "hồ sơ chính đã có")),
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
    birthDate: p.birth_date,
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

// ---- Kho tệp hồ sơ (ADR-0123; lát H-2 Gói 2) ----------------------------------------------------------------------------------------------------
const TEP_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không được tải lên hay mở ảnh giấy tờ.");
const TEP_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy tệp này.");
const KHO_CHUA_BAT = () => error(503, "storage_unavailable", "Kho tệp hồ sơ chưa sẵn sàng. Hãy báo quản trị viên.");
/**
 * Lô "quyết xoá" MỘT tệp (ADR-0123 đ6, ADR-0126 đ3): câu đặt purged_at (do nơi gọi dựng — có / không điều kiện dở dang) + nhật ký CHỈ MÃ, ghi khi câu đầu
 * đổi được dòng (`changes() > 0`). Dùng chung: tải lên hỏng (Task 4), chạy lại (Task 5), phiếu xoá (lát H-5). Xoá kho chạy SAU lô này (kho-tep.ts).
 */
function cauDatChoXoa(db: D1Database, cau: D1PreparedStatement, t: { id: string; party_id: string }, lyDo: string, at: string, actorId: string): D1PreparedStatement[] {
  return [
    cau,
    auditStatement(db, { staffId: actorId, action: "party_attachment_purged", at, targetType: "party", targetId: t.party_id, detail: `tệp ${t.id} · ${lyDo}` }, "changes() > 0"),
  ];
}

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

const LY_DO_RIENG_TU = {
  forbidden: { code: "personal_forbidden", message: "Tài khoản này không ghi được ngày sinh hay địa chỉ cá nhân của hồ sơ này." },
  self: { code: "personal_self", message: "Ngày sinh và địa chỉ của chính bạn cần người khác xác minh, chưa sửa trực tiếp ở đây được." },
} as const;
const CHI_TIET_THEM_LIEN_HE: Record<string, string> = { PHONE: "thêm số điện thoại", EMAIL: "thêm email", ADDRESS: "thêm địa chỉ" };
/** Người xem của luật riêng tư (rieng-tu.ts) — MỘT chỗ dựng cho cả đọc lẫn ghi. `id` null = hồ sơ đang tạo (chưa ai là chính chủ, chưa tài khoản). */
function nguoiXemRiengTu(staff: StaffProfile, id: string | null, acc: PartyAccountVerdict | null): NguoiXem {
  return {
    coO: can(staff, "party.personal.view"),
    laChinhChu: id !== null && staff.partyId === id,
    hoSoCoTaiKhoan: acc?.linked === true,
    quanDuocTaiKhoan: acc?.linked === true && acc.manageable,
  };
}
/** ADR-0122 đ5: lý do không GHI được ngày sinh / liên hệ ADDRESS (null = được) — dùng cho cả 403 của route ghi lẫn danh sách chặn của xem trước gộp. */
function lyDoChanGhiRiengTu(staff: StaffProfile, id: string | null, acc: PartyAccountVerdict | null): { code: string; message: string } | null {
  const v = nguoiXemRiengTu(staff, id, acc);
  if (ghiDuocRiengTu(v)) return null;
  return v.laChinhChu ? LY_DO_RIENG_TU.self : LY_DO_RIENG_TU.forbidden;
}
function chanGhiRiengTu(staff: StaffProfile, id: string | null, acc: PartyAccountVerdict | null): Response | null {
  const l = lyDoChanGhiRiengTu(staff, id, acc);
  return l ? error(403, l.code, l.message) : null;
}

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
  // ADR-0122 đ5: ngày sinh + liên hệ ADDRESS chỉ cho chính chủ hoặc người giữ party.personal.view (Quản trị theo cấp bậc — ruling R6). Mọi phản hồi hồ sơ đi qua đây.
  const xem = xemDuocRiengTu(nguoiXemRiengTu(ctx.staff, id, acc));
  return json({ party: xem ? party : anTruongRiengTu(party) } satisfies PartyResponse, status);
}

// ---- Hồ sơ của tôi + chính sách riêng tư (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) ----------------------------------------------------------------------
const SELF_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không có mục Hồ sơ của tôi.");
const POLICY_FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền đăng chính sách riêng tư.");
const POLICY_CHANGED = () => error(409, "policy_changed", "Chính sách riêng tư vừa có phiên bản mới. Hãy đọc và đồng ý lại trước khi gửi.");
const POLICY_RACE = () => error(409, "policy_version_race", "Vừa có phiên bản chính sách khác được đăng. Tải lại rồi thử lại.");
const tuChoi = (l: { code: string; message: string }) => error(409, l.code, l.message);
const CONSENT_REQUIRED = () => error(409, "consent_required", "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.");
const SUBMISSION_PENDING = () => error(409, "submission_pending", "Bạn đã có một phiếu loại này đang chờ xác minh. Rút phiếu đó trước nếu muốn khai lại.");
// ---- Xác minh phiếu tự khai (ADR-0125; lát H-4 Gói 2) — cổng accounts, ô party.verify / party.verify.attachment. Hàm chạm bảng phiếu chỉ gọi TRONG thân route (rào 5.23). ----
const XM_FORBIDDEN = () => error(403, "forbidden", "Bạn không có quyền xác minh hồ sơ.");
const XM_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy phiếu.");
const XM_PROCESSED = () => error(403, "submission_processed", "Phiếu đã được xử lý hoặc đã rút — không xem lại được.");
const XM_TRANG_LA = () => error(400, "invalid_input", "Trang xác minh không đúng.");
const TRAN_HANG_CHO = 50;
const TRAN_DOC_DA_XU_LY = 200;
/** Người đang xét: dòng trong danh sách tài khoản nếu có (quyền hiện hiệu lực), không thì dựng từ phiên. */
const nguoiXetCuaPhien = (staff: StaffProfile, ds: readonly TaiKhoanTom[]): TaiKhoanTom =>
  ds.find((t) => t.id === staff.id) ?? { id: staff.id, permissions: staff.permissions, active: true, partyId: staff.partyId ?? null };
const lyDoKhongXacMinh = (lyDo: string | null): string | null => (lyDo === null ? null : NHAN_LY_DO_CHAN[lyDo] ?? null);
const XM_KHONG_CHO = () => error(409, "submission_not_pending", "Phiếu đã được xử lý hoặc đã rút.");
/**
 * Cổng chung của hai route quyết (ADR-0125 đ3, đ5): ngoài cấp bậc 404 → không còn chờ 409 → người khai 409 verify_self → bị tách nhiệm vụ 409 verify_conflict. Chỉ là bảng hỏi; hàng rào
 * THẬT là lính gác trong câu quyết (repository decide_self_submission), nên lô vẫn đúng khi hai người bấm cùng lúc.
 */
async function congQuyet(
  db: D1Database, staff: StaffProfile, p: { id: string; party_id: string; created_by: string | null; created_at: string; status: string }, dsTk: readonly TaiKhoanXacMinh[],
): Promise<{ loi: Response } | { kl: KetLuanXet }> {
  const phieu: PhieuXet = { id: p.id, partyId: p.party_id, createdBy: p.created_by ?? "", createdAt: p.created_at };
  const kl = xetNguoiXacMinh({ nguoi: nguoiXetCuaPhien(staff, dsTk), phieu, chuPhieu: dsTk.find((t) => t.id === p.created_by) ?? null, cham: p.created_by ? await chamCuaTaiKhoan(db, [p.created_by]) : [] });
  if (kl.lyDo === "cap_bac") return { loi: XM_NOT_FOUND() };
  if (p.status !== "CHO_XAC_MINH") return { loi: XM_KHONG_CHO() };
  if (kl.lyDo === "nguoi_khai") return { loi: error(409, "verify_self", "Không xác minh phiếu của chính mình.") };
  if (!kl.duoc) return { loi: error(409, "verify_conflict", lyDoKhongXacMinh(kl.lyDo) ?? "Bạn không xác minh được phiếu này.") };
  return { kl };
}
const SUBMISSION_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy phiếu này.");
const SUBMISSION_NOT_PENDING = () => error(409, "submission_not_pending", "Phiếu này đã được xử lý hoặc đã rút.");
const SAME_AS_CURRENT = () => error(409, "same_as_current", "Thông tin này đã có trong hồ sơ của bạn.");

/** Hồ sơ của PHIÊN + tình trạng tự khai. ADR-0124 đ4: own = staff.partyId — KHÔNG BAO GIỜ lấy mã hồ sơ từ đường dẫn hay thân lệnh. */
async function tinhTuKhai(db: D1Database, staff: StaffProfile, nowIso: string) {
  const [detail, chinhSach, dsDongY] = await Promise.all([
    staff.partyId ? getPartyDetail(db, staff.partyId) : Promise.resolve(null),
    chinhSachHienHanh(db, nowIso),
    staff.partyId ? phienBanDangDongY(db, staff.partyId) : Promise.resolve([]),
  ]);
  // Phiên bản mà quyết định MỚI NHẤT của hồ sơ phiên là DONG_Y (vòng sửa 1, ruling I-2) — rỗng khi chưa gắn hồ sơ.
  const dangDongY = detail ? dsDongY : [];
  const daDongY = chinhSach !== null && dangDongY.some((p) => p.id === chinhSach.id);
  const tt: TinhTrangTuKhai = {
    coHoSo: detail !== null, laCaNhan: detail?.party.party_kind === "PERSON", daGop: (detail?.party.merged_into_id ?? null) !== null, coChinhSach: chinhSach !== null, daDongY,
  };
  return { detail, chinhSach, tt, dangDongY };
}
const tenGiayTo = (typeName: string | null, typeCode: string, className: string | null): string => {
  const ten = typeName ?? typeCode;
  return className ? `${ten} hạng ${className}` : ten;
};
/** DTO "Hồ sơ của tôi" — DANH SÁCH CHO PHÉP, mọi quyền như nhau (tiền lệ vá D-1; ADR-0124 đ6). Không vai, quan hệ, gộp, tài khoản, người tạo, mốc. Số giấy tờ CHE. */
function hoSoCuaToiDto(d: { party: PartyRow; contacts: ContactRow[] }, giayTo: PersonDocRow[]): HoSoCuaToiDto {
  const mo = (k: string) => d.contacts.filter((c) => c.contact_kind_code === k && c.valid_to_date === null).map((c) => c.value);
  const caNhan = d.party.party_kind === "PERSON";
  return {
    loai: d.party.party_kind,
    hoTen: d.party.display_name,
    ngaySinh: caNhan ? d.party.birth_date : null,
    diaChi: caNhan ? mo("ADDRESS") : [],
    dienThoai: mo("PHONE"),
    email: mo("EMAIL"),
    giayTo: caNhan ? giayTo.map((r) => ({ loai: tenGiayTo(r.type_name, r.document_type_code, r.class_name), soChe: cheSo(r.number_key), hetHan: r.expiry_date })) : [],
  };
}
function phieuDto(r: PhieuRow): PhieuTuKhaiDto {
  return {
    id: r.id,
    loai: r.subject_kind as LoaiPhieu,
    trangThai: r.status as TrangThaiPhieuTuKhai,
    guiLuc: r.created_at,
    xuLyLuc: r.decided_at,
    ngaySinh: r.birth_date,
    diaChi: r.address_value,
    giayTo: r.document_type_code === null ? null : {
      loai: tenGiayTo(r.type_name, r.document_type_code, r.class_name), soChe: cheSo(r.number_key), ngayCap: r.issued_date, noiCap: r.issued_place, hetHan: r.expiry_date,
    },
  };
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

    // ---- Hồ sơ của tôi + chính sách riêng tư (ADR-0124, ADR-0126 đ1; lát H-3) — khai TRƯỚC /api/parties/:id. Cổng staff: cổng duy nhất Đối tác, Tài xế đối tác qua. ----
    route("POST", "/api/parties/chinh-sach-rieng-tu", "admin", async ({ request, env, staff }) => {
      // Hàng rào cổng quản trị (ADR-0019; src/route-write-guard.test.ts): route cổng admin hỏi ô quản trị viết thẳng TRƯỚC — tiền lệ GET /api/audit (admin.manage rồi ô hẹp).
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      if (!can(staff, "party.privacy.policy")) return POLICY_FORBIDDEN();
      const k = kiemChinhSach(await readJson(request));
      if (!k.ok) return error(400, "invalid_input", k.message);
      const at = new Date().toISOString();
      const version = (await phienBanLonNhat(env.DB)) + 1;
      try {
        await env.DB.batch([
          dangChinhSachStatement(env.DB, { id: crypto.randomUUID(), version, mucDich: k.value.mucDich, noiDung: k.value.noiDung, at, actorId: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "privacy_policy_published", at, targetType: "system", targetId: "chinh-sach-rieng-tu", detail: `phiên bản ${version}` }),
        ]);
      } catch (e) {
        if (/privacy_policy_(version_gap|no_replace|valid_from_back)|UNIQUE constraint failed: pty_privacy_policy/.test(e instanceof Error ? e.message : "")) return POLICY_RACE();
        throw e;
      }
      return kemLocation(json({ phienBan: version } satisfies ChinhSachDangResponse, 201), "/account"); // H7 (ADR-0094 A-10): khung đăng ở trang Tôi (ruling Q4)
    }),

    route("GET", "/api/parties/cua-toi", "staff", async ({ env, staff }) => {
      if (!can(staff, "party.self.view", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const { detail, chinhSach, tt, dangDongY } = await tinhTuKhai(env.DB, staff, new Date().toISOString());
      const [giayTo, phieu, types, classes] = await Promise.all([
        detail && tt.laCaNhan ? listPersonDocuments(env.DB, detail.party.id, true) : Promise.resolve([]),
        detail ? listPhieuCuaHoSo(env.DB, detail.party.id) : Promise.resolve([]),
        listPersonDocumentTypes(env.DB),
        listLicenseClasses(env.DB),
      ]);
      const ly = lyDoKhongGui(tt);
      return json({
        hoSo: detail ? hoSoCuaToiDto(detail, giayTo) : null,
        chinhSach: chinhSach ? { id: chinhSach.id, phienBan: chinhSach.version, mucDich: chinhSach.purposes, noiDung: chinhSach.body, hieuLucTu: chinhSach.valid_from_at } : null,
        dongY: tt.daDongY,
        dongYPhienBan: dangDongY.map((p) => ({ id: p.id, phienBan: p.version })),
        coTheGui: ly === null,
        lyDoKhongGui: ly?.message ?? null,
        phieu: phieu.map(phieuDto),
        loaiGiayTo: types.filter((t) => t.active === 1).map((t) => ({ ma: t.code, ten: t.name, coHan: t.has_expiry === 1 })),
        hangGplx: classes.filter((c) => c.active === 1).map((c) => ({ ma: c.code, ten: c.name })),
      } satisfies HoSoCuaToiResponse);
    }),

    route("POST", "/api/parties/cua-toi/dong-y", "staff", async ({ request, env, staff }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const body = await readJson(request);
      const quyetDinh = body?.quyetDinh;
      if (quyetDinh !== "DONG_Y" && quyetDinh !== "RUT") return error(400, "invalid_input", "Chọn đồng ý hoặc rút đồng ý.");
      const at = new Date().toISOString();
      const { detail, chinhSach, tt, dangDongY } = await tinhTuKhai(env.DB, staff, at);
      const chan = lyDoKhongGhi(tt);
      if (chan) return tuChoi(chan);
      let muc: { id: string; version: number };
      if (quyetDinh === "DONG_Y") {
        // Đồng ý: CHỈ phiên bản hiện hành (mã cũ ⇒ policy_changed — Review Focus 1).
        const chuaCo = lyDoKhongGui({ ...tt, daDongY: true });
        if (chuaCo || !chinhSach) return tuChoi(chuaCo ?? { code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach });
        if (body?.chinhSachId !== chinhSach.id) return POLICY_CHANGED();
        if (tt.daDongY) return error(409, "consent_unchanged", "Bạn đã đồng ý phiên bản này rồi.");
        muc = { id: chinhSach.id, version: chinhSach.version };
      } else {
        // Rút đồng ý (vòng sửa 1, ruling I-2 của điều phối): MỌI phiên bản mà quyết định mới nhất của hồ sơ phiên đang là DONG_Y — kể cả bản cũ đã bị thay
        // (trigger 0103 pty_consent_withdraw_ins cho phép). Mã lạ / chưa đồng ý / đã rút ⇒ 409, không ghi.
        const m = dangDongY.find((p) => p.id === body?.chinhSachId);
        if (!m) {
          if (!chinhSach) return tuChoi({ code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach });
          return error(409, "consent_unchanged", "Bạn chưa đồng ý phiên bản này nên không có gì để rút.");
        }
        muc = m;
      }
      const partyId = detail!.party.id;
      const lo: D1PreparedStatement[] = [
        ghiDongYStatement(env.DB, { id: crypto.randomUUID(), partyId, policyId: muc.id, quyetDinh, at, actorId: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: quyetDinh === "DONG_Y" ? "privacy_consent_given" : "privacy_consent_withdrawn", at, targetType: "party", targetId: partyId, detail: `phiên bản ${muc.version}`,
        }),
      ];
      // Ruling Q2 + I-2: rút đồng ý một phiên bản ⇒ rút luôn mọi phiếu ĐANG CHỜ khai theo đúng phiên bản đó, CÙNG lô (bất biến R-PTY-13 xét theo phiên bản ghi
      // trên phiếu). Nhật ký rút phiếu chỉ khi có phiếu bị rút (changes() > 0).
      if (quyetDinh === "RUT") {
        lo.push(
          rutMoiPhieuChoStatement(env.DB, { partyId, policyId: muc.id, at, actorId: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "self_submission_withdrawn", at, targetType: "party", targetId: partyId, detail: "rút mọi phiếu đang chờ vì rút đồng ý" }, "changes() > 0"),
        );
      }
      await env.DB.batch(lo);
      return json({ dongY: quyetDinh === "DONG_Y" } satisfies DongYResponse);
    }),

    route("POST", "/api/parties/cua-toi/phieu", "staff", async ({ request, env, staff }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const body = await readJson(request);
      const at = new Date().toISOString();
      const { detail, chinhSach, tt } = await tinhTuKhai(env.DB, staff, at);
      const chan = lyDoKhongGhi(tt);
      if (chan) return tuChoi(chan);
      if (!chinhSach) return tuChoi(lyDoKhongGui(tt)!);
      if (body?.chinhSachId !== chinhSach.id) return POLICY_CHANGED();
      if (!tt.daDongY) return CONSENT_REQUIRED();
      const { dm, tenLoai, tenHang } = await danhMucGiayTo(env.DB, vnToday(new Date()));
      const k = kiemPhieuTuKhai(body, dm);
      if (!k.ok) return error(400, "invalid_input", k.message);
      const p = detail!.party;
      const n = k.value;
      // Ruling R12: trùng giá trị đang có thì không tạo phiếu vô nghĩa. Giấy tờ không kiểm (gia hạn). KHÔNG kiểm trùng CCCD với người khác (R8 — không dò số).
      if (n.loai === "NGAY_SINH" && p.birth_date === n.ngaySinh) return SAME_AS_CURRENT();
      // So với địa chỉ ĐANG MỞ; giá trị đang lưu chuẩn hoá như giá trị khai (NFC + gộp khoảng trắng — validateContact) vì dòng cũ / gieo thẳng có thể lưu dạng khác.
      const khoaDiaChi = (v: string) => v.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
      if (n.loai === "DIA_CHI" && detail!.contacts.some((c) => c.contact_kind_code === "ADDRESS" && c.valid_to_date === null && khoaDiaChi(c.value) === khoaDiaChi(n.diaChi))) {
        return SAME_AS_CURRENT();
      }
      const id = crypto.randomUUID();
      const g = n.loai === "GIAY_TO" ? n.giayTo : null;
      const chiTiet = `phiếu ${id} · ${nhanLoaiPhieu(n.loai)}${g ? ` · ${tenLoai(g.typeCode)}${g.classCode ? ` hạng ${tenHang(g.classCode)}` : ""}` : ""}`;
      try {
        const kq = await env.DB.batch([
          ghiPhieuStatement(env.DB, {
            id, partyId: p.id, loai: n.loai, policyId: chinhSach.id, ngaySinh: n.loai === "NGAY_SINH" ? n.ngaySinh : null, diaChi: n.loai === "DIA_CHI" ? n.diaChi : null,
            giayTo: g, at, actorId: staff.id,
          }),
          auditStatement(env.DB, { staffId: staff.id, action: "self_submission_created", at, targetType: "party", targetId: p.id, detail: chiTiet }, "changes() > 0"),
        ]);
        if ((kq[0]?.meta.changes ?? 0) !== 1) return CONSENT_REQUIRED(); // lính gác trong câu ghi: đồng ý bị rút trong khe
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        // Trigger *_one_pending_ins bắn trước; chỉ mục duy nhất một phần (chỉ mục BIỂU THỨC — SQLite báo "UNIQUE constraint failed: index '<tên>'", đã thử) là lớp
        // cuối. Tên bảng không viết ở tệp này (rào 5.23 — src/tu-khai-khong-len-nhan.test.ts (1)).
        if (/self_submission_pending_exists|UNIQUE constraint failed: index '\w*_one_pending_uq'/.test(m)) return SUBMISSION_PENDING();
        if (/self_submission_no_consent/.test(m)) return CONSENT_REQUIRED();
        if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại giấy tờ hoặc hạng không tồn tại.");
        throw e;
      }
      return kemLocation(json({ phieuId: id } satisfies PhieuTuKhaiTaoResponse, 201), "/account"); // H7 (ADR-0094 A-10): phiếu hiện ở khối "Hồ sơ của tôi" trang Tôi
    }),

    route("POST", "/api/parties/cua-toi/phieu/:pid/rut", "staff", async ({ env, staff, params }) => {
      if (!can(staff, "party.self.submit", { ownerId: staff.id })) return SELF_FORBIDDEN();
      const pid = idParam(params, "pid", UUID_RE);
      if (!pid || !staff.partyId) return SUBMISSION_NOT_FOUND();
      const r = await timPhieuCuaHoSo(env.DB, pid, staff.partyId); // chỉ phiếu của HỒ SƠ PHIÊN — phiếu người khác như không tồn tại (không dò được)
      if (!r) return SUBMISSION_NOT_FOUND();
      if (r.status !== "CHO_XAC_MINH") return SUBMISSION_NOT_PENDING();
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        rutPhieuStatement(env.DB, { id: pid, partyId: staff.partyId, at, actorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "self_submission_withdrawn", at, targetType: "party", targetId: staff.partyId, detail: `phiếu ${pid} · ${nhanLoaiPhieu(r.subject_kind)}` }, "changes() > 0"),
      ]);
      if ((kq[0]?.meta.changes ?? 0) !== 1) return SUBMISSION_NOT_PENDING();
      return json({ phieuId: pid, trangThai: "RUT" } satisfies PhieuTuKhaiRutResponse);
    }),

    // ---- Xác minh phiếu tự khai (ADR-0125 đ1, đ3, đ5, đ6; lát H-4 Gói 2) — khai TRƯỚC mọi /api/parties/:id…; cổng accounts (Quản trị, Toàn quyền, Nhân sự). ----
    // Hàng chờ: lọc cấp bậc (trừ Toàn quyền) → xác minh được trước, cũ trước → cắt 50 (R23: phiếu xác minh được không bị phiếu cũ chặn) → chuyenToanQuyen CHỈ cho 50 dòng.
    route("GET", "/api/parties/xac-minh", "accounts", async ({ env, url, staff, taiKhoanXacMinh, nhanNhanVien }) => {
      if (!can(staff, "party.verify")) return XM_FORBIDDEN();
      const trang = url.searchParams.get("trang") ?? "cho";
      if (trang !== "cho" && trang !== "da-xu-ly") return XM_TRANG_LA();
      const dsTk = await taiKhoanXacMinh();
      const theoId = new Map(dsTk.map((t) => [t.id, t]));
      const nguoi = nguoiXetCuaPhien(staff, dsTk);
      const xet = (phieu: PhieuXet, cham: Parameters<typeof xetNguoiXacMinh>[0]["cham"]) => xetNguoiXacMinh({ nguoi, phieu, chuPhieu: theoId.get(phieu.createdBy) ?? null, cham });
      if (trang === "da-xu-ly") {
        const rows = (await listPhieuDaXuLy(env.DB, TRAN_DOC_DA_XU_LY))
          .filter((r) => xet({ id: r.id, partyId: r.party_id, createdBy: r.created_by ?? "", createdAt: r.created_at }, []).lyDo !== "cap_bac")
          .slice(0, TRAN_HANG_CHO);
        const nhan = await nhanNhanVien([...new Set(rows.flatMap((r) => (r.decided_by ? [r.decided_by] : [])))]);
        return json({
          phieu: rows.map((r): PhieuDaXuLyDto => ({
            id: r.id, loai: r.subject_kind, ketLuan: r.status === "DA_CHAP_NHAN" ? "DA_CHAP_NHAN" : "TU_CHOI", lyDo: r.reason_code === null ? null : nhanLyDoTuChoi(r.reason_code),
            nguoiXuLy: (r.decided_by ? nhan?.get(r.decided_by) : null) ?? "Không rõ", luc: r.decided_at ?? r.created_at, coChamTaiKhoan: r.verifier_touched_account === 1,
          })),
        });
      }
      const rows = (await listPhieuCho(env.DB)).filter((r) => xet({ id: r.id, partyId: r.party_id, createdBy: r.created_by ?? "", createdAt: r.created_at }, []).lyDo !== "cap_bac");
      const cham = await chamCuaTaiKhoan(env.DB, [...new Set(rows.flatMap((r) => (r.created_by ? [r.created_by] : [])))]);
      const xetDu = rows.map((r) => {
        const phieu: PhieuXet = { id: r.id, partyId: r.party_id, createdBy: r.created_by ?? "", createdAt: r.created_at };
        return { r, phieu, kl: xet(phieu, cham) };
      });
      xetDu.sort((a, b) => Number(b.kl.duoc) - Number(a.kl.duoc) || (a.r.created_at < b.r.created_at ? -1 : a.r.created_at > b.r.created_at ? 1 : a.r.id < b.r.id ? -1 : 1));
      return json({
        phieu: xetDu.slice(0, TRAN_HANG_CHO).map(({ r, phieu, kl }): PhieuChoXacMinhDto => ({
          id: r.id, loai: r.subject_kind, tenHoSo: r.display_name, guiLuc: r.created_at,
          chuyenToanQuyen: chuyenToanQuyen(phieu, theoId.get(phieu.createdBy) ?? null, dsTk, cham), xacMinhDuoc: kl.duoc, lyDoKhong: lyDoKhongXacMinh(kl.lyDo),
        })),
      });
    }),

    route("GET", "/api/parties/xac-minh/:pid", "accounts", async ({ env, staff, params, taiKhoanXacMinh }) => {
      if (!can(staff, "party.verify")) return XM_FORBIDDEN();
      const pid = idParam(params, "pid", UUID_RE);
      const p = pid ? await timPhieuChoXet(env.DB, pid) : null;
      if (!p) return XM_NOT_FOUND();
      const dsTk = await taiKhoanXacMinh();
      const chuPhieu = dsTk.find((t) => t.id === p.created_by) ?? null;
      const phieu: PhieuXet = { id: p.id, partyId: p.party_id, createdBy: p.created_by ?? "", createdAt: p.created_at };
      const kl = xetNguoiXacMinh({ nguoi: nguoiXetCuaPhien(staff, dsTk), phieu, chuPhieu, cham: p.created_by ? await chamCuaTaiKhoan(env.DB, [p.created_by]) : [] });
      if (kl.lyDo === "cap_bac") return XM_NOT_FOUND(); // ngoài cấp bậc: như không có phiếu (không lộ)
      if (p.status !== "CHO_XAC_MINH") return XM_PROCESSED();
      const giayTo = p.document_type_code === null ? null : {
        tenLoai: p.type_name ?? p.document_type_code, soChe: cheSo(p.number_key), hang: p.class_name, ngayCap: p.issued_date, noiCap: p.issued_place, hetHan: p.expiry_date,
        coDongHienHanhCungLoai: (await listPersonDocuments(env.DB, p.party_id, true)).some(
          (d) => d.document_type_code === p.document_type_code && (p.license_class_code === null || d.license_class_code === p.license_class_code),
        ),
        trungHoSoKhac: p.number_key !== null && (await trungSoHoSoKhac(env.DB, p.party_id, p.number_key, p.document_type_code)),
      };
      return json({
        id: p.id, loai: p.subject_kind, tenHoSo: p.display_name, guiLuc: p.created_at, daGop: p.merged === 1, ngaySinh: p.birth_date, diaChi: p.address_value, giayTo,
        xacMinhDuoc: kl.duoc, lyDoKhong: lyDoKhongXacMinh(kl.lyDo), coAnh: false, // R4: chưa mở loại nối ảnh với phiếu tự khai
      } satisfies PhieuXacMinhChiTietDto); // json() mặc định cache-control: no-store
    }),

    // "Xem đủ số" của phiếu ĐANG CHỜ (ô party.verify.attachment). Thứ tự: 403 ô → 404 phiếu / ngoài cấp bậc → 403 đã xử lý → 404 phiếu không có số → 409 bị tách nhiệm vụ
    // → GHI NHẬT KÝ (chi tiết = mã phiếu + tên loại, KHÔNG số) → rồi mới trả số: ghi nhật ký lỗi thì ném lên (500), không trả số.
    route("POST", "/api/parties/xac-minh/:pid/xem-so", "accounts", async ({ env, staff, params, taiKhoanXacMinh }) => {
      if (!can(staff, "party.verify.attachment")) return XM_FORBIDDEN();
      const pid = idParam(params, "pid", UUID_RE);
      const p = pid ? await timPhieuChoXet(env.DB, pid) : null;
      if (!p) return XM_NOT_FOUND();
      const dsTk = await taiKhoanXacMinh();
      const chuPhieu = dsTk.find((t) => t.id === p.created_by) ?? null;
      const phieu: PhieuXet = { id: p.id, partyId: p.party_id, createdBy: p.created_by ?? "", createdAt: p.created_at };
      const kl = xetNguoiXacMinh({ nguoi: nguoiXetCuaPhien(staff, dsTk), phieu, chuPhieu, cham: p.created_by ? await chamCuaTaiKhoan(env.DB, [p.created_by]) : [] });
      if (kl.lyDo === "cap_bac") return XM_NOT_FOUND();
      if (p.status !== "CHO_XAC_MINH") return XM_PROCESSED();
      const so = await soDuCuaPhieuCho(env.DB, p.id);
      if (!so) return XM_NOT_FOUND(); // phiếu ngày sinh / địa chỉ không có số
      if (!kl.duoc) return error(409, "verify_conflict", lyDoKhongXacMinh(kl.lyDo) ?? "Bạn không xác minh được phiếu này.");
      await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "self_submission_number_viewed", at: new Date().toISOString(), targetType: "party", targetId: p.party_id, detail: `phiếu ${p.id} · ${so.type_name}` })]);
      return json({ so: so.document_number } satisfies PhieuXemSoResponse); // json() mặc định cache-control: no-store
    }),

    // Chấp nhận NGUYÊN VĂN giá trị khai (ADR-0125 đ4): MỘT db.batch theo thứ tự quyết (lính gác) → ghi giá trị → làm mới hồ sơ → dòng xác minh → nhật ký (đọc changes() của dòng xác minh).
    // Phiếu giấy tờ chưa có ảnh thì chưa chấp nhận được (ruling Q1/R18: hôm nay chưa có ảnh nào nối với phiếu); phiếu hồ sơ đã gộp chỉ từ chối được (R20).
    route("POST", "/api/parties/xac-minh/:pid/chap-nhan", "accounts", async ({ env, staff, params, taiKhoanXacMinh }) => {
      if (!can(staff, "party.verify")) return XM_FORBIDDEN();
      const pid = idParam(params, "pid", UUID_RE);
      const p = pid ? await timPhieuChoXet(env.DB, pid) : null;
      if (!p) return XM_NOT_FOUND();
      const cong = await congQuyet(env.DB, staff, p, await taiKhoanXacMinh());
      if ("loi" in cong) return cong.loi;
      const chan = lyDoKhongChapNhan({ loai: p.subject_kind, daGop: p.merged === 1, coAnh: false });
      if (chan) return error(409, chan.code, chan.message);
      const at = new Date().toISOString();
      const t = { id: p.id, actorId: staff.id, at };
      const mocId = crypto.randomUUID();
      const khoaDiaChi = (p.address_value ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
      const cauGhi = p.subject_kind === "NGAY_SINH"
        ? [ghiNgaySinhTuPhieuStatement(env.DB, t), lamMoiHoSoTuPhieuStatement(env.DB, t), ghiXacMinhTuPhieuStatement(env.DB, { ...t, targetKind: "ATTRIBUTE", targetId: null, attributeCode: "NGAY_SINH" })]
        : p.subject_kind === "DIA_CHI"
          ? [ghiDiaChiTuPhieuStatement(env.DB, { ...t, contactId: mocId, valueNormalized: khoaDiaChi, today: vnToday(new Date()) }), lamMoiHoSoTuPhieuStatement(env.DB, t),
            ghiXacMinhTuPhieuStatement(env.DB, { ...t, targetKind: "CONTACT", targetId: mocId, attributeCode: null })]
          : [ghiGiayToTuPhieuStatement(env.DB, { ...t, documentId: mocId }), lamMoiHoSoTuPhieuStatement(env.DB, t),
            ghiXacMinhTuPhieuStatement(env.DB, { ...t, targetKind: "PERSON_DOCUMENT", targetId: mocId, attributeCode: null })];
      const lo = [
        quyetPhieuStatement(env.DB, { id: p.id, ketLuan: "DA_CHAP_NHAN", lyDo: null, actorId: staff.id, at, laToanQuyen: staff.permissions.includes("SUPER_ADMIN") }),
        ...cauGhi,
        auditStatement(env.DB, { staffId: staff.id, action: "self_submission_accepted", at, targetType: "party", targetId: p.party_id,
          detail: `phiếu ${p.id} · ${nhanLoaiPhieu(p.subject_kind)}${cong.kl.coCham ? " · cờ chạm tài khoản" : ""}` }, "changes() > 0"),
      ];
      let kq: D1Result[];
      try {
        kq = await env.DB.batch(lo);
      } catch (e) {
        const l = loiLoChapNhan(e);
        if (l) return error(l.status, l.code, l.message);
        throw e;
      }
      if ((kq[0]?.meta.changes ?? 0) === 0) {
        // Lính gác từ chối trong câu ghi: người khác vừa quyết xong, hoặc tài khoản vừa bị chạm — đọc lại để trả đúng lý do.
        const lai = await timPhieuChoXet(env.DB, p.id);
        return lai && lai.status === "CHO_XAC_MINH" ? error(409, "verify_conflict", NHAN_LY_DO_CHAN.da_cham!) : XM_KHONG_CHO();
      }
      return json({ ok: true });
    }),

    // Từ chối theo danh sách đóng (ADR-0125 đ6): thân chỉ { lyDo: mã }; chỉ đổi trạng thái phiếu + nhật ký (không giá trị, không dòng xác minh; Toàn quyền từ chối không cờ — ruling Q5).
    route("POST", "/api/parties/xac-minh/:pid/tu-choi", "accounts", async ({ request, env, staff, params, taiKhoanXacMinh }) => {
      if (!can(staff, "party.verify")) return XM_FORBIDDEN();
      const k = kiemTuChoi(await readJson(request));
      if (!k.ok) return error(400, "invalid_input", k.message);
      const pid = idParam(params, "pid", UUID_RE);
      const p = pid ? await timPhieuChoXet(env.DB, pid) : null;
      if (!p) return XM_NOT_FOUND();
      const cong = await congQuyet(env.DB, staff, p, await taiKhoanXacMinh());
      if ("loi" in cong) return cong.loi;
      const at = new Date().toISOString();
      let kq: D1Result[];
      try {
        kq = await env.DB.batch([
          quyetPhieuStatement(env.DB, { id: p.id, ketLuan: "TU_CHOI", lyDo: k.value.lyDo, actorId: staff.id, at, laToanQuyen: staff.permissions.includes("SUPER_ADMIN") }),
          auditStatement(env.DB, { staffId: staff.id, action: "self_submission_rejected", at, targetType: "party", targetId: p.party_id, detail: `phiếu ${p.id} · ${nhanLoaiPhieu(p.subject_kind)} · lý do ${k.value.lyDo}` }, "changes() > 0"),
        ]);
      } catch (e) {
        const l = loiLoChapNhan(e);
        if (l) return error(l.status, l.code, l.message);
        throw e;
      }
      if ((kq[0]?.meta.changes ?? 0) === 0) {
        const lai = await timPhieuChoXet(env.DB, p.id);
        return lai && lai.status === "CHO_XAC_MINH" ? error(409, "verify_conflict", NHAN_LY_DO_CHAN.da_cham!) : XM_KHONG_CHO();
      }
      return json({ ok: true });
    }),

    // ---- Hàng "chờ xoá" của kho tệp hồ sơ (ADR-0123 đ6; Hiến chương 5.16; ruling Q4: chỉ Toàn quyền) — khai TRƯỚC GET /api/parties/:id. DTO chỉ mã. -------
    route("GET", "/api/parties/tep-cho-xoa", "office", async ({ env, staff }) => {
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const { ds, conNua } = await listTepChoXoa(env.DB, new Date(Date.now() - DO_DANG_SAU_MS).toISOString());
      return json({
        tep: ds.map((t) => ({ id: t.id, trangThai: t.purged_at === null ? ("TAI_DO_DANG" as const) : ("CHO_XOA" as const), lyDo: t.purge_reason, luc: t.purged_at ?? t.created_at })),
        conNua,
      } satisfies HoSoTepChoXoaResponse);
    }),

    // Chạy lại: (1) tệp tải dở dang ⇒ MỘT lô quyết xoá TAI_LEN_DO_DANG (câu có điều kiện: còn chưa lưu, còn quá mốc — tệp vừa lưu xong trong khe không bị đụng)
    // + nhật ký chỉ mã; (2) ĐỌC LẠI hàng chờ, chỉ lấy dòng ĐÃ quyết xoá; (3) xoá kho rồi đánh dấu (kho-tep.ts — lỗi không ném); (4) một dòng nhật ký tổng.
    // Không bao giờ xoá kho cho dòng chưa quyết xoá trong CSDL (bước 2).
    route("POST", "/api/parties/tep-cho-xoa/chay-lai", "office", async ({ env, staff }) => {
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const moc = new Date(Date.now() - DO_DANG_SAU_MS).toISOString();
      const at = new Date().toISOString();
      const lo = (await listTepChoXoa(env.DB, moc)).ds
        .filter((t) => t.purged_at === null)
        .flatMap((t) =>
          cauDatChoXoa(env.DB, datChoXoaTepStatement(env.DB, { id: t.id, lyDo: LY_DO_XOA_TEP.TAI_LEN_DO_DANG, at, actorId: staff.id, doDangTruoc: moc }), t, LY_DO_XOA_TEP.TAI_LEN_DO_DANG, at, staff.id));
      if (lo.length > 0) await env.DB.batch(lo);
      const canXoa = (await listTepChoXoa(env.DB, moc)).ds.filter((t) => t.purged_at !== null);
      const kq = await xoaKhoiKho(env.DB, kho, canXoa, () => new Date().toISOString());
      // Không có việc (không lô quyết xoá, không dòng nào để xoá kho) ⇒ không ghi nhật ký (m-5 vòng sửa nhóm C — bấm lại nhiều lần không làm đầy nhật ký).
      if (lo.length === 0 && canXoa.length === 0) return json({ daXoa: 0, conLai: 0 } satisfies HoSoTepChayLaiResponse);
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_purge_retried", at: new Date().toISOString(), targetType: "system", targetId: "ho-so-tep", detail: `đã xoá ${kq.daXoa}, còn ${kq.loi}` }),
      ]);
      return json({ daXoa: kq.daXoa, conLai: kq.loi } satisfies HoSoTepChayLaiResponse);
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
      let danhDau: D1PreparedStatement | null = null;
      let detail: string;
      if (s.huy) {
        ghi = voidPersonDocStatement(env.DB, did, id, s.expectedUpdatedAt, staff.id, at);
        detail = chiTietNhatKy({ loai, lyDo: s.lyDo });
      } else {
        const moi: PersonDocValues = { ...hienHanh };
        if (s.truong === "number") Object.assign(moi, { number: s.giaTri, numberKey: s.giaTri === null ? null : chuanHoaSo(s.giaTri) });
        else moi[s.truong] = s.giaTri;
        ghi = updatePersonDocStatement(env.DB, did, id, s.expectedUpdatedAt, moi, staff.id, at);
        danhDau = canXacMinhLaiStatement(env.DB, { partyId: id, targetKind: "PERSON_DOCUMENT", targetId: did, attributeCode: null, expectedUpdatedAt: s.expectedUpdatedAt, actorId: staff.id, at }); // đứng TRƯỚC câu sửa (cùng mốc kỳ vọng)
        // Trước → sau CHỈ cho ngày (YYYY-MM-DD) và hạng (tên hạng); số và nơi cấp không bao giờ vào nhật ký (chiTietNhatKy còn tự bỏ nếu lỡ truyền).
        const [truoc, sau] =
          s.truong === "issuedDate" || s.truong === "expiryDate" ? [hienHanh[s.truong], moi[s.truong]]
          : s.truong === "classCode" ? [d.tenHang(hienHanh.classCode), d.tenHang(moi.classCode)]
          : [null, null];
        detail = chiTietNhatKy({ loai, lyDo: s.lyDo, truoc, sau });
      }
      let results: D1Result[];
      try {
        // ADR-0125 R16: câu đánh dấu "cần xác minh lại" (nếu có) đứng TRƯỚC câu sửa; câu sửa vẫn là ngay trước nhật ký (changes() > 0 đọc câu sửa).
        const lo = [...(danhDau ? [danhDau] : []), ghi, auditStatement(env.DB, { staffId: staff.id, action: "party_document_corrected", at, targetType: "party", targetId: id, detail }, "changes() > 0")];
        results = await env.DB.batch(lo);
        if (danhDau) results = results.slice(1);
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

    // ---- Kho tệp hồ sơ (ADR-0123; lát H-2 Gói 2) — ruling Q1: tải lên cần CẢ party.document.write LẪN party.attachment.view (= chỉ Toàn quyền). -----------
    // Thứ tự: 403 ô → 503 kho → 404 hồ sơ → 403 cấp bậc → 409 đã gộp → 400 không phải người → 404 / 409 dòng giấy tờ → 413 Content-Length (TRƯỚC khi đọc thân)
    // → 400 / 413 / 415 nội dung → (1) LÔ D1 TRƯỚC: dòng tệp + dòng nối + nhật ký chỉ mã (ruling Q2) → (2) đặt kho → (3) đánh dấu đã lưu.
    // Kho hỏng ở (2) ⇒ quyết xoá TAI_LEN_LOI rồi xoá kho (5.16) ⇒ 500. (3) hỏng ⇒ dòng "tải dở dang", lệnh chạy lại xử lý. Hai lần ghi D1 trong một yêu cầu là CÓ
    // CHỦ Ý — route có tên trong GHI_NHIEU_LAN (src/shared/lan-gui-no.ts, ruling Q6). Bài src/kho-tep-ho-so.test.ts (4) ghim thứ tự TOI_DA_THAN → readJson, env.DB.batch → kho.put.
    route("POST", "/api/parties/:id/documents/:did/tep", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.document.write") || !can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const id = idParam(params, "id", PARTY_ID_RE);
      const party = id ? await findParty(env.DB, id) : null;
      if (!id || !party) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      if (party.merged_into_id) return DA_GOP();
      if (party.party_kind !== "PERSON") return error(400, "invalid_input", "Giấy tờ chỉ gắn với hồ sơ cá nhân.");
      const did = idParam(params, "did", DOC_ID_RE);
      const cu = did ? await findPersonDocument(env.DB, did, id) : null;
      if (!did || !cu) return DOC_NOT_FOUND();
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN) return error(413, "file_too_large", "Tệp lớn hơn 10 MB.");
      const k = kiemTepTaiLen(await readJson(request));
      if (!k.ok) return error(k.status, k.code, k.message);
      const now = new Date();
      const at = now.toISOString();
      const tepId = crypto.randomUUID();
      const key = khoaNgauNhien();
      const bam = await bamSha256(k.bytes);
      const tenLoai = (await danhMucGiayTo(env.DB, vnToday(now))).tenLoai(cu.document_type_code);
      try {
        await env.DB.batch([
          insertTepStatement(env.DB, { id: tepId, partyId: id, key, loai: k.loai, kichThuoc: k.bytes.length, bam, at, actorId: staff.id }),
          insertTepLinkStatement(env.DB, { tepId, kind: "PERSON_DOCUMENT", targetId: did, at, actorId: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_added", at, targetType: "party", targetId: id, detail: `${tenLoai} · tệp ${tepId}` }),
        ]);
      } catch (e) {
        // Dòng giấy tờ bị gia hạn thay / huỷ trong khe giữa lúc kiểm và lúc ghi (trigger 0104) — cả lô huỷ, chưa chạm kho; cùng câu với lời kiểm ở trên (m-4).
        if (/attachment_link_target_stale/.test(e instanceof Error ? e.message : "")) return DOC_NOT_CURRENT();
        throw e;
      }
      try {
        await kho.put(key, k.bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[k.loai] } });
      } catch (e) {
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_tai_len_loi", tepId, loi: e instanceof Error ? e.name : "unknown" }));
        try {
          const luc = () => new Date().toISOString();
          const lucXoa = luc();
          const lo = cauDatChoXoa(env.DB, datChoXoaTepStatement(env.DB, { id: tepId, lyDo: LY_DO_XOA_TEP.TAI_LEN_LOI, at: lucXoa, actorId: staff.id }), { id: tepId, party_id: id }, LY_DO_XOA_TEP.TAI_LEN_LOI, lucXoa, staff.id);
          await ghiRoiXoaKho(env.DB, kho, lo, [{ id: tepId, storage_key: key }], luc);
        } catch (e2) {
          // Dòng còn "tải dở dang" — POST /api/parties/tep-cho-xoa/chay-lai xử lý sau DO_DANG_SAU_MS; R-PTY-12 báo sau 1 giờ.
          console.error(JSON.stringify({ level: "error", event: "ho_so_tep_danh_dau_xoa_loi", tepId, loi: e2 instanceof Error ? e2.name : "unknown" }));
        }
        return error(500, "upload_failed", "Không tải tệp lên được. Thử lại sau ít phút.");
      }
      let daDanhDau = 0;
      try {
        daDanhDau = await markTepStored(env.DB, tepId, new Date().toISOString());
      } catch (e) {
        // Lần ghi thứ hai hỏng (ruling Q6): KHÔNG báo "đã tải" — dòng thành "tải dở dang", lệnh chạy lại quyết xoá + xoá kho sau DO_DANG_SAU_MS.
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_danh_dau_luu_loi", tepId, loi: e instanceof Error ? e.name : "unknown" }));
        return error(500, "upload_failed", "Không tải tệp lên được. Thử lại sau ít phút.");
      }
      if (daDanhDau !== 1) {
        // Câu đánh dấu không đổi được dòng (m-3 vòng sửa nhóm C): tệp đã bị quyết xoá trong khe ⇒ nằm ở hàng "chờ xoá" (hoặc còn "tải dở dang") — KHÔNG báo 201.
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_danh_dau_luu_khong_doi", tepId }));
        return error(500, "upload_failed", "Không tải tệp lên được. Thử lại sau ít phút.");
      }
      return kemLocation(json({ tep: { id: tepId, loai: k.loai, kichThuoc: k.bytes.length, taiLuc: at } } satisfies HoSoTepCreatedResponse, 201), `/parties?id=${id}`);
    }),

    route("GET", "/api/parties/:id/documents/:did/tep", "office", async (ctx) => {
      const { env, params, staff } = ctx;
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const did = idParam(params, "did", DOC_ID_RE);
      if (!id || !did) return DOC_NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      if (!(await findPersonDocument(env.DB, did, id))) return DOC_NOT_FOUND();
      const ds = await listTepCuaGiayTo(env.DB, id, did);
      return json({ tep: ds.map((r) => ({ id: r.id, loai: r.content_kind, kichThuoc: r.byte_size, taiLuc: r.stored_at })) } satisfies HoSoTepListResponse);
    }),

    // Tải xuống (ADR-0123 đ3; Hiến chương 5.22): GET — thẻ ảnh dùng được, và KHÔNG đi qua lớp chống ghi trùng (lớp đó lưu thân phản hồi để phát lại — ruling R4).
    // Thứ tự: 403 ô → 503 kho → 404 mã → 403 cấp bậc → 404 tệp (chưa lưu / đã quyết xoá / không thuộc dòng giấy tờ của hồ sơ) → GHI NHẬT KÝ chỉ mã → đọc kho →
    // thân + header no-store, nosniff. Ghi nhật ký lỗi thì ném lên (500), KHÔNG đọc kho. Bài src/kho-tep-ho-so.test.ts (3) ghim thứ tự can → auditStatement → kho.get (bài đếm chữ "kho.get" kèm ngoặc
    // trên mã nguồn thô — chú thích đừng viết kèm ngoặc).
    route("GET", "/api/parties/:id/documents/:did/tep/:tid", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      // GET không qua lớp chặn gọi chéo trang của router (lớp đó chỉ cho lệnh ghi) — chặn yêu cầu do trang khác phát ra (ruling R4). DANH SÁCH CHO PHÉP
      // (vòng sửa nhóm C, m-1): chỉ same-origin, none (người dùng gõ / mở thẳng) hoặc vắng header (máy khách cũ); same-site (tên miền phụ) và giá trị lạ bị chặn.
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const id = idParam(params, "id", PARTY_ID_RE);
      const did = idParam(params, "did", DOC_ID_RE);
      const tid = idParam(params, "tid", DOC_ID_RE);
      if (!id || !did || !tid) return TEP_NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      const tep = await findTepDeTai(env.DB, id, did, tid);
      if (!tep) return TEP_NOT_FOUND();
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_viewed", at: new Date().toISOString(), targetType: "party", targetId: id, detail: `${tep.type_name} · tệp ${tep.id}` }),
      ]);
      const obj = await kho.get(tep.storage_key);
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_thieu_doi_tuong", tepId: tep.id }));
        return TEP_NOT_FOUND();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTep({ id: tep.id, loai: tep.content_kind }) });
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
      if (t instanceof Response) return t;
      const xemDiaChiA = xemDuocRiengTu(nguoiXemRiengTu(staff, id, t.A.acc));
      const dto = xemTruocDto(t, xemDiaChiA);
      // ADR-0122 đ5: báo TRƯỚC lý do mà route gộp sẽ trả 403 (chuyển địa chỉ sang hồ sơ chính người gọi không ghi được) — nút gộp khoá theo `chan`.
      const lyDo = t.ke.lienHe.mo.some((m) => laLienHeRiengTu(m.tu.kind)) ? lyDoChanGhiRiengTu(staff, into, t.B.acc) : null;
      if (lyDo) dto.chan.push({ code: lyDo.code, message: lyDo.message });
      return json(dto satisfies MergePreviewResponse);
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
      // ADR-0122 đ5 (ruling R12: từ chối, không lặng lẽ bỏ dòng): gộp chuyển liên hệ ĐỊA CHỈ sang hồ sơ chính = ghi trường riêng tư của hồ sơ chính — chính chủ
      // không tự ghi, Quản trị theo cấp bậc. Đứng sau lý do chặn của kế hoạch (câu hợp ngữ cảnh hơn) và trước câu xác nhận tên.
      if (t.ke.lienHe.mo.some((m) => laLienHeRiengTu(m.tu.kind))) {
        const chan = chanGhiRiengTu(staff, into, t.B.acc);
        if (chan) return chan;
      }
      if (chuanHoaTen(typeof body?.xacNhan === "string" ? body.xacNhan : "") !== chuanHoaTen(t.A.hs.displayName)) return MERGE_CONFIRM();
      const at = now.toISOString();
      // ADR-0123 + ruling R15: ảnh còn hiệu lực của các dòng giấy tờ ĐƯỢC CHÉP đi theo (dòng nối mới, đứng sau câu lật). Ảnh tải lên trong khe giữa lúc đọc
      // này và lúc ghi lô không đi theo — nằm lại ở dòng đã huỷ của A (chấp nhận, Review Focus kế hoạch H-2).
      const tepTheoGiayTo = await tepCuaGiayTo(env.DB, t.ke.giayTo.chep.map((d) => d.id));
      const lo = loGop(env.DB, { a: id, b: into, ke: t.ke, giayToDu: new Map(t.A.giayToDu.map((d) => [d.id, d])), tepTheoGiayTo, homNay: t.homNay, at, actorId: staff.id });
      const detail = chiTietGop(t);
      // Thứ tự (kế hoạch R1, R2): phần parties → câu đổi người đặt đơn (thấy "A còn đang dùng") → câu LẬT A → hai dòng nhật ký `changes() > 0` → dòng nối ảnh
      // (trigger cần A đã trỏ B). Vị trí câu lật tính TƯỜNG MINH (không đếm từ cuối — đuôi lô dài ngắn theo số ảnh).
      const iLat = lo.truocDon.length + 1;
      const stmts = [
        ...lo.truocDon,
        ctx.gopHoSo.cauDoiDon(id, into, at),
        lo.lat,
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: id, detail }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: into, detail }, "changes() > 0"),
        ...lo.sauNhatKy,
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
      if ((results[iLat]!.meta.changes ?? 0) === 0) return MERGE_LOST_RACE();
      return respondParty(ctx, into);
    }),

    // ---- Tạo / xem / sửa -----------------------------------------------------------------------------------------------
    route("POST", "/api/parties", "office", async (ctx) => {
      const { request, env, staff } = ctx;
      if (!can(staff, "party.write")) return FORBIDDEN_WRITE();
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const parsed = validatePartyCreate(await readJson(request), today);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0122 đ5 (ruling R12): gửi ngày sinh / địa chỉ khi không giữ ô ⇒ 403, không lặng lẽ bỏ.
      if ((v.kind === "PERSON" && v.birthDate !== null) || v.contacts.some((c) => laLienHeRiengTu(c.kind))) {
        const chan = chanGhiRiengTu(staff, null, null);
        if (chan) return chan;
      }
      const made =
        v.kind === "PERSON"
          ? newPersonStatements(env.DB, { name: v.name, gender: v.gender, birthDate: v.birthDate, contacts: v.contacts, contactsFrom: today }, staff.id, at)
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
      const now = new Date();
      const parsed = validatePartyUpdate(await readJson(request), current.party_kind, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (acc.linked && parsed.value.active !== (current.active === 1)) return ACTIVE_BY_ACCOUNT();
      // Ruling D17 (b): hồ sơ công ty chủ không ngưng dùng được (kể cả người giữ ô) — muốn thôi dùng thì đổi công ty chủ trước. PUT là đường DUY NHẤT đặt active.
      if (chu && !parsed.value.active) return OWNER_COMPANY_KEEP_ACTIVE();
      const at = now.toISOString();
      // ADR-0084 Đ1: vắng ô giới tính ⇒ giữ giá trị đang lưu. Nhật ký chỉ ghi "đổi giới tính" — KHÔNG giá trị cũ / mới (cùng lối dữ liệu cá nhân).
      const pv = parsed.value;
      // ADR-0122 đ5: ô ngày sinh CÓ mặt (kể cả để xoá) ⇒ phải giữ party.personal.view, không phải chính chủ, qua cấp bậc. VẮNG ⇒ giữ giá trị đang lưu
      // (Review Focus 1: Bán hàng đổi tên không được xoá ngày sinh họ không thấy).
      if (pv.kind === "PERSON" && pv.birthDate !== undefined) {
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
      const gioiTinhCu = gioiTinhHopLe(current.gender);
      const ngaySinhCu = current.birth_date;
      const v = pv.kind === "PERSON"
        ? { ...pv, gender: pv.gender === undefined ? gioiTinhCu : pv.gender, birthDate: pv.birthDate === undefined ? ngaySinhCu : pv.birthDate }
        : pv;
      const doiGioiTinh = v.kind === "PERSON" && v.gender !== gioiTinhCu;
      const doiNgaySinh = v.kind === "PERSON" && v.birthDate !== ngaySinhCu;
      const stmts = updatePartyStatements(env.DB, id, v, staff.id, at, doiNgaySinh);
      // Nhật ký chỉ ghi "đổi giới tính" / "đổi ngày sinh" — KHÔNG giá trị (Hiến chương 5.20).
      const detail = `${KIND_LABEL[current.party_kind]}${doiGioiTinh ? " — đổi giới tính" : ""}${doiNgaySinh ? " — đổi ngày sinh" : ""}`;
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
      if (laLienHeRiengTu(c.kind)) {
        if (detail.party.party_kind !== "PERSON") return error(400, "invalid_input", "Địa chỉ của tổ chức ghi ở ô Địa chỉ của hồ sơ, không thêm như liên hệ.");
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
      // Chưa có liên hệ CHÍNH đang mở cùng loại thì liên hệ này tự thành liên hệ chính. Hỏi "chính đang mở" chứ không phải "còn dòng
      // nào đang mở": sau khi đóng liên hệ chính mà vẫn còn dòng phụ, hồ sơ sẽ kẹt ở trạng thái không có liên hệ chính.
      const hasOpenPrimary = detail.contacts.some((x) => x.contact_kind_code === c.kind && x.is_primary === 1 && x.valid_to_date === null);
      if (!hasOpenPrimary) c.isPrimary = true;
      const now = new Date();
      const at = now.toISOString();
      await env.DB.batch([
        ...addContactStatements(env.DB, id, c, vnToday(now), staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: CHI_TIET_THEM_LIEN_HE[c.kind] ?? "thêm liên hệ" }),
      ]);
      return kemLocation(await respondParty(ctx, id, 201), `/parties?id=${id}`);
    }),

    route("POST", "/api/parties/:id/contacts/:cid/end", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      const id = idParam(params, "id", PARTY_ID_RE);
      const cid = idParam(params, "cid", ROW_ID_RE);
      const chiTiet = id ? await getPartyDetail(env.DB, id) : null;
      if (!id || !cid || !chiTiet) return NOT_FOUND();
      const [acc, chu]: [PartyAccountVerdict, boolean] = await Promise.all([ctx.partyAccount(id), laCongTyChu(env.DB, id)]);
      // ADR-0024 6.4: đóng liên hệ của hồ sơ công ty chủ (vd Hotline — biên nhận báo lỗi nếu hết Hotline) — chỉ ô company.legal.write.
      if (chu ? !can(staff, "company.legal.write") : acc.linked ? !(can(staff, "party.staff.write") && acc.manageable) : !can(staff, "party.write")) {
        return chu ? OWNER_COMPANY_FORBIDDEN() : FORBIDDEN_WRITE();
      }
      if (chiTiet.party.merged_into_id) return DA_GOP();
      // ADR-0122 đ5 (Review Focus 4): đóng liên hệ ĐỊA CHỈ cũng là ghi trường riêng tư — kể cả khi người gọi đoán được id dòng.
      const lienHe = chiTiet.contacts.find((x) => x.id === cid);
      if (lienHe && laLienHeRiengTu(lienHe.contact_kind_code)) {
        const chan = chanGhiRiengTu(staff, id, acc);
        if (chan) return chan;
      }
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
      // Ruling 7 (kiểm độc lập Task 2): loại đối tác không đặt trước ngày kết thúc — view v_pty_party_partner_label, trigger *_partner_label_conflict và
      // hoSoMangNhanDoiTac chỉ đếm dòng valid_to_date IS NULL, nên dòng có hạn sẽ làm chiều 2 lọt. Thôi thì bấm "Kết thúc" (khuôn ownerCompanyAssignProblem).
      if (loai?.partnerLabel && parsed.value.to !== null) return error(400, "invalid_input", "Loại đối tác không đặt trước ngày kết thúc — khi thôi thì bấm “Kết thúc”.");
      // Ruling 9 (kiểm toàn nhánh): cùng gốc với Ruling 7 — phía tiền đọc vai «đang mở» chỉ theo valid_to_date IS NULL (v_pty_open_role, LA_HUONG, VAI_MO), bỏ qua
      // valid_from_date, nên loại có ngày bắt đầu tương lai thành người hưởng NGAY. Loại đối tác có hiệu lực từ hôm nay (ngày quá khứ vẫn nhận). Không migration.
      if (loai?.partnerLabel && parsed.value.from > today) return error(400, "invalid_input", "Loại đối tác có hiệu lực từ hôm nay — không đặt ngày bắt đầu trong tương lai.");
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
      const homNay = vnToday(now);
      const to = validateEndDate(await readJson(request), homNay);
      if (!to.ok) return error(400, "invalid_input", to.message);
      // Ruling 8 (kiểm độc lập Task 2, cùng gốc Ruling 7): loại đối tác chỉ kết thúc HÔM NAY hoặc ngày đã qua — dòng có ngày kết thúc tương lai không còn
      // valid_to_date IS NULL nên view v_pty_party_partner_label / trigger / hoSoMangNhanDoiTac coi như hết nhãn trong khi nhãn vẫn còn hiệu lực ⇒ chiều 2 lọt.
      if (row && to.value > homNay && (await roleTypeOf(env.DB, row.code))?.partnerLabel) {
        return error(400, "invalid_input", "Loại đối tác kết thúc ngay hôm nay hoặc ngày đã qua — không đặt ngày trong tương lai.");
      }
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
