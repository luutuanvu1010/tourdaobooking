// Đọc CHUNG chính sách hiện / ẩn / bắt buộc của Toàn quyền (ADR-0194 đợt 1) cho mọi màn: tải TRƯỚC khi dựng form / danh sách; lỗi tải (mạng, 403, máy chủ) ⇒ mặc định ĐẦY ĐỦ — không bao giờ
// ẩn hết vì lỗi. Giao diện chỉ ẩn / hiện / đánh dấu; MÁY CHỦ quyết lại khi ghi (bỏ khoá trường ẩn, kiểm trường bắt buộc). Không innerHTML.
import { traCuuChinhSach, type ManUi } from "../src/shared/ui-truong";
import { api, type Api } from "./api";

export interface ChinhSachUi {
  /** `dieuKienHienCo`: các điều kiện dịch vụ đang thoả (`dieuKienCuaDichVu`, ADR-0195); vắng ⇒ chỉ mục không điều kiện. */
  an: (man: ManUi, truong: string, dieuKienHienCo?: string | readonly string[]) => boolean;
  batBuoc: (man: ManUi, truong: string, dieuKienHienCo?: string | readonly string[]) => boolean;
}
export const CHINH_SACH_DAY_DU: ChinhSachUi = traCuuChinhSach([]);

/** Bản vừa tải gần nhất của trang — cho các tệp dựng giao diện con (vd Hỗ trợ) hỏi mà không phải truyền tay; chưa tải / lỗi ⇒ đầy đủ. */
let hienCo: ChinhSachUi = CHINH_SACH_DAY_DU;
export const chinhSachHienCo = (): ChinhSachUi => hienCo;

/** Tải chính sách áp cho CHÍNH người đang đăng nhập. Không bao giờ ném: lỗi ⇒ mặc định đầy đủ. */
export async function taiChinhSach(): Promise<ChinhSachUi> {
  try {
    const r = await api<Api.ChinhSachGiaoDienDto>("/api/cai-dat/giao-dien");
    hienCo = traCuuChinhSach(Array.isArray(r.truong) ? r.truong.filter((d) => d && typeof d.truong === "string") as never : []);
  } catch {
    hienCo = CHINH_SACH_DAY_DU;
  }
  return hienCo;
}

/** Ẩn / hiện các phần tử bằng thuộc tính `hidden` (`app.css`: `[hidden]` luôn thắng). */
export function anPhanTu(an: boolean, ...els: (Element | null | undefined)[]): void {
  for (const e of els) if (e) e.toggleAttribute("hidden", an);
}
