// Bài migration 0108 (ADR-0126 đ2, đ3, đ6; Hiến chương 5.24; lát H-5 Gói 2). Tìm tệp theo ĐUÔI. Chèn / sửa THẲNG bằng SQL — chứng minh chặn nằm ở CSDL.
// Mọi giá trị là GIẢ. Thứ tự chạy giữa các trigger cùng sự kiện không được tài liệu hoá: ca nào có HAI trigger cùng đúng thì bài ghi rõ và gỡ trigger kia trong DB thử.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIG = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const FILE = FILES.find((f) => f.endsWith("_xoa_an_danh.sql"))!;
const sqlOf = (f: string) => readFileSync(new URL(f, MIG), "utf8");
function open(list: string[]): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of list) d.exec(sqlOf(f));
  return d;
}
const db = (): DatabaseSync => open(FILES);
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string, ...a: string[]): Row[] => d.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (d: DatabaseSync): string[] => rows(d, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const T = "2026-10-17T00:00:00.000Z";
const T2 = "2026-10-17T01:00:00.000Z";
const T3 = "2026-10-17T02:00:00.000Z";
const DAU = (id: string) => "XOA" + id.replace(/-/g, "").toUpperCase();
const ID_A = "0b1e5c2a-0000-4000-8000-00000000000a"; // mã dòng dạng UUID như production (dấu dài 35 ký tự ≤ 40)
const ID_B = "0b1e5c2a-0000-4000-8000-00000000000b";
const ID_G = "0b1e5c2a-0000-4000-8000-00000000000c";
const ID_V = "0b1e5c2a-0000-4000-8000-00000000000d";
let n = 0;

function nguoi(d: DatabaseSync, id: string): string {
  d.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Người ${id}`, T, T);
  d.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, `Người ${id}`, T, T);
  return id;
}
function toChuc(d: DatabaseSync, id: string): string {
  d.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, T, T);
  d.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, T, T);
  return id;
}
const chinhSach = (d: DatabaseSync, id: string, version: number, at = T) =>
  d.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Mục đích thử', 'Toàn văn thử', ?, ?, 's-sup', ?, 's-sup')`).run(id, version, at, at, at);
const dongY = (d: DatabaseSync, party: string, policy: string) =>
  d.prepare(`INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 'DONG_Y', ?, 's-1', ?, 's-1')`)
    .run(`c-${++n}`, party, policy, T, T);
function giayTo(d: DatabaseSync, id: string, party: string, x: Record<string, unknown> = {}): string {
  const loai = String(x.type ?? "CCCD");
  const so = x.num === undefined ? "079000000111" : (x.num as string | null);
  d.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
      previous_id, voided_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 's-1', ?, 's-1')`).run(
    id, party, loai, so, so, (x.cls as string | null) ?? null, "2020-01-01", "Nơi cấp thử", "2035-01-01", (x.prev as string | null) ?? null, null, T, T);
  return id;
}
/** Người P có: CCCD ID_A (đã có dòng gia hạn ID_B), ID_B hiện hành, GPLX hiện hành ID_G, GPLX đã huỷ ID_V. */
function coGiayTo(): DatabaseSync {
  const d = db();
  nguoi(d, "P");
  giayTo(d, ID_A, "P");
  giayTo(d, ID_B, "P", { prev: ID_A });
  giayTo(d, ID_G, "P", { type: "GPLX", num: "790000000222", cls: "B" });
  giayTo(d, ID_V, "P", { type: "GPLX", num: "790000000333", cls: "B" });
  d.prepare("UPDATE pty_person_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(T2, T2, ID_V);
  return d;
}
const anDanhGiayTo = (d: DatabaseSync, where: string, ...a: string[]) =>
  d.prepare(`UPDATE pty_person_document SET erased_at = '${T3}', document_number = 'XOA' || upper(replace(id, '-', '')), number_key = 'XOA' || upper(replace(id, '-', '')),
    issued_place = NULL, updated_at = '${T3}' WHERE ${where}`).run(...a);

function phieu(d: DatabaseSync, party: string, x: Record<string, unknown> = {}): string {
  const id = String(x.id ?? `ph-${++n}`);
  const kind = String(x.subject_kind ?? "NGAY_SINH");
  const v: Record<string, unknown> = {
    policy_id: "pol-1", birth_date: kind === "NGAY_SINH" ? "1990-05-06" : null, address_value: kind === "DIA_CHI" ? "1 Đường Thử" : null,
    document_type_code: kind === "GIAY_TO" ? "HEALTH_CHECK" : null, document_number: null, number_key: null, license_class_code: null,
    issued_date: null, issued_place: null, expiry_date: null, ...x,
  };
  d.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code,
      document_number, number_key, license_class_code, issued_date, issued_place, expiry_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CHO_XAC_MINH', ?, 's-1', ?, 's-1')`).run(
    id, party, kind, v.policy_id as string, v.birth_date as string | null, v.address_value as string | null, v.document_type_code as string | null,
    v.document_number as string | null, v.number_key as string | null, v.license_class_code as string | null, v.issued_date as string | null,
    v.issued_place as string | null, v.expiry_date as string | null, T, T);
  return id;
}
const chapNhan = (d: DatabaseSync, id: string) =>
  d.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = 's-2', updated_at = ? WHERE id = ?").run(T2, T2, id);
