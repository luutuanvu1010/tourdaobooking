// Luật thuần của module van-chuyen (ADR-0040 D1) — không I/O, không SQL (SQL chỉ ở repository.ts). Import bằng đuôi .ts (node --test chạy trực tiếp).
// Xe: biển số / số khung chuẩn hoá để so trùng; kiểm thêm / sửa xe (Ruling R9: số khung bắt buộc ở máy chủ, cột CSDL để trống được); cảnh báo giấy tờ của xe
// theo ngưỡng; ánh xạ lỗi CSDL của xe (Ruling R15 điểm 1, 3: lớp CSDL trả mã KHÁC lớp route để thấy được từng lớp).
import { TRANG_THAI_XE, isTrangThaiXe, soNgayConLai, type TrangThaiXe } from "../../shared/giay-to.ts";
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
  if (/FOREIGN KEY constraint failed/.test(message)) return { status: 400, code: "invalid_input", message: "Chủ xe hoặc loại giấy tờ không tồn tại." };
  return null;
}
