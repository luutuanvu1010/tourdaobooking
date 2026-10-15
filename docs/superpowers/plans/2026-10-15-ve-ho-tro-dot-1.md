# Vé hỗ trợ đợt 1 (nhóm hỗ trợ và quyền theo nhóm) — Kế hoạch thi công

> **Cho người thi công:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans`, làm từng việc, đánh dấu `- [ ]`. **Người thi công không tự nghiệm thu** (Hiến pháp N8): xong Việc 8 phải có người kiểm độc lập (`nguoi-kiem-doc-lap`) đọc mã thật và chạy lại lệnh.

**Mục tiêu:** nhân viên gửi phiếu tới một nhóm hỗ trợ; thành viên nhóm thấy hàng đợi nhóm mình, nhận việc, giao việc, chuyển nhóm; Toàn quyền thấy và quản lý tất cả; người ngoài nhóm không bao giờ đọc được phiếu nhóm khác.

**Kiến trúc:** mở rộng module `feedback` (bảng `fbk_*`), không thêm module. Tư cách thành viên nhóm là dữ liệu của chính module. Một hàm thuần `quyenPhieu` (`src/modules/feedback/quyen.ts`) quyết định mọi quyền đọc/xử lý/chuyển nhóm; mọi route gọi nó. Ô `MATRIX` chỉ thêm `feedback.team.manage`.

**Công nghệ:** TypeScript, SQLite/D1, esbuild, `node --test`, khung thử `tests/audit/harness.mjs` (`world()`, `seedStaff`). Không dependency runtime mới.

**Đặc tả:** `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md` (bản 2). **ADR:** `docs/adr/ADR-0119-ve-ho-tro-nhom-ho-tro-va-quyen-xu-ly-theo-nhom.md` (accepted, chỉ đợt 1).

## Ràng buộc chung (áp cho mọi việc)

- Giao diện, thông báo lỗi, commit, tài liệu: **tiếng Việt CÓ DẤU**; gọi hệ thống là «Nền tảng», không «App».
- Không `innerHTML` (dựng bằng `h()`); ô gõ 16px; giá trị CSS đi vào token.
- Tên người chỉ đọc qua view `v_stf_staff_label`; `staff_id` trong bảng `fbk_*` **không khoá ngoại**; không xoá cứng.
- SQL chỉ qua `defineSql("feedback", …)` trong `src/modules/feedback/repository.ts` (tệp này đã khai ở `STRICT` của `src/architecture.test.ts`; **không tạo tệp mới có `defineSql(`**).
- Nhật ký (`audit`) không ghi nội dung tin, SĐT, email, số giấy tờ.
- Migration chỉ THÊM; **không sửa `0016_*`**. Số migration = số lớn nhất trên mọi nhánh + 1 (lúc soạn: `0099`; kiểm lại ở Việc 1, đặt tên tệp theo số thật).
- Mỗi lệnh ghi một `db.batch` theo thứ tự cổng → nhật ký → trạng thái cuối; route ghi mới tự đi qua lớp chống ghi trùng ADR-0094 (không cần sửa `lan-gui-mien.ts`), nhưng **không được ghi hai lần trong một route** (không thêm vào `GHI_NHIEU_LAN`).
- Tuyến tĩnh mới khai **trước** `/api/feedback/:id`.
- AI không chạy: `git push`, merge `main`, `wrangler deploy`, migration/ghi D1 remote. Cuối kế hoạch chỉ đưa **nguyên lệnh** cho chủ.
- Commit nhỏ, tiêu đề nói việc, thân nói vì sao, kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Điểm lệch so với đặc tả (báo chủ ở cuối)

- Đặc tả §3.4 nói thẻ «Hộp thư» ở Trang chủ hiện cho thành viên nhóm. Thẻ đó (`web/home.ts`) đọc tuyến cũ `GET /api/feedback`, tuyến này vẫn chỉ Toàn quyền (đã chốt ở ADR). **Đợt 1 giữ thẻ cho Toàn quyền; thành viên nhóm có huy hiệu số ở menu** (`feedbackBadge`). Thẻ theo nhóm là đợt 2. Bề mặt, đảo được.
- `fbk_ticket_event` đợt 1 chỉ ghi ba loại: `TEAM_CHANGED`, `ASSIGNED`, `CLAIMED` (đặc tả còn nêu `STATUS`; lịch sử trạng thái đã có ở nhật ký hệ thống, thêm sau nếu cần).

## Review Focus (điều đặc tả ngầm hiểu nhưng dễ sót; mỗi dòng có bài ở việc ghi trong ngoặc)

1. Người gửi đồng thời là thành viên nhóm nhận: **không** thấy ghi chú nội bộ, **không** xử lý được phiếu chính mình (Việc 2, 5).
2. Thành viên bị khoá tài khoản hoặc bị gỡ khỏi nhóm giữa chừng: mất quyền ngay, phiếu họ giữ hiển thị «chưa ai nhận» (Việc 5).
3. Hai người bấm «Nhận việc» cùng lúc: một thắng, một nhận 409 (Việc 5).
4. Chuyển phiếu sang nhóm khác: nhóm mới không đọc ghi chú nội bộ của nhóm cũ; Trưởng nhóm cũ mất quyền ngay (Việc 5).
5. Bên ngoài (`PARTNER`) gọi thẳng API chọn nhóm khác Kỹ thuật: 403; xem danh sách nhóm chỉ thấy Kỹ thuật (Việc 3).
6. Thống kê tuần và huy hiệu không lộ số phiếu nhóm khác (Việc 5).

---

## Việc 1: Dữ liệu (migration, từ điển dữ liệu, bài migration)

**Tệp:**
- Tạo: `migrations/0099_ve_ho_tro_nhom.sql` (đổi số nếu `ls migrations` + `git ls-tree` các nhánh cho số lớn hơn)
- Sửa: `docs/data-dictionary.json` rồi chạy `npm run dict` (sinh `docs/DATA-DICTIONARY.md`)
- Tạo bài: `src/migrations-ve-ho-tro.test.ts`

**Giao diện:** Sản phẩm: bảng `fbk_team`, `fbk_team_member`, `fbk_ticket_event`, `fbk_ticket_read`; cột `fbk_ticket.team_id`, `fbk_message.team_id`; hằng id nhóm Kỹ thuật `'fbk-team-ky-thuat'`.

- [ ] **Bước 1: Xác nhận số migration**

```bash
ls migrations | tail -3
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes); do git ls-tree --name-only $b migrations/ 2>/dev/null; done | sed 's#migrations/##' | grep -o '^0[0-9]*' | sort -u | tail -1
```
Số kế tiếp = số lớn nhất tìm được + 1. Dưới đây ghi `0099`; nếu khác thì đổi tên tệp ở mọi nơi nhắc.

- [ ] **Bước 2: Viết bài migration (đỏ trước)** — `src/migrations-ve-ho-tro.test.ts`

```ts
// Migration Vé hỗ trợ đợt 1 (ADR-0119): nhóm hỗ trợ, thành viên, sự kiện, mốc đã xem riêng từng người; phiếu cũ vào nhóm Kỹ thuật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MOI = files.find((f) => f.endsWith("_ve_ho_tro_nhom.sql"));
const NOW = "2026-10-15T00:00:00.000Z";
const KY_THUAT = "fbk-team-ky-thuat";

