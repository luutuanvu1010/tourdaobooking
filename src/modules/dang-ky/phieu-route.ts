// Bốn route của người đăng ký trên PHIẾU CỦA CHÍNH MÌNH (ADR-0206 Đ6, Đ7, Đ9; ADR-0207 Đ2; ADR-0208 Đ7; ADR-0210 Đ1; đợt 1 Task 4): GET xem, PUT lưu nháp, POST gửi, POST rút.
// Route khai `public`; cổng là cookie đăng ký (`td_dang_ky`) kiểm ở ĐÂY (không có mã phiếu trong đường dẫn: phiếu lấy TỪ cookie, nên không có «phiếu của người khác» để gọi nhầm).
// Thứ tự mỗi route: bảo trì (503) → chính sách → cookie (401) → phiếu → trạng thái → thân. Cookie cấp lại sau mỗi lệnh thành công, giữ mốc bắt đầu.
// «Lưu nháp» = chọn LOẠI đối tác (cột `role_code`): mọi giá trị khác của bản khai đi trong thân của «gửi» và chỉ vào bảng khi gửi (bản khai bất biến, ADR-0206 Đ3) — không có bảng nháp chứa
// họ tên, ngày sinh, số giấy tờ (quyết định riêng của chủ nếu muốn lưu nháp phía máy chủ). Lịch sử lệnh ghi ở `dk_event`, KHÔNG vào `audit_log` (Đ12); không số, tên, liên hệ.
// Công tắc «Nhận đăng ký mới» đóng KHÔNG chặn các route này: phiếu đã có vẫn vào lại, sửa, gửi lại, rút (Đ9).
import { CAU_PHIEU, cauLyDoChoNguoiDangKy, nhanMucChoNguoiDangKy, nhanTrangThaiPhieu, type TrangThaiPhieuDangKy } from "../../shared/dang-ky-hien-thi.ts";
import type { PhieuDangKyDto } from "../../shared/contracts.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { chanNguoiKhongTaiKhoan } from "../../shared/maintenance.ts";
import type { Ctx } from "../../shared/router.ts";
import { truongDung } from "../../shared/dang-ky-truong.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { kiemGioiTinh } from "../../shared/xung-ho.ts";
import { getMaintenanceState, maintenanceResponse } from "../maintenance";
import {
  cauGoTepChoNeuTruocDoi, cheSo, danhMucGiayToChoDangKy, kiemNgaySinh, kiemThemGiayTo, mucXacMinhBatBuocCaNhan, tenLoaiVai, trangThaiTepChoTheoO, validateContact,
  validatePersonFullName, xoaKhoTepChoDaGo, type DanhMucGiayTo, type GiayToNhap,
} from "../parties";
import { cookiePhienDangKy, docPhienDangKy, taoPhienDangKy } from "./phien.ts";
import {
  banKhaiTruoc, cauKeoDaiHanNhap, chinhSachHienHanh, chinhSachRiengTuHienHanh, doiLoaiStatement, guiChenStatement, guiTienStatement, mucRiengCuaPhieu, phieuDeXem, rutStatement, suKienNguoiDangKyStatement,
  type BanKhaiMoi, type ChinhSachDangKyRow, type PhieuDeXemRow,
} from "./repository.ts";
import { mucChuaDapUng, type DuLieuKiemMuc } from "./rules.ts";
import { loaiMoHienTai } from "./vai.ts";
import { mucBatBuoc } from "./xac-minh.ts";

type Vao = { phien: { registrationId: string; identityId: string; startMs: number }; chinhSach: ChinhSachDangKyRow; phieu: PhieuDeXemRow; nowMs: number; at: string };

const HET_PHIEN = (): Response => error(401, "registration_session_required", CAU_PHIEU.hetPhien);
const DOI_TRANG_THAI = (): Response => error(409, "registration_state_changed", CAU_PHIEU.doiTrangThai);

