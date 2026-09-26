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

## Task 5 — 8 điểm phát + hàng rào `bang-tin-guard`

Hàng rào mới `src/bang-tin-guard.test.ts` (phân tích tĩnh, không chạy mã — cùng cách `src/route-write-guard.test.ts`, dùng lại `maskSource` của `scripts/source-mask-lib.mjs`): mọi route `POST|PUT|PATCH|DELETE` có đường dẫn bắt đầu `/api/orders` khai ở `src/modules/orders/index.ts` hoặc `src/modules/dispatch/index.ts` phải có ĐÚNG MỘT lời gọi `baoThayDoi(` ở CẤP THÂN HANDLER, đứng sau return áp chót và trước return cuối cùng (cũng ở cấp handler) — return/lời gọi trong hàm lồng (arrow có khối `{}`, hay `function` khai bên trong) bị loại, xác định bằng độ sâu ngoặc nhọn (mỗi `{` được gán cờ "có mở thân hàm không": `=>` liền trước → hàm; `){` mà từ khoá trước `(` là `if|for|while|switch|catch|do` → khối lệnh; là `function` → hàm; còn lại (khuôn tắt phương thức, IIFE…) → THROW "chưa hiểu khuôn này", không đoán). Đối chiếu độc lập: số route ghi `/api/orders` bóc được phải bằng số đếm trực tiếp trên bản che CHỈ chú thích (giữ chuỗi) của từng tệp. `MIEN` (danh sách miễn) rỗng hôm nay; có tự kiểm cho mục trỏ route không tồn tại.

### Bước 1 — đỏ (trước khi thêm 8 lời gọi)

```
not ok 2 - hàng rào bảng tin: mọi đường ghi đơn (POST|PUT|PATCH|DELETE /api/orders…) gọi ctx.baoThayDoi đúng một lần, giữa return áp chót và return cuối
  + [
  +   'POST /api/orders (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'PUT /api/orders/:id (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'PUT /api/orders/:id/trip (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'PUT /api/orders/:id/booker (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'POST /api/orders/:id/status (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'PUT /api/orders/:id/handler (modules/dispatch/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'POST /api/orders/:id/handler-cancel (modules/dispatch/index.ts): thiếu lời gọi baoThayDoi(...)…',
  +   'POST /api/orders/:id/handler-money-edit (modules/dispatch/index.ts): thiếu lời gọi baoThayDoi(...)…',
  + ]
# pass 15
# fail 1
```
Đủ 8 route, đúng tên. 8 tự kiểm của bộ bóc/bộ đánh giá (lời gọi trước return áp chót bị bắt; return trong else/try-catch vẫn ở cấp handler; lời gọi trong chú thích/chuỗi không tính; hàm lồng arrow/`function` có return sau lời gọi không bị coi là cuối/áp chót; lời gọi chỉ trong callback không tính; gọi hai lần không đạt; MIEN trỏ route lạ bị bắt; khuôn tắt phương thức làm hàng rào throw) đã xanh ngay từ đầu (test tự kiểm không phụ thuộc mã thật).

### Bước 2 — thêm 8 lời gọi, xanh

Thêm `baoThayDoi` vào danh sách giải cấu trúc của 8 route và gọi ngay trước `return` thành công, đúng bảng DP-1 (`orders/index.ts`: `POST /api/orders` → `"tao"`; `PUT /:id` → `"sua"`; `PUT /:id/trip` → `"chuyen"`; `PUT /:id/booker` → `"sua"`; `POST /:id/status` → `to === "cancelled" ? "huy" : "xac_nhan"`. `dispatch/index.ts`: `PUT /:id/handler` tính `truoc` từ `current` đã đọc (`{ coNguoi: current !== null, staffId: current?.staff_id ?? null }`) rồi `thayDoiCuaHandler({ nguoiGoi: staff.id, handlerTruoc: truoc, handlerSau: { coNguoi: true, staffId: input.staffId } })`, kèm `handlerTruoc: truoc`; `POST /:id/handler-cancel` → `"huy"`; `POST /:id/handler-money-edit` → `"tien"`). Đổi import `dispatch/index.ts` từ `import type { TrangThaiPhuTrach }` sang `import { thayDoiCuaHandler, type TrangThaiPhuTrach }` (giữ không đuôi `.ts`, đúng phong cách tệp).

