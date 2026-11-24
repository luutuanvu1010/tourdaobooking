// Kiểm migration *_to_chuc_thanh_vien.sql (ADR-0213 Đ7 — mốc B2 đợt 2 đăng ký, Task 15): bảng lời mời pty_org_invite (trạng thái một chiều, không xoá, cột gốc bất biến, số điện thoại chỉ
// thay một lần khi ẩn danh, băm mã duy nhất), bảng trần pty_org_invite_policy (chỉ thêm, một dòng gieo đúng con số đề xuất của ADR), cột dk_registration.invite_id.
// Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn thẳng SQL (chặn nằm ở CSDL). Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
assert.equal(files.filter((f) => f.endsWith("_to_chuc_thanh_vien.sql")).length, 1);
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-11-17T01:00:00.000Z";
db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('org', 'ORGANIZATION', 'Tổ chức', 1, ?, ?)").run(AT, AT);
let n = 0;
function moi(): string {
  const id = `MV_TEST${String.fromCharCode(65 + n)}AAA`.slice(0, 11);
  n++;
  db.prepare("INSERT INTO pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, created_at, created_by, updated_at, updated_by) VALUES (?, 'org', '0912345678', ?, 'MO', '2026-11-24T01:00:00.000Z', ?, 'tk', ?, 'tk')")
    .run(id, `bam-${id}`, AT, AT);
  return id;
}
const sua = (sql: string, ...p: (string | null)[]) => db.prepare(sql).run(...p);

test("chính sách gieo đúng con số đề xuất của ADR-0213 Đ7.3; chỉ thêm dòng (sửa / xoá ⇒ RAISE)", () => {
  assert.deepEqual({ ...db.prepare("SELECT per_org_per_day, open_per_org, per_phone_per_day, code_days, wrong_per_hour FROM pty_org_invite_policy").get() },
    { per_org_per_day: 10, open_per_org: 20, per_phone_per_day: 3, code_days: 7, wrong_per_hour: 5 });
  assert.throws(() => sua("UPDATE pty_org_invite_policy SET per_org_per_day = 99"), /pty_org_invite_policy_append_only/);
  assert.throws(() => sua("DELETE FROM pty_org_invite_policy"), /pty_org_invite_policy_append_only/);
});

test("lời mời mới phải MỞ; băm mã duy nhất; không xoá", () => {
  assert.throws(() => db.prepare("INSERT INTO pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, created_at, updated_at) VALUES ('MV_X', 'org', '09', 'b', 'DA_DUNG', ?, ?, ?)").run(AT, AT, AT), /pty_org_invite_insert_open/);
  const a = moi();
  assert.throws(() => db.prepare("INSERT INTO pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, created_at, updated_at) VALUES ('MV_Y', 'org', '09', ?, 'MO', ?, ?, ?)").run(`bam-${a}`, AT, AT, AT), /UNIQUE constraint failed: pty_org_invite\.code_hash/);
  assert.throws(() => sua("DELETE FROM pty_org_invite WHERE id = ?", a), /pty_org_invite_no_delete/);
});

test("chuyển một chiều: MO → GIỮ → MỞ lại → DÙNG; ba trạng thái cuối không đổi; hình dạng theo trạng thái (giữ phải có phiếu, dùng / huỷ phải có người + giờ)", () => {
  const a = moi();
  assert.throws(() => sua("UPDATE pty_org_invite SET status = 'GIU_CHO_PHIEU' WHERE id = ?", a), /pty_org_invite_shape/);
  sua("UPDATE pty_org_invite SET status = 'GIU_CHO_PHIEU', held_registration_id = 'DK_A' WHERE id = ?", a);
  assert.throws(() => sua("UPDATE pty_org_invite SET status = 'MO' WHERE id = ?", a), /pty_org_invite_shape/, "mở lại phải bỏ phiếu giữ");
  sua("UPDATE pty_org_invite SET status = 'MO', held_registration_id = NULL WHERE id = ?", a);
  assert.throws(() => sua("UPDATE pty_org_invite SET status = 'DA_DUNG' WHERE id = ?", a), /pty_org_invite_shape/);
  sua("UPDATE pty_org_invite SET status = 'DA_DUNG', used_by_staff_id = 'tk2', used_at = ? WHERE id = ?", AT, a);
  for (const t of ["MO", "GIU_CHO_PHIEU", "DA_HUY", "HET_HAN"]) assert.throws(() => sua("UPDATE pty_org_invite SET status = ? WHERE id = ?", t, a), /pty_org_invite_(transition|shape)/, t);
  assert.throws(() => sua("UPDATE pty_org_invite SET used_by_staff_id = 'khac' WHERE id = ?", a), /pty_org_invite_shape/, "người dùng ghi một lần");
  const b = moi();
  assert.throws(() => sua("UPDATE pty_org_invite SET status = 'DA_HUY' WHERE id = ?", b), /pty_org_invite_shape/);
  sua("UPDATE pty_org_invite SET status = 'DA_HUY', cancelled_by = 'tk', cancelled_at = ? WHERE id = ?", AT, b);
  assert.throws(() => sua("UPDATE pty_org_invite SET status = 'MO' WHERE id = ?", b), /pty_org_invite_transition/);
});

test("cột gốc bất biến; số điện thoại chỉ thay MỘT lần, cùng câu ẩn danh, và chỉ khi lời mời đã kết thúc; lính gác NULL-on-invalid hỏng ở NOT NULL (không ở trigger)", () => {
  const a = moi();
  for (const [cot, v] of [["org_party_id", "khac"], ["code_hash", "x"], ["expires_at", AT], ["created_by", "x"]] as const) {
    assert.throws(() => sua(`UPDATE pty_org_invite SET ${cot} = ? WHERE id = ?`, v, a), /pty_org_invite_fixed|FOREIGN KEY/, cot);
  }
  assert.throws(() => sua("UPDATE pty_org_invite SET phone_key = '0999999999' WHERE id = ?", a), /pty_org_invite_fixed/);
  assert.throws(() => sua("UPDATE pty_org_invite SET phone_key = '(đã ẩn)', erased_at = ? WHERE id = ?", AT, a), /pty_org_invite_shape/, "lời mời còn mở không ẩn danh");
  // Lính gác: status NULL trên lời mời đã kết thúc ⇒ lỗi NOT NULL (route nhận ra), không phải lỗi trigger.
  sua("UPDATE pty_org_invite SET status = 'HET_HAN' WHERE id = ?", a);
  assert.throws(() => sua("UPDATE pty_org_invite SET status = NULL WHERE id = ?", a), /NOT NULL constraint failed: pty_org_invite\.status/);
  sua("UPDATE pty_org_invite SET phone_key = '(đã ẩn)', erased_at = ? WHERE id = ?", AT, a);
  assert.throws(() => sua("UPDATE pty_org_invite SET phone_key = '0912345678' WHERE id = ?", a), /pty_org_invite_fixed/, "đã ẩn thì không đổi nữa");
  assert.throws(() => sua("UPDATE pty_org_invite SET erased_at = NULL WHERE id = ?", a), /pty_org_invite_fixed/);
});

test("dk_registration có cột invite_id (tham chiếu logic, không khoá ngoại)", () => {
  const cot = (db.prepare("PRAGMA table_info(dk_registration)").all() as { name: string }[]).map((c) => c.name);
  assert.ok(cot.includes("invite_id"));
  assert.equal((db.prepare("PRAGMA foreign_key_list(dk_registration)").all() as { from: string }[]).some((f) => f.from === "invite_id"), false);
});
