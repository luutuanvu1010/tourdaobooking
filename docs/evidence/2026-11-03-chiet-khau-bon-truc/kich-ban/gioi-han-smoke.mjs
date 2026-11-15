// Kịch bản Chrome — trang «Giới hạn nhập hoa hồng» (ADR-0161 Đ3; kế hoạch docs/superpowers/plans/2026-11-03-chinh-sach-chiet-khau-bon-truc.md, Task 8).
// Kịch bản CHÍNH THỨC (Task 9): Toàn quyền đổi giới hạn (số sai báo ngay không gọi máy chủ, số đúng lưu 200, 409 giữ số đang gõ, tải lại thấy số của người kia), khổ 390, và MỌI người khác bị chặn:
// Kế toán, Bán hàng, Quản trị, Đối tác (route 403, trang chỉ câu «Trang này chỉ Toàn quyền dùng được.» hoặc trạng thái 403, không form, không mục ở thanh bên). Phá thử ghi ở sổ thi công.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, KHÔNG --remote, không đụng dữ liệu thật.
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản đá phiên của trang đang mở ⇒ lúc trang của «Chủ Thử» đang mở, việc đổi giới hạn «của người khác» làm bằng MỘT tài khoản Toàn quyền thứ hai.
// Chạy (sau `npm run build:web`, từ GỐC repo):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-03-chiet-khau-bon-truc/anh node docs/evidence/2026-11-03-chiet-khau-bon-truc/kich-ban/gioi-han-smoke.mjs
// Cuối: "GIOI HAN SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";
import { HOP_HOI_TU_DONG } from "../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)

