// Bước XÁC MINH phiếu đăng ký đối tác qua route thật (tests/audit/harness.mjs, SQLite thật, kho R2 giả) — ADR-0207 Đ1–Đ3, Đ9; ADR-0208 Đ3; ADR-0210 Đ1. Mọi giá trị (số giấy tờ, SĐT, email) là GIẢ.
// Phiếu được gieo THẲNG bằng SQL ở trạng thái mong muốn (route công khai tạo phiếu thuộc task khác).
// Phá thử (P16, đã quan sát đỏ 15/11): bỏ `|| !can(ctx.staff, "party.view")` khỏi thân MỘT route ở index.ts → ca (1) đỏ (Nhân sự qua được) và bài route-write-guard (cổng accounts) đỏ;
// bỏ điều kiện `json_each` ở `DAT_CAP` → ca (4b) đỏ; mở kho TRƯỚC khi ghi nhật ký ở `moTep` → ca (9b) đỏ; bỏ `AND changes() > 0` ở câu gỡ tệp có điều kiện → ca (10b) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauLyDoChoNguoiDangKy } from "../../shared/dang-ky-hien-thi.ts";
import { boSungStatement, datStatement, ketLuanMucStatement, lyDoCuaPhieu, suKienNhanVienStatement } from "./repository.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "33333333-3333-4333-8333-333333333332";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const HR = "99999999-9999-4999-8999-999999999999";
const AT = "2026-11-10T00:00:00.000Z";
const SO = "079 000 000 111";
const KHOA_SO = "079000000111";
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
  them(ADM2, "0900000004", "Quản Trị Hai", ["ADMIN"]);
  them(SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]);
  them(PARTNER, "0900000010", "Đối Tác Một", ["PARTNER"]);
  them(HR, "0900000013", "Nhân Sự", ["HR"]);
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  return w;
}
const DUONG: Record<string, string[]> = { DA_DUYET: ["CHO_XAC_MINH", "CHO_DUYET", "DA_DUYET"], DANG_DIEN: [], CHO_XAC_MINH: ["CHO_XAC_MINH"], CAN_BO_SUNG: ["CHO_XAC_MINH", "CAN_BO_SUNG"], CHO_DUYET: ["CHO_XAC_MINH", "CHO_DUYET"], TU_CHOI: ["CHO_XAC_MINH", "TU_CHOI"] };
/** Gieo phiếu cá nhân đã gửi bản khai 1 rồi đưa tới `trangThai` theo đường hợp lệ của trigger. */
function phieu(w: any, o: { id?: string; trangThai?: string; so?: string | null; hoTen?: [string, string]; dienThoai?: string } = {}): string {
  const id = o.id ?? `DK_${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(dem % 18, (dem % 18) + 8)}`;
  dem++;
  const so = o.so === undefined ? SO : o.so;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'TRAVEL_AGENCY', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, 'khach@example.com', ?, ?)").run(`ident-${id}`, id, `khach-${id}@example.com`, AT, AT);
  const [ho, ten] = o.hoTen ?? ["Phạm", "Thử Nghiệm"];
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, ?, ?, '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, ?, ?, ?, '2021-01-02', 'Cục thử', '2040-01-02', (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`)
    .run(`sub-${id}`, id, ho, ten, o.dienThoai ?? "0912 345 678", (o.dienThoai ?? "0912345678").replace(/\s/g, ""), so ? "CCCD" : null, so, so ? KHOA_SO : null, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  for (const t of DUONG[o.trangThai ?? "CHO_XAC_MINH"] ?? []) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, id);
  return id;
}
/** Tệp chờ đã lưu (dòng + byte trong kho giả). */
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
const reg = (w: any, id: string) => w.q("SELECT * FROM dk_registration WHERE id = ?", id)[0];
const events = (w: any, id: string): any[] => w.q("SELECT actor_kind, actor_ref, command, reason_code FROM dk_event WHERE registration_id = ? ORDER BY created_at, rowid", id).map((x: any) => ({ ...x }));
const audits = (w: any, action?: string): any[] => w.q(`SELECT staff_id, action, target_type, target_id, detail FROM audit_log WHERE action LIKE 'registration_%'${action ? " AND action = ?" : ""} ORDER BY created_at, rowid`, ...(action ? [action] : [])).map((x: any) => ({ ...x }));
// `phienBan` mặc định 1 (bản khai người xác minh đã xem); bài tab cũ truyền số khác (hoặc `phienBan: undefined` để thử thiếu).
const ketLuan = (w: any, as: string, id: string, body: any) => w.call("POST", `/api/dang-ky/phieu/${id}/ket-luan`, { as, body: { phienBan: 1, ...body } });
const dat = (w: any, as: string, id: string, body: any = {}) => w.call("POST", `/api/dang-ky/phieu/${id}/dat`, { as, body: { phienBan: 1, ...body } });
const boSung = (w: any, as: string, id: string, body: unknown = { lyDo: "KHONG_DOC_DUOC" }) => w.call("POST", `/api/dang-ky/phieu/${id}/bo-sung`, { as, body });
const tuChoi = (w: any, as: string, id: string, body: unknown = { lyDo: "KHONG_THUOC_DIEN" }) => w.call("POST", `/api/dang-ky/phieu/${id}/tu-choi`, { as, body });
const xemSo = (w: any, as: string, id: string) => w.call("POST", `/api/dang-ky/phieu/${id}/xem-so`, { as });
const chiTiet = (w: any, as: string, id: string) => w.call("GET", `/api/dang-ky/phieu/${id}`, { as });
const mo = (w: any, as: string, id: string, tid: string) => w.call("GET", `/api/dang-ky/phieu/${id}/tep/${tid}`, { as });
async function datHetMuc(w: any, as: string, id: string) {
  for (const m of MUC) assert.equal((await ketLuan(w, as, id, { muc: m, dat: true })).status, 200, m);
}

