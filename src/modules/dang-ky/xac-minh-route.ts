// Route của người trong công ty ở bước XÁC MINH phiếu đăng ký (ADR-0207 Đ1, Đ2, Đ3, Đ9; ADR-0208 Đ3; ADR-0210 Đ1). Cổng `accounts`; MỖI route hỏi ô quyền trong thân.
// Ai làm được: xem hàng chờ = `registration.queue.view` (Nhân sự chỉ thấy phiếu CHỜ DUYỆT, không có tên nào); xem nội dung, kết luận, ba lệnh kết thúc = `party.verify` VÀ `party.view`
// (Nhân sự không có `party.view` nên 403); xem đủ số và mở ảnh còn đòi `party.verify.attachment`. Nội dung CHỈ trả khi phiếu còn CHỜ XÁC MINH (ADR-0125 đ6 — xử lý xong không xem lại).
// Số đầy đủ và ảnh: nhật ký ghi TRƯỚC (`await batch`); nhật ký lỗi thì ném lên (500), KHÔNG trả dữ liệu. Nhật ký và lịch sử phiếu không chứa SĐT, email, số giấy tờ, ngày sinh, địa chỉ, khoá kho.
// Mỗi lệnh ghi là MỘT `db.batch`: [câu đổi có điều kiện trạng thái, dòng lịch sử (WHERE changes() > 0), nhật ký (onlyIf changes() > 0), …]; câu đầu đổi 0 dòng ⇒ phiếu đã bị người khác xử lý ⇒ 409.
import { MA_LY_DO_PHIEU, cauLyDoChoNguoiDangKy, nhanLyDoPhieu, nhanMucXacMinh } from "../../shared/dang-ky-hien-thi.ts";
import { MA_MUC_TO_CHUC } from "../../shared/dau-xac-minh.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { can } from "../../shared/permissions.ts";
import { groupOf, isRoleCode, type RoleCode } from "../../shared/roles.ts";
import type { Ctx } from "../../shared/router.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { auditStatement } from "../audit";
import {
  accountRolesOf, cauGoTepChoNeuTruocDoi, cheSo, hoSoCaNhanKhop, hoSoTheoSoGiayTo, hoSoToChucKhop, khoTepChoSanSang, moTepChoTuKho, mucXacMinhBatBuocCaNhan, mucXacMinhBatBuocToChuc, tenLoaiGiayToToChuc,
  partySummary, tepChoDeXemCuaPhieu, timTepChoDeXem, toChucDichHopLe, trungToChucKhac, xoaKhoTepChoDaGo,
  tenLoaiVai, cauBoGiuChoLoiMoi, loiMoiTheoId, type LoiMoiDong,
} from "../parties";
import { getStaffAccountOfParty } from "../staff";
import {
  banKhaiToChucDayDu, banKhaiXet, boSungStatement, cauXepThu, chinhSachHienHanh, datStatement, hangCho, ketLuanMoiNhat, ketLuanMucStatement, mucRiengCuaPhieu, phieuXet, soDayDuCuaBanKhai, suKienNhanVienStatement, tuChoiStatement,
  type PhieuXetRow,
} from "./repository.ts";
import { kiemDat, kiemKetLuan, kiemLyDo, laMaPhieu, laMaTep, loiLoXacMinh, mucBatBuoc, mucChuaDat, type KetQuaMuc } from "./xac-minh.ts";
import { TRANG_THAI_CUA_THU, docLenhThu, maLenhThu } from "./rules.ts";
import { guiThuSauLo } from "./thu-bao.ts";
import { kiemVaiKhiDuyet } from "./vai.ts";

type Staff = Ctx<"accounts">["staff"];

export const CAM = () => error(403, "forbidden", "Bạn không có quyền xác minh phiếu đăng ký.");
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy phiếu.");
const DA_XU_LY = () => error(403, "registration_processed", "Phiếu đã được xử lý — không xem lại được.");
const DOI_PHIEN_BAN = () => error(409, "registration_version_changed", "Phiếu đã thay đổi từ lúc bạn mở. Hãy mở lại phiếu để xem bản mới.");
const KHONG_CON_CHO = () => error(409, "registration_state_changed", "Phiếu vừa được người khác xử lý hoặc không còn chờ xác minh. Hãy mở lại phiếu.");

// Cổng quyền của từng route nằm ở THÂN route trong index.ts (hàng rào route-write-guard đọc chữ `if (!can(…)) return …` ở đó): bước xác minh = `party.verify` VÀ `party.view` (ADR-0207 Đ1;
// Nhân sự giữ `party.verify` nhưng không `party.view` ⇒ 403); xem đủ số, mở ảnh thêm `party.verify.attachment`; hàng chờ = `registration.queue.view`. Các hàm dưới đây CHỈ chạy sau cổng đó.

