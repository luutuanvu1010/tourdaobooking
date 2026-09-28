// Luật thuần của module van-chuyen (ADR-0040 D1) — không I/O, không SQL (SQL chỉ ở repository.ts). Import bằng đuôi .ts (node --test chạy trực tiếp).
// Xe: biển số / số khung chuẩn hoá để so trùng; kiểm thêm / sửa xe (Ruling R9: số khung bắt buộc ở máy chủ, cột CSDL để trống được); cảnh báo giấy tờ của xe
// theo ngưỡng; ánh xạ lỗi CSDL của xe (Ruling R15 điểm 1, 3: lớp CSDL trả mã KHÁC lớp route để thấy được từng lớp).
import {
  LY_DO_SUA_SAI, TRANG_THAI_XE, isLyDoSuaSai, isTrangThaiXe, kiemNgayCap, kiemNgayHetHan, soNgayConLai, type LyDoSuaSai, type TrangThaiXe,
} from "../../shared/giay-to.ts";
import { isISODate } from "../../shared/vn-date.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const rong = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const squash = (s: string): string => s.trim().replace(/\s+/g, " ");

/** Biển số đã chuẩn hoá để so trùng: chữ HOA, bỏ khoảng trắng . - (79B-012.34 và "79b 01234" là một). */
export const chuanHoaBienSo = (s: string): string => s.normalize("NFC").toUpperCase().replace(/[\s.\-]/g, "");
/** Số khung đã chuẩn hoá: chữ HOA, bỏ khoảng trắng và gạch. */
export const chuanHoaSoKhung = (s: string): string => s.normalize("NFC").toUpperCase().replace(/[\s\-]/g, "");

export interface XeNhap {
  plateNumber: string;
  plateKey: string;
  chassisNumber: string;
  chassisKey: string;
  name: string;
  modelYear: number | null;
  passengerCapacity: number;
  status: TrangThaiXe;
  validFrom: string;
}
export interface XeSua extends Omit<XeNhap, "validFrom"> {
  validFrom: string;
  validTo: string | null;
  expectedUpdatedAt: string;
}

const CAN_SO_KHUNG = "Cần số khung (in trên giấy đăng ký xe).";

/** Phần chung của thêm và sửa: biển số, số khung (bắt buộc — R9), tên, đời xe, số người được chở (KHÔNG kể tài xế). */
function kiemThongTinXe(b: Record<string, unknown>, homNay: string): Result<Omit<XeNhap, "status" | "validFrom">> {
  if (typeof b.plateNumber !== "string" || rong(b.plateNumber)) return fail("Cần biển số xe.");
  const plateNumber = squash(b.plateNumber);
  const plateKey = chuanHoaBienSo(plateNumber);
  if (plateNumber.length > 20 || !/^[0-9A-Z]{4,20}$/.test(plateKey)) return fail("Biển số gồm chữ cái không dấu và chữ số (có thể có dấu chấm, gạch), 4–20 ký tự, ví dụ 79B-012.34.");
  if (typeof b.chassisNumber !== "string" || rong(b.chassisNumber)) return fail(CAN_SO_KHUNG);
  const chassisNumber = squash(b.chassisNumber);
  const chassisKey = chuanHoaSoKhung(chassisNumber);
  if (chassisNumber.length > 30 || !/^[0-9A-Z]{5,30}$/.test(chassisKey)) return fail("Số khung gồm chữ cái không dấu và chữ số, 5–30 ký tự.");
  if (typeof b.name !== "string" || rong(b.name)) return fail("Cần tên xe (ví dụ Ford Transit).");
  const name = squash(b.name);
  if (name.length > 100) return fail("Tên xe tối đa 100 ký tự.");
  let modelYear: number | null = null;
  if (!rong(b.modelYear)) {
    const namNay = Number(homNay.slice(0, 4));
    if (typeof b.modelYear !== "number" || !Number.isInteger(b.modelYear) || b.modelYear < 1950 || b.modelYear > namNay + 1) return fail(`Đời xe là năm từ 1950 đến ${namNay + 1}.`);
    modelYear = b.modelYear;
  }
  const cho = b.passengerCapacity;
  if (typeof cho !== "number" || !Number.isInteger(cho) || cho < 1 || cho > 100) return fail("Số người được chở (không kể tài xế) là số nguyên từ 1 đến 100 — xe 16 chỗ nhập 15.");
  return { ok: true, value: { plateNumber, plateKey, chassisNumber, chassisKey, name, modelYear, passengerCapacity: cho } };
}

