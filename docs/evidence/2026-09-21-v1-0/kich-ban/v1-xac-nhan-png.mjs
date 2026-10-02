// Kiểm ẢNH XÁC NHẬN ĐƠN (PNG dựng bằng canvas ở trình duyệt) + hộp thoại "Xác nhận đơn để gửi khách" bằng Chrome thật. Nằm trong repo, không thêm dependency (dùng esbuild
// đã có ở devDependencies để đóng gói bộ vẽ + mô hình thuần thành một script chạy được trong trang, phục vụ đối chiếu byte và đo bố cục).
// Dựa trên môi trường của A2 (`../../2026-09-20-a2/kich-ban/a2-cdp.mjs`: D1 tạm + `wrangler dev` + Chrome headless qua CDP; Turnstile TẮT). Chạy từ GỐC repo, sau `npm run build:web`:
//   npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs
// (`axe-core` lấy bằng `npm pack axe-core` NGOÀI repo; `ONLY=a,b` chỉ chạy vài bước — nhiều bước dùng chung đơn tạo ở bước a nên tự tạo lại khi cần; `OUT=…` đổi thư mục ghi.)
// Ghi: <OUT>/anh/xac-nhan-*.png (ảnh mẫu + ảnh chụp hộp thoại) và <OUT>/ket-qua-xac-nhan-png.json. Mỗi bước in một dòng "✓"/"✗"; thoát mã 1 nếu có bước ✗ (không dừng ở bước hỏng đầu tiên).
// Không cần mạng ngoài (không đọc Google Sheet: danh mục giả do a2-cdp.mjs chèn vào D1 tạm; phông chữ tự lưu trữ).
//
//   a  tạo đơn BẰNG GIAO DIỆN (dịch vụ theo người có thông tin chuyến + dịch vụ danh mục thứ hai; trước 2026-09-26 là dịch vụ nhập tay — DK-T3-01 R1) → chuyển tới /order?id=…&moi=1, hộp thoại tự mở, ảnh hiện, URL đã bỏ moi
//   b  PNG: chữ ký PNG, giải mã được, rộng ≥ 1440, cao đúng bố cục, KHÔNG trống; mọi khối chữ có mực đúng màu; dải màu chính và chữ nổi bật (--c-accent) đúng chỗ; dấu tiếng Việt
//      được vẽ (mực nằm trên đỉnh chữ hoa); phông Việt đã nạp; ảnh của hộp thoại GIỐNG HỆT (từng byte) bản dựng từ mô hình kỳ vọng và KHÁC bản dựng từ mô hình khác (đối chứng)
//   c  tải: <a download="xac-nhan-<mã>.png"> trỏ blob: URL giải mã được; mọi blob: URL tạo ra đều bị thu hồi khi đóng (không còn tải được)
//   d  chia sẻ: nút chỉ hiện khi navigator.canShare({ files }) đúng; bấm → navigator.share nhận đúng tệp PNG; người dùng huỷ thì im lặng, lỗi khác thì báo tiếng Việt
//   e  tải lại trang KHÔNG bật lại hộp thoại; mở đơn không kèm moi và SỬA đơn nháp cũng không tự bật; nút "Xác nhận gửi khách" luôn có
//   f  đơn đã xác nhận / đã huỷ mở lại bằng nút, huy hiệu đúng chữ và đúng màu token; SALES khác và kế toán cũng có nút (quyết định: chỉ xem, không cần quyền sửa)
//   g  người phụ trách BA trạng thái, không hai (quyết định chủ dự án 2026-09-28, "một sự thật duy nhất"): API có tên → in tên; API xác nhận RÕ chưa có
//      người → câu chờ nhận, KHÔNG BAO GIỜ tên người lập; 404/500/mất mạng/hết giờ 3 giây/dữ liệu hỏng (thiếu khoá, `name` sai dạng/rỗng) → KHÔNG tạo ảnh,
//      báo lỗi tiếng Việt cố định + nút Thử lại
//   g2 bằng chứng: đơn THẬT chưa có người phụ trách (đóng dòng HANDLE bằng SQL, không phải giả lập fetch) → ảnh vẫn ra đúng câu chờ nhận, không tràn/chồng
//      chữ, không lộ tên người lập; ghi <OUT>/anh/xac-nhan-chua-co-phu-trach.png như mọi ảnh mẫu khác (tôn trọng OUT); bản đã commit ở
//      docs/evidence/thong-bao/bien-nhan-chua-co-phu-trach.png là bản chép tay một lần, không phải do kịch bản tự ghi mỗi lần chạy
//   h  đơn cỡ tối đa (20 dịch vụ, 50 dòng tiền, tên 100+ ký tự liền, tiền 100.000.000.000 ₫, ghi chú dài) và tiền rộng quá cột: không lỗi, không tràn lề, không chữ chồng nhau,
//      mọi chữ có mực, không vượt giới hạn diện tích canvas
//   i  vẽ lỗi (công ty lỗi, phông lỗi, phông treo, toBlob trả null, getContext null): thông báo tiếng Việt + nút Thử lại, không kẹt (Esc đóng được), Thử lại ra ảnh
//   j  hộp thoại: role=dialog + aria-modal + tên, nền inert, Esc/chạm nền đóng, trả focus; axe 0 vi phạm (390, 1040, trạng thái lỗi); vùng chạm ≥ 44 px; không tràn ngang; console/CSP sạch
//   k  ảnh mẫu (một dịch vụ, nhiều dịch vụ, đơn dài) qua đúng đường giao diện + ảnh chụp hộp thoại 390×844 và 1040×800; thời gian dựng
//   l  (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-2, 2026-09-27) HƯỚNG DẪN VIÊN mở biên nhận đơn CHÍNH MÌNH phụ trách: ảnh GIỐNG từng byte bản dựng với
//      tên HDV (dòng "Nhân viên phụ trách"), KHÁC bản bỏ dòng; KHÔNG gọi GET /api/dispatch/handlers (403 với HDV — trước vòng sửa ảnh MẤT dòng này)
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { ACCOUNTS, clickText, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-21-v1-0";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const AXE = readFileSync(process.env.AXE_JS ?? "", "utf8");
const ANH = join(OUT, "anh");
mkdirSync(ANH, { recursive: true });

const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const results = { ghiChu: "Đo bằng Chrome headless trên wrangler dev cục bộ (D1 tạm, danh mục giả); không phải iPhone thật, không phải WebKit.", buoc: [], axe: {}, do: {}, anh: {}, thoiGian: {}, lon: {} };
let failures = 0;
let passed = 0;
async function step(id, name, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
    results.buoc.push({ id, name, dat: true });
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
    results.buoc.push({ id, name, dat: false, loi: msg.slice(0, 1200) });
  }
}

// ---- Bộ vẽ + mô hình thuần đóng gói thành script chạy được trong trang (`__lib`) ----
const LIB_ENTRY = [
  'export { prepareConfirmation, renderConfirmationPng, CONFIRMATION_WIDTH, CONFIRMATION_MARGIN } from "./web/confirmation-image.ts";',
  'export { buildConfirmation } from "./src/shared/order-confirmation.ts";',
  // Sổ tiền lượt 1 (ADR-0026 đ11): ảnh dựng từ ReceiptDto (danh sách trắng) — đơn giả của bước h đi qua CHÍNH hàm dựng biên nhận của máy chủ.
  'export { dungBienNhan } from "./src/modules/receipt/rules.ts";',
].join("\n");
let LIB_JS = null;
let libError = "";
try {
  const r = await build({ stdin: { contents: LIB_ENTRY, resolveDir: process.cwd(), sourcefile: "lib-entry.ts", loader: "ts" }, bundle: true, format: "iife", globalName: "__lib", target: "es2022", write: false, logLevel: "silent" });
  LIB_JS = r.outputFiles[0].text;
} catch (e) {
  libError = String(e?.message ?? e).split("\n").slice(0, 4).join(" | ");
}
const installLib = async (p) => {
  assert.ok(LIB_JS, `chưa đóng gói được bộ vẽ (web/confirmation-image.ts): ${libError}`);
  await p.ev(`${LIB_JS}\n;true`);
};

