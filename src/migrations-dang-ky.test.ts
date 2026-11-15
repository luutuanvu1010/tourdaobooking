// Kiểm migration phiếu đăng ký đối tác (ADR-0206 Đ2–Đ4, ADR-0207 Đ5; module dang-ky; đợt 1 Task 1). Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm ở CSDL.
// Tệp tìm theo ĐUÔI tên. Mỗi ca chỉ để ĐÚNG MỘT điều kiện trigger sai. Mọi giá trị là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dang_ky.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
};
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const AT = "2026-11-15T03:00:00.000Z";
let n = 0;
const ma = () => "DK_" + String(++n).padStart(8, "0").replace(/\d/g, (d) => "ABCDEFGHIJ"[Number(d)]!);

function chinhSach(db: DatabaseSync, id = "pol-1"): string {
  db.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, 1, 'Mục đích thử', 'Toàn văn thử', ?, ?, 's-sup', ?, 's-sup')`).run(id, AT, AT, AT);
  return id;
}
function phieu(db: DatabaseSync, x: Record<string, unknown> = {}): string {
  const id = String(x.id ?? ma());
  db.prepare(`INSERT INTO dk_registration (id, kind, status, role_code, current_version, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'AGENT', 0, ?, NULL, ?, NULL)`).run(id, String(x.kind ?? "PERSON"), String(x.status ?? "DANG_DIEN"), AT, AT);
  return id;
}
const doi = (db: DatabaseSync, id: string, den: string) =>
  db.prepare("UPDATE dk_registration SET status = ?, updated_at = ? WHERE id = ?").run(den, AT, id);
function khai(db: DatabaseSync, reg: string, version: number, x: Record<string, unknown> = {}) {
  db.prepare(`INSERT INTO dk_submission (id, registration_id, version, given_name, phone_value, phone_key, policy_id, consented_at, referrer_text, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'Thử', '0900000000', '0900000000', ?, ?, ?, ?, NULL, ?, NULL)`)
    .run(`sub-${++n}`, reg, version, String(x.policy ?? "pol-1"), AT, (x.referrer ?? null) as string | null, AT, AT);
}
/** Phiếu ở CHO_DUYET, bản khai v1, đã xác minh bởi `nguoiXm` ở v1, có kết luận Danh bạ. */
function choDuyet(db: DatabaseSync, o: { nguoiXm?: string | null; match?: string | null; verifiedVersion?: number } = {}): string {
  const id = phieu(db);
  khai(db, id, 1);
  db.prepare("UPDATE dk_registration SET current_version = 1, updated_at = ? WHERE id = ?").run(AT, id);
  doi(db, id, "CHO_XAC_MINH");
  db.prepare("UPDATE dk_registration SET match_kind = ?, verified_by = ?, verified_version = ?, updated_at = ? WHERE id = ?")
    .run(o.match === undefined ? "NEW" : o.match, o.nguoiXm === undefined ? "s-xm" : o.nguoiXm, o.verifiedVersion ?? 1, AT, id);
  doi(db, id, "CHO_DUYET");
  return id;
}
const quyetDinh = (db: DatabaseSync, reg: string, x: { kind?: string; version?: number; by?: string; flag?: number; at?: string } = {}) =>
  db.prepare(`INSERT INTO dk_decision (id, registration_id, kind, version, decided_by, super_admin_flag, decided_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`).run(`qd-${++n}`, reg, x.kind ?? "DUYET", x.version ?? 1, x.by ?? "s-duyet", x.flag ?? 0, x.at ?? AT, AT, AT);
const base = () => { const db = all(); chinhSach(db); return db; };
const loi = (re: RegExp) => ({ message: re });

test("(a) đúng MỘT tệp đuôi _dang_ky.sql, đứng sau 0166; chỉ THÊM: không DROP, không ALTER TABLE", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp *_dang_ky.sql, thấy ${MATCHES.join(", ")}`);
  assert.ok(files.indexOf(FILE) > files.findIndex((f) => f.startsWith("0166_")), "migration đăng ký phải đứng sau 0166");
  const code = sqlOf(FILE).split("\n").filter((d) => !d.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /\bDROP\b/i);
  assert.doesNotMatch(code, /\bALTER\s+TABLE\b/i);
});

