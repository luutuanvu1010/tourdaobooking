// PATCH /api/staff/:id — chạy CHÍNH các câu lệnh route dựng (`patchStaffStatements`) trên SQLite thật (node:sqlite),
// schema dựng từ migrations/*.sql. Điều phải giữ: một PATCH là MỘT khối — hoặc mọi câu ghi cùng áp dụng kèm nhật ký,
// hoặc không câu nào áp dụng và không có dòng nhật ký nào (ARCHITECTURE quy tắc 3, đặc tả N1 §7.2).
//
// Vì sao gói bằng esbuild: mã nguồn import module khác bằng thư mục (`../staff`) — đúng cho wrangler/`tsc` nhưng Node
// không giải được, nên không import thẳng `index.ts` vào bài kiểm được. Gói đúng bằng esbuild (chính công cụ của dự án)
// rồi nạp bản gói: vẫn là MÃ THẬT của route, không phải bản chép tay SQL.
//
// Tình huống "chen giữa": một quản trị viên khác vừa làm mất quản trị viên trong khoảng giữa `checkAccountChange` (đọc)
// và `db.batch()` (ghi). Ở đây tái hiện bằng cách dựng dữ liệu sao cho vị từ `OTHER_ADMIN` trong câu chốt SAI ngay lúc
// batch chạy — đúng thứ D1 thấy khi hai batch bị tuần tự hoá (xem thêm ca song song thật ở tests/e2e/admin-race.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import type { StaffAccount } from "../../shared/contracts.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const NOW = "2026-09-20T10:00:00.000Z";

type Module = typeof import("./index.ts");
type StaffPatch = Parameters<Module["patchStaffStatements"]>[1]["patch"];

/** Nạp module accounts THẬT (đã gói) — một lần cho cả tệp kiểm. */
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Module;
}
const { patchStaffStatements } = await loadModule();

/** D1 giả: `prepare().bind()` chỉ ghi lại câu + tham số; `batch()` chạy tuần tự trong MỘT giao dịch như D1. */
interface FakeStatement {
  sql: string;
  args: SupportedValueType[];
}
function fakeD1(sqlite: DatabaseSync): D1Database {
  const db = {
    prepare: (sql: string) => ({ bind: (...args: SupportedValueType[]): FakeStatement => ({ sql, args }) }),
    batch: async (stmts: FakeStatement[]) => {
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
  };
  return db as unknown as D1Database;
}

/** Schema đầy đủ + hai tài khoản cũ được `0012` backfill thành hồ sơ (id hồ sơ = `pty-<id tài khoản>`). */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-adm', 'Nguyễn Tuyên Phong', '0845256256', 'x', 'admin', 1, '2026-09-19T05:00:00.000Z'),
    ('s-two', 'Trần Văn Bình', '0901000002', 'x', 'admin', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  return sqlite;
}

const account = (id: string, fullName: string, phone: string): StaffAccount =>
  ({ id, fullName, phone, partyId: `pty-${id}`, permissions: ["ADMIN"], active: true, createdAt: NOW });

const one = (sqlite: DatabaseSync, sql: string): unknown => Object.values(sqlite.prepare(sql).get() ?? {})[0];
const auditActions = (sqlite: DatabaseSync): string[] =>
  // bỏ dòng gieo của migration 0055 (catalog_groups_seeded, ADR-0058) — không phải dấu vết của thao tác đang thử
  (sqlite.prepare("SELECT action FROM audit_log WHERE action != 'catalog_groups_seeded' ORDER BY rowid").all() as { action: string }[]).map((r) => r.action);

/** Chạy một PATCH như route: dựng câu, batch, rồi trả `changes` của câu chốt (0 = bên thua → route trả 409 account_rule). */
async function run(sqlite: DatabaseSync, target: StaffAccount, patch: StaffPatch, losesAdmin: boolean): Promise<number | null> {
  const db = fakeD1(sqlite);
  const built = patchStaffStatements(db, { target, patch, adminId: "s-two", at: NOW, losesAdmin });
  assert.ok(built, "phải dựng được câu lệnh (tài khoản đã có hồ sơ)");
  const results = await db.batch(built.statements);
  return built.guardIndex >= 0 ? (results[built.guardIndex]!.meta.changes ?? 0) : null;
}

test("PATCH đổi tên + ngưng quản trị viên CUỐI: câu chốt thua → không đổi tên, không dòng nhật ký nào", async () => {
  const sqlite = seed();
  sqlite.exec("UPDATE stf_permission SET valid_to_at = '2099-01-01T00:00:00.000Z' WHERE staff_id = 's-two'"); // s-adm là quản trị viên hoạt động DUY NHẤT
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { fullName: "Nguyễn Đổi Tên", active: false }, true);
  assert.equal(changes, 0, "câu chốt phải thua (không còn quản trị viên hoạt động khác)");
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-adm'"), "Nguyễn Tuyên Phong", "tên hồ sơ KHÔNG được đổi khi bên thua");
  assert.equal(one(sqlite, "SELECT given_name FROM pty_person WHERE party_id = 'pty-s-adm'"), "Phong");
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 1, "tài khoản vẫn hoạt động");
  assert.deepEqual(auditActions(sqlite), [], "bên thua không để lại dấu vết kiểm toán nào");
});

