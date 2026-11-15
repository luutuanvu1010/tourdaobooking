// dang-ky/rules.ts — luật thuần của phiếu đăng ký đối tác (ADR-0206 Đ4). Không I/O.
// Đồ thị phải khớp trigger `dk_registration_transition` (migration 0167); bài rules.test.ts đối chiếu hai bên.
import { CAU_SAI_LOAI, doDaiBase64, giaiBase64, nhanLoaiTep, type LoaiTep } from "../../shared/tep-dinh-kem.ts";

export const TRANG_THAI = ["DANG_DIEN", "CHO_XAC_MINH", "CAN_BO_SUNG", "CHO_DUYET", "DA_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"] as const;
export type TrangThai = (typeof TRANG_THAI)[number];

/** Bốn trạng thái kết thúc: không đổi nữa. */
export const TRANG_THAI_KET_THUC: readonly TrangThai[] = ["DA_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"];

const DUONG_CHINH: Readonly<Record<TrangThai, readonly TrangThai[]>> = {
  DANG_DIEN: ["CHO_XAC_MINH"],
  CHO_XAC_MINH: ["CAN_BO_SUNG", "CHO_DUYET"],
  CAN_BO_SUNG: ["CHO_XAC_MINH"],
  CHO_DUYET: ["DA_DUYET"],
  DA_DUYET: [],
  TU_CHOI: [],
  DA_RUT: [],
  HET_HAN: [],
};
const THOAT: readonly TrangThai[] = ["TU_CHOI", "DA_RUT", "HET_HAN"];

export const daKetThuc = (t: TrangThai): boolean => TRANG_THAI_KET_THUC.includes(t);

/** Phiếu được đi từ `tu` sang `den` không? Mọi trạng thái chưa kết thúc được sang TỪ CHỐI, ĐÃ RÚT, HẾT HẠN; còn lại theo đường chính. Giữ nguyên chỗ (tu = den) là không phải chuyển. */
export function chuyenHopLe(tu: TrangThai, den: TrangThai): boolean {
  if (daKetThuc(tu)) return false;
  return DUONG_CHINH[tu].includes(den) || THOAT.includes(den);
}

// ---- Tệp của phiếu (ADR-0208 Đ2): luật thuần kiểm MỘT tệp tải lên ----

/** Ô tệp của phiếu cá nhân (đợt 1): căn cước mặt trước, mặt sau. Ô mới = thêm vào đây cùng ô khai ở phiếu. */
export const O_TEP_PHIEU = ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"] as const;
export const laOTepPhieu = (s: unknown): s is (typeof O_TEP_PHIEU)[number] => typeof s === "string" && (O_TEP_PHIEU as readonly string[]).includes(s);
/** Phiếu chỉ nhận tệp khi còn ở hai trạng thái này (ADR-0208 Đ2). */
export const TRANG_THAI_CHO_TAI_TEP: readonly TrangThai[] = ["DANG_DIEN", "CAN_BO_SUNG"];

/** Trần `Content-Length` của thân JSON mang tệp `maxMb` MB (chuỗi base64 + vỏ). Vượt ⇒ 413 TRƯỚC khi đọc thân. */
export const tranThanTep = (maxMb: number): number => doDaiBase64(maxMb * 1024 * 1024) + 1024;

export type KiemTepPhieu = { ok: true; bytes: Uint8Array; loai: LoaiTep } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
/** Kiểm `noiDung` (base64): quá cỡ ⇒ 413 (chuỗi quá dài không giải); thiếu / hỏng ⇒ 400; sai chữ ký ⇒ 415. Trần theo BYTE của tệp (`maxMb`). */
export function kiemTepPhieu(noiDung: unknown, maxMb: number): KiemTepPhieu {
  const qua = (): KiemTepPhieu => ({ ok: false, status: 413, code: "file_too_large", message: `Tệp lớn hơn ${maxMb} MB.` });
  if (typeof noiDung === "string" && noiDung.length > doDaiBase64(maxMb * 1024 * 1024)) return qua();
  const bytes = giaiBase64(noiDung);
  if (!bytes || bytes.length === 0) return { ok: false, status: 400, code: "invalid_input", message: "Chưa có nội dung tệp, hoặc nội dung không đọc được." };
  if (bytes.length > maxMb * 1024 * 1024) return qua();
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (!loai) return { ok: false, status: 415, code: "unsupported_file_type", message: CAU_SAI_LOAI };
  return { ok: true, bytes, loai };
}

// ---- Email của người đăng ký (ADR-0206 Đ3, Đ8) ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Chuẩn hoá email người đăng ký gõ: cắt khoảng trắng, chữ thường, đúng khuôn `a@b.c`, ≤ 254 ký tự; sai ⇒ null. «An@Gmail.com » và «an@gmail.com» ra CÙNG một khoá danh tính. */
export function chuanHoaEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/** Mã gửi email gồm `soChuSo` chữ số đều nhau (lấy mẫu loại bỏ trên số 32 bit — không lệch về số nhỏ), giữ số 0 đầu. `soChuSo` là dòng chính sách (4–10). */
export function sinhMaEmail(soChuSo: number, ngauNhien: (b: Uint32Array) => void = (b) => void crypto.getRandomValues(b)): string {
  const mod = 10 ** soChuSo;
  const gioiHan = Math.floor(0x1_0000_0000 / mod) * mod;
  const buf = new Uint32Array(1);
  for (let i = 0; i < 1000; i++) {
    ngauNhien(buf);
    if (buf[0]! < gioiHan) return String(buf[0]! % mod).padStart(soChuSo, "0");
  }
  throw new Error("Không sinh được mã.");
}
