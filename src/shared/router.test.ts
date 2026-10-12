// Kiểm cổng bảo trì của router (createApp): dùng module giả, không cần D1. Cổng do gốc lắp ráp tiêm (`injected.maintenanceBlock`) — router không biết module `maintenance`.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import type { StaffProfile } from "./contracts.ts";
import { json } from "./http.ts";
import { createApp, route, type AppModule } from "./router.ts";

/** `currentStaff` giả trả nhân viên + mã phiên (sổ phiên ADR-0075), hoặc null. */
const phien = (s: StaffProfile | null) => (s ? { staff: s, sessionId: "phien-thu" } : null);
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
    currentStaff: async () => phien(staff),
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
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
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
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/pa-open" ? null : phien(who)),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async (_env, actor, partyId) => { seen.push(`${actor.id}:${partyId}`); return { linked: false }; },
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
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
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/mine-open" ? null : phien(who)),
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
    currentStaff: async (req) => (new URL(req.url).pathname === "/api/pick-open" ? null : phien(who)),
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
  dongBangTin?: (env: Env, muc: { staffId: string; tatThongBao: boolean } | "tat-ca") => Promise<void> | void;
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
        ctx.dongBangTin({ staffId: "s9", tatThongBao: true });
        return new Response("ok");
      }),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => phien(staff),
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
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
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
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
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

// ADR-0062 Đ4 (phiếu kiểm A3 V2): router chụp `batDau` TRƯỚC khi chạy handler — gốc lắp ráp chỉ gõ cửa dòng đổi có created_at ≥ batDau, nên mốc phải ≤ mọi
// mốc `at` mà handler ghi. Đồng hồ giả TIẾN giữa các bước của handler (khung thử tin-doi-hop dùng đồng hồ đứng yên nên không phân biệt được "chụp trước handler"
// với "chụp lúc gọi báo"); chụp muộn (lúc ctx.baoThayDoi được gọi) ⇒ batDau > at ⇒ bài đỏ.
test("ctx.baoThayDoi: batDau truyền cho hàm tiêm là mốc chụp TRƯỚC handler — ≤ mọi mốc handler ghi, kể cả khi đồng hồ tiến giữa lúc ghi và lúc báo", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-08T03:00:00.000Z") });
  try {
    const seen: { at: string; batDau: string | undefined }[] = [];
    let at = "";
    const mod: AppModule = {
      name: "bat-dau-giả",
      routes: [
        route("GET", "/api/ghi-roi-bao", "staff", async (ctx) => {
          mock.timers.tick(7); // việc đọc trước khi ghi
          at = new Date().toISOString(); // mốc dòng nhật ký handler ghi
          mock.timers.tick(7); // việc sau khi ghi, trước khi báo
          ctx.baoThayDoi({ orderId: "o1", thayDoi: "chuyen" as never });
          return new Response("ok");
        }),
      ],
    };
    const app = createApp({
      modules: [mod],
      currentStaff: async () => phien(staffOf(["SALES"])),
      injected: {
        isAssigned: async () => false,
        newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
        ordersWithHandler: async () => new Set<string>(),
        handledOrderIdsOf: async () => [],
        maintenanceBlock: async () => null,
        partyAccount: async () => ({ linked: false }),
        baoThayDoi: async (_env, _actor, _e, batDau) => { seen.push({ at, batDau }); },
        dongBangTin: async () => {},
        giaoLoDay: async () => [],
        mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
      },
    });
    const waited: Promise<unknown>[] = [];
    const exec = { waitUntil: (p: Promise<unknown>) => { waited.push(p); } } as unknown as ExecutionContext;
    mock.timers.tick(5); // request tới
    const truocHandler = new Date().toISOString();
    assert.equal((await app.fetch(new Request("http://x/api/ghi-roi-bao"), {} as Env, exec)).status, 200);
    await Promise.allSettled(waited);
    assert.equal(seen.length, 1);
    const { batDau } = seen[0]!;
    assert.equal(typeof batDau, "string");
    assert.ok(batDau! <= at, `batDau (${batDau}) phải ≤ mốc handler ghi (${at})`);
    assert.equal(batDau, truocHandler, "đúng mốc lúc request vào, trước mọi bước của handler");
  } finally {
    mock.timers.reset();
  }
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
  assert.deepEqual(seen, [{ staffId: "s9", tatThongBao: true }]);
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

// WEB PUSH (ADR-0036, Task 3) — ctx.giaoLoDay: hàm tiêm (khuôn dongBangTin) để `thongbao` giao lô gõ cửa cho trạm `BangTin` mà KHÔNG import `bangtin`
// (không nới ALLOWED_EDGES). Khác baoThayDoi/dongBangTin: trả lời hứa (route cần danh sách địa chỉ 410 mà trạm trả về).
test("ctx.giaoLoDay: chuyển env + danh sách tới hàm tiêm và trả nguyên kết quả", async () => {
  const seen: unknown[] = [];
  const env = { ten: "env-thu" } as unknown as Env;
  const mod: AppModule = {
    name: "giao-lo-gia",
    routes: [route("GET", "/api/giao", "staff", async (ctx) => json({ het: await ctx.giaoLoDay(["a", "b"]) }))],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => phien(staffOf(["SALES"])),
    injected: {
      isAssigned: async () => false,
      defaultHandlerStatement: () => null,
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
      giaoLoDay: async (e, ds) => { seen.push([e, ds]); return ["b"]; },
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
    },
  });
  const res = await app.fetch(new Request("http://x/api/giao"), env, {} as ExecutionContext);
  assert.deepEqual(await res.json(), { het: ["b"] });
  assert.deepEqual(seen, [[env, ["a", "b"]]]);
});