test("PATCH đổi tên + ngưng khi CÒN quản trị viên khác: tên đổi, tài khoản ngưng, đủ nhật ký", async () => {
  const sqlite = seed();
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { fullName: "Nguyễn Đổi Tên", active: false }, true);
  assert.equal(changes, 1);
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-adm'"), "Nguyễn Đổi Tên");
  assert.equal(one(sqlite, "SELECT family_name || '|' || given_name FROM pty_person WHERE party_id = 'pty-s-adm'"), "Nguyễn|Tên");
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 0);
  assert.deepEqual(auditActions(sqlite), ["staff_updated", "staff_suspended"]);
});

test("PATCH đổi tên + đổi SĐT (không mất quản trị viên): tên và SĐT đổi, ĐÚNG một dòng nhật ký", async () => {
  const sqlite = seed();
  const changes = await run(sqlite, account("s-two", "Trần Văn Bình", "0901000002"), { fullName: "Trần Bình An", phone: "0901000099" }, false);
  assert.equal(changes, 1);
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-two'"), "Trần Bình An");
  assert.equal(one(sqlite, "SELECT phone FROM staff WHERE id = 's-two'"), "0901000099");
  assert.deepEqual(auditActions(sqlite), ["staff_updated"]);
});

test("PATCH chỉ đổi tên (không có câu chốt): tên đổi, một dòng nhật ký", async () => {
  const sqlite = seed();
  const changes = await run(sqlite, account("s-two", "Trần Văn Bình", "0901000002"), { fullName: "Trần Bình An" }, false);
  assert.equal(changes, null, "lần sửa chỉ-đổi-tên không có câu chốt");
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-two'"), "Trần Bình An");
  assert.equal(one(sqlite, "SELECT given_name FROM pty_person WHERE party_id = 'pty-s-two'"), "An");
  assert.deepEqual(auditActions(sqlite), ["staff_updated"]);
});

// Luật "nhật ký KHÔNG ghi SĐT/email/MST" (CLAUDE.md §7, đặc tả N1 §7.2; câu 4(b) ở docs/HANDOFF-N1.md — chủ chốt 2026-09-21: SỬA).
// Kiểm trên CHÍNH câu lệnh route dựng, nên nếu ai đưa số vào chi tiết nhật ký lần nữa thì bài này đỏ.
const PHONE_LIKE = /(?:\+84|0)[3-9]\d{8}\b/;
// Người kiểm độc lập (2026-09-21) chỉ ra regex trên bỏ lọt `84901000099`, `0901 000 099`, `0901.000.099`: nên so trên CHỮ SỐ thuần (bỏ mọi ký tự khác)
// và trên phần số quốc gia không có số 0 đầu ("901000099") — bắt được mọi dạng viết (0…, +84…, 84…, có dấu cách/chấm/gạch).
const digitsOf = (s: string): string => s.replace(/\D/g, "");
const assertNoPhoneDigits = (detail: string, ...phones: string[]): void => {
  const d = digitsOf(detail);
  for (const p of phones) assert.ok(!d.includes(digitsOf(p).replace(/^0/, "")), `nhật ký chứa chữ số của SĐT ${p}: ${detail}`);
  assert.ok(!/\d{9,}/.test(d), `nhật ký chứa dãy từ 9 chữ số trở lên (có thể là SĐT/MST): ${detail}`);
};
const detailsOf = (sqlite: DatabaseSync, action: string): string[] =>
  (sqlite.prepare("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid").all(action) as { detail: string | null }[]).map((r) => r.detail ?? "");

