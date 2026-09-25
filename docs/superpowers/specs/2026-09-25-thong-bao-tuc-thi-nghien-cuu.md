# Nghiên cứu: thông báo tức thì khi đơn đổi trạng thái ("bảng tin")

- **Ngày:** 2026-09-25. **Vai:** lập kế hoạch / nghiên cứu (không thi công).
- **Nguồn yêu cầu:** chủ dự án, phiên chat 2026-09-25, khi chốt ADR-0020: *"nếu hỏi liên tục thế thì quá nhiều request, ta phải thiết kế 1 cái hook để phần thông báo luôn lắng nghe mỗi khi có thay đổi trạng thái, hiện thông báo cập nhật trên toàn dashboard chung, nghiên cứu kỹ chỗ này."* Chủ đã loại phương án hỏi lại máy chủ theo chu kỳ.
- **Quyết định đi kèm:** bản nháp **ADR-0022** (`docs/adr/ADR-0022-bang-tin-thong-bao-tuc-thi.md`, proposed).
- **Trạng thái:** bản nghiên cứu, **chưa duyệt**. Chạm triển khai (thành phần hạ tầng mới), quyền (ai nhận tin về đơn nào), cấu hình Cloudflare → **việc lớn** (CLAUDE.md §3).

## 0. Bài toán, nói bằng lời thường

Khi một đơn đổi — có người **Nhận**, được **giao/đổi người phụ trách**, **xác nhận**, **huỷ**, sửa — mọi màn hình **đang mở** của người **được phép thấy đơn đó** phải biết ngay: hiện một dòng thông báo trên khung chung và tự làm mới phần dữ liệu liên quan. Không hỏi lại máy chủ theo chu kỳ.

**Ngoài phạm vi:** báo lên điện thoại khi app **đang đóng** (Web Push). Việc đó là giai đoạn 6 của mô hình vai (đặc tả `2026-09-24-mo-hinh-nguoi-vai-quyen-design.md:369`, ADR-0018 dòng 14/37) — thiết kế ở đây **để sẵn chỗ** cho nó nhưng không làm.

## 1. Hiện trạng (đã rà mã, nhánh `thong-bao-tuc-thi` = `origin/main` a1f6753)

- **8 route ghi làm đổi đơn / người phụ trách** — chỉ ở `orders` và `dispatch`, không module nào khác ghi `orders`/`dsp_assignment` (đã grep):

| Route | Chỗ trả thành công |
|---|---|
| `POST /api/orders` (lập) | `src/modules/orders/index.ts:199` |
| `PUT /api/orders/:id` (sửa nháp) | `orders/index.ts:241` |
| `PUT /api/orders/:id/trip` | `orders/index.ts:261` (nhánh "không đổi" `:254` không phát) |
| `PUT /api/orders/:id/booker` | `orders/index.ts:283` (nhánh "không đổi" `:277` không phát) |
| `POST /api/orders/:id/status` (xác nhận/huỷ) | `orders/index.ts:311` |
| `PUT /api/orders/:id/handler` (giao, đổi, **Nhận**) | `src/modules/dispatch/index.ts:120` |
| `POST /api/orders/:id/handler-cancel` | `dispatch/index.ts:142` |
| `POST /api/orders/:id/handler-money-edit` | `dispatch/index.ts:163` |

  Mọi hàm ghi trả `false` khi thua đua → phát sự kiện **chỉ** ở nhánh thành công là đủ.
