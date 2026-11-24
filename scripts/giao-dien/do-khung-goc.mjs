// Lệnh đo KHUNG GỐC trên trang thật (ADR-0222 Đ7b) — `npm run do-khung -- …`. Chạy từ GỐC kho.
// Với mỗi màn đã chuyển khuôn (trang khai `data-khung-goc`), mở trang trên MÁY THỬ CỤC BỘ ở mọi bề rộng cửa sổ từ 360 tới 1.920 (bước 20) rồi kiểm:
// không tràn ngang, không chữ bị bóp, khối thẳng mép vùng nội dung, không phần tử thò ra ngoài khối, một kiểu vỏ khối, khoảng cách thuộc thang,
// nút chính đúng chỗ của khuôn, không phần tử fixed trong vùng nội dung. Phép đo và máy chấm: scripts/giao-dien/cham-khung-goc.mjs (có bài kiểm).
//
//   npm run do-khung -- --dem                      chỉ in năm con số «chưa theo khung» đọc từ mã (không mở trình duyệt)
//   npm run do-khung -- --tk <tệp tài khoản thử> [--base http://127.0.0.1:8843] [--bang <bảng màn.json>] [--man khoá,khoá] [--tu 360 --den 1920 --buoc 20] [--song-song N] [--ra <thư mục NGOÀI kho>]
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
// Trang «đã tải xong» (siết 25/11/2026, khi đo nhiều thẻ cùng lúc): trước đây chỉ chờ DOM yên 350 ms (tối đa 5 giây) rồi ĐO LUÔN dù trang còn chờ dữ liệu — máy bận
// thì dữ liệu về chậm hơn 350 ms, đo trang dở (đo thử 3 mảnh × 8 thẻ trên Mac: đỏ giả «không thấy khối», «chữ đậm vượt trần»; và có thể BỎ SÓT lỗi chỉ hiện khi có
// dữ liệu). Nay đếm lệnh fetch đang dở ngay trong trang (DEM_FETCH, gắn trước khi trang chạy; bảng tin dùng WebSocket nên không giữ số này) và chỉ đo khi: tài liệu
// đã tải, không còn fetch dở, không còn khung chờ, DOM yên 350 ms. Quá HAN_TAI_MS mà chưa yên ⇒ ô đó KHÔNG ĐẠT («trang chưa tải xong»), không đo trang dở.
export const DEM_FETCH = "(() => { if (window.__dkFetch) return; window.__dkFetch = true; window.__dangTai = 0; const goc = window.fetch; window.fetch = function (...a) { window.__dangTai++; const p = goc.apply(this, a); const xong = () => { window.__dangTai--; }; p.then(xong, xong); return p; }; })();";
const HAN_TAI_MS = 20_000;
const mo = async (ngan, url) => {
  const het = Date.now() + HAN_TAI_MS;
  await ngan.s("Page.navigate", { url });
  for (;;) { await sleep(120); if ((await ngan.ev("document.readyState").catch(() => "")) === "complete" || Date.now() > het) break; }
  const conLai = Math.max(1000, het - Date.now());
  const yen = await ngan.ev(`new Promise((xong) => { const het = Date.now() + ${conLai}; let t; const ban = () => (window.__dangTai ?? 0) > 0 || document.readyState !== "complete" || !!document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true'], .skeleton-list:not([hidden])"); const thu = () => { if (!ban()) { o.disconnect(); xong(true); } else if (Date.now() > het) { o.disconnect(); xong(false); } else t = setTimeout(thu, 250); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 350); }); o.observe(document.documentElement, { childList: true, subtree: true }); t = setTimeout(thu, 350); })`).catch(() => false);
  await sleep(300);
  await ngan.ev("scrollTo(0, 0); 0");
  return yen === true;
};