const idPhieu = (params: Record<string, string>): string | null => (laMaPhieu(params.id) ? params.id! : null);

/**
 * Mục phải «đạt» cho phiếu: hợp của mục chỉ phiếu cần (chính sách đang hiệu lực), mục bắt buộc của hồ sơ cá nhân (parties) và — CHỈ khi bản khai `version` có phần tổ chức — mục bắt buộc
 * của hồ sơ tổ chức (ADR-0212 Đ5 mục 2). Phiếu không có phần tổ chức không bao giờ bị đòi mục tổ chức.
 */
export async function mucPhaiDat(db: D1Database, at: string, p: { id: string; current_version: number }): Promise<string[]> {
  const [rieng, hoSo, toChuc] = await Promise.all([
    mucRiengCuaPhieu(db, at), mucXacMinhBatBuocCaNhan(db),
    p.current_version >= 1 ? banKhaiToChucDayDu(db, p.id, p.current_version).then((o) => (o ? mucXacMinhBatBuocToChuc(db) : [])) : Promise.resolve([]),
  ]);
  return mucBatBuoc(rieng, [...hoSo.map((m) => m.ma), ...toChuc.map((m) => m.ma)]);
}
/** Tách danh sách mục thành hai nhóm của màn xác minh (ADR-0212 Đ5 mục 1): tổ chức = mã thuộc phần tổ chức của tập đóng; còn lại (kể cả mục chỉ phiếu cần) là nhóm cá nhân. */
export const tachMuc = <T extends { ma: string }>(ds: readonly T[]): { muc: T[]; mucToChuc: T[] } => ({ muc: ds.filter((m) => !MA_MUC_TO_CHUC.has(m.ma)), mucToChuc: ds.filter((m) => MA_MUC_TO_CHUC.has(m.ma)) });
export async function moiNhat(db: D1Database, p: PhieuXetRow): Promise<Map<string, { ketQua: KetQuaMuc; lyDo: string | null }>> {
  if (p.current_version < 1) return new Map();
  return new Map((await ketLuanMoiNhat(db, p.id, p.current_version)).map((r) => [r.item_code, { ketQua: r.result, lyDo: r.reason_code }]));
}
export const dsMuc = (batBuoc: readonly string[], kl: Map<string, { ketQua: KetQuaMuc; lyDo: string | null }>) =>
  batBuoc.map((ma) => ({ ma, nhan: nhanMucXacMinh(ma), ketLuan: kl.get(ma)?.ketQua ?? null, lyDo: kl.get(ma)?.lyDo ? { ma: kl.get(ma)!.lyDo!, nhan: nhanLyDoPhieu(kl.get(ma)!.lyDo!) } : null }));

/** Thư báo mới nhất của dòng hàng chờ, CHỈ khi phiếu còn ở đúng trạng thái của thư đó (thư «cần bổ sung» cũ của phiếu đã gửi lại thì không hiện). */
function thuCuaDong(r: { status: string; thu: string | null }): ReturnType<typeof docLenhThu> {
  const t = docLenhThu(r.thu);
  return t && TRANG_THAI_CUA_THU[t.loai] === r.status ? t : null;
}

// ---- GET /api/dang-ky/hang-cho ----
export async function xemHangCho({ env, staff }: Ctx<"accounts">): Promise<Response> {
  // Lọc theo năng lực (không phải cổng): xác minh được ⇒ phiếu chưa kết thúc; account.create ⇒ CHỜ DUYỆT + ĐÃ DUYỆT chưa kích hoạt; cả hai ⇒ hợp. Chỉ mã, loại, mốc — không tên, không liên hệ.
  // `thu` = thư báo mới nhất của phiếu (loại + chờ / đã gửi / lỗi — ADR-0206 Đ13); `conNua` = còn phiếu ngoài trần (rà soát cuối I-4).
  const { ds, conNua } = await hangCho(env.DB, { xacMinh: can(staff, "party.verify") && can(staff, "party.view"), duyet: can(staff, "account.create") });
  const ten = await tenLoaiVai(env.DB);
  return json({ phieu: ds.map((r) => ({ id: r.id, trangThai: r.status, loai: r.role_code, tenLoai: ten.get(r.role_code) ?? r.role_code, phienBan: r.current_version, guiLuc: r.submitted_at, thu: thuCuaDong(r) })), conNua });
}