// MỐC TỐI THIỂU (ADR-0049 D2, I25; TC-26) — ctx.mocToiThieu: hàm tiêm của gốc lắp ráp (orders không đọc bảng vc_). Thiếu hàm tiêm → null (route CHẶN,
// không đoán con số) — khuôn "không bao giờ lặng lẽ có mặc định" của isAssigned.
test("ctx.mocToiThieu: chuyển env tới hàm tiêm và trả nguyên kết quả; KHÔNG tiêm → null (không đoán)", async () => {
  const seen: unknown[] = [];
  const env = { ten: "env-thu" } as unknown as Env;
  const mod: AppModule = {
    name: "moc-gia",
    routes: [route("GET", "/api/moc", "staff", async (ctx) => json({ moc: await ctx.mocToiThieu() }))],
  };
  const base = {
    modules: [mod],
    currentStaff: async () => phien(staffOf(["SALES"])),
  };
  const injected = {
    isAssigned: async () => false,
    defaultHandlerStatement: () => null,
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
  };
  const co = createApp({ ...base, injected: { ...injected, mocToiThieu: async (e: Env) => { seen.push(e); return { phut: 240, policyId: "cs-x", canhBaoPhut: 60 }; } } } as any);
  assert.deepEqual(await (await co.fetch(new Request("http://x/api/moc"), env, {} as ExecutionContext)).json(), { moc: { phut: 240, policyId: "cs-x", canhBaoPhut: 60 } });
  assert.deepEqual(seen, [env]);
  const khong = createApp({ ...base, injected } as any);
  assert.deepEqual(await (await khong.fetch(new Request("http://x/api/moc"), env, {} as ExecutionContext)).json(), { moc: null });
});

// NHÃN NGƯỜI BẤM (ruling R-P20) — ctx.nhanNhanVien là hàm tiêm của gốc lắp ráp (van-chuyen không import staff). Thiếu hàm tiêm → null (route để
// TRỐNG nhãn, không đoán); mảng rỗng → Map rỗng, KHÔNG gọi hàm tiêm (không truy vấn thừa); có tiêm → chuyển env + danh sách id, trả nguyên Map.
test("ctx.nhanNhanVien (R-P20): chuyển env + id tới hàm tiêm; mảng rỗng → Map rỗng không gọi; KHÔNG tiêm → null", async () => {
  const seen: unknown[] = [];
  const env = { ten: "env-thu" } as unknown as Env;
  const mod: AppModule = {
    name: "nhan-gia",
    routes: [route("GET", "/api/nhan", "staff", async (ctx) => {
      const a = await ctx.nhanNhanVien(["s-1", "s-2"]);
      const rong = await ctx.nhanNhanVien([]);
      return json({ a: a === null ? null : [...a], rong: rong === null ? null : [...rong] });
    })],
  };
  const base = { modules: [mod], currentStaff: async () => phien(staffOf(["SALES"])) };
  const injected = {
    isAssigned: async () => false,
    defaultHandlerStatement: () => null,
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
  };
  const nhan = async (e: Env, ids: readonly string[]) => {
    seen.push([e, [...ids]]);
    return new Map(ids.map((i) => [i, `Tên ${i}`] as [string, string]));
  };
  const co = createApp({ ...base, injected: { ...injected, nhanNhanVien: nhan } } as any);
  assert.deepEqual(await (await co.fetch(new Request("http://x/api/nhan"), env, {} as ExecutionContext)).json(), {
    a: [["s-1", "Tên s-1"], ["s-2", "Tên s-2"]],
    rong: [],
  });
  assert.deepEqual(seen, [[env, ["s-1", "s-2"]]], "mảng rỗng KHÔNG gọi hàm tiêm");
  const khong = createApp({ ...base, injected } as any);
  assert.deepEqual(await (await khong.fetch(new Request("http://x/api/nhan"), env, {} as ExecutionContext)).json(), { a: null, rong: null });
});

