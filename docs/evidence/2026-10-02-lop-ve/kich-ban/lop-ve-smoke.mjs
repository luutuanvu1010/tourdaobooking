// LỚP CHỐNG GHI TRÙNG (ADR-0094) bằng Chrome thật — T1, T2, T16 (phần localStorage), T19 ở màn THẬT (`web/api.ts` + trang đơn). Không cần mạng ngoài.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-10-02-lop-ve/kich-ban/lop-ve-smoke.mjs
// "Máy chủ ĐÃ LƯU nhưng phản hồi bị mất" (ca khó nhất — mất sóng ở bến): bọc `window.fetch` của trang — lần POST đầu tới máy chủ THẬT (máy chủ ghi xong), rồi
// trang nhận "Failed to fetch" như mất mạng. Bấm lại ⇒ `api()` gửi CÙNG vé ⇒ máy chủ phát lại ⇒ "Lần bấm trước đã được ghi." + mở trang đơn; sổ chỉ có MỘT lần thu.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-02-lop-ve/anh");
mkdirSync(OUT, { recursive: true });
const env = await startEnv();
let buoc = 0;
const dat = (m) => {
  buoc++;
  ok(m);
};
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}`, ...(method === "GET" ? {} : { "idempotency-key": crypto.randomUUID() }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const NO_TRIP = { departDate: vnDate(5), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", legs: [] };
  const lapDon = async (ten) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: ten, customerPhone: "0903 222 333", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const x = await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    assert.equal(x.status, 200, JSON.stringify(x.json));
    return r.json.order.id;
  };
  const soLanThu = (id) => env.sql(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${id}' AND kind_code = 'CUSTOMER_PAYMENT'`)[0].n;
  /** Bọc fetch của trang: lần POST /payments ĐẦU tới máy chủ thật rồi giả mất phản hồi; ghi lại vé của mọi lần POST /payments. */
  const BOC_FETCH = `(() => {
    const goc = window.fetch; window.__ve = []; let lan = 0;
    window.fetch = async (u, init) => {
      const laThu = String(u).includes('/payments') && init && init.method === 'POST';
      if (laThu) window.__ve.push(init.headers && init.headers['idempotency-key']);
      const r = await goc(u, init);
      if (laThu && lan++ === 0) { await r.text(); throw new TypeError('Failed to fetch'); }
      return r;
    };
    return true;
  })()`;
  const moFormThu = async (p, soTien) => {
    await p.waitFor(`!!document.querySelector('[data-action="ghi-lan-thu"]')`, "nút Ghi lần thu");
    await p.ev(`document.querySelector('[data-action="ghi-lan-thu"]').click()`);
    await p.waitFor(`!!document.querySelector('[data-khoi="form-lan-thu"]')`, "form lần thu");
    await p.ev(setInput(`document.querySelector('[data-khoi="form-lan-thu"] input')`, String(soTien)));
  };

  for (const [kho, vp] of [["điện thoại 390", undefined], ["máy tính 1040", { width: 1040, height: 900, mobile: false }]]) {
    // ---- T1: máy chủ đã lưu, phản hồi mất, bấm lại ⇒ một lần thu + "Lần bấm trước đã được ghi." + mở đúng trang đơn
    const id = await lapDon(`Khách Lớp Vé ${kho}`);
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${id}`, vp);
    await moFormThu(p, 300000);
    await p.ev(BOC_FETCH);
    await p.ev(`document.querySelector('[data-khoi="form-lan-thu"]').requestSubmit()`);
    await p.waitFor(`!document.querySelector('[data-khoi="form-lan-thu"] button[type=submit]').disabled`, "nút Ghi bật lại sau lỗi mạng");
    assert.equal(soLanThu(id), 1, "máy chủ ĐÃ ghi lần đầu (phản hồi mất ở máy khách)");
    await p.shot(join(OUT, `t1-mat-phan-hoi-${kho.replace(/ /g, "-")}.png`));
    await p.ev(`document.querySelector('[data-khoi="form-lan-thu"]').requestSubmit()`);
    await p.waitFor(`[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('Lần bấm trước đã được ghi.'))`, "báo 'Lần bấm trước đã được ghi.'");
    const ve = await p.ev(`window.__ve`);
    assert.equal(ve.length, 2);
    assert.ok(ve[0] && ve[0] === ve[1], `bấm lại mang CÙNG vé: ${JSON.stringify(ve)}`);
    await p.shot(join(OUT, `t1-da-ghi-${kho.replace(/ /g, "-")}.png`));
    await p.waitFor(`!window.__ve`, "trang được mở lại (location.replace)", 6000);
    await p.waitFor(`location.pathname === '/order' && new URLSearchParams(location.search).get('id') === ${JSON.stringify(id)}`, "mở đúng trang đơn");
    assert.equal(soLanThu(id), 1, "T1: sổ chỉ có MỘT lần thu");
    // T16: localStorage chỉ có mã băm + vé, không thân / SĐT / số tiền
    const kho_ = await p.ev(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('lg:')).map((k) => [k, localStorage.getItem(k)])))`);
    for (const x of ["300000", "300.000", "0903", "soTien", "Khách"]) assert.ok(!kho_.includes(x), `localStorage lộ "${x}": ${kho_}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
    p.close();
    dat(`T1 (${kho}): máy chủ đã lưu, phản hồi mất, bấm lại ⇒ cùng vé, "Lần bấm trước đã được ghi.", mở lại đúng trang đơn, MỘT lần thu; localStorage không lộ dữ liệu`);

    // ---- T1b: mất phản hồi → phiên bị đá (máy khác đăng nhập) → bấm lại nhận 401 → đăng nhập lại → bấm lại ⇒ VẪN một lần thu (vé giữ qua 401 + tải lại trang)
    const id3 = await lapDon(`Khách Bị Đá ${kho}`);
    const r = await env.as(ACCOUNTS.salesA, `/order?id=${id3}`, vp);
    await moFormThu(r, 150000);
    await r.ev(BOC_FETCH);
    await r.ev(`document.querySelector('[data-khoi="form-lan-thu"]').requestSubmit()`);
    await r.waitFor(`!document.querySelector('[data-khoi="form-lan-thu"] button[type=submit]').disabled`, "nút Ghi bật lại sau lỗi mạng");
    assert.equal(soLanThu(id3), 1);
    const [{ id: staffA }] = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
    const luc = new Date().toISOString();
    env.sql(`UPDATE aut_session SET ended_at = '${luc}', end_reason = 'het_han', updated_at = '${luc}' WHERE staff_id = '${staffA}' AND ended_at IS NULL`);
    await r.ev(`document.querySelector('[data-khoi="form-lan-thu"]').requestSubmit()`);
    await r.waitFor(`location.pathname === '/login'`, "bị đưa về đăng nhập (401)");
    const c = await env.login(ACCOUNTS.salesA);
    await r.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await r.send("Page.navigate", { url: `${env.base}/order?id=${id3}` });
    await r.waitFor("document.readyState === 'complete'", "trang đơn mở lại");
    await moFormThu(r, 150000);
    await r.ev(`document.querySelector('[data-khoi="form-lan-thu"]').requestSubmit()`);
    await r.waitFor(`[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('Lần bấm trước đã được ghi.'))`, "báo 'Lần bấm trước đã được ghi.' sau khi đăng nhập lại");
    await sleep(1500);
    assert.equal(soLanThu(id3), 1, "T1b: bị đá phiên giữa chừng vẫn chỉ MỘT lần thu");
    r.close();
    dat(`T1b (${kho}): mất phản hồi → phiên bị đá → đăng nhập lại → bấm lại ⇒ "Lần bấm trước đã được ghi.", MỘT lần thu`);

    // ---- T2: bấm đúp "Ghi" (hai lần gửi liền, vé đang mở) ⇒ một lần thu
    const id2 = await lapDon(`Khách Bấm Đúp ${kho}`);
    const q = await env.as(ACCOUNTS.salesA, `/order?id=${id2}`, vp);
    await moFormThu(q, 200000);
    await q.ev(`(() => { const f = document.querySelector('[data-khoi="form-lan-thu"]'); f.dispatchEvent(new Event('submit', { cancelable: true })); f.dispatchEvent(new Event('submit', { cancelable: true })); return true; })()`);
    await sleep(4000);
    assert.equal(soLanThu(id2), 1, "T2: bấm đúp ⇒ MỘT lần thu");
    q.close();
    dat(`T2 (${kho}): bấm đúp nút Ghi lần thu ⇒ một lần thu`);
  }
  console.log(`LOP-VE SMOKE OK — ${buoc}/${buoc} bước`);
} finally {
  await env.stop();
}
