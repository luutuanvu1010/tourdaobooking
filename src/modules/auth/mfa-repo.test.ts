// SQL bảo mật hai lớp (ADR-0074) chạy trên SQLite THẬT dựng từ migrations/*.sql: chống dùng lại mã TOTP, mã dự phòng một lần, máy tin hết hạn / thu hồi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  emailCodeBumpStatement, emailCodeInsertStatement, emailCodeOpen, emailCodeRevokeOpenStatement, emailCodeTryStatement,
  factorEndAllStatement, factorEndKeepOneStatement, factorEndStatement, factorInsertStatement, factorListLive, recoveryCountLeft, recoveryInsertStatement, recoveryRevokeAllStatement,
  recoveryUseStatement, totpConsumeStatement, trustedFind, trustedInsertStatement, trustedList, trustedRevokeAllStatement, trustedRevokeStatement, trustedTouchStatement,
} from "./mfa-repo.ts";

const DIR = new URL("../../../migrations/", import.meta.url);

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: (sql: string) => stmt(sql) } as unknown as D1Database;
}
function setup(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const [id, ph] of [["s1", "0900000001"], ["s2", "0900000002"]] as const)
    sqlite.exec(`INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('${id}', '${ph}', 'x', 'sales', '', 1, '2026-01-01T00:00:00Z')`);
  return { sqlite, db: fakeD1(sqlite) };
}
const T1 = "2026-10-02T00:00:00.000Z";
const T2 = "2026-10-02T00:05:00.000Z";
const FAR = "2026-11-02T00:00:00.000Z";
const totp = (id = "f1", staffId = "s1") => ({ id, staffId, kind: "TOTP" as const, secretEnc: "v1.aa.bb", email: null, at: T1, by: staffId });

test("yếu tố: thêm, liệt kê còn sống, đóng một yếu tố đúng người, đóng tất cả", async () => {
  const { db } = setup();
  await factorInsertStatement(db, totp()).run();
  assert.equal((await factorListLive(db, "s1")).length, 1);
  assert.equal((await factorListLive(db, "s2")).length, 0);
  assert.equal((await factorEndStatement(db, "f1", "s2", T2, "s2").run()).meta.changes, 0, "sai chủ thì không đóng được");
  assert.equal((await factorEndStatement(db, "f1", "s1", T2, "s1").run()).meta.changes, 1);
  assert.equal((await factorListLive(db, "s1")).length, 0);
  await factorInsertStatement(db, totp("f2")).run();
  await factorInsertStatement(db, { id: "f3", staffId: "s1", kind: "EMAIL", secretEnc: null, email: "a@b.vn", at: T1, by: "s1" }).run();
  assert.equal((await factorEndAllStatement(db, "s1", T2, "s1").run()).meta.changes, 2);
  assert.equal((await factorListLive(db, "s1")).length, 0);
});

test("gỡ giữ một (tài khoản nội bộ — Task 5): chỉ kết thúc khi còn yếu tố sống KHÁC của đúng người; yếu tố cuối → changes = 0", async () => {
  const { db } = setup();
  await factorInsertStatement(db, totp()).run();
  await factorInsertStatement(db, totp("g1", "s2")).run();
  assert.equal((await factorEndKeepOneStatement(db, "f1", "s1", T2, "s1").run()).meta.changes, 0, "yếu tố cuối (yếu tố của người khác không tính)");
  await factorInsertStatement(db, { id: "f3", staffId: "s1", kind: "EMAIL", secretEnc: null, email: "a@b.vn", at: T1, by: "s1" }).run();
  assert.equal((await factorEndKeepOneStatement(db, "f1", "s2", T2, "s2").run()).meta.changes, 0, "sai chủ");
  assert.equal((await factorEndKeepOneStatement(db, "f1", "s1", T2, "s1").run()).meta.changes, 1);
  assert.equal((await factorEndKeepOneStatement(db, "f3", "s1", T2, "s1").run()).meta.changes, 0, "còn một thì không gỡ nữa");
  assert.deepEqual((await factorListLive(db, "s1")).map((f) => f.id), ["f3"]);
});

test("chống dùng lại TOTP: chỉ đổi khi bước mới LỚN HƠN bước đã dùng; bước cũ/bằng → changes = 0; yếu tố đã đóng → 0", async () => {
  const { db, sqlite } = setup();
  await factorInsertStatement(db, totp()).run();
  assert.equal((await totpConsumeStatement(db, "f1", 100, T1).run()).meta.changes, 1);
  assert.equal((await totpConsumeStatement(db, "f1", 100, T2).run()).meta.changes, 0, "cùng bước (dùng lại)");
  assert.equal((await totpConsumeStatement(db, "f1", 99, T2).run()).meta.changes, 0, "bước cũ hơn");
  assert.equal((await totpConsumeStatement(db, "f1", 101, T2).run()).meta.changes, 1);
  assert.equal((sqlite.prepare("SELECT last_totp_step AS s FROM aut_mfa_factor WHERE id = 'f1'").get() as { s: number }).s, 101);
  await factorEndStatement(db, "f1", "s1", T2, "s1").run();
  assert.equal((await totpConsumeStatement(db, "f1", 500, T2).run()).meta.changes, 0);
});