// BÊN ĐẶT MÁY CHỦ ÉP CHO NGƯỜI GỌI (sổ đại lý đợt 1, Task 11; Ruling 21) — ctx.benDatCuaToi là hàm tiêm của gốc lắp ráp (`auth` không import `pricing`). Có tiêm → chuyển env + NGƯỜI GỌI
// (hàm tiêm tự quyết có truy vấn hay không), trả nguyên kết quả; KHÔNG tiêm (khung thử cũ) → null, không đoán; route công khai (chưa đăng nhập) → null, không gọi hàm tiêm.
test("ctx.benDatCuaToi (Ruling 21): chuyển env + người gọi tới hàm tiêm; KHÔNG tiêm → null; chưa đăng nhập → null không gọi", async () => {
  const seen: unknown[] = [];
  const env = { ten: "env-thu" } as unknown as Env;
  const mod: AppModule = {
    name: "ben-dat-gia",
    routes: [route("GET", "/api/bd", "staff", async (ctx) => json({ bd: await ctx.benDatCuaToi() })), route("GET", "/api/bd-cong-khai", "public", async (ctx) => json({ bd: await ctx.benDatCuaToi() }))],
  };
  const injected = {
    isAssigned: async () => false,
    defaultHandlerStatement: () => null,
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
  };
  const nguoi = staffOf(["PARTNER"]);
  const tiem = async (e: Env, actor: StaffProfile) => {
    seen.push([e, actor.id]);
    return { partyId: "pty-1", ten: "Đại lý Một" };
  };
  const dn = { modules: [mod], currentStaff: async () => phien(nguoi) };
  const co = createApp({ ...dn, injected: { ...injected, benDatCuaToi: tiem } } as any);
  assert.deepEqual(await (await co.fetch(new Request("http://x/api/bd"), env, {} as ExecutionContext)).json(), { bd: { partyId: "pty-1", ten: "Đại lý Một" } });
  assert.deepEqual(seen, [[env, "s1"]]);
  const khong = createApp({ ...dn, injected } as any);
  assert.deepEqual(await (await khong.fetch(new Request("http://x/api/bd"), env, {} as ExecutionContext)).json(), { bd: null });
  seen.length = 0;
  assert.deepEqual(await (await co.fetch(new Request("http://x/api/bd-cong-khai"), env, {} as ExecutionContext)).json(), { bd: null });
  assert.deepEqual(seen, [], "route công khai (không ai đăng nhập) thì không gọi hàm tiêm");
});

// Sổ tiền lượt 1 (kiểm độc lập T-1; ADR-0025 đ4): hai người đua — route đã đọc "chưa Đã giao" nhưng lô ghi gặp trigger 0044 (`order_delivered:` /
// `order_completed:`) → 409 câu tiếng Việt, KHÔNG 500 chung. Lỗi khác vẫn 500 như cũ; chữ thô của trigger không lộ ra.
function buildThrowing(err: unknown) {
  const mod: AppModule = {
    name: "giả",
    routes: [
      route("POST", "/api/ghi", "staff", async () => {
        throw err;
      }),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => phien(staffOf(["SALES"])),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
      lanGui: lanGuiGia().noi, // ADR-0094 T18: route ghi có đăng nhập cần phần tiêm lớp vé
    },
  } as any);
  return app.fetch(new Request("http://x/api/ghi", { method: "POST", headers: { origin: "http://x" } }), {} as Env, {} as ExecutionContext);
}

