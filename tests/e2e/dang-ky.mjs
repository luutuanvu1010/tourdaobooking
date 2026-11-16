// ĐĂNG KÝ ĐỐI TÁC (ADR-0206 … ADR-0210; đợt 1 Task 13) — chuỗi đầy đủ trên API thật + D1 local TẠM của run.mjs (không bao giờ remote):
//   1. Toàn quyền mở «Nhận đăng ký mới» bằng route chính sách (dùng lại chính sách riêng tư đang hiệu lực; chưa có thì đăng bản THỬ).
//   2. Người đăng ký: xin mã (Turnstile khoá thử) → nhập mã → chọn vai → tải hai ảnh căn cước → gửi phiếu.
//   3. Quản trị: kết luận năm mục «Đạt», «Hồ sơ mới» ⇒ «Xác minh đạt». 4. Nhân sự: «Duyệt mở tài khoản» ⇒ tài khoản TẮT.
//   5. Người đăng ký: mã MỚI + mã PIN ⇒ kích hoạt. 6. Đăng nhập bằng SĐT đã khai + PIN qua `login()` của lib.mjs.
//   7. Năm kiểm R-DK-* của scripts/audit-checks.mjs (cùng câu SQL, cùng hàm đếm) trên D1 của nhóm ⇒ 0 vi phạm; chạy đủ bộ thì run.mjs còn chạy audit-invariants --strict.
//   Cuối kịch bản Toàn quyền ĐÓNG lại công tắc (các kịch bản sau thấy D1 như cũ).
// MÃ EMAIL: máy chủ e2e không có thư thật; kịch bản gieo một dòng dk_email_code mới hơn với mã biết trước, băm bằng `khoaBam` của route (khoá = SESSION_SECRET do run.mjs
// truyền qua E2E_SESSION_SECRET) — cùng khuôn `gieoMaEmail` của lib.mjs và kịch bản Chrome docs/evidence/2026-11-15-dang-ky/kich-ban/dang-ky-smoke.mjs.
// CHẠY LẠI ĐƯỢC: email, SĐT, số căn cước riêng mỗi lần (Date.now()). Cần MẠNG (siteverify Turnstile với khoá thử).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, TURNSTILE_TEST, call, freshIp, login, randomPhone, session, sql, sqlRows } from "./lib.mjs";
import { DK_COOKIE, khoaBam } from "../../src/modules/dang-ky/phien.ts";
import { CHECKS, demViPham } from "../../scripts/audit-checks.mjs";

const SECRET = process.env.E2E_SESSION_SECRET;
assert.ok(SECRET, "thiếu E2E_SESSION_SECRET — chạy qua `npm run test:e2e -- dang-ky` (run.mjs truyền khoá phiên của máy chủ tạm)");
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const QUAN_TRI = await session(ACCOUNTS.admin);
const NHAN_SU = await session(ACCOUNTS.hr);
const tag = String(Date.now()).slice(-8);
const EMAIL = `dang.ky.${tag}@example.com`;
const SDT = randomPhone();
const SO_CCCD = `079${tag}9`.padEnd(12, "7").slice(0, 12); // 12 chữ số GIẢ riêng của lần chạy
const VAI = "COLLABORATOR";
const PIN = "580927";
const IP = freshIp(); // một địa chỉ mạng cho người đăng ký (bộ đếm theo mạng của đăng ký tính riêng khoá `dk:`)
const MUC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]).toString("base64");
const than = (r) => JSON.stringify(r.body);

