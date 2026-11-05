// Kịch bản Chrome — màn «Hạn mức trả sau» và nhãn Trả sau ở chi tiết đơn (ADR-0168; kế hoạch docs/superpowers/plans/2026-11-05-tra-sau-han-muc-ke-hoach.md, Task 6).
// Toàn quyền: bảng + cảnh báo «nợ vượt hạn mức hiện hành» + «Xem đơn nợ» + «Đặt hạn mức» (biểu mẫu thật) ở 1440 và 390; Kế toán: thấy dòng, KHÔNG có nút ghi; Bán hàng: bị chặn; chi tiết đơn Trả sau có nhãn hình thức + hạn trả.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, KHÔNG --remote.
// Quy tắc ADR-0074/0075: đăng nhập MỚI của cùng tài khoản đá phiên trang đang mở ⇒ mọi lời gọi API gieo dữ liệu làm TRƯỚC khi mở trang của tài khoản đó.
// Chạy (sau `npm run build:web`, từ GỐC repo):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-05-tra-sau/anh node docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs
// Cuối: "TRA SAU SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = process.env.AXE_JS ? docAxe() : null;
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-11-05-tra-sau/anh");
mkdirSync(OUT, { recursive: true });
const KHO_1440 = { width: 1440, height: 900, mobile: false };
const KHO_390 = { width: 390, height: 844, mobile: true };

// Chữ khớp NGUYÊN VĂN với web/hoa-hong-gioi-han.ts và src/shared/hoa-hong-hien-thi.ts.
const CAU_AP_CHO = "Số mới áp cho các mức nhập từ lúc này; mức đã có và đơn đã xác nhận giữ nguyên.";
const CAU_CHI_TOAN_QUYEN = "Trang này chỉ Toàn quyền dùng được.";
const CAU_PHAN_TRAM_SAI = "Phần trăm tối đa là số lớn hơn 0 và không quá 100 (vd 50 hoặc 12,5).";
const CAU_BUOC_SAI = "Số tiền phải chia hết cho là số nguyên đồng từ 1 đến 1.000.000 (vd 1.000).";
const CAU_409 = "Giới hạn vừa được người khác đổi — tải lại rồi thử lại.";
const dangAp = (pt, buoc) => `Giới hạn đang áp: phần trăm không quá ${pt}; số tiền chia hết cho ${buoc}đ (không trả thì gõ 0).`;