// ---- Hàm phụ chạy TRONG trang: giải mã PNG, đọc token màu, đo bố cục/điểm ảnh ----
const PAGE_JS = `(() => {
  const colors = new Map();
  const t = {
    rgb(css) {
      if (colors.has(css)) return colors.get(css);
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const x = c.getContext('2d'); x.fillStyle = css; x.fillRect(0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data; const v = [d[0], d[1], d[2]]; colors.set(css, v); return v;
    },
    token(name) { return t.rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim()); },
    async blobOf(url) { const b = window.__blob.blobs.get(url); if (!b) throw new Error('không có Blob của ' + url); return b; },
    async decode(blob) {
      const bmp = await createImageBitmap(blob);
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
      return { w: bmp.width, h: bmp.height, data: x.getImageData(0, 0, bmp.width, bmp.height).data };
    },
    async sameBytes(a, b) {
      const [p, q] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
      if (p.byteLength !== q.byteLength) return false;
      const u = new Uint8Array(p), v = new Uint8Array(q);
      for (let i = 0; i < u.length; i++) if (u[i] !== v[i]) return false;
      return true;
    },
    async b64(url) {
      const u8 = new Uint8Array(await (await t.blobOf(url)).arrayBuffer()); let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    },
    async modelOf(orderId, handler) {
      const r = await fetch('/api/orders/' + orderId + '/receipt').then((x) => x.json()); // sổ tiền lượt 1: biên nhận danh sách trắng (đã trả / còn lại từ billing)
      return __lib.buildConfirmation(r.receipt, handler);
    },
    /** Phân tích một ảnh PNG theo bố cục của CHÍNH mô hình: mọi khối chữ có mực đúng màu, lề trống, đáy trống, dải màu chính, dấu tiếng Việt, chồng chữ. */
    async analyzeModel(model, blob) {
      const pr = await __lib.prepareConfirmation(model);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const d = await t.decode(blob);
      const L = pr.layout, s = pr.scale, W = L.width, MG = __lib.CONFIRMATION_MARGIN;
      const at = (x, y) => { const xx = Math.min(d.w - 1, Math.max(0, Math.round(x))), yy = Math.min(d.h - 1, Math.max(0, Math.round(y))); const i = (yy * d.w + xx) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]]; };
      const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      const count = (x0, y0, x1, y1, rgb, tol) => {
        let n = 0; const xa = Math.max(0, Math.floor(x0)), xb = Math.min(d.w, Math.ceil(x1)), ya = Math.max(0, Math.floor(y0)), yb = Math.min(d.h, Math.ceil(y1));
        for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { const i = (y * d.w + x) * 4; if (Math.abs(d.data[i] - rgb[0]) + Math.abs(d.data[i + 1] - rgb[1]) + Math.abs(d.data[i + 2] - rgb[2]) <= tol) n++; }
        return n;
      };
      const texts = L.ops.filter((o) => o.kind === 'text');
      const boxOf = (o) => { const x0 = o.align === 'right' ? o.x - o.width : o.align === 'center' ? o.x - o.width / 2 : o.x; return { x0, x1: x0 + o.width, y0: o.y - o.ascent, y1: o.y + o.descent }; };
      const inkMissing = [];
      for (const o of texts) { const b = boxOf(o); if (count(b.x0 * s, b.y0 * s, b.x1 * s, b.y1 * s, t.rgb(o.color), 90) < 3) inkMissing.push(o.text); }
      const outOfMargin = texts.filter((o) => { const b = boxOf(o); return b.x0 < MG - 0.6 || b.x1 > W - MG + 0.6; }).map((o) => o.text.slice(0, 40));
      const overlaps = [];
      const bx = texts.map((o) => { const b = boxOf(o); const h = (o.ascent + o.descent) * 0.85, c = (b.y0 + b.y1) / 2; return { text: o.text, x0: b.x0, x1: b.x1, y0: c - h / 2, y1: c + h / 2 }; });
      for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
        const ix = Math.min(bx[i].x1, bx[j].x1) - Math.max(bx[i].x0, bx[j].x0), iy = Math.min(bx[i].y1, bx[j].y1) - Math.max(bx[i].y0, bx[j].y0);
        if (ix > 1 && iy > 1) overlaps.push([bx[i].text.slice(0, 30), bx[j].text.slice(0, 30)]);
      }
      const WHITE = [255, 255, 255];
      let marginInk = 0;
      for (let y = Math.round(12 * s); y < d.h; y += 1) {
        for (let x = 0; x < Math.round((MG - 6) * s); x++) { const i = (y * d.w + x) * 4; if (Math.abs(d.data[i] - 255) + Math.abs(d.data[i + 1] - 255) + Math.abs(d.data[i + 2] - 255) > 6) marginInk++; }
        for (let x = Math.round((W - MG + 6) * s); x < d.w; x++) { const i = (y * d.w + x) * 4; if (Math.abs(d.data[i] - 255) + Math.abs(d.data[i + 1] - 255) + Math.abs(d.data[i + 2] - 255) > 6) marginInk++; }
      }
      const bottomInk = count(0, d.h - Math.round(20 * s), d.w, d.h, WHITE, 6) === d.w * Math.round(20 * s) ? 0 : 1;
      let nonWhite = 0; for (let i = 0; i < d.data.length; i += 4) if (Math.abs(d.data[i] - 255) + Math.abs(d.data[i + 1] - 255) + Math.abs(d.data[i + 2] - 255) > 12) nonWhite++;
      const primary = t.token('--c-primary');
      const stripe = at(d.w / 2, 3 * s);
      const title = texts.find((o) => o.tag === 'title');
      let diacritics = null;
      if (title) {
        const c = document.createElement('canvas').getContext('2d'); c.font = title.font;
        const cap = c.measureText('XAC NHAN DON DICH VU').actualBoundingBoxAscent; // đỉnh chữ hoa không dấu (px CSS)
        const b = boxOf(title);
        diacritics = { capTopY: title.y - cap, ink: count(b.x0 * s, (title.y - title.ascent) * s, b.x1 * s, (title.y - cap - 1) * s, t.rgb(title.color), 60) };
      }
      const emph = texts.filter((o) => o.tag === 'emphasis');
      const fonts = [...document.fonts].filter((f) => f.status === 'loaded' && /1EA0/i.test(f.unicodeRange)).map((f) => f.family.replace(/["']/g, '') + ' ' + f.weight);
      return {
        sig: [...buf.slice(0, 8)].map((v) => v.toString(16).padStart(2, '0')).join(''), type: blob.type, bytes: blob.size,
        w: d.w, h: d.h, layoutW: W, layoutH: L.height, scale: s, area: d.w * d.h,
        nonWhiteRatio: nonWhite / (d.w * d.h),
        stripe, stripeDist: dist(stripe, primary),
        texts: texts.length, inkMissing, outOfMargin, overlaps: overlaps.slice(0, 8), overlapCount: overlaps.length, marginInk, bottomInk,
        diacritics, emphasis: { ops: emph.length, colorOk: emph.every((o) => dist(t.rgb(o.color), t.token('--c-accent')) <= 6) },
        vnFonts: fonts, ops: L.ops.length,
      };
    },
    async analyze(href, orderId, handler) { return t.analyzeModel(await t.modelOf(orderId, handler), await t.blobOf(href)); },
  };
  window.__t = t;
})();`;

// ---- Môi trường ----
const env = await startEnv();
const tracked = []; // [nhãn, trang] — bước j đọc lại console/CSP của mọi trang đã mở
const openedPages = [];
// Chặn/đếm blob: URL do trang tạo và thu hồi. CSP của app (`connect-src 'self' …`) KHÔNG cho `fetch("blob:…")` — đúng, vì app chỉ cần `<img>`/`<a download>` (img-src blob:) — nên bằng chứng lấy Blob thẳng
// từ nơi tạo URL (`blobs`), và "còn tải được không" thử bằng thẻ ảnh (`probe`), không bằng fetch.
const BLOB_COUNTERS = `(() => { const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL); window.__blob = { created: [], revoked: [], blobs: new Map() };
  URL.createObjectURL = (b) => { const u = c(b); window.__blob.created.push(u); window.__blob.blobs.set(u, b); return u; }; URL.revokeObjectURL = (u) => { window.__blob.revoked.push(u); return r(u); };
  window.__probe = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res('con'); i.onerror = () => res('het'); i.src = u; }); })();`;

/** Mở `path` với phiên của `account`; chèn bộ đếm blob: URL trước mã của trang; nạp hàm phụ + bộ vẽ. */
async function openAs(account, path, { viewport = M, before = "", track = true, lib = true } = {}) {
  const p = await env.openPage(viewport);
  openedPages.push(p);
  if (track) tracked.push([path, p]);
  const c = await env.login(account);
  await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  await p.send("Page.addScriptToEvaluateOnNewDocument", { source: BLOB_COUNTERS + before });
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
  if (lib) {
    await p.ev(PAGE_JS);
    if (LIB_JS) await installLib(p);
  }
  return p;
}
/** Trang đã điều hướng (vd `location.replace` sau khi lưu đơn) mất hàm phụ và bộ vẽ: nạp lại khi cần. */
async function ensureTools(p) {
  if (await p.ev("typeof __t !== 'undefined' && typeof __lib !== 'undefined'")) return;
  await p.ev(PAGE_JS);
  await installLib(p);
}
const SEND_BTN = "document.querySelector('#send button')";
const READY = "(() => { const i = document.querySelector('.sheet .confirm-img'); return !!i && i.complete && i.naturalWidth > 0; })()";
const DIALOG = "document.querySelector('[role=dialog]')";
const waitButton = (p) => p.waitFor(`${SEND_BTN} !== null`, "nút “Xem biên nhận” trên trang đơn", 7000);
async function openDialog(p, ms = 20000) {
  await waitButton(p);
  const t0 = Date.now();
  await p.ev(clickText("#send", "Xem biên nhận"));
  try {
    await p.waitFor(READY, "hộp thoại hiện ảnh xác nhận", ms);
  } catch (e) {
    const seen = await p.ev("document.querySelector('.sheet .sheet-body')?.textContent ?? '(không có hộp thoại)'").catch(() => "?");
    throw new Error(`${e.message}\n    hộp thoại đang hiện: ${String(seen).slice(0, 300)}`);
  }
  return Date.now() - t0;
}
const pressEsc = async (p) => {
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
};
const closeDialog = async (p) => {
  await pressEsc(p);
  await p.waitFor(`${DIALOG} === null`, "hộp thoại đóng bằng Esc", 4000);
};
const downloadHref = "document.querySelector('.sheet a.confirm-download').href";
// Đọc trạng thái người phụ trách THẬT từ máy chủ, BA trạng thái (khớp `loadHandlerName` của `web/confirmation-dialog.ts`, ADR-0020 điều 9): chuỗi tên;
// `null` = máy chủ XÁC NHẬN chưa có người; `undefined` = CHƯA BIẾT (lỗi, mã khác 200, dữ liệu hỏng). Chạy TRONG trang bằng `p.ev(...)`.
const readHandlerJs = (orderId) => `fetch('/api/dispatch/handlers?orderIds=${orderId}').then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((j) => { const f = j?.handlers?.['${orderId}']; if (f === null) return null; return (f && typeof f.name === 'string' && f.name.trim() !== '') ? f.name : undefined; }).catch(() => undefined)`;

