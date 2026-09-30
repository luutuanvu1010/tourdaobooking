// Số thứ tự ở danh sách đơn (/orders, bản 1.11): đánh 1, 2, 3… theo thứ tự hiện; thẻ vẫn ĐÚNG 2 dòng ở 390px kể cả số hai chữ số + tên khách dài.
// Góp ý T5 (2026-09-30): đơn CÓ nơi đón thêm dòng 3 "Đón tại …" luôn thấy — đúng MỘT hàng (cắt "…"), vẫn còn "Đón tại" ở phần xổ; đơn không nơi đón giữ 2 dòng.
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-25-be-mat-tao-don/kich-ban/stt-don.mjs
import assert from "node:assert/strict";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const env = await startEnv();
try {
  const owner = await env.login(ACCOUNTS.salesA);
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${env.base}/api/orders`, {
      method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${owner.name}=${owner.value}` },
      body: JSON.stringify({
        customerName: `Nguyễn Thị Khách Hàng Có Tên Rất Dài Số ${i + 1}`, customerPhone: "0904 444 555", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
        services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 12, child: 11, senior: 0, infant: 0 }, unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(3), pickupTime: "07:30", pickupPlace: i % 2 === 0 ? `Khách sạn Có Tên Rất Dài Ở Đường Trần Phú Nha Trang Số ${i + 1}` : "" }],
      }),
    });
    assert.ok(r.status === 200 || r.status === 201, `tạo đơn ${i + 1}: ${r.status} ${await r.text()}`);
  }
  for (const width of [390, 1040]) {
    const p = await env.as(ACCOUNTS.salesA, "/orders", { width, height: 844, mobile: width < 640 });
    await p.waitFor("document.querySelectorAll('#list .order-card').length === 12", `12 thẻ đơn (${width}px)`);
    const m = await p.ev(`[...document.querySelectorAll('#list .order-card')].map((c) => {
      const lh = parseFloat(getComputedStyle(c.querySelector('.order-row-top')).lineHeight) || 24;
      const top = c.querySelector('.order-row-top').getBoundingClientRect().height;
      const l2 = c.querySelector('.order-card-line2').getBoundingClientRect().height;
      const l3 = c.querySelector('.order-card-line3');
      const noi = c.querySelector('.order-row-place');
      return { idx: c.querySelector('.order-row-index')?.textContent, oneLine1: top < lh * 1.6, oneLine2: l2 < lh * 1.6,
        l3: l3 ? { text: l3.innerText.trim(), oneLine: l3.getBoundingClientRect().height < lh * 1.6, trongThe: l3.getBoundingClientRect().right <= c.getBoundingClientRect().right + 0.5, cat: noi.scrollWidth > noi.clientWidth } : null,
        xo: [...c.querySelectorAll('.order-card-details > div')].some((d) => d.textContent.startsWith('Đón tại ')) };
    })`);
    // Danh sách mới nhất trước: số thứ tự 1 = đơn lập sau cùng (i = 11, không nơi đón), xen kẽ.
    const coNoi = m.filter((x) => x.l3);
    assert.equal(coNoi.length, 6, `${width}px: 6 đơn có nơi đón có dòng 3 — ${JSON.stringify(m)}`);
    assert.ok(coNoi.every((x) => x.l3.text.startsWith("Đón tại Khách sạn") && x.l3.oneLine && x.l3.trongThe && x.xo), `${width}px: dòng 3 một hàng, trong thẻ, còn ở phần xổ — ${JSON.stringify(coNoi)}`);
    if (width === 390) assert.ok(coNoi.every((x) => x.l3.cat), "390px: nơi đón dài bị cắt bằng '…' (không xuống hàng)");
    assert.ok(m.filter((x) => !x.l3).every((x) => !x.xo), `${width}px: đơn không nơi đón không có dòng 3`);
    assert.deepEqual(m.map((x) => x.idx), Array.from({ length: 12 }, (_, i) => `${i + 1}.`), `${width}px: số thứ tự 1…12`);
    assert.ok(m.every((x) => x.oneLine1 && x.oneLine2), `${width}px: mỗi thẻ đúng 2 dòng — ${JSON.stringify(m)}`);
    assert.ok((await p.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, `${width}px: không tràn ngang`);
    p.close();
    ok(`${width}px: số thứ tự 1…12, dòng 1–2 mỗi dòng một hàng, dòng 3 "Đón tại" một hàng khi có nơi đón, không tràn ngang`);
  }
  console.log("STT DON OK");
} finally {
  await env.stop();
}
