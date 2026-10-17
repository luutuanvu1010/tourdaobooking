// Bài MỨC CÂU LỆNH của phiếu yêu cầu xoá + ẩn danh hoá (ADR-0126; lát H-5 Gói 2, việc 2): chạy các câu của repository.ts trên SQLite THẬT dựng từ migrations/*.sql, qua D1 giả của
// khung thử (tests/audit/harness.mjs — batch bọc BEGIN/COMMIT như D1). DB trong bộ nhớ, KHÔNG chạm D1 thật. Mọi giá trị (số giấy tờ, SĐT, địa chỉ, tên) là GIẢ.
// Ẩn danh hoá là cửa một chiều: lính gác DA_THANG_XOA nằm TRONG từng câu. Luật thuần xoa-an-danh.ts chỉ để trả lời đẹp; ca (8) buộc hai bên cùng kết luận cho ảnh hết lý do giữ.
// Phá thử: đổi DA_THANG_XOA của MỘT câu thành `1 = 1` → (3) đỏ; đổi `>= ?H` thành `> ?H` ở vế vai → (8) "vai đóng hôm nay" đỏ; bỏ `party_id` khỏi PARTITION BY → (2) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { keHoachGop, type HoSoGop, type NgoaiGop } from "./gop.ts";
import { loGop } from "./gop-lo.ts";
import {
  anDanhStatements, datChoXoaAnhHetGiuStatement, danhDauOffsiteStatement, demXemTruocXoa, docsForMerge, ghiGiayToTuPhieuStatement, guiPhieuXoaStatement, listAnhHetLyDoGiu,
  listPersonDocuments, listPhieuChuaChepNgoai, listPhieuXoaCho, listPhieuXoaCuaHoSo, quyetPhieuStatement, quyetPhieuXoaStatement, rutPhieuTuKhaiKhiGuiXoaStatement, rutPhieuXoaStatement, tepChoXoaCuaPhieu, timPhieuXoa, tuChoiPhieuXoaStatement,
} from "./repository.ts";
import { dauSoGiayTo, DAU_TEN, lyDoXoaAnh, phanGiuLai, type LienKetXetAnh, type LyDoXoaAnh } from "./xoa-an-danh.ts";

const T = "2026-09-01T00:00:00.000Z";
const GUI = "2026-10-17T08:00:00.000Z";
const QUYET = "2026-10-17T10:00:00.000Z";
const HN = "2026-10-17";
const GUI2 = "2026-10-18T08:00:00.000Z";
const QUYET2 = "2026-10-18T10:00:00.000Z";
const HN2 = "2026-10-18";
const ID_A = "0b1e5c2a-0000-4000-8000-00000000000a"; // CCCD cũ, đã có dòng gia hạn
const ID_B = "0b1e5c2a-0000-4000-8000-00000000000b"; // CCCD hiện hành
const ID_G = "0b1e5c2a-0000-4000-8000-00000000000c"; // GPLX hiện hành
const ID_V = "0b1e5c2a-0000-4000-8000-00000000000d"; // GPLX đã huỷ
type Row = Record<string, unknown>;
const q = (d: DatabaseSync, sql: string, ...a: string[]): Row[] => d.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const n = (d: DatabaseSync, sql: string, ...a: string[]): number => Number(Object.values(q(d, sql, ...a)[0]!)[0]);
// biome-ignore lint/suspicious/noExplicitAny: D1 giả của khung thử
type D1 = any;
const chay = async (D: D1, ds: D1PreparedStatement[]): Promise<number[]> => (await D.batch(ds)).map((r: { meta: { changes: number } }) => r.meta.changes);