// ---- GET /api/dang-ky/phieu/:id ----
export async function xemPhieu({ env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  const tenLoai = (await tenLoaiVai(env.DB)).get(p.role_code) ?? p.role_code;
  // Chỉ phiếu CHỜ XÁC MINH có nội dung. Đã xử lý, đã chuyển bước, hay đang điền: chỉ tóm tắt (mã, loại, trạng thái) — không tên, không liên hệ, không số.
  if (p.status !== "CHO_XAC_MINH" || p.current_version < 1) return json({ id: p.id, loai: p.role_code, tenLoai, trangThai: p.status, phienBan: p.current_version, daXuLy: true });
  const at = new Date().toISOString();
  const [bk, batBuoc, kl, tep, org] = await Promise.all([
    banKhaiXet(env.DB, p.id, p.current_version), mucPhaiDat(env.DB, at, p), moiNhat(env.DB, p), tepChoDeXemCuaPhieu(env.DB, p.id), banKhaiToChucDayDu(env.DB, p.id, p.current_version),
  ]);
  if (!bk) return json({ id: p.id, loai: p.role_code, tenLoai, trangThai: p.status, phienBan: p.current_version, daXuLy: true });
  const hoTen = [bk.family_name, bk.middle_name, bk.given_name].filter((x): x is string => !!x).join(" ");
  const [theoTen, theoSo] = await Promise.all([
    hoSoCaNhanKhop(env.DB, { phone: bk.phone_key, ten: hoTen }),
    bk.number_key ? hoSoTheoSoGiayTo(env.DB, bk.number_key) : Promise.resolve([]),
  ]);
  const goiY = new Map<string, { id: string; tenHoSo: string; vai: string[]; lyDo: ("PHONE" | "NAME" | "DOCUMENT")[] }>();
  for (const r of theoTen) goiY.set(r.id, { id: r.id, tenHoSo: r.displayName, vai: r.vai, lyDo: [...r.lyDo] });
  for (const r of theoSo) {
    const c = goiY.get(r.id);
    if (c) c.lyDo.push("DOCUMENT");
    else goiY.set(r.id, { id: r.id, tenHoSo: r.displayName, vai: r.vai, lyDo: ["DOCUMENT"] });
  }
  // Đối chiếu Danh bạ cho TỔ CHỨC (ADR-0212 Đ5 mục 3): chỉ hồ sơ tổ chức đang dùng, chưa gộp; thứ tự mã số thuế → GPKD → tên. Không trả số.
  const goiYToChuc = org ? await hoSoToChucKhop(env.DB, { taxKey: org.tax_key, gpkdKey: org.gpkd_key, ten: org.display_name }) : [];
  const nhom = tachMuc(dsMuc(batBuoc, kl));
  return json({
    id: p.id, loai: p.role_code, tenLoai, trangThai: p.status, phienBan: p.current_version, guiLuc: p.submitted_at,
    noiDung: {
      hoTen, gioiTinh: bk.gender, ngaySinh: bk.birth_date, diaChi: bk.address_value, soDienThoai: bk.phone_value, nguoiGioiThieuKhai: bk.referrer_text,
      giayTo: bk.document_type_code ? { loai: bk.document_type_code, soChe: cheSo(bk.number_key), hang: bk.license_class_code, ngayCap: bk.issued_date, noiCap: bk.issued_place, hetHan: bk.expiry_date } : null,
    },
    muc: nhom.muc,
    // Phần tổ chức (ADR-0212 Đ5): mã số thuế, số GPKD, số giấy phép CHỈ ở dạng che (vài số cuối, từ khoá). Nơi cấp có mặt vì người xác minh đối chiếu với ảnh — cùng cách với nơi cấp căn cước
    // ở `noiDung.giayTo`. Phiếu không có phần tổ chức ⇒ null.
    toChuc: org ? {
      loaiToChuc: p.org_role_code, tenLoaiToChuc: p.org_role_code ? (await tenLoaiVai(env.DB)).get(p.org_role_code) ?? p.org_role_code : null, tenToChuc: org.display_name, tenPhapLy: org.legal_name, maSoThueChe: cheSo(org.tax_key), diaChi: org.address, emailHoaDon: org.invoice_email,
      soDienThoai: org.phone_value, gpkd: { soChe: cheSo(org.gpkd_key), ngayCap: org.gpkd_issued_date, noiCap: org.gpkd_issued_place },
      giayPhepThem: org.extra_type_code ? { loai: org.extra_type_code, tenLoai: (await tenLoaiGiayToToChuc(env.DB)).get(org.extra_type_code) ?? org.extra_type_code, soChe: cheSo(org.extra_key), ngayCap: org.extra_issued_date, noiCap: org.extra_issued_place, hetHan: org.extra_expiry_date } : null,
    } : null,
    mucToChuc: nhom.mucToChuc,
    tep: tep.map((t) => ({ id: t.id, o: t.slot })),
    goiY: [...goiY.values()],
    goiYToChuc: goiYToChuc.map((r) => ({ id: r.id, tenHoSo: r.displayName, lyDo: r.lyDo })),
    ketLuanDanhBa: p.match_kind ? { kieu: p.match_kind, partyId: p.match_party_id } : null,
    ketLuanDanhBaToChuc: p.org_match_kind ? { kieu: p.org_match_kind, partyId: p.org_match_party_id } : null,
    lyDoCoThe: MA_LY_DO_PHIEU.map((ma) => ({ ma, nhan: nhanLyDoPhieu(ma) })),
    loiMoiVaoToChuc: await loiMoiCuaPhieu(env.DB, p, bk.phone_key, can(staff, "party.view")), // ADR-0213 Đ7.5: dòng «lời mời đã bị huỷ» / «đang giữ»
  }); // json() mặc định cache-control: no-store
}

/**
 * Dòng «mã vào tổ chức» cho người xác minh và người duyệt (ADR-0213 Đ7.5): phiếu có gắn lời mời ⇒ trạng thái so với phiếu này và số điện thoại của bản khai đang xem. Tên tổ chức CHỈ khi người
 * xem được xem Danh bạ (khuôn tên hồ sơ đích, ADR-0207 Đ4). Không số điện thoại, không mã. Câu là chữ mới — chờ chủ chọn.
 */
export interface LoiMoiPhieuDto { trangThai: "DANG_GIU" | "DA_HUY" | "KHONG_CON_GIU"; khopSoDienThoai: boolean; tenToChuc?: string; dong: string }
export function dongLoiMoiPhieu(lm: LoiMoiDong | null, registrationId: string, soBanKhai: string | null, xemTen: boolean): LoiMoiPhieuDto | null {
  if (!lm) return null;
  const ten = xemTen ? { tenToChuc: lm.org_name } : {};
  if (lm.status === "DA_HUY") return { trangThai: "DA_HUY", khopSoDienThoai: false, ...ten, dong: "Lời mời đã bị huỷ: phiếu đi tiếp như phiếu không có mã. Người đăng ký cần chọn một vai người dùng cá nhân, hoặc từ chối phiếu." };
  if (lm.status !== "GIU_CHO_PHIEU" || lm.held_registration_id !== registrationId) {
    return { trangThai: "KHONG_CON_GIU", khopSoDienThoai: false, ...ten, dong: "Lời mời không còn giữ cho phiếu này: phiếu đi tiếp như phiếu không có mã." };
  }
  const khop = soBanKhai !== null && soBanKhai === lm.phone_key;
  return khop
    ? { trangThai: "DANG_GIU", khopSoDienThoai: true, ...ten, dong: "Người đăng ký có mã vào tổ chức. Khi duyệt, họ thành thành viên của tổ chức đã mời." }
    : { trangThai: "DANG_GIU", khopSoDienThoai: false, ...ten, dong: "Số điện thoại của bản khai khác số được mời: khi duyệt, lời mời sẽ không được dùng." };
}
export async function loiMoiCuaPhieu(db: D1Database, p: Pick<PhieuXetRow, "id" | "invite_id">, soBanKhai: string | null, xemTen: boolean): Promise<LoiMoiPhieuDto | null> {
  return p.invite_id ? dongLoiMoiPhieu(await loiMoiTheoId(db, p.invite_id), p.id, soBanKhai, xemTen) : null;
}

/** Nạp phiếu cho các lệnh ghi: 404 nếu không có; 409 nếu không còn chờ xác minh. */
async function phieuChoXacMinh(env: Ctx<"accounts">["env"], params: Record<string, string>): Promise<{ p: PhieuXetRow } | Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  if (p.status !== "CHO_XAC_MINH" || p.current_version < 1) return KHONG_CON_CHO();
  return { p };
}