// ---- Dữ liệu dựng bằng API (KHÔNG dùng để kiểm giao diện) ----
const call = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const pax = (adult, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const cust = (name, o = {}) => ({ customerName: name, customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", ...o });
// Sổ tiền lượt 1 (ADR-0026 đ9): máy chủ từ chối cọc trong thân đơn (409 client_outdated) — dữ liệu mẫu mang `traTruoc`, `create` ghi thành LẦN THU sau khi lập đơn.
const tour = (o = {}) => ({ kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(7), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise, 12 Trần Phú", checkinTime: "06:45", checkinPlace: "Bến Cầu Đá", ...o });
// Dịch vụ nhập tay (ảnh xác nhận phải vẽ đúng chúng: dữ liệu CŨ vẫn có). 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không
// nhận dịch vụ nhập tay MỚI (400) → gửi dịch vụ danh mục giữ chỗ TTB06 (cùng số khách), `create` đổi nó thành ĐÚNG dịch vụ nhập tay này (tên, các dòng tiền,
// số khách) bằng SQL khi đơn còn nháp (`env.legacyManual`) — dữ liệu y như trước, nên mọi khẳng định về ảnh không đổi.
const manual = (name, items, o = {}) => {
  const { pax: guests = pax(3), ...trip } = o;
  return { kind: "catalog", catalogCode: "TTB06", pax: pax(guests.adult), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, departDate: vnDate(7), ...trip, _legacy: { name, adult: guests.adult, items } }; // ADR-0021: cả đơn một ngày — mọi dịch vụ dựng sẵn cùng vnDate(7)
};
const create = async (account, { traTruoc = 0, traTruocHinhThuc = "OTHER", ...body }) => {
  const r = await call(account, "POST", "/api/orders", { ...body, services: body.services.map(({ _legacy, ...s }) => s) });
  assert.equal(r.status, 201, `dựng đơn: ${r.status} ${JSON.stringify(r.json)}`);
  const order = r.json.order;
  if (traTruoc > 0) {
    const t = await call(account, "POST", `/api/orders/${order.id}/payments`, { soTien: traTruoc, hinhThuc: traTruocHinhThuc, nguoiThu: "cong_ty" });
    assert.equal(t.status, 201, `lần thu trả trước: ${t.status} ${JSON.stringify(t.json)}`);
  }
  if (!body.services.some((s) => s._legacy)) return order;
  body.services.forEach((s, i) => s._legacy && env.legacyManual(order.id, order.services[i].id, s._legacy));
  return (await call(account, "GET", `/api/orders/${order.id}`)).json.order;
};
const LONG_WORD = "Nguyễn-Thị-Hồng-Ngọc-Phương-Uyên-Trần-Lê-Phạm-Hoàng-Huỳnh-Võ-Vũ-Đặng-Bùi-Đỗ-Hồ-Ngô-Dương-Lý"; // 90+ ký tự liền, không dấu cách
let fixtures = null;
async function fx() {
  fixtures ??= (async () => {
    const f = {};
    f.one = await create(ACCOUNTS.salesA, {
      ...cust("Trần Văn Bình", { customerEmail: "binh.tran@example.com", customerNote: "Cả nhà ăn chay, xin xếp ghế gần nhau.", traTruoc: 1000000, traTruocHinhThuc: "BANK_TRANSFER" }),
      services: [tour()],
    });
    f.multi = await create(ACCOUNTS.salesA, {
      ...cust("Lê Thị Hoa", { customerEmail: "hoa.le@example.com", customerNote: "Đón sớm 06:30.\nCó hai cháu nhỏ, cần ghế trẻ em.", discount: 200000, traTruoc: 2000000, traTruocHinhThuc: "CASH" }),
      services: [
        tour({ pax: pax(2, 1, 1), unitPrices: { adult: 1300000, child: 950000, senior: 1200000 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000 } }),
        { kind: "catalog", catalogCode: "TTB03", pax: pax(7), unitPrices: { adult: 1500000 }, catalogPriceSeen: { adult: 1500000 }, ...NO_TRIP, departDate: vnDate(7), departTime: "10:00" },
        { kind: "catalog", catalogCode: "TTB06", pax: pax(3), unitPrices: { adult: 800000 }, catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, departDate: vnDate(7), pickupPlace: "Bến du thuyền Cam Ranh" },
        manual("Xe đưa đón riêng", [{ description: "Xe 7 chỗ 2 chiều", detail: "Sân bay Cam Ranh – khách sạn", quantity: 1, unitPrice: 800000 }, { description: "Nước suối và khăn lạnh", detail: "", quantity: 6, unitPrice: 10000 }, { description: "Phí chờ ngoài giờ", detail: "Sau 22:00", quantity: 1, unitPrice: 150000 }], { departDate: vnDate(7), departTime: "05:30" }),
      ],
    });
    const longItems = (n, price) => Array.from({ length: n }, (_, j) => ({ description: `Dòng ${j + 1}: hạng mục dịch vụ mô tả dài để kiểm tra ngắt dòng tiếng Việt có dấu ở cột hẹp`, detail: j % 2 === 0 ? "Bao gồm ăn trưa hải sản, nước uống, bảo hiểm du lịch và hướng dẫn viên nói tiếng Việt" : "", quantity: 2 + j, unitPrice: price * (j + 1) }));
    f.long = await create(ACCOUNTS.salesA, {
      ...cust(`${LONG_WORD} (đại diện đoàn công ty du lịch Ánh Dương)`, {
        customerEmail: "nguyen.thi.hong.ngoc.phuong.uyen.doan.anh.duong.nhatrang@congtydulichanhduong.example.com",
        customerNote: "Đoàn 32 người, có 4 trẻ em và 3 người cao tuổi.\nXin xếp xe giường nằm cho người lớn tuổi.\nĂn chay ngày mùng một và ngày rằm.\nCần xuất hoá đơn công ty, gửi về email kế toán.\nLiên hệ trước 24 giờ khi có thay đổi lịch trình.",
        discount: 5000000, traTruoc: 30000000, traTruocHinhThuc: "BANK_TRANSFER",
      }),
      services: [
        tour({ pax: pax(10, 2, 2), unitPrices: { adult: 1350000, child: 950000, senior: 1200000 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000 } }),
        tour({ pax: pax(12, 1, 1), departDate: vnDate(7), unitPrices: { adult: 1300000, child: 950000, senior: 1200000 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000 } }),
        { kind: "catalog", catalogCode: "TTB03", pax: pax(23), unitPrices: { adult: 1500000 }, catalogPriceSeen: { adult: 1500000 }, ...NO_TRIP, departDate: vnDate(7) },
        { kind: "catalog", catalogCode: "TTB06", pax: pax(9), unitPrices: { adult: 800000 }, catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, departDate: vnDate(7), departTime: "14:00" },
        ...Array.from({ length: 4 }, (_, i) =>
          manual(i % 3 === 0 ? `${LONG_WORD}-${i + 1}` : `Dịch vụ nhập tay số ${i + 1}: xe limousine đưa đón đoàn từ sân bay Cam Ranh về khách sạn ở trung tâm Nha Trang`, longItems(3 + (i % 2), 4500000 + i * 250000), { pax: pax(32), departDate: vnDate(7), departTime: "06:00", pickupPlace: `Khách sạn ${LONG_WORD}, số 12 đường Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hoà` }),
        ),
      ],
    });
    f.edit = await create(ACCOUNTS.salesA, { ...cust("Khách Sửa Đơn"), services: [tour()] });
    const confirmed = await create(ACCOUNTS.salesA, { ...cust("Phạm Đã Xác Nhận", { traTruoc: 500000, traTruocHinhThuc: "CASH" }), services: [tour(), manual("Xe đưa đón", [{ description: "Xe 7 chỗ", detail: "", quantity: 1, unitPrice: 800000 }], { departDate: vnDate(7) })] });
    assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${confirmed.id}/status`, { status: "confirmed" })).status, 200, "xác nhận đơn dựng sẵn");
    f.confirmed = confirmed;
    const cancelled = await create(ACCOUNTS.salesA, { ...cust("Vũ Đã Huỷ"), services: [tour()] });
    assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${cancelled.id}/status`, { status: "cancelled" })).status, 200, "huỷ đơn dựng sẵn");
    f.cancelled = cancelled;
    return f;
  })();
  return fixtures;
}

try {
// ---- Bước a: tạo đơn bằng giao diện ----
let uiPromise = null;
function getUi() {
  uiPromise ??= (async () => {
    const p = await openAs(ACCOUNTS.salesA, "/order-form");
    const cards = "document.querySelectorAll('#services .svc')";
    const card = (i) => `${cards}[${i}]`;
    const counter = (i, label) => `${card(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(label)}]')`;
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`${cards}.length === 1`, "thẻ Tour 4 đảo");
    await p.ev(setInput(counter(0, "Người lớn"), "2"));
    await p.ev(setInput(counter(0, "Trẻ em"), "1"));
    await p.ev(`${card(0)}.querySelector('details.trip > summary').click(); true`);
    await p.waitFor(`${card(0)}.querySelector('details.trip').open`, "mở khối chuyến");
    const trip = (k, v) => p.ev(setInput(`${card(0)}.querySelector('[data-trip="${k}"]')`, v));
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(7))); // ADR-0021: một ngày cho cả đơn
    await trip("departTime", "07:30");
    // ADR-0047 Phần B (2026-10-01): giờ / nơi đón nhập ở khối "Đưa đón" của thẻ (TD101 không có mẫu chặng → "+ Thêm đưa đón", "Gõ tự do…").
    await p.ev(`${card(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${card(0)}.querySelector('.dd-chang [data-o$=":don"]')`, "chặng đưa đón");
    await p.ev(setInput(`${card(0)}.querySelector('.dd-chang [data-o$=":don"]')`, "tudo"));
    await p.waitFor(`!!${card(0)}.querySelector('.dd-chang [data-o$=":don-chu"]')`, "ô Địa chỉ đón");
    await p.ev(setInput(`${card(0)}.querySelector('.dd-chang [data-o$=":don-chu"]')`, "Khách sạn Sunrise"));
    await p.ev(setInput(`${card(0)}.querySelector('.dd-chang [data-o$=":gio"]')`, "07:00"));
    // 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): trước đây dịch vụ thứ hai là thẻ nhập tay (nút ẩn "+ Dịch vụ nhập tay",
    // "Xe đưa đón riêng" 3 khách × 800.000) — máy chủ nay trả 400 khi Lưu, nên dịch vụ thứ hai là thẻ DANH MỤC TTB06, 3 người lớn. Ảnh vẽ dịch vụ nhập
    // tay (dữ liệu cũ) vẫn được kiểm ở các đơn dựng sẵn `f.multi`/`f.long`/`f.confirmed` (bước b, h, k).
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TTB06"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TTB06 trong danh mục");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`${cards}.length === 2`, "thẻ Motor nước");
    await p.ev(setInput(counter(1, "Người lớn"), "3"));
    await p.ev(`${card(1)}.querySelector('details.trip > summary').click(); true`);
    await p.waitFor(`${card(1)}.querySelector('details.trip').open`, "mở khối chuyến của dịch vụ thứ hai");
    await p.ev(setInput("document.getElementById('customerName')", "Nguyễn Thị Ánh Tuyết"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912 345 678"));
    await p.ev(setInput("document.getElementById('customerEmail')", "tuyet.nguyen@example.com"));
    await p.ev(setInput("document.getElementById('customerNote')", "Cả nhà ăn chay — xin xếp ghế gần nhau."));
    await p.ev(setInput("document.getElementById('prepaidAmount')", "500000")); // sổ tiền lượt 1: ghi thành lần thu ở bước hai sau khi lưu
    await p.ev(setInput("document.getElementById('prepaidMethod')", "CASH"));
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "chuyển tới trang đơn sau khi lưu", 15000);
    await p.waitFor(`${DIALOG} !== null`, "hộp thoại tự mở", 8000);
    await p.waitFor(READY, "ảnh xác nhận hiện trong hộp thoại", 20000);
    const facts = await p.ev(`({ id: new URLSearchParams(location.search).get('id'), search: location.search, dialogs: document.querySelectorAll('[role=dialog]').length, title: document.querySelector('[role=dialog] h2')?.textContent })`);
    return { p, ...facts };
  })();
  return uiPromise;
}

