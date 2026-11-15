// Bước DUYỆT phiếu đăng ký đối tác qua route thật (tests/audit/harness.mjs, SQLite thật, kho R2 giả) — ADR-0207 Đ1, Đ4–Đ7, Đ9; ADR-0208 Đ5, Đ6; ADR-0210 Đ6. Mọi giá trị là GIẢ.
// Phiếu gieo bản khai bằng SQL (như xac-minh-route.test.ts) rồi đi bước xác minh bằng ROUTE thật (kết luận từng mục + «đạt»), để cột người xác minh và kết luận Danh bạ do mã thật ghi.
// Ca «phiếu đổi giữa lúc bấm» dùng `w.chenTruocLo` của khung thử: chèn một lệnh thật NGAY TRƯỚC khi lô duyệt chạy (lô chạy nguyên văn sau đó, câu chốt phải tự bắt).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const SUP2 = "77777777-7777-4777-8777-777777777776";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const HR = "99999999-9999-4999-8999-999999999999";
const HR2 = "99999999-9999-4999-8999-999999999998";
const ADM_HR = "88888888-8888-4888-8888-888888888888"; // một tài khoản giữ cả Quản trị lẫn Nhân sự
const AT = "2026-11-10T00:00:00.000Z";
const SO = "079 000 000 111";
const KHOA_SO = "079000000111";
const DT = "0912 345 678";
const DT_KHOA = "0912345678";
const EMAIL = "khach@example.com";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const boUuid = (t: string) => t.replace(UUID, "<id>");
const MUC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];
let dem = 0;

function setup() {
  const w = world();
  const them = (id: string, phone: string, name: string, perms: string[]) => seedStaff(w.sqlite, { id, phone, name, perms });
  them(SALES, "0900000001", "An", ["SALES"]);
  them(ACC, "0900000002", "Kế Toán", ["ACCOUNTING"]);
  them(ADM, "0900000003", "Quản Trị", ["ADMIN"]);
  them(SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]);
  them(SUP2, "0900000008", "Chủ Hai", ["SUPER_ADMIN"]);
  them(PARTNER, "0900000010", "Đối Tác Một", ["PARTNER"]);
  them(HR, "0900000013", "Nhân Sự", ["HR"]);
  them(HR2, "0900000014", "Nhân Sự Hai", ["HR"]);
  them(ADM_HR, "0900000015", "Quản Trị Nhân Sự", ["ADMIN", "HR"]);
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  return w;
}

