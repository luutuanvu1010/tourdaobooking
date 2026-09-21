# Kiểm thử end-to-end (API)

Lưới an toàn hành vi của hệ thống: gọi HTTP thật vào `wrangler dev`, trên một **D1 local tạm** dựng mới mỗi lần chạy. Không bao giờ trỏ vào D1 remote, không đụng `.wrangler/state` của máy.

## Chạy

```
npm run test:e2e                    # mọi kịch bản
npm run test:e2e -- orders catalog  # chỉ vài kịch bản
```

`run.mjs`: tạo thư mục tạm → áp mọi migration → nạp 5 tài khoản test (`lib.mjs` → `ACCOUNTS`: `salesA`, `salesB`, `admin`, `accountant`, `field`) → `wrangler dev --persist-to <tạm> --test-scheduled` trên cổng trống, `SESSION_SECRET` ngẫu nhiên, **Turnstile BẬT bằng khoá thử của Cloudflare** (`--var TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`; hằng ở `lib.mjs` → `TURNSTILE_TEST`) → chạy từng kịch bản → tắt server, xoá thư mục tạm. Không cần `.dev.vars`, không cần dọn tay. Vì Turnstile bật nên MỌI đăng nhập trong kịch bản phải đi qua `login()`/`session()` của `lib.mjs` (gửi token thử `XXXX.DUMMY.TOKEN.XXXX`); tự gọi `POST /api/auth/login` không kèm token sẽ nhận 403.

**Cần mạng:** `admin.mjs` và `catalog.mjs` đọc Google Sheet thật (quyết định 2026-09-19). Sheet đổi dữ liệu (vd giá `TD101`, `TD103`) thì cập nhật assertion tương ứng trong `catalog.mjs`. Ngoài ra MỌI đăng nhập làm máy chủ gọi `siteverify` của Cloudflare (khoá thử), và `turnstile.mjs` gọi thẳng siteverify thật để kiểm hợp đồng.

| Kịch bản | Kiểm gì |
|---|---|
| `platform.mjs` | router: 404/405 JSON, 401/403 trước handler, chặn ghi cross-site (thiếu/lạ `Origin`), chặn thân không phải JSON (415) |
| `pwa.mjs` | manifest đúng content-type/nội dung, icon đúng kích thước và không alpha, `/sw.js` không cache, đủ thẻ meta iOS + tên mới trên mọi trang của `PAGES` (10 trang), `/api/*` là `no-store` |
| `orders.mjs` | bất biến §2.3, phân quyền sửa/huỷ, chuyển trạng thái, 30 đơn song song ra mã khác nhau, phân trang, `/api/audit`; thao tác thua khi tranh chấp không ghi nhật ký; **người phụ trách (khác người lập) sửa đơn** (ADR-0009): sửa nháp đủ (dịch vụ, số khách, tiền tính lại ở máy chủ), xác nhận, sửa chuyến, huỷ, xem nhật ký, `canModify`; người lập vẫn sửa được sau khi đã giao lại; SALES khác/kế toán/FIELD 403; sau xác nhận số khách/dịch vụ/tiền vẫn khoá (thử lách qua `PUT /trip`); bị đổi người thì mất quyền ngay |
| `trip.mjs` | thông tin chuyến theo dịch vụ, dùng danh mục **giả** `ZT*` chèn thẳng vào D1 (không cần Sheet, dọn ở `finally`): dòng tiền do máy chủ sinh, lệch giá, `catalog_changed`, xác nhận đòi đủ chuyến (thiếu ngày/quá khứ/quá xa/0 khách), đua "lưu xoá ngày" với xác nhận, khoá lạc quan `stale`, bản chụp dịch vụ đã ẩn/đổi giá, sửa trường vận hành sau xác nhận (kể cả bởi người phụ trách khác người lập; nhật ký không lộ nội dung điểm đón), bất biến SQL |
| `admin.mjs` | quản lý nhân viên, đặt lại/đổi PIN thu hồi phiên, chống dò PIN (kể cả bắn song song, theo IP), xem trước Sheet nhân viên |
| `turnstile.mjs` | Turnstile ở đăng nhập: `GET /api/auth/config` công khai/`no-store`/đúng khoá site/không lộ secret; thiếu hoặc hỏng token (9 dạng) → 403 `turnstile_failed` mà KHÔNG tiêu hao lượt PIN (16 lần thử không token/token hỏng — 6 lần sai PIN không token, 9 dạng token hỏng, 1 lần PIN đúng — không khoá SĐT, bảng `login_attempt` không có dòng nào, sau đó đăng nhập đúng vẫn được); token thử → qua Turnstile rồi mới kiểm PIN (sai → 401 và bị đếm, đủ 5 lần → 429); thiếu token trên SĐT đang khoá → 403 (Turnstile chạy TRƯỚC chống dò); hợp đồng với siteverify thật (đạt / luôn hỏng / token đã dùng / secret sai → `unavailable`). Dùng tài khoản dùng một lần (`randomPhone`), không đụng `ACCOUNTS`. Chạy lẻ trên server có sẵn thì server phải bật Turnstile bằng khoá thử (xem trên) |
| `catalog.mjs` | danh mục với Google Sheet thật: bootstrap, đồng bộ lại, đổi giá, ghi đè không bị đè, xung đột, ẩn/hiện, Cron (`/__scheduled`), chốt chặn |
| `locations.mjs` | địa điểm: tạo/sửa, quyền (chỉ admin ghi), nhật ký |
| `parties.mjs` | hồ sơ: tạo/sửa, liên hệ chính, vai trò theo nơi, quan hệ, tra cứu, nhật ký không lộ dữ liệu cá nhân |
| `permissions.mjs` | quyền đa trị: `/me`, `FIELD` bị chặn mọi bề mặt đơn/tiền/hồ sơ, `ACCOUNTING` xem không sửa, `SALES` chỉ đơn của mình, `ADMIN` mọi đơn, nhiều quyền; người phụ trách: đủ sáu vai (người phụ trách, người lập đã giao lại, quản trị, kế toán, FIELD, SALES khác) cho `canModify`, nhật ký và đổi người phụ trách; giao cho kế toán/FIELD → 400; giao lại đơn của người đã nghỉ |
| `dispatch.mjs` | người phụ trách đơn (module `dispatch`): đơn mới có người phụ trách = người lập (một dòng `HANDLE` đang mở, không thêm dòng nhật ký); `GET /api/dispatch/handlers` (nhiều đơn, `null`, tối đa 100, giá trị lạ 400, quyền) và `/assignees` (chỉ SALES/ADMIN đang hoạt động, chỉ tên); đổi người = đóng dòng cũ + mở dòng mới cùng thời điểm + nhật ký "từ A sang B"; ai đổi được (người lập kể cả đã giao lại, người phụ trách hiện tại, quản trị) / không (SALES khác giao hộ, kế toán, FIELD → 403); SALES/ADMIN tự nhận một đơn ĐÃ có người phụ trách (thua đua) → 409 `stale`, không phải 403; `no_change`; giao cho FIELD/kế toán/đã ngưng/không tồn tại → 400; nhận đơn chưa có người (đóng dòng `HANDLE` bằng SQL); người phụ trách sửa được đơn; tranh chấp song song (6 yêu cầu cùng lúc đổi người, 3 người nhận cùng lúc): bất biến số dòng/nhật ký/một dòng mở, và bên thua nhận ĐÚNG MỘT mã 409 `stale`. Tạo thêm hai tài khoản dùng một lần (SALES, và một tài khoản đã ngưng) — chạy trước `admin-race` |
| `admin-race.mjs` | hai admin cuối hạ quyền nhau cùng lúc: còn ≥ 1 admin, bên thua không ghi nhật ký (chạy cuối vì tạm ngưng các admin khác) |
| `company.mjs` | `GET /api/company`: công khai (chưa đăng nhập vẫn 200), `no-store`, ĐÚNG năm trường (không lộ Zalo/logo/người sửa), email sau migration 0013, ghi bị 405, đọc từ D1 (đổi dữ liệu thì đổi theo, email trống → `null`, mất dòng → 404); tạm sửa/xoá dòng `company_profile` rồi khôi phục ở `finally` |

