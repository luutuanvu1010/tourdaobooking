// Xác minh phiếu tự khai (ADR-0125; lát H-4 Gói 2) trên API thật + D1 local tạm. CHẠY LẠI ĐƯỢC: luôn đăng phiên bản chính sách MỚI; Đối tác A / B là tài khoản dùng một lần
// (tên theo Date.now()); đếm chỉ phiếu của A / B (D1 chung nhóm có thể còn phiếu chờ của kịch bản khác — "tu-khai"). Nhân sự = ACCOUNTS.hr, Quản trị = ACCOUNTS.admin.
// Đối tác A do SQL gieo (không ai "chạm"); Đối tác B do NHÂN SỰ tạo (người tạo không xác minh được phiếu của B — ADR-0125 đ3, sự thật 20).
import assert from "node:assert/strict";
import { ACCOUNTS, call, gieoTaiKhoanLai, login, randomPhone, session, sqlRows } from "./lib.mjs";

const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const ADMIN = await session(ACCOUNTS.admin);
const HR = await session(ACCOUNTS.hr);
const tag = String(Date.now()).slice(-6);
const SO = `0797${tag}22`; // 12 chữ số GIẢ riêng của lần chạy
const DIA_CHI_1 = `7${tag} Đường Xác Minh E2E, Nha Trang`;
const DIA_CHI_2 = `6${tag} Đường Xác Minh Hai E2E, Nha Trang`;
const TEN_A = `Đối Tác Xác Minh ${tag}`;
const A = await gieoTaiKhoanLai(TEN_A, ["PARTNER"]);

let r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ xác minh ${tag}`, noiDung: `THỬ — toàn văn xác minh ${tag}, không phải văn bản pháp lý.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const dongYVaGui = async (cookie, phieu) => {
  const hs = (await call(cookie, "GET", "/api/parties/cua-toi")).body;
  assert.equal((await call(cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: hs.chinhSach.id, quyetDinh: "DONG_Y" })).status, 200);
  const ids = [];
  for (const p of phieu) {
    const x = await call(cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: hs.chinhSach.id, ...p });
    assert.equal(x.status, 201, JSON.stringify(x.body));
    ids.push(x.body.phieuId);
  }
  return { csId: hs.chinhSach.id, ids };
};
const { csId, ids: [pNgaySinh, pDiaChi, pGiayTo] } = await dongYVaGui(A.cookie, [
  { loai: "NGAY_SINH", ngaySinh: "1990-05-17" },
  { loai: "DIA_CHI", diaChi: DIA_CHI_1 },
  { loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO, expiryDate: "2036-01-01" } },
]);
console.log("✓ 1. Toàn quyền đăng chính sách thử; Đối tác A đồng ý và gửi ba phiếu");

