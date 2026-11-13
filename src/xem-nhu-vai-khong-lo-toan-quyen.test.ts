// ADR-0180 Đ1.4 — bài QUÉT: Toàn quyền đang "xem như" vai X không lọt qua bất cứ đâu với tư cách Toàn quyền.
// Ba lớp:
//  (a) quyết định quyền thuần: mọi thao tác của MATRIX và bốn cổng router cho cùng câu trả lời với bộ hiệu lực của phiên và bộ quyền của tài khoản thật giữ đúng vai.
//      Đúng theo cấu trúc (currentStaff đưa quyenHieuLuc vào mọi nơi) — giá trị của lớp này là KHOÁ chống hồi quy, không phải phát hiện.
//  (b) quét TOÀN BỘ route của bảng route (mọi module, như route-access.test.ts): với mỗi vai chọn được, mã trạng thái HTTP của chủ đang đóng vai X
//      = mã của tài khoản thật CHỈ giữ bộ quyền của X — CÙNG id, CÙNG SĐT, CÙNG hồ sơ (hai thế giới SQLite riêng, chạy lần lượt), cùng yêu cầu, cùng thứ tự.
//      Tham số đường dẫn là một UUID không tồn tại, thân ghi là `{}` ⇒ phần lớn route chỉ đi tới cổng + `can()` đầu tiên rồi 400/404: lớp này bắt CỔNG,
//      không bắt nhánh sâu cần dữ liệu thật. Ngoại lệ có tên ở MIEN (mỗi dòng một lý do; dòng không còn route ⇒ đỏ).
//  (c) ca có dữ liệu thật cho chỗ quyết định đọc quyền ngoài bộ hiệu lực: xác minh phiếu tự khai (parties — đã sửa), Góp ý / Kỹ thuật chỉ Toàn quyền (ADR-0038),
//      quyền tiền chỉ Toàn quyền (ADR-0090) khi đóng Quản trị, admin.manage khi đóng Bán hàng, tự chọn mình làm người phụ trách khi đóng Thực tập / Đối tác.
// Giới hạn đã biết (không quét ở đây): đóng Đối tác / Tài xế đối tác vẫn dùng hồ sơ nội bộ của chủ (`staff.partyId`) — ADR-0180 Đ1.5.
// Bảng rà từng chỗ và điều chưa phủ: docs/superpowers/plans/2026-11-07-xem-nhu-vai-khac-thi-cong-nhat-ky.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StaffProfile } from "./shared/contracts.ts";
import { createApp, route, type AppModule } from "./shared/router.ts";
import { MATRIX, PERMISSION_CODES, can, canAccessOrders, isOffice, passesAccountsGate, passesAdminGate, type OperationCode, type PermissionCode } from "./shared/permissions.ts";
import { VAI_CHON_DUOC, quyenHieuLuc } from "./shared/xem-nhu-vai.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff, world } from "../tests/audit/harness.mjs";

const CHU = "77777777-7777-4777-8777-777777777777";
const SDT = "0900000007";
const KHONG_CO = "00000000-0000-4000-8000-000000000000";
const DUONG_VAI = "/api/auth/xem-nhu-vai";

/** Bộ quyền của tài khoản thật "giữ đúng vai X" — cùng một định nghĩa với phiên đang đóng vai (Quản lý bán hàng luôn kèm Bán hàng, ADR-0169 Đ1). */
const boThat = (vai: PermissionCode): PermissionCode[] => quyenHieuLuc([], vai);

test("danh sách vai được quét = đủ 10 mã chọn được (mọi mã trừ Toàn quyền)", () => {
  assert.equal(VAI_CHON_DUOC.length, 10);
  assert.deepEqual([...VAI_CHON_DUOC].sort(), PERMISSION_CODES.filter((p) => p !== "SUPER_ADMIN").sort());
});