test("PATCH đổi SĐT: nhật ký staff_updated KHÔNG chứa SĐT cũ lẫn mới (chỉ nói có đổi SĐT đăng nhập)", async () => {
  const sqlite = seed();
  await run(sqlite, account("s-two", "Trần Văn Bình", "0901000002"), { phone: "0901000099" }, false);
  const details = detailsOf(sqlite, "staff_updated");
  assert.equal(details.length, 1, "vẫn đúng một dòng nhật ký");
  assert.doesNotMatch(details[0]!, PHONE_LIKE, `nhật ký không được chứa số điện thoại: ${details[0]}`);
  assertNoPhoneDigits(details[0]!, "0901000002", "0901000099");
  assert.match(details[0]!, /SĐT đăng nhập/, "vẫn phải nói rõ có đổi SĐT đăng nhập để admin đọc hiểu");
});

test("PATCH đổi tên + SĐT: nhật ký giữ 'tên cũ → tên mới' nhưng không ghi số", async () => {
  const sqlite = seed();
  await run(sqlite, account("s-two", "Trần Văn Bình", "0901000002"), { fullName: "Trần Bình An", phone: "0901000099" }, false);
  const [detail] = detailsOf(sqlite, "staff_updated");
  assert.match(detail!, /Trần Văn Bình.*→.*Trần Bình An/, "phần đổi tên vẫn được ghi");
  assert.doesNotMatch(detail!, PHONE_LIKE);
  assertNoPhoneDigits(detail!, "0901000002", "0901000099");
  assert.match(detail!, /SĐT đăng nhập/);
});

// ---------------------------------------------------------------------------------------------------------------------
// 8b (ADR-0016 điều 6, đặc tả passkey §2.6/§4.4; chủ chọn A-4 phương án 1, 2026-09-23): ngưng tài khoản gỡ mọi Face ID trong CÙNG lô ghi.
// Ba câu nối vào CUỐI batch (sau mọi mắt xích cũ): gỡ CÓ ĐIỀU KIỆN (chỉ khi tài khoản đã thật sự ngưng — câu chốt LAST_ADMIN thắng)
// → touch credentials_changed_at (changes() > 0, phải NGAY SAU câu gỡ) → nhật ký passkey_removed (changes() > 0).
// ---------------------------------------------------------------------------------------------------------------------
function addPasskey(sqlite: DatabaseSync, id: string, staffId: string): void {
  sqlite
    .prepare(
      `INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, valid_from_at, valid_to_at, created_at, updated_at)
       VALUES (?, ?, ?, 'pubkey-spki-der-base64url', -7, ?, 0, 'iPhone', NULL, '2026-09-19T06:00:00.000Z', NULL, '2026-09-19T06:00:00.000Z', '2026-09-19T06:00:00.000Z')`,
    )
    .run(id, staffId, `${id}-credential-0000000000`, `${id}-userhandle-00000000`);
}
const activeKeys = (sqlite: DatabaseSync, staffId: string): number =>
  Number(one(sqlite, `SELECT count(*) FROM aut_passkey WHERE staff_id = '${staffId}' AND valid_to_at IS NULL`));
