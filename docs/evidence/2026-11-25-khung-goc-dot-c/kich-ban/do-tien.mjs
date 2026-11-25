// MỐC TIỀN của đợt C khung gốc (10 trang Tiền, 25/11/2026): ghi lại MỌI con số tiền, phần trăm người dùng thấy trên từng màn, ở 390 và 1.280, ngay sau khi tải
// và sau vài thao tác bấm (chọn từng bên ở Sổ công nợ, thẻ «Vai người dùng» ở Hoa hồng, «Xem đơn nợ» ở Hạn mức trả sau). Chạy một lần TRƯỚC khi sửa mã
// (--ten truoc) và một lần SAU (--ten sau), rồi `--so truoc,sau`: số đã chuẩn hoá (chỉ còn chữ số) phải giống hệt theo từng màn × bề rộng × trạng thái;
// chữ thô khác nhau thì in ra để người đọc đối chiếu với điều đã ghi trên trang ảnh duyệt. Chỉ GET và bấm nút xem (không bấm nút ghi). Ghi NGOÀI kho.
//
// Chạy từ GỐC kho (máy thử đang bật):
//   node docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/do-tien.mjs --ten truoc [--base http://127.0.0.1:8881] [--ra ~/tourdao-dot-c-2026-11-25]
//   node docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/do-tien.mjs --so truoc,sau
// Móc bấm dựa vào CHỮ trên nút/thẻ và thuộc tính data-ben của Sổ công nợ — bản chuyển khung phải giữ các móc này.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-dot-c-2026-11-25")).replace(/^~/, homedir()));

if (lay("--so")) {
  const [a, b] = lay("--so").split(",").map((t) => JSON.parse(readFileSync(join(ra, `tien-${t}.json`), "utf8")));
  let khac = 0, chuKhac = 0;
  const khoa = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of khoa) {
    const sa = (a[k] ?? []).map((x) => x.so).sort().join(" | "), sb = (b[k] ?? []).map((x) => x.so).sort().join(" | ");
    if (sa !== sb) { khac++; console.log(`✗ SỐ KHÁC ${k}\n   trước: ${sa}\n   sau:   ${sb}`); continue; }
    const ta = (a[k] ?? []).map((x) => x.chu).sort().join(" | "), tb = (b[k] ?? []).map((x) => x.chu).sort().join(" | ");
    if (ta !== tb) { chuKhac++; console.log(`~ cách viết khác ${k}\n   trước: ${ta}\n   sau:   ${tb}`); }
  }
  console.log(`${khoa.length} ô (màn × bề rộng × trạng thái); số khác: ${khac}; cách viết khác: ${chuKhac}.`);
  process.exit(khac ? 1 : 0);
}

const ten = lay("--ten");
if (!ten) { console.error("Thiếu --ten <truoc|sau>"); process.exit(2); }
const base = lay("--base") ?? "http://127.0.0.1:8881";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ đo trên máy thử cục bộ."); process.exit(2); }
const { moChrome, sleep } = await import(pathToFileURL(join(process.cwd(), "scripts/giao-dien/cdp.mjs")).href);
const phien = JSON.parse(readFileSync(join(ra, "phien.json"), "utf8"));

// Màn: [tài khoản, đường dẫn, các trạng thái]. Trạng thái: { ten, bam: chữ của nút/thẻ cần bấm } hoặc { ten, ben: true } (lần lượt từng nút data-ben).
const MAN = [
  ["ketoan", "/so-cong-no", [{ ten: "tai" }, { ten: "ben", ben: true }]],
  ["toanquyen", "/so-cong-no", [{ ten: "tai" }, { ten: "ben", ben: true }]],
  ["ketoan", "/khoa-thang", [{ ten: "tai" }]],
  ["ketoan", "/dieu-chinh-cong-no", [{ ten: "tai" }]],
  ["ketoan", "/phan-dinh", [{ ten: "tai" }]],
  ["ketoan", "/hoa-hong", [{ ten: "tai" }, { ten: "vai", bam: "Vai người dùng" }]],
  ["sales", "/hoa-hong", [{ ten: "tai" }, { ten: "vai", bam: "Vai người dùng" }]],
  ["ketoan", "/cap-dai-ly", [{ ten: "tai" }]],
  ["ketoan", "/han-muc-tra-sau", [{ ten: "tai" }, { ten: "don-no", bam: "Xem đơn nợ" }]],
  ["ketoan", "/nguoi-ban", [{ ten: "tai" }]],
  ["ketoan", "/chup-bu", [{ ten: "tai" }]],
  ["toanquyen", "/hoa-hong-gioi-han", [{ ten: "tai" }]],
];

