// Tự khai hồ sơ (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) trên API thật + D1 local tạm. CHẠY LẠI ĐƯỢC trên D1 đã có chính sách (chỉ-thêm): luôn đăng phiên bản MỚI rồi làm
// việc với nó; Đối tác / Tài xế đối tác là tài khoản dùng một lần. Ca "chưa có chính sách" ở khung thử (src/modules/parties/tu-khai-route.test.ts — SQLite mới mỗi lần).
import assert from "node:assert/strict";
import { ACCOUNTS, call, gieoTaiKhoanLai, session, sqlRows } from "./lib.mjs";

const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const SO = `0796${tag}11`; // 12 chữ số GIẢ riêng của lần chạy
const DIA_CHI = `9${tag} Đường Tự Khai E2E, Nha Trang`;
const doiTac = await gieoTaiKhoanLai(`Đối Tác Tự Khai ${tag}`, ["PARTNER"]);
const taiXeDt = await gieoTaiKhoanLai(`Tài Xế Đối Tác Tự Khai ${tag}`, ["DRIVER_PARTNER"]);

let r = await call(ADMIN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "thử", noiDung: "thử" });
assert.equal(r.status, 403);
console.log("✓ Quản trị không đăng được chính sách");
r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ e2e ${tag}`, noiDung: `THỬ — toàn văn e2e ${tag}, không phải văn bản pháp lý.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const phienBan = r.body.phienBan;
console.log(`✓ Toàn quyền đăng phiên bản ${phienBan}`);

for (const [ten, ck] of [["Đối tác", doiTac.cookie], ["Tài xế đối tác", taiXeDt.cookie], ["Bán hàng", SALES]]) {
  r = await call(ck, "GET", "/api/parties/cua-toi");
  assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.chinhSach.phienBan, phienBan, ten);
  const cs = r.body.chinhSach.id;
  if (!r.body.dongY) {
    const x = await call(ck, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
    assert.equal(x.status, 409, ten);
    assert.equal(x.body.error.code, "consent_required", ten);
    assert.equal((await call(ck, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs, quyetDinh: "DONG_Y" })).status, 200, ten);
  }
}
console.log("✓ ba loại tài khoản mở được Hồ sơ của tôi; chưa đồng ý thì không gửi được; đồng ý xong");

const cs = (await call(doiTac.cookie, "GET", "/api/parties/cua-toi")).body.chinhSach.id;
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO, expiryDate: "2036-01-01" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const pidGiay = r.body.phieuId;
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs, loai: "DIA_CHI", diaChi: DIA_CHI });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(doiTac.cookie, "GET", "/api/parties/cua-toi");
assert.ok(JSON.stringify(r.body).includes(`••••${SO.slice(-4)}`));
assert.ok(!JSON.stringify(r.body).includes(SO), "số đủ ra DTO");
console.log("✓ Đối tác gửi phiếu giấy tờ + địa chỉ; DTO chỉ số che");

// Vòng sửa 2 (M-9): ĐỐI CHỨNG DƯƠNG — Toàn quyền ghi một địa chỉ thật (đã xác minh) cho hồ sơ này; Quản trị đọc hồ sơ phải THẤY nó. Có vậy câu "không thấy địa chỉ tự
// khai" bên dưới mới có nghĩa (đổi luật cấp bậc / che trường riêng tư sau này làm Quản trị không thấy địa chỉ nào thì bài đỏ ở đây, không xanh rỗng).
const DOI_CHUNG = `8${tag} Đường Đối Chứng E2E, Nha Trang`;
r = await call(TOAN_QUYEN, "POST", `/api/parties/${doiTac.partyId}/contacts`, { kind: "ADDRESS", value: DOI_CHUNG });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(ADMIN, "GET", `/api/parties/${doiTac.partyId}`);
assert.equal(r.status, 200);
assert.ok(JSON.stringify(r.body).includes(`8${tag}`), "đối chứng: Quản trị phải thấy địa chỉ đã ghi của hồ sơ này");
assert.ok(!JSON.stringify(r.body).includes(`9${tag}`), "địa chỉ tự khai lên Danh bạ trước khi xác minh");
// Đọc thẳng CSDL: giá trị khai CHỈ nằm ở phiếu, không ở bảng liên hệ.
const dongLienHe = await sqlRows(`SELECT count(*) AS n FROM pty_contact_point WHERE party_id = '${doiTac.partyId}' AND value LIKE '%9${tag}%'`);
assert.equal(Number(dongLienHe[0].n), 0, "địa chỉ tự khai đã vào bảng liên hệ");
const dongPhieu = await sqlRows(`SELECT count(*) AS n FROM pty_self_submission WHERE party_id = '${doiTac.partyId}' AND address_value LIKE '%9${tag}%' AND status = 'CHO_XAC_MINH'`);
assert.equal(Number(dongPhieu[0].n), 1, "đối chứng: địa chỉ tự khai có ở phiếu đang chờ");
r = await call(ADMIN, "GET", `/api/parties/${doiTac.partyId}/documents`);
assert.equal(r.status, 200);
assert.equal(r.body.documents.length, 0, "giấy tờ tự khai lên hồ sơ trước khi xác minh");
console.log("✓ giá trị tự khai chưa lên Danh bạ / giấy tờ (5.23)");

