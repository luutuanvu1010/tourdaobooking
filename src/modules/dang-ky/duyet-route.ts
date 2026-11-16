// Route của người trong công ty ở bước DUYỆT MỞ TÀI KHOẢN từ phiếu đăng ký (ADR-0207 Đ1, Đ4–Đ7, Đ9; ADR-0208 Đ5, Đ6; đợt 1 Task 8). Cổng `accounts`; MỖI route hỏi `account.create` trong thân
// (index.ts). Nhân sự KHÔNG xem Danh bạ: màn duyệt chỉ có họ tên, số điện thoại, loại xin, kết luận từng mục và kiểu kết luận Danh bạ (không tên hồ sơ nếu người xem không có `party.view`).
// Lệnh duyệt = MỘT `db.batch` do gốc lắp ráp ghép (`ctx.loDuyetDangKy`, ADR-0206 Đ2): câu 1 là câu chốt (trigger dk_decision_guard làm hỏng CẢ lô). Các kiểm trước lô chỉ để trả câu báo rõ;
// lô vẫn an toàn khi không có chúng (chỉ mục duy nhất staff.phone, staff_party_uq, dk_decision_once_uq; trigger CCCD một người, vai, quan hệ).
// Nhật ký và lịch sử phiếu không chứa SĐT, email, số giấy tờ, ngày sinh, địa chỉ; câu báo lỗi không nhắc lại dữ liệu khai, không nói số điện thoại thuộc tài khoản nào.
import type { LoDuyetDangKyVao } from "../../shared/dang-ky-duyet.ts";
import { CAU_LOAI_DA_TAT } from "../../shared/dang-ky-chon-vai.ts";
import { ketQuaCapChoNguoiXem } from "../../shared/cap-se-ap-hien-thi.ts";
import { MUC_XAC_MINH_MO_CA_NHAN, MUC_XAC_MINH_MO_TO_CHUC } from "../../shared/dau-xac-minh.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { can } from "../../shared/permissions.ts";
import { normalizePhone } from "../../shared/phone.ts";
import { groupOf, isRoleCode, roleAssignmentProblem, type RoleCode } from "../../shared/roles.ts";
import type { Ctx } from "../../shared/router.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { auditStatement } from "../audit";
import { canCuocThuocHoSoKhac, cauGoTepChoNeuTruocDoi, partySummary, tenLoaiVai, toChucDichHopLe, trungToChucKhac, validateContact, xoaKhoTepChoDaGo } from "../parties";
import { findStaffByPhone, tenVaiTaiKhoan } from "../staff";
import {
  banKhaiDeDuyet, banKhaiToChucDayDu, cauXepThu, chinhSachHienHanh, danhTinhConEmail, emailLienLacCuaPhieu, guiLaiLoiMoiStatement, ketLuanMoiNhat, phieuXet, suKienNhanVienStatement, tomTatDeDuyet,
  traVeXacMinhStatement, tuChoiDuyetStatement,
} from "./repository.ts";
import { maLenhThu } from "./rules.ts";
import { kiemVaiKhiDuyet, vaiChonKhiDuyet } from "./vai.ts";
import { lienKetLoDuyet, MOI_TRUONG_MO, phanCuaVai, vaiCaNhanRongDuoc } from "../../shared/dang-ky-vai.ts";
import { guiThuSauLo } from "./thu-bao.ts";
import { kiemDuyet, kiemLyDoDuyet, kiemTraVe, laMaPhieu, loiDungLoDuyet, loiLoDuyet } from "./xac-minh.ts";
import { dsMuc, kiemHoSoDich, kiemNguoiGioiThieu, moiNhat, mucPhaiDat, tachMuc } from "./xac-minh-route.ts";

export const CAM_DUYET = () => error(403, "forbidden", "Bạn không có quyền duyệt phiếu đăng ký.");
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy phiếu.");
const KHONG_CON_CHO = () => error(409, "registration_state_changed", "Phiếu vừa được người khác xử lý hoặc không còn chờ duyệt. Hãy mở lại phiếu.");
const DOI_PHIEN_BAN = () => error(409, "registration_version_changed", "Phiếu đã thay đổi từ lúc bạn mở. Hãy mở lại phiếu để xem bản mới.");
const NGAY_MS = 24 * 3600 * 1000;
const DANH_TINH_DA_AN = () =>
  error(409, "registration_identity_erased", "Đã quá hạn đặt mã PIN và cả thời gian chờ thêm, nên thông tin liên lạc của người đăng ký đã được xoá và không gửi lại lời mời được nữa. Tài khoản vẫn tắt; hãy báo Toàn quyền quyết định cách xử lý.");

