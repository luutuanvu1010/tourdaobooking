// Kịch bản chụp của ĐỢT C khung gốc (10 trang Tiền, 25/11/2026) — chép từ kịch bản cùng tên của đợt B (hồ sơ có ngày, không sửa); chỉ đổi bảng màn, cổng 8881,
// thư mục ~/tourdao-dot-c-2026-11-25. Phần chú thích dưới đây là của bản đợt B.
// Kịch bản chụp của ĐỢT B khung gốc (15 trang Tài xế và Vận chuyển, 24/11/2026) — chép từ kịch bản cùng tên của đợt gốc thị giác (hồ sơ có ngày, không sửa).
// Khác bản gốc: (1) bảng màn riêng `bang-man.json` cùng thư mục (20 màn, có ngày chọn sẵn cho Điều phối xe); (2) màn khai `gio` thì đồng hồ của trang được đặt về
// giờ đó trước khi tải (Page.addScriptToEvaluateOnNewDocument, chỉ Date của trình duyệt — máy chủ vẫn giờ thật); (3) mặc định cổng 8871, thư mục ~/tourdao-dot-b-2026-11-24.
// Ảnh «hiện tại» và «đề xuất» chụp CÙNG cách: cùng bề rộng, cùng khung nhìn, cùng tài khoản và cookie (phien.json — mỗi tài khoản chỉ đăng nhập một nơi).
// Bản chép cho ĐỢT GỐC ngôn ngữ thị giác (ADR-0234 đề xuất, 24/11/2026) từ kịch bản cùng tên của lượt đánh giá thị giác 24/11 (hồ sơ có ngày, không sửa).
// Thêm --thay-css <tệp>: THAY tệp /app.css của trang bằng tệp cho trước (đặt <style> đúng chỗ thẻ <link>, rồi gỡ thẻ đó; /giao-dien.css của bộ núm vẫn đứng sau),
// để ảnh «đề xuất» là đúng thứ mã sẽ vẽ, và ảnh «hiện tại» đi cùng đường (--thay-css public/app.css). Ghi thêm o.chuotMin = matchMedia('(pointer: fine)').matches.
// Kịch bản gốc: Kịch bản chụp và đo của lượt đánh giá THỊ GIÁC 24/11/2026. Với mỗi màn (87 màn của bảng 20/11 + bang-man-them.json) ở mỗi bề rộng:
// mở trang trên máy chủ thử ĐÃ BẬT SẴN, chờ dữ liệu về, chạy đoạn đếm trong trang (do-thi-giac.js), chụp MÀN ĐẦU (thứ người dùng thấy trong ba giây đầu)
// và CẢ TRANG (cắt ở --cao-toi-da). Không bấm gì, không ghi dữ liệu (chỉ đăng nhập và GET). Ảnh và số đo ghi NGOÀI kho.
//
// Chạy từ GỐC kho:
//   node docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/chup.mjs [--base http://127.0.0.1:8851] [--ra ~/tourdao-thi-giac-2026-11-24] [--rong 390,1280,1440]
//        [--so 1,2,5] [--lai] [--luong 3] [--tiem <tệp.css>] [--ten-bo hien-tai] [--khong-do]
// --tiem: chèn một lớp kiểu (thẻ <style>) SAU khi trang tải, trước khi đo và chụp — dùng để xem một phương án mà không sửa mã sản phẩm. --ten-bo đặt tên thư mục con.
// Ghi: <ra>/anh/<tên bộ>/<số>-<bộ quyền>-<trang>-<rộng>-dau.jpg và -ca.jpg; <ra>/so-do/<tên bộ>/<số>-<rộng>.json; <ra>/trang-thai-<tên bộ>.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GOC = process.cwd();
const DAY = "docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban"; // đoạn đo và bảng màn của lượt 24/11, chỉ đọc
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const co = (k) => process.argv.includes(k);
const base = lay("--base") ?? "http://127.0.0.1:8881";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ chụp trên máy chủ thử cục bộ."); process.exit(2); }
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-dot-c-2026-11-25")).replace(/^~/, homedir()));
const rel = relative(resolve(GOC), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho: ảnh không được ghi vào kho.`); process.exit(2); }
const RONG = (lay("--rong") ?? "390,1280").split(",").map(Number);
const chon = lay("--so") ? new Set(lay("--so").split(",").map(Number)) : null;
const lai = co("--lai"), khongDo = co("--khong-do");
const luong = Number(lay("--luong") ?? 3);
const tenBo = lay("--ten-bo") ?? "hien-tai";
const caoToiDa = Number(lay("--cao-toi-da") ?? 5200);
// --tiem nhận một hay nhiều tệp cách nhau bằng dấu phẩy, ghép theo thứ tự (phương án B = lớp A rồi lớp B).
const thayCss = lay("--thay-css") ? readFileSync(lay("--thay-css").replace(/^~/, homedir()), "utf8") : null;
// --dat-rong /phan-dinh=hep,/hoa-hong=rong (đợt C): đổi data-rong của <body> sau khi tải — ảnh «phương án B» (giữ bề rộng cũ) của trang khai lệch bề rộng.
const datRong = Object.fromEntries((lay("--dat-rong") ?? "").split(",").filter(Boolean).map((x) => x.split("=")));
const tiemCss = lay("--tiem") ? lay("--tiem").split(",").map((t) => readFileSync(t, "utf8")).join("\n") : null;

const { moChrome, dangNhap, sleep } = await import(pathToFileURL(join(GOC, "scripts/giao-dien/cdp.mjs")).href);
const DO = readFileSync(join(GOC, DAY, "do-thi-giac.js"), "utf8");
const KHOA_TK = { SALES: "sales", INTERN: "intern", ACCOUNTING: "ketoan", ADMIN: "quantri", FIELD: "hdv", PARTNER: "ctv", SUPER_ADMIN: "toanquyen", DRIVER: "taixe", DRIVER_PARTNER: "taixedt", HR: "nhansu", SALES_MANAGER: "qlbh" };
const dsTk = Object.fromEntries(JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const docBang = (t) => JSON.parse(readFileSync(join(GOC, t), "utf8")).man;
const man = docBang("docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/bang-man.json").filter((m) => !chon || chon.has(m.so));
const tenTrang = (p) => { const d = p.split("?")[0]; return d === "/" ? "trang-chu" : d.slice(1).replace(/[^a-z0-9-]/gi, "_"); };
const khoa = (m) => `${String(m.so).padStart(3, "0")}-${m.bo}${m.tk ? "_" + m.tk : ""}-${tenTrang(m.trang)}`;
const anhDir = join(ra, "anh", tenBo), doDir = join(ra, "so-do", tenBo);
mkdirSync(anhDir, { recursive: true }); mkdirSync(doDir, { recursive: true });
const ttTep = join(ra, `trang-thai-${tenBo}.json`);
const trangThai = existsSync(ttTep) ? JSON.parse(readFileSync(ttTep, "utf8")) : {};
const KHUNG = (w) => (w < 641 ? { w, h: 844, mobile: true, dpr: 2 } : { w, h: w >= 1400 ? 900 : 800, mobile: false, dpr: 1 });

async function motO(ngan, m, w) {
  const k = KHUNG(w);
  await ngan.khung(k.w, k.h, k.mobile, k.dpr);
  const duong = m.trang === "/order" && m.don ? `/order?id=${m.don}` : m.trang;
  // Đồng hồ trang (màn khai «gio»): thay Date bằng một lớp con lệch đúng khoảng tới giờ đó; gỡ ngay sau khi chụp để màn sau dùng giờ thật.
  let gioId = null;
  if (m.gio) {
    const lech = Date.parse(m.gio) - Date.now();
    const r = await ngan.s("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const L = ${lech}; const D = Date; class G extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + L); } static now() { return D.now() + L; } } window.Date = G; })();` });
    gioId = r.result?.identifier ?? null;
  }
  try { await ngan.di(base + duong); } finally { if (gioId) await ngan.s("Page.removeScriptToEvaluateOnNewDocument", { identifier: gioId }); }
  // Tạo đơn giữ một dải trống ở đầu trang tới 8 giây khi trang trước có dải nhắc (web/giu-cho-dai.ts): chờ hết rồi mới chụp.
  await sleep(tenTrang(m.trang) === "order-form" ? 9000 : 1100);
  if (thayCss) { const n = await ngan.ev(`(() => { const l = document.querySelector('link[rel="stylesheet"][href^="/app.css"]'); if (!l) return 0; const s = document.createElement("style"); s.id = "tep-kieu-thay"; s.textContent = ${JSON.stringify(thayCss)}; l.before(s); l.remove(); return 1; })()`); if (n !== 1) throw new Error("không thấy thẻ <link> /app.css để thay"); await sleep(400); }
  if (datRong[m.trang.split("?")[0]]) { await ngan.ev(`document.body.dataset.rong = ${JSON.stringify(datRong[m.trang.split("?")[0]])}; 0`); await sleep(400); }
  if (tiemCss) { await ngan.ev(`(() => { const s = document.createElement("style"); s.id = "lop-kieu-de-xuat"; s.textContent = ${JSON.stringify(tiemCss)}; document.head.appendChild(s); })(); 0`); await sleep(350); }
  const cuoi = String(await ngan.ev("location.pathname + location.search"));
  const o = { url: cuoi.replace(/id=[^&]+/, "id=…"), chuyen: cuoi.split("?")[0] !== m.trang.split("?")[0] };
  if (m.bo !== "KHACH" && /^\/login/.test(cuoi)) throw new Error("bị đẩy về trang Đăng nhập (phiên đã bị kết thúc)");
  o.chuotMin = await ngan.ev("matchMedia('(pointer: fine)').matches");
  if (!khongDo) o.do = await ngan.ev(DO);
  await ngan.ev("scrollTo(0,0);0");
  const ten = `${khoa(m)}-${w}`;
  const dau = await ngan.s("Page.captureScreenshot", { format: "jpeg", quality: 82, captureBeyondViewport: false });
  writeFileSync(join(anhDir, `${ten}-dau.jpg`), Buffer.from(dau.result.data, "base64"));
  const cao = await ngan.ev("document.documentElement.scrollHeight");
  o.caoTrang = cao;
  if (cao > k.h + 8) {
    // Cả trang chụp ở độ nét 1 (ảnh dài), cắt ở caoToiDa; phần còn lại ghi vào conLaiPx để báo cáo nói rõ chưa chụp hết.
    await ngan.khung(k.w, k.h, k.mobile, 1);
    await sleep(150);
    const c = Math.min(cao, caoToiDa);
    const ca = await ngan.s("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: k.w, height: c, scale: 1 } });
    if (ca.result?.data) writeFileSync(join(anhDir, `${ten}-ca.jpg`), Buffer.from(ca.result.data, "base64"));
    o.conLaiPx = Math.max(0, cao - c);
  }
  if (o.do) writeFileSync(join(doDir, `${ten}.json`), JSON.stringify({ so: m.so, bo: m.bo, tk: m.tk ?? null, trang: m.trang.replace(/id=[^&]+/, "id=…"), ho: m.ho, rong: w, ...o }));
  return o;
}