/** Gieo phiếu cá nhân đã gửi bản khai 1, ở CHỜ XÁC MINH. */
function phieu(w: any, o: { so?: string | null; dienThoai?: string; hoTen?: [string, string] } = {}): string {
  const id = `DK_${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(dem % 18, (dem % 18) + 8)}`;
  dem++;
  const so = o.so === undefined ? SO : o.so;
  const dt = o.dienThoai ?? DT;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'TRAVEL_AGENCY', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(`ident-${id}`, id, `khach-${id.toLowerCase()}@example.com`, EMAIL, AT, AT);
  const [ho, ten] = o.hoTen ?? ["Phạm", "Thử Nghiệm"];
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, ?, ?, '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, ?, ?, ?, '2021-01-02', 'Cục thử', '2040-01-02', (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`)
    .run(`sub-${id}`, id, ho, ten, dt, dt.replace(/\s/g, ""), so ? "CCCD" : null, so, so ? so.replace(/\s/g, "") : null, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  return id;
}
async function tep(w: any, reg: string, slot = "CCCD_MAT_TRUOC"): Promise<{ id: string; key: string }> {
  const id = crypto.randomUUID();
  const key = `pty/${crypto.randomUUID().replace(/-/g, "")}`;
  const bam = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  w.sqlite.prepare(`INSERT INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, 'png', ?, ?, ?, 'ident', ?, 'ident')`).run(id, reg, slot, key, PNG.length, bam, AT, AT);
  await w.r2.put(key, PNG, { httpMetadata: { contentType: "image/png" } });
  w.sqlite.prepare("UPDATE pty_registration_attachment SET stored_at = ? WHERE id = ?").run(AT, id);
  return { id, key };
}
/** Hồ sơ cá nhân có sẵn (chưa có tài khoản). */
function hoSoCoSan(w: any, id = "pty-co-san", ten = "Người Có Sẵn"): string {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
  return id;
}
const reg = (w: any, id: string) => w.q("SELECT * FROM dk_registration WHERE id = ?", id)[0];
const dem1 = (w: any, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const ketLuan = (w: any, as: string, id: string, body: any) => w.call("POST", `/api/dang-ky/phieu/${id}/ket-luan`, { as, body: { phienBan: 1, ...body } });
const dat = (w: any, as: string, id: string, body: any) => w.call("POST", `/api/dang-ky/phieu/${id}/dat`, { as, body: { phienBan: 1, ...body } });
const duyet = (w: any, as: string, id: string, body: any = { roleCode: "TRAVEL_AGENCY" }) => w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as, body });
const tuChoiDuyet = (w: any, as: string, id: string, body: any = { lyDo: "KHONG_THUOC_DIEN" }) => w.call("POST", `/api/dang-ky/phieu/${id}/tu-choi-duyet`, { as, body });
const guiLai = (w: any, as: string, id: string) => w.call("POST", `/api/dang-ky/phieu/${id}/gui-lai-loi-moi`, { as });
const xemDuyet = (w: any, as: string, id: string) => w.call("GET", `/api/dang-ky/phieu/${id}/xem-duyet`, { as });
/** Bước xác minh bằng route thật: kết luận đạt mọi mục rồi «đạt». */
async function xacMinh(w: any, id: string, as = ADM, body: any = { hoSo: { kieu: "MOI" } }) {
  for (const m of MUC) assert.equal((await ketLuan(w, as, id, { muc: m, dat: true })).status, 200, m);
  const r = await dat(w, as, id, body);
  assert.equal(r.status, 200, r.text);
}
/** Số dòng của mọi bảng lô duyệt chạm — để so «không còn dòng nào» khi lô hỏng. */
const anh = (w: any) => ({
  party: dem1(w, "SELECT count(*) n FROM pty_party"),
  staff: dem1(w, "SELECT count(*) n FROM staff"),
  quyen: dem1(w, "SELECT count(*) n FROM stf_permission"),
  vai: dem1(w, "SELECT count(*) n FROM pty_party_role"),
  lienHe: dem1(w, "SELECT count(*) n FROM pty_contact_point"),
  giayTo: dem1(w, "SELECT count(*) n FROM pty_person_document"),
  xacMinh: dem1(w, "SELECT count(*) n FROM pty_verification"),
  dongY: dem1(w, "SELECT count(*) n FROM pty_consent"),
  tep: dem1(w, "SELECT count(*) n FROM pty_attachment"),
  quanHe: dem1(w, "SELECT count(*) n FROM pty_party_relationship"),
  quyetDinh: dem1(w, "SELECT count(*) n FROM dk_decision"),
  taoTk: dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'staff_created'"),
  suKien: dem1(w, "SELECT count(*) n FROM dk_event"),
});
const taiKhoanMoi = (w: any) => w.q("SELECT * FROM staff WHERE phone = ?", DT_KHOA)[0];

