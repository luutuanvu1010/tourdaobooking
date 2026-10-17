// Bài MỨC CÂU LỆNH của xác minh phiếu tự khai (ADR-0125; lát H-4 Gói 2, việc 2): chạy các câu của repository.ts trên SQLite THẬT dựng từ migrations/*.sql, qua D1 giả của khung thử
// (tests/audit/harness.mjs — batch bọc BEGIN/COMMIT như D1). Lính gác tách nhiệm vụ nằm TRONG câu `decide_self_submission`; luật thuần xac-minh.ts chỉ để trả lời đẹp,
// bài "cùng bảng ca" buộc hai bên cùng kết luận. Mọi giá trị (số giấy tờ, địa chỉ) là GIẢ.
// Phá thử: bỏ `NOT ${CHAM_CUA_NGUOI…}` khỏi DECIDE → (1), (3) đỏ; bỏ DA_THANG khỏi một câu phụ thuộc → (2) đỏ; '-30 days' → '-29 days' → (3), (10) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { openDb, fakeD1 } from "../../../tests/audit/harness.mjs";
import {
  chamCuaTaiKhoan, ghiDiaChiTuPhieuStatement, ghiGiayToTuPhieuStatement, ghiNgaySinhTuPhieuStatement, ghiXacMinhTuPhieuStatement, lamMoiHoSoTuPhieuStatement,
  listPhieuCho, listPhieuDaXuLy, quyetPhieuStatement, soDuCuaPhieuCho, timPhieuChoXet, trungSoHoSoKhac,
} from "./repository.ts";
import { loiLoChapNhan, moc30Ngay, xetNguoiXacMinh, type TaiKhoanTom } from "./xac-minh.ts";
import { registeredSql } from "../../shared/sql-registry.ts";

const GUI = "2026-10-17T08:00:00.000Z";
const QUYET = "2026-10-17T09:00:00.000Z";
const NAM = 365 * 86_400_000;
const lui = (iso: string, ms: number): string => new Date(Date.parse(iso) - ms).toISOString();

interface Ban { sqlite: ReturnType<typeof openDb>; d1: any }
type Loai = "NGAY_SINH" | "DIA_CHI" | "GIAY_TO";