// MỖI TÀI KHOẢN ĐĂNG NHẬP ĐÚNG MỘT LẦN cho cả lượt, mọi luồng dùng chung cookie đó, và cookie được giữ ở <ra>/phien.json cho lượt sau.
// Lý do (quan sát 24/11): Nền tảng báo «Tài khoản vừa đăng nhập trên máy khác» và kết thúc phiên cũ khi cùng tài khoản đăng nhập lần nữa;
// lượt đầu để mỗi luồng tự đăng nhập nên 46 màn bị đẩy về trang Đăng nhập. Kịch bản khác dùng chung tài khoản cũng nên đọc phien.json thay vì đăng nhập lại.
const phienTep = join(ra, "phien.json");
const phienLuu = existsSync(phienTep) ? JSON.parse(readFileSync(phienTep, "utf8")) : {};
const dangCho = new Map();
const conSong = async (ck) => (await fetch(`${base}/api/auth/me`, { headers: { cookie: `${ck.name}=${ck.value}` } }).catch(() => ({ status: 0 }))).status === 200;
function cookieCua(tk) {
  if (!dangCho.has(tk.khoa)) dangCho.set(tk.khoa, (async () => {
    const cu = phienLuu[tk.khoa];
    if (cu && await conSong(cu)) return cu;
    const moi = await dangNhap(base, tk.sdt, tk.pin);
    phienLuu[tk.khoa] = moi; writeFileSync(phienTep, JSON.stringify(phienLuu));
    return moi;
  })());
  return dangCho.get(tk.khoa);
}

