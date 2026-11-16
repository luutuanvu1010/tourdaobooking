// Bốn route của người đăng ký trên phiếu của mình (ADR-0206 Đ6, Đ7, Đ9; ADR-0207 Đ2; ADR-0208 Đ7; ADR-0210 Đ1): xem, lưu nháp (loại đối tác), gửi, rút — qua khung thử THẬT
// (tests/audit/harness.mjs). Công khai + kiểm cookie đăng ký trong thân route. Bài này cũng là bài PHỤ TRÁCH của ba cột N3 của dk_submission (nhat-ky-hang.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { DK_COOKIE, taoPhienDangKy } from "./phien.ts";
import { guiChenStatement, guiTienStatement, suKienNguoiDangKyStatement, type BanKhaiMoi } from "./repository.ts";

const PHIEU = "DK_ABCDEFGH";
const IDENT = "ident-1";
const EMAIL = "nguoi.dang.ky@example.com";
const DUONG = "/api/dang-ky/phieu";
const SO = "079111222333";
const SO_CACH = "079 111 222 333";
const DIEN_THOAI = "0912345678";
const NOI_CAP = "NOI CAP PHIEU DANG KY DANH DAU";
const VAI = "GUIDE_FREELANCE";

function setup(o: { chinhSach?: boolean } = {}) {
  const w = world();
  const at = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', '', ?, ?)").run(PHIEU, at, at);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(IDENT, PHIEU, EMAIL, EMAIL, at, at);
  if (o.chinhSach !== false) chinhSachRiengTu(w, 1);
  return w;
}
function chinhSachRiengTu(w: any, version: number) {
  const at = new Date(Date.now() - 3_600_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'mục đích', 'Toàn văn.', ?, ?, 'x', ?, 'x')").run(`cs-${version}`, version, at, at, at);
}
async function cookie(w: any, nowMs = Date.now(), ident = IDENT): Promise<string> {
  return `${DK_COOKIE}=${await taoPhienDangKy(w.env.SESSION_SECRET, PHIEU, ident, nowMs)}`;
}
async function goi(w: any, method: string, duong: string, o: { body?: unknown; cookie?: string | null } = {}) {
  const ck = o.cookie === undefined ? await cookie(w) : o.cookie;
  return w.call(method, duong, { ...(o.body !== undefined ? { body: o.body } : {}), headers: ck ? { cookie: ck } : {} });
}
const xem = (w: any, o: { cookie?: string | null } = {}) => goi(w, "GET", DUONG, o);
const luu = (w: any, loai: unknown, o: { cookie?: string | null } = {}) => goi(w, "PUT", DUONG, { body: { loai }, ...o });
const gui = (w: any, body: unknown, o: { cookie?: string | null } = {}) => goi(w, "POST", `${DUONG}/gui`, { body, ...o });
const rut = (w: any, o: { cookie?: string | null } = {}) => goi(w, "POST", `${DUONG}/rut`, { body: {}, ...o });
/** Thân gửi hợp lệ; `doi` ghi đè (undefined ⇒ bỏ trường). */
function banKhai(doi: Record<string, unknown> = {}): Record<string, unknown> {
  const b: Record<string, unknown> = {
    chinhSachPhienBan: 1, hoTen: "Nguyễn Văn Thử", ngaySinh: "1990-05-06", diaChi: "12 Đường Thử, Nha Trang", dienThoai: "0912 345 678",
    giayTo: { typeCode: "CCCD", number: SO_CACH, issuedDate: "2021-03-04", issuedPlace: NOI_CAP, expiryDate: "2036-05-06" },
    ...doi,
  };
  for (const k of Object.keys(b)) if (b[k] === undefined) delete b[k];
  return b;
}
const phieu = (w: any): any => ({ ...w.q("SELECT * FROM dk_registration WHERE id = ?", PHIEU)[0] });
const soDong = (w: any, bang: string): number => w.q(`SELECT count(*) n FROM ${bang}`)[0].n;
const lichSu = (w: any): string[] => w.q("SELECT command FROM dk_event WHERE registration_id = ? ORDER BY rowid", PHIEU).map((x: any) => x.command);
async function daGui(w: any): Promise<void> {
  assert.equal((await luu(w, VAI)).status, 200);
  const r = await gui(w, banKhai());
  assert.equal(r.status, 200, r.text);
}
const chuyen = (w: any, ...ds: string[]) => { for (const t of ds) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, PHIEU); };

test("không cookie, cookie sai chữ ký, danh tính không thuộc phiếu: 401 ở cả bốn route; không dòng nào đổi; cookie của nhân viên (td_session) không thay được", async () => {
  const w = setup();
  const truoc = phieu(w);
  for (const ck of [null, `${DK_COOKIE}=dk1.${PHIEU}.${IDENT}.1.2.xxxx`, await cookie(w, Date.now(), "ident-la"), "td_session=abc.def"]) {
    assert.equal((await xem(w, { cookie: ck })).status, 401);
    assert.equal((await luu(w, VAI, { cookie: ck })).status, 401);
    assert.equal((await gui(w, banKhai(), { cookie: ck })).status, 401);
    assert.equal((await rut(w, { cookie: ck })).status, 401);
  }
  assert.deepEqual(phieu(w), truoc);
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.deepEqual(lichSu(w), []);
});

