// Rà soát cuối đợt 1 đăng ký đối tác (2026-11-16) qua route thật (tests/audit/harness.mjs, SQLite thật). Mọi giá trị là GIẢ.
//   I-1 — ba thư báo của ADR-0206 Đ13 («cần bổ sung», «đã duyệt», «bị từ chối»): gửi sau lô trong waitUntil, trạng thái chờ là dòng lịch sử THU_<loại>_CHO|GUI|LOI (không email),
//         hiện ở hàng chờ, gửi lại được; «Gửi lại lời mời» gửi lại thư «đã duyệt»; danh tính đã ẩn danh ⇒ không gửi, không ghi.
//   I-3 — «Trả về xác minh» (ADR-0207 Đ5): CHỜ DUYỆT → CHỜ XÁC MINH, ghim phiên bản, xoá kết luận Danh bạ + người xác minh; người duyệt ≠ người xác minh vẫn đúng sau khi xác minh lại.
//   I-4 — hàng chờ xác minh: không gồm phiếu ĐANG ĐIỀN; việc làm được ngay xếp trước; cờ «còn nữa» khi chạm trần.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "33333333-3333-4333-8333-333333333334";
const SUP = "77777777-7777-4777-8777-777777777777";
const HR = "99999999-9999-4999-8999-999999999999";
// ADR-0219 Đ1: người xác minh = Quản lý bán hàng (kèm mã Bán hàng); Quản trị chỉ còn dùng để gieo hồ sơ Danh bạ.
const XM = "44444444-4444-4444-8444-444444444441";
const XM2 = "44444444-4444-4444-8444-444444444442";
const XM_ADM = "44444444-4444-4444-8444-444444444443"; // Quản lý bán hàng kiêm Quản trị: xác minh được và duyệt được
const AT = "2026-11-10T00:00:00.000Z";
const SO = "079 000 000 111";
const DT = "0912 345 678";
const EMAIL = "lien-he-thu@example.com";
const MUC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];
const CHU = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let dem = 0;
/** Mã phiếu DK_ + 8 chữ hoa, không lặp trong cả tệp (đếm cơ số 26). */
const maMoi = (): string => { let n = dem++; let s = ""; for (let i = 0; i < 8; i++) { s = CHU[n % 26] + s; n = Math.floor(n / 26); } return `DK_${s}`; };

type Thu = { to: string; subject: string; text?: string; html?: string };
function setup(o: { guiHong?: boolean } = {}) {
  const w = world();
  for (const [id, phone, name, perms] of [[SALES, "0900000001", "An", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [ADM2, "0900000004", "Quản Trị Hai", ["ADMIN"]],
    [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]], [HR, "0900000013", "Nhân Sự", ["HR"]], [XM, "0900000005", "Quản Lý Bán Hàng", ["SALES_MANAGER", "SALES"]],
    [XM2, "0900000006", "Quản Lý Bán Hàng Hai", ["SALES_MANAGER", "SALES"]], [XM_ADM, "0900000015", "Quản Lý Bán Hàng Quản Trị", ["SALES_MANAGER", "SALES", "ADMIN"]]] as const) {
    seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  }
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  const thu: Thu[] = [];
  const bo = { hong: o.guiHong ?? false };
  w.env.FEEDBACK_MAIL_FROM = "no-reply@example.com";
  w.env.EMAIL = { send: async (m: Thu) => { if (bo.hong) throw new Error(`E_PROVIDER ${m.to}`); thu.push(m); } };
  return { w, thu, bo };
}

