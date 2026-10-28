// Migration 0124 (ADR-0144): bảng fbk_attachment — luật CSDL của tệp kèm tin vé hỗ trợ (chép khuôn pty_attachment của 0104, thay hồ sơ bằng tin).
// Chạy trên SQLite dựng từ MỌI migration (tests/audit/harness.mjs), chèn thẳng bằng SQL để canh lớp CSDL độc lập với route (Hiến chương 5.1, hai lớp).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const AN = "11111111-1111-4111-8111-111111111111";
const BINH = "22222222-2222-4222-8222-222222222222";
const T = "2026-10-28T01:00:00.000Z";
const HASH = "a".repeat(64);
let n = 0;
const khoa = () => `fbk/${(++n).toString(16).padStart(32, "0")}`;

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: AN, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: BINH, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  w.sqlite.exec(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, created_by, updated_at, updated_by)
    VALUES ('ve-1', 1, 'BUG', 'NEW', 'Lỗi', '{}', '${AN}', '99999999-9999-4999-8999-999999999999', '${T}', '${T}', '${AN}', '${T}', '${AN}')`);
  w.sqlite.exec(`INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by)
    VALUES ('tin-1', 've-1', '${AN}', 'Có ảnh', 0, '${T}', '${AN}', '${T}', '${AN}')`);
  return w;
}
const chen = (w: any, o: Partial<{ id: string; msg: string; key: string; kind: string; size: number; hash: string | null; by: string }> = {}) =>
  w.sqlite.prepare(
    `INSERT INTO fbk_attachment (id, message_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
  ).run(o.id ?? crypto.randomUUID(), o.msg ?? "tin-1", o.key ?? khoa(), o.kind ?? "png", o.size ?? 100, o.hash === undefined ? HASH : o.hash, T, o.by ?? AN);

test("chèn tệp hợp lệ của tác giả tin: được; khoá kho phải đúng khuôn fbk/<32 hex>; loại ngoài bốn loại, cỡ 0 hay quá 10 MB bị CHECK chặn", () => {
  const w = setup();
  chen(w, { id: "tep-1" });
  assert.equal(w.q("SELECT count(*) n FROM fbk_attachment")[0].n, 1);
  for (const key of ["pty/" + "0".repeat(32), "fbk/" + "G".repeat(32), "fbk/abc"]) assert.throws(() => chen(w, { key }), /CHECK/, key);
  assert.throws(() => chen(w, { kind: "svg" }), /CHECK/);
  assert.throws(() => chen(w, { size: 0 }), /CHECK/);
  assert.throws(() => chen(w, { size: 10485761 }), /CHECK/);
  assert.throws(() => chen(w, { hash: null }), /CHECK/, "chưa quyết xoá thì phải có băm");
});

test("người tải phải là tác giả tin; tin không có thật bị khoá ngoại chặn", () => {
  const w = setup();
  assert.throws(() => chen(w, { by: BINH }), /attachment_author_mismatch/);
  w.sqlite.exec("PRAGMA foreign_keys = ON");
  assert.throws(() => chen(w, { msg: "khong-co" }), /attachment_author_mismatch|FOREIGN KEY/);
});

test("tối đa 5 tệp mỗi tin: tệp thứ sáu bị chặn", () => {
  const w = setup();
  for (let i = 0; i < 5; i++) chen(w);
  assert.throws(() => chen(w), /attachment_too_many/);
});

test("chỉ-thêm: không xoá dòng, không INSERT OR REPLACE, không đổi tin / khoá / loại / cỡ / người tải", () => {
  const w = setup();
  chen(w, { id: "tep-1", key: "fbk/" + "1".repeat(32) });
  assert.throws(() => w.sqlite.exec("DELETE FROM fbk_attachment WHERE id = 'tep-1'"), /attachment_no_delete/);
  assert.throws(() => chen(w, { id: "tep-1" }), /attachment_no_replace/);
  for (const set of ["message_id = 'tin-2'", "storage_key = 'fbk/" + "2".repeat(32) + "'", "content_kind = 'pdf'", "byte_size = 5", `created_by = '${BINH}'`]) {
    assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET ${set} WHERE id = 'tep-1'`), /attachment_identity/, set);
  }
});

test("ba mốc một chiều: đã lưu một lần; quyết xoá kèm lý do và băm về rỗng, không đảo; đã-xoá-khỏi-kho chỉ sau quyết xoá", () => {
  const w = setup();
  chen(w, { id: "tep-1" });
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET r2_deleted_at = '${T}' WHERE id = 'tep-1'`), /attachment_purge_one_way|CHECK/);
  w.sqlite.exec(`UPDATE fbk_attachment SET stored_at = '${T}' WHERE id = 'tep-1'`);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET stored_at = '2026-10-28T02:00:00.000Z' WHERE id = 'tep-1'`), /attachment_store_one_way/);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET content_hash = '${"b".repeat(64)}' WHERE id = 'tep-1'`), /attachment_hash_one_way/);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET purged_at = '${T}', purge_reason = 'GO_TEP' WHERE id = 'tep-1'`), /CHECK/, "quyết xoá phải xoá băm cùng lúc");
  w.sqlite.exec(`UPDATE fbk_attachment SET purged_at = '${T}', purge_reason = 'GO_TEP', content_hash = NULL WHERE id = 'tep-1'`);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET purge_reason = 'TAI_LEN_LOI' WHERE id = 'tep-1'`), /attachment_purge_one_way/);
  w.sqlite.exec(`UPDATE fbk_attachment SET r2_deleted_at = '${T}' WHERE id = 'tep-1'`);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET r2_deleted_at = '2026-10-28T03:00:00.000Z' WHERE id = 'tep-1'`), /attachment_purge_one_way/);
});

test("tệp đã quyết xoá khi chưa lưu không được đánh dấu đã lưu sau đó", () => {
  const w = setup();
  chen(w, { id: "tep-1" });
  w.sqlite.exec(`UPDATE fbk_attachment SET purged_at = '${T}', purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 'tep-1'`);
  assert.throws(() => w.sqlite.exec(`UPDATE fbk_attachment SET stored_at = '${T}' WHERE id = 'tep-1'`), /attachment_store_one_way/);
});
