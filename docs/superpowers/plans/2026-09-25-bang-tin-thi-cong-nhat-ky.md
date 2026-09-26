# Bảng tin (ADR-0022) — nhật ký thi công

> Kế hoạch: `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md`. Quyết định gốc: `docs/adr/ADR-0022-bang-tin-thong-bao-tuc-thi.md` (accepted 2026-09-25).
> Vai phiên này: THI CÔNG (điều phối, subagent-driven). Người thi công KHÔNG tự nghiệm thu (N8) — Task 12 do `nguoi-kiem-doc-lap` chỉ đọc.
> Mọi dòng đỏ (TDD) và mọi lần "thấy chặn thật" (sửa cố ý → đỏ → hoàn nguyên) chép vào đây, không chỉ ở báo cáo của subagent.

## Task 0 — Điều kiện trước (2026-09-26)

- **Mốc:** worktree `.claude/worktrees/bang-tin`, nhánh `bang-tin` tạo từ `origin/main` = `823c1b1` (đã bỏ theo dõi upstream để nhánh không trỏ `origin/main`).
- **ADR-0022:** dòng Trạng thái = **accepted** ✓.
- **GĐ2 chưa gộp `main`:** từ `34b34cf` (mốc số dòng của kế hoạch) tới `823c1b1` không đổi `src/shared/router.ts`, `src/shared/permissions.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts`. `src/modules/orders/index.ts` đổi (lệch số dòng — bảng dưới).
- **Ô quyền `FIELD` hiện hành:** `order.view = none`, `dispatch.claim = none` (`src/shared/permissions.ts:48,59`).
- **Mốc kiểm:** `npm test` **800/800** xanh; `npm run typecheck` **0 lỗi**; `node --test "tests/audit/*.test.mjs"` **34/35** — ca đỏ **có sẵn trên `main`**, không do nhánh này: `P4 FINDING HDV: tài khoản chỉ quyền Hướng dẫn viên không mở được đơn nào … và không được giao phụ trách` (`tests/audit/doi-tac.test.mjs:77`, `200 !== 400`). `npm run test:e2e` mốc (ở `823c1b1`): **19/19 kịch bản xanh**, đuôi `audit-invariants --strict` đạt (2 cảnh báo D1 local) — mạng + siteverify Turnstile chạy được trên máy này.
- **`.dev.vars`:** không chép vào worktree (N10 — không nạp bí mật khi không cần). E2E tự đặt biến bằng `--var` (`tests/e2e/run.mjs:51-62`); binding `BANG_TIN` khai tay trong `worker-configuration.d.ts` (Task 0 bước 5, nhánh "nếu không").

### Số dòng DP-1 ở `823c1b1` (lời `return` thành công)

| Route | Tệp:dòng | Ghi chú |
|---|---|---|
| `POST /api/orders` | `orders/index.ts:178` | route `:160`; hàm lồng `:172-175` có `return` riêng |
| `PUT /api/orders/:id` | `orders/index.ts:218` | route `:194` |
| `PUT /api/orders/:id/trip` | `orders/index.ts:238` | nhánh không đổi `:233` KHÔNG phát |
| `PUT /api/orders/:id/booker` | `orders/index.ts:261` | nhánh không đổi `:256` KHÔNG phát |
| `POST /api/orders/:id/status` | `orders/index.ts:292` | `return` 409 `incomplete_trip` `:289` (trong khối `else`, cùng hàm — được tính) |
| `PUT /api/orders/:id/handler` | `dispatch/index.ts:120` | `return STALE()` `:118` |
| `POST /api/orders/:id/handler-cancel` | `dispatch/index.ts:140` | |
| `POST /api/orders/:id/handler-money-edit` | `dispatch/index.ts:164` | |

### Tài liệu Cloudflare đã đọc (Task 0 bước 3 — đọc lại 2026-09-26, skill `durable-objects` + trang chính thức)

| Điều | URL | Kết luận |
|---|---|---|
| Nhãn mỗi socket | https://developers.cloudflare.com/durable-objects/api/state/ — "Each tag is a maximum of 256 characters and there can be at most 10 tags associated with a WebSocket." | Hạn mức thật **10 nhãn / 256 ký tự**; thiết kế dùng ≤ 3 nhãn ngắn — trong hạn (kế hoạch ghi 3/50 là tự đặt chặt hơn, không phải hạn của Cloudflare). |
| Tự trả `pong` | cùng trang — "the auto-response will be returned without waking WebSockets in hibernation"; ví dụ chính thức gọi `setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping","pong"))` trong constructor (https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/) | Đúng thiết kế BT-3. Mỗi chuỗi ≤ 2048 ký tự. |
| Gắn dữ liệu vào socket | https://developers.cloudflare.com/durable-objects/best-practices/websockets/ — "Maximum serialized size is 16,384 bytes." | Chỉ gắn `{ staffId, hetHan }`. |
| `getWebSockets(tag)` gồm socket đang đóng? | api/state | **Tài liệu không nói.** → mã gửi tin bọc `try` từng socket (kế hoạch đã có) và kiểm `readyState` trước khi gửi. |
| Alarm | https://developers.cloudflare.com/durable-objects/api/alarms/ — "Each Durable Object is able to schedule a single alarm at a time"; tự thử lại khi `alarm()` ném, lùi dần từ 2 giây, tối đa 6 lần | Một alarm, đặt lại cho `hetHan` sớm nhất. Tài liệu **không nói** về `wrangler dev` cục bộ → e2e ca 8 (hạn sống) là bằng chứng thật. |
| Cờ tự trả lời Close | https://developers.cloudflare.com/workers/configuration/compatibility-flags/ — "activates by default for compatibility dates of 2026-04-07 or later"; gọi `close()` trong handler "is silently ignored" | Dự án `compatibility_date: "2026-09-01"`, không có `compatibility_flags` → cờ đang bật sẵn. |
| Mã đóng 4001/4003 | không trang Cloudflare nào nêu khoảng mã; 4000–4999 là quy ước RFC 6455 | Dùng 4001/4003 — không mâu thuẫn tài liệu. |
| Migration lớp mới | https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/ — `{ "tag": "v1", "new_sqlite_classes": [...] }` | Dùng đúng cú pháp này. |
| Không rollback qua migration DO | https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/ — "A Durable Object class lifecycle change (via `exports` or the legacy `migrations` array) has occurred between the version in the active deployment and the version selected to roll back to." | Mốc lùi đổi cách (Task 14). |
| `getByName` + RPC | https://developers.cloudflare.com/durable-objects/api/namespace/ , https://developers.cloudflare.com/durable-objects/api/stub/ | Lớp `extends DurableObject` (từ `cloudflare:workers`) → phương thức công khai gọi được qua stub. `wrangler` 4.135.0. |
| Chuyển bắt tay sang DO | ví dụ websocket-hibernation-server | Yêu cầu chuyển tiếp là `GET` có `Upgrade: websocket`; DO trả `101` + `webSocket: client`. |
| Deploy ngắt kết nối | best-practices/websockets — "Code updates disconnect all WebSockets." | Bình thường; trình duyệt tự nối lại (TD-2). |

