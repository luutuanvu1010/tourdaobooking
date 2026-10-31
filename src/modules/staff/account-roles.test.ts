// Đổi vai / chỉnh tay / tạo tài khoản theo vai (ADR-0018) — chạy CHÍNH các câu lệnh module staff dựng (gói bằng esbuild như
// src/modules/accounts/patch-staff.test.ts, vì index.ts import module khác bằng thư mục) trên SQLite thật dựng từ migrations/*.sql, CÓ trigger LC-1/LC-3.
// Mỗi ca chạy batch đúng thứ tự route (Task 7) dùng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import type { StaffAccount } from "../../shared/contracts.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";
const TODAY = "2026-09-24";

type Module = typeof import("./index.ts");
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Module;
}
const staff = await loadModule();

interface Stmt { sql: string; args: SupportedValueType[] }
function fakeD1(sqlite: DatabaseSync): D1Database {
  const bound = (sql: string, args: SupportedValueType[]) => ({
    sql,
    args,
    all: async () => ({ results: (sqlite.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) }),
    first: async () => {
      const row = sqlite.prepare(sql).get(...args);
      return row ? { ...row } : null;
    },
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return {
    // Như D1 thật: câu không tham số gọi thẳng .all()/.first() không qua bind (tenVaiTaiKhoan → tenLoaiVai — Task 3b).
    prepare: (sql: string) => ({ ...bound(sql, []), bind: (...args: SupportedValueType[]) => bound(sql, args) }),
    batch: async (stmts: Stmt[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ meta: { changes: sqlite.prepare(s.sql).run(...s.args).changes } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
}

/** Schema đầy đủ + quản trị viên + một tài khoản CŨ (vai STAFF từ 19/9, quyền SALES + ACCOUNTING). */
function seed(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  const account = (id: string, phone: string, perms: string[]) => {
    const party = `pty-${id}`;
    sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'STAFF', NULL, '2026-09-19', ?, ?)").run(`ptr-${id}`, party, AT, AT);
    sqlite.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(id, phone, AT, party);
    for (const p of perms) sqlite.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`perm-${id}-${p}`, id, p, AT, AT, AT);
  };
  account("s-adm", "0900000001", ["ADMIN", "SUPER_ADMIN"]);
  account("s-old", "0900000002", ["SALES", "ACCOUNTING"]);
  return { sqlite, db: fakeD1(sqlite) };
}

const openPerms = (sqlite: DatabaseSync, id: string) =>
  (sqlite.prepare("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c").all(id) as { c: string }[]).map((r) => r.c);
const openRoles = (sqlite: DatabaseSync, party: string) =>
  (sqlite.prepare("SELECT role_type_code AS c FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL ORDER BY c").all(party) as { c: string }[]).map((r) => r.c);
/** Dòng chỉnh tay đang mở, dạng "MÃ_QUYỀN:CHIỀU" (I-1: kiểm độc lập vòng 1) — đủ gọn để so bằng deepEqual mà vẫn thấy cả mã lẫn chiều. */
const openAdj = (sqlite: DatabaseSync, id: string) =>
  (sqlite.prepare("SELECT permission_type_code AS p, direction AS d FROM stf_permission_adjustment WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY p, d").all(id) as { p: string; d: string }[]).map(
    (r) => `${r.p}:${r.d}`,
  );
const account = async (db: D1Database, id: string): Promise<StaffAccount> => (await staff.getStaffAccount(db, id))!;

/**
 * Chạy một lần đổi vai theo ĐÚNG thứ tự route (Task 7): có câu chốt gỡ ADMIN → hai batch; không → một batch. Lô 1 (khi có chốt) THUA
 * (câu đầu changes = 0) thì DỪNG, không chạy lô vai — một lần đổi là MỘT khối, không áp nửa vời (I-1: kiểm độc lập vòng 1). Trả kèm
 * `batch1` (kết quả lô đầu — khi KHÔNG có chốt, đó chính là kết quả của batch MỘT-LẦN-DUY-NHẤT gồm cả vai/chỉnh tay/quyền, không phải
 * mảng rỗng) để test tự kiểm từng câu đã áp dụng hay chưa. `midRace` (nếu có) chạy NGAY SAU khi câu lệnh đã dựng xong nhưng TRƯỚC khi
 * batch đầu chạy — chỗ để giả lập "chen giữa" (Ruling R21: quản trị viên khác vừa mất quyền ngay sau khi route đọc trạng thái).
 */
async function change(
  db: D1Database,
  id: string,
  next: { roles: string[]; adds?: string[]; removes?: string[]; reason?: string | null },
  midRace?: () => void,
) {
  const acc = await account(db, id);
  const state = (await staff.getAccountRoleState(db, acc, TODAY))!;
  const c = staff.roleChangeStatements(db, {
    account: acc, partyId: acc.partyId!, state,
    next: { roles: next.roles as never, adds: (next.adds ?? []) as never, removes: (next.removes ?? []) as never, reason: next.reason ?? null },
    actorId: "s-adm", at: AT, today: TODAY,
  });
  midRace?.();
  const batch1 = c.permissions.guarded
    ? await db.batch([c.permissions.guarded, ...c.permissions.rest, ...c.adjustmentStatements])
    : await db.batch([...c.roleStatements, ...c.adjustmentStatements, ...c.permissions.rest]);
  if (c.permissions.guarded && (batch1[0]!.meta.changes ?? 0) !== 0 && c.roleStatements.length) await db.batch(c.roleStatements);
  return { ...c, batch1 };
}

test("chuyển tài khoản cũ sang vai mới: vai STAFF đóng hôm qua, quyền = bộ mặc định (mất Kế toán nếu không cộng tay)", async () => {
  const { sqlite, db } = seed();
  const c = await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(c.next, ["SALES"]);
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"]);
  const staffRow = sqlite.prepare("SELECT valid_to_date FROM pty_party_role WHERE id = 'ptr-s-old'").get() as { valid_to_date: string };
  assert.equal(staffRow.valid_to_date, "2026-09-23", "vai cũ đóng vào hôm qua (bắt đầu trước hôm nay)");
});

test("cộng tay có lý do giữ quyền; trạng thái đọc lại được lý do; bỏ cộng tay thì đóng dòng chỉnh", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm kế toán" });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["ACCOUNTING", "SALES"]);
  const adj = sqlite.prepare("SELECT direction, reason FROM stf_permission_adjustment WHERE staff_id = 's-old' AND valid_to_at IS NULL").all() as object[];
  assert.deepEqual(adj.map((r) => ({ ...r })), [{ direction: "ADD", reason: "kiêm nhiệm kế toán" }]);
  const state = (await staff.getAccountRoleState(db, await account(db, "s-old"), TODAY))!;
  assert.deepEqual([state.roles, state.adds, state.removes, state.reason], [["SALES_STAFF"], ["ACCOUNTING"], [], "kiêm nhiệm kế toán"]);
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.equal((sqlite.prepare("SELECT count(*) AS n FROM stf_permission_adjustment WHERE staff_id = 's-old' AND valid_to_at IS NULL").get() as { n: number }).n, 0);
});

test("Review Focus 1–2: nội bộ → bên ngoài → nội bộ trong CÙNG ngày — không vấp trigger, mở lại dòng thay vì chèn chồng lấn", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  await change(db, "s-old", { roles: ["COLLABORATOR"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["PARTNER"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["COLLABORATOR"]);
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"]);
  const salesRows = (sqlite.prepare("SELECT count(*) AS n FROM pty_party_role WHERE party_id = 'pty-s-old' AND role_type_code = 'SALES_STAFF'").get() as { n: number }).n;
  assert.equal(salesRows, 1, "mở lại dòng cũ, không chèn dòng thứ hai");
});

test("gỡ ADMIN → có câu chốt 'còn quản trị viên khác' (route chạy hai batch)", async () => {
  const { db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "thử" });
  const acc = await account(db, "s-old");
  const state = (await staff.getAccountRoleState(db, acc, TODAY))!;
  const c = staff.roleChangeStatements(db, { account: acc, partyId: acc.partyId!, state, next: { roles: ["SALES_STAFF"], adds: [], removes: [], reason: null }, actorId: "s-adm", at: AT, today: TODAY });
  assert.notEqual(c.permissions.guarded, null);
});

// I-1 (kiểm độc lập vòng 1): chốt "còn quản trị viên khác" ở HAI câu chỉnh tay (đóng/mở stf_permission_adjustment) phải chạy CÙNG điều kiện
// và CÙNG số phận với các câu quyền trong lô 1 — hoặc cả lô áp dụng đủ, hoặc không câu nào áp dụng (kể cả hai câu chỉnh tay).
test("I-1 Case A: còn quản trị viên khác → gỡ ADMIN qua lô có chốt áp dụng đủ, kể cả hai câu chỉnh tay", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "thử" });
  const c = await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "đổi từ quản trị sang kế toán" });
  assert.notEqual(c.permissions.guarded, null);
  assert.deepEqual(c.batch1.map((r) => r.meta.changes ?? 0), [1, 1, 1, 1], "còn s-adm là quản trị viên khác: cả lô áp dụng đủ (kể cả hai câu chỉnh tay)");
  assert.deepEqual(openPerms(sqlite, "s-old"), ["ACCOUNTING", "SALES"]);
  assert.deepEqual(openAdj(sqlite, "s-old"), ["ACCOUNTING:ADD"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"]);
});

