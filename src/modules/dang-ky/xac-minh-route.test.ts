// Bước XÁC MINH phiếu đăng ký đối tác qua route thật (tests/audit/harness.mjs, SQLite thật, kho R2 giả) — ADR-0207 Đ1–Đ3, Đ9; ADR-0208 Đ3; ADR-0210 Đ1. Mọi giá trị (số giấy tờ, SĐT, email) là GIẢ.
// Phiếu được gieo THẲNG bằng SQL ở trạng thái mong muốn (route công khai tạo phiếu thuộc task khác).
// Phá thử (P16, đã quan sát đỏ 15/11): bỏ `|| !can(ctx.staff, "party.view")` khỏi thân MỘT route ở index.ts → ca (1) đỏ (Nhân sự qua được) và bài route-write-guard (cổng accounts) đỏ;
// bỏ điều kiện `json_each` ở `DAT_CAP` → ca (4b) đỏ; mở kho TRƯỚC khi ghi nhật ký ở `moTep` → ca (9b) đỏ; bỏ `AND changes() > 0` ở câu gỡ tệp có điều kiện → ca (10b) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauLyDoChoNguoiDangKy } from "../../shared/dang-ky-hien-thi.ts";
import { boSungStatement, datStatement, ketLuanMucStatement, lyDoCuaPhieu, suKienNhanVienStatement, tuChoiStatement } from "./repository.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
// ADR-0219 Đ1: người xác minh phiếu đăng ký = Quản lý bán hàng (đi kèm mã Bán hàng, ADR-0169 Đ4). Quản trị nay chỉ ở bước duyệt — trong tệp này chỉ dùng để canh 403.
const XM = "44444444-4444-4444-8444-444444444441";
const XM2 = "44444444-4444-4444-8444-444444444442";
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
  them(XM, "0900000005", "Quản Lý Bán Hàng", ["SALES_MANAGER", "SALES"]);
  them(XM2, "0900000006", "Quản Lý Bán Hàng Hai", ["SALES_MANAGER", "SALES"]);
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
function phieu(w: any, o: { id?: string; trangThai?: string; so?: string | null; hoTen?: [string, string]; dienThoai?: string; vai?: string; toChuc?: Partial<ToChucKhai> } = {}): string {
  const id = o.id ?? `DK_${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(dem % 18, (dem % 18) + 8)}`;
  dem++;
  const so = o.so === undefined ? SO : o.so;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', ?, ?, ?)").run(id, o.vai ?? "TRAVEL_AGENCY", AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, 'khach@example.com', ?, ?)").run(`ident-${id}`, id, `khach-${id}@example.com`, AT, AT);
  const [ho, ten] = o.hoTen ?? ["Phạm", "Thử Nghiệm"];
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, ?, ?, '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, ?, ?, ?, '2021-01-02', 'Cục thử', '2040-01-02', (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`)
    .run(`sub-${id}`, id, ho, ten, o.dienThoai ?? "0912 345 678", (o.dienThoai ?? "0912345678").replace(/\s/g, ""), so ? "CCCD" : null, so, so ? KHOA_SO : null, AT, AT, AT);
  if (o.toChuc) {
    w.sqlite.prepare("UPDATE dk_registration SET org_role_code = 'TRAVEL_AGENCY' WHERE id = ?").run(id);
    gieoToChuc(w, id, 1, o.toChuc);
  }
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  for (const t of DUONG[o.trangThai ?? "CHO_XAC_MINH"] ?? []) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, id);
  return id;
}
/** Phần tổ chức của bản khai (ADR-0212 Đ4; đợt 2 Task 6). Giá trị GIẢ; khoá chuẩn hoá đúng luật `chuanHoaMaSoThue` / `chuanHoaSoGpkd`. */
interface ToChucKhai { ten: string; tenPhapLy: string | null; mst: string | null; mstKhoa: string | null; gpkd: string; gpkdKhoa: string }
const TO_CHUC: ToChucKhai = { ten: "Công ty Lữ hành Biển Xanh", tenPhapLy: "Công ty TNHH Lữ hành Biển Xanh", mst: "0123456789", mstKhoa: "0123456789", gpkd: "41-0398-7712", gpkdKhoa: "4103987712" };
function gieoToChuc(w: any, reg: string, version: number, o: Partial<ToChucKhai> = {}): void {
  const t = { ...TO_CHUC, ...o };
  w.sqlite.prepare(`INSERT INTO dk_submission_org (id, registration_id, version, display_name, legal_name, tax_code, tax_key, address, invoice_email, phone_value, phone_key, gpkd_number, gpkd_key,
      gpkd_issued_date, gpkd_issued_place, authority_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '5 Trần Phú, Nha Trang', 'hoadon@bienxanh.example', '0258 3812 345', '02583812345', ?, ?,
      '2019-03-04', 'Sở Kế hoạch và Đầu tư Khánh Hoà', ?, ?, ?)`).run(`org-${reg}-${version}`, reg, version, t.ten, t.tenPhapLy, t.mst, t.mstKhoa, t.gpkd, t.gpkdKhoa, AT, AT, AT);
}
/** Hồ sơ tổ chức có sẵn trong Danh bạ (giá trị GIẢ). `gpkdKhoa` ⇒ thêm một dòng GPKD chưa huỷ. */
function toChucCoSan(w: any, id: string, o: { ten?: string; mst?: string | null; gpkdKhoa?: string; active?: 0 | 1 } = {}): string {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, ?, ?, ?)").run(id, o.ten ?? "Tổ Chức Có Sẵn", o.active ?? 1, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, tax_code, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, o.mst ?? null, AT, AT);
  if (o.gpkdKhoa) w.sqlite.prepare("INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES (?, ?, 'GPKD', ?, ?, ?, ?)").run(`gpkd-${id}`, id, o.gpkdKhoa, o.gpkdKhoa, AT, AT);
  return id;
}
const MUC_TO_CHUC = ["TEN_PHAP_LY", "MA_SO_THUE", "GPKD"];

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
const boSung = (w: any, as: string, id: string, body: any = { lyDo: "KHONG_DOC_DUOC" }) => w.call("POST", `/api/dang-ky/phieu/${id}/bo-sung`, { as, body: { phienBan: 1, ...body } });
const tuChoi = (w: any, as: string, id: string, body: any = { lyDo: "KHONG_THUOC_DIEN" }) => w.call("POST", `/api/dang-ky/phieu/${id}/tu-choi`, { as, body: { phienBan: 1, ...body } });
const xemSo = (w: any, as: string, id: string) => w.call("POST", `/api/dang-ky/phieu/${id}/xem-so`, { as });
const chiTiet = (w: any, as: string, id: string) => w.call("GET", `/api/dang-ky/phieu/${id}`, { as });
const mo = (w: any, as: string, id: string, tid: string) => w.call("GET", `/api/dang-ky/phieu/${id}/tep/${tid}`, { as });
async function datHetMuc(w: any, as: string, id: string) {
  for (const m of MUC) assert.equal((await ketLuan(w, as, id, { muc: m, dat: true })).status, 200, m);
}

