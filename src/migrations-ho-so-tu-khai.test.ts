// Kiểm migration phiếu tự khai (ADR-0124, ADR-0126 đ1; module parties; lát H-3 Gói 2). Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm ở CSDL (lớp cuối nếu route có
// lỗ). Tệp tìm theo ĐUÔI tên. Vòng đời (ruling R3 kế hoạch 2026-10-17-goi-2-h3-tu-khai): nội dung bất biến, trạng thái một chiều. Mỗi ca chỉ để ĐÚNG MỘT điều kiện
// trigger sai (thứ tự chạy giữa các trigger BEFORE INSERT không được tài liệu hoá). Mọi giá trị là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_tu_khai.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.slice(0, files.indexOf(FILE)));
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));
const AT = "2026-10-17T03:00:00.000Z";
const AT2 = "2026-10-17T03:05:00.000Z";
const AT3 = "2026-10-17T03:10:00.000Z";
let n = 0;

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
const chinhSach = (db: DatabaseSync, id: string, version: number, at = AT) =>
  db.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Mục đích thử', 'Toàn văn thử', ?, ?, 's-sup', ?, 's-sup')`).run(id, version, at, at, at);
const dongY = (db: DatabaseSync, party: string, policy: string, decision = "DONG_Y", at = AT) =>
  db.prepare(`INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 's-1', ?, 's-1')`)
    .run(`c-${++n}`, party, policy, decision, at, at);
function phieu(db: DatabaseSync, party: string, x: Record<string, unknown> = {}): string {
  const id = String(x.id ?? `ph-${++n}`);
  const kind = String(x.subject_kind ?? "NGAY_SINH");
  const v: Record<string, unknown> = {
    policy_id: "pol-1", birth_date: kind === "NGAY_SINH" ? "1990-05-06" : null, address_value: kind === "DIA_CHI" ? "1 Đường Thử" : null,
    document_type_code: kind === "GIAY_TO" ? "HEALTH_CHECK" : null, document_number: null, number_key: null, license_class_code: null,
    issued_date: null, issued_place: null, expiry_date: null, status: "CHO_XAC_MINH", decided_at: null, decided_by: null, reason_code: null, created_by: "s-1", ...x,
  };
  db.prepare(`INSERT ${x.orReplace ? "OR REPLACE " : ""}INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code,
      document_number, number_key, license_class_code, issued_date, issued_place, expiry_date, status, decided_at, decided_by, reason_code, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, party, kind, v.policy_id as string, v.birth_date as string | null, v.address_value as string | null, v.document_type_code as string | null,
    v.document_number as string | null, v.number_key as string | null, v.license_class_code as string | null, v.issued_date as string | null,
    v.issued_place as string | null, v.expiry_date as string | null, v.status as string, v.decided_at as string | null, v.decided_by as string | null,
    v.reason_code as string | null, AT, v.created_by as string | null, AT, "s-1",
  );
  return id;
}
/** Người p1 + chính sách v1 + p1 đã đồng ý v1. */
function coBan(): DatabaseSync {
  const db = all();
  nguoi(db, "p1");
  chinhSach(db, "pol-1", 1);
  dongY(db, "p1", "pol-1");
  return db;
}
const trangThai = (db: DatabaseSync, id: string) => rows(db, "SELECT status FROM pty_self_submission WHERE id = ?", id)[0]?.status;

test("(a) đúng MỘT tệp đuôi _ho_so_tu_khai.sql, đứng sau 0103; chỉ THÊM: không DROP, không ALTER TABLE, không INSERT gieo dữ liệu", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp *_ho_so_tu_khai.sql, thấy ${MATCHES.join(", ")}`);
  assert.ok(files.indexOf(FILE) > files.findIndex((f) => f.startsWith("0103_")), "migration tự khai phải đứng sau 0103");
  const code = sqlOf(FILE).split("\n").filter((d) => !d.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /\bDROP\b/i);
  assert.doesNotMatch(code, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(code, /^\s*INSERT\b/im, "không gieo chính sách / phiếu (ADR-0126 đ1, đ2)");
});

