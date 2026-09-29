// Khung thử phá: nạp CẢ ứng dụng (src/index.ts: router + mọi module) bằng esbuild, chạy trên D1 giả = SQLite thật (node:sqlite) với schema dựng
// từ migrations/*.sql. Không mạng, không Turnstile (thiếu TURNSTILE_SECRET_KEY = tắt), không đụng D1 local/remote.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as esbuild from "esbuild";

export const ROOT = process.env.AUDIT_ROOT ?? new URL("../../", import.meta.url).pathname;
const MIG = `${ROOT}/migrations/`;

export function openDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(MIG + f, "utf8"));
  return db;
}

// src/index.ts export lớp Durable Object `BangTin` (Bảng tin, ADR-0022) — lớp đó import "cloudflare:workers", mô-đun chỉ có trong runtime Worker. Trỏ nó
// về một lớp giả rỗng cạnh tệp này (đường dẫn theo CHÍNH tệp này, không theo ROOT — AUDIT_ROOT có thể trỏ nơi khác). Khung thử không có binding
// BANG_TIN nên trạm không bao giờ được dựng; `baoThayDoi`/`dongBangTin` của gốc lắp ráp thấy vắng binding là thôi (DP-3).
const CLOUDFLARE_WORKERS_GIA = new URL("./cloudflare-workers-gia.mjs", import.meta.url).pathname;
const cloudflareWorkersGia = {
  name: "cloudflare-workers-gia",
  setup(b) {
    b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: CLOUDFLARE_WORKERS_GIA }));
  },
};

