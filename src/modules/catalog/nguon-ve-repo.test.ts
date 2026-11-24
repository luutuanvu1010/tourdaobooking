// Hành vi của tệp SQL nửa nghiêm `nguon-ve-repo.ts` (ADR-0175 Đ1.2; theo nhóm ADR-0230 Đ3) trên SQLite thật (node:sqlite, đủ migration) qua một D1 giả tối thiểu (khuôn nhom-repo.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { cauThemNguonVe, cauThemNguonVeNhom, nguonVeHienHanh, nguonVeMoiNhat, nguonVeNhomMoiNhat } from "./nguon-ve-repo.ts";

const DIR = join(import.meta.dirname, "..", "..", "..", "migrations");
const T1 = "2026-11-08T01:00:00.000Z";
const T2 = "2026-11-08T02:00:00.000Z";

function moi(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(join(DIR, f), "utf8"));
  const stmt = (sql: string, args: unknown[] = []) => ({
    sql, args,
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...(args as never[])); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...(args as never[])).map((r) => ({ ...r })) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...(args as never[])).changes) } }),
  });
  return { sqlite, db: { prepare: (sql: string) => stmt(sql) } as unknown as D1Database };
}

test("nguonVeHienHanh: bảng rỗng là Map rỗng; nhiều dòng cùng mã thì lấy dòng mới nhất; nguonVeMoiNhat theo mọi mã", async () => {
  const { db } = moi();
  assert.equal((await nguonVeHienHanh(db)).nguonDichVu.size, 0);
  assert.equal(await nguonVeMoiNhat(db), null);
  await cauThemNguonVe(db, { id: "a", ma: "ZVD1", nguon: "TOUR_DAO", at: T1, by: "s1" }).run();
  await cauThemNguonVe(db, { id: "b", ma: "ZVD2", nguon: "TOUR_DAO", at: T1, by: "s1" }).run();
  await cauThemNguonVe(db, { id: "c", ma: "ZVD1", nguon: "HANG_NGOAI", at: T2, by: "s2" }).run();
  assert.deepEqual([...(await nguonVeHienHanh(db)).nguonDichVu].sort(), [["ZVD1", "HANG_NGOAI"], ["ZVD2", "TOUR_DAO"]]);
  assert.equal(await nguonVeMoiNhat(db), T2);
});

test("cauThemNguonVe: ghi created/updated bằng cùng mốc và cùng người; trùng (mã, mốc) bị UNIQUE chặn", async () => {
  const { sqlite, db } = moi();
  await cauThemNguonVe(db, { id: "a", ma: "ZVD1", nguon: "TOUR_DAO", at: T1, by: "s1" }).run();
  assert.deepEqual({ ...(sqlite.prepare("SELECT valid_from_at, created_at, updated_at, created_by, updated_by FROM ctl_service_ticket_source").get() as object) }, {
    valid_from_at: T1, created_at: T1, updated_at: T1, created_by: "s1", updated_by: "s1",
  });
  await assert.rejects(cauThemNguonVe(db, { id: "b", ma: "ZVD1", nguon: "HANG_NGOAI", at: T1, by: "s2" }).run(), /UNIQUE/i);
});

test("theo nhóm: nguonNhom lấy dòng mới nhất của mỗi nhóm; mốc mới nhất riêng của bảng nhóm; trùng (nhóm, mốc) bị UNIQUE chặn; nhóm phải có thật", async () => {
  const { sqlite, db } = moi();
  for (const c of ["NA", "NB"]) sqlite.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 99, 1, ?, ?)").run(c, `Nhóm ${c}`, T1, T1);
  assert.equal((await nguonVeHienHanh(db)).nguonNhom.size, 0);
  assert.equal(await nguonVeNhomMoiNhat(db), null);
  await cauThemNguonVeNhom(db, { id: "a", nhom: "NA", nguon: "TOUR_DAO", at: T1, by: "s1" }).run();
  await cauThemNguonVeNhom(db, { id: "b", nhom: "NB", nguon: "TOUR_DAO", at: T1, by: "s1" }).run();
  await cauThemNguonVeNhom(db, { id: "c", nhom: "NA", nguon: "HANG_NGOAI", at: T2, by: "s2" }).run();
  const hien = await nguonVeHienHanh(db);
  assert.deepEqual([...hien.nguonNhom].sort(), [["NA", "HANG_NGOAI"], ["NB", "TOUR_DAO"]]);
  assert.equal(hien.nguonDichVu.size, 0, "bảng dịch vụ không bị đụng");
  assert.equal(await nguonVeNhomMoiNhat(db), T2);
  assert.equal(await nguonVeMoiNhat(db), null);
  await assert.rejects(cauThemNguonVeNhom(db, { id: "d", nhom: "NA", nguon: "TOUR_DAO", at: T2, by: "s2" }).run(), /UNIQUE/i);
  await assert.rejects(cauThemNguonVeNhom(db, { id: "e", nhom: "KHONGCO", nguon: "TOUR_DAO", at: T2, by: "s2" }).run(), /FOREIGN KEY/i);
});