// 1b. Nhân sự tạo Đối tác B → B tự khai → Nhân sự (người tạo) không xác minh được; Quản trị xác minh được.
const bPhone = randomPhone();
r = await call(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đối Tác B Xác Minh ${tag}`, phone: bPhone, roles: ["HOTEL_RECEPTION"] });
assert.equal(r.status, 201, `Nhân sự tạo Đối tác B: ${JSON.stringify(r.body)}`);
assert.deepEqual(r.body.staff.permissions, ["PARTNER"]);
const B = { pin: r.body.pin, phone: bPhone };
const bCookie = (await login(B.phone, B.pin)).cookie;
assert.ok(bCookie, "Đối tác B đăng nhập được");
const { ids: [pB] } = await dongYVaGui(bCookie, [{ loai: "NGAY_SINH", ngaySinh: "1988-08-08" }]);
r = await call(HR, "POST", `/api/parties/xac-minh/${pB}/chap-nhan`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "verify_conflict");
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pB}/chap-nhan`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ 1b. Nhân sự tạo B → chấp nhận phiếu của B bị 409 verify_conflict; Quản trị chấp nhận 200");

// 2. Hàng chờ của Nhân sự có đúng ba phiếu của A; Nhân sự không vào Danh bạ.
r = await call(HR, "GET", "/api/parties/xac-minh?trang=cho");
assert.equal(r.status, 200, JSON.stringify(r.body));
const cuaA = r.body.phieu.filter((p) => p.tenHoSo === TEN_A);
assert.equal(cuaA.length, 3, JSON.stringify(r.body.phieu));
assert.ok(cuaA.every((p) => p.xacMinhDuoc === true && p.lyDoKhong === null));
assert.ok(!JSON.stringify(r.body).includes(SO) && !JSON.stringify(r.body).includes(`7${tag}`), "hàng chờ không mang giá trị khai");
assert.equal((await call(HR, "GET", "/api/parties")).status, 403);
console.log("✓ 2. Nhân sự thấy 3 phiếu của A (không giá trị khai); GET /api/parties → 403");

// 3. Xem đủ số: 200, nhật ký ghi và không chứa số.
r = await call(HR, "GET", `/api/parties/xac-minh/${pGiayTo}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.giayTo.soChe.endsWith(SO.slice(-4)) && !JSON.stringify(r.body).includes(SO), "chi tiết chỉ số che");
r = await call(HR, "POST", `/api/parties/xac-minh/${pGiayTo}/xem-so`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.so, SO);
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=self_submission_number_viewed&limit=20");
assert.equal(r.status, 200);
assert.ok(r.body.entries.some((e) => (e.detail ?? "").includes(pGiayTo)), "dòng xem số của phiếu này phải có trong nhật ký");
assert.ok(!JSON.stringify(r.body).includes(SO), "nhật ký không chứa số giấy tờ");
console.log("✓ 3. Xem đủ số 200; nhật ký có dòng xem số, không chứa số");

// 4. Chấp nhận NGAY_SINH: lần một 200, lần hai (Quản trị) 409 đã xử lý.
r = await call(HR, "POST", `/api/parties/xac-minh/${pNgaySinh}/chap-nhan`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pNgaySinh}/chap-nhan`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "submission_not_pending");
console.log("✓ 4. Chấp nhận ngày sinh 200; lần hai 409 submission_not_pending");

// 5. Từ chối DIA_CHI (danh sách đóng); chấp nhận GIAY_TO (chưa có ảnh) → 409 can_anh_giay_to.
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pDiaChi}/tu-choi`, { lyDo: "tuy-tien" });
assert.equal(r.status, 400, "lý do ngoài danh sách đóng bị từ chối");
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pDiaChi}/tu-choi`, { lyDo: "KHONG_KHOP_GIAY_TO" });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pGiayTo}/chap-nhan`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "can_anh_giay_to");
console.log("✓ 5. Từ chối địa chỉ (lý do ngoài danh sách 400, trong danh sách 200); chấp nhận giấy tờ 409 can_anh_giay_to");

// 6. Quản trị đặt lại PIN cho A (chạm tài khoản); A đăng nhập lại bằng PIN mới, gửi phiếu địa chỉ mới; Quản trị không xác minh được, Nhân sự được.
r = await call(ADMIN, "POST", `/api/staff/${A.id}/reset-pin`);
assert.equal(r.status, 200, JSON.stringify(r.body));
const aMoi = (await login(A.phone, r.body.pin)).cookie;
assert.ok(aMoi, "A đăng nhập lại bằng PIN mới");
r = await call(aMoi, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: csId, loai: "DIA_CHI", diaChi: DIA_CHI_2 });
assert.equal(r.status, 201, JSON.stringify(r.body));
const pDiaChi2 = r.body.phieuId;
r = await call(ADMIN, "POST", `/api/parties/xac-minh/${pDiaChi2}/chap-nhan`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "verify_conflict");
r = await call(ADMIN, "GET", "/api/parties/xac-minh?trang=cho");
const dongA = r.body.phieu.find((p) => p.id === pDiaChi2);
assert.ok(dongA && dongA.xacMinhDuoc === false && dongA.lyDoKhong, "Quản trị thấy phiếu nhưng bị chặn bằng lời thường");
r = await call(ADMIN, "GET", `/api/parties/xac-minh/${pDiaChi2}`);
assert.equal(r.status, 200);
assert.equal(r.body.diaChi, null, "người bị chặn không nhận giá trị khai");
r = await call(HR, "POST", `/api/parties/xac-minh/${pDiaChi2}/chap-nhan`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ 6. Quản trị đặt lại PIN → bị chặn xác minh phiếu của A (409, DTO hẹp); Nhân sự chấp nhận 200");

// 7. Phiếu đã xử lý: chi tiết 403 submission_processed; hàng "đã xử lý" không lộ giá trị.
r = await call(HR, "GET", `/api/parties/xac-minh/${pNgaySinh}`);
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.code, "submission_processed");
r = await call(HR, "GET", "/api/parties/xac-minh?trang=da-xu-ly");
assert.equal(r.status, 200);
assert.ok(r.body.phieu.some((p) => p.id === pNgaySinh && p.ketLuan === "DA_CHAP_NHAN"));
assert.ok(!JSON.stringify(r.body).includes(SO) && !JSON.stringify(r.body).includes(`7${tag}`) && !JSON.stringify(r.body).includes("1990"), "hàng đã xử lý không lộ giá trị");
console.log("✓ 7. Chi tiết phiếu đã xử lý 403 submission_processed; hàng đã xử lý không lộ giá trị");

// 8. Đối tác A thấy kết quả; giá trị đã lên hồ sơ.
r = await call(aMoi, "GET", "/api/parties/cua-toi");
assert.equal(r.status, 200);
assert.equal(r.body.hoSo.ngaySinh, "1990-05-17");
const trang = Object.fromEntries(r.body.phieu.map((p) => [p.id, p.trangThai]));
assert.equal(trang[pNgaySinh], "DA_CHAP_NHAN");
assert.equal(trang[pDiaChi], "TU_CHOI");
assert.equal(trang[pDiaChi2], "DA_CHAP_NHAN");
assert.equal(trang[pGiayTo], "CHO_XAC_MINH");
assert.ok(r.body.hoSo.diaChi.some((d) => d.includes(`6${tag}`)) && !r.body.hoSo.diaChi.some((d) => d.includes(`7${tag}`)), "chỉ địa chỉ được chấp nhận lên hồ sơ");
console.log("✓ 8. Đối tác A thấy ngày sinh mới, địa chỉ đã chấp nhận; phiếu bị từ chối không lên hồ sơ");

const nk = JSON.stringify(await sqlRows("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%'"));
assert.ok(!nk.includes(SO) && !nk.includes(`7${tag}`) && !nk.includes(`6${tag}`) && !nk.includes("1990-05-17"), "nhật ký xác minh chứa giá trị khai");
console.log("✓ nhật ký xác minh chỉ mã phiếu + tên loại, không giá trị khai");