/** DB đủ migration + 4 tài khoản (u = người khai, hr, adm, sup) + chính sách + đồng ý + MỘT phiếu chờ của u. */
function ban(loai: Loai = "NGAY_SINH", opts: { id?: string; loaiGiayTo?: "CCCD" | "HEALTH_CHECK" } = {}): Ban {
  const sqlite = openDb();
  for (const id of ["u", "hr", "adm", "sup"]) {
    sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', 'Người ${id}', 1, '${GUI}', '${GUI}')`);
    sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-${id}', 'Người ${id}', '${GUI}', '${GUI}')`);
    sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '09000000${id.length}${id.charCodeAt(0)}', 'x', 'sales', 1, '${GUI}', 'pty-${id}')`);
  }
  sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${GUI}', '${GUI}', 'sup', '${GUI}', 'sup')`);
  sqlite.exec(`INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c1', 'pty-u', 'pol', 'DONG_Y', '${GUI}', 'u', '${GUI}', 'u')`);
  themPhieu(sqlite, opts.id ?? "ph", loai, opts.loaiGiayTo);
  return { sqlite, d1: fakeD1(sqlite) };
}
function themPhieu(sqlite: Ban["sqlite"], id: string, loai: Loai, loaiGiayTo: "CCCD" | "HEALTH_CHECK" = "CCCD"): void {
  const cccd = loaiGiayTo === "CCCD";
  sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key,
      status, created_at, created_by, updated_at, updated_by) VALUES (?, 'pty-u', ?, 'pol', ?, ?, ?, ?, ?, 'CHO_XAC_MINH', ?, 'u', ?, 'u')`).run(
    id, loai, loai === "NGAY_SINH" ? "1990-05-06" : null, loai === "DIA_CHI" ? "12 Đường Thử, Nha Trang" : null,
    loai === "GIAY_TO" ? loaiGiayTo : null, loai === "GIAY_TO" && cccd ? "079 000 000 111" : null, loai === "GIAY_TO" && cccd ? "079000000111" : null, GUI, GUI);
}
function nhatKy(b: Ban, id: string, actor: string, action: string, at: string, detail: string | null = null): void {
  b.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, 'staff', 'u', ?, ?)").run(id, actor, action, detail, at);
}
const ketQuaCau = async (b: Ban, actor: string, laToanQuyen: boolean, id = "ph", ketLuan: "DA_CHAP_NHAN" | "TU_CHOI" = "DA_CHAP_NHAN", lyDo: string | null = null, at = QUYET): Promise<number> =>
  Number((await quyetPhieuStatement(b.d1, { id, ketLuan, lyDo, actorId: actor, at, laToanQuyen }).run()).meta.changes);

/** Lô chấp nhận đủ câu theo loại phiếu — thứ tự: quyết → câu ghi giá trị → làm mới hồ sơ → dòng xác minh (dòng xác minh đích trỏ dòng vừa chèn). */
function loChapNhan(b: Ban, v: { id?: string; actor: string; laToanQuyen: boolean; loai: Loai; at?: string; hau?: string }) {
  // `hau`: hậu tố mã dòng mới — lô THUA dùng mã khác lô thắng (như route thật sinh mã mới mỗi lần), để thiếu điều kiện thắng ra dòng mồ côi thay vì đụng khoá chính.
  const id = v.id ?? "ph", at = v.at ?? QUYET, actorId = v.actor, hau = v.hau ?? "";
  const t = { id, actorId, at };
  const quyet = quyetPhieuStatement(b.d1, { id, ketLuan: "DA_CHAP_NHAN", lyDo: null, actorId, at, laToanQuyen: v.laToanQuyen });
  if (v.loai === "NGAY_SINH") return [quyet, ghiNgaySinhTuPhieuStatement(b.d1, t), lamMoiHoSoTuPhieuStatement(b.d1, t),
    ghiXacMinhTuPhieuStatement(b.d1, { ...t, targetKind: "ATTRIBUTE", targetId: null, attributeCode: "NGAY_SINH" })];
  if (v.loai === "DIA_CHI") return [quyet, ghiDiaChiTuPhieuStatement(b.d1, { ...t, contactId: `lh-${id}${hau}`, valueNormalized: "12 đường thử, nha trang", today: "2026-10-17" }),
    lamMoiHoSoTuPhieuStatement(b.d1, t), ghiXacMinhTuPhieuStatement(b.d1, { ...t, targetKind: "CONTACT", targetId: `lh-${id}${hau}`, attributeCode: null })];
  return [quyet, ghiGiayToTuPhieuStatement(b.d1, { ...t, documentId: `gt-${id}${hau}` }), lamMoiHoSoTuPhieuStatement(b.d1, t),
    ghiXacMinhTuPhieuStatement(b.d1, { ...t, targetKind: "PERSON_DOCUMENT", targetId: `gt-${id}${hau}`, attributeCode: null })];
}
const dem = (b: Ban, sql: string, ...a: string[]): number => Number((b.sqlite.prepare(sql).get(...a) as { n: number }).n);
const trangThai = (b: Ban, id = "ph"): string => String((b.sqlite.prepare("SELECT status FROM pty_self_submission WHERE id = ?").get(id) as { status: string }).status);

test("(1) lính gác TRONG câu ghi: từng TAO / VINH_VIEN / CUA_SO_30 trong cửa sổ ⇒ 0 dòng; Toàn quyền (laToanQuyen) ⇒ 1 dòng; người khai ⇒ 0 dòng", async () => {
  for (const [action, at] of [["staff_created", lui(GUI, 3 * NAM)], ["pin_reset", lui(GUI, 400 * 86_400_000)], ["mfa_reset", GUI], ["login_unlocked", lui(GUI, 5 * 86_400_000)], ["staff_reactivated", lui(GUI, 5 * 86_400_000)]] as const) {
    const b = ban();
    nhatKy(b, "n1", "hr", action, at);
    assert.equal(await ketQuaCau(b, "hr", false), 0, `${action}: hr bị chặn`);
    assert.equal(trangThai(b), "CHO_XAC_MINH");
    nhatKy(b, "n2", "sup", action, at);
    assert.equal(await ketQuaCau(b, "sup", true), 1, `${action}: Toàn quyền là chốt cuối`);
  }
  const b = ban();
  assert.equal(await ketQuaCau(b, "u", true), 0, "người khai không tự quyết dù mang cờ Toàn quyền (vế a luôn áp)");
});

test("(2) Review Focus 1: hai lô chấp nhận lần lượt ⇒ lô sau 0 dòng ở MỌI câu; đúng 1 dòng xác minh, giá trị khai chép đúng", async () => {
  const b = ban();
  const lo1 = await b.d1.batch(loChapNhan(b, { actor: "hr", laToanQuyen: false, loai: "NGAY_SINH" }));
  assert.deepEqual(lo1.map((r: any) => r.meta.changes), [1, 1, 1, 1], "lô thắng ghi đủ bốn câu");
  const lo2 = await b.d1.batch(loChapNhan(b, { actor: "adm", laToanQuyen: false, loai: "NGAY_SINH", at: "2026-10-17T09:00:00.001Z" }));
  assert.deepEqual(lo2.map((r: any) => r.meta.changes), [0, 0, 0, 0], "lô thua: không câu nào ghi (không dòng mồ côi)");
  assert.equal(dem(b, "SELECT count(*) n FROM pty_verification WHERE id = 'ph'"), 1);
  assert.equal(String((b.sqlite.prepare("SELECT created_by FROM pty_verification WHERE id = 'ph'").get() as any).created_by), "hr");
  assert.equal(String((b.sqlite.prepare("SELECT birth_date FROM pty_person WHERE party_id = 'pty-u'").get() as any).birth_date), "1990-05-06");
});

test("(2b) mỗi câu phụ thuộc có điều kiện thắng riêng: dựng lô thua cho từng loại phiếu ⇒ cả bốn câu 0 dòng", async () => {
  for (const loai of ["DIA_CHI", "GIAY_TO"] as const) {
    const b = ban(loai);
    await b.d1.batch(loChapNhan(b, { actor: "hr", laToanQuyen: false, loai }));
    const thua = await b.d1.batch(loChapNhan(b, { actor: "adm", laToanQuyen: false, loai, at: "2026-10-17T09:00:00.001Z", hau: "-thua" }));
    assert.deepEqual(thua.map((r: any) => r.meta.changes), [0, 0, 0, 0], loai);
    assert.equal(dem(b, "SELECT count(*) n FROM pty_contact_point WHERE party_id = 'pty-u'"), loai === "DIA_CHI" ? 1 : 0);
    assert.equal(dem(b, "SELECT count(*) n FROM pty_person_document WHERE party_id = 'pty-u'"), loai === "GIAY_TO" ? 1 : 0);
  }
});

test("(3) cùng bảng ca: xetNguoiXacMinh(...).duoc === (câu quyết đổi 1 dòng) với 13 ca người × lịch sử chạm × biên ±1 ms", async () => {
  const moc = moc30Ngay(GUI);
  const cong = (iso: string, ms: number): string => new Date(Date.parse(iso) + ms).toISOString();
  type Ca = { ten: string; nguoi: "u" | "hr" | "adm" | "sup"; su: [string, string, string | null][] };
  const ca: Ca[] = [
    { ten: "không chạm", nguoi: "hr", su: [] },
    { ten: "người tạo, từ rất lâu", nguoi: "hr", su: [["hr", "staff_created", lui(GUI, 3 * NAM)]] },
    { ten: "đặt lại PIN 400 ngày trước (vĩnh viễn)", nguoi: "hr", su: [["hr", "pin_reset", lui(GUI, 400 * 86_400_000)]] },
    { ten: "cửa sổ 30: đúng biên", nguoi: "hr", su: [["hr", "login_unlocked", moc]] },
    { ten: "cửa sổ 30: sớm 1 ms", nguoi: "hr", su: [["hr", "login_unlocked", cong(moc, -1)]] },
    { ten: "cửa sổ 30: muộn 1 ms", nguoi: "hr", su: [["hr", "login_unlocked", cong(moc, 1)]] },
    { ten: "người khác chạm, hr không", nguoi: "adm", su: [["hr", "pin_reset", GUI]] },
    { ten: "tắt lớp hai từ lâu (vĩnh viễn)", nguoi: "hr", su: [["hr", "mfa_reset", lui(GUI, 5 * NAM)]] },
    { ten: "gỡ phiên (không tính chạm)", nguoi: "hr", su: [["hr", "session_revoked", GUI]] },
    { ten: "đổi SĐT đăng nhập gần đây", nguoi: "hr", su: [["hr", "staff_updated", GUI, "tên \"A\" → \"B\"; đổi SĐT đăng nhập"]] as never },
    { ten: "sửa tên (không phải đổi SĐT)", nguoi: "hr", su: [["hr", "staff_updated", GUI, "tên \"A\" → \"B\""]] as never },
    { ten: "Toàn quyền từng đặt lại PIN (chốt cuối)", nguoi: "sup", su: [["sup", "pin_reset", GUI]] },
    { ten: "chính người khai", nguoi: "u", su: [] },
  ];
  const quyenCua: Record<string, TaiKhoanTom["permissions"]> = { u: ["PARTNER"], hr: ["HR"], adm: ["ADMIN"], sup: ["SUPER_ADMIN"] };
  const tk = (id: string): TaiKhoanTom => ({ id, permissions: quyenCua[id]!, active: true, partyId: `pty-${id}` });
  let khop = 0;
  for (const c of ca) {
    const b = ban();
    c.su.forEach((s, i) => nhatKy(b, `n${i}`, s[0], s[1], s[2]!, (s as unknown as string[])[3] ?? null));
    const cham = await chamCuaTaiKhoan(b.d1, ["u"]);
    const phieu = { id: "ph", partyId: "pty-u", createdBy: "u", createdAt: GUI };
    const luat = xetNguoiXacMinh({ nguoi: tk(c.nguoi), phieu, chuPhieu: tk("u"), cham }).duoc;
    const cau = (await ketQuaCau(b, c.nguoi, c.nguoi === "sup")) === 1;
    assert.equal(luat, cau, `${c.ten}: luật thuần ${luat} ≠ câu ghi ${cau}`);
    khop++;
  }
  assert.equal(khop, 13);
});

test("(4) cờ chạm: Toàn quyền từng đặt lại PIN ⇒ verifier_touched_account = 1; không chạm ⇒ 0", async () => {
  const co = ban();
  nhatKy(co, "n1", "sup", "pin_reset", lui(GUI, 400 * 86_400_000));
  await co.d1.batch(loChapNhan(co, { actor: "sup", laToanQuyen: true, loai: "NGAY_SINH" }));
  assert.equal(dem(co, "SELECT verifier_touched_account n FROM pty_verification WHERE id = 'ph'"), 1);
  const khong = ban();
  await khong.d1.batch(loChapNhan(khong, { actor: "sup", laToanQuyen: true, loai: "NGAY_SINH" }));
  assert.equal(dem(khong, "SELECT verifier_touched_account n FROM pty_verification WHERE id = 'ph'"), 0);
});

test("(5) Review Focus 5: số CCCD đã thuộc hồ sơ khác ⇒ lô ném lỗi, loiLoChapNhan ra document_number_taken, phiếu vẫn chờ, không dòng xác minh / giấy tờ mới; câu báo không chứa số", async () => {
  const b = ban("GIAY_TO");
  b.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-o', 'PERSON', 'Người khác', 1, '${GUI}', '${GUI}')`);
  b.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-o', 'Người khác', '${GUI}', '${GUI}')`);
  b.sqlite.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gt-o', 'pty-o', 'CCCD', '079000000111', '079000000111', '${GUI}', '${GUI}')`);
  assert.equal(await trungSoHoSoKhac(b.d1, "pty-u", "079000000111", "CCCD"), true);
  assert.equal(await trungSoHoSoKhac(b.d1, "pty-o", "079000000111", "CCCD"), false, "chính hồ sơ giữ số không tính là trùng");
  let loi: unknown = null;
  try { await b.d1.batch(loChapNhan(b, { actor: "hr", laToanQuyen: false, loai: "GIAY_TO" })); } catch (e) { loi = e; }
  assert.ok(loi, "lô phải ném lỗi");
  const ket = loiLoChapNhan(loi);
  assert.equal(ket?.code, "document_number_taken");
  assert.doesNotMatch(JSON.stringify(ket), /079/, "câu báo không chứa số giấy tờ");
  assert.equal(trangThai(b), "CHO_XAC_MINH");
  assert.equal(dem(b, "SELECT count(*) n FROM pty_verification"), 0);
  assert.equal(dem(b, "SELECT count(*) n FROM pty_person_document WHERE party_id = 'pty-u'"), 0);
});

