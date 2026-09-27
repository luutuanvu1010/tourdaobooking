// POST /api/staff/:id/reset-pin — DK-T3-02 (kiểm toán điểm khuất 24/9, vá bản 1.14): Quản trị / Toàn quyền KHÔNG được tự đặt lại PIN của chính
// mình ở đường quản trị (không cần PIN cũ, lại gỡ luôn mọi Face ID). Tự đổi PIN chỉ qua "Đổi mã PIN" (PIN hiện tại) hoặc đặt PIN bằng Face ID.
//
// Bản vá 1.14 chỉ có kiểm ở tests/e2e/admin.mjs và tests/audit/doi-tac.test.mjs — cả hai nằm NGOÀI `npm test`. Tệp này đưa luật vào `npm test`:
// chạy CHÍNH handler của route (module accounts gói bằng esbuild như patch-staff.test.ts — Node không giải được import thư mục `../staff`) trên
// SQLite thật dựng từ migrations/*.sql, qua một D1 giả tối thiểu. Ca đối chứng (quản trị đặt lại PIN của nhân viên khác → 200) chứng minh bộ
// dựng đi tới được nhánh ghi, nên 403 ở ca tự đặt là do luật DK-T3-02 chứ không do bộ dựng hỏng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import type { PermissionCode, StaffProfile } from "../../shared/contracts.ts";
import type { Ctx } from "../../shared/router.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

const ADMIN = "0a000000-0000-4000-8000-000000000001";
const SUPER = "0a000000-0000-4000-8000-000000000002";
const SALES = "0a000000-0000-4000-8000-000000000003";

type Module = typeof import("./index.ts");

/** Nạp module accounts THẬT (đã gói) — một lần cho cả tệp kiểm. */
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Module;
}
const { accountsModule } = await loadModule();
const resetPin = accountsModule.routes.find((r) => r.method === "POST" && r.path === "/api/staff/:id/reset-pin");
assert.ok(resetPin, "không tìm thấy route POST /api/staff/:id/reset-pin trong accountsModule");

/** D1 giả tối thiểu trên SQLite thật; đếm mọi lần ghi (run/batch) để khẳng định nhánh bị chặn KHÔNG ghi gì. */
function fakeD1(sqlite: DatabaseSync): { db: D1Database; writes: string[] } {
  const writes: string[] = [];
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql,
    args,
    bind: (...next: SupportedValueType[]) => stmt(sql, next),
    first: async (col?: string) => {
      const row = sqlite.prepare(sql).get(...args) as Record<string, unknown> | undefined;
      return row ? (col ? (row[col] ?? null) : row) : null;
    },
    all: async () => ({ success: true, meta: {}, results: sqlite.prepare(sql).all(...args) }),
    run: async () => {
      writes.push(sql);
      return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } };
    },
  });
  const db = {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => {
          writes.push(s.sql);
          return { success: true, meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db: db as unknown as D1Database, writes };
}

/** Schema đầy đủ; ba tài khoản cũ được `0012` backfill thành hồ sơ + quyền theo cột role (admin → ADMIN, sales → SALES). */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('${ADMIN}', 'Quản Trị Một', '0901000001', 'pin-cu', 'admin', 1, '2026-09-19T05:00:00.000Z'),
    ('${SUPER}', 'Toàn Quyền Hai', '0901000002', 'pin-cu', 'admin', 1, '2026-09-19T05:00:00.000Z'),
    ('${SALES}', 'Bán Hàng Ba', '0901000003', 'pin-cu', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at)
    VALUES ('perm-super', '${SUPER}', 'SUPER_ADMIN', '2026-09-19T05:00:00.000Z', NULL, '2026-09-19T05:00:00.000Z', '2026-09-19T05:00:00.000Z')`);
  sqlite
    .prepare(
      `INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, valid_from_at, valid_to_at, created_at, updated_at)
       VALUES ('pk-admin', ?, 'pk-admin-credential-000000000', 'pubkey-spki-der-base64url', -7, 'pk-admin-userhandle-0000', 0, 'iPhone', NULL, '2026-09-19T06:00:00.000Z', NULL, '2026-09-19T06:00:00.000Z', '2026-09-19T06:00:00.000Z')`,
    )
    .run(ADMIN);
  return sqlite;
}

const profile = (id: string, permissions: PermissionCode[]): StaffProfile => ({ id, fullName: "Người thao tác", phone: "0900000000", partyId: `pty-${id}`, permissions });

async function callResetPin(sqlite: DatabaseSync, actor: StaffProfile, targetId: string): Promise<{ status: number; body: Record<string, unknown>; writes: string[] }> {
  const { db, writes } = fakeD1(sqlite);
  const url = new URL(`https://booking.test/api/staff/${targetId}/reset-pin`);
  const ctx = { request: new Request(url, { method: "POST" }), env: { DB: db }, url, params: { id: targetId }, staff: actor, dongBangTin: () => undefined } as unknown as Ctx;
  const res = await resetPin!.handler(ctx);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, writes };
}

