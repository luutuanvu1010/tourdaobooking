// handlerOf (Bảng tin, ADR-0022): trạng thái người phụ trách ĐANG MỞ của một đơn, dùng để tính nhãn người nhận của sự kiện (NT-2) và đổi `tao` →
// `tao_cho_nhan` khi đơn mới chưa có người. Nhánh khó: người phụ trách là hồ sơ KHÔNG có tài khoản → đơn CÓ người (`coNguoi: true`) nhưng không có
// `staffId` (không có nhãn `nguoi:` cho người đó, cũng KHÔNG gắn `cho-nhan`). Chạy trên SQLite thật, schema từ migrations/*.sql (khuôn service.test.ts);
// gói `./index` bằng esbuild vì đây là API công khai của module.
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
const { handlerOf } = await loadModule();

/** D1 giả tối thiểu: `prepare(sql).bind(...).first()` (handlerOf chỉ đọc một dòng của view `v_dsp_order_handler`). */
function fakeD1(sqlite: DatabaseSync): D1Database {
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: SupportedValueType[]) => ({
        first: async () => {
          const row = sqlite.prepare(sql).get(...args);
          return row ? { ...row } : null;
        },
      }),
    }),
  };
  return db as unknown as D1Database;
}

const T1 = "2026-09-26T01:00:00.000Z";
const T2 = "2026-09-26T02:00:00.000Z";

/** Hai tài khoản (An = s-a, Bình = s-b; `0012` backfill thành hồ sơ `pty-s-a`/`pty-s-b`), một hồ sơ KHÔNG tài khoản (`pty-khong-tk`), ba đơn của An. */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-b', 'Trần Thị Bình', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-khong-tk', 'PERSON', 'Hướng dẫn viên ngoài', 1, '${T1}', '${T1}')`);
  for (const id of ["o-co-tk", "o-khong-tk", "o-chua-ai", "o-da-dong"]) {
    sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
                 VALUES ('${id}', 'TD-${id}', 's-a', 'draft', 'K', '0900000009', '${T1}', '${T1}')`);
  }
  const handle = (id: string, orderId: string, partyId: string, validTo: string | null) =>
    sqlite
      .prepare(
        `INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?, 's-a', ?, 's-a')`,
      )
      .run(id, orderId, partyId, T1, validTo, T1, validTo ?? T1);
  handle("h1", "o-co-tk", "pty-s-b", null);
  handle("h2", "o-khong-tk", "pty-khong-tk", null);
  handle("h3", "o-da-dong", "pty-s-b", T2); // dòng đã ĐÓNG — không còn người phụ trách đang mở
  return sqlite;
}

test("handlerOf: người phụ trách đang mở CÓ tài khoản → { coNguoi: true, staffId: <id tài khoản> }", async () => {
  assert.deepEqual(await handlerOf(fakeD1(seed()), "o-co-tk"), { coNguoi: true, staffId: "s-b" });
});

test("handlerOf: người phụ trách là hồ sơ KHÔNG tài khoản → { coNguoi: true, staffId: null } (đơn có người — không phải 'chờ nhận')", async () => {
  assert.deepEqual(await handlerOf(fakeD1(seed()), "o-khong-tk"), { coNguoi: true, staffId: null });
});

test("handlerOf: đơn chưa từng có người phụ trách, hoặc dòng cũ đã đóng → { coNguoi: false, staffId: null }", async () => {
  const db = fakeD1(seed());
  assert.deepEqual(await handlerOf(db, "o-chua-ai"), { coNguoi: false, staffId: null });
  assert.deepEqual(await handlerOf(db, "o-da-dong"), { coNguoi: false, staffId: null });
});
