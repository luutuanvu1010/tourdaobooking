// SQL của bảng module company sở hữu (company_profile — singleton, id = 'default'). ADR-0024 6.3: các cột pháp lý (tên, MST, địa chỉ, hotline, Zalo,
// email) THÔI được đọc — nguồn định danh là hồ sơ công ty chủ (module parties, hàm ownerCompany). Module nghiêm cần ít nhất một câu đăng ký
// (src/architecture.test.ts); câu dưới đọc cột CÒN thuộc module (logo_url, thương hiệu) và CHƯA nơi nào gọi — chỗ giữ tới lượt thu hồi
// company_profile (expand–contract): NỢ có ghi (Ruling R1/D4 của nhật ký thi công T2b), gỡ ở pha contract. Không thêm cột pháp lý vào đây
// (khong-doc-cot-phap-ly.test.ts).
import { defineSql } from "../../shared/sql-registry.ts";

const FIND_LOGO = defineSql("company", "find_logo", "SELECT logo_url FROM company_profile WHERE id = 'default'");

/** Đường dẫn logo (thương hiệu) của dòng singleton, hoặc null. Chưa nơi nào gọi (xem chú thích đầu tệp). */
export async function findLogoUrl(db: D1Database): Promise<string | null> {
  return (await db.prepare(FIND_LOGO).first<{ logo_url: string | null }>())?.logo_url ?? null;
}
