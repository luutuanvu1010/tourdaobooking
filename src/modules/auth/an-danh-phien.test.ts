// ADR-0126 đ8 — ẩn danh IP / User-Agent của sổ phiên (việc 3 của lát H-5). Chạy trên SQLite THẬT trong bộ nhớ dựng từ migrations/*.sql, không chạm D1 thật.
// Ẩn danh hoá là cửa một chiều: bài chỉ dùng DB thử. Thời hạn giữ không có số nào trong mã — `hanGiuPhienNgay` chỉ đọc cột `session_retention_days` của chính sách.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
// index.ts của module không nạp được dưới node --test (import thư mục) — import thẳng repository/ledger như các bài sổ phiên khác; bài (5) kiểm riêng phần công bố ở index.ts.
import { anDanhPhienCuaTaiKhoanStatement, anDanhPhienCuStatement, demPhienCanAnDanh, endSessionStatement, getSession, insertSessionStatement } from "./repository.ts";
import { toSessionDto } from "./session-ledger.ts";
import { hanGiuPhienNgay } from "../parties/repository.ts";
import { createApp, route, type AppModule } from "../../shared/router.ts";
import type { StaffProfile } from "../../shared/contracts.ts";
import { json } from "../../shared/http.ts";

const DIR = new URL("../../../migrations/", import.meta.url);

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => {
      const r = sqlite.prepare(sql).get(...args);
      return r ? { ...r } : null;
    },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: (sql: string) => stmt(sql) } as unknown as D1Database;
}

function setup(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const [id, phone] of [["X", "0900000001"], ["Y", "0900000002"]] as const) {
    sqlite.exec(`INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('${id}', '${phone}', 'x', 'sales', '', 1, '2026-01-01T00:00:00Z')`);
  }
  return { sqlite, db: fakeD1(sqlite) };
}

const T = "2026-10-10T00:00:00.000Z";
const AT = "2026-10-17T00:00:00.000Z";
const LATER = "2026-12-01T00:00:00.000Z";
const phien = (id: string, staffId: string, single: 0 | 1, at: string) => ({
  id, staffId, method: "PIN", single, trustedDeviceId: null, deviceLabel: `Máy ${id}`, userAgent: `UA-${id}`, ip: `10.0.0.${id.length}`, at, expiresAt: LATER,
});

async function gieo(db: D1Database) {
  // X: x1 sống (single 1), x2 kết thúc trước T, x3 kết thúc đúng T. Y: y1 kết thúc trước T.
  await insertSessionStatement(db, phien("x1", "X", 1, "2026-10-12T00:00:00.000Z")).run();
  await insertSessionStatement(db, phien("x2", "X", 0, "2026-09-01T00:00:00.000Z")).run();
  await insertSessionStatement(db, phien("x3", "X", 0, "2026-09-02T00:00:00.000Z")).run();
  await insertSessionStatement(db, phien("y1", "Y", 0, "2026-09-03T00:00:00.000Z")).run();
  await endSessionStatement(db, "x2", "dang_xuat", "2026-10-01T00:00:00.000Z", "X").run();
  await endSessionStatement(db, "x3", "dang_xuat", T, "X").run();
  await endSessionStatement(db, "y1", "dang_xuat", "2026-10-02T00:00:00.000Z", "Y").run();
}

test("(1) ẩn danh phiên của một tài khoản: rỗng ip và user_agent đúng các dòng của X, giữ nguyên phần còn lại", async () => {
  const { db, sqlite } = setup();
  await gieo(db);
  const truoc = sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r }));
  const kq = await anDanhPhienCuaTaiKhoanStatement(db, "X", AT, "ADMIN").run();
  assert.equal(kq.meta.changes, 3);
  const sau = sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r }));
  assert.equal(sau.length, truoc.length, "không xoá dòng nào");
  for (const [i, s] of sau.entries()) {
    const t = truoc[i]!;
    const cua = s.staff_id === "X";
    const { ip, user_agent, updated_at, updated_by, ...conLai } = s;
    const { ip: _a, user_agent: _b, updated_at: _c, updated_by: _d, ...conLaiTruoc } = t;
    assert.deepEqual(conLai, conLaiTruoc, `${s.id}: các cột khác nguyên (device_label, created_at, method, ended_at, end_reason…)`);
    if (cua) {
      assert.equal(ip, null);
      assert.equal(user_agent, null);
      assert.equal(updated_at, AT);
      assert.equal(updated_by, "ADMIN");
    } else {
      assert.equal(ip, t.ip);
      assert.equal(user_agent, t.user_agent);
      assert.equal(updated_at, t.updated_at);
    }
  }
  assert.equal((await anDanhPhienCuaTaiKhoanStatement(db, "X", AT, "ADMIN").run()).meta.changes, 0, "chạy lại không đổi dòng nào");
});