test("(1) Quyền: Quản trị, Bán hàng, Kế toán, Đối tác gọi duyệt / từ chối duyệt / gửi lại lời mời / xem để duyệt ⇒ 403; không đổi dòng nào", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  for (const as of [ADM, SALES, ACC, PARTNER]) {
    for (const r of [await duyet(w, as, id), await tuChoiDuyet(w, as, id), await guiLai(w, as, id), await xemDuyet(w, as, id)]) assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.deepEqual(anh(w), truoc);
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

test("(2) Duyệt hồ sơ mới: một lô sinh đúng 1 hồ sơ, vai, 1 tài khoản TẮT, quyền, giá trị, dòng xác minh (người + giờ xác minh), đồng ý (người tạo = tài khoản mới), tệp chuyển, staff_created trỏ tài khoản mới", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  await xacMinh(w, id);
  const xm = reg(w, id);
  const truoc = anh(w);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(/pin/i.test(r.text), false, "phản hồi không chứa PIN");
  const sau = anh(w);
  assert.equal(sau.party - truoc.party, 1);
  assert.equal(sau.staff - truoc.staff, 1);
  const tk = taiKhoanMoi(w);
  assert.equal(tk.active, 0, "tài khoản tắt tới khi kích hoạt");
  const p = reg(w, id);
  assert.equal(p.status, "DA_DUYET");
  assert.equal(p.staff_id, tk.id);
  assert.equal(p.party_id, tk.party_id);
  assert.ok(p.decided_at);
  const han = Date.parse(p.activation_deadline_at) - Date.parse(p.decided_at);
  assert.equal(han, 14 * 24 * 3600 * 1000, "hạn đặt PIN = dòng chính sách activation_days");
  assert.deepEqual(r.json, { trangThai: "DA_DUYET" });
  // hồ sơ, vai, quyền
  const ho = w.q("SELECT p.party_kind, p.display_name, n.family_name, n.given_name, n.birth_date FROM pty_party p JOIN pty_person n ON n.party_id = p.id WHERE p.id = ?", tk.party_id)[0];
  assert.deepEqual({ ...ho }, { party_kind: "PERSON", display_name: "Phạm Thử Nghiệm", family_name: "Phạm", given_name: "Thử Nghiệm", birth_date: "1990-05-06" });
  assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL", tk.party_id).map((x: any) => x.role_type_code), ["TRAVEL_AGENCY"]);
  assert.deepEqual(w.q("SELECT permission_type_code FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", tk.id).map((x: any) => x.permission_type_code), ["PARTNER"]);
  // liên hệ: điện thoại, email, địa chỉ
  const lh = w.q("SELECT contact_kind_code, value_normalized FROM pty_contact_point WHERE party_id = ? ORDER BY contact_kind_code", tk.party_id).map((x: any) => ({ ...x }));
  assert.deepEqual(lh, [{ contact_kind_code: "ADDRESS", value_normalized: "12 đường thử, nha trang" }, { contact_kind_code: "EMAIL", value_normalized: EMAIL }, { contact_kind_code: "PHONE", value_normalized: DT_KHOA }]);
  // giấy tờ + dòng xác minh: người xác minh, giờ xác minh, không cờ
  const gt = w.q("SELECT id, document_type_code, number_key, previous_id FROM pty_person_document WHERE party_id = ?", tk.party_id);
  assert.equal(gt.length, 1);
  assert.equal(gt[0].number_key, KHOA_SO);
  const v = w.q("SELECT target_kind, target_id, attribute_code, outcome, created_by, created_at, verifier_touched_account FROM pty_verification WHERE party_id = ? ORDER BY target_kind, attribute_code", tk.party_id).map((x: any) => ({ ...x }));
  assert.deepEqual(v, [
    { target_kind: "ATTRIBUTE", target_id: null, attribute_code: "HO_TEN", outcome: "DA_XAC_MINH", created_by: ADM, created_at: xm.verified_at, verifier_touched_account: 0 },
    { target_kind: "ATTRIBUTE", target_id: null, attribute_code: "NGAY_SINH", outcome: "DA_XAC_MINH", created_by: ADM, created_at: xm.verified_at, verifier_touched_account: 0 },
    { target_kind: "PERSON_DOCUMENT", target_id: gt[0].id, attribute_code: null, outcome: "DA_XAC_MINH", created_by: ADM, created_at: xm.verified_at, verifier_touched_account: 0 },
  ]);
  // đồng ý: đúng phiên bản, giờ trong bản khai, người tạo là tài khoản mới
  assert.deepEqual({ ...w.q("SELECT policy_id, decision, created_at, created_by FROM pty_consent WHERE party_id = ?", tk.party_id)[0] }, { policy_id: "pol", decision: "DONG_Y", created_at: AT, created_by: tk.id });
  // tệp: cùng mã, cùng khoá kho, nối dòng giấy tờ; dòng chờ «đã chuyển»
  const a = w.q("SELECT a.id, a.storage_key, l.target_id FROM pty_attachment a JOIN pty_attachment_link l ON l.attachment_id = a.id WHERE a.party_id = ?", tk.party_id);
  assert.deepEqual(a.map((x: any) => ({ ...x })), [{ id: t.id, storage_key: t.key, target_id: gt[0].id }]);
  assert.ok(w.q("SELECT transferred_at FROM pty_registration_attachment WHERE id = ?", t.id)[0].transferred_at);
  assert.equal(w.r2.co(t.key), true, "tệp không bị xoá khỏi kho");
  // quyết định + lịch sử + nhật ký
  assert.deepEqual({ ...w.q("SELECT kind, version, decided_by, super_admin_flag FROM dk_decision WHERE registration_id = ?", id)[0] }, { kind: "DUYET", version: 1, decided_by: HR, super_admin_flag: 0 });
  assert.deepEqual(w.q("SELECT actor_ref, command FROM dk_event WHERE registration_id = ? AND command = 'DUYET'", id).map((x: any) => ({ ...x })), [{ actor_ref: HR, command: "DUYET" }]);
  const nk = w.q("SELECT staff_id, target_type, target_id, detail FROM audit_log WHERE action = 'staff_created'");
  assert.equal(nk.length, 1);
  assert.deepEqual({ staff_id: nk[0].staff_id, target_type: nk[0].target_type, target_id: nk[0].target_id }, { staff_id: HR, target_type: "staff", target_id: tk.id });
  assert.ok(String(nk[0].detail).includes(id), "chi tiết mang mã phiếu");
  // bản khai ẩn danh; danh tính và email giữ tới khi kích hoạt
  const bk = w.q("SELECT given_name, family_name, birth_date, phone_value, document_number FROM dk_submission WHERE registration_id = ?", id)[0];
  assert.equal(bk.given_name, "(đã ẩn)");
  for (const c of ["family_name", "birth_date", "phone_value"]) assert.equal(bk[c], null, c);
  assert.equal(String(bk.document_number).startsWith("XOA"), true);
  assert.equal(w.q("SELECT contact_email FROM dk_identity WHERE registration_id = ?", id)[0].contact_email, EMAIL);
  // không lộ dữ liệu cá nhân vào nhật ký / lịch sử
  const chu = JSON.stringify([...w.q("SELECT detail FROM audit_log"), ...w.q("SELECT * FROM dk_event")]);
  for (const lo of [DT_KHOA, "0912", EMAIL, KHOA_SO, "1990-05-06", "Đường Thử"]) assert.equal(chu.includes(lo), false, `lộ ${lo}`);
  // bấm lại ⇒ 409, không sinh thêm
  const lai = await duyet(w, HR, id);
  assert.equal(lai.status, 409, lai.text);
  assert.equal(anh(w).staff, sau.staff);
});

test("(3) Gắn hồ sơ có sẵn: Nhân sự (không xem Danh bạ) duyệt được; không sinh hồ sơ mới; tài khoản trên đúng hồ sơ đích; liên hệ đã có không chép lại", async () => {
  const w = setup();
  const goc = hoSoCoSan(w);
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES ('lh-goc', ?, 'PHONE', ?, ?, 1, '2026-01-01', ?, ?)").run(goc, DT, DT_KHOA, AT, AT);
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  const xd = await xemDuyet(w, HR, id);
  assert.equal(xd.status, 200, xd.text);
  assert.equal(xd.json.ketLuanDanhBa.kieu, "EXISTING");
  assert.equal(xd.text.includes("Người Có Sẵn"), false, "Nhân sự không thấy tên hồ sơ đích");
  const truoc = anh(w);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(anh(w).party, truoc.party, "không sinh hồ sơ mới");
  assert.equal(taiKhoanMoi(w).party_id, goc);
  assert.equal(dem1(w, "SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'PHONE'", goc), 1, "số đã có không chép lại");
  assert.equal(w.q("SELECT birth_date FROM pty_person WHERE party_id = ?", goc)[0].birth_date, "1990-05-06");
  // I2 (vòng sửa 1, phương án a): tên hồ sơ có sẵn «Người Có Sẵn» KHÁC tên khai «Phạm Thử Nghiệm» ⇒ KHÔNG dòng HO_TEN; không đổi tên hồ sơ; ngày sinh, CCCD vẫn có dòng xác minh
  assert.deepEqual(w.q("SELECT attribute_code a, target_kind k FROM pty_verification WHERE party_id = ? ORDER BY target_kind, attribute_code", goc).map((x: any) => [x.k, x.a]),
    [["ATTRIBUTE", "NGAY_SINH"], ["PERSON_DOCUMENT", null]]);
  assert.equal(w.q("SELECT display_name FROM pty_party WHERE id = ?", goc)[0].display_name, "Người Có Sẵn");
});

test("(3b) Gắn hồ sơ có sẵn CÙNG tên khai (họ + tên ghép theo luật của Danh bạ) ⇒ có dòng HO_TEN «đạt»", async () => {
  const w = setup();
  const goc = "pty-cung-ten";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Phạm Thử Nghiệm', 1, ?, ?)").run(goc, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, family_name, given_name, created_at, updated_at) VALUES (?, 'Phạm', 'Thử Nghiệm', ?, ?)").run(goc, AT, AT);
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  assert.equal((await duyet(w, HR, id)).status, 200);
  assert.equal(dem1(w, "SELECT count(*) n FROM pty_verification WHERE party_id = ? AND attribute_code = 'HO_TEN' AND outcome = 'DA_XAC_MINH'", goc), 1);
});

test("(3c) Gắn hồ sơ có sẵn đã có CCCD kèm ảnh ⇒ dòng mới là dòng gia hạn; ảnh của dòng cũ vào danh sách xoá với lý do «đã gia hạn» (M1)", async () => {
  const w = setup();
  const goc = hoSoCoSan(w);
  w.sqlite.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gt-cu', ?, 'CCCD', ?, ?, ?, ?)").run(goc, SO, KHOA_SO, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
    VALUES ('anh-cu', ?, ?, 'png', 3, ?, ?, ?, 's', ?, 's')`).run(goc, `pty/${"a".repeat(32)}`, "d".repeat(64), AT, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES ('anh-cu', 'PERSON_DOCUMENT', 'gt-cu', ?, 's', ?, 's')").run(AT, AT);
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  assert.equal((await duyet(w, HR, id)).status, 200);
  const moi = w.q("SELECT previous_id FROM pty_person_document WHERE party_id = ? AND id <> 'gt-cu'", goc);
  assert.deepEqual(moi.map((x: any) => x.previous_id), ["gt-cu"]);
  const { listAnhHetLyDoGiu } = await import("../parties/repository.ts");
  const ds = await listAnhHetLyDoGiu(w.env.DB, "2026-11-15", []);
  assert.deepEqual(ds.filter((r: any) => r.id === "anh-cu").map((r: any) => r.ly_do), ["DA_GIA_HAN"]);
});

test("(4) Giả lỗi ở câu giữa lô (dòng đồng ý) ⇒ không còn dòng nào trong số đó; phiếu vẫn CHỜ DUYỆT", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  await xacMinh(w, id);
  const truoc = anh(w);
  w.sqlite.exec("CREATE TEMP TRIGGER thu_hong_dong_y BEFORE INSERT ON pty_consent BEGIN SELECT RAISE(ABORT, 'gia_loi_giua_lo'); END");
  const r = await duyet(w, HR, id);
  assert.notEqual(r.status, 200);
  assert.equal(r.text.includes("gia_loi_giua_lo"), false, "không lộ lỗi thô");
  w.sqlite.exec("DROP TRIGGER thu_hong_dong_y");
  assert.deepEqual(anh(w), truoc);
  assert.equal(reg(w, id).status, "CHO_DUYET");
  assert.equal(w.q("SELECT transferred_at FROM pty_registration_attachment WHERE id = ?", t.id)[0].transferred_at, null);
  assert.equal(w.q("SELECT given_name FROM dk_submission WHERE registration_id = ?", id)[0].given_name, "Thử Nghiệm");
});

test("(5) Phiếu bị từ chối giữa lúc bấm duyệt ⇒ cả lô hỏng, 409, không sinh hồ sơ hay tài khoản (câu chốt)", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  let daChen = 0;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    daChen++;
    const tc = await tuChoiDuyet(w, SUP, id); // Toàn quyền khác từ chối bằng route thật
    assert.equal(tc.status, 200, tc.text);
  });
  const r = await duyet(w, HR, id);
  assert.equal(daChen, 1);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_state_changed");
  const sau = anh(w);
  for (const k of ["party", "staff", "quyen", "vai", "lienHe", "giayTo", "xacMinh", "dongY", "tep", "quanHe", "quyetDinh", "taoTk"] as const) assert.equal(sau[k], truoc[k], k);
  assert.equal(reg(w, id).status, "TU_CHOI");
});

test("(6) Hai người duyệt cùng lúc ⇒ đúng một lô thắng", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  let thang: any = null;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    thang = await duyet(w, HR2, id);
  });
  const r = await duyet(w, HR, id);
  assert.equal(thang.status, 200, thang.text);
  assert.equal(r.status, 409, r.text);
  assert.equal(dem1(w, "SELECT count(*) n FROM staff WHERE phone = ?", DT_KHOA), 1);
  assert.equal(dem1(w, "SELECT count(*) n FROM dk_decision WHERE registration_id = ?", id), 1);
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'staff_created'"), 1);
  assert.equal(w.q("SELECT decided_by FROM dk_decision")[0].decided_by, HR2);
});

test("(7) Người xác minh tự duyệt (tài khoản giữ Quản trị + Nhân sự) ⇒ 409 ở câu chốt, không ghi gì", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id, ADM_HR);
  const truoc = anh(w);
  const r = await duyet(w, ADM_HR, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_same_person");
  assert.deepEqual(anh(w), truoc);
  // người khác duyệt được
  assert.equal((await duyet(w, HR, id)).status, 200);
});

test("(8) Toàn quyền làm cả hai bước ⇒ thành công, dòng quyết định và dòng xác minh mang cờ; Toàn quyền duyệt phiếu người khác xác minh ⇒ không cờ", async () => {
  const w = setup();
  const a = phieu(w);
  await xacMinh(w, a, SUP);
  const r = await duyet(w, SUP, a);
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT super_admin_flag FROM dk_decision WHERE registration_id = ?", a)[0].super_admin_flag, 1);
  const pa = reg(w, a).party_id;
  assert.deepEqual([...new Set(w.q("SELECT verifier_touched_account v FROM pty_verification WHERE party_id = ?", pa).map((x: any) => x.v))], [1]);
  const b = phieu(w, { dienThoai: "0912 000 222", so: "079 000 000 222", hoTen: ["Lê", "Hai"] });
  await xacMinh(w, b, ADM);
  assert.equal((await duyet(w, SUP2, b)).status, 200);
  assert.equal(w.q("SELECT super_admin_flag FROM dk_decision WHERE registration_id = ?", b)[0].super_admin_flag, 0);
  assert.deepEqual([...new Set(w.q("SELECT verifier_touched_account v FROM pty_verification WHERE party_id = ?", reg(w, b).party_id).map((x: any) => x.v))], [0]);
});

test("(9) Số điện thoại «+84 9…» trùng tài khoản «09…» ⇒ 409 TRƯỚC lô; câu báo không lộ tài khoản đó là của ai", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: "66666666-6666-4666-8666-666666666666", phone: DT_KHOA, name: "Chủ Số Cũ", perms: ["SALES"] });
  const id = phieu(w, { dienThoai: "+84 912 345 678" });
  await xacMinh(w, id);
  const truoc = anh(w);
  let loChay = 0;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => { loChay++; });
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "phone_taken");
  assert.equal(loChay, 0, "chặn trước lô");
  assert.equal(r.text.includes("Chủ Số Cũ"), false);
  assert.deepEqual(anh(w), truoc);
});

test("(10) Số căn cước đã thuộc hồ sơ khác ⇒ 409 trước lô, không lỗi thô; hồ sơ đích đã có tài khoản ⇒ 409", async () => {
  const w = setup();
  const khac = hoSoCoSan(w, "pty-khac", "Người Khác");
  w.sqlite.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gt-khac', ?, 'CCCD', ?, ?, ?, ?)").run(khac, SO, KHOA_SO, AT, AT);
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  let loChay = 0;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => { loChay++; });
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "document_other_person");
  assert.equal(loChay, 0, "chặn trước lô");
  assert.equal(r.text.includes(KHOA_SO), false);
  assert.deepEqual(anh(w), truoc);
  // hồ sơ đích vừa có tài khoản (sau «đạt»)
  const goc = hoSoCoSan(w);
  const b = phieu(w, { so: null, dienThoai: "0912 000 333" });
  await xacMinh(w, b, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  w.sqlite.prepare("UPDATE staff SET party_id = ? WHERE id = ?").run(goc, SALES);
  const r2 = await duyet(w, HR, b);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "target_has_account");
});

test("(11) Đua (TOCTOU): số điện thoại bị tài khoản khác lấy NGAY TRƯỚC lô ⇒ lô hỏng (chỉ mục duy nhất), 409, không còn dòng nào", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    w.sqlite.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('chen-ngang', '', ?, 'x', 'sales', 1, ?)").run(DT_KHOA, AT);
  });
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 409, r.text);
  const sau = anh(w);
  assert.equal(sau.staff, truoc.staff + 1, "chỉ dòng chen ngang");
  for (const k of ["party", "quyen", "vai", "giayTo", "xacMinh", "dongY", "quyetDinh", "taoTk"] as const) assert.equal(sau[k], truoc[k], k);
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

test("(12) Người đã duyệt về sau KHÔNG xác minh được phiếu tự khai của tài khoản đó (dòng staff_created ở tầng «tạo tài khoản»); Nhân sự khác thì được", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal((await duyet(w, HR, id)).status, 200);
  const tk = taiKhoanMoi(w);
  w.sqlite.prepare("UPDATE staff SET active = 1 WHERE id = ?").run(tk.id); // giả đã kích hoạt (đường kích hoạt thuộc Task 9)
  const pid = crypto.randomUUID();
  w.sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'NGAY_SINH', 'pol', '1990-05-07', 'CHO_XAC_MINH', ?, ?, ?, ?)`).run(pid, tk.party_id, new Date().toISOString(), tk.id, new Date().toISOString(), tk.id);
  const r = await w.call("POST", `/api/parties/xac-minh/${pid}/chap-nhan`, { as: HR });
  assert.notEqual(r.status, 200, r.text);
  assert.equal(w.q("SELECT status FROM pty_self_submission WHERE id = ?", pid)[0].status, "CHO_XAC_MINH");
  const r2 = await w.call("POST", `/api/parties/xac-minh/${pid}/chap-nhan`, { as: HR2 });
  assert.equal(r2.status, 200, r2.text);
});