/** Thân POST /api/van-chuyen/xe. Xe mới: trạng thái Đang dùng (mặc định) hoặc Bảo dưỡng — không thêm xe đã ngừng; ngày bắt đầu mặc định hôm nay, không sau hôm nay. */
export function kiemXeMoi(body: Record<string, unknown> | null, homNay: string): Result<XeNhap> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const tt = kiemThongTinXe(body, homNay);
  if (!tt.ok) return tt;
  const status = rong(body.status) ? "active" : body.status;
  if (status !== "active" && status !== "maintenance") return fail("Xe mới ở trạng thái Đang dùng hoặc Bảo dưỡng.");
  const validFrom = rong(body.validFrom) ? homNay : body.validFrom;
  if (typeof validFrom !== "string" || !isISODate(validFrom) || validFrom > homNay) return fail("Ngày bắt đầu dùng không hợp lệ (YYYY-MM-DD, không sau hôm nay).");
  return { ok: true, value: { ...tt.value, status, validFrom } };
}

/**
 * Thân PUT /api/van-chuyen/xe/:id (đủ trường + `expectedUpdatedAt`). Ngừng dùng = trạng thái Ngừng dùng: đặt ngày ngừng = hôm nay (đã ngừng từ trước thì giữ
 * ngày cũ); DÙNG LẠI xe đã ngừng (R15 điểm 1) = trạng thái Đang dùng/Bảo dưỡng: bỏ ngày ngừng — máy chủ còn kiểm biển số trước khi ghi (lớp route).
 */
export function kiemSuaXe(body: Record<string, unknown> | null, hienTai: { status: TrangThaiXe; validFrom: string; validTo: string | null }, homNay: string): Result<XeSua> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (!isTrangThaiXe(body.status)) return fail(`Trạng thái xe phải là một trong: ${Object.values(TRANG_THAI_XE).join(", ")}.`);
  const tt = kiemThongTinXe(body, homNay);
  if (!tt.ok) return tt;
  const status = body.status;
  const validTo = status === "retired" ? (hienTai.status === "retired" && hienTai.validTo ? hienTai.validTo : homNay) : null;
  return { ok: true, value: { ...tt.value, status, validFrom: hienTai.validFrom, validTo, expectedUpdatedAt: body.expectedUpdatedAt } };
}

export type MucCanhBao = "none" | "soon" | "expired";
export interface CanhBaoXe { alert: MucCanhBao; alertTypeName: string | null; alertDaysLeft: number | null; alertCount: number }

/**
 * Cảnh báo giấy tờ của MỘT xe từ các giấy HIỆN HÀNH có ngày hết hạn: giấy gần hạn nhất quyết mức (đã hết → "expired"; trong ngưỡng → "soon"); đếm số giấy
 * đã hết + sắp hết (bản vẽ màn 01: "Phù hiệu đã hết hạn 8 ngày · 2 giấy sắp hết hạn"). Không có giấy nào tới ngưỡng → "none".
 */
export function canhBaoXe(giay: readonly { typeName: string; expiryDate: string }[], homNay: string, nguongNgay: number): CanhBaoXe {
  const toi = giay.map((g) => ({ ...g, con: soNgayConLai(g.expiryDate, homNay) })).filter((g) => g.con <= nguongNgay).sort((a, b) => a.con - b.con);
  const dau = toi[0];
  if (!dau) return { alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 };
  return { alert: dau.con < 0 ? "expired" : "soon", alertTypeName: dau.typeName, alertDaysLeft: dau.con, alertCount: toi.length };
}