await step("a", "tạo đơn bằng giao diện (dịch vụ theo người có thông tin chuyến + dịch vụ danh mục thứ hai) → tự chuyển tới /order?id=…&moi=1, hộp thoại tự mở đúng một lần, ảnh hiện, URL đã bỏ moi", async () => {
  const ui = await getUi();
  assert.equal(ui.dialogs, 1, "đúng một hộp thoại");
  assert.equal(ui.title, "Xác nhận đơn để gửi khách");
  assert.equal(ui.search, `?id=${ui.id}`, `URL phải bỏ moi=1 sau khi mở hộp thoại (thấy "${ui.search}")`);
  const navs = ui.p.requests.filter((r) => /\/order\?id=/.test(r.url)).map((r) => r.url.replace(env.base, ""));
  assert.ok(navs.some((u) => u === `/order?id=${ui.id}&moi=1`), `phải có lần điều hướng /order?id=…&moi=1 (thấy ${JSON.stringify(navs)})`);
  const order = (await call(ACCOUNTS.salesA, "GET", `/api/orders/${ui.id}`)).json.order;
  assert.equal(order.status, "draft");
  // 2026-09-26 (DK-T3-01 R1): khẳng định cũ ["catalog", "manual"] TRÁI luật mới (giao diện không còn lập được dịch vụ nhập tay) → đổi thành hai dịch vụ danh mục.
  assert.deepEqual(order.services.map((s) => [s.kind, s.catalogCode]), [["catalog", "TD101"], ["catalog", "TTB06"]], "đơn có hai dịch vụ danh mục (Tour 4 đảo + Motor nước)");
});

// ---- Bước b: PNG ----
await step("b", "PNG giải mã được, rộng ≥ 1440, cao đúng bố cục, không trống; chữ đúng vùng và đúng màu; dấu tiếng Việt được vẽ; ảnh giống hệt bản dựng từ mô hình kỳ vọng (và khác mô hình khác)", async () => {
  const ui = await getUi();
  const { p } = ui;
  await ensureTools(p);
  const href = await p.ev(downloadHref);
  const handler = await p.ev(readHandlerJs(ui.id));
  const a = await p.ev(`__t.analyze(${JSON.stringify(href)}, ${JSON.stringify(ui.id)}, ${JSON.stringify(handler)})`);
  results.anh.taoBangGiaoDien = { w: a.w, h: a.h, bytes: a.bytes, scale: a.scale, chu: a.texts };
  assert.equal(a.sig, "89504e470d0a1a0a", "chữ ký PNG");
  assert.equal(a.type, "image/png");
  assert.ok(a.w >= 1440, `rộng ${a.w} < 1440`);
  assert.equal(a.w, a.layoutW * a.scale);
  assert.ok(Math.abs(a.h - Math.ceil(a.layoutH * a.scale)) <= 1, `cao ${a.h} lệch bố cục ${a.layoutH * a.scale}`);
  assert.ok(a.h > 900, `ảnh cao ${a.h}px — quá thấp cho một đơn hai dịch vụ`);
  assert.ok(a.nonWhiteRatio > 0.03 && a.nonWhiteRatio < 0.6, `tỉ lệ điểm ảnh không trắng ${a.nonWhiteRatio}`);
  assert.ok(a.stripeDist <= 6, `dải trên đầu phải là --c-primary (lệch ${a.stripeDist})`);
  assert.ok(a.texts >= 40, `chỉ ${a.texts} khối chữ`);
  assert.deepEqual(a.inkMissing, [], "mọi khối chữ phải có mực đúng màu");
  assert.deepEqual([a.outOfMargin, a.marginInk, a.bottomInk, a.overlapCount], [[], 0, 0, 0], `lề/đáy/chồng chữ: ${JSON.stringify({ o: a.outOfMargin, m: a.marginInk, b: a.bottomInk, ov: a.overlaps })}`);
  assert.ok(a.emphasis.ops >= 4 && a.emphasis.colorOk, `Tổng cộng và Còn lại phải nổi bật bằng --c-accent: ${JSON.stringify(a.emphasis)}`);
  assert.ok(a.diacritics && a.diacritics.ink >= 10, `dấu của tiêu đề chữ hoa phải có mực phía trên đỉnh chữ: ${JSON.stringify(a.diacritics)}`);
  assert.ok(a.vnFonts.some((f) => f.startsWith("Nunito")) && a.vnFonts.some((f) => f.startsWith("Be Vietnam Pro")), `hai họ phông (tập con tiếng Việt) phải đã nạp: ${JSON.stringify(a.vnFonts)}`);
  const cmp = await p.ev(`(async () => {
    const shown = await __t.blobOf(${JSON.stringify(href)});
    const same = await __t.sameBytes(shown, await __lib.renderConfirmationPng(await __t.modelOf(${JSON.stringify(ui.id)}, ${JSON.stringify(handler)})));
    const other = await __t.sameBytes(shown, await __lib.renderConfirmationPng(await __t.modelOf(${JSON.stringify(ui.id)}, 'Người Khác Hẳn')));
    return { same, other };
  })()`);
  assert.deepEqual(cmp, { same: true, other: false }, "PNG của hộp thoại = bản dựng từ mô hình kỳ vọng; đổi tên người phụ trách thì khác (đối chứng)");
  const img = await p.ev("(() => { const i = document.querySelector('.sheet .confirm-img'); return { src: i.src, alt: i.alt, nw: i.naturalWidth, nh: i.naturalHeight, bytesFrom: document.querySelector('.sheet a.confirm-download').href }; })()");
  assert.equal(img.src, img.bytesFrom, "ảnh xem trước và liên kết tải là cùng một blob");
  assert.equal(img.nw, a.w);
  assert.match(img.alt, /^Ảnh xác nhận đơn TD-/, "ảnh xem trước có văn bản thay thế");
});

// ---- Bước c: tải + thu hồi blob ----
await step("c", "Tải ảnh PNG: <a download> đúng tên tệp trỏ blob: URL giải mã được; mọi blob: URL tạo ra bị thu hồi khi đóng (không còn tải được)", async () => {
  const ui = await getUi();
  const { p } = ui;
  const code = await p.ev("document.querySelector('#order h1').textContent");
  const a = await p.ev("(() => { const a = document.querySelector('.sheet a.confirm-download'); return { href: a.href, download: a.getAttribute('download'), text: a.textContent, hidden: a.hidden }; })()");
  assert.equal(a.download, `xac-nhan-${code}.png`);
  assert.match(a.download, /^xac-nhan-[A-Za-z0-9_-]+\.png$/);
  assert.equal(a.text, "Tải ảnh PNG");
  assert.equal(a.hidden, false);
  assert.ok(a.href.startsWith("blob:"), a.href);
  assert.equal(await p.ev(`window.__probe(${JSON.stringify(a.href)})`), "con", "trước khi đóng, blob: URL tải được như ảnh");
  assert.ok((await p.ev("document.querySelector('.sheet .confirm-img').naturalWidth")) >= 1440, "ảnh nạp từ blob: URL rộng ≥ 1440");
  await closeDialog(p);
  const state = await p.ev("({ created: window.__blob.created, revoked: window.__blob.revoked })");
  assert.ok(state.created.includes(a.href), "blob: URL của hộp thoại đã được tạo qua URL.createObjectURL");
  assert.deepEqual(state.created.filter((u) => !state.revoked.includes(u)), [], "mọi blob: URL đã tạo phải được thu hồi");
  assert.equal(await p.ev(`window.__probe(${JSON.stringify(a.href)})`), "het", "sau khi đóng, blob: URL không còn tải được");
});

