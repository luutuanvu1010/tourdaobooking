// Route của người trong công ty ở bước DUYỆT MỞ TÀI KHOẢN từ phiếu đăng ký (ADR-0207 Đ1, Đ4–Đ7, Đ9; ADR-0208 Đ5, Đ6; đợt 1 Task 8). Cổng `accounts`; MỖI route hỏi `account.create` trong thân
// (index.ts). Nhân sự KHÔNG xem Danh bạ: màn duyệt chỉ có họ tên, số điện thoại, loại xin, kết luận từng mục và kiểu kết luận Danh bạ (không tên hồ sơ nếu người xem không có `party.view`).
// Lệnh duyệt = MỘT `db.batch` do gốc lắp ráp ghép (`ctx.loDuyetDangKy`, ADR-0206 Đ2): câu 1 là câu chốt (trigger dk_decision_guard làm hỏng CẢ lô). Các kiểm trước lô chỉ để trả câu báo rõ;
// lô vẫn an toàn khi không có chúng (chỉ mục duy nhất staff.phone, staff_party_uq, dk_decision_once_uq; trigger CCCD một người, vai, quan hệ).
// Nhật ký và lịch sử phiếu không chứa SĐT, email, số giấy tờ, ngày sinh, địa chỉ; câu báo lỗi không nhắc lại dữ liệu khai, không nói số điện thoại thuộc tài khoản nào.
import type { LoDuyetDangKyVao } from "../../shared/dang-ky-duyet.ts";
import { ketQuaCapChoNguoiXem } from "../../shared/cap-se-ap-hien-thi.ts";
import { MUC_XAC_MINH_MO } from "../../shared/dau-xac-minh.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { can } from "../../shared/permissions.ts";
import { normalizePhone } from "../../shared/phone.ts";
import { groupOf, isRoleCode, roleAssignmentProblem } from "../../shared/roles.ts";
import type { Ctx } from "../../shared/router.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { auditStatement } from "../audit";
import { canCuocThuocHoSoKhac, cauGoTepChoNeuTruocDoi, partySummary, validateContact, xoaKhoTepChoDaGo } from "../parties";
import { findStaffByPhone, tenVaiTaiKhoan } from "../staff";
import {
  banKhaiDeDuyet, chinhSachHienHanh, danhTinhConEmail, emailLienLacCuaPhieu, guiLaiLoiMoiStatement, ketLuanMoiNhat, phieuXet, suKienNhanVienStatement, tomTatDeDuyet, tuChoiDuyetStatement,
} from "./repository.ts";
import { kiemDuyet, kiemLyDoDuyet, laMaPhieu, loiDungLoDuyet, loiLoDuyet } from "./xac-minh.ts";
import { dsMuc, kiemHoSoDich, kiemNguoiGioiThieu, moiNhat, mucPhaiDat } from "./xac-minh-route.ts";

export const CAM_DUYET = () => error(403, "forbidden", "Bạn không có quyền duyệt phiếu đăng ký.");
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy phiếu.");
const KHONG_CON_CHO = () => error(409, "registration_state_changed", "Phiếu vừa được người khác xử lý hoặc không còn chờ duyệt. Hãy mở lại phiếu.");
const DOI_PHIEN_BAN = () => error(409, "registration_version_changed", "Phiếu đã thay đổi từ lúc bạn mở. Hãy mở lại phiếu để xem bản mới.");
const NGAY_MS = 24 * 3600 * 1000;
const DANH_TINH_DA_AN = () =>
  error(409, "registration_identity_erased", "Đã quá hạn đặt mã PIN và cả thời gian chờ thêm, nên thông tin liên lạc của người đăng ký đã được xoá và không gửi lại lời mời được nữa. Tài khoản vẫn tắt; hãy báo Toàn quyền quyết định cách xử lý.");

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
  const tomTatPhieu = { id: p.id, loai: p.role_code, trangThai: p.status, phienBan: p.current_version };
  if (p.status !== "CHO_DUYET" || p.current_version < 1) return json({ ...tomTatPhieu, daXuLy: true });
  const bk = await tomTatDeDuyet(env.DB, p.id, p.current_version);
  if (!bk) return json({ ...tomTatPhieu, daXuLy: true });
  const [batBuoc, kl] = await Promise.all([mucPhaiDat(env.DB, new Date().toISOString()), moiNhat(env.DB, p)]);
  const dich = p.match_kind === "EXISTING" && p.match_party_id && can(staff, "party.view") ? await partySummary(env.DB, p.match_party_id) : null;
  return json({
    ...tomTatPhieu,
    guiLuc: p.submitted_at,
    hoTen: [bk.family_name, bk.middle_name, bk.given_name].filter((x): x is string => !!x).join(" "),
    soDienThoai: bk.phone_value,
    muc: dsMuc(batBuoc, kl),
    // Kiểu kết luận Danh bạ; tên hồ sơ đích CHỈ khi người xem được xem Danh bạ (ADR-0207 Đ4).
    ketLuanDanhBa: p.match_kind ? { kieu: p.match_kind, ...(dich ? { tenHoSo: dich.displayName } : {}) } : null,
    coNguoiGioiThieu: p.referrer_party_id !== null,
    nguoiXacMinhLaBan: p.verified_by === staff.id,
  });
}