Kết quả:
- `node --test src/bang-tin-guard.test.ts` → 16/16 xanh.
- `npm test` → **862/862** (846 cũ + 16 hàng rào mới).
- `npm run typecheck` → 0 lỗi (ba tsconfig).
- `node --test "tests/audit/*.test.mjs"` → 34/35, đúng MỘT ca đỏ có sẵn `P4 FINDING HDV: tài khoản chỉ quyền Hướng dẫn viên không mở được đơn nào (kể cả để xem việc), và không được giao phụ trách` — không đổi so với trước Task 5 (khung thử không có binding `BANG_TIN`, `env.BANG_TIN` rỗng → gốc lắp ráp `baoThayDoi` tự no-op ngay dòng đầu, DP-3).

### Bước 3 — thấy chặn thật (P16)

Đã stage bản xanh (`git add src/modules/orders/index.ts src/modules/dispatch/index.ts src/bang-tin-guard.test.ts`) trước khi cố ý phá, để `git diff --quiet src/modules` so được đúng "có khác bản xanh hay không" ở mỗi bước.

**(a) Xoá lời gọi ở `POST /api/orders/:id/handler-cancel`:**
```
not ok 2 - hàng rào bảng tin: mọi đường ghi đơn …
  + [ 'POST /api/orders/:id/handler-cancel (modules/dispatch/index.ts): thiếu lời gọi baoThayDoi(...)…' ]
# fail 1
```
Nêu đúng route bị xoá, không route khác. Hoàn nguyên (thêm lại dòng `baoThayDoi({ orderId, thayDoi: "huy" });`) → 16/16 xanh lại.

**(b) Dời lời gọi ở `PUT /api/orders/:id/trip` lên TRƯỚC `if (detail === null) return …`:**
```
not ok 2 - hàng rào bảng tin: mọi đường ghi đơn …
  + [ 'PUT /api/orders/:id/trip (modules/orders/index.ts): thiếu lời gọi baoThayDoi(...)…' ]
# fail 1
```
Lời gọi đứng trước return "không đổi gì" (áp chót lúc này) → bị bắt là sai vị trí, đúng như dự kiến (đặc tả cấm phát tin cho nhánh không đổi gì). Hoàn nguyên (dời lại xuống sau khối `updateTrip` thất bại, trước `return` thành công cuối) → 16/16 xanh lại.

Sau khi hoàn nguyên cả hai: `git diff --quiet src/modules; echo $?` → `0` (khớp đúng bản đã stage, không sót thay đổi thử).

### Giới hạn đã biết của hàng rào (ghi ở `docs/SO-HANG-RAO.md`, Task 11)

Canh QUÊN, không canh CỐ Ý: hàng rào chỉ nhìn VỊ TRÍ văn bản của `return`/`baoThayDoi(`, không chạy mã — một lời gọi đặt đúng vị trí nhưng nằm trong một `if` phụ (ví dụ `if (Math.random() < 0.5) baoThayDoi(...)`) vẫn qua được, vì bài kiểm không biết nhánh đó có luôn chạy hay không. Không chứng minh lời gọi CHỈ chạy trên nhánh thành công (400/403/404/409 hoặc "không đổi gì") — việc đó là của e2e Task 7 (DP-1), quan sát hành vi thật qua D1 tạm. Không thấy route ghi đơn khai ở tệp/module khác ngoài hai tệp đã liệt — đã `grep -rn 'route("' src` xác nhận `/api/orders*` chỉ khai ở `orders/index.ts` và `dispatch/index.ts` hôm nay; thêm route ở tệp khác sẽ không được hàng rào này thấy.

**Commit:** `Bảng tin: 8 route ghi đơn báo thay đổi + hàng rào`.

## Task 6 — đóng kết nối khi đổi tài khoản / bảo trì (+ hạ tầng e2e)

Phạm vi: KN-2 (Hiến chương/global-constraints) — ngưng tài khoản, đổi SĐT đăng nhập, đổi quyền, đổi vai, đặt lại/đổi PIN, gỡ Face ID → đóng
(mã 4003) các kết nối Bảng tin có nhãn `nguoi:<id đó>` trong < 2 giây; bật chế độ bảo trì → đóng MỌI kết nối. `ctx.dongBangTin` và trạm
(`dongCua`) đã có sẵn từ Task 4b/5 (bắn-và-quên, router tự `waitUntil` + bắt lỗi) — Task 6 chỉ GỌI nó ở đúng chỗ. Cùng lượt, làm hạ tầng e2e
Task 7 Bước 1 + Bước 3 và hai ca đầu của Bước 2 (ca 9, ca 10); ca 1–8 để dispatch sau viết tiếp trong `tests/e2e/bangtin.mjs` (đã đánh dấu rõ
"CA 1–8: TODO" ở đầu tệp, TRƯỚC "CA 9").

