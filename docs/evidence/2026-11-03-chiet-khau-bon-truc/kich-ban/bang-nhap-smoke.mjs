// Kịch bản Chrome — BẢNG NHẬP hoa hồng theo hàng dịch vụ và cột cấp (ADR-0161 Đ1, Đ2, Đ3; kế hoạch docs/superpowers/plans/2026-11-03-chinh-sach-chiet-khau-bon-truc.md, Task 6 bước 6).
// BẢN ĐẦU: Task 6 viết để thử một lần trước khi commit; Task 9 sẽ nâng thành kịch bản chính thức (và sửa `hoa-hong-smoke.mjs` bám chữ cũ — xem nhật ký thi công).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, KHÔNG --remote, không đụng dữ liệu thật.
// Quy tắc ADR-0074/0075: dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi lúc chỉ một trang mở cho mỗi tài khoản; trong lúc trang mở thì đọc / ghi bằng chính trang (fetch trong trang).
// Dữ liệu dựng: 120 dịch vụ (DV001…DV120, 12 dịch vụ tính theo lượt) cộng 3 dịch vụ mẫu của môi trường, 3 nhóm có dịch vụ (30 mỗi nhóm), 6 cấp. Năm cấp phủ đủ mọi dịch vụ,
// cấp «Đồng» chỉ phủ 2 nhóm ⇒ «Còn thiếu mức» phải ra đúng 63 dịch vụ (30 của nhóm thứ ba + 33 chưa vào nhóm).
// Chạy (sau `npm run build:web`, từ GỐC repo):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-03-chiet-khau-bon-truc/anh node docs/evidence/2026-11-03-chiet-khau-bon-truc/kich-ban/bang-nhap-smoke.mjs
// Cuối: "BANG NHAP SMOKE OK" hoặc danh sách bước đỏ (thoát 1). BN_KHO=390|1040|1440 chạy một khổ (khổ 1440 là khổ duy nhất GHI dữ liệu).
// Chưa có PHÁ THỬ (sửa cố ý → đỏ → hoàn nguyên): việc của Task 9; bản đầu này chưa được coi là hàng rào.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = process.env.AXE_JS ? docAxe() : null;
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-11-03-chiet-khau-bon-truc/anh");
mkdirSync(OUT, { recursive: true });
const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1040", { width: 1040, height: 900, mobile: false }], ["1440", { width: 1440, height: 900, mobile: false }]]
  .filter(([ten]) => !process.env.BN_KHO || process.env.BN_KHO === ten);

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/hoa-hong-hien-thi.ts và web/hoa-hong-*.ts (viết lại có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_PHAN_TRAM_QUA_TRAN = "Phần trăm không quá 50%.";
const CAU_TIEN_SAI_BUOC = "Số tiền phải chia hết cho 1.000đ (không trả thì gõ 0).";
const CAU_GIOI_HAN_DANG_AP = "Giới hạn đang áp: phần trăm không quá 50%; số tiền chia hết cho 1.000đ (không trả thì gõ 0).";
const CAU_DA_THEM = "Đã thêm mức.";

const loi = [];
const anh = [];
const axeNhe = [];
const dongHo = [];
let trangHienTai = null;
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 10).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
    if (trangHienTai) {
      const tt = await trangHienTai.ev("JSON.stringify({ url: location.pathname, hop: document.querySelector('.sheet .sheet-title')?.textContent ?? null, main: (document.querySelector('main')?.innerText ?? '').slice(0, 300) })").catch(() => "?");
      console.log(`    trang lúc đỏ: ${tt}`);
      await trangHienTai.ev("document.querySelector('.sheet-root') && document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true").catch(() => undefined);
    }
  }
}

/** Chụp ảnh. `toanTrang` false khi hộp trượt đang mở (hộp là phần tử cố định). Trang cao hơn 6000 px thì chỉ chụp 6000 px đầu (Chrome treo với ảnh quá lớn). */
async function chup(p, ten, toanTrang = true) {
  await sleep(800);
  const cao = toanTrang ? await p.ev("document.documentElement.scrollHeight") : 0;
  const rong = toanTrang && cao > 6000 ? await p.ev("document.documentElement.clientWidth") : 0;
  const r = await Promise.race([
    p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: toanTrang, ...(rong > 0 ? { clip: { x: 0, y: 0, width: rong, height: 6000, scale: 1 } } : {}) }),
    sleep(30000).then(() => { throw new Error(`chụp ảnh «${ten}» quá 30 giây`); }),
  ]);
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(join(OUT, `${ten}.png`));
}

async function axeKiem(p, nhan) {
  if (AXE === null) { axeNhe.push(`${nhan}: BỎ QUA axe (thiếu AXE_JS)`); return; }
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  await p.ev("document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); true");
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}