test("(b) cột của pty_self_submission đúng như kế hoạch; không cột thời hạn xoá", () => {
  const db = all();
  assert.deepEqual(cotCua(db, "pty_self_submission"), [
    "id", "party_id", "subject_kind", "policy_id", "birth_date", "address_value", "document_type_code", "document_number", "number_key", "license_class_code",
    "issued_date", "issued_place", "expiry_date", "status", "decided_at", "decided_by", "reason_code", "created_at", "created_by", "updated_at", "updated_by",
  ]);
});

test("(c) đúng tập trigger mới; trigger cũ của 0103 / 0104 còn nguyên", () => {
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "pty_consent_no_replace", "pty_privacy_policy_no_replace", "pty_privacy_policy_valid_from_ins",
    "pty_self_submission_consent_ins", "pty_self_submission_content", "pty_self_submission_kind_ins",
    "pty_self_submission_no_delete", "pty_self_submission_no_replace", "pty_self_submission_one_pending_ins", "pty_self_submission_status_ins", "pty_self_submission_status_one_way",
    "pty_verification_no_replace",
  ]);
  for (const t of truoc) assert.ok(triggers(db).includes(t), `trigger cũ ${t} bị mất`);
});

test("(d) đường đúng: ba loại phiếu của người đã đồng ý phiên bản hiện hành", () => {
  const db = coBan();
  phieu(db, "p1");
  phieu(db, "p1", { subject_kind: "DIA_CHI" });
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD", document_number: "079 000 000 111", number_key: "079000000111", issued_place: "Nơi cấp thử", issued_date: "2020-01-01", expiry_date: "2035-01-01" });
  assert.equal(rows(db, "SELECT count(*) n FROM pty_self_submission WHERE status = 'CHO_XAC_MINH'")[0]!.n, 3);
});

test("(e) đồng ý: chưa đồng ý / đã rút / người KHÁC đồng ý / phiên bản cũ ⇒ self_submission_no_consent; đồng ý lại ⇒ được", () => {
  const db = all();
  nguoi(db, "p1");
  nguoi(db, "p2");
  chinhSach(db, "pol-1", 1);
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "chưa đồng ý");
  dongY(db, "p2", "pol-1");
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "người khác đồng ý không tính");
  dongY(db, "p1", "pol-1", "DONG_Y", AT);
  dongY(db, "p1", "pol-1", "RUT", AT2);
  assert.throws(() => phieu(db, "p1"), /self_submission_no_consent/, "đã rút");
  dongY(db, "p1", "pol-1", "DONG_Y", AT3);
  phieu(db, "p1");
  chinhSach(db, "pol-2", 2, AT3);
  assert.throws(() => phieu(db, "p1", { subject_kind: "DIA_CHI" }), /self_submission_no_consent/, "phiếu ghi phiên bản cũ khi đã có phiên bản mới");
  assert.throws(() => phieu(db, "p1", { subject_kind: "DIA_CHI", policy_id: "pol-2" }), /self_submission_no_consent/, "chưa đồng ý phiên bản mới");
  dongY(db, "p1", "pol-2", "DONG_Y", AT3);
  phieu(db, "p1", { subject_kind: "DIA_CHI", policy_id: "pol-2" });
});

