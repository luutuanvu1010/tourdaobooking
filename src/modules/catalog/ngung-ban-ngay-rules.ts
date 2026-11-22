// LUẬT THUẦN của «Ngừng bán theo ngày» (ADR-0220 Đ1, Đ2). Không I/O, không import module khác. MỘT phép xét (`trungNgungBanNgay`) cho mọi cửa ghi đơn —
// `orders` gọi qua hàm công bố `kiemNgungBanTheoNgay` của `catalog`, không viết phép thứ hai. Ngày là ngày dân sự Việt Nam "YYYY-MM-DD", so chuỗi, gồm cả hai đầu.
import { isISODate, ngayDayDu } from "../../shared/vn-date.ts";

type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
export type PhamViNgungBan = "SERVICE" | "GROUP";

/** Một dòng `ctl_sales_pause` CÒN CHẶN (chưa kết thúc). */
export interface KhoangNgungBan { id: string; scope: PhamViNgungBan; catalogCode: string | null; groupCode: string | null; fromDate: string; toDate: string }
/** Một dòng dịch vụ của đơn: mã danh mục (`null` = nhập tay), nhóm HIỆN HÀNH của mã (`null` = chưa phân loại), ngày khởi hành (`null` / rỗng = chưa nhập). */
export interface DongXet { catalogCode: string | null; nhom: string | null; ngay: string | null; name: string }
export interface TrungNgungBan { viTri: number; name: string; fromDate: string; toDate: string; khoangId: string }

/** ADR-0220 Đ2: dòng có mã, có ngày, và ngày nằm trong một khoảng còn chặn trùng mã hoặc trùng nhóm hiện hành. Thứ tự: theo dòng đơn, rồi theo khoảng. */
export function trungNgungBanNgay(v: { khoang: readonly KhoangNgungBan[]; dong: readonly DongXet[] }): TrungNgungBan[] {
  const out: TrungNgungBan[] = [];
  v.dong.forEach((d, viTri) => {
    if (!d.catalogCode || !d.ngay) return;
    for (const k of v.khoang) {
      const phu = k.scope === "SERVICE" ? k.catalogCode === d.catalogCode : d.nhom !== null && k.groupCode === d.nhom;
      if (phu && d.ngay >= k.fromDate && d.ngay <= k.toDate) out.push({ viTri, name: d.name, fromDate: k.fromDate, toDate: k.toDate, khoangId: k.id });
    }
  });
  return out;
}

/** Câu 409 `sales_paused_date` (ADR-0220 Đ3): nêu tên dịch vụ và khoảng ngày, năm đầy đủ. */
export const cauNgungBanNgay = (t: { name: string; fromDate: string; toDate: string }): string =>
  t.fromDate === t.toDate ? `${t.name} ngừng bán ngày ${ngayDayDu(t.fromDate)}.` : `${t.name} ngừng bán từ ${ngayDayDu(t.fromDate)} đến ${ngayDayDu(t.toDate)}.`;

export interface KhoangMoi { scope: PhamViNgungBan; ma: string; tuNgay: string; denNgay: string; ghiChu: string | null }

/** Đọc thân `POST` đặt khoảng (ADR-0220 Đ1): phạm vi + mã, hai ngày bắt buộc, ngày cuối ≥ ngày đầu và không ở quá khứ, ghi chú ≤ 200 ký tự. */
export function docKhoangMoi(body: unknown, homNay: string): Ket<KhoangMoi> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (b.phamVi !== "SERVICE" && b.phamVi !== "GROUP") return { ok: false, message: "Chọn ngừng bán cho một dịch vụ hoặc một nhóm." };
  if (typeof b.ma !== "string" || b.ma.trim() === "") return { ok: false, message: b.phamVi === "GROUP" ? "Chọn nhóm dịch vụ." : "Chọn dịch vụ." };
  if (typeof b.tuNgay !== "string" || !isISODate(b.tuNgay)) return { ok: false, message: "Chọn ngày đầu." };
  if (typeof b.denNgay !== "string" || !isISODate(b.denNgay)) return { ok: false, message: "Chọn ngày cuối." };
  if (b.denNgay < b.tuNgay) return { ok: false, message: "Ngày cuối không được trước ngày đầu." };
  if (b.denNgay < homNay) return { ok: false, message: "Ngày cuối đã qua." };
  let ghiChu: string | null = null;
  if (b.ghiChu !== undefined && b.ghiChu !== null) {
    if (typeof b.ghiChu !== "string") return { ok: false, message: "Ghi chú không hợp lệ." };
    const g = b.ghiChu.trim();
    if (g.length > 200) return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
    ghiChu = g === "" ? null : g;
  }
  return { ok: true, value: { scope: b.phamVi, ma: b.ma.trim(), tuNgay: b.tuNgay, denNgay: b.denNgay, ghiChu } };
}