test("(1) Quyền (ADR-0219 Đ1): Quản trị, Nhân sự gọi ket-luan, xem-so, tep, chi tiết, ba lệnh kết thúc ⇒ 403; Bán hàng thường, Kế toán, Đối tác gọi bất kỳ ⇒ 403; không đổi dòng nào", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  const goi = (as: string) => [
    () => ketLuan(w, as, id, { muc: "HO_TEN", dat: true }), () => xemSo(w, as, id), () => mo(w, as, id, t.id), () => chiTiet(w, as, id), () => dat(w, as, id, { hoSo: { kieu: "MOI" } }),
    () => boSung(w, as, id), () => tuChoi(w, as, id), () => w.call("GET", "/api/dang-ky/hang-cho", { as }),
  ];
  for (const as of [ADM, HR, SALES, ACC, PARTNER]) {
    const kq: any[] = [];
    for (const f of goi(as)) kq.push(await f()); // tuần tự: khung thử cấp phiên một lần cho mỗi tài khoản
    const hangCho = kq.pop()!;
    for (const r of kq) assert.equal(r.status, 403, `${as}: ${r.text}`);
    // Hàng chờ: Quản trị, Nhân sự (người duyệt) được xem dạng thu hẹp; ba vai kia 403 — kể cả Đối tác qua được cổng staff (ô registration.queue.view = none).
    assert.equal(hangCho.status, as === HR || as === ADM ? 200 : 403, hangCho.text);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(w.q("SELECT count(*) n FROM dk_item_result")[0].n, 0);
  assert.equal(events(w, id).length, 0);
  assert.equal(audits(w).length, 0);
  assert.equal(w.r2.soLan.get, 0, "không chạm kho");
  // Quản lý bán hàng và Toàn quyền qua cổng.
  for (const as of [XM, SUP]) {
    assert.equal((await chiTiet(w, as, id)).status, 200);
    assert.equal((await w.call("GET", "/api/dang-ky/hang-cho", { as })).status, 200);
  }
});

test("(2) Hàng chờ (ADR-0219): Quản lý bán hàng thấy mọi phiếu chưa kết thúc, Toàn quyền thêm phiếu đã duyệt chưa kích hoạt; Quản trị, Nhân sự thấy CHỜ DUYỆT và ĐÃ DUYỆT chưa kích hoạt, không tên, không liên hệ", async () => {
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
  // Phiếu ĐANG ĐIỀN (`e`) chưa gửi: không ở hàng chờ của ai (rà soát cuối I-4).
  assert.deepEqual(await ids(XM), [a, b, c].sort());
  assert.deepEqual(await ids(SUP), [a, b, c, f].sort(), "Toàn quyền: xác minh được + có registration.approve ⇒ hợp (có cả ĐÃ DUYỆT chưa kích hoạt)");
  assert.deepEqual(await ids(HR), [c, f].sort());
  assert.deepEqual(await ids(ADM), [c, f].sort(), "Quản trị nay là người duyệt (ADR-0219 Đ1)");
  for (const as of [HR, ADM]) {
    const r = await w.call("GET", "/api/dang-ky/hang-cho", { as });
    for (const lo of ["Phạm", "Thử Nghiệm", "0912", "khach@", "079", d, e, g]) assert.equal(boUuid(r.text).includes(lo), false, `lộ ${lo}`);
  }
});

test("(3) «đạt» khi còn mục chưa đạt ⇒ 409; mục «không đạt» ⇒ 409; đủ mục nhưng chưa có kết luận Danh bạ ⇒ 409; không đổi trạng thái", async () => {
  const w = setup();
  const id = phieu(w);
  const r0 = await dat(w, XM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(r0.status, 409, r0.text);
  assert.equal(r0.json.error.code, "items_not_passed");
  for (const m of MUC) assert.ok(r0.json.error.message.length > 0 && m);
  // đủ mục trừ một: vẫn 409
  for (const m of MUC.slice(1)) assert.equal((await ketLuan(w, XM, id, { muc: m, dat: true })).status, 200);
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  // mục đầu «không đạt» (kết luận mới nhất): 409; rồi sửa thành «đạt»: qua
  assert.equal((await ketLuan(w, XM, id, { muc: MUC[0], dat: false, lyDo: "KHONG_LIEN_LAC_DUOC" })).status, 200);
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  assert.equal((await ketLuan(w, XM, id, { muc: MUC[0], dat: true })).status, 200);
  // chưa có kết luận Danh bạ
  const r1 = await dat(w, XM, id, {});
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "registry_conclusion_missing");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id).verified_by, null);
});