test("(f) CHECK hình dạng: trường phải khớp loại; ngày, độ dài, số + khoá số cùng có; hồ sơ tổ chức bị khoá ngoại chặn", () => {
  const db = coBan();
  toChuc(db, "o1");
  dongY(db, "o1", "pol-1");
  for (const [ten, party, x] of [
    ["NGAY_SINH thiếu ngày", "p1", { birth_date: null }],
    ["NGAY_SINH kèm địa chỉ", "p1", { address_value: "1 Đường Thử" }],
    ["ngày sinh trước 1900", "p1", { birth_date: "1899-12-31" }],
    ["ngày sinh sai khuôn", "p1", { birth_date: "06/05/1990" }],
    ["DIA_CHI 201 ký tự", "p1", { subject_kind: "DIA_CHI", address_value: "a".repeat(201) }],
    ["GIAY_TO số không khoá", "p1", { subject_kind: "GIAY_TO", document_number: "123" }],
    ["GIAY_TO hết hạn trước ngày cấp", "p1", { subject_kind: "GIAY_TO", issued_date: "2020-01-02", expiry_date: "2020-01-01" }],
    ["NGAY_SINH kèm ngày cấp", "p1", { issued_date: "2020-01-01" }],
    ["khoá số chữ thường", "p1", { subject_kind: "GIAY_TO", document_number: "ab12", number_key: "ab12" }],
    ["CCCD không số (luật 0032)", "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD" }],
    ["GPLX thiếu hạng (luật 0032)", "p1", { subject_kind: "GIAY_TO", document_type_code: "GPLX", document_number: "790000000111", number_key: "790000000111" }],
    ["hạng kèm loại không phải GPLX", "p1", { subject_kind: "GIAY_TO", license_class_code: "B" }],
    ["không người khai", "p1", { created_by: null }],
    // Ngày sai khuôn: date('abc') là NULL nên `date(x) = x` cho NULL (CHECK coi là qua) — phải là `IS`.
    ["ngày sinh chữ", "p1", { birth_date: "abc" }],
    ["ngày sinh không có thật", "p1", { birth_date: "2000-13-45" }],
    ["ngày cấp chữ", "p1", { subject_kind: "GIAY_TO", issued_date: "abc" }],
    ["ngày cấp không có thật", "p1", { subject_kind: "GIAY_TO", issued_date: "2030-02-30" }],
    ["ngày hết hạn chữ", "p1", { subject_kind: "GIAY_TO", expiry_date: "abc" }],
    ["ngày hết hạn không có thật", "p1", { subject_kind: "GIAY_TO", expiry_date: "2030-02-30" }],
  ] as const) assert.throws(() => phieu(db, party, x as Record<string, unknown>), /CHECK constraint failed/, ten);
  assert.throws(() => phieu(db, "o1"), /FOREIGN KEY constraint failed/, "hồ sơ tổ chức (ruling R5)");
  assert.throws(() => phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "KHONG_CO" }), /FOREIGN KEY constraint failed/, "loại giấy tờ lạ");
});

test("(g) loại phiếu đóng: HO_TEN ⇒ self_submission_kind_closed; chữ thường ⇒ CHECK", () => {
  const db = coBan();
  assert.throws(() => phieu(db, "p1", { subject_kind: "HO_TEN", birth_date: null }), /self_submission_kind_closed/);
  assert.throws(() => phieu(db, "p1", { subject_kind: "ngay_sinh", birth_date: null }), /CHECK constraint failed/);
});

test("(h) phiếu mới luôn ở CHO_XAC_MINH", () => {
  const db = coBan();
  assert.throws(() => phieu(db, "p1", { status: "RUT", decided_at: AT, decided_by: "s-1" }), /self_submission_new_not_pending/);
});

test("(i) một phiếu đang chờ mỗi (hồ sơ, loại, loại giấy tờ); INSERT OR REPLACE không ghi đè", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  assert.throws(() => phieu(db, "p1", { birth_date: "1991-01-01" }), /self_submission_pending_exists/);
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD", document_number: "079000000111", number_key: "079000000111" });
  phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "HEALTH_CHECK" }); // loại giấy tờ khác: được
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-1', updated_at = ? WHERE id = ?").run(AT2, AT2, a);
  const b = phieu(db, "p1", { birth_date: "1991-01-01" }); // đã rút phiếu cũ: khai lại được
  assert.throws(() => phieu(db, "p1", { id: a, subject_kind: "DIA_CHI", orReplace: true }), /self_submission_no_replace/);
  assert.equal(trangThai(db, a), "RUT", "dòng cũ còn nguyên sau INSERT OR REPLACE bị chặn");
  assert.equal(trangThai(db, b), "CHO_XAC_MINH");
});

test("(j) bất biến: không xoá; không sửa nội dung; trạng thái chỉ đi một chiều, kèm mốc / người xử lý / lý do từ chối", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  assert.throws(() => db.prepare("DELETE FROM pty_self_submission WHERE id = ?").run(a), /self_submission_no_delete/);
  // Sửa nội dung KÈM chuyển trạng thái hợp lệ — để chỉ trigger nội dung sai (chạm dòng đang chờ mà không đổi trạng thái thì trigger một chiều cũng bắn; thứ tự không định).
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET birth_date = '1991-01-01', status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(AT2, a), /self_submission_content/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET policy_id = 'pol-x', status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(AT2, a), /self_submission_content/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET updated_at = ? WHERE id = ?").run(AT2, a), /self_submission_status_one_way/, "chạm dòng đang chờ mà không đổi trạng thái");
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'RUT' WHERE id = ?").run(a), /CHECK constraint failed/, "rút thiếu mốc / người");
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = 's-2' WHERE id = ?").run(AT2, a), /CHECK constraint failed/, "từ chối thiếu lý do");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-1', updated_at = ?, updated_by = 's-1' WHERE id = ?").run(AT2, AT2, a);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'CHO_XAC_MINH', decided_at = NULL, decided_by = NULL WHERE id = ?").run(a), /self_submission_status_one_way/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = 's-2' WHERE id = ?").run(AT3, a), /self_submission_status_one_way/);
});