/** Cổng chung: bảo trì → chính sách → cookie → phiếu của cookie. Chưa có chính sách ⇒ 404 như tải tệp (đóng đăng ký); cookie hay phiếu sai ⇒ 401 không lộ gì. */
async function vao({ request, env }: Ctx<"public">): Promise<Vao | Response> {
  const baoTri = await getMaintenanceState(env.DB);
  if (chanNguoiKhongTaiKhoan(baoTri)) return maintenanceResponse(baoTri);
  const nowMs = Date.now();
  const at = new Date(nowMs).toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  if (!chinhSach) return error(404, "not_found", "Không tìm thấy.");
  const phien = await docPhienDangKy(request, env, nowMs, { idleMin: chinhSach.session_idle_minutes, maxHours: chinhSach.session_max_hours });
  if (!phien) return HET_PHIEN();
  const phieu = await phieuDeXem(env.DB, phien.registrationId, phien.identityId);
  if (!phieu) return HET_PHIEN();
  return { phien, chinhSach, phieu, nowMs, at };
}

/** Trả lời thành công kèm cookie cấp lại (giữ mốc bắt đầu, làm mới mốc thao tác cuối). */
async function tra(ctx: Ctx<"public">, v: Vao, dto: PhieuDangKyDto): Promise<Response> {
  const token = await taoPhienDangKy(ctx.env.SESSION_SECRET, v.phien.registrationId, v.phien.identityId, v.nowMs, v.phien.startMs);
  return json(dto, 200, { "set-cookie": cookiePhienDangKy(token, v.chinhSach.session_max_hours, new URL(ctx.request.url).protocol === "https:"), "cache-control": "no-store" });
}

/** Phiếu đọc lại từ CSDL rồi dựng DTO — luôn dựng sau khi ghi, không dựng từ dữ liệu người gọi gửi lên. */
async function dtoPhieu(db: D1Database, id: string, identityId: string): Promise<PhieuDangKyDto> {
  const p = (await phieuDeXem(db, id, identityId))!;
  const [ten, tep, bkMoiNhat] = await Promise.all([tenLoaiVai(db), trangThaiTepChoTheoO(db, p.id), p.status === "CAN_BO_SUNG" ? banKhaiTruoc(db, p.id) : Promise.resolve(null)]);
  // Chỉ phiếu CẦN BỔ SUNG mới trả lại nội dung (để sửa); chỉ bản MỚI NHẤT — bản đó đã ẩn danh (tên bị thay bằng dấu) thì null, không lùi về bản cũ hơn.
  const bk = bkMoiNhat && bkMoiNhat.given_name !== "(đã ẩn)" ? bkMoiNhat : null;
  const lyDo = (p.status === "CAN_BO_SUNG" || p.status === "TU_CHOI") && p.reason_code ? cauLyDoChoNguoiDangKy(p.reason_code) : null;
  return {
    maPhieu: p.id,
    trangThai: p.status as TrangThaiPhieuDangKy,
    nhanTrangThai: nhanTrangThaiPhieu(p.status),
    chiXem: p.status !== "DANG_DIEN" && p.status !== "CAN_BO_SUNG",
    loai: p.role_code ? { ma: p.role_code, ten: ten.get(p.role_code) ?? p.role_code } : null,
    phienBan: p.current_version,
    guiLuc: p.submitted_at,
    hanLuc: p.expires_at,
    lyDo: lyDo && p.reason_code ? { ma: p.reason_code, cau: lyDo } : null,
    tep: tep.map((x) => ({ o: x.slot, trangThai: x.daLuu ? ("DA_GUI" as const) : ("CHUA_TAI_XONG" as const) })),
    banKhaiTruoc: bk
      ? {
          hoTen: [bk.family_name, bk.middle_name, bk.given_name].filter((x): x is string => !!x).join(" "),
          gioiTinh: bk.gender,
          ngaySinh: bk.birth_date,
          diaChi: bk.address_value,
          daKhaiDienThoai: bk.co_dien_thoai === 1,
          giayTo: bk.document_type_code ? { loai: bk.document_type_code, soChe: cheSo(bk.number_key), hang: bk.license_class_code, ngayCap: bk.issued_date, hetHan: bk.expiry_date } : null,
        }
      : null,
  };
}

/** Phiếu không còn ở trạng thái sửa được (chỉ ĐANG ĐIỀN và CẦN BỔ SUNG sửa được) ⇒ 409 với câu đúng trạng thái; còn sửa được ⇒ null. */
function chanSua(phieu: PhieuDeXemRow): Response | null {
  if (phieu.status === "DANG_DIEN" || phieu.status === "CAN_BO_SUNG") return null;
  if (phieu.status === "DA_DUYET") return error(409, "registration_approved", CAU_PHIEU.daDuyet);
  if (phieu.status === "CHO_XAC_MINH" || phieu.status === "CHO_DUYET") return error(409, "registration_not_editable", CAU_PHIEU.khongSua);
  return error(409, "registration_closed", CAU_PHIEU.daKetThuc);
}