test("(4) «đạt» thành công: CHO_DUYET, ghi người xác minh + bản khai + hồ sơ mới; lịch sử và nhật ký không mang số, tên, liên hệ", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, XM, id);
  const r = await dat(w, XM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(r.status, 200, r.text);
  const p = reg(w, id);
  assert.equal(p.status, "CHO_DUYET");
  assert.equal(p.verified_by, XM);
  assert.equal(p.verified_version, 1);
  assert.ok(p.verified_at);
  assert.equal(p.match_kind, "NEW");
  assert.equal(p.match_party_id, null);
  assert.deepEqual(events(w, id).map((x) => x.command), ["KET_LUAN", "KET_LUAN", "KET_LUAN", "KET_LUAN", "KET_LUAN", "DAT"]);
  assert.equal(audits(w, "registration_verified").length, 1);
  const rac = boUuid(JSON.stringify([w.q("SELECT * FROM dk_event WHERE registration_id = ?", id), audits(w), w.q("SELECT * FROM audit_log WHERE action LIKE 'registration_%'")])); // che UUID: id ngẫu nhiên có thể tình cờ chứa «0912»
  for (const lo of [SO, KHOA_SO, "0912", "khach@", "Phạm", "Thử Nghiệm", "Đường Thử", "1990-05-06"]) assert.equal(rac.includes(lo), false, `lộ ${lo}`);
  // đã chuyển bước ⇒ bấm lại: 409, không ghi thêm
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "MOI" } })).status, 409);
  assert.equal(events(w, id).length, 6);
});

test("(5) Kết luận Danh bạ «gắn hồ sơ có sẵn»: hồ sơ đã có tài khoản / hồ sơ tổ chức / không có ⇒ 409; hồ sơ cá nhân hợp lệ ⇒ ghi match_party_id; có thể gửi kết luận trước rồi «đạt» sau", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, XM, id);
  const caNhan = (await w.call("POST", "/api/parties", { as: XM, body: { kind: "PERSON", fullName: "Người Có Sẵn", contacts: [] } })).json.party.id as string;
  const toChuc = (await w.call("POST", "/api/parties", { as: XM, body: { kind: "ORGANIZATION", legalName: "Công Ty Thử", displayName: "Công Ty Thử", contacts: [] } })).json?.party?.id as string | undefined;
  for (const partyId of [`pty-${SALES}`, "khong-co-ho-so", ...(toChuc ? [toChuc] : [])]) {
    const r = await dat(w, XM, id, { hoSo: { kieu: "CO_SAN", partyId } });
    assert.equal(r.status, 409, `${partyId}: ${r.text}`);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "CO_SAN", partyId: caNhan } })).status, 200);
  const p = reg(w, id);
  assert.equal(p.match_kind, "EXISTING");
  assert.equal(p.match_party_id, caNhan);
});

test("(5b) Thân sai: ô lạ, hoSo sai kiểu, lý do ngoài danh sách đóng, mục lạ, người giới thiệu không có thật ⇒ lỗi rõ, không ghi", async () => {
  const w = setup();
  const id = phieu(w);
  assert.equal((await ketLuan(w, XM, id, { muc: "KHONG_CO", dat: true })).status, 400);
  assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: false })).status, 400, "không đạt phải kèm lý do");
  assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: false, lyDo: "HO_SO_DA_GOP" })).status, 400, "mã bỏ khỏi danh sách chín mã");
  assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: true, lyDo: "KHONG_DOC_DUOC" })).status, 400, "đạt không kèm lý do");
  assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: true, ghiChu: "x" })).status, 400);
  assert.equal((await boSung(w, XM, id, { lyDo: "chu tu do" })).status, 400);
  assert.equal((await boSung(w, XM, id, { lyDo: "KHONG_DOC_DUOC", ghiChu: "x" })).status, 400);
  assert.equal((await tuChoi(w, XM, id, {})).status, 400);
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "KHAC" } })).status, 400);
  await datHetMuc(w, XM, id);
  const rg = await dat(w, XM, id, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: "pty-x" });
  assert.equal(rg.status, 409);
  assert.equal(rg.json.error.code, "referrer_not_found");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal((await w.call("GET", "/api/dang-ky/phieu/khong-phai-ma", { as: XM })).status, 404);
  assert.equal((await ketLuan(w, XM, "DK_ZZZZZZZZ", { muc: "HO_TEN", dat: true })).status, 404);
});

test("(5c) Người giới thiệu (Task 8 ruling): «đạt» lưu mã hồ sơ người giới thiệu; hồ sơ đã gộp, đang ngưng, hay trùng hồ sơ đích ⇒ 409, không ghi", async () => {
  const w = setup();
  const a = phieu(w);
  await datHetMuc(w, XM, a);
  // hồ sơ đã gộp / đang ngưng ⇒ 409
  w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(`pty-${ACC}`);
  const r1 = await dat(w, XM, a, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: `pty-${ACC}` });
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "referrer_inactive");
  // hồ sơ đích = người giới thiệu ⇒ 409 (bảng quan hệ cấm nối hồ sơ với chính nó)
  const goc = "pty-goc-gioi-thieu";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Người Có Sẵn', 1, ?, ?)").run(goc, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Người Có Sẵn', ?, ?)").run(goc, AT, AT);
  const r2 = await dat(w, XM, a, { hoSo: { kieu: "CO_SAN", partyId: goc }, nguoiGioiThieuPartyId: goc });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "referrer_is_target");
  assert.equal(reg(w, a).status, "CHO_XAC_MINH");
  assert.equal(reg(w, a).referrer_party_id, null);
  // hợp lệ ⇒ lưu
  const r3 = await dat(w, XM, a, { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: `pty-${SALES}` });
  assert.equal(r3.status, 200, r3.text);
  assert.equal(reg(w, a).status, "CHO_DUYET");
  assert.equal(reg(w, a).referrer_party_id, `pty-${SALES}`);
});

