// Đặt/đổi người phụ trách — chạy CHÍNH các câu lệnh của module (`handlerChangeStatements`, `insertHandlerStatement`, các câu tra) trên SQLite thật (node:sqlite),
// schema dựng từ migrations/*.sql. Điều phải giữ: một lần đổi là MỘT khối — hoặc đóng dòng cũ + mở dòng mới + nhật ký cùng áp dụng, hoặc (bên thua tranh chấp)
// KHÔNG dòng nào đổi và KHÔNG có dòng nhật ký nào. Ca song song thật (hai request HTTP cùng lúc) ở tests/e2e/dispatch.mjs; ở đây tái hiện đúng thứ D1 thấy khi hai batch
// bị tuần tự hoá: batch thứ hai chạy sau batch thứ nhất, với điều kiện route đã đọc từ TRƯỚC.
//
// Gói bằng esbuild (như accounts/patch-staff.test.ts): mã nguồn import module khác bằng thư mục (`../audit`) — đúng cho wrangler/`tsc`, Node không giải được.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./service.ts") & typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./service"; export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}
const { handlerChangeStatements, insertHandlerStatement, findHandlerOf, findHandlersOf, isHandler } = await loadModule();

/** D1 giả: `prepare().bind()` ghi lại câu + tham số (chạy được `first()`/`all()` lẻ); `batch()` chạy tuần tự trong MỘT giao dịch như D1. */
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

