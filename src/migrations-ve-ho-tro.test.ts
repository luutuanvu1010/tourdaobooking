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
