// Phần dùng chung của các kịch bản Chrome Phần B Vận chuyển lượt 1a (ADR-0040; bản vẽ docs/design/van-chuyen-1a/). Dựng trên a2-cdp.mjs (D1 tạm + wrangler dev +
// Chrome headless qua CDP). Mọi số giấy tờ, SĐT, biển số ở đây là SỐ GIẢ (README bản vẽ, điểm đoán 4) — không phải dữ liệu thật.
// Tài khoản dùng một lần: SĐT 0900000411–0900000419 (các kịch bản khác dùng 0900000201–209, 261, 271, 281, 282, 401).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

export { ACCOUNTS, assert, sleep, vnDate };
export const OUT = process.env.OUT ?? "docs/evidence/2026-09-28-van-chuyen-1a";
export const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

export const DESK = { width: 1040, height: 820, mobile: false };
export const MOB = { width: 390, height: 844, mobile: true };

export const SUPER = { name: "Chủ Dự Án", phone: "0900000411", pin: "246411", permissions: ["ADMIN", "SUPER_ADMIN"] };
export const DRIVER = { name: "Nguyễn Văn Hùng", phone: "0900000412", pin: "246412", permissions: ["DRIVER"] };
export const PARTNER = { name: "Đối Tác Thử", phone: "0900000413", pin: "246413", permissions: ["PARTNER"] };
export const DRIVER2 = { name: "Trần Minh Tuấn", phone: "0900000414", pin: "246414", permissions: ["DRIVER"] };

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
/** Biểu thức: bấm nút/liên kết ĐANG HIỂN THỊ có đúng chữ `text` trong `scope`. */
export const clickVisible = (scope, text) =>
  `(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button, ' + ${JSON.stringify(scope)} + ' a')].find((x) => x.getClientRects().length > 0 && x.innerText.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true; })()`;
/** Biểu thức: gõ vào ô (bắn input + change). */
export const typeInto = (sel, value) =>
  `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
/** Đường dẫn các lời gọi /api/* một trang đã gửi. */
export const apiCalls = (p) => p.requests.map((r) => ({ method: r.method, path: new URL(r.url).pathname })).filter((r) => r.path.startsWith("/api/"));

/**
 * Dựng môi trường + tài khoản + hàm gọi API. `extra` = các tài khoản cần tạo thêm (SUPER, DRIVER…). Tài xế được mở vai "Tài xế công ty" (DRIVER_INTERNAL) trên
 * hồ sơ — như tài khoản tạo từ màn Quản lý tài khoản — để lên danh sách "Giấy tờ sắp hết hạn" (giả định G7 của kế hoạch).
 */
export async function dungMoiTruong(extra = []) {
  const env = await startEnv();
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  const ids = {};
  for (const a of extra) {
    for (const stmt of (await insertStaffSql(a)).split("\n")) if (stmt.trim()) env.sql(stmt);
    const [row] = env.sql(`SELECT id, party_id FROM staff WHERE phone = '${a.phone}'`);
    ids[a.phone] = { staffId: row.id, partyId: row.party_id };
    if (a.permissions.includes("DRIVER")) {
      const at = new Date().toISOString();
      env.sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${row.party_id}', 'DRIVER_INTERNAL', '${vnDate(0)}', '${at}', '${at}')`);
    }
  }
  for (const a of Object.values(ACCOUNTS)) {
    const [row] = env.sql(`SELECT id, party_id FROM staff WHERE phone = '${a.phone}'`);
    ids[a.phone] = { staffId: row.id, partyId: row.party_id };
  }
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
  /** Thêm xe (Quản trị) → VehicleResponse.vehicle. */
  const themXe = async (body) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", body);
    assert.equal(r.status, 201, `thêm xe ${body.plateNumber}: ${r.text}`);
    return r.json.vehicle;
  };
  /** Thêm giấy tờ xe → dòng vừa thêm (theo loại + hạn). */
  const themGiayXe = async (xeId, body) => {
    const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xeId}/giay-to`, body);
    assert.equal(r.status, 201, `thêm giấy tờ xe ${body.typeCode}: ${r.text}`);
    return r.json.documents.find((d) => d.typeCode === body.typeCode && d.current);
  };
  const giaHanGiayXe = async (xeId, docId, body) => {
    const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xeId}/giay-to/${docId}/gia-han`, body);
    assert.equal(r.status, 201, `gia hạn giấy tờ xe: ${r.text}`);
    return r.json;
  };
  /** Thêm giấy tờ của người (Quản trị; hồ sơ phải là cấp dưới — Ruling R8). */
  const themGiayNguoi = async (partyId, body, as = ACCOUNTS.admin) => {
    const r = await call(as, "POST", `/api/parties/${partyId}/documents`, body);
    assert.equal(r.status, 201, `thêm giấy tờ người ${body.typeCode}: ${r.text}`);
    return r.json.documents;
  };
  return { env, ids, call, themXe, themGiayXe, giaHanGiayXe, themGiayNguoi };
}