test("(13) Từ chối duyệt: CHỜ DUYỆT → TỪ CHỐI + lý do; tệp chờ gỡ cùng lô, kho xoá sau; lịch sử + nhật ký; phiếu đã duyệt ⇒ 409", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  await xacMinh(w, id);
  assert.equal((await tuChoiDuyet(w, HR, id, { lyDo: "chu tu do" })).status, 400);
  const r = await tuChoiDuyet(w, HR, id, { lyDo: "KHONG_THUOC_DIEN" });
  assert.equal(r.status, 200, r.text);
  const p = reg(w, id);
  assert.equal(p.status, "TU_CHOI");
  assert.equal(p.reason_code, "KHONG_THUOC_DIEN");
  const d = w.q("SELECT purged_at, purge_reason FROM pty_registration_attachment WHERE id = ?", t.id)[0];
  assert.ok(d.purged_at);
  assert.equal(d.purge_reason, "TU_CHOI");
  assert.equal(w.r2.co(t.key), false);
  assert.deepEqual(w.q("SELECT actor_ref, command, reason_code FROM dk_event WHERE registration_id = ? AND command = 'TU_CHOI_DUYET'", id).map((x: any) => ({ ...x })), [{ actor_ref: HR, command: "TU_CHOI_DUYET", reason_code: "KHONG_THUOC_DIEN" }]);
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_approval_rejected'"), 1);
  assert.equal((await tuChoiDuyet(w, HR, id)).status, 409);
  const b = phieu(w, { dienThoai: "0912 000 444", so: null });
  await xacMinh(w, b);
  assert.equal((await duyet(w, HR, b)).status, 200);
  assert.equal((await tuChoiDuyet(w, HR, b)).status, 409, "đã duyệt thì không từ chối được");
});