/** Dựng CSDL tới trước migration mới, gieo một phiếu CŨ, rồi áp migration mới (đúng thứ tự production). */
function dung(): DatabaseSync {
  assert.ok(MOI, "chưa có migration *_ve_ho_tro_nhom.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((f) => f < MOI!)) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at)
           VALUES ('t-cu', 1, 'BUG', 'NEW', 'Phiếu cũ', '{}', 's1', '${"a".repeat(36)}', '${NOW}', '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at) VALUES ('m-cu', 't-cu', 's1', 'nội dung', 1, '${NOW}', '${NOW}')`);
  db.exec(readFileSync(new URL(MOI!, DIR), "utf8"));
  return db;
}
const one = (db: DatabaseSync, sql: string) => db.prepare(sql).get() as Record<string, unknown>;

test("phiếu và tin CŨ nằm trong nhóm Kỹ thuật bằng giá trị mặc định, số dòng không đổi", () => {
  const db = dung();
  assert.equal(one(db, "SELECT team_id FROM fbk_ticket WHERE id = 't-cu'").team_id, KY_THUAT);
  assert.equal(one(db, "SELECT team_id FROM fbk_message WHERE id = 'm-cu'").team_id, KY_THUAT);
  assert.equal(one(db, "SELECT count(*) AS n FROM fbk_ticket").n, 1);
});

test("gieo bốn nhóm; Kế toán và Nhân sự nhạy cảm; Kỹ thuật và Điều hành không", () => {
  const db = dung();
  const rows = db.prepare("SELECT code, sensitive FROM fbk_team ORDER BY sort_order").all() as { code: string; sensitive: number }[];
  assert.deepEqual(rows.map((r) => r.code), ["KY_THUAT", "KE_TOAN", "NHAN_SU", "DIEU_HANH"]);
  assert.deepEqual(rows.map((r) => r.sensitive), [0, 1, 1, 0]);
});

test("phiếu và tin MỚI phải trỏ nhóm có thật (trigger), kể cả khi đổi team_id", () => {
  const db = dung();
  assert.throws(() => db.exec(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at, team_id)
    VALUES ('t2', 2, 'BUG', 'NEW', 'x', '{}', 's1', '${"b".repeat(36)}', '${NOW}', '${NOW}', '${NOW}', 'khong-co')`), /nhóm hỗ trợ/);
  assert.throws(() => db.exec("UPDATE fbk_ticket SET team_id = 'khong-co' WHERE id = 't-cu'"), /nhóm hỗ trợ/);
  assert.throws(() => db.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at, team_id)
    VALUES ('m2', 't-cu', 's1', 'x', 0, '${NOW}', '${NOW}', 'khong-co')`), /nhóm hỗ trợ/);
});

test("thành viên: một dòng đang hiệu lực mỗi cặp (nhóm, người); vai chỉ LEAD hoặc MEMBER", () => {
  const db = dung();
  db.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv1', '${KY_THUAT}', 's1', 'LEAD', '${NOW}', '${NOW}', '${NOW}')`);
  assert.throws(() => db.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv2', '${KY_THUAT}', 's1', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`), /UNIQUE/);
  assert.throws(() => db.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv3', '${KY_THUAT}', 's2', 'BOSS', '${NOW}', '${NOW}', '${NOW}')`), /CHECK/);
  db.exec(`UPDATE fbk_team_member SET valid_to_at = '${NOW}' WHERE id = 'tv1'`);
  db.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv4', '${KY_THUAT}', 's1', 'MEMBER', '${NOW}', '${NOW}', '${NOW}')`); // dòng cũ đã đóng ⇒ được thêm lại
});

test("sự kiện phiếu chỉ-thêm: sửa hoặc xoá bị trigger chặn; loại sự kiện lạ bị CHECK chặn", () => {
  const db = dung();
  db.exec(`INSERT INTO fbk_ticket_event (id, ticket_id, type, from_value, to_value, actor_id, at) VALUES ('e1', 't-cu', 'CLAIMED', NULL, 's1', 's1', '${NOW}')`);
  assert.throws(() => db.exec("UPDATE fbk_ticket_event SET to_value = 'x' WHERE id = 'e1'"), /chỉ thêm/);
  assert.throws(() => db.exec("DELETE FROM fbk_ticket_event WHERE id = 'e1'"), /chỉ thêm/);
  assert.throws(() => db.exec(`INSERT INTO fbk_ticket_event (id, ticket_id, type, actor_id, at) VALUES ('e2', 't-cu', 'LA', 's1', '${NOW}')`), /CHECK/);
});

test("mốc đã xem: khoá (phiếu, người), ghi đè bằng upsert", () => {
  const db = dung();
  db.exec(`INSERT INTO fbk_ticket_read (ticket_id, staff_id, seen_at) VALUES ('t-cu', 's1', '${NOW}')`);
  db.exec(`INSERT INTO fbk_ticket_read (ticket_id, staff_id, seen_at) VALUES ('t-cu', 's1', '2026-10-16T00:00:00.000Z')
           ON CONFLICT(ticket_id, staff_id) DO UPDATE SET seen_at = excluded.seen_at`);
  assert.equal(one(db, "SELECT seen_at FROM fbk_ticket_read WHERE ticket_id = 't-cu' AND staff_id = 's1'").seen_at, "2026-10-16T00:00:00.000Z");
});

test("migration cũ 0016_* không bị sửa (băm không đổi so với main)", () => {
  assert.ok(files.includes("0016_feedback.sql"));
  const sql = readFileSync(new URL("0016_feedback.sql", DIR), "utf8");
  assert.ok(!sql.includes("team_id"), "0016_feedback.sql không được chứa cột mới");
});
```

- [ ] **Bước 3: Chạy cho đỏ**

Chạy: `node --test src/migrations-ve-ho-tro.test.ts`
Kỳ vọng: ĐỎ, «chưa có migration *_ve_ho_tro_nhom.sql».

- [ ] **Bước 4: Viết migration** — `migrations/0099_ve_ho_tro_nhom.sql`

```sql
-- Migration 0099 — Vé hỗ trợ đợt 1 (ADR-0119). Spec: docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md. Chỉ THÊM; không sửa 0016_*.
-- Phiếu và tin cũ vào nhóm Kỹ thuật bằng GIÁ TRỊ MẶC ĐỊNH HẰNG (ADD COLUMN NOT NULL của SQLite chỉ nhận mặc định là hằng), không viết lại dòng nào.
-- Cột team_id KHÔNG dùng REFERENCES trong ADD COLUMN (SQLite buộc mặc định NULL khi có khoá ngoại); toàn vẹn do trigger dưới đây giữ.

CREATE TABLE fbk_team (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 1 AND 40),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  sensitive   INTEGER NOT NULL DEFAULT 0 CHECK (sensitive IN (0, 1)),   -- 1 = tiêu đề/nội dung không ra nhật ký và email chung (ADR-0119 điều 4)
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO fbk_team (id, code, name, description, sensitive, sort_order, created_at, updated_at) VALUES
  ('fbk-team-ky-thuat', 'KY_THUAT',  'Kỹ thuật',  'Lỗi và đề xuất về Nền tảng',                  0, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-ke-toan',  'KE_TOAN',   'Kế toán',   'Thu chi, công nợ, hoá đơn',                    1, 2, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-nhan-su',  'NHAN_SU',   'Nhân sự',   'Tài khoản, hồ sơ nhân viên, chế độ',           1, 3, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-dieu-hanh','DIEU_HANH', 'Điều hành', 'Điều xe, lịch chuyến, việc vận hành hằng ngày', 0, 4, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z');

CREATE TABLE fbk_team_member (
  id            TEXT PRIMARY KEY,
  team_id       TEXT NOT NULL REFERENCES fbk_team(id),
  staff_id      TEXT NOT NULL,                                          -- WHO: không khoá ngoại (ADR-0002/N1)
  role          TEXT NOT NULL CHECK (role IN ('LEAD', 'MEMBER')),
  valid_from_at TEXT NOT NULL,
  valid_to_at   TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE UNIQUE INDEX fbk_team_member_open_uq ON fbk_team_member(team_id, staff_id) WHERE valid_to_at IS NULL;
CREATE INDEX fbk_team_member_staff_ix ON fbk_team_member(staff_id) WHERE valid_to_at IS NULL;

ALTER TABLE fbk_ticket  ADD COLUMN team_id TEXT NOT NULL DEFAULT 'fbk-team-ky-thuat';
ALTER TABLE fbk_message ADD COLUMN team_id TEXT NOT NULL DEFAULT 'fbk-team-ky-thuat';   -- nhóm đã viết tin; chỉ có nghĩa với ghi chú nội bộ
CREATE INDEX fbk_ticket_team_ix ON fbk_ticket(team_id, last_activity_at DESC);

CREATE TRIGGER fbk_ticket_team_ins BEFORE INSERT ON fbk_ticket
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Phiếu phải thuộc một nhóm hỗ trợ có thật.'); END;
CREATE TRIGGER fbk_ticket_team_upd BEFORE UPDATE OF team_id ON fbk_ticket
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Phiếu phải thuộc một nhóm hỗ trợ có thật.'); END;
CREATE TRIGGER fbk_message_team_ins BEFORE INSERT ON fbk_message
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Tin phải gắn với một nhóm hỗ trợ có thật.'); END;

CREATE TABLE fbk_ticket_event (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES fbk_ticket(id),
  type       TEXT NOT NULL CHECK (type IN ('TEAM_CHANGED', 'ASSIGNED', 'CLAIMED')),
  from_value TEXT,
  to_value   TEXT,
  actor_id   TEXT NOT NULL,
  at         TEXT NOT NULL
);
CREATE INDEX fbk_ticket_event_ticket_ix ON fbk_ticket_event(ticket_id, at);
CREATE TRIGGER fbk_ticket_event_no_upd BEFORE UPDATE ON fbk_ticket_event BEGIN SELECT RAISE(ABORT, 'Sự kiện phiếu chỉ thêm, không sửa.'); END;
CREATE TRIGGER fbk_ticket_event_no_del BEFORE DELETE ON fbk_ticket_event BEGIN SELECT RAISE(ABORT, 'Sự kiện phiếu chỉ thêm, không xoá.'); END;

-- Mốc đã xem RIÊNG từng người (thay admin_seen_at dùng chung; cột cũ thành cột chết, gỡ ở lần phát hành sau).
CREATE TABLE fbk_ticket_read (
  ticket_id TEXT NOT NULL REFERENCES fbk_ticket(id),
  staff_id  TEXT NOT NULL,
  seen_at   TEXT NOT NULL,
  PRIMARY KEY (ticket_id, staff_id)
);
CREATE INDEX fbk_ticket_read_staff_ix ON fbk_ticket_read(staff_id);
```

- [ ] **Bước 5: Chạy cho xanh**

Chạy: `node --test src/migrations-ve-ho-tro.test.ts`
Kỳ vọng: 7 bài đạt. Nếu bài «một dòng đang hiệu lực» báo không đúng thông điệp, đối chiếu chuỗi lỗi thật của SQLite (`UNIQUE constraint failed`) rồi chỉnh biểu thức chính quy trong bài, **không** nới migration.

- [ ] **Bước 6: Từ điển dữ liệu**

Thêm vào `docs/data-dictionary.json` các bảng/cột mới theo khuôn của các dòng `fbk_*` đã có (mô tả tiếng Việt, kiểu, khoá, nguồn sự thật); cột `fbk_ticket.admin_seen_at` ghi «cột chết từ 0099 — mốc đã xem nay ở `fbk_ticket_read`». Chạy `npm run dict`; kiểm `git diff --stat docs/DATA-DICTIONARY.md` có thay đổi. (Có bài đối chiếu từ điển với migration trong bộ kiểm; `npm test` ở bước 7 bắt thiếu sót.)

- [ ] **Bước 7: Chạy bộ kiểm chính + hoàn nguyên thử (P16)**

Chạy: `npm test`. Kỳ vọng xanh (mọi bài khác chưa đổi). Rồi thử cố ý: sửa `DEFAULT 'fbk-team-ky-thuat'` thành `DEFAULT 'sai'` ở cột `fbk_ticket.team_id`, chạy `node --test src/migrations-ve-ho-tro.test.ts` — kỳ vọng ĐỎ ở bài «phiếu và tin CŨ»; hoàn nguyên.

- [ ] **Bước 8: Commit**

```bash
git add migrations/0099_ve_ho_tro_nhom.sql src/migrations-ve-ho-tro.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "Vé hỗ trợ đợt 1: migration nhóm hỗ trợ, thành viên, sự kiện, mốc đã xem riêng

Phiếu và tin cũ vào nhóm Kỹ thuật bằng giá trị mặc định hằng, không viết lại dòng nào;
trigger giữ toàn vẹn vì ADD COLUMN không dùng được khoá ngoại với mặc định khác NULL.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Việc 2: Luật quyền thuần (`quyenPhieu`) và khai hàng rào

**Tệp:**
- Tạo: `src/shared/ve-ho-tro.ts` (hằng dùng chung máy chủ và giao diện)
- Tạo: `src/modules/feedback/quyen.ts`
- Tạo bài: `src/modules/feedback/quyen.test.ts`
- Sửa: `src/route-write-guard.test.ts` (thêm tên vào `GUARDS`)

**Giao diện — Sản phẩm (các việc sau dùng đúng tên này):**
```ts
// src/shared/ve-ho-tro.ts
export const NHOM_KY_THUAT_ID = "fbk-team-ky-thuat";
export const TEAM_ROLES = ["LEAD", "MEMBER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const TEAM_ROLE_NAME: Record<TeamRole, string> = { LEAD: "Trưởng nhóm", MEMBER: "Thành viên" };
export const isTeamRole = (v: unknown): v is TeamRole => typeof v === "string" && (TEAM_ROLES as readonly string[]).includes(v);
export const LOC_HANG_DOI = ["ALL", "MINE", "UNASSIGNED"] as const;
export type LocHangDoi = (typeof LOC_HANG_DOI)[number];
export const LOC_HANG_DOI_NAME: Record<LocHangDoi, string> = { ALL: "Tất cả", MINE: "Của tôi", UNASSIGNED: "Chưa ai nhận" };
export const isLocHangDoi = (v: unknown): v is LocHangDoi => typeof v === "string" && (LOC_HANG_DOI as readonly string[]).includes(v);

// src/modules/feedback/quyen.ts
export interface Membership { teamId: string; role: TeamRole }
export interface QuyenPhieu {
  doc: boolean;                       // đọc phiếu (người gửi, người xử lý, Toàn quyền)
  xuLy: boolean;                      // đổi trạng thái, trả lời công khai, ghi chú nội bộ, nhận việc
  giaoViecChoNguoiKhac: boolean;      // giao người xử lý là người khác
  chuyenNhom: boolean;
  noiBo: "none" | "team" | "all";     // đọc ghi chú nội bộ: không / chỉ của nhóm đang giữ phiếu / tất cả
}
export function quyenPhieu(a: { who: PermissionHolder; submitterId: string; ticketTeamId: string; memberships: readonly Membership[] }): QuyenPhieu;
export function choPhepNhomGui(who: PermissionHolder, teamId: string): boolean;
```

- [ ] **Bước 1: Viết bài (đỏ trước)** — `src/modules/feedback/quyen.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";
import { NHOM_KY_THUAT_ID } from "../../shared/ve-ho-tro.ts";
import { choPhepNhomGui, quyenPhieu, type Membership } from "./quyen.ts";

const KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const who = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const TV = (teamId: string, role: "LEAD" | "MEMBER" = "MEMBER"): Membership => ({ teamId, role });
const q = (w: ReturnType<typeof who>, m: Membership[], over: Partial<{ submitterId: string; ticketTeamId: string }> = {}) =>
  quyenPhieu({ who: w, submitterId: over.submitterId ?? "gui", ticketTeamId: over.ticketTeamId ?? KE_TOAN, memberships: m });

test("người ngoài nhóm và không phải người gửi: không đọc, không xử lý (mọi mã quyền trừ Toàn quyền)", () => {
  for (const p of PERMISSION_CODES.filter((p) => p !== "SUPER_ADMIN")) {
    const r = q(who("la", p), [TV(NHAN_SU, "LEAD")]); // là Trưởng nhóm của nhóm KHÁC
    assert.deepEqual(r, { doc: false, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" }, p);
  }
});

test("Quản trị (ADMIN) không có đường tắt vào phiếu nhóm nhạy cảm", () => {
  assert.equal(q(who("qt", "ADMIN"), []).doc, false);
});

test("người gửi: đọc được phiếu của mình, không xử lý, không thấy ghi chú nội bộ", () => {
  const r = q(who("gui", "SALES"), [], { submitterId: "gui" });
  assert.deepEqual(r, { doc: true, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("người gửi đồng thời là thành viên nhóm nhận: vẫn chỉ là người gửi (R2)", () => {
  const r = q(who("gui", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { submitterId: "gui" });
  assert.equal(r.doc, true);
  assert.equal(r.xuLy, false);
  assert.equal(r.chuyenNhom, false);
  assert.equal(r.noiBo, "none");
});

test("thành viên nhóm giữ phiếu: đọc, xử lý, thấy ghi chú của nhóm; không giao người khác, không chuyển nhóm", () => {
  const r = q(who("tv", "ACCOUNTING"), [TV(KE_TOAN, "MEMBER")]);
  assert.deepEqual(r, { doc: true, xuLy: true, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "team" });
});

test("Trưởng nhóm: thêm giao việc và chuyển nhóm; thành viên nhóm khác thì không", () => {
  const r = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")]);
  assert.equal(r.giaoViecChoNguoiKhac, true);
  assert.equal(r.chuyenNhom, true);
  assert.equal(q(who("tn", "ACCOUNTING"), [TV(NHAN_SU, "LEAD")]).chuyenNhom, false);
});

test("Toàn quyền: mọi quyền, thấy ghi chú nội bộ của mọi nhóm, kể cả phiếu mình gửi", () => {
  for (const submitterId of ["gui", "sa"]) {
    const r = q(who("sa", "SUPER_ADMIN"), [], { submitterId });
    assert.deepEqual(r, { doc: true, xuLy: true, giaoViecChoNguoiKhac: true, chuyenNhom: true, noiBo: "all" });
  }
});

test("tư cách thành viên chỉ tính cho ĐÚNG nhóm giữ phiếu (sau chuyển nhóm, Trưởng nhóm cũ mất quyền)", () => {
  const truoc = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { ticketTeamId: KE_TOAN });
  const sau = q(who("tn", "ACCOUNTING"), [TV(KE_TOAN, "LEAD")], { ticketTeamId: NHAN_SU });
  assert.equal(truoc.xuLy, true);
  assert.deepEqual(sau, { doc: false, xuLy: false, giaoViecChoNguoiKhac: false, chuyenNhom: false, noiBo: "none" });
});

test("bên ngoài chỉ được gửi tới nhóm Kỹ thuật; nội bộ gửi nhóm nào cũng được", () => {
  for (const p of ["PARTNER", "DRIVER_PARTNER"] as const) {
    assert.equal(choPhepNhomGui(who("x", p), NHOM_KY_THUAT_ID), true, p);
    assert.equal(choPhepNhomGui(who("x", p), KE_TOAN), false, p);
  }
  assert.equal(choPhepNhomGui(who("x", "SALES"), KE_TOAN), true);
  assert.equal(choPhepNhomGui(who("x", "SALES", "PARTNER"), KE_TOAN), false, "tài khoản lai có mã bên ngoài vẫn bị giới hạn");
});
```

- [ ] **Bước 2: Chạy cho đỏ** — `node --test src/modules/feedback/quyen.test.ts` → ĐỎ (chưa có tệp).

- [ ] **Bước 3: Viết hằng dùng chung** — `src/shared/ve-ho-tro.ts` đúng như khối «Sản phẩm» ở trên (phần `ve-ho-tro.ts`).

- [ ] **Bước 4: Viết `src/modules/feedback/quyen.ts`**

```ts
// Luật quyền của Vé hỗ trợ (ADR-0119): MỘT hàm thuần quyết định mọi quyền đọc/xử lý/chuyển nhóm của một phiếu. Không I/O.
// Ô `feedback.triage` của MATRIX vẫn CHỈ Toàn quyền; tư cách thành viên nhóm là dữ liệu `fbk_team_member` do route nạp rồi truyền vào đây.
// Hàm này nằm trong GUARDS của src/route-write-guard.test.ts: mọi route ghi mới phải gọi nó (hoặc `can`) và DÙNG kết quả.
import { can, isExternalPermission, type PermissionHolder } from "../../shared/permissions.ts";
import { NHOM_KY_THUAT_ID, type TeamRole } from "../../shared/ve-ho-tro.ts";

export interface Membership {
  teamId: string;
  role: TeamRole;
}
export interface QuyenPhieu {
  doc: boolean;
  xuLy: boolean;
  giaoViecChoNguoiKhac: boolean;
  chuyenNhom: boolean;
  noiBo: "none" | "team" | "all";
}

export function quyenPhieu(a: { who: PermissionHolder; submitterId: string; ticketTeamId: string; memberships: readonly Membership[] }): QuyenPhieu {
  const sieu = can(a.who, "feedback.triage");
  const laNguoiGui = a.who.id === a.submitterId;
  const tv = a.memberships.find((m) => m.teamId === a.ticketTeamId) ?? null;
  // Người gửi chỉ có tư cách người gửi với phiếu của chính mình (R2), trừ Toàn quyền.
  const xuLy = sieu || (tv !== null && !laNguoiGui);
  const truongNhom = tv !== null && tv.role === "LEAD" && !laNguoiGui;
  return {
    doc: xuLy || can(a.who, "feedback.view", { ownerId: a.submitterId }),
    xuLy,
    giaoViecChoNguoiKhac: sieu || truongNhom,
    chuyenNhom: sieu || truongNhom,
    noiBo: sieu ? "all" : xuLy ? "team" : "none",
  };
}

/** Tài khoản có mã quyền bên ngoài (kể cả tài khoản lai) chỉ gửi được tới nhóm Kỹ thuật (ADR-0119 điều 6). Nhóm có thật và đang dùng do route kiểm. */
export function choPhepNhomGui(who: PermissionHolder, teamId: string): boolean {
  return who.permissions.some(isExternalPermission) ? teamId === NHOM_KY_THUAT_ID : true;
}
```

- [ ] **Bước 5: Chạy cho xanh** — `node --test src/modules/feedback/quyen.test.ts` → 9 bài đạt.

- [ ] **Bước 6: Khai vào `GUARDS`** (sửa hàng rào, đã được duyệt ở ADR-0119 điều 3) — trong `src/route-write-guard.test.ts` thêm sau dòng `canRead`:

```ts
  { name: "quyenPhieu", file: "src/modules/feedback/quyen.ts", hoiBang: true }, // ADR-0119: quyền đọc/xử lý phiếu theo tư cách thành viên nhóm; bên trong hỏi can() của MATRIX
```
Chạy `node --test src/route-write-guard.test.ts` → xanh (tệp có `can(`, tên khớp; chưa route nào dùng).

- [ ] **Bước 7: Quan sát hàng rào chặn thật (P16)** — tạm đổi `hoiBang` hợp lệ: sửa `quyen.ts` bỏ hết `can(` (thay bằng `false`), chạy `node --test src/route-write-guard.test.ts` → ĐỎ với «không còn hỏi bảng?»; hoàn nguyên. Ghi ngày + phép đột biến để đưa vào Sổ hàng rào ở Việc 8.

- [ ] **Bước 8: Commit** (`src/shared/ve-ho-tro.ts`, `quyen.ts`, `quyen.test.ts`, `route-write-guard.test.ts`).

---

## Việc 3: Gửi phiếu tới nhóm; danh sách nhóm; luật bên ngoài

**Tệp:**
- Sửa: `src/modules/feedback/repository.ts` (cột `team_id`, `team_name`, `team_sensitive` trong `TicketRow`/`COLS`/`FROM`; `INSERT_TICKET`; hàm đọc nhóm)
- Sửa: `src/modules/feedback/rules.ts` (`validateTicketInput` nhận `teamId` tuỳ chọn)
- Sửa: `src/modules/feedback/index.ts` (route `POST /api/feedback`, thêm `GET /api/feedback/teams`)
- Sửa: `src/shared/contracts.ts` (DTO)
- Tạo bài: `src/modules/feedback/ve-ho-tro-route.test.ts`
- Sửa: `src/route-access.test.ts`

**Giao diện:**
- Tiêu thụ: `quyenPhieu`, `choPhepNhomGui`, `NHOM_KY_THUAT_ID` (Việc 2).
- Sản phẩm: `FeedbackTicketDto` thêm `teamId: string; teamName: string; teamSensitive: boolean`; `FeedbackCreateInput` thêm `teamId?: string`; kiểu mới
```ts
export interface FeedbackTeamDto { id: string; code: string; name: string; description: string; sensitive: boolean }
export interface FeedbackMyTeamDto { teamId: string; role: "LEAD" | "MEMBER" }
export interface FeedbackTeamsResponse { teams: FeedbackTeamDto[]; mine: FeedbackMyTeamDto[]; isSuper: boolean }
```
và repository: `listTeamsActive(db): Promise<TeamRow[]>`, `getTeam(db, id): Promise<TeamRow | null>`, `membershipsOf(db, staffId): Promise<Membership[]>`.

- [ ] **Bước 1: Viết bài route (đỏ trước)** — `src/modules/feedback/ve-ho-tro-route.test.ts` (phần đầu; các việc sau thêm ca vào chính tệp này)

```ts
// Vé hỗ trợ đợt 1 (ADR-0119) trên khung thử (ỨNG DỤNG THẬT + SQLite dựng từ migrations).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT_TV = U(3), KT_TN = U(4), NS_TV = U(5), QT = U(6), PARTNER = U(7), KT_GUI = U(8);
const KY_THUAT = "fbk-team-ky-thuat", KE_TOAN = "fbk-team-ke-toan", NHAN_SU = "fbk-team-nhan-su";
const NOW = "2026-10-15T00:00:00.000Z";

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT_TV, "0900000003", ["ACCOUNTING"]], [KT_TN, "0900000004", ["ACCOUNTING"]],
    [NS_TV, "0900000005", ["HR"]], [QT, "0900000006", ["ADMIN"]], [PARTNER, "0900000007", ["PARTNER"]], [KT_GUI, "0900000008", ["ACCOUNTING"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  const them = (team: string, staff: string, role: "LEAD" | "MEMBER") =>
    w.sqlite.exec(`INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, updated_at) VALUES ('tv-${team}-${staff}', '${team}', '${staff}', '${role}', '${NOW}', '${NOW}', '${NOW}')`);
  them(KE_TOAN, KT_TV, "MEMBER"); them(KE_TOAN, KT_TN, "LEAD"); them(KE_TOAN, KT_GUI, "MEMBER"); them(NHAN_SU, NS_TV, "MEMBER");
  return w;
}
const tao = (w: any, as: string, teamId?: string, over: Record<string, unknown> = {}) =>
  w.call("POST", "/api/feedback", { as, body: { kind: "QUESTION", title: "Hỏi về công nợ", body: "Nội dung hỏi.", clientRequestId: crypto.randomUUID(), context: {}, ...(teamId ? { teamId } : {}), ...over } });

test("gửi phiếu tới nhóm: lưu đúng nhóm; thiếu teamId ⇒ Kỹ thuật (bản web cũ vẫn gửi được)", async () => {
  const w = setup();
  const a = await tao(w, SALES, KE_TOAN);
  assert.equal(a.status, 201, a.text);
  assert.equal(a.json.ticket.teamId, KE_TOAN);
  assert.equal(a.json.ticket.teamName, "Kế toán");
  const b = await tao(w, SALES);
  assert.equal(b.status, 201, b.text);
  assert.equal(b.json.ticket.teamId, KY_THUAT);
});

test("nhóm không tồn tại hoặc đã ngưng ⇒ 400, không lưu gì", async () => {
  const w = setup();
  assert.equal((await tao(w, SALES, "khong-co")).status, 400);
  w.sqlite.exec(`UPDATE fbk_team SET active = 0 WHERE id = '${NHAN_SU}'`);
  const r = await tao(w, SALES, NHAN_SU);
  assert.equal(r.status, 400, r.text);
  assert.equal(w.q("SELECT count(*) AS n FROM fbk_ticket")[0].n, 0);
});

test("bên ngoài (PARTNER): gửi Kỹ thuật được; nhóm khác ⇒ 403; danh sách nhóm chỉ có Kỹ thuật", async () => {
  const w = setup();
  assert.equal((await tao(w, PARTNER, KY_THUAT)).status, 201);
  const r = await tao(w, PARTNER, KE_TOAN);
  assert.equal(r.status, 403, r.text);
  const g = await w.call("GET", "/api/feedback/teams", { as: PARTNER });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json.teams.map((t: any) => t.id), [KY_THUAT]);
});

test("danh sách nhóm cho nội bộ: đủ nhóm đang dùng, kèm tư cách thành viên của chính người gọi", async () => {
  const w = setup();
  const g = await w.call("GET", "/api/feedback/teams", { as: KT_TN });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.teams.length, 4);
  assert.deepEqual(g.json.mine, [{ teamId: KE_TOAN, role: "LEAD" }]);
  assert.equal(g.json.isSuper, false);
  assert.equal((await w.call("GET", "/api/feedback/teams", { as: SUPER })).json.isSuper, true);
  assert.equal((await w.call("GET", "/api/feedback/teams")).status, 401);
});

test("người gửi chỉ thấy phiếu của mình ở /mine; người khác đọc chi tiết ⇒ 404", async () => {
  const w = setup();
  const a = await tao(w, SALES, KE_TOAN);
  assert.equal((await w.call("GET", `/api/feedback/${a.json.ticket.id}`, { as: QT })).status, 404);
  assert.equal((await w.call("GET", `/api/feedback/${a.json.ticket.id}`, { as: SALES })).status, 200);
});
```

- [ ] **Bước 2: Chạy cho đỏ** — `node --test src/modules/feedback/ve-ho-tro-route.test.ts` → ĐỎ (không có `teamId` trong DTO, `/teams` 404). Ca cuối có thể đã xanh (hành vi cũ) — chấp nhận.

- [ ] **Bước 3: Hợp đồng DTO** — trong `src/shared/contracts.ts`: thêm ba trường vào `FeedbackTicketDto`, `teamId?: string` vào `FeedbackCreateInput`, và ba kiểu mới ở khối «Interfaces» trên; export qua `Api` như các kiểu `Feedback*` khác.

- [ ] **Bước 4: Repository** — trong `repository.ts`:

```ts
export interface TeamRow { id: string; code: string; name: string; description: string; sensitive: number; active: number; sort_order: number }
// TicketRow: thêm  team_id: string; team_name: string; team_sensitive: number;
// COLS: thêm  t.team_id, tm.name AS team_name, tm.sensitive AS team_sensitive,
// FROM: thêm  JOIN fbk_team tm ON tm.id = t.team_id   (sau JOIN fbk_status)

const LIST_TEAMS_ACTIVE = defineSql("feedback", "list_teams_active", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team WHERE active = 1 ORDER BY sort_order, name`);
const GET_TEAM = defineSql("feedback", "get_team", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team WHERE id = ?1`);
// Thành viên ĐANG hiệu lực của MỘT tài khoản CÒN HOẠT ĐỘNG (khoá tài khoản ⇒ mất quyền ngay — ADR-0119 điều 8).
const MEMBERSHIPS_OF = defineSql(
  "feedback",
  "memberships_of",
  `SELECT m.team_id, m.role FROM fbk_team_member m
   WHERE m.staff_id = ?1 AND m.valid_to_at IS NULL AND EXISTS (SELECT 1 FROM v_stf_staff_label s WHERE s.id = ?1 AND s.active = 1)`,
);
export const listTeamsActive = async (db: D1Database): Promise<TeamRow[]> => (await db.prepare(LIST_TEAMS_ACTIVE).all<TeamRow>()).results;
export const getTeam = (db: D1Database, id: string) => db.prepare(GET_TEAM).bind(id).first<TeamRow>();
export const membershipsOf = async (db: D1Database, staffId: string): Promise<{ teamId: string; role: "LEAD" | "MEMBER" }[]> =>
  (await db.prepare(MEMBERSHIPS_OF).bind(staffId).all<{ team_id: string; role: "LEAD" | "MEMBER" }>()).results.map((r) => ({ teamId: r.team_id, role: r.role }));
```
`INSERT_TICKET`: thêm cột `team_id` và tham số `?10`:
```sql
INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, created_by, updated_at, updated_by, team_id)
SELECT ?1, COALESCE((SELECT max(seq) FROM fbk_ticket), 0) + 1, ?2, 'NEW', ?3, ?4, ?5, ?6, ?7, ?7, ?5, ?7, ?5, ?10
WHERE (SELECT count(*) FROM fbk_ticket WHERE submitter_id = ?5 AND created_at > ?8) < ?9
  AND NOT EXISTS (SELECT 1 FROM fbk_ticket WHERE submitter_id = ?5 AND client_request_id = ?6)
```
`insertTicketStatement` nhận thêm `teamId` và `.bind(…, a.limit, a.teamId)`. `INSERT_FIRST_MESSAGE` và `INSERT_REPLY` thêm cột `team_id` lấy từ phiếu: thay `SELECT ?1, ?2, …` bằng `SELECT ?1, ?2, …, (SELECT team_id FROM fbk_ticket WHERE id = ?2)` và thêm `team_id` vào danh sách cột (đặt cuối).

- [ ] **Bước 5: Route** — trong `index.ts`:
  - `toTicket` thêm `teamId: r.team_id, teamName: r.team_name, teamSensitive: r.team_sensitive === 1`.
  - `POST /api/feedback`: sau `validateTicketInput`, nạp nhóm và kiểm trước khi `batch`:
```ts
const teamId = v.value.teamId ?? NHOM_KY_THUAT_ID;
const team = await getTeam(env.DB, teamId);
if (!team || team.active !== 1) return error(400, "invalid_input", "Nhóm nhận không hợp lệ.");
if (!choPhepNhomGui(staff, teamId)) return error(403, "forbidden", "Tài khoản của bạn chỉ gửi được tới nhóm Kỹ thuật.");
```
  và truyền `teamId` vào `insertTicketStatement`. `validateTicketInput` (rules.ts) thêm `teamId?: string` vào `TicketInput`: nhận chuỗi khớp `/^[a-z0-9-]{1,60}$/` nếu có, ngược lại 400 «Nhóm nhận không hợp lệ.».
  - Tuyến mới đứng **trước** `/api/feedback/:id`:
```ts
route("GET", "/api/feedback/teams", "staff", async ({ env, staff }) => {
  const [teams, mine] = await Promise.all([listTeamsActive(env.DB), membershipsOf(env.DB, staff.id)]);
  const ngoai = staff.permissions.some(isExternalPermission);
  return json({
    teams: teams.filter((t) => !ngoai || t.id === NHOM_KY_THUAT_ID).map((t) => ({ id: t.id, code: t.code, name: t.name, description: t.description, sensitive: t.sensitive === 1 })),
    mine,
    isSuper: can(staff, "feedback.triage"),
  } satisfies FeedbackTeamsResponse);
}),
```
  (import `isExternalPermission` từ `../../shared/permissions`; kiểu từ `../../shared/contracts`.)

- [ ] **Bước 6: Cập nhật bảng cổng** — `src/route-access.test.ts`: thêm dòng `{ method: "GET", path: "/api/feedback/teams", access: "staff" },` cạnh các dòng `/api/feedback*`.

- [ ] **Bước 7: Chạy** — `node --test src/modules/feedback/ve-ho-tro-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/architecture.test.ts` và `npm run typecheck` → xanh. Rồi `npm test`.

- [ ] **Bước 8: Commit** («Vé hỗ trợ đợt 1: gửi phiếu tới nhóm, danh sách nhóm, bên ngoài chỉ nhóm Kỹ thuật»).

---

## Việc 4: Quản lý nhóm (Toàn quyền) và ô quyền mới

**Tệp:**
- Sửa: `src/shared/permissions.ts` (ô `feedback.team.manage`)
- Sửa: `src/shared/permissions.test.ts` (mọi dòng ghim cột có `"feedback.triage"`)
- Sửa: `src/shared/audit-actions.ts` (bốn thao tác nhật ký)
- Sửa: `src/modules/feedback/repository.ts`, `index.ts`, `rules.ts`
- Sửa bài: `ve-ho-tro-route.test.ts`, `src/route-access.test.ts`

**Giao diện:**
- Sản phẩm: ô `feedback.team.manage`; thao tác nhật ký `feedback_team_created`, `feedback_team_updated`, `feedback_team_member_changed`; route
  `GET /api/feedback/admin/teams`, `POST /api/feedback/admin/teams`, `PATCH /api/feedback/admin/teams/:id`, `PUT /api/feedback/admin/teams/:id/members/:staffId` (body `{ role }`), `DELETE /api/feedback/admin/teams/:id/members/:staffId` — đều `access: "staff"` rồi `can(staff, "feedback.team.manage")`.
- DTO: `FeedbackAdminTeamDto = FeedbackTeamDto & { active: boolean; members: { staffId: string; name: string | null; role: "LEAD" | "MEMBER" }[] }`; `FeedbackAdminTeamsResponse { teams: FeedbackAdminTeamDto[] }`.

- [ ] **Bước 1: Thêm ca vào bài route (đỏ trước)**

```ts
const admin = (w: any, method: string, path: string, as: string, body?: unknown) => w.call(method, `/api/feedback/admin/teams${path}`, { as, ...(body ? { body } : {}) });

test("quản lý nhóm: chỉ Toàn quyền; Quản trị, Nhân sự, thành viên và Trưởng nhóm đều 403", async () => {
  const w = setup();
  for (const as of [QT, NS_TV, KT_TN, SALES, PARTNER]) {
    assert.equal((await admin(w, "GET", "", as)).status, 403, as);
    assert.equal((await admin(w, "POST", "", as, { code: "MOI", name: "Nhóm mới", description: "", sensitive: false })).status, 403, as);
    assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, as, { role: "MEMBER" })).status, 403, as);
  }
  assert.equal((await admin(w, "GET", "", SUPER)).status, 200);
});

test("Toàn quyền tạo nhóm, sửa cờ nhạy cảm, ngưng nhóm; mã trùng ⇒ 409; nhật ký không ghi mô tả", async () => {
  const w = setup();
  const t = await admin(w, "POST", "", SUPER, { code: "BAN_HANG", name: "Bán hàng", description: "Hỏi đáp bán hàng", sensitive: false });
  assert.equal(t.status, 201, t.text);
  assert.equal((await admin(w, "POST", "", SUPER, { code: "BAN_HANG", name: "Trùng", description: "", sensitive: false })).status, 409);
  const id = t.json.team.id;
  assert.equal((await admin(w, "PATCH", `/${id}`, SUPER, { sensitive: true })).json.team.sensitive, true);
  assert.equal((await admin(w, "PATCH", `/${id}`, SUPER, { active: false })).json.team.active, false);
  const nhatKy = w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'feedback_team_%' ORDER BY rowid");
  assert.deepEqual(nhatKy.map((r: any) => r.action), ["feedback_team_created", "feedback_team_updated", "feedback_team_updated"]);
  assert.ok(nhatKy.every((r: any) => !String(r.detail ?? "").includes("Hỏi đáp bán hàng")), "mô tả nhóm không vào nhật ký");
});

test("thành viên: thêm, đổi vai, gỡ (kết thúc hiệu lực); người không tồn tại hoặc đã khoá ⇒ 400; gỡ rồi mất quyền ngay", async () => {
  const w = setup();
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "MEMBER" })).status, 200);
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "LEAD" })).status, 200);
  assert.equal(w.q(`SELECT role FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}' AND valid_to_at IS NULL`)[0].role, "LEAD");
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/${SALES}`, SUPER, { role: "BOSS" })).status, 400);
  assert.equal((await admin(w, "PUT", `/${KY_THUAT}/members/khong-co`, SUPER, { role: "MEMBER" })).status, 400);
  assert.equal((await admin(w, "DELETE", `/${KY_THUAT}/members/${SALES}`, SUPER)).status, 200);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}' AND valid_to_at IS NULL`)[0].n, 0);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_team_member WHERE team_id='${KY_THUAT}' AND staff_id='${SALES}'`)[0].n, 2, "dòng cũ giữ lại làm lịch sử");
});
```
(Nếu cột nhật ký thật không tên `audit_log`/`detail`, đối chiếu `migrations` và chỉnh truy vấn trong bài; **không** đổi tên bảng nhật ký.)