// ---- GET /api/dang-ky/phieu ----
export async function xemPhieuCuaToi(ctx: Ctx<"public">): Promise<Response> {
  const v = await vao(ctx);
  if (v instanceof Response) return v;
  return tra(ctx, v, await dtoPhieu(ctx.env.DB, v.phien.registrationId, v.phien.identityId));
}

// ---- PUT /api/dang-ky/phieu ---- thân `{ loai }`
export async function luuNhapPhieu(ctx: Ctx<"public">): Promise<Response> {
  const v = await vao(ctx);
  if (v instanceof Response) return v;
  const chan = chanSua(v.phieu);
  if (chan) return chan;
  const body = await readJson(ctx.request);
  const loai = body?.loai;
  if (typeof loai !== "string" || !(await loaiMoHienTai(ctx.env.DB, v.chinhSach.open_role_codes)).some((x) => x.ma === loai)) return error(400, "invalid_input", CAU_PHIEU.loaiDong);
  const { env } = ctx;
  const { registrationId, identityId } = v.phien;
  // Lưu nháp là một thao tác: đẩy hạn phiếu đang điền (câu tự canh trạng thái ĐANG ĐIỀN), cùng lô với đổi loại nếu có.
  const keoDaiHan = cauKeoDaiHanNhap(env.DB, { registrationId, expiresAt: new Date(v.nowMs + v.chinhSach.draft_expire_days * 86_400_000).toISOString() });
  if (loai === v.phieu.role_code) await env.DB.batch([keoDaiHan]);
  else {
    // Loại khoá sau lần gửi đầu (trigger dk_registration_immutable): báo trước bằng 409, không để trigger làm hỏng lô.
    if (v.phieu.current_version > 0) return error(409, "role_locked", CAU_PHIEU.loaiKhoa);
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([
        doiLoaiStatement(env.DB, { registrationId, role: loai, identityId, at: v.at }),
        suKienNguoiDangKyStatement(env.DB, { registrationId, identityId, command: "LUU_NHAP", at: v.at }),
        keoDaiHan,
      ]);
    } catch (e) {
      if (/dk_registration_immutable/.test(e instanceof Error ? e.message : "")) return error(409, "role_locked", CAU_PHIEU.loaiKhoa);
      throw e;
    }
    if ((kq[0]?.meta.changes ?? 0) === 0) return DOI_TRANG_THAI();
  }
  return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
}

