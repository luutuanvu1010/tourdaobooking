// LỚP CHỐNG GHI TRÙNG (ADR-0094 đ1) — TỆP MIỄN: route ghi có đăng nhập KHÔNG đi qua lớp vé. Router (src/shared/router.ts) đọc đúng tệp này lúc chạy.
// Mỗi mục: phương thức + MẪU route (đúng như khai ở `route(…)`) + lý do không rỗng; thêm mục = chủ duyệt (ADR-0094 đ1). Bài src/lan-gui-phu-route.test.ts
// ép: mục phải khớp một route có thật (mục ma ⇒ đỏ), route ghi `public` ngoài 5 route `auth` đã biết phải có mục `congKhai: true` ở đây.
// Route `public` tự miễn (không có tài khoản làm phạm vi vé) — không cần mục.

export interface MucMien {
  readonly method: "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly lyDo: string;
  /** Route ghi CÔNG KHAI mới (ngoài 5 route `auth`) — khai ở đây để bài phủ route biết là có chủ ý. */
  readonly congKhai?: true;
}

/** Route ghi có đăng nhập đều đi qua lớp vé; mục miễn duy nhất là route công khai của người đăng ký chưa có tài khoản. */
export const LAN_GUI_MIEN: readonly MucMien[] = [
  { method: "POST", path: "/api/dang-ky/phieu/tep", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "POST", path: "/api/dang-ky/ma", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "POST", path: "/api/dang-ky/xac-nhan", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "PUT", path: "/api/dang-ky/phieu", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "POST", path: "/api/dang-ky/phieu/gui", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "POST", path: "/api/dang-ky/phieu/rut", congKhai: true, lyDo: "người đăng ký chưa có tài khoản — ADR-0206 Đ7, chủ duyệt 15/11" },
  { method: "POST", path: "/api/dang-ky/phieu/dat-pin", congKhai: true, lyDo: "người được duyệt chưa có tài khoản đang bật — ADR-0206 Đ7 (route đặt PIN của ADR-0207), chủ duyệt 15/11" },
];

export const laMienLanGui = (method: string, path: string): boolean => LAN_GUI_MIEN.some((m) => m.method === method && m.path === path);