/** Một dòng phiên còn sống (ADR-0075) cho tài khoản — để kiểm ngưng tài khoản kết thúc / KHÔNG kết thúc phiên. */
function addSession(sqlite: DatabaseSync, id: string, staffId: string): void {
  sqlite
    .prepare(
      `INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by)
       VALUES (?, ?, 'PIN', 1, NULL, 'iPhone · Safari', NULL, NULL, '2026-09-19T06:00:00.000Z', '2026-09-19T06:00:00.000Z', '2099-01-01T00:00:00.000Z', NULL, NULL, NULL, ?, '2026-09-19T06:00:00.000Z', NULL)`,
    )
    .run(id, staffId, staffId);
}
const sessionRow = (sqlite: DatabaseSync, id: string) =>
  sqlite.prepare("SELECT ended_at, end_reason, ended_by, updated_at, updated_by FROM aut_session WHERE id = ?").get(id) as Record<string, unknown>;
const credentialsChangedAt = (sqlite: DatabaseSync, staffId: string): unknown => one(sqlite, `SELECT credentials_changed_at FROM staff WHERE id = '${staffId}'`);

test("8b (a) ngưng tài khoản có 2 Face ID: gỡ cả 2, đẩy credentials_changed_at, ĐÚNG một dòng nhật ký passkey_removed", async () => {
  const sqlite = seed();
  addPasskey(sqlite, "pk-1", "s-adm");
  addPasskey(sqlite, "pk-2", "s-adm");
  addPasskey(sqlite, "pk-other", "s-two"); // khoá của người khác: không được đụng
  addSession(sqlite, "ss-adm", "s-adm");
  addSession(sqlite, "ss-two", "s-two");
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { active: false }, true);
  // ADR-0075 điều 4: phiên của tài khoản bị ngưng kết thúc trong cùng lô; phiên của người khác còn nguyên
  assert.deepEqual({ ...sessionRow(sqlite, "ss-adm") }, { ended_at: NOW, end_reason: "ngung", ended_by: "s-two", updated_at: NOW, updated_by: "s-two" });
  assert.equal(sessionRow(sqlite, "ss-two").ended_at, null);
  assert.equal(changes, 1, "câu chốt thắng");
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 0);
  assert.equal(activeKeys(sqlite, "s-adm"), 0, "mọi Face ID của tài khoản bị ngưng phải bị gỡ");
  assert.equal(
    one(sqlite, `SELECT count(*) FROM aut_passkey WHERE staff_id = 's-adm' AND valid_to_at = '${NOW}' AND updated_at = '${NOW}' AND updated_by = 's-two'`),
    2,
    "gỡ bằng valid_to_at = mốc của lần sửa (không xoá cứng), ghi người gỡ",
  );
  assert.equal(activeKeys(sqlite, "s-two"), 1, "khoá của tài khoản khác còn nguyên");
  assert.equal(credentialsChangedAt(sqlite, "s-adm"), Date.parse(NOW), "đẩy credentials_changed_at để thu hồi phiên cũ (A-3)");
  assert.equal(credentialsChangedAt(sqlite, "s-two"), null);
  assert.deepEqual(auditActions(sqlite), ["staff_suspended", "passkey_removed"]);
  const [detail] = detailsOf(sqlite, "passkey_removed");
  assert.equal(detail, "gỡ khi ngưng tài khoản");
  assertNoPhoneDigits(detail!, "0845256256");
});

test("8b (b) ngưng tài khoản KHÔNG có Face ID (kèm đổi tên): không nhật ký passkey_removed, không đẩy mốc, đổi tên + nhật ký cũ vẫn chạy", async () => {
  const sqlite = seed();
  addSession(sqlite, "ss-adm", "s-adm");
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { fullName: "Nguyễn Đổi Tên", active: false }, true);
  assert.equal(changes, 1);
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 0);
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-adm'"), "Nguyễn Đổi Tên", "đổi tên vẫn chạy");
  assert.equal(credentialsChangedAt(sqlite, "s-adm"), null, "không có khoá nào bị gỡ thì không đẩy mốc");
  assert.equal(sessionRow(sqlite, "ss-adm").end_reason, "ngung", "không có Face ID vẫn kết thúc phiên (ADR-0075 điều 4)");
  assert.deepEqual(auditActions(sqlite), ["staff_updated", "staff_suspended"]);
});