// ---- Bước d: chia sẻ ----
await step("d", "Chia sẻ: nút chỉ hiện khi navigator.canShare({ files }) đúng (cả hai nhánh); bấm → navigator.share nhận đúng tệp PNG; huỷ thì im lặng, lỗi khác thì báo tiếng Việt", async () => {
  const f = await fx();
  const p = await openAs(ACCOUNTS.salesA, `/order?id=${f.one.id}`);
  const SHARE = "document.querySelector('.sheet .confirm-share')";
  const shareStub = (canShare, extra = "") => p.ev(`(() => {
    ${canShare === undefined ? "Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });" : `Object.defineProperty(navigator, 'canShare', { value: ${canShare}, configurable: true });`}
    window.__shared = []; window.__shareMode = 'ok';
    Object.defineProperty(navigator, 'share', { configurable: true, value: (data) => { window.__shared.push({ names: (data.files || []).map((f) => f.name), types: (data.files || []).map((f) => f.type), sizes: (data.files || []).map((f) => f.size), keys: Object.keys(data) });
      if (window.__shareMode === 'abort') return Promise.reject(new DOMException('huỷ', 'AbortError')); if (window.__shareMode === 'error') return Promise.reject(new DOMException('lỗi', 'NotAllowedError')); return Promise.resolve(); } });
    return true; })()`);
  // nhánh 1: canShare trả false → không nút
  await shareStub("() => false");
  await openDialog(p);
  assert.equal(await p.ev(`${SHARE} === null`), true, "canShare() = false → không có nút Chia sẻ");
  await closeDialog(p);
  // nhánh 2: không có canShare (trình duyệt cũ / máy tính) → không nút
  await shareStub(undefined);
  await openDialog(p);
  assert.equal(await p.ev(`${SHARE} === null`), true, "không có canShare → không có nút Chia sẻ");
  await closeDialog(p);
  // nhánh 3: canShare đúng với đúng một tệp PNG → có nút, bấm gọi share với đúng tệp
  await shareStub("(d) => Array.isArray(d.files) && d.files.length === 1 && d.files[0].type === 'image/png' && d.files[0].size > 0");
  await openDialog(p);
  assert.equal(await p.ev(`${SHARE} !== null`), true, "canShare({ files: [png] }) = true → có nút Chia sẻ");
  assert.equal(await p.ev(`${SHARE}.textContent`), "Chia sẻ");
  await p.ev(`${SHARE}.click(); true`);
  await p.waitFor("window.__shared.length === 1", "navigator.share được gọi");
  const shared = await p.ev("window.__shared[0]");
  const code = await p.ev("document.querySelector('#order h1').textContent");
  assert.deepEqual([shared.names, shared.types], [[`xac-nhan-${code}.png`], ["image/png"]]);
  assert.ok(shared.sizes[0] > 10000, `tệp chia sẻ ${shared.sizes[0]} byte`);
  await sleep(300);
  assert.equal(await p.ev("document.querySelectorAll('.sheet [role=alert]').length"), 0, "chia sẻ thành công: không thông báo lỗi");
  // người dùng bấm Huỷ ở bảng chia sẻ (AbortError): im lặng
  await p.ev("window.__shareMode = 'abort'; true");
  await p.ev(`${SHARE}.click(); true`);
  await p.waitFor("window.__shared.length === 2", "gọi share lần hai");
  await sleep(300);
  assert.equal(await p.ev("document.querySelectorAll('.sheet [role=alert]').length"), 0, "AbortError (người dùng huỷ) không được báo lỗi");
  // lỗi khác: báo tiếng Việt và vẫn còn nút Tải
  await p.ev("window.__shareMode = 'error'; true");
  await p.ev(`${SHARE}.click(); true`);
  await p.waitFor("document.querySelectorAll('.sheet [role=alert]').length === 1", "thông báo khi chia sẻ lỗi");
  const msg = await p.ev("document.querySelector('.sheet [role=alert]').textContent");
  assert.match(msg, /Tải ảnh PNG/, `thông báo phải chỉ sang nút Tải ảnh PNG: ${msg}`);
  assert.doesNotMatch(msg, /Error|NotAllowed|undefined|null/);
  assert.equal(await p.ev("document.querySelector('.sheet a.confirm-download').hidden"), false);
});

// ---- Bước e: không bật lại hộp thoại ----
await step("e", "tải lại trang không bật lại hộp thoại (URL sạch moi); mở đơn không kèm moi và SỬA đơn nháp cũng không tự bật; nút “Xác nhận gửi khách” luôn có", async () => {
  const ui = await getUi();
  const { p } = ui;
  if (await p.ev(`${DIALOG} !== null`)) await closeDialog(p);
  await p.send("Page.reload");
  await p.waitFor("document.readyState === 'complete' && document.querySelector('#order h1') !== null", "trang đơn nạp lại");
  await sleep(1500);
  assert.deepEqual(await p.ev(`({ dialog: ${DIALOG} !== null, search: location.search, btn: ${SEND_BTN}?.textContent })`), { dialog: false, search: `?id=${ui.id}`, btn: "Xem biên nhận" });
  // đơn mở thẳng, không có moi
  const f = await fx();
  const q = await openAs(ACCOUNTS.salesA, `/order?id=${f.multi.id}`);
  await waitButton(q);
  await sleep(1500);
  assert.equal(await q.ev(`${DIALOG} === null`), true, "mở đơn không kèm moi thì không tự bật hộp thoại");
  // sửa đơn nháp → lưu → trang đơn KHÔNG kèm moi và không hộp thoại
  const r = await openAs(ACCOUNTS.salesA, `/order-form?id=${f.edit.id}`);
  await r.waitFor("document.querySelectorAll('#services .svc').length === 1", "form sửa nạp đơn");
  await r.ev(setInput("document.getElementById('customerName')", "Khách Sửa Đơn Xong"));
  await r.ev("document.getElementById('save').click(); true");
  await r.waitFor("location.pathname === '/order'", "sửa xong → trang đơn", 15000);
  await waitButton(r);
  await sleep(1500);
  assert.equal(await r.ev(`${DIALOG} === null`), true, "sửa đơn không tự bật hộp thoại");
  const navs = r.requests.filter((x) => /\/order\?id=/.test(x.url)).map((x) => x.url);
  assert.ok(navs.length >= 1 && navs.every((u) => !u.includes("moi=")), `sửa đơn không thêm moi vào đường dẫn: ${JSON.stringify(navs)}`);
});

// ---- Bước f: trạng thái + quyền ----
await step("f", "đơn đã xác nhận / đã huỷ mở lại bằng nút, huy hiệu đúng chữ và đúng màu token; SALES khác và kế toán cũng có nút", async () => {
  const f = await fx();
  const cases = [
    ["draft", f.one, "Chờ xác nhận", "--c-sand-soft", ACCOUNTS.salesA],
    ["confirmed", f.confirmed, "Đã xác nhận", "--c-green-soft", ACCOUNTS.salesA],
    // Thị giác 1.69: ảnh biên nhận đọc token RIÊNG --c-receipt-surface-alt (giữ màu cũ), không còn --c-surface-alt của Nền tảng.
    ["cancelled", f.cancelled, "Đã huỷ", "--c-receipt-surface-alt", ACCOUNTS.salesA],
    ["confirmed-salesB", f.confirmed, "Đã xác nhận", "--c-green-soft", ACCOUNTS.salesB],
    ["cancelled-ke-toan", f.cancelled, "Đã huỷ", "--c-receipt-surface-alt", ACCOUNTS.accounting],
  ];
  const seen = [];
  for (const [label, order, text, token, account] of cases) {
    const p = await openAs(account, `/order?id=${order.id}`);
    await openDialog(p);
    const a = await p.ev(`(async () => {
      const href = ${downloadHref};
      const model = await __t.modelOf(${JSON.stringify(order.id)}, await ${readHandlerJs(order.id)});
      const pr = await __lib.prepareConfirmation(model);
      const blob = await __t.blobOf(href); const d = await __t.decode(blob);
      const badge = pr.layout.ops.find((o) => o.kind === 'rect' && o.tag === 'status-badge');
      const label = pr.layout.ops.find((o) => o.kind === 'text' && o.tag === 'status-text');
      const i = (Math.round((badge.y + badge.h / 2) * pr.scale) * d.w + Math.round((badge.x + 4) * pr.scale)) * 4;
      return { statusText: label.text, pixel: [d.data[i], d.data[i + 1], d.data[i + 2]], token: __t.token(${JSON.stringify(token)}), same: await __t.sameBytes(blob, await __lib.renderConfirmationPng(model)) };
    })()`);
    assert.equal(a.statusText, text, `${label}: chữ trạng thái`);
    assert.ok(Math.abs(a.pixel[0] - a.token[0]) + Math.abs(a.pixel[1] - a.token[1]) + Math.abs(a.pixel[2] - a.token[2]) <= 6, `${label}: màu huy hiệu ${a.pixel} ≠ token ${token} ${a.token}`);
    assert.equal(a.same, true, `${label}: ảnh của hộp thoại = bản dựng từ mô hình kỳ vọng`);
    seen.push(a.pixel.join(","));
  }
  assert.equal(new Set(seen.slice(0, 3)).size, 3, `ba trạng thái phải có ba màu huy hiệu khác nhau: ${seen}`);
});

