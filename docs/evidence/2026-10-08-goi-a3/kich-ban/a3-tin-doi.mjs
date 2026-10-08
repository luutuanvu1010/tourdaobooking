// Bằng chứng giao diện gói A3 (ADR-0062 Đ3–Đ4): hộp thông báo (chuông) hiện tin "đơn đổi sau xác nhận" bằng Chrome thật trên wrangler dev cục bộ
// (D1 tạm, danh mục giả — môi trường của `../../2026-09-20-a2/kich-ban/a2-cdp.mjs`; Turnstile TẮT; không cần mạng ngoài). Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-goi-a3/kich-ban/a3-tin-doi.mjs
// Dữ liệu: Sales Một lập đơn có chặng đón, xác nhận, giao HDV; Quản Trị đổi giờ đón rồi đổi nơi đón (nơi mới có chữ + dãy số); HDV sửa số khách 2 → 3.
//   a  Sales Một (người lập), khổ 390: ngăn "Của tôi" có đủ ba tin (giờ đón cũ → mới, "đổi nơi đón", số khách); KHÔNG có chữ / dãy số của nơi mới, không lý do; ảnh
//   b  HDV (người phụ trách), khổ 390: có tin giờ đón + đổi nơi đón của Quản Trị; KHÔNG có tin số khách (chính HDV sửa); bấm tin → trang Tôi (khuôn liên kết tin đơn
//      sẵn có cho người không phải văn phòng); ảnh
// Ghi: <OUT>/anh/a3-*.png và <OUT>/ket-qua-a3-tin-doi.json. Thoát mã 1 nếu có bước ✗. Không phải iPhone thật, không phải WebKit.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-08-goi-a3";
const ANH = join(OUT, "anh");
mkdirSync(ANH, { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const A = ACCOUNTS.salesA;
const ADMIN = ACCOUNTS.admin;
const HDV = { name: "HDV Tin Đổi", phone: "0900000231", pin: "246831", permissions: ["FIELD"] };
const NOI_MOI = "Nhà nghỉ Dò Tìm Mới 0905123456";
const LY_DO = "Khách Dò Tìm báo thêm người";

const results = { ghiChu: "Chrome headless trên wrangler dev cục bộ (D1 tạm); không phải iPhone thật, không phải WebKit.", buoc: [], do: {}, anh: {} };
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    results.buoc.push({ id, name, dat: true });
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
    results.buoc.push({ id, name, dat: false, loi: msg.slice(0, 1200) });
  }
}

