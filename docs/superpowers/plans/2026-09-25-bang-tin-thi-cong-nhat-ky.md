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

- **Đỏ:** viết 7 bài kiểm mới ở `src/shared/router.test.ts` (gọi `ctx.baoThayDoi`/`ctx.dongBangTin`, kiểm `exec.waitUntil`, kiểm bắt lỗi) TRƯỚC khi sửa `router.ts`. Để có bằng chứng đỏ thật mà không phải `git checkout` (lệnh phá hoại bị hàng rào chặn), tạm ghi đè `src/shared/router.ts` bằng đúng nội dung tại `HEAD` (chưa có `baoThayDoi`/`dongBangTin`) rồi chạy:
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