test("I-1 Case B: hết quản trị viên khác GIỮA CHỪNG (chạy đua) → không câu nào trong lô có chốt áp dụng, kể cả hai câu chỉnh tay", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "thử" });
  // Đọc trạng thái và dựng câu lệnh TRƯỚC — như route thật sẽ làm (đọc rồi mới ghi).
  const acc = await account(db, "s-old");
  const state = (await staff.getAccountRoleState(db, acc, TODAY))!;
  const c = staff.roleChangeStatements(db, {
    account: acc, partyId: acc.partyId!, state,
    next: { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: [], reason: "đổi từ quản trị sang kế toán" },
    actorId: "s-adm", at: AT, today: TODAY,
  });
  assert.notEqual(c.permissions.guarded, null);
  // Giả lập chạy đua: s-adm (quản trị viên khác) vừa bị ngưng hoạt động NGAY SAU khi đọc trạng thái, TRƯỚC khi lô có chốt chạy.
  sqlite.prepare("UPDATE staff SET active = 0 WHERE id = 's-adm'").run();
  const results = await db.batch([c.permissions.guarded!, ...c.permissions.rest, ...c.adjustmentStatements]);
  assert.deepEqual(results.map((r) => r.meta.changes ?? 0), [0, 0, 0, 0], "hết quản trị viên khác giữa chừng: không câu nào áp dụng, kể cả hai câu chỉnh tay");
  assert.deepEqual(openPerms(sqlite, "s-old"), ["ADMIN", "SALES"], "quyền không đổi");
  assert.deepEqual(openAdj(sqlite, "s-old"), ["ADMIN:ADD"], "dòng chỉnh tay không đổi");
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"], "vai không đổi");
});