/** Phiếu cá nhân đã gửi bản khai 1, ở CHỜ XÁC MINH; email liên lạc của danh tính = EMAIL (khác email đã chứng minh để thấy rõ cột nào nhận thư). */
function phieu(w: any, o: { dienThoai?: string; so?: string | null } = {}): string {
  const id = maMoi();
  const dt = o.dienThoai ?? DT;
  const so = o.so === undefined ? SO : o.so;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'GUIDE_FREELANCE', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(`ident-${id}`, id, `chung-minh-${id.toLowerCase()}@example.com`, EMAIL, AT, AT);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, 'Phạm', 'Thử Nghiệm', '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, ?, ?, ?, '2021-01-02', 'Cục thử', '2040-01-02', (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`)
    .run(`sub-${id}`, id, dt, dt.replace(/\s/g, ""), so ? "CCCD" : null, so, so ? so.replace(/\s/g, "") : null, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  return id;
}
const reg = (w: any, id: string) => w.q("SELECT * FROM dk_registration WHERE id = ?", id)[0];
const lenhThu = (w: any, id: string): string[] => w.q("SELECT command FROM dk_event WHERE registration_id = ? AND command GLOB 'THU_*' ORDER BY at, rowid", id).map((x: any) => x.command);
const goi = (w: any, as: string, id: string, viec: string, body?: unknown) => w.call("POST", `/api/dang-ky/phieu/${id}/${viec}`, { as, ...(body === undefined ? {} : { body }) });
const hangCho = async (w: any, as: string) => (await w.call("GET", "/api/dang-ky/hang-cho", { as })).json;
async function xacMinh(w: any, id: string, as = XM) {
  for (const m of MUC) assert.equal((await goi(w, as, id, "ket-luan", { phienBan: 1, muc: m, dat: true })).status, 200, m);
  const r = await goi(w, as, id, "dat", { phienBan: 1, hoSo: { kieu: "MOI" } });
  assert.equal(r.status, 200, r.text);
}
/** Ẩn danh danh tính đúng dấu trigger dk_identity_shape (như tác nhân dọn phiếu). */
const anDanh = (w: any, id: string) =>
  w.sqlite.prepare("UPDATE dk_identity SET erased_at = ?, subject = 'XOA' || upper(replace(id, '-', '')), contact_email = NULL, is_open = 0, updated_at = ? WHERE registration_id = ?").run(AT, AT, id);
/** Không dòng lịch sử / nhật ký nào của phiếu mang email, số điện thoại, số giấy tờ, tên khai. */
function khongLoDuLieu(w: any, id: string) {
  // Bỏ mã ngẫu nhiên (uuid) và mốc giờ ISO trước khi dò — chữ số trong đó trùng ngẫu nhiên «079», «0912»… (đỏ giả, bẫy r7b / 1911 của sổ bộ nhớ).
  const chu = JSON.stringify([...w.q("SELECT * FROM dk_event WHERE registration_id = ?", id), ...w.q("SELECT * FROM audit_log WHERE target_id = ?", id)])
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>").replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<luc>");
  for (const lo of [EMAIL, "chung-minh", "0912", "345678", "079", "000111", "Phạm", "Thử Nghiệm", "E_PROVIDER"]) assert.equal(chu.includes(lo), false, `lịch sử / nhật ký lộ ${lo}`);
}
/** Thân thư chỉ mang mã phiếu: không tên, số điện thoại, số giấy tờ, email, liên kết, tên miền. */
function thuSach(t: Thu, id: string) {
  const all = `${t.subject}\n${t.text}\n${t.html}`;
  assert.ok((t.text ?? "").includes(id), "thân có mã phiếu");
  for (const lo of ["Phạm", "Thử Nghiệm", "0912", "079", EMAIL, "http", "www", ".vn", ".com"]) assert.equal(all.includes(lo), false, `thư lộ ${lo}`);
}

// ---------------- I-1: thư báo ----------------

test("(T1) «Yêu cầu bổ sung» ⇒ thư «cần bổ sung» tới email liên lạc của danh tính; lịch sử THU_BO_SUNG_CHO rồi THU_BO_SUNG_GUI; không dữ liệu cá nhân ở thư, lịch sử, nhật ký", async () => {
  const { w, thu } = setup();
  const id = phieu(w);
  const r = await goi(w, XM, id, "bo-sung", { lyDo: "KHONG_DOC_DUOC", phienBan: 1 });
  assert.equal(r.status, 200, r.text);
  await w.choNen();
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.to, EMAIL);
  assert.equal(thu[0]!.subject, "Phiếu đăng ký Tour Đảo cần bổ sung");
  thuSach(thu[0]!, id);
  assert.deepEqual(lenhThu(w, id), ["THU_BO_SUNG_CHO", "THU_BO_SUNG_GUI"]);
  assert.equal(w.q("SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command GLOB 'THU_*' AND (actor_ref <> ? OR reason_code IS NOT NULL)", id, XM)[0].n, 0, "dòng thư: người bấm, không lý do");
  khongLoDuLieu(w, id);
});

