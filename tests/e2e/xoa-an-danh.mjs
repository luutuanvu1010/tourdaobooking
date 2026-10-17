// Xoá dữ liệu / ẩn danh hoá (ADR-0126; lát H-5 Gói 2) trên API thật + D1 local tạm. Ẩn danh hoá là cửa một chiều: kịch bản chỉ chạy trên D1 TẠM của run.mjs, KHÔNG BAO GIỜ trên D1 thật.
// CHẠY LẠI ĐƯỢC: Đối tác A / C là tài khoản dùng một lần (tên theo Date.now()), mỗi lần chạy đăng phiên bản chính sách MỚI và cuối kịch bản đăng lại bản KHÔNG số ngày
// (số 5 ngày / 1 ngày chỉ là số thử của kịch bản, không phải số luật sư). Quản trị = ACCOUNTS.admin, Toàn quyền = ACCOUNTS.superAdmin.
import assert from "node:assert/strict";
import { ACCOUNTS, call, gieoTaiKhoanLai, login, session, sqlRows } from "./lib.mjs";

const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const ADMIN = await session(ACCOUNTS.admin);
const tag = String(Date.now()).slice(-6);
const SO = `0796${tag}33`; // 12 chữ số GIẢ riêng của lần chạy
const DIA_CHI = `9${tag} Đường Xoá E2E, Nha Trang`;
const NGAY_SINH = "1989-04-21";
const TEN_A = `Đối Tác Xoá ${tag}`;
const A = await gieoTaiKhoanLai(TEN_A, ["PARTNER"]);
const C = await gieoTaiKhoanLai(`Đối Tác Gộp ${tag}`, ["PARTNER"]);