test("(2) ẩn danh phiên cũ: chỉ phiên ended_at < T; phiên sống và phiên kết thúc đúng T nguyên; lần hai changes = 0", async () => {
  const { db } = setup();
  await gieo(db);
  assert.equal(await demPhienCanAnDanh(db, T), 2, "x2 và y1");
  const kq = await anDanhPhienCuStatement(db, T, AT, "cron").run();
  assert.equal(kq.meta.changes, 2);
  for (const id of ["x2", "y1"]) {
    const s = (await getSession(db, id))!;
    assert.equal(s.ip, null, id);
    assert.equal(s.user_agent, null, id);
    assert.equal(s.device_label, `Máy ${id}`);
  }
  for (const id of ["x1", "x3"]) {
    const s = (await getSession(db, id))!;
    assert.equal(s.user_agent, `UA-${id}`, `${id} nguyên`);
    assert.notEqual(s.ip, null, id);
  }
  assert.equal(await demPhienCanAnDanh(db, T), 0);
  assert.equal((await anDanhPhienCuStatement(db, T, AT, "cron").run()).meta.changes, 0);
});

test("(3) toSessionDto của phiên đã ẩn danh trả ip: null", async () => {
  const { db } = setup();
  await gieo(db);
  await anDanhPhienCuaTaiKhoanStatement(db, "X", AT, "ADMIN").run();
  const dto = toSessionDto((await getSession(db, "x2"))!, null, AT, null);
  assert.equal(dto.ip, null);
  assert.equal(dto.deviceLabel, "Máy x2");
});

test("(4) hanGiuPhienNgay: chưa chính sách → null; bản MỚI NHẤT thắng kể cả khi rỗng", async () => {
  const { db, sqlite } = setup();
  assert.equal(await hanGiuPhienNgay(db), null);
  const dang = (v: number, ngay: number | null) =>
    sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, session_retention_days) VALUES (?, ?, 'thử', 'thử', ?, ?, 'X', ?, 'X', ?)")
      .run(`pol${v}`, v, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", ngay);
  dang(1, 7);
  assert.equal(await hanGiuPhienNgay(db), 7);
  dang(2, null);
  assert.equal(await hanGiuPhienNgay(db), null, "bản 2 rỗng thắng bản 1 có số");
  dang(3, 30);
  assert.equal(await hanGiuPhienNgay(db), 30);
});

const nv: StaffProfile = { id: "s1", fullName: "NV", phone: "0900000001", partyId: null, permissions: ["SALES"] };
function dungApp(tiem: Record<string, unknown>) {
  const mod: AppModule = {
    name: "giả",
    routes: [route("GET", "/api/thu", "staff", async (ctx) => {
      const cau = ctx.cauAnDanhPhien("s1", AT, "s1");
      return json({ cau: cau === null ? null : "co", han: await ctx.hanGiuPhienNgay() });
    })],
  };
  const app = createApp({
    modules: [mod],
    currentStaff: async () => ({ staff: nv, sessionId: "p" }),
    injected: { isAssigned: async () => false, maintenanceBlock: async () => null, ...tiem } as never,
  });
  return async () => (await app.fetch(new Request("http://x/api/thu"), {} as Env, {} as ExecutionContext)).json() as Promise<{ cau: string | null; han: number | null }>;
}

test("(5) router: không tiêm → cauAnDanhPhien null, hanGiuPhienNgay null; có tiêm → chuyển tiếp; gốc lắp ráp thật nối cả hai", async () => {
  assert.deepEqual(await dungApp({})(), { cau: null, han: null });
  const goi: string[] = [];
  const co = dungApp({
    cauAnDanhPhien: (_env: unknown, id: string, at: string, by: string) => (goi.push(`${id}|${at}|${by}`), {}),
    hanGiuPhienNgay: async () => 14,
  });
  assert.deepEqual(await co(), { cau: "co", han: 14 });
  assert.deepEqual(goi, [`s1|${AT}|s1`]);
  const goc = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
  assert.match(goc, /cauAnDanhPhien: \(env, staffId, at, by\) => anDanhPhienCuaTaiKhoanStatement\(env\.DB, staffId, at, by\)/);
  assert.match(goc, /hanGiuPhienNgay: \(env\) => hanGiuPhienNgay\(env\.DB\)/);
  const congBoAuth = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  assert.match(congBoAuth, /export \{[^}]*anDanhPhienCuaTaiKhoanStatement[^}]*anDanhPhienCuStatement[^}]*demPhienCanAnDanh[^}]*\} from "\.\/repository"/);
  const congBoParties = readFileSync(new URL("../parties/index.ts", import.meta.url), "utf8");
  assert.match(congBoParties, /export \{ hanGiuPhienNgay \} from "\.\/repository"/);
});