/** Câu ghi trúng 0 dòng: bản khai đã đổi (phiếu vẫn chờ xác minh) hay phiếu đã chuyển bước. */
async function loiKhongGhi(env: Ctx<"accounts">["env"], id: string, phienBan: number): Promise<Response> {
  const p = await phieuXet(env.DB, id);
  return p && p.status === "CHO_XAC_MINH" && p.current_version !== phienBan ? DOI_PHIEN_BAN() : KHONG_CON_CHO();
}

// ---- POST /api/dang-ky/phieu/:id/ket-luan ----
export async function ketLuanMuc({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const r = await phieuChoXacMinh(env, params);
  if (r instanceof Response) return r;
  const { p } = r;
  const at = new Date().toISOString();
  const k = kiemKetLuan(await readJson(request), await mucPhaiDat(env.DB, at, p));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { muc, dat, lyDo, phienBan } = k.value;
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN(); // người đăng ký đã gửi lại sau khi bạn mở phiếu
  const kq = await env.DB.batch([
    ketLuanMucStatement(env.DB, { registrationId: p.id, item: muc, dat, lyDo, by: staff.id, at, phienBan }),
    suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "KET_LUAN", lyDo, at }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_item_concluded", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · mục ${muc} · ${dat ? "đạt" : `không đạt · ${lyDo}`}` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  const batBuoc = await mucPhaiDat(env.DB, at, p);
  return json({ phienBan, ...tachMuc(dsMuc(batBuoc, await moiNhat(env.DB, p))) });
}

// ---- POST /api/dang-ky/phieu/:id/xem-so ----
export async function xemSo({ env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  if (p.status !== "CHO_XAC_MINH" || p.current_version < 1) return DA_XU_LY();
  const so = await soDayDuCuaBanKhai(env.DB, p.id, p.current_version);
  if (!so) return error(404, "not_found", "Phiếu này không có số giấy tờ.");
  // Nhật ký TRƯỚC, không số (chỉ mã phiếu và mã loại giấy tờ). Ghi lỗi thì ném lên (500), không trả số.
  await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "registration_number_viewed", at: new Date().toISOString(), targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · ${so.document_type_code ?? "giấy tờ"}` })]);
  return json({ so: so.document_number });
}

// ---- GET /api/dang-ky/phieu/:id/tep/:tid ----
export async function moTep({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
  // GET không qua lớp chặn gọi chéo trang của router: chỉ nhận same-origin, none (mở thẳng) hoặc vắng header — cùng danh sách cho phép với ảnh giấy tờ của hồ sơ.
  const sfs = request.headers.get("sec-fetch-site");
  if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return CAM();
  if (!khoTepChoSanSang(env)) return error(503, "storage_unavailable", "Kho tệp hồ sơ chưa sẵn sàng. Hãy báo quản trị viên.");
  const id = idPhieu(params);
  const tid = laMaTep(params.tid) ? params.tid! : null;
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p || !tid) return KHONG_THAY();
  if (p.status !== "CHO_XAC_MINH" || p.current_version < 1) return DA_XU_LY();
  const tep = await timTepChoDeXem(env.DB, p.id, tid);
  if (!tep) return error(404, "not_found", "Không tìm thấy tệp này.");
  // Nhật ký TRƯỚC khi đọc kho; chỉ mã phiếu và mã tệp (không khoá kho). Ghi lỗi thì ném lên (500), KHÔNG đọc kho.
  await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "registration_file_viewed", at: new Date().toISOString(), targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · tệp ${tep.id}` })]);
  const obj = await moTepChoTuKho(env, tep);
  if (!obj) return error(404, "not_found", "Không tìm thấy tệp này.");
  return new Response(obj.body, { status: 200, headers: obj.headers });
}

