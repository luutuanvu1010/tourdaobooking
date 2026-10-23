// Kiểm migration *_han_muc_tu_choi.sql (ADR-0032 accepted 2026-10-23; kế hoạch docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md mục 2d).
// Ba bảng của dispatch: dsp_release_kind (tra cứu), dsp_release_event (sổ sự kiện phân công, chỉ thêm), dsp_refuse_policy (cài đặt hạn mức, chỉ thêm).
// Chèn THẲNG bằng SQL: mỗi trigger / CHECK có một ca đỏ và một ca xanh. Tìm tệp theo ĐUÔI (đổi số migration không phải sửa bài này).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_han_muc_tu_choi.sql"));
const AT = "2026-10-23T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const all = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).all(...a).map((r) => ({ ...r }));

/** Áp mọi migration; `bo` = hàm sửa chuỗi SQL của tệp hạn mức trước khi áp (chỉ cho bài «thấy chặn»). */
function moi(bo?: (sql: string) => string): DatabaseSync {
  assert.ok(FILE, "thiếu migrations/*_han_muc_tu_choi.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) {
    const sql = readFileSync(new URL(f, DIR), "utf8");
    db.exec(f === FILE && bo ? bo(sql) : sql);
  }
  db.exec("PRAGMA foreign_keys = ON");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Hướng Dẫn', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Hướng Dẫn', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  run(db, "INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'K', '0900000009', ?, ?)", AT, AT);
  return db;
}
let n = 0;
/** Chèn một sự kiện; trả lời ném (nếu có) để bài so. */
function suKien(db: DatabaseSync, x: { kind: string; order?: string | null; reason?: string | null; seq?: number; party?: string }): void {
  const id = `e${++n}`;
  run(
    db,
    `INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
    id, x.seq ?? n, x.party ?? "pty-s1", x.order === undefined ? "o1" : x.order, x.kind, x.reason ?? null, AT, AT, AT,
  );
}
function caiDat(db: DatabaseSync, x: { mode?: string; mc?: number; mw?: number; from?: string }): void {
  run(
    db,
    `INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
    `p${++n}`, x.mode ?? "BLOCK", x.mc ?? 2, x.mw ?? 15, x.from ?? `2026-10-24T00:00:${String(n % 60).padStart(2, "0")}.000Z`, AT, AT,
  );
}

test("1. đúng một tệp *_han_muc_tu_choi.sql; ba bảng, năm chỉ mục, bốn trigger chỉ-thêm tồn tại", () => {
  assert.equal(files.filter((f) => f.endsWith("_han_muc_tu_choi.sql")).length, 1);
  const db = moi();
  const ten = (type: string) => all(db, "SELECT name FROM sqlite_master WHERE type = ? AND name LIKE 'dsp_re%' ORDER BY name", type).map((r) => r.name);
  assert.deepEqual(ten("table"), ["dsp_refuse_policy", "dsp_release_event", "dsp_release_kind"]);
  assert.deepEqual(ten("index").filter((x) => !String(x).startsWith("sqlite_autoindex")), [
    "dsp_release_event_order_ix", "dsp_release_event_party_at_ix", "dsp_release_event_party_kind_ix", "dsp_release_event_party_order_ix", "dsp_release_event_seq_uq",
  ]);
  assert.deepEqual(ten("trigger"), ["dsp_refuse_policy_no_delete", "dsp_refuse_policy_no_update", "dsp_release_event_no_delete", "dsp_release_event_no_update"]);
});

test("2. dsp_release_kind đúng năm mã theo thứ tự sort_order", () => {
  const db = moi();
  assert.deepEqual(all(db, "SELECT code FROM dsp_release_kind ORDER BY sort_order").map((r) => r.code), ["CLAIM", "ASSIGN", "REFUSE", "ABORT", "RESET"]);
});

test("3. dsp_refuse_policy có đúng một dòng gieo `gieo-han-muc` = Chỉ đo 2/15", () => {
  const db = moi();
  const r = all(db, "SELECT id, mode, max_consecutive, max_per_week, valid_from_at = created_at AS cung_moc FROM dsp_refuse_policy");
  assert.deepEqual(r, [{ id: "gieo-han-muc", mode: "MEASURE", max_consecutive: 2, max_per_week: 15, cung_moc: 1 }]);
});

