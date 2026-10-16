// Kiểm migration kho tệp hồ sơ (ADR-0123; module parties; lát H-2 Gói 2): siêu dữ liệu tệp + dòng nối tệp ↔ dòng giấy tờ. Chèn / sửa THẲNG bằng SQL —
// chứng minh chặn nằm ở CSDL (lớp cuối nếu route có lỗ). Tệp tìm theo ĐUÔI tên. Ba mốc đi MỘT chiều (ruling Q3 của kế hoạch 2026-10-16-goi-2-h2-kho-tep):
// stored_at, purged_at (+ lý do, băm về rỗng), r2_deleted_at. Dòng nối chỉ-thêm thật. Mọi giá trị là giá trị GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_tep.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const AT = "2026-10-16T03:00:00.000Z";
const AT2 = "2026-10-16T03:05:00.000Z";
const AT3 = "2026-10-16T03:10:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));
const HASH = "a".repeat(64);
const KEY = (n: number) => `pty/${n.toString(16).padStart(32, "0")}`;

function nguoi(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Người ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, `Người ${id}`, AT, AT);
  return id;
}
function toChuc(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  return id;
}
const giayToNguoi = (db: DatabaseSync, id: string, party: string) =>
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES (?, ?, 'HEALTH_CHECK', ?, ?, ?, ?)`).run(id, party, `SK${id}`, `SK${id}`.toUpperCase(), AT, AT);
const giayToToChuc = (db: DatabaseSync, id: string, party: string) =>
  db.prepare(`INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES (?, ?, 'GPKD', ?, ?, ?, ?)`).run(id, party, `GP${id}`, `GP${id}`.toUpperCase(), AT, AT);
let n = 0;
function tep(db: DatabaseSync, party: string, x: Partial<Record<string, unknown>> = {}): string {
  const id = String(x.id ?? `t-${++n}`);
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, party, String(x.storage_key ?? KEY(n)), String(x.content_kind ?? "png"), Number(x.byte_size ?? 100), (x.content_hash === undefined ? HASH : x.content_hash) as string | null,
    AT, (x.created_by === undefined ? "s-sup" : x.created_by) as string | null, AT, "s-sup",
  );
  return id;
}
const noi = (db: DatabaseSync, tepId: string, kind: string, target: string) =>
  db.prepare(`INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 's-sup', ?, 's-sup')`)
    .run(tepId, kind, target, AT, AT);

test("(a) đúng MỘT tệp đuôi _ho_so_tep.sql, đứng sau mọi tệp khác; chỉ THÊM (không DROP, không ALTER bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp *_ho_so_tep.sql, thấy ${MATCHES.join(", ")}`);
  assert.equal(files.at(-1), FILE, "migration kho tệp phải là tệp mới nhất của nhánh");
  const sql = sqlOf(FILE).split("\n").filter((d) => !d.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.doesNotMatch(sql, /\bALTER\s+TABLE\b/i);
});

test("(b) cột của hai bảng đúng như kế hoạch; KHÔNG có cột tên tệp gốc", () => {
  const db = all();
  assert.deepEqual(cotCua(db, "pty_attachment"), [
    "id", "party_id", "storage_key", "content_kind", "byte_size", "content_hash", "stored_at", "purged_at", "purge_reason", "r2_deleted_at",
    "created_at", "created_by", "updated_at", "updated_by",
  ]);
  assert.deepEqual(cotCua(db, "pty_attachment_link"), ["attachment_id", "target_kind", "target_id", "created_at", "created_by", "updated_at", "updated_by"]);
});

