# Nhật ký thi công — HDV Từ chối/Huỷ đơn (ADR-0030 lượt 1) — Task 0 + Task 0.1

- **Kế hoạch:** `.superpowers/sdd/2026-09-27-tu-choi-huy-hdv-thi-cong/briefs/common.md`, `briefs/task-0-brief.md`.
- **Nhánh:** `thi-cong-tu-choi-huy-hdv`, worktree `bang-tin`, base `origin/main` **cf2264c** ("Gộp main (ADR-0030/0020/0023 accepted) vào nhánh kế hoạch thi công").
- **Vai:** người thi công (không tự nghiệm thu — N8). Task 0 bước 1–2 do điều phối làm trước, ghi ĐÃ XONG trong lệnh giao việc; người thi công chỉ làm từ bước 3.

## 1. Task 0 bước 3 — Mốc test ban đầu

Máy đã có `node_modules` sẵn, không cần `npm ci`.

| Lệnh | Kết quả |
|---|---|
| `npm test` | **952/952 xanh** (mốc mới; kế hoạch ghi 945/945 ở `a74048e`, tăng lên vì `cf2264c` đã gộp thêm nội dung ADR-0030/0020/0023 + các bản 1.19/1.20 từ main) |
| `npm run typecheck` | thoát mã 0 (`tsc --noEmit` gốc + `web` + `web/sw`), không có dòng lỗi |
| `node --test "tests/audit/*.test.mjs"` | 35/36 — **1 ca đỏ sẵn từ trước, không do nhánh này**: `P4 FINDING HDV: tài khoản chỉ quyền Hướng dẫn viên không mở được đơn nào...` (`tests/audit/doi-tac.test.mjs:79-87`) kỳ vọng gán HDV làm người phụ trách trả `400`, thực tế trả `200`. Đã xác nhận qua nhật ký cũ `docs/superpowers/plans/2026-09-25-gd2-thi-cong-nhat-ky.md` §5: ca này "đã đỏ sẵn từ trước trên 86b2a60 …, không do nhánh này; thuộc phần D". Nguyên nhân cụ thể: ADR-0014 điều 6 đã cho FIELD/HDV được gán làm người phụ trách (cấp hẹp) — dòng e2e "FIELD nay gán được làm người phụ trách (ADR-0014 điều 6, cấp hẹp)" ở bộ `dispatch` (mục 5 dưới) xác nhận hành vi này đang chạy đúng theo ADR, còn bài `P4 FINDING` chưa cập nhật lại kỳ vọng theo ADR đó. Không thuộc phạm vi Task 0/0.1, không sửa ở đây; ghi lại để điều phối biết bài này cần cập nhật khi làm phần liên quan (D6/việc gán handler) hoặc một task dọn audit riêng. Chạy lại SAU khi sửa mã Task 0.1 (mục 4 dưới): vẫn 35/36, cùng đúng một ca này — không phát sinh ca đỏ mới. |

**Ca đo CPU `src/claude-guard.test.ts`:** nằm trong 952 ca của `npm test` ở trên và đã **xanh** — không đỏ do máy bận lúc chạy, nên theo brief KHÔNG cần ghi `uptime` (chỉ ghi khi ca này đỏ). Không sửa tệp này.

## 2. Task 0 bước 4 — Nhánh chưa gộp chạm cùng tệp

Lệnh: `git branch -r --no-merged origin/main` (sau `git fetch --all`).

Kết quả: **chỉ một nhánh remote chưa gộp** — `origin/kiem-toan-doi-tac`.

```
git diff --stat origin/main...origin/kiem-toan-doi-tac -- src/shared/permissions.ts src/shared/bang-tin.ts src/shared/router.ts src/index.ts src/modules/dispatch src/modules/orders web/account.ts web/order.ts web/order-form.ts
```
→ **không có gì** (không đụng tệp nào trong danh sách).

Đối chiếu thêm (không nằm trong lệnh bắt buộc, chỉ để hiểu rõ nhánh): `git log origin/main..origin/kiem-toan-doi-tac` chỉ có **1 commit** (`f9631c9` "Ghi ý tưởng backlog: công cụ tự động bấm-thử giao diện"), đổi đúng 1 dòng ở `docs/HANDOFF-N1.md`.