/** Schema đầy đủ; ba tài khoản (An, Bình, Cửu) được `0012` backfill thành hồ sơ `pty-<id>`; hai đơn của An. */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-b', 'Trần Thị Bình', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-c', 'Lê Cẩm Cửu', '0901000003', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const id of ["o-1", "o-2"]) {
    sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
                 VALUES ('${id}', 'TD-${id}', 's-a', 'draft', 'K', '0900000009', '2026-09-20T03:00:00.000Z', '2026-09-20T03:00:00.000Z')`);
  }
  return sqlite;
}

const T1 = "2026-09-21T01:00:00.000Z";
const T2 = "2026-09-21T02:00:00.000Z";
const T3 = "2026-09-21T03:00:00.000Z";
const rows = (sqlite: DatabaseSync, sql: string): Record<string, unknown>[] => sqlite.prepare(sql).all().map((r) => ({ ...r }));
const assignments = (sqlite: DatabaseSync, orderId = "o-1") =>
  rows(sqlite, `SELECT party_id, valid_from_at, valid_to_at, created_by, updated_by FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY valid_from_at, rowid`);
const openParties = (sqlite: DatabaseSync, orderId = "o-1"): unknown[] => assignments(sqlite, orderId).filter((r) => r.valid_to_at === null).map((r) => r.party_id);
const audits = (sqlite: DatabaseSync) => rows(sqlite, "SELECT action, staff_id, order_id, detail, created_at FROM audit_log WHERE action = 'order_handler_changed' ORDER BY rowid");

const A = { partyId: "pty-s-a", name: "Nguyễn Văn An" };
const B = { partyId: "pty-s-b", name: "Trần Thị Bình" };
const C = { partyId: "pty-s-c", name: "Lê Cẩm Cửu" };

/** Đơn `orderId` có người phụ trách An từ `T1` (như đơn mới tạo). */
async function withHandlerA(orderId = "o-1"): Promise<{ sqlite: DatabaseSync; db: D1Database }> {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  await db.batch([insertHandlerStatement(db, { id: `h-${orderId}`, orderId, partyId: A.partyId, at: T1, actorId: "s-a" })]);
  return { sqlite, db };
}

test("đơn mới: dòng HANDLE hạt đơn đang mở; tra bằng findHandlerOf / findHandlersOf (json_each) / isHandler", async () => {
  const { sqlite, db } = await withHandlerA();
  assert.deepEqual(rows(sqlite, "SELECT order_id, order_service_id, task_kind_code, status_code, party_id, valid_from_at, valid_to_at, created_by FROM dsp_assignment"), [
    { order_id: "o-1", order_service_id: null, task_kind_code: "HANDLE", status_code: "PENDING", party_id: "pty-s-a", valid_from_at: T1, valid_to_at: null, created_by: "s-a" },
  ]);
  assert.deepEqual(await findHandlerOf(db, "o-1"), { order_id: "o-1", party_id: "pty-s-a", staff_id: "s-a", label: "Nguyễn Văn An" });
  assert.equal(await findHandlerOf(db, "o-2"), null, "đơn chưa có người phụ trách");
  assert.deepEqual(await findHandlersOf(db, ["o-1", "o-2", "khong-co"]), [{ order_id: "o-1", party_id: "pty-s-a", staff_id: "s-a", label: "Nguyễn Văn An" }]);
  assert.deepEqual(await findHandlersOf(db, []), []);
  assert.equal(await isHandler(db, "s-a", "o-1"), true);
  assert.equal(await isHandler(db, "s-b", "o-1"), false, "không phải người phụ trách");
  assert.equal(await isHandler(db, "s-a", "o-2"), false, "đơn khác");
});

test("đổi người thắng: dòng cũ đóng + dòng mới mở CÙNG thời điểm + đúng MỘT dòng nhật ký 'từ A sang B' (chỉ tên)", async () => {
  const { sqlite, db } = await withHandlerA();
  const results = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: B, actorId: "s-a", at: T2 }));
  assert.equal(results[0]!.meta.changes, 1, "câu chốt thắng");
  assert.deepEqual(assignments(sqlite), [
    { party_id: "pty-s-a", valid_from_at: T1, valid_to_at: T2, created_by: "s-a", updated_by: "s-a" },
    { party_id: "pty-s-b", valid_from_at: T2, valid_to_at: null, created_by: "s-a", updated_by: "s-a" },
  ]);
  assert.deepEqual(audits(sqlite), [{ action: "order_handler_changed", staff_id: "s-a", order_id: "o-1", detail: "từ Nguyễn Văn An sang Trần Thị Bình", created_at: T2 }]);
  assert.equal(await isHandler(db, "s-b", "o-1"), true);
  assert.equal(await isHandler(db, "s-a", "o-1"), false, "người phụ trách cũ không còn được coi là 'được giao'");
});

test("đổi người THUA (người phụ trách đã đổi giữa lúc route đọc và lúc ghi): không đổi gì, không dòng mới, KHÔNG dòng nhật ký", async () => {
  const { sqlite, db } = await withHandlerA();
  // Hai route cùng đọc "người phụ trách = An" rồi ghi: An → Bình (thắng) và An → Cửu (thua).
  const first = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: B, actorId: "s-a", at: T2 }));
  const second = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: C, actorId: "s-b", at: T3 }));
  assert.equal(first[0]!.meta.changes, 1);
  assert.equal(second[0]!.meta.changes, 0, "câu chốt của bên thua không áp dụng");
  assert.deepEqual(openParties(sqlite), ["pty-s-b"], "người phụ trách vẫn là của bên thắng");
  assert.equal(assignments(sqlite).length, 2, "không có dòng nào của bên thua (không dòng mới, không dòng đóng thêm)");
  assert.deepEqual(audits(sqlite).map((a) => a.detail), ["từ Nguyễn Văn An sang Trần Thị Bình"], "bên thua không để lại nhật ký");
});

test("nhận đơn CHƯA có người phụ trách: mở dòng mới + nhật ký 'từ chưa có người phụ trách sang B'", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const results = await db.batch(handlerChangeStatements(db, { orderId: "o-2", from: null, to: B, actorId: "s-b", at: T2 }));
  assert.equal(results[0]!.meta.changes, 1);
  assert.deepEqual(assignments(sqlite, "o-2"), [{ party_id: "pty-s-b", valid_from_at: T2, valid_to_at: null, created_by: "s-b", updated_by: "s-b" }]);
  assert.deepEqual(audits(sqlite).map((a) => [a.order_id, a.detail]), [["o-2", "từ chưa có người phụ trách sang Trần Thị Bình"]]);
});

test("hai người nhận cùng lúc một đơn chưa có người: đúng một người nhận được, bên thua không dòng nào, không nhật ký, không vỡ chỉ mục duy nhất", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const first = await db.batch(handlerChangeStatements(db, { orderId: "o-2", from: null, to: B, actorId: "s-b", at: T2 }));
  const second = await db.batch(handlerChangeStatements(db, { orderId: "o-2", from: null, to: C, actorId: "s-c", at: T3 })); // không ném lỗi UNIQUE
  assert.equal(first[0]!.meta.changes, 1);
  assert.equal(second[0]!.meta.changes, 0);
  assert.deepEqual(openParties(sqlite, "o-2"), ["pty-s-b"]);
  assert.equal(assignments(sqlite, "o-2").length, 1);
  assert.equal(audits(sqlite).length, 1);
});

test("đổi người rồi đổi lại nhiều lần: mỗi lần đúng một dòng mở, lịch sử giữ nguyên, nhật ký khớp số lần đổi", async () => {
  const { sqlite, db } = await withHandlerA();
  const chain: [typeof A, typeof A, string][] = [[A, B, T2], [B, A, T3], [A, C, "2026-09-21T04:00:00.000Z"]];
  for (const [from, to, at] of chain) {
    const r = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from, to, actorId: "s-a", at }));
    assert.equal(r[0]!.meta.changes, 1);
    assert.equal(openParties(sqlite).length, 1);
  }
  assert.deepEqual(openParties(sqlite), ["pty-s-c"]);
  assert.equal(assignments(sqlite).length, 4);
  assert.equal(audits(sqlite).length, 3);
});

/** Chèn một việc KHÁC HANDLE (đón khách…) hạt đơn đang mở — không có route nào tạo việc này ở bản v1.0, nên chèn thẳng như N2 sẽ làm. */
function addOpenTask(sqlite: DatabaseSync, id: string, orderId: string, kind: string, partyId: string): void {
  sqlite.exec(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at)
               VALUES ('${id}', '${orderId}', '${kind}', '${partyId}', 'PENDING', '${T1}', '${T1}', '${T1}')`);
}
const tasksOf = (sqlite: DatabaseSync, orderId: string) =>
  rows(sqlite, `SELECT id, task_kind_code, party_id, valid_to_at FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY id`);

