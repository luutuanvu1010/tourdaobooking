// Lệnh đo KHUNG GỐC trên trang thật (ADR-0222 Đ7b) — `npm run do-khung -- …`. Chạy từ GỐC kho.
// Với mỗi màn đã chuyển khuôn (trang khai `data-khung-goc`), mở trang trên MÁY THỬ CỤC BỘ ở mọi bề rộng cửa sổ từ 360 tới 1.920 (bước 20) rồi kiểm:
// không tràn ngang, không chữ bị bóp, khối thẳng mép vùng nội dung, không phần tử thò ra ngoài khối, một kiểu vỏ khối, khoảng cách thuộc thang,
// nút chính đúng chỗ của khuôn, không phần tử fixed trong vùng nội dung. Phép đo và máy chấm: scripts/giao-dien/cham-khung-goc.mjs (có bài kiểm).
//
//   npm run do-khung -- --dem                      chỉ in năm con số «chưa theo khung» đọc từ mã (không mở trình duyệt)
//   npm run do-khung -- --tk <tệp tài khoản thử> [--base http://127.0.0.1:8843] [--bang <bảng màn.json>] [--man khoá,khoá] [--tu 360 --den 1920 --buoc 20] [--ra <thư mục NGOÀI kho>]
//
// Máy thử: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 <kho dữ liệu giả> --port 8843` (sau `npm run build:web`). Chỉ đăng nhập và GET.
// Bảng màn: [{ khoa, tk, trang }] — đường dẫn kèm mã bản ghi của kho dữ liệu giả đang dùng. Mặc định: docs/evidence/2026-11-21-khung-goc-thi-cong/bang-man.json.
// Mã thoát: 0 = mọi ô đạt và mọi trang đã chuyển đều được đo; 1 = có ô không đạt; 2 = không chạy được, hoặc ĐO THIẾU (không bao giờ ghi là đạt).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { KHUON, TRANG_CHUA_CHUYEN, docThanTrang, duongCuaTrang } from "../../src/shared/khung-goc.ts";
import { DO_TRONG_TRANG, chamO, dayBeRong, trangDoThieu } from "./cham-khung-goc.mjs";
import { demTepKieu, lopCuTrongHtml, lopCuTrongTs } from "./dem-khung-goc.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const co = (k) => process.argv.includes(k);
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const dung = (cau) => { console.error(cau); process.exit(2); };

const trang = readdirSync("public").filter((t) => t.endsWith(".html")).sort().map((ten) => ({ ten, ...docThanTrang(readFileSync(join("public", ten), "utf8")), html: readFileSync(join("public", ten), "utf8") }));
const daChuyen = trang.filter((t) => t.khuon !== null);

if (co("--dem")) {
  const so = demTepKieu(readFileSync("public/app.css", "utf8"));
  const tepWeb = readdirSync("web").filter((t) => t.endsWith(".ts") && !t.endsWith(".d.ts"));
  const lopCu = tepWeb.filter((t) => lopCuTrongTs(readFileSync(join("web", t), "utf8")).length).length + trang.filter((t) => lopCuTrongHtml(t.html).length).length;
  console.log("Năm con số «chưa theo khung» (ADR-0222 Đ7a) — trần ở src/khung-goc.test.ts, chỉ được hạ:");
  console.log(`  1. luật bề rộng, chia cột, khoảng cách ngoài phần khung: ${so.luatBoCucRieng} (bề rộng ${so.chiTiet.beRong} + chia cột ${so.chiTiet.chiaCot} + khoảng cách ${so.chiTiet.khoangCach})`);
  console.log(`  2. token bề rộng riêng (--w-*): ${so.tokenBeRongRieng}`);
  console.log(`  3. chỗ dùng mốc cửa sổ lẻ: ${so.mocLe} (các mốc: ${so.mocLeGiaTri.join(", ")})`);
  console.log(`  4. tệp còn dùng lớp cũ (.btn, .card, .badge): ${lopCu}`);
  console.log(`  5. trang chưa chuyển khuôn: ${TRANG_CHUA_CHUYEN.length} (đã chuyển ${daChuyen.length}: ${daChuyen.map((t) => `${duongCuaTrang(t.ten)} = ${KHUON[t.khuon]?.ten ?? t.khuon}`).join("; ") || "chưa trang nào"})`);
  process.exit(0);
}

const base = lay("--base", "http://127.0.0.1:8843");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) dung("Chỉ đo trên máy thử cục bộ (http://127.0.0.1:<cổng>).");
const tepTk = lay("--tk");
if (!tepTk || !existsSync(nha(tepTk))) dung("Thiếu --tk <tệp tài khoản thử> (dạng { taiKhoan: [{ khoa, sdt, pin }] }, để NGOÀI kho).");
const tepBang = lay("--bang", "docs/evidence/2026-11-21-khung-goc-thi-cong/bang-man.json");
if (!existsSync(nha(tepBang))) dung(`Không thấy bảng màn ${tepBang}.`);
const ra = lay("--ra") ? nha(lay("--ra")) : mkdtempSync(join(tmpdir(), "tourdao-do-khung-"));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) dung(`--ra (${ra}) nằm trong kho: số đo không ghi vào kho.`);

