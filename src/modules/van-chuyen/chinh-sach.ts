// Luật thuần CHÍNH SÁCH ĐIỀU PHỐI của module van-chuyen (ADR-0049 D2; kế hoạch mục 1.1, Task A6/A7) — không I/O, không SQL. Import kèm đuôi .ts.
// Kiểm thân yêu cầu của bốn nhóm route: chính sách điều phối (Toàn quyền), điều kiện xuất bến, bảng hạng bằng (Toàn quyền), danh mục lý do (Quản trị).
// - Chính sách / điều kiện / hạng bằng là dòng có ngày hiệu lực, CHỈ THÊM; máy chủ đặt valid_from_at = lúc ghi → thân KHÔNG được mang ngày hiệu lực (I28 —
//   "cấm đặt hiệu lực lùi ngày": không nhận thì không lùi được). Thân mang khoá kiểu ngày hiệu lực → 400 (TC-2), không lặng lẽ bỏ qua.
// - Hợp đồng vận chuyển khoá ở 0 (ĐP7; CHECK ở CSDL) — thân gửi `requireContract: true` → 400 nói rõ.
// - Nhóm lý do là danh sách MỞ kiểm ở mã (`NHOM_LY_DO`, I7). Mã và nhóm không đổi sau khi tạo (trigger vc_reason_identity giữ ở CSDL).
// - Nhật ký: chỉ mã, con số, nhãn danh mục (`chiTiet*` dưới đây) — không dữ liệu cá nhân.
import { NHAN_NHOM_LY_DO, isNhomLyDo, type NhomLyDo } from "../../shared/dieu-phoi-kieu.ts";
import { MA_LOAI_GIAY_TO_RE, kiemTenDanhMuc, kiemThuTu } from "../../shared/giay-to.ts";
import { CHE_DO_DUA_DON, isCheDoDuaDon, type CheDoDuaDon } from "../../shared/chang-mac-dinh.ts";
import { UUID_RE } from "../../shared/http.ts";
import { normalizePhone } from "../../shared/phone.ts";
import { isHHMM } from "../../shared/vn-date.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const soNguyen = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** Khoá mang nghĩa "ngày hiệu lực" (mọi cách viết thường gặp) — máy chủ tự đặt, thân không được gửi. */
const KHOA_HIEU_LUC_RE = /^(valid|effective|hieu_?luc|tu_?ngay)/i;
const coNgayHieuLuc = (body: Record<string, unknown>): boolean => Object.keys(body).some((k) => KHOA_HIEU_LUC_RE.test(k));
const CAU_HIEU_LUC = "Không gửi ngày hiệu lực — dòng mới có hiệu lực ngay lúc lưu.";

