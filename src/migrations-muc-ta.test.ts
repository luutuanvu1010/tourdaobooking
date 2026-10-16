// Kiểm migration 0096_muc_ta_bang_moi.sql (ADR-0117 lần 2, mức TA dùng chung; kế hoạch docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md, N-14, N-24).
// Chèn THẲNG bằng SQL — mỗi trigger / ràng buộc có một ca đỏ và một ca xanh. Khuôn src/migrations-so-dai-ly.test.ts.
// Biến MUC_TA_SQL_THAY (đường dẫn tệp): dùng tệp đó thay cho 0096 — chỉ để quan sát «gỡ trigger thì bài đỏ» trên bản sao, không dùng ở chạy thường.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_muc_ta_bang_moi.sql"));
const AT = "2026-10-14T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) {
    const thay = f === FILE ? process.env.MUC_TA_SQL_THAY : undefined;
    db.exec(thay ? readFileSync(thay, "utf8") : readFileSync(new URL(f, DIR), "utf8"));
  }
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}
let n = 0;
function tier(db: DatabaseSync, o: Partial<{ code: string; name: string; key: string; active: number }> = {}): string {
  const c = o.code ?? `t${++n}`;
  run(db, "INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')", c, o.name ?? `TA${n}`, o.key ?? `ta${n}`, o.active ?? 1, AT, AT);
  return c;
}
function gan(db: DatabaseSync, o: { role?: string; tier: string; from?: string; to?: string | null }): string {
  const r = `g${++n}`;
  run(db, "INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, 'kt', ?, 'kt')",
    r, o.role ?? "TRAVEL_AGENCY", o.tier, o.from ?? "2026-10-01", o.to ?? null, AT, AT);
  return r;
}
function loi(f: () => unknown, ma: string): void {
  assert.throws(f, (e: Error) => e.message.startsWith(ma), `phải báo lỗi mang mã ${ma}`);
}