test("(1) Quyền: Nhân sự gọi ket-luan, xem-so, tep, chi tiết, ba lệnh kết thúc ⇒ 403; Bán hàng, Kế toán, Đối tác gọi bất kỳ ⇒ 403; không đổi dòng nào", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  const goi = (as: string) => [
    () => ketLuan(w, as, id, { muc: "HO_TEN", dat: true }), () => xemSo(w, as, id), () => mo(w, as, id, t.id), () => chiTiet(w, as, id), () => dat(w, as, id, { hoSo: { kieu: "MOI" } }),
    () => boSung(w, as, id), () => tuChoi(w, as, id), () => w.call("GET", "/api/dang-ky/hang-cho", { as }),
  ];
  for (const as of [HR, SALES, ACC, PARTNER]) {
    const kq: any[] = [];
    for (const f of goi(as)) kq.push(await f()); // tuần tự: khung thử cấp phiên một lần cho mỗi tài khoản
    const hangCho = kq.pop()!;
    for (const r of kq) assert.equal(r.status, 403, `${as}: ${r.text}`);
    // Hàng chờ: Nhân sự được xem (dạng thu hẹp); ba vai kia 403.
    assert.equal(hangCho.status, as === HR ? 200 : 403, hangCho.text);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(w.q("SELECT count(*) n FROM dk_item_result")[0].n, 0);
  assert.equal(events(w, id).length, 0);
  assert.equal(audits(w).length, 0);
  assert.equal(w.r2.soLan.get, 0, "không chạm kho");
  // Quản trị và Toàn quyền qua cổng.
  for (const as of [ADM, SUP]) {
    assert.equal((await chiTiet(w, as, id)).status, 200);
    assert.equal((await w.call("GET", "/api/dang-ky/hang-cho", { as })).status, 200);
  }
});

test("(2) Hàng chờ: Quản trị, Toàn quyền thấy mọi phiếu chưa kết thúc; Nhân sự thấy CHỜ DUYỆT và ĐÃ DUYỆT chưa kích hoạt (ADR-0207 Đ4, Đ7), không tên, không liên hệ", async () => {
  const w = setup();
  const a = phieu(w, { trangThai: "CHO_XAC_MINH" });
  const b = phieu(w, { trangThai: "CAN_BO_SUNG" });
  const c = phieu(w, { trangThai: "CHO_DUYET" });
  const d = phieu(w, { trangThai: "TU_CHOI" });
  const e = phieu(w, { trangThai: "DANG_DIEN" });
  const f = phieu(w, { trangThai: "DA_DUYET" }); // đã duyệt, chưa kích hoạt: Nhân sự theo dõi
  const g = phieu(w, { trangThai: "DA_DUYET" });
  w.sqlite.prepare("UPDATE dk_registration SET activated_at = ? WHERE id = ?").run(AT, g); // đã kích hoạt: không còn ở hàng chờ
  const ids = async (as: string) => (await w.call("GET", "/api/dang-ky/hang-cho", { as })).json.phieu.map((x: any) => x.id).sort();
  assert.deepEqual(await ids(ADM), [a, b, c, e].sort());
  assert.deepEqual(await ids(SUP), [a, b, c, e, f].sort(), "Toàn quyền: xác minh được + có account.create ⇒ hợp (có cả ĐÃ DUYỆT chưa kích hoạt)");
  assert.deepEqual(await ids(HR), [c, f].sort());
  const r = await w.call("GET", "/api/dang-ky/hang-cho", { as: HR });
  for (const lo of ["Phạm", "Thử Nghiệm", "0912", "khach@", "079", d, g]) assert.equal(boUuid(r.text).includes(lo), false, `lộ ${lo}`);
});