test("(c) CHECK: khoá đúng khuôn pty/<32 hex>, loại đóng, cỡ 1..10 MB, băm 64 hex, người tải bắt buộc", () => {
  const db = all();
  const p = nguoi(db, "p1");
  tep(db, p);
  for (const [ten, x] of [
    ["khoá thiếu tiền tố", { storage_key: "abc/" + "0".repeat(32) }],
    ["khoá chữ hoa", { storage_key: "pty/" + "A".repeat(32) }],
    ["khoá ngắn", { storage_key: "pty/abc" }],
    ["khoá có ký tự lạ", { storage_key: "pty/" + "g".repeat(32) }],
    ["loại lạ (svg)", { content_kind: "svg" }],
    ["loại lạ (html)", { content_kind: "html" }],
    ["cỡ 0", { byte_size: 0 }],
    ["cỡ 10 MB + 1", { byte_size: 10485761 }],
    ["băm ngắn", { content_hash: "abc" }],
    ["băm chữ hoa", { content_hash: "A".repeat(64) }],
    ["băm rỗng khi chưa xoá", { content_hash: null }],
    ["không người tải", { created_by: null }],
  ] as const) {
    assert.throws(() => tep(db, p, x as Record<string, unknown>), /CHECK|NOT NULL/, ten);
  }
  assert.doesNotThrow(() => tep(db, p, { byte_size: 10485760, content_kind: "pdf" }), "đúng 10 MB, PDF");
  assert.doesNotThrow(() => tep(db, p, { content_kind: "heic" }));
  assert.doesNotThrow(() => tep(db, p, { content_kind: "jpg" }));
  assert.throws(() => tep(db, p, { storage_key: KEY(1) }), /UNIQUE/, "khoá trùng");
});

test("(d) ba mốc một chiều: tải → xác nhận lưu → quyết xoá (băm về rỗng) → đã xoá khỏi kho; mọi chuyển khác bị chặn", () => {
  const db = all();
  const p = nguoi(db, "p1");
  const t = tep(db, p);
  const sua = (sql: string, ...a: string[]) => db.prepare(sql).run(...a);
  // trước khi xoá: r2_deleted_at không được đặt (cùng câu với purged_at cũng không)
  assert.throws(() => sua("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = ?", AT2, t), /CHECK|attachment_purge_one_way/);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL, r2_deleted_at = ? WHERE id = ?", AT2, AT2, t), /attachment_purge_one_way/);
  // xoá mà còn băm → CHECK
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI' WHERE id = ?", AT2, t), /CHECK/);
  // xoá mà thiếu lý do → CHECK; lý do sai khuôn → CHECK
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, content_hash = NULL WHERE id = ?", AT2, t), /CHECK/);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'tai len loi', content_hash = NULL WHERE id = ?", AT2, t), /CHECK/);
  // băm chỉ được về rỗng (đổi sang giá trị khác → chặn)
  assert.throws(() => sua("UPDATE pty_attachment SET content_hash = ? WHERE id = ?", "b".repeat(64), t), /attachment_hash_one_way/);
  // nội dung bất biến
  for (const [cot, v] of [["storage_key", KEY(999)], ["party_id", nguoi(db, "p2")], ["content_kind", "pdf"], ["byte_size", "5"], ["created_at", AT2], ["created_by", "s-khac"]] as const) {
    assert.throws(() => sua(`UPDATE pty_attachment SET ${cot} = ? WHERE id = ?`, v, t), /attachment_identity/, cot);
  }
  // xác nhận lưu: một lần
  sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT2, t);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT3, t), /attachment_store_one_way/);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = NULL WHERE id = ?", t), /attachment_store_one_way/);
  // quyết xoá hợp lệ
  sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = ?", AT3, t);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = NULL, purge_reason = NULL, content_hash = ? WHERE id = ?", HASH, t), /attachment_purge_one_way|attachment_hash_one_way|CHECK/);
  assert.throws(() => sua("UPDATE pty_attachment SET purge_reason = 'KHAC' WHERE id = ?", t), /attachment_purge_one_way/);
  // đã xoá khỏi kho: một lần
  sua("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = ?", AT3, t);
  assert.throws(() => sua("UPDATE pty_attachment SET r2_deleted_at = NULL WHERE id = ?", t), /attachment_purge_one_way/);
  // xác nhận lưu SAU khi đã xoá → chặn (tệp tải dở dang đã bị xử lý thì không "sống lại")
  const t2 = tep(db, p);
  sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_DO_DANG', content_hash = NULL WHERE id = ?", AT2, t2);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT3, t2), /attachment_store_one_way/);
  assert.throws(() => sua("DELETE FROM pty_attachment WHERE id = ?", t2), /attachment_no_delete/);
});

