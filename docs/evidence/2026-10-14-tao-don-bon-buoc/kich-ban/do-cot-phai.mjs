// Đo cột phải (Tóm tắt, Người phụ trách, banner lỗi, nút Lưu) ở 1040×768 sau khi bấm Lưu trên form trống: banner lỗi và nút Lưu phải nằm trong khung nhìn (luật ở chon-hdv-lap-don-smoke bước 10).
// Dùng để tìm nguyên nhân khi bước đó đỏ. Chạy từ GỐC repo, sau `npm run build:web`: node docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/do-cot-phai.mjs
import { ACCOUNTS, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const env = await startEnv();
try {
  const p = await env.as(ACCOUNTS.salesA, "/order-form", { width: 1040, height: 768, mobile: false });
  await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "form sẵn sàng", 15000);
  await sleep(600);
  const do_ = () => p.ev(`(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
    return { scrollY: Math.round(scrollY), vh: innerHeight, side: r('.form-side'), owner: r('#owner-card'), err: r('#save-error'), save: r('#save'), buoc: r('.buoc-thanh') }; })()`);
  console.log("trước Lưu:", JSON.stringify(await do_()));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi", 5000);
  await sleep(500);
  console.log("sau Lưu :", JSON.stringify(await do_()));
  // Cuộn xuống giữa trang: thanh tiến độ và cột phải dính ở đâu (mép trên khung nhìn = 0).
  await p.ev("window.scrollTo(0, 400); true");
  await sleep(300);
  console.log("cuộn 400:", JSON.stringify(await do_()));
} finally {
  await env.stop();
}