test("(T2) «Từ chối» ở bước xác minh ⇒ thư «không được duyệt» kèm câu lý do viết cho người đăng ký; THU_TU_CHOI_GUI", async () => {
  const { w, thu } = setup();
  const id = phieu(w);
  assert.equal((await goi(w, XM, id, "tu-choi", { lyDo: "TRUNG_HO_SO_KHAC", phienBan: 1 })).status, 200);
  await w.choNen();
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.subject, "Phiếu đăng ký Tour Đảo không được duyệt");
  assert.ok(thu[0]!.text!.includes("Lý do: Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo."), thu[0]!.text);
  assert.equal(/tài khoản/i.test(thu[0]!.text!), false, "không nói «đã có tài khoản»");
  thuSach(thu[0]!, id);
  assert.deepEqual(lenhThu(w, id), ["THU_TU_CHOI_CHO", "THU_TU_CHOI_GUI"]);
  khongLoDuLieu(w, id);
});

test("(T3) «Duyệt mở tài khoản» ⇒ thư «đã được duyệt» kèm ngày hết hạn đặt PIN; THU_DA_DUYET_GUI; «Từ chối» ở bước duyệt ⇒ THU_TU_CHOI_DUYET_GUI", async () => {
  const { w, thu } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const r = await goi(w, HR, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(r.status, 200, r.text);
  await w.choNen();
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.subject, "Phiếu đăng ký Tour Đảo đã được duyệt");
  assert.match(thu[0]!.text!, /tự đặt mã PIN trước hết ngày \d{2}\/\d{2}\/\d{4}\./);
  thuSach(thu[0]!, id);
  assert.deepEqual(lenhThu(w, id), ["THU_DA_DUYET_CHO", "THU_DA_DUYET_GUI"]);
  khongLoDuLieu(w, id);
  const b = phieu(w, { dienThoai: "0912 000 444", so: null });
  await xacMinh(w, b);
  assert.equal((await goi(w, HR, b, "tu-choi-duyet", { lyDo: "KHONG_THUOC_DIEN", phienBan: 1 })).status, 200);
  await w.choNen();
  assert.equal(thu.length, 2);
  assert.equal(thu[1]!.subject, "Phiếu đăng ký Tour Đảo không được duyệt");
  assert.ok(thu[1]!.text!.includes("Lý do: "));
  assert.deepEqual(lenhThu(w, b), ["THU_TU_CHOI_DUYET_CHO", "THU_TU_CHOI_DUYET_GUI"]);
});

test("(T4) «Gửi lại lời mời» gửi lại thư «đã duyệt» (kèm hạn mới) cùng lúc mở lại hạn", async () => {
  const { w, thu } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal((await goi(w, HR, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 })).status, 200);
  await w.choNen();
  w.sqlite.prepare("UPDATE dk_registration SET activation_deadline_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(id);
  assert.equal((await goi(w, HR, id, "gui-lai-loi-moi")).status, 200);
  await w.choNen();
  assert.equal(thu.length, 2);
  assert.equal(thu[1]!.subject, "Phiếu đăng ký Tour Đảo đã được duyệt");
  assert.deepEqual(lenhThu(w, id), ["THU_DA_DUYET_CHO", "THU_DA_DUYET_GUI", "THU_DA_DUYET_CHO", "THU_DA_DUYET_GUI"]);
  khongLoDuLieu(w, id);
});