test("(6) «bổ sung»: CAN_BO_SUNG + lý do; người đăng ký thấy câu lý do trung tính cho mã trùng; lịch sử + nhật ký", async () => {
  const w = setup();
  const id = phieu(w);
  const r = await boSung(w, XM, id, { lyDo: "KHONG_DOC_DUOC" });
  assert.equal(r.status, 200, r.text);
  const row = await lyDoCuaPhieu(w.env.DB, id);
  assert.equal(row?.status, "CAN_BO_SUNG");
  assert.equal(row?.reason_code, "KHONG_DOC_DUOC");
  assert.equal(cauLyDoChoNguoiDangKy(row!.reason_code), "Ảnh hoặc thông tin không đọc được. Vui lòng gửi lại bản rõ hơn.");
  // + thư «cần bổ sung» (ADR-0206 Đ13): xếp trong lô (CHO), kết quả sau lô (bài này không có bộ gửi ⇒ LOI); lịch sử thư không mang email hay lý do.
  assert.deepEqual(events(w, id), [{ actor_kind: "STAFF", actor_ref: XM, command: "BO_SUNG", reason_code: "KHONG_DOC_DUOC" },
    { actor_kind: "STAFF", actor_ref: XM, command: "THU_BO_SUNG_CHO", reason_code: null }, { actor_kind: "STAFF", actor_ref: XM, command: "THU_BO_SUNG_LOI", reason_code: null }]);
  assert.equal(audits(w, "registration_supplement_requested").length, 1);
  // mã «số giấy tờ đã thuộc hồ sơ khác» hiện cho người ngoài bằng câu KHÔNG nói «đã có tài khoản»
  const cau = cauLyDoChoNguoiDangKy("TRUNG_HO_SO_KHAC")!;
  assert.equal(cau, "Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo.");
  assert.equal(/tài khoản/i.test(cau), false);
  // không còn chờ xác minh ⇒ bấm lại 409
  assert.equal((await boSung(w, XM, id)).status, 409);
});

test("(7) «từ chối»: TU_CHOI + tệp chờ gỡ CÙNG lô; kho xoá sau; lịch sử; hết quyền xem", async () => {
  const w = setup();
  const id = phieu(w);
  const t1 = await tep(w, id, "CCCD_MAT_TRUOC");
  const t2 = await tep(w, id, "CCCD_MAT_SAU");
  const r = await tuChoi(w, XM, id, { lyDo: "KHONG_PHAI_CHINH_CHU" });
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
  assert.deepEqual(events(w, id), [{ actor_kind: "STAFF", actor_ref: XM, command: "TU_CHOI", reason_code: "KHONG_PHAI_CHINH_CHU" },
    { actor_kind: "STAFF", actor_ref: XM, command: "THU_TU_CHOI_CHO", reason_code: null }, { actor_kind: "STAFF", actor_ref: XM, command: "THU_TU_CHOI_LOI", reason_code: null }]);
  assert.equal(audits(w, "registration_rejected").length, 1);
  // danh tính đóng (trigger) và không xem lại được
  const ct = await chiTiet(w, XM, id);
  assert.equal(ct.status, 200);
  assert.equal(ct.json.noiDung, undefined);
  assert.equal((await tuChoi(w, XM, id)).status, 409);
});

test("(8) Xử lý xong gọi lại GET :id ⇒ không còn nội dung (hết tên, số điện thoại, ngày sinh, địa chỉ, số che, tệp)", async () => {
  const w = setup();
  const id = phieu(w);
  await tep(w, id);
  const truoc = await chiTiet(w, XM, id);
  assert.equal(truoc.status, 200);
  assert.equal(truoc.json.noiDung.hoTen, "Phạm Thử Nghiệm");
  assert.equal(truoc.json.noiDung.giayTo.soChe.includes("111"), true);
  assert.equal(boUuid(truoc.text).includes(KHOA_SO), false, "số giấy tờ luôn che");
  assert.equal(boUuid(truoc.text).includes(SO), false);
  assert.equal(truoc.json.muc.length, MUC.length);
  assert.equal(truoc.json.tep.length, 1);
  assert.equal(truoc.headers.get("cache-control"), "no-store");
  await datHetMuc(w, XM, id);
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "MOI" } })).status, 200);
  for (const as of [XM, SUP]) {
    const sau = await chiTiet(w, as, id);
    assert.equal(sau.status, 200);
    assert.equal(sau.json.daXuLy, true);
    for (const lo of ["Phạm", "Thử Nghiệm", "0912", "Đường Thử", "1990-05-06", "noiDung", "soChe", "tep"]) assert.equal(boUuid(sau.text).includes(lo), false, `lộ ${lo}`);
  }
});

test("(9) Xem đủ số: nhật ký ghi TRƯỚC, không chứa số; nhật ký lỗi ⇒ không trả số; Quản lý bán hàng, Toàn quyền được; đã xử lý ⇒ 403", async () => {
  const w = setup();
  const id = phieu(w);
  const r = await xemSo(w, XM, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.so, SO);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const a = audits(w, "registration_number_viewed");
  assert.equal(a.length, 1);
  assert.equal(a[0].staff_id, XM);
  assert.equal(a[0].detail.includes(KHOA_SO) || a[0].detail.includes(SO), false);
  // nhật ký hỏng ⇒ 500 và thân không có số
  w.sqlite.exec("CREATE TRIGGER thu_hong_nhat_ky BEFORE INSERT ON audit_log WHEN NEW.action IN ('registration_number_viewed', 'registration_file_viewed') BEGIN SELECT RAISE(ABORT, 'nhat_ky_hong'); END");
  const loi = await xemSo(w, SUP, id);
  assert.equal(loi.status, 500);
  assert.equal(loi.text.includes("079"), false);
  w.sqlite.exec("DROP TRIGGER thu_hong_nhat_ky");
  // phiếu không có số ⇒ 404
  const khongSo = phieu(w, { so: null });
  assert.equal((await xemSo(w, XM, khongSo)).status, 404);
  // xử lý xong ⇒ 403
  assert.equal((await boSung(w, XM, id)).status, 200);
  assert.equal((await xemSo(w, XM, id)).status, 403);
});