- `Ctx` có `exec: ExecutionContext` (`src/shared/router.ts:14-42`, truyền ở `:157`) → `ctx.exec.waitUntil(...)` dùng được trong mọi route. Hàm tiêm qua gốc lắp ráp (`AppOptions.injected`, `router.ts:105-116`; `src/index.ts:19-29`) — cùng khuôn `isAssigned`.
- Xác thực: cookie `td_session` HMAC 7 ngày → `currentStaff` → `getActiveStaff` (kiểm `active`, `credentials_changed_at`) → cổng bảo trì (một truy vấn D1) → cổng quyền. **Chỉ chạy lúc có request**; một kết nối mở lâu không tự biết tài khoản bị ngưng/đổi PIN/bật bảo trì.
- Kiểm `Origin` chỉ áp POST/PUT/PATCH/DELETE (`router.ts:84-93`); bắt tay WebSocket là **GET** → phải tự kiểm `Origin`.
- Ai thấy đơn nào: `order.view` — SALES/ACCOUNTING/ADMIN/SUPER_ADMIN `any`; PARTNER/INTERN `own`; FIELD `none` hôm nay (ADR-0017 sẽ mở). Danh sách: `ownerId = can(order.view) ? null : staff.id` (`orders/index.ts:171`).
- Giao diện: `web/shell.ts` `initShell()` nạp ở **mọi** trang đăng nhập (13 trang) → chỗ đặt **một** bộ lắng nghe. Hàm làm mới: `web/orders.ts:78 load(reset)`, `web/order.ts:351 load()` + `loadHandler` `:73`; `web/home.ts` **chưa có** hàm làm mới riêng (gộp trong `main()` `:235`, phần dashboard `:256-262` phải tách). **Chưa có** thành phần thông báo nổi (toast); có `web/banner.ts` (`role=alert`) và dải bảo trì.
- Service worker `web/sw/sw.ts` chỉ `install/activate/fetch` — không `push`.
- CSP trang tĩnh: `connect-src 'self' https://challenges.cloudflare.com` (`public/_headers:7`).
- `wrangler.jsonc`: chưa có Durable Object; có cron `*/15`.

## 2. Các phương án

| # | Cách | Được | Mất | Kết luận |
|---|---|---|---|---|
| A | **Hỏi lại theo chu kỳ** (mỗi 30 giây) | đơn giản nhất | chủ đã loại: nhiều request vô ích, trễ tới 30 giây | **loại** (chủ) |
| B | **Máy chủ đẩy qua WebSocket, "trạm phát tin" là một Durable Object ngủ đông được** (Hibernation API) | tức thì; không tin thì trạm ngủ, **không tính thời gian chạy**; không thư viện ngoài; cùng Worker, cùng tên miền | thêm một thành phần hạ tầng (cửa một chiều mềm: cấu hình DO khó gỡ gọn); iPhone cắt kết nối khi app xuống nền → phải nối lại + tải lại | **khuyến nghị** |
| C | Server-Sent Events qua Durable Object | giao thức đơn giản hơn | kết nối SSE giữ trạm **thức** → tính thời gian chạy suốt ngày (~5.500 GB-s/ngày/trạm, suy luận — tài liệu không nói thẳng) | loại |
| D | Chỉ Web Push | báo được cả khi app đóng | phải cài ra màn hình chính + xin quyền; không phải cách làm mới màn hình đang mở; mỗi thông báo luôn hiện lên (iOS không có push im lặng) | để giai đoạn 6, **bổ sung** cho B |
| E | Dịch vụ ngoài (Pusher, Ably…) | có sẵn | dữ liệu ra bên thứ ba, thêm hợp đồng/khoá/bí mật, trái tinh thần "không dependency" | loại |

## 3. Thiết kế khuyến nghị (phương án B)

### 3.1 Tổng thể

```
Trình duyệt (web/shell.ts: bộ lắng nghe chung)
   │  GET /api/bang-tin  (Upgrade: websocket, cookie phiên)
   ▼
Worker (router): currentStaff → cổng bảo trì → kiểm Origin → tính "nhóm nhận" của người này
   │  chuyển yêu cầu nâng cấp kèm nhóm nhận (header nội bộ)
   ▼
Durable Object "BangTin" (một bản duy nhất, tên "cong-ty")
   acceptWebSocket(ws, tags = nhóm nhận)   ← ngủ đông khi không có tin

Route ghi (orders/dispatch) thành công
   └─ ctx.exec.waitUntil(ctx.baoThayDoi(sựKiện))   ← không làm chậm/không làm hỏng phản hồi
          └─ RPC BangTin.phat(sựKiện) → gửi cho các socket có tag khớp
```

- **Một trạm duy nhất** cho cả công ty là hợp lý ở quy mô này (30 nhân viên + ~1.000 đối tác, trạm chịu 32.768 kết nối, ~1.000 yêu cầu/giây). Luật chung "không dùng một DO toàn cục" nhắm tới tải lớn; ở đây tải nhỏ hơn giới hạn hàng trăm lần. Khi cần chia (nhiều công ty/chi nhánh) thì đổi tên trạm theo đơn vị, không đổi hợp đồng.
- **Module mới** `src/modules/bangtin/` (tên tạm, chủ đặt lại được): sở hữu lớp DO, route `GET /api/bang-tin`, hàm thuần tính nhóm nhận. **Không có bảng D1** (không migration). `orders`/`dispatch` **không import** module này: gốc lắp ráp tiêm `ctx.baoThayDoi` (cùng khuôn `isAssigned`), nên đồ thị phụ thuộc không thêm cạnh; `bangtin` chỉ cần `staff`/`auth`/`maintenance` qua `index.ts` (cập nhật `ALLOWED_EDGES`).