**Kết luận cho điều phối:** không có nhánh remote nào đang tranh chấp các tệp mà kế hoạch ADR-0030 lượt 1 sẽ sửa (`permissions.ts`, `bang-tin.ts`, `router.ts`, `index.ts`, `modules/dispatch`, `modules/orders`, `web/account.ts`, `web/order.ts`, `web/order-form.ts`). Thứ tự gộp không bị chặn bởi nhánh nào khác hiện có trên remote.

Ghi chú: lệnh brief yêu cầu chỉ xét nhánh **remote** (`git branch -r`). Có nhiều nhánh **local** chưa gộp trong worktree này (`a0-danh-muc-cho-lap-don`, `canh-bao-don-trung`, `gop-trang-chu-moi`, `kiem-toan-doi-tac`, `kiem-toan-ontology`, `ra-soat-luat-goc`, `sua-khung-dang-tai`, `trang-thai-1-12`, `worktree-doi-ten-khai-niem`, `worktree-kiem-tra-giao-dien`, `worktree-thong-bao-he-thong`, `dang-nhap-sat-day-cho-gop`, `claude/tourdao-sales-audit-62ea81`) — không kiểm theo brief, chỉ nêu tên để điều phối biết nếu cần tra thêm.

## 3. Task 0 bước 6 — T3b

T3b: không áp dụng — ADR-0030 không thêm bảng.

## 4. Task 0.1 (T1d) — Khoá lạc quan cho câu huỷ

**Lỗi tìm thấy (T0-1):** `cancelOrder` (`src/modules/orders/repository.ts:716-723`) nhận `prevUpdatedAt`, tính `at = nextStamp(prevUpdatedAt)`, nhưng câu `UPDATE` chỉ khoá `WHERE id = ? AND status = ?` — **không** có `AND updated_at = ?`. Một request khác đổi `updated_at` (ví dụ `PUT /trip`) chen giữa lúc route đọc và lúc gọi `cancelOrder`, không đổi `status`, vẫn để huỷ thành công với mốc cũ.

### Bước 1 — Đỏ trước

Tệp: `src/modules/orders/cancel-lock.test.ts` (mới, SQLite thật dựng từ `migrations/*.sql`, fakeD1 hỗ trợ `batch()` như `dispatch/service.test.ts`). 3 ca: (1) mặc định `cancelled`, (2) đường HDV `order_cancelled_by_field`, (3) đối chứng dương (mốc đúng vẫn huỷ được, giữ hành vi cũ).

Chạy `node --test src/modules/orders/cancel-lock.test.ts` trên mã **chưa sửa** → **ĐỎ 2/3** (ca đối chứng dương xanh ngay):

```
not ok 1 - cancelOrder: request PUT /trip chen giữa đổi updated_at (KHÔNG đổi status) → huỷ với mốc CŨ (M1) phải thua khoá lạc quan...
  error: huỷ với mốc cũ phải thua khoá lạc quan
  expected: false
  actual: true

not ok 2 - cancelOrder: ca 'order_cancelled_by_field' (đường huỷ hẹp của HDV, ADR-0014 điều 11) cũng thua khoá lạc quan như ca mặc định
  error: huỷ với mốc cũ (đường HDV) phải thua khoá lạc quan
  expected: false
  actual: true

ok 3 - cancelOrder: huỷ với mốc ĐÚNG ...
# tests 3, pass 1, fail 2
```

### Bước 2 — Mã

Thêm `AND updated_at = ?` (bind `prevUpdatedAt`) vào câu `UPDATE` của `cancelOrder`. Giữ `nextStamp(prevUpdatedAt)` và nhật ký `changes() > 0` nguyên vẹn. Không đổi chữ ký hàm.

### Bước 3 — Chú thích