test("(3) «đạt» khi còn mục chưa đạt ⇒ 409; mục «không đạt» ⇒ 409; đủ mục nhưng chưa có kết luận Danh bạ ⇒ 409; không đổi trạng thái", async () => {
  const w = setup();
  const id = phieu(w);
  const r0 = await dat(w, ADM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(r0.status, 409, r0.text);
  assert.equal(r0.json.error.code, "items_not_passed");
  for (const m of MUC) assert.ok(r0.json.error.message.length > 0 && m);
  // đủ mục trừ một: vẫn 409
  for (const m of MUC.slice(1)) assert.equal((await ketLuan(w, ADM, id, { muc: m, dat: true })).status, 200);
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  // mục đầu «không đạt» (kết luận mới nhất): 409; rồi sửa thành «đạt»: qua
  assert.equal((await ketLuan(w, ADM, id, { muc: MUC[0], dat: false, lyDo: "KHONG_LIEN_LAC_DUOC" })).status, 200);
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  assert.equal((await ketLuan(w, ADM, id, { muc: MUC[0], dat: true })).status, 200);
  // chưa có kết luận Danh bạ
  const r1 = await dat(w, ADM, id, {});
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "registry_conclusion_missing");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id).verified_by, null);
});

test("(4) «đạt» thành công: CHO_DUYET, ghi người xác minh + bản khai + hồ sơ mới; lịch sử và nhật ký không mang số, tên, liên hệ", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, ADM, id);
  const r = await dat(w, ADM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(r.status, 200, r.text);
  const p = reg(w, id);
  assert.equal(p.status, "CHO_DUYET");
  assert.equal(p.verified_by, ADM);
  assert.equal(p.verified_version, 1);
  assert.ok(p.verified_at);
  assert.equal(p.match_kind, "NEW");
  assert.equal(p.match_party_id, null);
  assert.deepEqual(events(w, id).map((x) => x.command), ["KET_LUAN", "KET_LUAN", "KET_LUAN", "KET_LUAN", "KET_LUAN", "DAT"]);
  assert.equal(audits(w, "registration_verified").length, 1);
  const rac = boUuid(JSON.stringify([w.q("SELECT * FROM dk_event WHERE registration_id = ?", id), audits(w), w.q("SELECT * FROM audit_log WHERE action LIKE 'registration_%'")])); // che UUID: id ngẫu nhiên có thể tình cờ chứa «0912»
  for (const lo of [SO, KHOA_SO, "0912", "khach@", "Phạm", "Thử Nghiệm", "Đường Thử", "1990-05-06"]) assert.equal(rac.includes(lo), false, `lộ ${lo}`);
  // đã chuyển bước ⇒ bấm lại: 409, không ghi thêm
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  assert.equal(events(w, id).length, 6);
});

test("(5) Kết luận Danh bạ «gắn hồ sơ có sẵn»: hồ sơ đã có tài khoản / hồ sơ tổ chức / không có ⇒ 409; hồ sơ cá nhân hợp lệ ⇒ ghi match_party_id; có thể gửi kết luận trước rồi «đạt» sau", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, ADM, id);
  const caNhan = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Có Sẵn", contacts: [] } })).json.party.id as string;
  const toChuc = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", legalName: "Công Ty Thử", displayName: "Công Ty Thử", contacts: [] } })).json?.party?.id as string | undefined;
  for (const partyId of [`pty-${SALES}`, "khong-co-ho-so", ...(toChuc ? [toChuc] : [])]) {
    const r = await dat(w, ADM, id, { hoSo: { kieu: "CO_SAN", partyId } });
    assert.equal(r.status, 409, `${partyId}: ${r.text}`);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "CO_SAN", partyId: caNhan } })).status, 200);
  const p = reg(w, id);
  assert.equal(p.match_kind, "EXISTING");
  assert.equal(p.match_party_id, caNhan);
});

