// Kịch bản Chrome — mục «Mức TA» ở /hoa-hong (ADR-0117 lần 2, migration 0096 + 0097). Đây là rào DUY NHẤT cho phần GIAO DIỆN của mức TA: `npm test` canh máy chủ + CSDL
// (src/modules/pricing/muc-ta.test.ts…), `tests/e2e/muc-ta.mjs` canh HTTP thật, nhưng không bài nào mở trang. Kịch bản kiểm (mỗi khổ):
//   1) Kế toán mở /hoa-hong: mục «Mức TA» hiện, câu luật «không đổi mức trong cùng ngày» hiện nguyên văn, ba biểu mẫu (Thêm mức TA, Thêm dòng, Gắn mức) hiện;
//   2) thêm mức bằng BIỂU MẪU THẬT: câu «Đã thêm mức TA …», khối mức mới «Đang dùng» + nút Tắt, mức có ngay ở hai ô chọn; tên trùng (khác dấu) ⇒ câu 409 của máy chủ; không lộ mã MT_…;
//   3) thêm dòng «Một dịch vụ · 15%» cho mức ⇒ dòng hiện dưới tên mức; bảng «Các mức hiện có» KHÔNG lặp dòng của mức TA (quyết định bề mặt ii);
//   4) gắn loại SẠCH ⇒ câu «Đã gắn…», không khung vàng; gắn loại CÒN DÒNG RIÊNG ⇒ khung vàng (không chặn) có câu «Đóng các dòng này nếu muốn dùng mức TA.» + đúng dòng riêng;
//   5) Tắt ⇒ «Đã tắt» + nút Bật, mức biến khỏi hai ô chọn; Bật ⇒ quay lại; «Kết thúc gắn» mở hộp ngày có câu «chọn ngày kết thúc là hôm qua», xác nhận ⇒ gắn có ngày kết thúc;
//   6) Bán hàng mở /hoa-hong: thấy mức + dòng + gắn, KHÔNG biểu mẫu, KHÔNG nút nào của mục; máy chủ từ chối thêm mức (403);
//   7) Quản trị «Thử tra» đối tác mang loại đã gắn ⇒ câu «… mức TA của loại đối tác cho dịch vụ này: «tên mức»» (Kế toán không dùng được Thử tra — cổng order.create);
//   mỗi bước: không tràn ngang, ô gõ ≥ 16px, không chữ Anh / mã thô (kể cả MT_XXXXXXXX, LD_XXXXXXXX, muc_trung, muc_tat, prc_tier_*), axe-core (critical / serious ⇒ đỏ).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production, danh mục thử (TD101).
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản làm phiên của trang đang mở bị thay ⇒ dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi lúc chỉ một trang mở.
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`, giải nén) — THIẾU AXE_JS THÌ DỪNG NGAY (không có «xanh giả» bỏ qua kiểm màu):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-15-muc-ta/kich-ban/muc-ta-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-15-muc-ta/anh/ (OUT=<thư mục> để ghi chỗ khác). Cuối cùng in "MUC TA SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
// PHÁ THỬ (P16 — quan sát kịch bản chặn thật, KHÔNG sửa mã sản phẩm): MT_PHA=mat-canh-bao gắn vào trang lớp bọc `fetch` xoá `dongRieng` khỏi phản hồi 201 của «Gắn mức» ⇒ bước 4 ĐỎ;
// MT_PHA=lo-ma gắn lớp bọc thay tên mức bằng mã máy ⇒ bước 2 ĐỎ (lộ MT_…). MT_KHO=390|1040 chạy một khổ; MT_DUNG=<mã bước> dừng sau bước đó.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe(); // thiếu AXE_JS ⇒ dừng NGAY, trước khi dựng môi trường
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-15-muc-ta/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.MT_KHO || process.env.MT_KHO === ten);
const DUNG = process.env.MT_DUNG ?? "";
const PHA = process.env.MT_PHA ?? "";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/hoa-hong-hien-thi.ts và web/hoa-hong.ts (viết lại có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_LUAT = "Mỗi loại chỉ gắn một mức TA trong một ngày. Muốn đổi sang mức khác từ hôm nay: kết thúc gắn cũ tới hôm qua, rồi gắn mức mới từ hôm nay. Gắn bắt đầu từ hôm nay thì không đổi được trong cùng ngày.";
const CAU_TRUNG = "Đã có mức TA với tên này.";
const CAU_HOP_KET_THUC = "Muốn đổi sang mức khác từ hôm nay thì chọn ngày kết thúc là hôm qua.";
const CHU_ANH = /\b(MT_[A-Z]{8}|LD_[A-Z]{8}|muc_trung|muc_tat|prc_tier_\w+|prc_\w+|stale|invalid_input|forbidden|undefined|null|NaN|Internal Server Error)\b|\[object/;

const PHA_TRANG = PHA
  ? `{ const PHA = ${JSON.stringify(PHA)}; const f = window.fetch.bind(window);
    window.fetch = async (u, o) => { const ur = String(u); const post = !!(o && o.method && o.method !== 'GET');
      const r = await f(u, o);
      if (PHA === 'mat-canh-bao' && post && ur.endsWith('/api/pricing/muc-ta/gan') && r.status === 201) { const b = await r.clone().json(); b.dongRieng = [];
        return new Response(JSON.stringify(b), { status: 201, headers: { 'content-type': 'application/json' } }); }
      if (PHA === 'lo-ma' && !post && ur.endsWith('/api/pricing/muc-ta') && r.ok) { const b = await r.clone().json(); for (const m of b.muc) m.ten = m.code;
        return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
      return r; }; }`
  : "";

// ---- chạy từng bước, gom lỗi ----
const loi = [];
const axeNhe = [];
const anh = [];
const daBiet = [];
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
  // Ảnh cả trang: thanh tab dưới (#tabbar) và nút nổi Hỗ trợ (.tl-fab) là phần tử cố định nên đè lên giữa ảnh dài — ẩn CHỈ lúc chụp.
  await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
/** `ghiTuongPhan`: lỗi tương phản (color-contrast) KHÔNG đỏ mà ghi vào `daBiet` — chỉ dùng ở trạng thái «Đã tắt» (dòng mờ `.row-off { opacity: .6 }`, khuôn sẵn của dự án, như lần 1). */
async function axeKiem(p, nhan, { ghiTuongPhan = false } = {}) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  let nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  const ghi = [];
  if (ghiTuongPhan) {
    ghi.push(...nang.filter((x) => x.id === "color-contrast"));
    for (const v of ghi) daBiet.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
    nang = nang.filter((x) => x.id !== "color-contrast");
  }
  for (const v of vi.filter((x) => !nang.includes(x) && !ghi.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
/** Trang không tràn ngang; mọi ô gõ đang hiện ≥ 16px; không chữ Anh / mã thô trong chữ nhìn thấy của phần nội dung. */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const nho = [...document.querySelectorAll('main input, main select, main textarea')].filter((e) => e.offsetParent !== null && e.type !== 'hidden' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    const chonMa = [...document.querySelectorAll('main option')].map((o) => o.textContent).filter((t) => /\\bMT_[A-Z]{8}\\b|\\bLD_[A-Z]{8}\\b/.test(t));
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, chu: document.querySelector('main').innerText, chonMa };
  })()`);
  assert.ok(m.sw <= m.iw + 1, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
  assert.deepEqual(m.chonMa, [], `${nhan}: ô chọn lộ mã máy`);
}

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ (tên không được có dãy ≥ 8 chữ số)
  const HOM_NAY = vnDate(0);
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
  const choMucTa = (p) => p.waitFor("(() => { const nd = document.getElementById('hh-noi-dung'); return !!nd && !nd.hidden && document.getElementById('mucta-luat').textContent.length > 0; })()", "mục Mức TA đã vẽ");
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const hienOk = (p) => p.ev("(() => { const e = document.getElementById('ok'); return e.hidden ? '' : e.textContent; })()");
  const hienLoiMt = (p) => p.ev("(() => { const e = document.getElementById('mucta-loi'); return e.hidden ? '' : e.textContent; })()");
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  /** Khối của một mức (theo TÊN): trạng thái, nút, dòng, gắn — đọc từ DOM. */
  const khoiMuc = (p, ten) => p.ev(`(() => { const a = [...document.querySelectorAll('#mucta-list article.hh-mucta')].find((x) => x.dataset.muctaTen === ${JSON.stringify(ten)}); if (!a) return null;
    return { off: a.classList.contains('row-off'), chu: a.innerText, nut: [...a.querySelectorAll('button[data-mucta-act]')].map((b) => ({ act: b.dataset.muctaAct, nhan: b.textContent.trim(), aria: b.getAttribute('aria-label') })),
      dong: [...a.querySelectorAll('[data-mucta-phan=dong] > li')].map((li) => li.innerText), gan: [...a.querySelectorAll('[data-mucta-phan=gan] > li')].map((li) => li.innerText),
      nutKhac: a.querySelectorAll('button[data-mucta-dong], button[data-mucta-ket-thuc]').length }; })()`);
  const oChon = (p, id) => p.ev(`[...document.querySelectorAll('#${id} option')].map((o) => o.textContent)`);
  const chonTheoChu = (p, id, chu) => p.ev(`(() => { const s = document.getElementById(${JSON.stringify(id)}); const o = [...s.options].find((x) => x.textContent === ${JSON.stringify(chu)}); if (!o) return false; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const choKetQua = (p, nhan) => p.waitFor("(() => { const o = document.getElementById('ok'), e = document.getElementById('mucta-loi'), c = document.getElementById('mucta-canh-bao'); return !o.hidden || !e.hidden || !c.hidden; })()", nhan);
  const xoaKetQua = (p) => p.ev("(() => { for (const id of ['ok', 'mucta-loi']) document.getElementById(id).hidden = true; return true; })()");

  let dauTien = true;
  try {
    for (const [tenKho, vp] of KHO) {
      const kho = `[${tenKho}]`;
      const D = tenKho === "390" ? "M" : "D";
      const TEN_MUC = `Đại lý cấp 1 ${CHU} ${D}`;
      // ---- dựng dữ liệu bằng API (chưa mở trang nào): loại SẠCH (không dòng riêng) + hồ sơ tổ chức mang nó; loại CÒN DÒNG RIÊNG «mọi dịch vụ» 8%
      const L_SACH = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: `Lễ tân cấp ${CHU} ${D}` }), 201, "loại sạch").loai;
      const L_RIENG = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: `Nhân viên tour ${CHU} ${D}` }), 201, "loại còn dòng riêng").loai;
      phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: L_RIENG.code }, phamVi: "ALL", kieu: "RATE", tyLeBp: 800, tuNgay: HOM_NAY }), 201, "dòng riêng 8%");
      const ORG = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Khách sạn Biển Xanh ${CHU} ${D}` }), 201, "hồ sơ tổ chức").party;
      phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${ORG.id}/roles`, { roleTypeCode: L_SACH.code }), 201, "Quản trị gắn loại sạch cho hồ sơ");

      // ======================= Kế toán =======================
      {
        const p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp);
        try {
          await choMucTa(p);
          await buoc(`1${kho}`, "Kế toán mở /hoa-hong: mục «Mức TA», câu luật đổi mức trong ngày, ba biểu mẫu", async () => {
            assert.equal(await p.ev("document.getElementById('mucta-tieu-de').textContent"), "Mức TA");
            assert.equal(await p.ev("document.getElementById('mucta-luat').textContent"), CAU_LUAT);
            for (const id of ["mucta-add-form", "mucta-dong-form", "mucta-gan-form"]) assert.equal(await p.ev(`document.getElementById('${id}').hidden`), false, `${id} hiện`);
            assert.equal(await p.ev("document.querySelector('#mucta-add-form button[type=submit]').textContent"), "Thêm mức TA");
            assert.equal(await p.ev("document.querySelector('#mucta-dong-form button[type=submit]').textContent"), "Thêm dòng");
            assert.equal(await p.ev("document.querySelector('#mucta-gan-form button[type=submit]').textContent"), "Gắn mức");
            assert.ok((await oChon(p, "mucta-gan-loai")).includes(L_SACH.ten), "ô Loại của «Gắn mức» có loại sạch");
            assert.equal(await hienLoiMt(p), "");
            assert.equal(await p.ev("document.getElementById('mucta-canh-bao').hidden"), true, "không khung vàng khi mở màn");
            if (dauTien) assert.equal(await p.ev("document.getElementById('mucta-rong').hidden ? '' : document.getElementById('mucta-rong').textContent"), "Chưa có mức TA nào.");
            await bocucSach(p, `bước 1 ${kho}`);
            await axeKiem(p, `Kế toán mở /hoa-hong ${kho}`);
            await chup(p, `01-ke-toan-muc-ta-${tenKho}`);
          });

          await buoc(`2${kho}`, "thêm mức bằng biểu mẫu thật: câu «Đã thêm mức TA», khối mới «Đang dùng» + nút Tắt, mức có ở hai ô chọn; tên trùng ⇒ câu 409; không lộ mã", async () => {
            await xoaKetQua(p);
            await p.ev(setInput("document.getElementById('mucta-ten')", TEN_MUC));
            assert.equal(await bam(p, "#mucta-add-form button[type=submit]"), true);
            await choKetQua(p, "kết quả thêm mức");
            assert.equal(await hienLoiMt(p), "");
            assert.equal(await hienOk(p), `Đã thêm mức TA «${TEN_MUC}». Thêm dòng cho mức này rồi gắn loại đối tác ở bên dưới.`);
            await p.waitFor("document.querySelectorAll('#mucta-list article.hh-mucta').length > 0", "danh sách mức đã vẽ lại");
            await bocucSach(p, `bước 2, ngay sau khi thêm ${kho}`); // kiểm lộ mã TRƯỚC khi tìm khối theo tên (MT_PHA=lo-ma phải đỏ vì lộ mã, không vì hết giờ)
            await p.waitFor(`[...document.querySelectorAll('#mucta-list article.hh-mucta')].some((a) => a.dataset.muctaTen === ${JSON.stringify(TEN_MUC)})`, "khối mức mới");
            const k = await khoiMuc(p, TEN_MUC);
            assert.ok(k.chu.includes("Đang dùng") && !k.off, k.chu);
            assert.deepEqual(k.nut, [{ act: "tat", nhan: "Tắt", aria: `Tắt mức TA: ${TEN_MUC}` }]);
            assert.ok(k.chu.includes("Chưa có dòng nào.") && k.chu.includes("Chưa gắn loại nào."), k.chu);
            assert.ok((await oChon(p, "mucta-dong-muc")).includes(TEN_MUC) && (await oChon(p, "mucta-gan-muc")).includes(TEN_MUC), "mức mới có ở hai ô chọn");
            assert.equal(await p.ev("document.getElementById('mucta-ten').value"), "", "ô tên được xoá");
            await bocucSach(p, `bước 2 ${kho}`);
            // trùng (khác dấu, khác hoa thường) ⇒ 409 với câu của máy chủ
            await xoaKetQua(p);
            await p.ev(setInput("document.getElementById('mucta-ten')", TEN_MUC.toLowerCase().replace("đại lý cấp", "dai ly cap")));
            assert.equal(await bam(p, "#mucta-add-form button[type=submit]"), true);
            await choKetQua(p, "kết quả thêm trùng");
            assert.equal(await hienLoiMt(p), CAU_TRUNG);
            assert.equal(await hienOk(p), "", "lỗi thì không có câu thành công");
          });

          await buoc(`3${kho}`, "thêm dòng «Một dịch vụ · 15%» cho mức ⇒ hiện dưới tên mức; «Các mức hiện có» không lặp dòng của mức TA", async () => {
            await xoaKetQua(p);
            assert.equal(await chonTheoChu(p, "mucta-dong-muc", TEN_MUC), true);
            await p.ev("(() => { const s = document.getElementById('mucta-dich-vu'); s.value = 'TD101'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev(setInput("document.getElementById('mucta-ty-le')", "15"));
            assert.equal(await bam(p, "#mucta-dong-form button[type=submit]"), true);
            await choKetQua(p, "kết quả thêm dòng");
            assert.equal(await hienLoiMt(p), "");
            assert.equal(await hienOk(p), `Đã thêm dòng cho mức TA «${TEN_MUC}».`);
            await p.waitFor(`(() => { const a = [...document.querySelectorAll('#mucta-list article.hh-mucta')].find((x) => x.dataset.muctaTen === ${JSON.stringify(TEN_MUC)}); return !!a && a.querySelectorAll('[data-mucta-phan=dong] > li').length === 1; })()`, "dòng của mức");
            const k = await khoiMuc(p, TEN_MUC);
            assert.match(k.dong[0], /Dịch vụ Tour 4 đảo Nha Trang · 15%/);
            assert.match(k.dong[0], /Đang áp/);
            const coDongMucTa = await p.ev(`[...document.querySelectorAll('#muc-list tr, #muc-list-cards .card')].some((x) => x.innerText.includes(${JSON.stringify(TEN_MUC)}) || x.innerText.includes('Mức TA'))`);
            assert.equal(coDongMucTa, false, "bảng «Các mức hiện có» không lặp dòng của mức TA");
            await bocucSach(p, `bước 3 ${kho}`);
            await chup(p, `02-them-dong-${tenKho}`);
          });

          await buoc(`4${kho}`, "gắn loại sạch ⇒ «Đã gắn…», không khung vàng; gắn loại còn dòng riêng ⇒ khung vàng không chặn, câu «Đóng các dòng này nếu muốn dùng mức TA.» + đúng dòng riêng", async () => {
            const gan = async (tenLoai) => {
              await xoaKetQua(p);
              assert.equal(await chonTheoChu(p, "mucta-gan-loai", tenLoai), true, `có loại ${tenLoai}`);
              assert.equal(await chonTheoChu(p, "mucta-gan-muc", TEN_MUC), true);
              await p.ev("(() => { document.getElementById('mucta-canh-bao').hidden = true; return true; })()");
              assert.equal(await bam(p, "#mucta-gan-form button[type=submit]"), true);
              await choKetQua(p, `kết quả gắn ${tenLoai}`);
              assert.equal(await hienLoiMt(p), "");
            };
            await gan(L_SACH.ten);
            assert.match(await hienOk(p), new RegExp(`^Đã gắn loại «${L_SACH.ten}» vào mức TA «${TEN_MUC}» từ ngày `));
            assert.equal(await p.ev("document.getElementById('mucta-canh-bao').hidden"), true, "loại sạch: không khung vàng");
            await gan(L_RIENG.ten);
            assert.equal(await p.ev("document.getElementById('mucta-canh-bao').hidden"), false, "loại còn dòng riêng: khung vàng hiện");
            const cb = await p.ev("document.getElementById('mucta-canh-bao').innerText");
            assert.ok(cb.includes(`loại «${L_RIENG.ten}»`) && cb.includes(`mức TA «${TEN_MUC}»`), cb);
            assert.ok(cb.includes("Đóng các dòng này nếu muốn dùng mức TA."), cb);
            assert.ok(cb.includes(`${L_RIENG.ten} · Mọi dịch vụ · 8%`), `khung vàng liệt kê đúng dòng riêng: ${cb}`);
            assert.equal(await p.ev("document.getElementById('mucta-canh-bao').classList.contains('warn')"), true, "khung vàng dùng lớp .alert.warn có sẵn");
            const k = await khoiMuc(p, TEN_MUC);
            assert.equal(k.gan.length, 2, "cả hai lần gắn đều thành (cảnh báo không chặn)");
            await bocucSach(p, `bước 4 ${kho}`);
            await axeKiem(p, `Kế toán, khung vàng sau khi gắn ${kho}`);
            await chup(p, `03-canh-bao-vang-${tenKho}`);
          });

          await buoc(`5${kho}`, "Tắt ⇒ «Đã tắt» + nút Bật, mức biến khỏi hai ô chọn; Bật ⇒ quay lại; «Kết thúc gắn» mở hộp ngày có câu «hôm qua», xác nhận ⇒ gắn có ngày kết thúc", async () => {
            await xoaKetQua(p);
            assert.equal(await bam(p, `#mucta-list article.hh-mucta[data-mucta-ten="${TEN_MUC}"] button[data-mucta-act=tat]`), true);
            await p.waitFor(`(() => { const a = [...document.querySelectorAll('#mucta-list article.hh-mucta')].find((x) => x.dataset.muctaTen === ${JSON.stringify(TEN_MUC)}); return !!a && a.classList.contains('row-off'); })()`, "mức đã tắt");
            let k = await khoiMuc(p, TEN_MUC);
            assert.ok(k.chu.includes("Đã tắt"), k.chu);
            assert.deepEqual(k.nut, [{ act: "bat", nhan: "Bật", aria: `Bật mức TA: ${TEN_MUC}` }]);
            assert.ok(!(await oChon(p, "mucta-dong-muc")).includes(TEN_MUC) && !(await oChon(p, "mucta-gan-muc")).includes(TEN_MUC), "mức tắt không còn ở ô chọn");
            assert.match(await hienOk(p), /^Đã tắt mức TA «.*». Dòng và gắn đang có vẫn áp; không thêm dòng, không gắn mới được\.$/);
            await bocucSach(p, `bước 5 (đã tắt) ${kho}`);
            await axeKiem(p, `Kế toán, mức ở trạng thái Đã tắt ${kho}`, { ghiTuongPhan: true });
            await chup(p, `04-da-tat-muc-${tenKho}`);
            assert.equal(await bam(p, `#mucta-list article.hh-mucta[data-mucta-ten="${TEN_MUC}"] button[data-mucta-act=bat]`), true);
            await p.waitFor(`(() => { const a = [...document.querySelectorAll('#mucta-list article.hh-mucta')].find((x) => x.dataset.muctaTen === ${JSON.stringify(TEN_MUC)}); return !!a && !a.classList.contains('row-off'); })()`, "mức bật lại");
            assert.ok((await oChon(p, "mucta-gan-muc")).includes(TEN_MUC), "bật lại ⇒ ô chọn có lại mức");
            // Kết thúc gắn loại còn dòng riêng
            await xoaKetQua(p);
            assert.equal(await p.ev(`(() => { const b = document.querySelector('button[aria-label=${JSON.stringify(`Kết thúc gắn: ${L_RIENG.ten} · ${TEN_MUC}`)}]'); if (!b) return false; b.click(); return true; })()`), true, "có nút Kết thúc gắn");
            await p.waitFor("!!document.getElementById('dong-hop')", "hộp ngày kết thúc");
            const hop = await p.ev("document.getElementById('dong-hop').innerText");
            assert.ok(hop.includes(CAU_HOP_KET_THUC), hop);
            assert.ok(hop.includes(`Kết thúc gắn: loại «${L_RIENG.ten}» với mức TA «${TEN_MUC}»`), hop);
            await chup(p, `05-hop-ket-thuc-gan-${tenKho}`);
            assert.equal(await bam(p, "#dong-xac-nhan"), true);
            // chờ câu ok / lỗi (khung vàng của bước 4 vẫn còn trên màn tới lần gắn kế — không dùng nó làm tín hiệu)
            await p.waitFor("(() => { const o = document.getElementById('ok'), e = document.getElementById('mucta-loi'); return !o.hidden || !e.hidden; })()", "kết quả kết thúc gắn");
            assert.equal(await hienOk(p), `Đã kết thúc gắn loại «${L_RIENG.ten}».`);
            k = await khoiMuc(p, TEN_MUC);
            const dongGan = k.gan.find((x) => x.includes(L_RIENG.ten));
            assert.ok(dongGan && !/đến —/.test(dongGan), `gắn đã có ngày kết thúc: ${dongGan}`);
            await bocucSach(p, `bước 5 ${kho}`);
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
          await choMucTa(p);
          await buoc(`6${kho}`, "Bán hàng mở /hoa-hong: thấy mức, dòng, gắn; KHÔNG biểu mẫu, KHÔNG nút nào của mục; máy chủ từ chối thêm mức (403)", async () => {
            const k = await khoiMuc(p, TEN_MUC);
            assert.ok(k, "thấy khối mức");
            assert.equal(k.dong.length, 1);
            assert.deepEqual(k.nut, [], "không nút Tắt / Bật");
            assert.equal(k.nutKhac, 0, "không nút Đóng dòng / Kết thúc gắn");
            for (const id of ["mucta-add-form", "mucta-dong-form", "mucta-gan-form"]) assert.equal(await p.ev(`document.getElementById('${id}').hidden`), true, `${id} ẩn`);
            assert.equal(await p.ev("document.getElementById('mucta-ten')"), null, "ô tên mức không được dựng");
            assert.equal((await goiTrongTrang(p, "POST", "/api/pricing/muc-ta", { ten: `Mức của Bán hàng ${CHU}` })).status, 403);
            await bocucSach(p, `bước 6 ${kho}`);
            await axeKiem(p, `Bán hàng xem /hoa-hong ${kho}`);
            if (vp === MOB) await chup(p, `06-ban-hang-chi-xem-${tenKho}`);
          });
        } finally {
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
          p.close();
        }
      }

      // ======================= Quản trị: Thử tra ra mức TA kèm tên =======================
      {
        const p = await moTrang(ACCOUNTS.admin, "/hoa-hong", vp);
        try {
          await p.waitFor("!document.getElementById('hh-noi-dung').hidden && !!document.getElementById('thu-tra-doi-tac')", "trang dựng xong");
          await buoc(`7${kho}`, "Quản trị «Thử tra» đối tác mang loại đã gắn ⇒ «… mức TA của loại đối tác cho dịch vụ này: «tên mức»»", async () => {
            await p.ev("document.getElementById('thu-tra-doi-tac').focus(), true");
            await p.ev(setInput("document.getElementById('thu-tra-doi-tac')", `Biển Xanh ${CHU} ${D}`));
            await p.waitFor(`[...document.querySelectorAll('#thu-tra-form button[data-party]')].some((b) => b.dataset.party === ${JSON.stringify(ORG.id)})`, "kết quả tìm có hồ sơ");
            await p.ev(`document.querySelector('#thu-tra-form button[data-party="${ORG.id}"]').click(), true`);
            await p.ev("(() => { const s = document.getElementById('thu-tra-dich-vu'); s.value = 'TD101'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev("document.getElementById('thu-tra-form').requestSubmit(), true");
            await p.waitFor("!!document.querySelector('#thu-tra-ket-qua .hh-ket-qua')", "kết quả thử tra");
            const kq = await p.ev("document.querySelector('#thu-tra-ket-qua .hh-ket-qua').textContent.trim()");
            assert.equal(kq, `Áp mức 15% — mức TA của loại đối tác cho dịch vụ này: «${TEN_MUC}»`);
            await bocucSach(p, `bước 7 ${kho}`);
            await axeKiem(p, `Quản trị Thử tra ${kho}`);
            await chup(p, `07-quan-tri-thu-tra-${tenKho}`);
          });
        } finally {
          if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
          p.close();
        }
      }
    }
  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo MT_DUNG=${DUNG})`); }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
if (daBiet.length) console.log(`\nĐÃ BIẾT (tương phản dòng mờ ở trạng thái Đã tắt — không đỏ, ghi vào README):\n  ${[...new Set(daBiet)].join("\n  ")}`);
if (axeNhe.length) console.log(`\naxe nhẹ (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nMUC TA SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nMUC TA SMOKE OK");
