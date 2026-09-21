# Kế hoạch hành động sau đối chiếu Oracle TCA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thi công các đề xuất đã chốt của báo cáo đối chiếu Oracle TCA, theo đúng thứ tự ưu tiên của bản 2.

**Architecture:** Bốn giai đoạn độc lập. (1) Một migration chỉ-thêm `0017` đặt ba trigger bảo vệ: luật chuyển trạng thái đơn (P-2) và nhật ký chỉ-thêm (P-5). (2) Ghi tài liệu, không mã (P-6, P-7, P-11) bằng một ADR mới ở trạng thái đề xuất, vì không được sửa ADR đã duyệt. (3) Gắn hồ sơ khách vào đơn, lát 1 của N2 (P-4): là tính năng mới nên **viết đặc tả trước**; kế hoạch thi công chi tiết viết sau khi chủ dự án duyệt đặc tả. (4) Bảng "trước → sau + lý do" (P-1): chỉ ghi ràng buộc để mang vào ADR của N3, chưa có việc thi công.

**Tech Stack:** TypeScript, Node 22 (`node --test`, `node:sqlite`), SQLite/D1, wrangler.

**Spec:** `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` (bản 2, commit `c7d245e`), mục 6.

**Quyết định của chủ dự án (2026-09-21):** "ok chốt" cho bảng ưu tiên mục 6.0 của báo cáo bản 2: P-4 đứng đầu, P-2 + P-5 gộp một migration, P-1 làm cùng N3, P-6/P-7/P-11 chỉ ghi tài liệu; P-3 (MST), P-8, P-9, P-10, P-12 hoãn. **Giả định (cần xác nhận khi bắt đầu Giai đoạn 3):** "chốt" gồm cả việc đổi thứ tự lộ trình N2, tức làm lát 1 của P-4 trước các phần khác của N2.

## Global Constraints

- Tiếng Việt CÓ DẤU cho mọi chữ người dùng thấy, thông báo lỗi, tài liệu, thông điệp commit (CLAUDE.md §5).
- Migration **chỉ thêm tệp mới**, không sửa tệp đã áp remote; không dựng lại bảng đang bị tham chiếu (ADR-0003 điều 10). Migration kế tiếp lấy số **`0017`**.
- Mỗi thay đổi hành vi: test **đỏ trước, xanh sau**. Không tuyên bố xong khi chưa chạy `npm test` + `npm run typecheck` (+ `npm run test:e2e` nếu chạm API hoặc migration).
- **Không** `git push`, merge `main`, `wrangler deploy`, `wrangler d1 migrations apply --remote`, ghi D1 remote nếu chủ dự án chưa ra lệnh rõ trong phiên đó (CLAUDE.md §6).
- **Không sửa ADR đã accepted** (`docs/adr/README.md`); quyết định mới → ADR mới do chủ dự án duyệt.
- Làm việc trong git worktree riêng dưới `.claude/worktrees/`.

## Bản đồ tệp

| Tệp | Giai đoạn | Việc |
|---|---|---|
| `migrations/0017_order_status_audit_guards.sql` | 1 | Tạo: 3 trigger |
| `src/migrations-0017.test.ts` | 1 | Tạo: test trên SQLite thật (`node:sqlite`) |
| `tests/e2e/orders.mjs` | 1 | Sửa: thêm kiểm SQL thô bị trigger chặn trên D1 local |
| `CLAUDE.md`, `docs/HANDOFF-N1.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `docs/HANDOFF-FEEDBACK.md`, `docs/ARCHITECTURE.md` | 1 | Sửa: migration cuối = `0017`; B5 lùi sang `0018`; ghi hai bất biến mới |
| `docs/adr/ADR-0010-nguong-mo-rong-sau-doi-chieu-oracle.md`, `docs/adr/README.md` | 2 | Tạo ADR đề xuất + thêm dòng mục lục |
| `docs/superpowers/specs/2026-09-2x-n2-lat-1-khach-tren-don.md` | 3 | Tạo: đặc tả lát 1 |

---

## Giai đoạn 1: P-2 + P-5, migration `0017`

### Task 1: Migration `0017` và test trên SQLite thật

**Files:**
- Create: `migrations/0017_order_status_audit_guards.sql`
- Create: `src/migrations-0017.test.ts`

**Interfaces:**
- Consumes: bảng `orders` (`0003`, cột `status` ∈ `draft|confirmed|cancelled`), `order_service` (`0008`), `audit_log` (dựng lại lần cuối ở `0007`), trigger `orders_confirm_requires_trip` (`0008`).
- Produces: ba trigger tên cố định `orders_status_transition`, `audit_log_no_update`, `audit_log_no_delete`; mã lỗi SQL `invalid_transition` và `audit_append_only` (Task 2 bắt theo hai mã này).

- [ ] **Step 1: Viết test đỏ**

Tạo `src/migrations-0017.test.ts`:

```ts
// Kiểm migration 0017 (trigger bảo vệ luật chuyển trạng thái đơn + nhật ký chỉ-thêm) trên SQLite thật (node:sqlite).
// Báo cáo đối chiếu Oracle TCA bản 2, P-2 và P-5: mã đã chặn đủ; đây là lưới ở CSDL cho SQL chạy tay và mã viết sau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);
const statusOf = (db: DatabaseSync, id: string) => (db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: string }).status;