const tuChoi = (d: DatabaseSync, id: string) =>
  d.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_KHOP', decided_at = ?, decided_by = 's-2', updated_at = ? WHERE id = ?").run(T2, T2, id);
const rutPhieu = (d: DatabaseSync, id: string) =>
  d.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-1', updated_at = ? WHERE id = ?").run(T2, T2, id);
function coBan(): DatabaseSync {
  const d = db();
  nguoi(d, "p1");
  chinhSach(d, "pol-1", 1);
  dongY(d, "p1", "pol-1");
  return d;
}
/** Người p1: ba phiếu đã xử lý (chấp nhận / từ chối / rút) + một phiếu còn chờ. */
function coPhieu(): { d: DatabaseSync; ngaySinh: string; diaChi: string; giayTo: string; cho: string } {
  const d = coBan();
  const ngaySinh = phieu(d, "p1");
  const diaChi = phieu(d, "p1", { subject_kind: "DIA_CHI" });
  const gt = phieu(d, "p1", { subject_kind: "GIAY_TO", document_type_code: "CCCD", document_number: "079 000 000 111", number_key: "079000000111", issued_place: "Nơi cấp thử", issued_date: "2020-01-01", expiry_date: "2035-01-01" });
  const cho = phieu(d, "p1", { subject_kind: "GIAY_TO", document_type_code: "HEALTH_CHECK" });
  chapNhan(d, ngaySinh);
  tuChoi(d, diaChi);
  rutPhieu(d, gt);
  return { d, ngaySinh, diaChi, giayTo: gt, cho };
}
function phieuXoa(d: DatabaseSync, id: string, party: string, x: Record<string, unknown> = {}): void {
  d.prepare(`INSERT ${x.orReplace ? "OR REPLACE " : ""}INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, 's-1', ?, 's-1')`).run(id, party, (x.policy_id as string | null) ?? null, (x.due_at as string | null) ?? null, String(x.status ?? "CHO_XU_LY"), T, T);
}
const thucHien = (d: DatabaseSync, id: string, by = "s-2") =>
  d.prepare("UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?, decided_by = ?, name_kept = 0, retained_codes = 'HOA_DON', updated_at = ? WHERE id = ?").run(T2, by, T2, id);
const tuChoiXoa = (d: DatabaseSync, id: string) =>
  d.prepare("UPDATE pty_erasure_request SET status = 'TU_CHOI', decided_at = ?, decided_by = 's-2', reason_code = 'KHONG_DU_DIEU_KIEN', updated_at = ? WHERE id = ?").run(T2, T2, id);
const rutXoa = (d: DatabaseSync, id: string, by = "s-1") =>
  d.prepare("UPDATE pty_erasure_request SET status = 'RUT', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(T2, by, T2, id);

test("(a) tệp 0108 có, đứng sau 0107; không DROP TABLE, không INSERT/UPDATE/DELETE; DROP chỉ đúng bốn trigger", () => {
  assert.ok(FILE, "thiếu migrations/*_xoa_an_danh.sql");
  assert.ok(FILES.indexOf(FILE) > FILES.findIndex((f) => f.endsWith("_xac_minh_ho_so.sql")));
  const sql = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|VIEW|INDEX)\b|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\s+\w+\s+SET\b/i);
  const dropped = [...sql.matchAll(/DROP\s+TRIGGER\s+(\w+)/gi)].map((m) => m[1]).sort();
  assert.deepEqual(dropped, ["pty_person_document_superseded", "pty_person_document_voided", "pty_self_submission_content", "pty_self_submission_status_one_way"]);
  for (const t of dropped) assert.match(sql, new RegExp(`CREATE TRIGGER ${t}\\b`), `${t} phải được tạo lại cùng tên`);
});