test("4. (ADR-0032 tiêu chí 11) UPDATE/DELETE sổ sự kiện và cài đặt bị trigger chặn", () => {
  const db = moi();
  suKien(db, { kind: "CLAIM" });
  assert.throws(() => run(db, "UPDATE dsp_release_event SET occurred_at = ?", AT), /dsp_release_event_append_only/);
  assert.throws(() => run(db, "DELETE FROM dsp_release_event"), /dsp_release_event_append_only/);
  assert.throws(() => run(db, "UPDATE dsp_refuse_policy SET mode = 'BLOCK'"), /dsp_policy_append_only/);
  assert.throws(() => run(db, "DELETE FROM dsp_refuse_policy"), /dsp_policy_append_only/);
  assert.equal(all(db, "SELECT 1 FROM dsp_release_event").length, 1);
  assert.equal(all(db, "SELECT 1 FROM dsp_refuse_policy").length, 1);
});

test("4b. thấy chặn: bỏ bốn trigger khỏi bản sao chuỗi migration ⇒ sửa/xoá lọt (chứng minh ca 4 thật sự dựa vào trigger)", () => {
  const db = moi((sql) => sql.replace(/CREATE TRIGGER[\s\S]*?END;/g, ""));
  suKien(db, { kind: "CLAIM" });
  run(db, "UPDATE dsp_release_event SET occurred_at = ?", "2026-01-01T00:00:00.000Z");
  run(db, "DELETE FROM dsp_refuse_policy");
  assert.equal(all(db, "SELECT 1 FROM dsp_refuse_policy").length, 0);
});

test("5. CHECK của sổ sự kiện: RESET không đơn, REFUSE có đơn + mã lý do, loại khác không mã lý do, loại lạ, seq trùng / < 1", () => {
  const db = moi();
  suKien(db, { kind: "RESET", order: null });
  suKien(db, { kind: "REFUSE", reason: "BAN_LICH" });
  suKien(db, { kind: "CLAIM" });
  suKien(db, { kind: "ASSIGN" });
  suKien(db, { kind: "ABORT" });
  assert.throws(() => suKien(db, { kind: "RESET" }), /CHECK/, "RESET có đơn");
  assert.throws(() => suKien(db, { kind: "REFUSE", order: null, reason: "BAN_LICH" }), /CHECK/, "REFUSE thiếu đơn");
  assert.throws(() => suKien(db, { kind: "REFUSE" }), /CHECK/, "REFUSE thiếu mã lý do");
  assert.throws(() => suKien(db, { kind: "CLAIM", reason: "BAN_LICH" }), /CHECK/, "CLAIM có mã lý do");
  assert.throws(() => suKien(db, { kind: "REFUSE", reason: "" }), /CHECK/, "mã lý do rỗng");
  assert.throws(() => suKien(db, { kind: "REFUSE", reason: "X".repeat(41) }), /CHECK/, "mã lý do quá 40");
  assert.throws(() => suKien(db, { kind: "XYZ" }), /FOREIGN KEY/, "loại lạ");
  const seqCo = Number(all(db, "SELECT min(seq) AS s FROM dsp_release_event")[0]!.s);
  assert.throws(() => suKien(db, { kind: "CLAIM", seq: seqCo }), /UNIQUE/, "seq trùng");
  assert.throws(() => suKien(db, { kind: "CLAIM", seq: 0 }), /CHECK/, "seq < 1");
  assert.throws(() => suKien(db, { kind: "CLAIM", party: "pty-khong-co" }), /FOREIGN KEY/, "hồ sơ lạ");
  assert.throws(() => suKien(db, { kind: "CLAIM", order: "o-khong-co" }), /FOREIGN KEY/, "đơn lạ");
  assert.equal(all(db, "SELECT 1 FROM dsp_release_event").length, 5);
});

test("6. CHECK của cài đặt: chế độ đóng ba giá trị, 1–10, 1–100, valid_from_at duy nhất", () => {
  const db = moi();
  for (const mode of ["OFF", "MEASURE", "BLOCK"]) caiDat(db, { mode });
  caiDat(db, { mc: 1, mw: 1 });
  caiDat(db, { mc: 10, mw: 100 });
  assert.throws(() => caiDat(db, { mode: "ON" }), /CHECK/);
  for (const mc of [0, 11]) assert.throws(() => caiDat(db, { mc }), /CHECK/, `mc ${mc}`);
  for (const mw of [0, 101]) assert.throws(() => caiDat(db, { mw }), /CHECK/, `mw ${mw}`);
  caiDat(db, { from: "2026-12-01T00:00:00.000Z" });
  assert.throws(() => caiDat(db, { from: "2026-12-01T00:00:00.000Z" }), /UNIQUE/);
});