test("(5b) Thân sai: ô lạ, hoSo sai kiểu, lý do ngoài danh sách đóng, mục lạ, người giới thiệu (chưa lưu được) ⇒ lỗi rõ, không ghi", async () => {
  const w = setup();
  const id = phieu(w);
  assert.equal((await ketLuan(w, ADM, id, { muc: "KHONG_CO", dat: true })).status, 400);
  assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: false })).status, 400, "không đạt phải kèm lý do");
  assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: false, lyDo: "HO_SO_DA_GOP" })).status, 400, "mã bỏ khỏi danh sách chín mã");
  assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: true, lyDo: "KHONG_DOC_DUOC" })).status, 400, "đạt không kèm lý do");
  assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: true, ghiChu: "x" })).status, 400);
  assert.equal((await boSung(w, ADM, id, { lyDo: "chu tu do" })).status, 400);
  assert.equal((await boSung(w, ADM, id, { lyDo: "KHONG_DOC_DUOC", ghiChu: "x" })).status, 400);
  assert.equal((await tuChoi(w, ADM, id, {})).status, 400);
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "KHAC" } })).status, 400);
  await datHetMuc(w, ADM, id);
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: "pty-x" })).status, 409);
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal((await w.call("GET", "/api/dang-ky/phieu/khong-phai-ma", { as: ADM })).status, 404);
  assert.equal((await ketLuan(w, ADM, "DK_ZZZZZZZZ", { muc: "HO_TEN", dat: true })).status, 404);
});

test("(6) «bổ sung»: CAN_BO_SUNG + lý do; người đăng ký thấy câu lý do trung tính cho mã trùng; lịch sử + nhật ký", async () => {
  const w = setup();
  const id = phieu(w);
  const r = await boSung(w, ADM, id, { lyDo: "KHONG_DOC_DUOC" });
  assert.equal(r.status, 200, r.text);
  const row = await lyDoCuaPhieu(w.env.DB, id);
  assert.equal(row?.status, "CAN_BO_SUNG");
  assert.equal(row?.reason_code, "KHONG_DOC_DUOC");
  assert.equal(cauLyDoChoNguoiDangKy(row!.reason_code), "Ảnh hoặc thông tin không đọc được. Vui lòng gửi lại bản rõ hơn.");
  assert.deepEqual(events(w, id), [{ actor_kind: "STAFF", actor_ref: ADM, command: "BO_SUNG", reason_code: "KHONG_DOC_DUOC" }]);
  assert.equal(audits(w, "registration_supplement_requested").length, 1);
  // mã «số giấy tờ đã thuộc hồ sơ khác» hiện cho người ngoài bằng câu KHÔNG nói «đã có tài khoản»
  const cau = cauLyDoChoNguoiDangKy("TRUNG_HO_SO_KHAC")!;
  assert.equal(cau, "Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo.");
  assert.equal(/tài khoản/i.test(cau), false);
  // không còn chờ xác minh ⇒ bấm lại 409
  assert.equal((await boSung(w, ADM, id)).status, 409);
});

test("(7) «từ chối»: TU_CHOI + tệp chờ gỡ CÙNG lô; kho xoá sau; lịch sử; hết quyền xem", async () => {
  const w = setup();
  const id = phieu(w);
  const t1 = await tep(w, id, "CCCD_MAT_TRUOC");
  const t2 = await tep(w, id, "CCCD_MAT_SAU");
  const r = await tuChoi(w, ADM, id, { lyDo: "KHONG_PHAI_CHINH_CHU" });
  assert.equal(r.status, 200, r.text);
  const p = reg(w, id);
  assert.equal(p.status, "TU_CHOI");
  assert.equal(p.reason_code, "KHONG_PHAI_CHINH_CHU");
  assert.ok(p.decided_at);
  const d = w.q("SELECT id, purged_at, purge_reason, content_hash FROM pty_registration_attachment WHERE registration_id = ?", id);
  assert.equal(d.length, 2);
  for (const x of d) { assert.ok(x.purged_at); assert.equal(x.purge_reason, "TU_CHOI"); assert.equal(x.content_hash, null); }
  assert.equal(w.r2.co(t1.key), false);
  assert.equal(w.r2.co(t2.key), false);
  assert.deepEqual(events(w, id), [{ actor_kind: "STAFF", actor_ref: ADM, command: "TU_CHOI", reason_code: "KHONG_PHAI_CHINH_CHU" }]);
  assert.equal(audits(w, "registration_rejected").length, 1);
  // danh tính đóng (trigger) và không xem lại được
  const ct = await chiTiet(w, ADM, id);
  assert.equal(ct.status, 200);
  assert.equal(ct.json.noiDung, undefined);
  assert.equal((await tuChoi(w, ADM, id)).status, 409);
});