// 1. Toàn quyền đăng chính sách thử KHÔNG số ngày; A đồng ý, gửi hai phiếu tự khai (đang chờ); Toàn quyền thêm CCCD cho A.
let r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ xoá ${tag}`, noiDung: `THỬ — toàn văn xoá ${tag}, không phải văn bản pháp lý.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const hs = (await call(A.cookie, "GET", "/api/parties/cua-toi")).body;
assert.equal((await call(A.cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: hs.chinhSach.id, quyetDinh: "DONG_Y" })).status, 200);
const phieuTuKhai = [];
for (const p of [{ loai: "NGAY_SINH", ngaySinh: NGAY_SINH }, { loai: "DIA_CHI", diaChi: DIA_CHI }]) {
  r = await call(A.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: hs.chinhSach.id, ...p });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  phieuTuKhai.push(r.body.phieuId);
}
r = await call(TOAN_QUYEN, "POST", `/api/parties/${A.partyId}/documents`, { typeCode: "CCCD", number: SO, expiryDate: "2036-01-01" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const did = r.body.documents.find((d) => d.typeCode === "CCCD" && d.current).id;
console.log("✓ 1. Chính sách thử không số ngày; A đồng ý, gửi 2 phiếu tự khai; Toàn quyền thêm CCCD cho A");

// 2. A gửi yêu cầu xoá: 201; phiếu CHO_XU_LY không hạn; hai phiếu tự khai bị rút; không gửi tự khai mới được (erasure_open).
r = await call(A.cookie, "POST", "/api/parties/cua-toi/phieu-xoa", { xacNhan: true });
assert.equal(r.status, 201, JSON.stringify(r.body));
const phieuXoa = r.body.id;
r = await call(A.cookie, "GET", "/api/parties/cua-toi");
assert.equal(r.status, 200);
assert.equal(r.body.phieuXoa[0].trangThai, "CHO_XU_LY");
assert.equal(r.body.phieuXoa[0].han, null, "chính sách chưa có số ngày ⇒ phiếu không hạn");
const trang = Object.fromEntries(r.body.phieu.map((p) => [p.id, p.trangThai]));
for (const id of phieuTuKhai) assert.equal(trang[id], "RUT", "phiếu tự khai đang chờ bị rút cùng lô");
r = await call(A.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: hs.chinhSach.id, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "erasure_open");
console.log("✓ 2. Yêu cầu xoá 201, không hạn; phiếu tự khai bị rút; gửi tự khai mới 409 erasure_open");

// 3. Quản trị: hàng chờ có phiếu (chua_co_han); xem trước chỉ số đếm.
r = await call(ADMIN, "GET", "/api/parties/phieu-xoa");
assert.equal(r.status, 200, JSON.stringify(r.body));
const dong = r.body.phieu.find((p) => p.id === phieuXoa);
assert.ok(dong, "phiếu của A có trong hàng chờ");
assert.equal(dong.trangThaiHan, "chua_co_han");
assert.equal(dong.xuLyDuoc, true);
r = await call(ADMIN, "GET", `/api/parties/phieu-xoa/${phieuXoa}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.seXoa.giayTo, 1);
assert.ok(r.body.seXoa.phienDangNhap === true);
const txt = JSON.stringify(r.body);
for (const gt of [SO, DIA_CHI, NGAY_SINH]) assert.ok(!txt.includes(gt), "xem trước chỉ số đếm, không giá trị");
console.log("✓ 3. Hàng chờ có phiếu (chua_co_han); xem trước chỉ số đếm, không giá trị");

// 4. Quản trị thực hiện: 200; lần hai 409 erasure_not_pending.
r = await call(ADMIN, "POST", `/api/parties/phieu-xoa/${phieuXoa}/thuc-hien`, { xacNhan: true });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(ADMIN, "POST", `/api/parties/phieu-xoa/${phieuXoa}/thuc-hien`, { xacNhan: true });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "erasure_not_pending");
console.log("✓ 4. Thực hiện 200; lần hai 409 erasure_not_pending");

// 5. Giấy tờ đã ẩn danh: xem đủ số 409 document_erased; nhật ký party_erased không có số / tên cũ / SĐT.
r = await call(TOAN_QUYEN, "POST", `/api/parties/${A.partyId}/documents/${did}/reveal`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "document_erased");
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=party_erased&limit=20");
assert.equal(r.status, 200);
assert.ok(r.body.entries.some((e) => (e.detail ?? "").includes(phieuXoa)), "có dòng party_erased của phiếu này");
const nk = JSON.stringify(r.body);
for (const gt of [SO, TEN_A, A.phone, DIA_CHI, NGAY_SINH]) assert.ok(!nk.includes(gt), "nhật ký lộ giá trị");
const nkTat = JSON.stringify(await sqlRows("SELECT action, detail FROM audit_log WHERE action LIKE 'party_erase%' OR action LIKE 'sessions_anonym%'"));
for (const gt of [SO, TEN_A, DIA_CHI, NGAY_SINH]) assert.ok(!nkTat.includes(gt), "nhật ký xoá lộ giá trị");
console.log("✓ 5. Xem đủ số 409 document_erased; nhật ký party_erased không số / tên / SĐT / địa chỉ / ngày sinh");

// 6. A xem lại: phiếu DA_THUC_HIEN, phanGiuLai có SDT_DANG_NHAP; hồ sơ daXoa; vẫn đăng nhập lại bằng PIN (staff.phone giữ — đ9).
r = await call(A.cookie, "GET", "/api/parties/cua-toi");
assert.equal(r.status, 200);
assert.equal(r.body.phieuXoa[0].trangThai, "DA_THUC_HIEN");
assert.ok(r.body.phieuXoa[0].phanGiuLai.includes("SDT_DANG_NHAP"));
assert.ok(r.body.phieuXoa[0].phanGiuLai.includes("GIOI_TINH"), "danh sách phần giữ lại đủ mục (vòng sửa 1, I-3)");
assert.equal(r.body.hoSo.daXoa, true);
assert.equal(r.body.hoSo.giayTo.length, 0, "giấy tờ đã ẩn danh không còn hiện");
assert.equal(r.body.hoSo.ngaySinh, null);
const phien = await sqlRows(`SELECT ip, user_agent FROM aut_session WHERE staff_id = '${A.id}'`);
assert.ok(phien.length > 0 && phien.every((p) => p.ip === null && p.user_agent === null), "IP / User-Agent phiên của A đã bỏ");
assert.ok((await login(A.phone, A.pin)).cookie, "A vẫn đăng nhập lại bằng PIN");
console.log("✓ 6. A: phiếu đã thực hiện, phần giữ lại đủ, hồ sơ đã xoá, vẫn đăng nhập lại được; phiên mất IP / trình duyệt");

// 7. Chính sách có số ngày thử: GET an-danh-cu hanNgay 1; POST 200.
r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ xoá số ${tag}`, noiDung: `THỬ — bản có số ${tag}.`, hanXuLyXoaNgay: 5, hanGiuPhienNgay: 1 });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(TOAN_QUYEN, "GET", "/api/sessions/an-danh-cu");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.hanNgay, 1);
r = await call(TOAN_QUYEN, "POST", "/api/sessions/an-danh-cu", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(typeof r.body.daAnDanh, "number");
console.log("✓ 7. Chính sách thử 5 / 1 ngày: GET hanNgay 1; POST ẩn danh phiên cũ 200");

// 8. Gộp hồ sơ khác vào hồ sơ đã xoá → 409 merge_erasure.
r = await call(ADMIN, "POST", `/api/parties/${C.partyId}/merge`, { intoPartyId: A.partyId, xacNhan: "x" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "merge_erasure");
console.log("✓ 8. Gộp vào hồ sơ đã xoá 409 merge_erasure");

// Khôi phục: bản chính sách KHÔNG số ngày (số thử 5 / 1 không ở lại D1 chung của nhóm).
r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ xoá khôi phục ${tag}`, noiDung: `THỬ — bản khôi phục không số ${tag}.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
console.log("✓ khôi phục chính sách không số ngày");