test("(T5) Gửi hỏng ⇒ THU_*_LOI hiện ở hàng chờ đúng bước; «Gửi lại thư» theo bước (người xác minh / Nhân sự), gửi được thì rời hàng chờ; 409 khi không còn gì chờ hay thư «đã duyệt»", async () => {
  const { w, thu, bo } = setup({ guiHong: true });
  const a = phieu(w); // từ chối ở bước xác minh
  assert.equal((await goi(w, XM, a, "tu-choi", { lyDo: "KHONG_PHAI_CHINH_CHU", phienBan: 1 })).status, 200);
  const b = phieu(w, { dienThoai: "0912 000 555", so: null }); // từ chối ở bước duyệt
  await xacMinh(w, b);
  assert.equal((await goi(w, HR, b, "tu-choi-duyet", { lyDo: "KHONG_THUOC_DIEN", phienBan: 1 })).status, 200);
  const c = phieu(w, { dienThoai: "0912 000 666", so: null }); // cần bổ sung
  assert.equal((await goi(w, XM, c, "bo-sung", { lyDo: "KHONG_DOC_DUOC", phienBan: 1 })).status, 200);
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.deepEqual(lenhThu(w, a), ["THU_TU_CHOI_CHO", "THU_TU_CHOI_LOI"]);
  khongLoDuLieu(w, a);
  // Hàng chờ: người xác minh thấy phiếu từ chối ở bước xác minh (thư lỗi) và phiếu cần bổ sung (thư lỗi); Nhân sự thấy phiếu từ chối ở bước duyệt.
  const qa = await hangCho(w, XM);
  const dongA = qa.phieu.find((x: any) => x.id === a);
  assert.deepEqual(dongA?.thu, { loai: "TU_CHOI", trangThai: "LOI" });
  assert.deepEqual(qa.phieu.find((x: any) => x.id === c)?.thu, { loai: "BO_SUNG", trangThai: "LOI" });
  assert.equal(qa.phieu.some((x: any) => x.id === b), false, "từ chối ở bước duyệt: không thuộc người xác minh");
  const qh = await hangCho(w, HR);
  assert.deepEqual(qh.phieu.find((x: any) => x.id === b)?.thu, { loai: "TU_CHOI_DUYET", trangThai: "LOI" });
  assert.equal(qh.phieu.some((x: any) => x.id === a || x.id === c), false);
  // Ai gửi lại: theo bước.
  assert.equal((await goi(w, HR, a, "gui-lai-thu")).status, 403, "Nhân sự không gửi lại thư của bước xác minh");
  assert.equal((await goi(w, XM, b, "gui-lai-thu")).status, 403, "Quản lý bán hàng (người xác minh) không gửi lại thư của bước duyệt");
  assert.equal((await goi(w, SALES, a, "gui-lai-thu")).status, 403, "không xem hàng chờ ⇒ 403 ở cổng");
  bo.hong = false;
  const r = await goi(w, XM, a, "gui-lai-thu");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.thu, { loai: "TU_CHOI", trangThai: "CHO" });
  assert.equal((await goi(w, HR, b, "gui-lai-thu")).status, 200);
  assert.equal((await goi(w, XM, c, "gui-lai-thu")).status, 200);
  await w.choNen();
  assert.equal(thu.length, 3);
  assert.ok(thu.every((t) => t.to === EMAIL));
  assert.deepEqual(lenhThu(w, a), ["THU_TU_CHOI_CHO", "THU_TU_CHOI_LOI", "THU_TU_CHOI_CHO", "THU_TU_CHOI_GUI"]);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'registration_notice_resent'")[0].n, 3);
  khongLoDuLieu(w, a);
  khongLoDuLieu(w, b);
  // Đã gửi ⇒ phiếu từ chối rời hàng chờ; gửi lại nữa ⇒ 409.
  assert.equal((await hangCho(w, XM)).phieu.some((x: any) => x.id === a), false);
  assert.equal((await hangCho(w, HR)).phieu.some((x: any) => x.id === b), false);
  assert.equal((await goi(w, XM, a, "gui-lai-thu")).json.error.code, "notice_not_pending");
  // Thư «đã duyệt» gửi lại bằng «Gửi lại lời mời».
  const d = phieu(w, { dienThoai: "0912 000 777", so: null });
  await xacMinh(w, d);
  bo.hong = true;
  assert.equal((await goi(w, HR, d, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 })).status, 200);
  await w.choNen();
  assert.deepEqual((await hangCho(w, HR)).phieu.find((x: any) => x.id === d)?.thu, { loai: "DA_DUYET", trangThai: "LOI" });
  assert.equal((await goi(w, HR, d, "gui-lai-thu")).json.error.code, "notice_use_invite");
});