### 3.2 Sự kiện — nhỏ, không mang dữ liệu nhạy cảm

```json
{ "loai": "don", "orderId": "…", "maDon": "TD-…", "thayDoi": "tao|nhan|giao|xac_nhan|huy|sua|chuyen|tien", "luc": "ISO UTC" }
```

- **Không** mang tiền, SĐT, tên khách, tên người phụ trách. Màn hình nhận tin rồi **tự gọi lại API thường** (đã có kiểm quyền) để lấy dữ liệu mới. Vì vậy thiết kế này **không xây trên** hai lỗ đang hở `money.view`, `contact.view` (`docs/quyen-hoan.json`).
- `maDon` chỉ đi tới người đã thấy được đơn (lọc ở 3.3), dùng cho câu thông báo ("Đơn TD-0123 vừa có người nhận").

### 3.3 Ai nhận tin về đơn nào (phần chạm quyền)

Nhóm nhận của **kết nối** tính lúc bắt tay từ chính ô `order.view` (không đặt luật mới):

| Người | Tag của kết nối |
|---|---|
| `order.view = any` (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN; FIELD sau ADR-0017) | `tat-ca` |
| còn lại có tài khoản | `nguoi:<staffId>` |

Nhóm nhận của **sự kiện** tính lúc phát: `tat-ca` + `nguoi:<người lập>` + `nguoi:<người phụ trách cũ>` + `nguoi:<người phụ trách mới>`. Trạm gửi cho socket có ít nhất một tag khớp.

- Đối tác chỉ nhận tin về đơn **mình lập** — đúng `order.view = own`.
- Hướng dẫn viên hôm nay (`order.view = none`) chỉ nhận tin về đơn **mình phụ trách hoặc vừa bị đổi khỏi** — khớp `GET /api/dispatch/mine`. Khi ADR-0017 mở `order.view` cho FIELD, hàm tính tag tự cho FIELD vào `tat-ca`, **không sửa gì ở trạm**.
- Hàm tính tag là **hàm thuần** có test bảng (mọi vai × mọi ô), khoá bằng test đối chiếu với `MATRIX` để không lệch khi bản đồ quyền đổi.

### 3.4 An toàn của kết nối mở lâu

1. **Kiểm `Origin`** ở bắt tay (chống chiếm WebSocket từ trang khác — GET không qua `checkWriteRequest`).
2. **Hạn sống ngắn:** trạm đóng kết nối quá **15 phút** (kiểm ở mỗi lần phát và bằng alarm); trình duyệt tự nối lại → **xác thực lại từ đầu** (tài khoản ngưng, đổi PIN, bật bảo trì đều có hiệu lực trong ≤ 15 phút dù không làm gì thêm).
3. **Đóng ngay khi có biến cố tài khoản:** ngưng tài khoản / đổi PIN / gỡ quyền / bật bảo trì → gốc lắp ráp gọi `BangTin.dongCua(staffId | "tat-ca")`. (Bổ sung cho mục 2, không thay nó.)
4. **Không nhận lệnh từ trình duyệt:** trạm bỏ qua mọi tin gửi lên, trừ `ping` (trả tự động bằng `setWebSocketAutoResponse`, không đánh thức trạm).
5. Phát tin **không bao giờ** làm hỏng thao tác ghi: lỗi RPC chỉ ghi log (không ghi SĐT/email), phản hồi HTTP đã trả trước.
6. Nhật ký thao tác: **không** ghi mỗi lần kết nối (nhiều, vô ích); chỉ log vận hành.
7. **Bộ định tuyến không bọc lại phản hồi** (đã đọc `src/shared/router.ts:165-167`: trả nguyên `Response` của route, chỉ bắt lỗi) → phản hồi bắt tay 101 kèm `webSocket` đi thẳng ra, không bị mất. Nếu sau này thêm bước bọc phản hồi (thêm header chung…), route `/api/bang-tin` phải được **miễn**, vì dựng lại `new Response(body, res)` làm rơi `webSocket` và hỏng bắt tay — ghi thành bẫy trong `docs/CHANGE-GUIDE.md`.
8. **Danh tính gửi sang trạm:** Worker **dựng mới** tập header cho yêu cầu nội bộ tới Durable Object (chỉ header nâng cấp WebSocket cần thiết + tag đã tính ở máy chủ), **không bao giờ** chuyển tiếp header danh tính/tag do trình duyệt gửi lên; trạm chỉ tin tag đến từ Worker (DO không có đường vào từ Internet, chỉ qua binding).

