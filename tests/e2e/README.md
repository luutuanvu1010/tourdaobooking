# Kiểm thử end-to-end (API) — chạy trên D1 **local**, không bao giờ trỏ vào remote

Đây là lưới an toàn hành vi của hệ thống. Chúng gọi HTTP thật vào `wrangler dev` và (catalog) sửa D1 local bằng `wrangler d1 execute --local`.

## Chuẩn bị
1. `npm run db:migrate:local`
2. Tài khoản test local (tạo bằng `scripts/create-staff.mjs`, xem HANDOFF-M4.md): `0900000002`/PIN `246810` (sales A), `0900000003`/`135790` (sales B), `0900000004`/`112233` (admin). Chỉ có ý nghĩa ở local.
3. Tắt hẳn server cũ rồi chạy mới (wrangler dev không tự nạp lại `src/` đáng tin cậy):
   `pkill -f "wrangler dev"; pkill -9 -f "workerd serve"; npx wrangler dev --port 8787 --test-scheduled`
4. Chạy **từ thư mục gốc repo** (script catalog gọi `npx wrangler` theo cwd).

## Chạy
| Script | Kiểm gì | Ghi chú |
|---|---|---|
| `node tests/e2e/orders.mjs` | đơn hàng: bất biến §2.3, phân quyền sửa/huỷ, chuyển trạng thái, 30 đơn song song ra mã khác nhau, phân trang, `/api/audit` | tạo thêm đơn ở D1 local |
| `node tests/e2e/admin.mjs` | quản lý nhân viên, đặt lại/đổi PIN thu hồi phiên, chống dò PIN (kể cả bắn song song, theo IP), xem trước Sheet nhân viên | gọi Google Sheet thật; **tạo tài khoản thử** → dọn sau (xem dưới) |
| `node tests/e2e/admin-race.mjs` | hai admin cuối hạ quyền nhau cùng lúc phải còn ≥ 1 admin | tạm ngưng rồi mở lại các admin khác |
| `node tests/e2e/catalog.mjs` | danh mục với Google Sheet thật: bootstrap, đồng bộ lại, đổi giá, ghi đè không bị đè, xung đột, ẩn/hiện, Cron (`/__scheduled`), chốt chặn | **cần D1 catalog "sạch"**: không còn `catalog_override`, `catalog_sync.last_error` rỗng |

## Dọn D1 local sau khi chạy
Xoá tài khoản thử (mọi SĐT ngoài 5 tài khoản test), các dòng `audit_log` của chúng, `catalog_override`, `login_attempt`; đặt `credentials_changed_at = NULL`. Mẫu lệnh nằm trong lịch sử phiên; nên thành một script `tests/e2e/reset-local.sh`.

## Việc nên làm (phiên audit)
Chuyển các script này thành bộ test tự động có setup/teardown và DB riêng (`--persist-to`), chạy được bằng một lệnh, để mọi lần tái cấu trúc có lưới an toàn.
