// Kịch bản Chrome — Trả sau (ADR-0168; cập nhật 2026-11-06 cho ADR-0172, ADR-0173): ô «Trả sau» và khối «Hạn mức trả sau» ở màn Cấp độ đại lý (Toàn quyền đặt, điền sẵn số gợi ý;
// Quản trị bị mức tối đa chặn; Kế toán chỉ xem), màn «Hạn mức trả sau» chỉ xem (giờ Việt Nam), khối Trả sau + nút «Ân hạn» trên đơn, mục «Trả sau của tôi» của Đối tác; 1440 và 390.
// Cập nhật 2026-11-12 cho ADR-0198: P1 (Đối tác không thấy số hạn mức), P2 (Đối tác lập đơn mới: câu gọn, chọn sẵn «Trả sau»); F1 giữ «Hạn mức khả dụng» cho văn phòng.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, KHÔNG --remote.
// Quy tắc ADR-0074/0075: đăng nhập MỚI của cùng tài khoản đá phiên trang đang mở ⇒ mọi lời gọi API gieo dữ liệu làm TRƯỚC khi mở trang của tài khoản đó.
// Chạy (sau `npm run build:web`, từ GỐC repo):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-05-tra-sau/anh node docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs
// Cuối: "TRA SAU SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";
import { HOP_HOI_TU_DONG } from "../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)

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
/** Không tràn ngang, ô gõ ≥ 16px, vùng chạm của nút và ô trong `main` ≥ 44px. Ô tròn / ô tích nằm trong `<label>`: vùng chạm là cả nhãn (bấm chữ cũng chọn) — đo nhãn (12/11, ADR-0198 P2). */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const hien = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const nho = [...document.querySelectorAll('main input, main select, main textarea')].filter((e) => hien(e) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const cham = [...document.querySelectorAll('main button, main input:not([type=hidden])')].filter((e) => hien(e)).map((e) => ({ e, r: ((e.type === 'radio' || e.type === 'checkbox') && e.closest('label') ? e.closest('label') : e).getBoundingClientRect() })).filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => (x.e.id || x.e.className || x.e.tagName) + ' ' + Math.round(x.r.width) + '×' + Math.round(x.r.height));
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, cham };
  })()`);
  assert.ok(m.sw <= m.iw, `${nhan}: trang tràn ngang (${m.sw} > ${m.iw})`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.deepEqual(m.cham, [], `${nhan}: vùng chạm nhỏ hơn 44px`);
}

const GHI_FETCH = `{ window.__ghi = []; const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f0(u, o); const m = (o && o.method) || 'GET'; if (m !== 'GET') window.__ghi.push({ m, u: String(u), s: r.status }); return r; }; }`;


const CAU_CHI_KE_TOAN = "Trang này chỉ Kế toán, Quản trị và Toàn quyền dùng được.";
/** Mốc ISO → «HH:MM dd/mm/yyyy» giờ Việt Nam (cùng khuôn `vnDateTimeText` của src/shared/vn-date.ts). */
const gioVn = (iso) => { const [d, t] = new Date(Date.parse(iso) + 7 * 3600e3).toISOString().split("T"); return `${t.slice(0, 5)} ${d.split("-").reverse().join("/")}`; };
/** Mốc ISO → giá trị ô datetime-local theo giờ Việt Nam. */
const oGioVn = (iso) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 16);
const env = await startEnv();
try {
  const { call } = goiApi(env);
  const phai = (x, st, nhan) => { assert.equal(x.status, st, `${nhan}: ${JSON.stringify(x.json)}`); return x.json; };
  // ---- Gieo dữ liệu bằng API (TRƯỚC khi mở trang).
  // (a) Mức tối đa Quản trị được cấp 10.000.000. (b) Cấp «Cấp Thử TS», loại Công ty lữ hành xếp vào cấp này, số gợi ý 20.000.000 · 48 giờ · ân hạn 6 giờ.
  // (c) Đối tác 1: Trả sau 5.000.000 · 36 giờ · ân hạn 12 giờ, một đơn 1.350.000 đã xác nhận, rồi hạ còn 1.000.000 ⇒ nợ vượt hạn mức. (d) Đối tác 2 chưa bật.
  // (e) Một tài khoản Đối tác có hồ sơ riêng, bật Trả sau 3.000.000 — để xem mục «Trả sau của tôi».
  phai(await call(ACCOUNTS.chu, "POST", "/api/tra-sau/muc-toi-da", { so: 10_000_000 }), 201, "mức tối đa");
  const CAP = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten: "Cấp Thử TS" }), 201, "cấp").muc;
  phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${CAP.code}/dong`, { tuNgay: "2026-01-01", phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 }), 201, "dòng cấp");
  phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai: "TRAVEL_AGENCY", muc: CAP.code, tuNgay: "2026-01-01" }), 201, "xếp loại vào cấp");
  phai(await call(ACCOUNTS.chu, "PUT", `/api/tra-sau/goi-y/${CAP.code}`, { hanMuc: 20_000_000, gioTra: 48, gioAnHan: 6 }), 200, "số gợi ý");
  const TEN = "Đại Lý Trả Sau Thử";
  const BEN = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912000111" }] }), 201, "hồ sơ 1").party.id;
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${BEN}/roles`, { roleTypeCode: "TRAVEL_AGENCY" }), 201, "vai 1");
  phai(await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: 5_000_000, gioTra: 36, gioAnHan: 12 }), 201, "bật 1");
  let r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Thử", customerPhone: "0901234567", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", bookerPartyId: BEN, paymentTerm: "CREDIT",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  const DON = phai(r, 201, "đơn").order;
  phai(await call(ACCOUNTS.salesA, "POST", `/api/orders/${DON.id}/status`, { status: "confirmed" }), 200, "xác nhận");
  phai(await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: 1_000_000, gioTra: 36, gioAnHan: 12 }), 201, "hạ hạn mức 1");
  const HAN_TRA = phai(await call(ACCOUNTS.salesA, "GET", `/api/orders/${DON.id}`), 200, "đọc đơn").order.hanTra;
  const TEN2 = "Công Ty Mới Thử";
  const BEN2 = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "PERSON", fullName: TEN2, contacts: [{ kind: "PHONE", value: "0912000222" }] }), 201, "hồ sơ 2").party.id;
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${BEN2}/roles`, { roleTypeCode: "TRAVEL_AGENCY" }), 201, "vai 2");
  const tk = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Xem Nợ", phone: "0912000333", roles: ["TRAVEL_AGENCY"] }), 201, "tài khoản Đối tác"); // ADR-0185: tài khoản Đối tác tạo bằng vai trò
  const DT = { name: "Đối Tác Xem Nợ", phone: tk.staff.phone, pin: tk.pin, permissions: ["PARTNER"] };
  phai(await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: tk.staff.partyId, hanMuc: 3_000_000, gioTra: 36, gioAnHan: 0 }), 201, "bật Đối tác");

  const moTrang = async (account, vp, duong = "/han-muc-tra-sau") => {
    const p = await env.openPage(vp);
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `${HOP_HOI_TU_DONG} window.confirm = () => true; window.alert = () => {}; ${GHI_FETCH}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: `${env.base}${duong}` });
    await p.waitFor("document.readyState === 'complete'", "trang tải xong");
    return p;
  };
  const choBang = (p) => p.waitFor("!document.getElementById('hm-khung').hidden && document.querySelectorAll('#hm-bang tr').length > 0", "bảng hạn mức hiện");
  const choCap = (p) => p.waitFor("!document.getElementById('cdl-khung').hidden && document.querySelectorAll('.cot-tra-sau').length > 0 && !!document.getElementById('ts-cai-dat')", "màn cấp có cột Trả sau và khối cài đặt");
  const chuMain = (p) => p.ev("document.querySelector('main').innerText");
  const nutCoChu = (p, chu) => p.ev(`[...document.querySelectorAll('main button, .sheet button')].some((b) => b.textContent.trim() === ${JSON.stringify(chu)})`);
  /** Bấm nút trong ô Trả sau ĐANG HIỆN của hồ sơ (bảng máy tính hoặc thẻ điện thoại). */
  const moO = (p, ben) => p.ev(`[...document.querySelectorAll('.cot-tra-sau[data-party="${ben}"]')].find((x) => x.getClientRects().length > 0).querySelector('button').click(), true`);
  const choBangTruot = (p) => p.waitFor("!!document.querySelector('.sheet-root.open') || !!document.querySelector('.sheet')", "bảng trượt mở");
  const dongBangTruot = (p) => p.ev("document.querySelector('.sheet-close')?.click(); true");

  // ---------------- Cấp độ đại lý: Toàn quyền, 1440 ----------------
  let p = await moTrang(ACCOUNTS.chu, KHO_1440, "/cap-dai-ly");
  await buoc("C1", "[1440] Cấp độ đại lý có cột «Trả sau» (giờ, ân hạn, nợ), khối «Hạn mức trả sau» có số gợi ý của cấp và ô mức tối đa; không tràn; axe", async () => {
    await choCap(p);
    const t = await chuMain(p);
    assert.ok(t.includes("1.000.000 ₫ · trả trong 36 giờ · ân hạn 12 giờ"), `ô Trả sau đối tác 1: ${t.slice(0, 600)}`);
    assert.ok(t.includes("Đang nợ 1.350.000 ₫"), "nợ dưới ô");
    assert.ok(t.includes("Hạn mức trả sau") && t.includes("20.000.000 ₫ · trả trong 48 giờ (2 ngày) · ân hạn 6 giờ"), "số gợi ý của cấp");
    assert.equal(await p.ev("!!document.getElementById('ts-muc-toi-da')"), true, "Toàn quyền có ô mức tối đa");
    await bocucSach(p, "[1440 cấp]");
    await chup(p, "cap-dai-ly-tra-sau-1440");
    await axeKiem(p, "[1440 cấp]");
  });
  await buoc("C2", "[1440] bấm ô Trả sau của đối tác chưa bật: bảng điền sẵn số gợi ý của cấp; bấm «Cấp hạn mức» ⇒ 201, ô hiện số mới", async () => {
    await p.ev("window.__ghi.length = 0; true");
    await moO(p, BEN2);
    await choBangTruot(p);
    await p.waitFor("!!document.getElementById('ts-han-muc')", "ô hạn mức trong bảng");
    assert.deepEqual(await p.ev("['ts-han-muc', 'ts-gio-tra', 'ts-gio-an-han'].map((i) => document.getElementById(i).value)"), ["20000000", "48", "6"], "điền sẵn số gợi ý");
    assert.ok((await p.ev("document.querySelector('.sheet').innerText")).includes("Đã điền sẵn số gợi ý của cấp Cấp Thử TS"), "câu nhắc gợi ý");
    await bocucSach(p, "[1440 bảng Trả sau]");
    await chup(p, "cap-dai-ly-bang-tra-sau-1440");
    await axeKiem(p, "[1440 bảng Trả sau]");
    await p.ev("document.querySelector('[data-action=dat-han-muc]').click(); true");
    await p.waitFor(`[...document.querySelectorAll('.cot-tra-sau[data-party="${BEN2}"]')].some((x) => x.textContent.includes('20.000.000 ₫ · trả trong 48 giờ'))`, "ô hiện số mới");
    assert.deepEqual(await p.ev("window.__ghi.filter((x) => x.m === 'POST')"), [{ m: "POST", u: "/api/tra-sau/han-muc", s: 201 }]);
  });
  p.close();
  trangHienTai = null;

  // ---------------- Cấp độ đại lý: Toàn quyền, 390 ----------------
  p = await moTrang(ACCOUNTS.chu, KHO_390, "/cap-dai-ly");
  await buoc("C3", "[390] thẻ có dòng «Trả sau», khối cài đặt, bảng Trả sau mở được; không tràn; vùng chạm ≥ 44px; axe", async () => {
    await choCap(p);
    assert.ok((await p.ev("document.getElementById('cdl-the').innerText")).includes("Trả sau:"), "thẻ có dòng Trả sau");
    await bocucSach(p, "[390 cấp]");
    await chup(p, "cap-dai-ly-tra-sau-390");
    await axeKiem(p, "[390 cấp]");
    await moO(p, BEN);
    await choBangTruot(p);
    await p.waitFor("!!document.getElementById('ts-han-muc') && !!document.querySelector('[data-action=ngung-han-muc]')", "bảng của đối tác đang bật có nút Ngừng");
    await bocucSach(p, "[390 bảng Trả sau]");
    await chup(p, "cap-dai-ly-bang-tra-sau-390");
    await axeKiem(p, "[390 bảng Trả sau]");
    await dongBangTruot(p);
  });
  p.close();
  trangHienTai = null;

  // ---------------- Cấp độ đại lý: Quản trị bị mức tối đa chặn ----------------
  p = await moTrang(ACCOUNTS.admin, KHO_1440, "/cap-dai-ly");
  await buoc("A1", "[1440] Quản trị: bảng nói mức tối đa 10.000.000; đặt 20.000.000 ⇒ câu từ chối trong bảng, số không đổi; không có ô mức tối đa", async () => {
    await choCap(p);
    assert.equal(await p.ev("!!document.getElementById('ts-muc-toi-da')"), false, "Quản trị không có ô mức tối đa");
    assert.ok((await chuMain(p)).includes("Mức tối đa Quản trị được cấp: 10.000.000 ₫"));
    await moO(p, BEN2);
    await choBangTruot(p);
    await p.waitFor("!!document.getElementById('ts-han-muc')", "ô hạn mức");
    assert.ok((await p.ev("document.querySelector('.sheet').innerText")).includes("Quản trị đặt được hạn mức tới 10.000.000 ₫."), "câu mức tối đa");
    await p.ev("window.__ghi.length = 0; true");
    await p.ev("document.querySelector('[data-action=dat-han-muc]').click(); true");
    await p.waitFor("(() => { const e = document.querySelector('.sheet .vc-field-error'); return !!e && !e.hidden && e.textContent.length > 0; })()", "câu từ chối trong bảng");
    assert.deepEqual(await p.ev("window.__ghi.map((x) => x.s)"), [403]);
    assert.doesNotMatch(await p.ev("document.querySelector('.sheet .vc-field-error').textContent"), /vuot_muc|forbidden|credit/);
    await chup(p, "cap-dai-ly-quan-tri-vuot-1440");
    await dongBangTruot(p);
  });
  p.close();
  trangHienTai = null;

  // ---------------- Cấp độ đại lý: Kế toán chỉ xem ----------------
  p = await moTrang(ACCOUNTS.accounting, KHO_1440, "/cap-dai-ly");
  await buoc("K1", "[1440] Kế toán thấy chữ Trả sau nhưng không có nút mở bảng, không có nút Lưu ở khối cài đặt", async () => {
    await choCap(p);
    assert.ok((await chuMain(p)).includes("1.000.000 ₫ · trả trong 36 giờ"));
    assert.equal(await p.ev("document.querySelectorAll('.cot-tra-sau button').length"), 0, "không nút trong ô");
    assert.equal(await p.ev("document.querySelectorAll('#ts-cai-dat button').length"), 0, "không nút ở khối cài đặt");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Hạn mức trả sau: chỉ xem ----------------
  p = await moTrang(ACCOUNTS.accounting, KHO_1440);
  await buoc("H1", "[1440] Hạn mức trả sau chỉ xem: dòng, cảnh báo vượt, không «Cấp hạn mức» / «Điều chỉnh hạn mức» / «Đóng hạn mức»; «Xem đơn nợ» hiện hạn trả giờ Việt Nam; axe", async () => {
    await choBang(p);
    const t = await chuMain(p);
    assert.ok(t.includes(TEN) && t.includes("1.000.000 ₫ · trả trong 36 giờ · ân hạn 12 giờ"), "dòng");
    assert.ok(t.includes("Đang nợ 1.350.000 ₫, vượt hạn mức hiện hành 1.000.000 ₫."), "cảnh báo vượt");
    for (const chu of ["Cấp hạn mức", "Điều chỉnh hạn mức", "Đóng hạn mức"]) assert.equal(await nutCoChu(p, chu), false, chu);
    assert.equal(await p.ev("!!document.querySelector('main a[href=\"/cap-dai-ly\"]')"), true, "trỏ sang màn Cấp độ đại lý");
    await p.ev(`[...document.querySelectorAll('#hm-bang tr')].find((tr) => tr.textContent.includes(${JSON.stringify(TEN)})).querySelector('[data-action=xem-don-no]').click(); true`);
    await p.waitFor("!document.getElementById('hm-don').hidden", "danh sách đơn nợ hiện");
    const d = await p.ev("document.getElementById('hm-don').innerText");
    assert.ok(d.includes(`nợ 1.350.000 ₫ · hạn trả ${gioVn(HAN_TRA)}`), `đơn nợ: ${d}`);
    await bocucSach(p, "[1440 hạn mức]");
    await chup(p, "han-muc-1440");
    await axeKiem(p, "[1440 hạn mức]");
  });
  p.close();
  trangHienTai = null;
  p = await moTrang(ACCOUNTS.admin, KHO_390);
  await buoc("H2", "[390] Quản trị xem được Hạn mức trả sau dạng thẻ; không tràn; vùng chạm; axe", async () => {
    await p.waitFor("document.querySelectorAll('#hm-the .card').length > 0", "thẻ hiện");
    const t = await p.ev("document.getElementById('hm-the').innerText");
    assert.ok(t.includes(TEN) && t.includes("Hạn mức khả dụng") && t.includes("vượt hạn mức hiện hành"), `thẻ: ${t}`);
    await bocucSach(p, "[390 hạn mức]");
    await chup(p, "han-muc-390");
    await axeKiem(p, "[390 hạn mức]");
  });
  p.close();
  trangHienTai = null;
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

  // ---------------- Chi tiết đơn Trả sau ----------------
  p = await moTrang(ACCOUNTS.salesA, KHO_1440, `/order?id=${encodeURIComponent(DON.id)}`);
  await buoc("D1", "[1440] Bán hàng: «Trả sau · hạn trả HH:MM dd/mm/yyyy» theo giờ Việt Nam và dòng «Hạn trả: Trong hạn · còn nợ …»; KHÔNG có nút «Ân hạn»", async () => {
    await p.waitFor("!!document.querySelector('[data-tra-sau]')", "dòng hạn trả");
    const t = await p.ev("document.body.innerText");
    assert.ok(t.includes(`Trả sau · hạn trả ${gioVn(HAN_TRA)}`), `nhãn: ${t.slice(t.indexOf("Hình thức"), t.indexOf("Hình thức") + 80)}`);
    assert.ok(t.includes("Trong hạn · còn nợ 1.350.000 ₫"), "trạng thái");
    assert.equal(await nutCoChu(p, "Ân hạn"), false, "Bán hàng không có nút Ân hạn");
    await chup(p, "don-tra-sau-1440");
  });
  p.close();
  trangHienTai = null;
  p = await moTrang(ACCOUNTS.chu, KHO_390, `/order?id=${encodeURIComponent(DON.id)}`);
  await buoc("D2", "[390] Toàn quyền: nút «Ân hạn» mở bảng (ô ngày giờ đặt sẵn hạn cũ); thiếu lý do báo ngay, không gọi máy chủ; có lý do ⇒ 200, hạn trả mới +24 giờ hiện trên đơn; vùng chạm; axe", async () => {
    await p.waitFor("!!document.querySelector('[data-action=an-han]')", "nút Ân hạn");
    await p.ev("document.querySelector('[data-action=an-han]').click(); true");
    await choBangTruot(p);
    await p.waitFor("!!document.getElementById('an-han-moi')", "ô hạn mới");
    assert.equal(await p.ev("document.getElementById('an-han-moi').value"), oGioVn(HAN_TRA), "đặt sẵn hạn cũ theo giờ Việt Nam");
    await bocucSach(p, "[390 bảng Ân hạn]");
    await chup(p, "an-han-390");
    await axeKiem(p, "[390 bảng Ân hạn]");
    const moi = new Date(Date.parse(HAN_TRA) + 24 * 3600e3).toISOString();
    await p.ev(setInput("document.getElementById('an-han-moi')", oGioVn(moi)));
    await p.ev("window.__ghi.length = 0; document.querySelector('[data-action=luu-an-han]').click(); true");
    await p.waitFor("(() => { const e = document.querySelector('.sheet .vc-field-error'); return !!e && !e.hidden && e.textContent === 'Ghi lý do lùi hạn trả.'; })()", "câu thiếu lý do");
    assert.equal(await p.ev("window.__ghi.length"), 0, "thiếu lý do: không gọi máy chủ");
    await p.ev(setInput("document.getElementById('an-han-ly-do')", "Khách xin thêm một ngày"));
    await p.ev("document.querySelector('[data-action=luu-an-han]').click(); true");
    const moiPhut = new Date(Date.parse(moi) - (Date.parse(moi) % 60000)).toISOString();
    await p.waitFor(`document.body.innerText.includes(${JSON.stringify(`Trả sau · hạn trả ${gioVn(moiPhut)}`)})`, "đơn hiện hạn trả mới");
    assert.deepEqual(await p.ev("window.__ghi.map((x) => [x.m, x.u, x.s])"), [["POST", `/api/tra-sau/don/${DON.id}/an-han`, 200]]);
    await chup(p, "an-han-xong-390");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Trả sau của tôi (Đối tác) ----------------
  for (const [nhan, kho] of [["1440", KHO_1440], ["390", KHO_390]]) {
    // ADR-0198 Đ1.5 (12/11): Đối tác KHÔNG thấy số hạn mức hay hạn mức khả dụng — chỉ số giờ trả, giờ ân hạn và số đang nợ.
    await buoc(`P1-${nhan}`, `[${nhan}] Đối tác thấy mục «Trả sau của tôi» ở trang Tôi: số giờ trả, không số hạn mức, không «Hạn mức khả dụng»; axe`, async () => {
      const q = await moTrang(DT, kho, "/account");
      try {
        await q.waitFor("!document.getElementById('tra-sau-cua-toi').hidden", "mục Trả sau của tôi hiện");
        const t = await q.ev("document.getElementById('tra-sau-cua-toi').innerText");
        assert.ok(t.includes("Trả sau của tôi") && t.includes("Bạn được trả sau, trả trong 36 giờ kể từ khi đơn được xác nhận.") && t.includes("Đang nợ 0 ₫"), t);
        assert.ok(!t.includes("3.000.000") && !t.includes("Hạn mức khả dụng"), `lộ số hạn mức: ${t}`);
        await bocucSach(q, `[${nhan} Tôi]`);
        await chup(q, `tra-sau-cua-toi-${nhan}`);
        await axeKiem(q, `[${nhan} Tôi]`);
      } finally { q.close(); trangHienTai = null; }
    });
  }

  // ---------------- ADR-0198: Đối tác lập đơn MỚI — câu gọn không số, chọn sẵn «Trả sau» ----------------
  for (const [nhan, kho] of [["1440", KHO_1440], ["390", KHO_390]]) {
    await buoc(`P2-${nhan}`, `[${nhan}] Đối tác mở đơn mới: khối «Hình thức thanh toán» hiện câu «Bạn được trả sau…», không số tiền, «Trả sau» chọn sẵn, không câu báo; vùng chạm; axe`, async () => {
      const q = await moTrang(DT, kho, "/order-form");
      try {
        await q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối Trả sau hiện");
        await sleep(500); // lần nạp thứ hai (sau khi nạp xong bên đặt) không được đổi lựa chọn
        const k = await q.ev("(() => ({ cau: document.getElementById('tra-sau-cau').textContent, khoi: document.getElementById('tra-sau-khoi').innerText, credit: document.querySelector('input[name=paymentTerm][value=CREDIT]').checked, baoHidden: document.getElementById('tra-sau-bao').hidden }))()");
        assert.equal(k.cau, "Bạn được trả sau. Nhận vé trước, chuyển tiền cho Tour Đảo trong hạn trả.");
        assert.ok(!/₫|\d{1,3}\.\d{3}/.test(k.khoi), `khối có số tiền: ${k.khoi}`);
        assert.equal(k.credit, true, "«Trả sau» chọn sẵn");
        assert.equal(k.baoHidden, true, "không câu «chuyển về Thanh toán ngay»");
        await q.ev("document.getElementById('tra-sau-khoi').scrollIntoView({ block: 'center' }); true");
        await bocucSach(q, `[${nhan} lập đơn Đối tác]`);
        await chup(q, `doi-tac-lap-don-${nhan}`);
        await axeKiem(q, `[${nhan} lập đơn Đối tác]`);
      } finally { q.close(); trangHienTai = null; }
    });
  }

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
  const chanDoan = async (q, nhan) => {
    const d = await q.ev(`JSON.stringify({ href: location.href, loiLuu: document.getElementById('save-error')?.textContent ?? null, baoHidden: document.getElementById('tra-sau-bao').hidden, baoChu: document.getElementById('tra-sau-bao').textContent, khoiHidden: document.getElementById('tra-sau-khoi').hidden, cau: document.getElementById('tra-sau-cau').textContent, radio: document.querySelector('input[name=paymentTerm]:checked')?.value, ghi: window.__ghi, bookerStatus: document.querySelector('.booker-status')?.textContent ?? null, tenKhach: document.getElementById('customerName')?.value, sdt: document.getElementById('customerPhone')?.value })`).catch((e) => "ev lỗi " + e);
    const g = await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id));
    const c = await call(ACCOUNTS.salesA, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN2}`);
    console.log(`    [chẩn đoán ${nhan}] trang=${d}\n    đơn nhap: status=${g.json?.order?.status} term=${g.json?.order?.paymentTerm} booker=${g.json?.order?.bookerPartyId} (BEN2=${BEN2}) | con-duoc-dung=${JSON.stringify(c.json)}`);
  };
  const nhap = await lapNhap(BEN2, "CREDIT");
  for (const [nhan, kho] of [["1440", KHO_1440], ["390", KHO_390]]) {
    await buoc(`F1-${nhan}`, `[${nhan}] mở nháp Trả sau của bên có hạn mức: thấy ô Trả sau đang chọn và «Hạn mức khả dụng 20.000.000 ₫»; vùng chạm, không tràn ngang`, async () => {
      const q = await moTrang(ACCOUNTS.salesA, kho, `/order-form?id=${encodeURIComponent(nhap.id)}`);
      try {
        await q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối Trả sau hiện");
        const k = await khoiHien(q);
        assert.equal(k.credit, true, "Trả sau đang chọn");
        assert.ok(k.cau.includes("Hạn mức khả dụng 20.000.000"), k.cau);
        await chup(q, `lap-don-tra-sau-${nhan}`);
      } finally { q.close(); trangHienTai = null; }
    });
  }
  // Lưu thành công thì Nền tảng chuyển sang trang chi tiết đơn (`location.replace`) nên mỗi lượt lưu dùng MỘT trang mới; kết quả kiểm bằng API, không bằng `window.__ghi` (mất khi chuyển trang).
  const moNhap = async (kho = KHO_1440) => {
    const q = await moTrang(ACCOUNTS.salesA, kho, `/order-form?id=${encodeURIComponent(nhap.id)}`);
    await q.waitFor("document.getElementById('tra-sau-khoi') !== null && document.getElementById('customerName').value.length > 0", "form nạp xong nháp");
    return q;
  };
  const khoiSanSang = (q) => q.waitFor("(() => { const k = document.getElementById('tra-sau-khoi'); return !!k && !k.hidden && document.getElementById('tra-sau-cau').textContent.length > 0; })()", "khối Trả sau hiện");
  const luuRoiChoChuyenTrang = async (q) => {
    await bamLuuDon(q);
    await q.waitFor("location.pathname === '/order'", "lưu xong, chuyển sang trang đơn");
  };
  await buoc("F2", "[1440] chọn Trả trước lưu ⇒ đơn thành Trả trước, mở lại vẫn Trả trước; chọn Trả sau lưu ⇒ đơn thành Trả sau, mở lại vẫn Trả sau", async () => {
    for (const [gt, mong] of [["PREPAID", "PREPAID"], ["CREDIT", "CREDIT"]]) {
      let q = await moNhap();
      try {
        await khoiSanSang(q);
        await q.ev(`document.querySelector('input[name=paymentTerm][value=${gt}]').click(); true`);
        await luuRoiChoChuyenTrang(q);
      } catch (e) { await chanDoan(q, `F2-${gt}`); throw e; } finally { q.close(); trangHienTai = null; }
      const g = await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id));
      assert.equal(g.json.order.paymentTerm, mong, `đơn đã lưu là ${mong}`);
      q = await moNhap();
      try {
        await khoiSanSang(q);
        assert.equal((await khoiHien(q)).credit, mong === "CREDIT", `mở lại vẫn ${mong}`);
      } finally { q.close(); trangHienTai = null; }
    }
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
  await buoc("F4", "[1440] bên đặt hết hạn mức: nháp Trả sau về Trả trước kèm câu báo, khối ẩn, lưu ⇒ đơn thành Trả trước", async () => {
    assert.equal((await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id))).json.order.paymentTerm, "CREDIT", "điều kiện đầu: nháp đang là Trả sau");
    const q = await moNhap();
    try {
      await q.waitFor("!document.getElementById('tra-sau-bao').hidden", "câu báo hiện");
      await sleep(1500); // câu báo phải còn sau các lần hỏi hạn mức kế tiếp (từng bị lần hỏi sau xoá, tuỳ tốc độ mạng)
      assert.equal(await q.ev("document.getElementById('tra-sau-bao').hidden"), false, "câu báo vẫn còn");
      const k = await khoiHien(q);
      assert.equal(k.hien, false, "khối ẩn");
      assert.ok(k.bao.includes("chuyển về Thanh toán ngay"), k.bao);
      await chup(q, "lap-don-het-han-muc-1440");
      await luuRoiChoChuyenTrang(q);
    } catch (e) { await chanDoan(q, "F4"); throw e; } finally { q.close(); trangHienTai = null; }
    assert.equal((await call(ACCOUNTS.salesA, "GET", luuDon(nhap.id))).json.order.paymentTerm, "PREPAID");
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
