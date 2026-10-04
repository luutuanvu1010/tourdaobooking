// Bộ bọc cơ sở dữ liệu của lớp vé (ADR-0094 đ3, đặc tả §3.5): mỗi bẫy một bài, chạy trên D1 giả = SQLite thật (CHẾ ĐỘ NGHIÊM — lô từ chối câu không do
// chính D1 giả tạo, nên lỗi "quên gỡ bọc" đỏ ở đây chứ không chỉ lộ trên D1 thật).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../tests/audit/harness.mjs";
import { LOI_TU_CHOI_SAU_DUNG_VE, bocDb, laCauDoc, laLoiDungVe } from "./lan-gui-boc.ts";

const AT = "2026-10-03T01:00:00.000Z";
const CHEN_VE = "INSERT INTO lg_lan_gui (staff_id, khoa, van_tay, duong, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, 'vt', 'POST /api/x', ?3, ?1, ?3, ?1)";

function dung(khoa = "k-000000000000001") {
  const sqlite = openDb();
  sqlite.exec("CREATE TABLE thu (id TEXT PRIMARY KEY, v INTEGER NOT NULL CHECK (v >= 0))");
  const goc = fakeD1(sqlite);
  const b = bocDb(goc as unknown as D1Database, (g) => g.prepare(CHEN_VE).bind("s1", khoa, AT));
  const ve = () => sqlite.prepare("SELECT count(*) AS n FROM lg_lan_gui WHERE staff_id = 's1'").get().n as number;
  const thu = () => sqlite.prepare("SELECT id, v FROM thu ORDER BY id").all().map((r: object) => ({ ...r }));
  return { sqlite, goc, b, db: b.db, ve, thu };
}

test("laCauDoc: câu đọc chạy thẳng, câu ghi mang vé", () => {
  for (const s of ["SELECT 1", "  select x FROM t", "PRAGMA x", "EXPLAIN SELECT 1", "WITH a AS (SELECT 1) SELECT * FROM a", "-- chú thích\nSELECT 1", "/* c */ SELECT 1"]) assert.equal(laCauDoc(s), true, s);
  for (const s of ["INSERT INTO t VALUES (1)", "UPDATE t SET a = 1", "DELETE FROM t", "REPLACE INTO t VALUES (1)", "WITH a AS (SELECT 1) INSERT INTO t SELECT * FROM a", "\n  INSERT INTO t VALUES (1)"])
    assert.equal(laCauDoc(s), false, s);
});

test("laLoiDungVe: nhận chữ lỗi SQLite và dạng D1 bọc thêm; không nhận lỗi UNIQUE của bảng khác", () => {
  assert.equal(laLoiDungVe(new Error("UNIQUE constraint failed: lg_lan_gui.staff_id, lg_lan_gui.khoa")), true);
  assert.equal(laLoiDungVe(new Error("D1_ERROR: UNIQUE constraint failed: lg_lan_gui.staff_id, lg_lan_gui.khoa: SQLITE_CONSTRAINT")), true);
  assert.equal(laLoiDungVe(new Error("UNIQUE constraint failed: staff.phone")), false);
  assert.equal(laLoiDungVe("x"), false);
});

test("bẫy 1: batch GỠ BỌC trước khi gọi D1 (D1 giả nghiêm nhận lô); bind giữ bọc", async () => {
  const { db, ve, thu } = dung();
  await db.batch([db.prepare("INSERT INTO thu (id, v) VALUES (?, ?)").bind("a", 1), db.prepare("INSERT INTO thu (id, v) VALUES (?, ?)").bind("b", 2)]);
  assert.deepEqual(thu(), [{ id: "a", v: 1 }, { id: "b", v: 2 }]);
  assert.equal(ve(), 1);
});

test("bẫy 1 (mặt kia): D1 giả nghiêm từ chối câu không do nó tạo", async () => {
  const { goc } = dung();
  await assert.rejects(goc.batch([{ sql: "INSERT INTO thu (id, v) VALUES ('x', 1)", args: [] }]), /fakeD1 nghiêm/);
});

