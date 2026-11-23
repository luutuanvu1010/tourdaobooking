// Câu đọc CHỈ ĐỌC cho chủ dự án — việc 15 (2026-11-23, đặc tả docs/superpowers/specs/2026-11-23-viec-15-nha-cung-cap.md B2): trước khi triển khai, đếm bản chụp
// HIỆN HÀNH mà luật chia phần mới («quầy nhà cung cấp» đọc `supplier_party_id` của bản chụp) cho kết quả KHÁC luật cũ («người bán ≠ công ty chủ hôm nay»).
// Hai cột cuối đều 0 ⇒ không đơn nào đổi số tiền chia phần trên biên nhận / trần «thu cho» quầy sau khi triển khai (sổ giá vốn đọc supplier từ trước, không đổi).
//   ca_1: không nhà cung cấp mua lại mà người bán ≠ công ty chủ hiện tại (công ty chủ đã từng đổi) — luật cũ: quầy người bán; luật mới: phần Tour Đảo.
//   ca_2: có nhà cung cấp mà nó LÀ công ty chủ hiện tại, hoặc không đọc được công ty chủ — luật cũ: phần Tour Đảo; luật mới: quầy nhà cung cấp.
// so_dong_vai_cong_ty_chu = 1 ⇒ chưa từng đổi công ty chủ. Chỉ đọc mã, không tên, không số điện thoại.
// Chủ tự chạy trên bản thật; AI KHÔNG chạy lệnh --remote (CLAUDE.md §8). Dùng: node scripts/cau-doc-chia-phan-nha-cung-cap.mjs → in lệnh để chép–dán.
// Bài kiểm chạy câu này trên khung thử (ca 0 và ca_1 > 0 sau khi đổi công ty chủ): src/doi-cong-ty-chu-nha-cung-cap.test.ts.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CAU_DOC_CHIA_PHAN =
  "WITH hien AS (SELECT t.* FROM ord_service_terms t WHERE NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)) SELECT (SELECT count(*) FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY') AS so_dong_vai_cong_ty_chu, (SELECT count(*) FROM v_pty_owner_company) AS so_cong_ty_chu_dang_mo, COALESCE(SUM(CASE WHEN supply_status = 'SET' AND supplier_party_id IS NULL AND seller_party_id NOT IN (SELECT party_id FROM v_pty_owner_company) THEN 1 ELSE 0 END), 0) AS ca_1, COALESCE(SUM(CASE WHEN supplier_party_id IS NOT NULL AND (supplier_party_id IN (SELECT party_id FROM v_pty_owner_company) OR NOT EXISTS (SELECT 1 FROM v_pty_owner_company)) THEN 1 ELSE 0 END), 0) AS ca_2 FROM hien;";

/** Lệnh chỉ đọc chủ chép–dán, đứng ở thư mục gốc kho tourdao-sales. Dùng `--command`, không `--file` (lệnh `--remote --file` từng lỗi đăng nhập Cloudflare). */
export const lenhChoChu = (sql) => `npx wrangler d1 execute tourdao-sales-db --remote --command "${sql}"`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Câu đọc CHỈ ĐỌC (việc 15). Đứng ở thư mục gốc kho tourdao-sales, chép lệnh vào Terminal. Hai cột ca_1, ca_2 đều 0 ⇒ không đơn nào đổi tiền chia phần.\n");
  console.log(lenhChoChu(CAU_DOC_CHIA_PHAN));
}