- [ ] **Bước 2: Chạy cho đỏ** — `node --test src/modules/feedback/ve-ho-tro-route.test.ts` → ĐỎ (404).

- [ ] **Bước 3: Ô quyền mới** — `src/shared/permissions.ts`, sau dòng `feedback.triage`:

```ts
  "feedback.team.manage": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // tạo/ngưng nhóm hỗ trợ, gán/gỡ thành viên — chỉ Toàn quyền (ADR-0119)
```
Cập nhật bình luận khối `feedback.*` ở đầu tệp (một câu nói thêm ô này). Chạy `node --test src/shared/permissions.test.ts`: các bài «ghim nguyên dòng» đỏ — chạy `grep -n '"feedback.triage"' src/shared/permissions.test.ts` rồi thêm cạnh mỗi dòng `"feedback.team.manage": <giá trị>` (cột Toàn quyền = `"any"`, mọi cột khác `"none"`). Bài đếm tập con quyền nếu có hằng số lượng ô thì cập nhật theo đúng thông điệp đỏ.

- [ ] **Bước 4: Thao tác nhật ký** — `src/shared/audit-actions.ts` thêm cạnh `feedback_assigned`:

```ts
  feedback_team_created: { label: "Tạo nhóm hỗ trợ", group: "feedback" },
  feedback_team_updated: { label: "Sửa nhóm hỗ trợ", group: "feedback" },
  feedback_team_member_changed: { label: "Đổi thành viên nhóm hỗ trợ", group: "feedback" },
```
Chạy bài nhật ký (`node --test src/shared/audit-actions.test.ts` nếu có; hoặc `npm test` ở bước 8) và thêm vào mọi danh sách liệt kê đầy đủ thao tác mà bài chỉ ra (vd `src/shared/lich-su-doi-tac.ts:80`).

