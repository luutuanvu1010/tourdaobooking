// SQL chính sách đăng nhập + siết theo tập (ADR-0085 Q1–Q2; đặc tả §4.2, §4.3, §6 quy tắc 2, 3, 6) trên SQLite THẬT dựng từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  closePolicyStatement, danhDauMotMayTheoTapStatement, demSietTheoTap, endExpiredAllStatement, insertPolicyAfterCloseStatement, insertPolicyNewStatement,
  laLoiChinhSachCu, listPolicyRows, sietTheoTapStatement,
} from "./repository.ts";
import { isSingleDevice } from "./session-ledger.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import type { RoleCode } from "../../shared/roles.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const NOW = "2026-10-02T01:00:00.000Z";
const LATER = "2026-10-09T01:00:00.000Z";
const loDaChay: number[] = [];

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      loDaChay.push(stmts.length);
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => {
          if (/\bRETURNING\b/i.test(s.sql)) { const rows = sqlite.prepare(s.sql).all(...s.args).map((r) => ({ ...r })); return { results: rows, meta: { changes: rows.length } }; }
          return { results: [], meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  } as unknown as D1Database;
}
function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  // Người lưu chính sách (ended_by của aut_session có khoá ngoại tới staff); không phiên, không quyền nên không lẫn vào bài đếm.
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('toan-quyen', '', '0900000000', 'x', 'sales', 1, '${NOW}')`);
  return { sqlite, db: fakeD1(sqlite) };
}
let soDt = 0;
function nhanVien(sqlite: DatabaseSync, id: string, perms: PermissionCode[], roles: RoleCode[] = []) {
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', 'N ${id}', 1, '${NOW}', '${NOW}')`);
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '09${String(++soDt).padStart(8, "0")}', 'x', 'sales', 1, '${NOW}', 'pty-${id}')`);
  for (const p of perms) sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${id}-${p}', '${id}', '${p}', '${NOW}', '${NOW}', '${NOW}')`);
  for (const r of roles) sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${id}-${r}', 'pty-${id}', '${r}', NULL, '2026-01-01', '${NOW}', '${NOW}')`);
}
function phien(sqlite: DatabaseSync, id: string, staff: string, createdAt: string, single = 0, expires = LATER) {
  sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', ?3, NULL, 'Máy', NULL, NULL, ?4, ?4, ?5, NULL, NULL, NULL, ?2, ?4, NULL)",
  ).run(id, staff, single, createdAt, expires);
}
const datChinhSach = (sqlite: DatabaseSync, code: string, multi: 0 | 1, id = `pol-${code}`) =>
  sqlite.exec(`INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('${id}', '${code}', ${multi}, '${NOW}', '${NOW}', '${NOW}')`);
const song = (sqlite: DatabaseSync, staff: string) =>
  sqlite.prepare("SELECT id, single FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY id").all(staff).map((r) => ({ ...r }));
/** Lô siết như route lưu chính sách: [dọn hạn → siết → đánh dấu]. */
const loSiet = (db: D1Database) => [endExpiredAllStatement(db, NOW), sietTheoTapStatement(db, NOW, "toan-quyen"), danhDauMotMayTheoTapStatement(db, NOW, "toan-quyen")];