// ---- (a) quyết định quyền thuần ---------------------------------------------------------------------------------------------------------------
test("(a) mọi thao tác MATRIX × mọi ngữ cảnh, bốn cổng: bộ hiệu lực của chủ đang đóng vai = tài khoản thật giữ đúng vai", () => {
  const ngữCảnh = [{}, { ownerId: CHU }, { ownerId: "khac" }, { assigned: true }, { assigned: false }, { ownerId: CHU, assigned: true }];
  for (const vai of VAI_CHON_DUOC) {
    const dongVai = { id: CHU, permissions: quyenHieuLuc(["SUPER_ADMIN"], vai) };
    const that = { id: CHU, permissions: boThat(vai) };
    assert.ok(!dongVai.permissions.includes("SUPER_ADMIN"), `${vai}: bộ hiệu lực còn SUPER_ADMIN`);
    for (const op of Object.keys(MATRIX) as OperationCode[]) {
      for (const c of ngữCảnh) assert.equal(can(dongVai, op, c), can(that, op, c), `${vai} ${op} ${JSON.stringify(c)}`);
    }
    for (const g of [passesAdminGate, passesAccountsGate, isOffice, canAccessOrders]) assert.equal(g(dongVai), g(that), `${vai} ${g.name}`);
  }
});

// ---- bảng route ---------------------------------------------------------------------------------------------------------------------------------
interface R { method: string; path: string; access: string }
/** Cùng danh sách module như route-access.test.ts (bài đó đỏ nếu có module route mới chưa vào MODULES; bài này đỏ nếu tổng route lệch số ở đó). */
const MODULES: readonly [string, string][] = [
  ["accounts", "accountsModule"], ["audit", "auditModule"], ["auth", "authModule"], ["bangtin", "bangtinModule"], ["billing", "billingModule"],
  ["catalog", "catalogModule"], ["company", "companyModule"], ["dispatch", "dispatchModule"], ["feedback", "feedbackModule"], ["giao-dien", "giaoDienModule"],
  ["locations", "locationsModule"], ["maintenance", "maintenanceModule"], ["orders", "ordersModule"], ["parties", "partiesModule"], ["pricing", "pricingModule"],
  ["receipt", "receiptModule"], ["thongbao", "thongbaoModule"], ["van-chuyen", "vanChuyenModule"], ["tro-ly", "troLyModule"], ["ve-dien-tu", "veDienTuModule"],
];
const SO_ROUTE = 504; // = số khoá ở route-access.test.ts (SNAPSHOT). ADR-0202: +1 PUT /api/maintenance/content = 504. ADR-0201 Đ3: +2 PUT, GET /api/catalog/:code/anh = 503. ADR-0201 Đ1: +2 GET, PUT /api/catalog/:code/chi-tiet = 501. ADR-0182 phần B: +6 route khoản nộp đại lý = 499. ADR-0182 phần A: +1 GET /api/orders/:id/cong-no-dai-ly = 493. ADR-0196 (Đợt 6A): +4 route ảnh biên lai = 492. ADR-0193 mục 1 (Đợt 5B): +2 GET, POST /api/cai-dat/bat-buoc-gio-don = 488. ADR-0194 đợt 1: +4 route /api/cai-dat/giao-dien* = 486. ADR-0175 Đợt 2 (vé Tour Đảo): +6 route /api/ve/quet*, /api/ve/doi-chieu, /api/ve/nguoi-quet, /api/ve/luot-quet = 482 (476 + 6); ADR-0187 Đ2.3: +1 PUT /api/account/thanh-duoi = 476; ADR-0175 Đ1.2: +2 GET, POST /api/catalog/nguon-ve = 475; ADR-0174: +2 GET, POST /api/catalog/co-ve; ADR-0184: +1 GET /api/van-chuyen/cho-chay-thieu/dem (đọc, office); ADR-0187 Đ3 mức (a): +3 route /api/ledger/tu-ghi*; gộp hai nhánh 8/11 = 471