async function bundle(entry) {
  const built = await esbuild.build({
    stdin: { contents: entry, resolveDir: `${ROOT}/src`, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
    plugins: [cloudflareWorkersGia],
  });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
}
// listAll: bộ lọc thao tác im lặng (ADR-0038) chỉ kiểm được ở tầng truy vấn — trang Nhật ký nay chỉ Toàn quyền gọi được.
export const app = (await bundle(
  'export { default, taoAppChoKhungThu } from "./index"; export { createSessionToken } from "./modules/auth/session"; export { listAll } from "./modules/audit/repository";',
));

const isRead = (sql) => /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sql);
export function fakeD1(sqlite) {
  const stmt = (sql, args = []) => ({
    sql, args,
    bind: (...a) => stmt(sql, a),
    first: async (col) => { const r = sqlite.prepare(sql).get(...args); return r ? (col ? r[col] : { ...r }) : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    raw: async () => sqlite.prepare(sql).all(...args).map((r) => Object.values(r)),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  const exec1 = (s) => (isRead(s.sql) ? { results: sqlite.prepare(s.sql).all(...s.args).map((r) => ({ ...r })), meta: { changes: 0 } } : { results: [], meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } });
  return {
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => {
      sqlite.exec("BEGIN");
      try { const out = stmts.map(exec1); sqlite.exec("COMMIT"); return out; } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
    exec: async (sql) => { sqlite.exec(sql); return { count: 1 }; },
  };
}

export const SECRET = "a".repeat(48);
const NOW = "2026-09-01T00:00:00.000Z";

/** Gieo tài khoản có hồ sơ + quyền. */
export function seedStaff(sqlite, { id, phone, name, perms }) {
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', '${name}', 1, '${NOW}', '${NOW}')`);
  sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-${id}', '${name}', '${NOW}', '${NOW}')`);
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '${phone}', 'x', 'sales', 1, '${NOW}', 'pty-${id}')`);
  for (const p of perms) sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${id}-${p}', '${id}', '${p}', '${NOW}', '${NOW}', '${NOW}')`);
}

/** Mã chính sách của mốc GIẢ khung thử (Ruling N-9 (iii)) — bài thấy mã này trong dữ liệu là biết mình đang chạy mốc giả. */
export const MOC_GIA_POLICY_ID = "moc-gia-khung-thu";

/**
 * Dựng một "thế giới" thử: SQLite thật + CẢ ứng dụng. MẶC ĐỊNH dùng mốc tối thiểu THẬT (hàm tiêm của gốc lắp ráp đọc chính sách gieo 360 phút) — bài nào
 * vô tình chạm mốc 6 giờ sẽ ĐỎ, không bị che. Tuỳ chọn (ADR-0049 D2 — Ruling N-9, TC-26):
 * - `mocGiaChoBaiKhongKiemMoc: <phút>` — CHỈ cho bài KHÔNG kiểm mốc (vd xác nhận đơn đón "hôm nay" để kiểm việc khác): hàm tiêm GIẢ trả mốc do bài chỉ
 *   định (`policyId` = MOC_GIA_POLICY_ID). Bài kiểm luật mốc / đặt gấp KHÔNG được dùng (bài canh ở src/modules/orders/dat-gap.test.ts).
 * - `khongTiemMoc: true` — bỏ hàm tiêm mốc (TC-26: route phải trả 503, không đoán con số).
 * - `demMoc: true` — mốc giả 360 phút có ĐẾM số lần gọi (`w.soLanGoiMoc()`) — TC-26 "đúng một lần mỗi request".
 * - `khongTiemNhan: true` — bỏ hàm tiêm nhãn người bấm (ruling R-P20: route để trống nhãn, không đoán). `demNhan: true` — nhãn GIẢ có ĐẾM số lần gọi
 *   (`w.soLanGoiNhan()`, mỗi lần một mảng id) — "một lần mỗi request cho cả danh sách".
 */
export function world(tuyChon = {}) {
  const sqlite = openDb();
  let soLanGoiMoc = 0;
  const goiNhan = [];
  let ungDung = app.default;
  if (tuyChon.mocGiaChoBaiKhongKiemMoc !== undefined) {
    const phut = tuyChon.mocGiaChoBaiKhongKiemMoc;
    ungDung = app.taoAppChoKhungThu({ mocToiThieu: async () => ({ phut, policyId: MOC_GIA_POLICY_ID, canhBaoPhut: 120 }) });
  } else if (tuyChon.khongTiemMoc) {
    ungDung = app.taoAppChoKhungThu({ mocToiThieu: undefined });
  } else if (tuyChon.demMoc) {
    ungDung = app.taoAppChoKhungThu({ mocToiThieu: async () => (soLanGoiMoc++, { phut: 360, policyId: MOC_GIA_POLICY_ID, canhBaoPhut: 120 }) });
  } else if (tuyChon.khongTiemNhan) {
    ungDung = app.taoAppChoKhungThu({ nhanNhanVien: undefined });
  } else if (tuyChon.demNhan) {
    ungDung = app.taoAppChoKhungThu({ nhanNhanVien: async (_env, ids) => (goiNhan.push([...ids]), new Map(ids.map((id) => [id, `Nhãn ${id.slice(0, 4)}`]))) });
  }
  const env = { DB: fakeD1(sqlite), SESSION_SECRET: SECRET, STAFF_SHEET_ID: "x", SERVICES_SHEET_ID: "x" };
  // Danh mục đã đồng bộ gần đây để POST /api/orders không đi gọi Google Sheet.
  sqlite.exec(`UPDATE catalog_sync SET last_attempt_at = '${new Date().toISOString()}', last_success_at = '${new Date().toISOString()}' WHERE id = 'default'`);
  const exec = { waitUntil: () => {}, passThroughOnException: () => {} };
  async function call(method, path, { as, body, headers = {} } = {}) {
    const h = { ...headers };
    if (as) h.cookie = `td_session=${await app.createSessionToken(SECRET, as)}`;
    if (body !== undefined && h["content-type"] === undefined) h["content-type"] = "application/json";
    if (method !== "GET" && h.origin === undefined) h.origin = "https://booking.tourdao.vn";
    if (h.origin === null) delete h.origin;
    const res = await ungDung.fetch(new Request(`https://booking.tourdao.vn${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env, exec);
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  return { sqlite, env, call, q: (sql, ...a) => sqlite.prepare(sql).all(...a), soLanGoiMoc: () => soLanGoiMoc, soLanGoiNhan: () => goiNhan.length, goiNhan: () => goiNhan };
}