test("lưu có kiểm phiên bản: đóng đúng id + chèn; id cũ (người khác vừa lưu) → lỗi ràng buộc, CẢ lô lùi (không dòng nào đổi, không phiên nào kết thúc)", async () => {
  const { sqlite, db } = setup();
  datChinhSach(sqlite, "SALES", 1, "ban-1");
  nhanVien(sqlite, "a", ["SALES"]);
  phien(sqlite, "a1", "a", "2026-10-01T00:00:00.000Z");
  phien(sqlite, "a2", "a", "2026-10-01T01:00:00.000Z");
  // Lần lưu 1 (thắng): SALES → Một máy từ bản ban-1.
  await db.batch([closePolicyStatement(db, { id: "ban-1", code: "SALES", at: NOW, by: "t" }), insertPolicyAfterCloseStatement(db, { id: "ban-2", code: "SALES", multi: false, at: NOW, by: "t" }), ...loSiet(db)]);
  assert.deepEqual((await listPolicyRows(db)).map((r) => ({ ...r })), [{ id: "ban-2", permission_code: "SALES", multi: 0 }]);
  assert.deepEqual(song(sqlite, "a"), [{ id: "a2", single: 1 }]);
  // Lần lưu 2 (thua): cũng từ bản ban-1, đổi SALES và HR. Câu đóng SALES không đổi dòng → chèn ghi NULL → NOT NULL → cả lô lùi (HR cũng không được ghi).
  const truoc = sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r }));
  await assert.rejects(
    db.batch([
      insertPolicyNewStatement(db, { id: "hr-1", code: "HR", multi: true, at: NOW, by: "t2" }),
      closePolicyStatement(db, { id: "ban-1", code: "SALES", at: NOW, by: "t2" }), insertPolicyAfterCloseStatement(db, { id: "ban-3", code: "SALES", multi: true, at: NOW, by: "t2" }),
      ...loSiet(db),
    ]),
    (e) => laLoiChinhSachCu(e),
  );
  assert.deepEqual((await listPolicyRows(db)).map((r) => r.id), ["ban-2"], "không dòng nào của lần thua còn lại (kể cả HR)");
  assert.deepEqual(sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r })), truoc);
});

test("chưa có dòng mà bên kia vừa chèn (banDangXem rỗng cả hai) → lỗi UNIQUE, nhận ra là chính sách cũ", async () => {
  const { db } = setup();
  await db.batch([insertPolicyNewStatement(db, { id: "x1", code: "PARTNER", multi: true, at: NOW, by: "t" })]);
  await assert.rejects(db.batch([insertPolicyNewStatement(db, { id: "x2", code: "PARTNER", multi: false, at: NOW, by: "t2" })]), (e) => laLoiChinhSachCu(e));
  assert.equal(laLoiChinhSachCu(new Error("UNIQUE constraint failed: staff.phone")), false);
});

test("siết theo tập: tài khoản một máy theo chính sách TRONG BẢNG còn đúng phiên còn hạn mới nhất (single=1); Toàn quyền, vai IT, quyền Nhiều máy không đụng", async () => {
  const { sqlite, db } = setup();
  datChinhSach(sqlite, "ACCOUNTING", 1);
  nhanVien(sqlite, "ban", ["SALES"]);
  nhanVien(sqlite, "lai", ["SALES", "ACCOUNTING"]); // một quyền Nhiều máy là đủ
  nhanVien(sqlite, "sup", ["SUPER_ADMIN"]);
  nhanVien(sqlite, "it", ["ADMIN"], ["IT"]);
  for (const s of ["ban", "lai", "sup", "it"]) {
    phien(sqlite, `${s}-1`, s, "2026-10-01T00:00:00.000Z");
    phien(sqlite, `${s}-2`, s, "2026-10-01T02:00:00.000Z");
  }
  phien(sqlite, "ban-het-han", "ban", "2026-10-01T03:00:00.000Z", 0, "2026-10-01T23:00:00.000Z"); // mới nhất nhưng đã hết hạn → het_han, không được giữ
  const kq = await db.batch(loSiet(db));
  assert.deepEqual(song(sqlite, "ban"), [{ id: "ban-2", single: 1 }]);
  assert.equal(sqlite.prepare("SELECT end_reason FROM aut_session WHERE id = 'ban-1'").get()!.end_reason, "mat_mien");
  assert.equal(sqlite.prepare("SELECT end_reason FROM aut_session WHERE id = 'ban-het-han'").get()!.end_reason, "het_han");
  for (const s of ["lai", "sup", "it"]) assert.equal(song(sqlite, s).length, 2, `${s} vẫn nhiều máy`);
  assert.deepEqual((kq[1]!.results as { id: string; staff_id: string }[]).map((r) => ({ ...r })), [{ id: "ban-1", staff_id: "ban" }], "RETURNING đúng phiên vừa kết thúc");
});

