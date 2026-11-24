// Chèn bảng phát hiện mức Chặn việc và Nặng (theo họ màn) vào PHAT-HIEN.md, thay dòng đánh dấu BANG-NANG. Đọc bảng gộp ngoài kho.
// Chạy từ GỐC kho: node docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/chen-bang-nang.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const ra = join(homedir(), "tourdao-danh-gia-2026-11-20");
const P = JSON.parse(readFileSync(join(ra, "phat-hien-gop.json"), "utf8")).phatHien;
// Ảnh phiên điều phối đã tự mở (số màn → đoạn tên tệp).
const DA_XEM = { 62: ["390"], 1: ["390", "1280"], 18: ["1280-man-2", "390-man-8"], 10: ["390-man-1"], 67: ["1280"], 11: ["1280"], 32: ["390-man-2"], 17: ["390-man-1"], 29: ["390"], 53: ["390-man-1"] };
const o = (s, n = 170) => { const t = String(s).replace(/\|/g, "/").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const nang = P.filter((p) => p.muc !== "Nhỏ");
const thuTuHo = ["Lập đơn", "Đơn hàng + chi tiết", "Tài xế, chuyến", "Điều phối xe", "Tiền", "Quản trị, Thiết lập", "Vé điện tử (họ mới)", "Màn của đối tác bên ngoài", "Trợ giúp, Của tôi (họ mới)", "Đăng nhập, trạng thái"];
const md = [];
for (const ho of thuTuHo) {
  const ds = nang.filter((p) => p.ho === ho).sort((a, b) => (a.muc === "Chặn việc" ? 0 : 1) - (b.muc === "Chặn việc" ? 0 : 1) || a.so - b.so);
  const nho = P.filter((p) => p.ho === ho && p.muc === "Nhỏ").length;
  md.push(`### ${ho} — ${ds.filter((p) => p.muc === "Chặn việc").length} Chặn việc, ${ds.filter((p) => p.muc === "Nặng").length} Nặng, ${nho} Nhỏ`, "");
  if (!ds.length) { md.push("Không có phát hiện mức Nặng trở lên.", ""); continue; }
  md.push("| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |", "|---|---|---|---|---|---|---|---|");
  for (const p of ds) {
    const xem = (DA_XEM[p.so] ?? []).some((k) => p.anh.includes(`-${k}`)) || (DA_XEM[p.so] && [62, 1, 10, 29, 53, 17].includes(p.so));
    md.push(`| ${p.so} | ${p.bo}:${p.trang} @${p.kho} | ${p.ma} | ${p.muc} | \`${o(p.anh, 90)}\` | ${o(p.cho, 90)} | ${o(p.thay)} | ${xem ? "có" : ""} |`);
  }
  md.push("");
}
md.push("Phát hiện mức Nhỏ (405 dòng) không chép vào kho: xem `phat-hien-gop.md` ngoài kho; phần gộp theo nguyên nhân ở mục B.");
const tep = "docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md";
const s = readFileSync(tep, "utf8");
if (!s.includes("<!-- BANG-NANG -->")) { console.error("Không thấy dòng đánh dấu BANG-NANG"); process.exit(2); }
writeFileSync(tep, s.replace("<!-- BANG-NANG -->", md.join("\n")));
console.log(`Đã chèn ${nang.length} dòng.`);