const AXE = process.env.AXE_JS ? docAxe() : null;
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-11-03-chiet-khau-bon-truc/anh");
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
    if (trangHienTai) console.log(`    trang lúc đỏ: ${await trangHienTai.ev("JSON.stringify({ url: location.pathname, main: (document.querySelector('main')?.innerText ?? '').slice(0, 300) })").catch(() => "?")}`);
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

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const CHU_HAI = { name: "Chủ Hai", phone: "0900000278", pin: "246820", permissions: ["ADMIN", "SUPER_ADMIN"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(CHU_HAI)).split("\n")) env.sql(stmt);
  const DOI_TAC = { name: "Đối Tác Thử", phone: "0900000279", pin: "246821", permissions: ["PARTNER"] };
  for (const stmt of (await insertStaffSql(DOI_TAC)).split("\n")) env.sql(stmt);

  const moTrang = async (account, vp) => {
    const p = await env.openPage(vp);
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `${HOP_HOI_TU_DONG} window.confirm = () => true; window.alert = () => {}; ${GHI_FETCH}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: `${env.base}/hoa-hong-gioi-han` });
    await p.waitFor("document.readyState === 'complete'", "trang tải xong");
    return p;
  };
  const choForm = (p) => p.waitFor("!!document.getElementById('hgh-form') && !document.getElementById('hgh-noi-dung').hidden", "form giới hạn hiện");
  const bamLuu = (p) => p.ev("(() => { const b = document.querySelector('[data-action=luu-gioi-han]'); if (!b || b.disabled) return false; b.click(); return true; })()");
  const gia = (p) => p.ev("({ ty: document.getElementById('hgh-ty-le').value, buoc: document.getElementById('hgh-buoc-tien').value })");
  const hienLoi = (p) => p.ev("(() => { const e = document.querySelector('#hgh-form .alert'); return e && !e.hidden ? e.textContent : null; })()");
  const coMucThanhBen = (p) => p.ev("!!document.querySelector('a[href=\"/hoa-hong-gioi-han\"]')");

  // ---------------- Toàn quyền, khổ máy tính ----------------
  let p = await moTrang(ACCOUNTS.chu, KHO_1440);
  await buoc("G1", "[1440] Toàn quyền thấy trang: số đang áp 50% và 1.000, câu «Số mới áp cho…», mục ở thanh bên, không tràn ngang, axe", async () => {
    await choForm(p);
    assert.deepEqual(await gia(p), { ty: "50", buoc: "1.000" });
    const t = await p.ev("document.querySelector('main').innerText");
    assert.ok(t.includes("Phần trăm tối đa (%)") && t.includes("Số tiền phải chia hết cho (đồng)"), "hai nhãn ô");
    assert.ok(t.includes(CAU_AP_CHO), "câu áp cho");
    assert.ok(t.includes(dangAp("50%", "1.000")), "câu giới hạn đang áp");
    assert.equal(await coMucThanhBen(p), true, "mục «Giới hạn nhập hoa hồng» ở thanh bên");
    await bocucSach(p, "[1440]");
    await chup(p, "gioi-han-1440");
    await axeKiem(p, "[1440]");
  });
  await buoc("G2", "[1440] số sai bị báo ngay, KHÔNG gọi máy chủ; số đúng lưu 200 và câu «Đã lưu…» nói số mới", async () => {
    await p.ev("window.__ghi.length = 0; true");
    for (const [ty, buoc2, cau] of [["0", "1.000", CAU_PHAN_TRAM_SAI], ["101", "1.000", CAU_PHAN_TRAM_SAI], ["abc", "1.000", CAU_PHAN_TRAM_SAI], ["40", "0", CAU_BUOC_SAI], ["40", "1.000.001", CAU_BUOC_SAI], ["40", "12,5", CAU_BUOC_SAI]]) {
      await p.ev(setInput("document.getElementById('hgh-ty-le')", ty));
      await p.ev(setInput("document.getElementById('hgh-buoc-tien')", buoc2));
      assert.equal(await bamLuu(p), true);
      await p.waitFor(`(() => { const e = document.querySelector('#hgh-form .alert'); return !!e && !e.hidden && e.textContent === ${JSON.stringify(cau)}; })()`, `câu «${cau}» cho ${ty} / ${buoc2}`);
    }
    assert.equal(await p.ev("window.__ghi.length"), 0, "số sai: không gọi máy chủ");
    await p.ev(setInput("document.getElementById('hgh-ty-le')", "40"));
    await p.ev(setInput("document.getElementById('hgh-buoc-tien')", "2000"));
    assert.equal(await bamLuu(p), true);
    await p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent === ${JSON.stringify(`Đã lưu. ${dangAp("40%", "2.000")}`)}; })()`, "câu Đã lưu");
    assert.deepEqual(await p.ev("window.__ghi"), [{ m: "POST", u: "/api/pricing/gioi-han-nhap", s: 200 }]);
    assert.deepEqual(await gia(p), { ty: "40", buoc: "2.000" });
    assert.equal(await hienLoi(p), null, "không còn câu lỗi");
  });
  await buoc("G3", "[1440] người khác đổi giữa chừng ⇒ Lưu nhận 409 và hiện NGUYÊN câu máy chủ, ô giữ số đang gõ", async () => {
    const hien = (await call(CHU_HAI, "GET", "/api/pricing/gioi-han-nhap")).json;
    assert.equal(hien.tranTyLeBp, 4000);
    const r = await call(CHU_HAI, "POST", "/api/pricing/gioi-han-nhap", { tranTyLeBp: 3500, buocTien: 5000, tuLuc: hien.tuLuc });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    await p.ev("window.__ghi.length = 0; true");
    await p.ev(setInput("document.getElementById('hgh-ty-le')", "30"));
    await p.ev(setInput("document.getElementById('hgh-buoc-tien')", "3.000"));
    assert.equal(await bamLuu(p), true);
    await p.waitFor(`(() => { const e = document.querySelector('#hgh-form .alert'); return !!e && !e.hidden && e.textContent === ${JSON.stringify(CAU_409)}; })()`, "câu 409 của máy chủ");
    assert.deepEqual(await p.ev("window.__ghi"), [{ m: "POST", u: "/api/pricing/gioi-han-nhap", s: 409 }]);
    assert.deepEqual(await gia(p), { ty: "30", buoc: "3.000" }, "ô giữ số đang gõ");
    await chup(p, "gioi-han-1440-409");
  });
  await buoc("G4", "[1440] tải lại trang: thấy số của người kia (35% và 5.000); Lưu lại số đó (không đổi) ⇒ 200", async () => {
    await p.send("Page.reload", {});
    await p.waitFor("document.readyState === 'complete'", "tải lại xong");
    await choForm(p);
    assert.deepEqual(await gia(p), { ty: "35", buoc: "5.000" });
    assert.equal(await bamLuu(p), true);
    await p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent === ${JSON.stringify(`Đã lưu. ${dangAp("35%", "5.000")}`)}; })()`, "câu Đã lưu số không đổi");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Toàn quyền, khổ điện thoại ----------------
  p = await moTrang(ACCOUNTS.chu, KHO_390);
  await buoc("G5", "[390] trang hiện đủ, không tràn ngang, vùng chạm ≥ 44px, axe", async () => {
    await choForm(p);
    assert.deepEqual(await gia(p), { ty: "35", buoc: "5.000" });
    await bocucSach(p, "[390]");
    await chup(p, "gioi-han-390");
    await axeKiem(p, "[390]");
  });
  p.close();
  trangHienTai = null;

  // ---------------- Người không phải Toàn quyền ----------------
  for (const [ten, account] of [["Kế toán", ACCOUNTS.accounting], ["Bán hàng", ACCOUNTS.salesA], ["Quản trị", ACCOUNTS.admin]]) {
    await buoc(`H-${ten}`, `[1440] ${ten}: câu «${CAU_CHI_TOAN_QUYEN}», không có form, không có mục ở thanh bên`, async () => {
      const q = await moTrang(account, KHO_1440);
      try {
        await q.waitFor("(() => { const e = document.getElementById('error'); return !!e && !e.hidden && e.textContent.length > 0; })()", "câu báo lỗi hiện");
        assert.equal(await q.ev("document.getElementById('error').textContent"), CAU_CHI_TOAN_QUYEN);
        assert.equal(await q.ev("!!document.getElementById('hgh-form')"), false, "không dựng form");
        assert.equal(await coMucThanhBen(q), false, "không có mục ở thanh bên");
      } finally {
        q.close();
        trangHienTai = null;
      }
    });
  }
  // Đối tác: bị chặn cả đọc lẫn ghi ở máy chủ; trang không dựng form và không có mục ở thanh bên.
  await buoc("H-Đối tác", "[1440] Đối tác: GET và POST giới hạn 403; trang không có form, không có mục ở thanh bên", async () => {
    for (const [m, than] of [["GET"], ["POST", { tranTyLeBp: 6000, buocTien: 1000, tuLuc: "2026-01-01T00:00:00.000Z" }]]) {
      const r = await call(DOI_TAC, m, "/api/pricing/gioi-han-nhap", than);
      assert.equal(r.status, 403, `Đối tác ${m}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    const q = await moTrang(DOI_TAC, KHO_1440);
    try {
      await sleep(2000);
      const t = await q.ev("JSON.stringify({ form: !!document.getElementById('hgh-form'), loi: document.getElementById('error') && !document.getElementById('error').hidden ? document.getElementById('error').textContent : null, trangThai: !!document.querySelector('.trang-thai[data-loai]'), muc: !!document.querySelector('a[href=\"/hoa-hong-gioi-han\"]'), url: location.pathname })");
      const r = JSON.parse(t);
      assert.equal(r.form, false, `Đối tác thấy form: ${t}`);
      assert.equal(r.muc, false, `Đối tác thấy mục ở thanh bên: ${t}`);
      assert.ok(r.loi === CAU_CHI_TOAN_QUYEN || r.trangThai || r.url !== "/hoa-hong-gioi-han", `Đối tác không nhận câu chặn nào: ${t}`);
    } finally {
      q.close();
      trangHienTai = null;
    }
  });
  // Kế toán vẫn ĐỌC được giới hạn (hộp nhập báo sớm): cổng đọc là `office` + partner.commission.view.
  await buoc("I", "Kế toán đọc được giới hạn đang áp bằng API (đúng 35% và 5.000), còn GHI thì bị từ chối", async () => {
    const r = await call(ACCOUNTS.accounting, "GET", "/api/pricing/gioi-han-nhap");
    assert.equal(r.status, 200);
    assert.deepEqual([r.json.tranTyLeBp, r.json.buocTien], [3500, 5000]);
    const w = await call(ACCOUNTS.accounting, "POST", "/api/pricing/gioi-han-nhap", { tranTyLeBp: 6000, buocTien: 1000, tuLuc: r.json.tuLuc });
    assert.ok(w.status === 403, `Kế toán ghi giới hạn phải bị từ chối, nhận ${w.status}`);
  });

  console.log("\n--- Ảnh đã chụp ---\n" + anh.join("\n"));
  if (axeNhe.length) console.log("\n--- Ghi chú axe (không đỏ) ---\n" + axeNhe.join("\n"));
  if (loi.length) {
    console.log("\nBƯỚC ĐỎ:\n" + loi.join("\n"));
    process.exitCode = 1;
  } else console.log("\nGIOI HAN SMOKE OK");
} finally {
  await env.stop();
}
