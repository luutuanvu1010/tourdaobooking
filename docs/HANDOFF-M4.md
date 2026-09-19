# HANDOFF — bắt đầu M4 (mẫu xác nhận + xuất PNG/PDF)

Phiên mới: đọc `README.md`, `docs/SPEC-tourdao-sales.md` (§4 mẫu + design token, §3 ngưỡng hiệu năng, §6-M4), rồi file này. Chỉ làm M4; không làm M5 "cho tiện" (spec §6). M4 cần **ADR ngắn** cho ba quyết định một chiều (D1 làm nguồn `order`, bản sao catalog trong D1, PNG/PDF phía client hay server) — viết lúc bắt đầu.

## Trạng thái (2026-09-19)

Xong: M1, M2, bảng Admin (quản lý nhân viên, chống dò PIN, `/audit`), **M3 (danh mục dịch vụ từ Sheet)**. Kiểm chứng trên D1 **local**: `npm run typecheck` sạch, `npm test` 38/38, các kịch bản e2e API (đơn hàng; quản trị + khoá đăng nhập + đua admin; danh mục với Google Sheet thật: bootstrap, đồng bộ lại, đổi giá, ghi đè + xung đột, ẩn/hiện, Cron giả lập, chốt chặn) và thao tác UI thật (`/catalog`, chọn nhanh dịch vụ → lưu đơn `TD-…-0199`, cảnh báo khi Sheet lỗi). **Triển khai (2026-09-19, cập nhật cuối phiên):** D1 remote **đã áp migration 0005 + 0006** (admin gốc Lưu Tuấn Vũ còn nguyên, 0 đơn, 0 nhật ký). **Worker CHƯA deploy** — lệnh `wrangler deploy` bị hệ thống chặn (production deploy) nên chờ chủ dự án tự chạy hoặc cấp quyền. Các bước còn lại, theo thứ tự: (1) `npx wrangler deploy` (tạo Worker + Cron `*/15 * * * *` + bật `workers.dev`; lần đầu có thể hỏi đăng ký subdomain workers.dev); (2) đặt secret ngay sau đó: `openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put SESSION_SECRET` (chưa có secret thì `/api/auth/login` báo lỗi 500); (3) kiểm: `GET /login` 200, `GET /api/auth/me` 401; (4) admin đăng nhập → `/staff` → "Đồng bộ danh sách từ Google Sheet…". Tên miền `sales.tourdao.vn` để M5.

Vận hành khi thử: `wrangler dev` không tự nạp lại `src/` đáng tin cậy — tắt hẳn (`pkill -f "wrangler dev"; pkill -9 -f "workerd serve"`) rồi chạy lại; thêm `--test-scheduled` để gọi Cron bằng `GET /__scheduled`. Kịch bản e2e là script tạm (ngoài repo) — nên chuyển thành test tích hợp nếu muốn giữ.

## Điều M4 dùng lại

- Đơn lưu sẵn mọi thứ để dựng mẫu: `order` + `order_item` (mô tả, chi tiết, số lượng, đơn giá, thành tiền) + tên nhân viên; giá trên đơn là giá đã chốt lúc lập (không đổi khi catalog đổi).
- `company_profile` (đã có dòng `default`) là nguồn header mẫu; chưa có màn hình sửa (M5).
- `audit_log` đã có action `exported_png` / `exported_pdf`: ghi mỗi lần xuất (`orderId`, `staffId`, `targetType:"order"`).
- Chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ (`canModify`); xuất file dùng chung quyền xem (mọi nhân viên xem được đơn) — nên chốt với chủ dự án xuất đơn `draft`/`cancelled` có được không.
- Không bao giờ đưa `Ghi chú nội bộ` của Sheet lên mẫu (đã không được lưu vào D1).

## Quyết định M3 đã chốt (spec §2.4-6)

Sheet là nguồn chính; bản sao trong D1; Admin ghi đè có chủ đích không bị đồng bộ đè; dịch vụ biến mất chỉ bị ẩn; chỉ đọc cột cần; không ghi ngược Sheet. Nhập theo **số khách** (đồng bộ booking tourdaovn): dịch vụ `perPax` sinh dòng theo loại khách, `perNPax` (vd `per5Pax`) sinh 1 dòng số lượng = `ceil(khách/N)`. Logic sinh dòng nằm ở `src/shared/order-lines.ts` (thuần, có test, giao diện import trực tiếp).

## Còn treo / cần biết

- **Chưa áp dụng mùa/ưu đãi/mã giảm giá của booking website** (`quote.ts` có season, prepay, coupon): danh mục ở đây chỉ có giá gốc từ Sheet; nhân viên dùng ô "Giảm giá" của đơn. Nếu chủ dự án muốn đồng bộ các quy tắc đó thì là quyết định mới (cần ADR, đụng dữ liệu của tourdaovn).
- **Sheet nhân viên (đã có dữ liệu, kiểm 2026-09-19):** 9 người hợp lệ (8 `Staff`, 1 `Admin` là Nguyễn Phú Hải), không dòng lỗi, chưa nạp ai vào remote. **Đã xác nhận (chủ dự án, 2026-09-19):** SĐT của Nguyễn Tuyên Phong trùng số hotline công ty (`0845 256 256`) là đúng, không có vấn đề — cứ tạo bình thường. Sheet không cấp quyền: cả 9 người vào với vai trò nhân viên; đổi Nguyễn Phú Hải thành quản trị viên bằng nút "Sửa" ở `/staff`. Nạp bằng nút "Đồng bộ danh sách từ Google Sheet…" ở `/staff` (admin thật ở remote: Lưu Tuấn Vũ `0989929373`, PIN do chủ dự án giữ).
- **Rà soát kiến trúc:** chủ dự án muốn một phiên riêng — xem `docs/AUDIT-BRIEF.md` (nên làm trước M4). Kịch bản e2e đã lưu ở `tests/e2e/`.
- Cron dùng ID Sheet trong `vars` của `wrangler.jsonc`; Sheet phải giữ chia sẻ "Anyone with the link – Viewer". Mất quyền → lần đồng bộ lỗi `sheet_no_access`, hệ thống dùng bản đã lưu và `/catalog` + form đơn hiện cảnh báo.
- Đơn vị lạ trong Sheet (không phải `perPax`/`perNPax`) vẫn được lưu nhưng chỉ nhập tay được (badge trên `/catalog`).
- Không ghi nhật ký lần đăng nhập thất bại/bị chặn (chỉ bộ đếm `login_attempt`). Chưa có liên kết "đơn cũ → đơn mới" khi huỷ đơn đã xác nhận; tìm kiếm `LIKE` không phân biệt hoa/thường chữ có dấu.
- **Khôi phục khi bị khoá đăng nhập:** admin bị khoá theo SĐT cần admin khác bấm "Mở khoá" ở `/staff`; giới hạn 30 lần/IP có thể khoá cả văn phòng chung IP tối đa 15 phút (tự hết). Thủ công: `npx wrangler d1 execute tourdao-sales-db --remote --command "DELETE FROM login_attempt WHERE key = 'phone:0xxxxxxxxx'"`. Mất hết admin: dùng `scripts/create-staff.mjs` + `wrangler d1 execute`.
- D1 local hiện có 5 tài khoản test (`0900000001`, `0900000002`/`0900000003` sales, `0900000004` admin PIN `112233`, `0989929373`), 35 dịch vụ lấy từ Sheet thật; PIN test chỉ có ý nghĩa ở local.