// ---- POST /api/dang-ky/phieu/:id/dat ----
/**
 * Vai phiếu xin phải hợp lệ lúc bấm (ADR-0212 Đ1, một nguồn): vai bên ngoài sẵn có (RoleCode) ⇒ luôn qua; mã khác ⇒ CHỈ khi có trong `vaiDangKyDuoc`. Dùng ở «Xác minh đạt» (cả hồ sơ mới lẫn hồ sơ có sẵn, chặn sớm)
 * và lúc duyệt. Người xác minh không đổi được loại của phiếu nên câu ở bước xác minh không bảo «chọn loại khác»; người duyệt thì chọn lại được.
 */
export async function kiemVaiXin(db: D1Database, vaiXin: string, buoc: "XAC_MINH" | "DUYET"): Promise<{ code: string; message: string } | null> {
  if (isRoleCode(vaiXin)) return null;
  const v = await kiemVaiKhiDuyet(db, vaiXin);
  if (v.kq === "HOP_LE") return null;
  if (v.kq === "DA_TAT") {
    return { code: "role_inactive", message: buoc === "DUYET" ? "Vai người dùng này đã tắt. Hãy chọn vai người dùng khác hoặc từ chối phiếu." : "Vai người dùng của phiếu này đã tắt. Hãy trả phiếu về để người đăng ký bổ sung hoặc từ chối phiếu." };
  }
  return { code: "role_invalid", message: "Loại xin đăng ký không hợp lệ. Hãy từ chối phiếu hoặc trả về để người đăng ký chọn lại." };
}