test("(9b) Mở ảnh: nhật ký ghi TRƯỚC khi đọc kho; nhật ký lỗi ⇒ không trả tệp, không chạm kho; header no-store + nosniff; chỉ tệp của đúng phiếu", async () => {
  const w = setup();
  const id = phieu(w);
  const khac = phieu(w);
  const t = await tep(w, id);
  const tKhac = await tep(w, khac);
  let thayKhiGet: number | null = null;
  w.r2.khiGet = () => { thayKhiGet = audits(w, "registration_file_viewed").length; };
  const r = await mo(w, XM, id, t.id);
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
  assert.equal((await mo(w, XM, id, tKhac.id)).status, 404);
  assert.equal(w.r2.soLan.get, truoc);
  // nhật ký hỏng ⇒ 500, không đọc kho
  w.sqlite.exec("CREATE TRIGGER thu_hong_nhat_ky BEFORE INSERT ON audit_log WHEN NEW.action = 'registration_file_viewed' BEGIN SELECT RAISE(ABORT, 'nhat_ky_hong'); END");
  const loi = await mo(w, SUP, id, t.id);
  assert.equal(loi.status, 500);
  assert.equal(w.r2.soLan.get, truoc, "không đọc kho khi nhật ký lỗi");
  w.sqlite.exec("DROP TRIGGER thu_hong_nhat_ky");
  // gọi chéo trang ⇒ 403; sau khi xử lý ⇒ 403
  assert.equal((await w.call("GET", `/api/dang-ky/phieu/${id}/tep/${t.id}`, { as: XM, headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await tuChoi(w, XM, id)).status, 200);
  assert.equal((await mo(w, XM, id, t.id)).status, 403);
});

test("(10) Đua: hai người cùng xử lý — chỉ một thắng; bên thua 409 và KHÔNG gỡ tệp của phiếu đã được bên kia chuyển bước", async () => {
  const w = setup();
  const id = phieu(w);
  const t = await tep(w, id);
  assert.equal((await boSung(w, XM, id)).status, 200);
  // phiếu đã sang CAN_BO_SUNG: «từ chối» của người còn mở trang cũ ⇒ 409; tệp còn nguyên
  const r = await tuChoi(w, XM2, id);
  assert.equal(r.status, 409, r.text);
  const d = w.q("SELECT purged_at FROM pty_registration_attachment WHERE id = ?", t.id)[0];
  assert.equal(d.purged_at, null);
  assert.equal(w.r2.co(t.key), true);
  assert.equal(reg(w, id).status, "CAN_BO_SUNG");
  assert.deepEqual(events(w, id).map((e: any) => e.command), ["BO_SUNG", "THU_BO_SUNG_CHO", "THU_BO_SUNG_LOI"], "bên thua không ghi lịch sử, không xếp thư từ chối");
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
    tuChoiStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: XM, at, phienBan: 1 }),
    suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: XM, command: "TU_CHOI", lyDo: "KHONG_DOC_DUOC", at }),
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
  const theoSdt = (await w.call("POST", "/api/parties", { as: XM, body: { kind: "PERSON", fullName: "Một Người Khác", contacts: [{ kind: "PHONE", value: "0912345678" }] } })).json.party.id as string;
  const theoTen = (await w.call("POST", "/api/parties", { as: XM, body: { kind: "PERSON", fullName: "Phạm Thử Nghiệm", contacts: [] } })).json.party.id as string;
  const id = phieu(w);
  const r = await chiTiet(w, XM, id);
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
  const r = await chiTiet(w, XM, id);
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
    (await w.env.DB.batch([datStatement(w.env.DB, { registrationId: id, by: XM, at, mucBatBuoc: MUC, phienBan: 1, ...v })]))[0].meta.changes;
  assert.equal(await chay({ matchKind: "NEW", matchPartyId: null }), 0, "chưa có kết luận mục nào");
  for (const m of MUC.slice(1)) assert.equal((await ketLuan(w, XM, id, { muc: m, dat: true })).status, 200);
  assert.equal(await chay({ matchKind: "NEW", matchPartyId: null }), 0, "thiếu một mục");
  assert.equal((await ketLuan(w, XM, id, { muc: MUC[0], dat: true })).status, 200);
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
  assert.equal((await chiTiet(w, XM, id)).json.phienBan, 1);
  await datHetMuc(w, XM, id);
  const truoc = soDong(w);
  guiLai(w, id);
  assert.equal((await chiTiet(w, XM, id)).json.phienBan, 2);
  const r = await ketLuan(w, XM, id, { muc: "CCCD", dat: true }); // phienBan 1 mặc định = tab cũ
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_version_changed");
  const d = await dat(w, XM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "registration_version_changed");
  assert.deepEqual(soDong(w), truoc, "không ghi gì");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id).verified_by, null);
  // mở lại (phienBan 2): kết luận ghi vào đúng bản 2, phản hồi mang phienBan
  const ok = await ketLuan(w, XM, id, { muc: "CCCD", dat: true, phienBan: 2 });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.phienBan, 2);
  assert.deepEqual(w.q("SELECT version FROM dk_item_result ORDER BY rowid DESC LIMIT 1").map((x: any) => x.version), [2]);
  // thiếu phienBan hoặc sai kiểu ⇒ 400
  for (const pb of [undefined, 0, 1.5, "1", null]) assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: true, phienBan: pb })).status, 400, String(pb));
  assert.equal((await dat(w, XM, id, { hoSo: { kieu: "MOI" }, phienBan: undefined })).status, 400);
});

test("(13c) I-3: tab cũ (đã xem bản khai 1) bấm «Yêu cầu bổ sung» hoặc «Từ chối» sau khi người đăng ký gửi lại bản 2 ⇒ 409 registration_version_changed, KHÔNG ghi gì; mở lại (phienBan 2) thì làm được", async () => {
  const w = setup();
  const id = phieu(w);
  assert.equal((await chiTiet(w, XM, id)).json.phienBan, 1);
  guiLai(w, id);
  const truoc = soDong(w);
  for (const lenh of [() => boSung(w, XM, id), () => tuChoi(w, XM, id)]) {
    const r = await lenh();
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "registration_version_changed");
  }
  assert.deepEqual(soDong(w), truoc, "không dòng lịch sử, không nhật ký");
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id).reason_code, null);
  for (const lenh of [() => boSung(w, XM, id, { lyDo: "KHONG_DOC_DUOC", phienBan: undefined }), () => tuChoi(w, XM, id, { lyDo: "KHONG_THUOC_DIEN", phienBan: 0 })]) assert.equal((await lenh()).status, 400);
  assert.equal((await boSung(w, XM, id, { lyDo: "KHONG_DOC_DUOC", phienBan: 2 })).status, 200);
  assert.equal(reg(w, id).status, "CAN_BO_SUNG");
});