// Trong trang: mọi đoạn chữ hiện ra trong <main> có số tiền (₫, đ, «đồng») hoặc phần trăm; lấy cả giá trị của ô nhập có số.
const DOC = `(() => {
  const m = document.querySelector("main"); if (!m) return [];
  const hien = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === "none" || s.visibility === "hidden" || x.hidden) return false; } return true; };
  const DV = "(?:₫|đồng(?!\\\\p{L})|đ(?!\\\\p{L}))";
  const re = new RegExp("[-−]?\\\\d{1,3}(?:[.,]\\\\d{3})+(?:\\\\s?" + DV + ")?|[-−]?\\\\d+\\\\s?" + DV + "|\\\\d+(?:[.,]\\\\d+)?\\\\s?%", "gu");
  const coTien = new RegExp(DV + "|%", "u");
  const ra = [];
  const w = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.textContent.replace(/\\s+/g, " ");
    if (!/(₫|đ|đồng|%)/.test(t) && !/\\d{1,3}(\\.\\d{3})+/.test(t)) continue;
    if (!n.parentElement || !hien(n.parentElement) || n.parentElement.closest("option, select")) continue;
    for (const k of t.match(re) ?? []) if (coTien.test(k) || /\\d{1,3}\\.\\d{3}/.test(k)) ra.push(k.trim());
  }
  for (const i of m.querySelectorAll("input")) if (hien(i) && /\\d/.test(i.value) && i.type !== "date" && i.type !== "search") ra.push("[ô] " + i.value);
  return ra;
})()`;

const chuan = (chu) => chu.replace(/^\[ô\] /, "").replace(/[^\d%−-]/g, "").replace("−", "-");
const kq = {};
const chrome = await moChrome();
try {
  for (const [tk, duong, trangThai] of MAN) {
    const ngan = await chrome.moNgan();
    await ngan.cookie(phien[tk], base);
    for (const w of [390, 1280]) {
      const dt = w < 641;
      for (const tt of trangThai) {
        await ngan.khung(w, dt ? 844 : 800, dt, dt ? 2 : 1);
        await ngan.di(base + duong);
        await sleep(1200);
        if (/^\/login/.test(String(await ngan.ev("location.pathname")))) throw new Error(`${tk} bị đẩy về Đăng nhập`);
        if (tt.ben) {
          const n = await ngan.ev(`document.querySelectorAll("main [data-ben]").length`);
          for (let i = 0; i < n; i++) {
            await ngan.ev(`(() => { const b = document.querySelectorAll("main [data-ben]")[${i}]; b && b.click(); })(); 0`);
            await sleep(900);
            const id = await ngan.ev(`(document.querySelectorAll("main [data-ben]")[${i}] || {}).dataset?.ben || ("ben-" + ${i})`);
            kq[`${tk} ${duong} @${w} ben:${id}`] = (await ngan.ev(DOC)).map((chu) => ({ chu, so: chuan(chu) }));
            if (dt) { await ngan.di(base + duong); await sleep(1000); }
          }
          continue;
        }
        if (tt.bam) {
          const da = await ngan.ev(`(() => { const e = [...document.querySelectorAll("main button, main a, main [role=tab]")].find((x) => x.innerText.trim() === ${JSON.stringify(tt.bam)} && x.getClientRects().length); if (!e) return 0; e.click(); return 1; })()`);
          if (!da) { kq[`${tk} ${duong} @${w} ${tt.ten}`] = [{ chu: "(không thấy nút để bấm)", so: "?" }]; continue; }
          await sleep(1200);
        }
        kq[`${tk} ${duong} @${w} ${tt.ten}`] = (await ngan.ev(DOC)).map((chu) => ({ chu, so: chuan(chu) }));
      }
    }
    await ngan.dong();
    console.error(`✓ ${tk} ${duong}`);
  }
} finally { await chrome.tat(); }
const tep = join(ra, `tien-${ten}.json`);
if (existsSync(tep) && !process.argv.includes("--ghi-de")) { console.error(`${tep} đã có; thêm --ghi-de để ghi đè.`); process.exit(2); }
writeFileSync(tep, JSON.stringify(kq, null, 1));
const so = Object.values(kq).reduce((s, a) => s + a.length, 0);
console.log(`Ghi ${Object.keys(kq).length} ô, ${so} con số → ${tep}`);