export const CAU_BIEN_TRUNG = "Biển số này đang dùng cho xe khác.";
export const CAU_KHUNG_TRUNG = "Số khung này đã có ở xe khác.";
/**
 * Lỗi ràng buộc CSDL của xe → phản hồi (lớp CSDL — chỉ tới đây khi lớp route bị vượt, vd hai người ghi cùng lúc). Mã KHÁC lớp route (`vehicle_plate_taken`,
 * `vehicle_chassis_taken`) để phép đột biến bỏ lời kiểm ở route thấy đỏ; câu báo giống nhau. Lỗi lạ → null (ném lên, 500).
 */
export function loiRangBuocXe(message: string): { status: number; code: string; message: string } | null {
  if (/UNIQUE constraint failed: vc_vehicle\.plate_key/.test(message)) return { status: 409, code: "vehicle_plate_conflict", message: CAU_BIEN_TRUNG };
  if (/UNIQUE constraint failed: vc_vehicle\.chassis_key/.test(message)) return { status: 409, code: "vehicle_chassis_conflict", message: CAU_KHUNG_TRUNG };
  // Giấy tờ xe (Task A14): lớp CSDL của "chỉ dòng hiện hành gia hạn / sửa sai được" — mã KHÁC lớp route (document_not_current).
  if (/vehicle_document_superseded|vehicle_document_voided|vehicle_document_renew_mismatch|UNIQUE constraint failed: vc_vehicle_document\.previous_id/.test(message)) {
    return { status: 409, code: "document_changed", message: "Giấy tờ này vừa được người khác gia hạn hoặc sửa — tải lại rồi làm tiếp." };
  }
  if (/FOREIGN KEY constraint failed/.test(message)) return { status: 400, code: "invalid_input", message: "Chủ xe hoặc loại giấy tờ không tồn tại." };
  return null;
}

// ---- Giấy tờ XE (Task A14) — khuôn giấy tờ của người (parties/giay-to.ts), KHÁC ở ba chỗ: không CCCD / không hạng / không nơi cấp; không che số (giấy tờ xe
// không phải dữ liệu cá nhân — giả định G4); chỉ lý do sửa sai `choXe`. Luật ngày chung ở src/shared/giay-to.ts. Nhật ký vẫn KHÔNG ghi số (một luật chung).
export interface DanhMucGiayToXe { loai: ReadonlyMap<string, { hasExpiry: boolean; active: boolean }>; homNay: string }
export interface GiayToXeNhap { typeCode: string; number: string | null; issuedDate: string | null; expiryDate: string | null }
export type SuaSaiXe =
  | { lyDo: LyDoSuaSai; huy: true; expectedUpdatedAt: string }
  | { lyDo: LyDoSuaSai; huy: false; truong: "number" | "issuedDate" | "expiryDate"; giaTri: string | null; expectedUpdatedAt: string };