// ---- Bước g: người phụ trách BA trạng thái ----
const HANDLER_UNKNOWN_MSG = "Chưa tải được người phụ trách, vui lòng thử lại.";
await step("g", "người phụ trách BA trạng thái (chủ dự án 2026-09-28): có tên → in tên; API xác nhận RÕ chưa có người → câu chờ nhận (không tên người lập); 404/500/mạng lỗi/hết giờ/dữ liệu hỏng → KHÔNG tạo ảnh, báo lỗi cố định + Thử lại", async () => {
  const f = await fx();
  const id = f.multi.id;
  const p = await openAs(ACCOUNTS.salesA, `/order?id=${id}`);
  await p.ev(`(() => { window.__h = { mode: 'name' }; const of = window.fetch.bind(window);
    window.fetch = (u, i) => { if (!String(u).includes('/api/dispatch/handlers')) return of(u, i); const m = window.__h.mode; const json = (s, b) => Promise.resolve(new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } }));
      if (m === 'name') return json(200, { handlers: { ['${id}']: { partyId: 'p1', staffId: 's1', name: 'Lê Minh Tuấn' } } });
      if (m === 'none') return json(200, { handlers: { ['${id}']: null } });
      if (m === '404') return json(404, { error: { code: 'not_found', message: 'giả lập' } });
      if (m === '500') return json(500, { error: { code: 'internal', message: 'giả lập' } });
      if (m === 'network') return Promise.reject(new TypeError('offline'));
      if (m === 'missing-key') return json(200, { handlers: {} });
      if (m === 'bad-name') return json(200, { handlers: { ['${id}']: { partyId: 'p1', staffId: 's1', name: 42 } } });
      if (m === 'blank-name') return json(200, { handlers: { ['${id}']: { partyId: 'p1', staffId: 's1', name: '   ' } } });
      return new Promise(() => {}); }; return true; })()`);
  const sameAs = (handler) => p.ev(`(async () => __t.sameBytes(await __t.blobOf(${downloadHref}), await __lib.renderConfirmationPng(await __t.modelOf(${JSON.stringify(id)}, ${JSON.stringify(handler)}))))()`);
  const errState = () => p.ev(`(() => { const e = document.querySelector('.sheet .confirm-error'); return e ? { role: e.getAttribute('role'), text: e.textContent, retry: !!e.querySelector('button.confirm-retry'), img: !!document.querySelector('.sheet .confirm-img'), dl: document.querySelector('.sheet a.confirm-download')?.hidden ?? null } : null; })()`);
  const staffName = f.multi.staffName;
  assert.equal(staffName, "Sales Một");

  // (a) có tên → in tên; đối chứng: khác ảnh dựng từ "chưa có người"
  await p.ev("window.__h.mode = 'name'; true");
  await openDialog(p);
  assert.equal(await sameAs("Lê Minh Tuấn"), true, "chế độ name: ảnh đúng bằng mô hình dựng từ tên phụ trách");
  assert.equal(await sameAs(null), false, "đối chứng: ảnh có tên phụ trách phải khác ảnh dựng từ 'chưa có người'");
  await closeDialog(p);

  // (b) máy chủ xác nhận RÕ chưa có người → ảnh vẫn ra, đúng câu chờ nhận (KHÔNG tên người lập)
  await p.ev("window.__h.mode = 'none'; true");
  await openDialog(p);
  assert.equal(await sameAs(null), true, "chế độ none: ảnh đúng bằng mô hình dựng từ 'chưa có người' (câu chờ nhận)");
  assert.equal(await p.ev("document.querySelector('.sheet .confirm-img') !== null"), true, "chế độ none: vẫn có ảnh (khác 404/500/mạng/hết giờ/dữ liệu hỏng)");
  await closeDialog(p);

  // (c) KHÔNG BIẾT (404/500/mất mạng/dữ liệu hỏng) → KHÔNG tạo ảnh, báo đúng câu, có nút Thử lại
  for (const mode of ["404", "500", "network", "missing-key", "bad-name", "blank-name"]) {
    await p.ev(`window.__h.mode = ${JSON.stringify(mode)}; true`);
    await waitButton(p);
    await p.ev(clickText("#send", "Xem biên nhận"));
    await p.waitFor("document.querySelector('.sheet .confirm-error') !== null", `${mode}: thông báo lỗi hiện`, 10000);
    const st = await errState();
    assert.equal(st.role, "alert", `${mode}: vùng lỗi role=alert`);
    assert.equal(st.text.includes(HANDLER_UNKNOWN_MSG), true, `${mode}: đúng câu báo cố định (thấy "${st.text}")`);
    assert.deepEqual([st.retry, st.img, st.dl], [true, false, true], `${mode}: có nút Thử lại; KHÔNG có ảnh; nút Tải ẩn`);
    await closeDialog(p);
  }

  // (c bis) hết giờ 3 giây: cũng KHÔNG BIẾT — báo lỗi ngay sau 3 giây, KHÔNG chặn tới hạn chót 30 giây như trước
  await p.ev("window.__h.mode = 'slow'; true");
  const t0 = Date.now();
  await waitButton(p);
  await p.ev(clickText("#send", "Xem biên nhận"));
  await p.waitFor("document.querySelector('.sheet .confirm-error') !== null", "slow: thông báo lỗi hiện sau khi hết giờ 3 giây", 8000);
  const slowMs = Date.now() - t0;
  const stSlow = await errState();
  assert.equal(stSlow.text.includes(HANDLER_UNKNOWN_MSG), true, `slow: đúng câu báo cố định (thấy "${stSlow.text}")`);
  assert.ok(slowMs >= 2900 && slowMs < 6000, `slow: phải báo lỗi ngay sau khi hết giờ 3 giây người phụ trách, không chặn tới hạn chót 30 giây (đo ${slowMs} ms)`);
  results.thoiGian.tenPhuTrachMs = { slow: slowMs };

  // Thử lại sau khi máy chủ có tên trở lại → ảnh hiện ra bình thường
  await p.ev("window.__h.mode = 'name'; true");
  await p.ev("document.querySelector('.sheet .confirm-retry').click(); true");
  await p.waitFor(READY, "Thử lại: ảnh hiện sau khi máy chủ có tên trở lại", 10000);
  assert.equal(await sameAs("Lê Minh Tuấn"), true, "Thử lại: ảnh đúng bằng mô hình dựng từ tên phụ trách");
  await closeDialog(p);
});

// ---- Bước g2: bằng chứng — đơn THẬT chưa có người phụ trách ----
await step("g2", "đơn THẬT chưa có người phụ trách (đóng dòng HANDLE bằng SQL, không phải giả lập fetch): ảnh ra đúng câu chờ nhận, không tràn/chồng chữ, không lộ tên người lập; lưu bằng chứng", async () => {
  const unassigned = await create(ACCOUNTS.salesA, { ...cust("Chưa Có Người Phụ Trách"), services: [tour()] });
  env.sql(`UPDATE dsp_assignment SET valid_to_at = valid_from_at WHERE order_id = '${unassigned.id}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`);
  const p = await openAs(ACCOUNTS.salesA, `/order?id=${unassigned.id}`, { track: false });
  await openDialog(p);
  const a = await p.ev(`__t.analyze(${downloadHref}, ${JSON.stringify(unassigned.id)}, null)`);
  assert.equal(a.sig, "89504e470d0a1a0a");
  assert.deepEqual(a.inkMissing, [], "câu chờ nhận: mọi khối chữ phải có mực");
  assert.deepEqual([a.outOfMargin, a.marginInk, a.bottomInk, a.overlapCount], [[], 0, 0, 0], `câu chờ nhận: lề/đáy/chồng chữ ${JSON.stringify({ o: a.outOfMargin, m: a.marginInk, b: a.bottomInk, ov: a.overlaps })}`);
  const info = await p.ev(`__t.modelOf(${JSON.stringify(unassigned.id)}, null).then((m) => { const t = m.blocks.find((b) => b.kind === 'title'); return { note: t.note, labels: t.rows.map((r) => r.label), json: JSON.stringify(m) }; })`);
  assert.equal(info.note, "Đơn khởi tạo thành công và đang chờ hướng dẫn viên nhận khách");
  assert.ok(!info.labels.includes("Nhân viên phụ trách"), "KHÔNG còn dòng 'Nhân viên phụ trách' khi chưa có người");
  assert.ok(!info.json.includes(unassigned.staffName), `KHÔNG được in tên người lập "${unassigned.staffName}" thay cho người phụ trách`);
  writeFileSync(join(ANH, "xac-nhan-chua-co-phu-trach.png"), Buffer.from(await p.ev(`__t.b64(${downloadHref})`), "base64"));
  p.close();
});

// ---- Bước h: đơn cỡ lớn ----
const syntheticOrder = (money, big = true) => {
  const services = Array.from({ length: big ? 20 : 3 }, (_, i) => ({
    id: `s${i}`, kind: i % 4 === 0 ? "manual" : "catalog", catalogCode: i % 4 === 0 ? null : "TD101",
    name: i % 2 === 0 ? `${LONG_WORD}-${LONG_WORD}` : `Dịch vụ số ${i + 1}: tour tham quan bốn đảo Nha Trang kèm ăn trưa hải sản, lặn ngắm san hô và tắm biển`,
    unit: i % 4 === 0 ? "manual" : "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
    departDate: "2026-10-05", departTime: "07:30", pickupTime: "07:00", pickupPlace: `Khách sạn ${LONG_WORD}, số 12 đường Trần Phú, Nha Trang`, checkinDate: null, checkinTime: "06:45", checkinPlace: "Bến Cầu Đá", note: "GHI-CHU-NOI-BO", catalogStatus: null,
    items: Array.from({ length: big ? (i < 10 ? 3 : 2) : 3 }, (_, j) => ({
      id: `i${i}-${j}`, catalogCode: null, paxCode: null, description: j === 0 ? `Mô tả rất dài không có khoảng trắng ${LONG_WORD}${LONG_WORD}` : "Người lớn",
      detail: j === 1 ? "Ghi chú chi tiết khá dài của dòng tiền để thử ngắt dòng nhiều lần trong ô mô tả hẹp" : null, quantity: 999, unitPrice: money, catalogPrice: null, lineTotal: money,
    })),
  }));
  return {
    id: "o1", orderCode: "TD-20260921-9999", staffId: "st", staffName: "Nguyễn Thị Người Lập", status: "confirmed",
    customerName: `${LONG_WORD}-${LONG_WORD}`, customerPhone: "0901 234 567", customerEmail: `${LONG_WORD.replace(/-/g, ".")}@example.com`.toLowerCase(),
    customerNote: Array.from({ length: 12 }, (_, i) => `Ghi chú khách dòng ${i + 1}: yêu cầu đặc biệt khá dài cần ngắt dòng đúng chỗ, dấu tiếng Việt không được cắt, ${LONG_WORD}`).join("\n"),
    subtotal: money, discount: money, total: money, paymentNote: "NOI-BO", createdAt: "2026-09-20T18:30:00.000Z", updatedAt: "2026-09-20T18:30:00.000Z", confirmedAt: null, deliveredAt: null, completedAt: null, services,
  };
};
await step("h", "đơn cỡ tối đa (20 dịch vụ, 50 dòng, tên 100+ ký tự liền, tiền 100.000.000.000 ₫, ghi chú dài) và tiền rộng quá cột: không lỗi, không tràn lề, không chữ chồng nhau, mọi chữ có mực, đúng giới hạn diện tích canvas", async () => {
  const p = await openAs(ACCOUNTS.salesA, "/order-form", { track: false });
  for (const [label, money, big] of [["toi-da-100-ty", 100_000_000_000, true], ["tien-rong-9e15", 9_000_000_000_000_000, false]]) {
    const order = syntheticOrder(money, big);
    const a = await p.ev(`(async () => {
      const company = (await (await fetch('/api/company')).json()).company;
      const model = __lib.buildConfirmation(__lib.dungBienNhan(${JSON.stringify(order)}, company, { daTra: ${money}, conLai: ${money} }), 'Lê Minh Tuấn');
      const blob = await __lib.renderConfirmationPng(model);
      return __t.analyzeModel(model, blob);
    })()`);
    results.lon[label] = { w: a.w, h: a.h, cssH: a.layoutH, scale: a.scale, mp: Math.round(a.area / 1e4) / 100, bytes: a.bytes, chu: a.texts };
    assert.equal(a.sig, "89504e470d0a1a0a");
    assert.ok(a.w >= 720 && a.w === Math.round(a.layoutW * a.scale), `${label}: rộng ${a.w}`);
    assert.ok(a.area <= 16_777_216 + 4000, `${label}: diện tích ${a.area} vượt giới hạn canvas của iOS (16.777.216)`);
    assert.ok(a.nonWhiteRatio > 0.02, `${label}: ảnh gần như trống (${a.nonWhiteRatio})`);
    assert.deepEqual(a.inkMissing, [], `${label}: khối chữ không có mực`);
    assert.deepEqual([a.outOfMargin, a.marginInk, a.bottomInk], [[], 0, 0], `${label}: tràn lề (${JSON.stringify(a.outOfMargin)}), mực ở lề ${a.marginInk}, đáy ${a.bottomInk}`);
    assert.equal(a.overlapCount, 0, `${label}: chữ chồng nhau ${JSON.stringify(a.overlaps)}`);
  }
  assert.ok(results.lon["toi-da-100-ty"].cssH > results.lon["tien-rong-9e15"].cssH, "đơn lớn cao hơn đơn ít dịch vụ");
});