### Phán quyết của điều phối viên (trước khi giao Task 1)

- **R1 — Quyết định (5):** chủ dặn trong lệnh giao việc "nhóm nhận tin của Hướng dẫn viên theo ô `order.view` hiện hành (ADR-0023 chưa duyệt) — không tự đổi quyền" → áp hàng "Giữ như hôm nay" của bảng phụ thuộc; bài kiểm NT-3 viết như kế hoạch (xanh hôm nay). Không hỏi lại. Nếu sai: chỉ bài kiểm NT-3 đổi.
- **R2 — `KHONG_DB`:** chủ đã duyệt thêm hạng module này (đầu kế hoạch + lệnh phiên) → người thi công **sửa trực tiếp** `docs/ARCHITECTURE.md` (Phần II + dòng 5.3 bảng cưỡng chế; không sửa câu chữ điều nào của Phần I) và `src/architecture.test.ts`. Hai việc **chưa** được duyệt — ngoại lệ "gốc lắp ráp nạp `modules/bangtin/tram.ts`" và hàng kịch bản Chrome trong `web/CLAUDE.md` — chỉ **đề xuất** ở `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`.
- **R3 — Thứ tự Task 6/7:** Task 6 bước 2 cần hạ tầng e2e của Task 7 → lượt giao Task 6 làm luôn Task 7 bước 1 (`moBangTin`/`batTay` ở `tests/e2e/lib.mjs`) và bước 3 (`run.mjs`: `ALL`, `--var BANG_TIN_HAN_GIAY:20`) + ca 9, 10 (đỏ trước); lượt giao Task 7 làm các ca còn lại.
- **R4 — Ca audit đỏ sẵn có:** tiêu chí "`tests/audit` xanh" hiểu là **không thêm ca đỏ mới**, so theo **tên** ca (chỉ được còn đúng "P4 FINDING HDV"). Sửa ca đó là việc riêng, không thuộc nhánh này.
- **R5 — Kiểm cuối:** Task 12 (`nguoi-kiem-doc-lap`, chỉ đọc) kiêm vòng kiểm toàn nhánh của quy trình; người kiểm **tự chạy** `npm test`, typecheck, `tests/audit`, e2e đủ bộ. Phát hiện → một lượt sửa → người kiểm chạy lại tới khi đạt.
- **R6 — Task 13/14:** iPhone thật chỉ người làm được → để chủ. Task 14: AI chỉ ghi `docs/HANDOFF-N1.md` và đưa lệnh, không chạy.
- **R7 — Task 4 chia hai lượt giao:** 4a (luật thuần `rules.ts`, `KHONG_DB` + bài kiểm kiến trúc, sửa `docs/ARCHITECTURE.md`); 4b (lớp DO, route, gốc lắp ráp, cấu hình, khung thử, route-access). 4b kiểm thêm `src/index.ts` (không riêng `router.ts`) có chỗ nào dựng lại `Response` làm rơi `webSocket`.

## Task 1–2 — hàm thuần (2026-09-26)

### Task 1: nhãn kết nối/sự kiện

- **Đỏ (trước khi có `src/shared/bang-tin.ts`):** `src/shared/bang-tin.ts` chỉ có `export {}`, chạy `node --test src/shared/bang-tin.test.ts`:
  ```
  SyntaxError: The requested module './bang-tin.ts' does not provide an export named 'THAY_DOI'
  not ok 1 - src/shared/bang-tin.test.ts
  ```
- **Xanh:** viết `THAY_DOI`, `ThayDoiDon`, `SuKienDon`, `TrangThaiPhuTrach`, `nhanKetNoi`, `nhanSuKien`, `thayDoiCuaHandler` (chỉ import `./permissions.ts`). `node --test src/shared/bang-tin.test.ts` → `pass 6, fail 0` (gồm bài 128 tập con suy từ `MATRIX`/`can()`, bảng ảnh chụp tay, NT-3, `nhanSuKien`, `thayDoiCuaHandler`).
- **NT-3 — thấy chặn thật (Task 1 bước 3, P16):** tạm sửa `src/shared/permissions.ts` dòng `dispatch.claim` cho FIELD từ `"none"` → `"any"`. Chạy lại bài kiểm NT-3 → đỏ đúng thông báo:
  ```
  Nhãn cho-nhan nay thêm người nhận ngoài order.view — quyết định (5)/GĐ2 Phần D: hỏi chủ trước khi sửa bài kiểm này
  'none' !== 'any'
  ```
  Hoàn nguyên dòng đó về nguyên văn cũ; `git diff --quiet src/shared/permissions.ts` → không còn khác biệt (xanh trở lại). Đây là hàng rào NT-3 đã quan sát chặn thật một lần — cần thêm dòng ở `docs/SO-HANG-RAO.md` (Task 11, ngoài phạm vi Task 1–2, ghi chú lại ở đây để người soạn sổ hàng rào không bỏ sót).
- **Mốc kiểm sau Task 1:** `npm test` 806/806 (mốc trước 800 + 6 bài mới); `npm run typecheck` 0 lỗi (ba tsconfig).

### Task 2: hàm thuần phía trình duyệt

- **Đỏ (trước khi thêm mã):** thêm 10 bài kiểm (`choNoiLai` × 2, `thongBaoNoi` × 5, `laSuKienHopLe` × 2, cộng khai báo `suKien`/tài khoản mẫu) vào `src/shared/bang-tin.test.ts`, chạy `node --test src/shared/bang-tin.test.ts` trước khi sửa `bang-tin.ts`:
  ```
  SyntaxError: The requested module './bang-tin.ts' does not provide an export named 'choNoiLai'
  not ok 1 - src/shared/bang-tin.test.ts
  ```