test("mã dự phòng: dùng hai lần → lần hai changes = 0; đúng chủ; thu hồi cả bộ; đếm còn lại", async () => {
  const { db } = setup();
  for (const [i, h] of ["h1", "h2", "h3"].entries()) await recoveryInsertStatement(db, { id: `r${i}`, staffId: "s1", batchId: "b1", codeHash: h, at: T1, by: "s1" }).run();
  await recoveryInsertStatement(db, { id: "x", staffId: "s2", batchId: "b9", codeHash: "h1", at: T1, by: "s2" }).run();
  assert.equal(await recoveryCountLeft(db, "s1"), 3);
  assert.equal((await recoveryUseStatement(db, "s1", "h1", T2).run()).meta.changes, 1);
  assert.equal((await recoveryUseStatement(db, "s1", "h1", T2).run()).meta.changes, 0, "dùng lại");
  assert.equal((await recoveryUseStatement(db, "s2", "h2", T2).run()).meta.changes, 0, "mã của người khác");
  assert.equal(await recoveryCountLeft(db, "s1"), 2);
  assert.equal(await recoveryCountLeft(db, "s2"), 1);
  assert.equal((await recoveryRevokeAllStatement(db, "s1", T2, "s1").run()).meta.changes, 2);
  assert.equal(await recoveryCountLeft(db, "s1"), 0);
  assert.equal((await recoveryUseStatement(db, "s1", "h3", T2).run()).meta.changes, 0, "đã thu hồi");
  assert.equal(await recoveryCountLeft(db, "s2"), 1, "người khác không bị thu hồi");
});

const td = (id: string, token: string, staffId = "s1", expires = FAR) => ({ id, staffId, tokenHash: token, label: "iPhone · Safari", at: T1, expiresAt: expires });

test("máy tin: tìm khớp khi sống + chưa hết hạn + đúng chủ; hết hạn / thu hồi / sai chủ / sai băm → không khớp", async () => {
  const { db } = setup();
  await trustedInsertStatement(db, td("t1", "th1")).run();
  await trustedInsertStatement(db, td("t2", "th2", "s1", "2026-10-01T00:00:00.000Z")).run(); // hết hạn trước T1
  await trustedInsertStatement(db, td("t3", "th3")).run();
  assert.equal((await trustedFind(db, "th1", "s1", T2))!.id, "t1");
  assert.equal(await trustedFind(db, "th1", "s2", T2), null, "token của người khác");
  assert.equal(await trustedFind(db, "khac", "s1", T2), null);
  assert.equal(await trustedFind(db, "th2", "s1", T2), null, "hết hạn");
  assert.equal((await trustedRevokeStatement(db, "t3", "s2", "quen_may", T2, "s2").run()).meta.changes, 0, "sai chủ");
  assert.equal((await trustedRevokeStatement(db, "t3", "s1", "quen_may", T2, "s1").run()).meta.changes, 1);
  assert.equal(await trustedFind(db, "th3", "s1", T2), null, "đã thu hồi");
  assert.equal((await trustedRevokeStatement(db, "t3", "s1", "quen_may", T2, "s1").run()).meta.changes, 0, "thu hồi lần hai không đổi");
});

test("máy tin: touch gia hạn dấu dùng cuối; thu hồi tất cả ghi lý do; danh sách chỉ các máy còn sống của đúng người", async () => {
  const { db, sqlite } = setup();
  await trustedInsertStatement(db, td("t1", "th1")).run();
  await trustedInsertStatement(db, td("t2", "th2")).run();
  await trustedInsertStatement(db, td("k1", "thk", "s2")).run();
  assert.equal((await trustedTouchStatement(db, "t1", T2).run()).meta.changes, 1);
  assert.equal((sqlite.prepare("SELECT last_used_at AS l FROM aut_trusted_device WHERE id = 't1'").get() as { l: string }).l, T2);
  assert.equal((await trustedList(db, "s1")).length, 2);
  assert.equal((await trustedRevokeAllStatement(db, "s1", "doi_pin", T2, "s1").run()).meta.changes, 2);
  assert.equal((await trustedList(db, "s1")).length, 0);
  assert.equal((await trustedList(db, "s2")).length, 1, "người khác không bị thu hồi");
  assert.equal((sqlite.prepare("SELECT revoke_reason AS r FROM aut_trusted_device WHERE id = 't1'").get() as { r: string }).r, "doi_pin");
  assert.equal(await trustedFind(db, "th1", "s1", T2), null);
});

test("danh sách máy tin không trả băm token", async () => {
  const { db } = setup();
  await trustedInsertStatement(db, td("t1", "th-bi-mat")).run();
  assert.ok(!JSON.stringify(await trustedList(db, "s1")).includes("th-bi-mat"));
});