Ba chỗ khẳng định optimistic lock đã hoạt động (đúng ở LỜI VĂN nhưng SAI so với mã trước khi sửa — mã trước chỉ khoá theo `status`) được làm rõ **khoá theo `status` VÀ `updated_at`**:
- `src/modules/orders/index.ts:59-61` (`findOrderOwner`)
- `src/modules/orders/index.ts:85-89` (`cancelOrderByHandler`)
- `src/modules/dispatch/index.ts:159-163` (route `handler-cancel`)

### Bước 4 — Hai đường route (đọc lại, không sửa)

- `POST /api/orders/:id/status` (`src/modules/orders/index.ts:337`): `if (!(await cancelOrder(env.DB, id, staff.id, from, meta.updatedAt))) return RACED();` — thua khoá lạc quan → `RACED()` → 409 `invalid_transition`. Đúng T0-2.
- `POST /api/orders/:id/handler-cancel` (`src/modules/dispatch/index.ts:164-176`): gọi `cancelOrderByHandler(env.DB, orderId, staff.id, order.updatedAt, ...)`; `order.updatedAt` đọc từ `findOrderOwner` ngay trước đó (dòng 167) — nếu `updated_at` đã đổi (PUT /trip chen giữa) thì thua khoá lạc quan → `ok=false` → xem nhánh dưới dòng 175 (đọc lại `findOrderOwner`, nếu `status` vẫn `confirmed` thì trả `HANDLER_RACED()` → 409 `stale`). Ca harness/e2e ở mức HTTP không dựng (tuỳ chọn theo brief, khó tái hiện ổn định); xác nhận bằng đọc mã tĩnh như trên.

### Bước 5 — Thấy chặn thật (P16)

Bỏ tạm `AND updated_at = ?` (đổi câu `UPDATE` về `WHERE id = ? AND status = ?` như trước khi sửa) → chạy `node --test src/modules/orders/cancel-lock.test.ts` → **đỏ lại đúng 2/3 ca** (ca 3 đối chứng dương vẫn xanh):

```
not ok 1 - cancelOrder: request PUT /trip chen giữa đổi updated_at (KHÔNG đổi status) → huỷ với mốc CŨ (M1) phải thua khoá lạc quan...
  location: cancel-lock.test.ts:95:1
  error: huỷ với mốc cũ phải thua khoá lạc quan
  expected: false
  actual: true
  operator: strictEqual
  stack: TestContext.<anonymous> (cancel-lock.test.ts:103:10)

not ok 2 - cancelOrder: ca 'order_cancelled_by_field' ... cũng thua khoá lạc quan như ca mặc định
  error: huỷ với mốc cũ (đường HDV) phải thua khoá lạc quan
  expected: false
  actual: true
  stack: TestContext.<anonymous> (cancel-lock.test.ts:115:10)
```

Cả hai đỏ dừng ngay ở dòng `assert.equal(ok, false, …)` (103/115) — **trước khi** chạy tới `orderRow`/`auditCount`, nên không liên quan gì tới việc `orderRow` từng phải sửa (xem chú thích dưới). Hoàn nguyên (thêm lại `AND updated_at = ?`, bind `prevUpdatedAt`) → chạy lại → **xanh 3/3**. Đã quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên → xanh), đúng P16. Dòng sổ hàng rào (`docs/SO-HANG-RAO.md`) sẽ ghi ở Task 1.9 của kế hoạch lượt 1 (không ghi ở Task 0 này theo brief).

**Ghi chú viết test (không phải hành vi mã, để người sau khỏi phải dựng lại):** ngay SAU khi sửa mã (bước 2), lần chạy lại ĐẦU TIÊN vẫn đỏ ở ca 1 — nhưng KHÔNG cùng lý do bước 1: `ok` lúc này đã đúng là `false` (mã đã sửa hoạt động), lỗi mới nằm ở CHÍNH tệp test — `assert.deepEqual` (map sang `deepStrictEqual`) so sánh object không-prototype do `node:sqlite` `.get()` trả về với object literal thường, lệch prototype nên báo lỗi dù giá trị từng trường khớp nhau. Sửa hàm `orderRow` (spread ra object thường) rồi chạy lại → xanh 3/3, TRƯỚC KHI làm bước 5 (đột biến). Vì vậy khi làm bước 5 (bỏ tạm khoá), `orderRow` đã ở dạng đúng từ trước; đỏ ở bước 5 tái hiện đúng thông báo "true !== false" của bước 1 (dừng ở dòng `assert.equal(ok, false, …)`, TRƯỚC dòng gọi `orderRow`), không liên quan gì tới lỗi prototype đã sửa.

