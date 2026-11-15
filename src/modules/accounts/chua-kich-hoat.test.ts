// Tài khoản CHƯA KÍCH HOẠT (ADR-0207 Đ7; đợt 1 Task 7): phiếu đã duyệt sinh tài khoản `active = 0` mà người đăng ký chưa đặt PIN. Bốn lệnh hỗ trợ đăng nhập (đặt lại PIN, mở khoá,
// kích hoạt lại bằng PATCH, tắt lớp hai) phải từ chối 409, KHÔNG ghi gì — đường duy nhất là «Gửi lại lời mời». Chạy CHÍNH handler của module accounts (gói bằng esbuild như
// reset-pin-self.test.ts) trên SQLite thật; `ctx.chuaKichHoat` ở đây là truy vấn thật của dang-ky (cùng câu SQL), còn `src/index.ts` được canh bằng đọc nguồn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import type { PermissionCode, StaffProfile } from "../../shared/contracts.ts";
import type { Ctx } from "../../shared/router.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-15T03:00:00.000Z";
const SUPER = "0a000000-0000-4000-8000-000000000002";
const CHUA = "0a000000-0000-4000-8000-0000000000c1"; // tài khoản tắt, phiếu ĐÃ DUYỆT chưa kích hoạt
const DA = "0a000000-0000-4000-8000-0000000000c2"; // đã kích hoạt (phiếu có activated_at), đang bật
const THUONG = "0a000000-0000-4000-8000-0000000000c3"; // tài khoản thường, không phiếu
const TAT_THUONG = "0a000000-0000-4000-8000-0000000000c4"; // tài khoản thường bị ngưng, không phiếu

type Module = typeof import("./index.ts");
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Module;
}
const { accountsModule } = await loadModule();
const routeOf = (method: string, path: string) => {
  const r = accountsModule.routes.find((x) => x.method === method && x.path === path);
  assert.ok(r, `không tìm thấy route ${method} ${path}`);
  return r;
};

/** D1 giả tối thiểu trên SQLite thật; đếm mọi lần ghi (run/batch) để khẳng định nhánh bị chặn KHÔNG ghi gì. */
function fakeD1(sqlite: DatabaseSync): { db: D1Database; writes: string[] } {
  const writes: string[] = [];
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql,
    args,
    bind: (...next: SupportedValueType[]) => stmt(sql, next),
    first: async (col?: string) => {
      const row = sqlite.prepare(sql).get(...args) as Record<string, unknown> | undefined;
      return row ? (col ? (row[col] ?? null) : row) : null;
    },
    all: async () => ({ success: true, meta: {}, results: sqlite.prepare(sql).all(...args) }),
    run: async () => {
      writes.push(sql);
      return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } };
    },
  });
  const db = {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => {
          writes.push(s.sql);
          return { success: true, meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db: db as unknown as D1Database, writes };
}

function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  const nguoi = (id: string, phone: string, active: number, perm: string, vai: string) => {
    const party = `pty-${id}`;
    sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-11-01', ?, ?)").run(`ptr-${id}`, party, vai, AT, AT);
    sqlite.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'pin-cu', 'sales', ?, ?, ?)").run(id, phone, active, AT, party);
    sqlite.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`perm-${id}`, id, perm, AT, AT, AT);
  };
  nguoi(SUPER, "0901000002", 1, "SUPER_ADMIN", "IT");
  nguoi(CHUA, "0902000001", 0, "PARTNER", "HOTEL_RECEPTION");
  nguoi(DA, "0902000002", 1, "PARTNER", "HOTEL_RECEPTION");
  nguoi(THUONG, "0902000003", 1, "SALES", "SALES_STAFF");
  nguoi(TAT_THUONG, "0902000004", 0, "SALES", "SALES_STAFF");
  const phieu = (id: string, staffId: string, activatedAt: string | null) => {
    sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'HOTEL_RECEPTION', ?, ?)").run(id, AT, AT);
    for (const st of ["CHO_XAC_MINH", "CHO_DUYET", "DA_DUYET"]) sqlite.prepare("UPDATE dk_registration SET status = ?, updated_at = ? WHERE id = ?").run(st, AT, id);
    sqlite.prepare("UPDATE dk_registration SET staff_id = ?, activated_at = ? WHERE id = ?").run(staffId, activatedAt, id);
  };
  phieu("DK_AAAAAAAA", CHUA, null);
  phieu("DK_BBBBBBBB", DA, AT);
  return sqlite;
}

const profile = (id: string, permissions: PermissionCode[]): StaffProfile => ({ id, fullName: "Người thao tác", phone: "0900000000", partyId: `pty-${id}`, permissions });
const chuaKichHoatThat = (sqlite: DatabaseSync) => async (staffId: string) =>
  sqlite.prepare("SELECT 1 FROM dk_registration WHERE staff_id = ?1 AND status = 'DA_DUYET' AND activated_at IS NULL LIMIT 1").get(staffId) !== undefined;