// ---- Mã email (Phần C Task 1, migration 0102): mã hết hạn / quá 5 lần / đã dùng / đã huỷ không khớp; gửi mã mới huỷ mã mở cũ.
const HET = "2026-10-02T00:10:00.000Z";
const maEmail = (id: string, staffId = "s1", purpose: "login" | "enroll" = "login", codeHash = `ch-${id}`) =>
  ({ id, staffId, purpose, emailHash: "eh", codeHash, at: T1, expiresAt: HET, by: staffId });

test("mã email: chèn, đọc mã mở; khớp đúng → dùng một lần; sai băm / sai chủ / hết hạn → không khớp", async () => {
  const { db, sqlite } = setup();
  await emailCodeInsertStatement(db, maEmail("e1")).run();
  assert.deepEqual(await emailCodeOpen(db, "s1", "login", T2), { id: "e1", email_hash: "eh" });
  assert.equal(await emailCodeOpen(db, "s1", "enroll", T2), null, "khác mục đích");
  assert.equal(await emailCodeOpen(db, "s2", "login", T2), null, "người khác");
  assert.equal(await emailCodeOpen(db, "s1", "login", HET), null, "đúng lúc hết hạn là hết");
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "sai", T2).run()).meta.changes, 0, "sai băm");
  assert.equal((await emailCodeTryStatement(db, "e1", "s2", "ch-e1", T2).run()).meta.changes, 0, "sai chủ");
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "ch-e1", HET).run()).meta.changes, 0, "hết hạn");
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "ch-e1", T2).run()).meta.changes, 1);
  assert.equal((sqlite.prepare("SELECT used_at AS u FROM aut_mfa_email_code WHERE id = 'e1'").get() as { u: string }).u, T2);
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "ch-e1", T2).run()).meta.changes, 0, "đã dùng");
  assert.equal(await emailCodeOpen(db, "s1", "login", T2), null, "đã dùng thì không còn mở");
});

test("mã email: quá 5 lần nhập thì không khớp nữa (kể cả đúng mã); lần đếm thứ 6 không vỡ CHECK", async () => {
  const { db, sqlite } = setup();
  await emailCodeInsertStatement(db, maEmail("e1")).run();
  for (let i = 0; i < 5; i++) assert.equal((await emailCodeBumpStatement(db, "e1", T2).run()).meta.changes, 1, `lần ${i + 1}`);
  assert.equal((await emailCodeBumpStatement(db, "e1", T2).run()).meta.changes, 0, "đã đủ 5 thì không đếm thêm (không 500)");
  assert.equal((sqlite.prepare("SELECT attempts AS n FROM aut_mfa_email_code WHERE id = 'e1'").get() as { n: number }).n, 5);
  assert.equal(await emailCodeOpen(db, "s1", "login", T2), null);
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "ch-e1", T2).run()).meta.changes, 0, "đủ 5 lần thì mã đúng cũng không khớp");
});

test("mã email: gửi mã mới (huỷ mã mở cũ → chèn) — mã cũ không khớp, mã mới khớp; chỉ huỷ đúng người + đúng mục đích", async () => {
  const { db, sqlite } = setup();
  await emailCodeInsertStatement(db, maEmail("e1")).run();
  await emailCodeInsertStatement(db, maEmail("k1", "s2")).run();
  await emailCodeInsertStatement(db, maEmail("n1", "s1", "enroll")).run();
  assert.throws(() => sqlite.prepare(
    "INSERT INTO aut_mfa_email_code (id, staff_id, purpose, email_hash, code_hash, created_at, updated_at, expires_at) VALUES ('x', 's1', 'login', 'eh', 'c', ?, ?, ?)",
  ).run(T1, T1, HET), /UNIQUE/, "lưới: hai mã mở cùng lúc");
  assert.equal((await emailCodeRevokeOpenStatement(db, "s1", "login", T2, "s1").run()).meta.changes, 1);
  await emailCodeInsertStatement(db, maEmail("e2")).run();
  assert.equal((await emailCodeTryStatement(db, "e1", "s1", "ch-e1", T2).run()).meta.changes, 0, "mã cũ đã huỷ");
  assert.deepEqual(await emailCodeOpen(db, "s1", "login", T2), { id: "e2", email_hash: "eh" });
  assert.equal((await emailCodeBumpStatement(db, "e1", T2).run()).meta.changes, 0, "mã đã huỷ không đếm");
  assert.equal((await emailCodeTryStatement(db, "e2", "s1", "ch-e2", T2).run()).meta.changes, 1);
  assert.deepEqual(await emailCodeOpen(db, "s2", "login", T2), { id: "k1", email_hash: "eh" }, "người khác không bị huỷ");
  assert.deepEqual(await emailCodeOpen(db, "s1", "enroll", T2), { id: "n1", email_hash: "eh" }, "mục đích khác không bị huỷ");
  const r = sqlite.prepare("SELECT revoked_at AS r, updated_by AS b FROM aut_mfa_email_code WHERE id = 'e1'").get() as { r: string; b: string };
  assert.deepEqual({ ...r }, { r: T2, b: "s1" });
});