test("(14) Gửi lại lời mời: mở lại hạn đặt PIN + lịch sử + nhật ký; phiếu chưa duyệt hoặc đã kích hoạt ⇒ 409", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal((await guiLai(w, HR, id)).status, 409, "chưa duyệt");
  assert.equal((await duyet(w, HR, id)).status, 200);
  w.sqlite.prepare("UPDATE dk_registration SET activation_deadline_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(id);
  const truoc = Date.now();
  const r = await guiLai(w, HR, id);
  assert.equal(r.status, 200, r.text);
  const han = Date.parse(reg(w, id).activation_deadline_at);
  assert.ok(han >= truoc + 14 * 24 * 3600 * 1000 - 1000 && han <= Date.now() + 14 * 24 * 3600 * 1000, "hạn mới = bây giờ + activation_days");
  assert.equal(dem1(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'GUI_LAI_LOI_MOI'", id), 1);
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_invite_resent'"), 1);
  w.sqlite.prepare("UPDATE dk_registration SET activated_at = ? WHERE id = ?").run(AT, id);
  assert.equal((await guiLai(w, HR, id)).status, 409, "đã kích hoạt");
});

test("(15) Câu chốt RAISE cho phiếu chưa có kết luận Danh bạ / chưa xác minh đạt (gieo thẳng — đường thật không sinh được) ⇒ 409", async () => {
  const w = setup();
  const a = phieu(w);
  // đã xác minh đạt (người + phiên bản) nhưng KHÔNG có kết luận Danh bạ
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_DUYET', verified_by = ?, verified_version = 1, verified_at = ? WHERE id = ?").run(ADM, AT, a);
  const r = await duyet(w, HR, a);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_not_verified");
  assert.equal(dem1(w, "SELECT count(*) n FROM dk_decision"), 0);
  const b = phieu(w, { dienThoai: "0912 000 555", so: null });
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_DUYET', match_kind = 'NEW' WHERE id = ?").run(b); // có Danh bạ, chưa người xác minh
  const r2 = await duyet(w, HR, b);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "registration_not_verified");
  assert.equal(dem1(w, "SELECT count(*) n FROM staff WHERE phone IN (?, ?)", DT_KHOA, "0912000555"), 0);
});

test("(16) Thân sai: vai không phải vai bên ngoài, vai lạ, ô lạ, phiên bản cũ ⇒ 400 / 409, không ghi", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  assert.equal((await duyet(w, HR, id, { roleCode: "SALES" })).status, 400);
  assert.equal((await duyet(w, HR, id, { roleCode: "KHONG_CO" })).status, 400);
  assert.equal((await duyet(w, HR, id, { roleCode: "TRAVEL_AGENCY", ghiChu: "x" })).status, 400);
  const cu = await duyet(w, HR, id, { roleCode: "TRAVEL_AGENCY", phienBan: 2 });
  assert.equal(cu.status, 409, cu.text);
  assert.deepEqual(anh(w), truoc);
});