test("(T6) Danh tính đã ẩn danh ⇒ không gửi, không ghi dòng thư nào; gửi lại thư khi danh tính bị ẩn danh sau lần gửi hỏng ⇒ 409, không gửi", async () => {
  const { w, thu, bo } = setup();
  const id = phieu(w);
  anDanh(w, id);
  assert.equal((await goi(w, XM, id, "bo-sung", { lyDo: "KHONG_DOC_DUOC", phienBan: 1 })).status, 200, "lệnh vẫn chạy");
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.deepEqual(lenhThu(w, id), [], "không dòng thư nào");
  const b = phieu(w, { dienThoai: "0912 000 888", so: null });
  bo.hong = true;
  assert.equal((await goi(w, XM, b, "tu-choi", { lyDo: "KHONG_PHAI_CHINH_CHU", phienBan: 1 })).status, 200);
  await w.choNen();
  anDanh(w, b);
  bo.hong = false;
  const r = await goi(w, XM, b, "gui-lai-thu");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_identity_erased");
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.deepEqual(lenhThu(w, b), ["THU_TU_CHOI_CHO", "THU_TU_CHOI_LOI"]);
  assert.equal((await hangCho(w, XM)).phieu.some((x: any) => x.id === b), false, "đã ẩn danh: không còn gửi lại được nên không hiện");
});

// ---------------- I-3: «Trả về xác minh» ----------------

test("(R1) Nhân sự «Trả về xác minh» ⇒ CHỜ XÁC MINH, xoá kết luận Danh bạ + người xác minh, giữ kết luận từng mục; lịch sử + nhật ký không dữ liệu khai; phiếu về hàng chờ xác minh; duyệt bị từ chối tới khi xác minh lại", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal(reg(w, id).status, "CHO_DUYET");
  const r = await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 1 });
  assert.equal(r.status, 200, r.text);
  const p = reg(w, id);
  assert.equal(p.status, "CHO_XAC_MINH");
  assert.deepEqual([p.verified_by, p.verified_version, p.verified_at, p.match_kind, p.match_party_id, p.referrer_party_id], [null, null, null, null, null, null]);
  assert.equal(w.q("SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'TRA_VE_XAC_MINH' AND actor_ref = ?", id, HR)[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'registration_returned_to_verification' AND target_id = ?", id)[0].n, 1);
  khongLoDuLieu(w, id);
  assert.deepEqual(lenhThu(w, id), [], "trả về xác minh không gửi thư cho người đăng ký");
  // Về hàng chờ xác minh, có nội dung lại; kết luận từng mục giữ nguyên, kết luận Danh bạ trống.
  assert.ok((await hangCho(w, XM)).phieu.some((x: any) => x.id === id && x.trangThai === "CHO_XAC_MINH"));
  const ct = await w.call("GET", `/api/dang-ky/phieu/${id}`, { as: XM });
  assert.equal(ct.status, 200);
  assert.ok(ct.json.noiDung);
  assert.ok(ct.json.muc.every((m: any) => m.ketLuan === "DAT"));
  assert.equal(ct.json.ketLuanDanhBa, null);
  // Duyệt bị từ chối tới khi xác minh lại.
  const d = await goi(w, HR, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(d.status, 409, d.text);
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE phone = '0912345678'")[0].n, 0);
  // «Đạt» không có kết luận Danh bạ ⇒ 409: người xác minh phải kết luận lại.
  assert.equal((await goi(w, XM, id, "dat", { phienBan: 1 })).json.error.code, "registry_conclusion_missing");
  assert.equal((await goi(w, XM, id, "dat", { phienBan: 1, hoSo: { kieu: "MOI" } })).status, 200);
  assert.equal((await goi(w, HR, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 })).status, 200);
});

test("(R2) Phiên bản cũ ⇒ 409 registration_version_changed, không đổi; phiếu không CHỜ DUYỆT ⇒ 409; thân sai ⇒ 400", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  assert.equal((await goi(w, HR, id, "tra-ve-xac-minh", {})).status, 400);
  assert.equal((await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 1, them: 1 })).status, 400);
  const cu = await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 2 });
  assert.equal(cu.status, 409, cu.text);
  assert.equal(cu.json.error.code, "registration_version_changed");
  assert.equal(reg(w, id).status, "CHO_DUYET");
  assert.equal(reg(w, id).verified_by, XM);
  const b = phieu(w, { dienThoai: "0912 000 999", so: null }); // CHỜ XÁC MINH
  assert.equal((await goi(w, HR, b, "tra-ve-xac-minh", { phienBan: 1 })).json.error.code, "registration_state_changed");
  assert.equal(w.q("SELECT count(*) n FROM dk_event WHERE command = 'TRA_VE_XAC_MINH'")[0].n, 0);
});