test("T-1: lỗi trigger 'order_delivered:' / 'order_completed:' trong lô ghi → 409 order_delivered câu tiếng Việt (không 500, không lộ chữ trigger)", async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    for (const msg of ["D1_ERROR: order_delivered: đơn đã Đã giao – không sửa dịch vụ: SQLITE_CONSTRAINT", "order_completed: mốc Hoàn thành chỉ đặt một lần, sau Đã giao"]) {
      const r = await buildThrowing(new Error(msg));
      assert.equal(r.status, 409, msg);
      const b = (await r.json()) as { error: { code: string; message: string } };
      assert.equal(b.error.code, "order_delivered");
      assert.match(b.error.message, /Đã giao – đã thu đủ/);
      assert.doesNotMatch(b.error.message, /SQLITE|D1_ERROR|order_delivered:/);
    }
    const khac = await buildThrowing(new Error("D1_ERROR: something else"));
    assert.equal(khac.status, 500, "lỗi khác vẫn 500");
  } finally {
    console.error = orig;
  }
});

test("ADR-0075: route cần đăng nhập nhận ctx.sessionId từ currentStaff; route công khai nhận null (không đọc phiên)", async () => {
  const seen: (string | null)[] = [];
  const mod: AppModule = {
    name: "giả",
    routes: [
      route("GET", "/api/mine", "staff", async (ctx) => (seen.push(ctx.sessionId), new Response("ok"))),
      route("GET", "/api/open", "public", async (ctx) => (seen.push(ctx.sessionId), new Response("ok"))),
    ],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => ({ staff: staffOf(["SALES"]), sessionId: "phien-42" }),
    injected: {
      isAssigned: async () => false,
      newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
      ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [],
      maintenanceBlock: async () => null,
      partyAccount: async () => ({ linked: false }),
      baoThayDoi: async () => {},
      dongBangTin: async () => {},
      giaoLoDay: async () => [],
      mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
    },
  } as unknown as Parameters<typeof createApp>[0]);
  assert.equal((await app.fetch(new Request("http://x/api/mine"), {} as Env, {} as ExecutionContext)).status, 200);
  assert.equal((await app.fetch(new Request("http://x/api/open"), {} as Env, {} as ExecutionContext)).status, 200);
  assert.deepEqual(seen, ["phien-42", null]);
});

test("ctx.nguongHetHan: khung thử không tiêm → 30 (NGUONG_MAC_DINH, chỉ để hiển thị); có tiêm → đúng giá trị tiêm", async () => {
  const s = staffOf(["SALES"]);
  const mod: AppModule = { name: "giả", routes: [route("GET", "/api/moc", "staff", async ({ nguongHetHan }) => json({ moc: await nguongHetHan() }))] };
  const goc = {
    isAssigned: async () => false,
    newOrderHandler: async () => ({ ok: false as const, message: "không dùng" }),
    ordersWithHandler: async () => new Set<string>(),
    handledOrderIdsOf: async () => [],
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
    mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
  };
  const doc = async (injected: any) => {
    const app = createApp({ modules: [mod], currentStaff: async () => phien(s), injected });
    return (await (await app.fetch(new Request("http://x/api/moc"), {} as Env, {} as ExecutionContext)).json()).moc;
  };
  assert.equal(await doc(goc), 30);
  assert.equal(await doc({ ...goc, nguongHetHan: async () => 7 }), 7);
});

test("ctx.huongDanVien: khung thử không tiêm → [] (mặc định TỪ CHỐI — không ai là người đi kèm hợp lệ); có tiêm → đúng danh sách tiêm", async () => {
  const s = staffOf(["SALES"]);
  const mod: AppModule = { name: "giả", routes: [route("GET", "/api/hdv", "staff", async ({ huongDanVien }) => json({ ds: await huongDanVien() }))] };
  const goc = {
    isAssigned: async () => false,
    newOrderHandler: async () => ({ ok: false as const, message: "không dùng" }),
    ordersWithHandler: async () => new Set<string>(),
    handledOrderIdsOf: async () => [],
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
    mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
  };
  const doc = async (injected: any) => {
    const app = createApp({ modules: [mod], currentStaff: async () => phien(s), injected });
    return (await (await app.fetch(new Request("http://x/api/hdv"), {} as Env, {} as ExecutionContext)).json()).ds;
  };
  assert.deepEqual(await doc(goc), []);
  assert.deepEqual(await doc({ ...goc, huongDanVien: async () => [{ partyId: "p1", ten: "A" }] }), [{ partyId: "p1", ten: "A" }]);
});

