# Bảng tin — máy chủ báo mọi màn hình đang mở khi đơn đổi (ADR-0022) — Kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans, làm từng task theo thứ tự. Các bước dùng ô `- [ ]`. Đây là **việc lớn** (triển khai: thành phần hạ tầng mới trong cấu hình Worker; quyền: ai nhận tin về đơn nào) theo `CLAUDE.md` §3: người thi công KHÔNG tự nghiệm thu; Task 12 là người kiểm độc lập chỉ đọc. Trước khi viết mã Durable Object: nạp skill `durable-objects` và `wrangler`, đọc đúng các trang tài liệu ghi ở "Tài liệu Cloudflare đã đọc" — không viết theo trí nhớ.

**Mục tiêu:** khi một đơn đổi (lập, có người nhận, giao/đổi người phụ trách, xác nhận, huỷ, sửa nháp, sửa chuyến, đổi khách, sửa số khách/tiền), mọi màn hình **đang mở** của người **được thấy đơn đó** nhận tin trong vòng 2 giây, tự làm mới phần dữ liệu liên quan và (với một số loại) hiện thông báo nổi. Không hỏi máy chủ theo chu kỳ.

**Kiến trúc (tóm tắt ADR-0022):** một Durable Object `BangTin` (bản duy nhất tên `cong-ty`) giữ WebSocket ngủ đông; bắt tay `GET /api/bang-tin` qua router (phiên → cổng bảo trì) rồi thân route kiểm `Origin`, tính nhãn (tag) của kết nối từ bản đồ quyền và chuyển sang trạm; 8 route ghi của `orders`/`dispatch` gọi `ctx.baoThayDoi(...)` ở nhánh thành công, router bọc `waitUntil` + bắt lỗi; trình duyệt có một bộ lắng nghe chung nạp từ `web/shell.ts`, tự nối lại và tải lại dữ liệu đang xem mỗi lần nối lại. Không migration D1, không bảng mới.

**Không xây trên lỗ đang hở** (CLAUDE.md §3): sự kiện không mang tiền/liên hệ, dữ liệu lấy lại qua API có kiểm quyền → không dựa vào `money.view`, `contact.view` (hai mục đang hoãn trong `docs/quyen-hoan.json`). Hai ô bảng tin dựa vào — `order.view`, `dispatch.claim` — **không** có trong `thao_tac` của `docs/quyen-hoan.json` (đã `grep` ở `34b34cf`: các mục hoãn là `admin.manage`, `admin.manage.superadmin`, `money.view`, `contact.view`, `task.progress`, `dispatch.guides.view`, `dispatch.request`, bốn mục N3).

**Quyết định gốc:** `docs/adr/ADR-0022-bang-tin-thong-bao-tuc-thi.md` (**accepted** 2026-09-25, kèm Q-A…Q-D). Nghiên cứu: `docs/superpowers/specs/2026-09-25-thong-bao-tuc-thi-nghien-cuu.md`. Q-D: làm **trước** ADR-0020.

**Mã tham chiếu:** mọi số dòng trong kế hoạch này đọc ở commit `34b34cf` (nhánh `thong-bao-tuc-thi`). Nghiên cứu ghi số dòng ở `a1f6753` — lệch 1–3 dòng (ví dụ `POST /api/orders` trả thành công ở `orders/index.ts:200`, không phải `:199`). Người thi công đọc lại trước khi sửa.

**Nhánh thi công:** worktree mới từ `origin/main` mới nhất (gợi ý `bang-tin`), không dùng nhánh kế hoạch này.


> **Chủ dự án đã duyệt (phiên chat 2026-09-25, câu 8b của đặc tả Hoàn tất):** thêm vào luật kiến trúc một loại module mới **"không dùng cơ sở dữ liệu"** (tên đề xuất `KHONG_DB`, chặt hơn `STRICT`: không bảng, không SQL, không `.prepare`) cho module Bảng tin. Người thi công sửa `docs/ARCHITECTURE.md` + `src/architecture.test.ts` theo đúng nghĩa đó (có hiệu lực vì chủ đã duyệt — N9), và phải thấy test mới chặn thật một lần (P16).

## Ràng buộc chung

