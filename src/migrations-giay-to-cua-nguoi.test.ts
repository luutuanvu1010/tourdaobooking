// Kiểm migration giấy tờ của NGƯỜI (ADR-0040 D2; module parties): danh mục loại giấy tờ, danh mục hạng giấy phép lái xe, bảng giấy tờ, và các
// bất biến sát dữ liệu — một số CCCD thuộc đúng một người, gia hạn là dòng mới (không sửa đè, không tách nhánh), dòng đã huỷ không sửa, không đổi
// người/loại/dòng trước/mốc tạo, không xoá. Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL — lớp cuối nếu route có lỗ.
// Dựng schema bằng node:sqlite từ migrations/*.sql. Tệp tìm theo ĐUÔI tên. Mọi số giấy tờ ở đây là số GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_giay_to_cua_nguoi.sql"));
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
const AT = "2026-09-28T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));

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
/** Số đã chuẩn hoá (như src/modules/parties/giay-to.ts sẽ làm): chữ HOA, bỏ khoảng trắng . - / */
const key = (so: string) => so.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");
let n = 0;
interface Doc { id?: string; party: string; type: string; so?: string | null; cls?: string | null; cap?: string | null; noi?: string | null; het?: string | null; truoc?: string | null; huy?: string | null }
function ins(db: DatabaseSync, d: Doc): string {
  const id = d.id ?? `doc-${++n}`;
  const so = d.so === undefined ? null : d.so;
  db.prepare(
    `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
       previous_id, voided_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(id, d.party, d.type, so, so === null ? null : key(so), d.cls ?? null, d.cap ?? null, d.noi ?? null, d.het ?? null, d.truoc ?? null, d.huy ?? null, AT, AT);
  return id;
}
const huy = (db: DatabaseSync, id: string) => db.prepare("UPDATE pty_person_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(AT, "2026-09-28T04:00:00.000Z", id);
const SO_A = "079 123.456-789"; // số GIẢ; chuẩn hoá → 079123456789
const SO_B = "079000000001";

test("(a) đúng một tệp *_giay_to_cua_nguoi.sql; không phải B5; mọi trigger mới tên pty_person_document_*; không dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_giay_to_cua_nguoi.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  const moi = triggers(db).filter((t) => !truoc.has(t));
  assert.ok(moi.length >= 7, `phải có các trigger mới, thấy ${JSON.stringify(moi)}`);
  for (const t of moi) assert.match(t, /^pty_person_document_/, `trigger ${t}: tên phải bắt đầu pty_person_document_ (không staff_/stf_ — B5)`);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").replace(/'2026-[0-9T:.\-Z]+'/g, "''");
  assert.doesNotMatch(code, /\d{8,}/, "không gieo số giống SĐT/số giấy tờ");
  assert.doesNotMatch(code, /@/);
});

test("(b) dữ liệu gieo: 4 loại giấy tờ của người, 8 hạng giấy phép lái xe (đúng thứ tự); mọi dòng đang dùng, người tạo NULL (hệ thống)", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT code, name, has_expiry FROM pty_person_document_type ORDER BY sort_order"), [
    { code: "CCCD", name: "Căn cước công dân (CCCD)", has_expiry: 1 },
    { code: "GPLX", name: "Giấy phép lái xe", has_expiry: 1 },
    { code: "HEALTH_CHECK", name: "Khám sức khoẻ", has_expiry: 1 },
    { code: "TRANSPORT_TRAINING", name: "Tập huấn nghiệp vụ vận tải", has_expiry: 1 },
  ]);
  assert.deepEqual(rows(db, "SELECT code FROM pty_license_class ORDER BY sort_order").map((r) => r.code), ["B", "D1", "D2", "D", "B2_OLD", "C_OLD", "D_OLD", "E_OLD"]);
  assert.equal(rows(db, "SELECT name FROM pty_license_class WHERE code = 'D_OLD'")[0]!.name, "Hạng D (mẫu cũ)");
  for (const t of ["pty_person_document_type", "pty_license_class"]) {
    assert.deepEqual(rows(db, `SELECT count(*) AS n FROM ${t} WHERE active <> 1 OR created_by IS NOT NULL OR updated_by IS NOT NULL`), [{ n: 0 }], t);
  }
});

test("(c) khoá ngoại / CHECK: chỉ hồ sơ CÁ NHÂN; GPLX ⇔ có hạng; CCCD/GPLX phải có số; hết hạn không trước ngày cấp; dòng không tự nối chính nó", () => {
  const db = all();
  const p = nguoi(db, "p-c");
  toChuc(db, "o-c");
  assert.throws(() => ins(db, { party: "o-c", type: "HEALTH_CHECK" }), /FOREIGN KEY/, "giấy tờ cho hồ sơ tổ chức");
  assert.throws(() => ins(db, { party: p, type: "GPLX", so: "790000000001" }), /CHECK/, "GPLX thiếu hạng");
  assert.throws(() => ins(db, { party: p, type: "CCCD", so: SO_B, cls: "B" }), /CHECK/, "CCCD có hạng");
  assert.throws(() => ins(db, { party: p, type: "CCCD" }), /CHECK/, "CCCD thiếu số");
  assert.throws(() => ins(db, { party: p, type: "GPLX", cls: "D2" }), /CHECK/, "GPLX thiếu số");
  assert.throws(() => ins(db, { party: p, type: "HEALTH_CHECK", cap: "2026-09-10", het: "2026-09-01" }), /CHECK/, "hết hạn trước ngày cấp");
  assert.throws(() => ins(db, { party: p, type: "HEALTH_CHECK", cap: "2026-02-30" }), /CHECK/, "ngày sai lịch");
  // Dòng tự nối chính nó: trigger gia hạn (BEFORE INSERT) chặn TRƯỚC CHECK previous_id <> id — lớp nào chặn cũng được, miễn không vào.
  assert.throws(() => ins(db, { id: "doc-tu-noi", party: p, type: "HEALTH_CHECK", truoc: "doc-tu-noi" }), /person_document_renew_mismatch|CHECK/);
  ins(db, { party: p, type: "HEALTH_CHECK", het: "2027-01-01" }); // loại khác: không số, không hạng → được
  ins(db, { party: p, type: "GPLX", so: "790000000001", cls: "D2", het: "2030-01-01" });
});

test("(d) một số CCCD thuộc đúng MỘT người: người khác cùng số → chặn; chính người đó gia hạn cùng số → được; sửa số thành số người khác → chặn; huỷ dòng → số rảnh", () => {
  const db = all();
  const a = nguoi(db, "p-a");
  const b = nguoi(db, "p-b");
  const a1 = ins(db, { party: a, type: "CCCD", so: SO_A, het: "2030-01-01" });
  assert.throws(() => ins(db, { party: b, type: "CCCD", so: "079123456789", het: "2031-01-01" }), /person_document_cccd_other_person/, "người khác cùng số (viết khác cách)");
  const a2 = ins(db, { party: a, type: "CCCD", so: SO_A, het: "2040-01-01", truoc: a1 });
  const b1 = ins(db, { party: b, type: "CCCD", so: SO_B, het: "2031-01-01" });
  assert.throws(
    () => db.prepare("UPDATE pty_person_document SET document_number = ?, number_key = ? WHERE id = ?").run("079123456789", "079123456789", b1),
    /person_document_cccd_other_person/,
    "sửa sai số thành số của người khác",
  );
  huy(db, a2); // huỷ dòng mới nhất trước (dòng trước đó mới hết "đã có dòng gia hạn")
  huy(db, a1);
  ins(db, { party: b, type: "CCCD", so: SO_A, het: "2032-01-01", truoc: b1 }); // nhập nhầm người thì huỷ rồi nhập lại cho đúng người
});

test("(e) không sửa đè giấy tờ đã có dòng gia hạn CHƯA huỷ", () => {
  const db = all();
  const p = nguoi(db, "p-e");
  const d1 = ins(db, { party: p, type: "HEALTH_CHECK", het: "2026-12-31" });
  ins(db, { party: p, type: "HEALTH_CHECK", het: "2027-12-31", truoc: d1 });
  assert.throws(() => db.prepare("UPDATE pty_person_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1), /person_document_superseded/);
});

test("(f) dòng đã huỷ không sửa được (kể cả bỏ huỷ)", () => {
  const db = all();
  const p = nguoi(db, "p-f");
  const d1 = ins(db, { party: p, type: "HEALTH_CHECK", het: "2026-12-31" });
  huy(db, d1);
  assert.throws(() => db.prepare("UPDATE pty_person_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1), /person_document_voided/);
  assert.throws(() => db.prepare("UPDATE pty_person_document SET voided_at = NULL WHERE id = ?").run(d1), /person_document_voided/);
});

test("(g) không đổi người, loại, dòng trước, mốc tạo của một dòng giấy tờ", () => {
  const db = all();
  const p = nguoi(db, "p-g");
  const q = nguoi(db, "q-g");
  const d0 = ins(db, { party: p, type: "HEALTH_CHECK", het: "2026-01-31" });
  huy(db, d0);
  const d1 = ins(db, { party: p, type: "HEALTH_CHECK", het: "2026-12-31" });
  for (const [set, arg] of [["party_id = ?", q], ["document_type_code = ?", "TRANSPORT_TRAINING"], ["previous_id = ?", d0], ["created_at = ?", "2026-01-01T00:00:00.000Z"], ["created_by = ?", "ai-do"]] as const) {
    assert.throws(() => db.prepare(`UPDATE pty_person_document SET ${set} WHERE id = ?`).run(arg, d1), /person_document_identity/, set);
  }
});

test("(h) không xoá dòng giấy tờ (Hiến chương 5.5)", () => {
  const db = all();
  const p = nguoi(db, "p-h");
  const d1 = ins(db, { party: p, type: "HEALTH_CHECK" });
  assert.throws(() => db.prepare("DELETE FROM pty_person_document WHERE id = ?").run(d1), /person_document_no_delete/);
});

test("(i) gia hạn: nối đúng người, đúng loại, dòng chưa huỷ; không tách nhánh; huỷ dòng gia hạn nhầm thì dòng trước sống lại", () => {
  const db = all();
  const p = nguoi(db, "p-i");
  const q = nguoi(db, "q-i");
  const d1 = ins(db, { party: p, type: "GPLX", so: "790000000002", cls: "D2", het: "2026-12-31" });
  assert.throws(() => ins(db, { party: q, type: "GPLX", so: "790000000002", cls: "D2", truoc: d1 }), /person_document_renew_mismatch/, "nối sang người khác");
  assert.throws(() => ins(db, { party: p, type: "HEALTH_CHECK", truoc: d1 }), /person_document_renew_mismatch/, "nối sang loại khác");
  const huyRoi = ins(db, { party: p, type: "HEALTH_CHECK", het: "2026-10-01" });
  huy(db, huyRoi);
  assert.throws(() => ins(db, { party: p, type: "HEALTH_CHECK", truoc: huyRoi }), /person_document_renew_mismatch/, "nối vào dòng đã huỷ");
  const d2 = ins(db, { party: p, type: "GPLX", so: "790000000002", cls: "D2", het: "2031-12-31", truoc: d1 });
  assert.throws(() => ins(db, { party: p, type: "GPLX", so: "790000000002", cls: "D2", het: "2032-12-31", truoc: d1 }), /UNIQUE constraint failed: pty_person_document\.previous_id/, "gia hạn lần hai cùng dòng trước");
  huy(db, d2);
  db.prepare("UPDATE pty_person_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1); // dòng trước sửa sai được lại
  ins(db, { party: p, type: "GPLX", so: "790000000002", cls: "D2", het: "2032-01-31", truoc: d1 }); // và gia hạn lại được
});

test("(j) sổ dữ liệu có ba bảng mới của parties (kind table)", () => {
  const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { tables: { name: string; module: string; kind: string }[] };
  for (const t of ["pty_person_document_type", "pty_license_class", "pty_person_document"]) {
    assert.deepEqual(dict.tables.find((x) => x.name === t), { name: t, module: "parties", kind: "table" }, t);
  }
});