/** Đơn nháp có một dịch vụ đủ thông tin chuyến (để `orders_confirm_requires_trip` của 0008 không che lỗi cần kiểm). */
function seedDraft(db: DatabaseSync, id: string): void {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv-${id}', '${id}', 'Tour', 'perPax', 2, '2026-09-25')`);
}
function seed(db: DatabaseSync): void {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
}

test("0017: ba cặp chuyển hợp lệ đi qua (nháp→xác nhận, nháp→huỷ, xác nhận→huỷ)", () => {
  const db = open();
  seed(db);
  seedDraft(db, "a");
  seedDraft(db, "b");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'a'");
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'a'");
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'b'");
  assert.equal(statusOf(db, "a"), "cancelled");
  assert.equal(statusOf(db, "b"), "cancelled");
});

test("0017: mọi đường quay lại bị chặn ở CSDL", () => {
  const db = open();
  seed(db);
  seedDraft(db, "c");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'c'");
  fails(db, "UPDATE orders SET status = 'draft' WHERE id = 'c'", /invalid_transition/);
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'c'");
  fails(db, "UPDATE orders SET status = 'confirmed' WHERE id = 'c'", /invalid_transition/); // đơn đã huỷ "sống lại": lỗ hổng mà 0008 để lọt
  fails(db, "UPDATE orders SET status = 'draft' WHERE id = 'c'", /invalid_transition/);
  assert.equal(statusOf(db, "c"), "cancelled");
});

test("0017: cập nhật giữ nguyên trạng thái (cột status có trong SET) vẫn đi qua", () => {
  const db = open();
  seed(db);
  seedDraft(db, "d");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'd'");
  db.exec("UPDATE orders SET status = status, customer_note = 'ghi chú' WHERE id = 'd'");
  db.exec("UPDATE orders SET status = 'confirmed', updated_at = updated_at WHERE id = 'd'");
  assert.equal(statusOf(db, "d"), "confirmed");
});

