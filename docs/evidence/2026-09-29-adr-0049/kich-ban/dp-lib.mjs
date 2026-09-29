// Phần dùng chung của các kịch bản Chrome Phần B ADR-0049 + ADR-0050 (Bảng điều phối lượt 1; bản vẽ docs/design/van-chuyen-dieu-phoi/). Dựng trên a2-cdp.mjs
// (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài). Mọi SĐT, tên ở đây là GIẢ.
// Tài khoản dùng một lần: SĐT 0900000431–0900000439 (1a dùng 0900000411–419; mỗi lần chạy là một D1 tạm riêng nên không đụng nhau).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

export { ACCOUNTS, assert, sleep, vnDate };
export const OUT = process.env.OUT ?? "docs/evidence/2026-09-29-adr-0049";
export const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

export const DESK = { width: 1040, height: 820, mobile: false };
export const MOB = { width: 390, height: 844, mobile: true };
/** Tài khoản CHỈ Toàn quyền (khuôn nhat-ky-loc-smoke / t2b): ô settings.ops chỉ có ở quyền này. */
export const CHU = { name: "Chủ Điều Phối", phone: "0900000431", pin: "246431", permissions: ["SUPER_ADMIN"] };

/** Bộ đếm bước: bước hỏng không dừng cả kịch bản; cuối cùng `xong()` thoát 1 nếu có bước ✗. */
export function boDem(ten) {
  let passed = 0;
  const fails = [];
  return {
    async step(id, name, fn) {
      try {
        await fn();
        ok(`${id}) ${name}`);
        passed++;
      } catch (e) {
        fails.push(`${id}) ${name}`);
        const msg = String(e?.stack ?? e?.message ?? e).split("\n").slice(0, 14).join("\n    ");
        console.log(`✗ ${id}) ${name}\n    ${msg}`);
      }
    },
    xong() {
      if (fails.length) {
        console.log(`\n${ten}: ${passed} ✓, ${fails.length} ✗: ${fails.join(" | ")}`);
        process.exitCode = 1;
      } else console.log(`\n${ten} OK (${passed} bước)`);
    },
  };
}

export const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
export const axeNote = () => (AXE ? ", axe không vi phạm critical/serious" : " (chưa chạy axe: thiếu AXE_JS)");

/** Ảnh cả trang (kéo dài theo nội dung). */
export const shotFull = async (p, name) => {
  await sleep(400);
  await p.shot(join(OUT, "anh", name));
};
/** Ảnh đúng khung nhìn — cho bảng trượt / hộp thoại đang mở. */
export const shotView = async (p, name) => {
  await sleep(450);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};

/** Biểu thức: chữ đã gọn khoảng trắng của phần tử khớp bộ chọn (null nếu không có). */
export const txt = (sel) => `((el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`;
/** Biểu thức: phần tử có hiển thị thật (không display:none ở chính nó hay tổ tiên). */
export const shown = (sel) => `((el) => !!el && el.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`;
/** Biểu thức: gõ vào ô (bắn input + change). */
export const typeInto = (sel, value) =>
  `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
/** Biểu thức: bấm phần tử ĐANG HIỂN THỊ khớp bộ chọn. */
export const click = (sel) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getClientRects().length > 0); if (!el) return false; el.click(); return true; })()`;
/** Biểu thức: nhãn các mục con dưới "Vận chuyển" ở thanh bên (theo thứ tự) + mục đang sáng. */
export const vcSub = `(() => ({ items: [...document.querySelectorAll('#sidebar .sidebar-sub')].map((a) => a.innerText.replace(/\\s+/g, ' ').trim().replace(/\\s*\\d+$/, '')), current: document.querySelector('#sidebar .sidebar-sub[aria-current="page"]')?.innerText.trim() ?? null }))()`;
/** Biểu thức: trang không tràn ngang. */
export const noOverflowX = `document.documentElement.scrollWidth <= window.innerWidth + 1`;
/** Biểu thức: chữ hiển thị của `main` không lộ mã kỹ thuật (mã HOA có gạch dưới, trạng thái tiếng Anh). */
export const noCode = `(() => { const t = document.querySelector('main').innerText; const m = t.match(/\\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\\b|\\b(RUNNING|PLANNED|VEHICLE|DRIVER|PHA_LE|INSPECTION|TPL_INSURANCE|undefined|null|NaN)\\b/); return m ? m[0] : ''; })()`;
/** Đường dẫn các lời gọi /api/* một trang đã gửi (kèm phương thức). */
export const apiCalls = (p) => p.requests.map((r) => ({ method: r.method, path: new URL(r.url).pathname, body: r.postData })).filter((r) => r.path.startsWith("/api/"));

/** Dựng môi trường + tài khoản thêm + hàm gọi API (khuôn vc-lib.mjs của lượt 1a). */
export async function dungMoiTruong(extra = []) {
  const env = await startEnv();
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of extra) for (const stmt of (await insertStaffSql(a)).split("\n")) if (stmt.trim()) env.sql(stmt);
  const cookies = new Map();
  const call = async (account, method, path, body) => {
    if (!cookies.has(account.phone)) cookies.set(account.phone, await env.login(account));
    const c = cookies.get(account.phone);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* không phải JSON */ }
    return { status: r.status, json, text };
  };
  return { env, call };
}