- Tiếng Việt có dấu ở giao diện, thông báo, tài liệu, commit; không lộ mã thô (`xac_nhan`, `FIELD`…) ra người dùng.
- **Sự kiện chỉ gồm đúng những gì ADR-0022 điều 4 cho phép:** `{ loai: "don", orderId, maDon, thayDoi, luc }`. `maDon` = `orders.order_code` (có thật: `src/shared/contracts.ts:174`, `web/account.ts:417`). **Không** thêm id người làm, id người phụ trách, tiền, SĐT, tên khách, tên người. Mọi thông tin phụ (vd "đơn chưa có người") mã hoá bằng **giá trị của `thayDoi`**, không bằng trường mới. Thêm trường = đổi ADR, phải hỏi chủ.
- Ranh giới module: `orders`/`dispatch` **không** import module bảng tin (chỉ gọi `ctx.baoThayDoi`); `src/shared/` và `web/` không import `src/modules/`; module bảng tin không import module khác.
- Không `innerHTML`; dựng DOM bằng `h()`; giá trị CSS qua token `:root` của `public/app.css` (khối sau mốc PWA chỉ token); ô gõ 16px (không có ô gõ mới).
- Nhật ký (log vận hành) **không** ghi SĐT/email/MST; không ghi `audit_log` cho mỗi lần kết nối.
- TDD: mỗi hành vi mới có test **đỏ trước, xanh sau**; chép dòng đỏ vào nhật ký thi công `docs/superpowers/plans/2026-09-25-bang-tin-thi-cong-nhat-ky.md` (tạo ở Task 0). Mỗi cơ chế chặn mới phải **thấy chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và có dòng ở `docs/SO-HANG-RAO.md` (P16, luật sổ hàng rào).
- AI **không** push, không merge `main`, không deploy, không chạy gì `--remote`, không `wrangler rollback`. Commit nhỏ, tiêu đề nói việc, thân nói vì sao, dòng cuối `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Lỗi phát tin **không bao giờ** làm hỏng hay làm chậm thao tác ghi: route không `await` việc phát; router bọc `exec.waitUntil(...)` + `.catch(log)`.

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

**Chung:** `npm test` xanh; `npm run typecheck` 0 lỗi (ba tsconfig); `npm run test:e2e` đủ bộ xanh (cần mạng) kể cả kịch bản mới `bangtin` và đuôi `audit-invariants --strict`; `node --test "tests/audit/*.test.mjs"` xanh (không nằm trong `npm test`, phải tự chạy); người kiểm độc lập chỉ đọc (Task 12) báo đạt.

**Máy chủ — bắt tay:**
- BT-1. `GET /api/bang-tin` có `Upgrade: websocket`, cookie hợp lệ, `Origin` đúng origin của app → **101** và nhận được khung chữ; không cookie → **401** (router); `Origin` lạ hoặc vắng → **403** `cross_origin`, không mở kết nối; thiếu `Upgrade: websocket` → **426**; chế độ bảo trì đang bật và tài khoản không trong danh sách được phép → **503** (cổng bảo trì của router, `router.ts:147-148`).
- BT-2. Worker **dựng mới** tập header gửi sang trạm (chỉ `Upgrade` + nhãn đã tính ở máy chủ + id người); header `x-bang-tin-*` do trình duyệt gửi lên **bị bỏ qua** (e2e gửi nhãn giả `tat-ca` từ tài khoản Đối tác → vẫn không nhận tin về đơn người khác).
- BT-3. Trạm bỏ qua mọi tin trình duyệt gửi lên; chuỗi `ping` được trả `pong` tự động (không đánh thức trạm).

**Máy chủ — ai nhận tin (phần chạm quyền):**
- NT-1. Nhãn của một kết nối = `nguoi:<staffId>` (luôn có) + `tat-ca` nếu `can(staff, "order.view")` không ngữ cảnh là `true` (ô `any`) + `cho-nhan` nếu `can(staff, "dispatch.claim")` là `true`. Không có luật quyền nào viết tay ngoài hai lời gọi `can()` này.
- NT-2. Nhãn của một sự kiện = `tat-ca` + `nguoi:<người lập>` + `nguoi:<người phụ trách trước thay đổi>` (nếu có) + `nguoi:<người phụ trách sau thay đổi>` (nếu có) + `cho-nhan` **khi và chỉ khi** đơn không có dòng người phụ trách đang mở sau thay đổi (`coNguoiSau = false`). **Chú ý:** người phụ trách có thể là hồ sơ **không có tài khoản** (`HandlerRow.staff_id: string | null`, `src/modules/dispatch/repository.ts:13-14`) — khi đó đơn **có** người (không gắn `cho-nhan`) nhưng không có nhãn `nguoi:` cho người đó. Trạm gửi cho socket có ít nhất một nhãn khớp, mỗi socket nhiều nhất một lần.
- NT-3. **Hôm nay** (bản đồ quyền ở `34b34cf`) nhãn `cho-nhan` **không thêm người nhận nào**: bài kiểm thuần khẳng định mọi mã quyền có ô `dispatch.claim ≠ none` đều có ô `order.view = any`. Khi quyết định (5) của chủ hoặc Phần D của GĐ2 đổi điều đó, bài kiểm này **đỏ có chủ đích** và buộc hỏi chủ.
- NT-4 (e2e). Hai phiên văn phòng (Bán hàng A, Bán hàng B) và một phiên Kế toán mở kết nối; A lập đơn / B bấm Nhận / A xác nhận → mọi phiên văn phòng nhận đúng một tin mỗi thao tác trong < 2 giây. Một phiên Đối tác **không** nhận tin về đơn của người khác, **có** nhận tin về đơn mình lập. Một phiên Hướng dẫn viên (`order.view = none`) chỉ nhận tin về đơn mình đang/vừa phụ trách.

**Máy chủ — điểm phát:**
- DP-1. Mỗi route trong bảng dưới gọi `ctx.baoThayDoi` **đúng một lần** ở nhánh thành công và **không** gọi ở mọi nhánh lỗi (400/403/404/409) và nhánh "không đổi gì":

| Route | Module:dòng trả thành công (`34b34cf`) | `thayDoi` |
|---|---|---|
| `POST /api/orders` | `orders/index.ts:200` | `tao` hoặc `tao_cho_nhan` (đơn không có người phụ trách sau khi lập) |
| `PUT /api/orders/:id` | `orders/index.ts:240` | `sua` |
| `PUT /api/orders/:id/trip` | `orders/index.ts:260` (nhánh không đổi `:255` KHÔNG phát) | `chuyen` |
| `PUT /api/orders/:id/booker` | `orders/index.ts:283` (nhánh không đổi `:278` KHÔNG phát) | `sua` |
| `POST /api/orders/:id/status` | `orders/index.ts:314` | `xac_nhan` hoặc `huy` |
| `PUT /api/orders/:id/handler` | `dispatch/index.ts:120` | `nhan` (người gọi tự đặt mình vào đơn chưa có người) hoặc `giao` |
| `POST /api/orders/:id/handler-cancel` | `dispatch/index.ts:140` | `huy` |
| `POST /api/orders/:id/handler-money-edit` | `dispatch/index.ts:164` | `tien` |

- DP-2. Hàng rào mới `src/bang-tin-guard.test.ts`: mọi route `POST|PUT|PATCH|DELETE` có đường dẫn bắt đầu `/api/orders` khai ở `src/modules/orders/index.ts` hoặc `src/modules/dispatch/index.ts` phải có lời gọi `baoThayDoi(` trong thân handler, **đứng sau lời `return` lỗi cuối cùng và trước lời `return` cuối cùng** của thân; hoặc có mặt trong danh sách miễn (hiện rỗng) kèm lý do. Số route bóc được = số `route(` ghi của hai tệp. **Thấy chặn thật**: xoá lời gọi ở `POST /api/orders/:id/handler-cancel` → đỏ nêu đúng route → hoàn nguyên → xanh. Có dòng ở `docs/SO-HANG-RAO.md`.
- DP-3. Trạm không có binding (khung `tests/audit/harness.mjs`, `router.test.ts`) → `baoThayDoi` là no-op, không ném lỗi; phát tin ném lỗi → phản hồi HTTP vẫn 2xx như cũ, log một dòng `bang_tin_loi` (chỉ mã lỗi, không dữ liệu cá nhân) — test ở `router.test.ts`.

**Máy chủ — kết nối mở lâu:**
- KN-1. Trạm đóng kết nối quá hạn sống (mặc định **900 giây**; biến `BANG_TIN_HAN_GIAY` chỉ để e2e rút ngắn) với mã đóng `4001`, ở mỗi lần phát và bằng alarm.
- KN-2. Ngưng tài khoản, đổi SĐT đăng nhập, đổi quyền, đổi vai, đặt lại/đổi PIN, gỡ Face ID (mọi route ghi `touchCredentialsStatement`/`setPinStatement`/`setPermissionStatements` hoặc bật/tắt `active`) → các kết nối có nhãn `nguoi:<id đó>` bị đóng mã `4003` trong < 2 giây. Bật chế độ bảo trì → **mọi** kết nối bị đóng; kết nối lại của người không được phép nhận 503.

**Trình duyệt:**
- TD-1. Mọi trang đăng nhập (gọi `initShell()`) mở đúng một kết nối; tin đến → phát `CustomEvent("don-thay-doi")` trên `window`; nhiều tin trong 1 giây → một lần làm mới.
- TD-2. Nối lại tự động khi đóng/lỗi: chờ tăng dần có ngẫu nhiên 1 → 30 giây; khi trang hiện lại (`visibilitychange`) hoặc có mạng lại (`online`) → đóng socket cũ, nối lại ngay; **mỗi lần nối lại thành công** phát `CustomEvent("can-tai-lai")`; ping `ping` mỗi 50 giây, không có `pong` trong 10 giây → coi như chết, nối lại.
- TD-3. Làm mới: `/orders` tải lại danh sách giữ bộ lọc/ô tìm; `/order?id=X` tin về X (hoặc `can-tai-lai`) → tải lại đơn + khối người phụ trách, **trừ khi** đang mở một bảng sửa (`.sheet[role=dialog]` còn trong DOM) hoặc hộp xác nhận → chỉ hiện dải "Đơn vừa được cập nhật — Tải lại"; `/` (Trang chủ) tải lại ba ô số + "Chưa phụ trách" + danh sách hôm nay; `/account` tải lại "Việc của tôi"; `/order-form` **không bao giờ** tự tải lại (chỉ dải báo nếu đang sửa đúng đơn đó).
- TD-4. Thông báo nổi (Q-B): hiện cho `tao_cho_nhan` (chỉ người có `dispatch.claim`), `nhan`, `giao`, `xac_nhan`, `huy`; **không** hiện cho `tao`, `sua`, `chuyen`, `tien`; **không bao giờ** hiện cho tài khoản không phải văn phòng và không phải Hướng dẫn viên (Đối tác, Thực tập — Q-C); không hiện cho thao tác do chính tab này vừa làm (đơn này, ≤ 5 giây). `aria-live="polite"`, tự ẩn sau ~6 giây, bấm vào mở `/order?id=X` (văn phòng) hoặc `/account` (Hướng dẫn viên — hôm nay họ không mở được `/order`). Câu có mã đơn: "Đơn TD… vừa có người nhận".
- TD-5. CSP `public/_headers:7` có `wss://booking.tourdao.vn` trong `connect-src`; kịch bản Chrome `v1-dang-nhap.mjs` vẫn xanh (web/CLAUDE.md: sửa CSP → chạy kịch bản này).
- TD-6. Chrome hai tài khoản chạy **đồng thời** (hai ngữ cảnh trình duyệt tách kho cookie): B bấm Nhận → màn hình của A hiện thông báo nổi và danh sách/Trang chủ tự đổi trong < 2 giây, không bấm tải lại. Ảnh 390px + 1040px.
- TD-7. iPhone thật (danh sách tay Task 13): khoá màn hình ≥ 1 phút, mở lại → dữ liệu mới, không phải tải tay.

## Tài liệu Cloudflare đã đọc (người lập kế hoạch, 2026-09-25) — người thi công đọc lại

| Điều | Nguồn | Kết luận dùng trong kế hoạch |
|---|---|---|
| Lớp ngủ đông phải `extends DurableObject` từ `cloudflare:workers` | https://developers.cloudflare.com/durable-objects/best-practices/websockets/ | Lớp DO **phải** import `cloudflare:workers` → không được nằm trong tệp mà `node --test`/esbuild `platform: "neutral"` nạp (xem Xung đột b) |
| `serializeAttachment` tối đa 16.384 byte | cùng trang | Chỉ gắn `{ staffId, hetHan }` |
| Cờ `web_socket_auto_reply_to_close` (ngày tương thích ≥ 2026-04-07; dự án `2026-09-01`) | cùng trang | Runtime tự trả lời khung Close; gọi `close()` vẫn an toàn |
| **Mỗi lần deploy ngắt mọi WebSocket** | cùng trang | Bình thường; trình duyệt tự nối lại (TD-2) |
| Giới hạn số nhãn/độ dài nhãn mỗi socket | **chưa tìm thấy** ở trang trên | Người thi công tra trang API `DurableObjectState.acceptWebSocket` (https://developers.cloudflare.com/durable-objects/api/state/) — thiết kế dùng ≤ 3 nhãn, ≤ 50 ký tự |
| `setWebSocketAutoResponse`, alarm | https://developers.cloudflare.com/durable-objects/api/state/ , https://developers.cloudflare.com/durable-objects/api/alarms/ | **chưa đọc** — đọc trước Task 4 |
| **Không `wrangler rollback` được về bản trước khi có migration DO** | https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/ ("A Durable Object class lifecycle change … has occurred between the version in the active deployment and the version selected to roll back to") | Mốc lùi trong `docs/HANDOFF-N1.md` phải đổi: lùi = deploy bản **tắt** bảng tin (giữ lớp DO + migration), không phải rollback (Task 14) |
| `new_sqlite_classes` là kiểu khuyến nghị cho lớp mới (bắt buộc với gói Free) | skill `durable-objects` | Dùng `new_sqlite_classes: ["BangTin"]` |

## Xung đột / điều chưa chắc phát hiện khi đọc mã (người lập kế hoạch đã chọn cách; người duyệt lưu ý)

- **(a) Module mới không vừa STRICT lẫn LEGACY.** `STRICT` đòi module có câu SQL đăng ký (`src/architecture.test.ts:315-316`); `LEGACY` là danh sách ngoại lệ **có hạn** cho module cũ (`:48-54`, bài kiểm `:412-416`). Module bảng tin không có SQL. **Chọn:** thêm hạng mới `KHONG_DB = ["bangtin"]` — **chặt hơn** STRICT: không tệp nào trong module được nhắc `env.DB`, `.prepare(`, `.batch(`, `.exec(` của D1 (bài kiểm mới). Đây là sửa hàng rào theo chiều **siết** (Điều 9.4) — có bước thấy chặn thật + dòng sổ hàng rào (Task 4). `docs/ARCHITECTURE.md` (tài liệu chuẩn tắc) phải được **đề xuất** thêm hạng này — AI không tự sửa luật; ghi ở "Việc của chủ".
- **(b) Lớp DO phải import `cloudflare:workers`, mà nhiều bài kiểm nạp mã bằng esbuild `platform: "neutral"` không có `external`:** `src/route-access.test.ts:32-42` gói từng `index.ts` module; `tests/audit/harness.mjs:18-20` gói **cả** `src/index.ts` (dùng trong `npm test` qua `src/modules/parties/ho-so-co-tai-khoan.test.ts`). **Chọn:** lớp DO ở tệp riêng `src/modules/bangtin/tram.ts`; `src/modules/bangtin/index.ts` **không** import `tram.ts`; `src/index.ts` (đúng như ADR "Hệ quả") `export { BangTin } from "./modules/bangtin/tram"`; `tests/audit/harness.mjs` thêm plugin esbuild giải `cloudflare:workers` sang tệp giả `tests/audit/cloudflare-workers-gia.mjs` (`export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }`). Gốc lắp ráp import một tệp không phải `index.ts` của module — vùng xám so với ARCHITECTURE luật 1 (luật viết cho "module khác"); ghi ngoại lệ đích danh bằng bài kiểm (Task 4 bước 6). **Phương án dự phòng** nếu chủ không chấp nhận: đổi `main` của `wrangler.jsonc` sang `src/worker.ts` (chỉ `export default app` + `export { BangTin }`), giữ `src/index.ts` sạch cho khung thử — phải đổi `mainModule` trong `worker-configuration.d.ts`, lệch câu chữ "Hệ quả" của ADR.
- **(c) "Chấm đếm" của Đối tác (ADR-0014 điều 12) chưa có trong mã** (không có route/bảng "đơn có thay đổi chưa xem"; `grep -rn "unseen\|chưa xem" src web` chỉ ra Góp ý/Trợ giúp). ADR-0022/Q-C nói bảng tin "làm mới màn hình + chấm đếm" cho Đối tác — kế hoạch này **chỉ làm mới màn hình**, **không** xây chấm đếm (việc của ADR-0014 điều 12, cần bảng + migration riêng). Cần chủ biết.
- **(d) Chồng lấn với kế hoạch GĐ2** (`docs/superpowers/plans/2026-09-25-gd2-thi-cong.md`): cả hai sửa `src/shared/router.ts` (GĐ2 B2: cổng đọc danh sách; ở đây: `Ctx`/`injected`), `src/route-access.test.ts` (SNAPSHOT), vùng hàng rào (GĐ2 B7 mở rộng hàng rào 2 sang route đọc sau cổng `office`/`orders`/`admin`). `GET /api/bang-tin` khai cổng **`staff`** (mọi tài khoản đăng nhập — Đối tác, Hướng dẫn viên cũng cần tin về đơn của mình; phạm vi do nhãn quyết, không do cổng) nên **không** thuộc diện B7; không có ô `MATRIX` riêng cho "được nghe bảng tin" (ADR điều 3: không đặt luật quyền mới). Nhánh nào gộp sau thì rebase và chạy lại toàn bộ kiểm. GĐ2 Phần C/D (Hướng dẫn viên `order.view = any`, `dispatch.claim = any`) sẽ làm NT-3 đỏ có chủ đích.
- **(e) Số dòng của nghiên cứu lệch 1–3** so với `34b34cf` (xem bảng DP-1).
- **(f) Hạn sống 15 phút đo bằng e2e** cần rút ngắn: thêm biến `BANG_TIN_HAN_GIAY` (không phải bí mật, vắng = 900). Giả định bề mặt, đảo ngược được — ghi ở đây, không hỏi.
- **(g) WebSocket trong e2e (Node 22):** chưa xác minh `new WebSocket(url, { headers })` của Node có gửi được `Cookie`/`Origin` tuỳ ý. Task 7 bước 1 thử trước; không được thì dùng `node:http` `request` + sự kiện `upgrade` + bộ đọc khung tối giản (khung chữ, độ dài 7 bit và 16 bit, không mặt nạ từ máy chủ).

## Phụ thuộc quyết định chủ về (5)

Chủ đang quyết lại Hướng dẫn viên (`FIELD`) được thấy gì (có thể "chỉ đơn chưa có người nhận + đơn mình phụ trách"). Vì vậy **hàm tính nhãn không viết cứng theo vai**: nó chỉ hỏi `can(staff, "order.view")` và `can(staff, "dispatch.claim")` trên `MATRIX` hiện hành. Hệ quả theo từng khả năng:

| Chủ quyết (5) | Đổi ở `MATRIX` (việc của GĐ2/kế hoạch khác) | Hướng dẫn viên nhận tin | Sửa ở bảng tin |
|---|---|---|---|
| Giữ như hôm nay | không | đơn mình đang/vừa phụ trách (`nguoi:`) | không |
| ADR-0017 nguyên văn (xem mọi đơn) | `order.view` FIELD = `any` | mọi đơn (`tat-ca`) | không; NT-3 vẫn xanh nếu kèm `dispatch.claim` |
| "Chỉ đơn chưa có người + đơn mình phụ trách" | `dispatch.claim` FIELD = `any`, `order.view` FIELD ≠ `any` | đơn chưa có người (`cho-nhan`) + đơn mình (`nguoi:`) | không; **NT-3 đỏ có chủ đích** → chủ xác nhận rồi sửa bài kiểm thành khẳng định mới |

Task 1 và bài kiểm NT-3 được đánh dấu **"phụ thuộc quyết định chủ về (5)"**. Nếu (5) được quyết trước khi thi công Task 1: áp luôn, ghi vào nhật ký, không hỏi lại.

## Sơ đồ tệp

| Tệp | Việc | Task |
|---|---|---|
| `src/shared/bang-tin.ts` (mới) + `bang-tin.test.ts` | kiểu sự kiện, `THAY_DOI`, `nhanKetNoi`, `nhanSuKien`, `thayDoiCuaHandler`; lịch nối lại, gộp làm mới, quyết định thông báo nổi + câu chữ | 1, 2 |
| `src/shared/router.ts`, `router.test.ts` | `Ctx.baoThayDoi`, `Ctx.dongBangTin`; `AppOptions.injected` thêm hai hàm; router bọc `waitUntil` + bắt lỗi | 3 |
| `src/modules/bangtin/index.ts`, `rules.ts`, `rules.test.ts`, `tram.ts` (mới) | route bắt tay, hàm phát/đóng gọi trạm, lớp DO | 4 |
| `src/architecture.test.ts` | `ALLOWED_EDGES.bangtin = []`, hạng `KHONG_DB`, bài kiểm "chỉ `src/index.ts` import `tram.ts`; `index.ts` của module không import `cloudflare:workers`" | 4 |
| `src/route-access.test.ts` | thêm module bangtin vào `MODULES` (`:46-58`), thêm dòng `GET /api/bang-tin` `staff` vào SNAPSHOT (`:85-…`), sửa chú thích đếm | 4 |
| `src/index.ts` | `export { BangTin }`, tiêm `baoThayDoi`, `dongBangTin`; thêm `bangtinModule` vào `modules` | 4 |
| `src/modules/orders/index.ts` | export `findOrderRef(db, id)` → `{ staffId, orderCode }`; 5 route gọi `ctx.baoThayDoi` | 4, 5 |
| `src/modules/dispatch/index.ts` | export `handlerOf(db, orderId)`; 3 route gọi `ctx.baoThayDoi` | 4, 5 |
| `src/bang-tin-guard.test.ts` (mới) | hàng rào "mọi đường ghi đơn đều báo" | 5 |
| `src/modules/accounts/index.ts`, `src/modules/maintenance/index.ts` | gọi `ctx.dongBangTin` | 6 |
| `wrangler.jsonc`, `worker-configuration.d.ts` | binding `BANG_TIN`, `migrations` DO, (không đổi `vars` production) | 4 |
| `tests/audit/harness.mjs`, `tests/audit/cloudflare-workers-gia.mjs` (mới), `tests/audit/README.md` | plugin esbuild giải `cloudflare:workers` | 4 |
| `tests/e2e/bangtin.mjs` (mới), `tests/e2e/lib.mjs` (hàm `moBangTin`), `tests/e2e/run.mjs` (`ALL`, `--var BANG_TIN_HAN_GIAY:20`), `tests/e2e/README.md` | e2e | 7 |
| `web/bangtin.ts`, `web/toast.ts` (mới), `web/shell.ts`, `web/api.ts`, `public/app.css` | bộ lắng nghe, thông báo nổi, ghi "thao tác của tab này" | 8 |
| `public/_headers` | CSP `connect-src` | 8 |
| `web/orders.ts`, `web/order.ts`, `web/home.ts`, `web/account.ts`, `web/order-form.ts` | dùng tin để làm mới | 9 |
| `docs/evidence/2026-09-25-bang-tin/kich-ban/bang-tin-smoke.mjs` (mới) | Chrome hai tài khoản đồng thời | 10 |
| `docs/SYSTEM-DESIGN.md` (§2–§4, §7, §11), `docs/CHANGE-GUIDE.md` (công thức mới + §3 + §4 bẫy), `docs/HANDOFF-N1.md`, `docs/SO-HANG-RAO.md`, `web/CLAUDE.md` (**đề xuất** hàng bảng Chrome — tệp luật, chủ duyệt), `src/shared/changelog.ts`, nhật ký thi công | tài liệu | 11 |

---

### Task 0: Điều kiện trước

- [ ] **Bước 1:** Trên `origin/main` mới nhất: ADR-0022 **accepted** (dòng Trạng thái). Tạo worktree `bang-tin` từ đó. Nếu GĐ2 (bất kỳ phần nào) đã gộp `main` sau `34b34cf`: đọc lại `src/shared/router.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/shared/permissions.ts` và ghi vào nhật ký số dòng mới + ô `order.view`/`dispatch.claim` của `FIELD` hiện hành.
- [ ] **Bước 2:** Hỏi (qua điều phối viên, gom một lần) xem chủ đã quyết (5) chưa; **không chờ** — Task 1 viết theo bảng "Phụ thuộc quyết định chủ về (5)", chỉ bài kiểm NT-3 phụ thuộc.
- [ ] **Bước 3:** Nạp skill `durable-objects`, `wrangler`; đọc các trang ở "Tài liệu Cloudflare đã đọc", đặc biệt `api/state` (giới hạn nhãn, `setWebSocketAutoResponse`, `getWebSockets(tag)`) và `api/alarms`. Ghi URL + điều rút ra vào nhật ký.
- [ ] **Bước 4:** Tạo nhật ký thi công `docs/superpowers/plans/2026-09-25-bang-tin-thi-cong-nhat-ky.md` (mốc `origin/main`, số test ban đầu của `npm test`, kết quả `npm run typecheck`).
- [ ] **Bước 5:** `.dev.vars` có đủ tên bí mật (`SESSION_SECRET`, `TURNSTILE_SECRET_KEY`…) trước khi chạy `npm run types` (bẫy công thức l của `docs/CHANGE-GUIDE.md`); nếu không, Task 4 khai tay binding trong `worker-configuration.d.ts`.

### Task 1: Hàm thuần tính nhãn — **phụ thuộc quyết định chủ về (5)**

**Tệp:** `src/shared/bang-tin.ts`, `src/shared/bang-tin.test.ts` (import kèm đuôi `.ts`; chỉ cú pháp TS "xoá được" — không `enum`, không tham số thuộc tính).

- [ ] **Bước 1 (đỏ):** viết test:
  - `THAY_DOI` = đúng 9 giá trị `tao`, `tao_cho_nhan`, `nhan`, `giao`, `xac_nhan`, `huy`, `sua`, `chuyen`, `tien`.
  - `nhanKetNoi(staff)` với **mọi tập con** của 7 mã quyền (128 tập): kết quả = `["nguoi:"+id]` ∪ (`can(staff,"order.view")` ? `["tat-ca"]`) ∪ (`can(staff,"dispatch.claim")` ? `["cho-nhan"]`) — **suy từ `MATRIX`**, không chép tay.
  - Bảng ảnh chụp hôm nay (chép tay, để thấy khi `MATRIX` đổi): SALES/ADMIN/SUPER_ADMIN → `nguoi`, `tat-ca`, `cho-nhan`; ACCOUNTING → `nguoi`, `tat-ca`; FIELD, PARTNER, INTERN → chỉ `nguoi`.
  - **NT-3:** với mọi mã `p`, `MATRIX["dispatch.claim"][p] !== "none"` ⇒ `MATRIX["order.view"][p] === "any"`. Thông báo đỏ: "Nhãn cho-nhan nay thêm người nhận ngoài order.view — quyết định (5)/GĐ2 Phần D: hỏi chủ trước khi sửa bài kiểm này".
  - `nhanSuKien({ ownerId, handlerTruoc, handlerSau })` với `handlerTruoc`/`handlerSau` kiểu `{ coNguoi: boolean; staffId: string | null }`: luôn có `tat-ca`, `nguoi:owner`; có `nguoi:<staffId>` khi `staffId` khác null; `cho-nhan` khi và chỉ khi `!handlerSau.coNguoi` (ca riêng: có người nhưng hồ sơ không tài khoản → **không** `cho-nhan`, không nhãn `nguoi:`); không trùng lặp (owner = handler → một nhãn).
  - `thayDoiCuaHandler({ nguoiGoi, handlerTruoc, handlerSau })` → `nhan` khi `!handlerTruoc.coNguoi && handlerSau.staffId === nguoiGoi`, còn lại `giao`.
  - Chạy `node --test src/shared/bang-tin.test.ts` → đỏ (tệp chưa có). Chép dòng đỏ vào nhật ký.
- [ ] **Bước 2 (xanh):** viết `src/shared/bang-tin.ts` (import `can`, `PERMISSION_CODES`, `MATRIX` từ `./permissions.ts`). Không dữ liệu nào ngoài id. Chạy lại → xanh; `npm test`; `npm run typecheck`.
- [ ] **Bước 3 (thấy chặn thật NT-3):** tạm đặt `dispatch.claim` của `FIELD` = `any` trong `permissions.ts` → bài kiểm NT-3 đỏ đúng thông báo → hoàn nguyên (`git diff --quiet src/shared/permissions.ts`) → xanh. Ghi vào nhật ký (dòng sổ hàng rào viết ở Task 11).
- [ ] **Bước 4:** commit "Bảng tin: hàm thuần tính nhãn kết nối và sự kiện".

### Task 2: Hàm thuần phía trình duyệt

**Tệp:** `src/shared/bang-tin.ts` (thêm), `src/shared/bang-tin.test.ts`.

- [ ] **Bước 1 (đỏ):** test cho:
  - `choNoiLai(lan, ngauNhien)` → mili giây: lần 0 ∈ [1000, 2000), tăng gấp đôi, trần 30000 (+ ngẫu nhiên ≤ 20%, không vượt 36000); `ngauNhien` truyền vào để test tất định.
  - `thongBaoNoi(staff, suKien)` → `null` hoặc `{ cau, lienKet }`: đúng bảng TD-4 (Q-B, Q-C). Người văn phòng = `isOffice(staff)`; Hướng dẫn viên = `hasPermission(staff, "FIELD") && !isOffice(staff)` → liên kết `/account`; Đối tác/Thực tập (không văn phòng, không FIELD) → luôn `null`; `tao_cho_nhan` chỉ khi `can(staff, "dispatch.claim")`. Câu (có mã đơn): `tao_cho_nhan` "Có đơn mới chưa có người phụ trách: {maDon}"; `nhan` "Đơn {maDon} vừa có người nhận"; `giao` "Đơn {maDon} vừa đổi người phụ trách"; `xac_nhan` "Đơn {maDon} đã được xác nhận"; `huy` "Đơn {maDon} đã bị huỷ". Không chuỗi nào chứa mã thô (`xac_nhan`, `FIELD`…).
  - `laSuKienHopLe(x)`: chỉ nhận đúng 5 khoá của ADR điều 4 và `thayDoi ∈ THAY_DOI`; khoá thừa → `false` (trình duyệt bỏ qua tin lạ).
- [ ] **Bước 2 (xanh):** viết mã; `node --test src/shared/bang-tin.test.ts`; `npm run typecheck` (gồm `tsc -p web`).
- [ ] **Bước 3:** commit.

### Task 3: Router — `ctx.baoThayDoi`, `ctx.dongBangTin`

**Tệp:** `src/shared/router.ts` (`Ctx` `:14-42`, `AppOptions.injected` `:105-116`, dựng `ctx` `:156-161`), `src/shared/router.test.ts` (hai chỗ khai `injected` ở `:29`, `:116` — tệp test **không** được `tsc` kiểm: tự đọc lại).

- [ ] **Bước 1 (đỏ):** test ở `router.test.ts`:
  - route giả gọi `ctx.baoThayDoi({ orderId, thayDoi: "sua", handlerTruoc: undefined })` rồi trả 200: `exec.waitUntil` được gọi đúng một lần; hàm tiêm nhận `(env, staff, suKien)`; phản hồi 200 trả về **trước** khi lời hứa phát xong (hàm tiêm trả lời hứa treo — phản hồi vẫn về).
  - hàm tiêm ném lỗi / trả lời hứa bị từ chối → phản hồi vẫn 200; `console.error` một dòng JSON `event: "bang_tin_loi"` không chứa SĐT.
  - route không gọi → `waitUntil` không được gọi.
  - `ctx.dongBangTin("…")` tương tự (fire-and-forget).
- [ ] **Bước 2 (xanh):** thêm vào `Ctx`:
  - `baoThayDoi: (e: { orderId: string; thayDoi: ThayDoiDon; handlerTruoc?: { coNguoi: boolean; staffId: string | null } }) => void` — kiểu `void`, route **không** `await` được.
  - `dongBangTin: (muc: { staffId: string } | "tat-ca") => void`.
  - `injected` thêm `baoThayDoi: (env, actor, e) => Promise<void>` và `dongBangTin: (env, muc) => Promise<void>` (BẮT BUỘC, như `maintenanceBlock`).
  - Router dựng: `baoThayDoi: (e) => exec.waitUntil(opts.injected.baoThayDoi(env, who, e).catch(logLoi))`. Với route `public` (`who` null) → no-op.
  - Cập nhật hai khai `injected` trong `router.test.ts` và **mọi** nơi khác dựng `createApp` (`grep -rn "injected:" src tests scripts` — ở `34b34cf` chỉ `src/index.ts`, `src/shared/router.test.ts`).
- [ ] **Bước 3:** `node --test src/shared/router.test.ts` → xanh; `npm test`; `npm run typecheck` (sẽ đỏ ở `src/index.ts` cho tới Task 4 — chấp nhận trong cùng nhánh, **không commit riêng**: gộp commit Task 3 với Task 4 hoặc tạm tiêm no-op ở `src/index.ts` ngay bước này để typecheck xanh). Chọn tạm tiêm no-op — commit "Router: điểm phát bảng tin tiêm từ gốc lắp ráp".

### Task 4: Module `bangtin`, lớp Durable Object, cấu hình

**Tệp:** `src/modules/bangtin/{index.ts,rules.ts,rules.test.ts,tram.ts}`, `src/index.ts`, `src/modules/orders/index.ts`, `src/modules/orders/repository.ts`, `src/modules/dispatch/index.ts`, `src/architecture.test.ts`, `src/route-access.test.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `tests/audit/harness.mjs`, `tests/audit/cloudflare-workers-gia.mjs`.

- [ ] **Bước 1 (đỏ, luật thuần):** `rules.test.ts`: `hetHan(nay, hanGiay)`; `ketNoiQuaHan(danhSach, nay)` → danh sách cần đóng; `docHanGiay(env)` → 900 khi vắng/không phải số nguyên dương, giới hạn [5, 3600]; `kiemOrigin(request, url)` → `true` chỉ khi header `Origin` có và bằng `url.origin` (không dựa `sec-fetch-site` — WebSocket của trình duyệt luôn gửi `Origin`). Đỏ → viết `rules.ts` → xanh.
- [ ] **Bước 2 (đỏ, kiến trúc):** trong `src/architecture.test.ts`:
  - `ALLOWED_EDGES.bangtin = []` (chú thích: lá, không import module nào; dữ liệu đơn do gốc lắp ráp đọc qua `orders`/`dispatch`).
  - Hằng `KHONG_DB = ["bangtin"]` + bài kiểm: mọi tệp `.ts` (trừ `*.test.ts`) trong module thuộc `KHONG_DB`, trên mã đã che chú thích, không chứa `env.DB`, `.prepare(`, `.batch(`, `DB.exec(`; bài kiểm `:412-416` chấp nhận module thuộc `KHONG_DB` (thay vì STRICT/LEGACY).
  - Bài kiểm "tệp lớp DO": không tệp nào ngoài `src/index.ts` import `modules/bangtin/tram`; không `index.ts` nào trong `src/modules/*/` chứa chuỗi `cloudflare:workers`.
  - Chạy → đỏ ("module bangtin chưa khai…" khi thư mục đã tạo). Ghi dòng đỏ.
- [ ] **Bước 3 (xanh, module):**
  - `index.ts`: `bangtinModule` với **một** route `route("GET", "/api/bang-tin", "staff", …)`: (1) `request.headers.get("upgrade")?.toLowerCase() !== "websocket"` → 426 `upgrade_required`; (2) `!kiemOrigin` → 403 `cross_origin` (cùng chữ với `router.ts:88`); (3) `env.BANG_TIN` vắng → 503 `unavailable`; (4) tính `nhanKetNoi(staff)`; (5) dựng **Request mới** tới `https://bang-tin/ket-noi` chỉ với header `upgrade: websocket`, `x-bang-tin-nhan: <JSON nhãn>`, `x-bang-tin-nguoi: <staffId>` — không chép header nào của trình duyệt; (6) `return env.BANG_TIN.getByName("cong-ty").fetch(req)` (trả nguyên, có `webSocket`). Thêm `phatDon(env, suKien, nhan)` và `dongCua(env, muc)`: gọi RPC `phat`/`dongCua` của stub; `env.BANG_TIN` vắng → return (no-op).
  - `tram.ts`: `export class BangTin extends DurableObject<Env>`:
    - constructor: `ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"))`.
    - `fetch(req)`: đọc hai header nội bộ, `new WebSocketPair()`, `ctx.acceptWebSocket(server, nhan)`, `server.serializeAttachment({ staffId, hetHan })`, đặt alarm nếu chưa có hoặc muộn hơn `hetHan`; trả `new Response(null, { status: 101, webSocket: client })`.
    - `phat(suKien, nhan)`: đóng các socket quá hạn (4001); gom socket từ `ctx.getWebSockets(tag)` của mọi nhãn thành `Set`; `send(JSON.stringify(suKien))` trong `try`.
    - `dongCua(muc)`: `"tat-ca"` → mọi `ctx.getWebSockets()`; `{ staffId }` → `getWebSockets("nguoi:"+id)`; `close(4003, "cap-nhat-tai-khoan")`.
    - `webSocketMessage`: bỏ qua. `webSocketClose`/`webSocketError`: không làm gì (cờ tự trả lời Close). `alarm()`: đóng quá hạn, đặt alarm cho `hetHan` sớm nhất còn lại (nếu có).
    - Không dùng `storage` ngoài alarm; không lưu tin.
  - `src/modules/orders/index.ts`: export `findOrderRef(db, id): Promise<{ staffId: string; orderCode: string } | null>` (câu SQL mới trong `repository.ts` — module LEGACY, viết như `findOrderOwner` `repository.ts:43`).
  - `src/modules/dispatch/index.ts`: export `handlerOf(db, orderId): Promise<{ coNguoi: boolean; staffId: string | null }>` dùng `findHandlerOf` (`dispatch/repository.ts:57`; dòng có mà `staff_id` null = hồ sơ không tài khoản) — không SQL mới.
  - `src/index.ts`: thêm `bangtinModule` vào `modules` (`:20`); `export { BangTin } from "./modules/bangtin/tram";`; `injected.baoThayDoi = async (env, actor, e) => { if (!env.BANG_TIN) return; /* kiểm binding TRƯỚC hai lần đọc D1: khung thử không có binding thì không đọc gì sau khi phản hồi đã trả */ const [ref, handlerSau] = await Promise.all([findOrderRef(env.DB, e.orderId), handlerOf(env.DB, e.orderId)]); if (!ref) return; const thayDoi = e.thayDoi === "tao" && !handlerSau.coNguoi ? "tao_cho_nhan" : e.thayDoi; await phatDon(env, { loai: "don", orderId: e.orderId, maDon: ref.orderCode, thayDoi, luc: new Date().toISOString() }, nhanSuKien({ ownerId: ref.staffId, handlerTruoc: e.handlerTruoc ?? { coNguoi: false, staffId: null }, handlerSau })); }`; `injected.dongBangTin = (env, muc) => dongCua(env, muc)`. (`actor` giữ trong chữ ký cho Web Push giai đoạn 6; không đưa vào sự kiện.)
  - `wrangler.jsonc`: thêm (kèm chú thích tiếng Việt: vì sao một trạm, mỗi deploy ngắt kết nối, KHÔNG rollback được về bản trước migration này):
    ```jsonc
    "durable_objects": { "bindings": [{ "name": "BANG_TIN", "class_name": "BangTin" }] },
    "migrations": [{ "tag": "v1", "new_sqlite_classes": ["BangTin"] }]
    ```
    **Không** thêm `BANG_TIN_HAN_GIAY` vào `vars` (production dùng mặc định 900).
  - `worker-configuration.d.ts`: `npm run types` (có `.dev.vars` đủ tên) hoặc khai tay `BANG_TIN: DurableObjectNamespace<import("./src/index").BangTin>;` và `BANG_TIN_HAN_GIAY?: string;` trong `__BaseEnv_Env`.
  - `tests/audit/harness.mjs`: thêm plugin esbuild `{ name: "cloudflare-workers-gia", setup(b) { b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: <đường dẫn tuyệt đối tệp giả> })) } }`; tạo `tests/audit/cloudflare-workers-gia.mjs`; ghi một dòng ở `tests/audit/README.md`.
  - `src/route-access.test.ts`: thêm `{ entry: "./modules/bangtin/index.ts", exportName: "bangtinModule" }` vào `MODULES`; thêm `{ method: "GET", path: "/api/bang-tin", access: "staff" }` vào SNAPSHOT; sửa chú thích đếm (số module 12, số route +1).
- [ ] **Bước 4:** chạy `node --test src/modules/bangtin/rules.test.ts src/architecture.test.ts src/route-access.test.ts` → xanh; `npm test`; `node --test "tests/audit/*.test.mjs"`; `npm run typecheck` 0 lỗi; `npx wrangler dev` khởi động được (tắt ngay sau khi thấy "Ready").
- [ ] **Bước 5 (thấy chặn thật `KHONG_DB`):** chèn tạm `void env.DB;` vào `src/modules/bangtin/index.ts` → bài kiểm `KHONG_DB` đỏ nêu đúng tệp → hoàn nguyên → xanh. Chép vào nhật ký.
- [ ] **Bước 6 (thấy chặn thật "tệp lớp DO"):** thêm tạm `export { BangTin } from "./tram";` vào `src/modules/bangtin/index.ts` → bài kiểm kiến trúc đỏ **và** `route-access.test.ts` đỏ (esbuild không giải được `cloudflare:workers`) → hoàn nguyên → xanh. Chép vào nhật ký.
- [ ] **Bước 7:** commit (có thể 2–3 commit: luật thuần; module + DO; cấu hình + khung thử).

### Task 5: Điểm phát ở 8 route + hàng rào "mọi đường ghi đơn đều báo"

**Tệp:** `src/modules/orders/index.ts`, `src/modules/dispatch/index.ts`, `src/bang-tin-guard.test.ts` (mới, dùng lại `maskSource` của `scripts/source-mask-lib.mjs` như `src/route-write-guard.test.ts:28`).

- [ ] **Bước 1 (đỏ, hàng rào):** viết `src/bang-tin-guard.test.ts`:
  - Bóc `route("POST|PUT|PATCH|DELETE", "/api/orders…", …)` ở hai tệp trên mã đã che chuỗi/chú thích; đếm ngoặc để lấy thân; số route bóc được phải bằng số `route("POST|PUT|PATCH|DELETE"` có đường dẫn `/api/orders` (khuôn khác → đỏ, không im lặng bỏ qua).
  - Mỗi thân: có `baoThayDoi(` ; vị trí của nó > vị trí lời `return` **áp chót** và < vị trí lời `return` **cuối cùng** của thân (lời `return` cuối = phản hồi thành công ở cả 8 route hôm nay). **Chỉ tính `return` ở cấp thân handler**: bỏ qua `return` nằm trong hàm lồng (arrow/`function` bên trong — ví dụ callback `(orderId, at) => { …; return handler ? [handler] : []; }` của `POST /api/orders`, `orders/index.ts:194-197`), xác định bằng độ sâu ngoặc nhọn so với thân. Danh sách `MIEN: { route, lyDo }[]` (rỗng); mục miễn cho route không tồn tại → đỏ.
  - Ca tự kiểm của bộ bóc (như `route-write-guard`): chuỗi mẫu có lời gọi trước `return` lỗi → bị bắt; lời gọi trong chú thích → không tính; thân có hàm lồng chứa `return` đứng sau lời gọi → `return` lồng **không** được tính là `return` cuối/áp chót.
  - Chạy → đỏ liệt kê đủ 8 route. Chép dòng đỏ.
- [ ] **Bước 2 (xanh, 8 route):** thêm **một dòng** ngay trước `return` thành công, đúng bảng DP-1:
  - `POST /api/orders` (`:200`): `ctx.baoThayDoi({ orderId: id, thayDoi: "tao" })` — gốc lắp ráp tự đổi thành `tao_cho_nhan` khi không có người phụ trách. (Route đang giải cấu trúc `{ env, request, staff, defaultHandlerStatement }` — thêm `baoThayDoi` vào danh sách giải cấu trúc; tương tự các route dưới.)
  - `PUT /api/orders/:id` (`:240`) `sua`; `PUT …/trip` (`:260`) `chuyen`; `PUT …/booker` (`:283`) `sua`; `POST …/status` (`:314`) `to === "cancelled" ? "huy" : "xac_nhan"`.
  - `PUT …/handler` (`dispatch/index.ts:119-120`): `const truoc = { coNguoi: current !== null, staffId: current?.staff_id ?? null }; baoThayDoi({ orderId, thayDoi: thayDoiCuaHandler({ nguoiGoi: staff.id, handlerTruoc: truoc, handlerSau: { coNguoi: true, staffId: input.staffId } }), handlerTruoc: truoc })`.
  - `POST …/handler-cancel` (`:140`) `huy`; `POST …/handler-money-edit` (`:164`) `tien`.
  - Chạy `node --test src/bang-tin-guard.test.ts` → xanh; `npm test`; `npm run typecheck`; `node --test "tests/audit/*.test.mjs"` (khung thử không có binding → no-op, DP-3).
- [ ] **Bước 3 (thấy chặn thật DP-2):** xoá lời gọi ở `POST /api/orders/:id/handler-cancel` → đỏ nêu đúng route; dời lời gọi ở `PUT /api/orders/:id/trip` lên trước `if (detail === null) return …` (`:255`) → đỏ (đứng trước `return` lỗi); hoàn nguyên → xanh; `git diff --quiet src/modules`. Chép cả hai vào nhật ký.
- [ ] **Bước 4:** commit "Bảng tin: 8 route ghi đơn báo thay đổi + hàng rào".

**Giới hạn đã biết của hàng rào (ghi vào sổ):** canh QUÊN, không canh CỐ Ý; không chứng minh lời gọi chạy trên nhánh thành công (một `if` bao quanh vẫn qua); không thấy route ghi đơn khai ở tệp/module khác (`grep -rn 'route("' src` để chắc). Chứng minh hành vi "chỉ nhánh thành công" là việc của e2e Task 7 (DP-1).

### Task 6: Đóng kết nối khi có biến cố tài khoản

**Tệp:** `src/modules/accounts/index.ts`, `src/modules/maintenance/index.ts`.

- [ ] **Bước 1:** lập danh sách route bằng lệnh, **không** theo trí nhớ: `grep -n "touchCredentialsStatement\|setPinStatement\|setPermissionStatements\|patch.active" src/modules/accounts/index.ts` và route `PUT /api/staff/:id/roles` (`:522`, đổi vai kéo theo đổi quyền — đọc mã xác nhận). Ở `34b34cf` dự kiến: `POST /api/account/change-pin` (`:161`), `POST /api/account/passkeys/remove-all` (`:247`), `DELETE /api/account/passkeys/:id` (`:260`), `POST /api/account/pin-by-passkey` (`:291`), `PATCH /api/staff/:id` (`:433`, khi `active: false` hoặc đổi SĐT), `PUT /api/staff/:id/permissions` (`:485`), `PUT /api/staff/:id/roles` (`:522`), `POST /api/staff/:id/reset-pin` (`:570`), `POST /api/staff/:id/passkeys/remove-all` (`:589`). Ghi danh sách chốt vào nhật ký.
- [ ] **Bước 2 (đỏ):** e2e ở Task 7 là bằng chứng (không có khung thử unit cho accounts đủ gọn); viết trước ca "tạm ngưng tài khoản → kết nối đóng 4003" và "bật bảo trì → mọi kết nối đóng" trong `tests/e2e/bangtin.mjs`, chạy → đỏ.
- [ ] **Bước 3 (xanh):** ở nhánh thành công mỗi route trên: `ctx.dongBangTin({ staffId: <id tài khoản bị đổi> })`; `PUT /api/maintenance` (`maintenance/index.ts:46`) khi `input.on` → `ctx.dongBangTin("tat-ca")`. Route dùng `async (ctx) =>` hoặc giải cấu trúc — thêm `dongBangTin` tương ứng.
- [ ] **Bước 4:** `npm test` (hàng rào 1, 2 không đổi kết quả — không thêm route, không thêm ô); `npm run typecheck`; `npm run test:e2e -- bangtin admin maintenance passkey`. Commit.

### Task 7: e2e `tests/e2e/bangtin.mjs`

- [ ] **Bước 1:** xác minh (g): viết thử trong `lib.mjs` `moBangTin(cookie, { origin = BASE, headers = {} })` → `{ tin: [], dong: Promise<{code}>, gui(text), dongLai() , cho(dieuKien, ms) }`. Ưu tiên `new WebSocket(url, { headers: { cookie, origin } })` của Node 22; nếu máy chủ không thấy cookie/Origin → dùng `node:http` + `upgrade`. Hàm phụ `batTay(cookie, headers)` trả mã HTTP khi bắt tay bị từ chối (401/403/426/503).
- [ ] **Bước 2:** kịch bản (mỗi ca một khẳng định, thông báo tiếng Việt). **Vì hạn sống e2e ngắn** (`BANG_TIN_HAN_GIAY` cho cả lượt chạy), **mỗi ca mở kết nối MỚI ngay trước thao tác ghi và đóng ngay sau** bằng hàm `moiPhien(tenTaiKhoan…)` trong `bangtin.mjs`; không giữ kết nối qua nhiều ca. Chỉ ca 8 chờ hết hạn.
  1. Bắt tay: không cookie → 401; Origin lạ → 403; không Origin → 403; không `Upgrade` → 426; đúng → mở.
  2. Chuẩn bị phiên (cookie) cho `salesA`, `salesB`, `accountant`, `field`, một Đối tác mới (tạo như `tests/e2e/permissions.mjs`/`roles.mjs` tạo tài khoản PARTNER — đọc và chép cách làm), một Đối tác thứ hai.
  3. `salesA` lập đơn → `salesA`, `salesB`, `accountant` nhận đúng một tin `tao` (có `maDon` khớp `orderCode`), trong < 2 giây; Đối tác không nhận; `field` không nhận. Khung tin có **đúng 5 khoá**.
  4. Đóng dòng `HANDLE` bằng SQL (như `dispatch.mjs` làm "đơn chưa có người") rồi `salesB` Nhận → mọi phiên văn phòng nhận `nhan`; giao cho `field`… (chỉ nếu `checkAssignee` cho phép FIELD — đọc `dispatch.mjs`; nếu không, bỏ ca này và ghi lý do) → `field` nhận `giao`, rồi giao đi → `field` nhận thêm một tin (người phụ trách trước).
  5. Mỗi route còn lại của DP-1 một lần thành công → đúng một tin đúng `thayDoi`; mỗi route một lần thất bại (403/409) và `PUT …/trip`, `PUT …/booker` với thân "không đổi gì" → **không** tin nào trong 1,5 giây.
  6. Đối tác lập đơn của mình → chính Đối tác đó nhận; Đối tác thứ hai không nhận; văn phòng nhận. Đối tác gửi kèm header giả `x-bang-tin-nhan: ["tat-ca"]` khi bắt tay → vẫn không nhận tin đơn người khác (BT-2).
  7. Gửi `ping` → nhận `pong`; gửi rác → không có gì, kết nối vẫn mở.
  8. Hạn sống: với `BANG_TIN_HAN_GIAY=20`, kết nối bị đóng mã 4001 trong ≤ 20 + 3 giây nhờ alarm (không phát gì). Chạy ca này cuối cùng của kịch bản.
  9. Tạm ngưng rồi kích hoạt lại tài khoản dùng một lần → kết nối của nó đóng 4003; kết nối của người khác vẫn mở.
  10. Bật bảo trì (tài khoản được phép, như `maintenance.mjs`) → mọi kết nối đóng; bắt tay lại bằng `salesA` → 503; tắt bảo trì ở `finally`.
- [ ] **Bước 3:** `tests/e2e/run.mjs`: thêm `"bangtin"` vào `ALL` **sau `company`, trước `maintenance`** (kịch bản tự bật/tắt bảo trì, không đụng `salesB`/`field` mà `passkey` đổi); thêm `"--var", "BANG_TIN_HAN_GIAY:20"` vào lệnh `wrangler dev` (`:55-63`). Cân nhắc: 5 giây làm alarm chạy liên tục và dễ làm lệch mốc "< 2 giây"; 20 giây đủ dài cho mỗi ca (kết nối mới mỗi ca) và ca 8 chỉ chờ ~23 giây. Nếu ca vẫn chập chờn, tăng giá trị, đừng nới mốc 2 giây. Các kịch bản khác không mở WebSocket. `run.mjs` không cần `--config`: `wrangler dev` đọc `wrangler.jsonc` mặc định, binding DO chạy cục bộ và lưu vào `--persist-to`.
- [ ] **Bước 4:** `npm run test:e2e -- bangtin` → xanh; rồi `npm run test:e2e` đủ bộ (đuôi `audit-invariants --strict`). Thêm dòng bảng ở `tests/e2e/README.md`. Commit.

### Task 8: Trình duyệt — bộ lắng nghe chung, thông báo nổi, CSP

**Tệp:** `web/bangtin.ts`, `web/toast.ts`, `web/shell.ts` (`initShell` `:262-353`), `web/api.ts`, `public/app.css`, `public/_headers`.

- [ ] **Bước 1:** `web/api.ts`: sau mỗi yêu cầu **ghi** thành công tới `/api/orders/<uuid>…` hoặc `POST /api/orders` (lấy id từ phản hồi `order.id`), ghi `{ orderId, luc }` vào một bảng trong bộ nhớ của trang (export `vuaLamBoiTabNay(orderId): boolean` — trong 5 giây). Không lưu `localStorage`.
- [ ] **Bước 2:** `web/bangtin.ts` — `batDauBangTin(staff)`:
  - mở `new WebSocket(\`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/bang-tin\`)`;
  - `onmessage`: `pong` → xoá hẹn giờ chết; JSON → `laSuKienHopLe` → gộp trong 1 giây → `window.dispatchEvent(new CustomEvent("don-thay-doi", { detail: danhSachSuKien }))`; với mỗi sự kiện `thongBaoNoi(staff, e)` khác `null` và `!vuaLamBoiTabNay(e.orderId)` → `hienThongBao(...)`;
  - `onclose`/`onerror` → hẹn nối lại theo `choNoiLai(lan, Math.random())`; mở thành công → `lan = 0` và (trừ lần mở đầu tiên của trang) phát `CustomEvent("can-tai-lai")`;
  - `visibilitychange` (hiện lại) và `online` → đóng socket cũ (bỏ qua `onclose` của nó), nối lại ngay;
  - ping `ping` mỗi 50 giây; không `pong` trong 10 giây → đóng, nối lại;
  - `pagehide` → đóng sạch (không nối lại).
  - Chỉ **một** kết nối mỗi trang (cờ module).
- [ ] **Bước 3:** `web/toast.ts` — vùng `div.toast-vung` `aria-live="polite"` gắn một lần vào `body`; mỗi thông báo là liên kết `a.toast` (dựng bằng `h()`), tự ẩn sau 6 giây, tối đa 3 cái cùng lúc. CSS mới ở `public/app.css` **chỉ dùng token** có sẵn; thiếu kích thước/khoảng cách thì thêm token vào nhóm "Riêng của Tour Đảo Booking" (không màu mới — màu mới phải hỏi chủ). Vị trí: trên thanh tab ở điện thoại, góc trên phải ở máy tính.
- [ ] **Bước 4:** `web/shell.ts`: cuối `initShell()` (sau `addNav(...)`, trước `return staff`) gọi `batDauBangTin(staff)`. Nhánh mất mạng (`:327-334`) **không** gọi (không có `staff`).
- [ ] **Bước 5:** `public/_headers:7`: `connect-src 'self' wss://booking.tourdao.vn https://challenges.cloudflare.com`; sửa chú thích đầu tệp (vì sao liệt kê rõ `wss:` — Safari cũ không coi `wss:` là `'self'`; local/LAN dùng `ws:` cùng host, dựa vào `'self'` — **chưa xác minh** trên Safari iPhone thật qua LAN, ghi ở Task 13).
- [ ] **Bước 6:** `npm run typecheck`; `npm run build:web`; `npm test`; `npm run test:e2e -- pwa` (CSS chỉ token). Commit.

### Task 9: Các trang dùng tin để làm mới

- [ ] **`web/orders.ts`:** nghe `don-thay-doi` và `can-tai-lai` → `void load(true)` (hàm có sẵn `:78`, giữ `qInput`/`statusSel`). Giữ vị trí cuộn: lưu `scrollY` trước, khôi phục sau khi dựng. Nếu người dùng đã bấm "Tải thêm" (offset > PAGE) → tải lại với `limit = offset hiện có` (tối đa 100) để không mất các dòng đang xem — ghi giả định vào nhật ký.
- [ ] **`web/order.ts`:** nghe `don-thay-doi` (lọc `orderId === id`) và `can-tai-lai` → nếu `document.querySelector('.sheet[role="dialog"]')` hoặc hộp xác nhận đang mở → hiện dải `banner("info", "Đơn vừa được cập nhật — Tải lại", { action: "reload_order" })` (dùng lại hành động có sẵn ở `load()` `:351-365`); ngược lại `void load()`. Kiểm lại tên lớp/hộp thật bằng `grep -n 'role: "dialog"\|class: "sheet"' web/*.ts` (ở `34b34cf`: `web/trip-sheet.ts:62`; kiểm `booker-sheet.ts`, `handler-sheet.ts`, `confirmation-dialog.ts`).
- [ ] **`web/home.ts`:** tách phần tải dữ liệu `:252-269` của `main()` (`:235`) thành `async function taiDashboard(staff)`; `main()` gọi nó; nghe `don-thay-doi`/`can-tai-lai` → gọi lại (không hiện lại khung "đang tải", không xoá khối cũ khi lỗi mạng — chỉ giữ số cũ).
- [ ] **`web/account.ts`:** `initMyAssignments()` (`:424-437`) đưa `load` ra phạm vi dùng được; nghe hai sự kiện → `void load()` (chỉ khi người dùng có FIELD — như điều kiện hiện có).
- [ ] **`web/order-form.ts`:** **không** tự tải lại. Khi đang sửa đơn `id` và nhận tin về đúng `id` → dải "Đơn vừa được người khác cập nhật — lưu sẽ báo lỗi, hãy mở lại đơn" (khoá lạc quan `stale` vẫn là lưới thật).
- [ ] **Kiểm:** `npm run typecheck`; `npm run build:web`; thử tay `npm run dev` hai trình duyệt; chạy lại các kịch bản Chrome hiện có theo bảng `web/CLAUDE.md` cho tệp đã sửa: `trang-chu-smoke.mjs` (home), ba `a2-smoke-*.mjs` + `v1-nguoi-phu-trach.mjs` (order/orders), `dot-c-smoke.mjs` + `v1-bao-tri.mjs` (account/shell), `v1-dang-nhap.mjs` (CSP). Commit từng trang.

### Task 10: Kịch bản Chrome hai tài khoản đồng thời

**Tệp:** `docs/evidence/2026-09-25-bang-tin/kich-ban/bang-tin-smoke.mjs` (theo khuôn các kịch bản CDP có sẵn, ví dụ `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`), thư mục `anh/`, `README.md`.

- [ ] **Bước 1:** **Bẫy cookie dùng chung** (CLAUDE.md §10): mẹo "mở trang của tài khoản nào sau cùng" chỉ đúng khi các tab dùng **lần lượt**. Ở đây hai tài khoản phải mở **cùng lúc** → dùng `Target.createBrowserContext` (mỗi tài khoản một ngữ cảnh, kho cookie riêng) hoặc hai tiến trình Chrome với hai `--user-data-dir` khác nhau. Khẳng định ngay đầu kịch bản: `/api/auth/me` ở hai ngữ cảnh trả hai người khác nhau.
- [ ] **Bước 2:** các bước: (a) A (Bán hàng) mở `/orders`, B (Bán hàng) mở `/`; (b) B lập đơn qua API trong ngữ cảnh B; A thấy dòng mới ở `/orders` < 2 giây, không có thông báo nổi (`tao`); (c) đóng `HANDLE` bằng SQL local, B bấm Nhận trên `/order?id=X` → A thấy thông báo nổi có mã đơn, danh sách đổi người phụ trách; B **không** thấy thông báo của chính mình; (d) A mở `/order?id=X` và mở bảng sửa chuyến; B xác nhận đơn → A thấy dải "Đơn vừa được cập nhật — Tải lại", bảng sửa **không** bị đóng; (e) axe-core không lỗi mới ở vùng thông báo; (f) ảnh 390px + 1040px ở (b)(c)(d).
- [ ] **Bước 3:** chạy, ghi số dòng ✓ vào README bằng chứng và nhật ký. Commit.

### Task 11: Tài liệu, sổ hàng rào, nhật ký thay đổi

- [ ] `docs/SO-HANG-RAO.md`: ba dòng — (1) `src/bang-tin-guard.test.ts` (chặn: route ghi đơn quên báo; cơ chế; ngày + thông báo đỏ của Task 5 bước 3; giới hạn "canh QUÊN"); (2) hạng `KHONG_DB` + bài kiểm "tệp lớp DO" trong `architecture.test.ts` (Task 4 bước 5–6); (3) bài kiểm NT-3 (Task 1 bước 3) — ghi rõ nó **đỏ có chủ đích** khi (5)/GĐ2 Phần D đổi `MATRIX`.
- [ ] `docs/SYSTEM-DESIGN.md`: §2–§4 (thành phần DO, luồng một request bắt tay), §7 (route mới, cổng `staff`), §11 (Origin ở bắt tay, hạn sống, đóng khi biến cố tài khoản, sự kiện không mang dữ liệu nhạy cảm). Đọc tiêu đề bằng `grep -n "^#"`, sửa đúng mục.
- [ ] `docs/CHANGE-GUIDE.md`: §1 thêm dòng "Muốn thêm route ghi đơn / đổi ai nhận tin bảng tin → công thức <mới>"; §2 công thức mới "thêm route ghi đơn → gọi `ctx.baoThayDoi` ngay trước `return` thành công (hàng rào `bang-tin-guard`)"; §3 hàng mới (`src/modules/bangtin/*`, `src/shared/bang-tin.ts`, `web/bangtin.ts` → lệnh kiểm); §4 bẫy: "router không được bọc lại phản hồi của `/api/bang-tin` — `new Response(body, res)` làm rơi `webSocket`", "mỗi deploy ngắt mọi kết nối", "không `wrangler rollback` qua migration DO".
- [ ] `docs/HANDOFF-N1.md`: đoạn vận hành bảng tin (xem Task 14).
- [ ] `src/shared/changelog.ts`: mục nhật ký phiên bản cho người dùng ("Danh sách đơn, Trang chủ và trang đơn tự cập nhật khi đồng nghiệp nhận/giao/xác nhận/huỷ đơn; có thông báo nhỏ ở góc màn hình") — số phiên bản đặt ở bước A.0 lúc phát hành, theo `docs/QUY-TRINH-PHAT-HANH.md`; `node --test src/shared/changelog.test.ts`.
- [ ] **Đề xuất** (không tự sửa — tệp luật, N9): diff cho `docs/ARCHITECTURE.md` (hạng `KHONG_DB`, ngoại lệ gốc lắp ráp import `tram.ts`) và `web/CLAUDE.md` (hàng bảng kịch bản Chrome cho `web/bangtin.ts`, `web/toast.ts`) — viết vào `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`, trình chủ.
- [ ] `docs/data-dictionary.json`: **không** đổi (không bảng/view mới) — ghi vào nhật ký là đã kiểm.

### Task 12: Người kiểm độc lập (chỉ đọc) — bắt buộc

- [ ] Giao subagent `nguoi-kiem-doc-lap` (không phải người thi công): đọc mã thật, tự chạy `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e` đủ bộ, kịch bản Chrome Task 10; chỉ báo cáo. Trọng tâm:
  1. Sự kiện có đúng 5 khoá (ADR điều 4), không id người/tiền/SĐT/tên.
  2. `nhanKetNoi` chỉ hỏi `can()`; NT-3 đúng; Đối tác không nhận tin đơn người khác (đọc cả DO: gửi theo nhãn, không gửi "tất cả").
  3. Bắt tay: Origin kiểm trước khi gọi trạm; header nội bộ dựng mới; trạm không có đường vào ngoài binding.
  4. 8 route: lời gọi đúng chỗ (không trước ghi, không trong nhánh "không đổi"); router bọc `waitUntil` + `catch`.
  5. Đóng kết nối: danh sách route Task 6 đủ so với `grep touchCredentialsStatement|setPinStatement|setPermissionStatements`.
  6. Ba hàng rào mới có ngày quan sát chặn thật trong nhật ký và sổ.
  7. `wrangler.jsonc` migration DO đúng `new_sqlite_classes`; không có `BANG_TIN_HAN_GIAY` ở `vars`.
  8. CSP; `v1-dang-nhap.mjs` đã chạy.
- [ ] Sửa phát hiện (người thi công), người kiểm chạy lại tới khi đạt. Ghi kết quả vào nhật ký.

### Task 13: Thử trên iPhone thật (chủ dự án hoặc AI hướng dẫn chủ — chỉ kiểm được bằng tay)

Trên `node scripts/dev-iphone.mjs` (D1 tạm, LAN) trước khi phát hành, và lặp lại trên production sau phát hành. Hai máy: iPhone (app cài ra màn hình chính, tài khoản A) + máy tính (tài khoản B).
- [ ] Mở `/orders` trên iPhone; máy tính lập đơn → iPhone thấy dòng mới < 2 giây, không chạm màn hình.
- [ ] Máy tính bấm Nhận/xác nhận/huỷ → iPhone hiện thông báo nổi có mã đơn, chữ không tràn, không che thanh tab; bấm vào mở đúng đơn.
- [ ] **Khoá màn hình ≥ 1 phút**; trong lúc khoá, máy tính xác nhận một đơn; mở khoá → trong vài giây iPhone hiện trạng thái mới (nối lại + tải lại), không cần kéo tải lại.
- [ ] Chuyển sang app khác 5 phút rồi quay lại → như trên.
- [ ] Tắt Wi-Fi/4G 30 giây rồi bật lại → tự nối lại.
- [ ] Mở một bảng sửa chuyến trên iPhone; máy tính sửa đơn đó → iPhone chỉ hiện dải "Tải lại", không mất chữ đang gõ.
- [ ] (LAN) Nếu không kết nối được: mở Web Inspector của Safari xem lỗi CSP `connect-src` với `ws://<IP>` — ghi lại, không tự nới CSP production.
- [ ] Ghi kết quả + ảnh chụp vào `docs/evidence/2026-09-25-bang-tin/iphone.md`.

### Task 14: Phát hành — ghi chú cho chủ dự án (AI KHÔNG chạy)

AI chuẩn bị đủ (test, typecheck, e2e, kiểm độc lập đạt, nhật ký thay đổi A.0) rồi đưa chủ lệnh theo `docs/QUY-TRINH-PHAT-HANH.md` (`npm run day-len -- bang-tin`, rồi `npm run trien-khai` — **có đổi app, cần triển khai**). Ghi vào `docs/HANDOFF-N1.md` trước khi phát hành:
- **Không migration D1.** Có **migration Durable Object** (`migrations` trong `wrangler.jsonc`, tag `v1`) — do `wrangler deploy` tự áp, là **cửa một chiều mềm**.
- **Mốc lùi đổi cách:** sau lần deploy này **không** `wrangler rollback` được về bản trước (Cloudflare chặn rollback qua thay đổi vòng đời lớp DO). Muốn lùi: deploy một bản từ `main` đã **gỡ route `/api/bang-tin` và lời gọi `batDauBangTin`** nhưng **giữ** lớp `BangTin` + binding + migration. Gỡ hẳn lớp cần migration `deleted_classes` (tag `v2`) — việc riêng, chủ duyệt.
- **Mỗi deploy ngắt mọi kết nối bảng tin**; trình duyệt tự nối lại trong 1–30 giây và tải lại dữ liệu. Không phải sự cố.
- Không đổi bí mật, không đổi `vars` production. CSP mới đi cùng tệp tĩnh; app iPhone nhận khi tải lại (service worker không chặn `/api/*` và không chặn WebSocket).
- Sau deploy (chỉ đọc): mở app bằng hai tài khoản thật, thử một lần "Nhận"; `audit-invariants --db remote` như mọi lần; ghi số phiên bản Worker.
- Chi phí: ước tính nằm trong gói hiện có — **chưa kiểm** tài khoản Cloudflare đang ở gói nào (nghiên cứu §3.6).

## Việc của chủ dự án (gom một lần)

1. **Quyết định (5)** (Hướng dẫn viên thấy gì) — không chặn việc thi công; chỉ bài kiểm NT-3 đổi theo.
2. **Duyệt hai đề xuất luật** (Task 11): hạng module "không truy cập dữ liệu" trong `docs/ARCHITECTURE.md`; ngoại lệ "gốc lắp ráp nạp tệp lớp Durable Object của module bảng tin" (hoặc chọn phương án dự phòng `src/worker.ts`); thêm hàng kịch bản Chrome vào `web/CLAUDE.md`.
3. **Biết rằng** "chấm đếm" cho Đối tác (ADR-0014 điều 12) **chưa có** và bảng tin không làm nó; Đối tác chỉ được làm mới màn hình.
4. Thử iPhone thật (Task 13) và gõ lệnh phát hành (Task 14).

## Điểm dễ hỏng (Review Focus)

1. **Bọc phản hồi:** router trả nguyên `Response` của route (`router.ts:165-167`); nếu ai thêm bước bọc (thêm header chung) mà không miễn `/api/bang-tin`, bắt tay hỏng im lặng (mất `webSocket`). e2e BT-1 bắt được.
2. **Hai nguồn "ai thấy đơn":** `GET /api/orders` lọc bằng `can(staff,"order.view") ? null : staff.id` (`orders/index.ts:171`), bảng tin dùng cùng lời gọi — nếu một bên đổi cách (vd GĐ2 `seesAllOrders`), bên kia phải đổi theo. Người kiểm đối chiếu.
3. **Tin đến trước dữ liệu:** phát sau `db.batch` đã xong → đọc lại đơn ở trình duyệt luôn thấy dữ liệu mới (D1 một vùng chính). Không phát trước ghi.
4. **Bão tải lại:** nhiều tin liền → gộp 1 giây; Trang chủ + danh sách không tải lại song song hai lần cho cùng một đợt.
5. **Nối lại vô hạn khi phiên hết hạn/bị bảo trì:** bắt tay thất bại (401/503) trình duyệt chỉ thấy lỗi chung → lịch lùi tới 30 giây là trần; các lời gọi API thường của trang vẫn đưa người dùng về đăng nhập/màn bảo trì như hôm nay.
6. **`tests/audit/*.test.mjs` không nằm trong `npm test`** — phải tự chạy sau Task 4 (plugin `cloudflare:workers` giả).

## Tự rà kế hoạch (người lập kế hoạch, 2026-09-25)

- **Phủ ADR-0022:** điều 1 (Task 4 DO ngủ đông, một bản `cong-ty`), 2 (Task 4 bắt tay; thứ tự phiên → bảo trì do router, Origin → nhãn → trạm ở thân route), 3 (Task 1, NT-1..3), 4 (Ràng buộc chung + Task 2 `laSuKienHopLe` + e2e "đúng 5 khoá"), 5 (Task 3, 5; hàng rào + P16), 6 (Task 4 hạn sống, Task 6 đóng ngay, BT-3), 7 (Task 8, 9; Q-B ở TD-4; Q-C ở TD-4), 8 (Task 8 bước 5). Hệ quả: mã, kiểm thử, tài liệu, kiểm độc lập, "mỗi deploy ngắt kết nối" — đủ.
- **Đã kiểm trên mã `34b34cf`:** vị trí 8 route và nhánh "không đổi"; `Ctx`/`injected`/router không bọc phản hồi; `orderCode` có thật; cách `route-access.test.ts` và `tests/audit/harness.mjs` gói mã bằng esbuild `platform: "neutral"`; `STRICT` đòi SQL đăng ký; `run.mjs` dùng `wrangler.jsonc` mặc định (không `--config`); `worker-configuration.d.ts` được commit và sinh bởi `wrangler types`; ô `dispatch.claim` và `order.view` hiện hành; các route ghi `touchCredentialsStatement`/`setPinStatement`/`setPermissionStatements`.
- **Đã kiểm thêm:** `HandlerRow.staff_id` có thể null (hồ sơ không tài khoản) → phân biệt "có người" và "có tài khoản" (NT-2, Task 1, Task 4); `order.view`, `dispatch.claim` không có trong `docs/quyen-hoan.json`.
- **Chưa kiểm:** chạy bất kỳ đoạn mã nào (vai lập kế hoạch — P15); giới hạn nhãn mỗi socket; `new WebSocket(url, { headers })` của Node 22; Safari iPhone với `ws:` qua LAN; gói Cloudflare đang dùng; `checkAssignee` có cho giao FIELD không (Task 7 bước 2 ca 4 tự đọc).
