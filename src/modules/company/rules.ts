// Luật thuần của module company: dựng danh sách trắng năm trường công khai (CompanyDto) từ định danh hồ sơ công ty chủ (ADR-0024 6.2).
import type { CompanyDto } from "../../shared/contracts.ts";

type Nguon = { legalName: string | null; taxCode: string | null; address: string | null; hotline: string | null; email: string | null };
const co = (v: string | null): v is string => typeof v === "string" && v.trim().length > 0;

/** Thiếu tên pháp lý / MST / địa chỉ / hotline → null (route trả 404 như khi chưa có thông tin công ty). Email trống → null. Chỉ đúng năm khoá. */
export function toCompanyDto(c: Nguon | null): CompanyDto | null {
  if (!c || !co(c.legalName) || !co(c.taxCode) || !co(c.address) || !co(c.hotline)) return null;
  return { name: c.legalName, taxCode: c.taxCode, address: c.address, hotline: c.hotline, email: co(c.email) ? c.email : null };
}