let routesCache: R[] | null = null;
async function bangRoute(): Promise<R[]> {
  if (routesCache) return routesCache;
  const contents = MODULES.map(([dir, ten]) => `export { ${ten} } from "./modules/${dir}/index.ts";`).join("\n");
  const built = await esbuild.build({
    stdin: { contents, resolveDir: new URL(".", import.meta.url).pathname, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
  });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, { routes: R[] }>;
  const out: R[] = [];
  for (const [, ten] of MODULES) for (const r of mod[ten]!.routes) out.push({ method: r.method, path: r.path, access: r.access });
  routesCache = out;
  return out;
}
const khoa = (r: R) => `${r.method} ${r.path}`;
const duongThu = (p: string) => p.replace(/:[A-Za-z]+/g, KHONG_CO);

/**
 * MIỄN có tên — chỗ CỐ Ý theo quyền THẬT (ADR-0180 Đ3) hoặc vướng giới hạn đã biết. Khoá = "METHOD path". Vai: null = mọi vai.
 * Dòng có khoá không còn trong bảng route ⇒ bài đỏ (không để miễn chết).
 */
const MIEN: readonly { khoa: string; vai: readonly PermissionCode[] | null; lyDo: string }[] = [
  { khoa: `POST ${DUONG_VAI}`, vai: null, lyDo: "Đ3: route bật xét quyền THẬT — chủ đổi vai được dù đang đóng vai không có quyền; tài khoản thật thì 403" },
  { khoa: `DELETE ${DUONG_VAI}`, vai: null, lyDo: "Đ3: route thoát xét quyền THẬT — chủ không bao giờ bị kẹt; tài khoản thật thì 403" },
  // Đ3 câu cuối: chính sách hai lớp theo quyền THẬT (accounts/index.ts dùng quyenThat) — Toàn quyền không dùng được email làm yếu tố (409), dù đang đóng vai cho phép email.
  { khoa: "POST /api/account/mfa/email/start", vai: null, lyDo: "Đ3: email chỉ cho vai nhỏ — xét theo quyền THẬT (Toàn quyền 409)" },
  { khoa: "POST /api/account/mfa/email/confirm", vai: null, lyDo: "Đ3: như trên" },
  // ADR-0187 Đ2.3 (giao việc 9/11): đang đóng vai thì KHÔNG đổi được nút thanh dưới (403 acting_role) — để Toàn quyền xem đúng giao diện người thật, không ghi đè lựa chọn của chính mình.
  { khoa: "PUT /api/account/thanh-duoi", vai: null, lyDo: "Đ2.3: cố ý chặn mọi lệnh đổi nút thanh dưới khi đang đóng vai; tài khoản thật thì 400 (thân rỗng) hoặc 403 (Tài xế đối tác)" },
];

async function quet(vai: PermissionCode, dongVai: boolean, routes: readonly R[]): Promise<Map<string, string>> {
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: SDT, name: "Chủ", perms: dongVai ? ["SUPER_ADMIN"] : boThat(vai) });
  const giuVai = async () => {
    if (!dongVai) return;
    await w.token(CHU);
    const s = w.q("SELECT acting_role FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1", CHU)[0];
    if (s?.acting_role === vai) return;
    const r = await w.call("POST", DUONG_VAI, { as: CHU, body: { role: vai } });
    assert.equal(r.status, 200, `không bật được vai ${vai}: ${r.text}`);
  };
  const out = new Map<string, string>();
  for (const r of routes) {
    await giuVai(); // route đăng xuất / tắt máy làm mất phiên: phiên mới phải được đặt lại vai trước yêu cầu kế tiếp
    let kq: string;
    try {
      const res = await w.call(r.method, duongThu(r.path), { as: CHU, body: r.method === "GET" ? undefined : {} });
      kq = String(res.status);
    } catch (e) {
      kq = `ném: ${(e as Error).message.slice(0, 80)}`;
    }
    out.set(khoa(r), kq);
  }
  return out;
}

// ---- (b) quét toàn bộ route, đủ 10 vai ----------------------------------------------------------------------------------------------------------
test("(b) bảng route đủ số và mọi dòng MIỄN còn route thật", async () => {
  const routes = await bangRoute();
  assert.equal(routes.length, SO_ROUTE, "số route lệch route-access.test.ts — cập nhật SO_ROUTE cùng SNAPSHOT");
  const co = new Set(routes.map(khoa));
  for (const m of MIEN) assert.ok(co.has(m.khoa), `miễn chết: ${m.khoa}`);
});