// ---- Chính sách điều phối ----------------------------------------------------------------------------------------------------------------------------------
/** Trần khoảng nghỉ giữa hai chuyến (phút) — cùng CHECK của `vc_dispatch_policy.rest_minutes` / `vc_trip.rest_minutes_snapshot` (0041, 0042). */
export const NGHI_TOI_DA_PHUT = 480;
/** Trần cửa sổ xuất bến (phút, ADR-0096 Đ2.3 LC-20) — cùng CHECK của `vc_dispatch_policy.departure_window_minutes` (0084). */
export const CUA_SO_XUAT_BEN_TOI_DA_PHUT = 2880;
/** Trần hạn Từ chối (phút, ADR-0053 D8.1; G-A4-13) — cùng CHECK của `vc_dispatch_policy.refuse_lead_minutes` (0092). */
export const HAN_TU_CHOI_TOI_DA_PHUT = 2880;
export interface ChinhSachMoi {
  minLeadMinutes: number;
  warnLeadMinutes: number;
  restMinutes: number;
  requireManifest: boolean;
  /** ADR-0050 VK1-A: kẹp lùi TỐI ĐA (phút) khi văn phòng bấm thay khai giờ xảy ra; 1…1440; BẮT BUỘC (kế hoạch I43 — không chép ngầm từ dòng cũ). */
  proxyBackdateMaxMinutes: number;
  /** ADR-0055 VK2-B B1: giờ lái tối đa một ngày (phút) 60…1440; BẮT BUỘC (I43 — PWA cũ gửi thiếu thì 400, không tự điền mặc định). */
  dutyDayMaxMinutes: number;
  /** ADR-0055 VK2-B B1: chuyến dài hơn (phút) → nhắc nghỉ; 30…720; BẮT BUỘC. */
  tripNoBreakMaxMinutes: number;
  /** ADR-0096 Đ2.3: cửa sổ xuất bến (phút) 60…2880 (màn nhập 1–48 giờ); BẮT BUỘC (I43 — PWA cũ gửi thiếu thì 400, không chép ngầm từ dòng cũ). */
  departureWindowMinutes: number;
  /** ADR-0053 D8.1 (0092): số phút hạn Từ chối trước giờ chạy, 60…2880; BẮT BUỘC (I43). Chỉ áp cho cặp (tài xế, chuyến) xếp LẦN ĐẦU sau khi đổi (G-A4-13). */
  refuseLeadMinutes: number;
  /** Lời chủ 6.3 (0092): SĐT văn phòng cho nút "Gọi văn phòng" của tài xế — chuẩn hoá 0xxxxxxxxx; null = chưa có. Khoá BẮT BUỘC có mặt (I43; null được). */
  officePhone: string | null;
}
export function kiemChinhSachMoi(body: Record<string, unknown> | null): Result<ChinhSachMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (coNgayHieuLuc(body)) return fail(CAU_HIEU_LUC);
  const { minLeadMinutes, warnLeadMinutes, restMinutes, requireManifest, requireContract, proxyBackdateMaxMinutes, dutyDayMaxMinutes, tripNoBreakMaxMinutes,
    departureWindowMinutes, refuseLeadMinutes, officePhone } = body;
  if (!soNguyen(minLeadMinutes, 1, 2880)) return fail("Mốc tối thiểu là số phút nguyên từ 1 đến 2880 — không tắt được; muốn nới thì giảm con số.");
  if (!soNguyen(warnLeadMinutes, 0, 1440)) return fail("Cảnh báo sát mốc là số phút nguyên từ 0 đến 1440.");
  if (!soNguyen(restMinutes, 0, NGHI_TOI_DA_PHUT)) return fail(`Khoảng nghỉ giữa hai chuyến là số phút nguyên từ 0 đến ${NGHI_TOI_DA_PHUT}.`);
  if (typeof requireManifest !== "boolean") return fail("Chọn có hay không bắt đủ danh sách hành khách.");
  if (requireContract !== undefined && requireContract !== false) return fail("Chưa bật được yêu cầu hợp đồng vận chuyển — cần một quyết định riêng.");
  if (!soNguyen(proxyBackdateMaxMinutes, 1, 1440)) return fail("Giờ văn phòng khai lùi tối đa là số phút nguyên từ 1 đến 1440.");
  // Review Focus 5 (khuôn I43): màn cũ (PWA chưa cập nhật) gửi thiếu hai con số → nói rõ, không tự điền mặc định im lặng.
  if (dutyDayMaxMinutes === undefined || tripNoBreakMaxMinutes === undefined) return fail("Thiếu giờ lái tối đa / nhắc nghỉ — tải lại trang rồi lưu lại.");
  if (!soNguyen(dutyDayMaxMinutes, 60, 1440)) return fail("Giờ lái tối đa một ngày là số phút nguyên từ 60 đến 1440.");
  if (!soNguyen(tripNoBreakMaxMinutes, 30, 720)) return fail("Chuyến dài cần nhắc nghỉ là số phút nguyên từ 30 đến 720.");
  // ADR-0096 Đ2.3 (khuôn I43): thiếu cửa sổ xuất bến → nói rõ, không tự điền.
  if (departureWindowMinutes === undefined) return fail("Thiếu cửa sổ xuất bến — tải lại trang rồi lưu lại.");
  if (!soNguyen(departureWindowMinutes, 60, CUA_SO_XUAT_BEN_TOI_DA_PHUT)) return fail(`Cửa sổ xuất bến là số phút nguyên từ 60 đến ${CUA_SO_XUAT_BEN_TOI_DA_PHUT} (1 đến ${CUA_SO_XUAT_BEN_TOI_DA_PHUT / 60} giờ).`);
  // ADR-0053 D8.1 + lời chủ 6.3 (khuôn I43): màn cũ gửi thiếu → nói rõ, không tự điền.
  if (refuseLeadMinutes === undefined || officePhone === undefined) return fail("Thiếu hạn từ chối / số điện thoại văn phòng — tải lại trang rồi lưu lại.");
  if (!soNguyen(refuseLeadMinutes, 60, HAN_TU_CHOI_TOI_DA_PHUT)) return fail(`Hạn từ chối chuyến là số phút nguyên từ 60 đến ${HAN_TU_CHOI_TOI_DA_PHUT} (1 đến ${HAN_TU_CHOI_TOI_DA_PHUT / 60} giờ).`);
  let sdt: string | null = null;
  if (officePhone !== null) {
    if (typeof officePhone !== "string") return fail("Số điện thoại văn phòng không hợp lệ.");
    if (officePhone.trim() !== "") {
      sdt = normalizePhone(officePhone);
      if (sdt === null) return fail("Số điện thoại văn phòng phải là số di động / cố định Việt Nam 10 chữ số (bắt đầu bằng 0), hoặc để trống.");
    }
  }
  return {
    ok: true,
    value: { minLeadMinutes, warnLeadMinutes, restMinutes, requireManifest, proxyBackdateMaxMinutes, dutyDayMaxMinutes, tripNoBreakMaxMinutes, departureWindowMinutes, refuseLeadMinutes, officePhone: sdt },
  };
}
export function chiTietChinhSach(cu: ChinhSachMoi | null, moi: ChinhSachMoi): string {
  const co = (b: boolean) => (b ? "có" : "không");
  const phan = (ten: string, a: string | null, b: string) => (a === null ? `${ten} ${b}` : `${ten} ${a} → ${b}`);
  return `chính sách điều phối: ${[
    phan("mốc tối thiểu", cu ? `${cu.minLeadMinutes}` : null, `${moi.minLeadMinutes} phút`),
    phan("cảnh báo sát mốc", cu ? `${cu.warnLeadMinutes}` : null, `${moi.warnLeadMinutes} phút`),
    phan("khoảng nghỉ", cu ? `${cu.restMinutes}` : null, `${moi.restMinutes} phút`),
    phan("bắt đủ danh sách", cu ? co(cu.requireManifest) : null, co(moi.requireManifest)),
    phan("kẹp lùi giờ khai", cu ? `${cu.proxyBackdateMaxMinutes}` : null, `${moi.proxyBackdateMaxMinutes} phút`),
    phan("giờ lái tối đa", cu ? `${cu.dutyDayMaxMinutes}` : null, `${moi.dutyDayMaxMinutes} phút`),
    phan("nhắc nghỉ chuyến trên", cu ? `${cu.tripNoBreakMaxMinutes}` : null, `${moi.tripNoBreakMaxMinutes} phút`),
    phan("cửa sổ xuất bến", cu ? `${cu.departureWindowMinutes}` : null, `${moi.departureWindowMinutes} phút`),
    phan("hạn từ chối", cu ? `${cu.refuseLeadMinutes}` : null, `${moi.refuseLeadMinutes} phút`),
    // G-A4-12: nhật ký KHÔNG ghi chữ số SĐT (CLAUDE.md §7) — chỉ nói có / đổi / bỏ.
    cauSdtVanPhong(cu ? cu.officePhone : undefined, moi.officePhone),
  ].join("; ")}`;
}
function cauSdtVanPhong(cu: string | null | undefined, moi: string | null): string {
  if (cu === undefined) return moi === null ? "chưa có số điện thoại văn phòng" : "có số điện thoại văn phòng";
  if (cu === moi) return moi === null ? "chưa có số điện thoại văn phòng" : "giữ số điện thoại văn phòng";
  return moi === null ? "bỏ số điện thoại văn phòng" : cu === null ? "thêm số điện thoại văn phòng" : "đổi số điện thoại văn phòng";
}

