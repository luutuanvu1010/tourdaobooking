// Kịch bản Chrome (28/10, rà chữ Trang chủ lượt 3): Trang chủ của người KHÔNG lập được đơn (Kế toán) sau khi ẩn hai ô «Của tôi» (`coOSoCuaToi`, src/shared/viec-cua-ban.ts).
// Khẳng định: thẻ số liệu máy tính #dash-so-mt ẩn và rỗng; lưới #dash-grid không chừa khoảng trống đầu ở 1040 (một cột) và 1440 (hai cột), kể cả khi ép hiện «Cần xem lại»
// (một dòng giả, chỉ để đo lưới — luật `.dash-grid:has(> .dash-so-mt[hidden])` ở public/app.css); điện thoại 390 còn đúng hai ô «Còn thiếu», «Chưa phụ trách».
// Đối chứng: Bán hàng vẫn có thẻ số liệu và đủ bốn ô điện thoại. D1 local tạm (dữ liệu gieo của menu-lib.mjs), không đụng production, không cần mạng ngoài, không axe.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=<…/kich-ban/chrome-wrap.sh> OUT=<thư mục ảnh> node docs/evidence/2026-10-28-trang-chu-ke-toan/kich-ban/ke-toan-trang-chu-smoke.mjs
// Ghi ảnh vào <OUT>/anh/*.png (mặc định docs/evidence/2026-10-28-trang-chu-ke-toan/anh/).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, dungMoiTruong, gieoDuLieu } from "../../2026-10-15-menu-may-tinh/kich-ban/menu-lib.mjs";

const OUT = join(process.env.OUT ?? "docs/evidence/2026-10-28-trang-chu-ke-toan", "anh");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { env, call } = await dungMoiTruong();
const DO = `(() => {
  const g = document.querySelector('#dash-grid');
  const gr = g.getBoundingClientRect();
  const hien = [...g.children].filter((e) => e.getBoundingClientRect().height > 0);
  const top = (s) => { const e = document.querySelector(s); if (!e || e.getBoundingClientRect().height === 0) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top - gr.top), left: Math.round(r.left - gr.left), w: Math.round(r.width) }; };
  return {
    soMtHidden: document.querySelector('#dash-so-mt').hidden,
    soMtCon: document.querySelector('#dash-so-mt').children.length,
    khoangDau: hien.length ? Math.round(Math.min(...hien.map((e) => e.getBoundingClientRect().top)) - gr.top) : null,
    review: top('#dash-review'), today: top('#dash-today'), loiTat: top('.dash-loi-tat'),
    oDienThoai: [...document.querySelectorAll('#dash-so .dash-so-nhan')].map((e) => e.textContent.trim()),
    soOHienDienThoai: document.querySelector('#dash-so').getBoundingClientRect().height > 0,
  };
})()`;
try {
  await gieoDuLieu(env, call);
  const mo = async (acc, vp) => {
    const p = await env.openPage(vp);
    const c = await env.login(acc);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + "/" });
    await p.waitFor("document.readyState === 'complete'", "tải xong");
    await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ", 15000);
    await sleep(900);
    return p;
  };
  // Kế toán: ba khổ
  for (const [w, h, mobile] of [[390, 844, true], [1040, 900, false], [1440, 900, false]]) {
    const p = await mo(ACCOUNTS.accounting, { width: w, height: h, mobile });
    try {
      const d = await p.ev(DO);
      console.log(`Kế toán ${w}: ${JSON.stringify(d)}`);
      assert.equal(d.soMtHidden, true, `Kế toán ${w}: thẻ số liệu máy tính phải ẩn`);
      assert.equal(d.soMtCon, 0);
      if (w === 390) assert.deepEqual(d.oDienThoai, ["Còn thiếu", "Chưa phụ trách"], `Kế toán 390: hai ô`);
      else assert.ok(d.khoangDau !== null && d.khoangDau <= 1, `Kế toán ${w}: không được chừa khoảng trống đầu lưới (${d.khoangDau})`);
      await p.shot(join(OUT, `ke-toan-${w}.png`));
      if (w !== 390) {
        // Ép hiện khối «Cần xem lại» (một dòng giả) để thử lưới khi có khối đó mà không có thẻ số liệu.
        await p.ev(`(() => { const r = document.querySelector('#dash-review'); document.querySelector('#dash-review-list').textContent = 'Dòng thử (chỉ để đo lưới)'; r.hidden = false; return true; })()`);
        await sleep(300);
        const e = await p.ev(DO);
        console.log(`Kế toán ${w} + Cần xem lại: ${JSON.stringify(e)}`);
        assert.ok(e.khoangDau <= 1, `Kế toán ${w} + Cần xem lại: khoảng đầu ${e.khoangDau}`);
        if (w === 1440) assert.ok(e.review.top === e.today.top && e.review.left > e.today.left, `1440: Cần xem lại phải đứng cột phải, ngang hàng Đơn đi ${JSON.stringify(e)}`);
        else assert.ok(e.review.top < e.today.top, `1040: Cần xem lại phải đứng trên Đơn đi (một cột) ${JSON.stringify(e)}`);
        await p.shot(join(OUT, `ke-toan-${w}-co-xem-lai.png`));
      }
    } finally {
      p.close();
    }
  }
  // Bán hàng (đối chứng): thẻ số liệu còn, đứng đầu lưới, điện thoại đủ bốn ô
  for (const [w, h, mobile] of [[390, 844, true], [1440, 900, false]]) {
    const p = await mo(ACCOUNTS.salesA, { width: w, height: h, mobile });
    try {
      const d = await p.ev(DO);
      console.log(`Bán hàng ${w}: ${JSON.stringify(d)}`);
      assert.equal(d.soMtHidden, false);
      if (w === 390) assert.deepEqual(d.oDienThoai, ["Còn thiếu", "Doanh thu của tôi", "Đơn nháp", "Chưa phụ trách"]);
      await p.shot(join(OUT, `ban-hang-${w}.png`));
    } finally {
      p.close();
    }
  }
  console.log("KE TOAN TRANG CHU OK");
} finally {
  await env.stop();
}
