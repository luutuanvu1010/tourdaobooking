// Hành vi của tệp SQL nửa nghiêm `nhom-repo.ts` (ADR-0058) trên SQLite thật (node:sqlite, đủ migration) qua một D1 giả tối thiểu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { danhSachNhom, demDichVuCuaNhom, ganNhomStatements, lichSuNhom, maNhomMoi, nhomHienHanhTheoMa, nhomTheoMa, suaNhom, themNhom } from "./nhom-repo.ts";

const DIR = join(import.meta.dirname, "..", "..", "..", "migrations");
const T1 = "2026-09-30T01:00:00.000Z";
const T2 = "2026-09-30T02:00:00.000Z";

function moi(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(join(DIR, f), "utf8"));
  const stmt = (sql: string, args: unknown[] = []) => ({
    sql, args,
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...(args as never[])); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...(args as never[])).map((r) => ({ ...r })) }),
  });
  const db = {
    prepare: (sql: string) => stmt(sql),
    batch: async (list: { sql: string; args: unknown[] }[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = list.map((s) => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...(s.args as never[])).changes) } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  } as unknown as D1Database;
  return { sqlite, db };
}
const chenDichVu = (s: DatabaseSync, ma: string) =>
  s.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 1, 1, ?, ?)`).run(ma, `DV ${ma}`, T1, T1);
const chay = async (db: D1Database, st: D1PreparedStatement[]) => db.batch(st) as unknown as Promise<{ meta: { changes: number } }[]>;

test("thêm nhóm, đọc lại, sửa có khoá lạc quan (updated_at cũ sai → changes 0)", async () => {
  const { db } = moi();
  const code = maNhomMoi();
  await chay(db, [themNhom(db, { code, name: "Nhóm thử", sortOrder: 99, staffId: "u1", now: T1 })]);
  const g = await nhomTheoMa(db, code);
  assert.equal(g?.name, "Nhóm thử");
  assert.equal(g?.active, 1);
  const [ok] = await chay(db, [suaNhom(db, { code, name: "Đổi tên", sortOrder: 98, active: true, staffId: "u2", now: T2, updatedAtCu: T1 })]);
  assert.equal(ok!.meta.changes, 1);
  const [thua] = await chay(db, [suaNhom(db, { code, name: "Đổi lần nữa", sortOrder: 98, active: true, staffId: "u3", now: T2, updatedAtCu: T1 })]);
  assert.equal(thua!.meta.changes, 0, "updated_at cũ đã lỗi thời → không ghi");
  assert.equal((await nhomTheoMa(db, code))?.name, "Đổi tên");
});

test("nhomTheoMa: mã không có → null (nền để 404, không dựa chữ lỗi CSDL)", async () => {
  const { db } = moi();
  assert.equal(await nhomTheoMa(db, "khong-co"), null);
});

test("tên trùng giữa nhóm đang dùng bị CSDL chặn; nhóm tắt thì tên được dùng lại", async () => {
  const { db } = moi();
  await chay(db, [themNhom(db, { code: "a", name: "Trùng", sortOrder: 1, staffId: "u", now: T1 })]);
  await assert.rejects(chay(db, [themNhom(db, { code: "b", name: "Trùng", sortOrder: 2, staffId: "u", now: T1 })]));
  await chay(db, [suaNhom(db, { code: "a", name: "Trùng", sortOrder: 1, active: false, staffId: "u", now: T2, updatedAtCu: T1 })]);
  await chay(db, [themNhom(db, { code: "b", name: "Trùng", sortOrder: 2, staffId: "u", now: T2 })]);
});

test("gán nhóm: seq tăng, bỏ qua mã đã đúng nhóm, hiện hành + lịch sử + đếm", async () => {
  const { sqlite, db } = moi();
  for (const m of ["X1", "X2", "X3"]) chenDichVu(sqlite, m);
  await chay(db, [themNhom(db, { code: "n1", name: "Một", sortOrder: 1, staffId: "u", now: T1 }), themNhom(db, { code: "n2", name: "Hai", sortOrder: 2, staffId: "u", now: T1 })]);

  const l1 = await ganNhomStatements(db, { codes: ["X1", "X2"], groupCode: "n1", staffId: "u1", now: T1 });
  assert.equal(l1.statements.length, 2);
  assert.deepEqual(l1.doi, [{ serviceCode: "X1", tuNhom: null, denNhom: "n1" }, { serviceCode: "X2", tuNhom: null, denNhom: "n1" }]);
  await chay(db, l1.statements);

  const l2 = await ganNhomStatements(db, { codes: ["X1", "X2", "X3"], groupCode: "n1", staffId: "u1", now: T2 });
  assert.deepEqual(l2.boQua, ["X1", "X2"], "đã ở đúng nhóm → bỏ qua");
  assert.deepEqual(l2.doi.map((d) => d.serviceCode), ["X3"]);
  await chay(db, l2.statements);

  const l3 = await ganNhomStatements(db, { codes: ["X1"], groupCode: "n2", staffId: "u2", now: T2 });
  assert.deepEqual(l3.doi, [{ serviceCode: "X1", tuNhom: "n1", denNhom: "n2" }]);
  await chay(db, l3.statements);
  const l4 = await ganNhomStatements(db, { codes: ["X1"], groupCode: null, staffId: "u2", now: T2 });
  await chay(db, l4.statements);

  const hh = await nhomHienHanhTheoMa(db);
  assert.equal(hh.get("X1"), null, "đã đưa về Chưa phân loại");
  assert.equal(hh.get("X2"), "n1");
  assert.equal(hh.get("X3"), "n1");
  assert.equal(await demDichVuCuaNhom(db, "n1"), 2);
  assert.equal(await demDichVuCuaNhom(db, "n2"), 0, "dòng cũ của X1 ở n2 không còn hiện hành");

  const ls = await lichSuNhom(db, "X1");
  assert.deepEqual(ls.map((r) => [r.seq, r.group_code, r.group_name, r.created_by]), [[3, null, null, "u2"], [2, "n2", "Hai", "u2"], [1, "n1", "Một", "u1"]]);

  const ds = (await danhSachNhom(db)).filter((g) => g.code === "n1" || g.code === "n2");
  assert.deepEqual(ds.map((g) => [g.code, g.service_count]), [["n1", 2], ["n2", 0]]);
});

test("hai lệnh đua cùng seq: CSDL chặn lệnh sau (→ 409 ở tầng trên)", async () => {
  const { sqlite, db } = moi();
  chenDichVu(sqlite, "Y1");
  await chay(db, [themNhom(db, { code: "n1", name: "Một", sortOrder: 1, staffId: "u", now: T1 }), themNhom(db, { code: "n2", name: "Hai", sortOrder: 2, staffId: "u", now: T1 })]);
  const a = await ganNhomStatements(db, { codes: ["Y1"], groupCode: "n1", staffId: "u", now: T1 });
  const b = await ganNhomStatements(db, { codes: ["Y1"], groupCode: "n2", staffId: "u", now: T1 }); // đọc CÙNG lúc: cả hai định ghi seq = 1
  await chay(db, a.statements);
  await assert.rejects(chay(db, b.statements));
});

test("gán vào nhóm đã tắt: trigger chặn (lưới cuối); mã lạ: khoá ngoại chặn", async () => {
  const { sqlite, db } = moi();
  chenDichVu(sqlite, "Z1");
  await chay(db, [themNhom(db, { code: "t", name: "Tắt", sortOrder: 1, staffId: "u", now: T1 })]);
  await chay(db, [suaNhom(db, { code: "t", name: "Tắt", sortOrder: 1, active: false, staffId: "u", now: T2, updatedAtCu: T1 })]);
  await assert.rejects(async () => chay(db, (await ganNhomStatements(db, { codes: ["Z1"], groupCode: "t", staffId: "u", now: T2 })).statements));
  await chay(db, [themNhom(db, { code: "b", name: "Bật", sortOrder: 2, staffId: "u", now: T2 })]);
  await assert.rejects(async () => chay(db, (await ganNhomStatements(db, { codes: ["khong-co"], groupCode: "b", staffId: "u", now: T2 })).statements));
  assert.equal((await ganNhomStatements(db, { codes: ["khong-co"], groupCode: null, staffId: "u", now: T2 })).statements.length, 0, "mã chưa từng gán mà đích là Chưa phân loại: không có gì để ghi");
});

test("F1 (vòng sửa A3): câu TẮT nhóm tự chặn khi nhóm còn dịch vụ hiện hành — đua 'đếm xong rồi có người gán' → changes 0, nhóm vẫn bật; bật / sửa tên không bị cản", async () => {
  const { sqlite, db } = moi();
  chenDichVu(sqlite, "R1");
  await chay(db, [themNhom(db, { code: "r", name: "Đua", sortOrder: 1, staffId: "u", now: T1 }), themNhom(db, { code: "k", name: "Khác", sortOrder: 2, staffId: "u", now: T1 })]);
  // Tầng trên đã đếm 0 dịch vụ; ngay sau đó một lô gán R1 vào nhóm "r" thắng trước:
  await chay(db, (await ganNhomStatements(db, { codes: ["R1"], groupCode: "r", staffId: "u", now: T1 })).statements);
  const [tat] = await chay(db, [suaNhom(db, { code: "r", name: "Đua", sortOrder: 1, active: false, staffId: "u", now: T2, updatedAtCu: T1 })]);
  assert.equal(tat!.meta.changes, 0, "nhóm còn dịch vụ hiện hành → câu tắt không ghi");
  assert.equal((await nhomTheoMa(db, "r"))?.active, 1, "nhóm vẫn bật");
  // Nhóm vẫn bật: sửa tên / thứ tự không bị điều kiện cản
  const [sua] = await chay(db, [suaNhom(db, { code: "r", name: "Đua 2", sortOrder: 3, active: true, staffId: "u", now: T2, updatedAtCu: T1 })]);
  assert.equal(sua!.meta.changes, 1);
  // Chuyển R1 đi (dòng cũ vẫn trong lịch sử, không còn hiện hành) → tắt được
  await chay(db, (await ganNhomStatements(db, { codes: ["R1"], groupCode: "k", staffId: "u", now: T2 })).statements);
  const [tat2] = await chay(db, [suaNhom(db, { code: "r", name: "Đua 2", sortOrder: 3, active: false, staffId: "u", now: "2026-09-30T03:00:00.000Z", updatedAtCu: T2 })]);
  assert.equal(tat2!.meta.changes, 1, "chỉ dòng HIỆN HÀNH tính — lịch sử cũ không cản");
  assert.equal((await nhomTheoMa(db, "r"))?.active, 0);
});
