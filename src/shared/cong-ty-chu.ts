// Hồ sơ "công ty chủ" — ADR-0024 điều 6 (accepted phần điều 6, chủ duyệt 2026-09-28). Tệp THUẦN, một nguồn cho máy chủ (module parties)
// và giao diện (web/login.ts). Không nhắc tên bảng vai hồ sơ ở đây (R-N1-12 — src/architecture.test.ts).

/**
 * Mã vai đánh dấu hồ sơ tổ chức Tour Đảo. DỮ LIỆU ở bảng loại vai (migrations/*_ho_so_cong_ty_chu.sql), nhóm OTHER: không sinh quyền
 * (không có trong roles.ts), gieo "ngưng gán mới" (active = 0) nên không hiện ở ô "Thêm công việc" của Danh bạ.
 */
export const OWNER_COMPANY_ROLE = "OWNER_COMPANY";

/**
 * Mục định danh mà thông tin công ty công khai (GET /api/company — biên nhận) BẮT BUỘC có. MỘT nguồn cho hai nơi: module `company` (thiếu → 404) và
 * module `parties` (Ruling T8 của điều phối, áp ADR-0043 "không lúc nào trống": không cho đổi công ty chủ sang hồ sơ thiếu mục nào → 409). Email không bắt buộc.
 * Trả danh sách nhãn tiếng Việt của mục THIẾU (rỗng = đủ), theo thứ tự cố định.
 */
export function thieuChoCongTyChu(c: { legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null }): string[] {
  const co = (v: string | null): boolean => typeof v === "string" && v.trim().length > 0;
  const out: string[] = [];
  if (!co(c.legalName)) out.push("tên pháp lý");
  if (!co(c.taxCode)) out.push("mã số thuế");
  if (!co(c.address)) out.push("địa chỉ");
  if (!co(c.hotline)) out.push("liên hệ ghi chú “Hotline” đang dùng");
  return out;
}

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
