// Kịch bản Chrome — trang «Hoa hồng đối tác» làm lại (PR 2, đặc tả 2026-10-25 mục A, C, E). Đây là rào DUY NHẤT cho phần GIAO DIỆN của trang: `npm test` canh luật thuần
// (src/shared/hoa-hong-hien-thi.ts…) và máy chủ, `npm run test:e2e` canh HTTP, nhưng không bài nào mở trang. THAY cho các kịch bản cũ khoá chữ/chỗ cũ
// (muc-ta-smoke, loai-doi-tac-smoke, so-dai-ly-smoke — phần trang /hoa-hong) từ 2026-10-26. Mười bước, mỗi khổ 390 và 1040 (bước 9 chỉ có ở 390):
//   1) Kế toán: hai thẻ hiện; Tra nhanh theo TÊN đối tác → số + câu máy chủ; theo LOẠI → câu «Đang tra theo loại…»; «Xem dòng ↓» cuộn tới dòng (trong loại đang tra);
//   2) Kế toán: «＋ Thêm mức» → «Một đối tác» → tạo → đối tác hiện ở mục «Đối tác có mức riêng…»; ô «Tách theo loại khách» không bị kéo dài (≤ 32px, chủ dự án 29/10);
//   3) Kế toán: «Đổi» dòng mức riêng bắt đầu trước hôm nay, Từ = hôm nay → dòng cũ ngừng hôm qua; Từ = hôm nay + 5 → dòng cũ ngừng hôm nay + 4 (kiểm bằng API);
//   4) Đổi bị từ chối: dòng bị ngừng bằng API giữa lúc mở hộp và lúc bấm → hộp còn mở, câu của máy chủ hiện, «Huỷ» bấm được;
//   5) Dòng sắp áp dụng: không Đổi / Ngừng, «chưa tới ngày»; dòng có ngày ngừng tương lai: «ngừng sau <ngày>», không Đổi / Ngừng — cả hai CÓ «Sửa» (ADR-0148, 29/10);
//  5b) (chủ dự án 28/10) Dòng bắt đầu HÔM NAY có «Đổi»: ô «Từ» mặc định và sớm nhất là ngày mai, kèm câu vì sao; đổi xong dòng cũ ngừng hết hôm nay, dòng mới từ ngày mai;
//   6) Thẻ Thiết lập: «Có sẵn» (trước 28/10: «Loại gốc») không nút Tắt/Bật, có câu lý do; thêm loại; thêm chính sách; «Áp dụng cho loại…» với loại còn mức riêng → khung vàng;
//   7) Bán hàng: cùng trang, không một nút ghi nào; Tra nhanh theo tên vẫn chạy;
//   8) Tài khoản Đối tác: câu «Bạn không có quyền xem trang này.» (hoặc không vào được trang);
//   9) (390) Hit-test: tâm nút «＋ Thêm mức» ở thanh đáy trả đúng nút đó, không phải nút nổi Trợ lý; hộp mở → nút Trợ lý ẩn;
//  11) (ADR-0148, 29/10) «Sửa» ví dụ của chủ: dòng 2027 → 2028 chưa có đơn — hộp Sửa nói «sẽ thay hẳn», điền sẵn số + HAI ngày cũ, thiếu lý do thì báo dưới ô;
//      lưu ⇒ dòng mới mang dòng cũ + lý do; bộ lọc mặc định giấu dòng huỷ, «Tất cả» hiện «Đã huỷ — thay bằng dòng khác», không nút;
//  12) (ADR-0148, 29/10) Danh bạ — Quản trị mở hồ sơ đại lý có chính sách riêng: «Sửa» cạnh «Ngừng áp dụng»; chưa có đơn ⇒ «sẽ thay hẳn»; đổi chính sách + lý do ⇒ lưu;
//  10) Chuỗi cấm không có trong chữ nhìn thấy: «Mức TA», «Đóng mức», «Kết thúc gắn», «Đang áp» (không theo «dụng»), «Sắp áp» (không theo «dụng»), «Loại gốc» (từ 28/10; trước đó «Có sẵn»), «Do Kế toán thêm».
// Mỗi bước: không tràn ngang, ô gõ ≥ 16px, không chữ Anh / mã thô, axe-core (critical / serious ⇒ đỏ; thiếu AXE_JS ⇒ dừng ngay), chụp ảnh.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Quy tắc ADR-0074/0075: dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi lúc chỉ một trang mở cho mỗi tài khoản; trong lúc trang mở thì ghi bằng chính trang (fetch trong trang).
// Chạy (sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs
// Ảnh vào docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/anh/ (OUT=<thư mục> để đổi). Cuối: "HOA HONG SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm): HH_PHA=lo-nut — lớp bọc `fetch` thêm quyền Kế toán vào phản hồi /api/auth/me của Bán hàng ⇒ giao diện dựng nút ghi ⇒ bước 7 ĐỎ;
// HH_PHA=fab — gỡ lớp `thanh-hanh-dong-cuoi` khỏi thanh đáy ngay khi trang dựng ⇒ nút Trợ lý không được nâng lên ⇒ bước 9 ĐỎ.
// HH_KHO=390|1040 chạy một khổ; HH_DUNG=<mã bước> dừng sau bước đó.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.HH_KHO || process.env.HH_KHO === ten);
const DUNG = process.env.HH_DUNG ?? "";
const PHA = process.env.HH_PHA ?? "";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/hoa-hong-hien-thi.ts và web/hoa-hong*.ts (viết lại có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_TRA_THEO_LOAI = "Đang tra theo loại. Một đối tác cụ thể của loại này có thể có mức riêng hoặc chính sách riêng — gõ tên đối tác để chắc.";
const CAU_KHONG_CO_QUYEN_XEM = "Bạn không có quyền xem trang này.";
const CAU_DOI_TU_NGAY_MAI = "Mức cũ bắt đầu hôm nay nên mức mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo mức cũ.";
const CAU_THONG_BAO_DONG_RIENG = "Ngừng các mức riêng đó ở thẻ «Mức đang áp dụng».";
const CHU_ANH = /\b(MT_[A-Z]{8}|LD_[A-Z]{8}|muc_trung|muc_tat|prc_tier_\w+|prc_\w+|stale|invalid_input|forbidden|undefined|null|NaN|Internal Server Error)\b|\[object/;
// 28/10: chủ chọn quay lại «Có sẵn» (bỏ khỏi danh sách cấm), «Loại gốc» thành chữ cấm.
const CHU_CAM = [/Mức TA/, /Đóng mức/, /Kết thúc gắn/, /Đang áp(?! dụng)/, /Sắp áp(?! dụng)/, /Đã đóng/, /[Ll]oại gốc/, /Do Kế toán thêm/];
// Nút ghi mà Bán hàng KHÔNG được thấy (chữ đầu của nút).
const NUT_GHI = /^(＋|Thêm|Đổi|Ngừng|Sửa|Tắt|Bật|Áp dụng)/;
const CAU_SUA_HUY_THAY = "Chưa có đơn nào dùng mức này — sửa sẽ thay hẳn.";
const NHAN_DA_HUY = "Đã huỷ — thay bằng dòng khác";

const PHA_TRANG = PHA === "lo-nut"
  ? `{ const f = window.fetch.bind(window);
      window.fetch = async (u, o) => { const r = await f(u, o);
        if (String(u).includes('/api/auth/me') && r.ok) { const b = await r.clone().json(); const s = b.staff ?? b; if (Array.isArray(s.permissions) && !s.permissions.includes('ACCOUNTING')) s.permissions = [...s.permissions, 'ACCOUNTING'];
          return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
        return r; }; }`
  : PHA === "fab"
    ? `setInterval(() => { const b = document.getElementById('hh-thanh-cuoi'); if (b && b.classList.contains('thanh-hanh-dong-cuoi')) b.classList.remove('thanh-hanh-dong-cuoi'); }, 20);`
    : "";

const loi = [];
const axeNhe = [];
const anh = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
  }
  if (id === DUNG) throw new Error("DUNG");
}
/** Chụp ảnh. `toanTrang` false khi có hộp trượt mở (hộp là phần tử cố định, chụp cả trang sẽ lệch). */
async function chup(p, ten, toanTrang = true) {
  await sleep(700);
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: toanTrang });
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  // Đo màu ở trạng thái CUỐI: hộp ở khổ máy tính hiện dần bằng opacity (app.css `.sheet`), và trong lượt chạy dài Chrome headless có lúc dừng hiệu ứng giữa chừng
  // (29/10: hộp Sửa [1040] đứng ở opacity 0,85 ⇒ axe đo nền xám #eaebed, tỷ lệ 4,19). Kết thúc mọi hiệu ứng có hồi kết trước khi đo; hiệu ứng lặp vô hạn bỏ qua.
  await p.ev("document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); true");
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
/** Không tràn ngang; ô gõ đang hiện ≥ 16px (cả trong hộp trượt); không chữ Anh / mã thô; không chuỗi cấm. */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const nho = [...document.querySelectorAll('main input, main select, main textarea, .sheet input, .sheet select, .sheet textarea')].filter((e) => e.offsetParent !== null && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, chu: document.body.innerText };
  })()`);
  assert.ok(m.sw <= m.iw + 1, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
  for (const re of CHU_CAM) assert.ok(!re.test(m.chu), `${nhan}: còn chữ cũ «${re.exec(m.chu)?.[0]}»`);
}

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]);
  const HOM_NAY = vnDate(0);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  // Tài khoản Đối tác (chỉ quyền PARTNER): gieo thẳng bằng staff-lib (Quản trị không còn tạo được tài khoản — ADR-0071), như doi-tac-lap-don-smoke.mjs.
  const PARTNER = { name: "Đối Tác Hoa Hồng", phone: "0900000281", pin: "246881", permissions: ["PARTNER"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) env.sql(stmt);

  const moTrang = async (account, path, vp) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.confirm = () => true; window.alert = () => {}; ${PHA_TRANG}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  const choTrang = (p) => p.waitFor("(() => { const nd = document.getElementById('hh-noi-dung'); return !!nd && !nd.hidden && !!document.querySelector('#hh-the-ap-dung .hh-bang'); })()", "trang Hoa hồng đã vẽ");
  const clickTrong = (p, scope, chu) => p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)} && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const hienOk = (p) => p.ev("(() => { const e = document.getElementById('ok'); return e.hidden ? '' : e.textContent; })()");
  const choOk = (p, chu) => p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent === ${JSON.stringify(chu)}; })()`, `câu «${chu}»`);
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  const choHop = (p, sel) => p.waitFor(`!!document.querySelector(${JSON.stringify(sel)})`, `hộp có ${sel}`);
  const choDongHop = (p) => p.waitFor("!document.querySelector('.sheet')", "hộp đã đóng");
  const chuyenThe = async (p, the) => { assert.equal(await bam(p, `#hh-tab-${the}`), true); await p.waitFor(`!document.getElementById('hh-the-${the}').hidden`, `thẻ ${the} hiện`); };
  const moLoai = async (p, code) => {
    await p.waitFor(`!!document.querySelector('.hh-lo[data-loai="${code}"] .hh-loai-nut')`, `loại ${code} có trong bảng`);
    await p.ev(`(() => { const n = document.querySelector('.hh-lo[data-loai="${code}"] .hh-loai-nut'); if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()`);
  };
  const locTatCa = async (p) => {
    await p.ev(`(() => { const s = document.getElementById('hh-loc-tt'); s.value = 'tat-ca'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  };
  const locMacDinh = async (p) => {
    await p.ev(`(() => { const s = document.getElementById('hh-loc-tt'); s.value = 'ap'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  };
  /** Chữ của các nút đang hiện trong dòng (bỏ vùng chạm cả dòng của điện thoại — nút không chữ). */
  const nutChu = (x) => x.nut.filter((t) => t !== "");
  const hang = (p, id) => p.ev(`(() => { const li = document.querySelector('li[data-dong-id="${id}"]'); if (!li) return null; return { chu: li.innerText, nut: [...li.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()), role: li.getAttribute('role') }; })()`);
  const cacDong = async (p) => (await goiTrongTrang(p, "GET", "/api/pricing/hoa-hong")).json.dong;
  /** Mở hộp «Đổi» của một dòng: máy tính bấm nút «Đổi» trong dòng; điện thoại chạm dòng rồi bấm «Đổi» trong hộp hai việc. */
  const moDoi = async (p, id, tenKho) => {
    if (tenKho === "390") {
      assert.equal(await bam(p, `li[data-dong-id="${id}"] .hh-m-vung`), true, "chạm dòng");
      await choHop(p, ".sheet .sheet-foot");
      assert.equal(await clickTrong(p, ".sheet", "Đổi"), true, "nút Đổi trong hộp hai việc");
    } else {
      assert.equal(await p.ev(`(() => { const b = document.querySelector('li[data-dong-id="${id}"] button[aria-label^="Đổi:"]'); if (!b) return false; b.click(); return true; })()`), true, "nút Đổi của dòng");
    }
    await choHop(p, "#hh-doi-tu-ngay");
  };
  /** Gõ vào Tra nhanh (khối nằm sẵn ở máy tính, hộp trượt ở điện thoại), chọn gợi ý, chọn dịch vụ TD101, bấm Tra. */
  const traNhanh = async (p, tenKho, { q, goiY }) => {
    if (tenKho === "390") {
      assert.equal(await bam(p, "#hh-tra-nhanh-nut"), true, "nút Tra nhanh");
      await choHop(p, ".sheet input[aria-label='Đối tác hoặc loại đối tác']");
    }
    const scope = tenKho === "390" ? ".sheet" : ".hh-tra-nhanh";
    await p.ev(setInput(`document.querySelector(${JSON.stringify(scope + " input[aria-label='Đối tác hoặc loại đối tác']")})`, q));
    await p.waitFor(`[...document.querySelectorAll(${JSON.stringify(scope + " [data-goi-y]")})].some((b) => b.textContent.includes(${JSON.stringify(goiY)}))`, `gợi ý «${goiY}»`);
    await p.ev(`[...document.querySelectorAll(${JSON.stringify(scope + " [data-goi-y]")})].find((b) => b.textContent.includes(${JSON.stringify(goiY)})).click(), true`);
    await p.ev(`(() => { const s = document.querySelector(${JSON.stringify(scope + " select[aria-label='Dịch vụ']")}); s.value = 'TD101'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tra-nhanh, " + scope)}).querySelector('form').requestSubmit(), true`);
    await p.waitFor(`!!document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")})`, "kết quả Tra nhanh");
    return scope;
  };

  let dauTien = true;
  try {
    for (const [tenKho, vp] of KHO) {
      const kho = `[${tenKho}]`;
      const D = tenKho === "390" ? "M" : "D";
      const homQua = vnDate(-1);
      // ---- dựng dữ liệu bằng API (chưa mở trang nào) ----
      const loaiMoi = async (nhan) => phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: `${nhan} ${CHU} ${D}` }), 201, `loại ${nhan}`).loai;
      const ruleMoi = async (loai, tuNgay, phamVi = { phamVi: "SERVICE", catalogCode: "TD101" }) =>
        phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: loai.code }, ...phamVi, kieu: "RATE", tyLeBp: 1000, tuNgay }), 201, `mức riêng ${loai.ten}`);
      const L_A = await loaiMoi("Lễ tân");
      const L_B = await loaiMoi("Hướng dẫn");
      const L_C = await loaiMoi("Tài xế taxi");
      const L_D = await loaiMoi("Khách sạn");
      const L_E = await loaiMoi("Nhà hàng");
      const L_F = await loaiMoi("Cửa hàng");
      const L_G = await loaiMoi("Cộng tác");
      for (const l of [L_A, L_B, L_C, L_D]) await ruleMoi(l, vnDate(-10));
      await ruleMoi(L_E, vnDate(10)); // sắp áp dụng
      await ruleMoi(L_F, vnDate(-10)); // sẽ bị ngừng sau
      await ruleMoi(L_G, HOM_NAY, { phamVi: "ALL" }); // còn mức riêng khi chính sách được áp dụng cho loại (bước 6)
      const L_H = await loaiMoi("Đại lý vé");
      await ruleMoi(L_H, HOM_NAY); // dòng bắt đầu hôm nay: có «Đổi», đổi từ ngày mai (bước 5b)
      // Bước 11 (ADR-0148): ví dụ của chủ — dòng 2027-01-01 → 2028-01-01 chưa có đơn (chạy sau 2027 thì dời sang hôm nay + 30 → + 395, cùng hình dạng).
      const [TU_I, DEN_I] = HOM_NAY < "2027-01-01" ? ["2027-01-01", "2028-01-01"] : [vnDate(30), vnDate(395)];
      const L_I = await loaiMoi("Đại lý tàu");
      const R_I = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: L_I.code }, phamVi: "SERVICE", catalogCode: "TD101", kieu: "RATE", tyLeBp: 1000, tuNgay: TU_I, denNgay: DEN_I }), 201, "mức 2027 → 2028").dong;
      const ds = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/hoa-hong"), 200, "danh sách mức").dong;
      const dongCua = (l) => ds.find((r) => r.doiTuong.loai === "VAI" && r.doiTuong.code === l.code);
      const [R_A, R_B, R_C, R_D, R_E, R_F, R_H] = [L_A, L_B, L_C, L_D, L_E, L_F, L_H].map(dongCua);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/hoa-hong/${R_F.id}/dong`, { denNgay: vnDate(7) }), 200, "ngừng sau cho dòng cửa hàng");
      const orgMoi = async (ten, loai) => {
        const o = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten }), 201, `hồ sơ ${ten}`).party;
        phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${o.id}/roles`, { roleTypeCode: loai.code }), 201, "gắn loại cho hồ sơ");
        return o;
      };
      const ORG = await orgMoi(`Khách sạn Biển Xanh ${CHU} ${D}`, L_A);
      const ORG2 = await orgMoi(`Nhà hàng Hải Sản ${CHU} ${D}`, L_A);
      // R25 + Review Focus 3: một đối tác có BA mức riêng đã bắt đầu từ trước hôm nay (một sẽ «Đổi», một sẽ «Ngừng», một có tên dịch vụ dài ≥ 120 ký tự).
      const TEN_DAI = "Tour khám phá trọn gói bốn đảo vịnh Nha Trang kèm lặn ngắm san hô, tắm biển, ăn trưa hải sản, xe đưa đón khách sạn nội thành và hướng dẫn viên tiếng Việt";
      assert.ok(TEN_DAI.length >= 120, "tên dịch vụ dài ≥ 120 ký tự");
      env.sql(`INSERT OR IGNORE INTO catalog_item (code, name, unit, price_adult, first_seen_at, updated_at, in_sheet) VALUES ('TDLONG1', '${TEN_DAI}', 'khách', 1000000, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1)`);
      const ORG3 = await orgMoi(`Công ty Lữ hành Sao Biển ${CHU} ${D}`, L_A);
      const mucDt = async (phamVi, tyLeBp) =>
        phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: ORG3.id }, ...phamVi, kieu: "RATE", tyLeBp, tuNgay: vnDate(-10) }), 201, "mức riêng của đối tác");
      await mucDt({ phamVi: "SERVICE", catalogCode: "TD101" }, 1200);
      await mucDt({ phamVi: "ALL" }, 500);
      await mucDt({ phamVi: "SERVICE", catalogCode: "TDLONG1" }, 800);
      const dsDt = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/hoa-hong"), 200, "danh sách mức").dong.filter((r) => r.doiTuong.loai === "DOI_TAC" && r.doiTuong.partyId === ORG3.id);
      const R3_DOI = dsDt.find((r) => r.catalogCode === "TD101");
      const R3_NGUNG = dsDt.find((r) => r.phamVi === "ALL");
      assert.ok(R3_DOI && R3_NGUNG && dsDt.length === 3, `ba mức riêng của đối tác: ${dsDt.length}`);
      // Bước 12 (ADR-0148): một đại lý mang chính sách riêng từ hôm nay (chưa có đơn) — hai chính sách để đổi qua lại.
      const ORG4 = await orgMoi(`Đại lý Sóng Xanh ${CHU} ${D}`, L_A);
      const csMoi = async (ten, tyLeBp) => {
        const code = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten }), 201, `chính sách ${ten}`).muc.code;
        phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${code}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" }), 201, `dòng của ${ten}`);
        return code;
      };
      const CS_1 = await csMoi(`Riêng một ${CHU} ${D}`, 900);
      const CS_2 = await csMoi(`Riêng hai ${CHU} ${D}`, 1100);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${ORG4.id}/muc-rieng`, { muc: CS_1, tuNgay: HOM_NAY }), 201, "chính sách riêng cho đại lý");

      // ======================= Kế toán =======================
      {
        const p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp);
        try {
          await choTrang(p);
          await buoc(`1${kho}`, "Kế toán: hai thẻ, Tra nhanh theo tên và theo loại, «Xem dòng ↓» cuộn tới dòng trong loại đang tra", async () => {
            assert.deepEqual(await p.ev("[...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim())"), ["Mức đang áp dụng", "Thiết lập"]);
            assert.equal(await p.ev("document.getElementById('hh-the-thiet-lap').hidden"), true);
            assert.equal(await p.ev("document.querySelectorAll('[role=button] button').length"), 0, "không có vai nút nào chứa nút thật (R23)");
            await bocucSach(p, `bước 1 ${kho}`);
            await axeKiem(p, `Kế toán mở /hoa-hong ${kho}`);
            await chup(p, `01-ke-toan-hai-the-${tenKho}`);
            // theo TÊN đối tác
            let scope = await traNhanh(p, tenKho, { q: `Biển Xanh ${CHU} ${D}`, goiY: ORG.displayName ?? `Khách sạn Biển Xanh ${CHU} ${D}` });
            const kqTen = await p.ev(`(() => { const k = document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")}); return { so: k.querySelector('.hh-tn-so')?.textContent ?? '', cau: k.querySelector('.hh-ket-qua')?.textContent ?? '', theoLoai: k.innerText.includes(${JSON.stringify(CAU_TRA_THEO_LOAI)}) }; })()`);
            assert.match(kqTen.so, /10\s*%/, `số to của Tra nhanh theo tên: ${JSON.stringify(kqTen)}`);
            assert.ok(kqTen.cau.length > 10, "câu nguồn của máy chủ");
            assert.equal(kqTen.theoLoai, false, "tra theo tên không có câu «Đang tra theo loại»");
            await bocucSach(p, `bước 1 sau Tra nhanh theo tên ${kho}`);
            await chup(p, `02-tra-nhanh-theo-ten-${tenKho}`, tenKho !== "390");
            if (tenKho === "390") { await bam(p, ".sheet .sheet-foot .btn"); await choDongHop(p); }
            // theo LOẠI
            scope = await traNhanh(p, tenKho, { q: L_A.ten.slice(0, 6), goiY: `Loại: ${L_A.ten}` });
            assert.equal(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")}).innerText.includes(${JSON.stringify(CAU_TRA_THEO_LOAI)})`), true, "tra theo loại có câu «Đang tra theo loại…»");
            await chup(p, `03-tra-nhanh-theo-loai-${tenKho}`, tenKho !== "390");
            assert.equal(await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(scope + " [data-xem-dong]")}); if (!b) return false; b.click(); return true; })()`), true, "nút «Xem dòng ↓»");
            if (tenKho === "390") await choDongHop(p);
            await p.waitFor(`!!document.querySelector('.hh-lo[data-loai="${L_A.code}"] li[data-dong-id="${R_A.id}"].hh-nhay')`, "dòng được tô nổi trong đúng loại đang tra");
            assert.equal(await p.ev(`document.querySelector('.hh-lo[data-loai="${L_A.code}"] .hh-loai-nut').getAttribute('aria-expanded')`), "true", "cụm chứa dòng đã mở");
            await chup(p, `04-xem-dong-${tenKho}`);
          });

          await buoc(`2${kho}`, "«＋ Thêm mức» → «Một đối tác» → tạo → đối tác hiện ở mục «Đối tác có mức riêng…»", async () => {
            assert.equal(await p.ev(`(() => { const b = [...document.querySelectorAll('#hh-them-muc, #hh-them-muc-day')].find((x) => x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`), true, "nút «＋ Thêm mức» đang hiện");
            await choHop(p, "#hh-hop-pham-vi");
            assert.equal(await p.ev("document.querySelector('.sheet-title').textContent"), "Thêm mức");
            assert.equal(await bam(p, "input[name='hh-hop-ai'][value='DOI_TAC']"), true);
            await p.ev(setInput("document.getElementById('hh-hop-doi-tac')", `Hải Sản ${CHU} ${D}`));
            await p.waitFor(`!!document.querySelector('.sheet button[data-party="${ORG2.id}"]')`, "kết quả tìm có đối tác");
            await bam(p, `.sheet button[data-party="${ORG2.id}"]`);
            await p.ev("(() => { const s = document.getElementById('hh-hop-dich-vu'); s.value = 'TD101'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            // (chủ dự án 29/10) ô «Tách theo loại khách» không bị luật chung `input { width: 100% }` kéo dài giữa dòng: bật ô, đo bề rộng, trả hộp về như cũ.
            await p.ev("(() => { const k = document.getElementById('hh-hop-kieu'); k.value = 'PER_PAX'; k.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('hh-hop-theo-loai').click(); return true; })()");
            const rongO = await p.ev("document.getElementById('hh-hop-theo-loai').getBoundingClientRect().width");
            assert.ok(rongO > 0 && rongO <= 32, `ô «Tách theo loại khách» rộng ${rongO}px — bị kéo dài (thiếu lớp o-tick)`);
            await chup(p, `05b-o-tach-theo-loai-${tenKho}`, false);
            await p.ev("(() => { document.getElementById('hh-hop-theo-loai').click(); const k = document.getElementById('hh-hop-kieu'); k.value = 'RATE'; k.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev(setInput("document.getElementById('hh-hop-ty-le')", "12,5"));
            await p.waitFor("!document.querySelector('.sheet .hint[aria-live]').hidden", "câu «Sẽ tạo…» hiện");
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Sẽ tạo: .*12,5\s*%.*không thời hạn\.$/);
            await bocucSach(p, `bước 2 hộp Thêm mức ${kho}`);
            await axeKiem(p, `hộp Thêm mức ${kho}`);
            await chup(p, `05-hop-them-muc-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Thêm mức"), true);
            await choOk(p, "Đã thêm mức.");
            await choDongHop(p);
            await p.waitFor(`!!document.querySelector('.hh-dt[data-party="${ORG2.id}"]')`, "đối tác có ở mục «Đối tác có mức riêng…»");
            assert.match(await p.ev(`document.querySelector('.hh-dt[data-party="${ORG2.id}"]').innerText`), /Mức riêng/);
            await bocucSach(p, `bước 2 ${kho}`);
          });

          await buoc(`2c${kho}`, "Tên dịch vụ rất dài (≥ 120 ký tự) ở dòng đối tác: không tràn ngang, dòng tóm tắt bắt đầu bằng số", async () => {
            const k = await p.ev(`(() => { const t = document.querySelector('.hh-dt[data-party="${ORG3.id}"] .hh-tom-tat'); return t ? { chu: t.textContent, rong: document.documentElement.scrollWidth, khung: innerWidth } : null; })()`);
            assert.ok(k, "đối tác có dòng tóm tắt");
            assert.match(k.chu, /^\d/, `dòng tóm tắt bắt đầu bằng số: ${k.chu.slice(0, 60)}`);
            assert.ok(k.chu.includes(TEN_DAI), "tên dịch vụ dài có trong dòng tóm tắt (bị cắt bằng CSS, không mất chữ)");
            assert.ok(k.rong <= k.khung, `không tràn ngang: scrollWidth ${k.rong} > ${k.khung}`);
            await p.ev(`document.querySelector('.hh-dt[data-party="${ORG3.id}"]').scrollIntoView({ block: 'center' })`);
            await bocucSach(p, `bước 2c ${kho}`);
            await chup(p, `17-ten-dich-vu-rat-dai-${tenKho}`, false);
          });

          await buoc(`2b${kho}`, "Mục «Đối tác…»: mở một đối tác (▾) thấy số, «Đổi» và «Ngừng» dòng mức riêng chạy được", async () => {
            const sel = `.hh-dt[data-party="${ORG3.id}"]`;
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`), "false", "đóng sẵn");
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-lo-ct').hidden`), true);
            assert.equal(await bam(p, `${sel} .hh-loai-nut`), true);
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`), "true");
            const chu = await p.ev(`document.querySelector('${sel} .hh-lo-ct').innerText`);
            assert.match(chu, /12\s*%/, `thấy số của dòng mức riêng: ${chu.slice(0, 200)}`);
            assert.ok(chu.includes("Đang áp dụng"), "thấy trạng thái");
            assert.ok(chu.includes("Danh bạ"), "có liên kết hồ sơ ở Danh bạ");
            assert.equal(await p.ev(`document.querySelectorAll('[role=button] button').length`), 0, "không có vai nút nào chứa nút thật");
            await bocucSach(p, `bước 2b mở đối tác ${kho}`);
            await axeKiem(p, `đối tác mở ${kho}`);
            await chup(p, `18-doi-tac-mo-ra-${tenKho}`);
            // Đổi dòng 12% -> 14%
            await moDoi(p, R3_DOI.id, tenKho);
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "14"));
            assert.equal(await clickTrong(p, ".sheet", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            let dong = await cacDong(p);
            assert.equal(dong.find((r) => r.id === R3_DOI.id).denNgay, homQua, "dòng cũ của đối tác ngừng hôm qua");
            assert.ok(dong.some((r) => r.doiTuong.partyId === ORG3.id && r.id !== R3_DOI.id && r.tyLeBp === 1400), "dòng mới 14% của đối tác");
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`), "true", "đối tác vẫn mở sau khi vẽ lại");
            // Ngừng dòng «Mọi dịch vụ»
            if (tenKho === "390") {
              assert.equal(await bam(p, `li[data-dong-id="${R3_NGUNG.id}"] .hh-m-vung`), true, "chạm dòng");
              await choHop(p, ".sheet .sheet-foot");
              assert.equal(await clickTrong(p, ".sheet", "Ngừng"), true, "nút Ngừng trong hộp hai việc");
            } else {
              assert.equal(await p.ev(`(() => { const b = document.querySelector('li[data-dong-id="${R3_NGUNG.id}"] button[aria-label^="Ngừng:"]'); if (!b) return false; b.click(); return true; })()`), true, "nút Ngừng của dòng");
            }
            await choHop(p, "#hh-ngung-ngay");
            assert.equal(await clickTrong(p, ".sheet", "Ngừng"), true);
            await choOk(p, "Đã ngừng.");
            await choDongHop(p);
            dong = await cacDong(p);
            assert.notEqual(dong.find((r) => r.id === R3_NGUNG.id).denNgay, null, "dòng «Mọi dịch vụ» của đối tác đã có ngày ngừng");
            await bocucSach(p, `bước 2b ${kho}`);
          });

          await buoc(`3${kho}`, "«Đổi» dòng mức riêng: Từ = hôm nay → cũ ngừng hôm qua; Từ = hôm nay + 5 → cũ ngừng hôm nay + 4", async () => {
            // (a) Từ = hôm nay
            await moLoai(p, L_B.code);
            assert.equal(await p.ev(`getComputedStyle(document.querySelector('li[data-dong-id="${R_B.id}"] .hh-m-vung')).display !== 'none'`), tenKho === "390", "vùng chạm cả dòng chỉ hiện ở điện thoại");
            await moDoi(p, R_B.id, tenKho);
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Mức cũ .* sẽ ngừng, đến hết /);
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "20"));
            await bocucSach(p, `bước 3a hộp Đổi ${kho}`);
            await axeKiem(p, `hộp Đổi ${kho}`);
            await chup(p, `06-hop-doi-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            let dong = await cacDong(p);
            const cuB = dong.find((r) => r.id === R_B.id);
            const moiB = dong.find((r) => r.doiTuong.code === L_B.code && r.id !== R_B.id);
            assert.equal(cuB.denNgay, homQua, "dòng cũ ngừng hôm qua");
            assert.equal(moiB.tuNgay, HOM_NAY, "dòng mới từ hôm nay");
            await moLoai(p, L_B.code);
            await locTatCa(p);
            await moLoai(p, L_B.code);
            const [hCu, hMoi] = [await hang(p, R_B.id), await hang(p, moiB.id)];
            assert.ok(hCu.chu.includes("Đã ngừng"), `dòng cũ «Đã ngừng»: ${hCu.chu}`);
            assert.ok(hMoi.chu.includes("Đang áp dụng"), `dòng mới «Đang áp dụng»: ${hMoi.chu}`);
            await chup(p, `07-sau-doi-tu-hom-nay-${tenKho}`);
            // (b) Từ = hôm nay + 5
            await moLoai(p, L_C.code);
            await moDoi(p, R_C.id, tenKho);
            await p.ev(setInput("document.getElementById('hh-doi-tu-ngay')", vnDate(5)));
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "15"));
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Mức cũ .* sẽ ngừng, đến hết /);
            assert.equal(await clickTrong(p, ".sheet", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            dong = await cacDong(p);
            assert.equal(dong.find((r) => r.id === R_C.id).denNgay, vnDate(4), "dòng cũ ngừng hôm nay + 4");
            const moiC = dong.find((r) => r.doiTuong.code === L_C.code && r.id !== R_C.id);
            assert.equal(moiC.tuNgay, vnDate(5), "dòng mới từ hôm nay + 5");
            await moLoai(p, L_C.code);
            const hCu2 = await hang(p, R_C.id);
            assert.ok(hCu2.chu.includes("ngừng sau") && !nutChu(hCu2).some((t) => t === "Đổi" || t === "Ngừng"), `dòng cũ «ngừng sau…», không Đổi / Ngừng: ${JSON.stringify(hCu2)}`);
            if (tenKho !== "390") assert.deepEqual(nutChu(hCu2), ["Sửa"], "ADR-0148: dòng đã hẹn ngày ngừng vẫn có «Sửa»");
            await bocucSach(p, `bước 3 ${kho}`);
          });

          await buoc(`4${kho}`, "Đổi bị từ chối: dòng bị ngừng giữa chừng → hộp còn mở, câu của máy chủ hiện, «Huỷ» bấm được", async () => {
            await moLoai(p, L_D.code);
            await moDoi(p, R_D.id, tenKho);
            const kq = await goiTrongTrang(p, "POST", `/api/pricing/hoa-hong/${R_D.id}/dong`, { denNgay: HOM_NAY });
            assert.equal(kq.status, 200, JSON.stringify(kq.json));
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "30"));
            assert.equal(await clickTrong(p, ".sheet", "Đổi mức"), true);
            await p.waitFor("(() => { const w = document.querySelector('.sheet .sheet-warn'); return !!w && !w.hidden && w.textContent.trim().length > 5; })()", "câu lỗi của máy chủ trong hộp");
            const cau = await p.ev("document.querySelector('.sheet .sheet-warn').textContent");
            assert.ok(!CHU_ANH.test(cau), `câu lỗi không lộ mã: ${cau}`);
            assert.equal(await p.ev("!!document.querySelector('.sheet')"), true, "hộp còn mở");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet .sheet-foot button')].every((b) => !b.disabled)"), true, "nút bấm lại được");
            await bocucSach(p, `bước 4 ${kho}`);
            await chup(p, `08-doi-bi-tu-choi-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
            await choDongHop(p);
          });

          await buoc(`5${kho}`, "Dòng sắp áp dụng: không Đổi / Ngừng, «chưa tới ngày»; dòng có ngày ngừng tương lai: «ngừng sau <ngày>»; cả hai có «Sửa» (ADR-0148)", async () => {
            await moLoai(p, L_E.code);
            await moLoai(p, L_F.code);
            const [e, f] = [await hang(p, R_E.id), await hang(p, R_F.id)];
            const khongDoiNgung = (x) => !nutChu(x).some((t) => t === "Đổi" || t === "Ngừng");
            assert.ok(e.chu.includes("chưa tới ngày") && e.chu.includes("Sắp áp dụng") && khongDoiNgung(e) && e.role === null, `dòng sắp áp dụng: ${JSON.stringify(e)}`);
            assert.ok(f.chu.includes("ngừng sau") && khongDoiNgung(f) && f.role === null, `dòng ngừng sau: ${JSON.stringify(f)}`);
            if (tenKho !== "390") for (const x of [e, f]) assert.deepEqual(nutChu(x), ["Sửa"], `máy tính: chỉ nút «Sửa»: ${JSON.stringify(x)}`);
            await bocucSach(p, `bước 5 ${kho}`);
            await axeKiem(p, `dòng sắp / ngừng sau ${kho}`);
            await chup(p, `09-dong-sap-va-ngung-sau-${tenKho}`);
          });

          // Chủ dự án 28/10: dòng bắt đầu hôm nay có «Đổi» / «Ngừng» (trước đó chỉ ghi «đổi hoặc ngừng từ ngày mai», người dùng không tìm thấy nút).
          await buoc(`5b${kho}`, "Dòng bắt đầu hôm nay: có «Đổi»; hộp Đổi từ ngày mai kèm câu vì sao; đổi xong cũ ngừng hết hôm nay, mới từ ngày mai", async () => {
            const MAI = vnDate(1);
            await moLoai(p, L_H.code);
            const h0 = await hang(p, R_H.id);
            assert.ok(h0 && !h0.chu.includes("ngày mai"), `không còn chữ xám «… từ ngày mai»: ${JSON.stringify(h0)}`);
            if (tenKho !== "390") assert.deepEqual(h0.nut, ["Đổi", "Ngừng", "Sửa"], "máy tính: nút Đổi, Ngừng và Sửa (ADR-0148) trong dòng");
            await moDoi(p, R_H.id, tenKho);
            assert.deepEqual(await p.ev("(() => { const t = document.getElementById('hh-doi-tu-ngay'); return { v: t.value, min: t.min }; })()"), { v: MAI, min: MAI }, "ô Từ mặc định và sớm nhất là ngày mai");
            assert.ok(await p.ev(`[...document.querySelectorAll('.sheet .hint')].some((x) => x.textContent.trim() === ${JSON.stringify(CAU_DOI_TU_NGAY_MAI)})`), "câu vì sao mức mới từ ngày mai");
            const homNayVN = HOM_NAY.split("-").reverse().join("/");
            assert.ok((await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent")).endsWith(`đến hết ${homNayVN}.`), "mức cũ ngừng hết hôm nay");
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "25"));
            await bocucSach(p, `bước 5b hộp Đổi ${kho}`);
            await axeKiem(p, `hộp Đổi dòng bắt đầu hôm nay ${kho}`);
            await chup(p, `09b-hop-doi-dong-hom-nay-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            const dong = await cacDong(p);
            const moiH = dong.find((r) => r.doiTuong.code === L_H.code && r.id !== R_H.id);
            assert.equal(dong.find((r) => r.id === R_H.id).denNgay, HOM_NAY, "dòng cũ ngừng hết hôm nay");
            assert.equal(moiH?.tuNgay, MAI, "dòng mới từ ngày mai");
            await moLoai(p, L_H.code);
            const hCu = await hang(p, R_H.id);
            assert.ok(hCu.chu.includes("ngừng sau") && !nutChu(hCu).some((t) => t === "Đổi" || t === "Ngừng"), `dòng cũ «ngừng sau…», không Đổi / Ngừng: ${JSON.stringify(hCu)}`);
            await bocucSach(p, `bước 5b ${kho}`);
          });

          await buoc(`11${kho}`, "Sửa (ADR-0148, ví dụ chủ): dòng 2027 → 2028 chưa có đơn — «sẽ thay hẳn», điền sẵn số + hai ngày, lý do bắt buộc; lưu ⇒ dòng cũ «Đã huỷ — thay bằng dòng khác», không nút", async () => {
            await locMacDinh(p);
            await moLoai(p, L_I.code);
            const h0 = await hang(p, R_I.id);
            assert.ok(h0 && h0.chu.includes("chưa tới ngày") && h0.chu.includes("Sắp áp dụng"), `dòng 2027 → 2028: ${JSON.stringify(h0)}`);
            if (tenKho === "390") {
              assert.equal(await bam(p, `li[data-dong-id="${R_I.id}"] .hh-m-vung`), true, "chạm dòng (dòng chưa tới ngày nay có vùng chạm vì có «Sửa»)");
              await choHop(p, ".sheet .sheet-foot");
              assert.deepEqual(await p.ev("[...document.querySelectorAll('.sheet .sheet-foot button')].map((b) => b.textContent.trim())"), ["Sửa"], "hộp việc của dòng chỉ có «Sửa»");
              assert.equal(await clickTrong(p, ".sheet", "Sửa"), true, "nút Sửa trong hộp việc");
            } else {
              assert.deepEqual(nutChu(h0), ["Sửa"], "máy tính: nút «Sửa» trong dòng");
              assert.equal(await p.ev(`(() => { const b = document.querySelector('li[data-dong-id="${R_I.id}"] button[aria-label^="Sửa:"]'); if (!b) return false; b.click(); return true; })()`), true, "nút Sửa của dòng");
            }
            await choHop(p, "#hh-sua-ly-do");
            const o = await p.ev(`(() => ({ cau: document.querySelector('.sheet .hint[role=status]')?.textContent.trim() ?? '', tu: document.getElementById('hh-sua-tu-ngay').value,
              denChon: document.getElementById('hh-sua-den-chon').value, den: document.getElementById('hh-sua-den-ngay').value, tyLe: document.getElementById('hh-sua-ty-le').value }))()`);
            assert.deepEqual(o, { cau: CAU_SUA_HUY_THAY, tu: TU_I, denChon: "NGAY", den: DEN_I, tyLe: "10" }, "điền sẵn số và HAI ngày của dòng cũ");
            await p.ev(setInput("document.getElementById('hh-sua-ty-le')", "12"));
            assert.equal(await clickTrong(p, ".sheet", "Lưu sửa"), true);
            await p.waitFor("(() => { const e = document.querySelector('.sheet [data-loi=lyDo]'); return !!e && !e.hidden; })()", "lỗi lý do dưới ô");
            assert.equal(await p.ev("document.querySelector('.sheet [data-loi=lyDo]').textContent"), "Ghi lý do sửa (ít nhất 10 ký tự).");
            assert.equal(await p.ev("!!document.querySelector('.sheet')"), true, "thiếu lý do: hộp còn mở, không gửi");
            await p.ev(setInput("document.getElementById('hh-sua-ly-do')", "Nhập sai giá đại lý của tour"));
            await bocucSach(p, `bước 11 hộp Sửa ${kho}`);
            await axeKiem(p, `hộp Sửa ${kho}`);
            await chup(p, `19-hop-sua-huy-thay-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Lưu sửa"), true);
            await choOk(p, "Đã sửa mức.");
            await choDongHop(p);
            const dong = await cacDong(p);
            const cu = dong.find((r) => r.id === R_I.id);
            const moi = dong.find((r) => r.thayCho === R_I.id);
            assert.deepEqual([cu.daHuy, moi?.tyLeBp, moi?.tuNgay, moi?.denNgay, moi?.lyDoSua], [true, 1200, TU_I, DEN_I, "Nhập sai giá đại lý của tour"], "dòng mới giữ hai ngày, mang lý do");
            await moLoai(p, L_I.code);
            assert.equal(await hang(p, R_I.id), null, "bộ lọc «Đang và sắp áp dụng» giấu dòng đã huỷ");
            assert.ok((await hang(p, moi.id))?.chu.includes("12"), "dòng mới 12% hiện");
            await locTatCa(p);
            await moLoai(p, L_I.code);
            const hHuy = await hang(p, R_I.id);
            assert.ok(hHuy && hHuy.chu.includes(NHAN_DA_HUY) && hHuy.nut.length === 0, `dòng huỷ ở «Tất cả»: «${NHAN_DA_HUY}», không nút: ${JSON.stringify(hHuy)}`);
            await bocucSach(p, `bước 11 ${kho}`);
            await axeKiem(p, `dòng đã huỷ ${kho}`);
            await chup(p, `20-dong-da-huy-${tenKho}`);
          });

          // Nhãn «Có sẵn» (chủ chọn 28/10, thay «Loại gốc») + câu lý do dưới danh sách.
          await buoc(`6${kho}`, "Thẻ Thiết lập: «Có sẵn» không Tắt/Bật, có câu lý do; thêm loại; thêm chính sách; «Áp dụng cho loại…» với loại còn mức riêng → khung vàng", async () => {
            await chuyenThe(p, "thiet-lap");
            const goc = await p.ev("[...document.querySelectorAll('.hh-tl-dong')].filter((li) => [...li.querySelectorAll('.badge')].some((b) => b.textContent.trim() === 'Có sẵn')).map((li) => [...li.querySelectorAll('button')].map((b) => b.textContent.trim()))");
            assert.ok(goc.length > 0, "có loại mang nhãn «Có sẵn»");
            for (const nut of goc) assert.ok(!nut.some((t) => /^(Tắt|Bật)$/.test(t)), `«Có sẵn» không có Tắt/Bật: ${nut}`);
            assert.ok(await p.ev("[...document.querySelectorAll('.hint')].some((x) => x.textContent.trim() === 'Loại có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.')"), "câu lý do dưới danh sách loại");
            await bocucSach(p, `bước 6 Thiết lập ${kho}`);
            await axeKiem(p, `thẻ Thiết lập ${kho}`);
            await chup(p, `10-thiet-lap-${tenKho}`);
            // thêm loại
            const TEN_LOAI = `Điểm bán ${CHU} ${D}`;
            assert.equal(await clickTrong(p, "#hh-the-thiet-lap", "＋ Thêm loại"), true);
            await choHop(p, "#hh-hoi-ten");
            await p.ev(setInput("document.getElementById('hh-hoi-ten')", TEN_LOAI));
            assert.equal(await clickTrong(p, ".sheet", "Thêm loại"), true);
            await choOk(p, "Đã thêm loại.");
            await choDongHop(p);
            await p.waitFor(`[...document.querySelectorAll('.hh-tl-dong')].some((li) => li.innerText.includes(${JSON.stringify(TEN_LOAI)}))`, "loại mới có trong danh sách");
            // thêm chính sách
            const TEN_CS = `Chính sách thử ${CHU} ${D}`;
            assert.equal(await clickTrong(p, "#hh-the-thiet-lap", "＋ Thêm chính sách"), true);
            await choHop(p, "#hh-hoi-ten");
            await p.ev(setInput("document.getElementById('hh-hoi-ten')", TEN_CS));
            assert.equal(await clickTrong(p, ".sheet", "Thêm chính sách"), true);
            await choOk(p, "Đã thêm chính sách.");
            await choDongHop(p);
            await p.waitFor(`[...document.querySelectorAll('.hh-tl-cs h3')].some((x) => x.textContent.includes(${JSON.stringify(TEN_CS)}))`, "chính sách mới có trong danh sách");
            // áp dụng cho loại còn mức riêng
            assert.equal(await p.ev(`(() => { const a = [...document.querySelectorAll('.hh-tl-cs')].find((x) => x.querySelector('h3').textContent.includes(${JSON.stringify(TEN_CS)})); const b = [...a.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Áp dụng cho loại…'); if (!b) return false; b.click(); return true; })()`), true, "nút «Áp dụng cho loại…»");
            await choHop(p, "#hh-adcs-loai");
            await p.ev(`(() => { const s = document.getElementById('hh-adcs-loai'); s.value = ${JSON.stringify(L_G.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await bocucSach(p, `bước 6 hộp Áp dụng ${kho}`);
            await chup(p, `11-hop-ap-dung-chinh-sach-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Áp dụng"), true);
            await choDongHop(p);
            await p.waitFor("(() => { const w = document.querySelector('#hh-noi-dung .sheet-warn'); return !!w && !w.hidden; })()", "khung vàng");
            const vang = await p.ev("document.querySelector('#hh-noi-dung .sheet-warn').innerText");
            assert.ok(vang.includes(CAU_THONG_BAO_DONG_RIENG), `khung vàng: ${vang}`);
            assert.ok(vang.includes(L_G.ten), `khung vàng nêu loại còn mức riêng: ${vang}`);
            await bocucSach(p, `bước 6 khung vàng ${kho}`);
            await chup(p, `12-khung-vang-${tenKho}`);
          });

          if (tenKho === "390") {
            await buoc(`9${kho}`, "Hit-test thanh đáy: «＋ Thêm mức» không bị nút Trợ lý che; hộp mở thì nút Trợ lý ẩn", async () => {
              await chuyenThe(p, "ap-dung");
              await p.ev("window.scrollTo(0, 0); true");
              await sleep(500);
              assert.equal(await p.ev("!!document.getElementById('tl-fab')"), true, "có nút Trợ lý (không có thì bước này vô nghĩa)");
              const doHit = () => p.ev(`(() => { const n = document.getElementById('hh-them-muc-day'); const r = n.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                const f = document.getElementById('tl-fab').getBoundingClientRect(); const giao = !(f.right <= r.left || f.left >= r.right || f.bottom <= r.top || f.top >= r.bottom);
                return { dung: e === n || n.contains(e), giao, nut: [r.top, r.bottom, r.left, r.right], fab: [f.top, f.bottom, f.left, f.right], nang: document.getElementById('tl-fab').style.getPropertyValue('--tl-nang'), nutKhac: e ? (e.id || e.className || e.tagName) : null }; })()`);
              let hit = await doHit();
              for (let i = 0; i < 8 && (hit.giao || !hit.dung); i++) { await sleep(500); hit = await doHit(); } // nút Trợ lý được nâng ở khung hình sau (rAF): chờ tối đa 4 giây
              assert.deepEqual({ dung: hit.dung, giao: hit.giao }, { dung: true, giao: false }, `tâm nút «＋ Thêm mức» bị che bởi ${hit.nutKhac} (${JSON.stringify(hit)})`);
              await chup(p, `13-thanh-day-khong-bi-che-${tenKho}`, false);
              assert.equal(await bam(p, "#hh-them-muc-day"), true);
              await choHop(p, "#hh-hop-pham-vi");
              await sleep(400);
              assert.equal(await p.ev("getComputedStyle(document.getElementById('tl-fab')).visibility"), "hidden", "hộp mở ⇒ nút Trợ lý ẩn");
              assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
              await choDongHop(p);
            });
          }

          await buoc(`10${kho}`, "Chuỗi cấm không có trong chữ nhìn thấy (cả hai thẻ, mọi loại mở ra)", async () => {
            for (const the of ["ap-dung", "thiet-lap"]) {
              await chuyenThe(p, the);
              if (the === "ap-dung") {
                await locTatCa(p);
                await p.ev("(() => { for (const n of document.querySelectorAll('.hh-loai-nut')) if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()");
              }
              await bocucSach(p, `bước 10 thẻ ${the} ${kho}`);
            }
            await chup(p, `14-tat-ca-dong-mo-${tenKho}`);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Kế toán ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Quản trị — Danh bạ (ADR-0148: Sửa chính sách riêng của một đại lý) =======================
      {
        const p = await moTrang(ACCOUNTS.admin, `/parties?id=${encodeURIComponent(ORG4.id)}`, vp);
        try {
          await buoc(`12${kho}`, "Danh bạ (Quản trị): chính sách riêng có «Sửa» cạnh «Ngừng áp dụng»; chưa có đơn ⇒ «sẽ thay hẳn»; đổi chính sách + lý do ⇒ lưu, chính sách riêng mới", async () => {
            const SEC = "#hoa-hong-hien-hanh";
            await p.waitFor(`(() => { const s = document.querySelector('${SEC}'); return !!s && !s.hidden && s.innerText.includes('Chính sách riêng'); })()`, "mục Hoa hồng hiện hành");
            assert.deepEqual(await p.ev(`[...document.querySelectorAll('${SEC} .actions button')].map((b) => b.textContent.trim())`), ["Ngừng áp dụng", "Sửa"]);
            assert.equal(await clickTrong(p, SEC, "Sửa"), true);
            await choHop(p, "#hhhh-sua-ly-do");
            assert.equal(await p.ev(`document.querySelector('${SEC} .hint[role=status]').textContent.trim()`), "Chưa có đơn nào dùng chính sách này — sửa sẽ thay hẳn.");
            assert.deepEqual(await p.ev("(() => ({ muc: document.getElementById('hhhh-sua-muc').value, tu: document.getElementById('hhhh-sua-tu').value, den: document.getElementById('hhhh-sua-den').value }))()"),
              { muc: CS_1, tu: HOM_NAY, den: "" }, "điền sẵn chính sách và ngày của chính sách riêng cũ");
            await p.ev(`(() => { const s = document.getElementById('hhhh-sua-muc'); s.value = ${JSON.stringify(CS_2)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await p.ev(setInput("document.getElementById('hhhh-sua-ly-do')", "Chọn nhầm chính sách khi tạo hồ sơ"));
            const m = await p.ev(`(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
              nho: [...document.querySelectorAll('${SEC} input, ${SEC} select')].filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.tagName),
              chu: document.querySelector('${SEC}').innerText }))()`);
            assert.ok(m.sw <= m.iw + 1, `tràn ngang: ${m.sw} > ${m.iw}`);
            assert.deepEqual(m.nho, [], "ô gõ nhỏ hơn 16px");
            assert.ok(!CHU_ANH.test(m.chu), `lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
            await axeKiem(p, `Danh bạ — Sửa chính sách riêng ${kho}`);
            await chup(p, `21-danh-ba-sua-chinh-sach-rieng-${tenKho}`);
            assert.equal(await clickTrong(p, SEC, "Lưu sửa"), true);
            await p.waitFor(`(() => { const e = document.querySelector('${SEC} .alert.ok'); return !!e && e.textContent.trim() === 'Đã sửa chính sách riêng của đại lý này.'; })()`, "câu đã sửa");
            const r = await goiTrongTrang(p, "GET", `/api/pricing/ho-so/${ORG4.id}/hoa-hong`);
            assert.equal(r.json.mucRieng?.muc.code, CS_2, `chính sách riêng mới: ${JSON.stringify(r.json.mucRieng)}`);
            await chup(p, `22-danh-ba-sau-sua-${tenKho}`);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị Danh bạ ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Bán hàng =======================
      {
        const p = await moTrang(ACCOUNTS.salesA, "/hoa-hong", vp);
        try {
          await choTrang(p);
          await buoc(`7${kho}`, "Bán hàng: không một nút ghi nào (cả hai thẻ, cả hộp chạm dòng); Tra nhanh theo tên vẫn chạy", async () => {
            const demNut = async () => p.ev(`(() => {
              const nut = [...document.querySelectorAll('#hh-noi-dung button, #hh-them-muc, #hh-thanh-cuoi button')].filter((b) => b.offsetParent !== null || b.closest('[hidden]') === null).map((b) => b.textContent.trim()).filter((t) => /${NUT_GHI.source}/.test(t));
              const vaiNut = document.querySelectorAll('#hh-noi-dung [role=button]:not([role=tab]), #hh-noi-dung .hh-m-vung').length;
              const an = ['hh-them-muc', 'hh-thanh-cuoi'].map((i) => document.getElementById(i).hidden);
              return { nut, vaiNut, an }; })()`);
            for (const the of ["ap-dung", "thiet-lap"]) {
              await chuyenThe(p, the);
              if (the === "ap-dung") await p.ev("(() => { for (const n of document.querySelectorAll('.hh-loai-nut')) if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()");
              const k = await demNut();
              assert.deepEqual(k, { nut: [], vaiNut: 0, an: [true, true] }, `Bán hàng thấy nút ghi ở thẻ ${the}: ${JSON.stringify(k)}`);
            }
            await chuyenThe(p, "ap-dung");
            const scope = await traNhanh(p, tenKho, { q: `Biển Xanh ${CHU} ${D}`, goiY: `Khách sạn Biển Xanh ${CHU} ${D}` });
            assert.match(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-kq .hh-tn-so")})?.textContent ?? ''`), /\d/, "Tra nhanh theo tên cho ra số");
            await bocucSach(p, `bước 7 ${kho}`);
            await axeKiem(p, `Bán hàng ${kho}`);
            await chup(p, `15-ban-hang-chi-xem-${tenKho}`, tenKho !== "390");
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Đối tác =======================
      {
        const p = await moTrang(PARTNER, "/hoa-hong", vp);
        try {
          await buoc(`8${kho}`, "Tài khoản Đối tác: không xem được trang, câu tiếng Việt", async () => {
            await p.waitFor("(() => { const e = document.getElementById('error'); return !!e && !e.hidden && e.textContent.length > 0; })()", "câu báo lỗi hoặc rời khỏi trang").catch(() => undefined);
            const url = await p.ev("location.pathname");
            if (url === "/hoa-hong") {
              assert.equal(await p.ev("document.getElementById('error').textContent.trim()"), CAU_KHONG_CO_QUYEN_XEM);
              assert.equal(await p.ev("document.getElementById('hh-noi-dung').hidden"), true, "nội dung không hiện");
              await chup(p, `16-doi-tac-khong-quyen-${tenKho}`);
            } else {
              console.log(`    (Đối tác bị cổng trang đưa sang ${url} — không vào được /hoa-hong)`);
              assert.notEqual(url, "/hoa-hong");
            }
          });
        } finally {
          p.close();
        }
      }
      dauTien = false;
    }
  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo HH_DUNG=${DUNG})`); }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
if (axeNhe.length) console.log(`\naxe nhẹ (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nHOA HONG SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nHOA HONG SMOKE OK");
