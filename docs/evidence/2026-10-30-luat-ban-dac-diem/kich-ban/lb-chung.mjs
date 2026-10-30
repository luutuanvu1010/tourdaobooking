// Phần DÙNG CHUNG của hai kịch bản Chrome «Luật bán» (luat-ban-smoke.mjs) và «Đặc điểm dịch vụ» (dac-diem-smoke.mjs) — ADR-0146 Đ5, ADR-0152; kế hoạch 2026-10-30 mục 8.1.
// Không chạy riêng. Chép có chủ đích các hàm kiểm của docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs (buoc, chup, axeKiem, bocucSach, moTrang) —
// đổi danh sách chữ thô theo hai màn này (mã phạm vi, mã trạng thái, mã đặc điểm / giá trị, mã loại).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Quy tắc ADR-0074/0075: dữ liệu dựng bằng API TRƯỚC khi mở trang của tài khoản đó; trong lúc trang mở thì ghi bằng chính trang (giao diện hoặc fetch trong trang).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

export { ACCOUNTS, goiApi, setInput, sleep, startEnv, vnDate };
export const AXE = docAxe();
export const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-30-luat-ban-dac-diem/anh");
mkdirSync(OUT, { recursive: true });
export const MOB = { width: 390, height: 844, mobile: true };
export const DESK = { width: 1040, height: 900, mobile: false };
/** `LB_KHO=390|1040` chạy một khổ (phát triển một khổ tới khi xanh rồi mới khổ thứ hai). */
export const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.LB_KHO || process.env.LB_KHO === ten);
export const PHA = process.env.LB_PHA ?? "";
/** 2026-11-03 ⇒ 03/11/2026 (ngayDayDu của src/shared/vn-date.ts). */
export const ngayVi = (iso) => iso.split("-").reverse().join("/");

/** Chữ thô không được lộ ra người dùng: mã phạm vi / trạng thái, mã máy sinh (đặc điểm `a`+12 hex, giá trị `v`+12 hex, loại `LD_`), mã lỗi, rác JS. */
const CHU_THO = /\b(SERVICE|GROUP|ATTRIBUTE|DANG_AP_DUNG|SAP_AP_DUNG|DA_KET_THUC|LD_[A-Z]{8}|a[0-9a-f]{12}|v[0-9a-f]{12}|stale|invalid_input|forbidden|attribute_in_use|sales_block_\w+|undefined|null|NaN|Internal Server Error)\b|\[object/;
const CHU_CAM = [/Đang áp(?! dụng)/, /Sắp áp(?! dụng)/, /Đã đóng(?! sổ| tiền)/, /[Cc]hặng/, /\bApp\b/];

const loi = [];
const axeNhe = [];
const anh = [];
let trangHienTai = null;
export const ketQua = { loi, axeNhe, anh };

/** Một bước: in ✓ / ✗ (không dừng cả kịch bản), in trạng thái trang khi đỏ, đóng hộp đang mở. */
export async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
    if (trangHienTai) {
      const tt = await trangHienTai.ev("JSON.stringify({ url: location.pathname, trangThai: document.body.dataset.trangThai ?? null, hop: document.querySelector('.sheet .sheet-title')?.textContent ?? null, main: (document.querySelector('main')?.innerText ?? '').slice(0, 300) })").catch((x) => String(x));
      console.log(`    trang lúc đỏ: ${tt}`);
      await trangHienTai.ev("document.querySelector('.sheet-root') && document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true").catch(() => undefined);
    }
  }
}

/** Chụp ảnh. `toanTrang` false khi có hộp trượt mở. */
export async function chup(p, ten, toanTrang = true) {
  await sleep(700);
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: toanTrang });
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}

/** axe-core (WCAG 2 A + AA + best-practice): critical / serious ⇒ đỏ; mức nhẹ ghi nhận. */
export async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  await p.ev("document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); true");
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}

/** Không tràn ngang; vùng chạm ≥ 44px; ô gõ đang hiện ≥ 16px (cả trong hộp); không chữ thô; không chữ cấm. */
export async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const hien = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const nho = [...document.querySelectorAll('main input, main select, main textarea, .sheet input, .sheet select, .sheet textarea')].filter((e) => hien(e) && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const trongKhungCuon = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(a).overflowX)) return true; } return false; };
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1 && !trongKhungCuon(e)).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    const cham = [...document.querySelectorAll('main button, main [role=tab], main select, main input:not([type=hidden]):not([type=radio]):not([type=checkbox]), .sheet button, .sheet select, .sheet input:not([type=hidden]):not([type=radio]):not([type=checkbox])')]
      .filter((e) => hien(e) && !e.closest('[hidden]')).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => (x.e.id || x.e.className || x.e.tagName) + '«' + (x.e.textContent || x.e.getAttribute('aria-label') || '').trim().slice(0, 24) + '» ' + Math.round(x.r.width) + '×' + Math.round(x.r.height)).slice(0, 6);
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, cham, chu: document.body.innerText };
  })()`);
  assert.ok(m.sw <= m.iw, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.cham, [], `${nhan}: vùng chạm nhỏ hơn 44px`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_THO.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_THO.exec(m.chu)?.[0]}`);
  for (const re of CHU_CAM) assert.ok(!re.test(m.chu), `${nhan}: còn chữ cấm «${re.exec(m.chu)?.[0]}»`);
}

/** Mở `path` bằng tài khoản `account` (đăng nhập MỚI — chỉ khi tài khoản đó chưa có trang nào mở). `them`: mã chèn trước khi trang chạy (phá thử P16). */
export function taoMoTrang(env) {
  return async (account, path, vp, { them = "" } = {}) => {
    const p = await env.openPage(vp);
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.confirm = () => { throw new Error('confirm() bị cấm'); }; window.alert = () => { throw new Error('alert() bị cấm'); }; ${them}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
}
/** Điều hướng trang đang mở (cùng phiên) sang `path`. */
export async function diToi(p, env, path) {
  await p.send("Page.navigate", { url: env.base + path });
  await sleep(300);
  await p.waitFor(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`, `trang ${path} tải xong`);
}
export const bam = (p, selector) => p.ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.offsetParent !== null); if (!e) return false; e.click(); return true; })()`);
export const chonO = (p, selector, v) => p.ev(`(() => { const s = document.querySelector(${JSON.stringify(selector)}); if (!s) return false; s.value = ${JSON.stringify(v)}; if (s.value !== ${JSON.stringify(v)}) return false; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
export const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
/** Có lối vào trang `href` đang HIỆN ở thanh bên (máy tính) hoặc trang Tôi (điện thoại) không. */
export const coLoiVao = (p, href) => p.ev(`[...document.querySelectorAll('a[href="${href}"]')].some((a) => a.offsetParent !== null)`);
export const choHop = (p) => p.waitFor("!!document.querySelector('.sheet-root.open .sheet')", "hộp mở");
export const choDongHop = (p) => p.waitFor("!document.querySelector('.sheet-root')", "hộp đã đóng");

/** In kết quả cuối, thoát 1 khi có bước đỏ. */
export function ketThuc(ten) {
  console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
  if (axeNhe.length) console.log(`\naxe nhẹ / ghi nhận (không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
  if (loi.length) {
    console.log(`\n${ten} SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\n${ten} SMOKE OK`);
}
