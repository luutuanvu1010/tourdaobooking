// Luật thuần của module company: dựng danh sách trắng năm trường công khai (CompanyDto) từ định danh hồ sơ công ty chủ (ADR-0024 6.2).
import { thieuChoCongTyChu } from "../../shared/cong-ty-chu.ts";
import type { CompanyDto } from "../../shared/contracts.ts";

type Nguon = { legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null };

/**
 * Thiếu tên pháp lý / MST / địa chỉ / hotline → null (route trả 404 như khi chưa có thông tin công ty). Email trống → null. Chỉ đúng năm khoá.
 * "Thiếu gì" lấy từ MỘT nguồn `thieuChoCongTyChu` (src/shared/cong-ty-chu.ts) — cùng luật mà module parties dùng để chặn đổi công ty chủ sang hồ sơ thiếu
 * (Ruling T8). Qua được kiểm đó thì bốn trường là chuỗi khác rỗng.
 */
export function toCompanyDto(c: Nguon | null): CompanyDto | null {
  if (!c || thieuChoCongTyChu(c).length > 0) return null;
  const email = typeof c.email === "string" && c.email.trim().length > 0 ? c.email : null;
  return { name: c.legalName as string, taxCode: c.taxCode as string, address: c.address as string, hotline: c.hotline as string, email };
}
