// Kịch bản Chrome (bằng chứng giao diện) cho hạn mức «Từ chối» — ADR-0032 điều 8, 9, 10; kế hoạch docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md
// mục 6d, HM-16. Ảnh điện thoại (390) + máy tính (1040) để chủ duyệt trước phát hành. Kiểm:
//   1  (1040 + 390) Quản trị: trang Chính sách điều phối có thẻ «Hạn mức Từ chối của hướng dẫn viên» — bảng số lần, KHÔNG có ô cài đặt / nút «Đặt lại»;
//   2  (390) HDV A, chế độ «Chặn» 2/15: mở hộp Từ chối → dòng «Bạn còn được từ chối 2 đơn liên tiếp, 15 lần trong tuần này.»; từ chối đơn 1, đơn 2
//      («còn 1 … 14 …»); đơn 3: hộp hiện «còn 0 …», bấm vẫn được → câu «Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.», hộp còn mở; không mã thô;
//   3  (1040) Bán hàng (người lập) mở «Đổi người phụ trách» của đơn 1 → dưới tên HDV A có «Đã từ chối đơn này lúc … — Bận lịch khác»; đơn chưa ai từ chối → không có dòng;
//   4  (1040 + 390) Toàn quyền (mở SAU CÙNG — kho cookie chung): thẻ có ba chế độ, hai ô số, nút «Đặt lại» từng người + «Đặt lại tất cả»; số của HDV A đúng;
//      «Đặt lại» HDV A → liên tiếp về 0; đổi sang «Chỉ đo» → dòng tóm tắt đổi; không lộ OFF/MEASURE/BLOCK/REFUSE.
// Dùng lại startEnv()/ACCOUNTS của ../../2026-09-20-a2/kich-ban/a2-cdp.mjs. Không cần mạng ngoài (D1 tạm, danh mục giả).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=<chrome> node docs/evidence/2026-10-23-han-muc-tu-choi/kich-ban/han-muc-tu-choi-smoke.mjs
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-23-han-muc-tu-choi";
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const HDV_A = { name: "Đỗ Thị Hạn Mức", phone: "0900000295", pin: "246895", permissions: ["FIELD"] };
const HDV_B = { name: "Vũ Văn Đếm", phone: "0900000296", pin: "246896", permissions: ["FIELD"] };

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
const VIEWPORT_DA_DUYET = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no";
const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
  const viewport = await p.ev("document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? null");
  const conLai = v.filter((x) => !(x.id === "meta-viewport" && x.nodes === 1 && x.mau.length === 1 && x.mau[0] === 'meta[name="viewport"]' && viewport === VIEWPORT_DA_DUYET));
  assert.deepEqual(conLai.filter((x) => x.impact === "critical" || x.impact === "serious"), [], `axe (${label})`);
};
const RAW = /\b(OFF|MEASURE|BLOCK|REFUSE|ABORT|CLAIM|ASSIGN|BAN_LICH|OM_VIEC_RIENG|KHONG_PHU_HOP|refuse_limit|stale|forbidden)\b/;
const THE = "document.querySelector('#hm-the')";

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
  const td101 = (departDate) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate, pickupChoice: "KHONG_DON" });
  const newOrder = async (customerName, departDate, handlerStaffId) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName, customerPhone: "0912448306", services: [td101(departDate)], handlerStaffId });
    assert.equal(r.status, 201, `lập đơn ${customerName}: ${JSON.stringify(r.json)}`);
    assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" })).status, 200);
    return r.json.order;
  };
  // Chế độ «Chặn» 2/15 bằng route của Toàn quyền.
  const cs = await call(ACCOUNTS.chu, "POST", "/api/dispatch/han-muc-tu-choi/chinh-sach", { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 });
  assert.equal(cs.status, 200, JSON.stringify(cs.json));
  const D1 = await newOrder("Khách Hạn Một", vnDate(3), a.id);
  const D2 = await newOrder("Khách Hạn Hai", vnDate(4), a.id);
  const D3 = await newOrder("Khách Hạn Ba", vnDate(5), a.id);
  const D4 = await newOrder("Khách Chưa Ai Trả", vnDate(6), undefined);
  console.log(`  (dữ liệu: ${D1.orderCode}, ${D2.orderCode}, ${D3.orderCode} của HDV A; ${D4.orderCode} chưa ai phụ trách)`);

  await step("1", "Quản trị (1040 + 390): thẻ «Hạn mức Từ chối của hướng dẫn viên» có bảng số lần, KHÔNG có ô cài đặt / nút Đặt lại", async () => {
    for (const [vp, ten] of [[DESK, "1040-1-quan-tri.png"], [MOB, "390-1-quan-tri.png"]]) {
      const p = await env.as(ACCOUNTS.admin, "/chinh-sach-dieu-phoi", vp);
      pages.push(p);
      await p.waitFor(`${THE} && !${THE}.hidden && ${THE}.querySelector('.hm-row')`, "thẻ hạn mức dựng xong", 15000);
      assert.equal(await p.ev(t(`${THE}.querySelector('.hm-title')`)), "Hạn mức Từ chối của hướng dẫn viên");
      assert.equal(await p.ev(`${THE}.querySelectorAll('form, [data-dat-lai], [data-action="dat-lai-tat-ca"]').length`), 0, "Quản trị không thấy ô / nút");
      const ten2 = await p.ev(`[...${THE}.querySelectorAll('.hm-ten strong')].map((x) => x.textContent)`);
      assert.ok(ten2.includes(HDV_A.name) && ten2.includes(HDV_B.name), JSON.stringify(ten2));
      assert.doesNotMatch(await p.ev(t(THE)), RAW);
      await p.ev(`${THE}.scrollIntoView()`);
      await shotFull(p, ten);
      await axe(p, `trang Chính sách điều phối — Quản trị ${vp.width}`);
    }
  });

  await step("2", "390 HDV A (Chặn 2/15): hộp hiện «còn 2 … 15 …»; đơn 3 «còn 0 …», bấm → «… Hãy gọi văn phòng.», hộp còn mở", async () => {
    const pa = await env.as(HDV_A, "/account", MOB);
    pages.push(pa);
    await pa.waitFor(`document.querySelector('#cua-toi .hdv-card[data-order-id="${D1.id}"] [data-action="tu-choi"]')`, "thẻ đơn 1", 15000);
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${D1.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open') && !document.querySelector('[data-con-lai]').hidden", "hộp mở + dòng còn lượt", 8000);
    assert.equal(await pa.ev(t("document.querySelector('[data-con-lai]')")), "Bạn còn được từ chối 2 đơn liên tiếp, 15 lần trong tuần này.");
    // Vá sau kiểm độc lập: dòng «còn lượt» không dính sát chữ «Chọn lý do từ chối» — khoảng cách ≥ token --s3.
    const khe = await pa.ev(`(() => { const a = document.querySelector('[data-con-lai]').getBoundingClientRect(); const b = document.querySelector('.sheet .pick-legend').getBoundingClientRect();
      const s3 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s3')) * (getComputedStyle(document.documentElement).getPropertyValue('--s3').includes('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
      return { khe: b.top - a.bottom, s3 }; })()`);
    assert.ok(khe.khe >= khe.s3 - 1, `dòng còn lượt dính sát nhãn lý do: ${JSON.stringify(khe)}`);
    await shotView(pa, "390-2a-hop-con-luot.png");
    await axe(pa, "hộp Từ chối có dòng còn lượt");
    await pa.ev("document.querySelector('.sheet input[value=\"BAN_LICH\"]').click()");
    await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await pa.waitFor(`!document.querySelector('.sheet-root') && !document.querySelector('#cua-toi .hdv-card[data-order-id="${D1.id}"]')`, "trả đơn 1", 8000);
    // Đơn 2 cũng qua giao diện (đăng nhập API bằng HDV A sẽ đóng phiên của trình duyệt — tài khoản HDV chỉ một máy, ADR-0085).
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${D2.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open') && !document.querySelector('[data-con-lai]').hidden", "hộp đơn 2", 8000);
    assert.equal(await pa.ev(t("document.querySelector('[data-con-lai]')")), "Bạn còn được từ chối 1 đơn liên tiếp, 14 lần trong tuần này.");
    await pa.ev("document.querySelector('.sheet input[value=\"OM_VIEC_RIENG\"]').click()");
    await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await pa.waitFor(`!document.querySelector('.sheet-root') && !document.querySelector('#cua-toi .hdv-card[data-order-id="${D2.id}"]')`, "trả đơn 2", 8000);
    await pa.ev(`document.querySelector('#cua-toi .hdv-card[data-order-id="${D3.id}"] [data-action="tu-choi"]').click()`);
    await pa.waitFor("document.querySelector('.sheet-root.open') && !document.querySelector('[data-con-lai]').hidden", "hộp đơn 3", 8000);
    assert.equal(await pa.ev(t("document.querySelector('[data-con-lai]')")), "Bạn còn được từ chối 0 đơn liên tiếp, 13 lần trong tuần này.");
    await pa.ev("document.querySelector('.sheet input[value=\"KHONG_PHU_HOP\"]').click()");
    await pa.ev("document.querySelector('[data-action=\"xac-nhan-tu-choi\"]').click()");
    await pa.waitFor("!document.querySelector('.sheet .alert').hidden", "câu hết lượt", 8000);
    const cau = await pa.ev(t("document.querySelector('.sheet .alert')"));
    assert.equal(cau, "Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.");
    assert.doesNotMatch(cau, RAW);
    assert.ok(await pa.ev("!!document.querySelector('.sheet-root')"), "hộp vẫn mở");
    await shotView(pa, "390-2b-het-luot.png");
    assert.equal(env.sql(`SELECT count(*) AS n FROM dsp_assignment WHERE order_id = '${D3.id}' AND valid_to_at IS NULL`)[0].n, 1, "đơn 3 vẫn của HDV A");
    await pa.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await pa.waitFor("!document.querySelector('.sheet-root')", "Esc đóng");
  });

  await step("3", "1040 Bán hàng (người lập) — bảng đổi người phụ trách của đơn 1: «Đã từ chối đơn này lúc … — Bận lịch khác» dưới tên HDV A; đơn 4 không có dòng", async () => {
    const ps = await env.as(ACCOUNTS.salesA, `/order?id=${D1.id}`, DESK);
    pages.push(ps);
    await ps.waitFor("document.querySelector('[data-action=\"change-handler\"]')", "nút chọn người", 15000);
    await ps.ev("document.querySelector('[data-action=\"change-handler\"]').click()");
    await ps.waitFor("document.querySelector('.sheet-root.open') && document.querySelectorAll('.sheet .pick').length > 0", "danh sách người", 10000);
    const dong = await ps.ev(`(() => { const r = [...document.querySelectorAll('.sheet .pick')].find((x) => x.textContent.includes(${JSON.stringify(HDV_A.name)})); return r?.querySelector('.assignee-tu-choi')?.textContent ?? null; })()`);
    assert.match(dong ?? "", /^Đã từ chối đơn này lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4} — Bận lịch khác$/);
    assert.equal(await ps.ev("document.querySelectorAll('.sheet .assignee-tu-choi').length"), 1, "chỉ người đã Từ chối chính đơn này");
    await shotView(ps, "1040-3a-bang-chon-nguoi.png");
    await axe(ps, "bảng chọn người có dòng phụ");
    await ps.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await ps.waitFor("!document.querySelector('.sheet-root')", "Esc đóng");
    await ps.ev(`location.href = '/order?id=${D4.id}'`);
    await ps.waitFor("document.querySelector('[data-action=\"change-handler\"]')", "đơn 4", 15000);
    await ps.ev("document.querySelector('[data-action=\"change-handler\"]').click()");
    await ps.waitFor("document.querySelector('.sheet-root.open') && document.querySelectorAll('.sheet .pick').length > 0", "danh sách người đơn 4", 10000);
    await sleep(500);
    assert.equal(await ps.ev("document.querySelectorAll('.sheet .assignee-tu-choi').length"), 0);
  });

  await step("4", "Toàn quyền (mở SAU CÙNG): thẻ đủ ô + nút; số HDV A đúng; Đặt lại HDV A → liên tiếp 0; đổi «Chỉ đo» → tóm tắt đổi; 1040 + 390", async () => {
    const pt = await env.as(ACCOUNTS.chu, "/chinh-sach-dieu-phoi", DESK);
    pages.push(pt);
    await pt.waitFor(`${THE} && !${THE}.hidden && ${THE}.querySelector('form')`, "thẻ của Toàn quyền", 15000);
    assert.deepEqual(await pt.ev(`[...${THE}.querySelectorAll('.pick-name')].map((x) => x.firstChild.textContent)`), ["Tắt", "Chỉ đo", "Chặn"]);
    assert.equal(await pt.ev(`${THE}.querySelector('input[name=hm-che-do]:checked').value`), "BLOCK");
    const hang = `[...${THE}.querySelectorAll('.hm-row')].find((r) => r.textContent.includes(${JSON.stringify(HDV_A.name)}))`;
    const so = await pt.ev(`[...${hang}.querySelectorAll('.hm-gia-tri')].map((x) => x.textContent)`);
    assert.deepEqual(so.slice(0, 3), ["2", "0", "2"], `Từ chối tuần / Huỷ tuần / liên tiếp: ${JSON.stringify(so)}`);
    assert.match(so[3], /— Ốm \/ việc riêng$/);
    assert.ok(await pt.ev(`!!document.querySelector('[data-action="dat-lai-tat-ca"]')`));
    assert.doesNotMatch(await pt.ev(t(THE)), RAW);
    await pt.ev(`${THE}.scrollIntoView()`);
    await shotFull(pt, "1040-4a-toan-quyen.png");
    await axe(pt, "thẻ hạn mức Toàn quyền 1040");
    await pt.ev(`${hang}.querySelector('[data-dat-lai]').click()`);
    await pt.waitFor("document.querySelector('.sheet-root.open')", "hộp xác nhận đặt lại");
    assert.equal(await pt.ev(t("document.querySelector('.sheet-title')")), `Đặt lại số lần Từ chối của ${HDV_A.name}?`);
    await shotView(pt, "1040-4b-xac-nhan-dat-lai.png");
    await pt.ev("document.querySelector('[data-action=\"xac-nhan-dat-lai\"]').click()");
    await pt.waitFor(`!document.querySelector('.sheet-root') && !${THE}.querySelector('.alert.ok').hidden`, "đã đặt lại", 8000);
    assert.equal(await pt.ev(t(`${THE}.querySelector('.alert.ok')`)), "Đã đặt lại cho 1 người.");
    assert.deepEqual((await pt.ev(`[...${hang}.querySelectorAll('.hm-gia-tri')].map((x) => x.textContent)`)).slice(0, 3), ["0", "0", "0"]);
    await pt.ev(`${THE}.querySelector('input[value=MEASURE]').click()`);
    await pt.ev(`${THE}.querySelector('form button[type=submit]').click()`);
    await pt.waitFor(`(${THE}.querySelector('.hm-tom-tat')?.textContent ?? '').startsWith('Đang áp: Chỉ đo')`, "đã lưu Chỉ đo", 8000);
    assert.equal(await pt.ev(t(`${THE}.querySelector('.alert.ok')`)), "Đã lưu cài đặt hạn mức — có hiệu lực từ bây giờ.");
    const r = await call(HDV_A, "POST", `/api/orders/${D3.id}/handler-refuse`, { lyDo: "OTHER" });
    assert.equal(r.status, 200, "sau đặt lại: HDV A trả được đơn 3");
    const pm = await env.as(ACCOUNTS.chu, "/chinh-sach-dieu-phoi", MOB);
    pages.push(pm);
    await pm.waitFor(`${THE} && !${THE}.hidden && ${THE}.querySelector('form')`, "thẻ 390", 15000);
    await pm.ev(`${THE}.scrollIntoView()`);
    await shotFull(pm, "390-4c-toan-quyen.png");
    await axe(pm, "thẻ hạn mức Toàn quyền 390");
    const tran = await pm.ev("document.documentElement.scrollWidth - innerWidth");
    assert.ok(tran <= 0, `không cuộn ngang ở 390 (${tran})`);
  });

  for (const p of pages) assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
} finally {
  for (const p of pages) p.close();
  await env.stop();
}
console.log(`\n${passed} bước đạt, ${failures} bước hỏng${AXE ? " — đã chạy axe" : " — CHƯA CHẠY AXE (thiếu AXE_JS)"}`);
process.exit(failures ? 1 : 0);