const LOAI_XE_SAI = "Loại giấy tờ xe không có trong danh mục hoặc đã ngưng dùng.";
function kiemSoGiayToXe(raw: unknown): Result<string | null> {
  if (rong(raw)) return { ok: true, value: null };
  if (typeof raw !== "string") return fail("Số giấy tờ không hợp lệ.");
  const so = squash(raw);
  return so.length > 60 ? fail("Số giấy tờ xe tối đa 60 ký tự.") : { ok: true, value: so };
}
function kiemDongXe(typeCode: string, soRaw: unknown, b: Record<string, unknown>, dm: DanhMucGiayToXe): Result<GiayToXeNhap> {
  const loai = dm.loai.get(typeCode);
  if (!loai || !loai.active) return fail(LOAI_XE_SAI);
  const so = kiemSoGiayToXe(soRaw);
  if (!so.ok) return so;
  const cap = kiemNgayCap(b.issuedDate, dm.homNay);
  if (!cap.ok) return cap;
  const het = kiemNgayHetHan(b.expiryDate, cap.value, loai.hasExpiry);
  if (!het.ok) return het;
  return { ok: true, value: { typeCode, number: so.value, issuedDate: cap.value, expiryDate: het.value } };
}
/** Thân POST /api/van-chuyen/xe/:id/giay-to — `{ typeCode, number?, issuedDate?, expiryDate? }`. */
export function kiemThemGiayToXe(body: Record<string, unknown> | null, dm: DanhMucGiayToXe): Result<GiayToXeNhap> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.typeCode !== "string") return fail(LOAI_XE_SAI);
  return kiemDongXe(body.typeCode, body.number, body, dm);
}
/** Gia hạn (…/gia-han) = dòng MỚI cùng loại; KHÔNG gửi số ⇒ chép số dòng trước. */
export function kiemGiaHanXe(body: Record<string, unknown> | null, truoc: { typeCode: string; number: string | null }, dm: DanhMucGiayToXe): Result<GiayToXeNhap> {
  const b = body ?? {};
  return kiemDongXe(truoc.typeCode, rong(b.number) ? truoc.number : b.number, b, dm);
}
/** Sửa sai DÒNG HIỆN HÀNH (…/sua-sai) — `{ reason, value?, expectedUpdatedAt }`; chỉ lý do dùng cho xe; giá trị mới phải khác; huỷ dòng không nhận giá trị. */
export function kiemSuaSaiXe(body: Record<string, unknown> | null, hienHanh: GiayToXeNhap, dm: DanhMucGiayToXe): Result<SuaSaiXe> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (!isLyDoSuaSai(body.reason)) return fail("Lý do sửa sai không có trong danh sách — chọn một lý do.");
  if (!LY_DO_SUA_SAI[body.reason].choXe) return fail("Lý do này không dùng cho giấy tờ xe (giấy tờ xe không có nơi cấp, không có hạng).");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  const lyDo = body.reason;
  const expectedUpdatedAt = body.expectedUpdatedAt;
  const truong = LY_DO_SUA_SAI[lyDo].truong;
  if (truong === null) return body.value === undefined ? { ok: true, value: { lyDo, huy: true, expectedUpdatedAt } } : fail("Huỷ dòng nhập nhầm không kèm giá trị mới.");
  if (!("value" in body)) return fail("Thiếu giá trị mới cho mục cần sửa.");
  const giong = (): { ok: false; message: string } => fail("Giá trị mới giống giá trị đang có — không có gì để sửa.");
  if (truong === "number") {
    const so = kiemSoGiayToXe(body.value);
    if (!so.ok) return so;
    return so.value === hienHanh.number ? giong() : { ok: true, value: { lyDo, huy: false, truong, giaTri: so.value, expectedUpdatedAt } };
  }
  if (truong === "issuedDate") {
    const cap = kiemNgayCap(body.value, dm.homNay);
    if (!cap.ok) return cap;
    if (cap.value !== null && hienHanh.expiryDate !== null && hienHanh.expiryDate < cap.value) return fail("Ngày cấp không được sau ngày hết hạn.");
    return cap.value === hienHanh.issuedDate ? giong() : { ok: true, value: { lyDo, huy: false, truong, giaTri: cap.value, expectedUpdatedAt } };
  }
  if (truong === "expiryDate") {
    const het = kiemNgayHetHan(body.value, hienHanh.issuedDate, dm.loai.get(hienHanh.typeCode)?.hasExpiry ?? true);
    if (!het.ok) return het;
    return het.value === hienHanh.expiryDate ? giong() : { ok: true, value: { lyDo, huy: false, truong, giaTri: het.value, expectedUpdatedAt } };
  }
  return fail("Lý do này không dùng cho giấy tờ xe (giấy tờ xe không có nơi cấp, không có hạng).");
}