### Bước 6 — Kết quả sau khi sửa

| Lệnh | Kết quả |
|---|---|
| `node --test src/modules/orders/cancel-lock.test.ts` | 3/3 xanh |
| `npm test` | 955/955 xanh (952 + 3 ca mới của `cancel-lock.test.ts`) |
| `npm run typecheck` | thoát mã 0, không lỗi |
| `node --test "tests/audit/*.test.mjs"` (chạy lại SAU khi sửa mã) | 35/36 — vẫn đúng một ca `P4 FINDING HDV` đỏ sẵn từ trước (mục 1), không phát sinh ca đỏ mới do khoá lạc quan |
| `npm run test:e2e -- orders dispatch trip` | có mạng, đã chạy: **3/3 kịch bản xanh** (`orders` 12.8s, `dispatch` 67.8s, `trip` 20.3s) — không có ca nào đỏ liên quan tới huỷ đơn/khoá lạc quan. |

**Kiểm thêm (advisor gợi ý):** `orders.updated_at` khai `NOT NULL` ngay từ `migrations/0003_orders.sql:19` và không có migration nào rebuild lại bảng `orders` sau đó — thêm `AND updated_at = ?` vào `WHERE` không có rủi ro NULL không bao giờ khớp.

**Chưa kiểm:** kịch bản Chrome không chạy (Task 0.1 không sửa tệp giao diện nào, chỉ `repository.ts`/`index.ts` server + chú thích, nên không thuộc diện phải chạy lại Chrome theo `web/CLAUDE.md`). `node scripts/audit-invariants.mjs --db local` sau e2e KHÔNG chạy riêng trong phiên này (script `test:e2e` chỉ tự chạy audit-invariants khi chạy đủ mọi kịch bản, không phải tập con `orders dispatch trip`). Người kiểm độc lập cần tự xác nhận lại theo N8 (người thi công không tự nghiệm thu).

## 5. Task 1.3 — Đơn mới không tự gắn người lập; chọn HDV lúc lập (S20-4, ADR-0020 điều 1, Q-C)

Commit mã **86c53f4**; commit đề xuất tệp luật **e32309c** (`docs/superpowers/proposals/2026-09-27-hook-newOrderHandler.md`, chờ chủ duyệt — N9). Hook mới: `ctx.newOrderHandler(staffId)` (thay `ctx.defaultHandlerStatement`).

**Đỏ trước** — `node --test src/modules/orders/don-moi-chon-hdv.test.ts` trên mã d12af2b: **đỏ 7/7**, ví dụ:

```
not ok 1 - (1) lập đơn KHÔNG chọn hướng dẫn viên → không có dòng HANDLE nào, nhật ký chỉ 'created' — …
  error: Bán hàng: đơn mới không có dòng phân công nào (không tự gắn người lập — ADR-0030 S20-4)
  expected: 0   actual: 1
not ok 5 - (3) chọn người KHÔNG đủ điều kiện … → 400 invalid_assignee, KHÔNG có đơn nào được tạo
  expected: 400   actual: 201
not ok 7 - (4) Thực tập, Đối tác gửi kèm handlerStaffId → 403 …
  expected: 403   actual: 201
```

`tests/audit/redteam.test.mjs` sau khi đổi mã (trước khi sửa bài): `R3b … Cannot read properties of null (reading 'name')`; `R4 … expected: 409 actual: 200` — đúng hai dòng của bảng "Bài kiểm đổi kỳ vọng"; sửa bằng Nhận tường minh sau khi lập.