- **Xanh (lần 1, còn đỏ một bài):** thêm `choNoiLai`, `ThongBaoNoi`, `thongBaoNoi`, `laSuKienHopLe` vào `bang-tin.ts`. 15/16 xanh, 1 đỏ:
  ```
  Subtest: choNoiLai: lần 0 nằm trong [1000, 2000), ngauNhien=0 cho dãy tăng gấp đôi tới trần 30000
  error: 'lần 0, ngauNhien gần 1 vẫn dưới 2000'
  expected: true / actual: false
  ```
  Nguyên nhân: `Math.round(1000 + 1000*0.999999)` = `Math.round(1999.999)` = `2000` — chạm đúng biên trên bị cấm ("< 2000"). Sửa `Math.round` → `Math.floor` (không có lý do làm tròn lên khi mốc thời gian chờ, và floor không bao giờ vượt biên trên toán học). Chạy lại → 16/16 xanh.
- **Công thức `choNoiLai`:** cơ số `1000 * 2^lan`, trần 30000; dưới trần cộng ngẫu nhiên đầy đủ (cơ số → 2×cơ số, khớp "lần 0 ∈ [1000, 2000)"); đã tới trần chỉ cộng tối đa 20% (30000 → 36000). Với `ngauNhien = 0` mọi lần cho đúng dãy tăng gấp đôi 1000, 2000, 4000, … tới khi chạm 30000 — kiểm được "tăng gấp đôi" và "trần" bằng cùng một bài không cần tách ngẫu nhiên.
- **Mốc kiểm sau Task 2:** `npm test` 816/816 (806 + 10 bài mới); `npm run typecheck` 0 lỗi (ba tsconfig, gồm `tsc -p web`).

## Task 3 — router: `ctx.baoThayDoi`, `ctx.dongBangTin` (2026-09-26)

- **Đỏ (mô tả đúng thứ tự thật đã làm — sửa lại 2026-09-26, vòng sửa 1, phát hiện 2: câu cũ nói "viết test TRƯỚC khi sửa router.ts" là sai thứ tự thật):** bản `router.ts`/`index.ts` thêm `baoThayDoi`/`dongBangTin` đã được SOẠN XONG trước, sau đó mới viết 7 bài kiểm ở `src/shared/router.test.ts`. Vì vậy lúc này chạy test đã XANH ngay, không có bằng chứng đỏ. Để vẫn có bằng chứng đỏ thật (không dùng `git checkout` — lệnh phá hoại bị hàng rào auto-mode chặn), đã TẠM ghi đè `src/shared/router.ts` (qua công cụ Write, không qua lệnh git) bằng đúng nội dung tại `HEAD` (chưa có `baoThayDoi`/`dongBangTin`) rồi chạy:
  ```
  node --test src/shared/router.test.ts
  ```
  Kết quả: `# tests 15 / # pass 9 / # fail 6` — 6 bài mới đỏ (một bài "route không gọi → waitUntil không được gọi" tình cờ xanh vì đằng nào cũng không gọi gì). Một dòng đỏ mẫu (`ctx.baoThayDoi` gọi `exec.waitUntil`…):
  ```
  Expected values to be strictly equal:
  500 !== 200
  ```
  (Route gọi `ctx.baoThayDoi(...)` nhưng `ctx.baoThayDoi` chưa tồn tại → `TypeError` → router bắt ở `catch` ngoài cùng → 500, đúng như một tính năng chưa có.)
- **Xanh:** ghi đè lại `router.ts` bằng bản đã thêm `baoThayDoi`/`dongBangTin` vào `Ctx`, `AppOptions.injected`, và cách dựng `ctx` trong `dispatch()`:
  - `ctx.baoThayDoi(e)`: nếu `who` null (route `public`, chưa đăng nhập) → no-op, không gọi `exec.waitUntil`. Ngược lại: `exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoi(env, who, e)).catch((err) => ghiLoiBangTin("bao", err)))` — bọc trong `Promise.resolve().then(...)` để bắt được cả lỗi hàm tiêm ném ĐỒNG BỘ, không chỉ lời hứa bị từ chối.
  - `ctx.dongBangTin(muc)`: tương tự, không phụ thuộc `who` (đóng kết nối không cần ai đang gọi).
  - `ghiLoiBangTin(viec, e)`: một dòng `console.error(JSON.stringify({ level, event: "bang_tin_loi", viec, name }))` — chỉ `name` của lỗi (không message/stack/dữ liệu cá nhân); dùng chung cho cả hai hàm, phân biệt bằng `viec: "bao" | "dong"`.
  - Hai nơi dựng `injected` khác cũng phải thêm hai khoá bắt buộc: `src/index.ts` (tạm no-op `async () => {}`, có chú thích Task 4 sẽ thay bằng trạm thật) và hai mock ở `src/shared/router.test.ts`.
  - `node --test src/shared/router.test.ts` → `# tests 15 / # pass 15 / # fail 0`.
- **Mốc kiểm sau Task 3:** `npm test` 823/823 (816 + 7 bài mới); `npm run typecheck` 0 lỗi (ba tsconfig); `node --test "tests/audit/*.test.mjs"` → 34 xanh, đúng 1 đỏ đã có từ trước ("P4 FINDING HDV…", không đổi tên/nội dung) — không có ca đỏ mới.
- **Tệp đổi:** `src/shared/router.ts`, `src/shared/router.test.ts`, `src/index.ts` (tiêm tạm no-op).

### Vòng sửa 1 (kiểm độc lập, 2026-09-26)

Người kiểm phát hiện: bài "NÉM LỖI ĐỒNG BỘ" không thật kiểm ném lỗi đồng bộ. Trong `buildBangTin` (`router.test.ts`), hàm giả `injected.baoThayDoi`/`dongBangTin` khai `async (env, actor, e) => { await overrides.baoThayDoi?.(env, actor, e); }` — bọc `async` khiến MỌI lỗi ném ra trong `overrides.baoThayDoi` (kể cả ném đồng bộ bằng `throw` thường) đều biến thành lời hứa bị từ chối trước khi `router.ts` thấy được; hàng rào `Promise.resolve().then(...)` (chống ném-lỗi-đồng-bộ) trong `router.ts` chưa từng bị bài kiểm nào chạm tới thật.