test("(b) danh sách MODULES của bài quét đủ mọi thư mục module có khai `...Module: AppModule` (khai kiểu `: AppModule` hoặc `satisfies AppModule`; module mới không lặng lẽ thoát khỏi bài quét)", () => {
  const goc = join(fileURLToPath(new URL(".", import.meta.url)), "modules");
  const coRoute = readdirSync(goc)
    .filter((d) => statSync(join(goc, d)).isDirectory())
    .filter((d) => /export const \w+Module\s*(?::\s*AppModule\b|=[\s\S]*?satisfies\s+AppModule\b)/.test(readFileSync(join(goc, d, "index.ts"), "utf8")))
    .sort();
  assert.deepEqual(coRoute, MODULES.map(([d]) => d).sort(), "có module có route chưa vào MODULES của bài quét này");
});

// Cổng router riêng (không qua handler): route giả LUÔN trả 200, nên chỉ cổng quyết định. Lớp (b) không bắt được cổng lệch vì handler thật tự hỏi can() lần nữa.
test("(b) cổng router (admin, accounts, office, orders, staff) với route giả luôn 200: chủ đang đóng vai = tài khoản thật giữ đúng vai, ở cả 10 vai", async () => {
  const ok = async () => new Response("ok");
  const quyenCongBaoTri: string[][] = []; // bộ quyền router đưa cho cổng bảo trì ở từng yêu cầu
  const mod: AppModule = {
    name: "giả",
    routes: [route("GET", "/x/staff", "staff", ok), route("GET", "/x/admin", "admin", ok), route("GET", "/x/accounts", "accounts", ok), route("GET", "/x/office", "office", ok), route("GET", "/x/orders", "orders", ok)],
  };
  const dung = (staff: StaffProfile) => createApp({
    modules: [mod],
    currentStaff: async () => ({ staff, sessionId: "phien-thu" }),
    injected: {
      isAssigned: async () => false, banHang: () => ({}) as never, newOrderHandler: async () => ({ ok: false, message: "không dùng" }), ordersWithHandler: async () => new Set<string>(),
      handledOrderIdsOf: async () => [], maintenanceBlock: async (_e: unknown, s: StaffProfile) => (quyenCongBaoTri.push([...s.permissions]), null), partyAccount: async () => ({ linked: false }), baoThayDoi: async () => {}, dongBangTin: async () => {},
      giaoLoDay: async () => [], mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia", canhBaoPhut: 120 }),
    } as never,
  });
  const goi = async (staff: StaffProfile, p: string) => (await dung(staff).fetch(new Request(`http://x${p}`), {} as Env, {} as ExecutionContext)).status;
  const goc: StaffProfile = { id: CHU, fullName: "Chủ", phone: SDT, partyId: null, permissions: ["SUPER_ADMIN"] };
  for (const p of ["/x/staff", "/x/admin", "/x/accounts", "/x/office", "/x/orders"]) assert.equal(await goi(goc, p), 200, `Toàn quyền không đóng vai bị chặn ở ${p}`);
  let soChan = 0;
  for (const vai of VAI_CHON_DUOC) {
    const dongVai: StaffProfile = { ...goc, permissions: quyenHieuLuc(["SUPER_ADMIN"], vai), actingRole: vai, realPermissions: ["SUPER_ADMIN"] };
    const that: StaffProfile = { ...goc, permissions: boThat(vai) };
    for (const p of ["/x/staff", "/x/admin", "/x/accounts", "/x/office", "/x/orders"]) {
      const a = await goi(dongVai, p);
      assert.equal(a, await goi(that, p), `đóng vai ${vai}: cổng ${p}`);
      if (a === 403) soChan++;
    }
  }
  assert.ok(soChan >= 20, `cổng chặn quá ít (${soChan}) — bài không phân biệt được`);
  // Ghim Đ3: cổng bảo trì nhận quyền THẬT (Toàn quyền) dù phiên đang đóng vai — ngược với các cổng trên. Hành vi đầu-cuối khoá thêm ở src/modules/auth/xem-nhu-vai-phien.test.ts.
  quyenCongBaoTri.length = 0;
  for (const vai of VAI_CHON_DUOC) await goi({ ...goc, permissions: quyenHieuLuc(["SUPER_ADMIN"], vai), actingRole: vai, realPermissions: ["SUPER_ADMIN"] }, "/x/staff");
  assert.equal(quyenCongBaoTri.length, VAI_CHON_DUOC.length);
  for (const q of quyenCongBaoTri) assert.deepEqual(q, ["SUPER_ADMIN"], "cổng bảo trì phải nhận quyền THẬT khi đang đóng vai");
});