### 3.5 Phía trình duyệt — "bộ lắng nghe" chung (`web/bangtin.ts`, gọi từ `initShell()`)

- Mở `wss://<cùng tên miền>/api/bang-tin`; nhận tin → phát `CustomEvent("don-thay-doi", {detail})` trên `window` + hiện **thông báo nổi** trên khung chung.
- **Nối lại:** khi đóng/lỗi → chờ tăng dần có ngẫu nhiên (1 → 30 giây); khi `visibilitychange` về hiện và khi `online` → đóng socket cũ, nối lại **và phát `"can-tai-lai"`** (có thể đã lỡ tin khi app ở nền — iPhone cắt kết nối khi khoá màn hình, có lúc socket vẫn báo "OPEN" giả).
- **Ping ứng dụng** mỗi ~50 giây, không có `pong` trong 10 giây → coi như chết, nối lại.
- **Không cần sổ phát lại** (không lưu tin đã lỡ): mọi lần nối lại đều tải lại dữ liệu đang xem → luôn đúng, trạm không phải lưu gì.
- **Gộp làm mới:** nhiều tin trong 1 giây → một lần tải lại.
- Trang dùng tin:
  - `/orders`: tải lại danh sách (giữ vị trí cuộn/bộ lọc).
  - `/order?id=X`: tin về đúng X → tải lại khối người phụ trách + trạng thái. **Đang sửa dở** thì **không** ghi đè: hiện dải "Đơn vừa được cập nhật — Tải lại".
  - `/home`: tải lại ba ô số + "Chưa phụ trách" (phải tách hàm làm mới khỏi `main()`).
  - `/account` ("Việc của tôi"): tải lại `dispatch/mine`.
- **Thông báo nổi** (thành phần giao diện mới, `web/`, dựng bằng `h()`, màu/khoảng cách qua token, `aria-live="polite"`, tự ẩn ~6 giây, bấm vào mở đơn). Câu mẫu: "Đơn TD-0123 vừa có người nhận", "Có đơn mới chưa có người phụ trách" (**chỉ** hiện cho người có ô `dispatch.claim` — người bấm Nhận được; Kế toán cũng có tag `tat-ca` nhưng không nhận đơn, với họ chỉ làm mới), "Đơn TD-0123 đã được xác nhận". Loại "sửa/chuyến/tiền" → **chỉ làm mới, không hiện** (tránh ồn) — xem câu hỏi Q-B.
- CSP: thêm rõ `wss://booking.tourdao.vn` vào `connect-src` (MDN khuyên liệt kê rõ; Safari cũ từng không coi `wss:` là `'self'`; chưa xác minh phiên bản Safari đã sửa). Local/LAN: `'self'` + dev script.

### 3.6 Chi phí (ước tính, chưa đo)

100 kết nối × 12 giờ/ngày, ~500 sự kiện/ngày, iPhone nối lại ~20 lần/kết nối/ngày: dưới ~10.000 yêu cầu/ngày. Gói Free: **0 đồng** (< 10% hạn mức 100.000/ngày của DO). Gói Paid: nằm trong phần có sẵn của gói $5. Tin gửi đi không tính tiền; trạm ngủ không tính thời gian chạy. **Chưa kiểm** tài khoản Cloudflare đang ở gói nào.

### 3.7 Triển khai và vận hành

- `wrangler.jsonc`: thêm `durable_objects.bindings` + `migrations: [{ tag: "v1", new_sqlite_classes: ["BangTin"] }]` (cấu hình DO, **khác** migration D1). Lớp DO export từ `src/index.ts`.
- **Mỗi lần `wrangler deploy` mọi kết nối bị ngắt** → trình duyệt tự nối lại và tải lại (đúng cơ chế 3.5). Không cần bước runbook riêng; ghi vào `docs/HANDOFF-N1.md`.
- Hoàn tác: gỡ route + bộ lắng nghe là app trở về như hôm nay (người dùng thấy thay đổi khi mở lại trang). Gỡ **lớp DO** khỏi cấu hình cần migration DO `deleted_classes` — đây là phần "khó gỡ gọn" duy nhất.
- `wrangler dev` local hỗ trợ WebSocket ngủ đông → e2e chạy được trên D1 tạm như các kịch bản khác.