/**
 * `detail` nhật ký giấy tờ xe — mở đầu bằng biển số (trang Nhật ký không có nhãn đối tượng cho xe — G12); KHÔNG số giấy tờ (một luật chung với giấy tờ của
 * người — G4): chữ ký không có ô số; `truoc`/`sau` chỉ dùng cho lý do về NGÀY và phải đúng khuôn YYYY-MM-DD, lý do khác bỏ qua chúng.
 */
export function chiTietNhatKyXe(bienSo: string, v: { loai: string; hetHan?: string | null; giaHan?: boolean; lyDo?: LyDoSuaSai; truoc?: string | null; sau?: string | null }): string {
  const dau = `xe ${bienSo}: ${v.loai}`;
  const ngay = (d: string | null | undefined): string => (d && isISODate(d) ? d : "không hạn");
  if (v.lyDo) {
    const truong = LY_DO_SUA_SAI[v.lyDo].truong;
    const nhan = LY_DO_SUA_SAI[v.lyDo].nhan;
    if (truong === "issuedDate" || truong === "expiryDate") {
      const hop = (d: string | null | undefined): string | null => (d === null || d === undefined ? "trống" : isISODate(d) ? d : null);
      const [a, b] = [hop(v.truoc), hop(v.sau)];
      if (a !== null && b !== null) return `${dau}: ${nhan} (${a} → ${b})`;
    }
    return `${dau}: ${nhan}`;
  }
  if (v.giaHan) return `${dau}: gia hạn, hết hạn ${ngay(v.truoc)} → ${ngay(v.sau)}`;
  return `${dau}, ${v.hetHan && isISODate(v.hetHan) ? `hết hạn ${v.hetHan}` : "không hạn"}`;
}

// ---- Ngưỡng "sắp hết hạn" và danh sách gộp (Task A15) ------------------------------------------------------------------------------------------------------
/** Thân POST /api/van-chuyen/nguong-het-han — `{ warnDays }`: số nguyên 1–365 (khớp CHECK của vc_expiry_policy). */
export function kiemNguong(body: Record<string, unknown> | null): Result<number> {
  const v = body?.warnDays;
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 365 ? { ok: true, value: v } : fail("Số ngày nhắc trước là số nguyên từ 1 đến 365.");
}

export interface DongSapHetHan {
  kind: "vehicle" | "person";
  targetId: string;
  label: string;
  typeName: string;
  className: string | null;
  expiryDate: string;
  daysLeft: number;
  level: "soon" | "expired";
}
/**
 * Gộp giấy tờ xe (xe chưa ngừng) và giấy tờ tài xế (hàm công bố của parties — KHÔNG số) thành MỘT danh sách, xếp theo ngày hết hạn rồi nhãn. Đầu vào đã lọc
 * "hạn ≤ hôm nay + ngưỡng" ở câu SQL; `level` = "expired" khi đã quá hạn.
 */
export function gopSapHetHan(
  xe: readonly { vehicleId: string; plateNumber: string; vehicleName: string; typeName: string; expiryDate: string }[],
  nguoi: readonly { partyId: string; displayName: string; typeName: string; className: string | null; expiryDate: string }[],
  homNay: string,
): DongSapHetHan[] {
  const dong = (kind: "vehicle" | "person", targetId: string, label: string, typeName: string, className: string | null, expiryDate: string): DongSapHetHan => {
    const daysLeft = soNgayConLai(expiryDate, homNay);
    return { kind, targetId, label, typeName, className, expiryDate, daysLeft, level: daysLeft < 0 ? "expired" : "soon" };
  };
  return [
    ...xe.map((g) => dong("vehicle", g.vehicleId, `${g.plateNumber} · ${g.vehicleName}`, g.typeName, null, g.expiryDate)),
    ...nguoi.map((g) => dong("person", g.partyId, g.displayName, g.typeName, g.className, g.expiryDate)),
  ].sort((a, b) => (a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}