test("(17) Màn duyệt của Nhân sự: họ tên, số điện thoại, loại xin, kết luận từng mục, kết luận Danh bạ; KHÔNG ảnh, số giấy tờ, ngày sinh, địa chỉ; đã xử lý ⇒ chỉ tóm tắt", async () => {
  const w = setup();
  const id = phieu(w);
  await tep(w, id);
  await xacMinh(w, id);
  const r = await xemDuyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.json.hoTen, "Phạm Thử Nghiệm");
  assert.equal(r.json.soDienThoai, DT);
  assert.equal(r.json.loai, "TRAVEL_AGENCY");
  assert.equal(r.json.ketLuanDanhBa.kieu, "NEW");
  assert.deepEqual(r.json.muc.map((m: any) => [m.ma, m.ketLuan]), MUC.map((m) => [m, "DAT"]));
  for (const lo of [KHOA_SO, SO, "1990-05-06", "Đường Thử", "pty/", "tep", "CCCD_MAT"]) assert.equal(boUuid(r.text).includes(lo), false, `lộ ${lo}`);
  assert.equal((await duyet(w, HR, id)).status, 200);
  const sau = await xemDuyet(w, HR, id);
  assert.equal(sau.status, 200);
  assert.equal(sau.json.daXuLy, true);
  for (const lo of ["Phạm", "Thử Nghiệm", "0912"]) assert.equal(sau.text.includes(lo), false, `lộ ${lo}`);
});