test("(13d) I-3: câu «bổ sung» và «từ chối» tự canh phiên bản — phienBan ≠ current_version đổi 0 dòng (kể cả khi bỏ kiểm trước ở route)", async () => {
  const w = setup();
  const id = phieu(w);
  guiLai(w, id); // current_version = 2
  const at = new Date().toISOString();
  const kq = await w.env.DB.batch([
    boSungStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: XM, at, phienBan: 1, expiresAt: at }),
    tuChoiStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: XM, at, phienBan: 1 }),
  ]);
  assert.deepEqual(kq.map((x: any) => x.meta.changes), [0, 0]);
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
});

test("(13b) I-1: câu ghi tự canh phiên bản — kết luận và «đạt» với phienBan ≠ current_version đổi 0 dòng, kể cả khi kiểm trước ở route bị lách", async () => {
  const w = setup();
  const id = phieu(w);
  await datHetMuc(w, XM, id);
  guiLai(w, id);
  for (const m of MUC) assert.equal((await ketLuan(w, XM, id, { muc: m, dat: true, phienBan: 2 })).status, 200, m); // bản 2 đã đủ mục «đạt»: chỉ còn phiên bản chặn
  const at = new Date().toISOString();
  const [kl, dt] = await w.env.DB.batch([
    ketLuanMucStatement(w.env.DB, { registrationId: id, item: "CCCD", dat: true, lyDo: null, by: XM, at, phienBan: 1 }),
    datStatement(w.env.DB, { registrationId: id, by: XM, at, matchKind: "NEW", matchPartyId: null, mucBatBuoc: MUC, phienBan: 1 }),
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
      ketLuanMucStatement(w.env.DB, { registrationId: id, item: "HO_TEN", dat: true, lyDo: null, by: XM, at, phienBan: 1 }),
      suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: XM, command: "KET_LUAN", lyDo: null, at }),
      boSungStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_DOC_DUOC", by: XM, at, phienBan: 1, expiresAt: at }),
      suKienNhanVienStatement(w.env.DB, { registrationId: id, staffId: XM, command: "BO_SUNG", lyDo: "KHONG_DOC_DUOC", at }),
    ]);
    assert.equal(kl.meta.changes, 0, `${trangThai}: kết luận`);
    assert.equal(su1.meta.changes, 0, `${trangThai}: lịch sử kết luận`);
    assert.equal(bs.meta.changes, 0, `${trangThai}: bổ sung`);
    assert.equal(su2.meta.changes, 0, `${trangThai}: lịch sử bổ sung`);
    assert.deepEqual(soDong(w), truoc, trangThai);
    assert.equal(reg(w, id).status, trangThai);
    // đường route: 409, không ghi
    assert.equal((await ketLuan(w, XM, id, { muc: "HO_TEN", dat: true })).status, 409, trangThai);
    assert.equal((await boSung(w, XM, id)).status, 409, trangThai);
    assert.deepEqual(soDong(w), truoc, trangThai);
  }
});