### Bước 1 — danh sách route (bằng lệnh, không theo trí nhớ)

```
grep -n "touchCredentialsStatement\|setPinStatement\|setPermissionStatements\|patch.active" src/modules/accounts/index.ts
```

Khớp đúng dự kiến của đặc tả (không lệch số dòng đáng kể so với `34b34cf`): `POST /api/account/change-pin` (:161), `POST
/api/account/passkeys/remove-all` (:247), `DELETE /api/account/passkeys/:id` (:260), `POST /api/account/pin-by-passkey` (:291), `PATCH
/api/staff/:id` (:433, khi `active: false` hoặc đổi SĐT), `PUT /api/staff/:id/permissions` (:485), `PUT /api/staff/:id/roles` (:522, đọc mã
xác nhận: đổi vai đọc `change.next` — kéo theo đổi quyền), `POST /api/staff/:id/reset-pin` (:570), `POST /api/staff/:id/passkeys/remove-all`
(:589). Cộng `PUT /api/maintenance` (`src/modules/maintenance/index.ts:46`, khi `input.on === true` → `dongBangTin("tat-ca")`). Hai route
lấy tuỳ chọn passkey (`POST /api/account/passkeys/options`, `POST /api/account/pin-by-passkey/options`) KHÔNG ghi gì (chỉ phát thách thức) —
không thuộc danh sách.

### Bước 2 (đỏ) — e2e trước khi thêm lời gọi

Viết `tests/e2e/bangtin.mjs` (mới) với hạ tầng (`moiPhien`, `dongHet`, `doiToiDa`, `taoTaiKhoanDungMotLan`) + ca 9 (tạm ngưng/kích hoạt lại) +
ca 10 (bảo trì) TRƯỚC khi thêm bất cứ lời gọi `dongBangTin` nào vào `accounts/index.ts`/`maintenance/index.ts`. `npm run test:e2e -- bangtin`:

```
✓ ca 9: tạm ngưng tài khoản → kết nối của nó đóng 4003 trong 2 giây; kết nối người khác vẫn mở; kích hoạt lại thành công
```
… không đúng — dòng thật:
```
AssertionError [ERR_ASSERTION]: ca 9: kết nối của tài khoản bị tạm ngưng phải đóng trong 2 giây
    at file:///…/tests/e2e/bangtin.mjs:63:12 {
  actual: null, expected: true, operator: '==', diff: 'simple'
}
✘ bangtin
E2E: 1/1 kịch bản LỖI
```
Đúng như dự kiến (chưa có lời gọi nào ở `accounts/index.ts`).

### Bước 3 (xanh) — thêm 9 lời gọi `ctx.dongBangTin`

Đưa `dongBangTin` vào phần giải cấu trúc handler của 8 route accounts (route đã dùng `(ctx) =>` thì gọi `ctx.dongBangTin`; route dùng
`({...}) =>` thì thêm `dongBangTin` vào tập giải cấu trúc — router truyền nó trong CHÍNH đối tượng `ctx`, không cần đổi kiểu tham số) + 1 route
`PUT /api/maintenance`. Vị trí: NGAY SAU câu ghi D1 cuối cùng của nhánh thành công, TRƯỚC `return` (route có 404 sớm như `DELETE
/api/account/passkeys/:id` thì gọi SAU điểm 404, chỉ trên đường thành công). Riêng `PATCH /api/staff/:id` chỉ gọi khi `patch.active ===
false || patch.phone !== undefined` (đổi tên đơn thuần không đóng kết nối — không phải "đổi thông tin đăng nhập"). Các route
`.../passkeys/remove-all` gọi VÔ ĐIỀU KIỆN trên đường thành công dù `removed` có thể là 0 — vì `touchCredentialsStatement` trong CÙNG batch
cũng chạy vô điều kiện (hành vi có từ trước Task 6, không đổi), nên đóng kết nối đúng theo nhịp "credentials_changed_at vừa được touch".