const scalar = (sqlite: DatabaseSync, sql: string): unknown => Object.values(sqlite.prepare(sql).get() ?? {})[0];
const pinHash = (sqlite: DatabaseSync, id: string): unknown => scalar(sqlite, `SELECT pin_hash FROM staff WHERE id = '${id}'`);
const auditCount = (sqlite: DatabaseSync): number => Number(scalar(sqlite, "SELECT count(*) FROM audit_log"));

// ADR-0038 điều 6: Quản trị không còn đặt lại PIN của AI (chặn ở ô account.access.manage, trước luật tự đặt lại) — ca DK-T3-02 chỉ còn cho Toàn quyền.
test("ADR-0038 điều 6: Quản trị đặt lại PIN của chính mình hay của nhân viên Bán hàng → 403, không ghi gì", async () => {
  for (const target of [ADMIN, SALES]) {
    const sqlite = seed();
    const r = await callResetPin(sqlite, profile(ADMIN, ["ADMIN"]), target);
    assert.equal(r.status, 403, JSON.stringify(r.body));
    assert.equal(r.body.pin, undefined);
    assert.deepEqual(r.writes, []);
    assert.equal(pinHash(sqlite, target), "pin-cu");
    assert.equal(auditCount(sqlite), 0);
  }
});

for (const [label, id, permissions] of [
  ["Toàn quyền", SUPER, ["ADMIN", "SUPER_ADMIN"]],
] as const) {
  test(`DK-T3-02: ${label} tự đặt lại PIN của chính mình → 403, không ghi gì (PIN, Face ID, nhật ký giữ nguyên)`, async () => {
    const sqlite = seed();
    const before = Number(scalar(sqlite, `SELECT count(*) FROM aut_passkey WHERE staff_id = '${id}' AND valid_to_at IS NULL`));
    const r = await callResetPin(sqlite, profile(id, [...permissions]), id);
    assert.equal(r.status, 403);
    const err = r.body.error as { code: string; message: string };
    assert.equal(err.code, "forbidden");
    assert.match(err.message, /Đổi mã PIN/, "lời báo phải chỉ đường tự đổi PIN đúng cách");
    assert.equal(r.body.pin, undefined, "không được trả PIN mới");
    assert.deepEqual(r.writes, [], "nhánh bị chặn không được chạy câu ghi nào");
    assert.equal(pinHash(sqlite, id), "pin-cu", "PIN không đổi");
    assert.equal(Number(scalar(sqlite, `SELECT count(*) FROM aut_passkey WHERE staff_id = '${id}' AND valid_to_at IS NULL`)), before, "Face ID không bị gỡ");
    assert.equal(auditCount(sqlite), 0, "không có dòng nhật ký");
  });
}

test("Đối chứng: Toàn quyền đặt lại PIN của nhân viên Bán hàng → 200, có PIN mới, PIN đổi, có nhật ký pin_reset", async () => {
  const sqlite = seed();
  const r = await callResetPin(sqlite, profile(SUPER, ["ADMIN", "SUPER_ADMIN"]), SALES);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.writes.length > 0, "đối chứng phải chạy tới nhánh ghi");
  assert.match(String(r.body.pin), /^\d{6}$/);
  assert.notEqual(pinHash(sqlite, SALES), "pin-cu");
  assert.equal(Number(scalar(sqlite, `SELECT count(*) FROM audit_log WHERE action = 'pin_reset' AND target_id = '${SALES}' AND staff_id = '${SUPER}'`)), 1);
  assert.equal(pinHash(sqlite, SUPER), "pin-cu", "PIN của người thao tác không bị đụng");
});