- [ ] **Bước 5: Repository** — thêm vào `repository.ts`:

```ts
const LIST_TEAMS_ALL = defineSql("feedback", "list_teams_all", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team ORDER BY sort_order, name`);
const LIST_MEMBERS_ALL = defineSql(
  "feedback",
  "list_members_all",
  `SELECT m.team_id, m.staff_id, s.label AS name, m.role FROM fbk_team_member m LEFT JOIN v_stf_staff_label s ON s.id = m.staff_id
   WHERE m.valid_to_at IS NULL ORDER BY m.team_id, m.role, s.label`,
);
// ?1 id, ?2 mã, ?3 tên, ?4 mô tả, ?5 nhạy cảm, ?6 sort_order (max+1), ?7 bây giờ, ?8 người làm
const INSERT_TEAM = defineSql(
  "feedback",
  "insert_team",
  `INSERT INTO fbk_team (id, code, name, description, sensitive, sort_order, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, COALESCE((SELECT max(sort_order) FROM fbk_team), 0) + 1, ?7, ?8, ?7, ?8
   WHERE NOT EXISTS (SELECT 1 FROM fbk_team WHERE code = ?2)`,
);
// ?1 id, ?2 tên|NULL, ?3 mô tả|NULL, ?4 nhạy cảm|NULL, ?5 đang dùng|NULL, ?6 bây giờ, ?7 người làm
const PATCH_TEAM = defineSql(
  "feedback",
  "patch_team",
  `UPDATE fbk_team SET name = COALESCE(?2, name), description = COALESCE(?3, description), sensitive = COALESCE(?4, sensitive), active = COALESCE(?5, active), updated_at = ?6, updated_by = ?7 WHERE id = ?1`,
);
// Đổi vai = kết thúc dòng cũ rồi thêm dòng mới (hai câu cùng lô). ?1 nhóm, ?2 người, ?3 bây giờ, ?4 người làm.
const END_MEMBER = defineSql("feedback", "end_member", `UPDATE fbk_team_member SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE team_id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL`);
// ?1 id, ?2 nhóm, ?3 người, ?4 vai, ?5 bây giờ, ?6 người làm; chỉ chèn khi người ĐANG HOẠT ĐỘNG.
const INSERT_MEMBER = defineSql(
  "feedback",
  "insert_member",
  `INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?3 AND active = 1) AND EXISTS (SELECT 1 FROM fbk_team WHERE id = ?2)`,
);
```
kèm các hàm bọc `listTeamsAll`, `listMembersAll`, `insertTeamStatement`, `patchTeamStatement`, `endMemberStatement`, `insertMemberStatement` (cùng khuôn `db.prepare(SQL).bind(...)` như các hàm hiện có).

- [ ] **Bước 6: Route + luật đầu vào** — trong `rules.ts` thêm `validateTeamInput(raw)` (mã `^[A-Z0-9_]{1,40}$`, tên 1–60 ký tự sau trim, mô tả ≤ 300, `sensitive` boolean) và `validateTeamPatch(raw)` (ít nhất một trường trong `name|description|sensitive|active`); trả `Checked<…>` như các hàm cũ. Trong `index.ts` thêm năm route theo mẫu mỗi route:
```ts
route("POST", "/api/feedback/admin/teams", "staff", async ({ request, env, staff }) => {
  if (!can(staff, "feedback.team.manage")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được quản lý nhóm hỗ trợ.");
  const raw = await readJson(request);
  if (!raw) return BAD_JSON();
  const v = validateTeamInput(raw);
  if (!v.ok) return error(400, "invalid_input", v.message);
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  await env.DB.batch([
    insertTeamStatement(env.DB, { id, code: v.value.code, name: v.value.name, description: v.value.description, sensitive: v.value.sensitive, now: at, by: staff.id }),
    auditStatement(env.DB, { staffId: staff.id, action: "feedback_team_created", at, targetType: "feedback", targetId: id, detail: v.value.code }, `EXISTS (SELECT 1 FROM fbk_team WHERE id = '${id}')`),
  ]);
  const t = await getTeam(env.DB, id);
  if (!t) return error(409, "duplicate", "Mã nhóm đã có.");
  return json({ team: toAdminTeam(t, []) }, 201);
}),
```
  Các route còn lại cùng khuôn: `PATCH` (nhật ký `feedback_team_updated`, detail = mã nhóm, **không** ghi tên/mô tả), `PUT …/members/:staffId` (lô `[END_MEMBER, INSERT_MEMBER, audit điều kiện EXISTS dòng mới]`; không chèn được ⇒ 400 «Tài khoản không tồn tại hoặc đã khoá.»), `DELETE …/members/:staffId` (lô `[END_MEMBER, audit điều kiện changes() > 0]`; gỡ người không phải thành viên ⇒ 404), `GET` (trả `listTeamsAll` + `listMembersAll` ghép theo nhóm). Kiểm `UUID`/tồn tại nhóm ở đầu từng route (`getTeam` null ⇒ 404). Nhật ký `detail` chỉ có mã nhóm và (với thành viên) vai, **không** tên người, **không** SĐT.

- [ ] **Bước 7: Bảng cổng** — `src/route-access.test.ts` thêm năm dòng `access: "staff"` cho năm route trên (đúng `method`/`path` mẫu `:id`, `:staffId`).

- [ ] **Bước 8: Chạy** — `node --test src/modules/feedback/ve-ho-tro-route.test.ts src/shared/permissions.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts` và `npm run typecheck`, rồi `npm test`. Kỳ vọng xanh. (`permission-enforcement.test.ts` thấy `"feedback.team.manage"` được hỏi bằng `can(` trong `index.ts` ⇒ không cần mục hoãn.)

- [ ] **Bước 9: Commit.**

---

## Việc 5: Hàng đợi nhóm, chưa đọc riêng, nhận/giao việc, chuyển nhóm, ghi chú nội bộ theo nhóm

Đây là việc lớn nhất; làm theo từng ca, mỗi ca đỏ → xanh, **commit sau mỗi hai ba ca**.

**Tệp:**
- Sửa: `repository.ts`, `index.ts`, `rules.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts` (`feedback_claimed`, `feedback_team_changed`)
- Sửa bài: `ve-ho-tro-route.test.ts`, `src/route-access.test.ts`, `src/modules/audit/an-toan-quyen.test.ts`, `src/modules/accounts/hanh-chinh-nhan-su.test.ts` (chỉ khi đỏ)

**Giao diện — Sản phẩm:**
- `GET /api/feedback/queue?team=<id>&loc=ALL|MINE|UNASSIGNED&status=<mã>&limit&offset` → `FeedbackQueueResponse` (thống kê tuần **chỉ của nhóm đó**).
- `POST /api/feedback/:id/claim` → `FeedbackDetailResponse` (409 `taken` «Vừa có người nhận việc này.»).
- `PATCH /api/feedback/:id` (tuyến cũ `admin`) **giữ nguyên**; thêm `PATCH /api/feedback/:id/xu-ly` (cổng `staff`, dùng `quyenPhieu`): body `{ status?, assigneeId?, resolvedIn? }` — hành vi như tuyến cũ nhưng quyền theo `quyenPhieu`; giao cho người khác cần `giaoViecChoNguoiKhac`, người nhận phải là thành viên đang hiệu lực của nhóm giữ phiếu.
- `POST /api/feedback/:id/transfer` body `{ teamId, reason }` (`reason` 1–300 ký tự) → `FeedbackDetailResponse`.
- `FeedbackDetailResponse` thêm `perms: { xuLy: boolean; giaoViec: boolean; chuyenNhom: boolean }` (giữ `canTriage = perms.xuLy` cho giao diện cũ).
- `FeedbackTicketDto` thêm `assigneeActive: boolean` (người xử lý còn hoạt động; false ⇒ giao diện coi như «chưa ai nhận»).
- Repository: `membershipsOf` (Việc 3); thêm `markSeenFor(db, ticketId, staffId, asSubmitter, now)`, `claimStatement`, `transferStatement`, `insertEventStatement`, `insertTransferNoteStatement`, `listQueueTeam`, `statsTeam`, `badgeCounts(db, staffId, isSuper)`; `listMessages(db, ticketId, noiBo: "none"|"team"|"all", teamId)`.

### 5a. Phiếu xem được theo `quyenPhieu`; ghi chú nội bộ theo nhóm

- [ ] **Bước 1: Ca đỏ**

```ts
const d = (w: any, id: string, as: string) => w.call("GET", `/api/feedback/${id}`, { as });
const traLoi = (w: any, id: string, as: string, body: string, internal = false) => w.call("POST", `/api/feedback/${id}/messages`, { as, body: { body, internal } });

test("thành viên nhóm nhận đọc được phiếu và ghi chú nội bộ của nhóm; người ngoài nhóm 404; người gửi không thấy ghi chú nội bộ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_TV, "Ghi chú nội bộ kế toán", true)).status, 201);
  const tv = await d(w, id, KT_TV);
  assert.equal(tv.status, 200, tv.text);
  assert.ok(tv.json.messages.some((m: any) => m.internal), "thành viên thấy ghi chú nội bộ");
  assert.equal(tv.json.perms.xuLy, true);
  const gui = await d(w, id, SALES);
  assert.equal(gui.status, 200);
  assert.ok(gui.json.messages.every((m: any) => !m.internal), "người gửi KHÔNG thấy ghi chú nội bộ");
  assert.equal(gui.json.perms.xuLy, false);
  for (const as of [NS_TV, QT, PARTNER]) assert.equal((await d(w, id, as)).status, 404, as);
  assert.equal((await d(w, id, SUPER)).status, 200);
});

test("người gửi tự là thành viên nhóm nhận: không ghi được ghi chú nội bộ trên phiếu của mình (403) và không thấy ghi chú", async () => {
  const w = setup();
  const id = (await tao(w, KT_GUI, KE_TOAN)).json.ticket.id;
  assert.equal((await traLoi(w, id, KT_GUI, "tự ghi", true)).status, 403);
  assert.equal((await traLoi(w, id, KT_TV, "nhóm ghi", true)).status, 201);
  assert.ok((await d(w, id, KT_GUI)).json.messages.every((m: any) => !m.internal));
});

test("thành viên bị khoá tài khoản hoặc bị gỡ khỏi nhóm: mất quyền đọc ngay", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await d(w, id, KT_TV)).status, 200);
  await admin(w, "DELETE", `/${KE_TOAN}/members/${KT_TV}`, SUPER);
  assert.equal((await d(w, id, KT_TV)).status, 404);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TN}'`);
  assert.equal((await d(w, id, KT_TN)).status, 401, "tài khoản khoá không còn phiên hợp lệ"); // nếu khung thử trả 403/404, ghi lại mã thật và giữ nguyên ý: KHÔNG đọc được
});
```

- [ ] **Bước 2: Chạy cho đỏ**.
- [ ] **Bước 3: Cài đặt** — trong `index.ts` thay `canRead(who, submitterId)` bằng hàm nạp-rồi-quyết:

```ts
async function quyenCuaToi(db: D1Database, who: PermissionHolder, t: TicketRow): Promise<QuyenPhieu> {
  return quyenPhieu({ who, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await membershipsOf(db, who.id) });
}
```
  `detail()` và hai route `GET /:id`, `POST /:id/messages` dùng nó: `!q.doc` ⇒ 404; ghi chú nội bộ cần `q.xuLy` (403 «Chỉ nhóm xử lý được ghi chú nội bộ.»); `listMessages(db, id, q.noiBo, t.team_id)` với SQL:
```sql
SELECT m.id, m.author_id, s.label AS author_name, m.body, m.internal, m.created_at
FROM fbk_message m LEFT JOIN v_stf_staff_label s ON s.id = m.author_id
WHERE m.ticket_id = ?1 AND (m.internal = 0 OR ?2 = 'all' OR (?2 = 'team' AND m.team_id = ?3)) ORDER BY m.created_at, m.rowid
```
  `canRead` cũ giữ lại (tuyến cũ còn dùng) cho đến khi gỡ tuyến cũ. Trong `GUARDS` đã có `quyenPhieu` nên các route dùng nó qua `quyenCuaToi`... **chú ý:** bài `route-write-guard` bóc *thân handler*, không đi vào hàm được gọi; thân route phải chứa một lời gọi trong `GUARDS` mà kết quả được dùng. Dùng dạng `const q = await quyenCuaToi(...)` thì `quyenPhieu` không nằm trong thân ⇒ đỏ. Vì vậy thân route gọi trực tiếp `quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await membershipsOf(env.DB, staff.id) })` (viết một lần trong từng route; `quyenCuaToi` chỉ dùng cho `detail()`).
- [ ] **Bước 4: Chạy xanh, commit.**

### 5b. Hàng đợi nhóm, chưa đọc riêng, thống kê và huy hiệu theo nhóm

- [ ] **Bước 1: Ca đỏ**

```ts
const hang = (w: any, as: string, q = "") => w.call("GET", `/api/feedback/queue?team=${KE_TOAN}${q}`, { as });

