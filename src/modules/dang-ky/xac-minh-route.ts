// Route của người trong công ty ở bước XÁC MINH phiếu đăng ký (ADR-0207 Đ1, Đ2, Đ3, Đ9; ADR-0208 Đ3; ADR-0210 Đ1). Cổng `accounts`; MỖI route hỏi ô quyền trong thân.
// Ai làm được: xem hàng chờ = `registration.queue.view` (Nhân sự chỉ thấy phiếu CHỜ DUYỆT, không có tên nào); xem nội dung, kết luận, ba lệnh kết thúc = `party.verify` VÀ `party.view`
// (Nhân sự không có `party.view` nên 403); xem đủ số và mở ảnh còn đòi `party.verify.attachment`. Nội dung CHỈ trả khi phiếu còn CHỜ XÁC MINH (ADR-0125 đ6 — xử lý xong không xem lại).
// Số đầy đủ và ảnh: nhật ký ghi TRƯỚC (`await batch`); nhật ký lỗi thì ném lên (500), KHÔNG trả dữ liệu. Nhật ký và lịch sử phiếu không chứa SĐT, email, số giấy tờ, ngày sinh, địa chỉ, khoá kho.
// Mỗi lệnh ghi là MỘT `db.batch`: [câu đổi có điều kiện trạng thái, dòng lịch sử (WHERE changes() > 0), nhật ký (onlyIf changes() > 0), …]; câu đầu đổi 0 dòng ⇒ phiếu đã bị người khác xử lý ⇒ 409.
import { MA_LY_DO_PHIEU, cauLyDoChoNguoiDangKy, nhanLyDoPhieu, nhanMucXacMinh } from "../../shared/dang-ky-hien-thi.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { can } from "../../shared/permissions.ts";
import { groupOf, isRoleCode, type RoleCode } from "../../shared/roles.ts";
import type { Ctx } from "../../shared/router.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { auditStatement } from "../audit";
import {
  accountRolesOf, cauGoTepChoNeuTruocDoi, cheSo, hoSoCaNhanKhop, hoSoTheoSoGiayTo, khoTepChoSanSang, moTepChoTuKho, mucXacMinhBatBuocCaNhan, partySummary, tepChoDeXemCuaPhieu,
  timTepChoDeXem, xoaKhoTepChoDaGo,
} from "../parties";
import { getStaffAccountOfParty } from "../staff";
import {
  banKhaiXet, boSungStatement, datStatement, hangCho, ketLuanMoiNhat, ketLuanMucStatement, mucRiengCuaPhieu, phieuXet, soDayDuCuaBanKhai, suKienNhanVienStatement, tuChoiStatement,
  type PhieuXetRow,
} from "./repository.ts";
import { kiemDat, kiemKetLuan, kiemLyDo, laMaPhieu, laMaTep, loiLoXacMinh, mucBatBuoc, mucChuaDat, type KetQuaMuc } from "./xac-minh.ts";

type Staff = Ctx<"accounts">["staff"];

export const CAM = () => error(403, "forbidden", "Bạn không có quyền xác minh phiếu đăng ký.");
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy phiếu.");
const DA_XU_LY = () => error(403, "registration_processed", "Phiếu đã được xử lý — không xem lại được.");
const DOI_PHIEN_BAN = () => error(409, "registration_version_changed", "Phiếu đã thay đổi từ lúc bạn mở. Hãy mở lại phiếu để xem bản mới.");
const KHONG_CON_CHO = () => error(409, "registration_state_changed", "Phiếu vừa được người khác xử lý hoặc không còn chờ xác minh. Hãy mở lại phiếu.");

// Cổng quyền của từng route nằm ở THÂN route trong index.ts (hàng rào route-write-guard đọc chữ `if (!can(…)) return …` ở đó): bước xác minh = `party.verify` VÀ `party.view` (ADR-0207 Đ1;
// Nhân sự giữ `party.verify` nhưng không `party.view` ⇒ 403); xem đủ số, mở ảnh thêm `party.verify.attachment`; hàng chờ = `registration.queue.view`. Các hàm dưới đây CHỈ chạy sau cổng đó.

const idPhieu = (params: Record<string, string>): string | null => (laMaPhieu(params.id) ? params.id! : null);

