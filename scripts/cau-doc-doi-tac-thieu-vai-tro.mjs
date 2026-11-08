// Câu đọc CHỈ ĐỌC cho chủ dự án — ADR-0185 Đ3 mục 1 (tài khoản Đối tác chưa gán vai trò đối tác) và mục 2 (đơn của họ cần «Đổi khách»; kế hoạch K11).
// Chủ tự chạy trên bản thật; AI KHÔNG chạy lệnh --remote (CLAUDE.md §8). Dùng: node scripts/cau-doc-doi-tac-thieu-vai-tro.mjs → in hai lệnh để chép–dán.
// Hai hằng được bài kiểm chạy trên dữ liệu thử: src/cau-doc-doi-tac-thieu-vai-tro.test.ts (nguyên văn ADR, ca Đổi khách) và src/audit-invariants.test.ts
// (bài đối chiếu ba nơi H4: trigger lc1c ⇔ R-LC-1c ⇔ CAU_DOC_TAI_KHOAN, theo hành vi).
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Đ3 mục 1 — NGUYÊN VĂN câu đọc trong ADR-0185 (chủ đã thử đúng trên khung thử 7/11; bài kiểm so với tệp ADR): tài khoản đang hoạt động giữ quyền Đối tác mà
 * hồ sơ không mở vai nhóm bên ngoài và không mang vai trò do Kế toán thêm. Cùng điều kiện với trigger lc1c (migration 0149) và R-LC-1c (scripts/audit-checks.mjs).
 * Sửa từng tài khoản ở màn Quản lý tài khoản: Sửa, chọn đúng vai trò đối tác, lưu. Tài khoản lai (giữ thêm quyền nội bộ) cũng hiện ở đây nhưng không gán được
 * vai trò nhóm bên ngoài (LC-1) — chủ quyết bỏ bên quyền nào.
 */
export const CAU_DOC_TAI_KHOAN =
  "SELECT s.id, s.party_id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id = s.party_id AND g.role_group = 'EXTERNAL') AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = s.party_id AND t.role_group = 'OTHER' AND t.is_partner_label = 1);";

/**
 * Đ3 mục 2 (kế hoạch K11) — đơn ĐÃ XÁC NHẬN, chưa «Khách đã trả đủ», người lập đang giữ quyền Đối tác, mà bản chụp hoa hồng HIỆN HÀNH (bản chưa bị bản nào thay)
 * của ít nhất một dòng dịch vụ là «không người hưởng». Văn phòng mở từng đơn, dùng «Đổi khách» chọn hồ sơ đối tác làm bên đặt — máy chụp lại hoa hồng
 * (ADR-0077 điều 9; ca thử ở bài kiểm). Danh sách ĐỂ SOÁT, không phải vi phạm: đơn văn phòng cố ý đổi sang khách lẻ cũng hiện. Đơn đã «Khách đã trả đủ» ngoài
 * phạm vi (ADR-0185, dòng «Xây trên lỗ đang hở»). Chỉ đọc mã đơn và mã người lập — không đọc tên, số điện thoại khách.
 */
export const CAU_DOC_DON =
  "SELECT o.order_code, o.id, o.staff_id FROM orders o WHERE o.status = 'confirmed' AND o.delivered_at IS NULL AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = o.staff_id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL) AND EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id = o.id AND t.commission_status = 'NONE' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)) ORDER BY o.order_code;";

/** Lệnh chỉ đọc chủ chép–dán, đứng ở thư mục gốc kho tourdao-sales. Dùng `--command`, không `--file` (lệnh `--remote --file` từng lỗi đăng nhập Cloudflare). */
export const lenhChoChu = (sql) => `npx wrangler d1 execute tourdao-sales-db --remote --command "${sql}"`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Hai câu đọc CHỈ ĐỌC (ADR-0185 Đ3). Đứng ở thư mục gốc kho tourdao-sales, chép từng lệnh vào Terminal.\n");
  console.log("1) Tài khoản Đối tác chưa gán vai trò đối tác (sửa ở màn Quản lý tài khoản):\n");
  console.log(lenhChoChu(CAU_DOC_TAI_KHOAN));
  console.log("\n2) Đơn đã xác nhận của tài khoản Đối tác mà hoa hồng ra «không người hưởng» (văn phòng dùng «Đổi khách»):\n");
  console.log(lenhChoChu(CAU_DOC_DON));
}
