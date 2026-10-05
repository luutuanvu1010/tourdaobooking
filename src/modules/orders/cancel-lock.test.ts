// Khoá lạc quan của cancelOrder (T1d, điều kiện tiên quyết ADR-0030) — chạy trên SQLite thật (node:sqlite), schema dựng từ migrations/*.sql, cùng khuôn
// fakeD1 hỗ trợ batch() như dispatch/service.test.ts (D1 thật chạy batch tuần tự trong MỘT giao dịch, meta.changes theo từng câu).
//
// Bối cảnh: `cancelOrder` nhận `prevUpdatedAt` (mốc `updated_at` route đọc lúc kiểm quyền) và tính `at = nextStamp(prevUpdatedAt)`, nhưng câu UPDATE
// (trước khi sửa ở việc này) chỉ khoá theo `status = from`, KHÔNG khoá theo `updated_at` — nên một request PUT /trip chen giữa lúc route đọc và lúc
// route gọi cancelOrder (đổi updated_at, KHÔNG đổi status) vẫn để đơn bị huỷ, dù client đang huỷ theo một bản đơn đã cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./repository.ts");
/** ADR-0089 đ8: lô huỷ nay bắt buộc lý do (nhóm khách huỷ). */
const LY_DO = { ma: "KHACH_DOI_Y", nhom: "KHACH_HUY" as const, ghiChu: null };
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}
const { cancelOrder } = await loadModule();

/** D1 giả: `prepare().bind()` ghi lại câu + tham số; `batch()` chạy tuần tự trong MỘT giao dịch như D1 thật — đúng khuôn dispatch/service.test.ts. */
interface FakeStatement {
  sql: string;
  args: SupportedValueType[];
  first: () => Promise<unknown>;
  all: () => Promise<{ results: unknown[] }>;
}
function fakeD1(sqlite: DatabaseSync): D1Database {
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: SupportedValueType[]): FakeStatement => ({
        sql,
        args,
        first: async () => {
          const row = sqlite.prepare(sql).get(...args);
          return row ? { ...row } : null;
        },
        all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })) }),
      }),
    }),
    batch: async (stmts: FakeStatement[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ meta: { changes: sqlite.prepare(s.sql).run(...s.args).changes } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return db as unknown as D1Database;
}

/** Schema đầy đủ; một tài khoản (An = s-a) được `0012` backfill thành hồ sơ `pty-s-a`. */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  return sqlite;
}

/** Đơn ĐÃ xác nhận NGAY từ đầu (INSERT trực tiếp, không qua UPDATE — trigger `orders_confirm_requires_trip`/`order_service_frozen_insert` chỉ bắt UPDATE),
 * KHÔNG có dịch vụ nào — cùng cách dashboard.test.ts:insertConfirmedOrderNoServices, không cần gỡ trigger. */
function insertConfirmedOrder(sqlite: DatabaseSync, id: string, updatedAt: string): void {
  sqlite
    .prepare(
      `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, created_at, updated_at, confirmed_at)
       VALUES (?, ?, 's-a', 'confirmed', 'Khách', '0900000000', 1000000, 0, 1000000, 0, 'cash', 1000000, ?, ?, ?)`,
    )
    .run(id, `TD-${id}`, updatedAt, updatedAt, updatedAt);
}

const orderRow = (sqlite: DatabaseSync, id: string) => ({ ...(sqlite.prepare(`SELECT status, updated_at FROM orders WHERE id = ?`).get(id) as { status: string; updated_at: string }) });
const auditCount = (sqlite: DatabaseSync, id: string) => (sqlite.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE order_id = ?`).get(id) as { n: number }).n;

const M1 = "2026-09-27T01:00:00.000Z"; // mốc route đã đọc lúc kiểm quyền
const lyDoCount = (sqlite: DatabaseSync, id: string): number => Number((sqlite.prepare("SELECT count(*) AS n FROM ord_cancel_reason WHERE order_id = ?").get(id) as { n: number }).n);
const M2 = "2026-09-27T02:00:00.000Z"; // mốc mới do một request PUT /trip chen giữa ghi ra

test("cancelOrder: request PUT /trip chen giữa đổi updated_at (KHÔNG đổi status) → huỷ với mốc CŨ (M1) phải thua khoá lạc quan: trả false, status vẫn confirmed, KHÔNG có dòng audit_log mới", async () => {
  const sqlite = seed();
  insertConfirmedOrder(sqlite, "o-1", M1);
  // Mô phỏng PUT /trip chen giữa: đổi updated_at nhưng KHÔNG đổi status.
  sqlite.prepare(`UPDATE orders SET updated_at = ? WHERE id = ?`).run(M2, "o-1");

  const ok = await cancelOrder(fakeD1(sqlite), "o-1", "s-a", "confirmed", M1, LY_DO);

  assert.equal(ok, false, "huỷ với mốc cũ phải thua khoá lạc quan");
  assert.deepEqual(orderRow(sqlite, "o-1"), { status: "confirmed", updated_at: M2 }, "đơn KHÔNG bị huỷ, updated_at giữ mốc M2 (không bị ghi đè)");
  assert.equal(auditCount(sqlite, "o-1"), 0, "không có dòng nhật ký huỷ nào được ghi khi thua khoá lạc quan");
  assert.equal(lyDoCount(sqlite, "o-1"), 0, "ADR-0089 đ8: thua khoá lạc quan → KHÔNG để lại dòng lý do huỷ mồ côi");
});

test("cancelOrder: ca 'order_cancelled_by_field' (đường huỷ hẹp của HDV, ADR-0014 điều 11) cũng thua khoá lạc quan như ca mặc định", async () => {
  const sqlite = seed();
  insertConfirmedOrder(sqlite, "o-2", M1);
  sqlite.prepare(`UPDATE orders SET updated_at = ? WHERE id = ?`).run(M2, "o-2");

  const ok = await cancelOrder(fakeD1(sqlite), "o-2", "s-a", "confirmed", M1, LY_DO, { action: "order_cancelled_by_field", detail: "Khách đổi lịch" });

  assert.equal(ok, false, "huỷ với mốc cũ (đường HDV) phải thua khoá lạc quan");
  assert.deepEqual(orderRow(sqlite, "o-2"), { status: "confirmed", updated_at: M2 });
  assert.equal(auditCount(sqlite, "o-2"), 0, "không ghi dòng order_cancelled_by_field khi thua khoá lạc quan");
  assert.equal(lyDoCount(sqlite, "o-2"), 0, "không dòng lý do mồ côi");
});

test("cancelOrder: huỷ với mốc ĐÚNG (khớp updated_at hiện tại, không có ai chen giữa) → vẫn thắng như trước: trả true, status = cancelled, có 1 dòng audit_log", async () => {
  const sqlite = seed();
  insertConfirmedOrder(sqlite, "o-3", M1);

  const ok = await cancelOrder(fakeD1(sqlite), "o-3", "s-a", "confirmed", M1, LY_DO);

  assert.equal(ok, true, "không ai chen giữa → huỷ bình thường");
  assert.equal(orderRow(sqlite, "o-3").status, "cancelled");
  assert.equal(auditCount(sqlite, "o-3"), 1);
  assert.equal(lyDoCount(sqlite, "o-3"), 1, "đúng một dòng lý do cùng lô");
});
