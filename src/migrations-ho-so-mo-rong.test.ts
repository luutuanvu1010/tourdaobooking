// Kiểm migration hồ sơ mở rộng (ADR-0122 + ADR-0126 đ1; module parties; lát H-1 Gói 2): ngày sinh, liên hệ ADDRESS chỉ cho người, giấy tờ TỔ CHỨC (khuôn
// pty_person_document của 0032), sổ xác minh chỉ-thêm, chính sách riêng tư có phiên bản + đồng ý chỉ-thêm. Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm
// ở CSDL (lớp cuối nếu route có lỗ). Tệp tìm theo ĐUÔI tên. Mọi số là số GIẢ. KHÔNG gieo chính sách, KHÔNG có cột thời hạn xoá (ADR-0126 đ2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_mo_rong.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const AT = "2026-10-16T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));

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
const key = (so: string) => so.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");
let n = 0;
interface Doc { id?: string; party: string; type: string; so?: string | null; cap?: string | null; het?: string | null; truoc?: string | null }
function ins(db: DatabaseSync, d: Doc): string {
  const id = d.id ?? `od-${++n}`;
  const so = d.so === undefined ? null : d.so;
  db.prepare(
    `INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, previous_id,
       voided_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, NULL, ?, NULL)`,
  ).run(id, d.party, d.type, so, so === null ? null : key(so), d.cap ?? null, d.het ?? null, d.truoc ?? null, AT, AT);
  return id;
}
const huy = (db: DatabaseSync, id: string) => db.prepare("UPDATE pty_organization_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(AT, "2026-10-16T04:00:00.000Z", id);
const GPKD_A = "4201 234.567"; // số GIẢ; chuẩn hoá → 4201234567
const GPKD_B = "4209999999";

test("(a) đúng một tệp *_ho_so_mo_rong.sql, không phải B5; đúng 18 trigger mới, tên pty_*; không gieo dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_ho_so_mo_rong.sql, thấy ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "pty_consent_no_delete", "pty_consent_no_update", "pty_consent_withdraw_ins",
    "pty_contact_point_address_person_ins", "pty_contact_point_address_person_upd",
    "pty_organization_document_gpkd_one_org_ins", "pty_organization_document_gpkd_one_org_upd", "pty_organization_document_identity",
    "pty_organization_document_no_delete", "pty_organization_document_renew_ins", "pty_organization_document_superseded", "pty_organization_document_voided",
    "pty_privacy_policy_no_delete", "pty_privacy_policy_no_update", "pty_privacy_policy_version_ins",
    "pty_verification_no_delete", "pty_verification_no_update", "pty_verification_target_ins",
  ]);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").replace(/'2026-[0-9T:.\-Z]+'/g, "''");
  assert.doesNotMatch(code, /\d{8,}/, "không gieo số giống SĐT / số giấy tờ");
  assert.doesNotMatch(code, /@/);
});

test("(b) pty_person.birth_date: ngày dân sự từ 1900; NULL được; sai lịch / trước 1900 / sai khuôn bị CHECK chặn; dòng có sẵn = NULL", () => {
  const db = all();
  const p = nguoi(db, "p-b");
  assert.equal(rows(db, "SELECT birth_date FROM pty_person WHERE party_id = ?", p)[0]!.birth_date, null);
  const dat = (v: string | null) => db.prepare("UPDATE pty_person SET birth_date = ? WHERE party_id = ?").run(v, p);
  dat("1990-05-17");
  dat("1900-01-01");
  dat(null);
  assert.throws(() => dat("1990-02-30"), /CHECK/);
  assert.throws(() => dat("1899-12-31"), /CHECK/);
  assert.throws(() => dat("17/05/1990"), /CHECK/);
  for (const v of ["abc", "2000-13-45", "1990-5-17", "19900517", "9999-99-99"]) assert.throws(() => dat(v), /CHECK/, v);
});

