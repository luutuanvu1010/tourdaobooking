// Chụp ĐỢT A của kế hoạch chuyển màn sang khung gốc (docs/superpowers/plans/2026-11-21-chuyen-toan-bo-man-sang-khung-goc.md), vẽ lại 24/11/2026 theo ADR-0234:
// Tạo / Sửa đơn và Đơn chờ xác nhận. Chép khung từ kịch bản đợt A ngày 21/11 (lần lưu 66e606025, nhánh claude/khung-goc-dot-a-c4297e — ảnh của lượt đó KHÔNG dùng),
// thêm: --thay-css (thay /app.css của trang bằng một tệp, như kịch bản đợt gốc 24/11), dùng lại phiên đăng nhập đã lưu (<ra>/phien.json — mỗi tài khoản thử chỉ
// đăng nhập một nơi), trạng thái rỗng và không quyền của Đơn chờ xác nhận, và bốn phép đo của ADR-0234 Đ5b (cùng đoạn đo với `npm run do-khung`).
// Hai lượt: «truoc» (trang như đang có) và «sau» (tệp kiểu đề xuất + đoạn sắp lại phần tử tiêm vào trang đang chạy — KHÔNG sửa mã của Nền tảng).
// Sau thi công: chụp trang thật bằng cùng kịch bản, không --thay-css/--sap, rồi so bằng docs/evidence/2026-11-21-khung-goc-thi-cong/kich-ban/so-anh.py.
// Chỉ GET trên máy chủ thử cục bộ, kho dữ liệu giả; thao tác trong trang chỉ bấm và gõ phía trình duyệt (không lưu). Ảnh ghi NGOÀI kho (ADR-0215 Đ3).
//
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   node docs/evidence/2026-11-24-khung-goc-dot-a/kich-ban/chup.mjs --nhan truoc
//   node docs/evidence/2026-11-24-khung-goc-dot-a/kich-ban/chup.mjs --nhan sau --thay-css <app.css đề xuất> --sap docs/evidence/2026-11-24-khung-goc-dot-a/lop-xem-truoc/sap-lai.js
//   tuỳ chọn: [--base http://127.0.0.1:8855] [--ra ~/tourdao-dot-a-2026-11-24] [--man tao-don,cho-xac-nhan] [--kho 390x844,1280x800,1440x900]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";
import { DO_TRONG_TRANG } from "../../../../scripts/giao-dien/cham-khung-goc.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8855");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ chụp trên máy chủ thử cục bộ."); process.exit(2); }
const ra = nha(lay("--ra", "~/tourdao-dot-a-2026-11-24"));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho: ảnh không được ghi vào kho.`); process.exit(2); }
const NHAN = lay("--nhan", "truoc");
const THAY = lay("--thay-css") ? readFileSync(nha(lay("--thay-css")), "utf8") : null;
const LOP = lay("--lop") ? readFileSync(nha(lay("--lop")), "utf8") : null;
const SAP = lay("--sap") ? readFileSync(nha(lay("--sap")), "utf8") : null;
const CAO_DT = Number(lay("--cao-dt", "7000"));
const KHO = lay("--kho", "390x844,1280x800,1440x900").split(",").map((k) => { const [w, h] = k.split("x").map(Number); return { w, h, mobile: w < 600, nhan: k }; });

// Mã bản ghi của kho dữ liệu giả (chép từ lượt 24/11): đơn nháp TD-20261113-0048 có ba dịch vụ; bốn đơn đang chờ xác nhận.
const DON_NHAP = "dcedc863-9fd9-4b5f-83cd-929b7f3f66aa";
const DON_DA_XAC_NHAN = "e7ee8ad3-713f-4ef4-a8c9-2d74dbac531a"; // TD-20261113-0003, đơn đã xác nhận của Bán hàng: trang Sửa đơn khoá
// `thao`: thao tác trong trang sau khi tải, TRƯỚC lớp xem trước (chỉ bấm và gõ phía trình duyệt). Chỉ dùng id và data-action mà mã giữ nguyên khi chuyển khuôn.
const MO_SUA = `(async () => { const ngu = (ms) => new Promise((x) => setTimeout(x, ms));
  document.querySelector("#services .svc-mo")?.click(); await ngu(300);
  for (let i = 0; i < 2; i++) { document.querySelector('[data-action="them-khach"]')?.click(); await ngu(200); }
  const ten = ["Nguyễn Văn An", "Trần Thị Bình"]; [...document.querySelectorAll('#hk-card input[type="text"]')].slice(0, 2).forEach((o, i) => { o.value = ten[i]; o.dispatchEvent(new Event("input", { bubbles: true })); });
  await ngu(200); if (innerWidth < 600) document.getElementById("sum-mo")?.click(); await ngu(300); })()`;
// `truocTai`: đoạn chạy TRƯỚC mọi script của trang (Page.addScriptToEvaluateOnNewDocument). Rỗng: trả danh sách chờ rỗng cho đúng một đường API (không gửi gì lên máy chủ).
const RONG_CHO = `(() => { const goc = window.fetch; window.fetch = (u, o) => String(u).includes("/api/orders/cho-xac-nhan") ? Promise.resolve(new Response(JSON.stringify({ don: [] }), { status: 200, headers: { "content-type": "application/json" } })) : goc(u, o); })();`;
export const MAN = [
  { khoa: "tao-don", ten: "Tạo đơn", tk: "sales", trang: "/order-form" },
  { khoa: "sua-don", ten: "Sửa đơn", tk: "sales", trang: `/order-form?id=${DON_NHAP}` },
  { khoa: "sua-don-mo", ten: "Sửa đơn — mở thẻ dịch vụ, thêm hai hành khách, mở chi tiết tiền (điện thoại)", tk: "sales", trang: `/order-form?id=${DON_NHAP}`, thao: MO_SUA },
  { khoa: "tao-don-doi-tac", ten: "Tạo đơn — tài khoản Đối tác", tk: "ctv", trang: "/order-form" },
  { khoa: "tao-don-khong-quyen", ten: "Tạo đơn — tài khoản không lập đơn (Kế toán)", tk: "ketoan", trang: "/order-form" },
  { khoa: "sua-don-da-xac-nhan", ten: "Sửa đơn — đơn đã xác nhận (khoá)", tk: "sales", trang: `/order-form?id=${DON_DA_XAC_NHAN}` },
  { khoa: "cho-xac-nhan", ten: "Đơn chờ xác nhận", tk: "quantri", trang: "/cho-xac-nhan" },
  { khoa: "cho-xac-nhan-rong", ten: "Đơn chờ xác nhận — không còn đơn nào", tk: "quantri", trang: "/cho-xac-nhan", truocTai: RONG_CHO },
  { khoa: "cho-xac-nhan-khong-quyen", ten: "Đơn chờ xác nhận — tài khoản không xét duyệt (Kế toán)", tk: "ketoan", trang: "/cho-xac-nhan" },
];
const chon = lay("--man") ? new Set(lay("--man").split(",")) : null;
const man = MAN.filter((m) => !chon || chon.has(m.khoa));
const dsTk = Object.fromEntries(JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.map((t) => [t.khoa, t]));

// Phiên đăng nhập dùng chung với các lượt khác trên cùng kho dữ liệu: còn sống thì dùng lại, hết thì đăng nhập MỘT lần rồi ghi lại.
const phienTep = join(ra, "phien.json");
const phien = existsSync(phienTep) ? JSON.parse(readFileSync(phienTep, "utf8")) : {};
const conSong = async (ck) => (await fetch(`${base}/api/auth/me`, { headers: { cookie: `${ck.name}=${ck.value}` } }).catch(() => ({ status: 0 }))).status === 200;
async function cookieCua(khoa) {
  if (phien[khoa] && await conSong(phien[khoa])) return phien[khoa];
  phien[khoa] = await dangNhap(base, dsTk[khoa].sdt, dsTk[khoa].pin);
  writeFileSync(phienTep, JSON.stringify(phien));
  return phien[khoa];
}

const di = async (ngan, url) => {
  await ngan.s("Page.navigate", { url });
  const het = Date.now() + 7000;
  for (;;) { await sleep(120); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; }
  const con = Math.max(600, het - Date.now());
  await ngan.ev(`new Promise((xong) => { const het = Date.now() + ${con}; let t; const thu = () => { if (Date.now() > het || !document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true'], .skeleton-list:not([hidden])")) { o.disconnect(); xong(); } else t = setTimeout(thu, 300); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 500); }); o.observe(document.body, { childList: true, subtree: true }); t = setTimeout(thu, 500); })`).catch(() => {});
  await sleep(500);
};
const chup = async (ngan, tep, caoToiDa) => {
  const cao = await ngan.ev(`Math.min(Math.max(document.documentElement.scrollHeight, innerHeight), ${caoToiDa})`); const rong = await ngan.ev("innerWidth");
  const r = await ngan.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: rong, height: cao, scale: 1 } });
  if (!r.result?.data) throw new Error(`chụp lỗi: ${JSON.stringify(r.error ?? r).slice(0, 160)}`);
  writeFileSync(tep, Buffer.from(r.result.data, "base64"));
};

