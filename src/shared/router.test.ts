// Kiểm cổng bảo trì của router (createApp): dùng module giả, không cần D1. Cổng do gốc lắp ráp tiêm (`injected.maintenanceBlock`) — router không biết module `maintenance`.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { StaffProfile } from "./contracts.ts";
import { json } from "./http.ts";
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
    routes: [
      route("GET", "/api/open", "public", ok),
      route("GET", "/api/mine", "staff", ok),
      route("GET", "/api/adm", "admin", ok),
      route("GET", "/api/off", "office", ok),
      route("GET", "/api/ord", "orders", ok),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => staff,
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async (_env, s) => {
        calls.gate.push(s);
        return block(s);
      },
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
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

test('access "admin": ADMIN dùng được; SUPER_ADMIN-chỉ (không giữ ADMIN) cũng dùng được (ADR-0014 điều 2: any ở mọi thao tác); SALES thì không', async () => {
  const admin = build(staffOf(["ADMIN"]), () => null);
  assert.equal((await admin.get("/api/adm")).status, 200);
  const superOnly = build(staffOf(["SUPER_ADMIN"]), () => null);
  assert.equal((await superOnly.get("/api/adm")).status, 200);
  const sales = build(staffOf(["SALES"]), () => null);
  assert.equal((await sales.get("/api/adm")).status, 403);
});

test('access "admin" đọc ADMIN_GATE (ADR-0019): mọi quyền ngoài ADMIN/SUPER_ADMIN đều 403, kể cả khi kèm nhau', async () => {
  for (const perms of [["ACCOUNTING"], ["FIELD"], ["PARTNER"], ["INTERN"], ["SALES", "ACCOUNTING", "FIELD", "PARTNER", "INTERN"]] as const) {
    const r = build(staffOf([...perms]), () => null);
    assert.equal((await r.get("/api/adm")).status, 403, perms.join("+"));
  }
  assert.equal((await build(staffOf(["SALES", "ADMIN"]), () => null).get("/api/adm")).status, 200);
});

test('access "orders": văn phòng, Đối tác và (ADR-0030 S23-5) chỉ Hướng dẫn viên dùng được; không quyền nào → 403; chưa đăng nhập 401', async () => {
  const office = build(staffOf(["SALES"]), () => null);
  assert.equal((await office.get("/api/ord")).status, 200);
  const partner = build(staffOf(["PARTNER"]), () => null);
  assert.equal((await partner.get("/api/ord")).status, 200);
  const fieldOnly = build(staffOf(["FIELD"]), () => null);
  assert.equal((await fieldOnly.get("/api/ord")).status, 200, "cổng chỉ lọc thô; mỗi route đơn tự hỏi can() (hàng rào 2)");
  const nobody = build(staffOf([]), () => null);
  assert.equal((await nobody.get("/api/ord")).status, 403);
  const anon = build(null, () => null);
  assert.equal((await anon.get("/api/ord")).status, 401);
});

test("ADR-0013 điều 4: ctx.partyAccount chuyển đúng người đang đăng nhập; route công khai (chưa đăng nhập) mặc định TỪ CHỐI", async () => {
  const seen: string[] = [];
  const mod: AppModule = {
    name: "t",
    routes: [
      route("GET", "/api/pa-open", "public", async (ctx) => json(await ctx.partyAccount("pty-1"))),
      route("GET", "/api/pa-off", "office", async (ctx) => json(await ctx.partyAccount("pty-1"))),
    ],
  };
  const who = { id: "u1", phone: "0900000001", fullName: "A", permissions: ["SALES"] } as unknown as StaffProfile;
  const app = createApp({
    modules: [mod],
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/pa-open" ? null : who),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async (_env, actor, partyId) => { seen.push(`${actor.id}:${partyId}`); return { linked: false }; },
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
    },
  });
  const get = async (p: string) => (await app.fetch(new Request(`http://x${p}`), {} as Env, {} as ExecutionContext)).json();
  assert.deepEqual(await get("/api/pa-open"), { linked: true, manageable: false });
  assert.deepEqual(await get("/api/pa-off"), { linked: false });
  assert.deepEqual(seen, ["u1:pty-1"]);
});

