// Bước DUYỆT phiếu đăng ký đối tác qua route thật (tests/audit/harness.mjs, SQLite thật, kho R2 giả) — ADR-0207 Đ1, Đ4–Đ7, Đ9; ADR-0208 Đ5, Đ6; ADR-0210 Đ6. Mọi giá trị là GIẢ.
// Phiếu gieo bản khai bằng SQL (như xac-minh-route.test.ts) rồi đi bước xác minh bằng ROUTE thật (kết luận từng mục + «đạt»), để cột người xác minh và kết luận Danh bạ do mã thật ghi.
// Ca «phiếu đổi giữa lúc bấm» dùng `w.chenTruocLo` của khung thử: chèn một lệnh thật NGAY TRƯỚC khi lô duyệt chạy (lô chạy nguyên văn sau đó, câu chốt phải tự bắt).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, SECRET } from "../../../tests/audit/harness.mjs";
// @ts-ignore tệp .mjs không có khai kiểu
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";
import { DK_COOKIE, khoaBam, taoPhienDangKy } from "./phien.ts";

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
function phieu(w: any, o: { so?: string | null; dienThoai?: string; hoTen?: [string, string]; toChuc?: Partial<ToChucKhai> } = {}): string {
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
  if (o.toChuc) {
    w.sqlite.prepare("UPDATE dk_registration SET org_role_code = 'TRAVEL_AGENCY' WHERE id = ?").run(id);
    gieoToChuc(w, id, o.toChuc);
  }
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  return id;
}
// ---- Phần tổ chức (ADR-0212 Đ6; đợt 2 Task 7). Giá trị GIẢ. ----
interface ToChucKhai { ten: string; tenPhapLy: string | null; mst: string | null; mstKhoa: string | null; gpkd: string; gpkdKhoa: string; giayPhep: boolean }
const TO_CHUC: ToChucKhai = { ten: "Công ty Lữ hành Biển Xanh", tenPhapLy: "Công ty TNHH Lữ hành Biển Xanh", mst: "0123456789", mstKhoa: "0123456789", gpkd: "41-0398-7712", gpkdKhoa: "4103987712", giayPhep: false };
const DT_TC = "0258 381 234";
function gieoToChuc(w: any, reg: string, o: Partial<ToChucKhai> = {}): void {
  const t = { ...TO_CHUC, ...o };
  w.sqlite.prepare(`INSERT INTO dk_submission_org (id, registration_id, version, display_name, legal_name, tax_code, tax_key, address, invoice_email, phone_value, phone_key, gpkd_number, gpkd_key,
      gpkd_issued_date, gpkd_issued_place, extra_type_code, extra_number, extra_key, extra_issued_date, extra_expiry_date, authority_confirmed_at, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, '5 Trần Phú, Nha Trang', 'hoadon@bienxanh.example', ?, '0258381234', ?, ?, '2019-03-04', 'Sở Kế hoạch và Đầu tư Khánh Hoà', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(`org-${reg}`, reg, t.ten, t.tenPhapLy, t.mst, t.mstKhoa, DT_TC, t.gpkd, t.gpkdKhoa,
      t.giayPhep ? "TRAVEL_DOMESTIC" : null, t.giayPhep ? "GP-77/2025" : null, t.giayPhep ? "GP772025" : null, t.giayPhep ? "2024-01-01" : null, t.giayPhep ? "2029-01-01" : null, AT, AT, AT);
}
const MUC_TC = ["TEN_PHAP_LY", "MA_SO_THUE", "GPKD"];
/** Xác minh phiếu có phần tổ chức bằng route thật: mọi mục (cá nhân + tổ chức) đạt, kết luận Danh bạ hai lần. */
async function xacMinhTC(w: any, id: string, hoSoToChuc: any = { kieu: "MOI" }, hoSo: any = { kieu: "MOI" }) {
  for (const m of [...MUC, ...MUC_TC]) assert.equal((await ketLuan(w, ADM, id, { muc: m, dat: true })).status, 200, m);
  const r = await dat(w, ADM, id, { hoSo, hoSoToChuc });
  assert.equal(r.status, 200, r.text);
}
function toChucCoSan(w: any, id: string, o: { ten?: string; mst?: string | null; tenPhapLy?: string | null; gpkdKhoa?: string } = {}): string {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, o.ten ?? "Tổ Chức Có Sẵn", AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(id, o.tenPhapLy ?? null, o.mst ?? null, AT, AT);
  if (o.gpkdKhoa) w.sqlite.prepare("INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES (?, ?, 'GPKD', ?, ?, ?, ?)").run(`gpkd-${id}`, id, o.gpkdKhoa, o.gpkdKhoa, AT, AT);
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
// Giao diện luôn gửi `phienBan` (bắt buộc từ Task 12): mặc định 1 như ket-luan / dat; bài muốn thử thiếu hay sai thì truyền thẳng thân qua `w.call`.
const duyet = (w: any, as: string, id: string, body: any = { roleCode: "TRAVEL_AGENCY" }) => w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as, body: { phienBan: 1, ...body } });
const tuChoiDuyet = (w: any, as: string, id: string, body: any = { lyDo: "KHONG_THUOC_DIEN" }) => w.call("POST", `/api/dang-ky/phieu/${id}/tu-choi-duyet`, { as, body: { phienBan: 1, ...body } });
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
/** Kích hoạt THẬT (ADR-0207 Đ7; Task 9): gieo một mã email mới băm đúng như route xin mã, rồi người được duyệt đặt PIN bằng cookie đăng ký qua route `dat-pin`. */
async function kichHoatThat(w: any, id: string, pin = "246813") {
  const ident = `ident-${id}`;
  const email = w.q("SELECT subject FROM dk_identity WHERE id = ?", ident)[0].subject;
  const maId = crypto.randomUUID();
  const emailKey = await khoaBam(SECRET, "email", email);
  const now = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")
    .run(maId, emailKey, await khoaBam(SECRET, "ma", `${maId}:${emailKey}:482915`), new Date(Date.now() + 600_000).toISOString(), now, now);
  const r = await w.call("POST", "/api/dang-ky/phieu/dat-pin", { body: { ma: "482915", pin }, headers: { cookie: `${DK_COOKIE}=${await taoPhienDangKy(SECRET, id, ident, Date.now())}` } });
  assert.equal(r.status, 200, r.text);
}

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
  // Không PIN, không mã tài khoản; chỉ trạng thái và kết quả cấp mặc định (ADR-0209 Đ3 — chưa đặt chính sách nên không áp, kèm câu lý do).
  assert.deepEqual(r.json, { trangThai: "DA_DUYET", cap: { ap: false, cap: null, lyDo: "CHUA_DAT", cau: "Loại này chưa đặt cấp." } });
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
  await kichHoatThat(w, id); // đường kích hoạt THẬT (Task 9): mã email mới + đặt PIN qua route
  assert.equal(taiKhoanMoi(w).active, 1);
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
  assert.equal(cu.json.error.code, "registration_version_changed");
  // Task 12 (mục 4): `phienBan` BẮT BUỘC ở duyet và tu-choi-duyet — thiếu hay null ⇒ 400, không ghi.
  for (const than of [{ roleCode: "TRAVEL_AGENCY" }, { roleCode: "TRAVEL_AGENCY", phienBan: null }]) {
    const r = await w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as: HR, body: than });
    assert.equal(r.status, 400, `duyet ${JSON.stringify(than)}: ${r.text}`);
  }
  for (const than of [{ lyDo: "KHONG_THUOC_DIEN" }, { lyDo: "KHONG_THUOC_DIEN", phienBan: null }]) {
    const r = await w.call("POST", `/api/dang-ky/phieu/${id}/tu-choi-duyet`, { as: HR, body: than });
    assert.equal(r.status, 400, `tu-choi-duyet ${JSON.stringify(than)}: ${r.text}`);
  }
  const tcCu = await tuChoiDuyet(w, HR, id, { lyDo: "KHONG_THUOC_DIEN", phienBan: 2 });
  assert.equal(tcCu.status, 409, tcCu.text);
  assert.equal(tcCu.json.error.code, "registration_version_changed");
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

// ---- ADR-0212 Đ3 (đợt 2 Task 2): duyệt phiếu với loại đối tác do Kế toán thêm (`LD_…`, nhóm OTHER, không sinh quyền theo vai) ----
// Loại thêm bằng route THẬT của Kế toán (cùng lô: loại vai + danh sách được hưởng + nhật ký), không gieo SQL.
async function themLoaiThat(w: any, ten = "Loại thử nghiệm"): Promise<string> {
  const r = await w.call("POST", "/api/pricing/loai-doi-tac", { as: ACC, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.loai.code as string;
}
const checkSql = (w: any, ma: string): number => {
  const c = CHECKS.find((x: any) => x.code === ma);
  assert.ok(c, ma);
  return demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all());
};

test("(24) Duyệt loại do Kế toán thêm: hồ sơ có đúng MỘT vai (loại đó), tài khoản đúng quyền Đối tác, đúng MỘT dòng chỉnh tay «ADD PARTNER»; R-DK-4 và R-LC-1c không đỏ sau kích hoạt", async () => {
  const w = setup();
  const loai = await themLoaiThat(w);
  const id = phieu(w);
  await xacMinh(w, id);
  // ô chọn vai của màn duyệt đọc danh sách do máy chủ trả, có loại vừa thêm (PF2)
  const xd = await xemDuyet(w, HR, id);
  assert.equal(xd.status, 200, xd.text);
  assert.ok(xd.json.vaiChon.some((v: any) => v.ma === loai && v.ten === "Loại thử nghiệm" && v.laLoaiDoiTac === true), "vaiChon có loại mới");
  assert.ok(xd.json.vaiChon.some((v: any) => v.ma === "TRAVEL_AGENCY" && v.laLoaiDoiTac === false), "vaiChon vẫn có vai bên ngoài sẵn có");
  const r = await duyet(w, HR, id, { roleCode: loai });
  assert.equal(r.status, 200, r.text);
  const tk = taiKhoanMoi(w);
  assert.equal(tk.active, 0);
  assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL", tk.party_id).map((x: any) => x.role_type_code), [loai]);
  assert.deepEqual(w.q("SELECT permission_type_code FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", tk.id).map((x: any) => x.permission_type_code), ["PARTNER"]);
  const dc = w.q("SELECT permission_type_code, direction, reason, created_by FROM stf_permission_adjustment WHERE staff_id = ?", tk.id).map((x: any) => ({ ...x }));
  assert.equal(dc.length, 1);
  assert.deepEqual([dc[0].permission_type_code, dc[0].direction, dc[0].created_by], ["PARTNER", "ADD", HR]);
  assert.ok(String(dc[0].reason).includes("Loại thử nghiệm") && !String(dc[0].reason).includes(DT_KHOA), "lý do không dữ liệu cá nhân");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'staff_created'")[0].detail as string;
  assert.ok(nk.includes("Loại thử nghiệm"), "nhật ký mang tên loại");
  assert.equal(checkSql(w, "R-DK-4"), 0, "R-DK-4 (tài khoản chưa kích hoạt) không đỏ");
  await kichHoatThat(w, id);
  assert.equal(checkSql(w, "R-DK-4"), 0);
  assert.equal(checkSql(w, "R-LC-1c"), 0, "R-LC-1c: tài khoản đang hoạt động giữ quyền Đối tác có hồ sơ mang vai loại đối tác");
});

test("(25) Tắt loại giữa lúc xác minh và lúc duyệt ⇒ 409 role_inactive, không dòng nào sinh; loại biến khỏi ô chọn; mã lạ và vai nội bộ vẫn 400", async () => {
  const w = setup();
  const loai = await themLoaiThat(w);
  const id = phieu(w);
  await xacMinh(w, id);
  const tat = await w.call("POST", `/api/pricing/loai-doi-tac/${loai}/tat`, { as: ACC });
  assert.equal(tat.status, 200, tat.text);
  const truoc = anh(w);
  const r = await duyet(w, HR, id, { roleCode: loai });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "role_inactive");
  assert.equal(r.json.error.message, "Loại đối tác này đã tắt. Hãy chọn loại khác hoặc từ chối phiếu.");
  assert.deepEqual(anh(w), truoc);
  assert.equal(dem1(w, "SELECT count(*) n FROM stf_permission_adjustment"), 0);
  assert.equal(reg(w, id).status, "CHO_DUYET");
  assert.equal((await xemDuyet(w, HR, id)).json.vaiChon.some((v: any) => v.ma === loai), false, "loại đã tắt không còn trong ô chọn");
  assert.equal((await duyet(w, HR, id, { roleCode: "LD_KHONG_CO" })).status, 400);
  assert.equal((await duyet(w, HR, id, { roleCode: "SALES_STAFF" })).status, 400);
  assert.equal((await duyet(w, HR, id, { roleCode: "TRAVEL_AGENCY" })).status, 200, "vai bên ngoài sẵn có vẫn duyệt được qua đường cũ");
});

test("(26) Hồ sơ có sẵn đang giữ vai nội bộ mà duyệt loại do Kế toán thêm ⇒ 409 target_mixed_group trước lô", async () => {
  const w = setup();
  const loai = await themLoaiThat(w);
  const goc = hoSoCoSan(w);
  const id = phieu(w);
  await xacMinh(w, id, ADM, { hoSo: { kieu: "CO_SAN", partyId: goc } });
  // vai nội bộ mở SAU bước xác minh (xác minh «đạt» với vai xin sẵn có đã bắt lẫn nhóm; ở đây thử cổng của lúc duyệt)
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-nb', ?, 'SALES_STAFF', NULL, '2026-01-01', ?, ?)").run(goc, AT, AT);
  const truoc = anh(w);
  const r = await duyet(w, HR, id, { roleCode: loai });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "target_mixed_group");
  assert.deepEqual(anh(w), truoc);
});

test("(27) «Lưu vai» với danh sách vai RỖNG bị route từ chối (400) — KHÔNG nới (ADR-0212 Đ3 «chưa kiểm»): quyền Đối tác, vai loại đối tác và dòng chỉnh tay giữ nguyên", async () => {
  const w = setup();
  const loai = await themLoaiThat(w);
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal((await duyet(w, HR, id, { roleCode: loai })).status, 200);
  await kichHoatThat(w, id);
  const tk = taiKhoanMoi(w);
  const quyen = () => w.q("SELECT permission_type_code p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", tk.id).map((x: any) => x.p);
  const r = await w.call("PUT", `/api/staff/${tk.id}/roles`, { as: SUP, body: { roles: [], adds: ["PARTNER"], removes: [], reason: "Loại đối tác do Kế toán thêm" } });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.message, "Chọn ít nhất một vai trò (mỗi vai trò một lần).");
  assert.deepEqual(quyen(), ["PARTNER"]);
  assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL", tk.party_id).map((x: any) => x.role_type_code), [loai], "vai loại đối tác không bị đóng");
  assert.equal(dem1(w, "SELECT count(*) n FROM stf_permission_adjustment WHERE staff_id = ? AND valid_to_at IS NULL", tk.id), 1);
  // Lưu vai với MỘT vai bên ngoài sẵn có (đường hợp lệ): vai loại đối tác KHÔNG bị đóng (`roleChangeStatements` bỏ qua dòng không phải RoleCode), quyền Đối tác còn nhờ dòng chỉnh tay
  const r2 = await w.call("PUT", `/api/staff/${tk.id}/roles`, { as: SUP, body: { roles: ["TRAVEL_AGENCY"], adds: ["PARTNER"], removes: [], reason: "Loại đối tác do Kế toán thêm" } });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL ORDER BY 1", tk.party_id).map((x: any) => x.role_type_code).sort(), [loai, "TRAVEL_AGENCY"].sort());
  assert.deepEqual(quyen(), ["PARTNER"]);
  assert.equal(checkSql(w, "R-LC-1c"), 0);
});

// ===== Lô duyệt có phần tổ chức (ADR-0212 Đ6; đợt 2 Task 7) =====

test("(28) Duyệt phiếu có phần tổ chức MỚI: đúng một hồ sơ tổ chức (giá trị pháp lý), vai của tổ chức, dòng GPKD, liên hệ điện thoại của tổ chức, dòng xác minh tổ chức (người + giờ xác minh), đúng một «Người liên hệ của», không «người quản lý»; hồ sơ người không có dòng xác minh mục tổ chức (PF5); ảnh GPKD về hồ sơ tổ chức, không bao giờ về hồ sơ người", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  const cccd = await tep(w, id);
  const anhGpkd = await tep(w, id, "GPKD");
  await xacMinhTC(w, id);
  const xm = reg(w, id);
  const truoc = anh(w);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(anh(w).party - truoc.party, 2, "một hồ sơ người + một hồ sơ tổ chức");
  const tk = taiKhoanMoi(w);
  const orgs = w.q("SELECT p.id, p.display_name, o.legal_name, o.tax_code, o.address, o.invoice_email FROM pty_party p JOIN pty_organization o ON o.party_id = p.id WHERE p.created_at = (SELECT decided_at FROM dk_registration WHERE id = ?)", id);
  assert.equal(orgs.length, 1);
  const org = orgs[0];
  assert.deepEqual({ ...org, id: undefined }, { id: undefined, display_name: TO_CHUC.ten, legal_name: TO_CHUC.tenPhapLy, tax_code: TO_CHUC.mst, address: "5 Trần Phú, Nha Trang", invoice_email: "hoadon@bienxanh.example" });
  assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL", org.id).map((x: any) => x.role_type_code), ["TRAVEL_AGENCY"]);
  const gp = w.q("SELECT id, document_type_code, number_key, previous_id FROM pty_organization_document WHERE party_id = ?", org.id);
  assert.deepEqual(gp.map((x: any) => [x.document_type_code, x.number_key, x.previous_id]), [["GPKD", TO_CHUC.gpkdKhoa, null]]);
  assert.deepEqual(w.q("SELECT contact_kind_code, value_normalized FROM pty_contact_point WHERE party_id = ?", org.id).map((x: any) => [x.contact_kind_code, x.value_normalized]), [["PHONE", "0258381234"]]);
  const v = w.q("SELECT target_kind, target_id, attribute_code, created_by, created_at FROM pty_verification WHERE party_id = ? ORDER BY target_kind, attribute_code", org.id).map((x: any) => ({ ...x }));
  assert.deepEqual(v, [
    { target_kind: "ATTRIBUTE", target_id: null, attribute_code: "MA_SO_THUE", created_by: ADM, created_at: xm.verified_at },
    { target_kind: "ATTRIBUTE", target_id: null, attribute_code: "TEN_PHAP_LY", created_by: ADM, created_at: xm.verified_at },
    { target_kind: "ORG_DOCUMENT", target_id: gp[0].id, attribute_code: null, created_by: ADM, created_at: xm.verified_at },
  ]);
  assert.deepEqual(w.q("SELECT attribute_code FROM pty_verification WHERE party_id = ? AND target_kind = 'ATTRIBUTE' ORDER BY attribute_code", tk.party_id).map((x: any) => x.attribute_code), ["HO_TEN", "NGAY_SINH"], "PF5: hồ sơ người chỉ mục cá nhân");
  const qh = w.q("SELECT from_party_id, to_party_id, relationship_type_code FROM pty_party_relationship WHERE to_party_id = ? OR from_party_id = ?", org.id, org.id).map((x: any) => ({ ...x }));
  assert.deepEqual(qh, [{ from_party_id: tk.party_id, to_party_id: org.id, relationship_type_code: "CONTACT_OF" }], "đúng một «Người liên hệ của», không quan hệ nào khác");
  // Ảnh: GPKD về hồ sơ tổ chức (nối dòng GPKD); CCCD về hồ sơ người. Không ảnh tổ chức nào trên hồ sơ người.
  const tepTC = w.q("SELECT a.id, a.party_id, l.target_kind, l.target_id FROM pty_attachment a JOIN pty_attachment_link l ON l.attachment_id = a.id WHERE a.id = ?", anhGpkd.id).map((x: any) => ({ ...x }));
  assert.deepEqual(tepTC, [{ id: anhGpkd.id, party_id: org.id, target_kind: "ORG_DOCUMENT", target_id: gp[0].id }]);
  assert.equal(w.q("SELECT party_id FROM pty_attachment WHERE id = ?", cccd.id)[0].party_id, tk.party_id);
  assert.equal(dem1(w, "SELECT count(*) n FROM pty_attachment a JOIN pty_registration_attachment r ON r.id = a.id WHERE a.party_id = ? AND r.slot IN ('GPKD', 'GIAY_PHEP_THEM')", tk.party_id), 0);
  assert.equal(w.r2.co(anhGpkd.key), true);
  // Phần tổ chức của bản khai đúng khuôn ẩn danh; nhật ký và lịch sử không chứa mã số thuế, số GPKD.
  const o = w.q("SELECT * FROM dk_submission_org WHERE registration_id = ?", id)[0];
  assert.ok(o.erased_at);
  assert.equal(o.display_name, "(đã ẩn)");
  for (const c of ["legal_name", "address", "invoice_email", "phone_value", "gpkd_issued_place"]) assert.equal(o[c], null, c);
  assert.ok(String(o.tax_code).startsWith("XOA") && String(o.gpkd_number).startsWith("XOA") && String(o.gpkd_key).startsWith("XOA"));
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'staff_created'")[0].detail;
  assert.match(nk, /kèm hồ sơ tổ chức mới/);
  const chu = JSON.stringify([...w.q("SELECT detail FROM audit_log"), ...w.q("SELECT * FROM dk_event")]);
  for (const lo of [TO_CHUC.mst!, TO_CHUC.gpkd, TO_CHUC.gpkdKhoa, "0258381234", TO_CHUC.ten]) assert.equal(chu.includes(lo), false, `lộ ${lo}`);
  // Bất biến ẩn danh của phiếu đã duyệt (R-DK-5) phủ phần tổ chức: sạch.
  assert.equal(demViPham(w.sqlite, CHECKS.find((c: any) => c.code === "R-DK-5")), 0);
});

test("(29) Gắn tổ chức CÓ SẴN: không hồ sơ tổ chức mới, có «Người liên hệ của», không «người quản lý»; cột pháp lý đã có không bị ghi đè (chỉ điền chỗ trống); dòng GPKD là dòng gia hạn; ảnh GPKD về hồ sơ tổ chức có sẵn; màn duyệt nói văn phòng giao người quản lý", async () => {
  const w = setup();
  const coSan = toChucCoSan(w, "org-co-san", { ten: "Biển Xanh Có Sẵn", tenPhapLy: "Tên Pháp Lý Cũ", gpkdKhoa: TO_CHUC.gpkdKhoa });
  const id = phieu(w, { toChuc: {} });
  const anhGpkd = await tep(w, id, "GPKD");
  await xacMinhTC(w, id, { kieu: "CO_SAN", partyId: coSan });
  const xd = await xemDuyet(w, HR, id);
  assert.equal(xd.status, 200, xd.text);
  assert.equal(xd.json.ketLuanDanhBaToChuc.kieu, "EXISTING");
  assert.match(xd.json.ketLuanDanhBaToChuc.ghiChu, /văn phòng sẽ giao người quản lý/);
  assert.equal(xd.text.includes("Biển Xanh Có Sẵn"), false, "Nhân sự không thấy tên hồ sơ tổ chức");
  assert.deepEqual(xd.json.mucToChuc.map((m: any) => m.ma).sort(), [...MUC_TC].sort());
  const truoc = anh(w);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(anh(w).party - truoc.party, 1, "chỉ hồ sơ người mới");
  const tk = taiKhoanMoi(w);
  assert.deepEqual({ ...w.q("SELECT legal_name, tax_code, address FROM pty_organization WHERE party_id = ?", coSan)[0] }, { legal_name: "Tên Pháp Lý Cũ", tax_code: TO_CHUC.mst, address: "5 Trần Phú, Nha Trang" }, "giữ tên pháp lý cũ, điền mã số thuế và địa chỉ đang trống");
  const gp = w.q("SELECT id, previous_id FROM pty_organization_document WHERE party_id = ? ORDER BY created_at", coSan);
  assert.equal(gp.length, 2);
  assert.equal(gp[1].previous_id, `gpkd-${coSan}`, "dòng gia hạn");
  // Tên pháp lý khai khác tên đang có ⇒ không khẳng định TEN_PHAP_LY; MA_SO_THUE (vừa điền) và GPKD (dòng mới) thì có.
  assert.deepEqual(w.q("SELECT target_kind k, attribute_code a FROM pty_verification WHERE party_id = ? ORDER BY target_kind, attribute_code", coSan).map((x: any) => [x.k, x.a]), [["ATTRIBUTE", "MA_SO_THUE"], ["ORG_DOCUMENT", null]]);
  assert.deepEqual(w.q("SELECT from_party_id, relationship_type_code FROM pty_party_relationship WHERE to_party_id = ?", coSan).map((x: any) => [x.from_party_id, x.relationship_type_code]), [[tk.party_id, "CONTACT_OF"]]);
  assert.equal(w.q("SELECT party_id FROM pty_attachment WHERE id = ?", anhGpkd.id)[0].party_id, coSan);
  assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'staff_created'")[0].detail, /gắn tổ chức có sẵn/);
});

test("(30) PF7: người đăng ký (hồ sơ có sẵn) đã có «Người liên hệ của» mở tới tổ chức có sẵn đó ⇒ lô vẫn chạy, không dòng thứ hai; dòng đã đóng HÔM NAY cũng không làm hỏng lô", async () => {
  for (const dong of [false, true]) {
    const w = setup();
    const nguoi = hoSoCoSan(w, `pty-ng-${dong}`, "Phạm Thử Nghiệm");
    const coSan = toChucCoSan(w, `org-${dong}`);
    const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES ('qh-cu', ?, ?, 'CONTACT_OF', '2026-01-01', ?, ?, ?)")
      .run(nguoi, coSan, dong ? homNay : null, AT, AT);
    const id = phieu(w, { toChuc: {} });
    await tep(w, id, "GPKD");
    await xacMinhTC(w, id, { kieu: "CO_SAN", partyId: coSan }, { kieu: "CO_SAN", partyId: nguoi });
    const r = await duyet(w, HR, id);
    assert.equal(r.status, 200, `${dong}: ${r.text}`);
    assert.equal(dem1(w, "SELECT count(*) n FROM pty_party_relationship WHERE from_party_id = ? AND to_party_id = ?", nguoi, coSan), 1, `${dong}: không dòng thứ hai`);
  }
});

test("(31) Giả lỗi ở câu giữa phần tổ chức (dòng xác minh tổ chức) ⇒ không còn dòng nào: không hồ sơ tổ chức, không giấy tờ, không quan hệ, ảnh chưa chuyển, bản khai chưa ẩn danh", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  const anhGpkd = await tep(w, id, "GPKD");
  await xacMinhTC(w, id);
  const truoc = { ...anh(w), org: dem1(w, "SELECT count(*) n FROM pty_organization"), gt: dem1(w, "SELECT count(*) n FROM pty_organization_document") };
  w.sqlite.exec("CREATE TEMP TRIGGER thu_hong_xm_tc BEFORE INSERT ON pty_verification WHEN NEW.target_kind = 'ORG_DOCUMENT' BEGIN SELECT RAISE(ABORT, 'gia_loi_giua_lo'); END");
  const r = await duyet(w, HR, id);
  assert.notEqual(r.status, 200);
  assert.equal(r.text.includes("gia_loi_giua_lo"), false);
  w.sqlite.exec("DROP TRIGGER thu_hong_xm_tc");
  assert.deepEqual({ ...anh(w), org: dem1(w, "SELECT count(*) n FROM pty_organization"), gt: dem1(w, "SELECT count(*) n FROM pty_organization_document") }, truoc);
  assert.equal(w.q("SELECT transferred_at FROM pty_registration_attachment WHERE id = ?", anhGpkd.id)[0].transferred_at, null);
  assert.equal(w.q("SELECT erased_at FROM dk_submission_org WHERE registration_id = ?", id)[0].erased_at, null);
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

test("(32) GPKD đã thuộc tổ chức khác (xuất hiện SAU bước xác minh) ⇒ 409 trước lô, câu không nhắc số; lưới cuối là trigger: bỏ kiểm trước (lô chạy) vẫn 409 không lỗi thô", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  await tep(w, id, "GPKD");
  await xacMinhTC(w, id);
  toChucCoSan(w, "org-khac", { gpkdKhoa: TO_CHUC.gpkdKhoa });
  const truoc = anh(w);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "org_gpkd_other_org");
  assert.equal(r.text.includes(TO_CHUC.gpkdKhoa) || r.text.includes(TO_CHUC.gpkd), false);
  assert.deepEqual(anh(w), truoc);
  // Đua: dòng GPKD của tổ chức khác chèn NGAY TRƯỚC lô (sau kiểm của route) ⇒ trigger làm hỏng cả lô, 409.
  w.sqlite.exec("UPDATE pty_organization_document SET voided_at = '2026-11-16T00:00:00.000Z' WHERE party_id = 'org-khac'");
  w.chenTruocLo((stmts: any[]) => stmts.some((s: any) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    w.sqlite.prepare("INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('gpkd-dua', 'org-khac', 'GPKD', ?, ?, ?, ?)").run(TO_CHUC.gpkdKhoa, TO_CHUC.gpkdKhoa, AT, AT);
  });
  const r2 = await duyet(w, HR, id);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "org_gpkd_other_org");
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

test("(33) Phiếu có phần tổ chức không được duyệt: ảnh GPKD nhận quyết gỡ cùng lô từ chối (khuôn ADR-0208), kho xoá sau", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  const anhGpkd = await tep(w, id, "GPKD");
  await xacMinhTC(w, id);
  const r = await tuChoiDuyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  const t = w.q("SELECT purged_at, transferred_at FROM pty_registration_attachment WHERE id = ?", anhGpkd.id)[0];
  assert.ok(t.purged_at);
  assert.equal(t.transferred_at, null);
  assert.equal(w.r2.co(anhGpkd.key), false);
});

test("(34) Giấy phép thêm: dòng giấy tờ tổ chức thứ hai, ảnh ô GIAY_PHEP_THEM nối đúng dòng đó; vai của tổ chức có cấp mặc định ⇒ cấp riêng trên HỒ SƠ TỔ CHỨC (ADR-0209 Đ3)", async () => {
  const w = setup();
  // Cấp mặc định cho Công ty lữ hành (đường route thật của Kế toán + Toàn quyền).
  const muc = (await w.call("POST", "/api/pricing/muc-ta", { as: ACC, body: { ten: "TA1" } })).json.muc.code;
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${muc}/dong`, { as: ACC, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp: 1000 } })).status, 201);
  assert.equal((await w.call("POST", "/api/pricing/muc-ta/gan", { as: ACC, body: { loai: "TRAVEL_AGENCY", muc, tuNgay: "2026-01-01" } })).status, 201);
  const cs = (await w.call("GET", "/api/pricing/cap-mac-dinh", { as: SUP })).json.loai.find((l: any) => l.code === "TRAVEL_AGENCY")?.hienHanh?.id ?? null;
  const dcs = await w.call("POST", "/api/pricing/cap-mac-dinh", { as: SUP, body: { loai: "TRAVEL_AGENCY", muc, dangHieuLuc: cs } });
  assert.ok(dcs.status === 200 || dcs.status === 201, dcs.text);
  await new Promise((r) => setTimeout(r, 5));
  const id = phieu(w, { toChuc: { giayPhep: true } });
  const anhGp = await tep(w, id, "GIAY_PHEP_THEM");
  await tep(w, id, "GPKD");
  await xacMinhTC(w, id);
  const r = await duyet(w, HR, id);
  assert.equal(r.status, 200, r.text);
  const org = w.q("SELECT party_id FROM pty_organization_document WHERE document_type_code = 'TRAVEL_DOMESTIC'")[0].party_id;
  const gp = w.q("SELECT id, number_key, expiry_date FROM pty_organization_document WHERE party_id = ? AND document_type_code = 'TRAVEL_DOMESTIC'", org)[0];
  assert.deepEqual([gp.number_key, gp.expiry_date], ["GP772025", "2029-01-01"]);
  assert.deepEqual(w.q("SELECT a.party_id, l.target_id FROM pty_attachment a JOIN pty_attachment_link l ON l.attachment_id = a.id WHERE a.id = ?", anhGp.id).map((x: any) => [x.party_id, x.target_id]), [[org, gp.id]]);
  const tk = taiKhoanMoi(w);
  assert.deepEqual(w.q("SELECT tier_code FROM prc_party_tier WHERE party_id = ?", org).map((x: any) => x.tier_code), [muc], "cấp riêng trên hồ sơ tổ chức");
  assert.deepEqual(w.q("SELECT tier_code FROM prc_party_tier WHERE party_id = ?", tk.party_id).map((x: any) => x.tier_code), [muc], "hồ sơ người vẫn có cấp của mình");
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'prc_party_tier_set' AND target_id = ?", org), 1);
});