/** Mục phải «đạt» cho phiếu: hợp của mục chỉ phiếu cần (chính sách đang hiệu lực) và mục bắt buộc của hồ sơ cá nhân (parties). */
export async function mucPhaiDat(db: D1Database, at: string): Promise<string[]> {
  const [rieng, hoSo] = await Promise.all([mucRiengCuaPhieu(db, at), mucXacMinhBatBuocCaNhan(db)]);
  return mucBatBuoc(rieng, hoSo.map((m) => m.ma));
}
export async function moiNhat(db: D1Database, p: PhieuXetRow): Promise<Map<string, { ketQua: KetQuaMuc; lyDo: string | null }>> {
  if (p.current_version < 1) return new Map();
  return new Map((await ketLuanMoiNhat(db, p.id, p.current_version)).map((r) => [r.item_code, { ketQua: r.result, lyDo: r.reason_code }]));
}
export const dsMuc = (batBuoc: readonly string[], kl: Map<string, { ketQua: KetQuaMuc; lyDo: string | null }>) =>
  batBuoc.map((ma) => ({ ma, nhan: nhanMucXacMinh(ma), ketLuan: kl.get(ma)?.ketQua ?? null, lyDo: kl.get(ma)?.lyDo ? { ma: kl.get(ma)!.lyDo!, nhan: nhanLyDoPhieu(kl.get(ma)!.lyDo!) } : null }));

// ---- GET /api/dang-ky/hang-cho ----
export async function xemHangCho({ env, staff }: Ctx<"accounts">): Promise<Response> {
  // Lọc theo năng lực (không phải cổng): xác minh được ⇒ phiếu chưa kết thúc; account.create ⇒ CHỜ DUYỆT + ĐÃ DUYỆT chưa kích hoạt; cả hai ⇒ hợp. Chỉ mã, loại, mốc — không tên, không liên hệ.
  const ds = await hangCho(env.DB, { xacMinh: can(staff, "party.verify") && can(staff, "party.view"), duyet: can(staff, "account.create") });
  return json({ phieu: ds.map((r) => ({ id: r.id, trangThai: r.status, loai: r.role_code, phienBan: r.current_version, guiLuc: r.submitted_at })) });
}

