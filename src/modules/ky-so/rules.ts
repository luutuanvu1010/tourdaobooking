// Luật thuần khoá tháng (ADR-0080 phần D1; đặc tả 2026-10-08 §8). MỘT nguồn cho câu báo tháng đã khoá: `src/shared/ky-khoa.ts` (Ruling Task 7 — luật thuần của
// billing chạy thẳng bằng node nên không import được module này); tệp này tái xuất `kyCua`, `cauKyKhoa`, `nhanThang` để module khác vẫn lấy qua `ky-so/index.ts`.
// Không cắt tháng bằng `slice(5, 7)` (bài `src/ngay-mot-ham.test.ts`): dùng `tachThang`.
import { cauKyKhoa, kyCua, nhanThang, tachThang } from "../../shared/ky-khoa.ts";
export { cauKyKhoa, kyCua, nhanThang };
export function thangKeTiep(period: string): string {
  const { nam, thang } = tachThang(period);
  return thang === 12 ? `${nam + 1}-01` : `${nam}-${String(thang + 1).padStart(2, "0")}`;
}
const thangTruoc = (period: string): string => {
  const { nam, thang } = tachThang(period);
  return thang === 1 ? `${nam - 1}-12` : `${nam}-${String(thang - 1).padStart(2, "0")}`;
};
export const kyDaKhoaTu = (daKhoa: ReadonlySet<string>) => (ngay: string): boolean => daKhoa.has(kyCua(ngay));
/** Ngày cuối của tháng "YYYY-MM" ("YYYY-MM-DD") — mốc "số dư cuối tháng" của bảng kiểm. */
export function ngayCuoiThang(period: string): string {
  const { nam, thang } = tachThang(period);
  return `${period}-${String(new Date(Date.UTC(nam, thang, 0)).getUTCDate()).padStart(2, "0")}`;
}
/** Ghi chú khi khoá tháng: tuỳ chọn, ≤ 200 ký tự (khớp CHECK của `ky_period_close.note`), không dãy ≥ 8 chữ số (khuôn billing: không SĐT / số tài khoản). */
export function docGhiChuKy(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || raw.length > 200) return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
  if (/\d{8,}/.test(raw.replace(/[\s.-]/g, ""))) return { ok: false, message: "Ghi chú không được chứa số điện thoại / số tài khoản." };
  return { ok: true, value: raw.trim() || null };
}

export function kiemKhoaKy(v: { period: string; homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }):
  { ok: true } | { ok: false; status: 400 | 409; code: string; message: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.period)) return { ok: false, status: 400, code: "invalid_input", message: "Tháng không hợp lệ." };
  if (v.period >= kyCua(v.homNay)) return { ok: false, status: 400, code: "period_not_past", message: "Chỉ khoá được tháng đã qua." };
  if (v.daKhoa.includes(v.period)) return { ok: false, status: 409, code: "period_already_closed", message: `Tháng ${nhanThang(v.period)} đã khoá rồi.` };
  const cuoi = v.daKhoa.length ? [...v.daKhoa].sort().at(-1)! : null;
  if (cuoi !== null && v.period !== thangKeTiep(cuoi)) return { ok: false, status: 409, code: "period_not_adjacent", message: `Phải khoá lần lượt — tháng khoá được kế tiếp là ${nhanThang(thangKeTiep(cuoi))}.` };
  if (cuoi === null && v.thangSoSomNhat !== null && v.period > v.thangSoSomNhat)
    return { ok: false, status: 409, code: "period_not_adjacent", message: `Lần khoá đầu tiên phải bắt đầu từ tháng ${nhanThang(v.thangSoSomNhat)} (tháng có dòng sổ sớm nhất) hoặc trước đó.` };
  return { ok: true };
}

export function thangKhoaDuocKeTiep(v: { homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }): string | null {
  const cuoi = v.daKhoa.length ? [...v.daKhoa].sort().at(-1)! : null;
  const keTiep = cuoi !== null ? thangKeTiep(cuoi) : (v.thangSoSomNhat ?? thangTruoc(kyCua(v.homNay)));
  return keTiep < kyCua(v.homNay) ? keTiep : null;
}