test("(c) loại liên hệ ADDRESS có trong danh mục; chỉ hồ sơ CÁ NHÂN — chèn cho tổ chức, đổi loại sang ADDRESS, chuyển dòng ADDRESS sang tổ chức đều bị chặn", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT name, active FROM pty_contact_kind WHERE code = 'ADDRESS'"), [{ name: "Địa chỉ", active: 1 }]);
  const p = nguoi(db, "p-c");
  const o = toChuc(db, "o-c");
  const lh = (id: string, party: string, kind: string, v: string) =>
    db.prepare(
      "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 1, '2026-10-16', ?, ?)",
    ).run(id, party, kind, v, v.toLowerCase(), AT, AT);
  lh("c-1", p, "ADDRESS", "12 Trần Phú, Nha Trang");
  assert.throws(() => lh("c-2", o, "ADDRESS", "12 Trần Phú, Nha Trang"), /contact_address_person_only/);
  lh("c-3", o, "EMAIL", "hoadon@vidu.vn");
  assert.throws(() => db.prepare("UPDATE pty_contact_point SET contact_kind_code = 'ADDRESS' WHERE id = 'c-3'").run(), /contact_address_person_only/);
  assert.throws(() => db.prepare("UPDATE pty_contact_point SET party_id = ? WHERE id = 'c-1'").run(o), /contact_address_person_only/);
});

test("(d) danh mục giấy tờ tổ chức: 5 loại gieo đúng thứ tự; GPKD không hạn; mọi dòng đang dùng, người tạo NULL (hệ thống)", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT code, has_expiry FROM pty_organization_document_type ORDER BY sort_order"), [
    { code: "GPKD", has_expiry: 0 },
    { code: "TRAVEL_DOMESTIC", has_expiry: 1 },
    { code: "TRAVEL_INTERNATIONAL", has_expiry: 1 },
    { code: "ACCOMMODATION", has_expiry: 1 },
    { code: "TRANSPORT", has_expiry: 1 },
  ]);
  assert.equal(rows(db, "SELECT name FROM pty_organization_document_type WHERE code = 'GPKD'")[0]!.name, "Giấy chứng nhận đăng ký kinh doanh");
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM pty_organization_document_type WHERE active <> 1 OR created_by IS NOT NULL OR updated_by IS NOT NULL"), [{ n: 0 }]);
  // Thuộc tính xác minh được là dữ liệu (câu hỏi Q1 — danh sách đề xuất): ba của người, bốn của tổ chức.
  assert.deepEqual(rows(db, "SELECT code, applies_to FROM pty_verification_attribute ORDER BY sort_order"), [
    { code: "HO_TEN", applies_to: "PERSON" },
    { code: "NGAY_SINH", applies_to: "PERSON" },
    { code: "GIOI_TINH", applies_to: "PERSON" },
    { code: "TEN_PHAP_LY", applies_to: "ORGANIZATION" },
    { code: "MA_SO_THUE", applies_to: "ORGANIZATION" },
    { code: "DIA_CHI_TO_CHUC", applies_to: "ORGANIZATION" },
    { code: "EMAIL_HOA_DON", applies_to: "ORGANIZATION" },
  ]);
});

test("(e) giấy tờ tổ chức: chỉ hồ sơ TỔ CHỨC; GPKD phải có số; hết hạn không trước ngày cấp; loại khác không số vẫn được", () => {
  const db = all();
  const p = nguoi(db, "p-e");
  const o = toChuc(db, "o-e");
  assert.throws(() => ins(db, { party: p, type: "TRANSPORT" }), /FOREIGN KEY/, "giấy tờ tổ chức cho hồ sơ người");
  assert.throws(() => ins(db, { party: o, type: "GPKD" }), /CHECK/, "GPKD thiếu số");
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", cap: "2026-09-10", het: "2026-09-01" }), /CHECK/, "hết hạn trước ngày cấp");
  for (const v of ["abc", "2000-13-45", "1990-5-17", "19900517", "9999-99-99"]) {
    assert.throws(() => ins(db, { party: o, type: "TRANSPORT", cap: v }), /CHECK/, `ngày cấp ${v}`);
    assert.throws(() => ins(db, { party: o, type: "TRANSPORT", het: v }), /CHECK/, `ngày hết hạn ${v}`);
  }
  ins(db, { party: o, type: "TRANSPORT", het: "2030-01-01" });
  ins(db, { party: o, type: "GPKD", so: GPKD_A });
});

