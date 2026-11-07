// Kiểm cảnh báo «Đang có N tên cho M khách» (7/11): trang đơn 390 + 1040, form nhập. Chạy từ GỐC repo: npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới 2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-11-07-canh-bao-qua-ten/kich-ban/canh-bao-smoke.mjs
import assert from "node:assert/strict";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
const env = await startEnv();
try {
  const c = await env.login(ACCOUNTS.salesA);
  const hdr = { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` };
  const NO = { departDate: vnDate(9), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const ten = (i) => ({ fullName: `Khách số ${i}`, birthYear: 1980 + i, paxCode: null });
  const mk = async (n) => (await (await fetch(env.base + "/api/orders", { method: "POST", headers: hdr, body: JSON.stringify({
    customerName: "Khách Thử", customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TTB06", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, ...NO }],
    passengers: Array.from({ length: n }, (_, i) => ten(i + 1)) }) })).json());
  const a = await mk(5), b = await mk(3);
  const idA = a.order?.id ?? a.id, idB = b.order?.id ?? b.id;
  assert.ok(idA && idB, JSON.stringify(a).slice(0, 200));
  for (const [w, h] of [[390, 844], [1040, 900]]) {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${idA}`, { width: w, height: h, mobile: w < 700 });
    await p.waitFor("document.querySelector('[data-khoi=hanh-khach]')", "khối hành khách");
    const t = await p.ev("document.querySelector('[data-canh-bao=qua-ten]')?.textContent ?? null");
    assert.match(t, /Đang có 5 tên cho 3 khách\. Kiểm tra lại số khách hoặc xoá dòng nhập nhầm\./);
    const hs = await p.ev("(() => { const e = document.querySelector('[data-canh-bao=qua-ten]'); const r = e.getBoundingClientRect(); return [r.width > 0, document.documentElement.scrollWidth <= innerWidth, getComputedStyle(e).color]; })()");
    assert.equal(hs[0], true); assert.equal(hs[1], true, "không tràn ngang");
    await p.shot(`docs/evidence/2026-11-07-canh-bao-qua-ten/anh/canh-bao-don-${w}.png`);
    ok(`trang đơn ${w}px: có cảnh báo 5 tên/3 khách, không tràn ngang`);
  }
  const p2 = await env.as(ACCOUNTS.salesA, `/order?id=${idB}`);
  await p2.waitFor("document.querySelector('[data-khoi=hanh-khach]')", "khối");
  assert.equal(await p2.ev("document.querySelector('[data-canh-bao=qua-ten]')"), null);
  ok("trang đơn 3 tên/3 khách: không cảnh báo");
  // form nhập: thêm hai tên khi chưa có dịch vụ nào (0 khách)
  const f = await env.as(ACCOUNTS.salesA, "/order-form");
  await f.waitFor("!document.getElementById('hk-card').hidden", "khối");
  for (let i = 0; i < 2; i++) await f.ev("document.querySelector('[data-action=them-khach]').click(); true");
  await f.ev(`(() => { const ins=[...document.querySelectorAll('#hk-card input[data-o$=":ten"]')]; ins.forEach((el,i)=>{el.value='Tên '+i; el.dispatchEvent(new Event('input',{bubbles:true}));}); return true; })()`);
  const q = await f.ev("[...document.querySelectorAll('#hk-card .banner-warning')].filter((e)=>!e.hidden).map((e)=>e.textContent)");
  assert.ok(q.some((s) => /Đang có 2 tên cho 0 khách\. Kiểm tra lại số khách hoặc xoá dòng nhập nhầm\./.test(s)), JSON.stringify(q));
  assert.equal(await f.ev("document.getElementById('save').disabled"), false, "nút Lưu không bị chặn");
  await f.shot("docs/evidence/2026-11-07-canh-bao-qua-ten/anh/canh-bao-form-390.png");
  ok("form nhập: cảnh báo hiện ngay lúc nhập, nút Lưu vẫn bật");
} finally { await env.stop(); }