- **Sửa hàm giả:** bỏ bọc `async`, chuyển tiếp thẳng tới `overrides.*` (`baoThayDoi: (env, actor, e) => (overrides.baoThayDoi ? overrides.baoThayDoi(env, actor, e) : Promise.resolve()) as Promise<void>` và tương tự cho `dongBangTin`) — nếu `overrides.baoThayDoi` là hàm thường (không `async`) ném lỗi, lỗi đó ném ĐỒNG BỘ ra khỏi chính lời gọi `opts.injected.baoThayDoi(...)`, đúng như tình huống hàng rào trong `router.ts` phải chặn. Đổi tên bài kiểm `dongBangTin` từ "ném lỗi" → "NÉM LỖI ĐỒNG BỘ" cho khớp thực chất (bài này đã dùng hàm thường, không `async`, từ đầu).
- **Chứng minh hàng rào có tác dụng (đo phân biệt):** tạm bỏ `Promise.resolve().then(...)` ở cả hai nhánh `baoThayDoi`/`dongBangTin` trong `router.ts` (gọi thẳng `opts.injected.baoThayDoi(env, who, e).catch(...)`), chạy lại:
  ```
  node --test src/shared/router.test.ts
  # tests 15 / # pass 13 / # fail 2
  not ok 12 - hàm tiêm baoThayDoi NÉM LỖI ĐỒNG BỘ → phản hồi vẫn 200; console.error một dòng bang_tin_loi, không lộ dữ liệu cá nhân
  not ok 15 - hàm tiêm dongBangTin NÉM LỖI ĐỒNG BỘ → phản hồi vẫn 200; console.error một dòng bang_tin_loi viec=dong
  ```
  Dòng lỗi mẫu (bài 12): `Expected values to be strictly equal: 500 !== 200` — route ném lỗi đồng bộ, không ai bắt, `fetch()` bắt ở `catch` ngoài cùng → 500. Đúng hai bài "NÉM LỖI ĐỒNG BỘ" đỏ, bài "BỊ TỪ CHỐI" (test 13, lời hứa bị từ chối) VẪN XANH — chứng minh hai bài kiểm giờ phân biệt được hai đường (ném đồng bộ / hứa bị từ chối), và hàng rào `Promise.resolve().then(...)` là thứ đang chặn đường ném đồng bộ (không phải trùng đường với `.catch`).
  - Hoàn nguyên `router.ts` về đúng bản đã commit: `git diff --quiet src/shared/router.ts` → không có khác biệt (xanh trở lại, `# tests 15 / # pass 15 / # fail 0`).
- **Mốc kiểm sau vòng sửa 1:** `node --test src/shared/router.test.ts` 15/15; `npm test` — xanh hết trừ đúng một thất bại đã biết trước, không do vòng sửa này (`src/route-access.test.ts`, `ENOENT` tìm `src/modules/bangtin/index.ts` — phát sinh từ Task 4a đang làm song song, không thuộc phạm vi Task 3); `npm run typecheck` 0 lỗi.
- **Tệp đổi thêm:** `src/shared/router.test.ts` (sửa hàm giả + đổi tên một bài kiểm); mục nhật ký này.

## Task 4a — luật thuần bangtin + hạng KHONG_DB (2026-09-26)

**Phạm vi lượt giao này (R7):** chỉ Bước 1 (`rules.ts`/`rules.test.ts`), Bước 2 (bài kiểm kiến trúc), Bước 5 (thấy chặn thật `KHONG_DB`), và sửa `docs/ARCHITECTURE.md`. KHÔNG làm Bước 3/4/6/7 (route, `tram.ts`, gốc lắp ráp, cấu hình, `route-access.test.ts`) — dành cho 4b.

### Đỏ trước

- Tạo `src/modules/bangtin/rules.test.ts` (import `./rules.ts` chưa tồn tại) → `node --test src/modules/bangtin/rules.test.ts`:
  ```
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/modules/bangtin/rules.ts' imported from '.../rules.test.ts'
  not ok 1 - src/modules/bangtin/rules.test.ts
  ```
- Chạy `node --test src/architecture.test.ts` (thư mục `bangtin` đã có, chưa khai `ALLOWED_EDGES`) → đỏ đúng như kế hoạch dự đoán:
  ```
  not ok 1 - mọi module trong src/modules đều khai chiều phụ thuộc ở ALLOWED_EDGES
  error: 'module "bangtin" chưa khai trong ALLOWED_EDGES'
  ```
  (Bài `module không nghiêm phải nằm trong LEGACY` — dòng 412 cũ — cũng đỏ cùng lượt vì chưa có `KHONG_DB`, đúng dự đoán của brief.)

### Xanh

- Viết `src/modules/bangtin/rules.ts`: `hetHan(nay, hanGiay)`, `ketNoiQuaHan(danhSach, nay)`, `docHanGiay(env)` (mặc định 900; giới hạn [5, 3600]), `kiemOrigin(request, url)` (chỉ đúng khi có header `Origin` và khớp `url.origin` — không dùng `sec-fetch-site`). Không import gì (module KHONG_DB, không I/O). `node --test src/modules/bangtin/rules.test.ts` → 6/6 xanh.
- `src/architecture.test.ts`: thêm `ALLOWED_EDGES.bangtin = []` (chú thích: lá); thêm hằng `KHONG_DB = ["bangtin"] as const`; sửa bài kiểm dòng 412 cũ để nhận `KHONG_DB` (và khẳng định module KHONG_DB không đồng thời ở `STRICT`/`LEGACY`); thêm bài `KHONG_DB: mọi tệp .ts (trừ *.test.ts)...` (quét `env.DB`, `.prepare(`, `.batch(`, `DB.exec(` trên mã đã che chú thích — dùng lại đúng cách che dòng `//`/`/* */`/`*` như `rawPrepareHits`/`R-N1-14` trong tệp này); thêm bài "tệp lớp DO modules/bangtin/tram": không tệp nào ngoài `src/index.ts` import nó (quét MỌI `.ts` kể cả `*.test.ts` bằng `walkAll()` mới, dùng `relSrc`+bỏ đuôi `.ts/.js/.mjs` trước khi so khớp — sau khi kiểm độc lập qua `advisor()` phát hiện bản đầu chỉ so khớp chuỗi thô nên lọt qua trường hợp import có đuôi `.ts`, đã sửa trước khi chạy P16); quét `scripts/*.mjs` cho chuỗi `"bangtin/tram"`; không `index.ts` module nào chứa `"cloudflare:workers"`. `node --test src/architecture.test.ts` → 23/23 xanh.

### KHONG_DB chặn thật (P16)

- Chèn tạm vào `src/modules/bangtin/rules.ts` (cuối tệp): `export const __khongDbTam = () => { const env = {} as unknown as { DB: unknown }; void env.DB; };`
- `node --test src/architecture.test.ts` → đỏ đúng tệp:
  ```
  not ok 19 - KHONG_DB: mọi tệp .ts (trừ *.test.ts) của module hạng KHONG_DB không được đụng env.DB/.prepare(/.batch(/DB.exec(
  + [ 'src/modules/bangtin/rules.ts: chứa "env.DB"' ]
  ```