**Ràng buộc `at` (hệ thống Thông báo):** giữ — `createOrder` sinh MỘT `at` mỗi lần thử, đưa vào `orders.created_at`, dòng `created` và `alsoCreate(id, at)`; `newOrderHandler` trả `statements(orderId, at)` không đọc đồng hồ. Có dòng `order_handler_changed` ("từ chưa có người phụ trách sang <tên>") trong CÙNG lô, cùng `at`, theo brief Task 1.3 + ADR-0030 S20-4 — đúng ý định của kế hoạch (một ghi chú "Phối hợp" trước đó ở mục dưới nói ngược lại, đã được đính chính, xem mục "Phối hợp với nhánh khác" cuối tệp).

**Thấy chặn thật (3 đột biến, đều hoàn nguyên từ bản sao, `diff -q` sạch):** (a) luôn gọi `createOrder` khi hook không đạt → `not ok 5 … 201 !== 400`; (b) bỏ cổng `dispatch.assign` → `not ok 7 … Thực tập — HDV hợp lệ: … 201 !== 403`; (c) cộng 1 ms vào `at` trong hook → `not ok 3 … expected '2026-09-27T10:00:44.904Z' actual '2026-09-27T10:00:44.905Z'`. Ba dòng mới ở `docs/SO-HANG-RAO.md`.

**Ngoài bảng "Bài kiểm đổi kỳ vọng"** (cùng lớp "không còn tự gắn người lập"; chỉ khôi phục điều kiện trước, không đổi giá trị kỳ vọng): `tests/e2e/permissions.mjs` (người lập Nhận trước dòng "409 stale"; `mOrder` lập kèm chính M để ca "người phụ trách đã nghỉ" giữ nghĩa); `tests/e2e/bangtin.mjs` ca 3 (lập kèm salesB → vẫn phát `tao`, "đúng MỘT tin" nay còn chứng minh không có `giao`), ca 4 (bỏ câu SQL đóng dòng — thành thừa). Kịch bản Chrome `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`: bỏ câu SQL đóng dòng phụ trách của R2 (carry của Task 1.2), giữ đáp án SQL tự tính.

**Kết quả:** `npm test` 975/975; `npm run typecheck` 0 lỗi; `tests/audit` 35/36 (chỉ P4 FINDING HDV đỏ sẵn — cùng lý do cũ: FIELD giao được từ ADR-0014 Phase B); `npm run test:e2e` đủ bộ **21/21** kèm `audit-invariants` (chạy riêng `permissions` hoặc `orders dispatch permissions bangtin` thì `permissions` đỏ `catalog_unavailable` ZE1 vì `GET /api/catalog` của kế toán tự kéo Sheet thật khi D1 tạm chưa từng đồng bộ — không do Task 1.3: `npm run test:e2e -- catalog permissions` → 2/2 xanh; theo thứ tự đủ bộ thì xanh); kịch bản Chrome bản gốc **TRANG CHU SMOKE OK 41 bước** (không còn lỗi tương phản "System" — không cần bản tạm), `unassignedCount=3` = đáp án SQL.

**Chưa làm / để task sau:** `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` (giả định người lập là người phụ trách — nhãn thuộc Task 1.7) chưa chạy lại; giao diện chọn HDV trong form (Task 1.8, chờ thiết kế).

## 6. Task 1.5 — Quyền HDV, hàng chờ nhận, ba đường xem (S23-1…5, S20-6, S20-12)

Hai commit mã: **dcba739** (a — `order.pool.view` + route `GET /api/orders/pool` + `pool.ts` + `PoolOrderDto`; FIELD chưa qua cổng, chỉ Toàn quyền gọi được; 74 route) và **eccf6d8** (b — bốn ô FIELD + `dispatch.claim` FIELD + `ORDERS_GATE` có FIELD + nhánh lọc thứ ba + chi tiết 404 + `seesOnlyAssignedOrders` + mọi bài đổi kỳ vọng R1 của bảng + 3 dòng sổ hàng rào). Hai commit đều tự xanh (`npm test` 991 sau (a), 1002 sau (b)).