## Chạy lẻ trên server có sẵn

Đặt `E2E_BASE_URL` (vd `http://localhost:8787`) và `E2E_PERSIST_TO` (thư mục D1 local của server đó, nếu không phải mặc định), rồi `node tests/e2e/<tên>.mjs`. D1 đó phải có 5 tài khoản trong `lib.mjs` (`ACCOUNTS`); `catalog.mjs` cần D1 chưa từng đồng bộ danh mục.

## Kiểm giao diện bằng Chrome thật (A2)

Không nằm trong `npm run test:e2e` (cần Chrome; riêng `a2-evidence.mjs` còn cần một bản `axe-core` lấy bằng `npm pack` NGOÀI repo). Các kịch bản ở `docs/evidence/2026-09-20-a2/kich-ban/`: `a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` kiểm hành vi form lập/sửa đơn, trang đơn và bảng "Sửa thông tin chuyến"; `a2-evidence.mjs` chụp ảnh, đo và chạy axe. Cùng dựng D1 tạm + `wrangler dev` + Chrome headless (Chrome Debugging Protocol, Node 22 có `WebSocket` gốc, không thêm dependency). Chạy từ GỐC repo sau `npm run build:web`; cách chạy ở đầu mỗi tệp. Ba kịch bản `a2-smoke-*.mjs` chỉ cần `CHROME_BIN`; `AXE_JS` chỉ dùng ở `a2-evidence.mjs`. Máy chủ của các kịch bản A2 chạy với Turnstile **TẮT** có chủ đích (`--var TURNSTILE_SITE_KEY:` / `TURNSTILE_SECRET_KEY:` rỗng ghi đè cả `.dev.vars`, nên chạy được offline); `env.login` vẫn gửi token thử. Kịch bản màn đăng nhập v1.0 — `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` (khối công ty, số phiên bản, widget Turnstile, CSP, service worker, axe, ảnh) — chạy HAI máy chủ nối tiếp: Turnstile BẬT bằng khoá thử (`startEnv({ turnstile: true })`, **cần mạng**) rồi TẮT; cần `AXE_JS` như `a2-evidence.mjs`. `chrome-wrap.sh` (cạnh các kịch bản) cứng đường dẫn Chrome của macOS (`/Applications/Google Chrome.app/…`) nên chỉ chạy được trên macOS — máy khác phải sửa đường dẫn trong tệp đó.