test("(8) Xử lý xong gọi lại GET :id ⇒ không còn nội dung (hết tên, số điện thoại, ngày sinh, địa chỉ, số che, tệp)", async () => {
  const w = setup();
  const id = phieu(w);
  await tep(w, id);
  const truoc = await chiTiet(w, ADM, id);
  assert.equal(truoc.status, 200);
  assert.equal(truoc.json.noiDung.hoTen, "Phạm Thử Nghiệm");
  assert.equal(truoc.json.noiDung.giayTo.soChe.includes("111"), true);
  assert.equal(boUuid(truoc.text).includes(KHOA_SO), false, "số giấy tờ luôn che");
  assert.equal(boUuid(truoc.text).includes(SO), false);
  assert.equal(truoc.json.muc.length, MUC.length);
  assert.equal(truoc.json.tep.length, 1);
  assert.equal(truoc.headers.get("cache-control"), "no-store");
  await datHetMuc(w, ADM, id);
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" } })).status, 200);
  for (const as of [ADM, SUP]) {
    const sau = await chiTiet(w, as, id);
    assert.equal(sau.status, 200);
    assert.equal(sau.json.daXuLy, true);
    for (const lo of ["Phạm", "Thử Nghiệm", "0912", "Đường Thử", "1990-05-06", "noiDung", "soChe", "tep"]) assert.equal(boUuid(sau.text).includes(lo), false, `lộ ${lo}`);
  }
});

test("(9) Xem đủ số: nhật ký ghi TRƯỚC, không chứa số; nhật ký lỗi ⇒ không trả số; Quản trị, Toàn quyền được; đã xử lý ⇒ 403", async () => {
  const w = setup();
  const id = phieu(w);
  const r = await xemSo(w, ADM, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.so, SO);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const a = audits(w, "registration_number_viewed");
  assert.equal(a.length, 1);
  assert.equal(a[0].staff_id, ADM);
  assert.equal(a[0].detail.includes(KHOA_SO) || a[0].detail.includes(SO), false);
  // nhật ký hỏng ⇒ 500 và thân không có số
  w.sqlite.exec("CREATE TRIGGER thu_hong_nhat_ky BEFORE INSERT ON audit_log WHEN NEW.action IN ('registration_number_viewed', 'registration_file_viewed') BEGIN SELECT RAISE(ABORT, 'nhat_ky_hong'); END");
  const loi = await xemSo(w, SUP, id);
  assert.equal(loi.status, 500);
  assert.equal(loi.text.includes("079"), false);
  w.sqlite.exec("DROP TRIGGER thu_hong_nhat_ky");
  // phiếu không có số ⇒ 404
  const khongSo = phieu(w, { so: null });
  assert.equal((await xemSo(w, ADM, khongSo)).status, 404);
  // xử lý xong ⇒ 403
  assert.equal((await boSung(w, ADM, id)).status, 200);
  assert.equal((await xemSo(w, ADM, id)).status, 403);
});