// `--song-song N` (rút lượt kiểm 25/11/2026): N thẻ đo cùng lúc trong cùng Chrome; mỗi thẻ một ngăn cookie riêng cho từng bộ quyền, dùng CHUNG cookie phiên của bộ
// đó (đăng nhập MỘT lần mỗi bộ — tài khoản thử chỉ giữ một phiên). Việc chia theo ô (màn × bề rộng); kết quả xếp lại đúng thứ tự bảng màn × bề rộng như chạy
// một thẻ. Mặc định 1 = như cũ.
const songSong = Math.max(1, Number(lay("--song-song", "1")) || 1);
const viec = bang.flatMap((m) => beRong.map((w) => ({ m, w })));
const oCua = new Map();
const chrome = await moChrome();
try {
  const cookieCua = {};
  for (const tk of [...new Set(bang.map((m) => m.tk))]) cookieCua[tk] = await dangNhap(base, dsTk[tk].sdt, dsTk[tk].pin);
  let tiep = 0;
  const tho = async () => {
    const nganCua = {};
    try {
      for (;;) {
        const i = tiep++;
        if (i >= viec.length) return;
        const { m, w } = viec[i];
        if (!nganCua[m.tk]) {
          nganCua[m.tk] = await chrome.moNgan();
          await nganCua[m.tk].s("Page.addScriptToEvaluateOnNewDocument", { source: DEM_FETCH });
          await nganCua[m.tk].cookie(cookieCua[m.tk], base);
        }
        const ngan = nganCua[m.tk];
        const khuon = khuonCua.get(m.trang.split("?")[0]);
        const dt = w < 600;
        await ngan.khung(w, dt ? 844 : 900, dt, 1, dt ? "iphone" : "may-tinh");
        let o;
        try {
          if (!(await mo(ngan, base + m.trang))) throw new Error(`trang chưa tải xong sau ${HAN_TAI_MS / 1000} giây (còn lệnh gọi máy chủ dở hoặc khung chờ) — không đo trang dở`);
          o = await ngan.ev(DO_TRONG_TRANG);
          // Trang chưa dựng xong lúc đo (máy bận, gói vừa dựng lại): chờ rồi đo lại ĐÚNG MỘT lần; vẫn không có khối thì ô này không đạt.
          if (o.soKhoi === 0) { await sleep(1800); o = await ngan.ev(DO_TRONG_TRANG); }
        } catch (e) { o = { loi: String(e.message ?? e).slice(0, 160) }; }
        const loi = chamO(o, khuon);
        if (loi.length) console.log(`✗ ${m.khoa} @${w}: ${loi.join(" · ")}`);
        oCua.set(i, { man: m.khoa, trang: m.trang.split("?")[0], khuon, rong: w, ...o, loi });
      }
    } finally {
      for (const n of Object.values(nganCua)) await n.dong().catch(() => {});
    }
  };
  await Promise.all(Array.from({ length: Math.min(songSong, viec.length) }, tho));
} finally { await chrome.tat(); }
const kq = viec.map((_, i) => oCua.get(i));
const hong = kq.filter((x) => x.loi.length).length;
for (const m of bang) {
  const khuon = khuonCua.get(m.trang.split("?")[0]);
  const cua = kq.filter((x) => x.man === m.khoa);
  const xau = cua.filter((x) => x.loi.length).length;
  console.log(`${xau ? "✗" : "✓"} ${m.khoa} (${KHUON[khuon]?.ten ?? khuon}): ${cua.length} bề rộng, ${xau} ô không đạt; vỏ khối: ${[...new Set(cua.flatMap((x) => x.vo ?? []))].join(" ; ") || "—"}; khoảng cách gặp: ${[...new Set(cua.flatMap((x) => x.nhip ?? []))].sort((a, b) => a - b).join(", ") || "—"}`);
}
mkdirSync(ra, { recursive: true });
const tep = join(ra, "do-khung-goc.json");
writeFileSync(tep, JSON.stringify({ luc: new Date().toISOString(), base, beRong: [beRong[0], beRong.at(-1), beRong.length], doThieu: thieu, ketQua: kq }));
console.log(`Ghi ${tep}: ${kq.length} ô (${bang.length} màn × ${beRong.length} bề rộng), ${hong} ô không đạt.`);
if (thieu.length || chon) console.log(`ĐO THIẾU: ${[chon ? "chỉ đo vài màn theo --man" : "", thieu.length ? `trang đã chuyển khuôn mà bảng màn không có: ${thieu.join(", ")}` : ""].filter(Boolean).join("; ")}. Kết quả này không được coi là đạt.`);
process.exit(hong ? 1 : thieu.length || chon ? 2 : 0);