test("đổi người CHỈ đóng dòng HANDLE: việc khác (PICKUP, BOAT…) hạt đơn đang mở — kể cả của CHÍNH người phụ trách cũ — vẫn mở", async () => {
  const { sqlite, db } = await withHandlerA();
  addOpenTask(sqlite, "pk-a", "o-1", "PICKUP", A.partyId); // cùng hồ sơ với người phụ trách cũ: nếu câu đóng bỏ điều kiện loại việc thì dòng này bị đóng theo
  addOpenTask(sqlite, "pk-c", "o-1", "PICKUP", C.partyId);
  addOpenTask(sqlite, "bo-a", "o-1", "BOAT", A.partyId);
  const results = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: B, actorId: "s-a", at: T2 }));
  assert.equal(results[0]!.meta.changes, 1, "câu chốt chỉ đóng ĐÚNG MỘT dòng (HANDLE)");
  assert.deepEqual(
    tasksOf(sqlite, "o-1").map((t) => [t.task_kind_code, t.party_id, t.valid_to_at]).sort(),
    [
      ["BOAT", "pty-s-a", null],
      ["HANDLE", "pty-s-a", T2], // HANDLE cũ của An: đã đóng
      ["HANDLE", "pty-s-b", null], // HANDLE mới của Bình: đang mở
      ["PICKUP", "pty-s-a", null],
      ["PICKUP", "pty-s-c", null],
    ],
    "chỉ HANDLE của An bị đóng; việc đón/lái cano giữ nguyên",
  );
  assert.equal(audits(sqlite).length, 1);
});

test("nhận đơn chưa có người phụ trách KHÔNG bị việc khác đang mở (PICKUP…) chặn: 'chưa có người phụ trách' chỉ xét dòng HANDLE", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  addOpenTask(sqlite, "pk-1", "o-2", "PICKUP", C.partyId);
  addOpenTask(sqlite, "pk-2", "o-2", "PICKUP", B.partyId);
  const results = await db.batch(handlerChangeStatements(db, { orderId: "o-2", from: null, to: B, actorId: "s-b", at: T2 }));
  assert.equal(results[0]!.meta.changes, 1, "vẫn nhận được");
  assert.deepEqual(tasksOf(sqlite, "o-2").map((t) => [t.task_kind_code, t.party_id, t.valid_to_at]).sort(), [
    ["HANDLE", "pty-s-b", null],
    ["PICKUP", "pty-s-b", null],
    ["PICKUP", "pty-s-c", null],
  ]);  assert.equal(audits(sqlite).length, 1);
});

test("đồng hồ hai máy chủ lệch: dòng cũ mở SAU thời điểm đổi thì valid_to_at = valid_from_at (không vi phạm CHECK, không 500)", async () => {
  const { sqlite, db } = await withHandlerA();
  sqlite.exec("UPDATE dsp_assignment SET valid_from_at = '2026-09-21T09:00:00.000Z'"); // dòng cũ "mở trong tương lai" so với T2
  const r = await db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: B, actorId: "s-a", at: T2 }));
  assert.equal(r[0]!.meta.changes, 1);
  assert.equal(assignments(sqlite).find((x) => x.party_id === "pty-s-a")!.valid_to_at, "2026-09-21T09:00:00.000Z", "đóng đúng bằng thời điểm mở (không trước nó)");
  assert.deepEqual(openParties(sqlite), ["pty-s-b"]);
});

test("đổi người: người thao tác ghi ở cột WHO, hồ sơ nhận là khoá ngoại thật (hồ sơ lạ → batch thất bại, không dòng nào đổi)", async () => {
  const { sqlite, db } = await withHandlerA();
  await assert.rejects(db.batch(handlerChangeStatements(db, { orderId: "o-1", from: A, to: { partyId: "pty-khong-co", name: "Ai đó" }, actorId: "s-a", at: T2 })), /FOREIGN KEY/);
  assert.deepEqual(openParties(sqlite), ["pty-s-a"], "giao dịch quay lại: dòng cũ vẫn mở");
  assert.equal(audits(sqlite).length, 0);
});