// ---- Bước i: vẽ lỗi ----
await step("i", "vẽ lỗi (công ty lỗi, phông lỗi, phông treo, toBlob trả null, getContext null): thông báo tiếng Việt + nút Thử lại, không kẹt (Esc đóng được), Thử lại ra ảnh", async () => {
  const f = await fx();
  const p = await openAs(ACCOUNTS.salesA, `/order?id=${f.one.id}`);
  await p.ev(`(() => { window.__fail = { fonts: false, hang: false, blob: false, ctx: false, company: false };
    const ol = document.fonts.load.bind(document.fonts);
    document.fonts.load = (...a) => window.__fail.hang ? new Promise(() => {}) : window.__fail.fonts ? Promise.reject(new DOMException('mô phỏng', 'NetworkError')) : ol(...a);
    const ot = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (cb, ...r) { return window.__fail.blob ? cb(null) : ot.call(this, cb, ...r); };
    const og = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...a) { return window.__fail.ctx ? null : og.apply(this, a); };
    const of = window.fetch.bind(window);
    window.fetch = (u, i) => window.__fail.company && String(u).endsWith('/receipt') ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'internal', message: 'giả lập' } }), { status: 500, headers: { 'content-type': 'application/json' } })) : of(u, i);
    return true; })()`);
  const VI = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
  const errorState = (p2) => p2.ev(`(() => { const e = document.querySelector('.sheet .confirm-error'); return e ? { role: e.getAttribute('role'), text: e.textContent, retry: !!e.querySelector('button.confirm-retry'), img: !!document.querySelector('.sheet .confirm-img'), dl: document.querySelector('.sheet a.confirm-download')?.hidden ?? null, busy: !!document.querySelector('.sheet .confirm-status') && !document.querySelector('.sheet .confirm-status').hidden } : null; })()`);
  const cases = [
    ["company", /công ty/, 8000],
    ["fonts", /phông chữ/, 8000],
    ["blob", /vẽ được ảnh/, 8000],
    ["ctx", /vẽ được ảnh/, 8000],
    ["hang", /phông chữ|quá lâu/, 30000],
  ];
  for (const [flag, pattern, ms] of cases) {
    await p.ev(`window.__fail.${flag} = true; true`);
    await waitButton(p);
    await p.ev(clickText("#send", "Xem biên nhận"));
    await p.waitFor("document.querySelector('.sheet .confirm-error') !== null", `${flag}: thông báo lỗi hiện`, ms);
    const st = await errorState(p);
    assert.equal(st.role, "alert", `${flag}: vùng lỗi là role=alert`);
    assert.match(st.text, pattern, `${flag}: nội dung lỗi (${st.text})`);
    assert.match(st.text, VI, `${flag}: tiếng Việt có dấu`);
    assert.doesNotMatch(st.text, /Error|Exception|undefined|null|NetworkError|mô phỏng/, `${flag}: không lộ chữ kỹ thuật (${st.text})`);
    assert.deepEqual([st.retry, st.img, st.dl, st.busy], [true, false, true, false], `${flag}: có nút Thử lại; không ảnh; nút Tải ẩn; không kẹt "đang tạo"`);
    if (flag === "hang") {
      await closeDialog(p); // không kẹt: Esc đóng được ngay cả sau lỗi
      await p.ev("window.__fail.hang = false; true");
      continue;
    }
    await p.ev(`window.__fail.${flag} = false; true`);
    await p.ev("document.querySelector('.sheet button.confirm-retry').click(); true");
    await p.waitFor(READY, `${flag}: Thử lại ra ảnh`, 20000);
    assert.equal(await p.ev("document.querySelector('.sheet .confirm-error') === null && document.querySelector('.sheet a.confirm-download').hidden === false"), true, `${flag}: hết lỗi, hiện nút Tải`);
    await closeDialog(p);
  }
  // Esc đóng được ngay khi đang tạo ảnh (trạng thái "đang tạo"), không lỗi muộn sau đó
  await p.ev("window.__fail.hang = true; true");
  await p.ev(clickText("#send", "Xem biên nhận"));
  await p.waitFor("document.querySelector('.sheet .confirm-status') !== null", "đang tạo ảnh", 4000);
  await closeDialog(p);
  await p.ev("window.__fail.hang = false; true");
  await sleep(500);
  assert.equal(await p.ev(`${DIALOG} === null`), true);
});

// ---- Bước j: hộp thoại (a11y, focus, đo) ----
const consoleProblems = (p) => {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  // trừ tiếng ồn ĐÃ BIẾT: dò phiên (`/api/auth/me` = 401) và lần tải blob: URL đã thu hồi cố ý ở bước c (Chrome ghi "Failed to load resource" cho nó)
  const other = p.logEntries.filter((e) => e.level === "error" && !csp.includes(e) && !/\/api\/auth\/me$/.test(e.url ?? "") && !/^blob:/.test(e.url ?? ""));
  return { csp: csp.map((e) => e.text), other: other.map((e) => `${e.source}: ${e.text} ${e.url ?? ""}`), consoleErrors: [...p.consoleErrors] };
};
const axeRun = async (p, label) => {
  // Khung mở ≥ 641 px chạy hiệu ứng mờ dần 300 ms: đo tương phản giữa lúc đang mờ cho kết quả sai (màu trộn với nền) → chờ hiệu ứng xong.
  await p.waitFor("!document.querySelector('.sheet-root') || document.querySelector('.sheet-root').classList.contains('open')", "hộp thoại đã mở xong", 4000);
  await sleep(500);
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
  results.axe[label] = v;
  return v;
};
async function dialogChecks(p, label, opener) {
  const st = await p.ev(`(() => {
    const d = document.querySelector('[role=dialog]'); const t = document.getElementById(d.getAttribute('aria-labelledby') ?? '_'); const root = d.closest('.sheet-root');
    const others = [...document.body.children].filter((el) => el !== root);
    const ctl = [...d.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); });
    const frame = document.querySelector('.sheet .confirm-frame')?.getBoundingClientRect(); const img = document.querySelector('.sheet .confirm-img')?.getBoundingClientRect();
    return { modal: d.getAttribute('aria-modal'), title: t?.textContent ?? null, inertAll: others.every((el) => el.hasAttribute('inert')), rootInert: root.hasAttribute('inert'), inertCount: others.length,
      focusIn: d === document.activeElement || d.contains(document.activeElement), bodyOpen: document.body.classList.contains('sheet-open'),
      small: ctl.filter((el) => el.getBoundingClientRect().height < 43.5 || el.getBoundingClientRect().width < 43.5).map((el) => (el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)),
      controls: ctl.map((el) => el.textContent.trim() || el.getAttribute('aria-label')),
      overflow: document.documentElement.scrollWidth - innerWidth, dialogOverflow: d.scrollWidth - d.clientWidth, imgInFrame: !frame || !img || (img.left >= frame.left - 0.5 && img.right <= frame.right + 0.5) };
  })()`);
  assert.equal(st.modal, "true", `${label}: aria-modal`);
  assert.equal(st.title, "Xác nhận đơn để gửi khách", `${label}: tên hộp thoại (aria-labelledby)`);
  assert.deepEqual([st.inertAll, st.rootInert, st.bodyOpen], [true, false, true], `${label}: nền inert (${st.inertCount} phần tử), bản thân hộp thoại không inert, body.sheet-open`);
  assert.equal(st.focusIn, true, `${label}: focus nằm trong hộp thoại`);
  assert.deepEqual(st.small, [], `${label}: vùng chạm < 44 px`);
  assert.ok(st.controls.includes("Tải ảnh PNG") && st.controls.includes("Đóng"), `${label}: điều khiển ${JSON.stringify(st.controls)}`);
  assert.ok(st.overflow <= 0 && st.dialogOverflow <= 0 && st.imgInFrame, `${label}: tràn ngang trang ${st.overflow}, hộp thoại ${st.dialogOverflow}, ảnh ${st.imgInFrame}`);
  results.do[label] = st;
}
await step("j", "hộp thoại: role=dialog + aria-modal + tên, nền inert, focus trong hộp thoại, Esc/chạm nền đóng và trả focus; axe 0 vi phạm (390, 1040, trạng thái lỗi); vùng chạm ≥ 44 px; không tràn ngang; console/CSP sạch", async () => {
  const f = await fx();
  for (const [label, vp] of [["390", M], ["1040", DESK]]) {
    const p = await openAs(ACCOUNTS.salesA, `/order?id=${f.multi.id}`, { viewport: vp });
    await openDialog(p);
    await dialogChecks(p, label);
    const v = await axeRun(p, `hop-thoai-${label}`);
    assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
    // Esc: đóng, gỡ inert, trả focus về nút mở
    await closeDialog(p);
    assert.deepEqual(await p.ev("({ inert: [...document.body.children].filter((el) => el.hasAttribute('inert')).length, open: document.body.classList.contains('sheet-open'), focusOnOpener: document.activeElement === document.querySelector('#send button') })"), { inert: 0, open: false, focusOnOpener: true }, `${label}: sau Esc`);
    // chạm nền đóng
    await openDialog(p);
    await p.ev("document.querySelector('.sheet-scrim').click(); true");
    await p.waitFor(`${DIALOG} === null`, "chạm nền đóng hộp thoại", 4000);
    assert.equal(await p.ev("document.activeElement === document.querySelector('#send button')"), true, `${label}: trả focus sau khi chạm nền`);
    // nút ✕
    await openDialog(p);
    await p.ev("document.querySelector('.sheet .sheet-close').click(); true");
    await p.waitFor(`${DIALOG} === null`, "nút Đóng", 4000);
    // trạng thái lỗi: axe + đo
    if (label === "390") {
      // (thông tin công ty đã được lưu tạm sau lần mở thành công nên dùng lỗi phông để dựng trạng thái lỗi)
      await p.ev("(() => { document.fonts.load = () => Promise.reject(new DOMException('mô phỏng', 'NetworkError')); return true; })()");
      await p.ev(clickText("#send", "Xem biên nhận"));
      await p.waitFor("document.querySelector('.sheet .confirm-error') !== null", "trạng thái lỗi", 8000);
      const ve = await axeRun(p, "hop-thoai-390-loi");
      assert.deepEqual(ve, [], `axe (lỗi): ${JSON.stringify(ve)}`);
      const small = await p.ev("[...document.querySelectorAll('.sheet button, .sheet a[href]')].filter((el) => el.getBoundingClientRect().width > 0 && (el.getBoundingClientRect().height < 43.5 || el.getBoundingClientRect().width < 43.5)).map((el) => el.className)");
      assert.deepEqual(small, [], "vùng chạm < 44 px ở trạng thái lỗi");
    }
  }
  for (const [label, p] of tracked) {
    const problems = consoleProblems(p);
    assert.deepEqual(problems, { csp: [], other: [], consoleErrors: [] }, `console/CSP (${label}): ${JSON.stringify(problems)}`);
  }
  assert.ok(ONLY || tracked.length >= 5, "đã theo dõi console của các trang đã mở");
});

