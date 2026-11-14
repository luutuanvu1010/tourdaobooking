// Bước 1 khung chung (N10, 13/11/2026): ghi «trang này có / không có khối theo quyền <tên>» để lần mở sau tệp đầu trang web/giu-cho-dai.ts giữ chỗ khối đó từ lần
// vẽ đầu (CSS `html[data-giu-khoi~="<tên>"]`). Chỉ tên khối (sessionStorage của thẻ, trang đăng nhập xoá), không dữ liệu, không thay cổng quyền — máy chủ và `can()`
// vẫn quyết khối có hiện hay không; ghi sai thì chỉ là một khoảng trống thoáng qua.
import { KHOA_KHOI } from "../src/shared/dai-chu";

export function nhoKhoi(ten: string, co: boolean): void {
  try {
    const k = KHOA_KHOI + location.pathname;
    const ds = new Set((sessionStorage.getItem(k) ?? "").split(" ").filter(Boolean));
    if (co) ds.add(ten);
    else ds.delete(ten);
    if (ds.size) sessionStorage.setItem(k, [...ds].join(" "));
    else sessionStorage.removeItem(k);
  } catch {
    // sessionStorage bị chặn: không giữ chỗ, như trước
  }
}