test("cookie hết hạn không thao tác (chính sách 30 phút): 401", async () => {
  const w = setup();
  assert.equal((await xem(w, { cookie: await cookie(w, Date.now() - 31 * 60_000) })).status, 401);
});

test("GET: phiếu đang điền — mã, trạng thái và nhãn, chưa chọn loại, không tệp, không bản khai; không email, không khoá kho; cookie cấp lại giữ mốc bắt đầu", async () => {
  const w = setup();
  const t0 = Date.now() - 60_000;
  const r = await xem(w, { cookie: await cookie(w, t0) });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, {
    maPhieu: PHIEU, trangThai: "DANG_DIEN", nhanTrangThai: "Đang điền", chiXem: false, loai: null, phienBan: 0, guiLuc: null, hanLuc: null, lyDo: null, tep: [], banKhaiTruoc: null,
  });
  assert.equal(r.text.includes(EMAIL), false);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const sc = r.headers.get("set-cookie") ?? "";
  for (const x of ["HttpOnly", "SameSite=Lax", "Secure", "Path=/api/dang-ky"]) assert.ok(sc.includes(x), x);
  const parts = sc.split(";")[0]!.split("=")[1]!.split(".");
  assert.equal(Number(parts[3]), t0, "mốc bắt đầu phiên giữ nguyên");
  assert.ok(Number(parts[4]) > t0, "mốc thao tác cuối được làm mới");
});

test("PUT: chọn loại đối tác mở ⇒ lưu, lịch sử LUU_NHAP, nhãn tên loại; chọn lại đúng loại đó ⇒ 200 không thêm dòng lịch sử; đổi loại khi còn đang điền ⇒ được", async () => {
  const w = setup();
  const r = await luu(w, VAI);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.ma, VAI);
  assert.equal(typeof r.json.loai.ten, "string");
  assert.equal(phieu(w).role_code, VAI);
  assert.deepEqual(lichSu(w), ["LUU_NHAP"]);
  assert.equal((await luu(w, VAI)).status, 200);
  assert.deepEqual(lichSu(w), ["LUU_NHAP"], "không đổi gì thì không ghi lịch sử");
  assert.equal((await luu(w, "TAXI_DRIVER")).status, 200);
  assert.equal(phieu(w).role_code, "TAXI_DRIVER");
  assert.equal(w.q("SELECT actor_kind, actor_ref FROM dk_event ORDER BY rowid DESC LIMIT 1")[0].actor_ref, IDENT);
});

test("PUT: loại ngoài danh sách mở (đại lý du lịch, loại lạ, thiếu, không phải chữ) ⇒ 400, không đổi gì; công tắc đóng KHÔNG chặn phiếu đã có", async () => {
  const w = setup();
  assert.equal(w.q("SELECT registration_open FROM dk_policy ORDER BY valid_from_at DESC LIMIT 1")[0].registration_open, 0, "bài chạy với công tắc ĐÓNG (Đ9)");
  for (const v of ["TRAVEL_AGENCY", "KHONG_CO_LOAI_NAY", "", undefined, 7, null]) assert.equal((await luu(w, v)).status, 400, String(v));
  assert.equal(phieu(w).role_code, "");
  assert.deepEqual(lichSu(w), []);
  assert.equal((await luu(w, VAI)).status, 200, "công tắc đóng vẫn lưu được");
});

test("gửi khi chưa có chính sách riêng tư ⇒ 409 no_privacy_policy; chưa nêu phiên bản ⇒ 409 consent_required; phiên bản lỗi thời ⇒ 409 policy_changed; không bản khai nào", async () => {
  const w = setup({ chinhSach: false });
  await luu(w, VAI);
  const r1 = await gui(w, banKhai());
  assert.equal(r1.status, 409);
  assert.equal(r1.json.error.code, "no_privacy_policy");
  assert.match(r1.json.error.message, /chính sách riêng tư/);
  chinhSachRiengTu(w, 1);
  const r2 = await gui(w, banKhai({ chinhSachPhienBan: undefined }));
  assert.equal(r2.status, 409);
  assert.equal(r2.json.error.code, "consent_required");
  assert.match(r2.json.error.message, /đồng ý/);
  chinhSachRiengTu(w, 2);
  const r3 = await gui(w, banKhai({ chinhSachPhienBan: 1 }));
  assert.equal(r3.status, 409);
  assert.equal(r3.json.error.code, "policy_changed");
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.equal(phieu(w).status, "DANG_DIEN");
});