test("tạo tài khoản theo vai: hồ sơ mới mang đúng vai (không STAFF), quyền = mặc định, dòng chỉnh tay có lý do", async () => {
  const { sqlite, db } = seed();
  const made = await staff.createAccountWithRolesStatements(db, {
    fullName: "Trần Văn Hướng", phone: "0911111111", existingPartyId: null, xemDanhBa: true,
    assignment: { roles: ["GUIDE_INTERNAL"], adds: ["SALES"], removes: [], reason: "kiêm bán vé" },
  }, "s-adm");
  assert.ok(made.ok);
  if (!made.ok) return;
  await db.batch(made.statements as never);
  assert.deepEqual(made.permissions, ["SALES", "FIELD"]);
  assert.deepEqual(openPerms(sqlite, made.id), ["FIELD", "SALES"]);
  assert.deepEqual(openRoles(sqlite, made.partyId), ["GUIDE_INTERNAL"]);
});

test("tạo tài khoản trên hồ sơ có sẵn: dùng lại hồ sơ, thêm vai; hồ sơ đã có tài khoản / tổ chức → báo lỗi", async () => {
  const { sqlite, db } = seed();
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-khach', 'PERSON', 'Khách Cũ', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-khach', 'Khách', ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-k', 'p-khach', 'CUSTOMER', NULL, '2026-09-01', ?, ?)").run(AT, AT);
  const input = (existingPartyId: string, roles: string[]) => ({ fullName: null, phone: "0922222222", existingPartyId, xemDanhBa: true, assignment: { roles: roles as never, adds: [], removes: [], reason: null } });
  const made = await staff.createAccountWithRolesStatements(db, input("p-khach", ["HOTEL_RECEPTION"]), "s-adm");
  assert.ok(made.ok);
  if (!made.ok) return;
  await db.batch(made.statements as never);
  assert.equal(made.partyId, "p-khach");
  assert.deepEqual(openRoles(sqlite, "p-khach"), ["CUSTOMER", "HOTEL_RECEPTION"]);
  assert.deepEqual(openPerms(sqlite, made.id), ["PARTNER"]);
  assert.deepEqual(await staff.createAccountWithRolesStatements(db, input("pty-s-old", ["SALES_STAFF"]), "s-adm"), { ok: false, message: "Hồ sơ này đã có tài khoản." });
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-org', 'ORGANIZATION', 'Cty', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES ('p-org', 'Cty', ?, ?)").run(AT, AT);
  assert.equal((await staff.createAccountWithRolesStatements(db, input("p-org", ["TRAVEL_AGENCY"]), "s-adm")).ok, false, "tài khoản công ty: giai đoạn 4");
});