test("(9b) Mở ảnh: nhật ký ghi TRƯỚC khi đọc kho; nhật ký lỗi ⇒ không trả tệp, không chạm kho; header no-store + nosniff; chỉ tệp của đúng phiếu", async () => {
  const w = setup();
  const id = phieu(w);
  const khac = phieu(w);
  const t = await tep(w, id);
  const tKhac = await tep(w, khac);
  let thayKhiGet: number | null = null;
  w.r2.khiGet = () => { thayKhiGet = audits(w, "registration_file_viewed").length; };
  const r = await mo(w, ADM, id, t.id);
  assert.equal(r.status, 200);
  assert.equal(thayKhiGet, 1, "nhật ký đã có lúc đọc kho");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual([...r.bytes], [...PNG]);
  const a = audits(w, "registration_file_viewed")[0];
  assert.equal(a.detail.includes("pty/"), false);
  w.r2.khiGet = null;
  const truoc = w.r2.soLan.get;
  // tệp phiếu khác ⇒ 404, không đọc kho
  assert.equal((await mo(w, ADM, id, tKhac.id)).status, 404);
  assert.equal(w.r2.soLan.get, truoc);
  // nhật ký hỏng ⇒ 500, không đọc kho
  w.sqlite.exec("CREATE TRIGGER thu_hong_nhat_ky BEFORE INSERT ON audit_log WHEN NEW.action = 'registration_file_viewed' BEGIN SELECT RAISE(ABORT, 'nhat_ky_hong'); END");
  const loi = await mo(w, SUP, id, t.id);
  assert.equal(loi.status, 500);
  assert.equal(w.r2.soLan.get, truoc, "không đọc kho khi nhật ký lỗi");
  w.sqlite.exec("DROP TRIGGER thu_hong_nhat_ky");
  // gọi chéo trang ⇒ 403; sau khi xử lý ⇒ 403
  assert.equal((await w.call("GET", `/api/dang-ky/phieu/${id}/tep/${t.id}`, { as: ADM, headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await tuChoi(w, ADM, id)).status, 200);
  assert.equal((await mo(w, ADM, id, t.id)).status, 403);
});

test("(10) Đua: hai người cùng xử lý — chỉ một thắng; bên thua 409 và KHÔNG gỡ tệp của phiếu đã được bên kia chuyển bước", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  assert.equal((await boSung(w, ADM, id)).status, 200);
  // phiếu đã sang CAN_BO_SUNG: «từ chối» của người còn mở trang cũ ⇒ 409; tệp còn nguyên
  const r = await tuChoi(w, ADM2, id);
  assert.equal(r.status, 409, r.text);
  const d = w.q("SELECT purged_at FROM pty_registration_attachment WHERE id = ?", t.id)[0];
  assert.equal(d.purged_at, null);
  assert.equal(w.r2.co(t.key), true);
  assert.equal(reg(w, id).status, "CAN_BO_SUNG");
  assert.equal(events(w, id).length, 1);
});

test("(10b) Lô «từ chối» khi câu đổi trạng thái trúng 0 dòng: tệp ở lại, không dòng lịch sử (khoá điều kiện nằm TRONG lô, không chỉ ở kiểm trước)", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  const { tuChoiStatement } = await import("./repository.ts");
  const { cauGoTepChoNeuTruocDoi } = await import("../parties/tep-cho.ts");
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG' WHERE id = ?").run(id); // phiếu đã bị người khác đổi trước lô
  const at = new Date().toISOString();
  const kq = await w.env.DB.batch([
    tuChoiStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: ADM, at }),
    suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: ADM, command: "TU_CHOI", lyDo: "KHONG_DOC_DUOC", at }),
    cauGoTepChoNeuTruocDoi(w.env.DB, id, "TU_CHOI", at),
  ]);
  assert.equal(kq[0].meta.changes, 0);
  assert.equal(events(w, id).length, 0);
  assert.equal(w.q("SELECT purged_at FROM pty_registration_attachment WHERE id = ?", t.id)[0].purged_at, null);
});

test("(11) Gợi ý Danh bạ: trùng theo số điện thoại, tên và SỐ GIẤY TỜ; không lộ số điện thoại hay số của hồ sơ khác", async () => {
  const w = setup();
  const theoSo = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Khác Hẳn Tên", contacts: [] } })).json.party.id as string;
  const them = await w.call("POST", `/api/parties/${theoSo}/documents`, { as: ADM, body: { typeCode: "CCCD", number: SO, issuedDate: "2021-01-01", issuedPlace: "Cục", expiryDate: "2035-01-01" } });
  assert.equal(them.status, 201, them.text);
  const theoSdt = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Một Người Khác", contacts: [{ kind: "PHONE", value: "0912345678" }] } })).json.party.id as string;
  const theoTen = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Phạm Thử Nghiệm", contacts: [] } })).json.party.id as string;
  const id = phieu(w);
  const r = await chiTiet(w, ADM, id);
  assert.equal(r.status, 200, r.text);
  const goiY = Object.fromEntries(r.json.goiY.map((x: any) => [x.id, x.lyDo.sort()]));
  assert.deepEqual(goiY[theoSo], ["DOCUMENT"]);
  assert.deepEqual(goiY[theoSdt], ["PHONE"]);
  assert.deepEqual(goiY[theoTen], ["NAME"]);
  assert.equal(boUuid(r.text).includes(KHOA_SO), false);
});

test("(12) Ba nhãn: danh sách chín mã lý do (bảy dùng lại, bỏ «hồ sơ đã gộp», hai mã mới) và câu cho người đăng ký đủ chín", async () => {
  const w = setup();
  const id = phieu(w);
  const r = await chiTiet(w, ADM, id);
  assert.deepEqual(r.json.lyDoCoThe.map((x: any) => x.ma).sort(), [
    "CHUA_DOI_CHIEU_DUOC", "GIAY_TO_HET_HAN", "KHONG_DOC_DUOC", "KHONG_KHOP_GIAY_TO", "KHONG_LIEN_LAC_DUOC", "KHONG_PHAI_CHINH_CHU", "KHONG_THUOC_DIEN", "SAI_LOAI_GIAY_TO", "TRUNG_HO_SO_KHAC",
  ]);
  for (const x of r.json.lyDoCoThe) assert.ok(cauLyDoChoNguoiDangKy(x.ma), x.ma);
});