test("bẫy 1 (câu lạ): câu dựng trên D1 gốc (vd hàm tiêm) đi nguyên trong lô bọc; lô có nó là lô GHI (mang vé)", async () => {
  const { db, goc, ve, thu } = dung();
  await db.batch([goc.prepare("INSERT INTO thu (id, v) VALUES ('g', 7)") as unknown as D1PreparedStatement]);
  assert.deepEqual(thu(), [{ id: "g", v: 7 }]);
  assert.equal(ve(), 1);
});

test("bẫy 2: vé ở CUỐI lô, kết quả của câu vé bị cắt — kq[i] theo vị trí không lệch", async () => {
  const { db, ve } = dung();
  const kq = await db.batch([
    db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)"),
    db.prepare("INSERT INTO thu (id, v) VALUES ('b', 2) RETURNING id"),
    db.prepare("SELECT count(*) AS n FROM thu"),
  ]);
  assert.equal(kq.length, 3);
  assert.deepEqual(kq[1]!.results, [{ id: "b" }]);
  assert.deepEqual(kq[2]!.results, [{ n: 2 }], "câu đọc cuối của nơi gọi thấy dữ liệu của chính lô — vé đi SAU nó");
  assert.equal(ve(), 1);
});

test("bẫy 2 (lô toàn câu đọc): không mang vé, không đếm là lần ghi", async () => {
  const { db, ve, b } = dung();
  await db.batch([db.prepare("SELECT 1 AS x"), db.prepare("SELECT 2 AS y")]);
  assert.equal(ve(), 0);
  assert.equal(b.soLanGhi(), 0);
});

test("bẫy 3: .run() lẻ mang vé; .first() của INSERT … RETURNING trả đúng dòng; .first(col) trả cột; câu đọc chạy thẳng", async () => {
  const { db, ve, thu } = dung();
  assert.equal(await db.prepare("SELECT count(*) AS n FROM thu").first("n"), 0);
  assert.equal(ve(), 0, "câu đọc không mang vé");
  const r = await db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)").run();
  assert.equal(r.meta.changes, 1);
  assert.equal(ve(), 1);
  assert.deepEqual(await db.prepare("INSERT INTO thu (id, v) VALUES ('b', 2) RETURNING id, v").first(), { id: "b", v: 2 });
  assert.equal(await db.prepare("INSERT INTO thu (id, v) VALUES ('c', 3) RETURNING v").first("v"), 3);
  assert.deepEqual((await db.prepare("INSERT INTO thu (id, v) VALUES ('d', 4) RETURNING id").all()).results, [{ id: "d" }]);
  assert.equal(thu().length, 4);
  assert.equal(ve(), 1, "chỉ một vé cho cả yêu cầu");
});

test("bẫy 3 (vé qua câu lẻ): INSERT … RETURNING là lần ghi ĐẦU — vẫn trả đúng hình khi đi qua lô [câu, vé]", async () => {
  const { db, ve } = dung();
  assert.deepEqual(await db.prepare("INSERT INTO thu (id, v) VALUES ('a', 9) RETURNING id, v").first(), { id: "a", v: 9 });
  assert.deepEqual(await (dung().db).prepare("INSERT INTO thu (id, v) VALUES ('z', 1) RETURNING id").raw(), [["z"]]);
  assert.equal(ve(), 1);
});

test("bẫy 4: chỉ lô ghi đầu tiên THÀNH CÔNG mang vé — lô hỏng không để lại vé, lô kế tiếp lại mang vé; đếm số lần ghi", async () => {
  const { db, ve, thu, b } = dung();
  await assert.rejects(db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('a', -1)")]), /CHECK/);
  assert.equal(ve(), 0, "lô hỏng: không vé");
  assert.equal(b.daGhiVe(), false);
  await db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)")]);
  assert.equal(ve(), 1);
  await db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('b', 2)")]);
  await db.prepare("UPDATE thu SET v = 5 WHERE id = 'a'").run();
  assert.equal(ve(), 1, "lô sau không mang vé lần hai");
  assert.equal(b.soLanGhi(), 4);
  assert.deepEqual(thu(), [{ id: "a", v: 5 }, { id: "b", v: 2 }]);
});