/** Dòng màn duyệt khi phiếu gắn vào hồ sơ tổ chức có sẵn (ADR-0212 Đ5 mục 3; ADR-0213 Đ6): người đăng ký không tự thành người quản lý. */
export const GHI_CHU_TO_CHUC_CO_SAN = "Gắn vào hồ sơ tổ chức có sẵn: người đăng ký không tự thành người quản lý của tổ chức — văn phòng sẽ giao người quản lý.";

const idPhieu = (params: Record<string, string>): string | null => (laMaPhieu(params.id) ? params.id! : null);

/** Hạn đặt PIN = `at` + `activation_days` của dòng chính sách hiệu lực (PHU-LUC: 14 ngày). Không có dòng ⇒ null (route 503, không đoán con số). */
async function hanKichHoat(db: D1Database, at: string): Promise<string | null> {
  const cs = await chinhSachHienHanh(db, at);
  return cs ? new Date(Date.parse(at) + cs.activation_days * NGAY_MS).toISOString() : null;
}

// ---- GET /api/dang-ky/phieu/:id/xem-duyet ----
export async function xemDeDuyet({ env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const ten = await tenLoaiVai(env.DB);
  // Vai của tổ chức đi kèm (Task 13): màn duyệt chọn lại được; phiếu «chỉ tổ chức» có `loai` rỗng.
  const tomTatPhieu = {
    id: p.id, loai: p.role_code, tenLoai: ten.get(p.role_code) ?? p.role_code, loaiToChuc: p.org_role_code, tenLoaiToChuc: p.org_role_code ? (ten.get(p.org_role_code) ?? p.org_role_code) : null,
    trangThai: p.status, phienBan: p.current_version,
  };
  if (p.status !== "CHO_DUYET" || p.current_version < 1) return json({ ...tomTatPhieu, daXuLy: true });
  const bk = await tomTatDeDuyet(env.DB, p.id, p.current_version);
  if (!bk) return json({ ...tomTatPhieu, daXuLy: true });
  const [batBuoc, kl] = await Promise.all([mucPhaiDat(env.DB, new Date().toISOString(), p), moiNhat(env.DB, p)]);
  const vaiChon = await vaiChonKhiDuyet(env.DB);
  const dich = p.match_kind === "EXISTING" && p.match_party_id && can(staff, "party.view") ? await partySummary(env.DB, p.match_party_id) : null;
  const dichToChuc = p.org_match_kind === "EXISTING" && p.org_match_party_id && can(staff, "party.view") ? await partySummary(env.DB, p.org_match_party_id) : null;
  return json({
    ...tomTatPhieu,
    vaiChon, // ô chọn vai ở màn duyệt đọc từ đây (PF2): loại do Kế toán thêm có mặt, loại đã tắt thì không
    guiLuc: p.submitted_at,
    hoTen: [bk.family_name, bk.middle_name, bk.given_name].filter((x): x is string => !!x).join(" "),
    soDienThoai: bk.phone_value,
    ...tachMuc(dsMuc(batBuoc, kl)),
    // Kiểu kết luận Danh bạ; tên hồ sơ đích CHỈ khi người xem được xem Danh bạ (ADR-0207 Đ4).
    ketLuanDanhBa: p.match_kind ? { kieu: p.match_kind, ...(dich ? { tenHoSo: dich.displayName } : {}) } : null,
    // Kết luận Danh bạ của tổ chức (ADR-0212 Đ5): cùng luật tên. Gắn tổ chức có sẵn KHÔNG làm người đăng ký thành người quản lý (Đ5 mục 3) — màn duyệt nói rõ văn phòng giao sau.
    ketLuanDanhBaToChuc: p.org_match_kind
      ? { kieu: p.org_match_kind, ...(dichToChuc ? { tenHoSo: dichToChuc.displayName } : {}), ...(p.org_match_kind === "EXISTING" ? { ghiChu: GHI_CHU_TO_CHUC_CO_SAN } : {}) }
      : null,
    coNguoiGioiThieu: p.referrer_party_id !== null,
    nguoiXacMinhLaBan: p.verified_by === staff.id,
  });
}

// ---- POST /api/dang-ky/phieu/:id/duyet ----
export async function duyetPhieu({ request, env, staff, params, loDuyetDangKy, exec }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const k = kiemDuyet(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { roleCode, roleCodeToChuc, phienBan } = k.value;
  // Vai: hợp lệ khi CÓ TRONG `vaiDangKyDuoc` lúc duyệt (ADR-0212 Đ3). Là vai bên ngoài sẵn có ⇒ qua đúng luật gán vai của người duyệt (ADR-0207 Đ4); là loại đối tác do Kế toán thêm ⇒ không qua luật đó
  // (loại nhóm OTHER không sinh quyền; quyền Đối tác cấp bằng dòng chỉnh tay trong lô). Loại vừa bị tắt ⇒ 409, không dòng nào sinh.
  // `roleCode = null` (phiếu «chỉ tổ chức», Task 13): kiểm ở dưới khi đã đọc phần tổ chức.
  const vai = roleCode === null ? ({ kq: "HOP_LE", laLoaiDoiTac: false } as const) : await kiemVaiKhiDuyet(env.DB, roleCode);
  if (vai.kq === "DA_TAT") return error(409, "role_inactive", CAU_LOAI_DA_TAT);
  if (vai.kq !== "HOP_LE") return error(400, "invalid_input", "Hãy chọn một vai trò đối tác.");
  const laLoaiDoiTac = vai.laLoaiDoiTac;
  if (roleCode !== null && !laLoaiDoiTac) {
    if (!isRoleCode(roleCode) || groupOf([roleCode]) !== "EXTERNAL") return error(400, "invalid_input", "Hãy chọn một vai trò đối tác.");
    const vaiLoi = roleAssignmentProblem({
      actorIsSuper: can(staff, "admin.manage.superadmin"), actorLaQuanTri: can(staff, "admin.manage"), currentRoles: [], currentPermissions: [], currentAdjustments: { adds: [], removes: [] },
      next: { roles: [roleCode], adds: [], removes: [], reason: null },
    });
    if (vaiLoi) return error(vaiLoi.forbidden ? 403 : 400, vaiLoi.forbidden ? "forbidden" : "invalid_input", vaiLoi.message);
  }
  if (p.status !== "CHO_DUYET" || p.current_version < 1) return KHONG_CON_CHO();
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN();
  const version = p.current_version;
  const bk = await banKhaiDeDuyet(env.DB, p.id, version);
  if (!bk) return KHONG_CON_CHO();
  // Kiểm TRƯỚC lô (câu báo rõ). Số điện thoại: CÙNG hàm chuẩn hoá với số đăng nhập (`+84 9…` và `09…` là một số).
  const loginPhone = normalizePhone(bk.phone_value ?? "");
  if (!loginPhone) return error(409, "phone_missing", "Phiếu chưa có số điện thoại hợp lệ để làm số đăng nhập. Hãy bấm «Trả về xác minh» để người xác minh yêu cầu bổ sung, hoặc từ chối phiếu.");
  if (await findStaffByPhone(env.DB, loginPhone)) return error(409, "phone_taken", "Số điện thoại của phiếu đã là số đăng nhập của một tài khoản. Hãy từ chối phiếu (lý do «Thông tin này đã có trong hệ thống»).");
  const dich = p.match_kind === "EXISTING" ? p.match_party_id : null;
  if (dich) {
    const loi = await kiemHoSoDich(env.DB, dich, roleCode);
    if (loi) return error(409, loi.code, loi.message);
  }
  if (bk.document_type_code === "CCCD" && bk.number_key && (await canCuocThuocHoSoKhac(env.DB, bk.number_key, dich))) {
    return error(409, "document_other_person", "Số căn cước của phiếu đã thuộc một hồ sơ khác. Hãy bấm «Trả về xác minh» để người xác minh đối chiếu lại Danh bạ, hoặc từ chối phiếu (lý do «Thông tin này đã có trong hệ thống»).");
  }
  if (p.referrer_party_id) {
    const loi = await kiemNguoiGioiThieu(env.DB, p.referrer_party_id, dich);
    if (loi) return error(409, loi.code, loi.message);
  }
  // Phần tổ chức (ADR-0212 Đ5 mục 4, Đ6): kiểm TRƯỚC lô để trả câu rõ — trigger một-GPKD-một-tổ-chức, câu chốt (đòi org_match_kind) và lính gác hồ sơ tổ chức là lưới cuối.
  const org = await banKhaiToChucDayDu(env.DB, p.id, version);
  const dichToChuc = org && p.org_match_kind === "EXISTING" ? p.org_match_party_id : null;
  // Vai cá nhân rỗng (Task 13; ADR-0212 Đ4): chỉ khi phiếu có phần tổ chức VÀ đã có thay mặt tổ chức. Đ7.7 (ADR-0213; chủ 16/11): gắn tổ chức CÓ SẴN không bao giờ sinh người quản lý ⇒
  // người đó sẽ không vai, không liên kết ⇒ 409 TRƯỚC lô, không câu ghi nào chạy (B2 thêm nhánh «đã có lời mời giữ chỗ»).
  if (roleCode === null) {
    if (!vaiCaNhanRongDuoc(MOI_TRUONG_MO, org !== null)) return error(400, "invalid_input", "Hãy chọn một vai trò đối tác.");
    if (p.org_match_kind === "EXISTING") {
      return error(409, "org_member_needs_invite", "Người đăng ký chưa có vai người dùng riêng và chưa được tổ chức mời. Hãy trả phiếu về để họ chọn một vai người dùng cá nhân, hoặc chờ người quản lý tổ chức gửi mã vào tổ chức.");
    }
  }
  // Vai của tổ chức (Task 13): người duyệt chọn lại được như vai cá nhân; vắng ⇒ vai trong phiếu. Phải là vai «tổ chức» (Công ty lữ hành, loại do Kế toán thêm) — trigger liên kết đòi vai được hưởng.
  const vaiToChuc = roleCodeToChuc === undefined ? p.org_role_code : roleCodeToChuc;
  if (!org && roleCodeToChuc) return error(400, "invalid_input", "Phiếu này không có phần tổ chức.");
  if (org) {
    if (vaiToChuc === null) return error(400, "invalid_input", "Hãy chọn vai người dùng của tổ chức.");
    const kv = await kiemVaiKhiDuyet(env.DB, vaiToChuc);
    if (kv.kq === "DA_TAT") return error(409, "role_inactive", "Vai người dùng của tổ chức trong phiếu không còn nhận đăng ký. Hãy từ chối phiếu hoặc trả về để người đăng ký bổ sung.");
    if (kv.kq !== "HOP_LE" || phanCuaVai(vaiToChuc, kv.laLoaiDoiTac) === "CA_NHAN") return error(400, "invalid_input", "Hãy chọn vai người dùng của tổ chức.");
  }
  if (org) {
    if (p.org_match_kind === null) return error(409, "registration_not_verified", "Phiếu chưa có kết luận Danh bạ cho tổ chức nên chưa duyệt được. Hãy bấm «Trả về xác minh» để người xác minh kết luận lại.");
    if (dichToChuc) {
      const loi = await toChucDichHopLe(env.DB, dichToChuc);
      if (loi) return error(409, loi.code, loi.message);
    }
    const trung = await trungToChucKhac(env.DB, { gpkdKey: org.gpkd_key, taxKey: org.tax_key, dich: dichToChuc });
    if (trung) return error(409, trung.code, trung.message);
  }
  const at = new Date().toISOString();
  const deadlineAt = await hanKichHoat(env.DB, at);
  if (!deadlineAt) return error(503, "registration_policy_missing", "Chưa có chính sách đăng ký. Hãy báo quản trị viên.");
  const email = await emailLienLacCuaPhieu(env.DB, p.id);
  const cho: { kind: "PHONE" | "EMAIL" | "ADDRESS"; value: string }[] = [
    { kind: "PHONE", value: bk.phone_value ?? loginPhone },
    ...(email ? [{ kind: "EMAIL" as const, value: email }] : []),
    ...(bk.address_value ? [{ kind: "ADDRESS" as const, value: bk.address_value }] : []),
  ];
  const lienHe: LoDuyetDangKyVao["lienHe"] = cho.flatMap((c) => {
    const v = validateContact({ kind: c.kind, value: c.value });
    return v.ok ? [{ kind: c.kind, value: v.value.value, valueNormalized: v.value.valueNormalized }] : [];
  });
  const datMa = new Set((await ketLuanMoiNhat(env.DB, p.id, version)).filter((r) => r.result === "DAT").map((r) => r.item_code));
  const mucDat: LoDuyetDangKyVao["mucDat"] = [
    // CHỈ mục cá nhân (điều phối PF5): mục tổ chức đã đạt đi vào `toChuc.mucDat` của hồ sơ tổ chức, không bao giờ thành dòng xác minh của hồ sơ người.
    ...MUC_XAC_MINH_MO_CA_NHAN.ATTRIBUTE.filter((m) => datMa.has(m)).map((ma) => ({ loai: "ATTRIBUTE" as const, ma })),
    ...MUC_XAC_MINH_MO_CA_NHAN.DOCUMENT.filter((m) => datMa.has(m)).map((ma) => ({ loai: "DOCUMENT" as const, ma })),
  ];
  let toChuc: LoDuyetDangKyVao["toChuc"];
  if (org) {
    const sdt = org.phone_value ? validateContact({ kind: "PHONE", value: org.phone_value }) : null;
    toChuc = {
      hoSo: dichToChuc ? { kieu: "CO_SAN", partyId: dichToChuc } : { kieu: "MOI" },
      roleCode: vaiToChuc, lienKet: lienKetLoDuyet(MOI_TRUONG_MO, dichToChuc ? "CO_SAN" : "MOI"), displayName: org.display_name, legalName: org.legal_name, taxCode: org.tax_code, address: org.address, invoiceEmail: org.invoice_email,
      phone: sdt && sdt.ok ? { value: sdt.value.value, valueNormalized: sdt.value.valueNormalized } : null,
      gpkd: { typeCode: "GPKD", number: org.gpkd_number, numberKey: org.gpkd_key, issuedDate: org.gpkd_issued_date, issuedPlace: org.gpkd_issued_place, expiryDate: null },
      giayPhepThem: org.extra_type_code && org.extra_number && org.extra_key
        ? { typeCode: org.extra_type_code, number: org.extra_number, numberKey: org.extra_key, issuedDate: org.extra_issued_date, issuedPlace: org.extra_issued_place, expiryDate: org.extra_expiry_date }
        : null,
      // CHỈ mục tổ chức (PF5).
      mucDat: [
        ...MUC_XAC_MINH_MO_TO_CHUC.ATTRIBUTE.filter((m) => datMa.has(m)).map((ma) => ({ loai: "ATTRIBUTE" as const, ma })),
        ...MUC_XAC_MINH_MO_TO_CHUC.DOCUMENT.filter((m) => datMa.has(m)).map((ma) => ({ loai: "DOCUMENT" as const, ma })),
      ],
    };
  }
  // Cờ Toàn quyền (ADR-0207 Đ1, Đ5): CHỈ khi người duyệt CHÍNH là người xác minh VÀ bảng quyền nói người đó là Toàn quyền. Toàn quyền duyệt phiếu người khác xác minh ⇒ không cờ.
  const co: 0 | 1 = p.verified_by === staff.id && can(staff, "admin.manage.superadmin") ? 1 : 0;
  let lo;
  try {
    lo = await loDuyetDangKy({
      registrationId: p.id, version, approverId: staff.id, at, today: vnToday(new Date(at)), co, roleCode, laLoaiDoiTac,
      roleLabel: roleCode === null ? "không có vai trò riêng (người làm cho tổ chức)" : laLoaiDoiTac ? ((await tenLoaiVai(env.DB)).get(roleCode) ?? roleCode) : ((await tenVaiTaiKhoan(env.DB))[roleCode as RoleCode] ?? roleCode),
      hoSo: dich ? { kieu: "CO_SAN", partyId: dich } : { kieu: "MOI" },
      ten: { family: bk.family_name, middle: bk.middle_name, given: bk.given_name }, gender: bk.gender, birthDate: bk.birth_date, loginPhone, lienHe,
      giayTo: bk.document_type_code
        ? { typeCode: bk.document_type_code, number: bk.document_number, numberKey: bk.number_key, classCode: bk.license_class_code, issuedDate: bk.issued_date, issuedPlace: bk.issued_place, expiryDate: bk.expiry_date }
        : null,
      policyId: bk.policy_id, consentedAt: bk.consented_at, verifiedBy: p.verified_by ?? "", verifiedAt: p.verified_at ?? at, mucDat, referrerPartyId: p.referrer_party_id, deadlineAt,
      ...(toChuc ? { toChuc } : {}),
    });
  } catch (e) {
    // CHỈ hai lỗi đã biết của staff (vai không mang quyền nào / mang quyền nội bộ — đã chặn ở trên, đây là lưới) thành 400; lỗi khác ném lên (500).
    if (loiDungLoDuyet(e)) return error(400, "invalid_input", "Vai trò này không mở được tài khoản đối tác.");
    throw e;
  }
  // Thư «đã duyệt» (ADR-0206 Đ13): câu xếp thư đứng CUỐI lô (chỉ số câu 8 `lo.cap.viTri` giữ nguyên); câu chốt làm hỏng cả lô nếu phiếu không được duyệt.
  const xepThu = cauXepThu(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu("DA_DUYET", "CHO"), at, trangThaiPhieu: "DA_DUYET" });
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([...lo.statements, xepThu]);
  } catch (e) {
    const l = loiLoDuyet(e);
    if (l) return error(l.status, l.code, l.message);
    throw e; // lỗi lạ ⇒ 500 có mã yêu cầu (router), không lộ chữ lỗi
  }
  // Tệp chờ chưa lưu đã nhận quyết gỡ trong lô; xoá kho chạy SAU (Hiến chương 5.16). Không bao giờ chạm tệp đã chuyển.
  await xoaKhoTepChoDaGo(env, p.id);
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: "DA_DUYET", daXep: (kq[kq.length - 1]?.meta.changes ?? 0) > 0, hanKichHoat: deadlineAt });
  // Cấp độ đại lý mặc định (ADR-0209 Đ3, Đ4): câu 8 có chèn ⇒ đã áp; không có câu 8 / chèn 0 dòng ⇒ lý do dự đoán (dự đoán nói «sẽ áp» mà câu chèn 0 dòng ⇒ chính sách vừa đổi giữa lúc bấm).
  // Tên cấp chỉ cho người duyệt giữ `partner.commission.view` (Nhân sự không thấy — Đ4).
  const daAp = lo.cap.viTri !== null && (kq[lo.cap.viTri]?.meta.changes ?? 0) > 0;
  // Câu 8 đã chèn ⇒ LUÔN «đã áp» với cấp câu 8 vừa ghi (kể cả khi dự đoán nói không — chính sách đổi giữa lúc bấm; bài kiểm Task 12 m-5).
  const cap = ketQuaCapChoNguoiXem(daAp ? { cap: lo.cap.capCau8, lyDo: null } : { cap: null, lyDo: lo.cap.duDoan.lyDo ?? "VUA_DOI" }, can(staff, "partner.commission.view"));
  return json({ trangThai: "DA_DUYET", cap }); // không PIN, không mã tài khoản
}