// ---- POST /api/dang-ky/phieu/gui ---- thân `{ chinhSachPhienBan, hoTen, ngaySinh?, diaChi?, dienThoai?, gioiTinh?, giayTo?, nguoiGioiThieu? }`
// Tập trường nhận và hàm kiểm dựng từ tệp ánh xạ (ADR-0212 Đ9), không khai tay.
const laVat = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const co = (x: unknown): boolean => x !== undefined && x !== null && !(typeof x === "string" && x.trim() === "");
const loi = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Kiểm HÌNH THỨC bản khai ĐANG GỬI bằng luật thuần của tự khai (parties); giá trị khai là đề xuất, câu báo lỗi không nhắc lại giá trị. Trả bản khai chuẩn hoá và các dữ kiện để kiểm mục bắt buộc. */
function kiemBanKhai(body: Record<string, unknown>, dm: DanhMucGiayTo, homNay: string): { ok: true; b: BanKhaiMoi; muc: Omit<DuLieuKiemMuc, "loaiHopLe"> } | { ok: false; message: string } {
  if (typeof body.hoTen !== "string") return loi("Họ tên là bắt buộc.");
  const ten = validatePersonFullName(body.hoTen);
  if (!ten.ok) return ten;
  const gt = kiemGioiTinh(body.gioiTinh);
  if (!gt.ok) return gt;
  const ns = kiemNgaySinh(body.ngaySinh, homNay);
  if (!ns.ok) return ns;
  let diaChi: string | null = null;
  if (co(body.diaChi)) {
    const d = validateContact({ kind: "ADDRESS", value: body.diaChi });
    if (!d.ok) return d;
    diaChi = d.value.value;
  }
  let dtValue: string | null = null;
  let dtKey: string | null = null;
  if (co(body.dienThoai)) {
    const d = validateContact({ kind: "PHONE", value: body.dienThoai });
    if (!d.ok) return d;
    dtValue = d.value.value;
    dtKey = d.value.valueNormalized;
  }
  let gt2: GiayToNhap | null = null;
  if (body.giayTo !== undefined && body.giayTo !== null) {
    if (typeof body.giayTo !== "object" || Array.isArray(body.giayTo)) return loi("Nhập thông tin giấy tờ.");
    const g = kiemThemGiayTo(body.giayTo as Record<string, unknown>, dm);
    if (!g.ok) return g;
    gt2 = g.value;
  }
  let gioiThieu: string | null = null;
  if (co(body.nguoiGioiThieu)) {
    if (typeof body.nguoiGioiThieu !== "string") return loi("Người giới thiệu không hợp lệ.");
    gioiThieu = body.nguoiGioiThieu.normalize("NFC").trim().replace(/\s+/g, " ");
    if (gioiThieu.length > 200) return loi("Người giới thiệu tối đa 200 ký tự.");
  }
  const b: BanKhaiMoi = {
    family: ten.value.family, middle: ten.value.middle, given: ten.value.given, gender: gt.value ?? null, birthDate: ns.value ?? null, address: diaChi, phoneValue: dtValue, phoneKey: dtKey,
    documentType: gt2?.typeCode ?? null, documentNumber: gt2?.number ?? null, numberKey: gt2?.numberKey ?? null, licenseClass: gt2?.classCode ?? null, issuedDate: gt2?.issuedDate ?? null,
    issuedPlace: gt2?.issuedPlace ?? null, expiryDate: gt2?.expiryDate ?? null, referrer: gioiThieu,
  };
  // «Căn cước còn hiệu lực» (ADR-0210 Đ1): loại CCCD, đủ số, và nếu có ngày hết hạn thì chưa qua hôm nay (giờ Việt Nam).
  const cccdConHan = gt2 !== null && gt2.typeCode === "CCCD" && gt2.numberKey !== null && (gt2.expiryDate === null || gt2.expiryDate >= homNay);
  return { ok: true, b, muc: { hoTen: b.given.length > 0, ngaySinh: b.birthDate !== null, dienThoai: b.phoneKey !== null, cccdConHan } };
}