test("(b) chính sách: gieo đúng một dòng, registration_open = 0, con số PHU-LUC; không sửa, không xoá", () => {
  const db = all();
  const r = rows(db, "SELECT * FROM dk_policy");
  assert.equal(r.length, 1);
  const p = r[0]!;
  assert.equal(p.registration_open, 0);
  assert.deepEqual(
    [p.code_digits, p.code_ttl_minutes, p.code_max_attempts, p.ask_per_mailbox, p.ask_per_network, p.ask_window_minutes, p.ask_global_per_hour],
    [6, 10, 5, 3, 10, 15, 60]);
  assert.deepEqual([p.session_idle_minutes, p.session_max_hours, p.draft_expire_days, p.supplement_expire_days, p.activation_days], [30, 12, 7, 14, 14]);
  assert.deepEqual([p.photo_max_mb, p.photo_max_count, p.anonymize_days], [5, 8, 30]);
  assert.throws(() => db.prepare("UPDATE dk_policy SET registration_open = 1").run(), loi(/dk_policy_append_only/));
  assert.throws(() => db.prepare("DELETE FROM dk_policy").run(), loi(/dk_policy_append_only/));
});

test("(c) phiếu mới: mã DK_XXXXXXXX, loại PERSON, trạng thái DANG_DIEN", () => {
  const db = base();
  assert.doesNotThrow(() => phieu(db));
  assert.throws(() => phieu(db, { id: "XX_AAAAAAAA" }));
  assert.throws(() => phieu(db, { kind: "ORGANIZATION" }), loi(/dk_registration_kind_closed/));
  assert.throws(() => phieu(db, { status: "CHO_DUYET" }), loi(/dk_registration_new_not_draft/));
});

test("(d) chuyển trạng thái: đúng đồ thị; trái đồ thị bị chặn; trạng thái kết thúc không đổi", () => {
  const db = base();
  const a = phieu(db);
  assert.throws(() => doi(db, a, "DA_DUYET"), loi(/dk_registration_transition/));
  assert.throws(() => doi(db, a, "CHO_DUYET"), loi(/dk_registration_transition/));
  doi(db, a, "CHO_XAC_MINH");
  doi(db, a, "CAN_BO_SUNG");
  doi(db, a, "CHO_XAC_MINH");
  doi(db, a, "CHO_DUYET");
  assert.throws(() => doi(db, a, "CAN_BO_SUNG"), loi(/dk_registration_transition/));
  assert.throws(() => doi(db, a, "DANG_DIEN"), loi(/dk_registration_transition/));
  doi(db, a, "DA_DUYET");
  for (const t of ["TU_CHOI", "DA_RUT", "HET_HAN", "CHO_DUYET", "DANG_DIEN"]) assert.throws(() => doi(db, a, t), loi(/dk_registration_transition/));
  for (const t of ["TU_CHOI", "DA_RUT", "HET_HAN"]) { const b = phieu(db); doi(db, b, t); assert.throws(() => doi(db, b, "CHO_XAC_MINH"), loi(/dk_registration_transition/)); }
  assert.throws(() => db.prepare("UPDATE dk_registration SET status = 'KHAC' WHERE id = ?").run(a));
});

test("(e) danh tính: một phiếu ĐANG MỞ mỗi (provider, subject); phiếu kết thúc thì nhận lại được", () => {
  const db = base();
  const ins = (reg: string, subject = "thu@example.com", provider = "EMAIL") =>
    db.prepare(`INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)`)
      .run(`id-${++n}`, reg, provider, subject, subject, AT, AT);
  const a = phieu(db);
  ins(a);
  assert.throws(() => ins(phieu(db)), /UNIQUE/);
  assert.doesNotThrow(() => ins(phieu(db), "khac@example.com"));
  assert.throws(() => ins(phieu(db), "x@example.com", "GOOGLE"), loi(/dk_identity_provider_closed/));
  doi(db, a, "DA_RUT");
  assert.doesNotThrow(() => ins(phieu(db)));
});

test("(f) bản khai bất biến (dk_submission_content); ẩn danh một lần được; phiên bản phải kế tiếp", () => {
  const db = base();
  const a = phieu(db);
  khai(db, a, 1);
  assert.throws(() => db.prepare("UPDATE dk_submission SET given_name = 'Sửa' WHERE registration_id = ?").run(a), loi(/dk_submission_content/));
  assert.throws(() => db.prepare("DELETE FROM dk_submission WHERE registration_id = ?").run(a), loi(/dk_submission_content/));
  assert.throws(() => khai(db, a, 3), loi(/dk_submission_version/));
  db.prepare("UPDATE dk_registration SET current_version = 1, updated_at = ? WHERE id = ?").run(AT, a);
  assert.doesNotThrow(() => khai(db, a, 2));
  db.prepare("UPDATE dk_submission SET given_name = '(đã ẩn)', erased_at = ? WHERE registration_id = ? AND version = 1").run(AT, a);
  assert.throws(() => db.prepare("UPDATE dk_submission SET given_name = 'Lại' WHERE registration_id = ? AND version = 1").run(a), loi(/dk_submission_content/));
});

