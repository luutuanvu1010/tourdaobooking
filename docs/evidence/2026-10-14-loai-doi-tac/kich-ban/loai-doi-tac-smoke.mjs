// Kịch bản Chrome — mục «Loại đối tác» ở /hoa-hong và ô chọn «Thêm công việc» ở Danh bạ (ADR-0117 lần 1, migration 0095). Đây là rào DUY NHẤT cho phần GIAO DIỆN của loại đối tác:
// `npm test` canh máy chủ + CSDL (src/modules/pricing/loai-doi-tac.test.ts…), `tests/e2e/loai-doi-tac.mjs` canh HTTP thật, nhưng không bài nào mở trang. Kịch bản kiểm:
//   1) Kế toán mở /hoa-hong: mục «Loại đối tác» hiện; năm loại có sẵn đều «Có sẵn» + «Đang dùng» và KHÔNG có nút Tắt / Bật; ô «Tên loại mới» + nút «Thêm loại» hiện;
//   2) gõ tên và bấm «Thêm loại» BẰNG BIỂU MẪU THẬT: câu «Đã thêm loại …», dòng mới «Do Kế toán thêm» + «Đang dùng» + nút «Tắt»; ô «Loại đối tác» của khối «Thêm mức» thấy loại mới
//      NGAY (không tải lại trang); tên trùng và tên có số điện thoại hiện đúng câu tiếng Việt của máy chủ;
//   3) «Tắt» ⇒ «Đã tắt» + nút «Bật», ô chọn ở «Thêm mức» mất loại đó; «Bật» ⇒ quay lại; nút cũ sau khi loại bị tắt từ nơi khác ⇒ câu 409 của máy chủ + danh sách tự tải lại;
//   4) Bán hàng mở /hoa-hong: thấy danh sách, KHÔNG có ô «Tên loại mới» và không nút nào, máy chủ từ chối thêm (403); (tài khoản không có quyền xem thì trang chặn bằng câu tiếng Việt — canh ở so-dai-ly-smoke);
//   5) Quản trị mở hồ sơ tổ chức ở Danh bạ: ô chọn «Thêm công việc» có loại mới kèm « (đối tác)» và các loại công việc khác (Nhà cung cấp…) KHÔNG có hậu tố; thêm bằng giao diện ⇒ dòng công việc hiện tên;
//   6) hai khổ 390 và 1040: không tràn ngang, ô gõ ≥ 16px, không chữ Anh / mã thô (kể cả mã loại LD_XXXXXXXX) lộ ra; 7) axe-core (critical / serious ⇒ đỏ).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production, danh mục giả (không Sheet).
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản làm phiên của trang đang mở bị thay ⇒ dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi lúc chỉ một trang mở,
// đóng trang trước khi mở trang kế (kho cookie của Chrome dùng chung).
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`, giải nén):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-14-loai-doi-tac/kich-ban/loai-doi-tac-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-14-loai-doi-tac/anh/ (đặt OUT=<thư mục> để ghi chỗ khác). Mỗi bước chạy riêng; cuối cùng in "LOAI DOI TAC SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
// PHÁ THỬ (P16 — quan sát kịch bản chặn thật, KHÔNG sửa mã sản phẩm): LD_PHA=co-san gắn vào trang một lớp bọc `fetch` giả «máy chủ coi mọi loại là do Kế toán thêm» ⇒ bước 1 phải ĐỎ
// (nút Tắt hiện ở loại có sẵn); LD_PHA=lo-ma gắn lớp bọc làm tên loại mới thành mã thô ⇒ bước 2 phải ĐỎ (lộ mã LD_…). LD_KHO=390|1040 chạy một khổ; LD_DUNG=<mã bước> dừng sau bước đó.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe(); // thiếu AXE_JS ⇒ dừng NGAY, trước khi dựng môi trường
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-14-loai-doi-tac/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.LD_KHO || process.env.LD_KHO === ten);
const DUNG = process.env.LD_DUNG ?? "";
const PHA = process.env.LD_PHA ?? "";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/hoa-hong-hien-thi.ts, public/hoa-hong.html và src/modules/parties/rules.ts (viết lại ở đây có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const NAM_LOAI_CO_SAN = ["Công ty lữ hành", "Cộng tác viên", "Hướng dẫn viên độc lập", "Lễ tân khách sạn", "Tài xế taxi (giới thiệu khách)"];
const CAU_TRUNG = "Đã có loại với tên này.";
const CAU_CO_SDT = "Tên loại đối tác không được chứa số điện thoại, số tài khoản hay địa chỉ email.";
const CAU_DA_TAT = "Loại này đã tắt rồi — tải lại.";
const CHU_ANH = /\b(LD_[A-Z]{8}|loai_trung|invalid_input|forbidden|stale|role_\w+|undefined|null|NaN|Internal Server Error)\b|\[object/;

const PHA_TRANG = PHA
  ? `{ const PHA = ${JSON.stringify(PHA)}; const f = window.fetch.bind(window);
    window.fetch = async (u, o) => { const ur = String(u); const post = !!(o && o.method && o.method !== 'GET');
      const r = await f(u, o);
      if (PHA === 'co-san' && !post && ur.endsWith('/api/pricing/loai-doi-tac') && r.ok) { const b = await r.clone().json(); for (const l of b.loai) l.coSan = false;
        return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
      if (PHA === 'lo-ma' && !post && ur.endsWith('/api/pricing/loai-doi-tac') && r.ok) { const b = await r.clone().json(); for (const l of b.loai) if (!l.coSan) l.ten = l.code;
        return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
      return r; }; }`
  : "";

// ---- chạy từng bước, gom lỗi ----
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
async function chup(p, ten) {
  await sleep(500);
  // Ảnh chụp cả trang: thanh tab dưới (#tabbar) và nút nổi Hỗ trợ (.tl-fab) là phần tử cố định nên đè lên giữa ảnh dài — ẩn CHỈ lúc chụp (kiểm màu / bố cục chạy khi chúng còn hiện).
  await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
const daBiet = [];
/** `ghiTuongPhan`: lỗi tương phản màu (color-contrast) KHÔNG làm đỏ mà ghi nguyên văn vào `daBiet` — dùng cho trạng thái «Đã tắt», nơi dòng mờ bằng `.row-off { opacity: .6 }` (khuôn sẵn của dự án, dùng chung với dòng mức đã đóng); lỗi axe khác vẫn làm đỏ. */
async function axeKiem(p, nhan, { ghiTuongPhan = false } = {}) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  let nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  if (ghiTuongPhan) {
    for (const v of nang.filter((x) => x.id === "color-contrast")) daBiet.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
    nang = nang.filter((x) => x.id !== "color-contrast");
  }
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
  const { call } = goiApi(env);
  const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ (tên loại không được có dãy ≥ 8 chữ số)
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

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
  const choMucLoai = (p) => p.waitFor("(() => { const nd = document.getElementById('hh-noi-dung'); return !!nd && !nd.hidden && document.querySelectorAll('#loai-list > li').length > 0; })()", "mục Loại đối tác đã vẽ");
  /** Các dòng của mục «Loại đối tác»: tên, chữ nguồn, trạng thái, nút (hành động) — đọc từ DOM. */
  const dongLoai = (p) => p.ev(`[...document.querySelectorAll('#loai-list > li')].map((li) => ({ ten: li.querySelector('strong').textContent, chu: li.innerText, off: li.classList.contains('row-off'),
    nut: [...li.querySelectorAll('button[data-loai-act]')].map((b) => ({ act: b.dataset.loaiAct, nhan: b.textContent.trim(), aria: b.getAttribute('aria-label') })) }))`);
  const oChonVai = (p) => p.ev("[...document.querySelectorAll('#muc-vai option')].map((o) => o.textContent)");
  const hienLoiLoai = (p) => p.ev("(() => { const e = document.getElementById('loai-loi'); return e.hidden ? '' : e.textContent; })()");
  const hienOk = (p) => p.ev("(() => { const e = document.getElementById('ok'); return e.hidden ? '' : e.textContent; })()");
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  /** Gõ tên và bấm «Thêm loại» như người dùng; chờ có câu kết quả (ok hoặc lỗi). */
  async function themLoaiBangGiaoDien(p, ten) {
    await p.ev("(() => { document.getElementById('ok').hidden = true; return true; })()");
    await p.ev(setInput("document.getElementById('loai-ten')", ten));
    assert.equal(await bam(p, "#loai-add-form button[type=submit]"), true);
    await p.waitFor("(() => { const o = document.getElementById('ok'), e = document.getElementById('loai-loi'); return !o.hidden || !e.hidden; })()", "kết quả thêm loại");
  }
  const bamNutLoai = async (p, ten, act) => {
    assert.equal(await p.ev(`(() => { const li = [...document.querySelectorAll('#loai-list > li')].find((x) => x.querySelector('strong').textContent === ${JSON.stringify(ten)}); const b = li && li.querySelector('button[data-loai-act=${act}]'); if (!b) return false; b.click(); return true; })()`), true, `có nút ${act} ở dòng «${ten}»`);
  };
  const choTrangThai = (p, ten, daTat) => p.waitFor(`(() => { const li = [...document.querySelectorAll('#loai-list > li')].find((x) => x.querySelector('strong').textContent === ${JSON.stringify(ten)}); return !!li && li.classList.contains('row-off') === ${daTat}; })()`, `loại «${ten}» ${daTat ? "đã tắt" : "đang dùng"}`);

  // ---- dựng dữ liệu bằng API (chưa mở trang nào) ----
  const TEN_GAN = `Nhân viên spa gắn ${CHU}`;
  const loaiGan = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: TEN_GAN }), 201, "dựng loại để gắn ở Danh bạ").loai;

  let dauTien = true;
  try {
  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;
    const TEN_MOI = `Nhân viên spa ${CHU} ${tenKho === "390" ? "M" : "D"}`; // một tên mỗi khổ, chỉ chữ
    // mỗi khổ một hồ sơ tổ chức riêng (một hồ sơ không mang cùng loại hai lần); dựng bằng API trước khi mở trang nào
    const toChuc = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Spa Hoa Sen ${CHU} ${tenKho}` }), 201, "dựng hồ sơ tổ chức").party;

    // ======================= Kế toán: mục «Loại đối tác» =======================
    {
      const p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp);
      try {
        await choMucLoai(p);
        await buoc(`1${kho}`, "Kế toán mở /hoa-hong: mục «Loại đối tác» hiện; loại có sẵn «Có sẵn» + «Đang dùng», KHÔNG nút Tắt / Bật; ô «Tên loại mới» và nút «Thêm loại»", async () => {
          assert.equal(await p.ev("document.getElementById('loai-tieu-de').textContent"), "Loại đối tác");
          const ds = await dongLoai(p);
          const coSan = ds.filter((d) => d.chu.includes("Có sẵn"));
          if (dauTien) {
            assert.deepEqual(ds.map((d) => d.ten).sort(), [...NAM_LOAI_CO_SAN, TEN_GAN].sort(), "năm loại có sẵn + loại dựng sẵn");
            assert.deepEqual(coSan.map((d) => d.ten).sort(), [...NAM_LOAI_CO_SAN].sort());
          }
          for (const d of coSan) {
            assert.ok(d.chu.includes("Đang dùng") && !d.off, `${d.ten}: đang dùng`);
            assert.deepEqual(d.nut, [], `${d.ten}: loại có sẵn không có nút Tắt / Bật`);
          }
          const gan = ds.find((d) => d.ten === TEN_GAN);
          assert.ok(gan.chu.includes("Do Kế toán thêm") && gan.chu.includes("Đang dùng"), gan.chu);
          assert.deepEqual(gan.nut, [{ act: "tat", nhan: "Tắt", aria: `Tắt loại: ${TEN_GAN}` }]);
          assert.equal(await p.ev("document.getElementById('loai-add-form').hidden"), false);
          assert.equal(await p.ev("document.getElementById('loai-ten').getAttribute('aria-label')"), "Tên loại mới");
          assert.equal(await p.ev("document.querySelector('#loai-add-form button[type=submit]').textContent"), "Thêm loại");
          assert.equal(await hienLoiLoai(p), "", "không có câu lỗi khi mở màn");
          await bocucSach(p, `bước 1 ${kho}`);
          await axeKiem(p, `Kế toán mở /hoa-hong ${kho}`);
          await chup(p, `01-ke-toan-loai-doi-tac-${tenKho}`);
        });

        await buoc(`2${kho}`, "thêm loại bằng biểu mẫu thật: câu «Đã thêm loại», dòng mới «Do Kế toán thêm» có nút Tắt, ô chọn «Thêm mức» thấy loại mới NGAY; tên trùng / có số điện thoại hiện câu máy chủ", async () => {
          assert.ok(!(await oChonVai(p)).includes(TEN_MOI));
          await themLoaiBangGiaoDien(p, TEN_MOI);
          assert.equal(await hienLoiLoai(p), "");
          assert.equal(await hienOk(p), `Đã thêm loại «${TEN_MOI}». Đặt mức cho loại này ở phần «Thêm mức» bên dưới.`);
          await p.waitFor(`[...document.querySelectorAll('#loai-list > li strong')].some((e) => e.textContent === ${JSON.stringify(TEN_MOI)})`, "dòng loại mới");
          const moi = (await dongLoai(p)).find((d) => d.ten === TEN_MOI);
          assert.ok(moi.chu.includes("Do Kế toán thêm") && moi.chu.includes("Đang dùng") && !moi.off, moi.chu);
          assert.deepEqual(moi.nut.map((n) => n.act), ["tat"]);
          assert.equal(await p.ev("document.getElementById('loai-ten').value"), "", "ô tên được xoá sau khi thêm");
          assert.ok((await oChonVai(p)).includes(TEN_MOI), `ô «Loại đối tác» của «Thêm mức» không có loại mới: ${JSON.stringify(await oChonVai(p))}`);
          await chup(p, `02-da-them-loai-${tenKho}`);
          // trùng (khác dấu, khác hoa thường) ⇒ 409 với câu của máy chủ; ô tên giữ nguyên chữ vừa gõ
          await themLoaiBangGiaoDien(p, TEN_MOI.toLowerCase().replace("nhân viên", "nhan vien"));
          assert.equal(await hienLoiLoai(p), CAU_TRUNG);
          assert.equal(await hienOk(p), "", "lỗi thì không có câu thành công");
          await themLoaiBangGiaoDien(p, "Gọi 0901234567");
          assert.equal(await hienLoiLoai(p), CAU_CO_SDT);
          assert.equal((await dongLoai(p)).filter((d) => d.ten === TEN_MOI).length, 1, "thêm trùng không tạo dòng thứ hai");
          await bocucSach(p, `bước 2 ${kho}`);
        });

        await buoc(`3${kho}`, "Tắt ⇒ «Đã tắt» + nút Bật, ô chọn mất loại; Bật ⇒ quay lại; nút cũ sau khi loại bị tắt từ nơi khác ⇒ câu 409 của máy chủ và danh sách tự tải lại", async () => {
          await bamNutLoai(p, TEN_MOI, "tat");
          await choTrangThai(p, TEN_MOI, true);
          let moi = (await dongLoai(p)).find((d) => d.ten === TEN_MOI);
          assert.ok(moi.chu.includes("Đã tắt") && moi.off, moi.chu);
          assert.deepEqual(moi.nut, [{ act: "bat", nhan: "Bật", aria: `Bật loại: ${TEN_MOI}` }]);
          assert.ok(!(await oChonVai(p)).includes(TEN_MOI), "loại đã tắt không còn ở ô chọn của «Thêm mức»");
          assert.match(await hienOk(p), /^Đã tắt loại «/);
          await chup(p, `03-da-tat-loai-${tenKho}`);
          await axeKiem(p, `Kế toán, loại ở trạng thái Đã tắt ${kho}`, { ghiTuongPhan: true }); // kiểm màu ở dòng mờ (.row-off) — khuôn sẵn của dự án
          await bamNutLoai(p, TEN_MOI, "bat");
          await choTrangThai(p, TEN_MOI, false);
          moi = (await dongLoai(p)).find((d) => d.ten === TEN_MOI);
          assert.ok(moi.chu.includes("Đang dùng"), moi.chu);
          assert.ok((await oChonVai(p)).includes(TEN_MOI), "bật lại ⇒ ô chọn có lại loại");
          // người khác tắt loại trước: gọi thẳng /tat trong trang rồi bấm nút Tắt đã cũ trên màn
          const ma = loaiCuaTen(await goiTrongTrang(p, "GET", "/api/pricing/loai-doi-tac"), TEN_MOI);
          assert.equal((await goiTrongTrang(p, "POST", `/api/pricing/loai-doi-tac/${ma}/tat`, {})).status, 200);
          await bamNutLoai(p, TEN_MOI, "tat");
          await p.waitFor(`document.getElementById('loai-loi').textContent === ${JSON.stringify(CAU_DA_TAT)}`, "câu 409 của máy chủ");
          await choTrangThai(p, TEN_MOI, true);
          assert.equal(await hienLoiLoai(p), CAU_DA_TAT, "tải lại không đè câu lỗi của máy chủ");
          await bamNutLoai(p, TEN_MOI, "bat"); // trả loại về đang dùng cho các bước sau
          await choTrangThai(p, TEN_MOI, false);
          await bocucSach(p, `bước 3 ${kho}`);
          await axeKiem(p, `Kế toán sau thao tác ${kho}`);
        });
        dauTien = false;
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Kế toán ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }

    // ======================= Bán hàng: chỉ xem =======================
    {
      const p = await moTrang(ACCOUNTS.salesA, "/hoa-hong", vp);
      try {
        await choMucLoai(p);
        await buoc(`4${kho}`, "Bán hàng mở /hoa-hong: thấy danh sách loại nhưng KHÔNG ô «Tên loại mới» và không nút Tắt / Bật; máy chủ từ chối thêm (403)", async () => {
          const ds = await dongLoai(p);
          assert.ok(ds.length >= 6, `danh sách loại: ${ds.length} dòng`);
          assert.deepEqual(ds.flatMap((d) => d.nut), [], "không nút nào");
          assert.equal(await p.ev("document.getElementById('loai-add-form').hidden"), true);
          assert.equal(await p.ev("document.getElementById('loai-ten')"), null, "ô «Tên loại mới» không được dựng");
          assert.equal((await goiTrongTrang(p, "POST", "/api/pricing/loai-doi-tac", { ten: `Loại của Bán hàng ${CHU}` })).status, 403);
          await bocucSach(p, `bước 4 ${kho}`);
          await axeKiem(p, `Bán hàng xem /hoa-hong ${kho}`);
          if (vp === MOB) await chup(p, `04-ban-hang-chi-xem-${tenKho}`);
        });
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }

    // ======================= Quản trị: Danh bạ, ô chọn «Thêm công việc» =======================
    {
      const p = await moTrang(ACCOUNTS.admin, `/parties?id=${toChuc.id}`, vp);
      try {
        await p.waitFor("[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Thêm công việc')", "hồ sơ mở xong");
        await buoc(`6${kho}`, "Quản trị mở hồ sơ tổ chức: ô «Thêm công việc» có loại mới kèm « (đối tác)», loại khác không có hậu tố; thêm bằng giao diện ⇒ dòng công việc hiện tên", async () => {
          const opts = await p.ev("(() => { const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.textContent === 'Nhà cung cấp') && ![...x.options].some((o) => o.textContent === 'Tất cả')); return s ? [...s.options].map((o) => o.textContent) : null; })()");
          assert.ok(opts, "không thấy ô chọn công việc");
          assert.ok(opts.includes(`${TEN_GAN} (đối tác)`), `thiếu «${TEN_GAN} (đối tác)»: ${JSON.stringify(opts)}`);
          assert.deepEqual(opts.filter((o) => o.endsWith("(đối tác)")).sort(), opts.filter((o) => o.endsWith("(đối tác)") && o.includes(CHU)).sort(), "chỉ loại do Kế toán thêm có hậu tố");
          assert.ok(opts.includes("Nhà cung cấp"), "loại công việc khác giữ nguyên tên, không hậu tố");
          assert.ok(!opts.some((o) => /\bLD_[A-Z]{8}\b/.test(o)), "không lộ mã loại");
          await p.ev(`(() => { const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.textContent === 'Nhà cung cấp') && ![...x.options].some((o) => o.textContent === 'Tất cả')); const o = [...s.options].find((x) => x.textContent === ${JSON.stringify(`${TEN_GAN} (đối tác)`)}); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
          await chup(p, `05-danh-ba-o-chon-${tenKho}`);
          assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Thêm công việc'); b.click(); return true; })()"), true);
          await p.waitFor(`[...document.querySelectorAll('table td')].some((td) => td.textContent === ${JSON.stringify(TEN_GAN)})`, "dòng công việc mới", 12000);
          await chup(p, `06-danh-ba-da-gan-${tenKho}`);
          await bocucSach(p, `bước 6 ${kho}`);
          await axeKiem(p, `Danh bạ hồ sơ tổ chức ${kho}`);
        });
      } finally {
        if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        p.close();
      }
    }
  }
  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo LD_DUNG=${DUNG})`); }

  function loaiCuaTen(r, ten) {
    const l = r.json.loai.find((x) => x.ten === ten);
    assert.ok(l, `không thấy loại «${ten}»`);
    return l.code;
  }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
if (daBiet.length) console.log(`\nĐÃ BIẾT (tương phản dòng mờ ở trạng thái Đã tắt — không đỏ, ghi vào README):\n  ${[...new Set(daBiet)].join("\n  ")}`);
if (axeNhe.length) console.log(`\naxe nhẹ (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nLOAI DOI TAC SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nLOAI DOI TAC SMOKE OK");