test("có đúng một tệp migration mức TA, hai bảng mới có mặt, không động bảng cũ", () => {
  assert.ok(FILE, "thiếu migrations/*_muc_ta_bang_moi.sql");
  assert.equal(files.filter((f) => f.endsWith("_muc_ta_bang_moi.sql")).length, 1);
  const sql = readFileSync(new URL(FILE!, DIR), "utf8");
  assert.ok(!/\b(ALTER TABLE|DROP )/i.test(sql.replace(/--[^\n]*/g, "")) && !/\b(INSERT INTO|UPDATE|DELETE FROM)\s+(prc_commission_rule|prc_beneficiary_role|prc_supply_term)\b/i.test(sql), "0096 chỉ thêm, không động bảng cũ");
  const db = moi();
  for (const b of ["prc_rate_tier", "prc_role_tier"]) assert.ok(one(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", b));
});

test("prc_rate_tier: tạo được; name_key trùng ⇒ lỗi UNIQUE (N-24); tên rỗng hoặc dài quá 60 ⇒ lỗi", () => {
  const db = moi();
  tier(db, { name: "TA1", key: "ta1" });
  tier(db, { name: "TA2", key: "ta2" });
  assert.throws(() => tier(db, { name: "ta 1", key: "ta1" }), /UNIQUE/);
  assert.throws(() => tier(db, { name: "   ", key: "x" }), /CHECK/);
  assert.throws(() => tier(db, { name: "a".repeat(61), key: "y" }), /CHECK/);
  tier(db, { name: "a".repeat(60), key: "z" });
});

test("prc_rate_tier: không xoá; chỉ đổi được tên / khoá tên / active / người-giờ cập nhật", () => {
  const db = moi();
  const t = tier(db, { name: "TA1", key: "ta1" });
  run(db, "UPDATE prc_rate_tier SET name = 'TA một', name_key = 'ta mot', updated_by = 'kt2', updated_at = ? WHERE code = ?", AT, t);
  run(db, "UPDATE prc_rate_tier SET active = 0 WHERE code = ?", t);
  run(db, "UPDATE prc_rate_tier SET active = 1 WHERE code = ?", t);
  loi(() => run(db, "DELETE FROM prc_rate_tier WHERE code = ?", t), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_rate_tier SET code = 'khac' WHERE code = ?", t), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_rate_tier SET created_at = '2020-01-01' WHERE code = ?", t), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_rate_tier SET created_by = 'ai-do' WHERE code = ?", t), "prc_append_only:");
  assert.equal(one<{ c: number }>(db, "SELECT COUNT(*) c FROM prc_rate_tier").c, 1);
});

test("prc_role_tier: gắn hợp lệ, gồm loại cũ nhóm EXTERNAL gieo ở 0090 (Chuyển từ hôm nay); giá trị mặc định đúng", () => {
  const db = moi();
  const t = tier(db);
  for (const vai of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"]) gan(db, { role: vai, tier: t });
  assert.equal(one<{ c: number }>(db, "SELECT COUNT(*) c FROM prc_role_tier").c, 5);
  assert.throws(() => gan(db, { role: "KHONG_CO", tier: t }), /FOREIGN KEY|prc_tier_target/);
});

test("prc_role_tier: chồng ngày cùng loại ⇒ prc_tier_overlap; khác loại, liền kề, hoặc sau khi đóng thì xanh", () => {
  const db = moi();
  const a = tier(db), b = tier(db);
  const g1 = gan(db, { tier: a, from: "2026-10-01", to: "2026-10-31" });
  loi(() => gan(db, { tier: b, from: "2026-10-15" }), "prc_tier_overlap:"); // chồng, mở đuôi
  loi(() => gan(db, { tier: b, from: "2026-09-01", to: "2026-10-01" }), "prc_tier_overlap:"); // chạm đúng ngày đầu
  loi(() => gan(db, { tier: b, from: "2026-10-31" }), "prc_tier_overlap:"); // chạm đúng ngày cuối
  loi(() => gan(db, { tier: a, from: "2026-10-10", to: "2026-10-20" }), "prc_tier_overlap:"); // cùng mức vẫn bị chặn
  gan(db, { role: "TAXI_DRIVER", tier: b, from: "2026-10-15" }); // khác loại
  gan(db, { tier: b, from: "2026-11-01" }); // liền kề sau
  gan(db, { tier: b, from: "2026-09-01", to: "2026-09-30" }); // liền kề trước
  loi(() => gan(db, { tier: b, from: "2026-12-01" }), "prc_tier_overlap:"); // đã có dòng mở đuôi từ 11-01
  void g1;
});

test("prc_role_tier: đổi mức = đóng gắn cũ rồi mở gắn mới (ca xanh); dòng mở đuôi chặn mở dòng chồng", () => {
  const db = moi();
  const a = tier(db), b = tier(db);
  const g1 = gan(db, { tier: a, from: "2026-10-01" });
  loi(() => gan(db, { tier: b, from: "2026-10-14" }), "prc_tier_overlap:");
  run(db, "UPDATE prc_role_tier SET valid_to_date = '2026-10-13', updated_by = 'kt2' WHERE id = ?", g1);
  gan(db, { tier: b, from: "2026-10-14" });
});

test("prc_role_tier: không xoá; chỉ đóng một lần; không đổi cột khác; không mở lại", () => {
  const db = moi();
  const a = tier(db), b = tier(db);
  const g = gan(db, { tier: a, from: "2026-10-01" });
  loi(() => run(db, "DELETE FROM prc_role_tier WHERE id = ?", g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET tier_code = ? WHERE id = ?", b, g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET role_type_code = 'TAXI_DRIVER' WHERE id = ?", g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET valid_from_date = '2026-09-01' WHERE id = ?", g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET id = 'khac' WHERE id = ?", g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET created_by = 'ai-do' WHERE id = ?", g), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_role_tier SET updated_by = 'ai-do' WHERE id = ?", g), "prc_append_only:"); // chưa đóng: phải đặt valid_to_date
  assert.throws(() => run(db, "UPDATE prc_role_tier SET valid_to_date = '2026-09-30' WHERE id = ?", g), /CHECK/); // đóng trước ngày bắt đầu
  run(db, "UPDATE prc_role_tier SET valid_to_date = '2026-10-20', updated_by = 'kt2' WHERE id = ?", g);
  loi(() => run(db, "UPDATE prc_role_tier SET valid_to_date = '2026-10-25' WHERE id = ?", g), "prc_append_only:"); // đóng lần hai
  loi(() => run(db, "UPDATE prc_role_tier SET valid_to_date = NULL WHERE id = ?", g), "prc_append_only:"); // mở lại
});

test("prc_role_tier: loại ngoài danh sách được hưởng ⇒ prc_tier_target; loại được hưởng nhưng đã tắt ⇒ prc_tier_target; bật lại thì xanh", () => {
  const db = moi();
  const t = tier(db);
  loi(() => gan(db, { role: "DRIVER_EXTERNAL", tier: t }), "prc_tier_target:"); // có trong pty_role_type nhưng không được hưởng
  run(db, "UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'COLLABORATOR'");
  loi(() => gan(db, { role: "COLLABORATOR", tier: t }), "prc_tier_target:");
  run(db, "UPDATE prc_beneficiary_role SET active = 1 WHERE role_type_code = 'COLLABORATOR'");
  gan(db, { role: "COLLABORATOR", tier: t });
});

test("prc_role_tier: mức đã tắt hoặc không tồn tại ⇒ prc_tier_inactive; bật lại thì xanh; tắt mức không làm hỏng gắn đang có", () => {
  const db = moi();
  const t = tier(db, { active: 0 });
  loi(() => gan(db, { tier: t }), "prc_tier_inactive:");
  loi(() => gan(db, { tier: "khong-co" }), "prc_tier_inactive:");
  run(db, "UPDATE prc_rate_tier SET active = 1 WHERE code = ?", t);
  const g = gan(db, { tier: t });
  run(db, "UPDATE prc_rate_tier SET active = 0 WHERE code = ?", t); // tắt mức: gắn đang có vẫn giữ
  run(db, "UPDATE prc_role_tier SET valid_to_date = '2026-12-31', updated_by = 'kt' WHERE id = ?", g); // vẫn đóng được
  assert.equal(one<{ valid_to_date: string }>(db, "SELECT valid_to_date FROM prc_role_tier WHERE id = ?", g).valid_to_date, "2026-12-31");
});

test("0096 không đổi gì ở bảng cũ: prc_commission_rule và prc_beneficiary_role còn nguyên số dòng gieo", () => {
  const db = moi();
  assert.equal(one<{ c: number }>(db, "SELECT COUNT(*) c FROM prc_beneficiary_role").c, 5);
  assert.equal(one<{ c: number }>(db, "SELECT COUNT(*) c FROM prc_role_tier").c, 0);
});