/** Hồ sơ đích «gắn hồ sơ có sẵn» phải qua đúng điều kiện của đường tạo tài khoản trên hồ sơ có sẵn (ADR-0207 Đ2 mục 4): cá nhân, đang dùng, chưa gộp, chưa có tài khoản, không lẫn nhóm vai. */
export async function kiemHoSoDich(db: D1Database, partyId: string, vaiXin: string | null): Promise<{ code: string; message: string } | null> {
  const ho = await partySummary(db, partyId);
  if (!ho) return { code: "target_not_found", message: "Không tìm thấy hồ sơ đã chọn." };
  if (ho.kind !== "PERSON") return { code: "target_not_person", message: "Chỉ gắn được vào hồ sơ cá nhân." };
  if (ho.mergedIntoId) return { code: "target_merged", message: "Hồ sơ này đã gộp vào hồ sơ khác — hãy chọn hồ sơ chính." };
  if (!ho.active) return { code: "target_inactive", message: "Hồ sơ đã chọn đang ngưng hoạt động." };
  if (await getStaffAccountOfParty(db, partyId)) return { code: "target_has_account", message: "Hồ sơ này đã có tài khoản." };
  const dangMo = (await accountRolesOf(db, partyId, vnToday(new Date()))).filter((r) => r.validTo === null).map((r) => r.roleTypeCode).filter((c): c is RoleCode => isRoleCode(c));
  // Vai xin là loại đối tác do Kế toán thêm (`LD_…`, không phải RoleCode): hợp lệ CHỈ khi có trong `vaiDangKyDuoc` (một nguồn, ADR-0212 Đ1); tính là nhóm bên ngoài khi xét lẫn nhóm.
  // Không vai cá nhân (phiếu «chỉ tổ chức», Task 13): tài khoản chỉ nhận quyền Đối tác (nhóm bên ngoài) ⇒ hồ sơ đang giữ vai nội bộ vẫn là lẫn nhóm.
  if (vaiXin !== null) {
    const loiVai = await kiemVaiXin(db, vaiXin, "DUYET");
    if (loiVai) return loiVai;
  }
  const loaiDoiTac = vaiXin === null || !isRoleCode(vaiXin);
  const nhomDangMo = groupOf(dangMo);
  if (groupOf([...dangMo, ...(vaiXin !== null && isRoleCode(vaiXin) ? [vaiXin] : [])]) === "MIXED" || (loaiDoiTac && (nhomDangMo === "INTERNAL" || nhomDangMo === "MIXED"))) return { code: "target_mixed_group", message: "Hồ sơ này đang giữ vai trò khác nhóm (nội bộ/bên ngoài) — hãy đóng vai trò đó trước." };
  return null;
}

/** Hồ sơ người giới thiệu: có thật, đang dùng, chưa gộp (cá nhân hay tổ chức đều giới thiệu được); khác hồ sơ đích (bảng quan hệ cấm nối hồ sơ với chính nó). Dùng ở «đạt» và lúc duyệt. */
export async function kiemNguoiGioiThieu(db: D1Database, partyId: string, hoSoDich: string | null): Promise<{ code: string; message: string } | null> {
  const ho = await partySummary(db, partyId);
  if (!ho) return { code: "referrer_not_found", message: "Không tìm thấy hồ sơ người giới thiệu." };
  if (ho.mergedIntoId) return { code: "referrer_merged", message: "Hồ sơ người giới thiệu đã gộp vào hồ sơ khác — hãy chọn hồ sơ chính." };
  if (!ho.active) return { code: "referrer_inactive", message: "Hồ sơ người giới thiệu đang ngưng hoạt động." };
  if (hoSoDich !== null && hoSoDich === partyId) return { code: "referrer_is_target", message: "Người giới thiệu không thể là chính hồ sơ được duyệt." };
  return null;
}