test("(b) hai cột số ngày rỗng được, không DEFAULT, chỉ CHECK >= 1; migration không gieo chính sách", () => {
  const sql = sqlOf(FILE).replace(/--.*$/gm, "");
  for (const c of ["erasure_days", "session_retention_days"]) {
    const dong = sql.split("\n").find((l) => l.includes(`ADD COLUMN ${c}`))!;
    assert.ok(dong, c);
    assert.doesNotMatch(dong, /DEFAULT|NOT NULL/i, `${c}: không DEFAULT, không NOT NULL (con số chờ luật sư)`);
    assert.match(dong, new RegExp(`${c} IS NULL OR ${c} >= 1`));
  }
  const d = db();
  assert.equal(rows(d, "SELECT count(*) n FROM pty_privacy_policy")[0]!.n, 0, "không gieo chính sách");
  assert.equal(rows(d, "SELECT count(*) n FROM pty_erasure_request")[0]!.n, 0, "không gieo phiếu");
  chinhSach(d, "pol-x", 1);
  assert.deepEqual(rows(d, "SELECT erasure_days, session_retention_days FROM pty_privacy_policy")[0], { erasure_days: null, session_retention_days: null });
  // Chính sách đã đăng không sửa (0103 privacy_policy_append_only): số ngày đi cùng bản ĐĂNG MỚI, nên thử bằng INSERT.
  const dang = (cot: string, v: number, ver: number) => d.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, ${cot}, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'x', 'y', ?, ?, ?, 's-sup', ?, 's-sup')`).run(`pol-${ver}`, ver, T2, v, T2, T2);
  assert.throws(() => dang("erasure_days", 0, 2), /CHECK constraint failed/);
  assert.throws(() => dang("session_retention_days", -5, 2), /CHECK constraint failed/);
  dang("erasure_days", 30, 2); // giá trị giả của bài, không phải số của hệ thống
});

test("(b2) tập trigger: có đủ trigger mới, trigger không đụng tới còn nguyên", () => {
  const d = open(FILES.slice(0, FILES.indexOf(FILE)));
  const truoc = new Set(triggers(d));
  d.exec(sqlOf(FILE));
  const sau = triggers(d);
  const moi = sau.filter((t) => !truoc.has(t));
  assert.deepEqual(moi, [
    "pty_erasure_request_content", "pty_erasure_request_decider", "pty_erasure_request_new_ins", "pty_erasure_request_no_delete", "pty_erasure_request_no_replace",
    "pty_erasure_request_offsite_one_way", "pty_erasure_request_one_pending_ins", "pty_erasure_request_person_ins", "pty_erasure_request_status_one_way", "pty_erasure_request_withdraw",
    "pty_party_merge_erasure", "pty_person_document_erase_shape", "pty_person_document_erased_frozen", "pty_person_document_erased_ins",
    "pty_person_document_next_ins", "pty_person_document_no_replace",
    "pty_self_submission_erase_shape", "pty_self_submission_erased_frozen", "pty_self_submission_erased_ins", "pty_self_submission_erasure_open_ins",
  ]);
  for (const t of truoc) assert.ok(sau.includes(t), `trigger cũ ${t} bị mất`);
  for (const t of ["pty_person_document_identity", "pty_person_document_cccd_one_person_ins", "pty_person_document_cccd_one_person_upd", "pty_person_document_renew_ins",
    "pty_person_document_no_delete", "pty_self_submission_decider_not_author"]) assert.ok(sau.includes(t), `${t} phải còn`);
});

test("(c) ẩn danh dòng giấy tờ HIỆN HÀNH, ĐÃ GIA HẠN THAY và ĐÃ HUỶ: chuyển hợp lệ qua", () => {
  const d = coGiayTo();
  anDanhGiayTo(d, "party_id = 'P'");
  const r = rows(d, "SELECT id, document_number, number_key, issued_place, erased_at, expiry_date, issued_date, voided_at FROM pty_person_document ORDER BY id");
  assert.equal(r.length, 4);
  for (const x of r) {
    assert.equal(x.document_number, DAU(String(x.id)));
    assert.equal(x.number_key, DAU(String(x.id)));
    assert.equal(x.issued_place, null);
    assert.equal(x.erased_at, T3);
    assert.equal(x.expiry_date, "2035-01-01");
    assert.equal(x.issued_date, "2020-01-01");
  }
  assert.equal(r.find((x) => x.id === ID_V)!.voided_at, T2, "dòng đã huỷ giữ voided_at");
  assert.equal(r.find((x) => x.id === ID_B)!.voided_at, null);
});

test("(c2) hai người có CCCD HIỆN HÀNH khác nhau: dấu theo dòng nên ẩn danh cả hai không vướng trigger một CCCD một người", () => {
  const d = db();
  nguoi(d, "P");
  nguoi(d, "Q");
  giayTo(d, ID_A, "P");
  giayTo(d, ID_B, "Q", { num: "079000000999" });
  anDanhGiayTo(d, "1 = 1");
  assert.equal(rows(d, "SELECT count(DISTINCT number_key) n FROM pty_person_document")[0]!.n, 2);
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE voided_at IS NULL AND erased_at IS NOT NULL")[0]!.n, 2);
});

test("(d) dạng chuyển sai bị chặn: số khác dấu, giữ nơi cấp, đổi hạn / ngày cấp / hạng / huỷ cùng lúc đặt erased_at", () => {
  const d = coGiayTo();
  const dau = (id: string) => DAU(id);
  const dung = (id: string) => `document_number = '${dau(id)}', number_key = '${dau(id)}', issued_place = NULL`;
  const chay = (set: string, id: string) => d.prepare(`UPDATE pty_person_document SET erased_at = '${T3}', ${set} WHERE id = ?`).run(id);
  for (const id of [ID_A, ID_B]) {
    assert.throws(() => chay(`document_number = 'XOA123', number_key = '${dau(id)}', issued_place = NULL`, id), /person_document_erase_shape/, `số khác dấu ${id}`);
    assert.throws(() => chay(`document_number = '${dau(id)}', number_key = 'XOA123', issued_place = NULL`, id), /person_document_erase_shape/, `khoá số khác dấu ${id}`);
    assert.throws(() => chay(`document_number = '${dau(id)}', number_key = '${dau(id === ID_A ? ID_B : ID_A)}', issued_place = NULL`, id), /person_document_erase_shape/, `dấu của DÒNG KHÁC ${id}`);
    assert.throws(() => chay(`document_number = '${dau(id)}', number_key = '${dau(id)}'`, id), /person_document_erase_shape/, `giữ nơi cấp ${id}`);
    assert.throws(() => chay(`${dung(id)}, expiry_date = '2040-01-01'`, id), /person_document_erase_shape/, `đổi hạn ${id}`);
    assert.throws(() => chay(`${dung(id)}, issued_date = '2019-01-01'`, id), /person_document_erase_shape/, `đổi ngày cấp ${id}`);
    assert.throws(() => chay(`${dung(id)}, voided_at = '${T2}'`, id), /person_document_erase_shape/, `đặt huỷ ${id}`);
  }
  assert.throws(() => chay(`${dung(ID_G)}, license_class_code = 'D1'`, ID_G), /person_document_erase_shape/, "đổi hạng");
  assert.throws(() => chay(`${dung(ID_V)}, voided_at = NULL`, ID_V), /person_document_erase_shape/, "bỏ huỷ dòng đã huỷ");
  assert.throws(() => chay(`${dung(ID_V)}, expiry_date = '2040-01-01'`, ID_V), /person_document_erase_shape/, "đổi hạn dòng đã huỷ");
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE erased_at IS NOT NULL")[0]!.n, 0, "không dòng nào đổi");
});

test("(e) dòng đã ẩn danh đóng băng: đặt erased_at về rỗng, đặt lại số thật, sửa hạn → đều bị chặn", () => {
  const d = coGiayTo();
  anDanhGiayTo(d, "party_id = 'P'");
  // Dòng hiện hành ID_B (không gia hạn, không huỷ): chỉ trigger đóng băng đúng. Dòng ID_A / ID_V còn bị trigger cũ chặn — gỡ chúng trong DB thử để thấy đóng băng đứng một mình.
  assert.throws(() => d.prepare("UPDATE pty_person_document SET erased_at = NULL WHERE id = ?").run(ID_B), /person_document_erased/);
  assert.throws(() => d.prepare("UPDATE pty_person_document SET document_number = '079012345678', number_key = '079012345678' WHERE id = ?").run(ID_B), /person_document_erased/);
  assert.throws(() => d.prepare("UPDATE pty_person_document SET expiry_date = '2040-01-01' WHERE id = ?").run(ID_G), /person_document_erased/);
  d.exec("DROP TRIGGER pty_person_document_superseded; DROP TRIGGER pty_person_document_voided");
  for (const id of [ID_A, ID_V]) {
    assert.throws(() => d.prepare("UPDATE pty_person_document SET erased_at = NULL WHERE id = ?").run(id), /person_document_erased/, id);
    assert.throws(() => d.prepare("UPDATE pty_person_document SET issued_place = 'Nơi thật' WHERE id = ?").run(id), /person_document_erased/, id);
  }
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE erased_at IS NOT NULL")[0]!.n, 4);
});

test("(f) sửa thường trên dòng đã gia hạn / đã huỷ (không phải ẩn danh) VẪN bị chặn như 0032", () => {
  const d = coGiayTo();
  assert.throws(() => d.prepare("UPDATE pty_person_document SET expiry_date = '2030-01-01' WHERE id = ?").run(ID_A), /person_document_superseded/);
  assert.throws(() => d.prepare("UPDATE pty_person_document SET expiry_date = '2030-01-01' WHERE id = ?").run(ID_V), /person_document_voided/);
  assert.throws(() => d.prepare("UPDATE pty_person_document SET voided_at = NULL WHERE id = ?").run(ID_V), /person_document_voided/, "bỏ huỷ");
  assert.throws(() => d.prepare("UPDATE pty_person_document SET erased_at = NULL, expiry_date = '2030-01-01' WHERE id = ?").run(ID_A), /person_document_superseded/, "erased_at vẫn rỗng không phải miễn");
  d.prepare("UPDATE pty_person_document SET expiry_date = '2030-01-01', updated_at = ? WHERE id = ?").run(T2, ID_B); // dòng hiện hành vẫn sửa được
});

test("(g) phiếu tự khai: ẩn danh phiếu ĐÃ CHẤP NHẬN, ĐÃ TỪ CHỐI, ĐÃ RÚT qua; phiếu ĐANG CHỜ thì không (phải rút trước)", () => {
  const { d, ngaySinh, diaChi, giayTo: gt, cho } = coPhieu();
  d.prepare(`UPDATE pty_self_submission SET erased_at = ?, birth_date = '1900-01-01', updated_at = ? WHERE id = ?`).run(T3, T3, ngaySinh);
  d.prepare(`UPDATE pty_self_submission SET erased_at = ?, address_value = 'Đã xoá', updated_at = ? WHERE id = ?`).run(T3, T3, diaChi);
  d.prepare(`UPDATE pty_self_submission SET erased_at = ?, document_number = ?, number_key = ?, issued_place = NULL, updated_at = ? WHERE id = ?`).run(T3, DAU(gt), DAU(gt), T3, gt);
  const r = (id: string) => rows(d, "SELECT * FROM pty_self_submission WHERE id = ?", id)[0]!;
  assert.equal(r(ngaySinh).birth_date, "1900-01-01");
  assert.equal(r(ngaySinh).status, "DA_CHAP_NHAN");
  assert.equal(r(ngaySinh).decided_by, "s-2");
  assert.equal(r(diaChi).address_value, "Đã xoá");
  assert.equal(r(diaChi).reason_code, "KHONG_KHOP");
  assert.equal(r(gt).document_number, DAU(gt));
  assert.equal(r(gt).number_key, DAU(gt));
  assert.equal(r(gt).issued_place, null);
  assert.equal(r(gt).expiry_date, "2035-01-01");
  assert.equal(r(gt).status, "RUT");
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET erased_at = ?, updated_at = ? WHERE id = ?").run(T3, T3, cho), /self_submission_erase_shape/, "phiếu đang chờ");
  // sai dạng
  const { d: d2, ngaySinh: ns2, giayTo: gt2, diaChi: dc2 } = coPhieu();
  const sai = (set: string, id: string, ten: string) => assert.throws(() => d2.prepare(`UPDATE pty_self_submission SET erased_at = '${T3}', ${set} WHERE id = ?`).run(id), /self_submission_erase_shape|CHECK constraint failed/, ten);
  sai("birth_date = NULL", ns2, "ngày sinh rỗng");
  sai("birth_date = '1991-01-01'", ns2, "ngày sinh khác dấu");
  sai("birth_date = '1900-01-01', status = 'RUT'", ns2, "đổi trạng thái cùng lúc");
  sai("birth_date = '1900-01-01', decided_by = 's-9'", ns2, "đổi người xử lý cùng lúc");
  sai("address_value = 'x'", dc2, "địa chỉ khác dấu");
  sai("document_number = 'XOA1', number_key = 'XOA1', issued_place = NULL", gt2, "số khác dấu");
  sai(`document_number = '${DAU(gt2)}', number_key = 'XOA1', issued_place = NULL`, gt2, "số đúng dấu, khoá số sai");
  sai(`document_number = '${DAU(gt2)}', number_key = '079000000111', issued_place = NULL`, gt2, "số đúng dấu, giữ khoá số thật");
  sai(`document_number = '${DAU(gt2)}', number_key = '${DAU(gt2)}'`, gt2, "giữ nơi cấp");
  sai(`document_number = '${DAU(gt2)}', number_key = '${DAU(gt2)}', issued_place = NULL, expiry_date = '2040-01-01'`, gt2, "đổi hạn");
  sai(`document_number = '${DAU(ns2)}', number_key = '${DAU(ns2)}', birth_date = '1900-01-01'`, ns2, "đặt số lên phiếu ngày sinh (CHECK 0105 hoặc dạng)");
  assert.equal(rows(d2, "SELECT count(*) n FROM pty_self_submission WHERE erased_at IS NOT NULL")[0]!.n, 0);
});

test("(g2) phiếu đã ẩn danh đóng băng: đặt erased_at về rỗng hoặc sửa nội dung → self_submission_erased", () => {
  const { d, ngaySinh } = coPhieu();
  d.prepare(`UPDATE pty_self_submission SET erased_at = ?, birth_date = '1900-01-01', updated_at = ? WHERE id = ?`).run(T3, T3, ngaySinh);
  // Phiếu đã xử lý còn bị trigger một chiều / nội dung chặn: gỡ hai trigger đó trong DB thử để thấy đóng băng đứng một mình.
  d.exec("DROP TRIGGER pty_self_submission_status_one_way; DROP TRIGGER pty_self_submission_content");
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET erased_at = NULL WHERE id = ?").run(ngaySinh), /self_submission_erased/);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET birth_date = '1990-05-06' WHERE id = ?").run(ngaySinh), /self_submission_erased/);
  // và trong DB đầy đủ thì vẫn bị chặn (bởi trigger nào cũng được)
  const { d: d2, ngaySinh: ns2 } = coPhieu();
  d2.prepare(`UPDATE pty_self_submission SET erased_at = ?, birth_date = '1900-01-01', updated_at = ? WHERE id = ?`).run(T3, T3, ns2);
  assert.throws(() => d2.prepare("UPDATE pty_self_submission SET erased_at = NULL WHERE id = ?").run(ns2), /self_submission_(erased|status_one_way)/);
  assert.throws(() => d2.prepare("UPDATE pty_self_submission SET birth_date = '1990-05-06' WHERE id = ?").run(ns2), /self_submission_(erased|content)/);
});

test("(h) sửa nội dung phiếu không phải ẩn danh VẪN bị chặn như 0105; đổi trạng thái phiếu đã xử lý VẪN bị chặn", () => {
  const { d, ngaySinh, cho } = coPhieu();
  // Phiếu đang chờ: sửa kèm chuyển hợp lệ để chỉ trigger nội dung sai (khuôn bài H-3).
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET document_number = 'KHAC1', number_key = 'KHAC1', status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(T2, cho), /self_submission_content/);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET birth_date = '1991-01-01', erased_at = NULL, status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = ?").run(T2, cho), /self_submission_content|CHECK constraint failed/, "erased_at vẫn rỗng không phải miễn");
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET status = 'RUT' WHERE id = ?").run(ngaySinh), /self_submission_status_one_way/, "đổi trạng thái phiếu đã chấp nhận");
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET updated_at = ? WHERE id = ?").run(T3, ngaySinh), /self_submission_status_one_way/, "chạm phiếu đã xử lý");
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET updated_at = ? WHERE id = ?").run(T3, cho), /self_submission_status_one_way/, "chạm phiếu đang chờ");
});

test("(i) phiếu xoá: chỉ hồ sơ cá nhân; một phiếu chờ mỗi hồ sơ; INSERT OR REPLACE bị chặn; không xoá dòng", () => {
  const d = db();
  nguoi(d, "p1");
  nguoi(d, "p2");
  toChuc(d, "o1");
  assert.throws(() => phieuXoa(d, "e-o", "o1"), /erasure_person_only/);
  phieuXoa(d, "e-1", "p1");
  assert.throws(() => phieuXoa(d, "e-2", "p1"), /erasure_pending_exists/);
  assert.throws(() => phieuXoa(d, "e-3", "p2", { status: "RUT" }), /erasure_new_not_pending/);
  assert.throws(() => d.prepare("DELETE FROM pty_erasure_request WHERE id = 'e-1'").run(), /erasure_no_delete/);
  rutXoa(d, "e-1");
  phieuXoa(d, "e-4", "p1"); // đã rút phiếu cũ: gửi lại được
  assert.throws(() => phieuXoa(d, "e-1", "p2", { orReplace: true }), /erasure_no_replace/);
  assert.equal(rows(d, "SELECT status FROM pty_erasure_request WHERE id = 'e-1'")[0]!.status, "RUT", "dòng cũ còn nguyên sau INSERT OR REPLACE bị chặn");
  assert.equal(rows(d, "SELECT count(*) n FROM pty_erasure_request")[0]!.n, 2);
  // không có chính sách thì không có hạn; có chính sách thì hạn tuỳ chọn (chính sách chưa có số ngày)
  assert.throws(() => phieuXoa(d, "e-5", "p2", { due_at: "2026-11-17T00:00:00.000Z" }), /CHECK constraint failed/, "có hạn mà không có chính sách");
  chinhSach(d, "pol-1", 1);
  phieuXoa(d, "e-6", "p2", { policy_id: "pol-1" });
});

test("(j) phiếu xoá: trạng thái một chiều; người xử lý ≠ người gửi; RUT chỉ người gửi; bản ngoài một chiều, chỉ sau DA_THUC_HIEN", () => {
  const d = db();
  nguoi(d, "p1");
  nguoi(d, "p2");
  chinhSach(d, "pol-1", 1);
  phieuXoa(d, "e-1", "p1", { policy_id: "pol-1", due_at: "2026-11-17T00:00:00.000Z" });
  assert.throws(() => thucHien(d, "e-1", "s-1"), /erasure_decider_is_requester/);
  assert.throws(() => rutXoa(d, "e-1", "s-9"), /erasure_withdraw_not_requester/);
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET updated_at = ? WHERE id = 'e-1'").run(T2), /erasure_status_one_way/, "chạm dòng đang chờ");
  // sửa nội dung kèm chuyển hợp lệ (RUT bởi người gửi) để chỉ trigger nội dung sai
  for (const [cot, giaTri] of [["due_at", "2026-12-31T00:00:00.000Z"], ["party_id", "p2"], ["created_by", "s-9"], ["created_at", T3], ["policy_id", null]] as const)
    assert.throws(() => d.prepare(`UPDATE pty_erasure_request SET ${cot} = ?, status = 'RUT', decided_at = ?, decided_by = 's-1' WHERE id = 'e-1'`).run(giaTri, T2), /erasure_content|CHECK constraint failed/, cot);
  assert.equal(rows(d, "SELECT status FROM pty_erasure_request WHERE id = 'e-1'")[0]!.status, "CHO_XU_LY");
  thucHien(d, "e-1");
  assert.throws(() => tuChoiXoa(d, "e-1"), /erasure_status_one_way/);
  assert.throws(() => rutXoa(d, "e-1"), /erasure_status_one_way/);
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET retained_codes = 'KHAC' WHERE id = 'e-1'").run(), /erasure_status_one_way/);
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET name_kept = 1 WHERE id = 'e-1'").run(), /erasure_status_one_way/);
  // bản ngoài: chỉ đặt sau DA_THUC_HIEN, một lần
  d.prepare("UPDATE pty_erasure_request SET offsite_at = ? WHERE id = 'e-1'").run(T3);
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET offsite_at = ? WHERE id = 'e-1'").run("2026-10-18T00:00:00.000Z"), /erasure_offsite_one_way/);
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET offsite_at = NULL WHERE id = 'e-1'").run(), /erasure_offsite_one_way/);
  phieuXoa(d, "e-2", "p2");
  tuChoiXoa(d, "e-2");
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET offsite_at = ? WHERE id = 'e-2'").run(T3), /CHECK constraint failed/, "bản ngoài khi từ chối");
  // CHECK vòng đời
  phieuXoa(d, "e-3", "p2");
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?, decided_by = 's-2' WHERE id = 'e-3'").run(T2), /CHECK constraint failed/, "thiếu mã giữ lại");
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET status = 'TU_CHOI', decided_at = ?, decided_by = 's-2' WHERE id = 'e-3'").run(T2), /CHECK constraint failed/, "từ chối thiếu lý do");
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?, decided_by = 's-2', name_kept = 2, retained_codes = 'X1' WHERE id = 'e-3'").run(T2), /CHECK constraint failed/, "name_kept ngoài 0/1");
  assert.throws(() => d.prepare("UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?, decided_by = 's-2', name_kept = 0, retained_codes = 'viet thuong' WHERE id = 'e-3'").run(T2), /CHECK constraint failed/, "mã giữ lại sai khuôn");
});

test("(k) phiếu xoá đang chờ chặn phiếu tự khai mới của cùng hồ sơ; phiếu xoá đã xong / đã rút thì không chặn", () => {
  const d = coBan();
  phieuXoa(d, "e-1", "p1");
  assert.throws(() => phieu(d, "p1"), /self_submission_erasure_open/);
  rutXoa(d, "e-1");
  const a = phieu(d, "p1");
  assert.ok(a);
  nguoi(d, "p2");
  dongY(d, "p2", "pol-1");
  phieuXoa(d, "e-2", "p2");
  phieu(d, "p1", { subject_kind: "DIA_CHI" }); // phiếu xoá chờ của hồ sơ KHÁC không chặn
  thucHien(d, "e-2");
  phieu(d, "p2"); // đã thực hiện: trigger này không chặn (chặn khai lại sau xoá là việc của lớp máy chủ / chính sách)
});

test("(l) gộp hồ sơ bị chặn khi một trong hai hồ sơ có phiếu xoá đang chờ hoặc đã thực hiện (hai chiều)", () => {
  const d = db();
  for (const p of ["a1", "b1", "a2", "b2", "a3", "b3", "a4", "b4", "a5", "b5"]) nguoi(d, p);
  const gop = (nguon: string, dich: string) =>
    d.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(dich, T3, nguon);
  phieuXoa(d, "e-a1", "a1");
  thucHien(d, "e-a1");
  assert.throws(() => gop("a1", "b1"), /party_merge_erasure/, "nguồn có phiếu đã thực hiện");
  phieuXoa(d, "e-b2", "b2");
  thucHien(d, "e-b2");
  assert.throws(() => gop("a2", "b2"), /party_merge_erasure/, "đích có phiếu đã thực hiện");
  phieuXoa(d, "e-a3", "a3");
  assert.throws(() => gop("a3", "b3"), /party_merge_erasure/, "nguồn có phiếu đang chờ");
  phieuXoa(d, "e-b4", "b4");
  assert.throws(() => gop("a4", "b4"), /party_merge_erasure/, "đích có phiếu đang chờ");
  phieuXoa(d, "e-a5", "a5");
  tuChoiXoa(d, "e-a5");
  gop("a5", "b5"); // phiếu bị từ chối / rút không chặn
  assert.equal(rows(d, "SELECT merged_into_id FROM pty_party WHERE id = 'a5'")[0]!.merged_into_id, "b5");
  assert.equal(rows(d, "SELECT merged_into_id FROM pty_party WHERE id = 'a1'")[0]!.merged_into_id, null);
});

test("(m) migration trên dữ liệu mẫu của 0103–0107: dòng cũ vẫn hợp lệ, vẫn bị chặn như trước, và ẩn danh được", () => {
  const d = open(FILES.slice(0, FILES.indexOf(FILE)));
  nguoi(d, "P");
  nguoi(d, "Q");
  chinhSach(d, "pol-1", 1);
  dongY(d, "P", "pol-1");
  giayTo(d, ID_A, "P");
  giayTo(d, ID_B, "P", { prev: ID_A });
  giayTo(d, ID_G, "Q", { type: "GPLX", num: "790000000222", cls: "B" });
  giayTo(d, ID_V, "Q", { type: "GPLX", num: "790000000333", cls: "B" });
  d.prepare("UPDATE pty_person_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(T2, T2, ID_V);
  const ns = phieu(d, "P");
  const dc = phieu(d, "P", { subject_kind: "DIA_CHI" });
  chapNhan(d, ns);
  tuChoi(d, dc);
  const truoc = JSON.stringify(rows(d, "SELECT * FROM pty_person_document ORDER BY id")) + JSON.stringify(rows(d, "SELECT * FROM pty_self_submission ORDER BY id"));
  d.exec(sqlOf(FILE));
  const sau = JSON.stringify(rows(d, "SELECT * FROM pty_person_document ORDER BY id").map(({ erased_at, ...x }) => x)) +
    JSON.stringify(rows(d, "SELECT * FROM pty_self_submission ORDER BY id").map(({ erased_at, ...x }) => x));
  assert.equal(sau, truoc, "dòng cũ nguyên vẹn, cột mới rỗng");
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE erased_at IS NOT NULL")[0]!.n, 0);
  // luật cũ còn nguyên
  assert.throws(() => d.prepare("UPDATE pty_person_document SET expiry_date = '2030-01-01' WHERE id = ?").run(ID_A), /person_document_superseded/);
  assert.throws(() => d.prepare("UPDATE pty_person_document SET expiry_date = '2030-01-01' WHERE id = ?").run(ID_V), /person_document_voided/);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET status = 'RUT' WHERE id = ?").run(ns), /self_submission_status_one_way/);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET address_value = 'khác' WHERE id = ?").run(dc), /self_submission_(content|status_one_way)/);
  // ẩn danh dữ liệu cũ được
  anDanhGiayTo(d, "1 = 1");
  d.prepare("UPDATE pty_self_submission SET erased_at = ?, birth_date = '1900-01-01', updated_at = ? WHERE id = ?").run(T3, T3, ns);
  d.prepare("UPDATE pty_self_submission SET erased_at = ?, address_value = 'Đã xoá', updated_at = ? WHERE id = ?").run(T3, T3, dc);
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE erased_at IS NOT NULL")[0]!.n, 4);
});

test("(n) INSERT không đảo ngược được ẩn danh (vòng sửa 1, I-1): REPLACE cùng id, giấy tờ / phiếu mang sẵn erased_at, REPLACE id mới cùng previous_id", () => {
  const d = coGiayTo();
  anDanhGiayTo(d, "party_id = 'P'");
  const cot = `id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, previous_id, voided_at, erased_at, created_at, created_by, updated_at, updated_by`;
  const ghi = (kieu: string, id: string, prev: string | null, erased: string | null) =>
    d.prepare(`INSERT ${kieu} INTO pty_person_document (${cot}) VALUES (?, 'P', 'CCCD', '079012345678', '079012345678', '2020-01-01', 'Nơi thật', '2035-01-01', ?, NULL, ?, ?, 's-1', ?, 's-1')`).run(id, prev, erased, T3, T3);
  // A: REPLACE cùng id ghi đè dòng đã ẩn danh bằng số thật
  assert.throws(() => ghi("OR REPLACE", ID_B, null, null), /person_document_no_replace/, "A");
  assert.equal(rows(d, "SELECT document_number FROM pty_person_document WHERE id = ?", ID_B)[0]!.document_number, DAU(ID_B), "dòng ẩn danh còn nguyên");
  // B: dòng mới mang sẵn erased_at
  assert.throws(() => ghi("", "0b1e5c2a-0000-4000-8000-0000000000e1", null, T3), /person_document_erased_ins/, "B");
  // D: id MỚI cùng previous_id với một dòng gia hạn đang sống — REPLACE xoá ngầm dòng cũ qua chỉ mục next_uq
  assert.throws(() => ghi("OR REPLACE", "0b1e5c2a-0000-4000-8000-0000000000e2", ID_A, null), /person_document_next_exists/, "D");
  assert.equal(rows(d, "SELECT count(*) n FROM pty_person_document WHERE id = ?", ID_B)[0]!.n, 1, "dòng gia hạn ẩn danh không bị xoá ngầm");
  assert.throws(() => ghi("", "0b1e5c2a-0000-4000-8000-0000000000e3", ID_A, null), /person_document_next_exists|UNIQUE/, "INSERT thường cùng previous_id");
  // Đường hợp lệ vẫn qua: gia hạn dòng hiện hành chưa có dòng nối (ID_G đã ẩn danh nhưng chưa có dòng nối) và dòng mới không erased_at
  nguoi(d, "R");
  d.prepare(`INSERT INTO pty_person_document (${cot}) VALUES ('0b1e5c2a-0000-4000-8000-0000000000e4', 'R', 'CCCD', '079000000555', '079000000555', '2020-01-01', 'Nơi cấp', '2035-01-01', NULL, NULL, NULL, ?, 's-1', ?, 's-1')`).run(T3, T3);
  // E: phiếu CHO_XAC_MINH mang sẵn erased_at (người dùng kẹt vĩnh viễn)
  const { d: d2 } = coPhieu();
  nguoi(d2, "p2");
  dongY(d2, "p2", "pol-1");
  assert.throws(() => d2.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, erased_at, created_at, created_by, updated_at, updated_by)
    VALUES ('ph-e', 'p2', 'NGAY_SINH', 'pol-1', '1990-05-06', 'CHO_XAC_MINH', ?, ?, 's-1', ?, 's-1')`).run(T3, T3, T3), /self_submission_erased_ins/, "E");
  phieu(d2, "p2"); // phiếu thường vẫn gửi được
});