test("(18) Người giới thiệu: lô duyệt ghi quan hệ «Người giới thiệu của» (người giới thiệu → hồ sơ mới); hồ sơ người giới thiệu ngưng giữa chừng ⇒ 409", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: `pty-${SALES}` });
  assert.equal((await duyet(w, HR, id)).status, 200);
  const q = w.q("SELECT from_party_id, to_party_id, relationship_type_code FROM pty_party_relationship WHERE relationship_type_code = 'REFERRED_BY'").map((x: any) => ({ ...x }));
  assert.deepEqual(q, [{ from_party_id: `pty-${SALES}`, to_party_id: reg(w, id).party_id, relationship_type_code: "REFERRED_BY" }]);
  const b = phieu(w, { dienThoai: "0912 000 666", so: null });
  await xacMinh(w, b, ADM, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: `pty-${ACC}` });
  w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(`pty-${ACC}`);
  const r = await duyet(w, HR, b);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "referrer_inactive");
});

test("(19) Bản khai đổi phiên bản giữa lúc bấm (phiếu vẫn CHỜ DUYỆT) ⇒ câu chốt RAISE phiên bản, 409 registration_version_changed, không ghi gì", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const truoc = anh(w);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    w.sqlite.prepare("UPDATE dk_registration SET current_version = current_version + 1 WHERE id = ?").run(id);
  });
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_version_changed");
  const sau = anh(w);
  for (const k of ["party", "staff", "quyen", "vai", "giayTo", "xacMinh", "dongY", "tep", "quyetDinh", "taoTk"] as const) assert.equal(sau[k], truoc[k], k);
});