export async function xacMinhDat({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const r = await phieuChoXacMinh(env, params);
  if (r instanceof Response) return r;
  const { p } = r;
  const k = kiemDat(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  if (k.value.phienBan !== p.current_version) return DOI_PHIEN_BAN();
  // Người giới thiệu (ADR-0207 Đ2 mục 5): tuỳ chọn; lưu ở phiếu, lô duyệt ghi quan hệ «Người giới thiệu của». Lô duyệt kiểm lại lúc duyệt (hồ sơ có thể ngưng / gộp giữa chừng).
  if (k.value.nguoiGioiThieuPartyId !== null) {
    const dich = k.value.hoSo?.kieu === "CO_SAN" ? k.value.hoSo.partyId : k.value.hoSo === null ? p.match_party_id : null;
    const loi = await kiemNguoiGioiThieu(env.DB, k.value.nguoiGioiThieuPartyId, dich);
    if (loi) return error(409, loi.code, loi.message);
  }
  const at = new Date().toISOString();
  const batBuoc = await mucPhaiDat(env.DB, at, p);
  const thieu = mucChuaDat(batBuoc, new Map([...(await moiNhat(env.DB, p))].map(([m, v]) => [m, v.ketQua])));
  if (thieu.length > 0) return error(409, "items_not_passed", `Còn mục chưa đạt: ${thieu.map(nhanMucXacMinh).join(", ")}.`);
  if (k.value.hoSo === null && p.match_kind === null) return error(409, "registry_conclusion_missing", "Chưa có kết luận Danh bạ: hãy chọn «hồ sơ mới» hoặc gắn vào một hồ sơ có sẵn.");
  // Vai của phiếu kiểm cho CẢ hồ sơ mới lẫn hồ sơ có sẵn (một nguồn, chặn sớm): loại đã tắt không «đạt» để rồi kẹt ở bước duyệt.
  // Phiếu «chỉ tổ chức» (vai cá nhân rỗng — Task 13): kiểm vai của tổ chức thay vai cá nhân; rỗng cả hai ⇒ vai không hợp lệ.
  // ADR-0213 Đ7.5 (mốc B2 Task 15): rỗng cả hai nhưng phiếu có lời mời vào tổ chức ĐANG GIỮ cho chính nó, cùng số của bản khai ⇒ lời mời thay mục «vai» (không kiểm vai). Lời mời đã huỷ /
  // không còn giữ / số đổi ⇒ như phiếu không mã: 409 «vai không hợp lệ», người xác minh trả phiếu về để người đăng ký chọn vai, hoặc từ chối.
  const vaiCaNhan = p.role_code === "" ? null : p.role_code;
  const loiMoiThayVai = vaiCaNhan === null && p.org_role_code === null && p.invite_id !== null
    && (await loiMoiCuaPhieu(env.DB, p, (await banKhaiXet(env.DB, p.id, p.current_version))?.phone_key ?? null, false))?.khopSoDienThoai === true;
  const loiVai = loiMoiThayVai ? null : await kiemVaiXin(env.DB, vaiCaNhan ?? p.org_role_code ?? "", "XAC_MINH");
  if (loiVai) return error(409, loiVai.code, loiVai.message);
  if (k.value.hoSo?.kieu === "CO_SAN") {
    const loi = await kiemHoSoDich(env.DB, k.value.hoSo.partyId, vaiCaNhan);
    if (loi) return error(409, loi.code, loi.message);
  }
  // Phần tổ chức (ADR-0212 Đ5 mục 3, 4): bắt buộc kết luận Danh bạ của tổ chức (trong thân hoặc đã ghi); bản khai không có phần tổ chức thì không nhận kết luận này.
  const org = await banKhaiToChucDayDu(env.DB, p.id, p.current_version);
  const hoSoToChuc = k.value.hoSoToChuc;
  if (!org && hoSoToChuc) return error(400, "invalid_input", "Phiếu này không có phần tổ chức.");
  if (org) {
    const ketLuan = hoSoToChuc ?? (p.org_match_kind === "NEW" ? { kieu: "MOI" as const } : p.org_match_kind === "EXISTING" && p.org_match_party_id ? { kieu: "CO_SAN" as const, partyId: p.org_match_party_id } : null);
    if (!ketLuan) return error(409, "org_registry_conclusion_missing", "Chưa có kết luận Danh bạ cho tổ chức: hãy chọn «hồ sơ tổ chức mới» hoặc gắn vào một hồ sơ tổ chức có sẵn.");
    const dichToChuc = ketLuan.kieu === "CO_SAN" ? ketLuan.partyId : null;
    if (dichToChuc) {
      const loi = await toChucDichHopLe(env.DB, dichToChuc);
      if (loi) return error(409, loi.code, loi.message);
    }
    const trung = await trungToChucKhac(env.DB, { gpkdKey: org.gpkd_key, taxKey: org.tax_key, dich: dichToChuc });
    if (trung) return error(409, trung.code, trung.message);
  }
  const hoSo = k.value.hoSo;
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      datStatement(env.DB, { registrationId: p.id, by: staff.id, at, matchKind: hoSo ? (hoSo.kieu === "MOI" ? "NEW" : "EXISTING") : null, matchPartyId: hoSo?.kieu === "CO_SAN" ? hoSo.partyId : null, mucBatBuoc: batBuoc, phienBan: k.value.phienBan, referrerPartyId: k.value.nguoiGioiThieuPartyId,
        orgMatchKind: hoSoToChuc ? (hoSoToChuc.kieu === "MOI" ? "NEW" : "EXISTING") : null, orgMatchPartyId: hoSoToChuc?.kieu === "CO_SAN" ? hoSoToChuc.partyId : null }),
      suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "DAT", lyDo: null, at }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_verified", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · xác minh đạt · ${hoSo ? (hoSo.kieu === "MOI" ? "hồ sơ mới" : "gắn hồ sơ có sẵn") : "theo kết luận đã ghi"}${hoSoToChuc ? (hoSoToChuc.kieu === "MOI" ? " · hồ sơ tổ chức mới" : " · gắn tổ chức có sẵn") : ""}` }, "changes() > 0"),
    ]);
  } catch (e) {
    const l = loiLoXacMinh(e);
    if (l) return error(l.status, l.code, l.message);
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, k.value.phienBan);
  return json({ trangThai: "CHO_DUYET" });
}

