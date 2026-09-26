// findOrderRef (Bảng tin, ADR-0022 điều 4): gốc lắp ráp đọc MÃ ĐƠN + NGƯỜI LẬP của một đơn để dựng sự kiện 5 khoá và tính nhãn người nhận (NT-2).
// Chạy trên SQLite thật (node:sqlite), schema dựng từ migrations/*.sql — cùng khuôn với dashboard.test.ts. Gói `./index` bằng esbuild (như
// route-access.test.ts) vì đây là API công khai của module, và mã nguồn import module khác bằng thư mục (`../audit`) — Node không tự giải được.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

type Mod = typeof import("./index.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}
const { findOrderRef } = await loadModule();

/** D1 giả tối thiểu: `prepare(sql).bind(...).first()` (findOrderRef chỉ đọc một dòng). */
interface FakeStatement {
  bind: (...args: SupportedValueType[]) => FakeStatement;
  first: () => Promise<unknown>;
}
function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, bound: SupportedValueType[]): FakeStatement => ({
    bind: (...args: SupportedValueType[]) => stmt(sql, args),
    first: async () => {
      const row = sqlite.prepare(sql).get(...bound);
      return row ? { ...row } : null;
    },
  });
  return { prepare: (sql: string) => stmt(sql, []) } as unknown as D1Database;
}

function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
               VALUES ('o-1', 'TD260926-001', 's-a', 'draft', 'Khách', '0900000009', '2026-09-26T03:00:00.000Z', '2026-09-26T03:00:00.000Z')`);
  return sqlite;
}

test("findOrderRef: trả ĐÚNG hai trường mã đơn + người lập (không lộ gì khác của đơn — không tên/SĐT khách, không tiền)", async () => {
  const db = fakeD1(seed());
  assert.deepEqual(await findOrderRef(db, "o-1"), { staffId: "s-a", orderCode: "TD260926-001" });
});

test("findOrderRef: đơn không tồn tại → null (gốc lắp ráp thôi phát, không ném lỗi)", async () => {
  const db = fakeD1(seed());
  assert.equal(await findOrderRef(db, "khong-co"), null);
});
