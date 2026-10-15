// Kịch bản Chrome — màn «Điều chỉnh công nợ» (/dieu-chinh-cong-no; ADR-0115 đợt 1, bản 1.92). Đây là rào DUY NHẤT cho phần GIAO DIỆN của luật «người thứ hai duyệt»:
// `npm test` canh luật thuần (src/shared/dieu-chinh-hien-thi.test.ts), `tests/e2e/dieu-chinh-duyet.mjs` canh máy chủ + CSDL, nhưng không bài nào mở trang thật. Kịch bản kiểm:
//   1) Kế toán mở màn lần đầu: tiêu đề, câu giải thích, hai khối rỗng đúng chữ;
//   2) gửi một yêu cầu BẰNG BIỂU MẪU THẬT (gõ ba ô tìm, bấm gợi ý, nhập tiền, lý do): thấy «Chờ duyệt» ở hai khối, số dư (dòng nợ trong D1) CHƯA đổi, biểu mẫu dùng lại được;
//   3) chính người gửi KHÔNG có nút Duyệt / Từ chối, có «Rút yêu cầu»; tự duyệt bằng lời gọi trực tiếp ⇒ 409 bằng câu tiếng Việt;
//   4) Quản trị: «Từ chối» thiếu lý do ⇒ «Cần ghi lý do.», thẻ còn nguyên; có lý do ⇒ thẻ biến khỏi danh sách của Quản trị và Kế toán thấy «Bị từ chối» kèm lý do; «Duyệt» ⇒ số dư đổi
//      đúng số tiền; Toàn quyền gửi yêu cầu thì cũng không có nút Duyệt;
//   5) ca bị chặn (quyết toán khi chưa có nợ, tăng nợ vượt trần, giảm nợ vượt số đang nợ) hiện câu tiếng Việt, không mã thô, không tạo thẻ; sau lỗi biểu mẫu vẫn dùng lại được;
//   6) Quản trị chỉ thấy khối «Chờ duyệt» (không «Gửi yêu cầu mới», không «Yêu cầu của tôi», không gọi được /api/ledger); Bán hàng không có mục menu và bị chặn bằng câu tiếng Việt;
//   7) hai khổ 390 và 1040 (+ 1280 chỉ đo bố cục): không tràn ngang, ô gõ ≥ 16px, ô lý do từ chối mở ra vẫn vừa khung, không chữ Anh / mã thô lộ ra;
//   8) axe-core (critical / serious ⇒ đỏ); 9) đếm mục thanh bên của Quản trị và Toàn quyền (con số 20 / 27 mục `.sidebar-item` — bảng THANH_BEN 21 / 28 gồm nút «Tạo đơn» vẽ riêng trong docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production, danh mục giả (không Sheet).
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản làm phiên của trang đang mở bị thay ⇒ dữ liệu dựng bằng API TRƯỚC khi mở trang của tài khoản đó; trong lúc trang mở thì
// đọc / ghi bằng chính trang (`p.ev(fetch…)`); mỗi lúc chỉ một trang mở, đóng trang trước khi mở trang kế (kho cookie của Chrome dùng chung).
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`, giải nén):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-13-dieu-chinh-cong-no/kich-ban/dieu-chinh-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-13-dieu-chinh-cong-no/anh/ (đặt OUT=<thư mục> để ghi chỗ khác). Mỗi bước chạy riêng (một bước đỏ không chặn bước sau); cuối cùng in "SMOKE OK" hoặc
// danh sách bước đỏ (thoát 1).
// Hai biến chỉ cho phá thử: DC_KHO=390|1040 (chạy một khổ) và DC_DUNG=<mã bước, vd 3[390]> (dừng sau bước đó); bỏ cả hai thì chạy đủ ba khổ (≈ 36 bước, 40–50 phút trên máy tải nặng vì mỗi lần đọc số dư là một lệnh wrangler d1). axe: critical / serious làm đỏ; moderate / minor in ở mục «axe nhẹ».
// PHÁ THỬ (P16 — quan sát kịch bản chặn thật, KHÔNG sửa mã sản phẩm): DC_PHA=duyet gắn vào trang một lớp bọc `fetch` giả «máy chủ cho người gửi tự duyệt» (mọi yêu cầu chờ duyệt trả
// coTheDuyet / coTheTuChoi = true) ⇒ bước 3 phải ĐỎ. DC_PHA=ly-do làm lời gọi «từ chối» gửi lý do «x» thay vì lý do người gõ ⇒ bước 4a (thiếu lý do không còn bị từ chối) và 4d (lý do hiện ở Kế toán là «x») phải ĐỎ. Chạy phá thử thì đặt OUT=<thư mục tạm>.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe(); // thiếu AXE_JS ⇒ dừng NGAY, trước khi dựng môi trường
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-13-dieu-chinh-cong-no/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const RONG = { width: 1280, height: 900, mobile: false };
// DC_KHO=390 hoặc 1040: chạy MỘT khổ (phá thử cho nhanh); DC_DUNG=<mã bước, vd 3[390]>: dừng ngay sau bước đó (phá thử). Chạy chính thức: không đặt hai biến này.
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.DC_KHO || process.env.DC_KHO === ten);
const DUNG = process.env.DC_DUNG ?? "";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/dieu-chinh-hien-thi.ts và web/dieu-chinh-cong-no.ts (viết lại ở đây có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_GIAI_THICH = "Điều chỉnh công nợ chỉ có hiệu lực khi một người KHÁC người gửi duyệt. Yêu cầu chưa ai quyết sau 7 ngày sẽ hết hạn (không tự duyệt). Số dư chỉ đổi ở lúc duyệt.";
const CAU_RONG_CHO_DUYET = "Không có yêu cầu nào đang chờ bạn duyệt.";
const CAU_RONG_CUA_TOI = "Bạn chưa gửi yêu cầu nào.";
const CAU_BI_CHAN_TRANG = "Trang Điều chỉnh công nợ chỉ Kế toán, Quản trị và Toàn quyền dùng được.";
const CAU_GUI_XONG = "Đã gửi yêu cầu — chờ người khác duyệt. Số dư chưa đổi.";
const CAU_THIEU_LY_DO = "Cần ghi lý do.";
const CAU_TU_DUYET = "Bạn là người tạo yêu cầu này — cần một người khác duyệt (tách nhiệm vụ).";
const LY_DO_TU_CHOI = "số tiền chưa khớp biên nhận";
const NHAN = { cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Bị từ chối", da_rut: "Đã rút", het_han: "Hết hạn" };
/** Chữ Anh / mã thô không được lộ ra người dùng (mã trạng thái, mã loại dòng, mã lỗi máy chủ). */
const CHU_ANH = /\b(adjust\w*|adjreq\w*|cho_duyet|da_duyet|tu_choi|da_rut|het_han|HELD|SETTLEMENT|REFUND|INCREASE|DECREASE|undefined|null|NaN|Internal Server Error|invalid_input|forbidden)\b|\[object/;

const PHA = process.env.DC_PHA ?? "";
const PHA_TRANG = PHA
  ? `{ const PHA = ${JSON.stringify(PHA)}; const f = window.fetch.bind(window);
    window.fetch = async (u, o) => { const ur = String(u); const post = !!(o && o.method && o.method !== 'GET');
      if (PHA === 'ly-do' && post && ur.endsWith('/reject')) return f(u, { ...o, body: JSON.stringify({ lyDo: 'x' }) });
      const r = await f(u, o);
      if (PHA === 'duyet' && !post && ur.includes('/api/ledger/adjustment-requests') && r.ok) { const b = await r.clone().json(); for (const y of b.yeuCau) if (y.trangThai === 'cho_duyet') { y.coTheDuyet = true; y.coTheTuChoi = true; }
        return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
      return r; }; }`
  : "";

// ---- chạy từng bước, gom lỗi ----
const loi = [];
const axeNhe = [];
const anh = [];
const ghiChu = [];
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
async function chup(p, ten) {
  await sleep(500);
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
/** Trang không tràn ngang; mọi ô gõ đang hiện ≥ 16px; không chữ Anh / mã thô trong chữ nhìn thấy của phần nội dung. */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const nho = [...document.querySelectorAll('main input, main select, main textarea')].filter((e) => e.offsetParent !== null && e.type !== 'hidden' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, chu: document.querySelector('main').innerText };
  })()`);
  assert.ok(m.sw <= m.iw + 1, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
}