test("gửi khi chưa chọn loại ⇒ 400 (phiếu loại '' không gửi được); thiếu mục bắt buộc ⇒ 400 nêu tên mục, không nhắc lại giá trị khai; không dòng pty_party, pty_attachment, staff", async () => {
  const w = setup();
  const dem = () => [soDong(w, "pty_party"), soDong(w, "pty_attachment"), soDong(w, "staff")];
  const truoc = dem();
  const chuaChon = await gui(w, banKhai());
  assert.equal(chuaChon.status, 400, chuaChon.text);
  assert.match(chuaChon.json.error.message, /Vai người dùng xin đăng ký/);
  await luu(w, VAI);
  const thieuNgaySinh = await gui(w, banKhai({ ngaySinh: undefined }));
  assert.equal(thieuNgaySinh.status, 400, thieuNgaySinh.text);
  assert.match(thieuNgaySinh.json.error.message, /Ngày sinh/);
  const thieuDienThoai = await gui(w, banKhai({ dienThoai: undefined }));
  assert.equal(thieuDienThoai.status, 400);
  assert.match(thieuDienThoai.json.error.message, /Số điện thoại/);
  assert.equal(thieuDienThoai.json.error.message.includes("Đã gọi"), false, "nhãn cho người đăng ký, không phải nhãn của người xác minh (m3)");
  const thieuGiayTo = await gui(w, banKhai({ giayTo: undefined }));
  assert.equal(thieuGiayTo.status, 400);
  assert.match(thieuGiayTo.json.error.message, /Căn cước công dân/);
  const sai = await gui(w, banKhai({ giayTo: { typeCode: "CCCD", number: "12345", issuedDate: "2021-03-04", expiryDate: "2036-05-06" } }));
  assert.equal(sai.status, 400);
  for (const t of [chuaChon, thieuNgaySinh, thieuDienThoai, thieuGiayTo, sai]) for (const cam of [SO, SO_CACH, DIEN_THOAI, EMAIL]) assert.equal(t.text.includes(cam), false);
  assert.equal((await gui(w, banKhai({ hoTen: undefined }))).status, 400);
  assert.equal((await gui(w, banKhai({ ngaySinh: "2999-01-01" }))).status, 400);
  assert.equal((await gui(w, banKhai({ dienThoai: "abc" }))).status, 400);
  assert.equal((await gui(w, banKhai({ giayTo: { typeCode: "CCCD", number: SO_CACH, issuedDate: "2001-03-04", expiryDate: "2010-05-06" } }))).status, 400, "căn cước hết hạn không phải «còn hiệu lực»");
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.deepEqual(dem(), truoc);
  assert.equal(phieu(w).status, "DANG_DIEN");
});

test("mục bắt buộc là HỢP của chính sách đăng ký và view hồ sơ; mã mục lạ ⇒ không gửi được (đóng khi không rõ)", async () => {
  const w = setup();
  await luu(w, VAI);
  const cu = w.sqlite.prepare("SELECT * FROM dk_policy ORDER BY valid_from_at DESC LIMIT 1").get() as Record<string, unknown>;
  const moi = { ...cu, id: "thu-muc-la", phieu_required_items: "ROLE,CALLED,MUC_LA", valid_from_at: new Date(Date.parse(String(cu.valid_from_at)) + 1).toISOString() };
  w.sqlite.prepare(`INSERT INTO dk_policy (${Object.keys(moi).join(",")}) VALUES (${Object.keys(moi).map(() => "?").join(",")})`).run(...Object.values(moi));
  const r = await gui(w, banKhai());
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /MUC_LA/);
  assert.equal(soDong(w, "dk_submission"), 0);
});

test("gửi đủ: 200, chờ xác minh, đúng MỘT bản khai bất biến (số, nơi cấp, đồng ý đúng phiên bản); phiên bản tăng 1; lịch sử GUI; DTO không số đủ, không điện thoại, không email; nhật ký trống", async () => {
  const w = setup();
  await luu(w, VAI);
  const nhatKyTruoc = soDong(w, "audit_log");
  const hoSoTruoc = [soDong(w, "pty_party"), soDong(w, "pty_attachment"), soDong(w, "staff")];
  const r = await gui(w, banKhai());
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.trangThai, "CHO_XAC_MINH");
  assert.equal(r.json.nhanTrangThai, "Đang chờ xác minh");
  assert.equal(r.json.phienBan, 1);
  assert.equal(r.json.chiXem, true);
  for (const cam of [SO, SO_CACH, DIEN_THOAI, "0912 345 678", EMAIL, NOI_CAP, "pty/"]) assert.equal(r.text.includes(cam), false, `DTO lộ ${cam}`);
  assert.equal(r.json.banKhaiTruoc, null, "chỉ phiếu CẦN BỔ SUNG mới trả lại nội dung đã khai (I2)");
  const p = phieu(w);
  assert.equal(p.status, "CHO_XAC_MINH");
  assert.equal(p.current_version, 1);
  assert.ok(p.submitted_at);
  const bk = w.q("SELECT * FROM dk_submission");
  assert.equal(bk.length, 1);
  assert.equal(bk[0].version, 1);
  assert.equal(bk[0].given_name, "Thử");
  assert.equal(bk[0].family_name, "Nguyễn");
  assert.equal(bk[0].middle_name, "Văn");
  assert.equal(bk[0].birth_date, "1990-05-06");
  assert.equal(bk[0].number_key, SO);
  assert.equal(bk[0].document_number, SO_CACH);
  assert.equal(bk[0].issued_place, NOI_CAP);
  assert.equal(bk[0].phone_key, DIEN_THOAI);
  assert.equal(bk[0].policy_id, "cs-1");
  assert.deepEqual(lichSu(w), ["LUU_NHAP", "GUI"]);
  assert.equal(soDong(w, "audit_log"), nhatKyTruoc, "lệnh của người đăng ký vào lịch sử phiếu, KHÔNG vào audit_log (Đ12)");
  assert.deepEqual([soDong(w, "pty_party"), soDong(w, "pty_attachment"), soDong(w, "staff")], hoSoTruoc, "gửi không sinh hồ sơ, tệp hồ sơ, tài khoản");
  assert.throws(() => w.sqlite.prepare("UPDATE dk_submission SET given_name = 'Sửa' WHERE id = ?").run(bk[0].id), /dk_submission_content/);
});