let bang = JSON.parse(readFileSync(nha(tepBang), "utf8"));
const chon = lay("--man") ? new Set(lay("--man").split(",")) : null;
if (chon) bang = bang.filter((m) => chon.has(m.khoa));
const khuonCua = new Map(daChuyen.map((t) => [duongCuaTrang(t.ten), t.khuon]));
const laMan = bang.filter((m) => !khuonCua.has(m.trang.split("?")[0]));
if (laMan.length) dung(`Bảng màn có trang chưa khai khuôn: ${laMan.map((m) => m.trang).join(", ")}. Lệnh này chỉ đo màn đã chuyển.`);
const thieu = trangDoThieu([...khuonCua.keys()], bang);
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(tepTk), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const thieuTk = [...new Set(bang.map((m) => m.tk))].filter((k) => !dsTk[k]);
if (thieuTk.length) dung(`Tệp tài khoản thiếu: ${thieuTk.join(", ")}.`);
const beRong = dayBeRong(Number(lay("--tu", "360")), Number(lay("--den", "1920")), Number(lay("--buoc", "20")));

const { dangNhap, moChrome, sleep } = await import("./cdp.mjs");
const mo = async (ngan, url) => {
  await ngan.s("Page.navigate", { url });
  const het = Date.now() + 6000;
  for (;;) { await sleep(120); if ((await ngan.ev("document.readyState").catch(() => "")) === "complete" || Date.now() > het) break; }
  // Chờ DOM yên và hết khung chờ (bảng tin giữ mạng bận nên không chờ «mạng lặng»).
  await ngan.ev(`new Promise((xong) => { const het = Date.now() + 5000; let t; const thu = () => { if (Date.now() > het || !document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true'], .skeleton-list:not([hidden])")) { o.disconnect(); xong(); } else t = setTimeout(thu, 250); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 350); }); o.observe(document.body, { childList: true, subtree: true }); t = setTimeout(thu, 350); })`).catch(() => {});
  await sleep(300);
  await ngan.ev("scrollTo(0, 0); 0");
};

const kq = [];
let hong = 0;
const chrome = await moChrome();
try {
  for (const tk of [...new Set(bang.map((m) => m.tk))]) {
    const ngan = await chrome.moNgan();
    await ngan.cookie(await dangNhap(base, dsTk[tk].sdt, dsTk[tk].pin), base);
    for (const m of bang.filter((x) => x.tk === tk)) {
      const khuon = khuonCua.get(m.trang.split("?")[0]);
      const truoc = hong;
      for (const w of beRong) {
        const dt = w < 600;
        await ngan.khung(w, dt ? 844 : 900, dt, 1, dt ? "iphone" : "may-tinh");
        let o;
        try {
          await mo(ngan, base + m.trang);
          o = await ngan.ev(DO_TRONG_TRANG);
          // Trang chưa dựng xong lúc đo (máy bận, gói vừa dựng lại): chờ rồi đo lại ĐÚNG MỘT lần; vẫn không có khối thì ô này không đạt.
          if (o.soKhoi === 0) { await sleep(1800); o = await ngan.ev(DO_TRONG_TRANG); }
        } catch (e) { o = { loi: String(e.message ?? e).slice(0, 160) }; }
        const loi = chamO(o, khuon);
        if (loi.length) { hong++; console.log(`✗ ${m.khoa} @${w}: ${loi.join(" · ")}`); }
        kq.push({ man: m.khoa, trang: m.trang.split("?")[0], khuon, rong: w, ...o, loi });
      }
      const cua = kq.filter((x) => x.man === m.khoa);
      console.log(`${hong === truoc ? "✓" : "✗"} ${m.khoa} (${KHUON[khuon]?.ten ?? khuon}): ${cua.length} bề rộng, ${cua.filter((x) => x.loi.length).length} ô không đạt; vỏ khối: ${[...new Set(cua.flatMap((x) => x.vo ?? []))].join(" ; ") || "—"}; khoảng cách gặp: ${[...new Set(cua.flatMap((x) => x.nhip ?? []))].sort((a, b) => a - b).join(", ") || "—"}`);
    }
    await ngan.dong();
  }
} finally { await chrome.tat(); }
mkdirSync(ra, { recursive: true });
const tep = join(ra, "do-khung-goc.json");
writeFileSync(tep, JSON.stringify({ luc: new Date().toISOString(), base, beRong: [beRong[0], beRong.at(-1), beRong.length], doThieu: thieu, ketQua: kq }));
console.log(`Ghi ${tep}: ${kq.length} ô (${bang.length} màn × ${beRong.length} bề rộng), ${hong} ô không đạt.`);
if (thieu.length || chon) console.log(`ĐO THIẾU: ${[chon ? "chỉ đo vài màn theo --man" : "", thieu.length ? `trang đã chuyển khuôn mà bảng màn không có: ${thieu.join(", ")}` : ""].filter(Boolean).join("; ")}. Kết quả này không được coi là đạt.`);
process.exit(hong ? 1 : thieu.length || chon ? 2 : 0);
