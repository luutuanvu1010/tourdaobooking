# Nghiên cứu — "Chế độ Development": chỉ chủ dự án dùng được, sau khi mọi người đã đăng nhập thành công

Ngày 2026-09-21. **Chỉ là nghiên cứu, chưa làm gì trên mã hay production.** Yêu cầu của chủ dự án: "nghiên cứu việc bật chế độ Development sau khi mọi người đăng nhập thành công, trừ tôi (0989929373)".

## 1. Cách hiểu và điều chưa chắc
Yêu cầu có thể hiểu theo ba cách; tài liệu này nghiên cứu cách **(B)** và nêu lý do loại hai cách còn lại.
- **(A) "Development Mode" của Cloudflare** — đã kiểm tài liệu Cloudflare: đó là công tắc trong dashboard **tạm tắt bộ nhớ đệm ở rìa và Polish trong 3 giờ** để thấy nội dung mới ngay; nó **không** chặn ai, không có ngoại lệ theo người dùng, không liên quan tới Worker/đăng nhập. Không đáp ứng "trừ tôi". (Nếu ý là để tránh cache lúc thử: app đã có cơ chế riêng — `/sw.js` `no-store`, mã bản dựng đổi cache của service worker — nên thường không cần.)
- **(B) Chế độ phát triển/bảo trì của chính ứng dụng** *(hiểu như vậy)*: khi bật, **mọi tài khoản trừ chủ (SĐT `0989929373`) không dùng được app** — trang đăng nhập báo "hệ thống đang được nâng cấp", phiên đang mở bị từ chối — để chủ thử/sửa trên production mà nhân viên không bị ảnh hưởng hay tạo dữ liệu lẫn vào lúc đang phát triển. Bật SAU khi xác nhận mọi người đã đăng nhập thành công (tức đã qua Turnstile và mã v1.0).
- **(C) Chặn ở tầng mạng của Cloudflare (WAF/Access)**: chỉ nhận diện được IP, quốc gia, thiết bị — không nhận diện được "số điện thoại đăng nhập" — nên không thể "trừ tôi" theo tài khoản. Loại.

## 2. Dữ kiện đã kiểm (2026-09-21)
- **Phiên đăng nhập** là token ký HMAC, **không có bản ghi ở máy chủ**, sống **7 ngày** (`SESSION_TTL_SECONDS`); mỗi request `currentStaff` → `getActiveStaff` đọc lại tài khoản từ D1 (đã có sẵn một điểm để chặn theo người dùng, không thêm truy vấn). Ai còn phiên cũ (đăng nhập TRƯỚC khi bật Turnstile) **chưa hề qua Turnstile** cho tới khi phiên hết hạn (tối đa 7 ngày).
- **Hiện KHÔNG có ghi nhận đăng nhập thành công** ở đâu cả (bảng nhật ký chỉ có `login_unlocked`; `login_attempt` bị xoá khi thành công; phiên không lưu). Nghĩa là **chưa có cách nào biết "mọi người đã đăng nhập thành công"** ngoài hỏi trực tiếp hoặc xem log Worker theo thời gian thực.
- **Production:** 12 tài khoản, cả 12 đang hoạt động; tài khoản có SĐT `0989929373` **tồn tại, đang hoạt động, có quyền ADMIN** (và là ADMIN duy nhất hôm nay — nên "cho phép mọi ADMIN" hiện trùng với "cho phép chủ").
- **Cách buộc mọi người đăng nhập lại ngay:** xoay `SESSION_SECRET` (`wrangler secret put SESSION_SECRET` với giá trị mới ≥ 32 ký tự) — mọi token cũ hết hiệu lực tức thì, PIN không đổi, không ghi dữ liệu nào. Đây có lẽ là điều "đóng phiên" nói tới; **tác động: tất cả nhân viên đang làm việc bị đăng xuất giữa chừng** (kể cả chủ), form đang nhập dở mất.

## 3. Thiết kế đề xuất cho (B)
**Công tắc.**
- **Phương án 1 — biến bí mật `DEV_MODE_ALLOW_PHONES`** (ví dụ `0989929373`; nhiều số cách nhau dấu phẩy). Vắng hoặc rỗng = chế độ TẮT. Bật/tắt bằng `wrangler secret put` / `secret delete` (không cần deploy, có hiệu lực trong vài giây, hoàn tác tức thì). Không cần migration. Không lộ ai được phép (số nằm trong bí mật). **Khuyến nghị làm trước.**
- **Phương án 2 — dòng cài đặt trong D1** (`app_setting`) kèm nút bật/tắt cho chủ ở giao diện (kèm nhật ký ai bật lúc nào): tiện hơn trên điện thoại, nhưng cần migration + module + giao diện + nhật ký (ước ~3–4 giờ theo nhịp làm việc vừa rồi) và một câu hỏi "ai được bật" (chủ đã là ADMIN duy nhất). Làm sau nếu Phương án 1 dùng lâu dài.