test("(15) M-1: hàng chờ dựng theo năng lực — Toàn quyền, Quản lý bán hàng + Quản trị thấy hợp; Nhân sự + Bán hàng (thiếu Quản lý bán hàng) chỉ thấy phần duyệt", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", phone: "0900000031", name: "Nhân Sự Bán Hàng", perms: ["HR", "SALES"] });
  seedStaff(w.sqlite, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", phone: "0900000032", name: "Quản Lý Bán Hàng Quản Trị", perms: ["SALES_MANAGER", "SALES", "ADMIN"] });
  const a = phieu(w, { trangThai: "CHO_XAC_MINH" });
  const c = phieu(w, { trangThai: "CHO_DUYET" });
  const f = phieu(w, { trangThai: "DA_DUYET" }); // chưa kích hoạt
  const g = phieu(w, { trangThai: "DA_DUYET" });
  w.sqlite.prepare("UPDATE dk_registration SET activated_at = ? WHERE id = ?").run(AT, g);
  const ids = async (as: string) => (await w.call("GET", "/api/dang-ky/hang-cho", { as })).json.phieu.map((x: any) => x.id).sort();
  assert.deepEqual(await ids(SUP), [a, c, f].sort(), "Toàn quyền: xác minh được và có registration.approve ⇒ hợp");
  assert.deepEqual(await ids("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"), [a, c, f].sort(), "Quản lý bán hàng + Quản trị ⇒ hợp");
  // Nhân sự + Bán hàng có party.view nhưng không registration.verify (ô chỉ của Quản lý bán hàng, Toàn quyền) ⇒ chỉ phần duyệt (ADR-0219 trang ghép «ca cần canh»).
  assert.deepEqual(await ids("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"), [c, f].sort(), "Nhân sự + Bán hàng: không xác minh được");
  assert.equal((await w.call("GET", `/api/dang-ky/phieu/${a}`, { as: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1" })).status, 403, "Nhân sự + Bán hàng mở phiếu xác minh ⇒ 403");
  assert.deepEqual(await ids(HR), [c, f].sort());
  assert.deepEqual(await ids(XM), [a, c].sort(), "Quản lý bán hàng một mình: chỉ xác minh, không duyệt");
});

// ---- ADR-0212 Đ1 (đợt 2 Task 2, vòng sửa 1): vai của phiếu kiểm lúc «Xác minh đạt», cả hồ sơ mới lẫn hồ sơ có sẵn ----
function loaiThu(w: any, active = 1): void {
  w.sqlite.exec(`INSERT INTO pty_role_type (code, name, sort_order, active, role_group, is_partner_label, created_at, created_by, updated_at, updated_by) VALUES ('LD_TEST', 'Loại thử', 150, ${active}, 'OTHER', 1, '${AT}', 'x', '${AT}', 'x')`);
}

for (const kieu of ["MOI", "CO_SAN"] as const) {
  test(`(16) «đạt» ${kieu === "MOI" ? "hồ sơ mới" : "hồ sơ có sẵn"}: loại do Kế toán thêm đang dùng ⇒ 200; đã tắt ⇒ 409 role_inactive (câu không bảo «chọn vai người dùng khác»); mã lạ ⇒ 409 role_invalid; không ghi gì`, async () => {
    const w = setup();
    loaiThu(w);
    const caNhan = kieu === "CO_SAN" ? ((await w.call("POST", "/api/parties", { as: XM, body: { kind: "PERSON", fullName: "Người Có Sẵn", contacts: [] } })).json.party.id as string) : "";
    const body = kieu === "MOI" ? { hoSo: { kieu: "MOI" } } : { hoSo: { kieu: "CO_SAN", partyId: caNhan } };
    const moi = async (vai: string, dt: string, so: string) => { const id = phieu(w, { vai, dienThoai: dt, so }); await datHetMuc(w, XM, id); return id; };
    const idTat = await moi("LD_TEST", "0911111111", "079 000 000 301");
    const idLa = await moi("LD_KHONG_CO", "0911111112", "079 000 000 302");
    const idDung = await moi("LD_TEST", "0911111113", "079 000 000 303");
    w.sqlite.exec("UPDATE pty_role_type SET active = 0 WHERE code = 'LD_TEST'");
    const truoc = soDong(w);
    const tat = await dat(w, XM, idTat, body);
    assert.equal(tat.status, 409, tat.text);
    assert.equal(tat.json.error.code, "role_inactive");
    assert.equal(tat.json.error.message, "Vai người dùng của phiếu này đã tắt. Hãy trả phiếu về để người đăng ký bổ sung hoặc từ chối phiếu.");
    assert.equal(/chọn vai người dùng khác/.test(tat.json.error.message), false);
    const la = await dat(w, XM, idLa, body);
    assert.equal(la.status, 409, la.text);
    assert.equal(la.json.error.code, "role_invalid");
    assert.deepEqual(soDong(w), truoc);
    assert.equal(reg(w, idTat).status, "CHO_XAC_MINH");
    w.sqlite.exec("UPDATE pty_role_type SET active = 1 WHERE code = 'LD_TEST'");
    assert.equal((await dat(w, XM, idDung, body)).status, 200, "loại đang dùng ⇒ đạt được");
  });
}

// ===== Phần tổ chức (ADR-0212 Đ5; đợt 2 Task 6) =====

test("(16) GET phiếu có phần tổ chức: hai nhóm mục; số chỉ ở dạng che; đối chiếu Danh bạ tổ chức theo mã số thuế (bỏ khoảng trắng), GPKD, tên — không hồ sơ cá nhân, không hồ sơ ngưng (hồ sơ tổ chức không gộp được — trigger party_merge_target)", async () => {
  const w = setup();
  // Hồ sơ có MST viết có khoảng trắng phải hiện với phiếu khai mã liền (Review Focus 1); thứ tự MST → GPKD → tên.
  toChucCoSan(w, "org-ten", { ten: "Công ty Lữ hành Biển Xanh" });
  toChucCoSan(w, "org-gpkd", { ten: "Tên Khác Hẳn", gpkdKhoa: "4103987712" });
  toChucCoSan(w, "org-mst", { ten: "Tên Khác Nữa", mst: "0123 456 789" });
  toChucCoSan(w, "org-ngung", { ten: "Công ty Lữ hành Biển Xanh", mst: "0123456789", active: 0 });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('ng-trung-ten', 'PERSON', 'Công ty Lữ hành Biển Xanh', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('ng-trung-ten', 'Công ty Lữ hành Biển Xanh', ?, ?)").run(AT, AT);
  const id = phieu(w, { toChuc: {} });
  const r = await chiTiet(w, XM, id);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.muc.map((m: any) => m.ma), MUC, "nhóm cá nhân giữ nguyên");
  assert.deepEqual(r.json.mucToChuc.map((m: any) => m.ma).sort(), [...MUC_TO_CHUC].sort(), "nhóm tổ chức = mục bắt buộc gieo cho ORGANIZATION");
  assert.equal(r.json.mucToChuc.find((m: any) => m.ma === "GPKD").nhan, "Giấy chứng nhận đăng ký kinh doanh");
  assert.deepEqual(r.json.goiYToChuc.map((g: any) => [g.id, g.lyDo]), [["org-mst", ["MST"]], ["org-gpkd", ["GPKD"]], ["org-ten", ["TEN"]]]);
  assert.equal(r.json.toChuc.tenToChuc, TO_CHUC.ten);
  assert.ok(!r.text.includes("0123456789") && !r.text.includes("4103987712") && !r.text.includes("41-0398-7712"), "không số đủ trong thân");
  assert.equal(r.json.ketLuanDanhBaToChuc, null);
  // Phiếu KHÔNG có phần tổ chức: không nhóm tổ chức, không gợi ý tổ chức; mục tổ chức không kết luận được.
  const id2 = phieu(w);
  const r2 = await chiTiet(w, XM, id2);
  assert.deepEqual(r2.json.mucToChuc, []);
  assert.deepEqual(r2.json.goiYToChuc, []);
  assert.equal(r2.json.toChuc, null);
  assert.equal((await ketLuan(w, XM, id2, { muc: "TEN_PHAP_LY", dat: true })).status, 400);
});

test("(17) «đạt» phiếu có phần tổ chức: thiếu mục tổ chức ⇒ 409; thiếu kết luận Danh bạ tổ chức ⇒ 409; GPKD / MST của tổ chức khác ⇒ 409; hồ sơ đích không phải tổ chức / ngưng / không có ⇒ 409; không ghi gì", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  await datHetMuc(w, XM, id);
  let r = await dat(w, XM, id, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "items_not_passed");
  for (const m of MUC_TO_CHUC) assert.equal((await ketLuan(w, XM, id, { muc: m, dat: true })).status, 200, m);
  r = await dat(w, XM, id, { hoSo: { kieu: "MOI" } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "org_registry_conclusion_missing");
  // GPKD (khoá) đã thuộc tổ chức khác ⇒ 409 (kể cả tổ chức đó đang ngưng — trigger cũng chặn); MST trùng tổ chức khác chưa gộp ⇒ 409.
  toChucCoSan(w, "org-giu-gpkd", { gpkdKhoa: "4103987712", active: 0 });
  r = await dat(w, XM, id, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "org_gpkd_other_org");
  assert.ok(!r.text.includes("4103987712"));
  const id2 = phieu(w, { toChuc: { gpkd: "56-0001", gpkdKhoa: "560001" } });
  await datHetMuc(w, XM, id2);
  for (const m of MUC_TO_CHUC) await ketLuan(w, XM, id2, { muc: m, dat: true });
  toChucCoSan(w, "org-giu-mst", { mst: "0123456789" });
  r = await dat(w, XM, id2, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "org_tax_other_org");
  // Hồ sơ đích sai kiểu / ngưng / không có ⇒ 409 (nhánh «đã gộp» vẫn có ở mã nhưng không dựng được: chỉ hồ sơ cá nhân gộp được).
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('ng-1', 'PERSON', 'Người', 1, ?, ?)").run(AT, AT);
  toChucCoSan(w, "org-ngung", { active: 0 });
  for (const [dich, ma] of [["ng-1", "org_target_not_org"], ["org-ngung", "org_target_inactive"], ["khong-co", "org_target_not_found"]]) {
    r = await dat(w, XM, id2, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "CO_SAN", partyId: dich } });
    assert.equal(r.status, 409, dich);
    assert.equal(r.json.error.code, ma, dich);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id2).status, "CHO_XAC_MINH");
  assert.equal(reg(w, id2).org_match_kind, null);
  // Gắn đúng vào chính hồ sơ giữ MST ⇒ không còn «trùng hồ sơ khác» ⇒ đạt, ghi org_match_* CÙNG câu với match_*.
  r = await dat(w, XM, id2, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "CO_SAN", partyId: "org-giu-mst" } });
  assert.equal(r.status, 200, r.text);
  const sau = reg(w, id2);
  assert.deepEqual([sau.status, sau.match_kind, sau.org_match_kind, sau.org_match_party_id], ["CHO_DUYET", "NEW", "EXISTING", "org-giu-mst"]);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'registration_verified' AND target_id = ?", id2)[0].detail;
  assert.match(nk, /gắn tổ chức có sẵn/);
  assert.ok(!/0123456789|560001/.test(nk));
  // Phiếu không có phần tổ chức gửi kết luận tổ chức ⇒ 400.
  const id3 = phieu(w);
  await datHetMuc(w, XM, id3);
  assert.equal((await dat(w, XM, id3, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } })).status, 400);
});

