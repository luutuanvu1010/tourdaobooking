# Kiểm thử end-to-end (API)

Lưới an toàn hành vi của hệ thống: gọi HTTP thật vào `wrangler dev`, trên một **D1 local tạm** dựng mới mỗi lần chạy. Không bao giờ trỏ vào D1 remote, không đụng `.wrangler/state` của máy.

## Chạy

```
npm run test:e2e                    # mọi kịch bản
npm run test:e2e -- orders catalog  # chỉ vài kịch bản
```

`run.mjs`: tạo thư mục tạm → áp mọi migration → nạp 3 tài khoản test (`lib.mjs` → `ACCOUNTS`) → `wrangler dev --persist-to <tạm> --test-scheduled` trên cổng trống, `SESSION_SECRET` ngẫu nhiên → chạy từng kịch bản → tắt server, xoá thư mục tạm. Không cần `.dev.vars`, không cần dọn tay.

**Cần mạng:** `admin.mjs` và `catalog.mjs` đọc Google Sheet thật (quyết định 2026-09-19). Sheet đổi dữ liệu (vd giá `TD101`, `TD103`) thì cập nhật assertion tương ứng trong `catalog.mjs`.

| Kịch bản | Kiểm gì |
|---|---|
| `platform.mjs` | router: 404/405 JSON, 401/403 trước handler, chặn ghi cross-site (thiếu/lạ `Origin`), chặn thân không phải JSON (415) |
| `pwa.mjs` | manifest đúng content-type/nội dung, icon đúng kích thước và không alpha, `/sw.js` không cache, đủ thẻ meta iOS + tên mới trên cả 8 trang, `/api/*` là `no-store` |
| `orders.mjs` | bất biến §2.3, phân quyền sửa/huỷ, chuyển trạng thái, 30 đơn song song ra mã khác nhau, phân trang, `/api/audit`; thao tác thua khi tranh chấp không ghi nhật ký |
| `trip.mjs` | thông tin chuyến theo dịch vụ, dùng danh mục **giả** `ZT*` chèn thẳng vào D1 (không cần Sheet, dọn ở `finally`): dòng tiền do máy chủ sinh, lệch giá, `catalog_changed`, xác nhận đòi đủ chuyến (thiếu ngày/quá khứ/quá xa/0 khách), đua "lưu xoá ngày" với xác nhận, khoá lạc quan `stale`, bản chụp dịch vụ đã ẩn/đổi giá, sửa trường vận hành sau xác nhận, bất biến SQL |
| `admin.mjs` | quản lý nhân viên, đặt lại/đổi PIN thu hồi phiên, chống dò PIN (kể cả bắn song song, theo IP), xem trước Sheet nhân viên |
| `catalog.mjs` | danh mục với Google Sheet thật: bootstrap, đồng bộ lại, đổi giá, ghi đè không bị đè, xung đột, ẩn/hiện, Cron (`/__scheduled`), chốt chặn |
| `admin-race.mjs` | hai admin cuối hạ quyền nhau cùng lúc: còn ≥ 1 admin, bên thua không ghi nhật ký (chạy cuối vì tạm ngưng các admin khác) |

## Chạy lẻ trên server có sẵn

Đặt `E2E_BASE_URL` (vd `http://localhost:8787`) và `E2E_PERSIST_TO` (thư mục D1 local của server đó, nếu không phải mặc định), rồi `node tests/e2e/<tên>.mjs`. D1 đó phải có 3 tài khoản trong `lib.mjs`; `catalog.mjs` cần D1 chưa từng đồng bộ danh mục.

## Kiểm giao diện bằng Chrome thật (A2)

Không nằm trong `npm run test:e2e` (cần Chrome; riêng `a2-evidence.mjs` còn cần một bản `axe-core` lấy bằng `npm pack` NGOÀI repo). Các kịch bản ở `docs/evidence/2026-09-20-a2/kich-ban/`: `a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` kiểm hành vi form lập/sửa đơn, trang đơn và bảng "Sửa thông tin chuyến"; `a2-evidence.mjs` chụp ảnh, đo và chạy axe. Cùng dựng D1 tạm + `wrangler dev` + Chrome headless (Chrome Debugging Protocol, Node 22 có `WebSocket` gốc, không thêm dependency). Chạy từ GỐC repo sau `npm run build:web`; cách chạy ở đầu mỗi tệp. Ba kịch bản `a2-smoke-*.mjs` chỉ cần `CHROME_BIN`; `AXE_JS` chỉ dùng ở `a2-evidence.mjs`. `chrome-wrap.sh` (cạnh các kịch bản) cứng đường dẫn Chrome của macOS (`/Applications/Google Chrome.app/…`) nên chỉ chạy được trên macOS — máy khác phải sửa đường dẫn trong tệp đó.