test("bấm «Gửi» hai lần: tuần tự và song song đều ra MỘT bản khai và cùng một kết quả 200 (Đ7), phiên bản chỉ tăng một", async () => {
  const w = setup();
  await luu(w, VAI);
  const [a, b] = await Promise.all([gui(w, banKhai()), gui(w, banKhai())]);
  assert.equal(a.status, 200, a.text);
  assert.equal(b.status, 200, b.text);
  assert.equal(a.json.trangThai, "CHO_XAC_MINH");
  assert.equal(b.json.trangThai, "CHO_XAC_MINH");
  assert.equal(a.json.phienBan, 1);
  assert.equal(b.json.phienBan, 1);
  const c = await gui(w, banKhai());
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.phienBan, 1);
  assert.equal(soDong(w, "dk_submission"), 1);
  assert.equal(phieu(w).current_version, 1);
  assert.deepEqual(lichSu(w).filter((x) => x === "GUI"), ["GUI"], "một dòng lịch sử GUI");
});

test("«Gửi» hai lần song song, lần hai đến sau khi lô đầu đã xong giữa chừng đọc: câu ghi mang điều kiện trạng thái ⇒ lô thứ hai khớp 0 dòng, vẫn một bản khai", async () => {
  const w = setup();
  await luu(w, VAI);
  const kq = await Promise.all([gui(w, banKhai()), gui(w, banKhai()), gui(w, banKhai())]);
  assert.deepEqual(kq.map((r: any) => r.status), [200, 200, 200]);
  assert.equal(soDong(w, "dk_submission"), 1);
});

test("CẦN BỔ SUNG: GET kể lý do bằng câu cho người ngoài và bản khai trước (số che); PUT cùng loại ⇒ 200; PUT loại khác ⇒ 409; gửi lại ⇒ bản khai MỚI (phiên bản 2), về CHỜ XÁC MINH, lý do xoá", async () => {
  const w = setup();
  await daGui(w);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC', expires_at = '2099-01-01T00:00:00.000Z' WHERE id = ?").run(PHIEU);
  const g = await xem(w);
  assert.equal(g.json.trangThai, "CAN_BO_SUNG");
  assert.equal(g.json.hanLuc, "2099-01-01T00:00:00.000Z", "hạn sửa hiện cho người đăng ký");
  assert.equal(g.json.chiXem, false);
  assert.deepEqual(g.json.lyDo, { ma: "KHONG_DOC_DUOC", cau: "Ảnh hoặc thông tin không đọc được. Vui lòng gửi lại bản rõ hơn." });
  assert.equal(g.json.banKhaiTruoc.hoTen, "Nguyễn Văn Thử");
  assert.equal(g.json.banKhaiTruoc.ngaySinh, "1990-05-06");
  assert.equal(g.json.banKhaiTruoc.giayTo.soChe, "••••2333");
  for (const cam of [SO, SO_CACH, DIEN_THOAI, EMAIL, NOI_CAP]) assert.equal(g.text.includes(cam), false);
  assert.equal((await luu(w, VAI)).status, 200);
  const doi = await luu(w, "TAXI_DRIVER");
  assert.equal(doi.status, 409, doi.text);
  assert.equal(phieu(w).role_code, VAI);
  const lai = await gui(w, banKhai({ hoTen: "Nguyễn Văn Thử Hai" }));
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.trangThai, "CHO_XAC_MINH");
  assert.equal(lai.json.phienBan, 2);
  const p = phieu(w);
  assert.equal(p.current_version, 2);
  assert.equal(p.reason_code, null);
  assert.equal(p.expires_at, null, "gửi lại xoá mốc hạn sửa (đợt 1 Task 9) — phiếu chờ xác minh không tự hết hạn");
  assert.deepEqual(w.q("SELECT version, given_name FROM dk_submission ORDER BY version").map((x: any) => ({ ...x })), [{ version: 1, given_name: "Thử" }, { version: 2, given_name: "Hai" }]);
  assert.deepEqual(lichSu(w), ["LUU_NHAP", "GUI", "GUI_LAI"]);
});

test("người xác minh mở tab cũ (bản khai 1) bị 409 sau khi người đăng ký gửi lại: gửi lại làm current_version tăng", async () => {
  const w = setup();
  await daGui(w);
  const truoc = phieu(w).current_version;
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  assert.equal((await gui(w, banKhai())).status, 200);
  assert.equal(phieu(w).current_version, truoc + 1, "phienBan trong thân ket-luan/dat của người xác minh (route của Task 6) so với giá trị này");
});

test("phiếu đang chờ xác minh hay chờ duyệt: PUT ⇒ 409 không sửa được; gửi ⇒ chờ xác minh trả lại kết quả cũ (200, không bản khai thứ hai), chờ duyệt ⇒ 409", async () => {
  const w = setup();
  await daGui(w);
  assert.equal((await luu(w, "TAXI_DRIVER")).status, 409);
  const lai = await gui(w, banKhai({ hoTen: "Người Khác Hẳn" }));
  assert.equal(lai.status, 200);
  assert.equal(soDong(w, "dk_submission"), 1);
  chuyen(w, "CHO_DUYET");
  assert.equal((await gui(w, banKhai())).status, 409);
  assert.equal((await luu(w, VAI)).status, 409);
  assert.equal(soDong(w, "dk_submission"), 1);
});