const env = await startEnv();
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(HDV)).split("\n")) env.sql(stmt);
  const hdvId = env.sql(`SELECT id FROM staff WHERE phone = '${HDV.phone}'`)[0].id;
  env.sql(`INSERT OR IGNORE INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('ZA3T','Tour thử tin đổi','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,98,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')`);
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
  const OUTLEG = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm A3", dropoffLocationId: LOC, dropoffPlace: "" };
  const tao = await call(A, "POST", "/api/orders", {
    customerName: "Khách Tin Đổi A3", customerPhone: "0903 222 333", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "ZA3T", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, departDate: vnDate(7), departTime: "07:30", legs: [OUTLEG] }],
  });
  assert.equal(tao.status, 201, JSON.stringify(tao.json));
  const id = tao.json.order.id;
  const maDon = tao.json.order.orderCode;
  assert.equal((await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await call(A, "PUT", `/api/orders/${id}/handler`, { staffId: hdvId })).status, 200);
  const xem = async () => (await call(A, "GET", `/api/orders/${id}`)).json.order;
  const suaChang = async (body) => {
    const leg = (await xem()).services[0].legs.find((l) => l.direction === "OUT");
    const r = await call(ADMIN, "PUT", `/api/orders/${id}/legs/${leg.id}`, { expectedUpdatedAt: leg.updatedAt, leg: { pickupDate: leg.pickupDate, pickupTime: leg.pickupTime, pickupLocationId: null, pickupPlace: leg.pickupPlace, dropoffLocationId: LOC, dropoffPlace: "", ...body } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
  };
  await suaChang({ pickupTime: "07:15" });
  await sleep(5); // mỗi lệnh một mốc nhật ký (tin gộp theo đơn + người làm + mốc)
  await suaChang({ pickupPlace: NOI_MOI });
  const svId = (await xem()).services[0].id;
  const so = await call(HDV, "POST", `/api/orders/${id}/handler-money-edit`, { reason: LY_DO, services: [{ id: svId, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] });
  assert.equal(so.status, 200, JSON.stringify(so.json));

  /** Mở trang với phiên của `account`, bấm chuông, chờ ngăn "Của tôi" tải; trả trang + chữ các tin của đơn này. */
  const moHop = async (account) => {
    const p = await env.as(account, "/orders", M);
    p.vp = M;
    await p.waitFor("!!document.querySelector('button.bell')", "chuông hiện");
    await p.ev("document.querySelector('button.bell').click(), true");
    await p.waitFor("!!document.querySelector('.ntf-list') || !!document.querySelector('.ntf-empty')", "hộp thông báo tải xong", 10000);
    await sleep(400);
    const tin = await p.ev(`[...document.querySelectorAll('.ntf-list .ntf-txt')].map((x) => x.textContent).filter((t) => t.includes(${JSON.stringify(maDon)}))`);
    const toanHop = await p.ev("document.querySelector('.ntf-list')?.textContent ?? ''");
    return { p, tin, toanHop };
  };
  const chup = async (p, ten) => {
    await p.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 1, mobile: true });
    await sleep(500);
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(ANH, ten), Buffer.from(r.result.data, "base64"));
    results.anh[ten] = `${M.width}×${M.height}`;
  };

  await step("a", "người lập (Sales Một), khổ 390: ba tin đổi của đơn ở 'Của tôi'; không chữ / dãy số của nơi mới, không lý do", async () => {
    const { p, tin, toanHop } = await moHop(A);
    results.do.nguoiLap = tin;
    assert.ok(tin.some((t) => t.includes("giờ đón 06:30 → 07:15")), `có tin giờ đón cũ → mới: ${JSON.stringify(tin)}`);
    assert.ok(tin.some((t) => t.includes("đổi nơi đón")), `có tin 'đổi nơi đón': ${JSON.stringify(tin)}`);
    assert.ok(tin.some((t) => t.includes("số khách")), `có tin số khách: ${JSON.stringify(tin)}`);
    assert.ok(!/Dò Tìm Mới|0905123456/.test(toanHop), "hộp không có chữ / dãy số của nơi mới");
    assert.ok(!toanHop.includes("Dò Tìm báo"), "hộp không có lý do sửa số khách");
    await chup(p, "a3-hop-thu-nguoi-lap-390.png");
    p.close();
  });

  await step("b", "HDV (người phụ trách), khổ 390: tin giờ đón + đổi nơi đón của Quản Trị; không tin số khách (chính mình sửa); bấm tin → trang Tôi", async () => {
    const { p, tin } = await moHop(HDV);
    results.do.hdv = tin;
    assert.ok(tin.some((t) => t.includes("giờ đón 06:30 → 07:15")), `có tin giờ đón: ${JSON.stringify(tin)}`);
    assert.ok(tin.some((t) => t.includes("đổi nơi đón")), `có tin 'đổi nơi đón': ${JSON.stringify(tin)}`);
    assert.ok(!tin.some((t) => t.includes("số khách")), `KHÔNG có tin số khách của chính mình: ${JSON.stringify(tin)}`);
    await chup(p, "a3-hop-thu-hdv-390.png");
    await p.ev(`(() => { const b = [...document.querySelectorAll('.ntf-list button')].find((x) => x.textContent.includes(${JSON.stringify(maDon)}) && x.textContent.includes('đổi nơi đón')); b.click(); return true; })()`);
    // HDV không phải văn phòng: liên kết theo khuôn tin đơn sẵn có (`lienKet` = "/account" — "Việc của tôi"), như tin giao / xác nhận của chính HDV.
    await p.waitFor("location.pathname === '/account'", "bấm tin → mở trang Tôi (Việc của tôi), như các tin đơn khác của HDV", 10000);
    p.close();
  });
} finally {
  writeFileSync(join(OUT, "ket-qua-a3-tin-doi.json"), JSON.stringify(results, null, 2) + "\n");
  await env.stop();
}
console.log(failures ? `A3 TIN DOI: ${failures} bước ✗` : "A3 TIN DOI OK");
process.exit(failures ? 1 : 0);
