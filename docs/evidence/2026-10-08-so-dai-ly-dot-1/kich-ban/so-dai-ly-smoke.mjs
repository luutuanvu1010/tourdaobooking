// Kịch bản Chrome — sổ đại lý đợt 1 (Task 13; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md; kế hoạch Task 13 Step 4 + ghi chú điều phối §3).
// Trang: /khoa-thang, /hoa-hong, /nguoi-ban, form lập đơn (ô «Đặt qua đối tác», dòng chỉ đọc «Bên đặt: …»), trang đơn (khối «Phần đối tác», bảng «Ghi mức tay», bảng «Đổi khách»).
// Đây là rào DUY NHẤT cho mấy hành vi giao diện mà `npm test` không canh (người kiểm Task 10 M-1/M-2, Task 11 M1): Bán hàng không có ô thêm/đóng mức; Kế toán không tra được
// đối tác; tài khoản Đối tác (thuần và lai) không thấy hai mục menu mới, mở thẳng URL bị từ chối, không có tỷ lệ / người bán trong DOM; tài khoản lai mở đơn của người khác ⇒
// khối ẩn lặng lẽ (404); số tiền trong khối khớp đúng DTO máy chủ. Kèm hai việc QUAN SÁT (không sửa mã): khối nháy ẩn/hiện mỗi lần trang đơn vẽ lại, số lời gọi mỗi lần vẽ.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Quy tắc ADR-0074/0075: một lần đăng nhập mới của CÙNG tài khoản làm phiên của trang đang mở bị thay ⇒ dữ liệu dựng bằng API TRƯỚC khi mở trang của tài khoản đó, mỗi lúc chỉ
// một trang mở, đóng trang trước khi mở trang kế. "Người khác vừa đổi" giả bằng lời gọi của MỘT TÀI KHOẢN KHÁC (Node, không chạm kho cookie của Chrome) hoặc `fetch` trong trang.
// Kho cookie Chrome dùng chung ⇒ trang của tài khoản Đối tác mở SAU CÙNG.
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-08-so-dai-ly-dot-1/anh/ (đặt OUT=<thư mục> để ghi chỗ khác). Mỗi bước chạy riêng (một bước đỏ không chặn bước sau); cuối cùng in
// "SMOKE OK" hoặc danh sách bước đỏ (thoát 1). axe: lỗi mức critical/serious làm đỏ bước; moderate/minor in ra ở mục "axe nhẹ" (ghi vào báo cáo, không sửa mã sản phẩm).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, docAxe, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe(); // thiếu AXE_JS ⇒ dừng NGAY, trước khi dựng môi trường
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-08-so-dai-ly-dot-1/anh");
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1040, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const KHO = [["390", MOB], ["1040", DESK]];

const HOM_NAY = vnDate(0);
const THANG_TRUOC = (() => { const [y, m] = HOM_NAY.slice(0, 7).split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; })();
const NGAY_DI = vnDate(5);
const T = "'2026-01-01T00:00:00.000Z'";
const CAU_TU_CHOI = "Bạn không có quyền xem trang này.";
const CAU_KHONG_TIM = "Tài khoản của bạn chưa tìm được đối tác theo tên. Cần đặt mức riêng cho một đối tác thì nhờ Quản trị hoặc Toàn quyền.";
const CAU_KHOA_THANG_TU_CHOI = "Trang Khoá sổ tháng chỉ Kế toán và Toàn quyền xem được.";
const DU_KIEN = "Dự kiến — tính theo bảng mức hôm nay, chưa lưu";

// Tài khoản thêm (số giả theo khuôn 09000002xx của a2-cdp, không phải số thật)
const DAI_LY = { name: "Lê Thu Hà", phone: "0900000281" }; // Đối tác THUẦN, hồ sơ cá nhân mang vai «Công ty lữ hành» — tạo qua POST /api/staff (vai → quyền PARTNER); PIN do máy chủ trả
const LAI = { name: "Phan Văn Lai", phone: "0900000282", pin: "246882", permissions: ["SALES", "PARTNER"] }; // tài khoản LAI (ADR-0083 1c: chỉ còn ở dữ liệu cũ ⇒ gieo SQL), hồ sơ KHÔNG mang vai được hưởng
const NCC = "I Resort Nha Trang"; // hồ sơ tổ chức mang vai Nhà cung cấp

// Danh mục thêm + nhóm (migration 0055 gieo nhóm bằng JOIN với danh mục — lúc migration danh mục rỗng nên D1 tạm KHÔNG có dòng nhóm nào; /api/catalog ẩn nhóm rỗng)
const CATALOG_SQL = [
  `INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('DTH01','Du thuyền Emperor','perPax',900000,600000,NULL,NULL,'Trẻ 5–10 tuổi',NULL,NULL,5,1,${T},${T}),
    ('IRS01','Tắm bùn I Resort','perPax',350000,250000,NULL,NULL,'Trẻ 5–10 tuổi',NULL,NULL,6,1,${T},${T}),
    ('IRS02','Hồ khoáng I Resort','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,7,1,${T},${T}),
    ('SB16D','Xe 16 chỗ trong ngày','perPax',1800000,NULL,NULL,NULL,NULL,NULL,NULL,8,1,${T},${T})`,
  `INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES
    ('sdl-TD101','TD101','TDA',1,${T},${T},NULL,${T},NULL), ('sdl-TTB03','TTB03','TTB',1,${T},${T},NULL,${T},NULL), ('sdl-TTB06','TTB06','TTB',1,${T},${T},NULL,${T},NULL),
    ('sdl-DTH01','DTH01','DTH',1,${T},${T},NULL,${T},NULL), ('sdl-IRS01','IRS01','IRS',1,${T},${T},NULL,${T},NULL), ('sdl-IRS02','IRS02','IRS',1,${T},${T},NULL,${T},NULL),
    ('sdl-SB16D','SB16D','TXE',1,${T},${T},NULL,${T},NULL)`,
].join(";\n");
const GIA = { DTH01: { adult: 900000, child: 600000 }, TD101: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 } };

// ---- PHÁ THỬ (P16 — quan sát kịch bản chặn thật, KHÔNG sửa mã sản phẩm): SDL_PHA=404,tien gắn vào trang một lớp bọc `fetch` giả hai lỗi giao diện mà `npm test` không bắt:
//   404  — trang coi 404 của …/thuong-mai là lỗi (khối hiện .alert đỏ thay vì ẩn lặng lẽ): bọc đổi 404 thành 500 ⇒ bước 35i phải ĐỎ;
//   tien — giao diện hiện số khác DTO: lời gọi …/thuong-mai ĐẦU TIÊN của mỗi trang nhận thành tiền dòng đầu +1 đồng ⇒ các bước so DTO (4a, 5a, 7c, 33c) phải ĐỎ.
// Chạy phá thử thì đặt OUT=<thư mục tạm> để không ghi đè ảnh thật.
const PHA = process.env.SDL_PHA ?? "";
const PHA_TRANG = PHA ? `{ const PHA = ${JSON.stringify(PHA)}; const f = window.fetch.bind(window); let lan = 0;
  window.fetch = async (u, o) => { const r = await f(u, o); if (!String(u).includes('/thuong-mai') || (o && o.method && o.method !== 'GET')) return r;
    if (PHA.includes('404') && r.status === 404) return new Response(JSON.stringify({ error: { code: 'pha_thu', message: 'Phá thử: lỗi giả' } }), { status: 500, headers: { 'content-type': 'application/json' } });
    if (PHA.includes('tien') && r.ok && lan++ === 0) { const b = await r.clone().json(); const d = b.vanPhong ?? b.doiTac; if (d && d.dong[0]) d.dong[0].thanhTien += 1; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return r; }; }` : "";

// ---- chạy từng bước, gom lỗi -------------------------------------------------------------------------------------------------------------------------------------------
const loi = [];
const axeNhe = [];
const anh = [];
const quanSat = [];
let soBuoc = 0;
async function buoc(id, ten, fn) {
  soBuoc++;
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 14).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
  }
}
const ghiQuanSat = (s) => { quanSat.push(s); console.log(`ℹ ${s}`); };

/** Chụp khung nhìn; `ca`: chụp CẢ trang bằng cách tạm kéo cao khung nhìn tới hết trang (thanh tab / nút dính đáy nằm đúng đáy ảnh, không lơ lửng giữa ảnh như khi
 *  chụp vượt khung), chụp xong trả khung nhìn về cũ. */
