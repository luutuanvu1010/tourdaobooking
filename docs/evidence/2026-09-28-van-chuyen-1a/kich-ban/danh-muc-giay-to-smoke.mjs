// Kịch bản Chrome — trang Danh mục giấy tờ (/danh-muc-giay-to — ADR-0040 D1, D2; Task A19 của kế hoạch, chuyển sang Phần B theo điều phối 2026-09-28).
// KHUÔN SẴN của trang Địa điểm (bản vẽ Vận chuyển không vẽ màn này). Kiểm (kế hoạch A19 bước 1):
// (a) Quản trị: trang Tôi có dòng "Danh mục giấy tờ" → mở được; ba khối: loại giấy tờ xe (6), loại giấy tờ của người (4), hạng giấy phép lái xe (8).
// (b) thêm loại giấy tờ người "Thẻ hướng dẫn viên" → hiện ngay.  (c) sửa tên một hạng → Lưu, tải lại vẫn đúng.
// (d) ngưng "Giấy phép lái xe" → câu tiếng Việt "không ngưng được", không lộ mã fixed_type.
// (e) Bán hàng: trang Tôi KHÔNG có dòng; mở thẳng → câu "Chỉ quản trị viên…", không bảng nào.  (f) axe; ảnh 390 + 1040.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs
import { ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, sleep, txt, typeInto } from "./vc-lib.mjs";

const dem = boDem("DANH MUC GIAY TO SMOKE");
const { env } = await dungMoiTruong([]);
const ADMIN = ACCOUNTS.admin;
try {
  const dem3 = (p, sel) => p.ev(`['#dm-xe', '#dm-nguoi', '#dm-hang'].map((k) => document.querySelectorAll(k + ' ${sel}').length)`);

  for (const [id, ten, vp, sel] of [["a1", "390", MOB, ".card-list > .card"], ["a2", "1040", DESK, "table.items tbody tr"]]) {
    await dem.step(id, `(a) Quản trị ${ten}: dòng “Danh mục giấy tờ” ở trang Tôi → trang; ba khối 6 / 4 / 8 dòng` + axeNote(), async () => {
      const p = await env.as(ADMIN, "/account", vp);
      try {
        await p.waitFor(`[...document.querySelectorAll('a.row-link')].some((a) => a.getAttribute('href') === '/danh-muc-giay-to')`, "dòng Danh mục giấy tờ", 10000);
        assert.ok(await p.ev(clickVisible(".account-layout", "Danh mục giấy tờ")));
        await p.waitFor(`location.pathname === '/danh-muc-giay-to' && !document.querySelector('#dm-hang').hidden`, "trang danh mục", 10000);
        assert.deepEqual(await p.ev(`['#dm-xe', '#dm-nguoi', '#dm-hang'].map((k) => document.querySelector(k + ' h2').textContent.trim())`), ["Loại giấy tờ xe", "Loại giấy tờ của người", "Hạng giấy phép lái xe"]);
        assert.deepEqual(await dem3(p, sel), [6, 4, 8]);
        await axe(p, `danh mục ${ten}`);
        await shotFull(p, `danh-muc-giay-to-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  await dem.step("b", "(b) thêm loại giấy tờ người “Thẻ hướng dẫn viên” (THE_HDV) → hiện ngay (1040)", async () => {
    const p = await env.as(ADMIN, "/danh-muc-giay-to", DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      await p.ev(typeInto("#dm-nguoi .dm-them input[type=text]", "THE_HDV"));
      await p.ev(`(() => { const o = document.querySelectorAll('#dm-nguoi .dm-them input[type=text]')[1]; o.value = 'Thẻ hướng dẫn viên'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-nguoi .dm-them", "Thêm")));
      await p.waitFor(`[...document.querySelectorAll('#dm-nguoi table.items tbody tr')].some((r) => r.textContent.includes('Thẻ hướng dẫn viên'))`, "dòng mới", 8000);
      assert.equal(await p.ev(`document.querySelectorAll('#dm-nguoi table.items tbody tr').length`), 5);
    } finally {
      p.close();
    }
  });

  await dem.step("c", "(c) sửa tên hạng B → “Hạng B (mới)” → Lưu; tải lại vẫn đúng (390)", async () => {
    const p = await env.as(ADMIN, "/danh-muc-giay-to", MOB);
    try {
      await p.waitFor("!document.querySelector('#dm-hang').hidden", "khối hạng", 10000);
      assert.ok(await p.ev(`(() => { const c = document.querySelector('#dm-hang .card-list > .card[data-code="B"]'); c.querySelector('button').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('#dm-hang .dm-sua:not([hidden]) h3')", "khung sửa", 5000);
      await p.ev(`(() => { const o = document.querySelector('#dm-hang .dm-sua:not([hidden]) h3').parentElement.querySelector('input[type=text]'); o.value = 'Hạng B (mới)'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-hang", "Lưu")));
      await p.waitFor(`document.querySelector('#dm-hang .card-list > .card[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới", 8000);
      await p.send("Page.reload", {});
      await p.waitFor(`document.querySelector('#dm-hang .card-list > .card[data-code="B"]')?.textContent.includes('Hạng B (mới)')`, "tên mới sau tải lại", 10000);
    } finally {
      p.close();
    }
  });

  await dem.step("d", "(d) ngưng “Giấy phép lái xe” → câu tiếng Việt “không ngưng được”, không lộ mã fixed_type (1040)", async () => {
    const p = await env.as(ADMIN, "/danh-muc-giay-to", DESK);
    try {
      await p.waitFor("!document.querySelector('#dm-nguoi').hidden", "khối người", 10000);
      assert.ok(await p.ev(`(() => { const r = document.querySelector('#dm-nguoi tr[data-code="GPLX"]'); r.querySelector('button').click(); return true; })()`));
      await p.waitFor("!!document.querySelector('#dm-nguoi .dm-sua:not([hidden]) h3')", "khung sửa", 5000);
      await p.ev(`(() => { const box = [...document.querySelector('#dm-nguoi .dm-sua:not([hidden]) h3').parentElement.querySelectorAll('label.check')].find((l) => l.textContent.includes('Đang dùng')).querySelector('input'); box.click(); return true; })()`);
      assert.ok(await p.ev(clickVisible("#dm-nguoi", "Lưu")));
      await p.waitFor("!document.querySelector('#error').hidden", "câu báo", 8000);
      const msg = await p.ev(txt("#error"));
      assert.match(msg, /không ngưng được/, msg);
      assert.ok(!/fixed_type/.test(await p.ev("document.body.innerText")), "không lộ mã");
      await shotFull(p, "danh-muc-giay-to-khong-ngung-duoc-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("e", "(e) Bán hàng: trang Tôi không có dòng; mở thẳng → câu “Chỉ quản trị viên…”, không bảng nào, không gọi API danh mục", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#links .row-link')", "trang Tôi", 10000);
      await sleep(800);
      assert.equal(await p.ev(`[...document.querySelectorAll('a.row-link')].some((a) => a.getAttribute('href') === '/danh-muc-giay-to')`), false);
    } finally {
      p.close();
    }
    const q = await env.as(ACCOUNTS.salesA, "/danh-muc-giay-to", DESK);
    try {
      await q.waitFor("!document.querySelector('#error').hidden", "câu báo", 10000);
      assert.equal(await q.ev(txt("#error")), "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.");
      assert.equal(await q.ev("document.querySelectorAll('table.items, .card-list > .card').length"), 0);
      assert.deepEqual(apiCalls(q).filter((c) => /meta/.test(c.path)), []);
    } finally {
      q.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