test("hàng đợi nhóm: thành viên và Toàn quyền xem được; người ngoài nhóm, Quản trị, Nhân sự, bên ngoài ⇒ 403; thiếu team ⇒ 400", async () => {
  const w = setup();
  await tao(w, SALES, KE_TOAN);
  for (const as of [KT_TV, KT_TN, SUPER]) assert.equal((await hang(w, as)).json.tickets.length, 1, as);
  for (const as of [NS_TV, QT, SALES, PARTNER]) assert.equal((await hang(w, as)).status, 403, as);
  assert.equal((await w.call("GET", "/api/feedback/queue", { as: SUPER })).status, 400);
});

test("hàng đợi không chứa phiếu do chính người xem gửi (trừ khi là phiếu của người khác); lọc MINE / UNASSIGNED", async () => {
  const w = setup();
  const a = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await tao(w, KT_GUI, KE_TOAN);
  assert.equal((await hang(w, KT_GUI)).json.tickets.length, 1, "phiếu tự gửi nằm ở 'của tôi', không ở hàng đợi");
  await w.call("POST", `/api/feedback/${a}/claim`, { as: KT_TV });
  assert.equal((await hang(w, KT_TV, "&loc=MINE")).json.tickets.length, 1);
  assert.equal((await hang(w, KT_TN, "&loc=MINE")).json.tickets.length, 0);
  assert.equal((await hang(w, KT_TN, "&loc=UNASSIGNED")).json.tickets.length, 1);
});

test("chưa đọc tính RIÊNG từng người: một người mở không làm người kia hết chấm đỏ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TV })).json.queue, 1);
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TN })).json.queue, 1);
  await d(w, id, KT_TV); // KT_TV mở phiếu
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TV })).json.queue, 0);
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: KT_TN })).json.queue, 1, "người kia vẫn còn chấm đỏ");
  assert.equal((await w.call("GET", "/api/feedback/badge", { as: NS_TV })).json.queue, 0, "nhóm khác không đếm phiếu nhóm này");
});