const env = await startEnv();
try {
  const { call, lapDon } = goiApi(env);
  const congTyTen = env.sql(`SELECT p.display_name AS ten FROM v_pty_owner_company o JOIN pty_party p ON p.id = o.party_id`)[0]?.ten;
  const ID_CONG_TY = env.sql(`SELECT party_id AS id FROM v_pty_owner_company`)[0]?.id;
  const BEN_NO = ACCOUNTS.salesA.name; // hồ sơ của nhân viên Bán hàng: bên đang nợ công ty
  const ID_BEN_NO = env.sql(`SELECT party_id AS id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`)[0]?.id;
  assert.ok(congTyTen && ID_CONG_TY && ID_BEN_NO, `không đọc được hồ sơ công ty chủ / nhân viên Bán hàng từ D1 tạm: ${congTyTen} ${ID_CONG_TY} ${ID_BEN_NO}`);
  const soDu = (orderId) => env.sql(`SELECT COALESCE(SUM(amount), 0) AS n, COUNT(*) AS c FROM bil_debt_line WHERE order_id = '${orderId}'`)[0];

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
  /** Chờ màn đã vẽ xong: nội dung hiện và mỗi khối đang hiện đã có thẻ hoặc câu rỗng. */
  const choManHinh = (p) => p.waitFor(`(() => { const nd = document.getElementById('dc-noi-dung'); if (!nd || nd.hidden) return false;
    return [['dc-khoi-duyet', 'dc-duyet-ds', 'dc-duyet-rong'], ['dc-khoi-cua-toi', 'dc-cua-toi-ds', 'dc-cua-toi-rong']].every(([k, d, r]) => document.getElementById(k).hidden || document.getElementById(d).children.length > 0 || !document.getElementById(r).hidden); })()`, "màn Điều chỉnh công nợ vẽ xong");
  const taiLai = async (p) => { await p.send("Page.reload"); await p.waitFor("document.readyState === 'complete'", "tải lại"); await choManHinh(p); };
  const choBiChan = (p) => p.waitFor("(() => { const e = document.getElementById('error'); return !!e && !e.hidden && e.textContent.length > 0; })()", "câu chặn trang");
  const nhanMuc = (p) => p.ev("[...document.querySelectorAll('#sidebar .sidebar-item .sidebar-item-label')].map((e) => e.textContent.trim())");
  /** Các thẻ (li) của một danh sách: mã, trạng thái, các nút, chữ. */
  const the = (p, danhSachId) => p.ev(`[...document.querySelectorAll('#${danhSachId} > li')].map((li) => ({ id: li.dataset.id, tt: li.dataset.trangThai, nut: [...li.querySelectorAll('.dc-nut button[data-act]')].map((b) => b.dataset.act), chu: li.innerText }))`);
  const hienLoi = (p) => p.ev("(() => { const e = document.getElementById('error'); return e.hidden ? '' : e.textContent; })()");
  const hienOk = (p) => p.ev("(() => { const e = document.getElementById('ok'); return e.hidden ? '' : e.textContent; })()");
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const taoTrongTrang = async (p, don, soTien, lyDo) =>
    phai(await goiTrongTrang(p, "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId: don.id, benNo: ID_BEN_NO, benDuocNo: ID_CONG_TY, loaiDong: "HELD", soTien, lyDo }), 201, `tạo yêu cầu ${soTien}`).yeuCauId;

  /** Gõ rồi chọn một gợi ý của ô tìm (debounce 250ms): `chu` là chữ gõ, `khop` là chữ phải có trong nút gợi ý. */
  async function timVaChon(p, qId, kqId, chu, khop) {
    await p.ev(setInput(`document.getElementById(${JSON.stringify(qId)})`, chu));
    await p.waitFor(`[...document.querySelectorAll('#${kqId}:not([hidden]) .dc-kq-nut')].some((b) => b.textContent.includes(${JSON.stringify(khop)}))`, `gợi ý «${khop}» ở ${qId}`);
    assert.equal(await p.ev(`(() => { const b = [...document.querySelectorAll('#${kqId} .dc-kq-nut')].find((x) => x.textContent.includes(${JSON.stringify(khop)})); b.click(); return true; })()`), true);
  }
  const chonLoai = (p, loai) => p.ev(`(() => { const s = document.getElementById('dc-loai'); s.value = ${JSON.stringify(loai)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const guiBieuMau = async (p) => {
    assert.equal(await bam(p, "#dc-gui-btn"), true);
    await p.waitFor("(() => { const o = document.getElementById('ok'), e = document.getElementById('error'); return !o.hidden || !e.hidden; })()", "kết quả gửi yêu cầu");
  };
  /** Điền ba ô tìm, loại, tiền, lý do rồi gửi (thao tác như người dùng). */
  async function dienVaGui(p, { maDon, benNo, benDuocNo, loai, soTien, lyDo }) {
    await timVaChon(p, "dc-don-q", "dc-don-kq", maDon, maDon);
    await timVaChon(p, "dc-no-q", "dc-no-kq", benNo.slice(0, 5), benNo);
    await timVaChon(p, "dc-duoc-q", "dc-duoc-kq", benDuocNo.slice(0, 5), benDuocNo);
    await chonLoai(p, loai);
    await p.ev(setInput("document.getElementById('dc-so-tien')", soTien));
    await p.ev(setInput("document.getElementById('dc-ly-do')", lyDo));
    await guiBieuMau(p);
  }
  const nutGuiBam = (p) => p.ev("!document.getElementById('dc-gui-btn').disabled");

  let dauTien = true;
  try {
  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;
    // ---- dựng dữ liệu bằng API (chưa mở trang nào): một đơn đã xác nhận 1 người lớn × 1.350.000 ₫ ----
    const don = await lapDon(`Khách Điều Chỉnh ${tenKho}`, tenKho === "390" ? "0900001390" : "0900001040", 1);
    const maDon = don.orderCode;
    let r1 = null;
    let r2 = null;
    let r3 = null;

    // ======================= Kế toán: mở màn, ca bị chặn, gửi, nút của người gửi, rút =======================
    {
      const p = await moTrang(ACCOUNTS.accounting, "/dieu-chinh-cong-no", vp);
      try {
        await choManHinh(p);
        await buoc(`1${kho}`, "Kế toán mở màn: tiêu đề, câu giải thích, ba khối hiện; lần đầu hai khối rỗng đúng chữ; ô gõ ≥ 16px, không tràn ngang", async () => {
          assert.equal(await p.ev("document.querySelector('h1').textContent"), "Điều chỉnh công nợ");
          assert.equal(await p.ev("document.title"), "Điều chỉnh công nợ — Island Booking System");
          assert.equal(await p.ev("document.getElementById('dc-giai-thich').textContent"), CAU_GIAI_THICH);
          assert.deepEqual(await p.ev("['dc-khoi-duyet', 'dc-khoi-gui', 'dc-khoi-cua-toi'].map((k) => document.getElementById(k).hidden)"), [false, false, false]);
          assert.equal(await hienLoi(p), "", "không có câu lỗi khi mở màn");
          if (dauTien) {
            assert.equal(await p.ev("document.getElementById('dc-duyet-rong').textContent"), CAU_RONG_CHO_DUYET);
            assert.equal(await p.ev("document.getElementById('dc-cua-toi-rong').textContent"), CAU_RONG_CUA_TOI);
            assert.deepEqual([await the(p, "dc-duyet-ds"), await the(p, "dc-cua-toi-ds")], [[], []]);
          }
          assert.deepEqual(await p.ev("[...document.querySelectorAll('#dc-loai option')].map((o) => o.textContent)"), ["Tiền đang giữ hộ", "Quyết toán (nộp / trả)", "Hoàn khách"]);
          assert.equal(await p.ev("document.getElementById('dc-da-chon').textContent"), "Chưa chọn đơn · Chưa chọn bên nợ · Chưa chọn bên được nợ");
          await bocucSach(p, `bước 1 ${kho}`);
          await axeKiem(p, `Kế toán mở màn ${kho}`);
          if (dauTien) await chup(p, `01-ke-toan-rong-${tenKho}`);
        });
        dauTien = false;

        // số thẻ đã có trước khi thử (khổ thứ hai thấy lịch sử của khổ thứ nhất): các ca bị chặn không được làm số này tăng
        const daCo = { cho: (await the(p, "dc-duyet-ds")).length, cuaToi: (await the(p, "dc-cua-toi-ds")).length };
        const demThe = async () => ({ cho: (await the(p, "dc-duyet-ds")).length, cuaToi: (await the(p, "dc-cua-toi-ds")).length });
        await buoc(`5${kho}`, "ca bị chặn qua biểu mẫu (quyết toán khi chưa có nợ; tăng nợ vượt trần): câu tiếng Việt, không mã thô, không thẻ mới, số dư không đổi", async () => {
          await dienVaGui(p, { maDon, benNo: BEN_NO, benDuocNo: congTyTen, loai: "SETTLEMENT", soTien: "100000", lyDo: "quyết toán thử khi chưa có nợ" });
          const e1 = await hienLoi(p);
          assert.match(e1, /chưa có khoản nợ nào để quyết toán/, e1);
          assert.ok(!CHU_ANH.test(e1), `mã thô trong câu: ${e1}`);
          assert.deepEqual(await demThe(), daCo, "ca bị chặn không tạo thẻ");
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 });
          await bocucSach(p, `bước 5 ${kho} (có câu lỗi)`);
          if (vp === DESK) await chup(p, `05-ca-bi-chan-${tenKho}`);
        });
        await buoc(`5b${kho}`, "sau lỗi 409 của máy chủ nút «Gửi yêu cầu chờ duyệt» vẫn bấm được (người dùng sửa số tiền rồi gửi lại)", async () => {
          assert.equal(await nutGuiBam(p), true, "nút Gửi yêu cầu chờ duyệt còn khoá sau lỗi 409 — web/dieu-chinh-cong-no.ts, hàm chay(): nhánh 409 không gọi tat(false)");
        });
        // tải lại để các bước sau không phụ thuộc kết quả của 5b
        await taiLai(p);
        await buoc(`5c${kho}`, "tăng nợ vượt trần: câu «vượt trần» nói đúng trần của đơn, không mã thô, không thẻ mới", async () => {
          await dienVaGui(p, { maDon, benNo: BEN_NO, benDuocNo: congTyTen, loai: "HELD", soTien: "5000000", lyDo: "tăng nợ thử vượt trần" });
          const e2 = await hienLoi(p);
          assert.match(e2, /Điều chỉnh tăng nợ vượt trần của đơn \(1\.350\.000 ₫/, e2);
          assert.ok(!CHU_ANH.test(e2), `mã thô trong câu: ${e2}`);
          assert.deepEqual(await demThe(), daCo, "ca bị chặn không tạo thẻ");
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 });
        });
        await taiLai(p);

        await buoc(`2${kho}`, "gửi yêu cầu bằng biểu mẫu thật: câu «Đã gửi…», thẻ «Chờ duyệt» ở cả hai khối, số dư CHƯA đổi, biểu mẫu được xoá", async () => {
          await dienVaGui(p, { maDon, benNo: BEN_NO, benDuocNo: congTyTen, loai: "HELD", soTien: "200000", lyDo: "khách gửi thêm tiền qua nhân viên" });
          assert.equal(await hienOk(p), CAU_GUI_XONG);
          assert.equal(await hienLoi(p), "");
          await p.waitFor(`document.getElementById('dc-cua-toi-ds').children.length === ${daCo.cuaToi + 1}`, "thẻ của tôi");
          const cho = await the(p, "dc-duyet-ds");
          const moi = (await the(p, "dc-cua-toi-ds")).filter((t) => t.tt === "cho_duyet");
          assert.equal(cho.length, 1);
          assert.equal(moi.length, 1);
          for (const t of [cho[0], moi[0]]) {
            assert.equal(t.tt, "cho_duyet");
            assert.ok(t.chu.includes(NHAN.cho_duyet), t.chu);
            assert.ok(t.chu.includes(maDon), "thẻ ghi mã đơn");
            assert.ok(t.chu.includes("Tăng nợ"), "thẻ ghi hướng Tăng nợ");
            assert.ok(t.chu.includes(`${BEN_NO} nợ ${congTyTen} 200.000 ₫ · Tiền đang giữ hộ`), t.chu);
            assert.ok(t.chu.includes("khách gửi thêm tiền qua nhân viên"));
            assert.match(t.chu, /Gửi bởi Kế Toán · hạn duyệt/);
          }
          assert.equal(cho[0].id, moi[0].id, "cùng một yêu cầu ở hai khối");
          r1 = moi[0].id;
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 }, "chờ duyệt: số dư (dòng nợ) CHƯA đổi");
          assert.equal(await p.ev("document.getElementById('dc-ly-do').value + document.getElementById('dc-so-tien').value"), "", "biểu mẫu được xoá sau khi gửi");
          await bocucSach(p, `bước 2 ${kho}`);
          await axeKiem(p, `Kế toán sau khi gửi ${kho}`);
          await chup(p, `02-ke-toan-cho-duyet-${tenKho}`);
        });
        await buoc(`2b${kho}`, "sau khi gửi xong nút «Gửi yêu cầu chờ duyệt» bấm lại được (gửi yêu cầu thứ hai không cần tải lại trang)", async () => {
          assert.equal(await nutGuiBam(p), true, "nút Gửi yêu cầu chờ duyệt còn khoá sau khi gửi thành công — web/dieu-chinh-cong-no.ts, hàm chay(): nhánh thành công không gọi tat(false)");
        });
        if (!r1) loi.push(`${kho}: bước 2 không tạo được yêu cầu — bỏ các bước dùng yêu cầu đó`);

        if (r1) await buoc(`3${kho}`, "người gửi KHÔNG có nút Duyệt / Từ chối ở cả hai khối, chỉ có «Rút yêu cầu»; tự duyệt bằng lời gọi trực tiếp ⇒ 409 tiếng Việt", async () => {
          const nut = [...(await the(p, "dc-duyet-ds")), ...(await the(p, "dc-cua-toi-ds"))].map((t) => t.nut);
          for (const n of nut) assert.ok(!n.includes("duyet") && !n.includes("tu-choi"), `người gửi thấy nút duyệt / từ chối: ${JSON.stringify(nut)}`);
          assert.deepEqual((await the(p, "dc-cua-toi-ds")).find((t) => t.id === r1).nut, ["rut"]);
          // «Rút yêu cầu» hiện ở CẢ hai khối (khối Chờ duyệt cũng vẽ yêu cầu của chính mình): mọi nút hành động trong thẻ chỉ có thể là «Rút yêu cầu»
          assert.deepEqual(await p.ev("[...new Set([...document.querySelectorAll('main .dc-nut button')].map((b) => b.textContent.trim()))]"), ["Rút yêu cầu"]);
          const tuDuyet = await goiTrongTrang(p, "POST", `/api/ledger/adjustment-requests/${r1}/approve`);
          assert.equal(tuDuyet.status, 409);
          assert.equal(tuDuyet.json?.error?.message, CAU_TU_DUYET);
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 });
        });

        if (r1) await buoc(`2c${kho}`, "tạo thêm hai yêu cầu; bấm «Rút yêu cầu» ⇒ nhãn «Đã rút», hết nút, và hết khỏi khối Chờ duyệt", async () => {
          r2 = await taoTrongTrang(p, don, 100000, "yêu cầu thứ hai để thử từ chối");
          r3 = await taoTrongTrang(p, don, 50000, "yêu cầu thứ ba để thử rút");
          await taiLai(p);
          assert.equal((await the(p, "dc-cua-toi-ds")).length, daCo.cuaToi + 3);
          assert.equal(await bam(p, `#dc-cua-toi-ds > li[data-id="${r3}"] button[data-act="rut"]`), true);
          await p.waitFor(`document.querySelector('#dc-cua-toi-ds > li[data-id="${r3}"]').dataset.trangThai === 'da_rut'`, "thẻ chuyển «Đã rút»");
          assert.equal(await hienOk(p), "Đã rút yêu cầu.");
          const t3 = (await the(p, "dc-cua-toi-ds")).find((t) => t.id === r3);
          assert.deepEqual(t3.nut, []);
          assert.ok(t3.chu.includes(NHAN.da_rut) && /Kế Toán đã rút/.test(t3.chu), t3.chu);
          assert.deepEqual((await the(p, "dc-duyet-ds")).map((t) => t.id).sort(), [r1, r2].sort(), "khối Chờ duyệt còn đúng hai yêu cầu chưa quyết");
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 });
        });
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Kế toán ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }
    if (!r1 || !r2 || !r3) { loi.push(`${kho}: thiếu yêu cầu để thử Quản trị / Toàn quyền — bỏ phần còn lại của khổ này`); continue; }

    // ======================= Quản trị: chỉ thấy khối Chờ duyệt; từ chối thiếu lý do / có lý do; duyệt =======================
    {
      const p = await moTrang(ACCOUNTS.admin, "/dieu-chinh-cong-no", vp);
      try {
        await choManHinh(p);
        await buoc(`6${kho}`, "Quản trị: CHỈ khối «Chờ duyệt» (không «Gửi yêu cầu mới», không «Yêu cầu của tôi»); thấy hai yêu cầu chờ với Duyệt + Từ chối, không thấy yêu cầu đã rút; không gọi được /api/ledger", async () => {
          assert.deepEqual(await p.ev("['dc-khoi-duyet', 'dc-khoi-gui', 'dc-khoi-cua-toi'].map((k) => document.getElementById(k).hidden)"), [false, true, true]);
          const cho = await the(p, "dc-duyet-ds");
          assert.deepEqual(cho.map((t) => t.id).sort(), [r1, r2].sort());
          for (const t of cho) { assert.deepEqual(t.nut, ["duyet", "tu-choi"]); assert.equal(t.tt, "cho_duyet"); assert.match(t.chu, /Gửi bởi Kế Toán · hạn duyệt/); }
          assert.equal(await p.ev("document.getElementById('dc-giai-thich').textContent"), CAU_GIAI_THICH);
          const so = await goiTrongTrang(p, "GET", "/api/ledger");
          assert.equal(so.status, 403, "Quản trị không xem được sổ công nợ");
          const ds = await goiTrongTrang(p, "GET", "/api/ledger/adjustment-requests");
          assert.equal(ds.status, 200);
          assert.equal(ds.json.xemDayDu, false);
          assert.equal(ds.json.coTheTao, false);
          assert.ok(ds.json.yeuCau.every((y) => y.trangThai === "cho_duyet"), "Quản trị không thấy yêu cầu đã quyết");
          await bocucSach(p, `bước 6 ${kho}`);
          await axeKiem(p, `Quản trị ${kho}`);
          await chup(p, `06-quan-tri-cho-duyet-${tenKho}`);
        });

        await buoc(`4a${kho}`, "«Từ chối» mở ô lý do (≥ 16px, vừa khung); xác nhận thiếu lý do ⇒ «Cần ghi lý do.», thẻ còn nguyên; có lý do ⇒ thẻ biến khỏi danh sách của Quản trị", async () => {
          assert.equal(await p.ev(`document.querySelector('#dc-duyet-ds > li[data-id="${r2}"] .dc-tu-choi').hidden`), true, "ô lý do ẩn lúc đầu");
          assert.equal(await bam(p, `#dc-duyet-ds > li[data-id="${r2}"] button[data-act="tu-choi"]`), true);
          await p.waitFor(`!document.querySelector('#dc-duyet-ds > li[data-id="${r2}"] .dc-tu-choi').hidden`, "ô lý do hiện");
          await bocucSach(p, `bước 4a ${kho} (ô lý do mở)`);
          assert.equal(await p.ev(`document.querySelector('#dc-duyet-ds > li[data-id="${r2}"] textarea').getAttribute('aria-label')`), "Lý do từ chối (bắt buộc)");
          if (vp === MOB) await chup(p, `04a-quan-tri-tu-choi-${tenKho}`);
          assert.equal(await bam(p, `#dc-duyet-ds > li[data-id="${r2}"] button[data-act="chot-tu-choi"]`), true);
          await p.waitFor("!document.getElementById('error').hidden", "câu thiếu lý do");
          assert.equal(await hienLoi(p), CAU_THIEU_LY_DO);
          const sau = (await the(p, "dc-duyet-ds")).find((t) => t.id === r2);
          assert.ok(sau && sau.tt === "cho_duyet", "thẻ còn nguyên sau khi thiếu lý do");
          assert.equal(await p.ev(`document.querySelector('#dc-duyet-ds > li[data-id="${r2}"] button[data-act="chot-tu-choi"]').disabled`), false, "nút xác nhận bấm lại được");
          await p.ev(setInput(`document.querySelector('#dc-duyet-ds > li[data-id="${r2}"] textarea')`, LY_DO_TU_CHOI));
          assert.equal(await bam(p, `#dc-duyet-ds > li[data-id="${r2}"] button[data-act="chot-tu-choi"]`), true);
          await p.waitFor(`!document.querySelector('#dc-duyet-ds > li[data-id="${r2}"]')`, "thẻ bị từ chối biến khỏi danh sách");
          assert.equal(await hienOk(p), "Đã từ chối yêu cầu.");
          assert.equal(await hienLoi(p), "");
          assert.deepEqual((await the(p, "dc-duyet-ds")).map((t) => t.id), [r1]);
          assert.deepEqual(await soDu(don.id), { n: 0, c: 0 }, "từ chối: số dư không đổi");
        });

        await buoc(`4b${kho}`, "«Duyệt» ⇒ «Đã duyệt — số dư đã đổi.», danh sách chờ rỗng đúng chữ, số dư trong D1 đổi đúng số tiền", async () => {
          assert.equal(await bam(p, `#dc-duyet-ds > li[data-id="${r1}"] button[data-act="duyet"]`), true);
          await p.waitFor(`!document.querySelector('#dc-duyet-ds > li[data-id="${r1}"]')`, "thẻ đã duyệt biến khỏi khối Chờ duyệt");
          assert.equal(await hienOk(p), "Đã duyệt — số dư đã đổi.");
          assert.equal(await p.ev("document.getElementById('dc-duyet-rong').textContent"), CAU_RONG_CHO_DUYET);
          assert.deepEqual(await soDu(don.id), { n: 200000, c: 1 }, "số dư đổi đúng 200.000 ₫ ở lúc duyệt");
          await bocucSach(p, `bước 4b ${kho}`);
        });

        if (vp === DESK) {
          await buoc(`9${kho}`, "thanh bên của Quản trị: có mục «Điều chỉnh công nợ» và đúng 20 mục .sidebar-item (+ nút «Tạo đơn» = 21 theo bảng; menu theo việc 15/10)", async () => {
            const nhan = await nhanMuc(p);
            assert.ok(nhan.includes("Điều chỉnh công nợ"), JSON.stringify(nhan));
            ghiChu.push(`thanh bên Quản trị (1040): ${nhan.length} mục`);
            assert.equal(nhan.length, 20, `thanh bên Quản trị: ${nhan.length} mục: ${JSON.stringify(nhan)}`);
          });
        }
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }
    if (vp === MOB) {
      for (const [ten, tk, co] of [["Quản trị", ACCOUNTS.admin, true], ["Kế toán", ACCOUNTS.accounting, true], ["Bán hàng", ACCOUNTS.salesA, false]]) {
        const p = await moTrang(tk, "/account", vp);
        try {
          await buoc(`6c${kho}`, `điện thoại: trang Tôi của ${ten} ${co ? "CÓ" : "KHÔNG có"} mục «Điều chỉnh công nợ»`, async () => {
            await p.waitFor("document.querySelectorAll('main a, main button').length > 3", "trang Tôi vẽ xong");
            assert.equal(await p.ev("[...document.querySelectorAll('main a')].some((a) => a.textContent.trim() === 'Điều chỉnh công nợ')"), co);
          });
        } finally { p.close(); }
      }
    }

    // ======================= Toàn quyền: gửi yêu cầu của chính mình cũng không có nút Duyệt =======================
    {
      const p = await moTrang(ACCOUNTS.chu, "/dieu-chinh-cong-no", vp);
      try {
        await choManHinh(p);
        await buoc(`4c${kho}`, "Toàn quyền thấy cả ba khối; yêu cầu do chính mình gửi không có Duyệt / Từ chối, chỉ «Rút yêu cầu»; xem được sổ (/api/ledger 200)", async () => {
          assert.deepEqual(await p.ev("['dc-khoi-duyet', 'dc-khoi-gui', 'dc-khoi-cua-toi'].map((k) => document.getElementById(k).hidden)"), [false, false, false]);
          assert.equal(await p.ev("document.getElementById('dc-duyet-rong').textContent"), CAU_RONG_CHO_DUYET);
          const r4 = await taoTrongTrang(p, don, 10000, "yêu cầu của Toàn quyền để thử nút");
          await taiLai(p);
          const nut = [...(await the(p, "dc-duyet-ds")), ...(await the(p, "dc-cua-toi-ds"))].filter((t) => t.tt === "cho_duyet").map((t) => t.nut);
          assert.deepEqual(nut, [["rut"], ["rut"]], "yêu cầu đang chờ của chính Toàn quyền (ở hai khối) chỉ có «Rút yêu cầu»");
          assert.equal((await goiTrongTrang(p, "GET", "/api/ledger")).status, 200);
          assert.equal(await bam(p, `#dc-cua-toi-ds > li[data-id="${r4}"] button[data-act="rut"]`), true);
          await p.waitFor(`document.querySelector('#dc-cua-toi-ds > li[data-id="${r4}"]').dataset.trangThai === 'da_rut'`, "đã rút");
          await bocucSach(p, `bước 4c ${kho}`);
          await axeKiem(p, `Toàn quyền ${kho}`);
        });
        if (vp === DESK) {
          await buoc(`9b${kho}`, "thanh bên của Toàn quyền (Quản trị + Toàn quyền): có «Điều chỉnh công nợ» và đúng 27 mục .sidebar-item (+ nút «Tạo đơn» = 28 theo bảng; menu theo việc 15/10)", async () => {
            const nhan = await nhanMuc(p);
            assert.ok(nhan.includes("Điều chỉnh công nợ"), JSON.stringify(nhan));
            ghiChu.push(`thanh bên Toàn quyền (1040): ${nhan.length} mục`);
            assert.equal(nhan.length, 27, `thanh bên Toàn quyền: ${nhan.length} mục: ${JSON.stringify(nhan)}`);
          });
        }
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Toàn quyền ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }

    // ======================= Kế toán xem kết quả; giảm nợ vượt số đang nợ =======================
    {
      const p = await moTrang(ACCOUNTS.accounting, "/dieu-chinh-cong-no", vp);
      try {
        await choManHinh(p);
        await buoc(`4d${kho}`, "Kế toán thấy kết quả ở «Yêu cầu của tôi»: Đã duyệt (ai duyệt), Bị từ chối kèm đúng lý do người duyệt gõ, Đã rút; khối Chờ duyệt rỗng", async () => {
          const ds = await the(p, "dc-cua-toi-ds");
          const t1 = ds.find((t) => t.id === r1);
          const t2 = ds.find((t) => t.id === r2);
          const t3 = ds.find((t) => t.id === r3);
          assert.equal(t1.tt, "da_duyet");
          assert.ok(t1.chu.includes(NHAN.da_duyet) && t1.chu.includes("Quản Trị đã duyệt"), t1.chu);
          assert.equal(t2.tt, "tu_choi");
          assert.ok(t2.chu.includes(NHAN.tu_choi) && t2.chu.includes(`Quản Trị từ chối: ${LY_DO_TU_CHOI}`), t2.chu);
          assert.equal(t3.tt, "da_rut");
          for (const t of [t1, t2, t3]) assert.deepEqual(t.nut, [], "yêu cầu đã quyết không còn nút");
          assert.equal(await p.ev("document.getElementById('dc-duyet-rong').textContent"), CAU_RONG_CHO_DUYET);
          assert.deepEqual(await soDu(don.id), { n: 200000, c: 1 });
          await bocucSach(p, `bước 4d ${kho}`);
          await axeKiem(p, `Kế toán sau khi quyết ${kho}`);
          await chup(p, `04d-ke-toan-ket-qua-${tenKho}`);
        });
        await buoc(`5d${kho}`, "giảm nợ vượt số đang nợ (300.000 ₫ trên khoản nợ 200.000 ₫): câu tiếng Việt nói đúng số đang nợ, không mã thô, không thẻ mới", async () => {
          const truoc = (await the(p, "dc-cua-toi-ds")).length;
          await dienVaGui(p, { maDon, benNo: congTyTen, benDuocNo: BEN_NO, loai: "HELD", soTien: "300000", lyDo: "giảm nợ thử vượt số đang nợ" });
          const e = await hienLoi(p);
          assert.match(e, /Điều chỉnh giảm nợ vượt số đang nợ trên đơn \(200\.000 ₫\)/, e);
          assert.ok(!CHU_ANH.test(e), `mã thô trong câu: ${e}`);
          assert.equal((await the(p, "dc-cua-toi-ds")).length, truoc, "không tạo thẻ mới");
          assert.deepEqual(await soDu(don.id), { n: 200000, c: 1 });
          await bocucSach(p, `bước 5d ${kho}`);
        });
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Kế toán, lần hai ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }

    // ======================= Bán hàng: không có mục menu, trang bị chặn bằng câu tiếng Việt =======================
    {
      const p = await moTrang(ACCOUNTS.salesA, "/dieu-chinh-cong-no", vp);
      try {
        await choBiChan(p);
        await buoc(`6b${kho}`, "Bán hàng: trang chặn bằng câu tiếng Việt, không khối nào hiện, API trả 403; không có mục «Điều chỉnh công nợ» trong thanh bên", async () => {
          assert.equal(await hienLoi(p), CAU_BI_CHAN_TRANG);
          assert.equal(await p.ev("document.getElementById('dc-noi-dung').hidden"), true);
          assert.equal((await goiTrongTrang(p, "GET", "/api/ledger/adjustment-requests")).status, 403);
          assert.equal((await goiTrongTrang(p, "POST", `/api/ledger/adjustment-requests/${r1}/approve`)).status, 403);
          if (vp === DESK) {
            const nhan = await nhanMuc(p);
            assert.ok(nhan.length > 0 && !nhan.includes("Điều chỉnh công nợ"), JSON.stringify(nhan));
          }
          await axeKiem(p, `Bán hàng bị chặn ${kho}`);
          if (vp === MOB) await chup(p, `06b-ban-hang-bi-chan-${tenKho}`);
        });
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }
  }

  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo DC_DUNG=${DUNG})`); }

  // ======================= 1280: chỉ đo bố cục (Kế toán, với lịch sử đã có ở hai lần chạy trước) =======================
  if (!DUNG && !process.env.DC_KHO) {
    const p = await moTrang(ACCOUNTS.accounting, "/dieu-chinh-cong-no", RONG);
    try {
      await choManHinh(p);
      await buoc("7[1280]", "máy tính rộng 1280: không tràn ngang, ô gõ ≥ 16px, không chữ Anh; <main> không vượt trần --w-main", async () => {
        await bocucSach(p, "1280");
        const m = await p.ev("(() => ({ w: Math.round(document.querySelector('main').getBoundingClientRect().width), tran: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-main')) }))()");
        assert.ok(m.w <= m.tran, `<main> rộng ${m.w}px, vượt trần --w-main ${m.tran}px`);
        await chup(p, "07-ke-toan-1280");
      });
    } finally { p.close(); }
  }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
for (const g of ghiChu) console.log(`ℹ ${g}`);
if (axeNhe.length) console.log(`\naxe nhẹ (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nDIEU CHINH SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nDIEU CHINH SMOKE OK");