// ---- POST /api/dang-ky/phieu/:id/tu-choi-duyet ----
export async function tuChoiDuyet({ request, env, staff, params, exec }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const k = kiemLyDoDuyet(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  if (p.status !== "CHO_DUYET") return KHONG_CON_CHO();
  const { lyDo, phienBan } = k.value;
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN();
  const at = new Date().toISOString();
  // MỘT lô: đổi trạng thái (điều kiện CHỜ DUYỆT) → lịch sử → nhật ký → quyết gỡ tệp chờ (chỉ khi câu liền trước đã ghi). Xoá kho chạy SAU lô.
  const kq = await env.DB.batch([
    tuChoiDuyetStatement(env.DB, { registrationId: p.id, lyDo, by: staff.id, at, phienBan }),
    suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "TU_CHOI_DUYET", lyDo, at }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_approval_rejected", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · từ chối duyệt · ${lyDo}` }, "changes() > 0"),
    cauGoTepChoNeuTruocDoi(env.DB, p.id, "TU_CHOI", at),
    // Thư «bị từ chối» (ADR-0206 Đ13): CUỐI lô, điều kiện riêng (không nằm giữa chuỗi changes() của câu gỡ tệp).
    cauXepThu(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu("TU_CHOI_DUYET", "CHO"), at, trangThaiPhieu: "TU_CHOI" }),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return KHONG_CON_CHO();
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: "TU_CHOI_DUYET", daXep: (kq[4]?.meta.changes ?? 0) > 0, lyDo });
  await xoaKhoTepChoDaGo(env, p.id);
  return json({ trangThai: "TU_CHOI" });
}