/** Hồ sơ đích hoặc người giới thiệu đổi trạng thái NGAY TRƯỚC lô (I1, vòng sửa 1): lô phải tự hỏng, không chỉ dựa vào kiểm trước lô. */
async function duaTruocLo(w: any, id: string, chen: () => void) {
  const truoc = anh(w);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => chen());
  const r = await duyet(w, HR, id);
  const sau = anh(w);
  for (const k of ["party", "staff", "quyen", "vai", "lienHe", "giayTo", "xacMinh", "dongY", "tep", "quanHe", "quyetDinh", "taoTk"] as const) assert.equal(sau[k], truoc[k], k);
  assert.equal(reg(w, id).status, "CHO_DUYET");
  return r;
}

test("(20) R3a: hồ sơ đích bị gộp NGAY TRƯỚC lô ⇒ lô hỏng, 409, không ghi gì", async () => {
  const w = setup();
  const goc = hoSoCoSan(w);
  const chinh = hoSoCoSan(w, "pty-chinh", "Hồ Sơ Chính");
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  const r = await duaTruocLo(w, id, () => w.sqlite.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(chinh, AT, goc));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "target_changed");
});

test("(21) R3a2: hồ sơ đích bị ngưng NGAY TRƯỚC lô ⇒ lô hỏng, 409, không ghi gì", async () => {
  const w = setup();
  const goc = hoSoCoSan(w);
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  const r = await duaTruocLo(w, id, () => w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(goc));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "target_changed");
});

test("(22) R3b: hồ sơ người giới thiệu bị ngưng NGAY TRƯỚC lô ⇒ lô hỏng, 409, không ghi gì", async () => {
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: `pty-${SALES}` });
  const r = await duaTruocLo(w, id, () => w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(`pty-${SALES}`));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "referrer_changed");
});

test("(23) M4: lỗi lạ khi dựng câu lô ⇒ 500 (không đội lốt «vai không mở được»); hai lỗi đã biết của staff ⇒ 400", async () => {
  const { loiDungLoDuyet } = await import("./xac-minh.ts");
  assert.equal(loiDungLoDuyet(new Error("createAccountOnPartyStatements: vai trò không mang quyền nào")), true);
  assert.equal(loiDungLoDuyet(new Error("createAccountOnPartyStatements: chỉ dùng cho vai trò bên ngoài")), true);
  assert.equal(loiDungLoDuyet(new Error("loDuyetDangKy: mã vai không hợp lệ")), false);
  assert.equal(loiDungLoDuyet(new TypeError("x is undefined")), false);
  // đối chứng ở đường thật: lỗi lạ ở LÔ (không thuộc bảng dịch lỗi) ⇒ 500 có mã yêu cầu, không lộ chữ lỗi
  const w = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  w.sqlite.exec("CREATE TEMP TRIGGER thu_loi_la BEFORE INSERT ON dk_decision BEGIN SELECT RAISE(ABORT, 'loi_la_khong_ten'); END");
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 500, r.text);
  assert.equal(r.text.includes("loi_la_khong_ten"), false);
});