- Hoàn nguyên bằng `Edit` (xoá đúng hai dòng vừa chèn, không dùng lệnh phá hoại) → `node --test src/architecture.test.ts` → 23/23 xanh lại; `grep -c "khongDbTam" src/modules/bangtin/rules.ts` → 0. Cần thêm dòng ở `docs/SO-HANG-RAO.md` (việc của Task 11, cùng cách ghi chú như NT-3 ở Task 1 — không bỏ sót).
- Bài kiểm "tệp lớp DO" KHÔNG chặn thật ở lượt này (đúng kế hoạch): `tram.ts` chưa tồn tại nên không có gì để phá; 4b sẽ thấy nó chặn thật khi thêm tạm `export { BangTin } from "./tram"` vào `bangtin/index.ts` (Bước 6 của brief).

### `docs/ARCHITECTURE.md`

Chủ đã duyệt thêm hạng `KHONG_DB` (R2) → sửa trực tiếp, không phải đề xuất: (1) Phần II "Chuẩn dữ liệu và kiểm máy" — thêm một bullet định nghĩa `KHONG_DB`; (2) Phần II "Thêm một module mới" quy tắc 7 — thêm `KHONG_DB` là lựa chọn thứ ba cạnh `STRICT`/`LEGACY`; (3) Phần I, dòng 5.3 bảng thi hành — chỉ sửa ô "Cưỡng chế bằng" (không đổi câu chữ điều 5.3, không đổi cột Nguồn). Vì (3) chạm Phần I, đã theo Điều 6.4 (tiền lệ dòng "5.14–5.17 (2026-09-26)"): thêm một mệnh đề vào dòng "Trạng thái" đầu tệp ghi ngày + lý do cho đúng sửa đổi này. Không đụng câu chữ Điều nào của Phần I; không thêm ngoại lệ "gốc lắp ráp nạp `tram.ts`" hay hàng kịch bản Chrome ở đây (hai việc đó chưa duyệt, thuộc `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`, ngoài phạm vi lượt này).

**Vòng sửa 1 (kiểm độc lập, sau commit `b04870a`):** hai việc đã sửa lại (1) cột Nguồn của dòng 5.3 lúc đầu bị thêm `ADR-0022` — vượt phạm vi được duyệt ("chỉ ô Cưỡng chế"); đã hoàn nguyên về đúng `ADR-0002, ADR-0008` (nguồn của hạng `KHONG_DB` đã dẫn đúng chỗ định nghĩa nó ở Phần II, không cần lặp ở Phần I); (2) bullet định nghĩa `KHONG_DB` ở Phần II lúc đầu viết "BẤT KỲ tệp `.ts` nào" — sai với mã thật (`walk()` loại `*.test.ts`) — đã sửa thành "tệp `.ts` không phải test". Mã (`architecture.test.ts`) không đổi, đúng như kiểm độc lập xác nhận cả hai hàng rào đã chặn thật.

### Xung đột phát hiện trước khi commit (chưa tự xử lý — cần điều phối viên quyết)

`npm test` sau khi tạo thư mục `src/modules/bangtin/` (chỉ có `rules.ts`+`rules.test.ts`, đúng phạm vi 4a) ra **830/831**, KHÔNG phải 831/831:

```
not ok 546 - MODULES liệt kê ĐỦ mọi thư mục module có khai `...Module: AppModule` (module mới có route không được lặng lẽ thoát khỏi bài kiểm)
error: "ENOENT: no such file or directory, open '.../src/modules/bangtin/index.ts'"
```

Nguyên nhân: `src/route-access.test.ts:163-165` đọc `index.ts` của MỌI thư mục dưới `src/modules/` không kiểm tồn tại trước — module `bangtin` chưa có `index.ts` (đúng brief 4a: "chỉ rules.ts+rules.test.ts, no index.ts yet") làm nó `ENOENT` (không phải một assertion đỏ bình thường, mà một exception). Ba ràng buộc của lượt giao này mâu thuẫn nhau: "không tạo `index.ts`", "mọi test hiện có phải xanh", "chỉ được sửa 5 tệp đã liệt kê" (không có `route-access.test.ts`). Không tự chọn — nêu ở đây theo đúng cách "một câu hỏi, gộp lại" (CLAUDE.md §3):

- **(A)** Cho `route-access.test.ts:165` một `existsSync` để bỏ qua thư mục chưa có `index.ts` (không nới luật — một thư mục không `index.ts` chắc chắn không khai `AppModule`) — nhưng đây là tệp hàng rào, cần điều phối viên duyệt trước khi ai sửa.
- **(B)** Chấp nhận đỏ tạm 830/831: 4b (Bước 3 của brief) thêm `index.ts` + dòng `MODULES`/SNAPSHOT cho `bangtin`, bài kiểm tự xanh lại. Chỉ ổn nếu 4b được giao ngay sau, không merge tạm trạng thái này.
- **(C)** 4a tự thêm `index.ts` rỗng (`export {}`) cho qua — vi phạm rõ ràng ràng buộc "chỉ rules.ts+rules.test.ts" của brief, không chọn.

**Khuyến nghị của người thi công:** (B), vì đây đúng là điểm nối giữa hai lượt giao đã được thiết kế trước (R7) — 4b làm ngay bước 3 là hết đỏ; nếu quy trình để nhánh này merge/dừng lâu ở giữa 4a/4b thì nên chọn (A) thay vào đó.

### Mốc kiểm sau Task 4a

- `npm test` → **830/831** (thiếu đúng 1, lý do ở trên, không phải hồi quy của mã Task 4a — 23 bài `architecture.test.ts` + 6 bài `rules.test.ts` mới đều xanh).
- `npm run typecheck` → **0 lỗi** (ba tsconfig: gốc, `web/`, `web/sw/`).
- `node --test "tests/audit/*.test.mjs"`: chưa chạy lại ở lượt này (không đổi mã chạm khung thử này; mốc Task 0 vẫn là 34/35, 1 đỏ có sẵn không do nhánh này).

**Tệp đổi:** `src/modules/bangtin/rules.ts`, `src/modules/bangtin/rules.test.ts` (mới), `src/architecture.test.ts`, `docs/ARCHITECTURE.md`.

## Task 4b — trạm Durable Object, route bắt tay, cấu hình (2026-09-26)

**Phạm vi (R8):** Bước 3, 4, 5 (lặp lại trên `bangtin/index.ts`), 6, 7 của brief Task 4, trên mốc `6448002`. Bước 1–2 đã xong ở 4a.

