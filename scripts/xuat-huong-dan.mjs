// Xuất hướng dẫn theo vai (src/shared/huong-dan.ts) thành MỘT tệp HTML có mục lục — bản đọc ngoài app để đưa lên Google Docs
// (chủ chọn 30/9, đặc tả docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md). Chỉ đọc mã, không mạng, không ghi gì ngoài tệp ra.
// Dùng: node scripts/xuat-huong-dan.mjs <tệp-ra.html>
import { writeFileSync } from "node:fs";
import { HUONG_DAN, phanTich, phutDoc } from "../src/shared/huong-dan.ts";
import { APP_NAME, APP_VERSION } from "../src/shared/app-info.ts";

const out = process.argv[2];
if (!out) {
  console.error("Thiếu tệp ra. Dùng: node scripts/xuat-huong-dan.mjs <tệp-ra.html>");
  process.exit(2);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const chu = (ds) => ds.map((d) => (d.k === "chu" ? esc(d.t) : d.k === "dam" ? `<b>${esc(d.t)}</b>` : `<b>[${esc(d.t)}]</b>`)).join("");
const khoi = (k) => {
  switch (k.k) {
    case "tieuDe": return `<h4>${chu(k.t)}</h4>`;
    case "doan": return `<p>${chu(k.t)}</p>`;
    case "ghiChu": return `<p style="background:#fbe3b3;padding:6px 10px"><i>${chu(k.t)}</i></p>`;
    case "dsSo": return `<ol>${k.muc.map((m) => `<li>${chu(m)}</li>`).join("")}</ol>`;
    case "dsCham": return `<ul>${k.muc.map((m) => `<li>${chu(m)}</li>`).join("")}</ul>`;
  }
  return "";
};
const md = (s) => phanTich(s).map(khoi).join("\n");

const ngay = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const parts = [
  `<h1>Hướng dẫn sử dụng ${esc(APP_NAME)} — theo vai</h1>`,
  `<p>Bản ${esc(APP_VERSION)} · xuất ngày ${esc(ngay)}. Bản trong app (Tôi → Trợ giúp) luôn mới nhất; bản này là bản chụp để đọc và in.</p>`,
  `<p><b>Cách đọc trong 30 phút:</b> đọc <b>Phần chung</b>, rồi phần của vai bạn — "Bắt đầu nhanh" trước, các mục sau khi cần. Chữ trong ngoặc vuông [như thế này] là tên nút hoặc chữ đúng như trên màn hình.</p>`,
  `<h2>Mục lục</h2><ol>${HUONG_DAN.map((n) => `<li>${esc(n.tieuDe)} — khoảng ${phutDoc(n)} phút</li>`).join("")}</ol>`,
];
for (const n of HUONG_DAN) {
  parts.push(`<h2>${esc(n.tieuDe)}</h2>`, `<p><i>${esc(n.gioiThieu)}</i> (khoảng ${phutDoc(n)} phút đọc)</p>`, `<h3>Bắt đầu nhanh</h3>`, md(n.batDauNhanh));
  for (const m of n.muc) parts.push(`<h3>${esc(m.tieuDe)}</h3>`, md(m.noiDung));
}
writeFileSync(out, `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hướng dẫn sử dụng theo vai</title></head><body>\n${parts.join("\n")}\n</body></html>\n`);
console.log(`Đã ghi ${out} (${HUONG_DAN.length} nhóm).`);
