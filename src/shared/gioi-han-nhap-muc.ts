// ADR-0161 Đ3 (Task 1) — LUẬT THUẦN «giới hạn nhập mức hoa hồng»: trần phần trăm, bước số tiền. Một tệp dùng ở máy chủ (route ghi mức của `pricing`) và giao diện (hộp nhập, trang giới hạn).
// Không I/O, không import module. Số 0 luôn được nhận (trẻ em không hưởng thì gõ 0). Chỉ áp cho SỐ MỚI nhập: dòng đã có và đơn đã chụp không bị áp lại.
// Câu từ chối đúng từng chữ theo kế hoạch (số định dạng bằng `nhanTyLeBp`, `nhanDong` của sổ đại lý).
import { nhanDong, nhanTyLeBp } from "./so-dai-ly-nhan.ts";

/** Giới hạn đang hiệu lực: trần phần trăm (phần vạn, 5000 = 50%) và bước số tiền (đồng). */
export interface GioiHanNhap { tranTyLeBp: number; buocTien: number }

/**
 * Số mới nhập của MỘT mức: `tyLeBp` (kiểu phần trăm, null khi không phải) và `soTien` (các số đồng của kiểu số tiền — người lớn, trẻ em, người cao tuổi; chỉ các số có khai).
 * Trả câu tiếng Việt khi vi phạm (phần trăm trước, rồi số tiền theo thứ tự), null khi hợp lệ. `0` luôn hợp lệ.
 */
export function viPhamGioiHanNhap(m: { tyLeBp: number | null; soTien: readonly number[] }, gh: GioiHanNhap): string | null {
  if (m.tyLeBp !== null && m.tyLeBp > gh.tranTyLeBp) return `Phần trăm không quá ${nhanTyLeBp(gh.tranTyLeBp)}.`;
  if (m.soTien.some((x) => x % gh.buocTien !== 0)) return `Số tiền phải chia hết cho ${nhanDong(gh.buocTien)}đ (không trả thì gõ 0).`;
  return null;
}

type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
const laSoNguyenTrong = (v: unknown, tu: number, den: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= tu && v <= den;

/**
 * Thân `POST /api/pricing/gioi-han-nhap`: { tranTyLeBp (1…10000), buocTien (1…1.000.000), tuLuc }. `tuLuc` = mốc hiệu lực của dòng giới hạn mà hộp đã đọc (khoá lạc quan: người khác vừa đổi ⇒ 409).
 */
export function kiemThanGioiHan(raw: unknown): Ket<GioiHanNhap & { tuLuc: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin giới hạn nhập." };
  const b = raw as Record<string, unknown>;
  if (!laSoNguyenTrong(b.tranTyLeBp, 1, 10_000)) return { ok: false, message: "Trần phần trăm phải là số nguyên phần vạn từ 1 tới 10.000 (100%)." };
  if (!laSoNguyenTrong(b.buocTien, 1, 1_000_000)) return { ok: false, message: "Bước số tiền phải là số nguyên đồng từ 1 tới 1.000.000." };
  if (typeof b.tuLuc !== "string" || b.tuLuc.length === 0 || b.tuLuc.length > 40) return { ok: false, message: "Thiếu mốc của giới hạn đang hiệu lực — tải lại trang rồi gửi lại." };
  return { ok: true, value: { tranTyLeBp: b.tranTyLeBp, buocTien: b.buocTien, tuLuc: b.tuLuc } };
}