test("thống kê tuần của hàng đợi chỉ đếm phiếu của nhóm đó", async () => {
  const w = setup();
  await tao(w, SALES, KE_TOAN);
  await tao(w, SALES, NHAN_SU, { clientRequestId: crypto.randomUUID() });
  const n = (await hang(w, KT_TV)).json.stats.reduce((s: number, r: any) => s + r.count, 0);
  assert.equal(n, 1);
});
```

- [ ] **Bước 2: Chạy cho đỏ.**
- [ ] **Bước 3: Repository**:

```ts
// Chưa đọc RIÊNG từng người (?1 = người xem): chưa có mốc, hoặc mốc cũ hơn hoạt động cuối.
const UNREAD_USER = `NOT EXISTS (SELECT 1 FROM fbk_ticket_read r WHERE r.ticket_id = t.id AND r.staff_id = ?1 AND r.seen_at >= t.last_activity_at)`;
// ?1 người xem, ?2 nhóm, ?3 trạng thái|NULL, ?4 loc, ?5 là Toàn quyền (1/0), ?6 limit, ?7 offset
const LIST_QUEUE_TEAM = defineSql(
  "feedback",
  "list_queue_team",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_USER} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE t.team_id = ?2 AND (?3 IS NULL OR t.status_code = ?3) AND t.submitter_id <> ?1
     AND (?4 = 'ALL' OR (?4 = 'MINE' AND t.assignee_id = ?1)
          OR (?4 = 'UNASSIGNED' AND (t.assignee_id IS NULL OR NOT EXISTS (SELECT 1 FROM v_stf_staff_label x WHERE x.id = t.assignee_id AND x.active = 1))))
     AND ?5 IN (0, 1)
   ORDER BY t.last_activity_at DESC LIMIT ?6 OFFSET ?7`,
);
const STATS_TEAM = defineSql(
  "feedback",
  "stats_team",
  `SELECT strftime('%Y-%W', created_at) AS week, kind_code, status_code, count(*) AS n FROM fbk_ticket WHERE created_at >= ?1 AND team_id = ?2 GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
);
// ?1 người xem, ?2 Toàn quyền (1/0): "queue" = phiếu CHƯA ĐỌC ở nhóm tôi thuộc (Toàn quyền: mọi nhóm), trừ phiếu tôi gửi.
const BADGE = defineSql(
  "feedback",
  "badge",
  `SELECT
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id = ?1 AND ${UNREAD_SUBMITTER}) AS mine,
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id <> ?1 AND ${UNREAD_USER}
        AND (?2 = 1 OR t.team_id IN (SELECT m.team_id FROM fbk_team_member m WHERE m.staff_id = ?1 AND m.valid_to_at IS NULL))) AS queue`,
);
// Đánh dấu đã xem: người gửi (submitter_seen_at) và/hoặc mốc riêng của người xem (fbk_ticket_read). ?1 phiếu, ?2 người xem, ?3 là người gửi (0/1), ?4 bây giờ.
const MARK_SEEN_USER = defineSql(
  "feedback",
  "mark_seen_user",
  `INSERT INTO fbk_ticket_read (ticket_id, staff_id, seen_at) VALUES (?1, ?2, ?4) ON CONFLICT(ticket_id, staff_id) DO UPDATE SET seen_at = excluded.seen_at`,
);
const MARK_SEEN_SUBMITTER = defineSql("feedback", "mark_seen_submitter", `UPDATE fbk_ticket SET submitter_seen_at = ?2 WHERE id = ?1`);
```
  Bỏ `UNREAD_ADMIN`; `LIST_QUEUE` (tuyến cũ) đổi sang `UNREAD_USER` (đã truyền `staffId` ở `?1`) và bỏ `admin_seen_at` khỏi `TOUCH_AFTER_REPLY` và `PATCH_TICKET` (thay bằng gọi `markSeenStatement` trong cùng lô sau câu cập nhật). Hàm `markSeen(db, id, viewerId, asSubmitter, now)`: chạy `MARK_SEEN_USER`, và nếu `asSubmitter` thì thêm `MARK_SEEN_SUBMITTER` trong một `db.batch`. **Chỉ gọi khi mở chi tiết (như nay)**, không gọi ở tuyến làm mới.
  Thêm `queue` route:
```ts
route("GET", "/api/feedback/queue", "staff", async ({ env, staff, url }) => {
  const team = url.searchParams.get("team");
  const loc = url.searchParams.get("loc") ?? "ALL";
  const status = url.searchParams.get("status");
  if (!team || !isLocHangDoi(loc) || (status !== null && !isFeedbackStatus(status))) return error(400, "invalid_input", "Bộ lọc không hợp lệ.");
  const t = await getTeam(env.DB, team);
  if (!t) return error(404, "not_found", "Không tìm thấy nhóm.");
  const memberships = await membershipsOf(env.DB, staff.id);
  const q = quyenPhieu({ who: staff, submitterId: "", ticketTeamId: team, memberships });
  if (!q.xuLy) return error(403, "forbidden", "Bạn không thuộc nhóm này.");
  const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const [rows, stats] = await Promise.all([
    listQueueTeam(env.DB, staff.id, team, status, loc, can(staff, "feedback.triage"), intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000)),
    statsTeam(env.DB, since, team),
  ]);
  return json({ tickets: rows.map((r) => toTicket(r, true)), stats: stats.map((s) => ({ week: s.week, kind: s.kind_code as FeedbackKind, status: s.status_code as FeedbackStatus, count: s.n })) } satisfies FeedbackQueueResponse);
}),
```
  (`submitterId: ""` vì không có phiếu cụ thể: không ai trùng id rỗng nên chỉ còn nhánh thành viên/Toàn quyền.) Huy hiệu: `badgeCounts(env.DB, staff.id, can(staff, "feedback.triage"))`.
- [ ] **Bước 4: Bảng cổng** — `route-access.test.ts` thêm `GET /api/feedback/queue` (`staff`). Chạy xanh, commit.

### 5c. Nhận việc, giao việc, đổi trạng thái theo nhóm

- [ ] **Bước 1: Ca đỏ**

```ts
const nhan = (w: any, id: string, as: string) => w.call("POST", `/api/feedback/${id}/claim`, { as });
const xuLy = (w: any, id: string, as: string, body: unknown) => w.call("PATCH", `/api/feedback/${id}/xu-ly`, { as, body });

test("nhận việc: thành viên nhận được, phiếu Mới ⇒ Đã tiếp nhận; người ngoài nhóm và người gửi ⇒ 404/403", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await nhan(w, id, NS_TV)).status, 404);
  assert.equal((await nhan(w, id, SALES)).status, 403, "người gửi đọc được nhưng không xử lý");
  const r = await nhan(w, id, KT_TV);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_TV);
  assert.equal(r.json.ticket.status, "ACK");
});

test("hai người nhận việc cùng lúc: đúng một người thắng, người kia 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  const [a, b] = await Promise.all([nhan(w, id, KT_TV), nhan(w, id, KT_TN)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], `${a.text} | ${b.text}`);
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id = '${id}' AND type = 'CLAIMED'`)[0].n, 1);
});

test("phiếu do người đã khoá giữ: coi như chưa ai nhận, người khác nhận được", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${KT_TV}'`);
  const r = await nhan(w, id, KT_TN);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.assigneeId, KT_TN);
});

test("giao việc cho người khác: chỉ Trưởng nhóm/Toàn quyền, người nhận phải là thành viên nhóm", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, KT_TV, { assigneeId: KT_TN })).status, 403, "thành viên thường không giao người khác");
  assert.equal((await xuLy(w, id, KT_TN, { assigneeId: NS_TV })).status, 400, "người nhận không thuộc nhóm");
  const ok = await xuLy(w, id, KT_TN, { assigneeId: KT_TV });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.ticket.assigneeId, KT_TV);
});

test("đổi trạng thái theo bảng luật hiện có; thành viên nhóm khác 404; người gửi 403", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await xuLy(w, id, KT_TV, { status: "DONE" })).status, 409, "Mới ⇒ Xong không hợp lệ");
  assert.equal((await xuLy(w, id, KT_TV, { status: "ACK" })).status, 200);
  assert.equal((await xuLy(w, id, NS_TV, { status: "ACK" })).status, 404);
  assert.equal((await xuLy(w, id, SALES, { status: "IN_PROGRESS" })).status, 403);
});
```

- [ ] **Bước 2: Chạy cho đỏ.**
- [ ] **Bước 3: Repository**:

```ts
// Nhận việc: chỉ khi chưa ai giữ (hoặc người giữ không còn hoạt động) và phiếu chưa đóng. ?1 phiếu, ?2 người nhận, ?3 bây giờ.
const CLAIM = defineSql(
  "feedback",
  "claim",
  `UPDATE fbk_ticket SET
     assignee_id = ?2,
     last_public_reply_at = CASE WHEN status_code = 'NEW' THEN ?3 ELSE last_public_reply_at END,
     status_code = CASE WHEN status_code = 'NEW' THEN 'ACK' ELSE status_code END,
     last_activity_at = ?3, updated_at = ?3, updated_by = ?2
   WHERE id = ?1 AND status_code NOT IN ('DONE', 'DECLINED')
     AND (assignee_id IS NULL OR NOT EXISTS (SELECT 1 FROM v_stf_staff_label x WHERE x.id = fbk_ticket.assignee_id AND x.active = 1))`,
);
// ?1 id, ?2 loại, ?3 từ, ?4 sang, ?5 người làm, ?6 bây giờ, ?7 mã ghi nhận bắt buộc đã xảy ra (phiếu có assignee_id = ?4 hoặc team_id = ?4)
const INSERT_EVENT = defineSql(
  "feedback",
  "insert_event",
  `INSERT INTO fbk_ticket_event (id, ticket_id, type, from_value, to_value, actor_id, at)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE changes() > 0`,
);
```
  (Hai chỗ trên theo mẫu «câu sau điều kiện `changes() > 0`» đang dùng ở `patchTicketStatement` + `auditStatement`. Thứ tự lô cố định: `[CLAIM, audit(changes()>0), INSERT_EVENT(changes()>0)]` — **sau `auditStatement` thì `changes()` của câu audit là 1, nên đặt `INSERT_EVENT` TRƯỚC audit**: `[CLAIM, INSERT_EVENT, audit]`; audit điều kiện `EXISTS (SELECT 1 FROM fbk_ticket_event WHERE id = '<eventId>')`.)
  `PATCH_TICKET` đổi điều kiện người nhận: thay mệnh đề cuối bằng
```sql
AND (?3 = 0 OR ?4 IS NULL OR EXISTS (SELECT 1 FROM fbk_team_member m JOIN v_stf_staff_label s ON s.id = m.staff_id
       WHERE m.team_id = fbk_ticket.team_id AND m.staff_id = ?4 AND m.valid_to_at IS NULL AND s.active = 1))
```
  (hết `admin_seen_at` như Việc 5b). Tuyến cũ `PATCH /api/feedback/:id` vẫn dùng chung câu này: Toàn quyền giao phiếu cho người **trong nhóm** (đã ghi ở ADR).
- [ ] **Bước 4: Route `claim`** (đặt trước `/:id`; cổng `staff`):

```ts
route("POST", "/api/feedback/:id/claim", "staff", async ({ env, staff, params }) => {
  const id = params.id!;
  if (!UUID_RE.test(id)) return NOT_FOUND();
  const t = await getTicket(env.DB, id);
  if (!t) return NOT_FOUND();
  const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await membershipsOf(env.DB, staff.id) });
  if (!q.doc) return NOT_FOUND();
  if (!q.xuLy) return error(403, "forbidden", "Chỉ nhóm xử lý được nhận việc.");
  const at = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const res = await env.DB.batch([
    claimStatement(env.DB, { id, staffId: staff.id, now: at }),
    insertEventStatement(env.DB, { id: eventId, ticketId: id, type: "CLAIMED", from: t.assignee_id, to: staff.id, actor: staff.id, now: at }),
    auditStatement(env.DB, { staffId: staff.id, action: "feedback_claimed", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) }, `EXISTS (SELECT 1 FROM fbk_ticket_event WHERE id = '${eventId}')`),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return error(409, "taken", "Vừa có người nhận việc này, hoặc phiếu đã đóng.");
  const d = await detail(env.DB, staff, id);
  return d ? json(d) : NOT_FOUND();
}),
```
  Route `PATCH /api/feedback/:id/xu-ly` (cổng `staff`): `quyenPhieu`; `!doc` ⇒ 404; `!xuLy` ⇒ 403; có `assigneeId` khác `staff.id` và `!giaoViecChoNguoiKhac` ⇒ 403; còn lại dùng nguyên khối của tuyến cũ (`validatePatchInput`, `canTransition`, `patchTicketStatement`, `auditStatement`, 409 `stale`), cộng `insertEventStatement` loại `ASSIGNED` khi đổi người xử lý. Nhớ markSeen cho người làm trong cùng lô.
- [ ] **Bước 5: Bảng cổng** — thêm `POST /api/feedback/:id/claim` và `PATCH /api/feedback/:id/xu-ly` (`staff`). Chạy xanh, commit.

### 5d. Chuyển nhóm

- [ ] **Bước 1: Ca đỏ**

```ts
const chuyen = (w: any, id: string, as: string, teamId: string, reason = "Nhầm nhóm") => w.call("POST", `/api/feedback/${id}/transfer`, { as, body: { teamId, reason } });