let dem = 0;
function nguoi(d: DatabaseSync, id: string, x: { family?: string | null; middle?: string | null; given?: string; birth?: string | null; active?: number } = {}): string {
  const given = x.given ?? `Tên ${id}`;
  d.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, ?, ?, ?)").run(id, `Họ ${given}`, x.active ?? 1, T, T);
  d.prepare("INSERT INTO pty_person (party_id, family_name, middle_name, given_name, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, x.family ?? null, x.middle ?? null, given, x.birth ?? null, T, T);
  return id;
}
function toChuc(d: DatabaseSync, id: string): string {
  d.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, T, T);
  d.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, T, T);
  return id;
}
const chinhSach = (d: DatabaseSync, id: string, version: number, days: number | null = null): void => {
  d.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, erasure_days, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Mục đích thử', 'Toàn văn thử', ?, ?, ?, 's-sup', ?, 's-sup')`).run(id, version, T, days, T, T);
};
const dongY = (d: DatabaseSync, party: string, policy: string): void => {
  d.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 'DONG_Y', ?, 'u1', ?, 'u1')")
    .run(`c-${++dem}`, party, policy, T, T);
};
function giayTo(d: DatabaseSync, id: string, party: string, x: { type?: string; num?: string | null; cls?: string | null; prev?: string | null; expiry?: string | null } = {}): void {
  const loai = x.type ?? "CCCD";
  const so = x.num === undefined ? "079000000111" : x.num;
  d.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
      previous_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, '2020-01-01', ?, ?, ?, ?, 's-1', ?, 's-1')`).run(
    id, party, loai, so, so, x.cls ?? null, so === null ? null : "Nơi cấp thử", x.expiry === undefined ? "2035-01-01" : x.expiry, x.prev ?? null, T, T);
}
function lienHe(d: DatabaseSync, id: string, party: string, kind: string, value: string, x: { chinh?: boolean; from?: string; to?: string | null } = {}): void {
  d.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Nhãn thử', ?, ?, ?, ?, ?)`).run(id, party, kind, value, value.toLowerCase(), x.chinh ? 1 : 0, x.from ?? "2026-09-01", x.to ?? null, T, T);
}
const phieuTK = (d: DatabaseSync, id: string, party: string, kind: "NGAY_SINH" | "DIA_CHI" | "GIAY_TO", x: { loai?: string; so?: string | null } = {}): void => {
  const so = x.so === undefined ? null : x.so;
  const cccd = kind === "GIAY_TO" && x.loai === "CCCD";
  d.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key, license_class_code,
      issued_date, issued_place, expiry_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'pol', ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'CHO_XAC_MINH', ?, 'u1', ?, 'u1')`).run(
    id, party, kind, kind === "NGAY_SINH" ? "1990-05-06" : null, kind === "DIA_CHI" ? "12 Đường Thử, Nha Trang" : null, kind === "GIAY_TO" ? (x.loai ?? "HEALTH_CHECK") : null,
    cccd ? (so ?? "079000000555") : null, cccd ? (so ?? "079000000555") : null, cccd ? "2020-01-01" : null, cccd ? "Nơi cấp thử" : null, cccd ? "2035-01-01" : null, T, T);
};
const chapNhanTK = (d: DatabaseSync, id: string): void => {
  d.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = 's-2', updated_at = ? WHERE id = ?").run(T, T, id);
};
const tuChoiTK = (d: DatabaseSync, id: string): void => {
  d.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_DOC_DUOC', decided_at = ?, decided_by = 's-2', updated_at = ? WHERE id = ?").run(T, T, id);
};
const rutTK = (d: DatabaseSync, id: string): void => {
  d.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 'u1', updated_at = ? WHERE id = ?").run(T, T, id);
};
const xacMinh = (d: DatabaseSync, party: string, kind: "PERSON_DOCUMENT" | "CONTACT" | "ATTRIBUTE", target: string | null, attr: string | null, outcome = "DA_XAC_MINH", at = T): void => {
  d.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, 'adm', ?, 'adm')`).run(`v-${++dem}`, party, kind, target, attr, outcome, at, at);
};
function tep(d: DatabaseSync, id: string, party: string, x: { stored?: boolean } = {}): void {
  const so = ++dem;
  d.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'jpg', 1000, ?, ?, ?, 's-1', ?, 's-1')`).run(id, party, `pty/${so.toString(16).padStart(32, "0")}`, "a".repeat(64), x.stored === false ? null : T, T, T);
}
const noiTep = (d: DatabaseSync, tepId: string, kind: string, target: string): void => {
  d.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 's-1', ?, 's-1')").run(tepId, kind, target, T, T);
};
const vai = (d: DatabaseSync, id: string, party: string, to: string | null): void => {
  d.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, 'CUSTOMER', NULL, '2026-01-01', ?, ?, ?)")
    .run(id, party, to, T, T);
};

/** Chạy đúng câu SQL của bất biến trong scripts/audit-checks.mjs (import mảng kiểm, không chép câu). */
function kiemBatBien(d: DatabaseSync, ma: string): number {
  const c = (CHECKS as { code: string; sql: string }[]).find((x) => x.code === ma);
  assert.ok(c, `thiếu bất biến ${ma}`);
  return Number(Object.values(d.prepare(c.sql).get() as Row)[0]);
}

/** Hồ sơ đầy đủ của P: tên, ngày sinh; CCCD cũ (đã gia hạn) + CCCD hiện hành + GPLX hiện hành + GPLX đã huỷ; liên hệ PHONE mở / EMAIL đã đóng / ADDRESS mở; bốn phiếu tự khai
 *  (chấp nhận NGAY_SINH, từ chối DIA_CHI, rút GIAY_TO, còn chờ GIAY_TO sức khoẻ); xác minh DA_XAC_MINH cho CCCD hiện hành và NGAY_SINH; hai tệp (một nối CCCD, một tải dở). */
function hoSoDay(): { d: DatabaseSync; D: D1 } {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "P", { family: "Nguyễn", middle: "Văn", given: "An", birth: "1990-05-06" });
  chinhSach(d, "pol", 1);
  dongY(d, "P", "pol");
  giayTo(d, ID_A, "P");
  giayTo(d, ID_B, "P", { prev: ID_A });
  giayTo(d, ID_G, "P", { type: "GPLX", num: "790000000222", cls: "B" });
  giayTo(d, ID_V, "P", { type: "GPLX", num: "790000000333", cls: "B" });
  d.prepare("UPDATE pty_person_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(T, T, ID_V);
  lienHe(d, "lh1", "P", "PHONE", "0912000111", { chinh: true });
  lienHe(d, "lh2", "P", "EMAIL", "an@thu.vn", { to: "2026-09-20" });
  lienHe(d, "lh3", "P", "ADDRESS", "12 Đường Thử, Nha Trang");
  phieuTK(d, "tk1", "P", "NGAY_SINH");
  phieuTK(d, "tk2", "P", "DIA_CHI");
  phieuTK(d, "tk3", "P", "GIAY_TO", { loai: "CCCD", so: "079000000555" });
  phieuTK(d, "tk4", "P", "GIAY_TO", { loai: "HEALTH_CHECK" });
  chapNhanTK(d, "tk1");
  tuChoiTK(d, "tk2");
  rutTK(d, "tk3");
  xacMinh(d, "P", "PERSON_DOCUMENT", ID_B, null);
  xacMinh(d, "P", "ATTRIBUTE", null, "NGAY_SINH");
  tep(d, "t1", "P");
  noiTep(d, "t1", "PERSON_DOCUMENT", ID_B);
  tep(d, "t2", "P", { stored: false });
  return { d, D };
}
/** Gửi phiếu xoá `id` của hồ sơ `party` bởi `u1` (không rút phiếu tự khai — để câu lưới của lô thực hiện có việc làm). */
const guiXoa = async (D: D1, id: string, party = "P", at = GUI): Promise<void> => {
  await chay(D, [guiPhieuXoaStatement(D, { id, partyId: party, actorId: "u1", at })]);
};
/** Lô thực hiện: câu QUYẾT rồi tám câu ẩn danh — `actorId` / `at` của hai bên bằng nhau (lính gác so). */
const loThucHien = (D: D1, o: { id: string; party?: string; actor?: string; at?: string; homNay?: string; giuTen?: boolean; coTaiKhoan?: boolean }): D1PreparedStatement[] => {
  const actorId = o.actor ?? "adm", at = o.at ?? QUYET, giu = o.giuTen ?? false;
  return [
    quyetPhieuXoaStatement(D, { id: o.id, actorId, at, giuTen: giu, phanGiuLai: phanGiuLai({ giuTen: giu, coTaiKhoan: o.coTaiKhoan ?? false }).join(",") }),
    ...anDanhStatements(D, { id: o.id, partyId: o.party ?? "P", actorId, at, homNay: o.homNay ?? HN }),
  ];
};
const BANG_CHAM = ["pty_person_document", "pty_contact_point", "pty_self_submission", "pty_verification", "pty_attachment", "pty_attachment_link", "pty_person", "pty_party", "pty_erasure_request"];
const chup = (d: DatabaseSync): Record<string, Row[]> => Object.fromEntries(BANG_CHAM.map((t) => [t, q(d, `SELECT * FROM ${t} ORDER BY rowid`)]));
const DEM_BANG = ["pty_person_document", "pty_contact_point", "pty_self_submission", "pty_attachment", "pty_attachment_link", "pty_person", "pty_party"];
const demHang = (d: DatabaseSync): Record<string, number> => Object.fromEntries(DEM_BANG.map((t) => [t, n(d, `SELECT count(*) FROM ${t}`)]));

test("(1) lô thực hiện đầy đủ: mọi giá trị đúng dấu, dòng nghiệp vụ còn đủ, hai dòng xác minh lại, hai tệp quyết xoá, R-PTY-17 và R-PTY-18 = 0", async () => {
  const { d, D } = hoSoDay();
  await guiXoa(D, "px");
  const truoc = demHang(d);
  const nVerTruoc = n(d, "SELECT count(*) FROM pty_verification");
  // phiếu đã quyết mà chưa ẩn danh ⇒ R-PTY-18 đỏ (bài canh không rỗng)
  const kq = await chay(D, loThucHien(D, { id: "px" }));
  assert.equal(kq[0], 1, "câu quyết thắng");
  assert.equal(kq[1], 1, "lưới rút phiếu tự khai còn chờ: phiếu tk4 còn chờ vì gửi không rút");
  assert.deepEqual(demHang(d), truoc, "không dòng nghiệp vụ nào bị xoá — ẩn danh là sửa tại chỗ");
  assert.equal(n(d, "SELECT status = 'DA_THUC_HIEN' FROM pty_erasure_request WHERE id = 'px'"), 1);
  for (const id of [ID_A, ID_B, ID_G, ID_V]) {
    const r = q(d, "SELECT erased_at, document_number, number_key, issued_place, expiry_date, voided_at FROM pty_person_document WHERE id = ?", id)[0]!;
    assert.equal(r.erased_at, QUYET, id);
    assert.equal(r.document_number, dauSoGiayTo(id));
    assert.equal(r.number_key, dauSoGiayTo(id));
    assert.equal(r.issued_place, null);
  }
  assert.equal(q(d, "SELECT voided_at FROM pty_person_document WHERE id = ?", ID_V)[0]!.voided_at, T, "ngày huỷ không đổi");
  for (const id of ["lh1", "lh2", "lh3"]) {
    const r = q(d, "SELECT value, value_normalized, label, is_primary, valid_to_date FROM pty_contact_point WHERE id = ?", id)[0]!;
    assert.deepEqual({ ...r, valid_to_date: r.valid_to_date !== null }, { value: "Đã xoá", value_normalized: "XOA", label: null, is_primary: 0, valid_to_date: true }, id);
  }
  assert.equal(q(d, "SELECT valid_to_date v FROM pty_contact_point WHERE id = 'lh1'")[0]!.v, HN, "liên hệ đang mở đóng đúng hôm nay");
  assert.equal(q(d, "SELECT valid_to_date v FROM pty_contact_point WHERE id = 'lh2'")[0]!.v, "2026-09-20", "liên hệ đã đóng giữ ngày đóng cũ");
  assert.deepEqual(q(d, "SELECT birth_date b, family_name f, middle_name m, given_name g FROM pty_person WHERE party_id = 'P'")[0], { b: null, f: null, m: null, g: DAU_TEN });
  assert.equal(q(d, "SELECT display_name v FROM pty_party WHERE id = 'P'")[0]!.v, DAU_TEN);
  const tk = (id: string) => q(d, "SELECT status, erased_at, birth_date, address_value, document_number, number_key, issued_place, decided_by FROM pty_self_submission WHERE id = ?", id)[0]!;
  assert.deepEqual(tk("tk1"), { status: "DA_CHAP_NHAN", erased_at: QUYET, birth_date: "1900-01-01", address_value: null, document_number: null, number_key: null, issued_place: null, decided_by: "s-2" });
  assert.deepEqual(tk("tk2"), { status: "TU_CHOI", erased_at: QUYET, birth_date: null, address_value: "Đã xoá", document_number: null, number_key: null, issued_place: null, decided_by: "s-2" });
  assert.deepEqual(tk("tk3"), { status: "RUT", erased_at: QUYET, birth_date: null, address_value: null, document_number: dauSoGiayTo("tk3"), number_key: dauSoGiayTo("tk3"), issued_place: null, decided_by: "u1" });
  assert.deepEqual(tk("tk4"), { status: "RUT", erased_at: QUYET, birth_date: null, address_value: null, document_number: null, number_key: null, issued_place: null, decided_by: "adm" });
  // hai dòng xác minh lại — CCCD hiện hành và NGAY_SINH; người tạo = người thực hiện; chỉ-thêm (dòng cũ còn nguyên)
  const moi = q(d, "SELECT party_id, target_kind, target_id, attribute_code, verifier_touched_account, created_by, created_at FROM pty_verification WHERE outcome = 'CAN_XAC_MINH_LAI' ORDER BY target_kind");
  assert.deepEqual(moi, [
    { party_id: "P", target_kind: "ATTRIBUTE", target_id: null, attribute_code: "NGAY_SINH", verifier_touched_account: 0, created_by: "adm", created_at: QUYET },
    { party_id: "P", target_kind: "PERSON_DOCUMENT", target_id: ID_B, attribute_code: null, verifier_touched_account: 0, created_by: "adm", created_at: QUYET },
  ]);
  assert.equal(n(d, "SELECT count(*) FROM pty_verification"), nVerTruoc + 2);
  for (const t of ["t1", "t2"]) {
    assert.deepEqual(q(d, "SELECT purged_at, purge_reason, content_hash FROM pty_attachment WHERE id = ?", t)[0], { purged_at: QUYET, purge_reason: "PHIEU_XOA", content_hash: null }, t);
  }
  assert.equal(kiemBatBien(d, "R-PTY-17"), 0);
  assert.equal(kiemBatBien(d, "R-PTY-18"), 0);
});

test("(1b) bài canh không rỗng: chỉ câu quyết (không ẩn danh) ⇒ R-PTY-18 đỏ (còn dữ liệu chưa ẩn danh); R-PTY-17 vẫn 0 (chưa dòng nào mang cờ ẩn danh)", async () => {
  const { d, D } = hoSoDay();
  await guiXoa(D, "px");
  await chay(D, [quyetPhieuXoaStatement(D, { id: "px", actorId: "adm", at: QUYET, giuTen: false, phanGiuLai: "SO_TIEN" })]);
  assert.ok(kiemBatBien(d, "R-PTY-18") >= 1);
  assert.equal(kiemBatBien(d, "R-PTY-17"), 0);
});

test("(2) Review Focus 4: hồ sơ phụ Q đã gộp vào P — giấy tờ ĐÃ HUỶ, liên hệ ĐÃ ĐÓNG, ảnh của Q bị ẩn danh / quyết xoá; NGAY_SINH đã xác minh của CẢ P lẫn Q ⇒ hai dòng xác minh lại", async () => {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "P", { given: "An", birth: "1990-05-06" });
  nguoi(d, "Q", { given: "Bình", birth: "1991-01-02" });
  chinhSach(d, "pol", 1);
  dongY(d, "P", "pol");
  giayTo(d, ID_A, "Q");
  lienHe(d, "cq", "Q", "PHONE", "0912000999", { chinh: true });
  tep(d, "tq1", "Q");
  noiTep(d, "tq1", "PERSON_DOCUMENT", ID_A);
  tep(d, "tq2", "Q");
  xacMinh(d, "P", "ATTRIBUTE", null, "NGAY_SINH");
  xacMinh(d, "Q", "ATTRIBUTE", null, "NGAY_SINH");
  // lô gộp THẬT (gop-lo.ts): Q gộp vào P — dòng giấy tờ của Q bị huỷ (vẫn chứa số thật), liên hệ của Q đóng (vẫn chứa SĐT thật)
  const RANH: NgoaiGop = { phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0, donLechTien: [] };
  const hs = (id: string, x: Partial<HoSoGop> = {}): HoSoGop => ({
    id, kind: "PERSON", displayName: id, active: true, mergedIntoId: null, laCongTyChu: false, coTaiKhoan: false, coHoSoTroVao: false, nhanDoiTac: false, noiBo: false,
    lienHe: [], congViec: [], quanHe: [], giayTo: [], ...x,
  });
  const du = await docsForMerge(D, "Q");
  const a = hs("Q", {
    lienHe: [{ id: "cq", kind: "PHONE", value: "0912000999", valueNormalized: "0912000999", label: null, isPrimary: true, validFrom: "2026-09-01", validTo: null }],
    giayTo: du.map((x) => ({ id: x.id, typeCode: x.document_type_code, typeName: x.type_name, className: x.class_name, previousId: x.previous_id, voided: x.voided_at !== null, current: x.is_current === 1 })),
  });
  const lo = loGop(D, { a: "Q", b: "P", ke: keHoachGop(a, hs("P"), RANH, HN), giayToDu: new Map(du.map((x) => [x.id, x])), tepTheoGiayTo: new Map(), homNay: HN, at: "2026-10-10T00:00:00.000Z", actorId: "s-test" });
  await D.batch([...lo.truocDon, lo.lat]);
  assert.equal(q(d, "SELECT merged_into_id m FROM pty_party WHERE id = 'Q'")[0]!.m, "P", "đã gộp thật");
  assert.ok(q(d, "SELECT voided_at v FROM pty_person_document WHERE id = ?", ID_A)[0]!.v !== null, "giấy tờ của Q đã huỷ");
  assert.equal(q(d, "SELECT value v FROM pty_contact_point WHERE id = 'cq'")[0]!.v, "0912000999", "liên hệ của Q đã đóng nhưng còn SĐT thật");
  await guiXoa(D, "px", "P", GUI);
  await chay(D, loThucHien(D, { id: "px" }));
  const r = q(d, "SELECT id, party_id, erased_at, document_number, issued_place FROM pty_person_document ORDER BY id");
  assert.ok(r.length >= 2, "Q một dòng đã huỷ + bản chép của P");
  for (const x of r) {
    assert.equal(x.erased_at, QUYET);
    assert.equal(x.document_number, dauSoGiayTo(String(x.id)));
    assert.equal(x.issued_place, null);
  }
  assert.deepEqual(q(d, "SELECT value, value_normalized, valid_to_date IS NOT NULL AS dong FROM pty_contact_point WHERE party_id = 'Q'"), [{ value: "Đã xoá", value_normalized: "XOA", dong: 1 }]);
  assert.deepEqual(q(d, "SELECT id, purged_at, purge_reason FROM pty_attachment WHERE party_id = 'Q' ORDER BY id"), [
    { id: "tq1", purged_at: QUYET, purge_reason: "PHIEU_XOA" }, { id: "tq2", purged_at: QUYET, purge_reason: "PHIEU_XOA" },
  ]);
  assert.deepEqual(q(d, "SELECT given_name g, birth_date b FROM pty_person WHERE party_id = 'Q'"), [{ g: DAU_TEN, b: null }], "tên và ngày sinh của hồ sơ phụ cũng ẩn danh");
  // PARTITION BY phải có party_id đứng đầu: đích ATTRIBUTE target_id rỗng — thiếu thì chỉ một trong hai hồ sơ được đánh dấu
  assert.deepEqual(q(d, "SELECT party_id FROM pty_verification WHERE outcome = 'CAN_XAC_MINH_LAI' AND attribute_code = 'NGAY_SINH' ORDER BY party_id"), [{ party_id: "P" }, { party_id: "Q" }]);
  assert.equal(kiemBatBien(d, "R-PTY-17"), 0);
  assert.equal(kiemBatBien(d, "R-PTY-18"), 0);
});

test("(3) Review Focus 2: câu quyết THUA ⇒ mọi câu ẩn danh changes = 0, dữ liệu nguyên vẹn, không dòng nhật ký party_erased", async () => {
  const dichNhatKy = (D: D1): D1PreparedStatement =>
    // hình dạng của dòng nhật ký route: chỉ ghi khi câu quyết liền trước thắng (changes() > 0) — đây là kiểm CHÍNH cơ chế changes() của câu quyết
    D.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
      SELECT 'nk-' || hex(randomblob(4)), NULL, 'adm', 'party_erased', 'party', 'P', NULL, ? WHERE changes() > 0`).bind(QUYET);
  // (a) người dùng rút TRƯỚC khi Quản trị bấm
  {
    const { d, D } = hoSoDay();
    await guiXoa(D, "px");
    assert.deepEqual(await chay(D, [rutPhieuXoaStatement(D, { id: "px", actorId: "u1", at: "2026-10-17T09:00:00.000Z" })]), [1]);
    const truoc = chup(d);
    const [quyet, ...an] = loThucHien(D, { id: "px" });
    const kq = await chay(D, [quyet!, dichNhatKy(D), ...an]);
    assert.equal(kq[0], 0, "câu quyết thua");
    assert.equal(kq[1], 0, "không dòng nhật ký");
    assert.deepEqual(kq.slice(2), [0, 0, 0, 0, 0, 0, 0, 0], "tám câu ẩn danh: 0 dòng");
    assert.deepEqual(chup(d), truoc, "dữ liệu nguyên vẹn");
    assert.equal(n(d, "SELECT count(*) FROM audit_log WHERE action = 'party_erased'"), 0);
  }
  // (b) người khác đã thực hiện trước — lô thứ hai (người khác, lúc khác) không đổi gì
  {
    const { d, D } = hoSoDay();
    await guiXoa(D, "px");
    await chay(D, loThucHien(D, { id: "px", actor: "adm", at: QUYET }));
    const truoc = chup(d);
    const [quyet, ...an] = loThucHien(D, { id: "px", actor: "adm2", at: QUYET2, homNay: HN2 });
    const kq = await chay(D, [quyet!, dichNhatKy(D), ...an]);
    assert.equal(kq[0], 0);
    assert.equal(kq[1], 0);
    assert.deepEqual(kq.slice(2), [0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(chup(d), truoc);
  }
  // (c) Từ chối thắng trước ⇒ câu quyết thua
  {
    const { d, D } = hoSoDay();
    await guiXoa(D, "px");
    await chay(D, [tuChoiPhieuXoaStatement(D, { id: "px", actorId: "adm", at: "2026-10-17T09:00:00.000Z", lyDo: "CAN_GIU_THEO_LUAT" })]);
    const truoc = chup(d);
    const kq = await chay(D, loThucHien(D, { id: "px", actor: "adm2" }));
    assert.deepEqual(kq, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(chup(d), truoc);
  }
  // (d) người gửi không tự quyết phiếu của mình (câu quyết loại created_by = người quyết)
  {
    const { d, D } = hoSoDay();
    await guiXoa(D, "px");
    const truoc = chup(d);
    const kq = await chay(D, loThucHien(D, { id: "px", actor: "u1" }));
    assert.deepEqual(kq, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(chup(d), truoc);
  }
});

test("(4) lần thực hiện thứ hai (phiếu mới, dữ liệu mới khai sau) chỉ ẩn danh dòng chưa ẩn danh; dòng đã ẩn danh không đổi", async () => {
  const { d, D } = hoSoDay();
  await guiXoa(D, "px1");
  await chay(D, loThucHien(D, { id: "px1" }));
  const cu = {
    gt: q(d, "SELECT * FROM pty_person_document ORDER BY id"),
    lh: q(d, "SELECT * FROM pty_contact_point ORDER BY id"),
    tk: q(d, "SELECT * FROM pty_self_submission ORDER BY id"),
    tep: q(d, "SELECT * FROM pty_attachment ORDER BY id"),
  };
  // dữ liệu MỚI khai sau khi phiếu 1 xong (phiếu 1 không còn chờ nên được khai tiếp)
  giayTo(d, "0b1e5c2a-0000-4000-8000-0000000000ee", "P", { type: "GPLX", num: "790000000999", cls: "D1" });
  lienHe(d, "lh9", "P", "PHONE", "0933000777", { chinh: true, from: "2026-10-17" });
  phieuTK(d, "tk9", "P", "DIA_CHI");
  tep(d, "t9", "P");
  await guiXoa(D, "px2", "P", GUI2);
  const kq = await chay(D, loThucHien(D, { id: "px2", at: QUYET2, homNay: HN2 }));
  assert.equal(kq[0], 1);
  const giu = <T extends Row>(truoc: T[], sau: T[], cot = "id") => {
    for (const x of truoc) assert.deepEqual(sau.find((y) => y[cot] === x[cot]), x, `dòng cũ ${String(x[cot])} phải nguyên vẹn`);
  };
  giu(cu.gt, q(d, "SELECT * FROM pty_person_document ORDER BY id"));
  giu(cu.lh, q(d, "SELECT * FROM pty_contact_point ORDER BY id"));
  giu(cu.tk, q(d, "SELECT * FROM pty_self_submission ORDER BY id"));
  giu(cu.tep, q(d, "SELECT * FROM pty_attachment ORDER BY id"));
  assert.deepEqual(q(d, "SELECT erased_at, document_number FROM pty_person_document WHERE id = '0b1e5c2a-0000-4000-8000-0000000000ee'"),
    [{ erased_at: QUYET2, document_number: dauSoGiayTo("0b1e5c2a-0000-4000-8000-0000000000ee") }]);
  assert.deepEqual(q(d, "SELECT value, valid_to_date v FROM pty_contact_point WHERE id = 'lh9'"), [{ value: "Đã xoá", v: HN2 }]);
  assert.deepEqual(q(d, "SELECT status, erased_at, address_value FROM pty_self_submission WHERE id = 'tk9'"), [{ status: "RUT", erased_at: QUYET2, address_value: "Đã xoá" }]);
  assert.deepEqual(q(d, "SELECT purged_at FROM pty_attachment WHERE id = 't9'"), [{ purged_at: QUYET2 }]);
  assert.equal(kiemBatBien(d, "R-PTY-17"), 0);
  assert.equal(kiemBatBien(d, "R-PTY-18"), 0);
});

test("(5) name_kept = 1 ⇒ tên giữ; name_kept = 0 ⇒ given_name và display_name = dấu, họ / tên đệm rỗng", async () => {
  for (const giu of [true, false]) {
    const { d, D } = hoSoDay();
    await guiXoa(D, "px");
    await chay(D, loThucHien(D, { id: "px", giuTen: giu }));
    const p = q(d, "SELECT family_name f, middle_name m, given_name g, birth_date b FROM pty_person WHERE party_id = 'P'")[0]!;
    const hs = q(d, "SELECT display_name v FROM pty_party WHERE id = 'P'")[0]!;
    if (giu) {
      assert.deepEqual(p, { f: "Nguyễn", m: "Văn", g: "An", b: null }, "giữ tên nhưng ngày sinh vẫn xoá");
      assert.equal(hs.v, "Họ An");
    } else {
      assert.deepEqual(p, { f: null, m: null, g: DAU_TEN, b: null });
      assert.equal(hs.v, DAU_TEN);
    }
    assert.deepEqual(q(d, "SELECT name_kept k, retained_codes c FROM pty_erasure_request WHERE id = 'px'")[0], { k: giu ? 1 : 0, c: phanGiuLai({ giuTen: giu, coTaiKhoan: false }).join(",") });
  }
});

test("(6) hồ sơ không có gì để xoá (chỉ có tên) ⇒ lô vẫn chạy, phiếu DA_THUC_HIEN, không lỗi", async () => {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "Z", { given: "Chỉ tên" });
  await guiXoa(D, "pz", "Z");
  const kq = await chay(D, loThucHien(D, { id: "pz", party: "Z" }));
  assert.equal(kq[0], 1);
  assert.deepEqual(kq.slice(1, 5), [0, 0, 0, 0], "không phiếu tự khai, không xác minh, không giấy tờ, không liên hệ");
  assert.equal(q(d, "SELECT status s FROM pty_erasure_request WHERE id = 'pz'")[0]!.s, "DA_THUC_HIEN");
  assert.equal(q(d, "SELECT given_name g FROM pty_person WHERE party_id = 'Z'")[0]!.g, DAU_TEN);
  assert.equal(kiemBatBien(d, "R-PTY-18"), 0);
});

test("(7) gửi phiếu: INSERT … SELECT chụp chính sách — chưa có chính sách ⇒ policy_id, due_at rỗng; chính sách chưa có số ⇒ due_at rỗng; có số (7) ⇒ created_at + 7 ngày", async () => {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "A1"); nguoi(d, "A2"); nguoi(d, "A3");
  assert.deepEqual(await chay(D, [guiPhieuXoaStatement(D, { id: "p1", partyId: "A1", actorId: "A1", at: GUI })]), [1]);
  assert.deepEqual(q(d, "SELECT policy_id, due_at, status, created_by FROM pty_erasure_request WHERE id = 'p1'"), [{ policy_id: null, due_at: null, status: "CHO_XU_LY", created_by: "A1" }]);
  chinhSach(d, "pol1", 1, null);
  await chay(D, [guiPhieuXoaStatement(D, { id: "p2", partyId: "A2", actorId: "A2", at: GUI })]);
  assert.deepEqual(q(d, "SELECT policy_id, due_at FROM pty_erasure_request WHERE id = 'p2'"), [{ policy_id: "pol1", due_at: null }]);
  d.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, erasure_days, created_at, created_by, updated_at, updated_by)
    VALUES ('pol2', 2, 'Mục đích', 'Toàn văn', ?, 7, ?, 's-sup', ?, 's-sup')`).run(T, T, T);
  await chay(D, [guiPhieuXoaStatement(D, { id: "p3", partyId: "A3", actorId: "A3", at: GUI })]);
  assert.deepEqual(q(d, "SELECT policy_id, due_at FROM pty_erasure_request WHERE id = 'p3'"), [{ policy_id: "pol2", due_at: "2026-10-24T08:00:00.000Z" }]);
  // một hồ sơ chỉ MỘT phiếu đang chờ: lần gửi thứ hai hỏng cả lô
  await assert.rejects(D.batch([guiPhieuXoaStatement(D, { id: "p4", partyId: "A3", actorId: "A3", at: GUI })]));
  // hồ sơ tổ chức không gửi được
  toChuc(d, "O1");
  await assert.rejects(D.batch([guiPhieuXoaStatement(D, { id: "p5", partyId: "O1", actorId: "A3", at: GUI })]));
});

test("(7b) phiếu tự khai đang chờ được RUT cùng lô với lúc gửi, decided_by = người gửi; lính gác = phiếu xoá vừa chèn; sau đó không gửi phiếu tự khai mới được", async () => {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "A1");
  chinhSach(d, "pol", 1);
  dongY(d, "A1", "pol");
  phieuTK(d, "k1", "A1", "NGAY_SINH");
  phieuTK(d, "k2", "A1", "DIA_CHI");
  // lính gác: phiếu xoá CHƯA có (mã không tồn tại) ⇒ 0 dòng, phiếu tự khai nguyên
  assert.deepEqual(await chay(D, [rutPhieuTuKhaiKhiGuiXoaStatement(D, { phieuXoaId: "khong-co", partyId: "A1", actorId: "A1", at: GUI })]), [0]);
  assert.deepEqual(q(d, "SELECT status FROM pty_self_submission ORDER BY id"), [{ status: "CHO_XAC_MINH" }, { status: "CHO_XAC_MINH" }]);
  const kq = await chay(D, [guiPhieuXoaStatement(D, { id: "px", partyId: "A1", actorId: "A1", at: GUI }), rutPhieuTuKhaiKhiGuiXoaStatement(D, { phieuXoaId: "px", partyId: "A1", actorId: "A1", at: GUI })]);
  assert.deepEqual(kq, [1, 2]);
  assert.deepEqual(q(d, "SELECT status, decided_by, decided_at FROM pty_self_submission ORDER BY id"), [
    { status: "RUT", decided_by: "A1", decided_at: GUI }, { status: "RUT", decided_by: "A1", decided_at: GUI },
  ]);
  assert.throws(() => phieuTK(d, "k3", "A1", "NGAY_SINH"), /self_submission_erasure_open/);
});

// ---- (8) Hình chiếu ảnh hết lý do giữ — CÙNG bảng ca với luật thuần lyDoXoaAnh -----------------------------------------------------------------------------------------------
interface CaAnh {
  ten: string;
  mong: LyDoXoaAnh | null; // null = KHÔNG hiện (còn lý do giữ)
  loai?: "NGUOI" | "TO_CHUC" | "PHIEU" | "KHONG";
  han?: string | null; huy?: boolean; anDanh?: boolean; giaHan?: boolean;
  vai?: "mo" | "dong_hom_qua" | "dong_hom_nay";
  nguoiNgung?: boolean;
  phieu?: "CHO_XAC_MINH" | "TU_CHOI" | "RUT";
}
const CAC_CA: CaAnh[] = [
  { ten: "giấy tờ còn hạn + vai mở", mong: null },
  { ten: "hết hạn", mong: "HET_HAN", han: "2026-10-16" },
  { ten: "đúng ngày hết hạn vẫn giữ", mong: null, han: HN },
  { ten: "đã gia hạn thay", mong: "DA_GIA_HAN", giaHan: true },
  { ten: "đã huỷ", mong: "DA_HUY", huy: true },
  { ten: "mọi vai đóng (hôm qua)", mong: "HET_QUAN_HE", vai: "dong_hom_qua" },
  { ten: "vai đóng hôm nay vẫn giữ", mong: null, vai: "dong_hom_nay" },
  { ten: "tài khoản ngưng nhưng vai mở", mong: null, nguoiNgung: true },
  { ten: "giấy tờ không hạn + vai mở", mong: null, han: null },
  { ten: "đã ẩn danh", mong: "DA_AN_DANH", anDanh: true },
  { ten: "hết hạn và hết vai: HET_QUAN_HE đứng trước", mong: "HET_QUAN_HE", han: "2020-01-01", vai: "dong_hom_qua" },
  { ten: "phiếu tự khai đang chờ", mong: null, loai: "PHIEU", phieu: "CHO_XAC_MINH" },
  { ten: "phiếu tự khai đã từ chối", mong: "PHIEU_DA_XU_LY", loai: "PHIEU", phieu: "TU_CHOI" },
  { ten: "phiếu tự khai đã rút", mong: "PHIEU_DA_XU_LY", loai: "PHIEU", phieu: "RUT" },
  { ten: "giấy tờ tổ chức còn hạn + vai mở", mong: null, loai: "TO_CHUC", han: "2030-01-01" },
  { ten: "giấy tờ tổ chức hết hạn", mong: "HET_HAN", loai: "TO_CHUC", han: "2026-10-16" },
  { ten: "giấy tờ tổ chức hết vai", mong: "HET_QUAN_HE", loai: "TO_CHUC", han: "2030-01-01", vai: "dong_hom_qua" },
  { ten: "tệp không nối đâu", mong: "KHONG_NOI", loai: "KHONG" },
];

test("(8) hình chiếu ảnh hết lý do giữ: mỗi ca khớp luật thuần lyDoXoaAnh và lời mong; tệp đã quyết xoá / chưa lưu xong không hiện", async () => {
  const d = openDb();
  const D = fakeD1(d);
  chinhSach(d, "pol", 1);
  d.exec("DROP TRIGGER pty_attachment_link_kind_ins"); // mở loại nối SELF_SUBMISSION trong DB THỬ (production còn đóng — BL-TK-ANH)
  const tepCuaCa = new Map<string, number>();
  CAC_CA.forEach((ca, i) => {
    const so = i + 1;
    const loai = ca.loai ?? "NGUOI";
    const ho = loai === "TO_CHUC" ? toChuc(d, `h${so}`) : nguoi(d, `h${so}`, { active: ca.nguoiNgung ? 0 : 1 });
    const vaiTo = ca.vai === "dong_hom_qua" ? "2026-10-16" : ca.vai === "dong_hom_nay" ? HN : null;
    if (loai !== "KHONG" && loai !== "PHIEU") vai(d, `r${so}`, ho, vaiTo);
    const tepId = `t${so}`;
    tep(d, tepId, ho);
    const han = ca.han === undefined ? "2035-01-01" : ca.han;
    if (loai === "NGUOI") {
      giayTo(d, `d${so}`, ho, { type: "HEALTH_CHECK", num: null, expiry: han });
      noiTep(d, tepId, "PERSON_DOCUMENT", `d${so}`);
      if (ca.giaHan) giayTo(d, `d${so}-moi`, ho, { type: "HEALTH_CHECK", num: null, expiry: "2040-01-01", prev: `d${so}` });
      if (ca.huy) d.prepare("UPDATE pty_person_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(T, T, `d${so}`);
      if (ca.anDanh) d.prepare("UPDATE pty_person_document SET erased_at = ?, updated_at = ? WHERE id = ?").run(T, T, `d${so}`);
    } else if (loai === "TO_CHUC") {
      d.prepare(`INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, expiry_date, created_at, updated_at)
        VALUES (?, ?, 'TRANSPORT', NULL, NULL, ?, ?, ?)`).run(`d${so}`, ho, han, T, T);
      noiTep(d, tepId, "ORG_DOCUMENT", `d${so}`);
    } else if (loai === "PHIEU") {
      dongY(d, ho, "pol");
      phieuTK(d, `k${so}`, ho, "NGAY_SINH");
      if (ca.phieu === "TU_CHOI") tuChoiTK(d, `k${so}`);
      if (ca.phieu === "RUT") rutTK(d, `k${so}`);
      noiTep(d, tepId, "SELF_SUBMISSION", `k${so}`);
    }
    tepCuaCa.set(tepId, i);
  });
  // tệp KHÔNG được hiện: đã quyết xoá; chưa lưu xong
  tep(d, "t-da-xoa", "h1");
  d.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA', content_hash = NULL, updated_at = ? WHERE id = 't-da-xoa'").run(T, T);
  tep(d, "t-tai-do", "h1", { stored: false });
  const hien = new Map((await listAnhHetLyDoGiu(D, HN)).map((r) => [r.id, r.ly_do]));
  assert.ok(!hien.has("t-da-xoa") && !hien.has("t-tai-do"));
  for (const [tepId, i] of tepCuaCa) {
    const ca = CAC_CA[i]!;
    assert.equal(hien.get(tepId) ?? null, ca.mong, `SQL — ${ca.ten}`);
    const loai = ca.loai ?? "NGUOI";
    const coVaiMo = ca.vai !== "dong_hom_qua";
    const han = ca.han === undefined ? "2035-01-01" : ca.han;
    const lienKet: LienKetXetAnh[] = loai === "KHONG" ? []
      : loai === "PHIEU" ? [{ loai: "SELF_SUBMISSION", trangThaiPhieu: ca.phieu! }]
        : [{ loai: loai === "TO_CHUC" ? "ORG_DOCUMENT" : "PERSON_DOCUMENT", daHuy: ca.huy === true, daAnDanh: ca.anDanh === true, daGiaHan: ca.giaHan === true, hetHanNgay: han, coVaiMo }];
    assert.equal(lyDoXoaAnh(lienKet, HN), ca.mong, `luật thuần — ${ca.ten}`);
  }
  assert.equal(hien.size, CAC_CA.filter((c) => c.mong !== null).length);
});

test("(9) lính gác xoá ảnh: tệp đã có lại lý do giữ giữa lúc đọc danh sách và lúc bấm ⇒ changes = 0; tệp vẫn hết lý do giữ ⇒ quyết xoá đúng mã", async () => {
  const d = openDb();
  const D = fakeD1(d);
  nguoi(d, "P1");
  vai(d, "r1", "P1", null);
  giayTo(d, "dh1", "P1", { type: "HEALTH_CHECK", num: null, expiry: "2026-10-16" }); // hết hạn
  tep(d, "ta", "P1"); noiTep(d, "ta", "PERSON_DOCUMENT", "dh1");
  tep(d, "tb", "P1"); noiTep(d, "tb", "PERSON_DOCUMENT", "dh1");
  const ds = await listAnhHetLyDoGiu(D, HN);
  assert.deepEqual(ds.map((r) => [r.id, r.ly_do]), [["ta", "HET_HAN"], ["tb", "HET_HAN"]]);
  // giữa lúc đọc và lúc bấm: ta được nối thêm sang giấy tờ còn hạn
  giayTo(d, "dh2", "P1", { type: "HEALTH_CHECK", num: null, expiry: "2040-01-01" });
  noiTep(d, "ta", "PERSON_DOCUMENT", "dh2");
  const kq = await chay(D, [
    datChoXoaAnhHetGiuStatement(D, { tepId: "ta", actorId: "adm", at: QUYET, homNay: HN }),
    datChoXoaAnhHetGiuStatement(D, { tepId: "tb", actorId: "adm", at: QUYET, homNay: HN }),
  ]);
  assert.deepEqual(kq, [0, 1]);
  assert.deepEqual(q(d, "SELECT id, purged_at, purge_reason, content_hash FROM pty_attachment ORDER BY id"), [
    { id: "ta", purged_at: null, purge_reason: null, content_hash: "a".repeat(64) },
    { id: "tb", purged_at: QUYET, purge_reason: "HET_LY_DO_GIU", content_hash: null },
  ]);
  // bấm lại: đã quyết xoá rồi ⇒ 0
  assert.deepEqual(await chay(D, [datChoXoaAnhHetGiuStatement(D, { tepId: "tb", actorId: "adm", at: "2026-10-17T11:00:00.000Z", homNay: HN })]), [0]);
});

test("(11) dòng đã ẩn danh KHÔNG còn là 'hiện hành': không nằm trong danh sách hiện hành, và phiếu tự khai chấp nhận sau đó không nối vào dòng ẩn danh (không chép dấu XOA… sang dòng sống)", async () => {
  const { d, D } = hoSoDay();
  assert.deepEqual((await listPersonDocuments(D, "P", true)).map((r) => r.id).sort(), [ID_B, ID_G].sort(), "trước khi xoá: hai dòng hiện hành");
  await guiXoa(D, "px");
  await chay(D, loThucHien(D, { id: "px" }));
  assert.deepEqual(await listPersonDocuments(D, "P", true), [], "sau khi xoá: không dòng hiện hành");
  const tatCa = await listPersonDocuments(D, "P", false);
  assert.equal(tatCa.length, 4);
  assert.ok(tatCa.every((r) => r.is_current === 0));
  // người dùng khai CCCD mới sau khi xoá; Quản trị chấp nhận: dòng mới mang số thật của phiếu, KHÔNG nối previous_id vào dòng đã ẩn danh
  phieuTK(d, "tk-moi", "P", "GIAY_TO", { loai: "CCCD", so: "079000000777" });
  const t = { id: "tk-moi", actorId: "adm2", at: "2026-10-18T09:00:00.000Z" };
  const kq = await chay(D, [quyetPhieuStatement(D, { ...t, ketLuan: "DA_CHAP_NHAN", lyDo: null, laToanQuyen: true }), ghiGiayToTuPhieuStatement(D, { ...t, documentId: "gt-moi" })]);
  assert.deepEqual(kq, [1, 1]);
  assert.deepEqual(q(d, "SELECT previous_id, number_key, erased_at FROM pty_person_document WHERE id = 'gt-moi'"), [{ previous_id: null, number_key: "079000000777", erased_at: null }]);
  assert.deepEqual((await listPersonDocuments(D, "P", true)).map((r) => r.id), ["gt-moi"]);
});

test("(10) đọc: tra phiếu, hàng chờ (quá hạn lên đầu rồi cũ trước), lịch sử hồ sơ, xem trước (chỉ số đếm), tệp chờ xoá kho, bản ngoài D1", async () => {
  const { d, D } = hoSoDay();
  // hàng chờ: X1 còn hạn, X2 quá hạn (tạo sau), X3 không hạn nhưng tạo sớm nhất
  chinhSach(d, "pol-h", 2, 7);
  for (const [id, party, tao, due] of [["x1", "X1", "2026-10-10T00:00:00.000Z", "2026-10-30T00:00:00.000Z"], ["x2", "X2", "2026-10-12T00:00:00.000Z", "2026-10-15T00:00:00.000Z"], ["x3", "X3", "2026-10-05T00:00:00.000Z", null]] as const) {
    nguoi(d, party);
    d.prepare(`INSERT INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 'CHO_XU_LY', ?, 'u1', ?, 'u1')`)
      .run(id, party, due === null ? null : "pol-h", due, tao, tao);
  }
  assert.deepEqual((await listPhieuXoaCho(D, "2026-10-17T00:00:00.000Z")).map((r) => r.id), ["x2", "x3", "x1"]);
  assert.equal((await timPhieuXoa(D, "x2"))!.party_id, "X2");
  assert.equal(await timPhieuXoa(D, "khong-co"), null);
  assert.deepEqual((await listPhieuXoaCuaHoSo(D, "X1")).map((r) => r.id), ["x1"]);
  // xem trước
  assert.deepEqual(await demXemTruocXoa(D, "P"), { giayTo: 4, phieuTuKhai: 4, lienHe: 3, coNgaySinh: true, tep: 2 });
  await guiXoa(D, "px");
  await chay(D, loThucHien(D, { id: "px" }));
  assert.deepEqual(await demXemTruocXoa(D, "P"), { giayTo: 0, phieuTuKhai: 0, lienHe: 0, coNgaySinh: false, tep: 0 });
  // tệp chờ xoá kho: hai tệp đã quyết xoá, kho chưa xoá
  const cho = await tepChoXoaCuaPhieu(D, "P");
  assert.deepEqual(cho.map((r) => [r.id, r.purge_reason]), [["t1", "PHIEU_XOA"], ["t2", "PHIEU_XOA"]]);
  // bản ngoài D1
  assert.deepEqual((await listPhieuChuaChepNgoai(D)).map((r) => [r.id, r.decided_at]), [["px", QUYET]]);
  assert.deepEqual(await chay(D, [danhDauOffsiteStatement(D, { id: "px", at: "2026-10-17T10:05:00.000Z" })]), [1]);
  assert.deepEqual(await chay(D, [danhDauOffsiteStatement(D, { id: "px", at: "2026-10-17T10:06:00.000Z" })]), [0], "mốc chép bản ngoài chỉ đặt một lần");
  assert.deepEqual(await listPhieuChuaChepNgoai(D), []);
  assert.deepEqual(await chay(D, [danhDauOffsiteStatement(D, { id: "x1", at: QUYET })]), [0], "phiếu chưa thực hiện không có bản ngoài");
});