mkdirSync(join(ra, "anh", NHAN), { recursive: true }); mkdirSync(join(ra, "so-do", NHAN), { recursive: true });
const theoTk = new Map();
for (const m of man) { if (!theoTk.has(m.tk)) theoTk.set(m.tk, []); theoTk.get(m.tk).push(m); }
const chrome = await moChrome();
let hong = 0;
try {
  for (const [tk, ds] of theoTk) {
    const ngan = await chrome.moNgan();
    await ngan.cookie(await cookieCua(tk), base);
    for (const k of KHO) {
      await ngan.khung(k.w, k.h, k.mobile, k.mobile ? 2 : 1, k.mobile ? "iphone" : "may-tinh");
      for (const m of ds) {
        let idTruoc = null;
        try {
          if (m.truocTai) idTruoc = (await ngan.s("Page.addScriptToEvaluateOnNewDocument", { source: m.truocTai })).result?.identifier ?? null;
          await di(ngan, base + m.trang);
          if (m.trang.startsWith("/order-form")) await sleep(8500); // Tạo đơn giữ một dải trống đầu trang tới 8 giây khi trang trước có dải nhắc (web/giu-cho-dai.ts)
          if (m.thao) { await ngan.ev(`${m.thao}.then(() => 0)`); await sleep(300); }
          if (THAY) { const n = await ngan.ev(`(() => { const l = document.querySelector('link[rel="stylesheet"][href^="/app.css"]'); if (!l) return 0; const s = document.createElement("style"); s.id = "tep-kieu-thay"; s.textContent = ${JSON.stringify(THAY)}; l.before(s); l.remove(); return 1; })()`); if (n !== 1) throw new Error("không thấy thẻ <link> /app.css để thay"); }
          if (LOP) await ngan.ev(`(() => { const s = document.createElement("style"); s.id = "xem-truoc-dot-a"; s.textContent = ${JSON.stringify(LOP)}; document.head.append(s); })(); 0`);
          if (SAP) await ngan.ev(`(() => { ${SAP}\n })(); 0`);
          if (THAY || LOP || SAP) await sleep(450);
          await ngan.ev("scrollTo(0,0);0"); await sleep(150);
          const so = await ngan.ev(DO_TRONG_TRANG);
          const cao = await ngan.ev("document.documentElement.scrollHeight");
          // Kéo khung nhìn cao bằng trang rồi mới chụp, để thanh dính đáy và thanh tab nằm ở CUỐI ảnh (chụp «vượt khung» thì chúng nằm lơ lửng giữa ảnh).
          await ngan.khung(k.w, Math.min(Math.max(cao, k.h), k.mobile ? CAO_DT : 3600), k.mobile, k.mobile ? 2 : 1, k.mobile ? "iphone" : "may-tinh"); await sleep(350);
          await chup(ngan, join(ra, "anh", NHAN, `${m.khoa}-${k.w}.png`), k.mobile ? CAO_DT : 3600);
          await ngan.khung(k.w, k.h, k.mobile, k.mobile ? 2 : 1, k.mobile ? "iphone" : "may-tinh");
          writeFileSync(join(ra, "so-do", NHAN, `${m.khoa}-${k.w}.json`), JSON.stringify({ man: m.khoa, rong: k.w, cao, ...so }));
          const co = so.tranNgang || so.bop;
          if (co) hong++;
          console.log(`${co ? "✗" : "✓"} ${NHAN} ${m.khoa} @${k.nhan}: cao ${cao}, chữ đậm ${Math.round(so.tiLeDam * 100)} %, nút đặc ${so.nutDac}, tiền lệch ${so.tienLech}, bóng ${so.bongKhoi}${so.tranNgang ? ", TRÀN NGANG" : ""}${so.bop ? `, chữ bị bóp ${so.bop}` : ""}${ngan.loi.length ? ` · lỗi trang: ${ngan.loi.slice(0, 2).join(" | ")}` : ""}`);
        } catch (e) { hong++; console.log(`✗ ${NHAN} ${m.khoa} @${k.nhan}: ${String(e.message ?? e).slice(0, 200)}`); }
        finally { if (idTruoc) await ngan.s("Page.removeScriptToEvaluateOnNewDocument", { identifier: idTruoc }); }
      }
    }
    await ngan.dong();
  }
} finally { await chrome.tat(); }
process.exit(hong ? 2 : 0);