test("0017: nhật ký chỉ-thêm — thêm được, không sửa, không xoá", () => {
  const db = open();
  seed(db);
  db.exec(`INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
           VALUES ('l1', NULL, 's1', 'created', 'order', 'x', NULL, '${NOW}')`);
  fails(db, "UPDATE audit_log SET detail = 'sửa lén' WHERE id = 'l1'", /audit_append_only/);
  fails(db, "DELETE FROM audit_log WHERE id = 'l1'", /audit_append_only/);
  fails(db, "DELETE FROM audit_log", /audit_append_only/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM audit_log").get() as { n: number }).n, 1);
});

test("0017: ba trigger bảo vệ còn tồn tại trên schema đầy đủ (bắt migration sau dựng lại bảng mà quên tạo lại)", () => {
  const db = open();
  const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('orders_status_transition', 'audit_log_no_update', 'audit_log_no_delete') ORDER BY name").all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(names, ["audit_log_no_delete", "audit_log_no_update", "orders_status_transition"]);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/migrations-0017.test.ts`
Expected: FAIL. Test 1 và 3 đi qua (chưa có trigger nên không chặn gì); test 2 FAIL (`Missing expected exception`: đơn đã huỷ quay về `confirmed` được); test 4 FAIL (sửa/xoá nhật ký được); test 5 FAIL (`[]` khác ba tên trigger).

- [ ] **Step 3: Viết migration**

Tạo `migrations/0017_order_status_audit_guards.sql`:

```sql
-- Đối chiếu Oracle TCA bản 2 (docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md, P-2 + P-5). Chỉ THÊM trigger; không đổi bảng, không đổi dữ liệu.
-- Mã đã chặn đủ (canTransition + WHERE status = … trong orders/repository.ts; không có câu sửa/xoá audit_log). Đây là lưới ở CSDL
-- (ADR-0003: toàn vẹn nằm ở CSDL) cho SQL chạy tay trên D1 và cho mã viết sau (N3 thêm đường sửa đơn sau xác nhận).

-- 1) Luật chuyển trạng thái đơn §2.3: draft → confirmed | cancelled, confirmed → cancelled, cancelled → (không đi đâu).
--    `UPDATE OF status` vẫn chạy khi cột có trong SET dù giá trị không đổi → điều kiện `NEW.status IS NOT OLD.status` để câu giữ nguyên trạng thái đi qua.
--    Chạy cùng `orders_confirm_requires_trip` (0008); trigger đó chỉ kiểm đủ chuyến, không kiểm trạng thái nguồn.
CREATE TRIGGER orders_status_transition BEFORE UPDATE OF status ON orders
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'draft' AND NEW.status IN ('confirmed', 'cancelled'))
        OR (OLD.status = 'confirmed' AND NEW.status = 'cancelled'))
BEGIN SELECT RAISE(ABORT, 'invalid_transition: đơn chỉ đi nháp → xác nhận/huỷ hoặc xác nhận → huỷ'); END;

-- 2) Nhật ký chỉ-thêm (ADR-0003 điều 8: bảng chỉ-thêm không sửa, không xoá). Chặn tai nạn, KHÔNG chặn người cố ý có quyền quản trị D1 (gỡ được trigger).
--    Nếu sau này buộc phải dựng lại audit_log thì PHẢI tạo lại hai trigger này (src/migrations-0017.test.ts kiểm chúng còn tồn tại).
--    DROP TABLE không kích hoạt trigger DELETE nên không cản trình tự dựng lại bảng của ADR-0003 điều 10.
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_append_only: nhật ký không được sửa'); END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_append_only: nhật ký không được xoá'); END;
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/migrations-0017.test.ts`
Expected: PASS 5/5.

- [ ] **Step 5: Chạy toàn bộ test + typecheck**

Run: `npm test && npm run typecheck`
Expected: toàn bộ PASS (403 test cũ + 5 mới = 408; đếm lại theo kết quả thật), tsc 0 lỗi. Đặc biệt kiểm `src/migrations-n1.test.ts` phần "hai pha" vẫn xanh: tên trigger mới không khớp `staff_%`/`stf_%`.

- [ ] **Step 6: Commit**

```bash
git add migrations/0017_order_status_audit_guards.sql src/migrations-0017.test.ts
git commit -m "Migration 0017: CSDL chặn chuyển trạng thái đơn sai và chặn sửa/xoá nhật ký

Mã đã chặn đủ nhưng luật chỉ nằm ở mã; SQL chạy tay trên D1 (đường thoát khẩn,
sửa dữ liệu) hoặc mã viết sau có thể làm đơn đã huỷ sống lại hoặc sửa lặng lẽ
nhật ký. Đối chiếu Oracle TCA bản 2, P-2 + P-5."
```

### Task 2: E2E trên D1 local, cập nhật tài liệu, đổi số B5

**Files:**
- Modify: `tests/e2e/orders.mjs` (quanh dòng 137–142, khối "SQL thô" đang kiểm trigger tiền)
- Modify: `CLAUDE.md` (§3 số test, §4 dòng `migrations/`, §9 hiện trạng), `docs/HANDOFF-N1.md` (mọi chỗ "B5 … dự kiến `0017`"), `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (dòng "Tệp cuối hiện là"), `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `docs/HANDOFF-FEEDBACK.md`, `docs/ARCHITECTURE.md` (mục "Luật dữ liệu")

**Interfaces:**
- Consumes: mã lỗi SQL `invalid_transition`, `audit_append_only` từ Task 1; hàm `sql()` của `tests/e2e/lib.mjs` (đã dùng ở `trip.mjs:274` với `assert.rejects`).
- Produces: e2e chứng minh trigger chạy trên D1 (không chỉ `node:sqlite`); tài liệu nói đúng migration cuối là `0017` và B5 dùng số `0018`.

- [ ] **Step 1: Thêm kiểm e2e (đỏ trên nhánh chưa có 0017, xanh sau)**

Trong `tests/e2e/orders.mjs`, ngay sau dòng `await sql(\`UPDATE orders SET customer_note = 'sửa hợp lệ' …\`)` (dòng 142), thêm:

```js
// 0017 (P-2 + P-5): trên D1 thật, CSDL chặn đường quay lại của trạng thái đơn và chặn sửa/xoá nhật ký, kể cả SQL chạy tay.
await assert.rejects(sql(`UPDATE orders SET status = 'draft' WHERE id = '${traced.id}' AND status <> 'draft'`), /invalid_transition/);
await assert.rejects(sql(`UPDATE audit_log SET detail = 'sửa lén' WHERE order_id = '${traced.id}'`), /audit_append_only/);
await assert.rejects(sql(`DELETE FROM audit_log WHERE order_id = '${traced.id}'`), /audit_append_only/);
```

Trước khi thêm: đọc lại khối quanh dòng 130–145 để biết `traced` đang ở trạng thái nào. Nếu `traced` còn là nháp thì câu đầu không trúng dòng nào và không lỗi: khi đó xác nhận đơn qua API trước (theo mẫu có sẵn trong tệp), hoặc dùng một đơn đã xác nhận có sẵn trong kịch bản.

- [ ] **Step 2: Chạy e2e**

Tắt mọi `wrangler dev` mồ côi trước (CLAUDE.md §8, lỗi "database is locked").
Run: `npm run test:e2e -- orders`
Expected: PASS. Cần mạng (Google Sheet + Turnstile). Nếu không có mạng thì ghi rõ "chưa chạy e2e" trong báo cáo, không tuyên bố xong.

- [ ] **Step 3: Chạy trọn bộ e2e**

Run: `npm run test:e2e`
Expected: 15/15 kịch bản PASS, `audit-invariants` cuối kịch bản xanh. Bộ e2e đầy đủ bắt "đường mã ngầm" nào đó làm thao tác đang bị trigger chặn.

- [ ] **Step 4: Cập nhật tài liệu**

Tìm mọi chỗ cần sửa: `grep -rn "0017" CLAUDE.md docs/*.md` và `grep -rn "Tệp cuối hiện là\|0001…0016" CLAUDE.md docs`.
- Chỗ nói **B5 dự kiến `0017`** → đổi thành **`0018`** (ví dụ `0018_staff_party_required.sql`). `src/migrations-n1.test.ts` nhận B5 theo TÊN nên không phải sửa mã.
- `CLAUDE.md` §4: `migrations/ 0001…0016` → `0001…0017`, thêm "`0017` trigger bảo vệ trạng thái đơn + nhật ký chỉ-thêm"; câu "Migration kế tiếp lấy số `0017`" → `0018`. §3: số test mới (đếm ở Task 1 Step 5). §9: `0017` có trong repo, **CHƯA lên production**.
- `docs/CHANGE-GUIDE.md` dòng "Tệp cuối hiện là …" → `0017_order_status_audit_guards.sql`.
- `docs/ARCHITECTURE.md` mục "Luật dữ liệu": thêm hai bất biến (1) trạng thái đơn chỉ đi tiến, trigger `orders_status_transition`; (2) `audit_log` chỉ-thêm, trigger `audit_log_no_update/_no_delete`, và dựng lại `audit_log` thì phải tạo lại chúng.
- `docs/HANDOFF-N1.md`: thêm mục "Lần phát hành kế tiếp: `0017`" với runbook ở Task 3.

- [ ] **Step 5: Kiểm lại + commit**

Run: `npm test && npm run typecheck`
Expected: PASS, 0 lỗi (test `docs/DATA-DICTIONARY.md` không đổi vì migration không thêm bảng/cột).

```bash
git add tests/e2e/orders.mjs CLAUDE.md docs/
git commit -m "E2E + tài liệu cho migration 0017; B5 lùi sang số 0018

E2E chứng minh trigger chạy trên D1 local, không chỉ node:sqlite. Tài liệu
đang hẹn B5 ở 0017 nên phải đổi để phiên sau không đặt trùng số."
```

### Task 3: Triển khai `0017` (CHỈ khi chủ dự án ra lệnh)

Không thi công task này nếu chủ dự án chưa ra lệnh rõ trong phiên. Trình tự theo `docs/HANDOFF-N1.md`:

- [ ] **Step 1:** Cổng chỉ-đọc: `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` (nhìn TÊN, không nhìn số: có hai tệp `0016_*`). Chỉ được thấy `0017_order_status_audit_guards` là migration chưa áp. Nếu còn tệp khác chưa áp (ví dụ `0016_feedback`, xem ghi nhớ "lệch production") thì DỪNG và hỏi chủ dự án.
- [ ] **Step 2:** Chỉ-đọc: `node scripts/audit-invariants.mjs --db remote` phải xanh. Ghi điểm khôi phục D1 Time Travel.
- [ ] **Step 3:** `npm test` + `npm run typecheck` + `npm run test:e2e` xanh trên đúng commit sẽ áp.
- [ ] **Step 4:** `CI=1 npm run db:migrate:remote`. Migration không đổi hành vi mã nên **không cần** `wrangler deploy` đi kèm.
- [ ] **Step 5:** Kiểm sau áp (chỉ đọc): `CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('orders_status_transition','audit_log_no_update','audit_log_no_delete')"` → 3 dòng; `audit-invariants --db remote` xanh; thử tay một lần xác nhận + huỷ đơn thử trên app.
- [ ] **Step 6:** Ghi trạng thái vào `docs/HANDOFF-N1.md` + `CLAUDE.md` §9. **Hoàn tác:** migration mới chỉ thêm trigger, gỡ bằng `DROP TRIGGER` cho cả ba (không cần lùi Worker).

---

## Giai đoạn 2: P-6, P-7, P-11, chỉ ghi tài liệu

### Task 4: ADR-0010 (đề xuất) ghi các ngưỡng mở rộng

**Files:**
- Create: `docs/adr/ADR-0010-nguong-mo-rong-sau-doi-chieu-oracle.md`
- Modify: `docs/adr/README.md` (thêm một dòng mục lục, trạng thái **proposed**)

**Interfaces:** không có mã. ADR-0007 đã accepted nên không sửa; ADR mới trỏ về ADR-0004, ADR-0007.

- [ ] **Step 1: Viết ADR theo mẫu các ADR hiện có** (Bối cảnh / Quyết định / Lý do / Phương án bị loại / Hệ quả; khai cửa hai chiều). Nội dung Quyết định, nguyên văn:

```markdown
**1. Phạm vi dữ liệu theo tổ chức (P-6).** `Scope` của `src/shared/permissions.ts` giữ nguyên năm giá trị (`none/own/assigned/ownOrAssigned/any`).
Chỉ thêm phạm vi theo nơi (`location`, dựa trên `pty_party_role.location_id` đã có) khi xảy ra MỘT trong hai điều: (i) công ty có chi nhánh/điểm bán thứ hai;
(ii) đại lý được đăng nhập để xem đơn của chính họ. Khi đó viết ADR mới thay điều này.

**2. Thông tin xuất hoá đơn là bản chụp theo từng yêu cầu (P-7).** Không làm bảng địa chỉ hồ sơ kiểu `party_site`. Khi làm N3 (`bil_*`, ADR-0004),
tên đơn vị, MST, địa chỉ, email nhận được CHÉP vào chính yêu cầu xuất hoá đơn tại thời điểm tạo; `pty_organization.address`/`invoice_email` chỉ là giá trị gợi ý điền sẵn.

**3. Tác nhân tự động, kể cả AI (P-11).** Mọi tác nhân tự động ghi dữ liệu nghiệp vụ phải: gọi qua API có phiên như người dùng; có tài khoản `staff`
riêng mang quyền tối thiểu; để lại `audit_log.staff_id` là chính tài khoản đó. Không có đường ghi thẳng D1 cho tác nhân tự động.
Điều này áp dụng TRƯỚC khi tích hợp bất kỳ trợ lý nào có quyền ghi.
```

- [ ] **Step 2:** Thêm dòng vào bảng `docs/adr/README.md`: `| [0010](ADR-0010-nguong-mo-rong-sau-doi-chieu-oracle.md) | Ngưỡng mở rộng sau đối chiếu Oracle TCA: phạm vi theo nơi, hoá đơn là bản chụp, tác nhân tự động | hai chiều | **proposed** |`
- [ ] **Step 3:** Chạy `npm test` (không đổi mã, chỉ để chắc không có test đọc mục lục ADR bị vỡ). Commit: `ADR-0010 (đề xuất): ngưỡng mở rộng rút từ đối chiếu Oracle TCA`, thân nói vì sao phải là ADR mới (không sửa ADR-0007 đã duyệt).
- [ ] **Step 4:** Chủ dự án duyệt → đổi trạng thái `proposed` → `accepted` trong ADR và README (một commit riêng, ghi ngày duyệt).

---

## Giai đoạn 3: P-4, gắn hồ sơ khách vào đơn (lát 1 của N2)

Đây là tính năng mới (giao diện lập đơn + API + migration), nên theo CLAUDE.md §7 phải **đặc tả trước, rồi mới viết kế hoạch thi công**. Kế hoạch này chỉ gồm việc viết đặc tả. Viết sẵn mã ở đây thì phải đoán những quyết định mà chủ dự án chưa đưa ra.

Đã kiểm (không cần ADR mới): ADR-0002 đã khai cột `booker_party_id` thuộc `orders` và đã cho phép cạnh `orders → parties` (`ALLOWED_EDGES` trong `src/architecture.test.ts`). ADR-0001 mục 7–8 đã quyết cách nhận dạng khách bằng SĐT và việc bắt buộc hiện danh sách trùng số. `GET /api/parties/lookup?phone=` và `POST /api/parties` mở cho quyền "office" (gồm `SALES`).

### Task 5: Đặc tả lát 1

**Files:**
- Create: `docs/superpowers/specs/2026-09-2x-n2-lat-1-khach-tren-don.md` (ngày thật khi viết)

- [ ] **Step 1: Viết đặc tả**, ghi rõ giả định và điều chưa chắc. Tối thiểu phải có:
  1. **Schema:** `ALTER TABLE orders ADD COLUMN booker_party_id TEXT REFERENCES pty_party(id)` (có thể để trống, `NO ACTION`); chỉ mục `orders(booker_party_id)`; cập nhật `docs/data-dictionary.json` + `npm run dict`. **Giữ** `customer_name/phone/email` làm bản chụp lúc đặt (expand; không backfill đơn cũ ở lát 1). `traveller_party_id` **không** làm ở lát 1.
  2. **Luồng lập đơn:** gõ SĐT → gọi `lookup` → hiện danh sách hồ sơ trùng số (bắt buộc, ADR-0001 mục 8) → "Dùng hồ sơ này" hoặc "Tạo hồ sơ mới" → tên/SĐT trên đơn điền từ hồ sơ nhưng vẫn sửa được (bản chụp). Bỏ qua được không (đơn không gắn khách)? → **câu hỏi cho chủ dự án**.
  3. **Quyền:** gán vai `CUSTOMER` cho hồ sơ mới đang là route `admin` (`POST /api/parties/:id/roles`). Nhân viên bán hàng tạo khách thì vai gắn thế nào: (a) route tạo đơn tự mở vai `CUSTOMER` trong cùng batch; (b) nới route vai cho `office` chỉ với mã `CUSTOMER`; (c) không gắn vai ở lát 1 → **câu hỏi cho chủ dự án**, kèm khuyến nghị.
  4. **Ranh giới module:** `orders` gọi `parties` qua `src/modules/parties/index.ts` (cạnh đã được phép); đọc nhãn khách qua view công bố `v_pty_party_label`; kiểm hồ sơ tồn tại và đang hoạt động ở máy chủ; không tin `booker_party_id` từ trình duyệt khi chưa kiểm.
  5. **Sửa đơn:** đổi khách của đơn nháp được; đơn đã xác nhận → theo ADR-0007 (thông tin vận hành) hay khoá? → **câu hỏi cho chủ dự án**.
  6. **Nhật ký:** hành động mới (nếu có) khai ở `src/shared/audit-actions.ts`; `detail` không ghi SĐT/email.
  7. **Kiểm thử:** test thuần cho luật chọn/gắn khách; test migration (`node:sqlite`); kịch bản e2e mới hoặc mở rộng `tests/e2e/orders.mjs` + `parties.mjs`; chạy lại ba kịch bản Chrome `a2-smoke-*.mjs` vì chạm `web/order-form.ts` (CLAUDE.md §3).
  8. **Thước đo trước khi làm (chỉ đọc, chủ dự án cho phép):** `SELECT count(*), count(DISTINCT customer_phone) FROM orders` trên remote, để biết quy mô trùng hôm nay.
  9. **Lát 2 (ngoài phạm vi, chỉ nêu):** backfill đơn cũ, gộp hồ sơ (`merged_into_id`), siết bắt buộc. Cửa một chiều, cần ADR.
- [ ] **Step 2:** Hỏi ý một nhân viên bán hàng về bước thêm khi lập đơn (chủ dự án làm), ghi kết quả vào đặc tả.
- [ ] **Step 3:** Commit đặc tả; chủ dự án duyệt các câu hỏi ở mục 2, 3, 5.
- [ ] **Step 4:** Sau khi duyệt: viết kế hoạch thi công chi tiết `docs/superpowers/plans/2026-09-2x-n2-lat-1-khach-tren-don.md` bằng skill `superpowers:writing-plans` (task TDD có mã đầy đủ). Migration của lát 1 lấy số kế tiếp **tại thời điểm đó** (sau `0017`; nếu B5 đã vào thì sau B5).

---

## Giai đoạn 4: P-1 cùng N3, chưa thi công

Chưa có task. ADR-0007 điều 2 hứa một ADR riêng của N3 cho bảng bản ghi thay đổi. Khi viết ADR/đặc tả đó, **bắt buộc** mang theo các ràng buộc sau (rút từ báo cáo bản 2, mục 6.4):

1. Bảng chỉ-thêm của module `orders` (ví dụ `ord_change`), **khoá `(audit_id, field)`**, trong đó `audit_id` = `audit_log.id`. Một lần sửa thường đổi nhiều trường, nên khoá chỉ bằng `audit_id` sẽ làm mất trường.
2. Cột `field`, `before_value`, `after_value`, `reason`; `reason` không rỗng khi sửa sau xác nhận.
3. Trường nhạy cảm (SĐT/email/MST) che hoặc chỉ ghi "đã đổi" (CLAUDE.md §5).
4. Nới trigger `order_service_frozen_*` theo idiom `wonGuard` đã ghi ở ADR-0007 mục Hệ quả: câu ghi bản ghi thay đổi đứng trước trong cùng `db.batch()`.
5. Nếu dùng trigger chặn sửa/xoá cho bảng mới thì theo mẫu `audit_log_no_*` của `0017`.
6. `audit-invariants` thêm `R-ORD-n`: mọi sửa sau xác nhận có ít nhất một dòng bản ghi thay đổi với `reason` không rỗng.

---

## Thứ tự và cổng

| Bước | Việc | Ai | Cổng |
|---|---|---|---|
| 1 | Task 1 → Task 2 | Claude | `npm test`, `typecheck`, `test:e2e` xanh |
| 2 | Task 4 | Claude | Chủ dự án duyệt ADR-0010 |
| 3 | Task 5 Step 1 | Claude | — |
| 4 | Duyệt câu hỏi đặc tả P-4, hỏi ý nhân viên bán hàng | **Chủ dự án** | — |
| 5 | Task 3 (áp `0017` lên production) | Claude khi được lệnh | Lệnh rõ của chủ dự án trong phiên |
| 6 | Kế hoạch thi công P-4 lát 1 | Claude | Đặc tả đã duyệt |
| — | P-1 | cùng N3 | ADR N3 |

Giai đoạn 1 và 2 độc lập, làm song song được. Giai đoạn 3 không phụ thuộc Giai đoạn 1 ngoài chuyện đánh số migration.

## Phát hiện phụ (ngoài phạm vi, chỉ ghi nhận)

- `src/modules/orders/index.ts:128` trả thông điệp `Không thể chuyển đơn từ "${from}" sang "${to}".` với mã trạng thái thô (`draft`, `cancelled`…), trái CLAUDE.md §5 ("không để mã trạng thái thô lộ ra người dùng"). Đường này khó chạm từ giao diện (nút chỉ hiện chuyển hợp lệ) nhưng vẫn gọi được bằng API. Sửa nhỏ: dùng nhãn tiếng Việt của trạng thái. Cần chủ dự án đồng ý đưa vào một task.