test("(e) dòng nối: giấy tờ người / tổ chức của CHÍNH hồ sơ, hoặc của hồ sơ nó đã gộp vào; loại khác bị chặn; tệp đã xoá không nối được; chỉ-thêm", () => {
  const db = all();
  const a = nguoi(db, "pa");
  const b = nguoi(db, "pb");
  const o = toChuc(db, "o1");
  giayToNguoi(db, "da", a);
  giayToNguoi(db, "db", b);
  giayToToChuc(db, "do", o);
  const ta = tep(db, a);
  noi(db, ta, "PERSON_DOCUMENT", "da");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "da"), /UNIQUE|PRIMARY KEY/, "nối trùng");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "db"), /attachment_link_target_mismatch/, "giấy tờ của hồ sơ khác");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "khong-co"), /attachment_link_target_mismatch/, "giấy tờ không tồn tại");
  assert.throws(() => noi(db, ta, "ORG_DOCUMENT", "do"), /attachment_link_target_mismatch/, "tệp của người nối vào giấy tờ tổ chức khác");
  const to = tep(db, o);
  assert.doesNotThrow(() => noi(db, to, "ORG_DOCUMENT", "do"));
  assert.throws(() => noi(db, ta, "SELF_SUBMISSION", "x"), /attachment_link_kind_closed/, "loại chưa mở (H-4 mở bằng trigger mới)");
  assert.throws(() => noi(db, ta, "person_document", "da"), /CHECK/, "loại sai khuôn mã");
  // gộp: A gộp vào B ⇒ tệp của A nối được sang giấy tờ của B
  db.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(b, AT2, a); // trigger 0056: đích + mốc + ngưng cùng câu
  assert.doesNotThrow(() => noi(db, ta, "PERSON_DOCUMENT", "db"));
  // tệp đã quyết xoá → không nối mới
  const t2 = tep(db, b);
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = ?").run(AT2, t2);
  assert.throws(() => noi(db, t2, "PERSON_DOCUMENT", "db"), /attachment_link_purged/);
  // chỉ-thêm
  assert.throws(() => db.prepare("UPDATE pty_attachment_link SET target_id = 'db' WHERE attachment_id = ?").run(ta), /attachment_link_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_attachment_link WHERE attachment_id = ?").run(ta), /attachment_link_append_only/);
});

test("(f) INSERT OR REPLACE không lách được chỉ-thêm: tệp đã quyết xoá không bị ghi đè; dòng nối không bị thay", () => {
  const db = all();
  const a = nguoi(db, "pa");
  giayToNguoi(db, "da", a);
  const t = tep(db, a, { id: "t-r", storage_key: KEY(500) });
  noi(db, t, "PERSON_DOCUMENT", "da");
  const chen = (id: string) => db.prepare(`INSERT OR REPLACE INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 5, ?, ?, 's-x', ?, 's-x')`).run(id, a, KEY(500), HASH, AT, AT);
  assert.throws(() => chen("t-r"), /attachment_no_replace/, "trùng id và khoá");
  assert.throws(() => chen("t-moi"), /attachment_no_replace/, "trùng khoá kho, khác id");
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'PERSON_DOCUMENT', 'da', ?, 's-x', ?, 's-x')`).run(t, AT2, AT2), /attachment_link_no_replace/);
  assert.equal(rows(db, "SELECT created_by FROM pty_attachment_link WHERE attachment_id = 't-r'")[0]!.created_by, "s-sup");
  assert.equal(rows(db, "SELECT created_by FROM pty_attachment WHERE id = 't-r'")[0]!.created_by, "s-sup");
});