test("ADR-0030 S20-13: ctx.myHandledOrderIds() hỏi đúng người đang đăng nhập (không nhận tham số); chưa đăng nhập → [] không gọi hàm tiêm; ctx.ordersWithHandler chuyển nguyên mảng id", async () => {
  const seenMine: string[] = [];
  const seenIds: string[][] = [];
  const mod: AppModule = {
    name: "t",
    routes: [
      route("GET", "/api/mine-open", "public", async (ctx) => json(await ctx.myHandledOrderIds())),
      route("GET", "/api/mine-ord", "orders", async (ctx) => json(await ctx.myHandledOrderIds())),
      route("GET", "/api/with-ord", "orders", async (ctx) => json([...(await ctx.ordersWithHandler(["o1", "o2", "o3"]))])),
    ],
  };
  const who = { id: "u1", phone: "0900000001", fullName: "A", permissions: ["SALES"] } as unknown as StaffProfile;
  const app = createApp({
    modules: [mod],
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/mine-open" ? null : who),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async (_env, orderIds) => { seenIds.push([...orderIds]); return new Set(["o2"]); },
      handledOrderIdsOf: async (_env, staffId) => { seenMine.push(staffId); return ["o9"]; },
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
    },
  });
  const get = async (p: string) => (await app.fetch(new Request(`http://x${p}`), {} as Env, {} as ExecutionContext)).json();
  assert.deepEqual(await get("/api/mine-open"), []);
  assert.deepEqual(seenMine, [], "chưa đăng nhập: không gọi hàm tiêm");
  assert.deepEqual(await get("/api/mine-ord"), ["o9"]);
  assert.deepEqual(seenMine, ["u1"], "id lấy từ phiên đăng nhập");
  assert.deepEqual(await get("/api/with-ord"), ["o2"]);
  assert.deepEqual(seenIds, [["o1", "o2", "o3"]]);
});

test("ADR-0030 S20-4: ctx.newOrderHandler(staffId) chuyển NGƯỜI ĐANG ĐĂNG NHẬP (người lập) + người được chọn cho hàm tiêm, trả nguyên kết luận; chưa đăng nhập → không đạt, không gọi hàm tiêm", async () => {
  const seen: string[] = [];
  const mod: AppModule = {
    name: "t",
    routes: [
      route("GET", "/api/pick-open", "public", async (ctx) => json(await ctx.newOrderHandler("s-hdv"))),
      route("GET", "/api/pick-ord", "orders", async (ctx) => {
        const r = await ctx.newOrderHandler("s-hdv");
        return json(r.ok ? { ok: true, n: r.statements("o1", "2026-09-27T00:00:00.000Z").length } : r);
      }),
    ],
  };
  const who = { id: "u1", phone: "0900000001", fullName: "A", permissions: ["SALES"] } as unknown as StaffProfile;
  const app = createApp({
    modules: [mod],
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/pick-open" ? null : who),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async (_env, actor, staffId) => {
        seen.push(`${actor.id}→${staffId}`);
        return { ok: true, statements: (orderId, at) => { seen.push(`câu:${orderId}@${at}`); return []; } };
      },
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
    },
  });
  const get = async (p: string) => (await app.fetch(new Request(`http://x${p}`), {} as Env, {} as ExecutionContext)).json();
  const open = await get("/api/pick-open");
  assert.equal(open.ok, false, "chưa đăng nhập: không đạt");
  assert.deepEqual(seen, [], "chưa đăng nhập: không gọi hàm tiêm");
  assert.deepEqual(await get("/api/pick-ord"), { ok: true, n: 0 });
  assert.deepEqual(seen, ["u1→s-hdv", "câu:o1@2026-09-27T00:00:00.000Z"], "người thao tác lấy từ phiên; id đơn + mốc do nơi gọi đưa vào, chuyển nguyên");
});

// BẢNG TIN (ADR-0022, Task 3) — ctx.baoThayDoi / ctx.dongBangTin: bắn-và-quên qua exec.waitUntil, lỗi phát tin không bao giờ làm hỏng/chậm thao tác ghi (DP-3).