test("(6) chấp nhận GIAY_TO: đã có dòng hiện hành cùng loại ⇒ dòng mới previous_id = dòng đó (R14); chưa có ⇒ NULL", async () => {
  const chua = ban("GIAY_TO");
  await chua.d1.batch(loChapNhan(chua, { actor: "hr", laToanQuyen: false, loai: "GIAY_TO" }));
  assert.equal((chua.sqlite.prepare("SELECT previous_id p FROM pty_person_document WHERE id = 'gt-ph'").get() as any).p, null);
  assert.equal((chua.sqlite.prepare("SELECT document_number d FROM pty_person_document WHERE id = 'gt-ph'").get() as any).d, "079 000 000 111", "chép nguyên văn số khai");
  const co = ban("GIAY_TO");
  co.sqlite.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gt-cu', 'pty-u', 'CCCD', '079000000999', '079000000999', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')`);
  await co.d1.batch(loChapNhan(co, { actor: "hr", laToanQuyen: false, loai: "GIAY_TO" }));
  assert.equal((co.sqlite.prepare("SELECT previous_id p FROM pty_person_document WHERE id = 'gt-ph'").get() as any).p, "gt-cu");
});

test("(6b) vòng sửa 1 (I-4): GPLX chọn previous_id CÙNG HẠNG — hồ sơ có GPLX hạng B hiện hành, phiếu hạng D ⇒ previous_id NULL và dòng hạng B không bị thay; phiếu hạng B ⇒ nối dòng hạng B. Phá thử: bỏ điều kiện hạng khỏi câu → đỏ", async () => {
  const gplx = (b: Ban, hang: string): void => {
    b.sqlite.exec(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, document_type_code, document_number, number_key, license_class_code, status, created_at, created_by, updated_at, updated_by)
      VALUES ('gp', 'pty-u', 'GIAY_TO', 'pol', 'GPLX', '500 000 111', '500000111', '${hang}', 'CHO_XAC_MINH', '${GUI}', 'u', '${GUI}', 'u')`);
    b.sqlite.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, created_at, updated_at)
      VALUES ('gt-b', 'pty-u', 'GPLX', '400000999', '400000999', 'B', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')`);
  };
  const khac = ban();
  gplx(khac, "D");
  await khac.d1.batch(loChapNhan(khac, { id: "gp", actor: "hr", laToanQuyen: false, loai: "GIAY_TO" }));
  assert.equal(trangThai(khac, "gp"), "DA_CHAP_NHAN");
  assert.equal((khac.sqlite.prepare("SELECT previous_id p FROM pty_person_document WHERE id = 'gt-gp'").get() as any).p, null, "hạng D không gia hạn dòng hạng B");
  assert.equal(dem(khac, "SELECT count(*) n FROM pty_person_document WHERE previous_id = 'gt-b'"), 0, "dòng hạng B vẫn hiện hành, không bị nối tiếp");
  const cung = ban();
  gplx(cung, "B");
  await cung.d1.batch(loChapNhan(cung, { id: "gp", actor: "hr", laToanQuyen: false, loai: "GIAY_TO" }));
  assert.equal((cung.sqlite.prepare("SELECT previous_id p FROM pty_person_document WHERE id = 'gt-gp'").get() as any).p, "gt-b", "cùng hạng B thì gia hạn");
});

