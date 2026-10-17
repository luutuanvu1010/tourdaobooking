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

r = await call(ADMIN, "GET", `/api/parties/${doiTac.partyId}`);
assert.equal(r.status, 200);
assert.ok(!JSON.stringify(r.body).includes(`9${tag}`), "địa chỉ tự khai lên Danh bạ trước khi xác minh");
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
r = await call(doiTac.cookie, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: cs, quyetDinh: "RUT" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const conCho = await sqlRows(`SELECT count(*) AS n FROM pty_self_submission WHERE party_id = '${doiTac.partyId}' AND policy_id = '${cs}' AND status = 'CHO_XAC_MINH'`);
assert.equal(Number(conCho[0].n), 0, "rút đồng ý phải rút phiếu đang chờ khai theo phiên bản đó");
assert.deepEqual((await call(doiTac.cookie, "GET", "/api/parties/cua-toi")).body.dongYPhienBan, [], "không còn phiên bản nào đang đồng ý");
console.log("✓ rút đồng ý rút luôn phiếu đang chờ của phiên bản đó; dongYPhienBan rỗng");

const nk = JSON.stringify(await sqlRows("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%' OR action LIKE 'privacy_%'"));
assert.ok(!nk.includes(SO) && !nk.includes(`9${tag}`), "nhật ký chứa số / địa chỉ tự khai");
console.log("✓ nhật ký chỉ mã");