// ---- GET /api/dang-ky/phieu/:id ----
export async function xemPhieu({ env, staff, params }: Ctx<"accounts">): Promise<Response> {
  const id = idPhieu(params);
  const p = id ? await phieuXet(env.DB, id) : null;
  if (!p) return KHONG_THAY();
  // Chỉ phiếu CHỜ XÁC MINH có nội dung. Đã xử lý, đã chuyển bước, hay đang điền: chỉ tóm tắt (mã, loại, trạng thái) — không tên, không liên hệ, không số.
  if (p.status !== "CHO_XAC_MINH" || p.current_version < 1) return json({ id: p.id, loai: p.role_code, trangThai: p.status, phienBan: p.current_version, daXuLy: true });
  const at = new Date().toISOString();
  const [bk, batBuoc, kl, tep] = await Promise.all([banKhaiXet(env.DB, p.id, p.current_version), mucPhaiDat(env.DB, at), moiNhat(env.DB, p), tepChoDeXemCuaPhieu(env.DB, p.id)]);
  if (!bk) return json({ id: p.id, loai: p.role_code, trangThai: p.status, phienBan: p.current_version, daXuLy: true });
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
  return json({
    id: p.id, loai: p.role_code, trangThai: p.status, phienBan: p.current_version, guiLuc: p.submitted_at,
    noiDung: {
      hoTen, gioiTinh: bk.gender, ngaySinh: bk.birth_date, diaChi: bk.address_value, soDienThoai: bk.phone_value, nguoiGioiThieuKhai: bk.referrer_text,
      giayTo: bk.document_type_code ? { loai: bk.document_type_code, soChe: cheSo(bk.number_key), hang: bk.license_class_code, ngayCap: bk.issued_date, noiCap: bk.issued_place, hetHan: bk.expiry_date } : null,
    },
    muc: dsMuc(batBuoc, kl),
    tep: tep.map((t) => ({ id: t.id, o: t.slot })),
    goiY: [...goiY.values()],
    ketLuanDanhBa: p.match_kind ? { kieu: p.match_kind, partyId: p.match_party_id } : null,
    lyDoCoThe: MA_LY_DO_PHIEU.map((ma) => ({ ma, nhan: nhanLyDoPhieu(ma) })),
  }); // json() mặc định cache-control: no-store
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
  const k = kiemKetLuan(await readJson(request), await mucPhaiDat(env.DB, at));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const { muc, dat, lyDo, phienBan } = k.value;
  if (phienBan !== p.current_version) return DOI_PHIEN_BAN(); // người đăng ký đã gửi lại sau khi bạn mở phiếu
  const kq = await env.DB.batch([
    ketLuanMucStatement(env.DB, { registrationId: p.id, item: muc, dat, lyDo, by: staff.id, at, phienBan }),
    suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "KET_LUAN", lyDo, at }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_item_concluded", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · mục ${muc} · ${dat ? "đạt" : `không đạt · ${lyDo}`}` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  const batBuoc = await mucPhaiDat(env.DB, at);
  return json({ phienBan, muc: dsMuc(batBuoc, await moiNhat(env.DB, p)) });
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
/** Hồ sơ đích «gắn hồ sơ có sẵn» phải qua đúng điều kiện của đường tạo tài khoản trên hồ sơ có sẵn (ADR-0207 Đ2 mục 4): cá nhân, đang dùng, chưa gộp, chưa có tài khoản, không lẫn nhóm vai. */
export async function kiemHoSoDich(db: D1Database, partyId: string, vaiXin: string): Promise<{ code: string; message: string } | null> {
  const ho = await partySummary(db, partyId);
  if (!ho) return { code: "target_not_found", message: "Không tìm thấy hồ sơ đã chọn." };
  if (ho.kind !== "PERSON") return { code: "target_not_person", message: "Chỉ gắn được vào hồ sơ cá nhân." };
  if (ho.mergedIntoId) return { code: "target_merged", message: "Hồ sơ này đã gộp vào hồ sơ khác — hãy chọn hồ sơ chính." };
  if (!ho.active) return { code: "target_inactive", message: "Hồ sơ đã chọn đang ngưng hoạt động." };
  if (await getStaffAccountOfParty(db, partyId)) return { code: "target_has_account", message: "Hồ sơ này đã có tài khoản." };
  const dangMo = (await accountRolesOf(db, partyId, vnToday(new Date()))).filter((r) => r.validTo === null).map((r) => r.roleTypeCode).filter((c): c is RoleCode => isRoleCode(c));
  if (groupOf([...dangMo, ...(isRoleCode(vaiXin) ? [vaiXin] : [])]) === "MIXED") return { code: "target_mixed_group", message: "Hồ sơ này đang giữ vai trò khác nhóm (nội bộ/bên ngoài) — hãy đóng vai trò đó trước." };
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
  const batBuoc = await mucPhaiDat(env.DB, at);
  const thieu = mucChuaDat(batBuoc, new Map([...(await moiNhat(env.DB, p))].map(([m, v]) => [m, v.ketQua])));
  if (thieu.length > 0) return error(409, "items_not_passed", `Còn mục chưa đạt: ${thieu.map(nhanMucXacMinh).join(", ")}.`);
  if (k.value.hoSo === null && p.match_kind === null) return error(409, "registry_conclusion_missing", "Chưa có kết luận Danh bạ: hãy chọn «hồ sơ mới» hoặc gắn vào một hồ sơ có sẵn.");
  if (k.value.hoSo?.kieu === "CO_SAN") {
    const loi = await kiemHoSoDich(env.DB, k.value.hoSo.partyId, p.role_code);
    if (loi) return error(409, loi.code, loi.message);
  }
  const hoSo = k.value.hoSo;
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      datStatement(env.DB, { registrationId: p.id, by: staff.id, at, matchKind: hoSo ? (hoSo.kieu === "MOI" ? "NEW" : "EXISTING") : null, matchPartyId: hoSo?.kieu === "CO_SAN" ? hoSo.partyId : null, mucBatBuoc: batBuoc, phienBan: k.value.phienBan, referrerPartyId: k.value.nguoiGioiThieuPartyId }),
      suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "DAT", lyDo: null, at }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_verified", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · xác minh đạt · ${hoSo ? (hoSo.kieu === "MOI" ? "hồ sơ mới" : "gắn hồ sơ có sẵn") : "theo kết luận đã ghi"}` }, "changes() > 0"),
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
export async function yeuCauBoSung({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
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
    kq = await env.DB.batch([
      boSungStatement(env.DB, { registrationId: p.id, lyDo, by: staff.id, at, phienBan }),
      suKienNhanVienStatement(env.DB, { registrationId: p.id, staffId: staff.id, command: "BO_SUNG", lyDo, at }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_supplement_requested", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · yêu cầu bổ sung · ${lyDo}` }, "changes() > 0"),
    ]);
  } catch (e) {
    const l = loiLoXacMinh(e);
    if (l) return error(l.status, l.code, l.message);
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  return json({ trangThai: "CAN_BO_SUNG", lyDo: { ma: lyDo, nhan: cauLyDoChoNguoiDangKy(lyDo) } });
}

// ---- POST /api/dang-ky/phieu/:id/tu-choi ----
export async function tuChoiPhieu({ request, env, staff, params }: Ctx<"accounts">): Promise<Response> {
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
    ]);
  } catch (e) {
    const l = loiLoXacMinh(e);
    if (l) return error(l.status, l.code, l.message);
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return loiKhongGhi(env, p.id, phienBan);
  await xoaKhoTepChoDaGo(env, p.id);
  return json({ trangThai: "TU_CHOI" });
}
