// `checkPasskeyAssertion` chạy CHÍNH mã thật (gói bằng esbuild — lý do như patch-staff.test.ts: `./passkey.ts` import các tệp cùng
// module không đuôi/có đuôi trộn lẫn, và import `../staff`/`../maintenance` gián tiếp qua kiểu `Env` — Node không giải được thẳng).
// Trọng tâm: thứ tự `gate` (phán quyết A-5, đặc tả §2.6 "kiểm → cổng bảo trì → dùng một lần") — `gate` PHẢI chạy TRƯỚC
// `markPasskeyUsed`: gate chặn (trả Response) thì thách thức CHƯA bị tiêu (`last_used_at`/`sign_count` không đổi, còn dùng lại được
// sau khi gate cho qua); gate cho qua (trả null) thì mới đánh dấu dùng một lần. SQL chạy trên SQLite thật (node:sqlite), schema từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import { createFakeAuthenticator } from "../../../tests/e2e/fake-authenticator.mjs";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const RP = { rpId: "booking.tourdao.vn", origin: "https://booking.tourdao.vn" };
const CH = "q3m1V7m2mM0vTzZ6o3cQ4w7w0m3m5x8b1c2d3e4f5g6";

type Module = typeof import("./passkey.ts") & typeof import("./webauthn.ts");
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./passkey"; export * from "./webauthn";', resolveDir: new URL("./", import.meta.url).pathname, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Module;
}
const { checkPasskeyAssertion, verifyRegistration } = await loadModule();

/** D1 giả trên SQLite thật (node:sqlite) — như dispatch/service.test.ts, cộng `.run()` lẻ (không qua `batch()`) cho `markPasskeyUsed`. */
interface FakeStatement {
  first: () => Promise<unknown>;
  all: () => Promise<{ results: unknown[] }>;
  run: () => Promise<{ meta: { changes: number } }>;
}
function fakeD1(sqlite: DatabaseSync): D1Database {
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: SupportedValueType[]): FakeStatement => ({
        first: async () => {
          const row = sqlite.prepare(sql).get(...args);
          return row ? { ...row } : null;
        },
        all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })) }),
        run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
      }),
    }),
  };
  return db as unknown as D1Database;
}

function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  for (const f of FILES) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(
    "INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('s1', '0900000001', 'x', 'sales', '', 1, '2026-01-01T00:00:00Z')",
  );
  return sqlite;
}

test("checkPasskeyAssertion: gate chạy TRƯỚC dùng một lần — gate chặn thì last_used_at/sign_count KHÔNG đổi; gate cho qua thì mới đánh dấu dùng", async () => {
  const sqlite = seed();
  const env = { DB: fakeD1(sqlite) } as unknown as Env;
  const a = await createFakeAuthenticator({ ...RP, alg: -7 });
  const reg = await verifyRegistration(RP, CH, await a.register(CH));
  sqlite
    .prepare(
      "INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, valid_from_at, created_at, updated_at) " +
        "VALUES ('pk1', 's1', ?, ?, ?, 'uh1234567890123456', 0, 'iPhone', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
    )
    .run(reg.credentialId, reg.publicKey, reg.algorithm);
  const row = () => ({ ...(sqlite.prepare("SELECT sign_count, last_used_at FROM aut_passkey WHERE id = 'pk1'").get() as { sign_count: number; last_used_at: string | null }) });
  assert.deepEqual(row(), { sign_count: 0, last_used_at: null });

  const ch = { challenge: CH, issuedAt: Date.now() - 1000 };
  const blockResponse = new Response(null, { status: 503 });

  // Gate CHẶN (vd. cổng bảo trì) → checkPasskeyAssertion trả lỗi của GATE, và KHÔNG đánh dấu dùng một lần.
  const blocked = await checkPasskeyAssertion(env, RP, ch, await a.sign(CH, { signCount: 5 }), null, async () => blockResponse);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.response, blockResponse);
  assert.deepEqual(row(), { sign_count: 0, last_used_at: null }, "gate chặn: chữ ký/bộ đếm đã đúng nhưng KHÔNG được đánh dấu dùng — thách thức còn dùng lại được");

  // Cùng thách thức, gate CHO QUA (trả null) → phải thành công VÀ đánh dấu dùng một lần (last_used_at được ghi, sign_count cập nhật).
  const passed = await checkPasskeyAssertion(env, RP, ch, await a.sign(CH, { signCount: 5 }), null, async () => null);
  assert.equal(passed.ok, true);
  const after = row();
  assert.equal(after.sign_count, 5);
  assert.notEqual(after.last_used_at, null, "gate cho qua: phải đánh dấu dùng một lần");

  // Thách thức đã dùng: gọi lại (dù gate cho qua) phải bị từ chối (expired) — dùng một lần thật sự có hiệu lực.
  const again = await checkPasskeyAssertion(env, RP, ch, await a.sign(CH, { signCount: 6 }), null, async () => null);
  assert.equal(again.ok, false);
});