test("rút khi đang điền: ĐÃ RÚT, lịch sử RUT, danh tính hết mở, mọi tệp chờ nhận quyết gỡ cùng lô và bị xoá khỏi kho; rút lần hai ⇒ 200 như lần đầu; gửi, lưu sau đó ⇒ 409", async () => {
  const w = setup();
  const at = new Date().toISOString();
  const key = `pty/${crypto.randomUUID().replace(/-/g, "")}`;
  const tid = crypto.randomUUID();
  w.sqlite.prepare(`INSERT INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CCCD_MAT_TRUOC', ?, 'png', 11, ?, ?, ?, ?, ?)`).run(tid, PHIEU, key, "e".repeat(64), at, IDENT, at, IDENT);
  await w.r2.put(key, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
  w.sqlite.prepare("UPDATE pty_registration_attachment SET stored_at = ? WHERE id = ?").run(at, tid);
  const r = await rut(w);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.trangThai, "DA_RUT");
  assert.equal(r.json.nhanTrangThai, "Đã rút");
  assert.equal(r.json.chiXem, true);
  assert.equal(r.json.banKhaiTruoc, null);
  assert.equal(phieu(w).status, "DA_RUT");
  assert.equal(w.q("SELECT is_open FROM dk_identity WHERE id = ?", IDENT)[0].is_open, 0);
  assert.deepEqual(lichSu(w), ["RUT"]);
  const t = w.q("SELECT purge_reason, content_hash, r2_deleted_at FROM pty_registration_attachment")[0];
  assert.equal(t.purge_reason, "DA_RUT");
  assert.equal(t.content_hash, null);
  assert.ok(t.r2_deleted_at, "xoá kho chạy sau lô");
  assert.equal(w.r2.co(key), false);
  const lai = await rut(w);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.trangThai, "DA_RUT");
  assert.deepEqual(lichSu(w), ["RUT"], "rút lần hai không thêm dòng lịch sử");
  assert.equal((await gui(w, banKhai())).status, 409);
  assert.equal((await luu(w, VAI)).status, 409);
  assert.equal(soDong(w, "dk_submission"), 0);
});

test("rút khi chờ xác minh, cần bổ sung, chờ duyệt: ĐÃ RÚT; bản khai đã gửi giữ nguyên (bất biến)", async () => {
  for (const [dich, trang] of [["CHO_XAC_MINH", []], ["CAN_BO_SUNG", ["CAN_BO_SUNG"]], ["CHO_DUYET", ["CHO_DUYET"]]] as [string, string[]][]) {
    const w = setup();
    await daGui(w);
    if (trang.length) chuyen(w, ...trang);
    assert.equal(phieu(w).status, dich);
    const r = await rut(w);
    assert.equal(r.status, 200, `${dich}: ${r.text}`);
    assert.equal(phieu(w).status, "DA_RUT");
    assert.equal(soDong(w, "dk_submission"), 1);
  }
});

test("phiếu đã duyệt chưa kích hoạt (danh tính hết mở): GET xem được, chỉ đọc, trạng thái ĐÃ DUYỆT; PUT, gửi, rút đều 409 và không đổi gì", async () => {
  const w = setup();
  await daGui(w);
  chuyen(w, "CHO_DUYET", "DA_DUYET");
  assert.equal(w.q("SELECT is_open FROM dk_identity WHERE id = ?", IDENT)[0].is_open, 0);
  const truoc = [phieu(w), soDong(w, "dk_submission"), lichSu(w)];
  const g = await xem(w);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.trangThai, "DA_DUYET");
  assert.equal(g.json.nhanTrangThai, "Đã duyệt");
  assert.equal(g.json.chiXem, true);
  assert.equal(g.json.banKhaiTruoc, null, "phiếu đã duyệt không trả lại nội dung đã khai (I2)");
  assert.equal((await luu(w, VAI)).status, 409);
  assert.equal((await gui(w, banKhai())).status, 409);
  assert.equal((await rut(w)).status, 409);
  assert.deepEqual([phieu(w), soDong(w, "dk_submission"), lichSu(w)], truoc);
});

test("phiếu bị từ chối: GET kể lý do bằng câu cho người ngoài; ghi ⇒ 409", async () => {
  const w = setup();
  await daGui(w);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'TU_CHOI', reason_code = 'TRUNG_HO_SO_KHAC' WHERE id = ?").run(PHIEU);
  const g = await xem(w);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.nhanTrangThai, "Bị từ chối");
  assert.equal(g.json.lyDo.cau, "Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo.");
  assert.equal(g.text.includes("tài khoản"), false, "câu cố ý không nói «đã có tài khoản»");
  assert.equal(g.json.banKhaiTruoc, null, "phiếu đã kết thúc không trả lại họ tên, ngày sinh, địa chỉ (I2)");
  assert.equal((await luu(w, VAI)).status, 409);
  assert.equal((await gui(w, banKhai())).status, 409);
  assert.equal((await rut(w)).status, 409);
});