test("8b (c) ngưng quản trị viên CUỐI (câu chốt thua): Face ID còn nguyên, không đẩy mốc, không dòng nhật ký nào", async () => {
  const sqlite = seed();
  sqlite.exec("UPDATE stf_permission SET valid_to_at = '2099-01-01T00:00:00.000Z' WHERE staff_id = 's-two'");
  addPasskey(sqlite, "pk-1", "s-adm");
  addPasskey(sqlite, "pk-2", "s-adm");
  addSession(sqlite, "ss-adm", "s-adm");
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { fullName: "Nguyễn Đổi Tên", active: false }, true);
  assert.equal(changes, 0, "câu chốt phải thua");
  assert.equal(sessionRow(sqlite, "ss-adm").ended_at, null, "không ngưng được thì KHÔNG được kết thúc phiên (session_end_all_if_suspended)");
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 1);
  assert.equal(activeKeys(sqlite, "s-adm"), 2, "không ngưng được thì KHÔNG được gỡ Face ID");
  assert.equal(credentialsChangedAt(sqlite, "s-adm"), null);
  assert.deepEqual(auditActions(sqlite), []);
});

test("8b (d) PATCH không đụng active, hoặc active: true: không gỡ Face ID nào", async () => {
  const sqlite = seed();
  addPasskey(sqlite, "pk-1", "s-two");
  await run(sqlite, account("s-two", "Trần Văn Bình", "0901000002"), { fullName: "Trần Bình An", phone: "0901000099" }, false);
  assert.equal(activeKeys(sqlite, "s-two"), 1, "đổi tên/SĐT không gỡ Face ID");
  // Tài khoản đang ngưng mà còn khoá (dữ liệu lọt lưới, vd. ngưng bằng SQL): kích hoạt lại không gỡ gì.
  sqlite.exec("UPDATE staff SET active = 0 WHERE id = 's-two'");
  await run(sqlite, { ...account("s-two", "Trần Bình An", "0901000099"), active: false }, { active: true }, false);
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-two'"), 1);
  assert.equal(activeKeys(sqlite, "s-two"), 1, "kích hoạt lại không gỡ Face ID");
  assert.equal(credentialsChangedAt(sqlite, "s-two"), null);
  assert.deepEqual(auditActions(sqlite), ["staff_updated", "staff_reactivated"]);
});

test("8b (e) ngưng + đổi tên tài khoản CÓ Face ID: đổi tên chạy, rồi cả ba câu mới (gỡ, đẩy mốc, nhật ký) vẫn chạy sau câu đổi tên", async () => {
  const sqlite = seed();
  addPasskey(sqlite, "pk-1", "s-adm");
  addPasskey(sqlite, "pk-2", "s-adm");
  const changes = await run(sqlite, account("s-adm", "Nguyễn Tuyên Phong", "0845256256"), { fullName: "Nguyễn Đổi Tên", active: false }, true);
  assert.equal(changes, 1, "câu chốt thắng");
  assert.equal(one(sqlite, "SELECT active FROM staff WHERE id = 's-adm'"), 0);
  assert.equal(one(sqlite, "SELECT display_name FROM pty_party WHERE id = 'pty-s-adm'"), "Nguyễn Đổi Tên", "đổi tên vẫn chạy");
  assert.equal(activeKeys(sqlite, "s-adm"), 0, "mọi Face ID bị gỡ dù các câu gỡ đứng sau câu đổi tên");
  assert.equal(credentialsChangedAt(sqlite, "s-adm"), Date.parse(NOW), "đẩy credentials_changed_at");
  assert.deepEqual(auditActions(sqlite), ["staff_updated", "staff_suspended", "passkey_removed"]);
  assert.deepEqual(detailsOf(sqlite, "passkey_removed"), ["gỡ khi ngưng tài khoản"], "đúng một dòng nhật ký passkey_removed");
});
