// Migration 0024 (ADR-0018, giai đoạn 1): dựng schema THẬT từ migrations/*.sql bằng node:sqlite rồi kiểm danh mục vai/quyền mới, view công bố
// v_pty_open_role_group và hai trigger luật cứng — LC-1 (tài khoản có vai bên ngoài chỉ giữ quyền Đối tác) và LC-3 (một hồ sơ không giữ cùng lúc
// vai nội bộ và vai bên ngoài đang mở). Chèn thẳng bằng SQL, không qua mã ứng dụng: chứng minh chặn nằm ở CSDL — lớp cuối nếu mã ứng dụng có lỗ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";

function schema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}

let n = 0;
/** Hồ sơ cá nhân, kèm (tuỳ chọn) một tài khoản trỏ vào nó. */
function person(db: DatabaseSync, withAccount = true): { party: string; staff: string } {
  const i = ++n;
  const party = `p-${i}`;
  const staff = `s-${i}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, `Người${i}`, AT, AT);
  if (withAccount) {
    db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(staff, `09${String(i).padStart(8, "0")}`, AT, party);
  }
  return { party, staff };
}
const openRole = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
    .run(`r-${++n}`, party, code, AT, AT);
const closeRole = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-09-23' WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL").run(party, code);
// Cùng DẠNG câu với insert_permission của src/modules/staff/repository.ts (INSERT OR IGNORE … SELECT … WHERE): RAISE(ABORT) của trigger phải chặn dù có OR IGNORE.
const grant = (db: DatabaseSync, staff: string, code: string) =>
  db.prepare(`INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
              SELECT ?, ?, ?, ?, ?, NULL, ?, NULL WHERE 1`).run(`g-${++n}`, staff, code, AT, AT, AT);
const openCount = (db: DatabaseSync, staff: string) =>
  (db.prepare("SELECT count(*) AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL").get(staff) as { c: number }).c;

test("0024: 11 vai có nhóm đúng; vai cũ mơ hồ ngưng gán mới; vai khác giữ nhóm OTHER", () => {
  const db = schema();
  const rows = db.prepare("SELECT code, role_group, active FROM pty_role_type").all() as { code: string; role_group: string; active: number }[];
  const by = new Map(rows.map((r) => [r.code, r]));
  for (const c of ["DIRECTOR", "OPERATIONS_MANAGER", "GUIDE_INTERNAL", "SALES_STAFF", "INTERN", "ACCOUNTANT"]) {
    assert.equal(by.get(c)?.role_group, "INTERNAL", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
  for (const c of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"]) {
    assert.equal(by.get(c)?.role_group, "EXTERNAL", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
  for (const c of ["STAFF", "SALES", "GUIDE", "AGENT"]) {
    assert.equal(by.get(c)?.role_group, "OTHER", c);
    assert.equal(by.get(c)?.active, 0, `${c} ngưng gán mới`);
  }
  for (const c of ["CUSTOMER", "BOAT_CAPTAIN", "DRIVER"]) {
    assert.equal(by.get(c)?.role_group, "OTHER", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
});

test("pty_role_type.role_group: tập đóng, ép bằng CHECK (ADR-0003 điều 3) — sai chữ hoa bị chặn ở CSDL", () => {
  const db = schema();
  assert.throws(
    () => db.prepare("INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('TEST_ROLE', 'Vai thử', 99, 'External')").run(),
    /CHECK/,
  );
});

test("0024: có mã quyền INTERN ('Thực tập'); SUPER_ADMIN mang nhãn 'Toàn quyền'", () => {
  const db = schema();
  const name = (c: string) => (db.prepare("SELECT name FROM stf_permission_type WHERE code = ?").get(c) as { name: string } | undefined)?.name;
  assert.equal(name("INTERN"), "Thực tập");
  assert.equal(name("SUPER_ADMIN"), "Toàn quyền");
});

test("v_pty_open_role_group: chỉ vai ĐANG MỞ thuộc nhóm nội bộ/bên ngoài", () => {
  const db = schema();
  const a = person(db);
  openRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "CUSTOMER");
  const b = person(db);
  openRole(db, b.party, "COLLABORATOR");
  closeRole(db, b.party, "COLLABORATOR");
  const rows = (db.prepare("SELECT party_id, role_group FROM v_pty_open_role_group ORDER BY party_id").all() as object[]).map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ party_id: a.party, role_group: "INTERNAL" }]);
});

test("LC-3: không mở vai bên ngoài khi còn vai nội bộ đang mở (và ngược lại); đóng rồi mở thì được", () => {
  const db = schema();
  const a = person(db, false);
  openRole(db, a.party, "SALES_STAFF");
  assert.throws(() => openRole(db, a.party, "COLLABORATOR"), /party_role_group_conflict/);
  openRole(db, a.party, "CUSTOMER"); // nhóm OTHER không va chạm
  closeRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "COLLABORATOR");
  assert.throws(() => openRole(db, a.party, "INTERN"), /party_role_group_conflict/);
});

test("LC-3: mở lại một vai đã đóng cũng bị chặn nếu va chạm nhóm", () => {
  const db = schema();
  const a = person(db, false);
  openRole(db, a.party, "SALES_STAFF");
  closeRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "COLLABORATOR");
  assert.throws(
    () => db.prepare("UPDATE pty_party_role SET valid_to_date = NULL WHERE party_id = ? AND role_type_code = 'SALES_STAFF'").run(a.party),
    /party_role_group_conflict/,
  );
});

test("LC-1: tài khoản có vai bên ngoài chỉ nhận thêm quyền Đối tác — kể cả câu INSERT OR IGNORE", () => {
  const db = schema();
  const ext = person(db);
  openRole(db, ext.party, "TAXI_DRIVER");
  grant(db, ext.staff, "PARTNER");
  for (const code of ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "SUPER_ADMIN", "INTERN"]) {
    assert.throws(() => grant(db, ext.staff, code), /lc1_external_account_permission/, code);
  }
  const internal = person(db);
  openRole(db, internal.party, "SALES_STAFF");
  grant(db, internal.staff, "SALES");
  const legacy = person(db); // tài khoản cũ: chỉ vai STAFF (nhóm OTHER) — không bị luật mới chạm tới
  openRole(db, legacy.party, "STAFF");
  grant(db, legacy.staff, "ADMIN");
  assert.equal(openCount(db, ext.staff), 1);
  assert.equal(openCount(db, internal.staff), 1);
  assert.equal(openCount(db, legacy.staff), 1);
});

test("stf_permission_adjustment: tối đa một dòng MỞ cho mỗi (tài khoản, mã quyền); lý do bắt buộc", () => {
  const db = schema();
  const a = person(db);
  const add = (id: string, code: string, reason: string) =>
    db.prepare(`INSERT INTO stf_permission_adjustment (id, staff_id, permission_type_code, direction, reason, valid_from_at, created_at, updated_at)
                VALUES (?, ?, ?, 'ADD', ?, ?, ?, ?)`).run(id, a.staff, code, reason, AT, AT, AT);
  add("adj-1", "ACCOUNTING", "kiêm nhiệm");
  assert.throws(() => add("adj-2", "ACCOUNTING", "lần hai"), /UNIQUE/);
  db.prepare("UPDATE stf_permission_adjustment SET valid_to_at = ?, updated_at = ? WHERE id = 'adj-1'").run(AT, AT);
  add("adj-3", "ACCOUNTING", "mở lại");
  assert.throws(() => add("adj-4", "SALES", ""), /CHECK/, "mã khác để UNIQUE không che lỗi CHECK");
});

test("stf_permission_adjustment.direction: tập đóng, ép bằng CHECK (ADR-0003 điều 3) — sai chữ hoa bị chặn ở CSDL", () => {
  const db = schema();
  const a = person(db); // (tài khoản, mã quyền) chưa từng ghi trong test này: lỗi chỉ có thể do CHECK, không phải UNIQUE.
  assert.throws(
    () =>
      db.prepare(`INSERT INTO stf_permission_adjustment (id, staff_id, permission_type_code, direction, reason, valid_from_at, created_at, updated_at)
                  VALUES ('adj-check', ?, 'FIELD', 'add', 'thử CHECK', ?, ?, ?)`).run(a.staff, AT, AT, AT),
    /CHECK/,
  );
});

// Đặc tả tiêu chí 11 (Minor 1, kiểm toàn nhánh 2026-09-24): phát hành 0024 KHÔNG đổi quyền/vai của tài khoản hiện có — tệp migration không được có
// câu GHI (INSERT/REPLACE/UPDATE/DELETE) nào vào bảng quyền, bảng chỉnh tay, bảng tài khoản hay bảng vai hồ sơ. Kiểm bằng văn bản: bỏ chú thích `--`,
// không phân biệt hoa thường, tên bảng phải đứng NGAY sau từ khoá ghi (nên "BEFORE UPDATE ON pty_party_role" của trigger không bị tính) và so nguyên tên
// (stf_permission_type là danh mục, được phép ghi). Quét cả thân trigger — trigger ghi vào các bảng này cũng bị tính (chặt hơn cần thiết, cố ý).
const PROTECTED = ["stf_permission", "stf_permission_adjustment", "staff", "pty_party_role"];
function writesIn(sql: string): { verb: string; table: string }[] {
  const text = sql.replace(/--[^\n]*/g, " ");
  const re = /\b(INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO|UPDATE\s+(?!(?:ON|OF)\b)(?:OR\s+\w+\s+)?|DELETE\s+FROM)\s*([A-Za-z_][A-Za-z0-9_]*)/gi;
  return [...text.matchAll(re)].map((m) => ({ verb: m[1]!.split(/\s+/)[0]!.toUpperCase(), table: m[2]!.toLowerCase() }));
}

test("tiêu chí 11: migration 0024 không ghi vào bảng quyền, bảng tài khoản hay bảng vai hồ sơ (không đổi quyền/vai của tài khoản hiện có)", () => {
  const file = readdirSync(DIR).find((f) => f.startsWith("0024_") && f.endsWith(".sql"));
  assert.ok(file, "phải có tệp migrations/0024_*.sql");
  const writes = writesIn(readFileSync(new URL(file, DIR), "utf8"));
  // Kiểm chính bộ quét (tránh "kiểm giả"): nó PHẢI thấy các câu ghi danh mục có thật trong 0024, và không nhầm trigger với câu ghi.
  assert.ok(writes.some((w) => w.verb === "INSERT" && w.table === "pty_role_type"), "bộ quét phải thấy INSERT INTO pty_role_type");
  assert.ok(writes.some((w) => w.verb === "UPDATE" && w.table === "stf_permission_type"), "bộ quét phải thấy UPDATE stf_permission_type");
  assert.deepEqual(writesIn("CREATE TRIGGER t BEFORE UPDATE ON pty_party_role BEGIN SELECT 1; END;"), [], "trigger 'BEFORE UPDATE ON' không phải câu ghi");
  assert.deepEqual(writesIn("update  Stf_Permission set x = 1; -- DELETE FROM staff\n"), [{ verb: "UPDATE", table: "stf_permission" }]);
  const bad = writes.filter((w) => PROTECTED.includes(w.table));
  assert.deepEqual(bad, [], `0024 ghi vào bảng tài khoản/quyền/vai: ${JSON.stringify(bad)}`);
});