const hang = [...man];
let hong = 0, xong = 0;
async function tho(i) {
  const chrome = await moChrome({ tuXuLyTinHieu: i === 0 });
  const ngans = new Map();
  try {
    for (;;) {
      const m = hang.shift(); if (!m) break;
      const kh = khoa(m);
      if (!lai && trangThai[kh]?.xong) { xong++; continue; }
      const tk = m.bo === "KHACH" ? null : dsTk[m.tk ?? KHOA_TK[m.bo]];
      const khoaNgan = m.bo === "KHACH" ? "KHACH" : tk.khoa;
      let ngan = ngans.get(khoaNgan);
      const kq = { so: m.so, bo: m.bo, trang: m.trang.replace(/id=[^&]+/, "id=…"), o: {}, loi: [] };
      try {
        if (!ngan) { ngan = await chrome.moNgan(); if (tk) await ngan.cookie(await cookieCua(tk), base); ngans.set(khoaNgan, ngan); }
        for (const w of RONG) {
          try { const o = await Promise.race([motO(ngan, m, w), new Promise((_, rej) => setTimeout(() => rej(new Error("hết giờ 75 s")), 75000))]); kq.o[w] = { url: o.url, chuyen: o.chuyen, chuotMin: o.chuotMin, caoTrang: o.caoTrang, conLaiPx: o.conLaiPx ?? 0, khungGoc: o.do?.khungGoc ?? null }; }
          catch (e) { kq.loi.push(`@${w}: ${String(e.message).slice(0, 200)}`); }
        }
      } catch (e) { kq.loi.push(String(e.message).slice(0, 200)); }
      kq.xong = kq.loi.length === 0;
      if (!kq.xong) hong++;
      trangThai[kh] = kq;
      writeFileSync(ttTep, JSON.stringify(trangThai, null, 1));
      xong++;
      console.error(`${kq.xong ? "✓" : "✗"} [${xong}/${man.length}] ${kh}${kq.loi.length ? " — " + kq.loi.join("; ") : ""}`);
    }
  } finally { await chrome.tat(); }
}
await Promise.all(Array.from({ length: Math.min(luong, man.length) }, (_, i) => tho(i)));
console.log(`Xong ${man.length} màn (${RONG.join(", ")}); màn có ô hỏng: ${hong}. Trạng thái: ${ttTep}`);
process.exit(hong ? 1 : 0);