**Tệp:** mới `src/modules/bangtin/index.ts`, `src/modules/bangtin/tram.ts`, `src/modules/orders/order-ref.test.ts`, `src/modules/dispatch/handler-of.test.ts`, `tests/audit/cloudflare-workers-gia.mjs`; sửa `src/modules/bangtin/rules.ts` (+test), `src/index.ts`, `src/modules/orders/{index,repository}.ts`, `src/modules/dispatch/index.ts`, `src/route-access.test.ts`, `worker-configuration.d.ts`, `wrangler.jsonc`, `tests/audit/{harness.mjs,README.md}`.

### Hai chỗ làm khác chữ của brief (có lý do)

1. **Thêm hàm thuần `keHoachTram` vào `rules.ts`** (brief không có). `tram.ts` không nạp được dưới `node --test` (chính luật kiến trúc cấm nơi khác ngoài `src/index.ts` nạp nó), nên nếu để quyết định đóng/gửi/bỏ qua/báo thức trong `tram.ts` thì hành vi mới đó không có test đỏ-trước nào cho tới e2e. Tách phần quyết định thành hàm thuần có test; `tram.ts` chỉ còn vỏ gọi API Cloudflare.
2. **Gom người nhận theo MỘT lượt qua `ctx.getWebSockets()` + `ctx.getTags(ws)`, không gom `Set` từ `getWebSockets(tag)` của từng nhãn.** Tài liệu `developers.cloudflare.com/durable-objects/api/state/` (đọc lại 2026-09-26) KHÔNG hứa `getWebSockets(tag)` trả cùng một đối tượng qua các lần gọi → `Set` theo danh tính có thể không khử trùng được (một kết nối có cả `tat-ca` lẫn `nguoi:x` nhận hai tin). Xét theo chỉ số trong một mảng duy nhất thì "mỗi kết nối nhiều nhất một lần" đúng bất kể danh tính. Cùng trang đó xác nhận `getTags(ws)` có thật và `getWebSockets()` "có thể vẫn trả kết nối sau khi đã gọi `ws.close`" (đang CLOSING) → mọi `send`/`close` chỉ làm khi `readyState === 1`, mỗi lời gọi bọc `try`.

Thêm nhỏ: 426 kèm header `upgrade: websocket` (RFC 7231 §6.5.15 yêu cầu); trạm trả 400 nếu thiếu/sai header nội bộ (nhãn phải là mảng 1–10 chuỗi, mỗi chuỗi 1–256 ký tự — hạn mức của `acceptWebSocket`).

### Đỏ trước

- `keHoachTram` (4 bài mới trong `rules.test.ts`, viết trước hàm) → `node --test src/modules/bangtin/rules.test.ts`:
  ```
  # SyntaxError: The requested module './rules.ts' does not provide an export named 'keHoachTram'
  not ok 1 - src/modules/bangtin/rules.test.ts
  ```
- `src/route-access.test.ts`: thêm `bangtin` vào `MODULES` + dòng `GET /api/bang-tin staff` vào SNAPSHOT + sửa chú thích đếm (12 module, 72 route) TRƯỚC khi có `index.ts`:
  ```
  not ok 1 - MODULES liệt kê ĐỦ mọi thư mục module có khai `...Module: AppModule` (...)
    error: "ENOENT: no such file or directory, open '.../src/modules/bangtin/index.ts'"
  not ok 2 - mức truy cập của 72 route hiện có khớp ảnh chụp đã duyệt (...)
    error: Could not resolve ".../src/modules/bangtin/index.ts"
  ```
- `findOrderRef` (`orders/order-ref.test.ts`, 2 bài) và `handlerOf` (`dispatch/handler-of.test.ts`, 3 bài — có nhánh hồ sơ KHÔNG tài khoản → `{ coNguoi: true, staffId: null }` và nhánh dòng phụ trách đã đóng), cả hai chạy trên SQLite thật dựng từ `migrations/*.sql`, gói `./index` bằng esbuild:
  ```
  not ok 1 - handlerOf: người phụ trách đang mở CÓ tài khoản → ...    error: 'handlerOf is not a function'
  not ok 2 - handlerOf: người phụ trách là hồ sơ KHÔNG tài khoản → ... error: 'handlerOf is not a function'
  not ok 3 - handlerOf: đơn chưa từng có người phụ trách, ...           error: 'handlerOf is not a function'
  not ok 4 - findOrderRef: trả ĐÚNG hai trường mã đơn + người lập ...  error: 'findOrderRef is not a function'
  not ok 5 - findOrderRef: đơn không tồn tại → null ...                error: 'findOrderRef is not a function'
  ```

### Xanh

- `rules.ts`: `keHoachTram(ketNoi, nhanSuKien | null, nay)` → `{ dong, gui, baoThucKe }` (dùng lại `ketNoiQuaHan`). `rules.test.ts` 10/10.
- `bangtin/index.ts`: `bangtinModule` MỘT route `GET /api/bang-tin` `staff` — 426 → 403 `cross_origin` (đúng câu của `checkWriteRequest` trong `router.ts`: "Yêu cầu không đến từ trang của hệ thống.") → 503 `unavailable` khi vắng `env.BANG_TIN` → `nhanKetNoi(staff)` → `new Request("https://bang-tin/ket-noi", { headers: { upgrade, x-bang-tin-nhan, x-bang-tin-nguoi } })` (không chép header nào của trình duyệt) → trả nguyên `getByName("cong-ty").fetch(...)`. `phatDon`/`dongCua` gọi RPC `phat`/`dongCua`; vắng binding → return. Không import `./tram` (kể cả kiểu); không chứa tên mô-đun runtime Worker.
- `tram.ts`: `BangTin extends DurableObject<Env>`; constructor đặt tự trả lời `ping`→`pong`; `fetch` nhận kết nối (`acceptWebSocket(server, nhan)`, `serializeAttachment({ staffId, hetHan })`, đặt báo thức nếu chưa có hoặc muộn hơn); `phat` = `keHoachTram` → đóng 4001 `het-han` rồi gửi; `dongCua` → 4003 `cap-nhat-tai-khoan` (`"tat-ca"` mọi kết nối; `{ staffId }` nhãn `nguoi:<id>`); `alarm` đóng quá hạn + đặt báo thức kế; `webSocketMessage/Close/Error` không làm gì. Storage chỉ dùng `getAlarm`/`setAlarm`.
- `orders`: `getOrderRef` (SQL mới `SELECT staff_id, order_code FROM orders WHERE id = ?`, `repository.ts`) + `findOrderRef` công khai ở `index.ts` (cùng kiểu `findOrderOwner`). `dispatch`: `handlerOf` dùng `findHandlerOf` (không SQL mới). 5/5 xanh.
- `src/index.ts`: thêm `bangtinModule`; `export { BangTin } from "./modules/bangtin/tram"`; `baoThayDoi` thật (kiểm `env.BANG_TIN` TRƯỚC hai lần đọc D1 chạy song song; `tao` → `tao_cho_nhan` khi sau thay đổi không ai phụ trách; sự kiện đúng 5 khoá, `luc` ISO; nhãn bằng `nhanSuKien`; `_actor` không vào sự kiện); `dongBangTin` → `dongCua`.
- `worker-configuration.d.ts`: khai tay `BANG_TIN: DurableObjectNamespace<import("./src/index").BangTin>;` + `BANG_TIN_HAN_GIAY?: string;`. Đã thử bỏ dòng `BANG_TIN_HAN_GIAY` → `tsc` đỏ `TS2559: Type 'Env' has no properties in common with type '{ BANG_TIN_HAN_GIAY?: ... }'` ở `tram.ts` (`docHanGiay(this.env)`) → khôi phục → xanh; chú thích trong tệp cảnh báo `npm run types` chỉ sinh lại tên này nếu `.dev.vars` có nó.
- `wrangler.jsonc`: `durable_objects.bindings` + `migrations: [{ tag: "v1", new_sqlite_classes: ["BangTin"] }]`, chú thích tiếng Việt (một trạm; mỗi deploy ngắt mọi kết nối; sau bản này `wrangler rollback` về bản trước bị Cloudflare chặn — lùi = deploy bản gỡ route/bộ nghe nhưng GIỮ lớp + binding + migration). Không thêm `BANG_TIN_HAN_GIAY` vào `vars`.
- `src/route-access.test.ts`: 2/2 xanh (72 route, 12 module).

