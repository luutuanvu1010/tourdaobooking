// PROTOTYPE (không phải mã của repo): gọi HANDLER THẬT của route trên SQLite thật bằng một D1 giả, rồi quét audit_log.detail.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as esbuild from "esbuild";

const REPO = process.argv[2] ?? "/Users/tuanbao/.claude/jobs/80c8fdcd/tmp/review-e/repo";
const MIG = `${REPO}/migrations/`;

async function load(mod) {
  const built = await esbuild.build({ entryPoints: [`${REPO}/src/modules/${mod}/index.ts`], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
}

function d1(sqlite) {
  const mk = (sql, args = []) => ({
    sql, args,
    bind: (...a) => mk(sql, a),
    first: async (col) => { const r = sqlite.prepare(sql).get(...args); return r ? (col ? r[col] : r) : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args), meta: {} }),
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes }, success: true }),
  });
  const exec = (s) => { const st = sqlite.prepare(s.sql); return st.columns().length > 0 ? { results: st.all(...s.args), meta: { changes: 0 } } : { results: [], meta: { changes: st.run(...s.args).changes } }; };
  return {
    prepare: (sql) => mk(sql),
    batch: async (stmts) => {
      sqlite.exec("BEGIN");
      try { const out = stmts.map(exec); sqlite.exec("COMMIT"); return out; } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  };
}

const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
const FILES = readdirSync(MIG).filter((x) => x.endsWith(".sql")).sort();
for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(MIG + f, "utf8"));
sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('11111111-1111-4111-8111-111111111111', 'Quản Trị', '0845256256', 'x', 'admin', 1, '2026-09-19T05:00:00.000Z')`);
for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(MIG + f, "utf8"));
const DB = d1(sqlite);

// người thao tác: một admin có hồ sơ
const admin = { id: "11111111-1111-4111-8111-111111111111", fullName: "Quản Trị", phone: "0845256256", partyId: null, permissions: ["ADMIN"] };
admin.partyId = `pty-${admin.id}`;

const PII = { phone: "0912345678", phone2: "0987654321", email: "khach.pii@example.com", mst: "0312345678", mst13: "0312345678-001", addr: "12 Trần Phú Nha Trang" };

async function call(mod, method, pattern, path, body) {
  const m = await load(mod);
  const list = Object.values(m).find((v) => v && Array.isArray(v.routes) && v.name === mod);
  const r = list.routes.find((x) => x.method === method && x.path === pattern);
  if (!r) throw new Error(`không thấy route ${method} ${pattern}`);
  const url = new URL(`https://booking.tourdao.vn${path}`);
  const params = {}; pattern.split("/").forEach((seg, i) => { if (seg.startsWith(":")) params[seg.slice(1)] = path.split("/")[i]; });
  const request = new Request(url, { method, headers: { origin: url.origin, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const res = await r.handler({ request, env: { DB, SESSION_SECRET: "x" }, exec: { waitUntil() {} }, url, params, staff: admin, isAssigned: async () => false, defaultHandlerStatement: () => null });
  const txt = await res.text();
  return { status: res.status, body: txt.slice(0, 160) };
}

const out = [];
const log = async (label, p) => { const r = await p; out.push(`${r.status} ${label}${r.status >= 400 ? "  -> " + r.body : ""}`); return r; };

// hồ sơ tổ chức với đủ PII
const org = await log("POST /api/parties ORG", call("parties", "POST", "/api/parties", "/api/parties", {
  kind: "ORGANIZATION", displayName: "Đại lý Sao Biển", legalName: "Cty TNHH Sao Biển", taxCode: PII.mst13, address: PII.addr, invoiceEmail: PII.email,
  contacts: [{ kind: "PHONE", value: PII.phone }, { kind: "EMAIL", value: PII.email }],
}));
let orgId; try { orgId = JSON.parse(readFileSync ? (await (async () => sqlite.prepare("SELECT id FROM pty_party WHERE display_name = 'Đại lý Sao Biển'").get().id)()) : "") } catch { orgId = sqlite.prepare("SELECT id FROM pty_party WHERE display_name = 'Đại lý Sao Biển'").get()?.id; }
orgId = sqlite.prepare("SELECT id FROM pty_party WHERE display_name = 'Đại lý Sao Biển'").get()?.id;
await log("POST /api/parties PERSON", call("parties", "POST", "/api/parties", "/api/parties", { kind: "PERSON", fullName: "Nguyễn Văn Khách", contacts: [{ kind: "PHONE", value: PII.phone2 }] }));
if (orgId) {
  await log("POST contacts PHONE", call("parties", "POST", "/api/parties/:id/contacts", `/api/parties/${orgId}/contacts`, { kind: "PHONE", value: PII.phone2, label: "Kế toán" }));
  await log("POST contacts EMAIL", call("parties", "POST", "/api/parties/:id/contacts", `/api/parties/${orgId}/contacts`, { kind: "EMAIL", value: "ketoan." + PII.email }));
  const upd = sqlite.prepare("SELECT updated_at FROM pty_party WHERE id = ?").get(orgId).updated_at;
  await log("PUT party ORG", call("parties", "PUT", "/api/parties/:id", `/api/parties/${orgId}`, { active: true, expectedUpdatedAt: upd, displayName: "Đại lý Sao Biển", legalName: "Cty TNHH Sao Biển", taxCode: "0312345679", address: "99 Lê Thánh Tôn", invoiceEmail: "moi." + PII.email }));
}
// tài khoản
const created = await log("POST /api/staff", call("accounts", "POST", "/api/staff", "/api/staff", { fullName: "Lê Nhân Viên", phone: PII.phone, permissions: ["SALES"] }));
const sid = sqlite.prepare("SELECT id FROM staff WHERE phone = ?").get(PII.phone)?.id;
if (sid) await log("PATCH /api/staff/:id phone+name", call("accounts", "PATCH", "/api/staff/:id", `/api/staff/${sid}`, { fullName: "Lê Nhân Viên Hai", phone: PII.phone2 }));
// địa điểm
await log("POST /api/locations", call("locations", "POST", "/api/locations", "/api/locations", { code: "BEN_TEST", name: "Bến Test", locationTypeCode: "PIER", address: PII.addr }));
// bảo trì (admin là chủ: nằm trong allowed_phones)
sqlite.exec("UPDATE mnt_setting SET allowed_phones = '0845256256, 0912345678' WHERE id = 'default'");
await log("PUT /api/maintenance", call("maintenance", "PUT", "/api/maintenance", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 3600e3).toISOString() }));

console.log(out.join("\n"));
const rows = sqlite.prepare("SELECT action, detail FROM audit_log ORDER BY rowid").all();
console.log(`\n${rows.length} dòng audit_log:`);
for (const r of rows) console.log(`  ${r.action.padEnd(26)} ${r.detail ?? "(null)"}`);
const seeds = Object.values(PII).concat(["0312345679", "0845256256"]);
const hits = rows.filter((r) => seeds.some((s) => (r.detail ?? "").includes(s)));
console.log(`\nDÒNG CHỨA GIÁ TRỊ PII ĐÃ GIEO: ${hits.length}`);
for (const h of hits) console.log("  !!", h.action, h.detail);