const loi = [];
const anh = [];
const axeNhe = [];
let trangHienTai = null;
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 10).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
    if (trangHienTai) console.log(`    trang lúc đỏ: ${await trangHienTai.ev("JSON.stringify({ url: location.pathname, main: (document.querySelector('main')?.innerText ?? '').slice(0, 300), loiLuu: document.getElementById('save-error')?.textContent ?? '' })").catch(() => "?")}`);
  }
}
async function chup(p, ten) {
  await sleep(700);
  const r = await Promise.race([p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }), sleep(30000).then(() => { throw new Error(`chụp ảnh «${ten}» quá 30 giây`); })]);
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
/** Không tràn ngang, ô gõ ≥ 16px, vùng chạm của nút và ô trong `main` ≥ 44px. */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const hien = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const nho = [...document.querySelectorAll('main input, main select, main textarea')].filter((e) => hien(e) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const cham = [...document.querySelectorAll('main button, main input:not([type=hidden])')].filter((e) => hien(e)).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => (x.e.id || x.e.className || x.e.tagName) + ' ' + Math.round(x.r.width) + '×' + Math.round(x.r.height));
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, cham };
  })()`);
  assert.ok(m.sw <= m.iw, `${nhan}: trang tràn ngang (${m.sw} > ${m.iw})`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.deepEqual(m.cham, [], `${nhan}: vùng chạm nhỏ hơn 44px`);
}

const GHI_FETCH = `{ window.__ghi = []; const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f0(u, o); const m = (o && o.method) || 'GET'; if (m !== 'GET') window.__ghi.push({ m, u: String(u), s: r.status }); return r; }; }`;


const CAU_CHI_KE_TOAN = "Trang này chỉ Kế toán và Toàn quyền dùng được.";
const env = await startEnv();
try {
  const { call } = goiApi(env);
  // ---- Gieo dữ liệu bằng API (TRƯỚC khi mở trang): hồ sơ đối tác, hạn mức 5.000.000, một đơn Trả sau 1.350.000, rồi hạ hạn mức còn 1.000.000 ⇒ nợ vượt hạn mức.
  const TEN = "Đại Lý Trả Sau Thử";
  let r = await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912000111" }] });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const BEN = r.json.party.id;
  r = await call(ACCOUNTS.admin, "POST", `/api/parties/${BEN}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  r = await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: 5_000_000, soNgay: 7 });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Thử", customerPhone: "0901234567", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", bookerPartyId: BEN, paymentTerm: "CREDIT",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const DON = r.json.order;
  r = await call(ACCOUNTS.salesA, "POST", `/api/orders/${DON.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: 1_000_000, soNgay: 7 });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  // Hồ sơ thứ hai chưa có hạn mức: dùng để thử biểu mẫu «Đặt hạn mức».
  r = await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "PERSON", fullName: "Công Ty Mới Thử", contacts: [{ kind: "PHONE", value: "0912000222" }] });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const BEN2 = r.json.party.id;
  r = await call(ACCOUNTS.admin, "POST", `/api/parties/${BEN2}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const moTrang = async (account, vp, duong = "/han-muc-tra-sau") => {
    const p = await env.openPage(vp);
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.confirm = () => true; window.alert = () => {}; ${GHI_FETCH}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: `${env.base}${duong}` });
    await p.waitFor("document.readyState === 'complete'", "trang tải xong");
    return p;
  };
  const choBang = (p) => p.waitFor("!document.getElementById('hm-khung').hidden && document.querySelectorAll('#hm-bang tr').length > 0", "bảng hạn mức hiện");
  const chuMain = (p) => p.ev("document.querySelector('main').innerText");
  const nutCoChu = (p, chu) => p.ev(`[...document.querySelectorAll('main button')].some((b) => b.textContent.trim() === ${JSON.stringify(chu)})`);

  // ---------------- Toàn quyền, 1440 ----------------
  let p = await moTrang(ACCOUNTS.chu, KHO_1440);
  await buoc("T1", "[1440] Toàn quyền thấy dòng đối tác, cảnh báo nợ vượt hạn mức, ba nút; không tràn ngang; axe", async () => {
    await choBang(p);
    const t = await chuMain(p);
    assert.ok(t.includes(TEN) && t.includes("1.000.000 ₫ · 7 ngày"), "dòng hạn mức");
    assert.ok(t.includes("Đang nợ 1.350.000 ₫, vượt hạn mức hiện hành 1.000.000 ₫."), `cảnh báo vượt: ${t.slice(0, 400)}`);
    for (const nhan of ["Xem đơn nợ", "Đặt hạn mức", "Ngừng hạn mức"]) assert.equal(await nutCoChu(p, nhan), true, nhan);
    assert.equal(await p.ev("!!document.querySelector('a[href=\"/han-muc-tra-sau\"]')"), true, "mục ở thanh bên");
    await bocucSach(p, "[1440]");
    await chup(p, "han-muc-1440");
    await axeKiem(p, "[1440]");
  });
  await buoc("T2", "[1440] «Xem đơn nợ» mở danh sách đơn còn nợ có mã đơn và số nợ", async () => {
    await p.ev("[...document.querySelectorAll('#hm-bang [data-action=xem-don-no]')][0].click(); true");
    await p.waitFor("!document.getElementById('hm-don').hidden", "danh sách đơn nợ hiện");
    const t = await p.ev("document.getElementById('hm-don').innerText");
    assert.ok(t.includes(DON.code ?? DON.orderCode ?? "") && t.includes("nợ 1.350.000 ₫"), `đơn nợ: ${t}`);
    await chup(p, "han-muc-1440-don-no");
  });
  await buoc("T3", "[1440] biểu mẫu «Đặt hạn mức»: thiếu hồ sơ báo ngay (không gọi máy chủ); chọn hồ sơ, gõ số, lưu ⇒ 201 và dòng mới", async () => {
    await p.ev("window.__ghi.length = 0; true");
    await p.ev(setInput("document.getElementById('hm-han-muc')", "20.000.000"));
    await p.ev(setInput("document.getElementById('hm-so-ngay')", "30"));
    await p.ev("document.querySelector('[data-action=luu-han-muc]').click(); true");
    await p.waitFor("(() => { const e = document.querySelector('#hm-form .alert'); return !!e && !e.hidden && e.textContent === 'Chọn hồ sơ đối tác trước.'; })()", "câu chưa chọn hồ sơ");
    assert.equal(await p.ev("window.__ghi.length"), 0, "chưa chọn hồ sơ: không gọi máy chủ");
    await p.ev(setInput("document.getElementById('hm-tim')", "Công Ty Mới"));
    await p.waitFor("document.querySelectorAll('#hm-form .card-list button').length > 0", "kết quả tìm hồ sơ");
    await p.ev("document.querySelector('#hm-form .card-list button').click(); true");
    await p.ev("document.querySelector('[data-action=luu-han-muc]').click(); true");
    await p.waitFor("!document.getElementById('ok').hidden", "câu Đã đặt hạn mức");
    assert.deepEqual(await p.ev("window.__ghi.filter((x) => x.m === 'POST')"), [{ m: "POST", u: "/api/tra-sau/han-muc", s: 201 }]);
    await p.waitFor("[...document.querySelectorAll('#hm-bang tr')].some((tr) => tr.textContent.includes('Công Ty Mới Thử') && tr.textContent.includes('20.000.000 ₫ · 30 ngày'))", "dòng hạn mức mới");
    await chup(p, "han-muc-1440-da-dat");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Chi tiết đơn Trả sau (Bán hàng) ----------------
  p = await moTrang(ACCOUNTS.salesA, KHO_1440, `/order?id=${encodeURIComponent(DON.id)}`);
  await buoc("D1", "[1440] chi tiết đơn Trả sau ghi «Hình thức thanh toán: Trả sau · hạn trả …» (hạn = hôm nay + 7 ngày)", async () => {
    await p.waitFor("document.body.innerText.includes('Hình thức thanh toán')", "dòng hình thức");
    const t = await p.ev("document.body.innerText");
    const han = vnDate(7).split("-").reverse().join("/");
    assert.ok(t.includes(`Trả sau · hạn trả ${han}`), `nhãn: ${t.slice(t.indexOf("Hình thức"), t.indexOf("Hình thức") + 80)}`);
    await chup(p, "don-tra-sau-1440");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Toàn quyền, 390 ----------------
  p = await moTrang(ACCOUNTS.chu, KHO_390);
  await buoc("T4", "[390] thẻ đối tác hiện đủ (hạn mức, đang nợ, còn được dùng, cảnh báo, nút); không tràn ngang; vùng chạm ≥ 44px; axe", async () => {
    await p.waitFor("document.querySelectorAll('#hm-the .card').length > 0", "thẻ hiện");
    const t = await p.ev("document.getElementById('hm-the').innerText");
    assert.ok(t.includes(TEN) && t.includes("Còn được dùng") && t.includes("vượt hạn mức hiện hành"), `thẻ: ${t}`);
    await bocucSach(p, "[390]");
    await chup(p, "han-muc-390");
    await axeKiem(p, "[390]");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Kế toán: chỉ xem ----------------
  p = await moTrang(ACCOUNTS.accounting, KHO_1440);
  await buoc("K1", "[1440] Kế toán thấy dòng và cảnh báo, KHÔNG có «Đặt hạn mức», «Ngừng hạn mức», không có biểu mẫu", async () => {
    await choBang(p);
    assert.ok((await chuMain(p)).includes(TEN));
    assert.equal(await nutCoChu(p, "Đặt hạn mức"), false);
    assert.equal(await nutCoChu(p, "Ngừng hạn mức"), false);
    assert.equal(await p.ev("!!document.getElementById('hm-form')"), false, "không dựng biểu mẫu");
    assert.equal(await nutCoChu(p, "Xem đơn nợ"), true);
  });
  p.close();
  trangHienTai = null;

  // ---------------- Bán hàng: bị chặn ----------------
  await buoc("B1", "[1440] Bán hàng: câu chặn, không bảng, không mục ở thanh bên", async () => {
    const q = await moTrang(ACCOUNTS.salesA, KHO_1440);
    try {
      await q.waitFor("(() => { const e = document.getElementById('error'); return !!e && !e.hidden && e.textContent.length > 0; })()", "câu báo lỗi hiện");
      assert.equal(await q.ev("document.getElementById('error').textContent"), CAU_CHI_KE_TOAN);
      assert.equal(await q.ev("document.getElementById('hm-khung').hidden"), true);
      assert.equal(await q.ev("!!document.querySelector('a[href=\"/han-muc-tra-sau\"]')"), false);
    } finally {
      q.close();
      trangHienTai = null;
    }
  });

  // ---------------- Màn lập đơn: khối «Hình thức thanh toán» (I-1) ----------------
  const dichVuTD101 = { kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
    departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const lapNhap = async (benDat, term) => {
    const x = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Thử", customerPhone: "0901234567", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", bookerPartyId: benDat, paymentTerm: term, services: [dichVuTD101] });
    assert.equal(x.status, 201, JSON.stringify(x.json));
    return x.json.order;
  };
  const khoiHien = (q) => q.ev("(() => { const k = document.getElementById('tra-sau-khoi'); return { hien: !!k && !k.hidden, cau: document.getElementById('tra-sau-cau').textContent, credit: document.querySelector('input[name=paymentTerm][value=CREDIT]').checked, bao: document.getElementById('tra-sau-bao').hidden ? '' : document.getElementById('tra-sau-bao').textContent }; })()");
  const bamLuuDon = (q) => q.ev("document.getElementById('save').click(); true");
  const luuDon = (id) => `/api/orders/${encodeURIComponent(id)}`;
  const nhap = await lapNhap(BEN2, "CREDIT");
  for (const [nhan, kho] of [["1440", KHO_1440], ["390", KHO_390]]) {
    await buoc(`F1-${nhan}`, `[${nhan}] mở nháp Trả sau của bên có hạn mức: thấy ô Trả sau đang chọn và «Còn được dùng 20.000.000 ₫»; vùng chạm, không tràn ngang`, async () => {
      const q = await moTrang(ACCOUNTS.salesA, kho, `/order-form?id=${encodeURIComponent(nhap.id)}`);
      try {
        await q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối Trả sau hiện");
        const k = await khoiHien(q);
        assert.equal(k.credit, true, "Trả sau đang chọn");
        assert.ok(k.cau.includes("Còn được dùng 20.000.000"), k.cau);
        await chup(q, `lap-don-tra-sau-${nhan}`);
      } finally { q.close(); trangHienTai = null; }
    });
  }
  await buoc("F2", "[1440] chọn Trả trước rồi lưu ⇒ PUT 200; mở lại vẫn Trả trước; chọn Trả sau lưu ⇒ mở lại vẫn Trả sau", async () => {
    const q = await moTrang(ACCOUNTS.salesA, KHO_1440, `/order-form?id=${encodeURIComponent(nhap.id)}`);
    try {
      await q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối Trả sau hiện");
      for (const [gt, mong] of [["PREPAID", "PREPAID"], ["CREDIT", "CREDIT"]]) {
        await q.ev(`document.querySelector('input[name=paymentTerm][value=${gt}]').click(); true`);
        await q.ev("window.__ghi.length = 0; true");
        await bamLuuDon(q);
        await q.waitFor("window.__ghi.some((x) => x.m === 'PUT')", `PUT lưu đơn (${gt})`);
        assert.deepEqual(await q.ev("window.__ghi.filter((x) => x.m === 'PUT').map((x) => x.s)"), [200], `lưu ${gt}`);
        const g = await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id));
        assert.equal(g.json.order.paymentTerm, mong, `đơn đã lưu là ${mong}`);
        await q.send("Page.reload", {});
        await q.waitFor("document.readyState === 'complete'", "tải lại");
        await q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối hiện lại");
        assert.equal((await khoiHien(q)).credit, mong === "CREDIT", `mở lại vẫn ${mong}`);
      }
    } finally { q.close(); trangHienTai = null; }
  });
  await buoc("F3", "[1440] đơn mới không bên đặt: KHÔNG có ô chọn hình thức", async () => {
    const q = await moTrang(ACCOUNTS.salesA, KHO_1440, "/order-form");
    try {
      await sleep(2500);
      const k = await khoiHien(q);
      assert.equal(k.hien, false, "không có hạn mức thì không có ô chọn");
    } finally { q.close(); trangHienTai = null; }
  });
  // Hết hạn mức giữa lúc lưu và lúc mở lại: nháp Trả sau tự về Trả trước KÈM câu báo, lưu được (không ngõ cụt).
  const rr = await call(ACCOUNTS.chu, "POST", `/api/tra-sau/han-muc/${BEN2}/ngung`, {});
  assert.equal(rr.status, 200, JSON.stringify(rr.json));
  await buoc("F4", "[1440] bên đặt hết hạn mức: nháp Trả sau về Trả trước kèm câu báo, khối ẩn, lưu ⇒ PUT 200 và đơn thành Trả trước", async () => {
    const q = await moTrang(ACCOUNTS.salesA, KHO_1440, `/order-form?id=${encodeURIComponent(nhap.id)}`);
    try {
      await q.waitFor("!document.getElementById('tra-sau-bao').hidden", "câu báo hiện");
      const k = await khoiHien(q);
      assert.equal(k.hien, false, "khối ẩn");
      assert.ok(k.bao.includes("chuyển về Trả trước"), k.bao);
      await chup(q, "lap-don-het-han-muc-1440");
      await q.ev("window.__ghi.length = 0; true");
      await bamLuuDon(q);
      await q.waitFor("window.__ghi.some((x) => x.m === 'PUT')", "PUT lưu đơn");
      assert.deepEqual(await q.ev("window.__ghi.filter((x) => x.m === 'PUT').map((x) => x.s)"), [200]);
      assert.equal((await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id))).json.order.paymentTerm, "PREPAID");
    } finally { q.close(); trangHienTai = null; }
  });

  console.log("\n--- Ảnh đã chụp ---\n" + anh.join("\n"));
  if (axeNhe.length) console.log("\n--- Ghi chú axe (không đỏ) ---\n" + axeNhe.join("\n"));
  if (loi.length) {
    console.log("\nBƯỚC ĐỎ:\n" + loi.join("\n"));
    process.exitCode = 1;
  } else console.log("\nTRA SAU SMOKE OK");
} finally {
  await env.stop();
}
