// Kiểm cổng bảo trì của router (createApp): dùng module giả, không cần D1. Cổng do gốc lắp ráp tiêm (`injected.maintenanceBlock`) — router không biết module `maintenance`.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { StaffProfile } from "./contracts.ts";
import { createApp, route, type AppModule } from "./router.ts";

const staffOf = (permissions: StaffProfile["permissions"], phone = "0900000001"): StaffProfile => ({ id: "s1", fullName: "NV", phone, partyId: null, permissions });

function build(staff: StaffProfile | null, block: (staff: StaffProfile) => Response | null) {
  const calls = { handler: 0, gate: [] as StaffProfile[] };
  const ok = async () => {
    calls.handler++;
    return new Response("ok");
  };
  const mod: AppModule = {
    name: "giả",
    routes: [route("GET", "/api/open", "public", ok), route("GET", "/api/mine", "staff", ok), route("GET", "/api/adm", "admin", ok), route("GET", "/api/off", "office", ok)],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => staff,
    injected: {
      isAssigned: async () => false,
      defaultHandlerStatement: () => null,
      maintenanceBlock: async (_env, s) => {
        calls.gate.push(s);
        return block(s);
      },
    },
  });
  const get = (path: string) => app.fetch(new Request(`http://x${path}`), {} as Env, {} as ExecutionContext);
  return { get, calls };
}

const BLOCK = () => new Response("bảo trì", { status: 503 });

test("route công khai KHÔNG hỏi cổng bảo trì (trang đăng nhập/logout/config vẫn dùng được)", async () => {
  const { get, calls } = build(null, BLOCK);
  assert.equal((await get("/api/open")).status, 200);
  assert.equal(calls.gate.length, 0);
});

test("chưa đăng nhập → 401 như cũ, cổng không được hỏi", async () => {
  const { get, calls } = build(null, BLOCK);
  assert.equal((await get("/api/mine")).status, 401);
  assert.equal(calls.gate.length, 0);
});

test("cổng cho qua (null) → handler chạy bình thường; cổng nhận đúng tài khoản đang đăng nhập", async () => {
  const s = staffOf(["SALES"]);
  const { get, calls } = build(s, () => null);
  assert.equal((await get("/api/mine")).status, 200);
  assert.equal(calls.handler, 1);
  assert.deepEqual(calls.gate, [s]);
});

test("cổng chặn → trả nguyên Response của cổng (503), handler KHÔNG chạy", async () => {
  const { get, calls } = build(staffOf(["SALES"]), BLOCK);
  const res = await get("/api/mine");
  assert.equal(res.status, 503);
  assert.equal(await res.text(), "bảo trì");
  assert.equal(calls.handler, 0);
});

test("người bị chặn thấy 503 bảo trì, KHÔNG phải 403 quyền: cổng chạy TRƯỚC kiểm ADMIN/văn phòng", async () => {
  const fieldOnly = build(staffOf(["FIELD"]), BLOCK);
  assert.equal((await fieldOnly.get("/api/adm")).status, 503);
  assert.equal((await fieldOnly.get("/api/off")).status, 503);
  // Không bị chặn: kiểm quyền vẫn như cũ.
  const open = build(staffOf(["FIELD"]), () => null);
  assert.equal((await open.get("/api/adm")).status, 403);
  assert.equal((await open.get("/api/off")).status, 403);
});