for (const vai of VAI_CHON_DUOC) {
  test(`(b) đóng vai ${vai}: mọi route trả cùng mã trạng thái như tài khoản thật chỉ giữ ${boThat(vai).join("+")}`, async () => {
    const routes = await bangRoute();
    const a = await quet(vai, true, routes);
    const b = await quet(vai, false, routes);
    const lech: string[] = [];
    let soMien = 0;
    for (const r of routes) {
      const k = khoa(r);
      if (MIEN.some((m) => m.khoa === k && (m.vai === null || m.vai.includes(vai)))) {
        soMien++;
        continue;
      }
      if (a.get(k) !== b.get(k)) lech.push(`${k} [${r.access}]: đóng vai ${a.get(k)} ≠ tài khoản thật ${b.get(k)}`);
    }
    assert.deepEqual(lech, [], `đóng vai ${vai} khác tài khoản thật ở ${lech.length} route`);
    assert.ok(routes.length - soMien >= SO_ROUTE - MIEN.length);
  });
}

test("(b) đối chứng: chủ KHÔNG bật vai khác hẳn tài khoản Quản trị thật ở nhiều route (bài quét có răng)", async () => {
  const routes = await bangRoute();
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: SDT, name: "Chủ", perms: ["SUPER_ADMIN"] });
  const a = new Map<string, number>();
  for (const r of routes) {
    try { a.set(khoa(r), (await w.call(r.method, duongThu(r.path), { as: CHU, body: r.method === "GET" ? undefined : {} })).status); } catch { a.set(khoa(r), -1); }
  }
  const b = await quet("ADMIN", false, routes);
  const lech = routes.filter((r) => String(a.get(khoa(r))) !== b.get(khoa(r))).map(khoa);
  assert.ok(lech.length >= 20, `chỉ ${lech.length} route khác — bài quét không phân biệt được Toàn quyền với Quản trị`);
  assert.ok(lech.includes("GET /api/audit"), "GET /api/audit phải khác (chỉ Toàn quyền xem Nhật ký)");
});

// ---- (c) ca có dữ liệu thật ---------------------------------------------------------------------------------------------------------------------
/** Thế giới có chủ (đã bật vai `vai` trên phiên hiện hành) và các tài khoản phụ. */
async function theGioi(vai: PermissionCode | null, them: readonly { id: string; phone: string; name: string; perms: PermissionCode[] }[] = []) {
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: SDT, name: "Chủ", perms: ["SUPER_ADMIN"] });
  for (const t of them) seedStaff(w.sqlite, t);
  if (vai) {
    const r = await w.call("POST", DUONG_VAI, { as: CHU, body: { role: vai } });
    assert.equal(r.status, 200, r.text);
  }
  return w;
}

// Góp ý / Kỹ thuật chỉ Toàn quyền (ADR-0038; ô feedback.triage, feedback.team.manage, audit.view). Route không tham số ⇒ quyết định là cổng/ô quyền, không phải 404.
const CHI_TOAN_QUYEN: readonly [string, string][] = [
  ["GET", "/api/feedback"], // hàng chờ Góp ý
  ["GET", "/api/feedback/admin/teams"],
  ["POST", "/api/feedback/admin/teams"],
  ["GET", "/api/feedback/tep-cho-xoa"],
  ["POST", "/api/feedback/tep-cho-xoa/chay-lai"],
  ["GET", "/api/audit"], // Nhật ký (ADR-0038 điều 6)
];
test("(c) Góp ý / Kỹ thuật / Nhật ký chỉ Toàn quyền: đóng bất kỳ vai nào trong 10 → 403; không đóng vai → qua được cổng", async () => {
  const w0 = await theGioi(null);
  for (const [m, p] of CHI_TOAN_QUYEN) {
    const r = await w0.call(m, p, { as: CHU, body: m === "GET" ? undefined : {} });
    assert.notEqual(r.status, 403, `Toàn quyền không đóng vai bị 403 ở ${m} ${p}: ${r.text}`);
  }
  for (const vai of VAI_CHON_DUOC) {
    const w = await theGioi(vai);
    for (const [m, p] of CHI_TOAN_QUYEN) {
      const r = await w.call(m, p, { as: CHU, body: m === "GET" ? undefined : {} });
      assert.equal(r.status, 403, `đóng vai ${vai}: ${m} ${p} → ${r.status} ${r.text}`);
    }
  }
});