// ---- Điều kiện xuất bến ------------------------------------------------------------------------------------------------------------------------------------
export interface DieuKienMoi {
  minCapacity: number;
  subject: "VEHICLE" | "DRIVER";
  documentTypeCode: string;
}
export function kiemDieuKienMoi(body: Record<string, unknown> | null): Result<DieuKienMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (coNgayHieuLuc(body)) return fail(CAU_HIEU_LUC);
  const { minCapacity, subject, documentTypeCode } = body;
  if (!soNguyen(minCapacity, 1, 100)) return fail("Cỡ xe (số người) là số nguyên từ 1 đến 100.");
  if (subject !== "VEHICLE" && subject !== "DRIVER") return fail("Điều kiện áp cho giấy tờ của xe hoặc của tài xế.");
  if (typeof documentTypeCode !== "string" || !MA_LOAI_GIAY_TO_RE.test(documentTypeCode)) return fail("Chọn loại giấy tờ bắt buộc.");
  return { ok: true, value: { minCapacity, subject, documentTypeCode } };
}
export const chiTietDieuKien = (d: DieuKienMoi, tenLoai: string): string =>
  `điều kiện xuất bến: xe từ ${d.minCapacity} người — giấy tờ ${d.subject === "VEHICLE" ? "xe" : "tài xế"} ${tenLoai}`;