test("(g) quyết định DUYỆT: ca đúng qua; mỗi điều kiện sai bị chặn riêng", () => {
  const db = base();
  assert.doesNotThrow(() => quyetDinh(db, choDuyet(db)));
  assert.throws(() => quyetDinh(db, phieu(db), {}), loi(/dk_decision_state/));
  assert.throws(() => quyetDinh(db, choDuyet(db), { version: 2 }), loi(/dk_decision_version/));
  assert.throws(() => quyetDinh(db, choDuyet(db, { match: null })), loi(/dk_decision_no_match/));
  assert.throws(() => quyetDinh(db, choDuyet(db, { nguoiXm: null })), loi(/dk_decision_not_verified/));
  assert.throws(() => quyetDinh(db, choDuyet(db, { verifiedVersion: 0 })), loi(/dk_decision_not_verified/));
  const t = choDuyet(db, { nguoiXm: "s-1" });
  assert.throws(() => quyetDinh(db, t, { by: "s-1" }), loi(/dk_decision_same_person/));
  assert.doesNotThrow(() => quyetDinh(db, t, { by: "s-1", flag: 1 }));
  assert.throws(() => quyetDinh(db, t, { by: "s-1", flag: 1 }), /UNIQUE/);
});

test("(h) quyết định KÍCH HOẠT: chỉ khi ĐÃ DUYỆT, chưa kích hoạt, còn hạn", () => {
  const db = base();
  const sau = (days: number) => new Date(Date.parse(AT) + days * 86400000).toISOString();
  assert.throws(() => quyetDinh(db, choDuyet(db), { kind: "KICH_HOAT", by: "s-moi" }), loi(/dk_activation_state/));
  const a = choDuyet(db);
  quyetDinh(db, a);
  doi(db, a, "DA_DUYET");
  assert.throws(() => quyetDinh(db, a, { kind: "KICH_HOAT", by: "s-moi", at: sau(15) }), loi(/dk_activation_late/));
  assert.doesNotThrow(() => quyetDinh(db, a, { kind: "KICH_HOAT", by: "s-moi", at: sau(14) }));
  assert.throws(() => quyetDinh(db, a, { kind: "KICH_HOAT", by: "s-moi", at: sau(1) }), loi(/dk_activation_done/));
  assert.throws(() => quyetDinh(db, a, { kind: "LA" }));
});

test("(i) lịch sử, kết luận mục, quyết định: chỉ thêm; actor_kind trong tập đóng; mã gửi email xoá được", () => {
  const db = base();
  const a = phieu(db);
  db.prepare(`INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by) VALUES ('ev-1', ?, 'STAFF', 's-1', 'XAC_MINH', NULL, ?, ?, NULL, ?, NULL)`).run(a, AT, AT, AT);
  assert.throws(() => db.prepare(`INSERT INTO dk_event (id, registration_id, actor_kind, command, at, created_at, updated_at) VALUES ('ev-2', ?, 'KHACH', 'X_Y', ?, ?, ?)`).run(a, AT, AT, AT));
  assert.throws(() => db.prepare("UPDATE dk_event SET command = 'KHAC'").run(), loi(/dk_append_only/));
  assert.throws(() => db.prepare("DELETE FROM dk_event").run(), loi(/dk_append_only/));
  db.prepare(`INSERT INTO dk_item_result (id, registration_id, version, item_code, result, verified_by, verified_at, created_at, created_by, updated_at, updated_by) VALUES ('ir-1', ?, 1, 'SO_DIEN_THOAI', 'DAT', 's-1', ?, ?, NULL, ?, NULL)`).run(a, AT, AT, AT);
  assert.throws(() => db.prepare("UPDATE dk_item_result SET result = 'KHONG_DAT'").run(), loi(/dk_append_only/));
  assert.throws(() => db.prepare("DELETE FROM dk_item_result").run(), loi(/dk_append_only/));
  const b = choDuyet(db);
  quyetDinh(db, b);
  assert.throws(() => db.prepare("UPDATE dk_decision SET decided_by = 'x'").run(), loi(/dk_append_only/));
  assert.throws(() => db.prepare("DELETE FROM dk_decision").run(), loi(/dk_append_only/));
  db.prepare(`INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, created_by, updated_at, updated_by) VALUES ('mc-1', 'thu@example.com', 'bam', ?, 0, ?, NULL, ?, NULL)`).run(AT, AT, AT);
  db.prepare("UPDATE dk_email_code SET attempts = 1 WHERE id = 'mc-1'").run();
  db.prepare("DELETE FROM dk_email_code WHERE id = 'mc-1'").run();
});