// Ruling R26 (kiểm toàn nhánh 2026-09-24): hồ sơ có sẵn đang giữ vai tài khoản (nhóm nội bộ/bên ngoài, không gắn nơi, chưa đóng) mà người tạo
// KHÔNG chọn → quyền sẽ chỉ tính từ vai được chọn trong khi hồ sơ vẫn giữ vai kia (quyền lệch vai). Chặn theo lối an toàn: báo lỗi, bắt chọn cả vai đó.
test("Ruling R26: hồ sơ có sẵn đang giữ vai Kế toán — chỉ chọn Nhân viên kinh doanh → từ chối; chọn cả hai → quyền = hợp, không chèn trùng vai", async () => {
  const { sqlite, db } = seed();
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-kt', 'PERSON', 'Kế Toán Cũ', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-kt', 'Kế', ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-kt', 'p-kt', 'ACCOUNTANT', NULL, '2026-09-01', ?, ?)").run(AT, AT);
  const input = (roles: string[]) => ({ fullName: null, phone: "0933333333", existingPartyId: "p-kt", xemDanhBa: true, assignment: { roles: roles as never, adds: [], removes: [], reason: null } });
  assert.deepEqual(await staff.createAccountWithRolesStatements(db, input(["SALES_STAFF"]), "s-adm"), {
    ok: false,
    message: "Hồ sơ này đang giữ vai trò Kế toán: chọn cả vai trò này (hoặc đổi vai trò sau khi tạo).",
  });
  const made = await staff.createAccountWithRolesStatements(db, input(["SALES_STAFF", "ACCOUNTANT"]), "s-adm");
  assert.ok(made.ok);
  if (!made.ok) return;
  await db.batch(made.statements as never);
  assert.deepEqual(made.permissions, ["SALES", "ACCOUNTING"]);
  assert.deepEqual(openPerms(sqlite, made.id), ["ACCOUNTING", "SALES"]);
  assert.deepEqual(openRoles(sqlite, "p-kt"), ["ACCOUNTANT", "SALES_STAFF"]);
  const kt = (sqlite.prepare("SELECT count(*) AS n FROM pty_party_role WHERE party_id = 'p-kt' AND role_type_code = 'ACCOUNTANT'").get() as { n: number }).n;
  assert.equal(kt, 1, "vai Kế toán đã có: không chèn dòng thứ hai");
});

test("accountRoleCodes: vai mô hình mới đang mở của từng tài khoản (vai cũ STAFF không tính)", async () => {
  const { db } = seed();
  await change(db, "s-old", { roles: ["ACCOUNTANT"] });
  const map = await staff.accountRoleCodes(db, [await account(db, "s-old"), await account(db, "s-adm")]);
  assert.deepEqual(map.get("s-old"), ["ACCOUNTANT"]);
  assert.deepEqual(map.get("s-adm"), []);
});

// Ruling R21(a) (điều phối viên 2026-09-24): I-1 Case B chỉ thử một lần ĐỔI VAI GIẢ (roles không đổi, chỉ chỉnh tay) — roleStatements
// khi đó luôn rỗng nên "vai không đổi" đúng một cách tầm thường. Ca dưới đây là một lần ĐỔI VAI THẬT (đóng SALES_STAFF, mở Kế toán)
// kèm gỡ chỉnh tay Quản trị "ngủ" — route (Task 7, accounts/index.ts) chỉ chạy lô vai SAU KHI lô có chốt đã THẮNG; khi quản trị viên
// khác vừa mất quyền NGAY SAU khi câu lệnh được dựng (chen giữa), lô có chốt thua thì lô vai không được chạy — vai, quyền, chỉnh tay
// phải giữ NGUYÊN, không áp nửa vời.
test("Ruling R21(a): đổi vai THẬT gỡ Quản trị (SALES_STAFF + chỉnh tay Quản trị → Kế toán) — hết quản trị viên khác GIỮA CHỪNG: vai/quyền/chỉnh tay đều không đổi", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "thử" });
  const c = await change(db, "s-old", { roles: ["ACCOUNTANT"] }, () => {
    // Giả lập chạy đua: s-adm (quản trị viên khác) vừa bị ngưng hoạt động NGAY SAU khi câu lệnh được dựng, TRƯỚC khi lô có chốt chạy.
    sqlite.prepare("UPDATE staff SET active = 0 WHERE id = 's-adm'").run();
  });
  assert.notEqual(c.permissions.guarded, null, "gỡ ADMIN (chỉnh tay) nên phải có câu chốt");
  assert.ok(c.roleStatements.length > 0, "đây là một lần ĐỔI VAI THẬT (đóng SALES_STAFF, mở Kế toán), không chỉ chỉnh tay");
  assert.deepEqual(c.batch1.map((r) => r.meta.changes ?? 0), [0, 0, 0, 0], "hết quản trị viên khác giữa chừng: không câu nào trong lô 1 áp dụng");
  assert.deepEqual(openPerms(sqlite, "s-old"), ["ADMIN", "SALES"], "quyền không đổi");
  assert.deepEqual(openAdj(sqlite, "s-old"), ["ADMIN:ADD"], "dòng chỉnh tay không đổi");
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"], "vai KHÔNG đổi dù đã dựng sẵn câu đóng SALES_STAFF/mở Kế toán — route chỉ chạy lô vai khi lô có chốt THẮNG");
});
