// Luật THUẦN của «Chọn nhanh» nơi đưa đón và «nhóm tắt đưa đón» ở form Tạo đơn (ADR-0118 Đ4, Đ5). Không I/O; import kèm đuôi .ts.
// Test: chon-nhanh.test.ts. Chỉ để HIỂN THỊ / điền ô: cổng thật nằm ở máy chủ (409 `transfer_disabled`).
// - `diemChonNhanh`: điểm ĐANG DÙNG có số chọn nhanh, xếp theo số rồi theo tên (số trùng được phép).
// - `oChonNhanhCuaChang`: nút chọn nhanh điền ô nào — chiều đi → «Nơi trả», chiều về → «Nơi đón» (đầu kia của chặng thường là khách sạn / địa chỉ khách).
// - `apChonNhanh`: điền điểm vào ô đó bằng đúng `suaChang` (giữ luật chiều về đi theo chiều đi); không đụng ô kia.
// - `boChangKhiTatDuaDon`: nhóm tắt đưa đón → bỏ MỌI chặng của dịch vụ (kèm số chặng bỏ để báo người lập).
import { suaChang, type ChangNhap } from "./chang-form.ts";

export interface DiemCoChonNhanh {
  id: string;
  name: string;
  active: boolean;
  quickPickOrder: number | null;
}
export interface DiemNhanh {
  id: string;
  ten: string;
  thuTu: number;
}

const soTen = (a: string, b: string): number => a.localeCompare(b, "vi");

export function diemChonNhanh(ds: readonly DiemCoChonNhanh[]): DiemNhanh[] {
  return ds
    .filter((d) => d.active && d.quickPickOrder !== null)
    .map((d) => ({ id: d.id, ten: d.name, thuTu: d.quickPickOrder as number }))
    .sort((a, b) => a.thuTu - b.thuTu || soTen(a.ten, b.ten) || (a.id < b.id ? -1 : 1));
}

/** Ô «Chọn nhanh» của màn Địa điểm: trống → `null` (bỏ chọn nhanh); số nguyên 1–99 → số; còn lại → câu lỗi tiếng Việt. Cùng khoảng với máy chủ (`validateLocationUpdate`) và CSDL (CHECK). */
export function docChonNhanh(chu: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = chu.trim();
  if (t === "") return { ok: true, value: null };
  const n = /^\d{1,3}$/.test(t) ? Number(t) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= 99) return { ok: true, value: n };
  return { ok: false, message: "Thứ tự chọn nhanh phải là số nguyên từ 1 đến 99, hoặc để trống nếu không chọn nhanh." };
}

/** Ô mà nút chọn nhanh của chặng điền vào. */
export function oChonNhanhCuaChang(l: Pick<ChangNhap, "direction">): "tra" | "don" {
  return l.direction === "OUT" ? "tra" : "don";
}

/** Điền điểm chọn nhanh vào ô tương ứng của chặng thứ `i` (trả mảng MỚI). Chặng không tồn tại → bản sao nguyên. */
export function apChonNhanh(legs: readonly ChangNhap[], i: number, diemId: string): ChangNhap[] {
  const l = legs[i];
  if (!l) return legs.map((x) => ({ ...x }));
  return suaChang(legs, i, oChonNhanhCuaChang(l) === "tra" ? { tra: diemId } : { don: diemId });
}

/** Dịch vụ thuộc nhóm tắt đưa đón (`choPhep = false`) thì không có chặng nào; còn lại giữ nguyên. */
export function boChangKhiTatDuaDon(legs: readonly ChangNhap[], choPhep: boolean): { legs: ChangNhap[]; soBo: number } {
  if (choPhep || legs.length === 0) return { legs: [...legs], soBo: 0 };
  return { legs: [], soBo: legs.length };
}

/** Câu báo ngắn khi form tự bỏ chặng của dịch vụ nhóm tắt đưa đón. */
export function cauBoChangNhomTat(tenDichVu: string, soBo: number): string {
  return `${tenDichVu} thuộc nhóm không có đưa đón — đã bỏ ${soBo} chặng đưa đón khỏi dịch vụ này.`;
}
