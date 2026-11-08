// ADR-0184 việc 5 (8/11/2026) — thẻ «Xe thiếu giấy tờ — đã cho chạy» ở Trang chủ (máy tính 1040 + điện thoại 390). Kịch bản RIÊNG vì hai bản trang-chu-smoke.mjs cũ đã đỏ sẵn
// từ trước việc này (token --w-main không còn ở bản 09-23; danh sách mục thanh bên đổi ở bản đợt 0) nên một bước thêm vào đó không bao giờ chạy tới.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-11-07-adr-0184/kich-ban/trang-chu-the-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "/tmp/trang-chu-the-smoke";
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const shot = async (p, name) => writeFileSync(join(OUT, "anh", name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

const env = await startEnv();
try {

  // ADR-0184 việc 5 (8/11/2026): thẻ «Xe thiếu giấy tờ — đã cho chạy» ở «Đang chờ bạn» — Quản trị thấy, Bán hàng không (và không gọi route đếm). Số của route do bài
  // src/modules/van-chuyen/cho-chay-thieu-giay-route.test.ts kiểm trên SQLite thật; ở đây trang chỉ được TIÊM trả lời giả {count: 2} của route đó (không gieo chuyến xe),
  // để kiểm cách vẽ thẻ, đích bấm /dieu-phoi và cổng ẩn/hiện theo vai.
  {
    const DEM = "/api/van-chuyen/cho-chay-thieu/dem";
    const moTrang = async (account, viewport) => {
      const p = await env.openPage(viewport);
      const c = await env.login(account);
      await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
      await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const f = window.fetch; window.__dem = 0; window.fetch = (u, o) => String(u).includes(${JSON.stringify(DEM)}) ? (window.__dem++, Promise.resolve(new Response(JSON.stringify({ count: 2 }), { status: 200, headers: { "content-type": "application/json" } }))) : f(u, o); })();` });
      await p.send("Page.navigate", { url: env.base + "/" });
      await p.waitFor("document.readyState === 'complete' && !!document.querySelector('#dash-grid') && !document.querySelector('#dash-grid').hidden", "Trang chủ dựng xong", 20000);
      return p;
    };
    const dongThe = `document.querySelector('#dash-dang-cho-ds [data-khoa="choChayThieu"]')`;
    const pQt = await moTrang(ACCOUNTS.admin, DESK);
    await pQt.waitFor(`!!${dongThe}`, "thẻ «Xe thiếu giấy tờ — đã cho chạy» hiện cho Quản trị");
    const the = await pQt.ev(`(() => { const e = ${dongThe}; return { nhan: e.querySelector('.dash-dc-nhan').innerText.replace(/\\s+/g, ' ').trim(), so: e.querySelector('.dash-dc-so').innerText.trim(), phu: e.querySelector('.dash-dc-phu').innerText.trim(), href: new URL(e.href).pathname }; })()`);
    assert.match(the.nhan, /^Xe thiếu giấy tờ — đã cho chạy/, JSON.stringify(the));
    assert.equal(the.so, "2");
    assert.equal(the.href, "/dieu-phoi", "bấm thẻ tới Điều phối xe");
    assert.ok(!/\d{6,}|INSPECTION|TPL_INSURANCE/.test(the.phu), "dòng phụ không số giấy tờ");
    assert.ok((await pQt.ev("window.__dem")) >= 1, "Quản trị có gọi route đếm");
    assert.equal(await pQt.ev("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true);
    await shot(pQt, "adr0184-trang-chu-the-may-tinh.png");
    pQt.close();
    const pDt = await moTrang(ACCOUNTS.admin, MOB);
    const hienDt = await pDt.ev(`(() => { const e = ${dongThe}; return !!e && e.offsetParent !== null; })()`);
    console.log(`· Trang chủ 390: thẻ choChayThieu ${hienDt ? "hiện" : "không hiện (khối «Đang chờ bạn» là của máy tính)"}`);
    pDt.close();
    const pBh = await moTrang(ACCOUNTS.salesA, DESK);
    assert.equal(await pBh.ev(`!!${dongThe}`), false, "Bán hàng KHÔNG thấy thẻ");
    assert.equal(await pBh.ev("window.__dem"), 0, "Bán hàng không gọi route đếm");
    pBh.close();
    ok("ADR-0184 việc 5: thẻ «Xe thiếu giấy tờ — đã cho chạy» (Quản trị thấy, số 2, bấm tới /dieu-phoi, dòng phụ không số giấy, không tràn ngang; Bán hàng không thấy và không gọi route đếm); ảnh adr0184-trang-chu-the-may-tinh.png (thẻ thuộc khối máy tính, 390 không có khối này)");
  }
} finally {
  await env.stop();
}
console.log("TRANG CHU THE SMOKE OK");