test("xem trước = đúng số câu siết sẽ làm (cùng mẩu điều kiện), và khớp isSingleDevice của TypeScript", async () => {
  const { sqlite, db } = setup();
  const nguoi: [string, PermissionCode[], RoleCode[]][] = [["s1", ["SALES"], []], ["s2", ["SALES", "HR"], []], ["p1", ["PARTNER"], []], ["it", ["ADMIN"], ["IT"]], ["sa", ["SUPER_ADMIN"], []]];
  for (const [id, perms, roles] of nguoi) {
    nhanVien(sqlite, id, perms, roles);
    phien(sqlite, `${id}-1`, id, "2026-10-01T00:00:00.000Z");
    phien(sqlite, `${id}-2`, id, "2026-10-01T01:00:00.000Z");
    phien(sqlite, `${id}-3`, id, "2026-10-01T02:00:00.000Z");
  }
  const tapMoi: PermissionCode[] = ["HR"]; // sau khi lưu: chỉ HR Nhiều máy
  const truoc = await demSietTheoTap(db, tapMoi, NOW);
  // TypeScript cùng điều kiện: ai là một máy?
  const motMayTs = nguoi.filter(([, p, r]) => isSingleDevice(p, r, new Set(tapMoi))).map(([id]) => id).sort();
  assert.deepEqual(motMayTs, ["p1", "s1"]);
  assert.deepEqual(truoc, { soPhien: 4, soNguoi: 2 });
  datChinhSach(sqlite, "HR", 1);
  const kq = await db.batch(loSiet(db));
  const daKetThuc = kq[1]!.results as { id: string; staff_id: string }[];
  assert.equal(daKetThuc.length, truoc.soPhien);
  assert.deepEqual([...new Set(daKetThuc.map((r) => r.staff_id))].sort(), motMayTs);
});

test("số câu trong lô siết không phụ thuộc số người: 5 và 50 tài khoản → cùng số câu; 50 tài khoản mỗi người còn đúng một phiên", async () => {
  for (const n of [5, 50]) {
    const { sqlite, db } = setup();
    for (let i = 0; i < n; i++) {
      nhanVien(sqlite, `p${i}`, ["PARTNER"]);
      phien(sqlite, `p${i}-a`, `p${i}`, "2026-10-01T00:00:00.000Z");
      phien(sqlite, `p${i}-b`, `p${i}`, "2026-10-01T01:00:00.000Z");
    }
    loDaChay.length = 0;
    const kq = await db.batch(loSiet(db));
    assert.deepEqual(loDaChay, [3], `${n} tài khoản: một lô 3 câu`);
    assert.equal(kq[1]!.results.length, n);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM (SELECT staff_id FROM aut_session WHERE ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)").get()!.n, 0);
  }
});

test("đánh dấu một máy không vỡ chỉ mục khi tài khoản còn một phiên single=0; tài khoản nhiều máy không bị đánh dấu", async () => {
  const { sqlite, db } = setup();
  nhanVien(sqlite, "a", ["SALES"]);
  nhanVien(sqlite, "sa", ["SUPER_ADMIN"]);
  phien(sqlite, "a1", "a", "2026-10-01T00:00:00.000Z", 0);
  phien(sqlite, "sa1", "sa", "2026-10-01T00:00:00.000Z", 0);
  await db.batch(loSiet(db));
  assert.deepEqual(song(sqlite, "a"), [{ id: "a1", single: 1 }]);
  assert.deepEqual(song(sqlite, "sa"), [{ id: "sa1", single: 0 }]);
});