// ---- Bước k: ảnh mẫu + ảnh chụp hộp thoại ----
await step("k", "ảnh mẫu (một dịch vụ, nhiều dịch vụ, đơn dài) qua đúng đường giao diện, ảnh chụp hộp thoại 390×844 và 1040×800; thời gian dựng", async () => {
  const f = await fx();
  const samples = [["xac-nhan-mau-1-mot-dich-vu.png", f.one], ["xac-nhan-mau-2-nhieu-dich-vu.png", f.multi], ["xac-nhan-mau-3-don-dai.png", f.long]];
  const heights = [];
  for (const [file, order] of samples) {
    const p = await openAs(ACCOUNTS.salesA, `/order?id=${order.id}`, { track: false });
    const ms = await openDialog(p, 30000);
    const handler = await p.ev(readHandlerJs(order.id));
    const a = await p.ev(`__t.analyze(${downloadHref}, ${JSON.stringify(order.id)}, ${JSON.stringify(handler)})`);
    assert.equal(a.sig, "89504e470d0a1a0a");
    assert.ok(a.w >= 1440, `${file}: rộng ${a.w} (cao ${a.layoutH} px CSS, độ phân giải ${a.scale}) — đơn phải nằm trong giới hạn diện tích canvas ở độ phân giải 2`);
    assert.deepEqual(a.inkMissing, [], `${file}: khối chữ không có mực`);
    assert.deepEqual([a.outOfMargin, a.marginInk, a.bottomInk, a.overlapCount], [[], 0, 0, 0], `${file}: lề/đáy/chồng chữ ${JSON.stringify({ o: a.outOfMargin, m: a.marginInk, b: a.bottomInk, ov: a.overlaps })}`);
    assert.ok(a.nonWhiteRatio > 0.03, `${file}: quá trống`);
    writeFileSync(join(ANH, file), Buffer.from(await p.ev(`__t.b64(${downloadHref})`), "base64"));
    results.anh[file] = { w: a.w, h: a.h, cssH: a.layoutH, bytes: a.bytes, chu: a.texts, dungMs: ms, phuTrach: handler };
    results.thoiGian[file] = ms;
    heights.push(a.h);
    p.close();
  }
  assert.ok(heights[0] < heights[1] && heights[1] < heights[2], `chiều cao theo nội dung: ${heights}`);
  // ảnh chụp hộp thoại (khung nhìn cố định, KHÔNG nới chiều cao như chụp cả trang: hộp thoại dính khung nhìn)
  for (const [name, vp] of [["xac-nhan-hop-thoai-390.png", M], ["xac-nhan-hop-thoai-1040.png", DESK]]) {
    const p = await openAs(ACCOUNTS.salesA, `/order?id=${f.multi.id}`, { viewport: vp, track: false });
    await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    await openDialog(p);
    await sleep(600);
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(ANH, name), Buffer.from(r.result.data, "base64"));
    p.close();
  }
  // trang đơn với nút "Xác nhận gửi khách" (điện thoại), chưa mở hộp thoại
  {
    const p = await openAs(ACCOUNTS.salesA, `/order?id=${f.confirmed.id}`, { viewport: M, track: false });
    await p.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 1, mobile: true });
    await waitButton(p);
    await sleep(400);
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(ANH, "xac-nhan-trang-don-390.png"), Buffer.from(r.result.data, "base64"));
    p.close();
  }
  for (const s of ["hop-thoai-390", "hop-thoai-1040", "trang-don-390"]) results.anh[`chup-${s}`] = "đã lưu";
  assert.ok(Object.values(results.thoiGian).every((x) => typeof x !== "number" || x < 5000), `thời gian dựng ảnh: ${JSON.stringify(results.thoiGian)}`);
});

// ---- Bước l: HƯỚNG DẪN VIÊN mở biên nhận đơn CHÍNH MÌNH phụ trách (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-2) ----
// Trước vòng sửa: hộp thoại gọi GET /api/dispatch/handlers → 403 với HDV → "chưa biết" → ảnh gửi khách BỎ dòng "Nhân viên phụ trách" dù chính HDV đang phụ trách.
// Nay tên lấy từ phiên (`nguoiPhuTrachTuPhien`). Kho cookie + bản nhớ khung (ADR-0035) dùng chung → bước CUỐI, mở /orders của HDV trước để khung nhớ đúng người.
const HDV_L = { name: "HDV Biên Nhận", phone: "0900000209", pin: "246817", permissions: ["FIELD"] };
await step("l", "HƯỚNG DẪN VIÊN mở biên nhận đơn mình phụ trách: ảnh GIỐNG từng byte bản dựng với tên HDV, KHÁC bản bỏ dòng; KHÔNG gọi GET /api/dispatch/handlers", async () => {
  const f = await fx();
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(HDV_L)).split("\n")) env.sql(stmt);
  const hdvId = env.sql(`SELECT id FROM staff WHERE phone = '${HDV_L.phone}'`)[0].id;
  const id = f.confirmed.id;
  const giao = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${id}/handler`, { staffId: hdvId });
  assert.equal(giao.status, 200, `giao đơn đã xác nhận cho HDV: ${giao.status} ${JSON.stringify(giao.json)}`);
  const p0 = await openAs(HDV_L, "/orders", { lib: false, track: false });
  await p0.waitFor("document.querySelectorAll('#list .order-card').length >= 1", "danh sách của HDV", 10000);
  p0.close();
  const p = await openAs(HDV_L, `/order?id=${id}`);
  await openDialog(p, 20000);
  const sameAs = (handler) => p.ev(`(async () => __t.sameBytes(await __t.blobOf(${downloadHref}), await __lib.renderConfirmationPng(await __t.modelOf(${JSON.stringify(id)}, ${JSON.stringify(handler)}))))()`);
  assert.equal(await sameAs(HDV_L.name), true, `ảnh biên nhận HDV mở phải in “Nhân viên phụ trách: ${HDV_L.name}” (giống từng byte bản dựng với tên HDV)`);
  assert.equal(await sameAs(undefined), false, "đối chứng: KHÁC bản bỏ dòng người phụ trách (trạng thái trước vòng sửa — route 403 → chưa biết)");
  const goi = p.requests.filter((r) => r.url.includes("/api/dispatch/handlers")).map((r) => r.url);
  assert.deepEqual(goi, [], "trang đơn + hộp thoại của HDV KHÔNG được gọi GET /api/dispatch/handlers");
  await p.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 1, mobile: true });
  await sleep(600);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(ANH, "xac-nhan-hdv-hop-thoai-390.png"), Buffer.from(r.result.data, "base64"));
  results.anh["xac-nhan-hdv-hop-thoai-390.png"] = "390×844";
  const png = await p.ev(`__t.b64(${downloadHref})`);
  writeFileSync(join(ANH, "xac-nhan-hdv-bien-nhan.png"), Buffer.from(png, "base64"));
  results.anh["xac-nhan-hdv-bien-nhan.png"] = "ảnh PNG biên nhận do HDV dựng";
  await closeDialog(p);
});

} finally {
  for (const p of openedPages) p.close();
  await env.stop();
}
results.tongKet = { dat: passed, hong: failures };
writeFileSync(join(OUT, "ket-qua-xac-nhan-png.json"), JSON.stringify(results, null, 2) + "\n");
console.log(failures ? `\n${failures} bước ✗ / ${passed} bước ✓` : `\nV1 XAC NHAN PNG OK — ${passed} bước ✓`);
process.exitCode = failures ? 1 : 0;