test("(4b) Câu «đạt» tự canh: mục chưa đạt hoặc chưa có kết luận Danh bạ thì câu đổi 0 dòng, kể cả khi kiểm trước ở route bị lách", async () => {
  const w = setup();
  const id = phieu(w);
  const at = new Date().toISOString();
  const chay = async (v: { matchKind: "NEW" | "EXISTING" | null; matchPartyId: string | null }) =>
    (await w.env.DB.batch([datStatement(w.env.DB, { registrationId: id, by: ADM, at, mucBatBuoc: MUC, phienBan: 1, ...v })]))[0].meta.changes;
  assert.equal(await chay({ matchKind: "NEW", matchPartyId: null }), 0, "chưa có kết luận mục nào");
  for (const m of MUC.slice(1)) assert.equal((await ketLuan(w, ADM, id, { muc: m, dat: true })).status, 200);
  assert.equal(await chay({ matchKind: "NEW", matchPartyId: null }), 0, "thiếu một mục");
  assert.equal((await ketLuan(w, ADM, id, { muc: MUC[0], dat: true })).status, 200);
  assert.equal(await chay({ matchKind: null, matchPartyId: null }), 0, "thiếu kết luận Danh bạ");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(await chay({ matchKind: "NEW", matchPartyId: null }), 1);
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

/** Người đăng ký gửi lại: bản khai 2, phiếu về CHỜ XÁC MINH (đi đường hợp lệ của trigger). */
function guiLai(w: any, id: string, soMoi = "079999999999") {
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG' WHERE id = ?").run(id);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, given_name, document_type_code, document_number, number_key, policy_id, consented_at, created_at, updated_at)
    VALUES (?, ?, 2, 'Đã Đổi', 'CCCD', ?, ?, (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`).run(`sub2-${id}`, id, soMoi, soMoi, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 2 WHERE id = ?").run(id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
}
const soDong = (w: any) => ({ ketLuan: w.q("SELECT count(*) n FROM dk_item_result")[0].n, su: w.q("SELECT count(*) n FROM dk_event")[0].n, nhatKy: audits(w).length });

test("(13) I-1: tab cũ (đã xem bản khai 1) gửi kết luận hoặc «đạt» sau khi người đăng ký gửi lại bản 2 ⇒ 409 registration_version_changed, KHÔNG ghi gì (không dòng kết luận, lịch sử, nhật ký)", async () => {
  const w = setup();
  const id = phieu(w);
  assert.equal((await chiTiet(w, ADM, id)).json.phienBan, 1);
  await datHetMuc(w, ADM, id);
  const truoc = soDong(w);
  guiLai(w, id);
  assert.equal((await chiTiet(w, ADM, id)).json.phienBan, 2);
  const r = await ketLuan(w, ADM, id, { muc: "CCCD", dat: true }); // phienBan 1 mặc định = tab cũ
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_version_changed");
  const d = await dat(w, ADM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "registration_version_changed");
  assert.deepEqual(soDong(w), truoc, "không ghi gì");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id).verified_by, null);
  // mở lại (phienBan 2): kết luận ghi vào đúng bản 2, phản hồi mang phienBan
  const ok = await ketLuan(w, ADM, id, { muc: "CCCD", dat: true, phienBan: 2 });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.phienBan, 2);
  assert.deepEqual(w.q("SELECT version FROM dk_item_result ORDER BY rowid DESC LIMIT 1").map((x: any) => x.version), [2]);
  // thiếu phienBan hoặc sai kiểu ⇒ 400
  for (const pb of [undefined, 0, 1.5, "1", null]) assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: true, phienBan: pb })).status, 400, String(pb));
  assert.equal((await dat(w, ADM, id, { hoSo: { kieu: "MOI" }, phienBan: undefined })).status, 400);
});

test("(13b) I-1: câu ghi tự canh phiên bản — kết luận và «đạt» với phienBan ≠ current_version đổi 0 dòng, kể cả khi kiểm trước ở route bị lách", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, ADM, id);
  guiLai(w, id);
  for (const m of MUC) assert.equal((await ketLuan(w, ADM, id, { muc: m, dat: true, phienBan: 2 })).status, 200, m); // bản 2 đã đủ mục «đạt»: chỉ còn phiên bản chặn
  const at = new Date().toISOString();
  const [kl, dt] = await w.env.DB.batch([
    ketLuanMucStatement(w.env.DB, { registrationId: id, item: "CCCD", dat: true, lyDo: null, by: ADM, at, phienBan: 1 }),
    datStatement(w.env.DB, { registrationId: id, by: ADM, at, matchKind: "NEW", matchPartyId: null, mucBatBuoc: MUC, phienBan: 1 }),
  ]);
  assert.equal(kl.meta.changes, 0);
  assert.equal(dt.meta.changes, 0);
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(w.q("SELECT count(*) n FROM dk_item_result WHERE version = 2")[0].n, MUC.length, "không thêm dòng nào ngoài năm kết luận bản 2");
});

test("(14) I-3: câu «kết luận» và «bổ sung» tự canh trạng thái — phiếu không ở CHO_XAC_MINH ⇒ 0 dòng, không dòng lịch sử, không nhật ký (gọi thẳng câu ghi, lách kiểm trước ở route)", async () => {
  const w = setup();
  const at = new Date().toISOString();
  for (const trangThai of ["CHO_DUYET", "CAN_BO_SUNG", "TU_CHOI"]) {
    const id = phieu(w, { trangThai });
    const truoc = soDong(w);
    const [kl, su1, bs, su2] = await w.env.DB.batch([
      ketLuanMucStatement(w.env.DB, { registrationId: id, item: "HO_TEN", dat: true, lyDo: null, by: ADM, at, phienBan: 1 }),
      suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: ADM, command: "KET_LUAN", lyDo: null, at }),
      boSungStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: ADM, at }),
      suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: ADM, command: "BO_SUNG", lyDo: "KHONG_DOC_DUOC", at }),
    ]);
    assert.equal(kl.meta.changes, 0, `${trangThai}: kết luận`);
    assert.equal(su1.meta.changes, 0, `${trangThai}: lịch sử kết luận`);
    assert.equal(bs.meta.changes, 0, `${trangThai}: bổ sung`);
    assert.equal(su2.meta.changes, 0, `${trangThai}: lịch sử bổ sung`);
    assert.deepEqual(soDong(w), truoc, trangThai);
    assert.equal(reg(w, id).status, trangThai);
    // đường route: 409, không ghi
    assert.equal((await ketLuan(w, ADM, id, { muc: "HO_TEN", dat: true })).status, 409, trangThai);
    assert.equal((await boSung(w, ADM, id)).status, 409, trangThai);
    assert.deepEqual(soDong(w), truoc, trangThai);
  }
});

test("(15) M-1: hàng chờ dựng theo năng lực — Toàn quyền, Quản trị + Nhân sự thấy hợp; Nhân sự + Kế toán gộp quyền nên có cả hai năng lực", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", phone: "0900000031", name: "Nhân Sự Kế Toán", perms: ["HR", "ACCOUNTING"] });
  seedStaff(w.sqlite, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", phone: "0900000032", name: "Quản Trị Nhân Sự", perms: ["ADMIN", "HR"] });
  const a = phieu(w, { trangThai: "CHO_XAC_MINH" });
  const c = phieu(w, { trangThai: "CHO_DUYET" });
  const f = phieu(w, { trangThai: "DA_DUYET" }); // chưa kích hoạt
  const g = phieu(w, { trangThai: "DA_DUYET" });
  w.sqlite.prepare("UPDATE dk_registration SET activated_at = ? WHERE id = ?").run(AT, g);
  const ids = async (as: string) => (await w.call("GET", "/api/dang-ky/hang-cho", { as })).json.phieu.map((x: any) => x.id).sort();
  assert.deepEqual(await ids(SUP), [a, c, f].sort(), "Toàn quyền: xác minh được và có account.create ⇒ hợp");
  assert.deepEqual(await ids("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"), [a, c, f].sort(), "Quản trị + Nhân sự ⇒ hợp");
  // Nhân sự giữ party.verify, Kế toán giữ party.view: tài khoản giữ cả hai vai có đủ cả hai ô ⇒ xác minh được ⇒ hợp (hàng chờ theo năng lực, không theo tên vai).
  assert.deepEqual(await ids("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"), [a, c, f].sort(), "Nhân sự + Kế toán: đủ party.verify + party.view");
  assert.deepEqual(await ids(HR), [c, f].sort());
  assert.deepEqual(await ids(ADM), [a, c].sort(), "Quản trị một mình: chỉ xác minh, không duyệt");
});