test("(17b) Câu «đạt» tự canh kết luận tổ chức: bản khai có phần tổ chức mà không có org_match ⇒ câu đổi 0 dòng (kể cả khi kiểm trước ở route bị lách)", async () => {
  const w = setup();
  const id = phieu(w, { toChuc: {} });
  const muc = [...MUC, ...MUC_TO_CHUC];
  for (const m of muc) await ketLuan(w, XM, id, { muc: m, dat: true });
  const kq = await w.env.DB.batch([datStatement(w.env.DB, { registrationId: id, by: XM, at: AT, matchKind: "NEW", matchPartyId: null, mucBatBuoc: muc, phienBan: 1 })]);
  assert.equal(kq[0].meta.changes, 0);
  const kq2 = await w.env.DB.batch([datStatement(w.env.DB, { registrationId: id, by: XM, at: AT, matchKind: "NEW", matchPartyId: null, mucBatBuoc: muc, phienBan: 1, orgMatchKind: "NEW", orgMatchPartyId: null })]);
  assert.equal(kq2[0].meta.changes, 1);
  assert.equal(reg(w, id).org_match_kind, "NEW");
});

test("(16b) m4: mã số thuế chi nhánh — hồ sơ lưu nguyên văn «0123456789001» hay «0123456789 001», phiếu khoá «0123456789-001»: cùng một hồ sơ trong gợi ý và trong kiểm trùng", async () => {
  const w = setup();
  toChucCoSan(w, "org-lien", { ten: "Chi Nhánh A", mst: "0123456789001" });
  const id = phieu(w, { toChuc: { mst: "0123456789-001", mstKhoa: "0123456789-001" } });
  const r = await chiTiet(w, XM, id);
  assert.deepEqual(r.json.goiYToChuc.map((g: any) => [g.id, g.lyDo]), [["org-lien", ["MST"]]]);
  for (const m of [...MUC, ...MUC_TO_CHUC]) await ketLuan(w, XM, id, { muc: m, dat: true });
  const x = await dat(w, XM, id, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } });
  assert.equal(x.status, 409);
  assert.equal(x.json.error.code, "org_tax_other_org");
  w.sqlite.exec("UPDATE pty_organization SET tax_code = '0123456789 001' WHERE party_id = 'org-lien'");
  assert.deepEqual((await chiTiet(w, XM, id)).json.goiYToChuc.map((g: any) => g.id), ["org-lien"]);
  // Vòng sửa 1 I-3: kiểm trùng TRƯỚC lệnh ghi chuẩn hoá cả cột đã lưu — hai cách viết khác của cùng mã vẫn 409.
  for (const luu of ["0123456789-001", "0123456789 001"]) {
    w.sqlite.prepare("UPDATE pty_organization SET tax_code = ? WHERE party_id = 'org-lien'").run(luu);
    const y = await dat(w, XM, id, { hoSo: { kieu: "MOI" }, hoSoToChuc: { kieu: "MOI" } });
    assert.equal(y.status, 409, luu);
    assert.equal(y.json.error.code, "org_tax_other_org", luu);
  }
  assert.equal(reg(w, id).status, "CHO_XAC_MINH");
});