**Rủi ro thời gian chạy đã gặp (đúng như cảnh báo của kế hoạch — "chưa ai kiểm trạm qua socket thật"):** sau khi thêm 9 lời gọi, ca 9 vẫn ĐỎ
với cùng thông báo trên. Gắn tạm một `console.log` vào `dongCua` của `tram.ts` (đã gỡ trước khi commit) và đo bằng ba kịch bản debug viết tay
(chạy `wrangler dev` riêng trên D1 tạm, KHÔNG qua `npm run test:e2e`, xem lệnh ở dưới):
1. Xác nhận `dongCua` VẪN được gọi và tìm đúng 1 kết nối khớp (log trạm in ra ngay khi `PATCH` trả 200) — trạm không sai.
2. Đo bằng socket thô (`node:http` + sự kiện `upgrade`, tự đọc khung nhị phân): khung ĐÓNG (opcode 0x88, mã `0x0fa3` = 4003, lý do
   `cap-nhat-tai-khoan`) tới nơi chỉ **~20ms** sau khi API `PATCH` trả lời — kể cả khi kịch bản thử tự khép đúng khung đóng lại (viết một
   khung `0x88` có che, gọi `socket.end()`), sự kiện `close`/`end` ở tầng TCP của socket thô KHÔNG nổi lên trong 5–12 giây đã chờ.
3. Đo bằng `WebSocket` gốc của Node 22 (`new WebSocket(url, { headers })`) — bắt tay 101 đúng, cookie/Origin máy chủ THẤY được qua tuỳ chọn
   `headers` (đã kiểm bằng máy chủ `node:http` thử độc lập trước khi viết `moBangTin`) — nhưng sự kiện `close` chỉ nổi lên sau **~10 giây**
   nhất quán (đo lại nhiều lần), dù khung đóng đã tới máy chủ~gửi đi từ rất sớm.

**Kết luận:** đây là hạn chế của tầng TCP cục bộ (`wrangler dev`/Miniflare mô phỏng Durable Object hibernation) khi đóng một kết nối
WebSocket — khung ĐÓNG được trạm gửi đi gần như ngay (đúng KN-2 ở mức ứng dụng), nhưng việc kết thúc socket TCP bên dưới bị trễ cục bộ; sự
kiện `close` của `WebSocket` gốc Node 22 (và của socket thô nếu chỉ nghe `close`/`end`) phụ thuộc vào việc TCP kết thúc nên bị trễ theo,
không phải lỗi của mã máy chủ (`tram.ts`/`accounts/index.ts` không đổi gì thêm sau phát hiện này). Sửa bằng cách đổi HẲN `moBangTin`/`batTay`
(`tests/e2e/lib.mjs`) từ `WebSocket` gốc sang `node:http` + sự kiện `upgrade` + một bộ đọc khung WebSocket viết tay (`docKhungWs`, theo
RFC 6455: khung máy chủ không che, độ dài 7-bit/16-bit/64-bit) — `dong` (Promise) được coi là "đã đóng" ngay khi ĐỌC ĐƯỢC khung đóng (opcode
`0x8`, mã 2 byte + lý do), không đợi socket TCP thật sự kết thúc. Đo lại: ca 9/10 xanh, `dong` giải quyết trong vài chục ms sau khi API trả
lời — đúng mốc "< 2 giây" của KN-2 ở mức hành vi (khung đóng tới đúng lúc), không phụ thuộc trễ TCP cục bộ. `batTay` cũng đổi từ `fetch` sang
`node:http` (chỉ đọc `response`, không cần đọc khung) vì `fetch`/undici CẤM gửi header `Upgrade` (`InvalidArgumentError: invalid upgrade
header`) — cần header đó cho ca 10 (bắt tay lại có `Upgrade: websocket` nhưng bị 503 chặn trước khi nâng cấp).

Ba kịch bản debug (đã xoá, không còn trong repo) chạy `wrangler dev` riêng trỏ một D1 tạm khác (`/tmp/tourdao-dbg`, ngoài repo) — không đụng
D1 tạm của `npm run test:e2e`, không phải một cơ chế kiểm còn lại trong mã.

### Bước 3b — sửa lây `maintenance.mjs` (phát hiện khi chạy bộ rộng)