test("(f) một số GPKD thuộc đúng MỘT tổ chức: tổ chức khác cùng số (viết khác cách) → chặn; chính tổ chức đó gia hạn cùng số → được; sửa số thành số tổ chức khác → chặn; huỷ → số rảnh", () => {
  const db = all();
  const a = toChuc(db, "o-a");
  const b = toChuc(db, "o-b");
  const a1 = ins(db, { party: a, type: "GPKD", so: GPKD_A });
  assert.throws(() => ins(db, { party: b, type: "GPKD", so: "4201234567" }), /organization_document_gpkd_other_org/);
  const a2 = ins(db, { party: a, type: "GPKD", so: GPKD_A, truoc: a1 });
  const b1 = ins(db, { party: b, type: "GPKD", so: GPKD_B });
  assert.throws(
    () => db.prepare("UPDATE pty_organization_document SET document_number = ?, number_key = ? WHERE id = ?").run("4201234567", "4201234567", b1),
    /organization_document_gpkd_other_org/,
  );
  huy(db, a2);
  huy(db, a1);
  ins(db, { party: b, type: "GPKD", so: GPKD_A, truoc: b1 });
});

test("(g) khuôn 0032: không sửa đè dòng đã gia hạn; dòng đã huỷ không sửa (kể cả bỏ huỷ); không đổi tổ chức / loại / dòng trước / mốc tạo; không xoá; gia hạn đúng tổ chức, đúng loại, không tách nhánh", () => {
  const db = all();
  const o = toChuc(db, "o-g");
  const q = toChuc(db, "q-g");
  const d1 = ins(db, { party: o, type: "TRANSPORT", het: "2026-12-31" });
  ins(db, { party: o, type: "TRANSPORT", het: "2027-12-31", truoc: d1 });
  assert.throws(() => db.prepare("UPDATE pty_organization_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1), /organization_document_superseded/);
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", het: "2028-12-31", truoc: d1 }), /UNIQUE constraint failed: pty_organization_document\.previous_id/);
  const d2 = ins(db, { party: o, type: "ACCOMMODATION" });
  huy(db, d2);
  assert.throws(() => db.prepare("UPDATE pty_organization_document SET voided_at = NULL WHERE id = ?").run(d2), /organization_document_voided/);
  const d3 = ins(db, { party: o, type: "ACCOMMODATION" });
  for (const [set, arg] of [["party_id = ?", q], ["document_type_code = ?", "TRANSPORT"], ["previous_id = ?", d2], ["created_at = ?", "2026-01-01T00:00:00.000Z"], ["created_by = ?", "ai-do"]] as const) {
    assert.throws(() => db.prepare(`UPDATE pty_organization_document SET ${set} WHERE id = ?`).run(arg, d3), /organization_document_identity/, set);
  }
  assert.throws(() => db.prepare("DELETE FROM pty_organization_document WHERE id = ?").run(d3), /organization_document_no_delete/);
  assert.throws(() => ins(db, { party: q, type: "ACCOMMODATION", truoc: d3 }), /organization_document_renew_mismatch/, "nối sang tổ chức khác");
  assert.throws(() => ins(db, { party: o, type: "TRANSPORT", truoc: d3 }), /organization_document_renew_mismatch/, "nối sang loại khác");
  assert.throws(() => ins(db, { party: o, type: "ACCOMMODATION", truoc: d2 }), /organization_document_renew_mismatch/, "nối vào dòng đã huỷ");
});

function xm(db: DatabaseSync, o: { id: string; party: string; kind: string; target?: string | null; attr?: string | null; outcome: string; reason?: string | null; by?: string | null; touched?: number }) {
  const by = o.by === undefined ? "s-1" : o.by;
  db.prepare(
    `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.party, o.kind, o.target ?? null, o.attr ?? null, o.outcome, o.reason ?? null, o.touched ?? 0, AT, by, AT, by);
}

test("(h) pty_verification: chỉ-thêm; khuôn dòng (thuộc tính ⇔ có mã thuộc tính, không id dòng; từ chối ⇔ có mã lý do; xác minh / từ chối phải có người); dòng được xác minh phải thuộc đúng hồ sơ", () => {
  const db = all();
  const p = nguoi(db, "p-h");
  const p2 = nguoi(db, "p2-h");
  const o = toChuc(db, "o-h");
  db.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gd-1', ?, 'CCCD', '079000000001', '079000000001', ?, ?)").run(p, AT, AT);
  const od = ins(db, { party: o, type: "GPKD", so: GPKD_B });
  xm(db, { id: "v-1", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH" });
  xm(db, { id: "v-2", party: o, kind: "ORG_DOCUMENT", target: od, outcome: "TU_CHOI", reason: "ANH_MO" });
  xm(db, { id: "v-3", party: p, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "CAN_XAC_MINH_LAI", by: null });
  xm(db, { id: "v-4", party: o, kind: "ATTRIBUTE", attr: "MA_SO_THUE", outcome: "DA_XAC_MINH", touched: 1 });
  assert.throws(() => xm(db, { id: "v-5", party: p2, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "giấy tờ của người khác");
  assert.throws(() => xm(db, { id: "v-6", party: o, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "ngày sinh của tổ chức");
  assert.throws(() => xm(db, { id: "v-7", party: p, kind: "ATTRIBUTE", attr: "TEN_PHAP_LY", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "tên pháp lý của người");
  assert.throws(() => xm(db, { id: "v-8", party: p, kind: "CONTACT", target: "khong-co", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "liên hệ không có");
  assert.throws(() => xm(db, { id: "v-8b", party: p, kind: "ATTRIBUTE", attr: "LAM_DAI", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "thuộc tính không có trong danh mục");
  db.prepare("UPDATE pty_verification_attribute SET active = 0 WHERE code = 'GIOI_TINH'").run();
  assert.throws(() => xm(db, { id: "v-8c", party: p, kind: "ATTRIBUTE", attr: "GIOI_TINH", outcome: "DA_XAC_MINH" }), /verification_target_mismatch/, "thuộc tính đã ngưng");
  assert.throws(() => xm(db, { id: "v-9", party: p, kind: "ATTRIBUTE", attr: null, outcome: "DA_XAC_MINH" }), /CHECK|verification_target_mismatch/, "thuộc tính thiếu mã (trigger đích chạy trước CHECK)");
  assert.throws(() => xm(db, { id: "v-10", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", attr: "NGAY_SINH", outcome: "DA_XAC_MINH" }), /CHECK/, "dòng giấy tờ mang mã thuộc tính");
  assert.throws(() => xm(db, { id: "v-11", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "TU_CHOI" }), /CHECK/, "từ chối thiếu lý do");
  assert.throws(() => xm(db, { id: "v-12", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH", reason: "ANH_MO" }), /CHECK/, "xác minh mang lý do");
  assert.throws(() => xm(db, { id: "v-13", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "DA_XAC_MINH", by: null }), /CHECK/, "xác minh không người");
  assert.throws(() => xm(db, { id: "v-14", party: p, kind: "PERSON_DOCUMENT", target: "gd-1", outcome: "LAM_DAI" }), /CHECK/, "kết luận lạ");
  assert.throws(() => xm(db, { id: "v-15", party: p, kind: "ATTRIBUTE", attr: "NGAY_SINH", outcome: "CAN_XAC_MINH_LAI", touched: 1, by: null }), /CHECK/, "cờ chốt cuối trên dòng cần xác minh lại");
  assert.throws(() => db.prepare("UPDATE pty_verification SET outcome = 'TU_CHOI', reason_code = 'ANH_MO' WHERE id = 'v-1'").run(), /verification_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_verification WHERE id = 'v-1'").run(), /verification_append_only/);
});

const chinhSach = (db: DatabaseSync, id: string, version: number, by: string | null = "s-tq") =>
  db.prepare(
    "INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'Mục đích thử', 'Văn bản thử', ?, ?, ?, ?, ?)",
  ).run(id, version, AT, AT, by, AT, by);

test("(i) chính sách riêng tư: KHÔNG gieo dòng nào; đúng bộ cột (không cột thời hạn xoá); phiên bản liên tiếp từ 1; phải có người đăng; chỉ-thêm", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM pty_privacy_policy"), [{ n: 0 }]);
  assert.deepEqual(cotCua(db, "pty_privacy_policy"), ["id", "version", "purposes", "body", "valid_from_at", "created_at", "created_by", "updated_at", "updated_by",
    "erasure_days", "session_retention_days"]); // hai cột số ngày thêm ở 0108 (lát H-5): rỗng được, không DEFAULT — bài migrations-xoa-an-danh.test.ts canh
  assert.throws(() => chinhSach(db, "cs-0", 2), /privacy_policy_version_gap/, "bắt đầu từ 2");
  chinhSach(db, "cs-1", 1);
  assert.throws(() => chinhSach(db, "cs-3", 3), /privacy_policy_version_gap/, "nhảy 1 → 3");
  assert.throws(() => chinhSach(db, "cs-x", 2, null), /CHECK/, "không người đăng");
  chinhSach(db, "cs-2", 2);
  assert.throws(() => db.prepare("UPDATE pty_privacy_policy SET body = 'Sửa' WHERE id = 'cs-1'").run(), /privacy_policy_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_privacy_policy WHERE id = 'cs-1'").run(), /privacy_policy_append_only/);
});

test("(j) đồng ý: chỉ-thêm; rút chỉ khi đã đồng ý đúng phiên bản đó; phải có tài khoản bấm; quyết định lạ bị chặn", () => {
  const db = all();
  const p = nguoi(db, "p-j");
  chinhSach(db, "cs-1", 1);
  chinhSach(db, "cs-2", 2);
  const dy = (id: string, policy: string, decision: string, by: string | null = "s-1") =>
    db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, p, policy, decision, AT, by, AT, by);
  assert.throws(() => dy("dy-0", "cs-1", "RUT"), /consent_withdraw_without_consent/);
  dy("dy-1", "cs-1", "DONG_Y");
  assert.throws(() => dy("dy-2", "cs-2", "RUT"), /consent_withdraw_without_consent/, "rút phiên bản chưa đồng ý");
  dy("dy-3", "cs-1", "RUT");
  assert.throws(() => dy("dy-4", "cs-1", "DONG_Y", null), /CHECK/);
  assert.throws(() => dy("dy-5", "cs-1", "CO_LE"), /CHECK/);
  assert.throws(() => db.prepare("UPDATE pty_consent SET decision = 'DONG_Y' WHERE id = 'dy-3'").run(), /consent_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_consent WHERE id = 'dy-1'").run(), /consent_append_only/);
});

test("(k) sổ dữ liệu: sáu bảng mới của parties (kind table); ngày sinh N2; số / khoá số / nơi cấp giấy tờ tổ chức N3", () => {
  const sd = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as {
    tables: { name: string; module: string; kind: string }[];
    hangDuLieu: Record<string, Record<string, string>>;
  };
  for (const t of ["pty_organization_document_type", "pty_organization_document", "pty_verification_attribute", "pty_verification", "pty_privacy_policy", "pty_consent"]) {
    const m = sd.tables.find((x) => x.name === t);
    assert.ok(m, t);
    assert.deepEqual({ name: m.name, module: m.module, kind: m.kind }, { name: t, module: "parties", kind: "table" });
  }
  assert.equal(sd.hangDuLieu.pty_person!.birth_date, "N2");
  for (const c of ["document_number", "number_key", "issued_place"]) assert.equal(sd.hangDuLieu.pty_organization_document![c], "N3", c);
});