// ---- POST /api/dang-ky/phieu/:id/tra-ve-xac-minh ----
// «Trả về xác minh» (ADR-0207 Đ5; rà soát cuối I-3): CHỜ DUYỆT → CHỜ XÁC MINH, ghim phiên bản trong câu; xoá kết luận Danh bạ và người xác minh (người xác minh phải kết luận lại — luật
// «người duyệt ≠ người xác minh» tính theo người kết luận LẦN SAU). MỘT lô: đổi → lịch sử → nhật ký (không dữ liệu khai). Không thư cho người đăng ký (phiếu vẫn trong tay công ty).
export async function traVeXacMinh({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const k = kiemTraVe(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  if (p.status !== "CHO_DUYET") return KHONG_CON_CHO();
  if (k.value.phienBan !== p.current_version) return DOI_PHIEN_BAN();
  const at = new Date().toISOString();
  const kq = await env.DB.batch([
    traVeXacMinhStatement(env.DB, { registrationId: p.id, by: staff.id, at, phienBan: k.value.phienBan }),
    suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "TRA_VE_XAC_MINH", lyDo: null, at }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_returned_to_verification", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · trả về xác minh` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    const n = await phieuXet(env.DB, p.id);
    return n && n.status === "CHO_DUYET" && n.current_version !== k.value.phienBan ? DOI_PHIEN_BAN() : KHONG_CON_CHO();
  }
  return json({ trangThai: "CHO_XAC_MINH" });
}

// ---- POST /api/dang-ky/phieu/:id/gui-lai-loi-moi ----
// ADR-0207 Đ7 «mở lại hạn, có nhật ký» + ADR-0206 Đ13: lệnh này cũng GỬI LẠI thư «đã duyệt» (kèm hạn mới) — đây là đường gửi lại của thư đó (rà soát cuối I-1; thay phán quyết Task 8 «không gửi thư»).
export async function guiLaiLoiMoi({ env, staff, params, exec }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  if (p.status !== "DA_DUYET" || p.activated_at !== null) return error(409, "registration_not_pending_activation", "Phiếu không ở trạng thái đã duyệt, chưa kích hoạt.");
  // Tác nhân dọn phiếu đã ẩn danh danh tính (quá hạn kích hoạt — ADR-0208 Đ6, Đ8): người được duyệt không còn đường vào lại phiếu ⇒ không mở lại hạn (câu ghi cũng tự canh điều này).
  if (!(await danhTinhConEmail(env.DB, p.id))) return DANH_TINH_DA_AN();
  const at = new Date().toISOString();
  const deadlineAt = await hanKichHoat(env.DB, at);
  if (!deadlineAt) return error(503, "registration_policy_missing", "Chưa có chính sách đăng ký. Hãy báo quản trị viên.");
  const kq = await env.DB.batch([
    guiLaiLoiMoiStatement(env.DB, { registrationId: p.id, deadlineAt, at, by: staff.id }),
    suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "GUI_LAI_LOI_MOI", lyDo: null, at }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_invite_resent", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · mở lại hạn đặt PIN` }, "changes() > 0"),
    cauXepThu(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu("DA_DUYET", "CHO"), at, trangThaiPhieu: "DA_DUYET" }),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    if (!(await danhTinhConEmail(env.DB, p.id))) return DANH_TINH_DA_AN();
    return error(409, "registration_not_pending_activation", "Phiếu không ở trạng thái đã duyệt, chưa kích hoạt.");
  }
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: "DA_DUYET", daXep: (kq[3]?.meta.changes ?? 0) > 0, hanKichHoat: deadlineAt });
  return json({ hanKichHoat: deadlineAt });
}