`bangtin.mjs` chạy TRƯỚC `maintenance.mjs` (tests/e2e/run.mjs) và ca 10 CŨNG gọi `PUT /api/maintenance` thật (bắt buộc — chỉ qua route mới
kích hoạt `dongBangTin("tat-ca")`) nên ghi thêm hai dòng nhật ký `maintenance_changed` (một Bật, một Tắt) VÀO CHUNG bảng `audit_log` của D1
tạm. `maintenance.mjs` cũ đếm TỔNG số dòng `maintenance_changed` từ đầu D1 tạm (`assert.equal(r.body.entries.length, 2, …)`) — chạy `npm run
test:e2e -- bangtin admin maintenance passkey roles permissions` lộ ra: `4 !== 2`. Thử xoá hai dòng ca 10 vừa tạo ở `finally` (`DELETE FROM
audit_log WHERE action = 'maintenance_changed'`) → gặp đúng hàng rào CSDL đã có từ trước (không phải hàng rào mới của Task 6):
```
✘ [ERROR] audit_append_only: nhật ký không được xoá: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_TRIGGER)
```
Xác nhận `audit_log` chỉ-thêm được CƯỠNG CHẾ bằng trigger SQL (không chỉ là quy ước ở CLAUDE.md §7), nên bỏ hướng xoá. Sửa đúng chỗ:
`maintenance.mjs` ghi một mốc thời gian (`moc`) NGAY TRƯỚC lần Bật CỦA CHÍNH NÓ, và ở bước "8) nhật ký" chỉ lọc + đếm dòng có `at >= moc` —
không còn giả định mình là nơi DUY NHẤT trong cả lượt chạy gọi `PUT /api/maintenance`. Không đổi ý nghĩa bài kiểm (vẫn đúng hai dòng, đúng
câu chữ, không lộ SĐT) — chỉ đổi cách CHỌN dòng nào là "của mình".

### Bước 3c — false alarm: thứ tự kịch bản tự chọn (không phải lỗi Task 6)

Chạy ĐÚNG NGUYÊN VĂN lệnh kiểm đề ra (`npm run test:e2e -- bangtin admin maintenance passkey roles permissions`) vẫn đỏ ở `permissions`
(401 khi đăng nhập `salesB`). Tái lập bằng `npm run test:e2e -- passkey permissions` (KHÔNG có `bangtin`/`admin`/`maintenance`, không đụng
gì của Task 6) → CÙNG lỗi. Nguyên nhân: `passkey.mjs` tự ghi rõ "CHẠY CUỐI CÙNG" và đổi PIN của `salesB`; chọn tay một tập con kịch bản theo
thứ tự KHÁC thứ tự chuẩn ở mảng `ALL` (nơi `permissions` luôn chạy trước `passkey`) làm lộ phụ thuộc thứ tự đã có từ trước — không phải hồi
quy do Task 6. Không sửa (ngoài phạm vi, không đụng file `permissions.mjs`/`passkey.mjs`); ghi lại ở đây để người kiểm không hiểu nhầm.

### Bước 4 — kết quả

```
npm test           → 862/862 (không đổi so với trước Task 6 — không thêm route, không thêm ô quyền)
npm run typecheck  → 0 lỗi (ba tsconfig)
node --test src/bang-tin-guard.test.ts src/route-write-guard.test.ts  → 21/21 (không đổi kết quả)
npm run test:e2e -- bangtin                                            → 1/1 xanh
npm run test:e2e -- bangtin admin maintenance passkey roles permissions → 5/6 xanh (permissions đỏ — Bước 3c, false alarm không do Task 6)
npm run test:e2e -- bangtin admin permissions maintenance roles passkey → 6/6 xanh (cùng tập, đúng thứ tự chuẩn)
npm run test:e2e (đủ bộ, mảng ALL đã thêm "bangtin")                   → 20/20 kịch bản xanh + audit-invariants ĐẠT (2 cảnh báo R-ORD-6a/6b
                                                                           không chặn phát hành, dữ liệu lịch sử — không liên quan Task 6)
```

### Thay đổi tệp

- `src/modules/accounts/index.ts`: 8 lời gọi `dongBangTin`/`ctx.dongBangTin` (đúng vị trí nêu ở Bước 3).
- `src/modules/maintenance/index.ts`: `PUT /api/maintenance` gọi `dongBangTin("tat-ca")` khi `input.on`.
- `tests/e2e/lib.mjs`: thêm `cho`, `moBangTin`, `batTay` (`node:http` + bộ đọc/viết khung WebSocket viết tay `docKhungWs`/`dungKhungWs` —
  xem lý do ở Bước 3).
- `tests/e2e/bangtin.mjs` (MỚI): hạ tầng (`moiPhien`, `dongHet`, `doiToiDa`, `taoTaiKhoanDungMotLan`) + ca 9 + ca 10; đánh dấu rõ chỗ để
  dispatch sau viết ca 1–8.