test("bảo trì BẬT ⇒ 503 `maintenance` ở cả bốn route, không đổi gì; TẮT lại thì dùng được (ADR-0206 Đ8)", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
  for (const r of [await xem(w), await luu(w, VAI), await gui(w, banKhai()), await rut(w)]) {
    assert.equal(r.status, 503, r.text);
    assert.equal(r.json.error.code, "maintenance");
  }
  assert.equal(phieu(w).role_code, "");
  assert.deepEqual(lichSu(w), []);
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal((await xem(w)).status, 200);
});

test("cookie cấp lại sau mỗi lệnh thành công (PUT, gửi, rút) giữ mốc bắt đầu cũ; lệnh thất bại không cấp lại", async () => {
  const w = setup();
  const t0 = Date.now() - 120_000;
  const ck = await cookie(w, t0);
  const batDau = (r: any): number => Number((r.headers.get("set-cookie") ?? "").split(";")[0]!.split("=")[1]!.split(".")[3]);
  const a = await luu(w, VAI, { cookie: ck });
  assert.equal(batDau(a), t0);
  const loi = await gui(w, banKhai({ ngaySinh: undefined }), { cookie: ck });
  assert.equal(loi.status, 400);
  assert.equal(loi.headers.get("set-cookie"), null);
  const b = await gui(w, banKhai(), { cookie: ck });
  assert.equal(batDau(b), t0);
  const c = await rut(w, { cookie: ck });
  assert.equal(batDau(c), t0);
});

