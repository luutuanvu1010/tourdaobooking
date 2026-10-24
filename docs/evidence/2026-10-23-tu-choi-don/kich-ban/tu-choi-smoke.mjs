// Kịch bản Chrome (bằng chứng giao diện) cho nút «Từ chối đơn» — ADR-0030 điều 1, kế hoạch docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong.md TC-11.
// Q5 (a) chủ 2026-10-23: dùng lại khuôn hộp «Huỷ đơn này»; ảnh điện thoại (390) + máy tính (1040) để chủ duyệt trước phát hành. Kiểm:
//   1  (390) HDV A — thẻ «Đơn của tôi»: nút «Từ chối đơn» chỉ ở đơn đã xác nhận đi sau ngày mai; KHÔNG ở đơn đi ngày mai, đơn chờ xác nhận;
//   2  (390) mở hộp: bốn lý do đúng chữ, «Xác nhận từ chối» khoá tới khi chọn; «Không từ chối» đóng không gửi gì;
//   3  (390) chọn «Bận lịch khác» → xác nhận → thẻ biến khỏi «Đơn của tôi»; trang HDV B (mở TRƯỚC, Bảng tin) thấy đơn ở «Đơn chờ nhận» trong ≤ 5 giây,
//      chip «Chờ nhận · được trả lại» và thông báo nổi «… vừa được trả lại, đang chờ người nhận»;
//   4  (390) hộp đang mở mà đơn vừa đổi ngày đi thành ngày mai → máy chủ 409: hộp giữ mở, hiện đúng câu «… Gọi văn phòng để đổi người.»; không mã thô;
//   5  (1040) trang đơn — Bán hàng KHÔNG phụ trách không thấy nút; Bán hàng ĐANG phụ trách thấy «Từ chối đơn» ở khối «Người phụ trách», hộp giữa màn,
//      trả đơn → khối hiện chip «Chờ nhận · được trả lại»;
//   6  (1040) HDV A — hộp Từ chối trên máy tính (ảnh), Esc đóng không gửi.
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs) và mẫu step() ✓/✗ (không dừng ở bước hỏng đầu tiên).
// Các trang dùng CHUNG kho cookie: trang của tài khoản nào phải mở SAU CÙNG (B mở trước A; Bán hàng B trước Bán hàng A).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=<chrome> node docs/evidence/2026-10-23-tu-choi-don/kich-ban/tu-choi-smoke.mjs
// Không cần mạng ngoài (D1 tạm, danh mục giả). Ghi ảnh vào $OUT/anh/*.png (mặc định thư mục bằng chứng này).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-23-tu-choi-don";
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
// Số 0900000201–209, 261, 271, 277, 281, 282 đã có kịch bản khác dùng.
const HDV_A = { name: "Lê Thị Từ Chối", phone: "0900000291", pin: "246891", permissions: ["FIELD"] };
const HDV_B = { name: "Phan Văn Nhận", phone: "0900000292", pin: "246892", permissions: ["FIELD"] };

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const shotView = async (p, name) => {
  await sleep(450);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};
const shotFull = async (p, name) => {
  await sleep(450);
  await p.shot(join(OUT, "anh", name));
};
const t = (expr) => `(() => { const el = ${expr}; return el ? el.innerText.replace(/\\s+/g, " ").trim() : null; })()`;
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
/** axe-core: không vi phạm critical/serious (thiếu AXE_JS → bỏ, in rõ ở cuối). */
const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
  // Khuôn của v1-nguoi-phu-trach.mjs: chủ khoá phóng to (9ae19510, 30/9) → axe luôn báo `meta-viewport` trên đúng thẻ meta với đúng chuỗi đã duyệt — chỉ bỏ ĐÚNG vi phạm đó.
  const viewport = await p.ev("document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? null");
  const conLai = v.filter((x) => !(x.id === "meta-viewport" && x.nodes === 1 && x.mau.length === 1 && x.mau[0] === 'meta[name="viewport"]' && viewport === VIEWPORT_DA_DUYET));
  assert.deepEqual(conLai.filter((x) => x.impact === "critical" || x.impact === "serious"), [], `axe (${label})`);
};
const VIEWPORT_DA_DUYET = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no";
const RAW = /stale|too_late|forbidden|cancelled|order_not_confirmed|invalid_input/;