- `tests/e2e/run.mjs`: thêm `"bangtin"` vào `ALL` (sau `company`, trước `maintenance`) + `"--var", "BANG_TIN_HAN_GIAY:20"`.
- `tests/e2e/maintenance.mjs`: đếm nhật ký `maintenance_changed` theo mốc thời gian của chính nó (Bước 3b), không theo tổng số dòng.
- `tests/e2e/README.md`: thêm dòng `bangtin.mjs`.

### Việc để lại cho dispatch sau (ca 1–8, Task 7)

Viết tiếp trong `tests/e2e/bangtin.mjs`, đoạn đã đánh dấu "CA 1–8: TODO" — dùng lại `ADMIN`, `adminId`, `moiPhien`, `dongHet`, `doiToiDa`,
`taoTaiKhoanDungMotLan` đã có. `moBangTin`/`batTay`/`cho` (`lib.mjs`) đã kiểm chạy đúng qua ca 9/10 — bắt tay 101/401/403/426/503 (BT-1), đọc
tin JSON (`tin` — cho ca 3/4/5/6), gửi văn bản thô (`gui`, cho ca 7 gửi "ping"/rác) đều đã có sẵn cơ chế, chưa có ca nào dùng `gui`/đọc `tin`
thật (chỉ ca 9/10 dùng `dong`) — kiểm thêm khi viết ca 1–8.

**`docs/SO-HANG-RAO.md`:** hôm nay CHƯA có dòng nào cho Bảng tin (không dòng cho trạm/`dongCua`, không dòng cho hàng rào tĩnh
`bang-tin-guard`) — đã tự `grep` lại `docs/SO-HANG-RAO.md` để xác nhận (Vòng sửa 1, xem dưới; bản trước của mục này khẳng định sai là "đã có
dòng riêng từ Task 4b/5"). Theo kế hoạch, sổ hàng rào cho cụm Bảng tin là việc của **Task 11** (mục đã ghi ở Task 1/2/4a/4b/5 phía trên: dòng
cho `bang-tin-guard`, cho `KHONG_DB`/"tệp lớp DO", cho NT-3). Task 6 không dựng cơ chế chặn MỚI nào — chỉ GỌI hạ tầng đã có mã (trạm/
`dongCua`/`ctx.dongBangTin`, đã committed từ Task 4b/5); hành vi KN-2 (đóng 4003 khi đổi tài khoản, đóng mọi kết nối khi bật bảo trì) được
chứng minh bằng e2e đỏ-trước-xanh-sau ở ca 9/10 (Bước 2/3 phía trên) — **liệu bằng chứng đó có đáng thêm MỘT dòng riêng ở sổ hàng rào hay
không là quyết định của Task 11** (Task 6 không tự quyết, không tự ghi).

**Commit:** `Bảng tin: đóng kết nối khi đổi tài khoản/bảo trì (Task 6) + hạ tầng e2e ca 9–10 (Task 7)`.

**Vòng sửa 1 (kiểm độc lập):** sửa đoạn "`docs/SO-HANG-RAO.md`" trên — bản trước nói sai là trạm/`dongCua`/`bang-tin-guard` "đã có dòng
riêng từ Task 4b/5"; đúng ra sổ đó CHƯA có dòng nào cho Bảng tin, việc ghi (nếu cần) là của Task 11. Không đổi mã, không tự ghi
`docs/SO-HANG-RAO.md`.

## Mốc e2e sau Task 5 (commit d59aefc)

Lượt 1 của `npm run test:e2e`: 11/19 xanh — 8 kịch bản lỗi `503 turnstile_unavailable` lúc đăng nhập (mạng tới siteverify của Cloudflare, không phải lỗi mã). Chạy lại đúng 8 kịch bản đó: 8/8 xanh, tổng 19/19.

## Mốc e2e sau gộp main (commit 4b2847f, gộp bản 1.14 vào nhánh bang-tin)

- `npm test` 879/879; `npm run typecheck` 0 lỗi; `node --test "tests/audit/*.test.mjs"` 35/36 (chỉ đỏ ca sẵn có "P4 FINDING HDV").
- `npm run test:e2e` đủ bộ (log `.superpowers/sdd/2026-09-25-bang-tin-ke-hoach/e2e-after-merge.log`, dòng cuối `EXIT=0`): "E2E: 21/21 kịch bản xanh" = 20 kịch bản + `audit-invariants --strict` ĐẠT (2 cảnh báo lịch sử R-ORD-6a/6b, không chặn). Lúc này `bangtin` mới có ca 9–10.

