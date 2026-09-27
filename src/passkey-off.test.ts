// Đặc tả passkey §2.3 (chuẩn tắc): khi Face ID TẮT (thiếu/sai PASSKEY_RP_ID/PASSKEY_ORIGIN), MỌI route passkey trả 503
// `passkey_unavailable` — kể cả xem danh sách và gỡ (rà soát cuối I-1). Bài kiểm chạy MÃ THẬT của route (gói bằng esbuild như
// route-access.test.ts) với `env.DB` là Proxy NÉM LỖI khi bị chạm: chứng minh kiểm tắt đứng TRƯỚC mọi truy vấn D1.
// Vì sao không phải e2e: bộ chạy e2e (tests/e2e/run.mjs) dựng MỘT wrangler dev với Face ID BẬT; dựng thêm server tắt cho riêng bài
// này tốn thêm một lần khởi động wrangler + migration cho mỗi lần chạy e2e.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule, Route } from "./shared/router.ts";

async function loadModule(entry: string, exportName: string): Promise<AppModule> {
  const built = await esbuild.build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  const loaded = (await import(`data:text/javascript;base64,${code}`)) as Record<string, AppModule>;
  const m = loaded[exportName];
  assert.ok(m && Array.isArray(m.routes), `không nạp được ${exportName} từ ${entry}`);
  return m;
}

const [auth, accounts] = await Promise.all([
  loadModule("./modules/auth/index.ts", "authModule"),
  loadModule("./modules/accounts/index.ts", "accountsModule"),
]);
const passkeyRoutes: Route[] = [...auth.routes, ...accounts.routes].filter((r) => r.path.includes("passkey"));

const untouchableDb = new Proxy(
  {},
  {
    get(_t, prop) {
      throw new Error(`route chạm env.DB (${String(prop)}) trước khi kiểm Face ID tắt`);
    },
  },
);

const ADMIN = { id: "00000000-0000-4000-8000-000000000001", phone: "0900000001", fullName: "Quản trị", permissions: ["ADMIN"] };

async function callOff(r: Route, env: Record<string, unknown>): Promise<Response> {
  const url = new URL(`https://booking.tourdao.vn${r.path.replace(":id", "00000000-0000-4000-8000-000000000002")}`);
  const request = new Request(url, {
    method: r.method,
    headers: { "content-type": "application/json", origin: url.origin },
    body: r.method === "GET" ? undefined : JSON.stringify({ pin: "123456", newPin: "654321", credential: {} }),
  });
  return r.handler({
    request,
    env: { DB: untouchableDb, SESSION_SECRET: "x".repeat(32), ...env } as unknown as Env,
    exec: {} as ExecutionContext,
    url,
    params: { id: "00000000-0000-4000-8000-000000000002" },
    staff: ADMIN as never,
    isAssigned: async () => false,
    defaultHandlerStatement: () => null,
    ordersWithHandler: async () => new Set<string>(),
    myHandledOrderIds: async () => [],
  });
}

test("đủ 10 route passkey (2 đăng nhập + 7 tự phục vụ + 1 quản trị) — bộ lọc không lặng lẽ bỏ sót", () => {
  assert.deepEqual(
    passkeyRoutes.map((r) => `${r.method} ${r.path}`).sort(),
    [
      "DELETE /api/account/passkeys/:id",
      "GET /api/account/passkeys",
      "POST /api/account/passkeys",
      "POST /api/account/passkeys/options",
      "POST /api/account/passkeys/remove-all",
      "POST /api/account/pin-by-passkey",
      "POST /api/account/pin-by-passkey/options",
      "POST /api/auth/passkey/login",
      "POST /api/auth/passkey/options",
      "POST /api/staff/:id/passkeys/remove-all",
    ],
  );
});

for (const [name, env] of [
  ["thiếu cả hai biến", {}],
  ["hai biến rỗng", { PASSKEY_RP_ID: "", PASSKEY_ORIGIN: "" }],
  ["cấu hình sai (origin không khớp rpId)", { PASSKEY_RP_ID: "booking.tourdao.vn", PASSKEY_ORIGIN: "https://khac.example" }],
] as const) {
  test(`Face ID tắt (${name}): MỌI route passkey trả 503 passkey_unavailable, không chạm D1`, async () => {
    const wrong: string[] = [];
    for (const r of passkeyRoutes) {
      let got: string;
      try {
        const res = await callOff(r, env);
        const body = (await res.json()) as { error?: { code?: string } };
        got = `${res.status} ${body.error?.code ?? "-"}`;
      } catch (e) {
        got = `ném lỗi: ${e instanceof Error ? e.message : String(e)}`;
      }
      if (got !== "503 passkey_unavailable") wrong.push(`${r.method} ${r.path} → ${got}`);
    }
    assert.deepEqual(wrong, []);
  });
}