test("lịch sử phiếu và nhật ký không mang email, điện thoại, số giấy tờ, nơi cấp, ngày sinh, địa chỉ (bộ dò doNhatKyHang — PHỤ TRÁCH ba cột N3 của dk_submission), kể cả sau gửi lại và rút", async () => {
  const w = setup();
  await daGui(w);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  await gui(w, banKhai());
  await rut(w);
  const ds = doNhatKyHang(w.sqlite, ["dk_submission.document_number", "dk_submission.number_key", "dk_submission.issued_place"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
  const sk = JSON.stringify(w.q("SELECT * FROM dk_event")) + JSON.stringify(w.q("SELECT * FROM audit_log"));
  for (const cam of [SO, SO_CACH, DIEN_THOAI, "0912 345 678", EMAIL, NOI_CAP, "1990-05-06", "Đường Thử", "pty/"]) assert.equal(sk.includes(cam), false, `lịch sử hay nhật ký lộ ${cam}`);
});

test("khoá điều kiện nằm TRONG câu ghi: gửi chèn bản khai bằng một câu có điều kiện trạng thái và phiên bản chính sách, rồi câu đổi phiếu điều kiện theo chính bản khai vừa chèn", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  const chen = src.match(/registration_submit_insert[\s\S]*?`,\s*\)/)?.[0] ?? "";
  assert.match(chen, /r\.status IN \('DANG_DIEN', 'CAN_BO_SUNG'\)/);
  assert.match(chen, /v_pty_privacy_effective/);
  assert.match(chen, /current_version \+ 1/);
  const doi = src.match(/registration_submit_advance[\s\S]*?`,\s*\)/)?.[0] ?? "";
  assert.match(doi, /EXISTS \(SELECT 1 FROM dk_submission/);
  assert.match(doi, /current_version = current_version \+ 1/);
});

test("hai lô «gửi» cùng đọc trạng thái cũ rồi cùng ghi (đua thật, không qua route): lô thứ hai khớp 0 dòng ở cả ba câu — đúng MỘT bản khai, một dòng lịch sử, phiên bản tăng một", async () => {
  const w = setup();
  await luu(w, VAI);
  const b: BanKhaiMoi = {
    family: "Nguyễn", middle: null, given: "Thử", gender: null, birthDate: "1990-05-06", address: null, phoneValue: "0912345678", phoneKey: "0912345678",
    documentType: "CCCD", documentNumber: SO, numberKey: SO, licenseClass: null, issuedDate: null, issuedPlace: null, expiryDate: null, referrer: null,
  };
  const lo = (id: string) => w.env.DB.batch([
    guiChenStatement(w.env.DB, { id, registrationId: PHIEU, policyId: "cs-1", at: new Date().toISOString(), identityId: IDENT, phienBanDaDoc: 0, b }),
    guiTienStatement(w.env.DB, { registrationId: PHIEU, submissionId: id, at: new Date().toISOString(), identityId: IDENT }),
    suKienNguoiDangKyStatement(w.env.DB, { registrationId: PHIEU, identityId: IDENT, command: "GUI", at: new Date().toISOString() }),
  ]);
  const a = await lo("sub-a");
  const c = await lo("sub-c");
  assert.deepEqual(a.map((x: any) => x.meta.changes), [1, 1, 1]);
  assert.deepEqual(c.map((x: any) => x.meta.changes), [0, 0, 0]);
  assert.equal(soDong(w, "dk_submission"), 1);
  assert.equal(phieu(w).current_version, 1);
  assert.deepEqual(lichSu(w).filter((x) => x === "GUI"), ["GUI"]);
});

// ---- Vòng sửa 1 ----
const batMay = (w: any, bat: boolean) => w.sqlite.exec(`UPDATE mnt_setting SET enabled = ${bat ? 1 : 0}, ends_at = NULL WHERE id = 'default'`);
const banKhaiMoi = (): BanKhaiMoi => ({
  family: "Nguyễn", middle: null, given: "Thử", gender: null, birthDate: "1990-05-06", address: null, phoneValue: "0912345678", phoneKey: "0912345678",
  documentType: "CCCD", documentNumber: SO, numberKey: SO, licenseClass: null, issuedDate: null, issuedPlace: null, expiryDate: null, referrer: null,
});
const loGui = (w: any, id: string, o: { policyId?: string; phienBanDaDoc: number }) => w.env.DB.batch([
  guiChenStatement(w.env.DB, { id, registrationId: PHIEU, policyId: o.policyId ?? "cs-1", at: new Date().toISOString(), identityId: IDENT, phienBanDaDoc: o.phienBanDaDoc, b: banKhaiMoi() }),
  guiTienStatement(w.env.DB, { registrationId: PHIEU, submissionId: id, at: new Date().toISOString(), identityId: IDENT }),
  suKienNguoiDangKyStatement(w.env.DB, { registrationId: PHIEU, identityId: IDENT, command: "GUI", at: new Date().toISOString() }),
]);

test("I1(a): câu chèn bản khai KHÔNG ghi khi phiên bản chính sách đã nêu không còn hiệu lực (gọi thẳng câu lệnh) — không bản khai, phiếu không đổi", async () => {
  const w = setup();
  await luu(w, VAI);
  chinhSachRiengTu(w, 2); // cs-1 không còn là bản hiện hành
  const kq = await loGui(w, "sub-cu", { policyId: "cs-1", phienBanDaDoc: 0 });
  assert.deepEqual(kq.map((x: any) => x.meta.changes), [0, 0, 0]);
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.equal(phieu(w).status, "DANG_DIEN");
  assert.deepEqual(lichSu(w), ["LUU_NHAP"]);
  const dung = await loGui(w, "sub-moi", { policyId: "cs-2", phienBanDaDoc: 0 });
  assert.deepEqual(dung.map((x: any) => x.meta.changes), [1, 1, 1], "đối chứng: đúng bản hiện hành thì ghi");
});

test("I1(b): câu chèn bản khai KHÔNG ghi khi phiếu đã ĐÃ RÚT, HẾT HẠN, TỪ CHỐI hay CHỜ XÁC MINH dù số bản khai đã đọc còn khớp (gọi thẳng câu lệnh)", async () => {
  for (const trangThai of ["DA_RUT", "HET_HAN", "TU_CHOI", "CHO_XAC_MINH"]) {
    const w = setup();
    await daGui(w); // current_version = 1, CHO_XAC_MINH
    if (trangThai !== "CHO_XAC_MINH") w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(trangThai, PHIEU);
    const truoc = [soDong(w, "dk_submission"), phieu(w).current_version, lichSu(w).length];
    const kq = await loGui(w, "sub-muoi", { phienBanDaDoc: 1 });
    assert.deepEqual(kq.map((x: any) => x.meta.changes), [0, 0, 0], trangThai);
    assert.deepEqual([soDong(w, "dk_submission"), phieu(w).current_version, lichSu(w).length], truoc, trangThai);
  }
});

test("I1(c): câu chèn bản khai KHÔNG ghi khi số bản khai đã đọc lỗi thời dù phiếu lại ở CẦN BỔ SUNG (đọc v1 → bị trả lại → đã gửi v2 → bị trả lại lần nữa)", async () => {
  const w = setup();
  await daGui(w); // v1
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  assert.equal((await gui(w, banKhai())).status, 200); // v2
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  const kq = await loGui(w, "sub-ba", { phienBanDaDoc: 1 }); // tab cũ đọc v1
  assert.deepEqual(kq.map((x: any) => x.meta.changes), [0, 0, 0]);
  assert.equal(soDong(w, "dk_submission"), 2);
});

test("I1: chính sách đổi GIỮA lúc đọc và lúc ghi ⇒ lô khớp 0 dòng, route trả 409 policy_changed (nhánh sau lô), không bản khai", async () => {
  const w = setup();
  await luu(w, VAI);
  const goc = w.env.DB.batch.bind(w.env.DB);
  w.env.DB.batch = async (st: unknown) => { w.env.DB.batch = goc; chinhSachRiengTu(w, 2); return goc(st); };
  const r = await gui(w, banKhai());
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "policy_changed");
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.equal(phieu(w).status, "DANG_DIEN");
  assert.equal((await gui(w, banKhai({ chinhSachPhienBan: 2 }))).status, 200, "gửi lại với bản mới thì được");
});