export async function guiPhieu(ctx: Ctx<"public">): Promise<Response> {
  const v = await vao(ctx);
  if (v instanceof Response) return v;
  const { env } = ctx;
  const { registrationId, identityId } = v.phien;
  // Bấm hai lần (Đ7): phiếu đã sang CHỜ XÁC MINH thì trả lại kết quả của lần gửi trước, KHÔNG sinh bản khai thứ hai và không đọc thân.
  if (v.phieu.status === "CHO_XAC_MINH") return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
  const chan = chanSua(v.phieu);
  if (chan) return chan;
  const body = await readJson(ctx.request);
  // Hình thức tập trường (kể cả trong `giayTo`) kiểm TRƯỚC các nhánh 409 về chính sách: trường lạ luôn là 400.
  if (!body || !truongDung(body)) return error(400, "invalid_input", "Yêu cầu không hợp lệ.");
  const chinhSachRT = await chinhSachRiengTuHienHanh(env.DB);
  if (!chinhSachRT) return error(409, "no_privacy_policy", CAU_PHIEU.chuaChinhSach);
  if (typeof body.chinhSachPhienBan !== "number") return error(409, "consent_required", CAU_PHIEU.chuaDongY);
  if (body.chinhSachPhienBan !== chinhSachRT.version) return error(409, "policy_changed", CAU_PHIEU.doiChinhSach);
  const homNay = vnToday(new Date(v.nowMs));
  const k = kiemBanKhai(body, await danhMucGiayToChoDangKy(env.DB, homNay), homNay);
  if (!k.ok) return error(400, "invalid_input", k.message);
  // Mục bắt buộc = HỢP của mục chỉ phiếu cần (chính sách đăng ký) và mục bắt buộc của hồ sơ cá nhân (parties, view công bố) — ADR-0210 Đ1. Vai (ROLE) luôn bắt buộc: phiếu loại '' không gửi được.
  const [rieng, hoSo] = await Promise.all([mucRiengCuaPhieu(env.DB, v.at), mucXacMinhBatBuocCaNhan(env.DB)]);
  const batBuoc = [...new Set(["ROLE", ...mucBatBuoc(rieng, hoSo.map((m) => m.ma))])];
  const loaiHopLe = v.phieu.role_code !== "" && (await loaiMoHienTai(env.DB, v.chinhSach.open_role_codes)).some((x) => x.ma === v.phieu.role_code);
  const thieu = mucChuaDapUng(batBuoc, { loaiHopLe, ...k.muc });
  if (thieu.length > 0) return error(400, "items_missing", `Chưa đủ thông tin để gửi: ${thieu.map(nhanMucChoNguoiDangKy).join(", ")}.`);

  const submissionId = crypto.randomUUID();
  let kq: D1Result[] | null = null;
  try {
    kq = await env.DB.batch([
      guiChenStatement(env.DB, { id: submissionId, registrationId, policyId: chinhSachRT.id, at: v.at, identityId, phienBanDaDoc: v.phieu.current_version, b: k.b }),
      guiTienStatement(env.DB, { registrationId, submissionId, at: v.at, identityId }),
      suKienNguoiDangKyStatement(env.DB, { registrationId, identityId, command: v.phieu.current_version === 0 ? "GUI" : "GUI_LAI", at: v.at }),
    ]);
  } catch (e) {
    // Hai lô đua nhau: lớp cuối là UNIQUE(registration_id, version) và trigger dk_submission_version — coi như lô này khớp 0 dòng, đọc lại.
    if (!/dk_submission_version|UNIQUE constraint failed: dk_submission/.test(e instanceof Error ? e.message : "")) throw e;
  }
  if (kq !== null && (kq[1]?.meta.changes ?? 0) === 1) return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
  // Khớp 0 dòng: lần gửi khác đã thắng (kết quả y như lần đầu), hoặc chính sách mới vừa đăng, hoặc phiếu đổi trạng thái.
  const nay = await phieuDeXem(env.DB, registrationId, identityId);
  if (nay && nay.status === "CHO_XAC_MINH" && nay.current_version > v.phieu.current_version) return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
  const csNay = await chinhSachRiengTuHienHanh(env.DB);
  if (csNay && csNay.id !== chinhSachRT.id) return error(409, "policy_changed", CAU_PHIEU.doiChinhSach);
  return DOI_TRANG_THAI();
}

// ---- POST /api/dang-ky/phieu/rut ----
export async function rutPhieu(ctx: Ctx<"public">): Promise<Response> {
  const v = await vao(ctx);
  if (v instanceof Response) return v;
  const { env } = ctx;
  const { registrationId, identityId } = v.phien;
  if (v.phieu.status === "DA_RUT") return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId)); // bấm hai lần: kết quả của lần đầu
  if (v.phieu.status === "DA_DUYET") return error(409, "registration_approved", CAU_PHIEU.daDuyet);
  if (v.phieu.status === "TU_CHOI" || v.phieu.status === "HET_HAN") return error(409, "registration_closed", CAU_PHIEU.daKetThuc);
  // MỘT lô (ADR-0208 Đ7): đổi trạng thái → lịch sử → quyết gỡ mọi tệp chờ. Câu sau chỉ chạy khi câu liền trước đổi dòng (phiếu bị xử lý giữa chừng thì tệp ở lại). Xoá kho chạy SAU lô.
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      rutStatement(env.DB, { registrationId, identityId, at: v.at }),
      suKienNguoiDangKyStatement(env.DB, { registrationId, identityId, command: "RUT", at: v.at }),
      cauGoTepChoNeuTruocDoi(env.DB, registrationId, "DA_RUT", v.at),
    ]);
  } catch (e) {
    if (!/dk_registration_transition/.test(e instanceof Error ? e.message : "")) throw e;
    return DOI_TRANG_THAI();
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    const nay = await phieuDeXem(env.DB, registrationId, identityId);
    if (nay?.status === "DA_RUT") return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
    return DOI_TRANG_THAI();
  }
  await xoaKhoTepChoDaGo(env, registrationId);
  return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
}
