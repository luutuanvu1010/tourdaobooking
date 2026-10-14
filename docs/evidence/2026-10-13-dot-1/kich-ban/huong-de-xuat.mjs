// Ảnh phác "hướng khuyến nghị" cho màn Tạo đơn (đợt 1, bước 1 đánh giá UX): TIÊM một lớp CSS lên form thật SAU KHI trang tải (không sửa mã sản phẩm), đúng cách đã được chủ duyệt ở
// feedback "xem trước bằng ảnh thật" (2/10). "Hướng nhẹ" = bản đã thi công trong đợt này (ảnh ở ../sau/); "hướng khuyến nghị" = ảnh phác này: bốn bước (Ngày + Khách → Dịch vụ → Thanh toán),
// khách lên đầu, các ô ít dùng (Email, Ghi chú, Xe riêng, Xe tối thiểu) gập sau một dòng "+ Thêm chi tiết". ĐÂY CHỈ LÀ ẢNH PHÁC: nút "Thêm chi tiết" ở đây là chữ vẽ bằng CSS, chưa bấm được.
// Chạy từ GỐC repo, sau `npm run build:web`:  node docs/evidence/2026-10-13-dot-1/kich-ban/huong-de-xuat.mjs   (ảnh vào docs/evidence/2026-10-13-dot-1/sau/huong-khuyen-nghi-390.png)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = join(process.env.OUT ?? "docs/evidence/2026-10-13-dot-1", "sau");
mkdirSync(OUT, { recursive: true });
const CSS = `
.form-main { display: flex; flex-direction: column; gap: 12px; }
.form-main > .card { margin: 0; }
.form-main > .card:has(#orderDate) { order: 1; }
.form-main > .card:has(#customerName) { order: 2; }
.form-main > .card:has(#catalog-slot) { order: 3; }
.form-main > #hk-card { order: 4; }
.form-main > #pay-card { order: 5; }
.form-main > .card::before { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--c-primary); }
.form-main > .card:has(#orderDate)::before { content: "Bước 1 · Ngày và khách"; }
.form-main > .card:has(#customerName)::before { content: "Bước 1 · Ngày và khách"; display: none; }
.form-main > .card:has(#catalog-slot)::before { content: "Bước 2 · Dịch vụ"; }
.form-main > #pay-card::before { content: "Bước 3 · Tiền"; }
/* ô ít dùng gập lại */
.form-main > .card:has(#customerName) label:has(#customerEmail), .form-main > .card:has(#customerName) label:has(#customerNote) { display: none; }
.form-main > .card:has(#customerName) .grid::after { content: "+ Thêm chi tiết (email, ghi chú)"; display: block; grid-column: 1 / -1; padding: 8px 0; font-weight: 700; color: var(--c-primary); }
.svc .dd-luoi-phu { display: none; }
.svc .dd-chang::after { content: "+ Thêm chi tiết (xe riêng, số chỗ tối thiểu)"; display: block; font-size: 14px; font-weight: 700; color: var(--c-primary); }
#hk-card { padding: 12px 16px; }
`;
const env = await startEnv();
try {
  const p = await env.as(ACCOUNTS.salesA, "/order-form", { width: 390, height: 844, mobile: true });
  await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục", 15000);
  await sleep(500);
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor("!!document.querySelector('#services .svc')", "thẻ dịch vụ");
  await p.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Người lớn\"]')", "2"));
  await p.ev("(() => { document.querySelector('[data-action=\"them-dua-don\"]')?.click(); return true; })()");
  await sleep(300);
  await p.ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(CSS + ".form-actions { position: static !important; } #tl-fab { display: none !important; }")}; document.head.append(s); window.scrollTo(0, 0); return true; })()`);
  await sleep(400);
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(join(OUT, "huong-khuyen-nghi-390.png"), Buffer.from(r.result.data, "base64"));
  p.close();
  ok("ảnh phác hướng khuyến nghị 390");
} finally {
  await env.stop();
}