// ---- Bảng hạng bằng → số khách -----------------------------------------------------------------------------------------------------------------------------
export interface HangBangMoi {
  classCode: string;
  /** null = không giới hạn. */
  maxPassengers: number | null;
}
const MA_HANG_RE = /^[A-Z0-9][A-Z0-9_]{0,19}$/;
export function kiemHangBangMoi(body: Record<string, unknown> | null): Result<HangBangMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (coNgayHieuLuc(body)) return fail(CAU_HIEU_LUC);
  const { classCode, maxPassengers } = body;
  if (typeof classCode !== "string" || !MA_HANG_RE.test(classCode)) return fail("Chọn hạng bằng lái.");
  if (!("maxPassengers" in body)) return fail("Nhập số khách tối đa (để trống = không giới hạn).");
  if (maxPassengers !== null && !soNguyen(maxPassengers, 1, 100)) return fail("Số khách tối đa là số nguyên từ 1 đến 100, hoặc để trống = không giới hạn.");
  return { ok: true, value: { classCode, maxPassengers: maxPassengers as number | null } };
}
const soKhach = (n: number | null): string => (n === null ? "không giới hạn" : `${n} khách`);
export const chiTietHangBang = (classCode: string, cu: number | null | undefined, moi: number | null): string =>
  cu === undefined ? `hạng bằng ${classCode}: ${soKhach(moi)}` : `hạng bằng ${classCode}: ${soKhach(cu)} → ${soKhach(moi)}`;

// ---- Danh mục lý do (Quản trị) -----------------------------------------------------------------------------------------------------------------------------
export const MA_LY_DO_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
export interface LyDoMoi {
  code: string;
  group: NhomLyDo;
  label: string;
  sortOrder: number;
}
export interface LyDoSua {
  label: string;
  sortOrder: number;
  active: boolean;
  expectedUpdatedAt: string;
}
export function kiemLyDoMoi(body: Record<string, unknown> | null): Result<LyDoMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const { code, group } = body;
  if (typeof code !== "string" || !MA_LY_DO_RE.test(code)) return fail("Mã lý do: chữ HOA không dấu, số, gạch dưới; 2–40 ký tự.");
  if (!isNhomLyDo(group)) return fail("Chọn nhóm lý do.");
  const ten = kiemTenDanhMuc(body.label, 80);
  if (!ten.ok) return fail(ten.message);
  const thuTu = kiemThuTu(body.sortOrder);
  if (!thuTu.ok) return fail(thuTu.message);
  return { ok: true, value: { code, group, label: ten.value, sortOrder: thuTu.value } };
}
export function kiemSuaLyDo(body: Record<string, unknown> | null): Result<LyDoSua> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if ("code" in body || "group" in body) return fail("Không đổi mã, nhóm của lý do — ngưng lý do cũ rồi thêm lý do mới.");
  const ten = kiemTenDanhMuc(body.label, 80);
  if (!ten.ok) return fail(ten.message);
  const thuTu = kiemThuTu(body.sortOrder);
  if (!thuTu.ok) return fail(thuTu.message);
  if (typeof body.active !== "boolean") return fail("Chọn đang dùng hay ngưng.");
  if (typeof body.expectedUpdatedAt !== "string" || body.expectedUpdatedAt === "") return fail("Thiếu mốc cập nhật — hãy tải lại rồi sửa.");
  return { ok: true, value: { label: ten.value, sortOrder: thuTu.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } };
}
export const chiTietLyDo = (code: string, group: NhomLyDo, label: string, active = true): string =>
  `lý do ${code} (${NHAN_NHOM_LY_DO[group]}): ${label}${active ? "" : " — ngưng dùng"}`;