// ---------------------------------------------------------------------------------------------------------------------
// LỚP CHỐNG GHI TRÙNG (ADR-0094) — phần router với module giả, không D1 (hành vi đầy đủ trên SQLite thật: src/lan-gui-hanh-vi.test.ts).
// ---------------------------------------------------------------------------------------------------------------------
/** Phần tiêm lớp vé GIẢ: đếm lời gọi `tra`, không có vé nào. */
function lanGuiGia() {
  const dem = { tra: 0, vanTay: 0 };
  const noi = {
    vanTay: async () => (dem.vanTay++, "vt"),
    tra: async () => (dem.tra++, null),
    cauChenVe: () => ({}) as D1PreparedStatement,
    capNhatKetQua: async () => {},
    tangLap: async () => {},
  };
  return { noi, dem };
}
function buildLanGui(lanGui: unknown) {
  const calls = { handler: 0 };
  const ok = async () => (calls.handler++, json({ ok: true }));
  const mod: AppModule = {
    name: "giả",
    routes: [route("POST", "/api/ghi", "staff", ok), route("POST", "/api/cong-khai", "public", ok), route("GET", "/api/doc", "staff", ok)],
  };
  const injected: Record<string, unknown> = {
    isAssigned: async () => false,
    newOrderHandler: async () => ({ ok: false, message: "không dùng" }),
    ordersWithHandler: async () => new Set<string>(),
    handledOrderIdsOf: async () => [],
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
  };
  if (lanGui !== undefined) injected.lanGui = lanGui;
  const app = createApp({ modules: [mod], currentStaff: async () => phien(staffOf(["SALES"])), injected } as any);
  const goi = (method: string, path: string, ve?: string) =>
    app.fetch(
      new Request(`http://x${path}`, { method, headers: { origin: "http://x", ...(ve ? { "idempotency-key": ve } : {}) } }),
      {} as Env,
      { waitUntil: () => {} } as unknown as ExecutionContext,
    );
  return { goi, calls };
}
async function imLog<T>(f: () => Promise<T>): Promise<{ kq: T; log: string[] }> {
  const log: string[] = [];
  const [w, e] = [console.warn, console.error];
  console.warn = (...a: unknown[]) => void log.push(a.map(String).join(" "));
  console.error = (...a: unknown[]) => void log.push(a.map(String).join(" "));
  try {
    return { kq: await f(), log };
  } finally {
    console.warn = w;
    console.error = e;
  }
}

test("ADR-0094 T18: thiếu phần tiêm lanGui ⇒ route GHI có đăng nhập trả 500 server_misconfigured (không lặng lẽ tắt lớp); route đọc, route công khai vẫn chạy", async () => {
  const { goi, calls } = buildLanGui(undefined);
  const { kq } = await imLog(() => goi("POST", "/api/ghi", crypto.randomUUID()));
  assert.equal(kq.status, 500);
  assert.equal(((await kq.json()) as { error: { code: string } }).error.code, "server_misconfigured");
  const { kq: khongVe } = await imLog(() => goi("POST", "/api/ghi"));
  assert.equal(khongVe.status, 500, "thiếu vé cũng không lọt khi thiếu phần tiêm");
  assert.equal(calls.handler, 0);
  assert.equal((await goi("GET", "/api/doc")).status, 200);
  assert.equal((await goi("POST", "/api/cong-khai")).status, 200);
});

test("ADR-0094: có vé ⇒ router tra vé đúng một lần trước handler; route công khai KHÔNG tra (kể cả có vé); route đọc không tra", async () => {
  const g = lanGuiGia();
  const { goi, calls } = buildLanGui(g.noi);
  assert.equal((await goi("POST", "/api/ghi", crypto.randomUUID())).status, 200);
  assert.equal(g.dem.tra, 1);
  assert.equal(calls.handler, 1);
  assert.equal((await goi("POST", "/api/cong-khai", crypto.randomUUID())).status, 200);
  assert.equal((await goi("GET", "/api/doc")).status, 200);
  assert.equal(g.dem.tra, 1, "công khai / đọc: không tra");
});

test("ADR-0094 T14 (giai đoạn 1): thiếu vé ⇒ handler chạy, không tra, đúng MỘT dòng log thieu_ma_lan_gui mang mẫu route (không id, không dữ liệu)", async () => {
  const g = lanGuiGia();
  const { goi, calls } = buildLanGui(g.noi);
  const { kq, log } = await imLog(() => goi("POST", "/api/ghi"));
  assert.equal(kq.status, 200);
  assert.equal(calls.handler, 1);
  assert.equal(g.dem.tra, 0);
  assert.deepEqual(log.map((l) => JSON.parse(l)), [{ event: "thieu_ma_lan_gui", duong: "POST /api/ghi" }]);
});