## Task 7 — e2e ca 1–8 (2026-09-26)

Phạm vi: hoàn tất `tests/e2e/bangtin.mjs` — ca 1–8 đặt TRƯỚC ca 9/10 của Task 6, dùng lại `moiPhien`/`dongHet`/`doiToiDa`/`taoTaiKhoanDungMotLan`. Bước 1 (`moBangTin`/`batTay`) và Bước 3 (`run.mjs`: `"bangtin"` sau `company` trước `maintenance`, `--var BANG_TIN_HAN_GIAY:20`) đã làm ở Task 6. Không sửa mã máy chủ.

### Các ca
1. Bắt tay: không cookie 401; Origin lạ 403; vắng Origin 403; thiếu `Upgrade` 426; đúng → mở (101).
2. Chuẩn bị phiên salesA/salesB/kế toán/field + hai tài khoản chỉ-Đối tác dùng một lần.
3. salesA lập đơn → salesA/salesB/kế toán nhận đúng MỘT tin `tao` (khớp `maDon`, đúng 5 khoá) trong 2 giây; Đối tác không liên quan và field không nhận.
4. Đóng dòng HANDLE bằng SQL, salesB Nhận → văn phòng nhận `nhan`, field không; salesA giao cho field (FIELD làm được người phụ trách cấp hẹp, như `dispatch.mjs`) → field nhận `giao`; giao tiếp sang salesB → field nhận thêm một `giao` (người phụ trách TRƯỚC, NT-2).
5. Sáu route còn lại của DP-1, mỗi route một lần thành công (đúng một tin đúng `thayDoi`: `sua`, `chuyen`, `sua`, `xac_nhan`, `huy`, `tien`) + một lần 403/409 (không tin nào trong 1,5 giây); `PUT …/trip` và `PUT …/booker` thân "không đổi gì" cũng không tin. Mỗi lần ghi mở kết nối MỚI và đóng ngay.
6. Đối tác lập đơn → chính Đối tác + văn phòng nhận `tao_cho_nhan` (tài khoản chỉ Đối tác không tự thành người phụ trách), Đối tác thứ hai không nhận; kết nối bắt tay kèm header giả `x-bang-tin-nhan: ["tat-ca","cho-nhan"]` vẫn không nhận tin đơn của salesA (BT-2).
7. `ping` → `pong`; chuỗi rác không được đáp lại, không sinh tin, kết nối vẫn mở.
8. Hạn sống 20 giây → đóng mã 4001 sau ~20,0 giây (≤ 23), không đóng sớm, không phát gì. Chạy cuối ca 1–8.

### Thay đổi hạ tầng ngoài dự kiến của brief
`tests/e2e/lib.mjs`: `moBangTin` trả thêm `raw` (mọi khung văn bản thô). Lý do: "pong" tự động là khung văn bản bình thường nhưng `JSON.parse("pong")` ném lỗi nên không vào `tin` — ca 7 không quan sát được nếu thiếu `raw`. Các ca khác không dùng `raw`.

### Bằng chứng "đỏ" (ruling R14): viết sau mã, chứng minh đỏ bằng sửa cố ý — KHÔNG phải đỏ-trước-mã
Mã máy chủ đã có từ Task 4–5 nên không thể đỏ trước. Mỗi lần: sửa cố ý một tệp `src/**` → `npm run test:e2e -- bangtin` → chép dòng đỏ → `git checkout -- <tệp>` → xác nhận `git status` chỉ còn tệp `tests/e2e/*`.
1. Ca 3 — `src/shared/bang-tin.ts` `nhanKetNoi`: `if (false && can(staff, "order.view")) nhan.add("tat-ca")` (bỏ nhãn `tat-ca`):
   `AssertionError: ca 3: salesB phải nhận đúng một tin 'tao' (mã đơn khớp) trong 2 giây  at tests/e2e/bangtin.mjs:89` → `✘ bangtin`. Đã hoàn nguyên.
2. Ca 5 (route `PUT /api/orders/:id/trip`) — `src/modules/orders/index.ts`: thay `baoThayDoi({ orderId: id, thayDoi: "chuyen" });` bằng chú thích:
   `AssertionError: ca 5b PUT /api/orders/:id/trip thành công: phải nhận đúng một tin 'chuyen' trong 2000ms  at motTinDung … bangtin.mjs:148` → `✘ bangtin` (ca 3, 4, 5a vẫn ✓ trước đó). Đã hoàn nguyên.