test("(R2b) Phiên bản ghim TRONG câu: bản khai đổi ngay trước lô ⇒ câu trả về khớp 0 dòng, 409, không lịch sử / nhật ký", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  w.chenTruocLo((stmts: any[]) => stmts.length === 3, async () => {
    w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, given_name, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 2, 'Khác', 'pol', ?, ?, ?)`).run(`sub2-${id}`, id, AT, AT, AT);
    w.sqlite.prepare("UPDATE dk_registration SET current_version = 2 WHERE id = ?").run(id);
  });
  const r = await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 1 });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_version_changed");
  assert.equal(reg(w, id).status, "CHO_DUYET");
  assert.equal(w.q("SELECT count(*) n FROM dk_event WHERE command = 'TRA_VE_XAC_MINH'")[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'registration_returned_to_verification'")[0].n, 0);
});

test("(R3) Trả về xác minh: Quản lý bán hàng (người xác minh), Bán hàng ⇒ 403; Quản trị (người duyệt, ADR-0219), Toàn quyền được", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  for (const as of [XM, SALES]) assert.equal((await goi(w, as, id, "tra-ve-xac-minh", { phienBan: 1 })).status, 403, as);
  assert.equal(reg(w, id).status, "CHO_DUYET");
  assert.equal((await goi(w, SUP, id, "tra-ve-xac-minh", { phienBan: 1 })).status, 200);
  assert.equal((await goi(w, XM, id, "dat", { phienBan: 1, hoSo: { kieu: "MOI" } })).status, 200);
  assert.equal((await goi(w, ADM, id, "tra-ve-xac-minh", { phienBan: 1 })).status, 200, "Quản trị là người duyệt nên trả về được");
});

test("(R4) Người duyệt ≠ người xác minh vẫn đúng sau khi xác minh lại: người xác minh LẦN SAU không tự duyệt được; người xác minh lần đầu duyệt được khi người khác xác minh lại", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id, XM_ADM); // XM_ADM xác minh lần đầu
  assert.equal((await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 1 })).status, 200);
  assert.equal((await goi(w, XM_ADM, id, "dat", { phienBan: 1, hoSo: { kieu: "MOI" } })).status, 200); // XM_ADM xác minh lại
  const tu = await goi(w, XM_ADM, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(tu.status, 409, tu.text);
  assert.equal(tu.json.error.code, "registration_same_person");
  // Chiều ngược: người khác (XM) xác minh lại ⇒ người xác minh lần đầu (XM_ADM) nay duyệt được.
  assert.equal((await goi(w, HR, id, "tra-ve-xac-minh", { phienBan: 1 })).status, 200);
  assert.equal((await goi(w, XM, id, "dat", { phienBan: 1, hoSo: { kieu: "MOI" } })).status, 200);
  assert.equal(reg(w, id).verified_by, XM);
  const ok = await goi(w, XM_ADM, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(ok.status, 200, ok.text);
});

test("(R5) Câu 409 ở bước duyệt chỉ tới «Trả về xác minh» khi hợp (căn cước thuộc hồ sơ khác); số điện thoại đã có tài khoản vẫn là từ chối hoặc sửa", async () => {
  const { w } = setup();
  const id = phieu(w, { dienThoai: "0900000001" }); // trùng số đăng nhập của Bán hàng
  await xacMinh(w, id);
  const r = await goi(w, HR, id, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(r.json.error.code, "phone_taken");
  assert.equal(/Trả về xác minh/.test(r.json.error.message), false);
  const khac = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Khác Hẳn Tên", contacts: [] } })).json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${khac}/documents`, { as: ADM, body: { typeCode: "CCCD", number: SO, issuedDate: "2021-01-01", issuedPlace: "Cục", expiryDate: "2035-01-01" } })).status, 201);
  const b = phieu(w, { dienThoai: "0912 111 222" });
  await xacMinh(w, b);
  const r2 = await goi(w, HR, b, "duyet", { roleCode: "GUIDE_FREELANCE", phienBan: 1 });
  assert.equal(r2.json.error.code, "document_other_person");
  assert.match(r2.json.error.message, /Trả về xác minh/);
});

// ---------------- I-4: hàng chờ xác minh ----------------