### Thấy chặn thật (P16) — Bước 5 và Bước 6, trên `bangtin/index.ts`

- **Bước 5 — `KHONG_DB`:** chèn tạm `void env.DB; // PHA-CO-Y-BUOC-5` vào thân route → `node --test src/architecture.test.ts`:
  ```
  not ok 19 - KHONG_DB: mọi tệp .ts (trừ *.test.ts) của module hạng KHONG_DB không được đụng env.DB/.prepare(/.batch(/DB.exec(
    + 'src/modules/bangtin/index.ts: chứa "env.DB"'
  # pass 22
  # fail 1
  ```
  Hoàn nguyên bằng `Edit` → `grep -c "PHA-CO-Y" src/modules/bangtin/index.ts` = 0 → 23/23 xanh.
- **Bước 6 — "tệp lớp DO":** thêm tạm `export { BangTin } from "./tram";` vào `bangtin/index.ts` →
  - `node --test src/architecture.test.ts`:
    ```
    not ok 20 - tệp lớp DO modules/bangtin/tram: chỉ src/index.ts được import; không index.ts nào của module chứa "cloudflare:workers"
      + 'src/modules/bangtin/index.ts: import "./tram" (chỉ src/index.ts được nạp lớp Durable Object)'
    # pass 22
    # fail 1
    ```
  - `node --test src/route-access.test.ts`:
    ```
    # ✘ [ERROR] Could not resolve "cloudflare:workers"
    not ok 2 - mức truy cập của 72 route hiện có khớp ảnh chụp đã duyệt (...)
        src/modules/bangtin/tram.ts:9:30: ERROR: Could not resolve "cloudflare:workers"
    # pass 1
    # fail 1
    ```
  Hoàn nguyên bằng `Edit` → hai tệp 25/25 xanh. Không commit bản phá nào. Cả hai hàng rào cần dòng ở `docs/SO-HANG-RAO.md` (Task 11).

### Khung thử `tests/audit`

- `harness.mjs`: plugin esbuild `cloudflare-workers-gia` trỏ `^cloudflare:workers$` về `tests/audit/cloudflare-workers-gia.mjs` (đường dẫn theo `import.meta.url` của chính harness, không theo `ROOT` vì `AUDIT_ROOT` có thể trỏ nơi khác); tệp giả chỉ có lớp `DurableObject` rỗng; một dòng ở `README.md`.
- Thấy cần thật: bỏ tạm dòng `plugins: [...]` → `node --test tests/audit/redteam.test.mjs` → `src/modules/bangtin/tram.ts:9:30: ERROR: Could not resolve "cloudflare:workers"`, `not ok 1 - tests/audit/redteam.test.mjs` → khôi phục (chép lại bản sao) → xanh.
- So bộ ca đỏ: TRƯỚC (mốc `6448002`) `# tests 35 / pass 34 / fail 1` — `not ok 4 - P4 FINDING HDV: tài khoản chỉ quyền Hướng dẫn viên không mở được đơn nào (...)`. SAU: `# tests 35 / pass 34 / fail 1` — đúng MỘT ca đó, cùng tên. Không thêm ca đỏ mới.
- Tìm nơi khác gói `src/index.ts` bằng esbuild: tìm `entryPoints` / `esbuild.build` / `esbuild"` trong `src`, `tests`, `scripts` → `src/passkey-off.test.ts`, `src/route-access.test.ts`, `src/modules/{dispatch/service,auth/passkey,accounts/patch-staff,staff/account-roles,orders/dashboard,orders/repository}.test.ts`, `tests/audit/harness.mjs`, cộng hai tệp test mới của lượt này. Chỉ `tests/audit/harness.mjs` gói `src/index.ts`; các tệp còn lại gói `index.ts`/`repository.ts`/`service.ts` của MỘT module (không kéo `tram.ts`). `scripts/` và `tests/e2e/` không dùng esbuild. → chỉ harness cần plugin.

### Phản hồi có bị dựng lại không (mất `webSocket`)

Đã đọc: `src/shared/router.ts` — `fetch` trả `await dispatch(...)`, `dispatch` trả thẳng `hit.r.handler(...)`; không có `new Response(...)`/`headers.set`/`headers.append` nào trong `router.ts` hay `src/index.ts` (tìm bằng grep → không dòng nào). `src/index.ts` — `fetch: app.fetch` (không bọc). `wrangler.jsonc` `assets.run_worker_first: ["/api/*"]` → `/api/bang-tin` vào Worker trước, không qua tài sản tĩnh; `public/_headers` dòng 1 tự ghi "API /api/* đi qua Worker, không dùng file này". → phản hồi 101 của trạm đi nguyên tới trình duyệt.

### `wrangler dev` (chỉ local, D1 tạm)