**Điểm chặn (máy chủ mới là nơi ép, không tin trình duyệt).**
1. `POST /api/auth/login`: sau khi qua Turnstile và **trước** khi kiểm PIN, nếu chế độ BẬT và SĐT chuẩn hoá không nằm trong danh sách → 503 `maintenance` "Hệ thống đang được nâng cấp, vui lòng quay lại sau." — cùng thông điệp cho mọi SĐT (kể cả SĐT không tồn tại) để không lộ ai là tài khoản/được phép; không tiêu hao lượt PIN.
2. Mọi `/api/*` cần đăng nhập: trong `currentStaff` (đã đọc tài khoản mỗi request) hoặc ngay sau ở router: chế độ BẬT và SĐT của tài khoản không được phép → 503 `maintenance` (kể cả với phiên đang mở, hiệu lực ngay khi bật). Giữ nguyên `/api/auth/*`, `/api/company`, `/api/auth/config` (trang đăng nhập cần để hiển thị thông báo).
3. `GET /api/auth/config` thêm cờ `maintenance` (không lộ danh sách) để trang đăng nhập hiện banner "đang nâng cấp" ngay khi mở.
4. Giao diện: `web/api.ts` bắt 503 `maintenance` → màn hình thông báo toàn trang (không hiện lỗi thô, không xoá dữ liệu đang gõ khỏi bộ nhớ trang); service worker vẫn phục vụ khung từ cache (chấp nhận được vì API mới là nơi ép).
5. Chủ (được phép) dùng app **hoàn toàn bình thường**, có thể thêm một dải "Đang ở chế độ phát triển" nhỏ để khỏi quên tắt.
- Không đổi: Cron đồng bộ danh mục vẫn chạy; Turnstile vẫn áp dụng cho chủ; quyền/dữ liệu/nhật ký không bị đụng.

**Thi công (theo nhịp làm việc hiện tại, Phương án 1):** một hàm thuần `maintenanceGate(env, phone)` có test (bật/tắt, chuẩn hoá SĐT, danh sách nhiều số, cấu hình rỗng/lạ), nối vào login + `currentStaff`, kịch bản e2e (bật → nhân viên 503 ở login và ở API cũ bằng phiên đã có; chủ bình thường; tắt → trở lại), thêm `maintenance` vào `GET /api/auth/config` và màn hình thông báo + một kịch bản Chrome. Ước lượng ~1–1,5 giờ nếu chạy theo cách vừa rồi.

## 4. "Sau khi mọi người đăng nhập thành công" — làm sao biết
Ba cách, có thể kết hợp:
1. **Thêm `staff.last_login_at`** (migration nhỏ chỉ THÊM cột; cập nhật khi đăng nhập thành công; hiện cột "Đăng nhập gần nhất" ở trang `/staff`): chủ thấy ngay ai chưa đăng nhập bằng mã mới; đồng thời hữu ích lâu dài. **Khuyến nghị**, ~40 phút. Lưu ý: chỉ ghi thời điểm, không ghi SĐT vào nhật ký.
2. **Xoay `SESSION_SECRET`** để mọi người phải đăng nhập lại qua Turnstile (mục 2) — rồi dùng (1) để biết khi nào đủ 11 người. Làm vào giờ ít người dùng và báo trước.
3. **Xem log Worker** (`wrangler tail` hoặc trang Logs của Worker) — chỉ thấy theo thời gian thực/khoảng lưu, không có danh sách "ai đã xong".

## 5. Rủi ro và cách giảm
- **Tự khoá chính mình** (gõ sai SĐT trong danh sách): đường thoát là `wrangler secret delete DEV_MODE_ALLOW_PHONES` (chế độ tắt khi biến vắng), chạy được từ máy của chủ; kiểm SĐT bằng cách chuẩn hoá giống lúc đăng nhập (`normalizePhone`) và test.
- **Nhân viên đang nhập đơn khi bật**: form không lưu được → thông báo rõ; nên nhắn trước và bật vào giờ vắng. (Tuỳ chọn sau: đặt lịch "sẽ nâng cấp lúc HH:MM" hiện banner trước.)
- **Hoàn tác Worker/chế độ**: không đổi schema (Phương án 1) nên hoàn tác chỉ là xoá biến.
- **Không thay thế phân quyền**: chế độ này chặn cả app cho người khác; không cấp thêm quyền cho ai.
- **Tài khoản chủ không có mặt/không hoạt động** khi bật: kiểm trước (đã kiểm: tồn tại, hoạt động, ADMIN).

## 6. Việc cần chủ dự án quyết trước khi làm
1. Đúng là cách hiểu (B) — chặn mọi người trừ chủ — chứ không phải Development Mode của Cloudflare (cache) chứ?
2. Chặn cả **phiên đang mở** (khuyến nghị) hay chỉ chặn đăng nhập mới?
3. Danh sách được phép: chỉ `0989929373`, hay mọi ADMIN (hôm nay trùng nhau)?
4. Thông điệp hiển thị cho nhân viên.
5. Bật/tắt bằng lệnh (Phương án 1, làm nhanh) hay bằng nút trong app (Phương án 2)?
6. "Đóng phiên" nghĩa là đăng xuất TẤT CẢ ngay bây giờ (xoay `SESSION_SECRET`) hay chỉ kết thúc phiên làm việc này? Chưa làm gì cho tới khi có xác nhận (đăng xuất tất cả ảnh hưởng nhân viên đang làm việc).
7. Thêm `last_login_at` (mục 4.1) để biết khi nào "mọi người đã đăng nhập" — có làm không?
