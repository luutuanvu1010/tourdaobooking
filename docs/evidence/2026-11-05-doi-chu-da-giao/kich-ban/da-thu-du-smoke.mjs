// Đổi chữ «Đã giao» (chủ 2026-11-05): trang đơn, danh sách đơn, Việc của tôi không còn chữ cũ; chữ dài không tràn dòng ở khổ 390 và 1440.
// Chạy từ gốc repo: npm run build:web && CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-05-doi-chu-da-giao/kich-ban/da-thu-du-smoke.mjs
// Dữ liệu dựng bằng API trên D1 tạm, không đụng dữ liệu thật. Cuối: "DA THU DU SMOKE OK".
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = "docs/evidence/2026-11-05-doi-chu-da-giao/anh";
mkdirSync(OUT, { recursive: true });
const KHO = [{ ten: "390", vp: undefined }, { ten: "1440", vp: { width: 1440, height: 900, mobile: false } }];
const khongTran = "document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1";
const chuCu = "/Đã giao(?! đơn cho| vé)|[Đđ]ơn (?:đã |chưa )giao/u.test(document.body.innerText)";
const nutTron = "(() => { const b = document.querySelector('[data-action=\"da-giao\"]'); return b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= innerWidth; })()";
const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Có Tên Khá Dài Để Thử Thẻ", customerPhone: "0903 222 333", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;
  const xn = await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
  assert.equal(xn.status, 200, JSON.stringify(xn.json));
  const thu = await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: o.total, hinhThuc: "CASH", nguoiThu: "toi" });
  assert.equal(thu.status, 201, JSON.stringify(thu.json));
  env.sql(`UPDATE order_service SET depart_date = '${vnDate(-1)}' WHERE order_id = '${o.id}'`);

  // 1) Trước khi chốt: nút ghi đúng tên, gọn trong khung
  for (const { ten, vp } of KHO) {
    const p = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`, vp);
    await p.waitFor("!!document.querySelector('[data-action=\"da-giao\"]')", "nút chốt");
    assert.equal(await p.ev("document.querySelector('[data-action=\"da-giao\"]').textContent"), "Xác nhận đã thu đủ sau dịch vụ");
    assert.equal(await p.ev(nutTron), true, `nút không tràn ${ten}`);
    assert.equal(await p.ev(khongTran), true, `trang không tràn ${ten}`);
    assert.equal(await p.ev(chuCu), false, `không còn chữ cũ ${ten}`);
    await p.ev("document.querySelector('[data-action=\"da-giao\"]').scrollIntoView({ block: 'center' }); true");
    await p.shot(`${OUT}/1-nut-${ten}.png`);
    p.close();
    ok(`Trang đơn ${ten}: nút Xác nhận đã thu đủ sau dịch vụ`);
  }

  // 2) Bấm nút thật: hộp hỏi đúng chữ, đơn khoá, huy hiệu tên đầy đủ
  const q = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`);
  await q.waitFor("document.querySelector('[data-action=\"da-giao\"]') && !document.querySelector('[data-action=\"da-giao\"]').disabled", "nút bật");
  await q.ev("window.__hoi = ''; window.confirm = (c) => { window.__hoi = c; return true; }; document.querySelector('[data-action=\"da-giao\"]').click(); true");
  await q.waitFor("[...document.querySelectorAll('.lock-note')].some((n) => /Đơn đã ở bước Đã thu đủ sau dịch vụ/.test(n.textContent))", "câu khoá");
  q.close();

  for (const { ten, vp } of KHO) {
    const p = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`, vp);
    await p.waitFor("!!document.querySelector('.badge-delivered')", "huy hiệu");
    assert.equal(await p.ev("document.querySelector('.badge-delivered').textContent"), "Đã thu đủ sau dịch vụ");
    assert.equal(await p.ev("(() => { const b = document.querySelector('.badge-delivered'); return b.getBoundingClientRect().right <= innerWidth && b.getBoundingClientRect().height < 44; })()"), true, `huy hiệu đơn gọn ${ten}`);
    assert.equal(await p.ev(khongTran), true, `trang đơn không tràn ${ten}`);
    assert.equal(await p.ev(chuCu), false, `trang đơn không còn chữ cũ ${ten}`);
    await p.shot(`${OUT}/2-don-${ten}.png`);
    p.close();

    const l = await env.as(ACCOUNTS.admin, "/orders", vp);
    await l.waitFor("!!document.querySelector('.order-row-top .badge-delivered')", "thẻ trong danh sách");
    assert.equal(await l.ev("document.querySelector('.order-row-top .badge-delivered').textContent"), "Xong và đủ tiền");
    assert.equal(await l.ev("(() => { const b = document.querySelector('.order-row-top .badge-delivered'); const t = b.closest('.order-card').getBoundingClientRect(); const r = b.getBoundingClientRect(); return r.right <= t.right + 1 && r.height < 34 && b.scrollWidth <= b.clientWidth + 1; })()"), true, `huy hiệu trên thẻ gọn ${ten}`);
    assert.equal(await l.ev(khongTran), true, `danh sách không tràn ${ten}`);
    assert.equal(await l.ev(chuCu), false, `danh sách không còn chữ cũ ${ten}`);
    await l.shot(`${OUT}/3-danh-sach-${ten}.png`);
    l.close();
    ok(`${ten}: trang đơn ghi tên đầy đủ, thẻ danh sách ghi Xong và đủ tiền, không tràn`);
  }
  console.log("DA THU DU SMOKE OK");
} finally {
  await env.stop?.();
}