3. Ca 6 (BT-2) — `src/modules/bangtin/index.ts`: bắt tay tin header `x-bang-tin-nhan` của trình duyệt thay vì `nhanKetNoi(staff)`:
   `AssertionError: ca 6 (BT-2): header giả 'x-bang-tin-nhan: ["tat-ca","cho-nhan"]' bị máy chủ bỏ qua — Đối tác vẫn không nhận tin đơn người khác  1 !== 0  at bangtin.mjs:326` → `✘ bangtin`. Đã hoàn nguyên.

### Kết quả xanh (mã máy chủ nguyên vẹn)
- `npm run test:e2e -- bangtin`: ✔ bangtin (48,2 s) — ca 1–10 đều ✓.
- `npm run test:e2e` đủ bộ: "E2E: 21/21 kịch bản xanh" (20 kịch bản + `audit-invariants --strict` ĐẠT, 2 cảnh báo lịch sử R-ORD-6a/6b); `bangtin` 48,0 s; ca 8 đóng sau 20008 ms. Không thấy chập chờn ở mốc 2 giây/1,5 giây trong các lượt xanh (lẻ + đủ bộ); các lượt đỏ có chủ đích dừng đúng ở ca dự kiến.

### Quan sát cho điều phối viên (không sửa, không có ca kiểm)
`POST /api/orders/:id/handler-money-edit`: khi thân "y nguyên số khách" thì `editMoneyAsHandler` trả `{ ok: true }` không ghi gì, nhưng route vẫn gọi `baoThayDoi(… "tien")` → phát một tin `tien` dù không đổi gì. DP-1 chỉ nêu ngoại lệ "không đổi gì" cho `trip`/`booker`, và brief Task 7 không đòi ca này nên e2e không khẳng định hành vi đó; nếu chủ muốn nhánh này cũng im lặng thì đó là việc sửa mã ở Task riêng.

### Bổ sung vòng sửa 1 (2026-09-26)

- **Sự thật về một lượt bị ngắt:** lượt chạy sửa cố ý của ca 3 bị ngắt giữa chừng do lỗi tài khoản (403 oauth). Dòng đỏ của ca 3 ở trên lấy từ lượt bị ngắt đó (kết quả chạy nền vẫn ghi ra tệp); sửa cố ý sót lại ở `src/shared/bang-tin.ts` do điều phối viên hoàn nguyên bằng `git checkout` trước khi chạy tiếp. Hai lần đỏ còn lại (ca 5b, ca 6) chạy sau đó, liền mạch.
- **Kiểm âm ca 5 — trạng thái chứng minh đỏ:** vòng đầu chỉ chứng minh đỏ cho kiểm DƯƠNG của ca 5 (xoá lời phát `chuyen`) và ca 3, ca 6. Các kiểm ÂM (403/409 và "không đổi gì" của trip/booker) chưa có bằng chứng đỏ. Vòng này thử thêm MỘT sửa cố ý: `src/modules/orders/index.ts`, nhánh "không đổi gì" của `PUT /api/orders/:id/trip` cũng gọi `baoThayDoi(… "chuyen")` → `npm run test:e2e -- bangtin`: ca 1–5a ✓, rồi `AssertionError: ca 5b PUT /api/orders/:id/trip 'không đổi gì': không tin nào trong 1500ms  1 !== 0` → `✘ bangtin`. Hoàn nguyên bằng `git checkout -- src/modules/orders/index.ts`, `git status` chỉ còn tệp `tests/e2e/*`. **Vẫn CHƯA chứng minh đỏ** cho: kiểm âm "không đổi gì" của `PUT …/booker`, các kiểm âm 403/409 của 5a/5b/5c/5d/5e/5f (chỉ suy từ cùng khuôn `khongTinNao`, chưa quan sát riêng).
- **Đổi ở `bangtin.mjs`:** ca 6 kiểm âm BT-2 nay có đối chứng dương (`pOffice` phải nhận tin của đơn r2) rồi chờ 1500 ms mới khẳng định 0 (trước chỉ chờ 500 ms, không đối chứng); ca 3, ca 4, `motTinDung` (ca 5) chờ ổn định 300 ms sau tin đầu rồi mới khẳng định "đúng MỘT tin" để lần phát đôi không lọt. Mốc "< 2 giây" của tin đầu không đổi.