// ---- Mẫu đưa đón theo dịch vụ (ADR-0054 D10.1; ADR nháp nơi trả mặc định D2 — docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md) -------------
export interface MauChangMoi {
  mode: CheDoDuaDon;
  returnTimeHint: string | null;
  /** `undefined` = thân VẮNG khoá (màn cũ chưa biết ô này) → route chép điểm của bản hiện hành (trừ khi NONE); `null` = bỏ mặc định. */
  noiTraMacDinhId: string | null | undefined;
}
/**
 * Thân `POST /api/van-chuyen/mau-chang/:code`: mỗi dòng là một BẢN ĐẦY ĐỦ — `mode` và khoá `returnTimeHint` BẮT BUỘC (null = không gợi ý; chỉ hai chiều mới có
 * giờ); `noiTraMacDinhId` tuỳ chọn (uuid / null). Không nhận ngày hiệu lực (khuôn chính sách — hiệu lực ngay). NONE + điểm → 400 (lớp CSDL NT-D1 là lưới).
 */
export function kiemMauChangMoi(body: Record<string, unknown> | null): Result<MauChangMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (coNgayHieuLuc(body)) return fail(CAU_HIEU_LUC);
  if (!isCheDoDuaDon(body.mode)) return fail("Chọn cách đưa đón: không đưa đón, một chiều hoặc hai chiều.");
  if (!("returnTimeHint" in body)) return fail("Thiếu giờ đón gợi ý chiều về (gửi trống nếu không gợi ý).");
  const h = body.returnTimeHint;
  let returnTimeHint: string | null = null;
  if (h !== null && h !== "") {
    if (typeof h !== "string" || !isHHMM(h.trim())) return fail("Giờ đón gợi ý chiều về không hợp lệ (định dạng HH:MM).");
    returnTimeHint = h.trim();
  }
  if (returnTimeHint !== null && body.mode !== "ROUND_TRIP") return fail("Chỉ dịch vụ đưa đón hai chiều mới có giờ đón gợi ý chiều về.");
  let noiTraMacDinhId: string | null | undefined;
  if ("noiTraMacDinhId" in body) {
    const n = body.noiTraMacDinhId;
    if (n === null || n === "") noiTraMacDinhId = null;
    else if (typeof n !== "string" || !UUID_RE.test(n)) return fail("Nơi trả mặc định không hợp lệ — chọn một điểm trong danh mục Địa điểm.");
    else noiTraMacDinhId = n;
  }
  if (body.mode === "NONE" && typeof noiTraMacDinhId === "string") return fail("Dịch vụ không đưa đón thì không có nơi trả mặc định.");
  return { ok: true, value: { mode: body.mode, returnTimeHint, noiTraMacDinhId } };
}
/** Nhãn chế độ cho nhật ký (null = chưa cài). */
const nhanCheDo = (m: CheDoDuaDon | null) => (m === null ? "(chưa cài)" : CHE_DO_DUA_DON[m]);
/**
 * `detail` của `transfer_template_set`: "Mẫu đưa đón <mã>: <chế độ cũ> → <chế độ mới>; giờ về <HH:MM | (không gợi ý)>[; nơi trả mặc định <tên cũ> → <tên mới>]" —
 * đoạn nơi trả CHỈ khi đổi; TÊN điểm danh mục (không id), không dữ liệu cá nhân.
 */
export function chiTietMauChang(
  code: string, cu: { mode: CheDoDuaDon; noiTra: { id: string; ten: string } | null } | null, moi: { mode: CheDoDuaDon; returnTimeHint: string | null; noiTra: { id: string; ten: string } | null },
): string {
  const parts = [`Mẫu đưa đón ${code}: ${nhanCheDo(cu?.mode ?? null)} → ${nhanCheDo(moi.mode)}`, `giờ về ${moi.returnTimeHint ?? "(không gợi ý)"}`];
  const truoc = cu?.noiTra ?? null;
  if ((truoc?.id ?? null) !== (moi.noiTra?.id ?? null)) parts.push(`nơi trả mặc định ${truoc?.ten ?? "(trống)"} → ${moi.noiTra?.ten ?? "(trống)"}`);
  return parts.join("; ");
}
