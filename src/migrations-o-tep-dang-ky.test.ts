// Kiểm migration 0191 (ADR-0233): bảng ô tệp theo vai `dk_role_slot` (chỉ thêm, gieo giữ hành vi cũ), dấu `covers_other_files` của chính sách riêng tư, dòng dk_policy 12 tệp
// chép từ dòng ĐANG hiệu lực (không chép số gieo của 0170). Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm ở CSDL. Mọi giá trị là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => /^\d{4}_o_tep_dang_ky_theo_vai\.sql$/.test(f))!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const den = (truoc: boolean) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) { if (f === FILE && truoc) break; db.exec(sqlOf(f)); }
  return db;
};
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string): Row[] => db.prepare(sql).all().map((r) => ({ ...(r as Row) }));
const COT = "registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, anonymize_days, files_per_network_hour, phieu_required_items";

test("tệp migration có đúng một", () => assert.ok(FILE, "thiếu migration ô tệp theo vai"));

test("dk_role_slot: gieo sáu dòng «mọi vai» giữ hành vi cũ + hai ô «Tệp khác»; không sửa, không xoá; khuôn mã và cách hiện bị CHECK", () => {
  const db = den(false);
  assert.deepEqual(rows(db, "SELECT part, role_code, slot, mode FROM dk_role_slot ORDER BY part, sort_order").map((r) => `${r.part}|${r.role_code}|${r.slot}|${r.mode}`), [
    "CA_NHAN||CCCD_MAT_TRUOC|TUY_CHON", "CA_NHAN||CCCD_MAT_SAU|TUY_CHON", "CA_NHAN||TEP_KHAC|TUY_CHON",
    "TO_CHUC||GPKD|BAT_BUOC", "TO_CHUC||GIAY_PHEP_THEM|TUY_CHON", "TO_CHUC||TEP_KHAC_TO_CHUC|TUY_CHON",
  ]);
  assert.throws(() => db.exec("UPDATE dk_role_slot SET mode = 'AN'"), /dk_role_slot_append_only/);
  assert.throws(() => db.exec("DELETE FROM dk_role_slot"), /dk_role_slot_append_only/);
  const chen = (part: string, role: string, slot: string, mode: string) =>
    db.prepare("INSERT INTO dk_role_slot (id, part, role_code, slot, mode, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '2026-12-01T00:00:00.000Z', 'x', 'x')").run(crypto.randomUUID(), part, role, slot, mode);
  assert.throws(() => chen("KHAC", "", "TEP_KHAC", "AN"), /CHECK/);
  assert.throws(() => chen("CA_NHAN", "", "TEP_KHAC", "LA"), /CHECK/);
  assert.throws(() => chen("CA_NHAN", "guide", "TEP_KHAC", "AN"), /CHECK/);
  assert.throws(() => chen("CA_NHAN", "", "tep khac", "AN"), /CHECK/);
  chen("CA_NHAN", "GUIDE_FREELANCE", "CCCD_MAT_TRUOC", "BAT_BUOC");
  assert.throws(() => chen("CA_NHAN", "GUIDE_FREELANCE", "CCCD_MAT_TRUOC", "AN"), /UNIQUE/, "cùng khoá cùng mốc");
});

test("pty_privacy_policy.covers_other_files: mặc định 0, chỉ 0/1; hai view công bố có cột mới và giữ cột cũ", () => {
  const db = den(false);
  db.exec("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('p1', 1, 'm', 'b', '2026-01-01T00:00:00.000Z', 'x', 'x', 'x', 'x')");
  assert.deepEqual(rows(db, "SELECT id, version, valid_from_at, covers_org_data, covers_other_files FROM v_pty_privacy_effective"), [{ id: "p1", version: 1, valid_from_at: "2026-01-01T00:00:00.000Z", covers_org_data: 0, covers_other_files: 0 }]);
  assert.deepEqual(Object.keys(rows(db, "SELECT * FROM v_pty_privacy_current")[0]!), ["id", "version", "purposes", "body", "valid_from_at", "covers_org_data", "covers_other_files"]);
  assert.throws(() => db.exec("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_other_files) VALUES ('p2', 2, 'm', 'b', '2026-02-01T00:00:00.000Z', 'x', 'x', 'x', 'x', 2)"), /CHECK/);
});

test("dk_policy 12 tệp: chép dòng ĐANG hiệu lực (kể cả dòng đã mở đăng ký, đổi loại), chỉ đổi photo_max_count; mốc mới sau mốc lớn nhất; đã ≥ 12 thì không chèn", () => {
  const db = den(true);
  // Giả production đã có dòng mới hơn gieo: mở đăng ký, đổi loại mở. Dời mốc gieo về quá khứ cho dòng giả đứng sau (chỉ trong bài thử — gỡ trigger chỉ-thêm).
  db.exec("DROP TRIGGER dk_policy_no_update; UPDATE dk_policy SET valid_from_at = '2026-01-01T00:00:00.000Z' WHERE id = 'gieo-0170'");
  db.exec(`INSERT INTO dk_policy (id, ${COT}, photo_max_count, valid_from_at, created_at, created_by, updated_at, updated_by)
    SELECT 'mo-dk', 1, 'TAXI_DRIVER', code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, anonymize_days, files_per_network_hour, phieu_required_items, photo_max_count, '2026-11-20T00:00:00.000Z', 'x', 's', 'x', 's' FROM dk_policy WHERE id = 'gieo-0170'`);
  db.exec(sqlOf(FILE));
  const moi = rows(db, `SELECT ${COT}, photo_max_count, valid_from_at FROM dk_policy WHERE id = 'mig-0191'`)[0]!;
  const cu = rows(db, `SELECT ${COT} FROM dk_policy WHERE id = 'mo-dk'`)[0]!;
  assert.equal(moi.photo_max_count, 12);
  const { photo_max_count: _a, valid_from_at: vf, ...conLai } = moi;
  assert.deepEqual(conLai, cu, "mọi cột khác chép đúng dòng hiệu lực (không về số gieo 0170)");
  assert.ok(String(vf) > "2026-11-20T00:00:00.000Z");
  const hieuLuc = rows(db, "SELECT id FROM dk_policy WHERE valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ORDER BY valid_from_at DESC LIMIT 1")[0]!;
  assert.equal(hieuLuc.id, "mig-0191");
  // Chạy lại phần dk_policy khi đã 12 ⇒ không thêm dòng (phần cuối tệp).
  const phanCuoi = sqlOf(FILE).slice(sqlOf(FILE).indexOf("INSERT INTO dk_policy")).replace("'mig-0191'", "'mig-0191-lai'");
  db.exec(phanCuoi);
  assert.equal(rows(db, "SELECT count(*) n FROM dk_policy WHERE id = 'mig-0191-lai'")[0]!.n, 0);
});