type BangTinOverrides = {
  baoThayDoi?: (env: Env, actor: StaffProfile, e: { orderId: string; thayDoi: string }) => Promise<void> | void;
  dongBangTin?: (env: Env, muc: { staffId: string } | "tat-ca") => Promise<void> | void;
};

/** App giả có route "staff" gọi `ctx.baoThayDoi`/`ctx.dongBangTin` với sự kiện cố định, và một route không gọi gì. */
function buildBangTin(staff: StaffProfile, overrides: BangTinOverrides = {}) {
  const mod: AppModule = {
    name: "bang-tin-giả",
    routes: [
      route("GET", "/api/bao", "staff", async (ctx) => {
        ctx.baoThayDoi({ orderId: "o1", thayDoi: "sua" as never });
        return new Response("ok");
      }),
      route("GET", "/api/no-call", "staff", async () => new Response("ok")),
      route("GET", "/api/dong", "staff", async (ctx) => {
        ctx.dongBangTin({ staffId: "s9" });
        return new Response("ok");
      }),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => staff,
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      // KHÔNG bọc async: nếu `overrides.baoThayDoi`/`dongBangTin` là hàm ĐỒNG BỘ ném lỗi, lời gọi này phải ném lỗi ĐỒNG BỘ ra ngoài — bọc `async` sẽ
      // biến lỗi đồng bộ thành lời hứa bị từ chối, làm mất khả năng phân biệt hai bài kiểm "NÉM LỖI ĐỒNG BỘ" và "BỊ TỪ CHỐI" (vòng sửa 1, phát hiện 1).
      baoThayDoi: (env, actor, e) => (overrides.baoThayDoi ? overrides.baoThayDoi(env, actor, e) : Promise.resolve()) as Promise<void>,
      dongBangTin: (env, muc) => (overrides.dongBangTin ? overrides.dongBangTin(env, muc) : Promise.resolve()) as Promise<void>,
    },
  });
  const waited: Promise<unknown>[] = [];
  const exec = { waitUntil: (p: Promise<unknown>) => { waited.push(p); } } as unknown as ExecutionContext;
  const get = (path: string) => app.fetch(new Request(`http://x${path}`), {} as Env, exec);
  return { get, waited };
}

/** App giả có route "public" (chưa đăng nhập, `staff` null) gọi `ctx.baoThayDoi` — phải là no-op. */
function buildPublicBao(baoThayDoi: () => Promise<void> | void) {
  const mod: AppModule = {
    name: "bang-tin-giả-cong-khai",
    routes: [
      route("GET", "/api/bao-open", "public", async (ctx) => {
        ctx.baoThayDoi({ orderId: "o1", thayDoi: "sua" as never });
        return new Response("ok");
      }),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => null,
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => { await baoThayDoi(); },
      dongBangTin: async () => {},
    },
  });
  const waited: Promise<unknown>[] = [];
  const exec = { waitUntil: (p: Promise<unknown>) => { waited.push(p); } } as unknown as ExecutionContext;
  const get = (path: string) => app.fetch(new Request(`http://x${path}`), {} as Env, exec);
  return { get, waited };
}

test("ctx.baoThayDoi: exec.waitUntil gọi đúng một lần với sự kiện; phản hồi 200 trả về TRƯỚC khi lời hứa phát tin xong", async () => {
  const seen: unknown[] = [];
  let resolveHang: () => void = () => {};
  const hang = new Promise<void>((r) => { resolveHang = r; });
  const { get, waited } = buildBangTin(staffOf(["SALES"]), {
    baoThayDoi: async (_env, actor, e) => { seen.push([actor.id, e]); await hang; },
  });
  const res = await get("/api/bao");
  assert.equal(res.status, 200); // phản hồi đã về dù lời hứa phát tin (hang) chưa xong
  assert.equal(waited.length, 1);
  resolveHang();
  await Promise.allSettled(waited);
  assert.deepEqual(seen, [["s1", { orderId: "o1", thayDoi: "sua" }]]);
});