async function call(sqlite: DatabaseSync, method: string, path: string, targetId: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown>; writes: string[] }> {
  const { db, writes } = fakeD1(sqlite);
  const url = new URL(`https://booking.test${path.replace(":id", targetId)}`);
  const init: RequestInit = { method, headers: { "content-type": "application/json", origin: "https://booking.test" }, body: body === undefined ? undefined : JSON.stringify(body) };
  const ctx = {
    request: new Request(url, init), env: { DB: db }, url, params: { id: targetId }, staff: profile(SUPER, ["ADMIN", "SUPER_ADMIN"]), dongBangTin: () => undefined,
    chuaKichHoat: chuaKichHoatThat(sqlite), gopHoSo: { conNoTraSau: async () => [] },
  } as unknown as Ctx;
  const res = await routeOf(method, path).handler(ctx);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, writes };
}

const scalar = (sqlite: DatabaseSync, sql: string): unknown => Object.values(sqlite.prepare(sql).get() ?? {})[0];
const CAU = "Tài khoản chưa kích hoạt — dùng \"Gửi lại lời mời\"";
const BON_LENH = [
  ["đặt lại PIN", "POST", "/api/staff/:id/reset-pin", undefined],
  ["mở khoá đăng nhập", "POST", "/api/staff/:id/unlock", undefined],
  ["kích hoạt lại (PATCH active)", "PATCH", "/api/staff/:id", { active: true }],
  ["tắt bảo mật hai lớp", "POST", "/api/staff/:id/mfa-reset", undefined],
] as const;

for (const [ten, method, path, body] of BON_LENH) {
  test(`${ten} cho tài khoản CHƯA KÍCH HOẠT → 409 đúng câu, không ghi gì (PIN, bật/tắt, nhật ký giữ nguyên)`, async () => {
    const sqlite = seed();
    const r = await call(sqlite, method, path, CHUA, body);
    assert.equal(r.status, 409, JSON.stringify(r.body));
    assert.equal((r.body.error as { message: string }).message, CAU);
    assert.deepEqual(r.writes, [], "nhánh bị chặn không được chạy câu ghi nào");
    assert.equal(scalar(sqlite, `SELECT pin_hash FROM staff WHERE id = '${CHUA}'`), "pin-cu");
    assert.equal(scalar(sqlite, `SELECT active FROM staff WHERE id = '${CHUA}'`), 0);
    assert.equal(scalar(sqlite, "SELECT count(*) FROM audit_log WHERE action IN ('pin_reset', 'login_unlocked', 'mfa_reset', 'staff_updated')"), 0);
  });
}

test("đối chứng: tài khoản thường và tài khoản đã kích hoạt KHÔNG bị chặn bởi luật chưa kích hoạt (cả bốn lệnh)", async () => {
  for (const mucTieu of [THUONG, DA]) {
    for (const [ten, method, path, body] of BON_LENH.filter((l) => l[1] !== "PATCH")) {
      const r = await call(seed(), method, path, mucTieu, body);
      assert.notEqual((r.body.error as { code?: string } | undefined)?.code, "chua_kich_hoat", `${ten} cho ${mucTieu}`);
      assert.equal(r.status, 200, `${ten} cho ${mucTieu}: ${JSON.stringify(r.body)}`);
    }
  }
});

test("đối chứng PATCH: kích hoạt lại tài khoản thường bị ngưng → 200 và bật được (cùng dựng với ca bị chặn)", async () => {
  const sqlite = seed();
  const r = await call(sqlite, "PATCH", "/api/staff/:id", TAT_THUONG, { active: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(scalar(sqlite, `SELECT active FROM staff WHERE id = '${TAT_THUONG}'`), 1);
});

test("PATCH đổi tên (không đụng active) tài khoản chưa kích hoạt vẫn được — chỉ lệnh bật bị chặn", async () => {
  const sqlite = seed();
  const r = await call(sqlite, "PATCH", "/api/staff/:id", CHUA, { fullName: "Tên Mới" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

test("phiếu đã kích hoạt rồi mà tài khoản bị ngưng sau đó: kích hoạt lại bằng tay là việc thường, không bị chặn", async () => {
  const sqlite = seed();
  sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(DA);
  const r = await call(sqlite, "PATCH", "/api/staff/:id", DA, { active: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

test("gốc lắp ráp src/index.ts tiêm chuaKichHoat từ dang-ky (thiếu tiêm = luật im lặng vô hiệu)", () => {
  const index = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
  assert.match(index, /^import \{[^}]*\bchuaKichHoat\b[^}]*\} from "\.\/modules\/dang-ky"/m);
  assert.match(index, /^\s+chuaKichHoat: \(env, staffId\) => chuaKichHoat\(env\.DB, staffId\),/m); // neo đầu dòng: dòng đã thành chú thích không khớp
});