// ---- POST /api/dang-ky/phieu/:id/duyet ----
export async function duyetPhieu({ request, env, staff, params, loDuyetDangKy }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const k = kiemDuyet(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { roleCode, phienBan } = k.value;
  // Vai: mã có thật, thuộc nhóm bên ngoài (biến thể tạo tài khoản tắt chỉ nhận vai bên ngoài), và qua đúng luật gán vai sẵn có của người duyệt (ADR-0207 Đ4).
  if (!isRoleCode(roleCode) || groupOf([roleCode]) !== "EXTERNAL") return error(400, "invalid_input", "Hãy chọn một vai trò đối tác.");
  const vaiLoi = roleAssignmentProblem({
    actorIsSuper: can(staff, "admin.manage.superadmin"), actorLaQuanTri: can(staff, "admin.manage"), currentRoles: [], currentPermissions: [], currentAdjustments: { adds: [], removes: [] },
    next: { roles: [roleCode], adds: [], removes: [], reason: null },
  });
  if (vaiLoi) return error(vaiLoi.forbidden ? 403 : 400, vaiLoi.forbidden ? "forbidden" : "invalid_input", vaiLoi.message);
  if (p.status !== "CHO_DUYET" || p.current_version < 1) return KHONG_CON_CHO();
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN();
  const version = p.current_version;
  const bk = await banKhaiDeDuyet(env.DB, p.id, version);
  if (!bk) return KHONG_CON_CHO();
  // Kiểm TRƯỚC lô (câu báo rõ). Số điện thoại: CÙNG hàm chuẩn hoá với số đăng nhập (`+84 9…` và `09…` là một số).
  const loginPhone = normalizePhone(bk.phone_value ?? "");
  if (!loginPhone) return error(409, "phone_missing", "Phiếu chưa có số điện thoại hợp lệ để làm số đăng nhập. Hãy từ chối phiếu và nhờ người đăng ký gửi lại.");
  if (await findStaffByPhone(env.DB, loginPhone)) return error(409, "phone_taken", "Số điện thoại của phiếu đã là số đăng nhập của một tài khoản. Hãy từ chối phiếu (lý do «Thông tin này đã có trong hệ thống»).");
  const dich = p.match_kind === "EXISTING" ? p.match_party_id : null;
  if (dich) {
    const loi = await kiemHoSoDich(env.DB, dich, roleCode);
    if (loi) return error(409, loi.code, loi.message);
  }
  if (bk.document_type_code === "CCCD" && bk.number_key && (await canCuocThuocHoSoKhac(env.DB, bk.number_key, dich))) {
    return error(409, "document_other_person", "Số căn cước của phiếu đã thuộc một hồ sơ khác. Hãy từ chối phiếu (lý do «Thông tin này đã có trong hệ thống»).");
  }
  if (p.referrer_party_id) {
    const loi = await kiemNguoiGioiThieu(env.DB, p.referrer_party_id, dich);
    if (loi) return error(409, loi.code, loi.message);
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
    ...MUC_XAC_MINH_MO.ATTRIBUTE.filter((m) => datMa.has(m)).map((ma) => ({ loai: "ATTRIBUTE" as const, ma })),
    ...MUC_XAC_MINH_MO.DOCUMENT.filter((m) => datMa.has(m)).map((ma) => ({ loai: "DOCUMENT" as const, ma })),
  ];
  // Cờ Toàn quyền (ADR-0207 Đ1, Đ5): CHỈ khi người duyệt CHÍNH là người xác minh VÀ bảng quyền nói người đó là Toàn quyền. Toàn quyền duyệt phiếu người khác xác minh ⇒ không cờ.
  const co: 0 | 1 = p.verified_by === staff.id && can(staff, "admin.manage.superadmin") ? 1 : 0;
  let lo;
  try {
    lo = await loDuyetDangKy({
      registrationId: p.id, version, approverId: staff.id, at, today: vnToday(new Date(at)), co, roleCode, roleLabel: (await tenVaiTaiKhoan(env.DB))[roleCode] ?? roleCode,
      hoSo: dich ? { kieu: "CO_SAN", partyId: dich } : { kieu: "MOI" },
      ten: { family: bk.family_name, middle: bk.middle_name, given: bk.given_name }, gender: bk.gender, birthDate: bk.birth_date, loginPhone, lienHe,
      giayTo: bk.document_type_code
        ? { typeCode: bk.document_type_code, number: bk.document_number, numberKey: bk.number_key, classCode: bk.license_class_code, issuedDate: bk.issued_date, issuedPlace: bk.issued_place, expiryDate: bk.expiry_date }
        : null,
      policyId: bk.policy_id, consentedAt: bk.consented_at, verifiedBy: p.verified_by ?? "", verifiedAt: p.verified_at ?? at, mucDat, referrerPartyId: p.referrer_party_id, deadlineAt,
    });
  } catch (e) {
    // CHỈ hai lỗi đã biết của staff (vai không mang quyền nào / mang quyền nội bộ — đã chặn ở trên, đây là lưới) thành 400; lỗi khác ném lên (500).
    if (loiDungLoDuyet(e)) return error(400, "invalid_input", "Vai trò này không mở được tài khoản đối tác.");
    throw e;
  }
  let kq: D1Result[];
  try {
    kq = await env.DB.batch(lo.statements);
  } catch (e) {
    const l = loiLoDuyet(e);
    if (l) return error(l.status, l.code, l.message);
    throw e; // lỗi lạ ⇒ 500 có mã yêu cầu (router), không lộ chữ lỗi
  }
  // Tệp chờ chưa lưu đã nhận quyết gỡ trong lô; xoá kho chạy SAU (Hiến chương 5.16). Không bao giờ chạm tệp đã chuyển.
  await xoaKhoTepChoDaGo(env, p.id);
  // Cấp độ đại lý mặc định (ADR-0209 Đ3, Đ4): câu 8 có chèn ⇒ đã áp; không có câu 8 / chèn 0 dòng ⇒ lý do dự đoán (dự đoán nói «sẽ áp» mà câu chèn 0 dòng ⇒ chính sách vừa đổi giữa lúc bấm).
  // Tên cấp chỉ cho người duyệt giữ `partner.commission.view` (Nhân sự không thấy — Đ4).
  const daAp = lo.cap.viTri !== null && (kq[lo.cap.viTri]?.meta.changes ?? 0) > 0;
  const cap = ketQuaCapChoNguoiXem(daAp ? lo.cap.duDoan : { cap: null, lyDo: lo.cap.duDoan.lyDo ?? "VUA_DOI" }, can(staff, "partner.commission.view"));
  return json({ trangThai: "DA_DUYET", cap }); // không PIN, không mã tài khoản
}

// ---- POST /api/dang-ky/phieu/:id/tu-choi-duyet ----
export async function tuChoiDuyet({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
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
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return KHONG_CON_CHO();
  await xoaKhoTepChoDaGo(env, p.id);
  return json({ trangThai: "TU_CHOI" });
}

// ---- POST /api/dang-ky/phieu/:id/gui-lai-loi-moi ----
// ADR-0207 Đ7 chỉ định «mở lại hạn, có nhật ký»; ADR không chốt nội dung hay kênh của lời mời (thư), nên lệnh này mở lại hạn + lịch sử + nhật ký, KHÔNG gửi thư.
export async function guiLaiLoiMoi({ env, staff, params }: Ctx<"accounts">): Promise<Response> {
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
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    if (!(await danhTinhConEmail(env.DB, p.id))) return DANH_TINH_DA_AN();
    return error(409, "registration_not_pending_activation", "Phiếu không ở trạng thái đã duyệt, chưa kích hoạt.");
  }
  return json({ hanKichHoat: deadlineAt });
}