// Quyền tiền chỉ Toàn quyền (ADR-0090): ô deposit.outside.record, credit.ceiling.write, billing.partner_channel.write.
const QUYEN_TIEN: readonly [string, string][] = [
  ["POST", `/api/orders/${KHONG_CO}/coc/hoan-ngoai`],
  ["POST", "/api/tra-sau/muc-toi-da"],
  ["POST", "/api/kenh-thu-doi-tac"],
];
test("(c) quyền tiền chỉ Toàn quyền: đóng Quản trị → 403 như Quản trị thật; không đóng vai → không 403", async () => {
  const ADM = "33333333-3333-4333-8333-333333333333";
  const w0 = await theGioi(null, [{ id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] }]);
  const w = await theGioi("ADMIN");
  for (const [m, p] of QUYEN_TIEN) {
    assert.notEqual((await w0.call(m, p, { as: CHU, body: {} })).status, 403, `Toàn quyền bị 403 ở ${m} ${p}`);
    assert.equal((await w0.call(m, p, { as: ADM, body: {} })).status, 403, `Quản trị thật không bị 403 ở ${m} ${p}`);
    const r = await w.call(m, p, { as: CHU, body: {} });
    assert.equal(r.status, 403, `đóng vai Quản trị: ${m} ${p} → ${r.status} ${r.text}`);
  }
});

test("(c) đóng Bán hàng: không tới được route của Quản trị (admin.manage, cổng admin / accounts)", async () => {
  const w = await theGioi("SALES");
  for (const [m, p] of [["GET", "/api/catalog/admin"], ["GET", "/api/dispatch/han-muc-tu-choi"], ["GET", "/api/staff"], ["POST", "/api/staff"], ["POST", "/api/thong-bao"], ["GET", "/api/audit"]] as const) {
    const r = await w.call(m, p, { as: CHU, body: m === "GET" ? undefined : {} });
    assert.equal(r.status, 403, `${m} ${p} → ${r.status} ${r.text}`);
  }
});