**Đỏ trước (a)** — trên mã c38c224: `pool.test.ts` `ERR_MODULE_NOT_FOUND … pool.ts`; harness `GET /api/orders/pool` (Toàn quyền) `{"error":{"code":"not_found","message":"Không tìm thấy đơn."}}` `404 !== 200` — đúng bẫy Review Focus 3 (route `:id` nuốt chữ "pool"); ca ai-thấy-hàng-chờ `404 !== 403`; ghim dòng PARTNER (thiếu `order.pool.view`); route-access (74) và bảng ADR (27 thao tác) đỏ.

**Đỏ trước (b)** — trên mã dcba739: 21 ca, ví dụ HDV `GET /api/orders/pool` → `{"error":{"code":"forbidden","message":"Tài khoản này không dùng được màn hình đơn."}}` `403 !== 200`; HDV `GET /api/orders` `403 !== 200`; chi tiết đơn không phụ trách `403 !== 404`; audit `P4` `403 !== 200`, `R5` `403 !== 200`; `permissions.test.ts` đỏ khi nạp (chưa có `seesOnlyAssignedOrders`).

**Thấy chặn thật (4 đột biến, hoàn nguyên từ bản sao, `diff -q` sạch):** (1) `money.view` FIELD `none` → 6 ca đỏ, gồm `not ok 17 - ADR-0030 L1-3 (d)` `403 !== 200` và `cong-quyen` `money.view lệch order.view ở FIELD 'none' !== 'assigned'`; (2) thêm `customerPhone` vào `toPoolOrder` → `not ok 1 - phần hẹp: đơn điền ĐỦ MỌI TRƯỜNG` `+ 'customerPhone'` (harness vẫn xanh vì SQL không đọc cột SĐT — lớp 1 giữ); (3) bỏ `|| holdsPartner(staff)` ở route pool → `not ok 10 - … (L1-5)` `aaaaaaaa-… {"orders":[…]}` `200 !== 403`; (4) `listOrders` bỏ điều kiện khi mảng rỗng → `not ok 15 - … KHÔNG phụ trách đơn nào → … DANH SÁCH RỖNG` + audit P4. Thêm: dòng Bảng tin (NT-3) nay tự bắt lỗi trên bảng quyền thật — đột biến chỉ `nhanSuKien` (không đụng `MATRIX`) → 3 ca đỏ; ghi bổ sung ở dòng đó của `docs/SO-HANG-RAO.md`.

**Kết quả:** `npm test` 1002/1002; `npm run typecheck` 0 lỗi; `node --test "tests/audit/*.test.mjs"` **36/36** — nợ cũ `P4 FINDING HDV` dọn xong (đổi thành "P4 (đã sửa, ADR-0014 điều 6 + ADR-0030 S23-4)": danh sách 200 rỗng, chi tiết đơn không phụ trách 404, Quản trị giao → 200 rồi thấy đúng đơn đó).

**e2e (`npm run test:e2e` đủ bộ, sau (b)):** 17/21 xanh, `audit-invariants --strict` đạt. Đỏ 4 kịch bản, mỗi kịch bản dừng ở khẳng định đỏ ĐẦU TIÊN:
- `orders.mjs:264` FIELD mở đơn `404` (đòi 403) — dòng bảng R1 `orders.mjs:264`.
- `dispatch.mjs:189` FIELD tự nhận đơn đã có người `409` (đòi 403) — dòng bảng R1 `dispatch.mjs:151-164` (số dòng đã dời).
- `permissions.mjs:37` FIELD `GET /api/orders` `200` (đòi 403) — dòng bảng R1 `permissions.mjs:28-41`.
- `bangtin.mjs:126` CA 4 "field chưa liên quan tới đơn, chưa nhận tin nào" `1` (đòi 0) — **KHÔNG có trong bảng**: HDV nay có nhãn `cho-nhan` nên nhận ĐÚNG MỘT tin `nhan` lúc đơn rời hàng chờ (luật (b) S20-8, L1-9 "ngoại lệ duy nhất") — đúng thiết kế đã duyệt; hai khẳng định đếm sau đó của CA 4 (1 → 2, 2 → 3) cùng lý do. Không sửa (luật "đỏ ngoài bảng: báo điều phối").