// ---- POST /api/dang-ky/phieu/:id/bo-sung ----
export async function yeuCauBoSung({ request, env, staff, params, exec }: Ctx<"accounts">): Promise<Response> {
  const r = await phieuChoXacMinh(env, params);
  if (r instanceof Response) return r;
  const k = kiemLyDo(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { p } = r;
  const { lyDo, phienBan } = k.value;
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN(); // người đăng ký đã gửi lại sau khi bạn mở phiếu
  const at = new Date().toISOString();
  // Hạn sửa = lúc yêu cầu + `supplement_expire_days` của chính sách (PHU-LUC: 14 ngày); tác nhân dọn phiếu cho hết hạn theo mốc này. Không có dòng chính sách ⇒ 503 (không đoán con số).
  const cs = await chinhSachHienHanh(env.DB, at);
  if (!cs) return error(503, "registration_policy_missing", "Chưa có chính sách đăng ký. Hãy báo quản trị viên.");
  const expiresAt = new Date(Date.parse(at) + cs.supplement_expire_days * 86_400_000).toISOString();
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      boSungStatement(env.DB, { registrationId: p.id, lyDo, by: staff.id, at, phienBan, expiresAt }),
      suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "BO_SUNG", lyDo, at }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_supplement_requested", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · yêu cầu bổ sung · ${lyDo}` }, "changes() > 0"),
      cauXepThu(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu("BO_SUNG", "CHO"), at, trangThaiPhieu: "CAN_BO_SUNG" }), // thư «cần bổ sung» (ADR-0206 Đ13)
    ]);
  } catch (e) {
    const l = loiLoXacMinh(e);
    if (l) return error(l.status, l.code, l.message);
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: "BO_SUNG", daXep: (kq[3]?.meta.changes ?? 0) > 0 });
  return json({ trangThai: "CAN_BO_SUNG", lyDo: { ma: lyDo, nhan: cauLyDoChoNguoiDangKy(lyDo) } });
}

// ---- POST /api/dang-ky/phieu/:id/tu-choi ----
export async function tuChoiPhieu({ request, env, staff, params, exec }: Ctx<"accounts">): Promise<Response> {
  const r = await phieuChoXacMinh(env, params);
  if (r instanceof Response) return r;
  const k = kiemLyDo(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { p } = r;
  const { lyDo, phienBan } = k.value;
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN(); // người đăng ký đã gửi lại sau khi bạn mở phiếu
  const at = new Date().toISOString();
  let kq: D1Result[];
  try {
    // MỘT lô: đổi trạng thái → lịch sử → nhật ký → quyết gỡ mọi tệp chờ (chỉ khi câu liền trước đã ghi: phiếu bị người khác xử lý giữa chừng thì tệp ở lại). Xoá kho chạy SAU lô.
    kq = await env.DB.batch([
      tuChoiStatement(env.DB, { registrationId: p.id, lyDo, by: staff.id, at, phienBan }),
      suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "TU_CHOI", lyDo, at }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_rejected", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · từ chối · ${lyDo}` }, "changes() > 0"),
      cauGoTepChoNeuTruocDoi(env.DB, p.id, "TU_CHOI", at),
      // Thư «bị từ chối» (ADR-0206 Đ13): đứng CUỐI lô — câu gỡ tệp ngay trên đọc changes() của câu nhật ký; câu xếp thư có điều kiện riêng (phiếu vừa được chính lệnh này đổi).
      cauXepThu(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu("TU_CHOI", "CHO"), at, trangThaiPhieu: "TU_CHOI" }),
      // ADR-0213 Đ7.5: phiếu kết thúc không duyệt ⇒ bỏ giữ chỗ lời mời (SAU câu xếp thư — chỉ số kq[4] giữ nguyên; câu tự canh «đang giữ cho đúng phiếu này»).
      ...(p.invite_id ? [cauBoGiuChoLoiMoi(env.DB, { id: p.invite_id, registrationId: p.id, at, by: staff.id })] : []),
    ]);
  } catch (e) {
    const l = loiLoXacMinh(e);
    if (l) return error(l.status, l.code, l.message);
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: "TU_CHOI", daXep: (kq[4]?.meta.changes ?? 0) > 0, lyDo });
  await xoaKhoTepChoDaGo(env, p.id);
  return json({ trangThai: "TU_CHOI" });
}