// Xác minh phiếu tự khai (ADR-0125): người xét lấy quyền từ PHIÊN, không từ danh sách tài khoản đọc từ CSDL (parties/index.ts nguoiXetCuaPhien).
const ADM2 = "33333333-3333-4333-8333-333333333332"; // Quản trị — chủ phiếu (Quản trị / Nhân sự không quản được: cấp bậc)
const NV = "11111111-1111-4111-8111-111111111112"; // Bán hàng do chủ tạo (chủ đã "chạm" tài khoản này)
const AT = "2026-10-10T00:00:00.000Z";
const GUI = "2026-10-16T08:00:00.000Z";
function phieuNgaySinh(w: any, owner: string): string {
  const id = crypto.randomUUID();
  w.sqlite.exec(`INSERT OR IGNORE INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${CHU}', '${AT}', '${CHU}')`);
  w.sqlite.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'pol', 'DONG_Y', ?, ?, ?, ?)").run(crypto.randomUUID(), `pty-${owner}`, AT, owner, AT, owner);
  w.sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'NGAY_SINH', 'pol', '1990-05-06', 'CHO_XAC_MINH', ?, ?, ?, ?)`).run(id, `pty-${owner}`, GUI, owner, GUI, owner);
  return id;
}
for (const vai of ["ADMIN", "HR"] as const) {
  test(`(c) xác minh phiếu tự khai, đóng ${vai}: phiếu của Quản trị (ngoài cấp bậc) không hiện, không mở, không quyết — như ${vai} thật`, async () => {
    const that = "99999999-9999-4999-8999-999999999999";
    const phu = [
      { id: ADM2, phone: "0900000016", name: "Quản Trị Hai", perms: ["ADMIN"] as PermissionCode[] },
      { id: that, phone: "0900000013", name: "Đối Chiếu", perms: [vai] as PermissionCode[] },
    ];
    const w = await theGioi(vai, phu);
    const p = phieuNgaySinh(w, ADM2);
    // Đối chiếu: tài khoản thật giữ đúng vai.
    assert.equal((await w.call("GET", `/api/parties/xac-minh/${p}`, { as: that })).status, 404);
    // Chủ đang đóng vai: phải y hệt.
    const ds = await w.call("GET", "/api/parties/xac-minh?trang=cho", { as: CHU });
    assert.equal(ds.status, 200, ds.text);
    assert.ok(!ds.json.phieu.some((x: any) => x.id === p), "hàng chờ của chủ đang đóng vai vẫn hiện phiếu ngoài cấp bậc");
    assert.equal((await w.call("GET", `/api/parties/xac-minh/${p}`, { as: CHU })).status, 404);
    assert.equal((await w.call("POST", `/api/parties/xac-minh/${p}/chap-nhan`, { as: CHU, body: {} })).status, 404);
    assert.equal(w.q("SELECT status FROM pty_self_submission WHERE id = ?", p)[0].status, "CHO_XAC_MINH");
  });
}
test("(c) xác minh phiếu tự khai, đóng Quản trị: tài khoản chủ đã chạm (tạo) thì bị tách nhiệm vụ như người thường — Toàn quyền thật thì được", async () => {
  const w = await theGioi("ADMIN", [{ id: NV, phone: "0900000017", name: "Nhân Viên", perms: ["SALES"] }]);
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, 'staff_created', 'staff', ?, NULL, ?)").run(crypto.randomUUID(), CHU, NV, AT);
  const p = phieuNgaySinh(w, NV);
  const r = await w.call("GET", `/api/parties/xac-minh/${p}`, { as: CHU });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.xacMinhDuoc, false, `đóng Quản trị mà vẫn được miễn tách nhiệm vụ: ${r.text}`);
  assert.equal((await w.call("POST", `/api/parties/xac-minh/${p}/chap-nhan`, { as: CHU, body: {} })).status, 409);
  // Thoát vai ⇒ Toàn quyền thật miễn tách nhiệm vụ (đối chứng: bài không đỏ vì lý do khác).
  assert.equal((await w.call("DELETE", DUONG_VAI, { as: CHU })).status, 200);
  const r2 = await w.call("GET", `/api/parties/xac-minh/${p}`, { as: CHU });
  assert.equal(r2.json.xacMinhDuoc, true, r2.text);
});

// Chọn người phụ trách lúc lập đơn (ADR-0030 S20-4): `newOrderHandler` xét người ĐƯỢC CHỌN theo quyền THẬT trong CSDL (đúng — đó là tài khoản đích). Khi đích là chính chủ đang
// đóng vai, chỗ đó sẽ thấy Toàn quyền; nhưng cổng chọn người phụ trách (dispatch.assign) đứng TRƯỚC và theo bộ hiệu lực, và mọi vai qua được cổng đó (Bán hàng, Quản trị)
// đều là người được giao hợp lệ ⇒ không lọt. Bài này khoá điều đó cho vai lập được đơn nhưng không được chọn người phụ trách.
for (const vai of ["INTERN", "PARTNER"] as const) {
  test(`(c) lập đơn, đóng ${vai}: tự chọn mình làm người phụ trách bị chặn như ${vai} thật (403 trước khi xét người được chọn)`, async () => {
    const TT = "99999999-9999-4999-8999-999999999999";
    const w = await theGioi(vai, [{ id: TT, phone: "0900000009", name: "Đối Chiếu", perms: [vai] }]);
    w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
    const ngay = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 10);
    const than = (h: string) => ({ customerName: "Khách Thử", customerPhone: "0912345678", handlerStaffId: h,
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: ngay }] });
    const that = await w.call("POST", "/api/orders", { as: TT, body: than(TT) });
    assert.equal(that.status, 403, `đối chiếu ${vai} thật: ${that.text}`);
    const dong = await w.call("POST", "/api/orders", { as: CHU, body: than(CHU) });
    assert.equal(dong.status, 403, `đóng ${vai}: ${dong.text}`);
    assert.equal(dong.json.error.code, that.json.error.code);
    assert.equal(w.q("SELECT count(*) n FROM orders")[0].n, 0);
  });
}