**Chẩn đoán tạm (không commit, hoàn nguyên, cây sạch):** (i) chỉ đổi 3 khẳng định đếm của CA 4 sang kỳ vọng mới → `bangtin` 1/1 xanh, **CA 11a, 11b xanh**; (ii) chỉ đổi các dòng đã biết của bảng (orders:264 → 404; dispatch:189 → 409; dispatch:237 FIELD nhận đơn riêng → 200; permissions fieldDenied → danh sách 200/chi tiết 404/hàng chờ 200) cộng `permissions.mjs:120` → `orders catalog dispatch permissions` 4/4 xanh. Nghĩa là ngoài các dòng bảng, chỉ còn **hai chỗ ngoài bảng**: `bangtin.mjs` CA 4 (3 khẳng định) và `permissions.mjs:120` ("bỏ ACCOUNTING → mất quyền xem đơn ngay": tài khoản chỉ-FIELD nay 200 danh sách rỗng — cùng nghĩa dòng fieldDenied nhưng không nằm trong số dòng của bảng). Để Task 1.9 sửa sau khi điều phối xác nhận.

**Ruling người thi công (bề mặt, đảo ngược được):** che = thay từng chữ số bằng "•", giữ dấu ngăn; dấu ngăn thêm ngoặc đơn, dấu cộng, gạch dài (chặt hơn Q-N — số bàn "(0258) 3521 234" lọt nếu không thêm); che cả tên dịch vụ (dịch vụ nhập tay là chữ tự do); thứ tự hàng chờ: ngày đi gần nhất trước, chưa có ngày xuống cuối, hoà theo mã đơn; `departDate` = ngày khởi hành lớn nhất (cùng định nghĩa `tripDeparted`); SQL lọc thô tập cha (ngày ≥ hôm nay hoặc không có ngày) + luật quyết định ở `toPoolOrders`; `listOrders.orderIds` bắt buộc, `[]` = không đơn nào; audit P4 thêm ca "giao → thấy đơn" (nợ ADR-0014 điều 6).

## Phối hợp với nhánh khác (Thông báo hệ thống) — ghi 2026-09-27, điều phối

Một phiên AI khác đang làm nhánh `worktree-thong-bao-he-thong` (kế hoạch Thông báo hệ thống, số migration 0025, **CHƯA có mã, đang chờ chủ duyệt**) báo trước các chỗ hai nhánh sẽ đụng khi gộp. Đây là ghi chú điều phối, KHÔNG phải chủ dự án ra lệnh, KHÔNG đổi phạm vi lượt 1 của kế hoạch này — chỉ để người thi công các Task 1.3/1.4 và người gộp sau này biết mà tránh xung đột hoặc mất luật. Ghi nguyên các điểm chạm, áp dụng khi tới Task tương ứng hoặc lúc gộp:

- **Tệp chung sẽ đụng:** `src/modules/dispatch/index.ts` (route `PUT /api/orders/:id/handler`), `src/shared/bang-tin.ts`, `src/route-access.test.ts` (đếm route — hai phía đều +N, phải cộng cả hai khi gộp), `src/shared/audit-actions.ts`, `src/shared/permissions.ts` (MATRIX) + `permissions.test.ts`, `src/shared/contracts.ts`, `public/app.css`, `web/shell.ts` (`navGroups`), `web/account.ts`, `tests/e2e/dispatch.mjs`, `src/architecture.test.ts`, `src/index.ts`, `docs/quyen-hoan.json`, `docs/SO-HANG-RAO.md`.
- **Một nguồn luật cho hộp thông báo:** phía Thông báo dự kiến hàm `locHopThongBao` lọc bằng `nhanKetNoi(staff)` + `duocThayTinDon`. **Ruling áp cho Task 1.4 của kế hoạch NÀY:** đặt luật "tài khoản lai không nhận tin" (`!holdsPartner`) NGAY TRONG `nhanKetNoi` (đúng như Task 1.4 đã viết sẵn) — nếu bên Thông báo gộp trước, phải sửa `duocThayTinDon`/`thongBaoNoi` của họ để dùng lại `nhanKetNoi` chung, không viết luật lai riêng thêm lần hai.
- **Task 1.3 (chọn HDV lúc lập) — ràng buộc thêm khi có hộp thông báo:** dòng `dsp_assignment` có `task_kind_code = 'HANDLE'` lúc lập, cột `valid_from_at`, phải BẰNG `created_at` của dòng `audit_log` hành động `created` (cùng một biến `at` cho cả hai câu trong lô lập đơn). Lô lập đơn CÓ ghi `order_handler_changed` (`describeHandlerChange(null, <tên>)`, `changes() > 0`) — đúng theo brief Task 1.3 + ADR-0030 S20-4, cùng mốc `at` với dòng `created`; phía Thông báo sẽ bỏ qua dòng `order_handler_changed` có cùng mốc với dòng `created` của cùng đơn, nên không hiện tin "giao" sai. (Đính chính 2026-09-27: câu ghi lần trước ở đây — "không tạo dòng `order_handler_changed` riêng cho lúc lập" — SAI, đã bỏ; bài harness của Task 1.3 khoá ràng buộc `at` bằng đột biến +1 ms → đỏ, coi là đủ.) Lý do giữ ràng buộc `at`: hộp thông báo xếp "chờ nhận" khi `MIN(valid_from_at)` của HANDLE (`v_dsp_first_handler.first_at`) lớn hơn `created_at` của dòng `created`; lệch 1 mili-giây là mọi HDV nhận tin "chờ nhận" sai cho đơn đã chọn HDV lúc lập. Hôm nay `defaultHandlerStatement(db, who, orderId, at)` đã dùng chung `at` — dạng mới ở Task 1.3 (`newOrderHandler`) giữ đúng như vậy, không tự đọc đồng hồ.
- **Phép thử (b) cho người kiểm độc lập của nhánh gộp sau** (sửa theo đính chính): lập đơn có chọn HDV → hộp thông báo hiện đúng MỘT tin "lập", không có tin "chờ nhận", không có tin "giao" — phép thử này chỉ ĐẠT khi phía Thông báo đã gộp và có luật lọc dòng `order_handler_changed` trùng mốc `created`; nếu nhánh Thông báo chưa gộp lúc kiểm lượt 1 của ADR-0030, người kiểm ghi "chưa kiểm được (chờ nhánh Thông báo)", không coi là trượt.
- **Đề xuất luật `e32309c`** (`src/CLAUDE.md` dòng 15, `docs/ARCHITECTURE.md` Phần II dòng 183, theo tên hook `ctx.newOrderHandler`): đã chuyển cho chủ dự án duyệt (N9 — AI không tự sửa luật chi phối mình). CHƯA áp dụng cho tới khi chủ duyệt trực tiếp.
- **Từ chối (R2, `order_handler_refused`):** phía Thông báo nói hành động này CHƯA có trong view `v_aud_order_event` của migration 0025 của họ — nghĩa là khi Lượt 2 của kế hoạch này thêm route Từ chối, tin "Từ chối" có thể KHÔNG lên chuông thông báo tự động. Đây là câu hỏi liên-nhánh, để chủ quyết lúc gộp, KHÔNG tự thêm migration ở nhánh này để né.
- **Khi gộp (bất kể nhánh nào gộp trước):** trang ghép của lượt đang gộp phải liệt kê thêm cửa của nhánh kia (hộp `GET /api/thong-bao`, nhãn `cho-nhan`); người kiểm độc lập của lượt gộp sau phải CHẠY THẬT (không chỉ đọc mã) ít nhất: HDV tự nhận → có tin đúng loại; lập đơn có chọn HDV → không hiện tin "chờ nhận"/"giao" sai; tài khoản lai → không có tin, số đỏ không tăng; số route hai phía cộng đúng.

Không cần hành động ngay ở Task 1.1 (task này không đụng các tệp trên ngoài `dispatch/index.ts` phần route Nhận, không đụng hộp thông báo). Nhắc lại ruling này khi bắt đầu Task 1.3 và Task 1.4.