const env = await startEnv();
const pages = [];
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of [HDV_A, HDV_B]) for (const stmt of (await insertStaffSql(a)).split("\n")) if (stmt.trim()) env.sql(stmt);
  const [a] = env.sql(`SELECT id FROM staff WHERE phone = '${HDV_A.phone}'`);
  const [salesA] = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
  const td101 = (departDate) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate, pickupChoice: "KHONG_DON" });
  const newOrder = async (customerName, departDate, handlerStaffId, confirm = true) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName, customerPhone: "0912448306", services: [td101(departDate)], handlerStaffId });
    assert.equal(r.status, 201, `lập đơn ${customerName}: ${JSON.stringify(r.json)}`);
    if (confirm) assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" })).status, 200);
    return r.json.order;
  };
  const R1 = await newOrder("Khách Trả Một", vnDate(3), a.id);
  const R2 = await newOrder("Khách Ngày Mai", vnDate(1), a.id);
  const R3 = await newOrder("Khách Chờ Xác Nhận", vnDate(4), a.id, false);
  const R4 = await newOrder("Khách Đổi Ngày", vnDate(5), a.id);
  const R5 = await newOrder("Khách Văn Phòng", vnDate(6), salesA.id);
  const R6 = await newOrder("Khách Máy Tính", vnDate(7), a.id);
  console.log(`  (dữ liệu: ${R1.orderCode} +3, ${R2.orderCode} +1, ${R3.orderCode} nháp, ${R4.orderCode} +5, ${R5.orderCode} Bán hàng phụ trách, ${R6.orderCode} +7)`);

  const mineBtns = (o) => `[...(document.querySelector('#cua-toi .hdv-card[data-order-id="${o.id}"]')?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim())`;
  const openAccount = async (acc, viewport) => {
    const p = await env.as(acc, "/account", viewport);
    pages.push(p);
    await p.waitFor("!document.querySelector('#myjobs').hidden && document.querySelectorAll('#cua-toi .hdv-card').length > 0", "Việc của tôi dựng xong", 15000);
    return p;
  };

  // B mở TRƯỚC (kho cookie chung) — chỉ để nhận Bảng tin; A mở sau cùng và thao tác.
  const pb = await openAccount(HDV_B, MOB).catch(async () => {
    // B chưa có đơn nào của mình: chờ khối hiện (hàng chờ có thể rỗng)
    const p = pages.at(-1);
    await p.waitFor("!document.querySelector('#myjobs').hidden", "khối Việc của tôi của B", 15000);
    return p;
  });
  await sleep(1500); // Bảng tin nối WebSocket
  const pa = await openAccount(HDV_A, MOB);

  await step("1", "390 HDV A: «Từ chối đơn» chỉ ở đơn đã xác nhận đi sau ngày mai; không ở đơn đi ngày mai, không ở đơn chờ xác nhận", async () => {
    assert.ok((await pa.ev(mineBtns(R1))).includes("Từ chối đơn"), JSON.stringify(await pa.ev(mineBtns(R1))));
    assert.ok(!(await pa.ev(mineBtns(R2))).includes("Từ chối đơn"), "đơn đi ngày mai không có nút");
    assert.deepEqual(await pa.ev(mineBtns(R3)), [], "đơn chờ xác nhận không nút nào");
    await shotFull(pa, "390-1-don-cua-toi.png");
  });

  await step("2", "390 hộp Từ chối: bốn lý do đúng chữ, «Xác nhận từ chối» khoá tới khi chọn; «Không từ chối» đóng, không gửi gì", async () => {
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${R1.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open')", "hộp mở");
    assert.equal(await pa.ev(t("document.querySelector('.sheet-title')")), `Từ chối đơn ${R1.orderCode}?`);
    assert.deepEqual(await pa.ev("[...document.querySelectorAll('.sheet .pick-name')].map((x) => x.textContent)"), ["Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác"]);
    assert.equal(await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').disabled"), true);
    assert.equal(await pa.ev("document.querySelectorAll('.sheet input[type=text], .sheet textarea').length"), 0, "không có ô chữ");
    await shotView(pa, "390-2-hop-tu-choi.png");
    await axe(pa, "hộp Từ chối 390");
    const truoc = pa.requests.length;
    await pa.ev("[...document.querySelectorAll('.sheet button')].find((b) => b.textContent.trim() === 'Không từ chối').click()");
    await pa.waitFor("!document.querySelector('.sheet-root')", "hộp đóng");
    assert.ok(!pa.requests.slice(truoc).some((r) => r.url.includes("handler-refuse")), "không gửi lệnh");
  });

  await step("3", "390 chọn lý do → xác nhận: thẻ biến khỏi «Đơn của tôi»; HDV B thấy đơn ở hàng chờ ≤ 5 giây, chip «Chờ nhận · được trả lại», thông báo nổi", async () => {
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${R1.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open')", "hộp mở");
    await pa.ev("document.querySelector('.sheet input[value=\"BAN_LICH\"]').click()");
    assert.equal(await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').disabled"), false);
    await shotView(pa, "390-3a-da-chon-ly-do.png");
    const bat = Date.now();
    await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await pa.waitFor(`!document.querySelector('.sheet-root') && !document.querySelector('#cua-toi .hdv-card[data-order-id="${R1.id}"]')`, "thẻ biến mất", 8000);
    assert.match(await pa.ev(t("document.querySelector('#cua-toi .banner:not([hidden])')")) ?? "", /Đã trả đơn .* Đơn quay về danh sách Chờ nhận\./);
    await shotFull(pa, "390-3b-sau-khi-tra.png");
    const theB = `[...document.querySelectorAll('#cho-nhan .hdv-collapse:not(.is-leaving) .hdv-card')].find((c) => c.textContent.includes(${JSON.stringify(R1.orderCode)}))`;
    await pb.waitFor(theB, "đơn hiện ở hàng chờ của B", 5000);
    const giay = (Date.now() - bat) / 1000;
    assert.equal(await pb.ev(t(`${theB}?.querySelector('.hdv-chip')`)), "Chờ nhận · được trả lại");
    await pb.waitFor("[...document.querySelectorAll('.toast')].some((x) => x.textContent.includes('vừa được trả lại, đang chờ người nhận'))", "thông báo nổi ở B", 5000);
    console.log(`    (đơn tới hàng chờ của B sau ${giay.toFixed(1)} giây)`);
    await pb.send("Page.bringToFront");
    await shotView(pb, "390-3c-hdv-khac-thay-tra-lai.png");
    const db = env.sql(`SELECT detail FROM audit_log WHERE order_id = '${R1.id}' AND action = 'order_handler_refused'`);
    assert.deepEqual(db, [{ detail: "Bận lịch khác" }]);
  });

  await step("4", "390 hộp đang mở mà đơn vừa đổi ngày đi thành ngày mai → máy chủ 409: hộp giữ mở, hiện đúng câu «… Gọi văn phòng để đổi người.»", async () => {
    await pa.send("Page.bringToFront");
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${R4.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open')", "hộp mở");
    env.sql(`UPDATE order_service SET depart_date = '${vnDate(1)}' WHERE order_id = '${R4.id}'`);
    await pa.ev("document.querySelector('.sheet input[value=\"KHONG_PHU_HOP\"]').click()");
    await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await pa.waitFor("!document.querySelector('.sheet .alert').hidden", "câu lỗi trong hộp", 8000);
    const cau = await pa.ev(t("document.querySelector('.sheet .alert')"));
    assert.equal(cau, "Đơn đi hôm nay hoặc ngày mai — không trả được nữa. Gọi văn phòng để đổi người.");
    assert.doesNotMatch(cau, RAW);
    assert.ok(await pa.ev("!!document.querySelector('.sheet-root')"), "hộp vẫn mở");
    await shotView(pa, "390-4-qua-han.png");
    await pa.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await pa.waitFor("!document.querySelector('.sheet-root')", "Esc đóng");
  });

  // Máy tính: Bán hàng B (không phụ trách) mở TRƯỚC, Bán hàng A (đang phụ trách R5) mở SAU.
  await step("5", "1040 trang đơn: Bán hàng không phụ trách không thấy nút; Bán hàng đang phụ trách thấy «Từ chối đơn», hộp giữa màn, trả đơn → chip «Chờ nhận · được trả lại»", async () => {
    const btns = "[...document.querySelectorAll('.handler-card button')].map((b) => b.textContent.trim())";
    const sb = await env.as(ACCOUNTS.salesB, `/order?id=${R5.id}`, DESK);
    pages.push(sb);
    await sb.waitFor("document.querySelector('.handler-card .handler-name')", "khối người phụ trách", 15000);
    assert.ok(!(await sb.ev(btns)).includes("Từ chối đơn"), JSON.stringify(await sb.ev(btns)));
    const sa = await env.as(ACCOUNTS.salesA, `/order?id=${R5.id}`, DESK);
    pages.push(sa);
    await sa.waitFor("document.querySelector('.handler-card .handler-name')", "khối người phụ trách", 15000);
    assert.ok((await sa.ev(btns)).includes("Từ chối đơn"), JSON.stringify(await sa.ev(btns)));
    await shotFull(sa, "1040-5a-trang-don-co-nut.png");
    await sa.ev("document.querySelector('[data-action=\"refuse-handler\"]').click()");
    await sa.waitFor("document.querySelector('.sheet-root.open')", "hộp mở");
    const rect = await sa.ev("(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { left: r.left, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; })()");
    assert.ok(Math.abs(rect.left - rect.right) <= 2 && rect.bottom > 20, `hộp giữa màn: ${JSON.stringify(rect)}`);
    await sa.ev("document.querySelector('.sheet input[value=\"OTHER\"]').click()");
    await shotView(sa, "1040-5b-hop-tu-choi.png");
    await axe(sa, "hộp Từ chối 1040");
    await sa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await sa.waitFor("(document.querySelector('.handler-card .chip')?.textContent ?? '') === 'Chờ nhận · được trả lại'", "chip được trả lại", 10000);
    assert.match(await sa.ev(t("document.querySelector('#error')")) ?? "", /Đã trả đơn\. Đơn quay về danh sách Chờ nhận\./);
    await shotFull(sa, "1040-5c-sau-khi-tra.png");
  });

  await step("6", "1040 HDV A: hộp Từ chối trên máy tính (giữa màn), Esc đóng không gửi", async () => {
    const pd = await openAccount(HDV_A, DESK);
    await pd.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${R6.id}"] [data-action="tu-choi"]').click()`);
    await pd.waitFor("document.querySelector('.sheet-root.open')", "hộp mở");
    await shotView(pd, "1040-6-hop-tu-choi-hdv.png");
    const truoc = pd.requests.length;
    await pd.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await pd.waitFor("!document.querySelector('.sheet-root')", "Esc đóng");
    assert.ok(!pd.requests.slice(truoc).some((r) => r.url.includes("handler-refuse")));
    assert.ok(env.sql(`SELECT 1 FROM dsp_assignment WHERE order_id = '${R6.id}' AND valid_to_at IS NULL`).length === 1);
  });

  for (const p of pages) assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
} finally {
  for (const p of pages) p.close();
  await env.stop();
}
console.log(`\n${passed} bước đạt, ${failures} bước hỏng${AXE ? " — đã chạy axe" : " — CHƯA CHẠY AXE (thiếu AXE_JS)"}`);
process.exit(failures ? 1 : 0);