test("I2: CẦN BỔ SUNG chỉ trả bản khai MỚI NHẤT; bản mới nhất đã ẩn danh ⇒ null, KHÔNG lùi về bản cũ hơn", async () => {
  const w = setup();
  await daGui(w); // v1
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  assert.equal((await gui(w, banKhai({ hoTen: "Trần Văn Hai" }))).status, 200); // v2
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = 'KHONG_DOC_DUOC' WHERE id = ?").run(PHIEU);
  assert.equal((await xem(w)).json.banKhaiTruoc.hoTen, "Trần Văn Hai", "bản mới nhất, không phải v1");
  // Ẩn danh bản v2 đúng khuôn trigger dk_submission_erase_shape.
  w.sqlite.prepare(`UPDATE dk_submission SET erased_at = ?1, given_name = '(đã ẩn)', family_name = NULL, middle_name = NULL, gender = NULL, birth_date = NULL, address_value = NULL,
    phone_value = NULL, phone_key = NULL, issued_place = NULL, referrer_text = NULL, document_number = 'XOA' || upper(replace(id, '-', '')), number_key = 'XOA' || upper(replace(id, '-', ''))
    WHERE registration_id = ?2 AND version = 2`).run(new Date().toISOString(), PHIEU);
  const g = await xem(w);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.banKhaiTruoc, null);
  assert.equal(g.text.includes("Nguyễn Văn Thử"), false, "không rơi về bản v1");
});

test("I2: ĐÃ RÚT, HẾT HẠN, TỪ CHỐI, ĐÃ DUYỆT, CHỜ DUYỆT, CHỜ XÁC MINH không trả bản khai trước", async () => {
  for (const t of ["DA_RUT", "HET_HAN", "TU_CHOI", "CHO_DUYET", "DA_DUYET", "CHO_XAC_MINH"]) {
    const w = setup();
    await daGui(w);
    if (t === "CHO_DUYET" || t === "DA_DUYET") chuyen(w, "CHO_DUYET");
    if (t === "DA_DUYET") chuyen(w, "DA_DUYET");
    if (t === "DA_RUT" || t === "HET_HAN" || t === "TU_CHOI") chuyen(w, t);
    const g = await xem(w);
    assert.equal(g.status, 200, `${t}: ${g.text}`);
    assert.equal(g.json.banKhaiTruoc, null, t);
  }
});

test("m1: bảo trì BẬT và KHÔNG cookie ⇒ 503, không phải 401 (bảo trì đứng TRƯỚC cookie)", async () => {
  const w = setup();
  batMay(w, true);
  for (const r of [await xem(w, { cookie: null }), await luu(w, VAI, { cookie: null }), await gui(w, banKhai(), { cookie: null }), await rut(w, { cookie: null })]) {
    assert.equal(r.status, 503, r.text);
    assert.equal(r.json.error.code, "maintenance");
  }
  batMay(w, false);
  assert.equal((await xem(w, { cookie: null })).status, 401);
});

test("m2: trường lạ (ở thân hoặc trong giayTo) ⇒ 400 TRƯỚC các nhánh 409 về chính sách; không bản khai", async () => {
  const w = setup({ chinhSach: false }); // chưa có chính sách: nếu 409 đứng trước thì ra no_privacy_policy
  await luu(w, VAI);
  const lanThan = await gui(w, banKhai({ email: "x@example.com" }));
  assert.equal(lanThan.status, 400, lanThan.text);
  const lanGiayTo = await gui(w, banKhai({ giayTo: { typeCode: "CCCD", number: SO_CACH, issuedDate: "2021-03-04", expiryDate: "2036-05-06", ghiChu: "x" } }));
  assert.equal(lanGiayTo.status, 400, lanGiayTo.text);
  assert.equal(lanGiayTo.json.error.code, "invalid_input");
  assert.equal(soDong(w, "dk_submission"), 0);
  assert.equal((await gui(w, banKhai())).json.error.code, "no_privacy_policy", "thân sạch thì mới tới nhánh chính sách");
});

test("m3: câu thiếu mục dùng tên cho NGƯỜI ĐĂNG KÝ; cau-hinh cũng vậy", async () => {
  const w = setup();
  await luu(w, VAI);
  const r = await gui(w, banKhai({ dienThoai: undefined, ngaySinh: undefined }));
  assert.equal(r.status, 400);
  assert.match(r.json.error.message, /Số điện thoại/);
  assert.match(r.json.error.message, /Ngày sinh/);
  const ch = await w.call("GET", "/api/dang-ky/cau-hinh");
  const nhan = Object.fromEntries(ch.json.mucBatBuoc.map((m: any) => [m.ma, m.nhan]));
  assert.equal(nhan.CALLED, "Số điện thoại");
});

test("m4: bản chính sách riêng tư có ngày hiệu lực ở TƯƠNG LAI không làm «gửi» trả no_privacy_policy — cùng nghĩa «hiện hành» với cau-hinh", async () => {
  const w = setup();
  await luu(w, VAI);
  const tuongLai = new Date(Date.now() + 86_400_000).toISOString();
  w.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-2', 2, 'm', 'Toàn văn mới.', ?, ?, 'x', ?, 'x')").run(tuongLai, tuongLai, tuongLai);
  assert.equal((await w.call("GET", "/api/dang-ky/cau-hinh")).json.chinhSachRiengTu, 1, "cau-hinh vẫn báo bản 1");
  const r = await gui(w, banKhai({ chinhSachPhienBan: 1 }));
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT policy_id FROM dk_submission")[0].policy_id, "cs-1");
  const w2 = setup();
  await luu(w2, VAI);
  w2.sqlite.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-2', 2, 'm', 'Toàn văn mới.', ?, ?, 'x', ?, 'x')").run(tuongLai, tuongLai, tuongLai);
  assert.equal((await gui(w2, banKhai({ chinhSachPhienBan: 2 }))).json.error.code, "policy_changed", "bản chưa hiệu lực không đồng ý được");
});