/** Gieo thẳng `n` phiếu ở `trangThai` (qua đúng đồ thị), gửi lúc `guiLuc`. */
function gieoNhieu(w: any, n: number, trangThai: "DANG_DIEN" | "CAN_BO_SUNG", guiLuc: string) {
  const chen = w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'GUIDE_FREELANCE', ?, ?)");
  const doi = w.sqlite.prepare("UPDATE dk_registration SET status = ?, submitted_at = ? WHERE id = ?");
  for (let i = 0; i < n; i++) {
    const id = maMoi();
    chen.run(id, guiLuc, guiLuc);
    if (trangThai === "CAN_BO_SUNG") { doi.run("CHO_XAC_MINH", guiLuc, id); doi.run("CAN_BO_SUNG", guiLuc, id); }
  }
}

test("(Q1) 250 phiếu ĐANG ĐIỀN không đẩy phiếu CHỜ XÁC MINH ra khỏi hàng chờ; phiếu nháp không hiện; không cờ «còn nữa»", async () => {
  const { w } = setup();
  gieoNhieu(w, 250, "DANG_DIEN", "2026-11-01T00:00:00.000Z"); // cũ hơn phiếu thật
  const id = phieu(w);
  const q = await hangCho(w, XM);
  assert.deepEqual(q.phieu.map((x: any) => x.id), [id]);
  assert.equal(q.conNua, false);
});

test("(Q2) 205 phiếu CẦN BỔ SUNG gửi sớm hơn: phiếu CHỜ XÁC MINH (việc làm được ngay) vẫn đứng đầu; đúng 200 dòng; cờ «còn nữa»", async () => {
  const { w } = setup();
  gieoNhieu(w, 205, "CAN_BO_SUNG", "2026-11-01T00:00:00.000Z");
  const id = phieu(w); // gửi lúc AT (muộn hơn)
  const q = await hangCho(w, XM);
  assert.equal(q.phieu.length, 200);
  assert.equal(q.phieu[0].id, id, "việc làm được ngay đứng đầu");
  assert.equal(q.conNua, true);
});

test("(T7) Đua: phiếu bị người khác yêu cầu bổ sung NGAY TRƯỚC lô của mình ⇒ lô khớp 0 dòng, 409, KHÔNG xếp thêm thư (câu xếp thư canh «phiếu vừa được chính lệnh này đổi»)", async () => {
  const { w, thu } = setup();
  const id = phieu(w);
  w.chenTruocLo((stmts: any[]) => stmts.length === 4, async () => {
    w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC', updated_at = '2026-11-11T00:00:00.000Z', updated_by = ? WHERE id = ?").run(XM2, id);
  });
  const r = await goi(w, XM, id, "bo-sung", { lyDo: "KHONG_DOC_DUOC", phienBan: 1 });
  assert.equal(r.status, 409, r.text);
  await w.choNen();
  assert.equal(thu.length, 0);
  assert.deepEqual(lenhThu(w, id), []);
});

test("(R6) M-1: câu «từ chối duyệt» ghim phiên bản TRONG câu — không gửi phiên bản (null) ⇒ 0 dòng (không còn COALESCE)", async () => {
  const { w } = setup();
  const id = phieu(w);
  await xacMinh(w, id);
  const { tuChoiDuyetStatement } = await import("./repository.ts");
  const kq = await w.env.DB.batch([tuChoiDuyetStatement(w.env.DB, { registrationId: id, lyDo: "KHONG_THUOC_DIEN", by: HR, at: new Date().toISOString(), phienBan: null as unknown as number })]);
  assert.equal(kq[0].meta.changes, 0);
  assert.equal(reg(w, id).status, "CHO_DUYET");
});

test("(T8) Thư «cần bổ sung» lỗi của phiếu ĐÃ GỬI LẠI không còn hiện ở hàng chờ (thư chỉ hiện khi phiếu còn đúng trạng thái của thư)", async () => {
  const { w } = setup({ guiHong: true });
  const id = phieu(w);
  assert.equal((await goi(w, XM, id, "bo-sung", { lyDo: "KHONG_DOC_DUOC", phienBan: 1 })).status, 200);
  await w.choNen();
  assert.deepEqual((await hangCho(w, XM)).phieu.find((x: any) => x.id === id)?.thu, { loai: "BO_SUNG", trangThai: "LOI" });
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id); // người đăng ký đã gửi lại
  assert.equal((await hangCho(w, XM)).phieu.find((x: any) => x.id === id)?.thu, null);
  assert.equal((await goi(w, XM, id, "gui-lai-thu")).json.error.code, "registration_state_changed");
});