/** Không tràn ngang cả trang; ô gõ đang hiện ≥ 16px; vùng chạm của nút trong bảng và hộp ≥ 44px (cùng phép đo với hoa-hong-smoke.mjs). */
async function bocucSach(p, nhan, { ganh = "" } = {}) {
  const m = await p.ev(`(() => {
    const hien = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const nho = [...document.querySelectorAll('main input, main select, main textarea, .sheet input, .sheet select, .sheet textarea')].filter((e) => hien(e) && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const cham = [...document.querySelectorAll('main button, main select, main input:not([type=hidden]):not([type=radio]):not([type=checkbox]), .sheet button, .sheet select, .sheet input:not([type=hidden]):not([type=radio]):not([type=checkbox])')]
      .filter((e) => hien(e) && !e.closest('[hidden]')).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => (x.e.id || x.e.className || x.e.tagName) + '«' + (x.e.textContent || x.e.getAttribute('aria-label') || '').trim().slice(0, 24) + '» ' + Math.round(x.r.width) + '×' + Math.round(x.r.height));
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, cham: cham.slice(0, 8), nCham: cham.length };
  })()`);
  assert.ok(m.sw <= m.iw, `${nhan}: trang tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw})`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.deepEqual(m.cham, [], `${nhan}: ${m.nCham} vùng chạm nhỏ hơn 44px${ganh}`);
}

const PHIM = {
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
};
/** Phím thật qua CDP (JS `dispatchEvent` không dời tiêu điểm khi Tab). */
async function phim(p, ten) {
  const k = PHIM[ten];
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", ...k });
  const { text: _t, ...len } = k;
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", ...len });
  await sleep(150);
}

const GHI_FETCH = `{ window.__ghi = []; const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f0(u, o); const m = (o && o.method) || 'GET'; if (m !== 'GET') window.__ghi.push({ m, u: String(u), s: r.status }); return r; }; }`;

const chuanHoa = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").toLowerCase();

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const T = "'2026-01-01T00:00:00.000Z'";

  // ---- Dựng dữ liệu (bằng API và SQL local TRƯỚC khi mở trang).
  const ma = (i) => `DV${String(i).padStart(3, "0")}`;
  const hang = [];
  for (let i = 1; i <= 120; i++) {
    const luot = i % 10 === 0; // 12 dịch vụ tính theo lượt (nhóm 5 người)
    const gia = 600000 + i * 5000;
    hang.push(`('${ma(i)}','Tour thử ${String(i).padStart(3, "0")}','${luot ? "per5Pax" : "perPax"}',${gia},${luot ? "NULL" : gia - 200000},${luot ? "NULL" : gia - 100000},${luot ? "NULL" : 0},${i + 10},1,${T},${T})`);
  }
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${hang.join(",")}`);
  // Ba nhóm đầu của danh sách nhóm đã gieo sẵn (migration 0055). `GET /api/catalog` chỉ trả nhóm có dịch vụ nên số hàng nhóm của bảng = 3 sau khi gán.
  const nhomGieo = phai(await call(ACCOUNTS.admin, "GET", "/api/catalog/groups"), 200, "danh sách nhóm").groups.filter((g) => g.active !== false);
  assert.ok(nhomGieo.length >= 3, `cần ≥ 3 nhóm dịch vụ đã gieo, có ${nhomGieo.length}`);
  const [G1, G2, G3] = nhomGieo.slice(0, 3).map((g) => g.code);
  for (const [g, tu, den] of [[G1, 1, 30], [G2, 31, 60], [G3, 61, 90]]) {
    phai(await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes: Array.from({ length: den - tu + 1 }, (_, k) => ma(tu + k)), groupCode: g }), 200, `gán nhóm ${g}`);
  }
  const DM = phai(await call(ACCOUNTS.accounting, "GET", "/api/catalog"), 200, "danh mục sau gán");
  const SO_DV = DM.items.length;
  const SO_NHOM = DM.groups.length;
  const SO_HANG = 1 + SO_NHOM + SO_DV;
  assert.equal(SO_DV, 123, "120 dịch vụ mới + 3 dịch vụ mẫu của môi trường");

  const capMoi = async (ten) => phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten }), 201, `cấp ${ten}`).muc.code;
  const dongCap = async (cap, than) => phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${cap}/dong`, { tuNgay: "2026-01-01", ...than }), 201, `dòng của cấp`);
  const TEN_CAP = ["Kim cương", "Vàng", "Bạc", "Đồng", "Sắt", "Gỗ"];
  const CAP = {};
  for (const t of TEN_CAP) CAP[t] = await capMoi(t);
  await dongCap(CAP["Kim cương"], { phamVi: "ALL", kieu: "RATE", tyLeBp: 1200 });
  for (const i of [1, 2, 3]) await dongCap(CAP["Kim cương"], { phamVi: "SERVICE", catalogCode: ma(i), kieu: "PER_PAX", moiKhach: 50000 });
  await dongCap(CAP["Kim cương"], { phamVi: "SERVICE", catalogCode: ma(4), kieu: "PER_PAX", moiKhach: 60000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 40000 } });
  await dongCap(CAP["Vàng"], { phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  await dongCap(CAP["Bạc"], { phamVi: "ALL", kieu: "RATE", tyLeBp: 800 });
  await dongCap(CAP["Đồng"], { phamVi: "GROUP", groupCode: G1, kieu: "RATE", tyLeBp: 700 });
  await dongCap(CAP["Đồng"], { phamVi: "GROUP", groupCode: G2, kieu: "RATE", tyLeBp: 700 });
  await dongCap(CAP["Sắt"], { phamVi: "ALL", kieu: "RATE", tyLeBp: 600 });
  await dongCap(CAP["Gỗ"], { phamVi: "ALL", kieu: "RATE", tyLeBp: 500 });
  const SO_COT = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/muc-ta"), 200, "danh sách cấp").muc.length;
  assert.ok(SO_COT >= 6);
  const THIEU_DUNG = 63; // 30 dịch vụ nhóm thứ ba + 30 (DV091…DV120) + 3 dịch vụ mẫu chưa vào nhóm

  /** Mở trang Hoa hồng với phiên của `account`; trả trang. Đo thời gian từ lúc ra lệnh điều hướng tới lúc bảng có đủ hàng. */
  const moTrang = async (account, vp, { cho = SO_HANG } = {}) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.confirm = () => true; window.alert = () => {}; ${GHI_FETCH}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    const t0 = Date.now();
    await p.send("Page.navigate", { url: `${env.base}/hoa-hong` });
    let tPage = null;
    const het = Date.now() + 30000;
    for (;;) {
      const r = await p.ev(`(() => document.querySelectorAll('.hh-ma-tran tbody tr').length >= ${cho} ? performance.now() : null)()`).catch(() => null);
      if (r !== null) { tPage = r; break; }
      if (Date.now() > het) throw new Error(`bảng không đủ ${cho} hàng sau 30 giây`);
      await sleep(15);
    }
    p.moMs = { tuLenh: Date.now() - t0, tuDieuHuong: Math.round(tPage) };
    return p;
  };
  const sodong = (p) => p.ev("document.querySelectorAll('.hh-ma-tran tbody tr').length");
  const bam = (p, sel) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const choHop = (p) => p.waitFor("!!document.querySelector('.sheet')", "hộp mở");
  const choDongHop = (p) => p.waitFor("!document.querySelector('.sheet')", "hộp đóng");
  const bamNutHop = (p, chu) => p.ev(`(() => { const b = [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)}); if (!b) return false; b.click(); return true; })()`);
  const khoa = (cap, dv) => `${CAP[cap]}|SERVICE|${dv}`;
  const oNut = (k) => `button[data-o="${k}"]`;
  const goi = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  const tongDong = async (p) => (await goi(p, "GET", "/api/pricing/muc-ta")).json.muc.reduce((n, m) => n + m.dong.length, 0);
  const dongCua = async (p, cap, dv) => (await goi(p, "GET", "/api/pricing/muc-ta")).json.muc.find((m) => m.code === CAP[cap]).dong.filter((r) => r.phamVi === "SERVICE" && r.catalogCode === dv);
  /** Nhập phần trăm vào ô trống `k` qua hộp; chờ hộp đóng và nút ô đổi sang nút việc. */
  const nhapPhanTram = async (p, k, tyLe, { choO = true } = {}) => {
    assert.equal(await bam(p, oNut(k)), true, `ô ${k} có nút`);
    await choHop(p);
    await p.ev(setInput("document.getElementById('hh-hop-ty-le')", tyLe));
    assert.equal(await bamNutHop(p, "Thêm mức"), true, "nút «Thêm mức» của hộp");
    await choDongHop(p);
    // `choO` false: hàng có thể biến khỏi bảng sau khi ghi (bộ lọc «Còn thiếu mức» đang bật) nên không chờ ô.
    if (choO) await p.waitFor(`(() => { const b = document.querySelector(${JSON.stringify(oNut(k))}); return !!b && !b.classList.contains('hh-o-them'); })()`, `ô ${k} đã có mức`);
  };
  /** Bỏ mọi bộ lọc của bảng (ô tìm, nhóm, «Còn thiếu mức») để bước sau bắt đầu từ bảng đủ hàng. */
  const datLaiLoc = async (p) => {
    await p.ev(setInput("document.getElementById('hh-mt-tim')", ""));
    await p.ev(setInput("document.getElementById('hh-mt-nhom')", ""));
    await p.ev("(() => { const c = document.getElementById('hh-mt-thieu'); if (c.checked) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } return true; })()");
    await p.waitFor(`document.querySelectorAll('.hh-ma-tran tbody tr').length === ${SO_HANG}`, "bảng đủ hàng sau khi bỏ lọc");
  };

  for (const [tenKho, vp] of KHO) {
    const nhanKho = `[${tenKho}]`;
    let p = null;
    try {
      // ================= Mở trang, đủ hàng, đủ giá, thời gian mở =================
      await buoc(`A${tenKho}`, `${nhanKho} mở bảng: đủ ${SO_HANG} hàng, giá bán lẻ, cột cấp; không tràn ngang`, async () => {
        p = await moTrang(ACCOUNTS.accounting, vp);
        dongHo.push(`${tenKho}: mở bảng ${p.moMs.tuDieuHuong} ms kể từ lúc điều hướng (${p.moMs.tuLenh} ms đo từ phía kịch bản)`);
        assert.equal(await sodong(p), SO_HANG, "số hàng của bảng");
        const ct = await p.ev(`(() => {
          const bang = document.querySelector('.hh-ma-tran');
          const dau = [...bang.querySelectorAll('thead th')].map((t) => t.textContent.trim());
          const hangDv = [...bang.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('th')?.textContent.includes('Tour thử 001'));
          const hangLuot = [...bang.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('th')?.textContent.includes('Tour thử 010'));
          return { dau, giaDv: hangDv?.children[1].innerText ?? null, giaLuot: hangLuot?.children[1].innerText ?? null, nhom: [...bang.querySelectorAll('tbody tr[data-pham-vi=GROUP]')].length, tatCa: bang.querySelectorAll('tbody tr[data-pham-vi=ALL]').length, hien: getComputedStyle(bang.closest('.hh-ma-tran-vung')).display };
        })()`);
        assert.equal(ct.dau.length, SO_COT + 2, `đầu cột: ${ct.dau.join(" | ")}`);
        assert.equal(ct.dau[0], "Dịch vụ");
        assert.equal(ct.dau[1], "Giá bán lẻ");
        for (const t of TEN_CAP) assert.ok(ct.dau.some((x) => x.startsWith(t)), `thiếu cột cấp ${t}`);
        assert.equal(ct.tatCa, 1, "một hàng «Mọi dịch vụ»");
        assert.equal(ct.nhom, SO_NHOM, "mọi hàng nhóm có mặt");
        assert.match(ct.giaDv, /Người lớn 605\.000đ/, `giá DV001: ${ct.giaDv}`);
        assert.match(ct.giaDv, /Trẻ em 405\.000đ/);
        assert.match(ct.giaDv, /Người cao tuổi 505\.000đ/);
        assert.match(ct.giaLuot, /650\.000đ\/lượt/, `giá DV010 theo lượt: ${ct.giaLuot}`);
        if (tenKho === "390") assert.equal(ct.hien === "none" || (await p.ev("document.querySelector('.hh-ma-tran').offsetParent === null")), true, "khổ 390: bảng nhập ẩn, dùng dải chọn cấp");
        await bocucSach(p, nhanKho);
        await chup(p, `bang-nhap-${tenKho}`);
        await axeKiem(p, `${nhanKho} bảng nhập`);
      });
      if (p === null) continue;

      // ================= 390: danh sách theo cấp, hộp có Tính bằng / Áp cho =================
      if (tenKho === "390") {
        await buoc("B390", "[390] dải chọn cấp hiện, ô trống không có trong chữ nhìn thấy; hộp «＋ Thêm hoa hồng cho dịch vụ» có Tính bằng, Áp cho, giới hạn", async () => {
          // `innerText` của phần tử bị `display: none` trả cả chữ ẩn, nên đếm phần tử THẤY ĐƯỢC (offsetParent) thay vì đọc chữ.
          const r = await p.ev(`(() => ({ chip: [...document.querySelectorAll('.hh-cap-chon [data-chon-cap]')].filter((e) => e.offsetParent !== null).length, thayTrongBang: [...document.querySelectorAll('.hh-ma-tran-vung *')].filter((e) => e.offsetParent !== null).length }))()`);
          assert.equal(r.chip, SO_COT, "dải chọn cấp");
          assert.equal(r.thayTrongBang, 0, "vùng bảng nhập (kể cả câu ô «—») không có phần tử nào thấy được ở khổ hẹp");
          assert.equal(await p.ev(`(() => { const b = [...document.querySelectorAll('#hh-cap-ct button')].find((x) => x.textContent.trim() === '＋ Thêm hoa hồng cho dịch vụ'); if (!b) return false; b.click(); return true; })()`), true);
          await choHop(p);
          const hop = await p.ev(`(() => { const s = document.querySelector('.sheet'); return { t: s.innerText, kieu: s.querySelector('#hh-hop-kieu')?.selectedOptions[0].textContent, apCho: s.querySelector('#hh-hop-ap-cho')?.selectedOptions[0].textContent, apChoKhoa: s.querySelector('#hh-hop-ap-cho')?.disabled }; })()`);
          assert.equal(hop.kieu, "Phần trăm");
          assert.equal(hop.apCho, "Mọi khách như nhau");
          assert.equal(hop.apChoKhoa, true, "Phần trăm khoá «Áp cho»");
          assert.ok(hop.t.includes("Tính bằng") && hop.t.includes("Áp cho"), "nhãn Tính bằng, Áp cho");
          assert.ok(!hop.t.includes("Cách tính"), "chữ cũ «Cách tính» đã bỏ");
          assert.ok(hop.t.includes(CAU_GIOI_HAN_DANG_AP), `câu giới hạn: ${hop.t.slice(0, 400)}`);
          await p.ev(setInput("document.getElementById('hh-hop-kieu')", "PER_PAX"));
          await p.waitFor("document.getElementById('hh-hop-ap-cho').disabled === false", "Áp cho mở khi Số tiền");
          await p.ev(setInput("document.getElementById('hh-hop-ap-cho')", "LOAI"));
          await p.waitFor("!!document.getElementById('hh-hop-tre-em') && document.getElementById('hh-hop-tre-em').offsetParent !== null", "hai ô theo loại hiện");
          await bocucSach(p, `${nhanKho} hộp`);
          await chup(p, "bang-nhap-390-hop", false);
          await axeKiem(p, `${nhanKho} hộp`);
          await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
          await choDongHop(p);
        });
      }

      // ================= 1040: báo sớm giới hạn, lỗi máy chủ giữ hộp mở =================
      if (tenKho === "1040") {
        await buoc("B1040", "[1040] hộp ở ô trống: hàng cố định, xem trước giá đại lý, báo sớm phần trăm và bước 1.000đ (không gửi), mức vượt giá bị máy chủ từ chối và hộp giữ mở", async () => {
          const k = khoa("Đồng", "DV100");
          assert.equal(await bam(p, oNut(k)), true);
          await choHop(p);
          const t0 = await p.ev("document.querySelector('.sheet').innerText");
          assert.ok(t0.includes("Cấp Đồng"), "đích là cấp Đồng");
          assert.ok(t0.includes("Dịch vụ Tour thử 100"), "hàng cố định là dịch vụ DV100");
          assert.equal(await p.ev("!!document.querySelector('.sheet #hh-hop-pham-vi')"), false, "hàng đã điền sẵn: không còn ô chọn dịch vụ");
          assert.ok(!t0.includes("Vai người dùng"), "hộp của cấp không hỏi vai");
          // xem trước giá đại lý
          await p.ev(setInput("document.getElementById('hh-hop-ty-le')", "10"));
          const xt = await p.ev("document.querySelector('.sheet').innerText");
          assert.match(xt, /Giá đại lý/, `xem trước giá đại lý: ${xt.slice(0, 600)}`);
          // phần trăm quá trần: báo sớm, không gửi
          await p.ev("window.__ghi.length = 0; true");
          await p.ev(setInput("document.getElementById('hh-hop-ty-le')", "60"));
          assert.equal(await bamNutHop(p, "Thêm mức"), true);
          await p.waitFor(`document.querySelector('.sheet').innerText.includes(${JSON.stringify(CAU_PHAN_TRAM_QUA_TRAN)})`, "câu báo sớm phần trăm");
          assert.equal(await p.ev("window.__ghi.length"), 0, "báo sớm: không gọi máy chủ");
          // số tiền sai bước
          await p.ev(setInput("document.getElementById('hh-hop-kieu')", "PER_PAX"));
          await p.ev(setInput("document.getElementById('hh-hop-moi-khach')", "123456"));
          assert.equal(await bamNutHop(p, "Thêm mức"), true);
          await p.waitFor(`document.querySelector('.sheet').innerText.includes(${JSON.stringify(CAU_TIEN_SAI_BUOC)})`, "câu báo sớm bước tiền");
          assert.equal(await p.ev("window.__ghi.length"), 0, "báo sớm: không gọi máy chủ");
          // số tiền đúng bước nhưng vượt giá bán: máy chủ từ chối, hộp giữ mở với đúng câu của máy chủ
          await p.ev(setInput("document.getElementById('hh-hop-moi-khach')", "5000000"));
          assert.equal(await bamNutHop(p, "Thêm mức"), true);
          await p.waitFor("window.__ghi.length === 1", "đã gọi máy chủ một lần");
          await p.waitFor(`document.querySelector('.sheet').innerText.includes('lớn hơn giá bán')`, "câu vượt giá của máy chủ");
          assert.equal(await p.ev("window.__ghi[0].s"), 400, "máy chủ từ chối 400");
          assert.equal(await p.ev("!!document.querySelector('.sheet')"), true, "hộp giữ mở khi lỗi");
          assert.equal((await dongCua(p, "Đồng", "DV100")).length, 0, "không có dòng nào được tạo");
          await bocucSach(p, `${nhanKho} hộp`);
          await chup(p, "bang-nhap-1040-hop", false);
          await axeKiem(p, `${nhanKho} hộp`);
          await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
          await choDongHop(p);
        });
      }

      // ================= 1440: GHI — một ô, ba ô liên tiếp, bộ lọc, bàn phím, dính đầu cột =================
      if (tenKho === "1440") {
        await buoc("C1", "[1440] thời gian mở lặp lại (tải lại hai lần nữa)", async () => {
          for (let i = 0; i < 2; i++) {
            await p.send("Page.reload", {});
            const t0 = Date.now();
            await p.waitFor(`document.querySelectorAll('.hh-ma-tran tbody tr').length >= ${SO_HANG}`, "bảng đủ hàng sau tải lại", 30000);
            dongHo.push(`1440: tải lại lần ${i + 1}: đủ hàng sau ${Date.now() - t0} ms (đo từ phía kịch bản, gồm vòng hỏi 100 ms)`);
          }
        });

        await buoc("C2", "[1440] bấm ô trống tạo ĐÚNG MỘT dòng, đúng cấp và đúng phạm vi", async () => {
          const truoc = await tongDong(p);
          await nhapPhanTram(p, khoa("Vàng", "DV100"), "5");
          const dong = await dongCua(p, "Vàng", "DV100");
          assert.equal(dong.length, 1, "đúng một dòng ở cấp Vàng cho DV100");
          assert.equal(dong[0].kieu, "RATE");
          assert.equal(dong[0].tyLeBp, 500);
          assert.equal(dong[0].phamVi, "SERVICE");
          assert.equal(await tongDong(p), truoc + 1, "tổng số dòng tăng đúng 1");
          assert.equal(await p.ev("window.__ghi.filter((g) => g.m === 'POST').length"), 1, "đúng một POST");
          for (const c of ["Kim cương", "Bạc", "Đồng", "Sắt", "Gỗ"]) assert.equal((await dongCua(p, c, "DV100")).length, 0, `cấp ${c} không bị chạm`);
          const chu = await p.ev(`document.querySelector(${JSON.stringify(oNut(khoa("Vàng", "DV100")))}).innerText.trim()`);
          assert.equal(chu, "5%", "ô hiện số mới");
        });

        await buoc("C3", "[1440] nhập liên tiếp ba ô ở cuối bảng: giữ cuộn trang, cuộn khung, ô vừa nhập hiện số mới, tiêu điểm về ô vừa nhập", async () => {
          await p.ev("(() => { const k = document.querySelector('.hh-ma-tran-khung'); k.scrollTop = k.scrollHeight; window.scrollTo(0, 120); return true; })()");
          await sleep(300);
          const ban = await p.ev("(() => { const k = document.querySelector('.hh-ma-tran-khung'); return { khung: Math.round(k.scrollTop), trang: Math.round(scrollY), cuonDuoc: k.scrollHeight > k.clientHeight }; })()");
          assert.ok(ban.cuonDuoc, "khung cuộn được (bảng dài hơn khung)");
          assert.ok(ban.khung > 500, `khung đã cuộn xuống cuối (${ban.khung})`);
          for (const [dv, so, hien] of [["DV118", "5", "5%"], ["DV119", "6", "6%"], ["DV120", "7,5", "7,5%"]]) {
            const k = khoa("Bạc", dv);
            await p.ev(`document.querySelector(${JSON.stringify(oNut(k))}).scrollIntoView({ block: 'nearest' }); true`);
            const truoc = await p.ev("(() => { const k = document.querySelector('.hh-ma-tran-khung'); return { khung: Math.round(k.scrollTop), trang: Math.round(scrollY) }; })()");
            await nhapPhanTram(p, k, so);
            await sleep(250);
            const sau = await p.ev(`(() => { const kh = document.querySelector('.hh-ma-tran-khung'); const b = document.querySelector(${JSON.stringify(oNut(k))}); return { khung: Math.round(kh.scrollTop), trang: Math.round(scrollY), chu: b?.innerText.trim() ?? null, tieuDiem: document.activeElement?.dataset?.o ?? null }; })()`);
            assert.ok(Math.abs(sau.khung - truoc.khung) <= 2, `${dv}: cuộn khung lệch ${truoc.khung} → ${sau.khung}`);
            assert.ok(Math.abs(sau.trang - truoc.trang) <= 2, `${dv}: cuộn trang lệch ${truoc.trang} → ${sau.trang}`);
            assert.equal(sau.chu, hien, `${dv}: ô hiện số mới`);
            assert.equal(sau.tieuDiem, k, `${dv}: tiêu điểm về ô vừa nhập`);
          }
        });

        await buoc("C4", "[1440] bộ lọc sống qua lần ghi: tìm «thu 05» (10 hàng), «Còn thiếu mức» (63; với «thu» 60 → 59 sau khi nhập một ô), nhóm", async () => {
          await p.ev("window.scrollTo(0, 0); document.querySelector('.hh-ma-tran-khung').scrollTop = 0; true");
          // tìm theo chữ không dấu
          await p.ev(setInput("document.getElementById('hh-mt-tim')", "thu 05"));
          const dem = await p.ev("document.querySelectorAll('.hh-ma-tran tbody tr').length");
          const mong = DM.items.filter((i) => chuanHoa(`${i.name} ${i.code}`).includes("thu 05")).length;
          assert.equal(dem, mong, "số hàng khớp «thu 05»");
          assert.equal(mong, 10);
          assert.ok((await p.ev("document.querySelector('.hh-ma-tran-bang [role=status]').textContent")).includes(`Hiện 10 trong ${SO_HANG} hàng.`), "dòng đếm");
          await p.ev(setInput("document.getElementById('hh-mt-tim')", ""));
          // nhóm: hàng nhóm + 30 dịch vụ của nó
          await p.ev(setInput("document.getElementById('hh-mt-nhom')", G1));
          assert.equal(await sodong(p), 31, "nhóm thứ nhất: hàng nhóm + 30 dịch vụ");
          await p.ev(setInput("document.getElementById('hh-mt-nhom')", ""));
          // còn thiếu mức
          await p.ev("(() => { const c = document.getElementById('hh-mt-thieu'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
          assert.equal(await sodong(p), THIEU_DUNG, "Còn thiếu mức: đúng 63 dịch vụ");
          // gõ «thu» (khớp 120 dịch vụ DVxxx, không khớp 3 dịch vụ mẫu) ⇒ còn thiếu = 60; nhập một ô của cấp Đồng ở DV100 ⇒ 59, hai bộ lọc vẫn bật
          await p.ev(setInput("document.getElementById('hh-mt-tim')", "thu"));
          assert.equal(await sodong(p), THIEU_DUNG - 3, "«thu» + Còn thiếu mức: 60 dịch vụ");
          await nhapPhanTram(p, khoa("Đồng", "DV100"), "4", { choO: false });
          await p.waitFor(`document.querySelectorAll('.hh-ma-tran tbody tr').length === ${THIEU_DUNG - 4}`, "DV100 rời khỏi danh sách còn thiếu");
          const sau = await p.ev("({ tim: document.getElementById('hh-mt-tim').value, thieu: document.getElementById('hh-mt-thieu').checked, hang: document.querySelectorAll('.hh-ma-tran tbody tr').length, trangThai: document.querySelector('.hh-ma-tran-bang [role=status]').textContent })");
          assert.equal(sau.tim, "thu", "ô tìm giữ chữ");
          assert.equal(sau.thieu, true, "«Còn thiếu mức» giữ bật");
          assert.equal(sau.hang, THIEU_DUNG - 4, `DV100 đã đủ mức ở cấp Đồng ⇒ ${THIEU_DUNG - 4} dịch vụ còn thiếu (có ${sau.hang})`);
          await datLaiLoc(p);
        });

        await buoc("C5", "[1440] ô đã có mức mở «Đổi», «Sửa», «Ngừng»; đầu bảng và cột Dịch vụ dính khi cuộn", async () => {
          await datLaiLoc(p);
          const k = khoa("Kim cương", "DV001");
          assert.equal(await bam(p, oNut(k)), true);
          await choHop(p);
          const viec = await p.ev("[...document.querySelectorAll('.sheet .hh-viec-nut')].map((b) => b.textContent.trim())");
          assert.deepEqual(viec, ["Đổi", "Sửa", "Ngừng"], `việc của ô đã có mức: ${viec.join(" | ")}`);
          await chup(p, "bang-nhap-1440-viec", false);
          await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
          await choDongHop(p);
          const dinh = await p.ev(`(() => {
            const kh = document.querySelector('.hh-ma-tran-khung'); kh.scrollTop = 300; kh.scrollLeft = 150;
            const r0 = kh.getBoundingClientRect(); const th = kh.querySelector('thead th:nth-child(3)').getBoundingClientRect(); const c1 = kh.querySelector('tbody th[scope=row]').getBoundingClientRect();
            return { rongKhung: kh.scrollWidth > kh.clientWidth, dauTren: Math.round(th.top - r0.top), cotTrai: Math.round(c1.left - r0.left) };
          })()`);
          await sleep(150);
          assert.ok(dinh.dauTren <= 1, `đầu cột dính ở mép trên khung (lệch ${dinh.dauTren})`);
          if (dinh.rongKhung) assert.ok(dinh.cotTrai <= 1, `cột Dịch vụ dính ở mép trái khung (lệch ${dinh.cotTrai})`);
          await p.ev("(() => { const kh = document.querySelector('.hh-ma-tran-khung'); kh.scrollTop = 0; kh.scrollLeft = 0; return true; })()");
        });

        await buoc("C6", "[1440] bàn phím: Tab tới ô trống, Enter mở hộp, Esc đóng và tiêu điểm về đúng ô", async () => {
          await datLaiLoc(p);
          const k = khoa("Sắt", "DV050");
          await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(oNut(k))}); b.scrollIntoView({ block: 'center' }); b.focus(); return true; })()`);
          assert.equal(await p.ev("document.activeElement.dataset.o"), k);
          await phim(p, "Enter");
          await choHop(p);
          await phim(p, "Escape");
          await choDongHop(p);
          const sau = await p.ev("document.activeElement?.dataset?.o ?? document.activeElement?.tagName");
          assert.equal(sau, k, `sau Esc tiêu điểm phải về ô vừa mở (đang ở ${sau})`);
        });

        await buoc("C7", "[1440] ảnh có hộp mở ở ô trống + axe + vùng chạm", async () => {
          await datLaiLoc(p);
          const k = khoa("Gỗ", "DV060");
          assert.equal(await bam(p, oNut(k)), true);
          await choHop(p);
          await p.ev(setInput("document.getElementById('hh-hop-kieu')", "PER_PAX"));
          await p.ev(setInput("document.getElementById('hh-hop-moi-khach')", "50000"));
          await bocucSach(p, "[1440] hộp");
          await chup(p, "bang-nhap-1440-hop", false);
          await axeKiem(p, "[1440] hộp");
          await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
          await choDongHop(p);
          await bocucSach(p, "[1440] bảng sau khi ghi");
        });
      }
    } finally {
      if (p) { p.close(); trangHienTai = null; }
    }
  }

  // ---- Người chỉ xem (Bán hàng): bảng hiện, không có nút ghi.
  if (!process.env.BN_KHO || process.env.BN_KHO === "1440") {
    await buoc("D", "[1440] Bán hàng: bảng nhập hiện (nếu có quyền xem) và KHÔNG có nút ghi", async () => {
      const p = await moTrang(ACCOUNTS.salesA, { width: 1440, height: 900, mobile: false }, { cho: 1 }).catch(() => null);
      try {
        if (p === null) { axeNhe.push("D: Bán hàng không mở được bảng (không có quyền xem trang) — hợp lệ, không phải lỗi"); return; }
        const r = await p.ev("({ nut: document.querySelectorAll('.hh-ma-tran button.hh-o-nut').length, hang: document.querySelectorAll('.hh-ma-tran tbody tr').length })");
        assert.equal(r.nut, 0, "Bán hàng không có nút ghi trong bảng");
      } finally { p?.close(); trangHienTai = null; }
    });
  }

  console.log("\n--- Thời gian mở bảng ---\n" + dongHo.join("\n"));
  console.log("\n--- Ảnh đã chụp ---\n" + anh.join("\n"));
  if (axeNhe.length) console.log("\n--- Ghi chú axe / vùng chạm (không đỏ) ---\n" + axeNhe.join("\n"));
  if (loi.length) {
    console.log("\nBƯỚC ĐỎ:\n" + loi.join("\n"));
    process.exitCode = 1;
  } else console.log("\nBANG NHAP SMOKE OK");
} finally {
  await env.stop();
}