test("(7) chấp nhận DIA_CHI: liên hệ ADDRESS mới, value = địa chỉ trên phiếu; chính = 1 khi chưa có ADDRESS mở, 0 khi đã có", async () => {
  const chua = ban("DIA_CHI");
  await chua.d1.batch(loChapNhan(chua, { actor: "hr", laToanQuyen: false, loai: "DIA_CHI" }));
  const r = chua.sqlite.prepare("SELECT value, is_primary, contact_kind_code k FROM pty_contact_point WHERE id = 'lh-ph'").get() as any;
  assert.deepEqual({ ...r }, { value: "12 Đường Thử, Nha Trang", is_primary: 1, k: "ADDRESS" });
  const co = ban("DIA_CHI");
  co.sqlite.exec(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES ('lh-cu', 'pty-u', 'ADDRESS', 'Địa chỉ cũ', 'địa chỉ cũ', 1, '2020-01-01', '${GUI}', '${GUI}')`);
  await co.d1.batch(loChapNhan(co, { actor: "hr", laToanQuyen: false, loai: "DIA_CHI" }));
  assert.equal(dem(co, "SELECT is_primary n FROM pty_contact_point WHERE id = 'lh-ph'"), 0);
});

test("(8) từ chối ⇒ TU_CHOI, reason_code đúng mã, KHÔNG dòng pty_verification", async () => {
  const b = ban();
  assert.equal(await ketQuaCau(b, "hr", false, "ph", "TU_CHOI", "KHONG_KHOP_GIAY_TO"), 1);
  const r = b.sqlite.prepare("SELECT status, reason_code, decided_by FROM pty_self_submission WHERE id = 'ph'").get() as any;
  assert.deepEqual({ ...r }, { status: "TU_CHOI", reason_code: "KHONG_KHOP_GIAY_TO", decided_by: "hr" });
  assert.equal(dem(b, "SELECT count(*) n FROM pty_verification"), 0);
  const c = ban();
  nhatKy(c, "n1", "hr", "pin_reset", GUI);
  assert.equal(await ketQuaCau(c, "hr", false, "ph", "TU_CHOI", "KHONG_DOC_DUOC"), 0, "từ chối cũng bị lính gác chặn (đ5 áp cho cả hai kết luận)");
});

test("(9) phiếu đã RUT ⇒ quyết 0 dòng; phiếu đã xử lý không quyết lại", async () => {
  const b = ban();
  b.sqlite.exec(`UPDATE pty_self_submission SET status = 'RUT', decided_at = '${QUYET}', decided_by = 'u' WHERE id = 'ph'`);
  assert.equal(await ketQuaCau(b, "hr", false), 0);
  const c = ban();
  assert.equal(await ketQuaCau(c, "hr", false), 1);
  assert.equal(await ketQuaCau(c, "adm", false, "ph", "TU_CHOI", "KHONG_DOC_DUOC", "2026-10-17T09:30:00.000Z"), 0, "đã chấp nhận rồi không quyết lại");
});

test("(10) biên 30 ngày ở SQL (chuỗi ISO thật): đúng moc30Ngay(created_at) ⇒ chặn; sớm hơn 1 ms ⇒ không chặn", async () => {
  const moc = moc30Ngay(GUI);
  const dung = ban();
  nhatKy(dung, "n1", "hr", "login_unlocked", moc);
  assert.equal(await ketQuaCau(dung, "hr", false), 0, "đúng biên: chặn");
  const som = ban();
  nhatKy(som, "n1", "hr", "login_unlocked", new Date(Date.parse(moc) - 1).toISOString());
  assert.equal(await ketQuaCau(som, "hr", false), 1, "sớm 1 ms: không chặn");
});

test("(11) câu đọc: danh sách / chi tiết không chọn số giấy tờ; chỉ soDuCuaPhieuCho trả số, và chỉ cho phiếu đang chờ", async () => {
  const b = ban("GIAY_TO");
  const cho = await listPhieuCho(b.d1);
  assert.equal(cho.length, 1);
  assert.doesNotMatch(JSON.stringify(cho), /079/);
  const ct = await timPhieuChoXet(b.d1, "ph");
  assert.doesNotMatch(JSON.stringify(ct), /079 000|\"document_number\"/);
  assert.equal(ct?.number_key, "079000000111");
  assert.equal((await soDuCuaPhieuCho(b.d1, "ph"))?.document_number, "079 000 000 111");
  await ketQuaCau(b, "hr", false, "ph", "TU_CHOI", "KHONG_DOC_DUOC");
  assert.equal(await soDuCuaPhieuCho(b.d1, "ph"), null, "phiếu đã xử lý: không đọc được số đủ");
  const xong = await listPhieuDaXuLy(b.d1);
  assert.equal(xong.length, 1);
  assert.doesNotMatch(JSON.stringify(xong), /079/);
  assert.equal(xong[0]!.verifier_touched_account, null, "từ chối không có dòng xác minh");
  assert.equal((await listPhieuCho(b.d1)).length, 0);
});

test("(12) Tiêu chí 5: không câu SELECT nào chọn document_number ngoài find_pending_self_submission_number", async () => {
  const doc = registeredSql().filter((e) => /^\s*SELECT/i.test(e.sql) && e.sql.includes("pty_self_submission") && /document_number/.test(e.sql)).map((e) => e.name);
  assert.deepEqual(doc, ["find_pending_self_submission_number"]);
});

test("(13) không trần tay: mọi câu mới của xác minh có điều kiện thắng hoặc là câu đọc (quét mã repository)", () => {
  const src = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  for (const ten of ["accept_self_submission_birth_date", "accept_self_submission_address", "accept_self_submission_document", "accept_self_submission_touch_party", "accept_self_submission_verification"]) {
    const i = src.indexOf(`"${ten}"`);
    assert.ok(i > 0, ten);
    const than = src.slice(i, src.indexOf("`);", i));
    assert.match(than, /\$\{DA_THANG\}|COT_THANG\(/, `${ten} thiếu điều kiện thắng`);
  }
});