test("route không gọi ctx.baoThayDoi → exec.waitUntil không được gọi", async () => {
  const { get, waited } = buildBangTin(staffOf(["SALES"]));
  const res = await get("/api/no-call");
  assert.equal(res.status, 200);
  assert.equal(waited.length, 0);
});

test("ctx.baoThayDoi trên route công khai (chưa đăng nhập, staff null) là no-op: không gọi injected, không gọi waitUntil", async () => {
  let goiInjected = false;
  const { get, waited } = buildPublicBao(() => { goiInjected = true; });
  const res = await get("/api/bao-open");
  assert.equal(res.status, 200);
  assert.equal(waited.length, 0);
  assert.equal(goiInjected, false);
});

test("hàm tiêm baoThayDoi NÉM LỖI ĐỒNG BỘ → phản hồi vẫn 200; console.error một dòng bang_tin_loi, không lộ dữ liệu cá nhân", async () => {
  const logs: string[] = [];
  const goc = console.error;
  console.error = ((m: string) => { logs.push(m); }) as typeof console.error;
  let res: Response;
  let waited: Promise<unknown>[];
  try {
    const built = buildBangTin(staffOf(["SALES"], "0987654321"), {
      baoThayDoi: () => { throw new Error("bí mật SĐT 0987654321"); },
    });
    res = await built.get("/api/bao");
    waited = built.waited;
    await Promise.allSettled(waited);
  } finally {
    console.error = goc;
  }
  assert.equal(res.status, 200);
  assert.equal(logs.length, 1);
  const dong = JSON.parse(logs[0]!);
  assert.equal(dong.event, "bang_tin_loi");
  assert.equal(dong.viec, "bao");
  assert.equal(dong.name, "Error");
  assert.ok(!logs[0]!.includes("0987654321"));
});

test("hàm tiêm baoThayDoi trả lời hứa BỊ TỪ CHỐI → phản hồi vẫn 200; console.error một dòng bang_tin_loi", async () => {
  const logs: string[] = [];
  const goc = console.error;
  console.error = ((m: string) => { logs.push(m); }) as typeof console.error;
  let res: Response;
  try {
    const built = buildBangTin(staffOf(["SALES"]), {
      baoThayDoi: async () => { throw new Error("lỗi phát tin"); },
    });
    res = await built.get("/api/bao");
    await Promise.allSettled(built.waited);
  } finally {
    console.error = goc;
  }
  assert.equal(res.status, 200);
  assert.equal(logs.length, 1);
  const dong = JSON.parse(logs[0]!);
  assert.equal(dong.event, "bang_tin_loi");
  assert.equal(dong.viec, "bao");
});

test("ctx.dongBangTin: bắn-và-quên qua exec.waitUntil, không phụ thuộc người gọi", async () => {
  const seen: unknown[] = [];
  const { get, waited } = buildBangTin(staffOf(["SALES"]), {
    dongBangTin: async (_env, muc) => { seen.push(muc); },
  });
  const res = await get("/api/dong");
  assert.equal(res.status, 200);
  assert.equal(waited.length, 1);
  await Promise.allSettled(waited);
  assert.deepEqual(seen, [{ staffId: "s9" }]);
});

test("hàm tiêm dongBangTin NÉM LỖI ĐỒNG BỘ → phản hồi vẫn 200; console.error một dòng bang_tin_loi viec=dong", async () => {
  const logs: string[] = [];
  const goc = console.error;
  console.error = ((m: string) => { logs.push(m); }) as typeof console.error;
  let res: Response;
  try {
    const built = buildBangTin(staffOf(["SALES"]), {
      dongBangTin: () => { throw new Error("lỗi đóng"); },
    });
    res = await built.get("/api/dong");
    await Promise.allSettled(built.waited);
  } finally {
    console.error = goc;
  }
  assert.equal(res.status, 200);
  assert.equal(logs.length, 1);
  const dong = JSON.parse(logs[0]!);
  assert.equal(dong.event, "bang_tin_loi");
  assert.equal(dong.viec, "dong");
});