test("(o) phiếu xoá, vòng sửa 1 m-1: từng CHECK đứng riêng; trạng thái lạ; INSERT thẳng DA_THUC_HIEN; REPLACE id mới cùng hồ sơ", () => {
  const d = db();
  nguoi(d, "p1");
  nguoi(d, "p2");
  phieuXoa(d, "e-1", "p1");
  const cap = (set: string) => d.prepare(`UPDATE pty_erasure_request SET ${set}, updated_at = '${T2}' WHERE id = 'e-1'`).run();
  assert.throws(() => cap(`status = 'MO_LAI', decided_at = '${T2}', decided_by = 's-2'`), /CHECK constraint failed/, "trạng thái lạ");
  assert.throws(() => cap(`status = 'DA_THUC_HIEN', decided_at = '${T2}', decided_by = 's-2', name_kept = 0`), /CHECK constraint failed/, "thiếu mã giữ lại, có name_kept");
  assert.throws(() => cap(`status = 'DA_THUC_HIEN', decided_at = '${T2}', decided_by = 's-2', retained_codes = 'HOA_DON'`), /CHECK constraint failed/, "thiếu name_kept, có mã giữ lại");
  // INSERT thẳng phiếu đã thực hiện, người xử lý trùng người gửi (đầy đủ cột để chỉ new_ins chặn)
  assert.throws(() => d.prepare(`INSERT INTO pty_erasure_request (id, party_id, status, decided_at, decided_by, name_kept, retained_codes, created_at, created_by, updated_at, updated_by)
    VALUES ('e-x', 'p2', 'DA_THUC_HIEN', ?, 's-1', 0, 'HOA_DON', ?, 's-1', ?, 's-1')`).run(T2, T, T2), /erasure_new_not_pending/);
  // REPLACE với id MỚI cùng hồ sơ đang có phiếu chờ: chỉ one_pending_ins chặn (index duy nhất sẽ xoá ngầm phiếu cũ)
  assert.throws(() => phieuXoa(d, "e-moi", "p1", { orReplace: true }), /erasure_pending_exists/);
  assert.equal(rows(d, "SELECT status FROM pty_erasure_request WHERE id = 'e-1'")[0]!.status, "CHO_XU_LY", "phiếu chờ cũ còn nguyên");
});