/** Gieo mã email mới (mới hơn mã máy chủ vừa sinh ⇒ là «mã gần nhất» của email). */
async function gieoMa(ma) {
  const id = randomUUID();
  const emailKey = await khoaBam(SECRET, "email", EMAIL);
  const tao = new Date(Date.now() + 1000).toISOString();
  const het = new Date(Date.now() + 10 * 60_000).toISOString();
  await sql(`INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES ('${id}', '${emailKey}', '${await khoaBam(SECRET, "ma", `${id}:${emailKey}:${ma}`)}', '${het}', 0, '${tao}', '${tao}')`);
}
/** Cookie đăng ký: route cấp lại sau mỗi lệnh (hạn không thao tác trượt) — giữ bản mới nhất. */
let dk = null;
async function nguoiDangKy(method, path, body) {
  const r = await call(dk, method, path, body, IP);
  if (r.cookie?.startsWith(`${DK_COOKIE}=`)) dk = r.cookie;
  return r;
}

// 1. Chính sách riêng tư đang hiệu lực (dùng lại; chưa có thì đăng bản THỬ) → Toàn quyền mở công tắc cho vai Cộng tác viên.
if (!(await sqlRows("SELECT id FROM v_pty_privacy_effective")).length) {
  const r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ đăng ký ${tag}`, noiDung: `THỬ — toàn văn đăng ký ${tag}, không phải văn bản pháp lý.` });
  assert.equal(r.status, 201, than(r));
}
let r = await call(TOAN_QUYEN, "GET", "/api/dang-ky/chinh-sach");
assert.equal(r.status, 200, than(r));
assert.equal(r.body.coChinhSachRiengTu, true);
const csCu = r.body;
r = await call(TOAN_QUYEN, "POST", "/api/dang-ky/chinh-sach", { nhanDangKy: true, loaiMo: [VAI], dangHieuLuc: csCu.id });
assert.equal(r.status, 200, than(r));
assert.equal(r.body.nhanDangKy, true);
const csMo = r.body.id;
r = await call(null, "GET", "/api/dang-ky/cau-hinh");
assert.equal(r.status, 200, than(r));
assert.equal(r.body.nhanDangKy, true);
assert.ok(r.body.loaiMo.includes(VAI));
const phienBanRiengTu = r.body.chinhSachRiengTu;
assert.equal(typeof phienBanRiengTu, "number");
console.log("✓ 1. Toàn quyền mở «Nhận đăng ký mới» qua route chính sách; trang công khai thấy công tắc Bật và phiên bản chính sách riêng tư");

// 2. Xin mã → nhập mã → chọn vai → hai ảnh → gửi phiếu.
r = await call(null, "POST", "/api/dang-ky/ma", { email: EMAIL, turnstileToken: TURNSTILE_TEST.dummyToken }, IP);
assert.equal(r.status, 200, than(r));
assert.deepEqual(r.body, { ok: true }, "xin mã trả cùng một câu");
await gieoMa("482915");
r = await nguoiDangKy("POST", "/api/dang-ky/xac-nhan", { email: EMAIL, ma: "482915" });
assert.equal(r.status, 200, than(r));
assert.ok(dk, "nhập mã đúng cấp cookie đăng ký");
r = await nguoiDangKy("POST", "/api/dang-ky/xac-nhan", { email: EMAIL, ma: "482915" });
assert.notEqual(r.status, 200, "mã đã dùng không vào lại được");
r = await nguoiDangKy("PUT", "/api/dang-ky/phieu", { loai: VAI });
assert.equal(r.status, 200, than(r));
for (const o of ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]) {
  r = await nguoiDangKy("POST", "/api/dang-ky/phieu/tep", { o, noiDung: PNG });
  assert.equal(r.status, 200, than(r));
}
r = await nguoiDangKy("POST", "/api/dang-ky/phieu/gui", {
  chinhSachPhienBan: phienBanRiengTu, hoTen: `Cộng Tác Đăng Ký ${tag}`, ngaySinh: "1991-02-03", diaChi: `${tag} Đường Đăng Ký E2E, Nha Trang`, dienThoai: SDT,
  giayTo: { typeCode: "CCCD", number: SO_CCCD, issuedDate: "2021-03-04", issuedPlace: "Cục Cảnh sát (thử)", expiryDate: "2036-03-04" },
});
assert.equal(r.status, 200, than(r));
const [{ registration_id: PHIEU }] = await sqlRows(`SELECT registration_id FROM dk_identity WHERE subject = '${EMAIL}'`);
assert.match(PHIEU, /^DK_[A-Z]{8}$/);
assert.equal((await sqlRows(`SELECT status FROM dk_registration WHERE id = '${PHIEU}'`))[0].status, "CHO_XAC_MINH");
console.log("✓ 2. Người đăng ký: mã email (một lần), chọn vai, hai ảnh căn cước, gửi phiếu ⇒ Chờ xác minh");

// 3. Quản trị xác minh: năm mục «Đạt», «Hồ sơ mới». Nhân sự không xác minh được (403).
r = await call(NHAN_SU, "POST", `/api/dang-ky/phieu/${PHIEU}/ket-luan`, { phienBan: 1, muc: "ROLE", dat: true });
assert.equal(r.status, 403, than(r));
for (const muc of MUC) {
  r = await call(QUAN_TRI, "POST", `/api/dang-ky/phieu/${PHIEU}/ket-luan`, { phienBan: 1, muc, dat: true });
  assert.equal(r.status, 200, `${muc}: ${than(r)}`);
}
r = await call(QUAN_TRI, "POST", `/api/dang-ky/phieu/${PHIEU}/dat`, { phienBan: 1, hoSo: { kieu: "MOI" } });
assert.equal(r.status, 200, than(r));
assert.equal((await sqlRows(`SELECT status FROM dk_registration WHERE id = '${PHIEU}'`))[0].status, "CHO_DUYET");
console.log("✓ 3. Quản trị xác minh năm mục, hồ sơ mới ⇒ Chờ duyệt; Nhân sự bị 403 ở bước xác minh");

// 3b. «Trả về xác minh» (ADR-0207 Đ5; rà soát cuối I-3): Quản trị không có ô account.create ⇒ 403; Nhân sự trả về ⇒ Chờ xác minh, kết luận Danh bạ và người xác minh bị xoá;
// duyệt lúc này ⇒ 409; Quản trị kết luận Danh bạ lại ⇒ Chờ duyệt.
r = await call(QUAN_TRI, "POST", `/api/dang-ky/phieu/${PHIEU}/tra-ve-xac-minh`, { phienBan: 1 });
assert.equal(r.status, 403, than(r));
r = await call(NHAN_SU, "POST", `/api/dang-ky/phieu/${PHIEU}/tra-ve-xac-minh`, { phienBan: 1 });
assert.equal(r.status, 200, than(r));
const [tv] = await sqlRows(`SELECT status, verified_by, match_kind FROM dk_registration WHERE id = '${PHIEU}'`);
assert.deepEqual([tv.status, tv.verified_by, tv.match_kind], ["CHO_XAC_MINH", null, null]);
r = await call(NHAN_SU, "POST", `/api/dang-ky/phieu/${PHIEU}/duyet`, { roleCode: VAI, phienBan: 1 });
assert.equal(r.status, 409, than(r));
r = await call(QUAN_TRI, "POST", `/api/dang-ky/phieu/${PHIEU}/dat`, { phienBan: 1, hoSo: { kieu: "MOI" } });
assert.equal(r.status, 200, than(r));
assert.equal((await sqlRows(`SELECT status FROM dk_registration WHERE id = '${PHIEU}'`))[0].status, "CHO_DUYET");
console.log("✓ 3b. Nhân sự «Trả về xác minh» ⇒ Chờ xác minh (Quản trị 403; duyệt lúc này 409); Quản trị kết luận lại ⇒ Chờ duyệt");

// 4. Nhân sự duyệt mở tài khoản ⇒ tài khoản TẮT, PIN ngẫu nhiên không trả ra; Quản trị (không giữ ô account.create) không duyệt được.
r = await call(QUAN_TRI, "POST", `/api/dang-ky/phieu/${PHIEU}/duyet`, { roleCode: VAI, phienBan: 1 });
assert.equal(r.status, 403, than(r));
r = await call(NHAN_SU, "POST", `/api/dang-ky/phieu/${PHIEU}/duyet`, { roleCode: VAI, phienBan: 1 });
assert.equal(r.status, 200, than(r));
const [ph] = await sqlRows(`SELECT status, staff_id, party_id, activated_at FROM dk_registration WHERE id = '${PHIEU}'`);
assert.equal(ph.status, "DA_DUYET");
assert.ok(ph.staff_id && ph.party_id);
assert.equal(ph.activated_at, null);
assert.equal((await sqlRows(`SELECT active FROM staff WHERE id = '${ph.staff_id}'`))[0].active, 0, "tài khoản chưa kích hoạt thì TẮT");
assert.equal((await login(SDT, PIN)).status, 401, "chưa đặt PIN thì không đăng nhập được");
console.log("✓ 4. Nhân sự duyệt ⇒ Đã duyệt, tài khoản TẮT; Quản trị không duyệt được (403); chưa đặt PIN ⇒ đăng nhập 401");

// 5. Kích hoạt: mã MỚI + PIN.
r = await nguoiDangKy("POST", "/api/dang-ky/phieu/dat-pin", { ma: "482915", pin: PIN });
assert.notEqual(r.status, 200, "mã đã tiêu lúc vào phiên không đặt PIN được");
await gieoMa("613507");
r = await nguoiDangKy("POST", "/api/dang-ky/phieu/dat-pin", { ma: "613507", pin: PIN });
assert.equal(r.status, 200, than(r));
const [sau] = await sqlRows(`SELECT activated_at FROM dk_registration WHERE id = '${PHIEU}'`);
assert.ok(sau.activated_at, "phiếu có mốc kích hoạt");
console.log("✓ 5. Kích hoạt bằng mã email MỚI + PIN; mã cũ bị từ chối");

// 6. Đăng nhập thật bằng SĐT đã khai + PIN vừa đặt.
r = await login(SDT, PIN);
assert.equal(r.status, 200, than(r));
const me = await call(r.cookie, "GET", "/api/auth/me");
assert.equal(me.status, 200, than(me));
assert.equal(me.body.staff.id, ph.staff_id);
assert.deepEqual(me.body.staff.permissions, ["PARTNER"], "tài khoản tự đăng ký chỉ là Đối tác");
console.log("✓ 6. Đăng nhập bằng số điện thoại đã khai + PIN ⇒ 200, /api/auth/me đúng tài khoản");

// 7. Năm kiểm R-DK-* (cùng câu SQL, cùng hàm đếm với scripts/audit-invariants.mjs) trên D1 của nhóm ⇒ 0. Không chạy cả bộ --strict ở đây: chạy lẻ thì run.mjs bỏ audit cuối,
//    chạy đủ bộ thì dữ liệu kiểu cũ của kịch bản khác chỉ được ngưng ngay trước audit cuối (K12) — kiểm cả bộ giữa chừng sẽ đỏ giả.
const DK = CHECKS.filter((c) => c.code.startsWith("R-DK-"));
assert.equal(DK.length, 5, "đủ năm kiểm R-DK-1 … R-DK-5");
for (const c of DK) {
  const n = demViPham(c, await sqlRows(c.sql.replace(/\s+/g, " ").trim()));
  assert.equal(n, 0, `${c.code}: ${c.what}`);
}
console.log("✓ 7. R-DK-1 … R-DK-5 = 0 vi phạm trên D1 của nhóm");

// Khôi phục: ĐÓNG công tắc (giữ loại mở) — các kịch bản sau thấy đăng ký đóng như bản gieo.
r = await call(TOAN_QUYEN, "POST", "/api/dang-ky/chinh-sach", { nhanDangKy: false, loaiMo: [VAI], dangHieuLuc: csMo });
assert.equal(r.status, 200, than(r));
assert.equal(r.body.nhanDangKy, false);
console.log("✓ khôi phục: đóng «Nhận đăng ký mới»");