test("bẫy 5: lô đụng khoá vé ⇒ ném LẠI ĐÚNG lỗi gốc, không ghi gì của lô, cờ dungVe, từ chối mọi lệnh ghi tiếp theo; đọc vẫn chạy", async () => {
  const { db, sqlite, ve, thu, b } = dung();
  sqlite.prepare(CHEN_VE).run("s1", "k-000000000000001", AT); // một lần gửi đồng thời cùng vé đã thắng
  await assert.rejects(db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)")]), /UNIQUE constraint failed: lg_lan_gui\.staff_id, lg_lan_gui\.khoa/);
  assert.equal(b.dungVe(), true);
  assert.deepEqual(thu(), [], "cả lô huỷ");
  await assert.rejects(db.prepare("INSERT INTO thu (id, v) VALUES ('b', 1)").run(), new RegExp(LOI_TU_CHOI_SAU_DUNG_VE));
  await assert.rejects(db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('c', 1)")]), new RegExp(LOI_TU_CHOI_SAU_DUNG_VE));
  assert.equal(await db.prepare("SELECT count(*) AS n FROM thu").first("n"), 0);
  assert.deepEqual(thu(), []);
  assert.equal(ve(), 1);
});

test("N1 (kiểm độc lập vòng 1): hai lệnh ghi ĐỒNG THỜI trong một yêu cầu ⇒ xếp hàng tuần tự — cả hai ghi được, đúng MỘT vé, không đụng vé của chính mình", async () => {
  const { db, ve, thu, b } = dung();
  const kq = await Promise.allSettled([
    db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)").run(),
    db.batch([db.prepare("INSERT INTO thu (id, v) VALUES ('b', 2)")]),
    db.prepare("INSERT INTO thu (id, v) VALUES ('c', 3) RETURNING id").first(),
  ]);
  assert.deepEqual(kq.map((k) => k.status), ["fulfilled", "fulfilled", "fulfilled"], JSON.stringify(kq));
  assert.equal(b.dungVe(), false);
  assert.equal(ve(), 1);
  assert.deepEqual(thu().map((r: { id: string }) => r.id), ["a", "b", "c"]);
});

test("N1: lệnh ghi đầu (mang vé) HỎNG khi lệnh thứ hai đang chờ ⇒ lệnh thứ hai mang vé thay (vé ⇔ lô ghi thành công)", async () => {
  const { db, ve, thu } = dung();
  const [r1, r2] = await Promise.allSettled([db.prepare("INSERT INTO thu (id, v) VALUES ('a', -1)").run(), db.prepare("INSERT INTO thu (id, v) VALUES ('b', 1)").run()]);
  assert.equal(r1.status, "rejected");
  assert.equal(r2.status, "fulfilled");
  assert.equal(ve(), 1);
  assert.deepEqual(thu(), [{ id: "b", v: 1 }]);
});

test("G1 (kiểm độc lập vòng 1): WITH … SELECT có hàm replace() là câu ĐỌC; WITH … REPLACE INTO vẫn là ghi", () => {
  assert.equal(laCauDoc("WITH a AS (SELECT 1 AS x) SELECT replace(x, '1', '2') FROM a"), true);
  assert.equal(laCauDoc("WITH a AS (SELECT 1) REPLACE INTO t SELECT * FROM a"), false);
  assert.equal(laCauDoc("WITH a AS (SELECT 1) DELETE FROM t WHERE id IN (SELECT * FROM a)"), false);
});

test("dong(): sau khi router xong, lệnh ghi trễ đi thẳng — không mang vé, không bị từ chối kể cả sau đụng vé", async () => {
  const a = dung();
  a.b.dong();
  await a.db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)").run();
  assert.equal(a.ve(), 0);
  const c = dung();
  c.sqlite.prepare(CHEN_VE).run("s1", "k-000000000000001", AT);
  await assert.rejects(c.db.batch([c.db.prepare("INSERT INTO thu (id, v) VALUES ('a', 1)")]));
  c.b.dong();
  await c.db.batch([c.db.prepare("INSERT INTO thu (id, v) VALUES ('b', 1)")]);
  assert.deepEqual(c.thu(), [{ id: "b", v: 1 }]);
});