async function chup(p, ten, { ca = false, cho = 700 } = {}) {
  if (cho) await sleep(cho);
  let r;
  if (ca) {
    const m = await p.ev("({ w: innerWidth, h0: innerHeight, h: Math.min(document.documentElement.scrollHeight, 6000) })");
    await p.send("Emulation.setDeviceMetricsOverride", { width: m.w, height: Math.max(m.h, m.h0), deviceScaleFactor: p.vp.mobile ? 2 : 1, mobile: p.vp.mobile });
    await sleep(500);
    r = await p.send("Page.captureScreenshot", { format: "png" });
    await p.send("Emulation.setDeviceMetricsOverride", { width: p.vp.width, height: p.vp.height, deviceScaleFactor: p.vp.mobile ? 2 : 1, mobile: p.vp.mobile });
    await sleep(300);
  } else r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
async function chupKhung(p, selector, ten) {
  await p.ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' }), true`);
  await sleep(800);
  const r = await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()`);
  const s = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(s.result.data, "base64"));
  anh.push(ten);
}
/** axe-core (WCAG 2 A + AA + best-practice; tắt meta-viewport như mọi kịch bản Chrome của Nền tảng): critical/serious ⇒ đỏ; moderate/minor ⇒ ghi lại. */
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}

const env = await startEnv();
try {
  // ---- gọi API bằng Node (mỗi lời gọi đăng nhập lại — CHỈ cho tài khoản chưa có trang nào đang mở) ----
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  /** Mở `path` đã đăng nhập bằng `account`. confirm/alert gốc bị THAY trước khi mã trang chạy (hộp gốc làm treo Runtime.evaluate); gắn bộ ghi trạng thái của #phan-doi-tac
   *  (có / ẩn / hiện) cho việc quan sát nháy. `chan`: mẫu URL bị chặn mạng ngay từ đầu (Network.setBlockedURLs). */
  const moTrang = async (account, path, vp, { chan = [] } = {}) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    await p.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.__dialogs = []; window.confirm = (m) => { window.__dialogs.push('confirm: ' + String(m)); return true; }; window.alert = (m) => { window.__dialogs.push('alert: ' + String(m)); };
        window.__pdt = []; const __ghi = () => { const e = document.getElementById('phan-doi-tac'); const s = e ? (e.hidden ? 'an' : 'hien') : 'khong'; const l = window.__pdt[window.__pdt.length - 1]; if (!l || l.s !== s) window.__pdt.push({ s, t: Math.round(performance.now()) }); };
        new MutationObserver(__ghi).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
        ${PHA_TRANG}`,
    });
    if (chan.length) await p.send("Network.setBlockedURLs", { urls: chan });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`, 20000);
    return p;
  };
  const cho = (p, bt, what, ms = 20000) => p.waitFor(bt, what, ms);
  const nhanMenu = (p) => p.ev("[...document.querySelectorAll('#sidebar .sidebar-item .sidebar-item-label')].map((t) => t.textContent.trim())");
  const coLienKet = (p, duong) => p.ev(`!!document.querySelector('a[href="${duong}"]')`);
  const loiTrang = (p) => p.ev("(() => { const e = document.getElementById('error'); return e && !e.hidden ? e.textContent.trim() : null; })()");
  /** #error đang hiện và nằm trọn trong khung nhìn, không bị thanh đầu trang dính che (khuôn TRONG_TAM_NHIN của qr-chung.mjs). */
  const loiTrongTamNhin = (p) => p.ev("(() => { const e = document.getElementById('error'); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); const bar = document.getElementById('topbar'); const lim = bar && getComputedStyle(bar).position === 'sticky' ? bar.getBoundingClientRect().bottom : 0; return r.top >= lim - 1 && r.bottom <= innerHeight + 1; })()");
  const dem = (p, tu, chua) => p.requests.slice(tu).filter((r) => r.url.includes(chua) && r.method === "GET").length;
  /** Toàn văn tài liệu — chữ của MỌI nút kể cả phần ẩn, cộng giá trị thuộc tính (aria-label, title, data-*, value…) — trừ style/script và thuộc tính hình học của
   *  SVG/CSS (width="100%"… không phải tỷ lệ hoa hồng): để dò tỷ lệ, người bán, giá vốn trong DOM. */
  const toanVan = (p) => p.ev(`(() => {
    const boQua = new Set(['style', 'class', 'd', 'viewBox', 'viewbox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'transform', 'fill', 'stroke', 'stroke-width', 'offset', 'href', 'src', 'xmlns']);
    const c = document.documentElement.cloneNode(true); c.querySelectorAll('style, script').forEach((e) => e.remove());
    const thuocTinh = [...c.querySelectorAll('*')].flatMap((e) => [...e.attributes].filter((a) => !boQua.has(a.name)).map((a) => a.name + '=' + a.value));
    return c.textContent + '\\n' + thuocTinh.join('\\n') + '\\n' + [...c.querySelectorAll('*')].filter((e) => e.children.length === 0).map((e) => '>' + e.textContent.trim() + '<').join('');
  })()`);
  /** (ii) mọi số tiền trong #phan-doi-tac khớp chữ đã định dạng của DTO GET …/thuong-mai (đọc bằng fetch NGAY TRONG TRANG). */
  const kiemKhopDto = (p) => p.ev(`(async () => {
    const id = new URLSearchParams(location.search).get('id');
    const b = await (await fetch('/api/orders/' + encodeURIComponent(id) + '/thuong-mai')).json();
    const vp = 'vanPhong' in b; const d = vp ? b.vanPhong : b.doiTac;
    const nf = new Intl.NumberFormat('vi-VN'); const v = (n) => nf.format(n) + ' ₫';
    const host = document.getElementById('phan-doi-tac');
    const o = (scope, nhan) => { const x = [...scope.querySelectorAll('.pdt-o')].find((e) => e.querySelector('dt').textContent.trim() === nhan); return x ? x.querySelector('dd').textContent.trim() : null; };
    const lech = [];
    for (const x of d.dong) {
      const el = host.querySelector('.pdt-dong[data-service-id="' + x.serviceId + '"]');
      if (!el) { lech.push('thiếu dòng ' + x.ten); continue; }
      const mong = { 'Thành tiền': v(x.thanhTien), 'Hoa hồng': x.hoaHong === null ? (vp ? '—' : 'Chờ Công ty cài mức') : v(x.hoaHong), 'Giá đại lý': x.giaDaiLy === null ? '—' : v(x.giaDaiLy) };
      if (vp) mong['Mức'] = x.muc ?? '—';
      for (const [k, m] of Object.entries(mong)) { const t = o(el, k); if (t !== m) lech.push(x.ten + ' / ' + k + ': trang «' + t + '» ≠ DTO «' + m + '»'); }
    }
    const tong = host.querySelector('.pdt-tong');
    const mt = { 'Tổng thành tiền': v(d.tong.thanhTien), 'Tổng hoa hồng': d.tong.hoaHong === null ? 'Chưa đủ mức' : v(d.tong.hoaHong), 'Tổng giá đại lý': d.tong.giaDaiLy === null ? 'Chưa đủ mức' : v(d.tong.giaDaiLy) };
    for (const [k, m] of Object.entries(mt)) { const t = o(tong, k); if (t !== m) lech.push(k + ': trang «' + t + '» ≠ DTO «' + m + '»'); }
    return { dang: vp ? 'vanPhong' : 'doiTac', soDong: d.dong.length, lech, tong: d.tong };
  })()`);

  // ================================================================ Dựng dữ liệu (API + SQL, CHƯA có trang nào mở)
  env.sql(CATALOG_SQL);
  const cat = phai(await call(ACCOUNTS.accounting, "GET", "/api/catalog"), 200, "Kế toán đọc danh mục");
  assert.deepEqual(cat.groups.map((g) => g.code).sort(), ["DTH", "IRS", "TDA", "TTB", "TXE"], `nhóm hiện ở /api/catalog: ${JSON.stringify(cat.groups)}`);
  // Đối tác thuần (đại lý cá nhân): Toàn quyền tạo tài khoản theo vai «Công ty lữ hành» ⇒ quyền PARTNER, hồ sơ cá nhân mang vai được hưởng
  const taoDl = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: DAI_LY.name, phone: DAI_LY.phone, roles: ["TRAVEL_AGENCY"] }), 201, "Toàn quyền tạo tài khoản đại lý");
  assert.deepEqual(taoDl.staff.permissions, ["PARTNER"]);
  DAI_LY.pin = taoDl.pin;
  const DL_ID = taoDl.staff.partyId;
  // Tài khoản lai Bán hàng + Đối tác (dữ liệu cũ — gieo SQL như gieoTaiKhoanLai của tests/e2e/lib.mjs)
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  env.sql(await insertStaffSql(LAI));
  // Nhà cung cấp: Kế toán tạo hồ sơ tổ chức, Quản trị gán vai «Nhà cung cấp» (nhóm OTHER — gán được ở Danh bạ)
  const ncc = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: NCC }), 201, "Kế toán tạo hồ sơ nhà cung cấp");
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${ncc.party.id}/roles`, { roleTypeCode: "SUPPLIER" }), 201, "Quản trị gán vai Nhà cung cấp");
  // Một mức gieo sẵn (để có dòng đóng được cho cả Kế toán và Bán hàng xem): Hướng dẫn viên tự do · mọi dịch vụ · 50.000/khách
  const mucHdv = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: "GUIDE_FREELANCE" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50000, tuNgay: HOM_NAY }), 201, "mức HDV tự do");
  const ky0 = phai(await call(ACCOUNTS.accounting, "GET", "/api/ledger/ky"), 200, "GET /api/ledger/ky");
  assert.deepEqual([ky0.daKhoa, ky0.keTiep, ky0.coTheKhoa], [[], THANG_TRUOC, true], `D1 mới: tháng khoá được kế tiếp là tháng trước: ${JSON.stringify(ky0)}`);
  console.log(`  (dữ liệu: danh mục 7 dịch vụ / 5 nhóm; đại lý cá nhân «${DAI_LY.name}» (PARTNER, vai Công ty lữ hành); tài khoản lai SALES+PARTNER; nhà cung cấp «${NCC}»; mức HDV tự do ${mucHdv.dong?.id ?? ""}; kỳ sổ kế tiếp ${ky0.keTiep})`);

  // ================================================================ 6. Khoá sổ tháng (CHẠY ĐẦU: chưa có dòng sổ nào trong tháng này nên còn tháng trước để khoá)
  const nhanThang = (k) => `${k.slice(5, 7)}/${k.slice(0, 4)}`;
  for (const [kho, vp] of [["1040", DESK], ["390", MOB]]) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, "/khoa-thang", vp);
      await buoc(`6-${kho}a`, `Kế toán /khoa-thang (${kho}): bảng kiểm tháng ${nhanThang(THANG_TRUOC)}, nút khoá mở hộp xác nhận trong trang`, async () => {
        await cho(p, "!!document.getElementById('ky-khoa-btn')", "nút Khoá tháng");
        assert.match(await p.ev("document.getElementById('ky-khoa-btn').textContent"), new RegExp(nhanThang(THANG_TRUOC).replace("/", "\\/")));
        assert.equal(await p.ev("document.querySelectorAll('#ky-bang-kiem .ky-khoi').length"), 3, "ba khối bảng kiểm");
        await chup(p, `6-khoa-thang-${kho}`, { ca: true });
        await p.ev("document.getElementById('ky-khoa-btn').click(), true");
        await cho(p, "!!document.getElementById('ky-xac-nhan')", "hộp xác nhận");
        assert.equal(await p.ev("document.activeElement?.id"), "ky-xac-nhan", "tiêu điểm vào hộp (không vào ô gõ)");
        await chupKhung(p, "#ky-xac-nhan", `6-khoa-thang-hop-xac-nhan-${kho}`);
      });
      await buoc(`6-${kho}b`, `ghi chú «30.09.2026» (nợ M-1 Task 12): ghi lại máy chủ trả gì; hộp và chữ đã gõ còn nguyên`, async () => {
        await p.ev(setInput("document.getElementById('ky-ghi-chu')", "Đối chiếu ngày 30.09.2026"));
        await p.ev("document.getElementById('ky-xac-nhan-btn').click(), true");
        await cho(p, "!document.getElementById('error').hidden", "dòng báo lỗi");
        const cau = await loiTrang(p);
        ghiQuanSat(`6-${kho}) ghi chú «Đối chiếu ngày 30.09.2026» ⇒ máy chủ từ chối: «${cau}» (luật /\\d{8,}/ sau khi bỏ dấu chấm/gạch/khoảng trắng chặn cả ngày viết bằng dấu chấm — ghi theo nợ M-1, không sửa luật)`);
        assert.equal(cau, "Ghi chú không được chứa số điện thoại / số tài khoản.");
        assert.equal(await p.ev("!!document.getElementById('ky-xac-nhan') && document.getElementById('ky-ghi-chu').value"), "Đối chiếu ngày 30.09.2026", "hộp giữ nguyên cùng chữ đã gõ");
        assert.equal(await p.ev("document.getElementById('ky-xac-nhan-btn').disabled"), false, "nút bấm lại được");
        assert.equal((await p.ev("fetch('/api/ledger/ky').then((r) => r.json())")).daKhoa.length, 0, "chưa khoá tháng nào");
        // 390: chụp CẢ trang (vòng sửa 1, người kiểm M-5) — khung nhìn điện thoại chỉ thấy câu từ chối ở đầu trang, ô «Ghi chú» với chữ đã gõ nằm dưới thanh tab.
        await chup(p, `6-khoa-thang-ghi-chu-ngay-cham-${kho}`, kho === "390" ? { ca: true } : {});
      });
      if (kho === "390") {
        await buoc("6-390c", "409 + cuộn (E-1 Task 12): tháng vừa được khoá ở chỗ khác ⇒ câu máy chủ hiện TRONG khung nhìn, hộp đóng, trang tải lại", async () => {
          await p.ev(setInput("document.getElementById('ky-ghi-chu')", ""));
          const r = await p.ev(`fetch('/api/ledger/ky/${THANG_TRUOC}/khoa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status)`);
          assert.equal(r, 201, "khoá bằng fetch trong trang (giả một người khác vừa khoá)");
          await p.ev("window.scrollTo(0, document.documentElement.scrollHeight), document.getElementById('ky-xac-nhan-btn').click(), true");
          await cho(p, "!document.getElementById('ky-xac-nhan') && !document.getElementById('error').hidden", "409 hiện và hộp đóng");
          const cau = await loiTrang(p);
          ghiQuanSat(`6-390) bấm khoá tháng vừa bị khoá ⇒ «${cau}»`);
          assert.ok(cau && !/period_|_closed|\b409\b/.test(cau), `câu tiếng Việt, không mã thô: ${cau}`);
          await sleep(900);
          assert.equal(await loiTrongTamNhin(p), true, "câu từ chối nằm trọn trong khung nhìn (đã cuộn lên)");
          await cho(p, `document.querySelector('#ky-da-khoa [data-thang="${THANG_TRUOC}"]') !== null`, "danh sách tháng đã khoá tải lại");
          assert.equal(await p.ev("!!document.getElementById('ky-khoa-btn')"), false, "không còn tháng khoá được (tháng này chưa qua)");
          await chup(p, "6-khoa-thang-409-cuon-390");
        });
      }
      await buoc(`6-${kho}-axe`, `axe /khoa-thang (${kho})`, () => axeKiem(p, `/khoa-thang ${kho}`));
    } catch (e) {
      loi.push(`6-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 1. Kế toán: /hoa-hong (thêm mức, ô tỷ lệ sai, ô «Một đối tác» không tra được, Tra mức khoá, hộp đóng)
  const themMuc = async (p, { vai, nhom, tyLe }) => {
    await p.ev(`document.querySelector('input[name="muc-doi-tuong"][value="VAI"]').click(), true`);
    await p.ev(`(() => { const s = document.getElementById('muc-vai'); s.value = ${JSON.stringify(vai)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(`(() => { const s = document.getElementById('muc-pham-vi'); s.value = 'GROUP'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(`(() => { const s = document.getElementById('muc-nhom'); s.value = ${JSON.stringify(nhom)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(setInput("document.getElementById('muc-ty-le')", tyLe));
    await p.ev("document.getElementById('muc-add-form').requestSubmit(), true");
  };
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp);
      await cho(p, "!document.getElementById('hh-noi-dung').hidden && !!document.getElementById('muc-vai')", "trang dựng xong");
      await buoc(`1-${kho}a`, `Kế toán /hoa-hong (${kho}): có #muc-add-card và nút [data-dong] trên dòng mức HDV tự do`, async () => {
        assert.equal(await p.ev("document.getElementById('muc-add-card').hidden"), false);
        assert.ok((await p.ev("document.querySelectorAll('[data-dong]').length")) >= 1, "có nút Đóng mức");
        assert.equal(await p.ev(`!!document.querySelector('[data-dong="${mucHdv.dong.id}"]')`), true, "nút đóng đúng dòng gieo sẵn");
        if (kho === "1040") {
          const m = await nhanMenu(p);
          ghiQuanSat(`1-1040) thanh bên Kế toán: ${m.length} mục — ${m.join(", ")}`);
          assert.ok(["Khoá sổ tháng", "Hoa hồng đối tác", "Người bán dịch vụ"].every((x) => m.includes(x)), JSON.stringify(m));
        }
      });
      await buoc(`1-${kho}b`, `ô tỷ lệ gõ «12,555» ⇒ lỗi dưới ô, không gửi`, async () => {
        const truoc = p.requests.length;
        await themMuc(p, { vai: "TRAVEL_AGENCY", nhom: "DTH", tyLe: "12,555" });
        await cho(p, "!document.querySelector('p.field-error[data-loi=\"muc\"]').hidden", "lỗi ô mức");
        const cau = await p.ev("document.querySelector('p.field-error[data-loi=\"muc\"]').textContent.trim()");
        ghiQuanSat(`1-${kho}) «12,555» ⇒ «${cau}»`);
        assert.ok(cau.length > 0);
        assert.equal(p.requests.slice(truoc).filter((r) => r.method === "POST").length, 0, "chưa gửi gì");
        await chupKhung(p, "#muc-add-card", `1-hoa-hong-ty-le-sai-${kho}`);
      });
      await buoc(`1-${kho}c`, `thêm mức 12,5% «${kho === "390" ? "Công ty lữ hành" : "Cộng tác viên"}» · nhóm Du thuyền ⇒ «Đã thêm mức.», dòng mới trong danh sách`, async () => {
        await themMuc(p, { vai: kho === "390" ? "TRAVEL_AGENCY" : "COLLABORATOR", nhom: "DTH", tyLe: "12,5" });
        await cho(p, "!document.getElementById('ok').hidden", "câu Đã thêm mức");
        assert.equal(await p.ev("document.getElementById('ok').textContent"), "Đã thêm mức.");
        const sel = kho === "390" ? "#muc-list-cards" : "#muc-list";
        assert.ok(await p.ev(`[...document.querySelectorAll('${sel} [data-id]')].some((e) => /12,5/.test(e.textContent) && /Du thuyền/.test(e.textContent))`), "dòng 12,5% · Du thuyền");
        await chup(p, `1-hoa-hong-ke-toan-${kho}`, { ca: true });
      });
      await buoc(`1-${kho}d`, `ô «Một đối tác»: #muc-doi-tac[data-khong-tim-duoc] đúng câu «…nhờ Quản trị hoặc Toàn quyền.»; «Tra mức» khoá`, async () => {
        await p.ev(`document.querySelector('input[name="muc-doi-tuong"][value="DOI_TAC"]').click(), true`);
        assert.equal(await p.ev("document.querySelector('#muc-doi-tac').hasAttribute('data-khong-tim-duoc')"), true);
        assert.equal(await p.ev("document.querySelector('#muc-doi-tac').textContent.trim()"), CAU_KHONG_TIM);
        assert.equal(await p.ev("document.querySelector('#thu-tra-doi-tac').hasAttribute('data-khong-tim-duoc')"), true, "ô đối tác của Thử tra cũng là câu");
        assert.equal(await p.ev("[...document.querySelectorAll('#thu-tra-form button')].find((b) => b.textContent.trim() === 'Tra mức').disabled"), true, "nút Tra mức khoá");
        await chupKhung(p, "#thu-tra-form", `1-hoa-hong-thu-tra-khoa-${kho}`);
        await p.ev(`document.querySelector('input[name="muc-doi-tuong"][value="VAI"]').click(), true`);
      });
      await buoc(`1-${kho}e`, `bấm «Đóng mức» ⇒ hộp #dong-hop (ngày kết thúc, xác nhận), «Thôi» đóng hộp`, async () => {
        await p.ev(`document.querySelector('[data-dong="${mucHdv.dong.id}"]').click(), true`);
        await cho(p, "!!document.getElementById('dong-hop')", "hộp đóng mức");
        await chupKhung(p, "#dong-hop", `1-hoa-hong-hop-dong-${kho}`);
        await p.ev("[...document.querySelectorAll('#dong-hop button')].find((b) => b.textContent.trim() === 'Thôi').click(), true");
        await cho(p, "!document.getElementById('dong-hop')", "hộp đóng lại");
      });
      await buoc(`1-${kho}-axe`, `axe /hoa-hong Kế toán (${kho})`, () => axeKiem(p, `/hoa-hong Kế toán ${kho}`));
    } catch (e) {
      loi.push(`1-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 1b. Quản trị / Toàn quyền: tra được đối tác, Thử tra ra mức bậc 5 (loại đối tác cho nhóm)
  for (const [kho, vp, acc, ten] of [["390", MOB, ACCOUNTS.admin, "Quản trị"], ["1040", DESK, ACCOUNTS.admin, "Quản trị"], ["1040", DESK, ACCOUNTS.chu, "Toàn quyền"]]) {
    let p;
    try {
      p = await moTrang(acc, "/hoa-hong", vp);
      await cho(p, "!document.getElementById('hh-noi-dung').hidden && !!document.getElementById('thu-tra-doi-tac')", "trang dựng xong");
      await buoc(`1b-${ten}-${kho}`, `${ten} (${kho}): ô tìm đối tác tra được «${DAI_LY.name}»; Thử tra DTH01 hôm nay ⇒ mức 12,5% «mức của loại đối tác cho nhóm» (bậc 5)`, async () => {
        assert.equal(await p.ev("document.getElementById('thu-tra-doi-tac').tagName"), "INPUT", "ô tìm thật, không phải câu từ chối");
        await p.ev("document.getElementById('thu-tra-doi-tac').focus(), true");
        await p.ev(setInput("document.getElementById('thu-tra-doi-tac')", "Lê Thu"));
        await cho(p, `[...document.querySelectorAll('#thu-tra-form button[data-party]')].some((b) => b.dataset.party === ${JSON.stringify(DL_ID)})`, "kết quả tìm có đại lý");
        await p.ev(`document.querySelector('#thu-tra-form button[data-party="${DL_ID}"]').click(), true`);
        await p.ev(`(() => { const s = document.getElementById('thu-tra-dich-vu'); s.value = 'DTH01'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await p.ev("document.getElementById('thu-tra-form').requestSubmit(), true");
        await cho(p, "!!document.querySelector('#thu-tra-ket-qua .hh-ket-qua')", "kết quả thử tra");
        const kq = await p.ev("document.getElementById('thu-tra-ket-qua').textContent.trim()");
        ghiQuanSat(`1b-${ten}-${kho}) Thử tra «${DAI_LY.name}» · DTH01 ⇒ «${kq}»`);
        assert.match(kq, /12,5/);
        assert.match(kq, /mức của loại đối tác cho nhóm/);
        if (ten === "Quản trị") await chupKhung(p, "#thu-tra-form", `1-hoa-hong-thu-tra-quan-tri-${kho}`);
        if (ten === "Toàn quyền") {
          const m = await nhanMenu(p);
          ghiQuanSat(`1b-Toàn quyền-1040) thanh bên Toàn quyền: ${m.length} mục — ${m.join(", ")}`);
        }
        const coThem = await p.ev("!document.getElementById('muc-add-card').hidden");
        ghiQuanSat(`1b-${ten}-${kho}) ô «Thêm mức»: ${coThem ? "có" : "không"}; nút «Đóng mức»: ${await p.ev("document.querySelectorAll('[data-dong]').length")}`);
      });
      if (ten === "Quản trị") await buoc(`1b-${kho}-axe`, `axe /hoa-hong Quản trị (${kho})`, () => axeKiem(p, `/hoa-hong Quản trị ${kho}`));
    } catch (e) {
      loi.push(`1b-${ten}-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 2. Kế toán: /nguoi-ban (thêm I Resort 80% cho một dịch vụ; nhóm Thuê xe ⇒ câu 409 của máy chủ)
  const themDk = async (p, { phamVi, ma, tyLe }) => {
    await p.ev(`(() => { const s = document.getElementById('dk-pham-vi'); s.value = ${JSON.stringify(phamVi)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    if (phamVi === "SERVICE") await p.ev(`(() => { const s = document.getElementById('dk-dich-vu'); s.value = ${JSON.stringify(ma)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    else await p.ev(`(() => { const s = document.getElementById('dk-nhom'); s.value = ${JSON.stringify(ma)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(`(() => { const s = document.getElementById('dk-nguoi-ban'); s.value = ${JSON.stringify(ncc.party.id)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(setInput("document.getElementById('dk-ty-le-mua')", tyLe));
    await p.ev("document.getElementById('dk-add-form').requestSubmit(), true");
  };
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, "/nguoi-ban", vp);
      await cho(p, "!document.getElementById('nb-noi-dung').hidden && !!document.getElementById('dk-nguoi-ban')", "trang dựng xong");
      await buoc(`2-${kho}a`, `Kế toán /nguoi-ban (${kho}): có #dk-add-card; thêm «${NCC}» mua lại 80% cho ${kho === "390" ? "IRS01" : "IRS02"} ⇒ «Đã thêm điều khoản.»`, async () => {
        assert.equal(await p.ev("document.getElementById('dk-add-card').hidden"), false);
        assert.ok(await p.ev(`[...document.querySelectorAll('#dk-nguoi-ban option')].some((o) => o.textContent === ${JSON.stringify(NCC)})`), "nhà cung cấp có trong ô Người bán");
        await themDk(p, { phamVi: "SERVICE", ma: kho === "390" ? "IRS01" : "IRS02", tyLe: "80" });
        await cho(p, "!document.getElementById('ok').hidden || !document.getElementById('error').hidden", "kết quả thêm");
        assert.equal(await loiTrang(p), null, "không lỗi");
        assert.equal(await p.ev("document.getElementById('ok').textContent"), "Đã thêm điều khoản.");
        await chup(p, `2-nguoi-ban-${kho}`, { ca: true });
      });
      await buoc(`2-${kho}b`, `chọn nhóm «Thuê xe» với nhà cung cấp ⇒ câu 409 của máy chủ hiện ở đầu trang (trong khung nhìn)`, async () => {
        await themDk(p, { phamVi: "GROUP", ma: "TXE", tyLe: "80" });
        await cho(p, "!document.getElementById('error').hidden", "câu lỗi");
        const cau = await loiTrang(p);
        ghiQuanSat(`2-${kho}) nhóm Thuê xe + nhà cung cấp ⇒ «${cau}»`);
        assert.ok(cau && !/prc_|transfer|\b409\b/.test(cau), `câu tiếng Việt không mã thô: ${cau}`);
        await sleep(900); // cuộn êm xong
        assert.equal(await loiTrongTamNhin(p), true, "câu lỗi nằm trọn trong khung nhìn (form ở xa đầu trang)");
        await chup(p, `2-nguoi-ban-thue-xe-409-${kho}`);
      });
      await buoc(`2-${kho}-axe`, `axe /nguoi-ban (${kho})`, () => axeKiem(p, `/nguoi-ban ${kho}`));
    } catch (e) {
      loi.push(`2-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 3.1 Bán hàng: /hoa-hong chỉ xem; không có mục «Người bán dịch vụ»; /nguoi-ban bị từ chối
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.salesA, "/hoa-hong", vp);
      await cho(p, "!document.getElementById('hh-noi-dung').hidden || !document.getElementById('error').hidden", "trang dựng xong");
      await buoc(`31-${kho}a`, `Bán hàng /hoa-hong (${kho}): danh sách có dòng (đóng được với Kế toán) nhưng KHÔNG #muc-add-card hiện, KHÔNG [data-dong]`, async () => {
        assert.equal(await loiTrang(p), null);
        assert.ok((await p.ev("document.querySelectorAll('#muc-list [data-id]').length")) >= 2, "có dòng mức để so");
        assert.equal(await p.ev(`!!document.querySelector('#muc-list [data-id="${mucHdv.dong.id}"]')`), true, "chính dòng Kế toán thấy nút Đóng");
        assert.equal(await p.ev("document.getElementById('muc-add-card').hidden && document.getElementById('muc-add-form').childElementCount === 0"), true, "ô thêm mức ẩn và chưa dựng");
        assert.equal(await p.ev("document.querySelectorAll('[data-dong]').length"), 0, "không nút Đóng mức");
        await chup(p, `31-hoa-hong-ban-hang-${kho}`, { ca: true });
      });
      await buoc(`31-${kho}b`, `Bán hàng (${kho}): không có liên kết «Người bán dịch vụ» / «Khoá sổ tháng»${kho === "1040" ? "; thanh bên có «Hoa hồng đối tác»" : ""}`, async () => {
        assert.equal(await coLienKet(p, "/nguoi-ban"), false);
        assert.equal(await coLienKet(p, "/khoa-thang"), false);
        if (kho === "1040") {
          const m = await nhanMenu(p);
          ghiQuanSat(`31-1040) thanh bên Bán hàng: ${m.length} mục — ${m.join(", ")}`);
          assert.ok(m.includes("Hoa hồng đối tác") && !m.includes("Người bán dịch vụ"), JSON.stringify(m));
        }
      });
      await buoc(`31-${kho}-axe`, `axe /hoa-hong Bán hàng (${kho})`, () => axeKiem(p, `/hoa-hong Bán hàng ${kho}`));
      p.close();
      p = await moTrang(ACCOUNTS.salesA, "/nguoi-ban", vp);
      await buoc(`31-${kho}c`, `Bán hàng mở thẳng /nguoi-ban (${kho}) ⇒ «${CAU_TU_CHOI}», nội dung ẩn`, async () => {
        await cho(p, "!document.getElementById('error').hidden", "câu từ chối");
        assert.equal(await loiTrang(p), CAU_TU_CHOI);
        assert.equal(await p.ev("document.getElementById('nb-noi-dung').hidden"), true);
        if (kho === "390") await chup(p, "31-nguoi-ban-ban-hang-tu-choi-390");
      });
    } catch (e) {
      loi.push(`31-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 3. Bán hàng: form lập đơn — «Đặt qua đối tác», ô tra SĐT ẩn, hai ô khách còn; lưu nháp; mở lại thấy đại lý
  const cards = "document.querySelectorAll('#services .svc')";
  const card = (i) => `${cards}[${i}]`;
  const counter = (i, label) => `${card(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(label)}]')`;
  const chonDichVu = async (p, ma, i) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", ma));
    await cho(p, `[...document.querySelectorAll('#catalog-list .catalog-pick')].some((b) => b.textContent.includes(${JSON.stringify(ma)}))`, `danh mục có ${ma}`);
    await p.ev(`[...document.querySelectorAll('#catalog-list .catalog-pick')].find((b) => b.textContent.includes(${JSON.stringify(ma)})).click(), true`);
    await cho(p, `${cards}.length === ${i + 1}`, `thẻ ${ma}`);
  };
  const nhap = new Map(); // khổ → id đơn nháp
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.salesA, "/order-form", vp);
      await cho(p, "!!document.getElementById('catalog-q') && !!document.querySelector('[data-action=\"dat-qua-mo\"]')", "form dựng xong, có ô Đặt qua đối tác");
      await buoc(`3-${kho}a`, `Bán hàng form (${kho}): «Đặt qua đối tác» tìm «${DAI_LY.name}», chọn ⇒ «Đặt qua: …», ô tra SĐT ẩn, ô Tên + SĐT khách vẫn còn`, async () => {
        assert.equal(await p.ev("!!document.getElementById('dat-qua-doi-tac') && !document.querySelector('.booker').hidden"), true, "ban đầu: ô Đặt qua + ô tra SĐT");
        await chupKhung(p, "#dat-qua-doi-tac", `3-form-dat-qua-truoc-${kho}`);
        await p.ev("document.querySelector('[data-action=\"dat-qua-mo\"]').click(), true");
        await p.ev(setInput("document.querySelector('#dat-qua-doi-tac input[type=search]')", "Lê Thu"));
        await cho(p, `!!document.querySelector('#dat-qua-doi-tac [data-party-id="${DL_ID}"]')`, "kết quả có đại lý");
        if (kho === "390") {
          // Vòng sửa 1 (người kiểm M-5): cắt khung bằng captureBeyondViewport ở 390 làm thanh trên dính «Tạo đơn» đè lên ô gõ — chụp khung nhìn thật sau khi đưa khối vào giữa màn.
          await p.ev("document.getElementById('dat-qua-doi-tac').scrollIntoView({ block: 'center' }), true");
          await chup(p, `3-form-dat-qua-tim-${kho}`);
        } else await chupKhung(p, "#dat-qua-doi-tac", `3-form-dat-qua-tim-${kho}`);
        await p.ev(`document.querySelector('#dat-qua-doi-tac [data-party-id="${DL_ID}"]').click(), true`);
        await cho(p, "!!document.querySelector('#dat-qua-doi-tac .dqdt-chon')", "đã chọn");
        assert.equal(await p.ev("document.querySelector('#dat-qua-doi-tac .dqdt-chon-ten').textContent"), DAI_LY.name);
        assert.equal(await p.ev("document.querySelector('.booker').hidden"), true, "ô tra SĐT ẩn");
        assert.equal(await p.ev("!document.getElementById('customerName').closest('label, .field, div').hidden && !!document.getElementById('customerPhone')"), true, "hai ô khách còn");
      });
      await buoc(`3-${kho}b`, `thêm DTH01 (2 người lớn) + TD101 (1 người lớn), ngày ${NGAY_DI}, lưu ⇒ trang đơn nháp; mở lại form sửa thấy «Đặt qua: ${DAI_LY.name}»`, async () => {
        await p.ev(setInput("document.getElementById('customerName')", `Khách Đi Tour ${kho}`));
        await p.ev(setInput("document.getElementById('customerPhone')", kho === "390" ? "0900 111 390" : "0900 111 104"));
        await chonDichVu(p, "DTH01", 0);
        await p.ev(setInput(counter(0, "Người lớn"), "2"));
        await chonDichVu(p, "TD101", 1);
        await p.ev(setInput("document.getElementById('orderDate')", NGAY_DI));
        await sleep(400);
        await chup(p, `3-form-ban-hang-${kho}`, { ca: true });
        await p.ev("document.getElementById('save').click(), true");
        await cho(p, "location.pathname === '/order'", "chuyển sang trang đơn", 25000);
        const id = await p.ev("new URLSearchParams(location.search).get('id')");
        nhap.set(kho, id);
        await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
        await cho(p, "!!document.querySelector('#dat-qua-doi-tac .dqdt-chon')", "form sửa nạp đại lý vào ô Đặt qua");
        assert.equal(await p.ev("document.querySelector('#dat-qua-doi-tac .dqdt-chon-ten').textContent"), DAI_LY.name);
        assert.equal(await p.ev("document.querySelector('.booker').hidden"), true, "ô tra SĐT vẫn ẩn");
        await chupKhung(p, "#dat-qua-doi-tac", `3-form-mo-lai-nhap-${kho}`);
      });
      await buoc(`3-${kho}-axe`, `axe form lập đơn Bán hàng (${kho})`, () => axeKiem(p, `/order-form Bán hàng ${kho}`));
    } catch (e) {
      loi.push(`3-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 4. Bán hàng: trang đơn nháp — «Dự kiến»; xác nhận; hết «Dự kiến»; «Bên đặt (đối tác)»; số khớp DTO; quan sát nháy + số lời gọi
  for (const [kho, vp] of KHO) {
    const id = nhap.get(kho);
    if (!id) { loi.push(`4-${kho}) bỏ qua: bước 3 không tạo được đơn nháp`); continue; }
    let p;
    try {
      p = await moTrang(ACCOUNTS.salesA, `/order?id=${id}`, vp);
      await cho(p, "!!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden", "khối Phần đối tác hiện");
      await buoc(`4-${kho}a`, `Bán hàng đơn nháp (${kho}): khối «Phần đối tác» chip «Dự kiến…», người hưởng «${DAI_LY.name}», dòng TD101 thiếu mức; số khớp DTO`, async () => {
        assert.equal(await p.ev("document.querySelector('#phan-doi-tac h2').textContent"), "Phần đối tác");
        assert.equal(await p.ev("document.querySelector('#phan-doi-tac .pdt-trang-thai')?.textContent.trim()"), DU_KIEN);
        assert.equal(await p.ev("document.querySelector('#phan-doi-tac .pdt-nguoi-huong').textContent"), `Người hưởng: ${DAI_LY.name}`);
        assert.equal(await p.ev("document.querySelectorAll('#phan-doi-tac .pdt-dong.is-thieu').length"), 1, "một dòng thiếu mức (TD101)");
        const k = await kiemKhopDto(p);
        assert.deepEqual(k.lech, [], JSON.stringify(k));
        assert.equal(await p.ev("document.querySelectorAll('#phan-doi-tac [data-action=\"ghi-tay\"]').length"), 0, "Bán hàng không có nút Ghi mức tay");
        await chup(p, `4-don-nhap-du-kien-${kho}`, { ca: true });
      });
      await buoc(`4-${kho}b`, `bấm «Xác nhận đơn» ⇒ khối hết «Dự kiến», dòng «Bên đặt (đối tác)»; số khớp DTO; đếm lời gọi mỗi lần vẽ`, async () => {
        const truoc = p.requests.length;
        assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent.trim() === 'Xác nhận đơn'); if (!b) return false; b.click(); return true; })()"), true, "có nút Xác nhận đơn");
        await cho(p, "window.__dialogs.length > 0", "hộp hỏi xác nhận (đã thay bằng true)");
        await cho(p, "!!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden && !document.querySelector('#phan-doi-tac .pdt-trang-thai') && /Bên đặt \\(đối tác\\)/.test(document.getElementById('order').textContent)", "đơn đã xác nhận vẽ lại", 25000);
        await sleep(600);
        ghiQuanSat(`4-${kho}) một lần xác nhận (một lần vẽ lại trang đơn): GET …/thuong-mai ×${dem(p, truoc, "/thuong-mai")}, GET /api/pricing/cung-ung ×${dem(p, truoc, "/api/pricing/cung-ung")} (Bán hàng)`);
        const k = await kiemKhopDto(p);
        assert.deepEqual(k.lech, [], JSON.stringify(k));
        ghiQuanSat(`4-${kho}) DTO sau xác nhận: tổng ${JSON.stringify(k.tong)}`);
        await chup(p, `4-don-da-xac-nhan-${kho}`, { ca: true });
      });
      await buoc(`4-${kho}c`, `«Đổi khách» trên đơn đã xác nhận: bảng có ô «Đặt qua đối tác» nạp sẵn đại lý; lưu không đổi ⇒ quan sát nháy của khối + số lời gọi`, async () => {
        await p.ev("document.querySelector('[data-action=\"change-booker\"]').click(), true");
        await cho(p, "!!document.querySelector('.sheet #dat-qua-doi-tac .dqdt-chon')", "bảng Đổi khách có đại lý");
        assert.equal(await p.ev("document.querySelector('.sheet #dat-qua-doi-tac .dqdt-chon-ten').textContent"), DAI_LY.name);
        assert.equal(await p.ev("document.querySelector('.sheet .booker').hidden"), true, "ô tra SĐT trong bảng ẩn");
        await chup(p, `4-doi-khach-bang-${kho}`);
        const truoc = p.requests.length;
        const mark = await p.ev("window.__pdt.length");
        await p.ev("[...document.querySelectorAll('.sheet-foot button')].find((b) => b.textContent.trim() === 'Lưu khách').click(), true");
        await sleep(120);
        await chup(p, `4-doi-khach-ngay-sau-luu-${kho}`, { cho: 0 });
        await cho(p, "!document.querySelector('.sheet') && !!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden", "trang vẽ lại, khối hiện lại", 25000);
        await sleep(800);
        const vet = await p.ev(`window.__pdt.slice(${mark - 1})`);
        const an = vet.findIndex((x) => x.s !== "hien");
        const hien = vet.findIndex((x, i) => i > an && x.s === "hien");
        const ms = an >= 0 && hien > an ? vet[hien].t - vet[an].t : 0;
        ghiQuanSat(`4-${kho}) lưu Đổi khách (một lần vẽ lại): khối đi qua ${vet.map((x) => x.s).join(" → ")}; mất khỏi màn khoảng ${ms} ms; GET …/thuong-mai ×${dem(p, truoc, "/thuong-mai")}, GET /api/pricing/cung-ung ×${dem(p, truoc, "/api/pricing/cung-ung")}`);
        await chup(p, `4-doi-khach-sau-${kho}`);
      });
      await buoc(`4-${kho}-axe`, `axe trang đơn Bán hàng (${kho})`, () => axeKiem(p, `/order Bán hàng ${kho}`));
    } catch (e) {
      loi.push(`4-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 5. Kế toán: trang đơn có dòng thiếu mức — «Ghi mức tay» 15% có lý do ⇒ khối vẽ lại, nhãn «ghi tay»
  // + một đơn riêng cho nhánh 409 của bảng (Quản trị huỷ đơn giữa chừng — tài khoản khác, gọi từ Node, không đụng phiên Kế toán).
  const donMoi = async () => {
    const r = phai(await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Nhánh 409", customerPhone: "0900 111 409", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", bookerPartyId: DL_ID,
      services: [{ kind: "catalog", catalogCode: "DTH01", pax: { adult: 1 }, catalogPriceSeen: GIA.DTH01, departDate: NGAY_DI }] }), 201, "lập đơn cho nhánh 409");
    phai(await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.order.id}/status`, { status: "confirmed" }), 200, "xác nhận đơn cho nhánh 409");
    return r.order.id;
  };
  const don409 = await donMoi().catch((e) => { loi.push(`5-409) dựng đơn: ${String(e?.message ?? e).split("\n")[0]}`); return null; });
  for (const [kho, vp] of KHO) {
    const id = nhap.get(kho);
    if (!id) { loi.push(`5-${kho}) bỏ qua: không có đơn của bước 3–4`); continue; }
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, `/order?id=${id}`, vp);
      await cho(p, "!!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden", "khối hiện");
      await buoc(`5-${kho}a`, `Kế toán (${kho}): dòng TD101 thiếu mức có câu cảnh báo + nút «Ghi mức tay»; số khớp DTO (dạng văn phòng)`, async () => {
        await sleep(600);
        ghiQuanSat(`5-${kho}) Kế toán mở trang đơn (một lần vẽ): GET …/thuong-mai ×${dem(p, 0, "/thuong-mai")}, GET /api/pricing/cung-ung ×${dem(p, 0, "/api/pricing/cung-ung")}`);
        const k = await kiemKhopDto(p);
        assert.equal(k.dang, "vanPhong");
        assert.deepEqual(k.lech, [], JSON.stringify(k));
        assert.equal(await p.ev("!!document.querySelector('#phan-doi-tac .pdt-dong.is-thieu [data-action=\"ghi-tay\"]')"), true);
        await chupKhung(p, "#phan-doi-tac", `5-ke-toan-dong-thieu-muc-${kho}`);
      });
      await buoc(`5-${kho}b`, `«Ghi mức tay» 15% + lý do ⇒ bảng #ghi-tay-sheet đóng, khối vẽ lại, dòng có chip «ghi tay», số khớp DTO`, async () => {
        const sid = await p.ev("document.querySelector('#phan-doi-tac .pdt-dong.is-thieu').dataset.serviceId");
        await p.ev("document.querySelector('#phan-doi-tac .pdt-dong.is-thieu [data-action=\"ghi-tay\"]').click(), true");
        await cho(p, "!!document.getElementById('ghi-tay-sheet') && !!document.getElementById('ghi-tay-ty-le')", "bảng ghi tay mở");
        for (const o of ["ghi-tay-ty-le", "ghi-tay-moi-khach", "ghi-tay-ncc", "ghi-tay-ty-le-mua", "ghi-tay-ly-do", "ghi-tay-dem"]) assert.equal(await p.ev(`!!document.getElementById('${o}')`), true, `có #${o}`);
        await p.ev(setInput("document.getElementById('ghi-tay-ty-le')", "15"));
        await p.ev(setInput("document.getElementById('ghi-tay-ly-do')", "Khách đoàn của đại lý, Giám đốc đồng ý mức riêng cho tour này"));
        await chup(p, `5-ghi-tay-bang-${kho}`);
        await p.ev("document.querySelector('[data-action=\"ghi-tay-gui\"]').click(), true");
        await cho(p, `!document.getElementById('ghi-tay-sheet') && !!document.querySelector('#phan-doi-tac .pdt-dong[data-service-id="${sid}"] .chip')`, "khối vẽ lại có chip ghi tay");
        assert.equal(await p.ev(`document.querySelector('#phan-doi-tac .pdt-dong[data-service-id="${sid}"] .chip').textContent`), "ghi tay");
        assert.equal(await p.ev(`document.querySelector('#phan-doi-tac .pdt-dong[data-service-id="${sid}"]').classList.contains('is-thieu')`), false, "hết thiếu mức");
        const k = await kiemKhopDto(p);
        assert.deepEqual(k.lech, [], JSON.stringify(k));
        ghiQuanSat(`5-${kho}) sau ghi tay 15%: tổng ${JSON.stringify(k.tong)}`);
        await chupKhung(p, "#phan-doi-tac", `5-ghi-tay-sau-${kho}`);
      });
      await buoc(`5-${kho}-axe`, `axe trang đơn Kế toán (${kho})`, () => axeKiem(p, `/order Kế toán ${kho}`));
    } catch (e) {
      loi.push(`5-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }
  if (don409) {
    let p;
    try {
      p = await moTrang(ACCOUNTS.accounting, `/order?id=${don409}`, MOB);
      await cho(p, "!!document.querySelector('#phan-doi-tac [data-action=\"ghi-tay\"]')", "khối có nút ghi tay");
      await buoc("5-409", "bảng «Ghi mức tay» mở, Quản trị huỷ đơn giữa chừng ⇒ câu 409 của máy chủ hiện TRONG bảng, bảng giữ mở, khối nạp lại phía sau", async () => {
        await p.ev("document.querySelector('#phan-doi-tac [data-action=\"ghi-tay\"]').click(), true");
        await cho(p, "!!document.getElementById('ghi-tay-ty-le')", "bảng mở");
        await p.ev(setInput("document.getElementById('ghi-tay-ty-le')", "20"));
        await p.ev(setInput("document.getElementById('ghi-tay-ly-do')", "Đại lý mang khách đoàn lớn, đã duyệt mức riêng"));
        phai(await call(ACCOUNTS.admin, "POST", `/api/orders/${don409}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" }), 200, "Quản trị huỷ đơn");
        const truoc = p.requests.length;
        await p.ev("document.querySelector('[data-action=\"ghi-tay-gui\"]').click(), true");
        await cho(p, "(() => { const s = document.getElementById('ghi-tay-sheet'); const a = s && s.querySelector('.alert'); return !!a && !a.hidden; })()", "câu lỗi trong bảng");
        const cau = await p.ev("document.querySelector('#ghi-tay-sheet .alert').textContent.trim()");
        ghiQuanSat(`5-409) ghi tay sau khi đơn bị huỷ ⇒ «${cau}»`);
        assert.equal(cau, "Chỉ ghi mức tay cho đơn đã xác nhận.");
        await sleep(1000);
        assert.equal(await p.ev("!!document.getElementById('ghi-tay-sheet')"), true, "bảng giữ mở");
        assert.ok(dem(p, truoc, "/thuong-mai") >= 1, "khối nạp lại phía sau (GET …/thuong-mai sau 409)");
        await chup(p, "5-ghi-tay-409-390");
      });
    } catch (e) {
      loi.push(`5-409) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }
  // Lỗi mạng ⇒ dòng lỗi trong khối + nút «Tải lại»; mở mạng, bấm ⇒ khối dựng
  {
    const id = nhap.get("1040");
    let p;
    try {
      if (!id) throw new Error("không có đơn của bước 3–4");
      p = await moTrang(ACCOUNTS.accounting, `/order?id=${id}`, DESK, { chan: ["*thuong-mai*"] });
      await buoc("5-mang", "GET …/thuong-mai hỏng mạng ⇒ khối hiện câu lỗi + nút [data-action=tai-lai-phan-doi-tac]; mở mạng, bấm ⇒ khối dựng đủ", async () => {
        await cho(p, "!!document.querySelector('[data-action=\"tai-lai-phan-doi-tac\"]')", "nút Tải lại");
        const cau = await p.ev("document.querySelector('#phan-doi-tac .alert').textContent.trim()");
        ghiQuanSat(`5-mang) lỗi mạng ⇒ «${cau}»`);
        await chupKhung(p, "#phan-doi-tac", "5-phan-doi-tac-loi-mang-1040");
        await p.send("Network.setBlockedURLs", { urls: [] });
        await p.ev("document.querySelector('[data-action=\"tai-lai-phan-doi-tac\"]').click(), true");
        await cho(p, "!!document.querySelector('#phan-doi-tac .pdt-tong')", "khối dựng lại");
        const k = await kiemKhopDto(p);
        assert.deepEqual(k.lech, [], JSON.stringify(k));
      });
    } catch (e) {
      loi.push(`5-mang) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 3.6 Quản trị: form lập đơn có ô «Đặt qua đối tác»; /khoa-thang bị từ chối ở trang
  {
    let p;
    try {
      p = await moTrang(ACCOUNTS.admin, "/order-form", DESK);
      await buoc("36-quan-tri", "Quản trị form lập đơn có #dat-qua-doi-tac + nút «Đặt qua đối tác»; mở /khoa-thang ⇒ câu từ chối của trang", async () => {
        await cho(p, "!!document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-mo\"]')", "ô Đặt qua đối tác");
        assert.equal(await p.ev("document.querySelector('[data-action=\"dat-qua-mo\"]').textContent"), "Đặt qua đối tác");
        await p.send("Page.navigate", { url: `${env.base}/khoa-thang` });
        await cho(p, "location.pathname === '/khoa-thang' && !document.getElementById('error').hidden", "câu từ chối");
        assert.equal(await loiTrang(p), CAU_KHOA_THANG_TU_CHOI);
      });
    } catch (e) {
      loi.push(`36) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 3.3 + 3.5(i) Tài khoản LAI (Bán hàng + Đối tác)
  // Dữ liệu (API, chưa có trang LAI nào mở): đơn khách lẻ của chính tài khoản lai (đã xác nhận).
  const donLai = await (async () => {
    const r = phai(await call(LAI, "POST", "/api/orders", { customerName: "Khách Của Lai", customerPhone: "0900 111 282", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
      services: [{ kind: "catalog", catalogCode: "DTH01", pax: { adult: 1 }, catalogPriceSeen: GIA.DTH01, departDate: NGAY_DI }] }), 201, "tài khoản lai lập đơn");
    phai(await call(LAI, "POST", `/api/orders/${r.order.id}/status`, { status: "confirmed" }), 200, "tài khoản lai xác nhận");
    return r.order.id;
  })().catch((e) => { loi.push(`33) dựng đơn của tài khoản lai: ${String(e?.message ?? e).split("\n")[0]}`); return null; });
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(LAI, "/home", vp);
      await buoc(`33-lai-${kho}a`, `Tài khoản lai (${kho}): không có liên kết /hoa-hong, /nguoi-ban, /khoa-thang; mở thẳng /hoa-hong và /nguoi-ban ⇒ «${CAU_TU_CHOI}»`, async () => {
        await sleep(1500);
        for (const d of ["/hoa-hong", "/nguoi-ban", "/khoa-thang"]) assert.equal(await coLienKet(p, d), false, `không liên kết ${d}`);
        if (kho === "1040") ghiQuanSat(`33-lai-1040) thanh bên tài khoản lai: ${(await nhanMenu(p)).join(", ")}`);
        for (const d of ["/hoa-hong", "/nguoi-ban"]) {
          await p.send("Page.navigate", { url: env.base + d });
          await cho(p, `location.pathname === '${d}' && !document.getElementById('error').hidden`, `câu từ chối ở ${d}`);
          assert.equal(await loiTrang(p), CAU_TU_CHOI, d);
          assert.equal(await p.ev(`document.getElementById('${d === "/hoa-hong" ? "hh-noi-dung" : "nb-noi-dung"}').hidden`), true);
          if (kho === "390" && d === "/hoa-hong") await chup(p, "33-hoa-hong-tai-khoan-lai-tu-choi-390");
        }
      });
      await buoc(`33-lai-${kho}b`, `Tài khoản lai form lập đơn (${kho}): KHÔNG #dat-qua-doi-tac, KHÔNG #ben-dat-chi-doc; còn ô tra SĐT`, async () => {
        await p.send("Page.navigate", { url: `${env.base}/order-form` });
        await cho(p, "location.pathname === '/order-form' && !!document.getElementById('catalog-q') && !!document.querySelector('.booker')", "form dựng xong");
        await sleep(800);
        assert.equal(await p.ev("!!document.getElementById('dat-qua-doi-tac')"), false);
        assert.equal(await p.ev("!!document.getElementById('ben-dat-chi-doc')"), false);
      });
      if (kho === "1040") {
        await buoc("33-lai-403", `Tài khoản lai gửi đơn với bên đặt là hồ sơ đại lý (qua ô tra SĐT nếu ô tìm thấy, không thì sửa thân gửi) ⇒ thấy NGUYÊN câu 403 của máy chủ (không mã thô)`, async () => {
          const tra = await p.ev(`fetch('/api/parties/lookup?phone=' + encodeURIComponent(${JSON.stringify(DAI_LY.phone)})).then(async (r) => ({ st: r.status, n: r.ok ? (await r.json()).matches.length : null }))`);
          ghiQuanSat(`33-lai-403) GET /api/parties/lookup?phone=<số tài khoản đại lý> của tài khoản lai ⇒ ${tra.st}, ${tra.n ?? "—"} hồ sơ`);
          await p.ev(setInput("document.getElementById('customerName')", "Khách Thử Gắn"));
          await p.ev(setInput("document.getElementById('customerPhone')", DAI_LY.phone));
          await chonDichVu(p, "DTH01", 0);
          await p.ev(setInput("document.getElementById('orderDate')", NGAY_DI));
          let duong = "ô tra SĐT";
          const thay = await p.waitFor(`[...document.querySelectorAll('.booker .booker-match')].some((m) => m.textContent.includes(${JSON.stringify(DAI_LY.name)}) && [...m.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Dùng hồ sơ này'))`, "ô tra SĐT thấy hồ sơ đại lý", 8000).then(() => true, () => false);
          if (thay) {
            await p.ev(`[...[...document.querySelectorAll('.booker .booker-match')].find((m) => m.textContent.includes(${JSON.stringify(DAI_LY.name)})).querySelectorAll('button')].find((b) => b.textContent.trim() === 'Dùng hồ sơ này').click(), true`);
          } else {
            // Ô tra không thấy hồ sơ (số không gắn vào hồ sơ, hoặc không được tra) ⇒ giả trình duyệt gửi bên đặt khác: sửa thân POST /api/orders ngay trong trang.
            duong = "sửa thân gửi (ô tra SĐT không thấy hồ sơ đại lý)";
            await p.ev(`(() => { const f = window.fetch; window.fetch = (u, o) => { if (String(u).endsWith('/api/orders') && o?.method === 'POST' && typeof o.body === 'string') { const b = JSON.parse(o.body); delete b.newBooker; b.bookerPartyId = ${JSON.stringify(DL_ID)}; o = { ...o, body: JSON.stringify(b) }; } return f(u, o); }; return true; })()`);
          }
          await p.ev("document.getElementById('save').click(), true");
          await cho(p, "!document.getElementById('save-error').hidden", "câu lỗi khi lưu", 20000);
          const cau = await p.ev("document.getElementById('save-error').textContent.trim()");
          ghiQuanSat(`33-lai-403) đường: ${duong}; câu hiện: «${cau}»`);
          assert.match(cau, /Đơn qua đại lý hoặc cộng tác viên do văn phòng lập hộ — tài khoản đối tác không chọn được bên đặt này\./);
          assert.ok(!/partner_booker_forbidden|\b403\b/.test(cau), "không mã thô");
          assert.equal(await p.ev("location.pathname"), "/order-form", "không rời form");
          await chup(p, "33-tai-khoan-lai-403-1040");
        });
      }
      p.close();
      // (i) đơn của NGƯỜI KHÁC có người hưởng: khối ẩn lặng lẽ (404), không .alert
      const khac = nhap.get(kho);
      if (khac) {
        p = await moTrang(LAI, `/order?id=${khac}`, vp);
        await buoc(`35i-lai-${kho}`, `(i) Tài khoản lai mở đơn của Bán hàng một có người hưởng (${kho}): trang gọi …/thuong-mai, máy chủ 404, khối ẩn lặng lẽ, không .alert`, async () => {
          await cho(p, "!!document.getElementById('order') && document.getElementById('order').textContent.length > 0", "trang đơn dựng");
          await sleep(1500);
          const goi = p.requests.filter((r) => r.url.includes(`/api/orders/${khac}/thuong-mai`)).length;
          const st = await p.ev(`fetch('/api/orders/${khac}/thuong-mai').then((r) => r.status)`);
          const host = await p.ev("(() => { const e = document.getElementById('phan-doi-tac'); return e ? { co: true, an: e.hidden, alert: e.querySelectorAll('.alert').length, con: e.childElementCount } : { co: false }; })()");
          ghiQuanSat(`35i-${kho}) tài khoản lai, đơn người khác: trang gọi …/thuong-mai ×${goi}, fetch lại ⇒ ${st}; #phan-doi-tac ${host.co ? `có trong DOM, hidden=${host.an}, .alert=${host.alert}, con=${host.con}` : "KHÔNG có trong DOM (nhánh 404 không được đi qua)"}`);
          // Thứ tự có chủ ý: khẳng định DOM trước (phá thử SDL_PHA=404 phải đỏ ở ĐÂY, không chỉ ở mã trạng thái), rồi mới tới lời gọi và mã 404.
          assert.deepEqual(host, { co: true, an: true, alert: 0, con: 0 }, "khối có trong DOM, ẩn, rỗng, không .alert");
          assert.equal(await p.ev("document.querySelectorAll('.alert:not([hidden])').length"), 0, "không có khối lỗi nào hiện");
          assert.ok(goi >= 1, "trang có gọi …/thuong-mai (nhánh 404 thật sự được đi qua)");
          assert.equal(st, 404);
          await chup(p, `35i-tai-khoan-lai-don-nguoi-khac-${kho}`, { ca: true });
        });
        p.close();
      }
      if (donLai) {
        p = await moTrang(LAI, `/order?id=${donLai}`, vp);
        await buoc(`33-lai-${kho}c`, `Tài khoản lai mở đơn khách lẻ của mình (${kho}): khối «Hoa hồng của bạn» (dạng Đối tác); DOM không có tỷ lệ / người bán / giá vốn`, async () => {
          await cho(p, "!!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden", "khối hiện");
          assert.equal(await p.ev("document.querySelector('#phan-doi-tac h2').textContent"), "Hoa hồng của bạn");
          const k = await kiemKhopDto(p);
          assert.equal(k.dang, "doiTac");
          assert.deepEqual(k.lech, [], JSON.stringify(k));
          const html = await toanVan(p);
          assert.equal(/\d+(,\d+)?\s?%/.test(html), false, "không có tỷ lệ % trong DOM");
          for (const t of ["Người bán", "Mua lại", "mua lại", "giá vốn", "Giá vốn", NCC, ">Mức<"]) assert.equal(html.includes(t), false, `DOM không có «${t}»`);
          const dto = JSON.stringify(await p.ev(`fetch('/api/orders/${donLai}/thuong-mai').then((r) => r.json())`));
          assert.equal(/"muc"|"tyLe|"nguoiBan"|"nhaCungCap"/.test(dto), false, `DTO hẹp: ${dto}`);
          if (kho === "390") await chupKhung(p, "#phan-doi-tac", "33-tai-khoan-lai-don-cua-minh-390");
        });
        p.close();
      }
    } catch (e) {
      loi.push(`33-lai-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }

  // ================================================================ 7. Đối tác THUẦN (mở SAU CÙNG — kho cookie dùng chung)
  // Dữ liệu (API, chưa có trang nào của đại lý mở): đơn của chính đại lý, DTH01 2 người lớn, đã xác nhận (mức 12,5% nhóm Du thuyền của bước 1 đã có).
  const donDl = await (async () => {
    const me = phai(await call(DAI_LY, "GET", "/api/auth/me"), 200, "đại lý /api/auth/me");
    ghiQuanSat(`7) /api/auth/me của đại lý: benDatCuaToi = ${JSON.stringify(me.benDatCuaToi)}`);
    assert.deepEqual(me.benDatCuaToi, { partyId: DL_ID, ten: DAI_LY.name });
    // Đối tác ĐƯỢC HƯỞNG gửi bên đặt khác: máy chủ ÉP bên đặt = chính mình (benDatCuaTaiKhoan chạy trước luật K1) ⇒ 201, không 403 — ghi lại đúng hành vi.
    const r = phai(await call(DAI_LY, "POST", "/api/orders", { customerName: "Khách Của Đại Lý", customerPhone: "0900 111 281", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", bookerPartyId: ncc.party.id,
      services: [{ kind: "catalog", catalogCode: "DTH01", pax: { adult: 2 }, catalogPriceSeen: GIA.DTH01, departDate: NGAY_DI }] }), 201, "đại lý lập đơn (gửi bên đặt khác)");
    ghiQuanSat(`7) đại lý gửi bookerPartyId = hồ sơ nhà cung cấp ⇒ ${r.order.bookerPartyId === DL_ID ? "201, bên đặt bị ÉP về chính đại lý" : `201, bên đặt = ${r.order.bookerPartyId}`}`);
    assert.equal(r.order.bookerPartyId, DL_ID);
    phai(await call(DAI_LY, "POST", `/api/orders/${r.order.id}/status`, { status: "confirmed" }), 200, "đại lý xác nhận đơn của mình");
    return r.order.id;
  })().catch((e) => { loi.push(`7) dựng đơn của đại lý: ${String(e?.message ?? e).split("\n")[0]}`); return null; });
  for (const [kho, vp] of KHO) {
    let p;
    try {
      p = await moTrang(DAI_LY, "/home", vp);
      await buoc(`7-${kho}a`, `Đối tác thuần (${kho}): không liên kết /hoa-hong, /nguoi-ban, /khoa-thang; mở thẳng /hoa-hong, /nguoi-ban ⇒ «${CAU_TU_CHOI}»; /khoa-thang ⇒ câu của trang`, async () => {
        await sleep(1500);
        for (const d of ["/hoa-hong", "/nguoi-ban", "/khoa-thang"]) assert.equal(await coLienKet(p, d), false, `không liên kết ${d}`);
        if (kho === "1040") ghiQuanSat(`7-1040) thanh bên Đối tác: ${(await nhanMenu(p)).join(", ")}`);
        for (const [d, cau] of [["/hoa-hong", CAU_TU_CHOI], ["/nguoi-ban", CAU_TU_CHOI], ["/khoa-thang", CAU_KHOA_THANG_TU_CHOI]]) {
          await p.send("Page.navigate", { url: env.base + d });
          await cho(p, `location.pathname === '${d}' && !document.getElementById('error').hidden`, `câu từ chối ở ${d}`);
          assert.equal(await loiTrang(p), cau, d);
          if (kho === "390" && d === "/nguoi-ban") await chup(p, "7-doi-tac-nguoi-ban-tu-choi-390");
        }
      });
      await buoc(`7-${kho}b`, `Đối tác thuần form lập đơn (${kho}): dòng chỉ đọc #ben-dat-chi-doc «Bên đặt: ${DAI_LY.name}», không #dat-qua-doi-tac, không ô tra SĐT`, async () => {
        await p.send("Page.navigate", { url: `${env.base}/order-form` });
        await cho(p, "location.pathname === '/order-form' && !!document.getElementById('ben-dat-chi-doc')", "dòng Bên đặt chỉ đọc");
        assert.equal(await p.ev("document.getElementById('ben-dat-chi-doc').dataset.partyId"), DL_ID);
        assert.equal(await p.ev("document.getElementById('ben-dat-chi-doc').textContent"), `Bên đặt: ${DAI_LY.name}`);
        assert.equal(await p.ev("!!document.getElementById('dat-qua-doi-tac')"), false);
        assert.equal(await p.ev("!!document.querySelector('.booker')"), false, "không ô tra SĐT");
        await chupKhung(p, "#ben-dat-chi-doc", `7-form-ben-dat-chi-doc-${kho}`);
        await chup(p, `7-form-doi-tac-${kho}`, { ca: true });
      });
      await buoc(`7-${kho}b-axe`, `axe form lập đơn Đối tác (${kho})`, () => axeKiem(p, `/order-form Đối tác ${kho}`));
      if (donDl) {
        await p.send("Page.navigate", { url: `${env.base}/order?id=${donDl}` });
        await buoc(`7-${kho}c`, `Đối tác thuần trang đơn của mình (${kho}): «Hoa hồng của bạn», không cột «Mức»; số khớp DTO hẹp; DOM không tỷ lệ / người bán / giá vốn`, async () => {
          await cho(p, "!!document.getElementById('phan-doi-tac') && !document.getElementById('phan-doi-tac').hidden", "khối hiện");
          assert.equal(await p.ev("document.querySelector('#phan-doi-tac h2').textContent"), "Hoa hồng của bạn");
          assert.deepEqual(await p.ev("[...document.querySelectorAll('#phan-doi-tac .pdt-dong dt')].map((d) => d.textContent.trim())"), ["Thành tiền", "Hoa hồng", "Giá đại lý"], "không cột Mức / Người bán");
          const k = await kiemKhopDto(p);
          assert.equal(k.dang, "doiTac");
          assert.deepEqual(k.lech, [], JSON.stringify(k));
          ghiQuanSat(`7-${kho}) Đối tác thấy: tổng ${JSON.stringify(k.tong)}`);
          const html = await toanVan(p);
          assert.equal(/\d+(,\d+)?\s?%/.test(html), false, "không có tỷ lệ % trong DOM");
          for (const t of ["Người bán", "Mua lại", "mua lại", "giá vốn", "Giá vốn", NCC, ">Mức<"]) assert.equal(html.includes(t), false, `DOM không có «${t}»`);
          await chup(p, `7-doi-tac-don-cua-minh-${kho}`, { ca: true });
        });
        await buoc(`7-${kho}c-axe`, `axe trang đơn Đối tác (${kho})`, () => axeKiem(p, `/order Đối tác ${kho}`));
      }
    } catch (e) {
      loi.push(`7-${kho}) mở trang: ${String(e?.message ?? e).split("\n")[0]}`);
    } finally {
      p?.close();
    }
  }
} finally {
  await env.stop();
}

console.log(`\nẢnh (${anh.length}) ở ${OUT}`);
if (quanSat.length) console.log(`\nQuan sát (${quanSat.length}):\n  ${quanSat.join("\n  ")}`);
if (axeNhe.length) console.log(`\naxe nhẹ (moderate/minor, không làm đỏ — ghi vào báo cáo):\n  ${axeNhe.join("\n  ")}`);
if (PHA) console.log(`\nPHÁ THỬ SDL_PHA=${PHA}: kỳ vọng ĐỎ ở các bước ghi ở đầu tệp.`);
if (loi.length) {
  console.log(`\nSMOKE ĐỎ: ${loi.length} lỗi / ${soBuoc} bước (AXE_JS=${process.env.AXE_JS})\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nSMOKE OK — ${soBuoc} bước (AXE_JS=${process.env.AXE_JS})`);
