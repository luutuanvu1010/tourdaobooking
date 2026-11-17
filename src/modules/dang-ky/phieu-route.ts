// Bốn route của người đăng ký trên PHIẾU CỦA CHÍNH MÌNH (ADR-0206 Đ6, Đ7, Đ9; ADR-0207 Đ2; ADR-0208 Đ7; ADR-0210 Đ1; đợt 1 Task 4): GET xem, PUT lưu nháp, POST gửi, POST rút.
// Route khai `public`; cổng là cookie đăng ký (`td_dang_ky`) kiểm ở ĐÂY (không có mã phiếu trong đường dẫn: phiếu lấy TỪ cookie, nên không có «phiếu của người khác» để gọi nhầm).
// Thứ tự mỗi route: bảo trì (503) → chính sách → cookie (401) → phiếu → trạng thái → thân. Cookie cấp lại sau mỗi lệnh thành công, giữ mốc bắt đầu.
// «Lưu nháp» = chọn LOẠI đối tác (cột `role_code`) và vai của tổ chức (cột `org_role_code`, ADR-0212 Đ4): mọi giá trị khác của bản khai đi trong thân của «gửi» và chỉ vào bảng khi gửi (bản khai bất biến, ADR-0206 Đ3) — không có bảng nháp chứa
// họ tên, ngày sinh, số giấy tờ (quyết định riêng của chủ nếu muốn lưu nháp phía máy chủ). Lịch sử lệnh ghi ở `dk_event`, KHÔNG vào `audit_log` (Đ12); không số, tên, liên hệ.
// Công tắc «Nhận đăng ký mới» đóng KHÔNG chặn các route này: phiếu đã có vẫn vào lại, sửa, gửi lại, rút (Đ9).
import { CAU_PHIEU, cauLyDoChoNguoiDangKy, nhanMucChoNguoiDangKy, nhanTrangThaiPhieu, type TrangThaiPhieuDangKy } from "../../shared/dang-ky-hien-thi.ts";
import type { PhieuDangKyDto } from "../../shared/contracts.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { chanNguoiKhongTaiKhoan } from "../../shared/maintenance.ts";
import type { Ctx } from "../../shared/router.ts";
import { truongDung } from "../../shared/dang-ky-truong.ts";
import { MOI_TRUONG_MO, phanCuaVai, vaiCaNhanRongDuoc } from "../../shared/dang-ky-vai.ts";
import { CAU_MA_VAO_SAI, chuanHoaMaVao, kiemPhanToChuc, type PhanToChucMoi } from "../../shared/to-chuc.ts";
import { isRoleCode, ROLES } from "../../shared/roles.ts";
import { clearAttempts, reserveAttempts } from "../auth";
import { vnToday } from "../../shared/vn-date.ts";
import { kiemGioiTinh } from "../../shared/xung-ho.ts";
import { getMaintenanceState, maintenanceResponse } from "../maintenance";
import {
  LOI_GAC_LOI_MOI, cauBoGiuChoLoiMoi, cauGiuChoLoiMoi, chinhSachLoiMoi, loiMoiTheoId, loiMoiTheoMa, type LoiMoiDong,
  cauGoTepChoNeuTruocDoi, cheSo, danhMucGiayToChoDangKy, danhMucGiayToToChucChoDangKy, kiemNgaySinh, kiemThemGiayTo, mucXacMinhBatBuocCaNhan, tenLoaiVai, trangThaiTepChoTheoO, validateContact,
  validatePersonFullName, xoaKhoTepChoDaGo, type DanhMucGiayTo, type GiayToNhap,
} from "../parties";
import { cookiePhienDangKy, dkMoiKey, docPhienDangKy, taoPhienDangKy } from "./phien.ts";
import {
  banKhaiToChucTruoc, banKhaiTruoc, cauKeoDaiHanNhap, ganLoiMoiStatement, guiChotThangStatement, LOI_CHOT_GUI_THUA, chinhSachHienHanh, chinhSachRiengTuHienHanh, doiLoaiStatement, guiChenStatement, guiChenToChucStatement, guiTienStatement, mucRiengCuaPhieu,
  phanToChucMo, phieuDeXem, rutStatement, suKienNguoiDangKyStatement,
  type BanKhaiMoi, type ChinhSachDangKyRow, type PhieuDeXemRow,
} from "./repository.ts";
import { O_TEP_TO_CHUC, mucChuaDapUng, type DuLieuKiemMuc } from "./rules.ts";
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
  const boSung = p.status === "CAN_BO_SUNG";
  const [ten, tep, bkMoiNhat, tcMoiNhat] = await Promise.all([
    tenLoaiVai(db), trangThaiTepChoTheoO(db, p.id), boSung ? banKhaiTruoc(db, p.id) : Promise.resolve(null), boSung ? banKhaiToChucTruoc(db, p.id, p.current_version) : Promise.resolve(null),
  ]);
  const tc = tcMoiNhat && tcMoiNhat.display_name !== "(đã ẩn)" ? tcMoiNhat : null;
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
    loaiToChuc: p.org_role_code ? { ma: p.org_role_code, ten: ten.get(p.org_role_code) ?? p.org_role_code } : null,
    // Phần tổ chức: chỉ số CHE từ khoá chuẩn hoá (ADR-0212 Đ7) — mã số thuế, số GPKD, số giấy phép đầy đủ không bao giờ ra khỏi máy chủ qua route này.
    toChuc: tc
      ? {
          tenToChuc: tc.display_name,
          tenPhapLy: tc.legal_name,
          maSoThueChe: cheSo(tc.tax_key),
          diaChi: tc.address,
          emailHoaDon: tc.invoice_email,
          daKhaiDienThoai: tc.co_dien_thoai === 1,
          gpkd: { soChe: cheSo(tc.gpkd_key), ngayCap: tc.gpkd_issued_date },
          giayPhepThem: tc.extra_type_code ? { loai: tc.extra_type_code, soChe: cheSo(tc.extra_key), ngayCap: tc.extra_issued_date, hetHan: tc.extra_expiry_date } : null,
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

// ---- PUT /api/dang-ky/phieu ---- thân `{ loai, loaiToChuc? }` — `loaiToChuc` vắng = giữ nguyên, null / "" = bỏ, mã = vai của tổ chức (ADR-0212 Đ4)
export async function luuNhapPhieu(ctx: Ctx<"public">): Promise<Response> {
  const v = await vao(ctx);
  if (v instanceof Response) return v;
  const chan = chanSua(v.phieu);
  if (chan) return chan;
  const body = await readJson(ctx.request);
  const loai = body?.loai;
  const mo = await loaiMoHienTai(ctx.env.DB, v.chinhSach.open_role_codes);
  if (typeof loai !== "string") return error(400, "invalid_input", CAU_PHIEU.loaiDong);
  let loaiToChuc = v.phieu.org_role_code;
  if (body && Object.hasOwn(body, "loaiToChuc")) {
    const x = body.loaiToChuc;
    if (x === null || x === "") loaiToChuc = null;
    else if (typeof x === "string" && mo.some((m) => m.ma === x && m.phan !== "CA_NHAN")) loaiToChuc = x;
    else return error(400, "invalid_input", CAU_PHIEU.loaiToChucDong);
  }
  // Vai cá nhân: đang mở và KHÔNG phải vai «chỉ tổ chức» (Công ty lữ hành chỉ đứng ở phần tổ chức — ADR-0212 Đ2). Rỗng được CHỈ khi phiếu «chỉ tổ chức» (vai của tổ chức đã chọn — Task 13).
  const rongDuoc = loai === "" && vaiCaNhanRongDuoc(MOI_TRUONG_MO, loaiToChuc !== null);
  if (!rongDuoc && !mo.some((x) => x.ma === loai && x.phan !== "CHI_TO_CHUC")) return error(400, "invalid_input", CAU_PHIEU.loaiDong);
  if (loaiToChuc !== null && loaiToChuc !== v.phieu.org_role_code && !(await phanToChucMo(ctx.env.DB))) return error(409, "org_section_closed", CAU_PHIEU.toChucDong);
  const { env } = ctx;
  const { registrationId, identityId } = v.phien;
  // Lưu nháp là một thao tác: đẩy hạn phiếu đang điền (câu tự canh trạng thái ĐANG ĐIỀN), cùng lô với đổi loại nếu có.
  const keoDaiHan = cauKeoDaiHanNhap(env.DB, { registrationId, expiresAt: new Date(v.nowMs + v.chinhSach.draft_expire_days * 86_400_000).toISOString() });
  if (loai === v.phieu.role_code && loaiToChuc === v.phieu.org_role_code) await env.DB.batch([keoDaiHan]);
  else {
    // Loại khoá sau lần gửi đầu (trigger dk_registration_immutable): báo trước bằng 409, không để trigger làm hỏng lô.
    if (v.phieu.current_version > 0) return error(409, "role_locked", CAU_PHIEU.loaiKhoa);
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([
        doiLoaiStatement(env.DB, { registrationId, role: loai, roleToChuc: loaiToChuc, identityId, at: v.at }),
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

// ---- POST /api/dang-ky/phieu/gui ---- thân `{ chinhSachPhienBan, hoTen, ngaySinh?, diaChi?, dienThoai?, gioiTinh?, giayTo?, nguoiGioiThieu?, toChuc? }` (`toChuc` vắng / null = không có phần tổ chức)
// Tập trường nhận và hàm kiểm dựng từ tệp ánh xạ (ADR-0212 Đ9), không khai tay.
const laVat = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const co = (x: unknown): boolean => x !== undefined && x !== null && !(typeof x === "string" && x.trim() === "");
const loi = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Kiểm HÌNH THỨC bản khai ĐANG GỬI bằng luật thuần của tự khai (parties); giá trị khai là đề xuất, câu báo lỗi không nhắc lại giá trị. Trả bản khai chuẩn hoá và các dữ kiện để kiểm mục bắt buộc. */
function kiemBanKhai(body: Record<string, unknown>, dm: DanhMucGiayTo, homNay: string): { ok: true; b: BanKhaiMoi; muc: Omit<DuLieuKiemMuc, "loaiHopLe" | "loaiToChucHopLe"> } | { ok: false; message: string } {
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

/** Kết quả xét «Mã vào tổ chức» lúc gửi (ADR-0213 Đ7.5). `hopLe` = thay được mục «vai»; `giu` = lời mời mới cần gắn vào phiếu; `dung` = lời mời lần gửi này dựa vào (câu giữ chỗ chạy lại
 * lính gác trong lô); `boGiu` = lời mời phiếu đang giữ phải bỏ giữ chỗ. */
interface XetLoiMoi { hopLe: boolean; giu: LoiMoiDong | null; boGiu: LoiMoiDong | null; dung: LoiMoiDong | null }
const GIO_MS = 3_600_000;

/**
 * Mã vào tổ chức (ADR-0213 Đ7.3, Đ7.5): có mã ⇒ đặt chỗ một lượt gõ (khoá `dk:moi:<danh tính>`, trần theo chính sách lời mời, một giờ) TRƯỚC khi so — gõ sai khuôn cũng tính; mã đúng, còn hạn,
 * lời mời còn mở (hoặc đang giữ cho chính phiếu này) và số điện thoại của bản khai trùng số được mời ⇒ hợp lệ, trả lại lượt. Mọi trường hợp sai: MỘT câu trung tính.
 * Không có mã mà phiếu đang giữ một lời mời: số của bản khai mới còn trùng ⇒ vẫn hợp lệ; khác ⇒ bỏ giữ chỗ trong lô gửi (mục «vai» quay lại đòi).
 */
async function xetLoiMoiKhiGui(ctx: Ctx<"public">, v: Vao, body: Record<string, unknown>): Promise<XetLoiMoi | Response> {
  const { env } = ctx;
  const { registrationId, identityId } = v.phien;
  let soKhai: string | null = null;
  if (co(body.dienThoai)) {
    const d = validateContact({ kind: "PHONE", value: body.dienThoai });
    soKhai = d.ok ? d.value.valueNormalized : null;
  }
  const cu = v.phieu.invite_id ? await loiMoiTheoId(env.DB, v.phieu.invite_id) : null;
  const cuDangGiu = cu !== null && cu.status === "GIU_CHO_PHIEU" && cu.held_registration_id === registrationId ? cu : null;
  if (co(body.maVaoToChuc)) {
    const cs = await chinhSachLoiMoi(env.DB, v.at);
    if (!cs) return error(503, "invite_policy_missing", "Chưa có chính sách lời mời. Hãy báo Tour Đảo.");
    const dat = await reserveAttempts(env.DB, [{ key: dkMoiKey(identityId), max: cs.wrong_per_hour }], v.nowMs, GIO_MS);
    if (!dat.allowed) return error(429, "invite_code_locked", "Bạn đã nhập sai mã vào tổ chức quá nhiều lần. Hãy thử lại sau.");
    const ma = chuanHoaMaVao(body.maVaoToChuc);
    const lm = ma ? await loiMoiTheoMa(env.DB, env.SESSION_SECRET, ma) : null;
    const ok = lm !== null && soKhai !== null && lm.phone_key === soKhai && lm.expires_at > v.at
      && (lm.status === "MO" || (lm.status === "GIU_CHO_PHIEU" && lm.held_registration_id === registrationId));
    if (!ok) return error(400, "invite_code_invalid", CAU_MA_VAO_SAI);
    await clearAttempts(env.DB, null, dat.ids);
    return { hopLe: true, giu: lm, boGiu: cuDangGiu && cuDangGiu.id !== lm.id ? cuDangGiu : null, dung: lm };
  }
  if (cuDangGiu) {
    return soKhai !== null && soKhai === cuDangGiu.phone_key ? { hopLe: true, giu: null, boGiu: null, dung: cuDangGiu } : { hopLe: false, giu: null, boGiu: cuDangGiu, dung: null };
  }
  return { hopLe: false, giu: null, boGiu: null, dung: null };
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
  // Phần tổ chức và luật nối vai (ADR-0212 Đ2, Đ4) — thứ tự cố định của kế hoạch Task 5. Không câu nào nhắc lại giá trị đã khai.
  const coToChuc = body.toChuc !== undefined && body.toChuc !== null;
  const roleCaNhan = v.phieu.role_code;
  const roleToChuc = v.phieu.org_role_code;
  if (coToChuc && !chinhSachRT.coToChuc) return error(409, "org_section_closed", CAU_PHIEU.toChucDong);
  const loiMoi = await xetLoiMoiKhiGui(ctx, v, body);
  if (loiMoi instanceof Response) return loiMoi;
  // Mã vào tổ chức + phần tổ chức trên cùng phiếu: ADR-0213 chưa nói ⇒ từ chối (người được mời vào tổ chức có sẵn không khai tổ chức mới). Câu mới — chờ chủ chọn.
  // Vòng sửa 1 Task 15 (m5): mã gõ trong lần gửi này ⇒ người đăng ký bỏ được mã; giữ chỗ từ LẦN GỬI TRƯỚC (thân không có mã) ⇒ không bỏ được, chỉ đường khác.
  if (loiMoi.hopLe && coToChuc) {
    return error(400, "invite_with_org", co(body.maVaoToChuc)
      ? "Phiếu có mã vào tổ chức thì không khai thêm phần tổ chức. Hãy bỏ phần tổ chức, hoặc bỏ mã."
      : "Phiếu đã dùng mã vào tổ chức từ lần gửi trước nên không khai thêm phần tổ chức được. Hãy bỏ phần tổ chức, hoặc liên hệ Tour Đảo nếu cần đổi.");
  }
  // Đ2.6: tài khoản mang quyền khác Đối tác (Tài xế đối tác) không gắn vào tổ chức được.
  if (loiMoi.hopLe && roleCaNhan !== "" && isRoleCode(roleCaNhan) && ROLES[roleCaNhan].defaults.some((q) => q !== "PARTNER")) {
    return error(400, "invite_role_not_partner", "Vai này không gắn vào tổ chức được. Hãy bỏ mã vào tổ chức, hoặc chọn vai khác.");
  }
  // Task 5 vòng sửa 1 (I2): phần tổ chức đòi vai của tổ chức. Vai này khoá sau lần gửi đầu (trigger dk_registration_immutable) ⇒ gửi lại kèm phần tổ chức mà vai còn rỗng cũng 400.
  if (coToChuc && roleToChuc === null) return error(400, "org_role_required", CAU_PHIEU.chonVaiToChuc);
  if (!coToChuc && [roleCaNhan, roleToChuc].some((r) => r && phanCuaVai(r, false) === "CHI_TO_CHUC")) return error(400, "org_section_required", CAU_PHIEU.canPhanToChuc);
  if (coToChuc && roleCaNhan === "DRIVER_EXTERNAL") return error(400, "driver_without_org", CAU_PHIEU.taiXeKhongKemToChuc);
  // Vai cá nhân rỗng chỉ đi kèm phần tổ chức có vai («chỉ tổ chức», Task 13; vai tổ chức đã kiểm ở trên).
  // ADR-0213 Đ7.5: mã vào tổ chức hợp lệ thay mục «vai» — vai cá nhân rỗng được.
  if (roleCaNhan === "" && !loiMoi.hopLe && !vaiCaNhanRongDuoc(MOI_TRUONG_MO, coToChuc)) return error(400, "personal_role_required", CAU_PHIEU.chonVaiCaNhan);
  // Vai của tổ chức không đứng một mình: đã khoá (phiếu đã gửi kèm phần tổ chức) thì không bỏ phần đó được; chưa gửi thì phải khai phần tổ chức.
  if (!coToChuc && roleToChuc !== null) {
    return v.phieu.current_version > 0 ? error(400, "org_section_locked", CAU_PHIEU.khongBoToChuc) : error(400, "org_section_required", CAU_PHIEU.canPhanToChuc);
  }
  const tepTheoO = await trangThaiTepChoTheoO(env.DB, registrationId);
  // Ruling điều phối 16/11 (chặn phát hành mốc A): không khai phần tổ chức thì không để ảnh của ô tổ chức nằm chờ — lô duyệt sẽ không có hồ sơ tổ chức nào để nhận chúng.
  if (!coToChuc && tepTheoO.some((t) => O_TEP_TO_CHUC.includes(t.slot))) return error(400, "org_photo_without_org", CAU_PHIEU.anhToChucKhongPhan);
  if (coToChuc && !tepTheoO.some((t) => t.slot === "GPKD" && t.daLuu)) return error(400, "org_photo_missing", CAU_PHIEU.thieuAnhGpkd);

  const homNay = vnToday(new Date(v.nowMs));
  const k = kiemBanKhai(body, await danhMucGiayToChoDangKy(env.DB, homNay), homNay);
  if (!k.ok) return error(400, "invalid_input", k.message);
  let toChuc: PhanToChucMoi | null = null;
  if (coToChuc) {
    if (typeof body.toChuc !== "object" || Array.isArray(body.toChuc)) return error(400, "invalid_input", "Nhập thông tin tổ chức.");
    const t = kiemPhanToChuc(body.toChuc as Record<string, unknown>, await danhMucGiayToToChucChoDangKy(env.DB), homNay);
    if (!t.ok) return error(400, "invalid_input", t.message);
    toChuc = t.value;
  }
  // Mục bắt buộc = HỢP của mục chỉ phiếu cần (chính sách đăng ký) và mục bắt buộc của hồ sơ cá nhân (parties, view công bố) — ADR-0210 Đ1. Vai (ROLE) luôn bắt buộc;
  // ADR-0212 Đ4: ROLE đạt khi có vai cá nhân HOẶC vai của tổ chức (đang mở, và phiếu có phần tổ chức).
  const [rieng, hoSo] = await Promise.all([mucRiengCuaPhieu(env.DB, v.at), mucXacMinhBatBuocCaNhan(env.DB)]);
  const batBuoc = [...new Set(["ROLE", ...mucBatBuoc(rieng, hoSo.map((m) => m.ma))])];
  const mo = await loaiMoHienTai(env.DB, v.chinhSach.open_role_codes);
  const loaiHopLe = roleCaNhan !== "" && mo.some((x) => x.ma === roleCaNhan);
  const loaiToChucHopLe = coToChuc && roleToChuc !== null && mo.some((x) => x.ma === roleToChuc && x.phan !== "CA_NHAN");
  // Mốc A kiểm cuối (m2): vai đã lưu phải TỰ NÓ còn mở — vai cá nhân đóng sau khi chọn không được lọt nhờ vai của tổ chức còn mở (và ngược lại).
  if (roleCaNhan !== "" && !loaiHopLe) return error(400, "invalid_input", CAU_PHIEU.loaiDong);
  if (coToChuc && roleToChuc !== null && !loaiToChucHopLe) return error(400, "invalid_input", CAU_PHIEU.loaiToChucDong);
  const thieu = mucChuaDapUng(batBuoc, { loaiHopLe, loaiToChucHopLe, coLoiMoi: loiMoi.hopLe, ...k.muc });
  if (thieu.length > 0) return error(400, "items_missing", `Chưa đủ thông tin để gửi: ${thieu.map(nhanMucChoNguoiDangKy).join(", ")}.`);

  const submissionId = crypto.randomUUID();
  // Thứ tự lô CỐ ĐỊNH (ADR-0212 Đ4): [chèn bản khai, chèn phần tổ chức cùng phiên bản (nếu có), đưa phiếu sang CHỜ XÁC MINH, dòng lịch sử]. Không câu nào chạm pty_*, staff.
  const iTien = toChuc ? 2 : 1;
  let kq: D1Result[] | null = null;
  try {
    kq = await env.DB.batch([
      guiChenStatement(env.DB, { id: submissionId, registrationId, policyId: chinhSachRT.id, at: v.at, identityId, phienBanDaDoc: v.phieu.current_version, b: k.b, coLoiMoi: loiMoi.hopLe }),
      ...(toChuc ? [guiChenToChucStatement(env.DB, { id: crypto.randomUUID(), submissionId, at: v.at, identityId, t: toChuc })] : []),
      guiTienStatement(env.DB, { registrationId, submissionId, at: v.at, identityId }),
      suKienNguoiDangKyStatement(env.DB, { registrationId, identityId, command: v.phieu.current_version === 0 ? "GUI" : "GUI_LAI", at: v.at }),
      // ADR-0213 Đ7.5 — CUỐI lô (chỉ số `iTien` giữ nguyên): bỏ giữ chỗ lời mời cũ (số đổi / mã mới), rồi gắn mã định danh lời mời mới vào phiếu (chỉ khi lần gửi này thắng) và giữ chỗ
      // (lính gác NULL-on-invalid: lời mời vừa bị huỷ / dùng / hết hạn ⇒ CẢ lô hỏng, không bản khai nào sinh ra). Phiếu không bao giờ chứa mã.
      // Vòng sửa 1 Task 15 (m4): câu chốt «lô này đã thắng» đứng TRƯỚC mọi câu lời mời — lô thua (bản khai khớp 0 dòng) hỏng cả lô, không giữ chỗ / bỏ giữ chỗ mồ côi.
      ...(loiMoi.boGiu || (loiMoi.hopLe && loiMoi.dung) ? [guiChotThangStatement(env.DB, { registrationId, submissionId })] : []),
      ...(loiMoi.boGiu ? [cauBoGiuChoLoiMoi(env.DB, { id: loiMoi.boGiu.id, registrationId, at: v.at, by: identityId })] : []),
      ...(loiMoi.giu ? [ganLoiMoiStatement(env.DB, { registrationId, inviteId: loiMoi.giu.id, at: v.at })] : []),
      // Mọi lần gửi dựa vào lời mời (mã mới, hoặc lời mời phiếu đang giữ) đều chạy câu giữ chỗ: lính gác xét lại NGAY TRONG lô (còn mở / đang giữ cho phiếu này, còn hạn, cùng số).
      ...(loiMoi.hopLe && loiMoi.dung ? [cauGiuChoLoiMoi(env.DB, { id: loiMoi.dung.id, registrationId, phoneKey: loiMoi.dung.phone_key, at: v.at })] : []),
    ]);
  } catch (e) {
    if (LOI_GAC_LOI_MOI.test(e instanceof Error ? e.message : "")) return error(400, "invite_code_invalid", CAU_MA_VAO_SAI);
    // Hai lô đua nhau: lớp cuối là UNIQUE(registration_id, version) và trigger dk_submission_version — coi như lô này khớp 0 dòng, đọc lại. Câu chốt «lô đã thắng» (vòng sửa 1 m4) cũng vậy.
    if (!/dk_submission_version|dk_submission_org_version|UNIQUE constraint failed: dk_submission/.test(e instanceof Error ? e.message : "") && !LOI_CHOT_GUI_THUA.test(e instanceof Error ? e.message : "")) throw e;
  }
  if (kq !== null && (kq[iTien]?.meta.changes ?? 0) === 1) return tra(ctx, v, await dtoPhieu(env.DB, registrationId, identityId));
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
      // ADR-0213 Đ7.5: phiếu kết thúc không duyệt ⇒ bỏ giữ chỗ lời mời (CUỐI lô; câu tự canh «đang giữ cho đúng phiếu này»).
      ...(v.phieu.invite_id ? [cauBoGiuChoLoiMoi(env.DB, { id: v.phieu.invite_id, registrationId, at: v.at, by: identityId })] : []),
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