assert.equal((await call(SALES, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 404);
assert.equal((await call(doiTac.cookie, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 200);
assert.equal((await call(doiTac.cookie, "POST", `/api/parties/cua-toi/phieu/${pidGiay}/rut`)).status, 409);
console.log("✓ rút phiếu: người khác 404, chính mình 200, lần hai 409");

// Ruling I-2 (vòng sửa 1): GET kể các phiên bản ĐANG đồng ý; rút đồng ý một phiên bản rút luôn phiếu đang chờ khai theo ĐÚNG phiên bản đó, cùng lô.
r = await call(doiTac.cookie, "GET", "/api/parties/cua-toi");
assert.deepEqual(r.body.dongYPhienBan, [{ id: cs, phienBan }], "Đối tác dùng một lần chỉ đồng ý đúng phiên bản vừa đăng");
// Vòng sửa 2 (M-9): phiếu của phiên bản KHÁC không bị đụng — đăng bản mới, Đối tác đồng ý bản mới + khai ngày sinh theo bản mới, rồi rút đồng ý bản CŨ.
r = await call(TOAN_QUYEN, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ e2e bản hai ${tag}`, noiDung: `THỬ — toàn văn bản hai ${tag}, không phải văn bản pháp lý.` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const phienBan2 = r.body.phienBan;
r = await call(doiTac.cookie, "GET", "/api/parties/cua-toi");
const cs2 = r.body.chinhSach.id;
assert.equal(r.body.chinhSach.phienBan, phienBan2);
assert.equal(r.body.dongY, false, "chưa đồng ý bản mới");
assert.equal((await call(doiTac.cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs2, quyetDinh: "DONG_Y" })).status, 200);
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: cs2, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const pidBan2 = r.body.phieuId;
r = await call(doiTac.cookie, "GET", "/api/parties/cua-toi");
assert.deepEqual(r.body.dongYPhienBan, [{ id: cs2, phienBan: phienBan2 }, { id: cs, phienBan }], "đang đồng ý cả hai bản (mới trước)");
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs, quyetDinh: "RUT" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const conCho = await sqlRows(`SELECT count(*) AS n FROM pty_self_submission WHERE party_id = '${doiTac.partyId}' AND policy_id = '${cs}' AND status = 'CHO_XAC_MINH'`);
assert.equal(Number(conCho[0].n), 0, "rút đồng ý phải rút phiếu đang chờ khai theo phiên bản đó");
const ban2 = await sqlRows(`SELECT status FROM pty_self_submission WHERE id = '${pidBan2}'`);
assert.equal(ban2[0].status, "CHO_XAC_MINH", "phiếu khai theo phiên bản KHÁC không được bị rút");
assert.deepEqual((await call(doiTac.cookie, "GET", "/api/parties/cua-toi")).body.dongYPhienBan, [{ id: cs2, phienBan: phienBan2 }], "chỉ còn đồng ý bản mới");
console.log("✓ rút đồng ý bản cũ rút đúng phiếu của bản cũ; phiếu theo bản mới vẫn chờ; dongYPhienBan chỉ còn bản mới");

const nk = JSON.stringify(await sqlRows("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%' OR action LIKE 'privacy_%'"));
assert.ok(!nk.includes(SO) && !nk.includes(`9${tag}`), "nhật ký chứa số / địa chỉ tự khai");
console.log("✓ nhật ký chỉ mã");