test("chuyển nhóm: Trưởng nhóm/Toàn quyền được; thành viên thường 403; người ngoài 404; lý do bắt buộc; nhóm đích phải đang dùng", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await chuyen(w, id, KT_TV, NHAN_SU)).status, 403);
  assert.equal((await chuyen(w, id, NS_TV, NHAN_SU)).status, 404);
  assert.equal((await chuyen(w, id, KT_TN, NHAN_SU, "")).status, 400);
  assert.equal((await chuyen(w, id, KT_TN, "khong-co")).status, 400);
  const r = await chuyen(w, id, KT_TN, NHAN_SU);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ticket.teamId, NHAN_SU);
});

test("sau chuyển nhóm: bỏ người xử lý, Đang xử lý ⇒ Đã tiếp nhận; Trưởng nhóm cũ mất quyền; nhóm mới không đọc ghi chú nội bộ của nhóm cũ", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  await nhan(w, id, KT_TV);
  await xuLy(w, id, KT_TV, { status: "IN_PROGRESS" });
  await traLoi(w, id, KT_TV, "Bí mật của Kế toán", true);
  const r = await chuyen(w, id, KT_TN, NHAN_SU, "Việc của Nhân sự");
  assert.equal(r.json.ticket.assigneeId, null);
  assert.equal(r.json.ticket.status, "ACK");
  assert.equal((await d(w, id, KT_TN)).status, 404, "Trưởng nhóm cũ mất quyền ngay");
  const moi = await d(w, id, NS_TV);
  assert.equal(moi.status, 200);
  const noiBo = moi.json.messages.filter((m: any) => m.internal).map((m: any) => m.body);
  assert.ok(!noiBo.some((b: string) => b.includes("Bí mật của Kế toán")), "ghi chú nhóm cũ không lộ cho nhóm mới");
  assert.ok(noiBo.some((b: string) => b.includes("Việc của Nhân sự")), "lý do chuyển là ghi chú nội bộ của nhóm MỚI");
  assert.ok((await d(w, id, SUPER)).json.messages.some((m: any) => m.body.includes("Bí mật của Kế toán")), "Toàn quyền đọc tất cả");
  assert.equal(w.q(`SELECT count(*) AS n FROM fbk_ticket_event WHERE ticket_id='${id}' AND type='TEAM_CHANGED'`)[0].n, 1);
});

test("chuyển sang chính nhóm đang giữ hoặc chuyển lúc phiếu đã đổi nhóm ⇒ 409", async () => {
  const w = setup();
  const id = (await tao(w, SALES, KE_TOAN)).json.ticket.id;
  assert.equal((await chuyen(w, id, KT_TN, KE_TOAN)).status, 409);
});
```

- [ ] **Bước 2: Chạy cho đỏ.**
- [ ] **Bước 3: Repository**:

```ts
// Chuyển nhóm: khoá lạc quan theo nhóm HIỆN TẠI (?4). ?1 phiếu, ?2 nhóm mới, ?3 bây giờ, ?4 nhóm cũ, ?5 người làm.
const TRANSFER = defineSql(
  "feedback",
  "transfer",
  `UPDATE fbk_ticket SET team_id = ?2, assignee_id = NULL,
     status_code = CASE WHEN status_code = 'IN_PROGRESS' THEN 'ACK' ELSE status_code END,
     last_activity_at = ?3, updated_at = ?3, updated_by = ?5
   WHERE id = ?1 AND team_id = ?4 AND ?2 <> ?4 AND EXISTS (SELECT 1 FROM fbk_team WHERE id = ?2 AND active = 1)`,
);
// Lý do chuyển = ghi chú nội bộ của nhóm MỚI; chỉ chèn khi phiếu đã thật sự nằm ở nhóm mới. ?1 id tin, ?2 phiếu, ?3 tác giả, ?4 nội dung, ?5 bây giờ, ?6 nhóm mới.
const INSERT_TRANSFER_NOTE = defineSql(
  "feedback",
  "insert_transfer_note",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by, team_id)
   SELECT ?1, ?2, ?3, ?4, 1, ?5, ?3, ?5, ?3, ?6 WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2 AND team_id = ?6) AND EXISTS (SELECT 1 FROM fbk_ticket_event WHERE ticket_id = ?2 AND type = 'TEAM_CHANGED' AND at = ?5)`,
);
```
- [ ] **Bước 4: Route `transfer`** (cổng `staff`, trước `/:id`): `quyenPhieu` ⇒ `!doc` 404; `!chuyenNhom` 403; `validateTransferInput` (`teamId` khớp `/^[a-z0-9-]{1,60}$/`, `reason` 1–300 ký tự sau trim) ⇒ 400; lô `[TRANSFER, INSERT_EVENT(TEAM_CHANGED, from=team cũ, to=team mới), INSERT_TRANSFER_NOTE (nội dung "Chuyển từ <tên nhóm cũ>: <lý do>"), audit feedback_team_changed (điều kiện EXISTS sự kiện)]`; `changes()` của câu đầu bằng 0 ⇒ phân biệt: nhóm mới = nhóm hiện tại hoặc phiếu vừa đổi nhóm ⇒ 409 `stale`; nhóm đích không có/ngưng ⇒ 400. Nhật ký `detail` = mã phiếu (và với nhóm nhạy cảm cũng chỉ mã phiếu).
- [ ] **Bước 5: Bảng cổng** thêm `POST /api/feedback/:id/transfer` (`staff`). Chạy xanh.

### 5e. Dọn các bài kiểm cũ bị đổi nghĩa

- [ ] **Bước 1:** `node --test src/modules/audit/an-toan-quyen.test.ts src/modules/accounts/hanh-chinh-nhan-su.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts src/route-access.test.ts src/lan-gui-phu-route.test.ts src/lan-gui-no.test.ts`. Tuyến cũ `GET /api/feedback` không đổi nên hai bài 403 của Quản trị/Nhân sự phải **vẫn xanh**; nếu đỏ là dấu hiệu đã vô tình đổi tuyến cũ — sửa mã, không sửa bài.
- [ ] **Bước 2:** `npm test` và `npm run typecheck` xanh. Chạy `npm run test:e2e -- feedback` (cần mạng) — bài `tests/e2e/feedback.mjs` hiện có phải vẫn xanh (đường cũ giữ nguyên); nếu một ca gọi `GET /api/feedback` bằng tài khoản `accountant` và mong 403 thì vẫn đúng.
- [ ] **Bước 3: Commit** «Vé hỗ trợ đợt 1: hàng đợi nhóm, nhận/giao việc, chuyển nhóm, ghi chú nội bộ theo nhóm, chưa đọc riêng».

---

## Việc 6: Email chung có tên nhóm; nhóm nhạy cảm; nhật ký mã phiếu

**Tệp:** sửa `src/modules/feedback/notify.ts`, `notify.test.ts`, `index.ts` (`scheduleMail` và nhật ký `feedback_created`).

- [ ] **Bước 1: Ca đỏ** — thêm vào `notify.test.ts`:

```ts
test("buildMail: có tên nhóm trong tiêu đề; nhóm nhạy cảm KHÔNG kèm tiêu đề/nội dung phiếu", () => {
  const thuong = buildMail({ ...ev, teamName: "Kỹ thuật", sensitive: false });
  assert.ok(thuong.subject.includes("Kỹ thuật"));
  const nhay = buildMail({ ...ev, teamName: "Nhân sự", sensitive: true });
  assert.ok(nhay.subject.includes("Nhân sự") && nhay.subject.includes("YC-0007"));
  assert.ok(!nhay.subject.includes("Lỗi") && !nhay.html.includes("Lỗi") && !nhay.html.includes(ev.excerpt), "không lộ tiêu đề hay nội dung");
  assert.ok(nhay.html.includes(ev.url));
});
```
  Và trong `ve-ho-tro-route.test.ts`:
```ts
test("nhật ký tạo phiếu nhóm nhạy cảm KHÔNG ghi tiêu đề (phiếu vẫn tra được qua target_id)", async () => {
  const w = setup();
  const r = await tao(w, SALES, NHAN_SU, { title: "Xin giấy xác nhận lương" });
  const dong = w.q("SELECT detail, target_id FROM audit_log WHERE action = 'feedback_created'")[0];
  assert.ok(!String(dong.detail).includes("lương"));
  assert.equal(dong.detail, "phiếu nhóm nhạy cảm");
  assert.equal(dong.target_id, r.json.ticket.id);
  await tao(w, SALES, KY_THUAT, { title: "Lỗi nút lưu" });
  assert.ok(w.q("SELECT detail FROM audit_log WHERE action = 'feedback_created' ORDER BY rowid DESC")[0].detail.includes("Lỗi nút lưu"), "nhóm thường giữ hành vi cũ");
});
```
- [ ] **Bước 2: Chạy cho đỏ.**
- [ ] **Bước 3: Cài đặt** — `NotifyEvent` thêm `teamName: string; sensitive: boolean`; `buildMail` đổi: tiêu đề `"[<teamName>] <code> …"`; nếu `sensitive` thì phần tiêu đề phiếu, tên người gửi và đoạn trích **thay bằng** câu «Có phiếu mới cho nhóm <teamName>. Mở Nền tảng để xem.» (vẫn giữ `code` và `url`). Đổi chữ «Mở trong app» thành «Mở trong Nền tảng». `scheduleMail` nhận thêm hai trường lấy từ `TicketRow`/`team`. Trong `POST /api/feedback`, `detail` của `auditStatement` = `team.sensitive === 1 ? "phiếu nhóm nhạy cảm" : v.value.title.slice(0, 100)` (nhật ký đã trỏ phiếu qua `targetId`, nên không cần tiêu đề để tra lại; mã `YC-nnnn` tra được từ id phiếu). Tương tự, `feedback_replied`/`feedback_status_changed` đã chỉ ghi mã phiếu nên không đổi.
- [ ] **Bước 4: Chạy xanh** (`node --test src/modules/feedback/notify.test.ts src/modules/feedback/ve-ho-tro-route.test.ts`), commit.

---

## Việc 7: Giao diện (`web/feedback.ts`, `public/feedback.html`, menu)

**Tệp:** sửa `web/feedback.ts`, `public/feedback.html`, `public/app.css` (chỉ token/lớp sẵn có nếu đủ), `web/shell.ts` (nhãn menu «Hỗ trợ»); tạo kịch bản Chrome `tests/chrome/ve-ho-tro-smoke.mjs` theo khuôn các kịch bản cùng thư mục (xem `web/CLAUDE.md` mục kịch bản Chrome, cần biến `AXE_JS`).

**Hợp đồng:** dùng `FeedbackTeamsResponse`, `FeedbackQueueResponse`, `FeedbackDetailResponse.perms`, `FeedbackAdminTeamsResponse` (Việc 3–5), hằng `LOC_HANG_DOI*`, `TEAM_ROLE_NAME` (Việc 2).

- [ ] **Bước 1: Đọc luật giao diện** — `web/CLAUDE.md` (không `innerHTML`, 16px, token, trang đã khai `PAGES`/`build:web` nên **không** khai trang mới nếu chỉ sửa `/feedback`; màn quản lý nhóm đặt ngay trong `/feedback` bằng tab, không tạo trang mới).

- [ ] **Bước 2: Form gửi** — `public/feedback.html` thêm `<label>Gửi tới nhóm<select id="new-team"></select><span id="new-team-hint" class="muted"></span></label>` trước ô Loại. Trong `web/feedback.ts`:

```ts
let teams: Api.FeedbackTeamsResponse = { teams: [], mine: [], isSuper: false };
const teamSel = byId<HTMLSelectElement>("new-team");
async function loadTeams(): Promise<void> {
  teams = await api<Api.FeedbackTeamsResponse>("/api/feedback/teams");
  replaceChildren(teamSel, ...teams.teams.map((t) => h("option", { value: t.id }, t.name)));
  const hint = () => (byId("new-team-hint").textContent = teams.teams.find((t) => t.id === teamSel.value)?.description ?? "");
  teamSel.addEventListener("change", hint);
  hint();
}
```
  gọi `await loadTeams()` ngay sau `initShell()`; trong `submit` thêm `teamId: teamSel.value` vào `body`. Nếu `teams.teams.length === 1` (tài khoản bên ngoài) thì ẩn nhãn chọn nhóm (`teamSel.closest("label")!.hidden = true`).

- [ ] **Bước 3: Tab theo tư cách** — thay `isAdmin` bằng:

```ts
const laThanhVien = teams.mine.length > 0 || teams.isSuper;
let tab: "mine" | "queue" | "teams" = "mine";
let queueTeam = teams.mine[0]?.teamId ?? teams.teams[0]?.id ?? "";
let loc: Api.LocHangDoi = "ALL";
```
  `loadList()`: tab «Hàng đợi nhóm» chỉ khi `laThanhVien`; tab «Quản lý nhóm» chỉ khi `teams.isSuper`. Tab hàng đợi: ô chọn nhóm (Toàn quyền: mọi nhóm; thành viên: nhóm mình), ba nút lọc `LOC_HANG_DOI` (nhãn `LOC_HANG_DOI_NAME`), bộ lọc trạng thái như cũ, gọi `/api/feedback/queue?team=…&loc=…&status=…`. Mỗi thẻ phiếu ở hàng đợi hiện nhãn «Chưa ai nhận» khi `!t.assigneeId || !t.assigneeActive` kèm nút «Nhận việc» (`POST /api/feedback/${id}/claim`, dùng `act()`); lỗi 409 hiện bằng `showError` sẵn có. Thẻ phiếu hiện `t.teamName`.

- [ ] **Bước 4: Chi tiết phiếu** — dùng `d.perms`: nút chuyển trạng thái chỉ khi `d.perms.xuLy` (gọi `PATCH /api/feedback/:id/xu-ly`); ô «Ghi chú nội bộ» chỉ khi `d.perms.xuLy`; thêm khối «Chuyển nhóm» khi `d.perms.chuyenNhom` (ô chọn nhóm + ô lý do + nút «Chuyển», gọi `POST …/transfer`, tải lại luồng); khối «Người xử lý» khi `d.perms.giaoViec` là danh sách thành viên nhóm (lấy từ `/api/feedback/admin/teams` chỉ cho Toàn quyền; với Trưởng nhóm đợt 1 **chỉ hiện nút «Nhận việc cho tôi»**, giao người khác bằng ô chọn là việc đợt 2 vì tuyến liệt kê thành viên cho Trưởng nhóm chưa có — ghi vào mục nợ ở Việc 8). Tên nhóm hiện trong dòng phụ đề.
  Ghi chú nội bộ của nhóm khác (Toàn quyền thấy) hiện nhãn «Ghi chú nội bộ» như cũ; không cần phân biệt nhóm ở đợt 1.

- [ ] **Bước 5: Quản lý nhóm (Toàn quyền)** — tab «Quản lý nhóm»: danh sách nhóm (tên, mô tả, nhãn «Nhạy cảm», nhãn «Đã ngưng»), mỗi nhóm có danh sách thành viên với vai (`TEAM_ROLE_NAME`), nút «Gỡ», ô chọn nhân viên + vai + «Thêm» (danh sách nhân viên lấy từ `GET /api/staff` đã có cho Toàn quyền — kiểm tên trường thật trong `src/shared/contracts.ts` `StaffAccount`), nút «Ngưng/Dùng lại» và công tắc «Nhạy cảm». Tất cả dựng bằng `h()`; nút ghi bọc `act()`.

- [ ] **Bước 6: Nhãn menu** — `grep -rn '"Góp ý"' web/ src/shared/ public/*.html` và đổi **chỉ nhãn menu/tiêu đề trang** thành «Hỗ trợ» (tiêu đề `public/feedback.html` đổi `data-title="Hỗ trợ"` và `<h1>Hỗ trợ</h1>`, câu mô tả «Gửi báo lỗi, đề xuất hoặc câu hỏi tới đúng nhóm. Chúng tôi phản hồi ngay tại đây.»). Giữ nguyên mã `gopY` bên trong. Chạy `npm test` để các bài khoá nhãn (nếu có) báo chỗ cần đổi; mỗi bài đỏ vì nhãn thì cập nhật theo nhãn mới, **không** đổi bài khoá luật khác.

- [ ] **Bước 7: Kiểm tay trên máy tính và iPhone cỡ 375px** — chạy `npm run dev`, tạo bốn tài khoản thử theo `.dev.vars.example`, kiểm: gửi phiếu tới Kế toán; thành viên Kế toán thấy ở «Hàng đợi nhóm», nhận việc; người gửi thấy trạng thái «Đã tiếp nhận» và không thấy ghi chú nội bộ; người Nhân sự không thấy phiếu đó. Chụp ảnh vào `docs/evidence/2026-10-15-ve-ho-tro/` (hai hướng ngang/dọc nếu có thay đổi bố cục lớn) để chủ duyệt thị giác một lượt (bài học «xem trước bằng ảnh thật»).

- [ ] **Bước 8: Chạy** — `npm run build:web`, `npm run typecheck`, `npm test`; kịch bản Chrome `AXE_JS=… node tests/chrome/ve-ho-tro-smoke.mjs` (nếu thiếu `AXE_JS` thì ghi rõ «bỏ qua kiểm màu», không coi là xanh).

- [ ] **Bước 9: Commit.**

---

## Việc 8: Hàng rào, e2e, tài liệu, kiểm độc lập, bàn giao

**Tệp:** `docs/SO-HANG-RAO.md`, `tests/e2e/feedback.mjs` (+ khối mới), `docs/HANDOFF-FEEDBACK.md`, `docs/SYSTEM-DESIGN.md` (§5, §7, §8), `docs/CHANGE-GUIDE.md` (công thức), `docs/adr/README.md` (dòng chỉ mục), nhật ký thay đổi (mục «Trợ giúp + nhật ký thay đổi»), `docs/HANDOFF-N1.md` (trạng thái triển khai: **chỉ khi chủ đã chạy**).

- [ ] **Bước 1: e2e** — thêm vào `tests/e2e/feedback.mjs` khối «Vé hỗ trợ đợt 1» dùng tài khoản thật trong `tests/e2e/lib.mjs`: Toàn quyền tạo nhóm thử + gán một nhân viên (`ACCOUNTS.accountant`) làm thành viên; nhân viên bán hàng gửi phiếu tới nhóm đó; thành viên thấy trong `/api/feedback/queue`, nhận việc; Quản trị (`ACCOUNTS.admin`) nhận 403 ở hàng đợi và 404 ở chi tiết; cuối khối **ngưng nhóm thử** (không xoá). Chạy `npm run test:e2e -- feedback` (cần mạng); kiểm không có dòng log `lan_gui_ghi_nhieu_lan` cho route mới (L12).
- [ ] **Bước 2: Sổ hàng rào** — thêm vào `docs/SO-HANG-RAO.md` (khuôn các dòng cùng bảng) một dòng cho **`quyenPhieu` + `src/modules/feedback/quyen.test.ts` + ca người ngoài nhóm ở `ve-ho-tro-route.test.ts`**: chặn «người ngoài nhóm đọc/xử lý phiếu nhóm khác; Quản trị/Nhân sự có đường tắt; người gửi xử lý phiếu mình; tài khoản bên ngoài gửi nhóm khác Kỹ thuật»; cơ chế «hàm thuần duy nhất trong `GUARDS` + bài chạy đường thật»; **ngày + phép đột biến đã quan sát chặn thật** (ví dụ: sửa `quyenPhieu` cho `xuLy` luôn `true` ⇒ bài «người ngoài nhóm» đỏ; hoàn nguyên) — chạy phép đột biến bây giờ, ghi đúng ngày và thông báo đỏ thật; không ghi ngày nếu chưa chạy.
- [ ] **Bước 3: Tài liệu mô tả (thua mã, cùng commit)** — cập nhật `docs/HANDOFF-FEEDBACK.md` (trạng thái mới, bỏ «admin_seen_at dùng chung» khỏi Điểm mở), `docs/SYSTEM-DESIGN.md` §5/§7/§8 (bảng, tuyến, ô quyền, lưu ý Quản trị/Nhân sự vẫn 403 ở tuyến cũ), `docs/CHANGE-GUIDE.md` (công thức «thêm nhóm hỗ trợ / sửa quyền theo nhóm» + bẫy: `submitterId: ""` ở route hàng đợi; `changes()` chỉ đúng ngay sau câu cập nhật, nên `INSERT_EVENT` đứng trước `audit`; không thêm tệp có `defineSql`). Dòng chỉ mục ADR-0119 ở `docs/adr/README.md` **chỉ thêm khi gộp** (xem số ADR đã bị nhánh khác lấy chưa); thêm mục nhật ký thay đổi cho bản phát hành (luật triển khai bước A.0).
- [ ] **Bước 4: Nợ đã biết (ghi vào `docs/BACKLOG.md` mục 30 hoặc mục mới)** — (a) Trưởng nhóm chưa có tuyến liệt kê thành viên nên chưa giao việc cho người khác bằng ô chọn; (b) thẻ Hộp thư Trang chủ chỉ Toàn quyền; (c) gỡ tuyến cũ `GET/PATCH /api/feedback` và cột `admin_seen_at` ở lần phát hành sau; (d) `docs/quyen-hoan.json` cần kiểm lại ngày gộp; (e) thông báo đẩy/email cho từng thành viên = đợt 2.
- [ ] **Bước 5: Cổng xanh** — `npm test`, `npm run typecheck`, `npm run build:web` đều **0 lỗi / xanh**, `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts src/claude-cong-xanh.test.ts` xanh. Ghi nguyên văn kết quả vào báo cáo; đỏ thì câu cuối ghi **BỘ KIỂM CHƯA XANH** kèm tên bài.
- [ ] **Bước 6: Người kiểm độc lập (bắt buộc, việc lớn)** — giao `nguoi-kiem-doc-lap` (chỉ đọc): đọc `git diff main...HEAD`, đọc mã thật, tự chạy lại các lệnh ở Bước 5 và `npm run test:e2e -- feedback`; đối chiếu **ADR-0119 từng điều**, **Review Focus sáu dòng** và tiêu chí (a)–(f) của đặc tả; thử đột biến cố ý ít nhất ba chỗ (xoá điều kiện nhóm trong `quyenPhieu`; bỏ `AND t.submitter_id <> ?1`; bỏ `changes() > 0`) và xác nhận bài đỏ; hỏi cụ thể: có đường nào người ngoài nhóm đọc phiếu qua badge, thống kê, email, nhật ký, trợ lý (`tro-ly-cau-truc-ten.ts` mô tả quyền Góp ý — cập nhật nếu sai). Chỉ báo «đạt» dựa trên báo cáo đó.
- [ ] **Bước 7: Cập nhật trợ lý** — `src/modules/tro-ly/…` / `tro-ly-cau-truc-ten.ts` (dòng ~29, ~117–119 mô tả quyền Góp ý): sửa mô tả cho khớp (Toàn quyền hoặc thành viên nhóm xử lý); chạy bài trợ lý liên quan.
- [ ] **Bước 8: Lệnh cho chủ (AI không chạy)** — đưa **một lần**, mỗi lệnh một khối, kèm thư mục:

```bash
# Tại thư mục gốc repo (checkout chính), sau khi chủ đã quyết gộp:
npm run day-len
```
```bash
# Sau khi gộp vào main: kiểm migration chưa áp có ĐÚNG là 0099_ve_ho_tro_nhom.sql (chỉ đọc)
npx wrangler d1 migrations list tourdao-sales-db --remote
```
```bash
# Triển khai theo quy trình: mục nhật ký thay đổi đã có (A.0); các bước sau do script làm
npm run trien-khai
```
  Nói rõ cần triển khai (có migration + mã), cần `npm run build:web` (script làm), **không** cần `wrangler secret`. Hoàn tác: `wrangler rollback` về bản trước (migration chỉ thêm, mã cũ chạy nguyên vẹn).
- [ ] **Bước 9: Báo cáo cuối (bốn mục, tiếng Việt thường)** — Đã làm / Đã kiểm (nói rõ có người kiểm độc lập chưa) / Chưa làm hoặc chưa kiểm / Cần bạn quyết (gồm điểm lệch đã nêu ở đầu kế hoạch).

---

## Tự rà kế hoạch (đã làm khi viết)

- **Phủ đặc tả đợt 1:** nhóm + thành viên + quản lý (Việc 1, 4); gửi tới nhóm + bên ngoài (3); hàng đợi, chưa đọc riêng, thống kê, huy hiệu (5b); nhận/giao/trạng thái (5c); chuyển nhóm + ghi chú theo nhóm (5a, 5d); nhóm nhạy cảm (6); giao diện + nhãn menu (7); hàng rào, e2e, tài liệu, người kiểm (8). Đặc tả mục 6 (bài đỏ phải sửa) được phân vào việc tương ứng (3, 4, 5e); `rules.test.ts` **không** đỏ ở đợt 1 vì chưa thêm trạng thái/loại mới (dành cho đợt 2).
- **Nhất quán tên:** `quyenPhieu`, `choPhepNhomGui`, `membershipsOf`, `listQueueTeam`, `statsTeam`, `claimStatement`, `transferStatement`, `insertEventStatement` dùng giống nhau ở mọi việc. Hằng nhóm Kỹ thuật `fbk-team-ky-thuat` giống nhau ở migration, `NHOM_KY_THUAT_ID`, và bài.
- **Chưa kiểm được lúc viết kế hoạch (người thi công kiểm bằng lệnh, không đoán):** tên cột/bảng nhật ký thật (`audit_log`, `detail`) dùng trong bài; hình dạng `StaffAccount` cho ô chọn nhân viên; thông điệp lỗi SQLite chính xác ở bài migration; mã trả về của phiên tài khoản bị khoá trong khung thử (401/403/404 — bài ghi ý «không đọc được»).
