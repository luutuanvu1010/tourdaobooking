// Hồ sơ "công ty chủ" — ADR-0024 điều 6 (accepted phần điều 6, chủ duyệt 2026-09-28). Tệp THUẦN, một nguồn cho máy chủ (module parties)
// và giao diện (web/login.ts). Không nhắc tên bảng vai hồ sơ ở đây (R-N1-12 — src/architecture.test.ts).

/**
 * Mã vai đánh dấu hồ sơ tổ chức Tour Đảo. DỮ LIỆU ở bảng loại vai (migrations/*_ho_so_cong_ty_chu.sql), nhóm OTHER: không sinh quyền
 * (không có trong roles.ts), gieo "ngưng gán mới" (active = 0) nên không hiện ở ô "Thêm công việc" của Danh bạ.
 */
export const OWNER_COMPANY_ROLE = "OWNER_COMPANY";

/** 10–14 ký tự chữ số/gạch, như CHECK của cột mã số thuế ở hồ sơ tổ chức (migrations/0011). */
const MST_RE = /^[0-9][0-9-]{9,13}$/;

/** Chữ chân trang đăng nhập từ GET /api/auth/config (ADR-0024 6.2). Thiếu hoặc sai → null: trang GIỮ chữ tĩnh (dự phòng khi chưa tải xong / lỗi mạng). */
export function chanTrangCongTy(cfg: unknown): { ten: string; mst: string } | null {
  if (!cfg || typeof cfg !== "object") return null;
  const { companyName, companyTaxCode } = cfg as Record<string, unknown>;
  if (typeof companyName !== "string" || typeof companyTaxCode !== "string") return null;
  const ten = companyName.trim();
  const mst = companyTaxCode.trim();
  if (ten.length === 0 || ten.length > 200 || !MST_RE.test(mst)) return null;
  return { ten, mst };
}