test("(j2) MỌI cột nội dung (15 cột): sửa kèm chuyển hợp lệ sang RUT ⇒ self_submission_content", () => {
  const db = coBan();
  nguoi(db, "p2");
  const a = phieu(db, "p1", { subject_kind: "GIAY_TO", document_type_code: "GPLX", document_number: "790000000111", number_key: "790000000111", license_class_code: "B", issued_place: "Nơi thử", issued_date: "2020-01-01", expiry_date: "2030-01-01" });
  chinhSach(db, "pol-2", 2, AT3);
  const GIA_TRI: Record<string, string> = {
    id: "ph-doi", party_id: "p2", subject_kind: "DIA_CHI", policy_id: "pol-2", birth_date: "1991-01-01", address_value: "2 Đường Thử", document_type_code: "CCCD",
    document_number: "999", number_key: "999", license_class_code: "C", issued_date: "2021-01-01", issued_place: "Nơi khác", expiry_date: "2031-01-01",
    created_at: AT3, created_by: "s-9",
  };
  assert.equal(Object.keys(GIA_TRI).length, 15);
  for (const [cot, giaTri] of Object.entries(GIA_TRI))
    assert.throws(() => db.prepare(`UPDATE pty_self_submission SET ${cot} = ?, status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?`).run(giaTri, AT2, a), /self_submission_content/, cot);
  assert.equal(trangThai(db, a), "CHO_XAC_MINH");
});

test("(j3) CHECK decided_by: đặt decided_at mà thiếu decided_by ⇒ CHECK", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ? WHERE id = ?").run(AT2, a), /CHECK constraint failed/);
  assert.throws(() => db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_by = 's-1' WHERE id = ?").run(a), /CHECK constraint failed/);
});

test("(k) vá INSERT OR REPLACE của 0103 (ruling R11) + phiên bản chính sách không hiệu lực lùi", () => {
  const db = coBan();
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-x', 'p1', 'pol-1', 'DONG_Y', ?, 's-1', ?, 's-1')").run(AT, AT);
  assert.throws(() => db.prepare("INSERT OR REPLACE INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-x', 'p1', 'pol-1', 'DONG_Y', ?, 's-2', ?, 's-2')").run(AT2, AT2), /consent_no_replace/);
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('pol-1', 2, 'x', 'y', ?, ?, 's-sup', ?, 's-sup')`).run(AT2, AT2, AT2), /privacy_policy_no_replace/);
  assert.equal(rows(db, "SELECT version FROM pty_privacy_policy WHERE id = 'pol-1'")[0]!.version, 1, "bản cũ còn nguyên");
  chinhSach(db, "pol-2", 2, AT3);
  assert.throws(() => chinhSach(db, "pol-3", 3, AT2), /privacy_policy_valid_from_back/);
  db.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v-1', 'p1', 'ATTRIBUTE', 'NGAY_SINH', 'DA_XAC_MINH', ?, 's-2', ?, 's-2')`).run(AT, AT);
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v-1', 'p1', 'ATTRIBUTE', 'NGAY_SINH', 'DA_XAC_MINH', ?, 's-3', ?, 's-3')`).run(AT2, AT2), /verification_no_replace/);
});

test("(l) ruling R1: loại nối ảnh SELF_SUBMISSION VẪN đóng sau 0105", () => {
  const db = coBan();
  const a = phieu(db, "p1");
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES ('t-1', 'p1', ?, 'png', 1, ?, ?, 's-1', ?, 's-1')`).run(`pty/${"0".repeat(32)}`, "a".repeat(64), AT, AT);
  assert.throws(() => db.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES ('t-1', 'SELF_SUBMISSION', ?, ?, 's-1', ?, 's-1')").run(a, AT, AT), /attachment_link_kind_closed/);
});