### 3.8 Kiểm thử và hàng rào (đỏ trước, xanh sau)

- Unit: hàm tính tag (bảng vai × ô `order.view`, đối chiếu `MATRIX`); hàm tính nhóm nhận của sự kiện; hàm gộp làm mới + lịch nối lại (thuần).
- **Hàng rào "mọi đường ghi đều báo":** test liệt kê route ghi của `orders`/`dispatch` từ SNAPSHOT `src/route-access.test.ts` và bắt mỗi route gọi `ctx.baoThayDoi` ở nhánh thành công (hoặc nằm trong danh sách miễn có lý do). Phải **thấy nó chặn thật một lần** (xoá cố ý một lời gọi → đỏ → hoàn nguyên) rồi mới ghi vào `docs/SO-HANG-RAO.md`.
- E2E `tests/e2e/bangtin.mjs`: hai phiên văn phòng + một đối tác mở kết nối; văn phòng bấm Nhận → phiên văn phòng kia nhận tin trong < 2 giây; đối tác **không** nhận tin về đơn người khác; Origin lạ → từ chối; tài khoản bị ngưng → kết nối bị đóng; bảo trì bật → bắt tay 503.
- Chrome: hai tab (hai tài khoản — nhớ bẫy cookie dùng chung, CLAUDE.md §10) thấy thông báo nổi. **iPhone thật:** khoá màn hình 1 phút, mở lại → dữ liệu mới + nối lại (chỉ kiểm được bằng tay).
- Route mới vào SNAPSHOT `route-access.test.ts`; `ALLOWED_EDGES`, `STRICT` trong `architecture.test.ts`; `PAGES` không đổi (không có trang mới).

## 4. Thứ tự với các việc khác

- **Độc lập với ADR-0020 và làm trước được**: hôm nay đã có "Nhận"/"giao" cho văn phòng, xác nhận, huỷ — bảng tin có ích ngay. Không phụ thuộc ADR-0019/0017; khi hai cái đó lên, hàm tính tag tự theo `order.view`.
- **Bước ghép khi duyệt** (CLAUDE.md §9): nếu trình **ADR-0020 cùng ADR-0022** trong một lượt thì phải kèm trang ghép (2 quyết định có chạm quyền). Khuyến nghị: trình ADR-0022 **riêng**, trước.
- Web Push (giai đoạn 6) sau này dùng lại **cùng hàm tính nhóm nhận** và cùng điểm phát `ctx.baoThayDoi` — chỉ thêm một "đầu ra" nữa.

## 5. Giả định và điều chưa chắc

- Giả định: một trạm cho cả công ty đủ dùng nhiều năm (quy mô hiện tại ×100 vẫn dưới giới hạn).
- Chưa xác minh: gói Cloudflare đang dùng; tin nhận vào do trả-lời-tự-động xử lý có bị tính tiền không; phiên bản Safari đã coi `wss:` là `'self'`; hành vi thật trên iPhone của nhân viên (chỉ đo được bằng máy thật).
- Tên module/route/lớp (`bangtin`, `/api/bang-tin`, `BangTin`) là tên tạm.

## 6. Câu hỏi cho chủ (gom một lần)

- **Q-A — Duyệt hướng B** (trạm phát tin Durable Object + WebSocket) thay vì hỏi theo chu kỳ? Khuyến nghị: **duyệt**.
- **Q-B — Hiện thông báo nổi cho loại nào?** Khuyến nghị: *hiện* cho đơn mới chưa có người (chỉ với người bấm Nhận được), có người nhận/đổi người phụ trách, xác nhận, huỷ; *chỉ làm mới, không hiện* cho sửa nội dung/chuyến/tiền.
- **Q-C — Đối tác nhận gì?** ADR-0014 điều 12 (đã duyệt) chọn **chấm đếm trong app** để báo đối tác khi đơn của họ bị sửa/huỷ, không đẩy lên điện thoại. Khuyến nghị: bảng tin **chỉ làm mới màn hình + chấm đếm** của đối tác cho đơn của chính họ, **không** hiện thông báo nổi — giữ đúng cách điều 12 đã chọn. Muốn đối tác cũng thấy thông báo nổi thì là quyết định mới (sửa điều 12), không tự làm.
- **Q-D — Làm trước hay sau ADR-0020?** Khuyến nghị: **trước** (độc lập, có ích ngay, và khi ADR-0020 lên thì hướng dẫn viên thấy đơn mới tức thì).