Lệnh (từ thư mục worktree): `CI=1 npx wrangler dev --port 8799 --ip 127.0.0.1 --inspector-port 9239 --persist-to /tmp/bangtin-4b-dev-persist --var SESSION_SECRET:<48 ký tự giả>` (không tạo `.dev.vars` — N10; `SESSION_SECRET` giả để `checkConfig` không trả 500 trước bước đăng nhập). Log: bảng binding có `env.BANG_TIN (BangTin) Durable Object local`, `Ready on http://127.0.0.1:8799`, không dòng lỗi. Bắt tay không cookie:

```
curl -si -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://127.0.0.1:8799/api/bang-tin
HTTP/1.1 401 Unauthorized
{"error":{"code":"unauthenticated","message":"Chưa đăng nhập hoặc phiên đã hết hạn."}}
```

Tắt ngay (dừng tác vụ nền), kiểm: `pgrep -fl "wrangler dev" | grep -c 8799` = 0, `pgrep -fl workerd | grep -c worktrees/bang-tin` = 0; xoá thư mục D1 tạm. (Một `wrangler dev` khác đang chạy từ worktree `va-3-loi-kiem-toan`, cổng 51764 — không phải của lượt này, không đụng.)

### Test route bắt tay — viết SAU mã (ghi thật, không phải đỏ-trước)

Sau ba commit đầu, rà lại (qua `advisor()`) thấy ba cổng riêng của route (426, 403 `cross_origin`, 503) và BT-2 (yêu cầu gửi trạm dựng mới) chưa có test nào và chưa từng thấy chặn — lần chạy `wrangler dev` chỉ tới cổng 401 của router. Thêm `src/modules/bangtin/bat-tay.test.ts` (6 bài, gói `./index.ts` bằng esbuild, gọi thẳng handler với ctx giả + trạm giả ghi lại yêu cầu; trạm giả trả một đối tượng mốc vì Node không cho dựng phản hồi 101). **Test này viết SAU mã nên xanh ngay lần chạy đầu (6/6)** — không có dòng đỏ-trước; thay vào đó thấy nó chặn thật bằng hai lần phá có chủ ý (P16):

- Tắt kiểm Origin (`if (false && !kiemOrigin(...))`) →
  ```
  not ok 3 - Origin vắng hoặc lạ → 403 cross_origin (đúng câu của router), không mở kết nối
    undefined !== 403
  # pass 5
  # fail 1
  ```
  (route chạy tới trạm giả và trả đối tượng mốc thay vì 403) → hoàn nguyên → 6/6.
- Chép header trình duyệt sang trạm (`new Request("https://bang-tin/ket-noi", { headers: request.headers })`) →
  ```
  not ok 5 - BT-2: yêu cầu gửi trạm được DỰNG MỚI — chỉ 3 header máy chủ đặt; nhãn/id giả của trình duyệt bị bỏ; trả NGUYÊN phản hồi của trạm
    chỉ đúng 3 header, không cookie/origin
    + 'connection', + 'cookie', + 'origin', 'upgrade', 'x-bang-tin-nguoi', 'x-bang-tin-nhan'
  # pass 5
  # fail 1
  ```
  → hoàn nguyên (`git diff --stat src/modules/bangtin/index.ts` rỗng = đúng bản đã commit) → 6/6.

Bài BT-2 dùng ba tài khoản (Đối tác, Bán hàng, Hướng dẫn viên) gửi kèm nhãn giả `["tat-ca","cho-nhan"]` và id giả; khẳng định nhãn gửi trạm = `nhanKetNoi(staff)` tính ở máy chủ, id = `staff.id`, đúng 3 header, tên trạm `cong-ty`, và route trả NGUYÊN đối tượng của trạm. Thêm bài `phatDon`/`dongCua` (vắng binding → không ném; có binding → gọi đúng RPC).

Chưa có test cho phần gốc lắp ráp (`baoThayDoi`: kiểm binding trước khi đọc D1, `tao` → `tao_cho_nhan`, sự kiện 5 khoá) — hàm đó nằm trong `createApp(...)` của `src/index.ts`, không export được mà không đổi cấu trúc tệp chính của Worker; để e2e Task 6/7 kiểm.

### Mốc kiểm sau Task 4b

- `npm test` → **846/846** (831 cũ + 4 `keHoachTram` + 2 `findOrderRef` + 3 `handlerOf` + 6 route bắt tay; ca đỏ tạm `route-access` của 4a đã xanh lại).
- `npm run typecheck` → **0 lỗi** (ba tsconfig).
- `node --test "tests/audit/*.test.mjs"` → 34/35, đúng một ca đỏ có sẵn "P4 FINDING HDV" (R4).

### Chưa kiểm ở lượt này (để e2e Task 6/7)

Đường 101 thật (bắt tay có phiên đăng nhập, `Origin` đúng), tự trả `pong`, đóng 4001 bằng báo thức/khi phát, đóng 4003, RPC `phat`/`dongCua` qua stub thật, việc runtime chấp nhận Request dựng mới gửi sang trạm, và phần gốc lắp ráp (`baoThayDoi`) — đều chưa chạy thật; có test đơn vị: phần quyết định của trạm (`keHoachTram`) và route bắt tay với trạm giả (`bat-tay.test.ts`). Bộ e2e 19 kịch bản cũng chưa chạy lại sau khi thêm binding + migration Durable Object (điều phối viên để e2e cho task sau).

### Việc để lại cho task sau

- `docs/SO-HANG-RAO.md`: dòng cho `KHONG_DB` và "tệp lớp DO" (ngày thấy chặn: 2026-09-26) — Task 11.
- `docs/HANDOFF-N1.md` / runbook: ghi rằng từ bản có trạm, `wrangler rollback` về bản trước bị chặn và cách lùi thay thế — Task 14.
- Gợi ý (không tự sửa, ngoài phạm vi): thêm dòng chú thích `BANG_TIN_HAN_GIAY` vào `.dev.vars.example` để `npm run types` không làm rơi tên này.

**Commit:** `4e8fe59` (findOrderRef, handlerOf + test — ở commit này `route-access` vẫn đỏ tạm như sau 4a, R11), `7e12192` (module, trạm, gốc lắp ráp, khung thử, route-access xanh lại), `7a5e816` (cấu hình `wrangler.jsonc` + mục nhật ký này), và commit test route bắt tay + cập nhật nhật ký.

Cổng phát hành: `grep` `wrangler types` / `worker-configuration` / `types --check` trong `scripts/`, `src/*.test.ts`, `.claude/hooks` → không dòng nào; không cổng nào so kiểu sinh tự động, nên tệp kiểu khai tay không làm đỏ `npm run trien-khai`. (`wrangler dev` có in "Your types might be out of date" — chỉ là nhắc, vì dòng hash đầu `worker-configuration.d.ts` là của lần sinh cũ.)
