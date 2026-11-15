// E2E «Nút thanh dưới» tự chọn (ADR-0187 Đ2.3; đặc tả docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md §5) trên API thật, D1 local tạm.
// Tài khoản DÙNG MỘT LẦN (Bán hàng + Kế toán, Bán hàng, Tài xế đối tác, Toàn quyền) — không đụng ACCOUNTS dùng chung, không đổi dữ liệu dùng chung.
import assert from "node:assert/strict";
import { call, gieoTaiKhoanLai, sqlRows } from "./lib.mjs";

const DUONG = "/api/account/thanh-duoi";
const LAI = await gieoTaiKhoanLai("Kiêm Bán Kế thanh dưới", ["SALES", "ACCOUNTING"]);
const BAN = await gieoTaiKhoanLai("Bán hàng thanh dưới", ["SALES"]);
const TX = await gieoTaiKhoanLai("Tài xế đối tác thanh dưới", ["DRIVER_PARTNER"]);
const SA = await gieoTaiKhoanLai("Toàn quyền thanh dưới", ["SUPER_ADMIN"]);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body;
const dongLuu = async (id) => (await sqlRows(`SELECT trang FROM stf_thanh_duoi WHERE staff_id = '${id}'`))[0];

// 1. Tiêu chí 1: Bán hàng + Kế toán chọn Sổ công nợ → 200; /me mang danh sách đúng thứ tự; một dòng nhật ký «Đổi nút thanh dưới» không dữ liệu cá nhân.
assert.equal((await me(LAI.cookie)).staff.thanhDuoi, undefined, "chưa chọn gì thì /me không mang trường");
let r = await call(LAI.cookie, "PUT", DUONG, { trang: ["trangChu", "donHang", "taoDon", "soCongNo"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.trang, ["trangChu", "donHang", "taoDon", "soCongNo"]);
assert.deepEqual((await me(LAI.cookie)).staff.thanhDuoi, ["trangChu", "donHang", "taoDon", "soCongNo"]);
const nk = await sqlRows(`SELECT detail, target_id FROM audit_log WHERE action = 'bottom_tabs_changed' AND staff_id = '${LAI.id}'`);
assert.equal(nk.length, 1);
assert.equal(nk[0].detail, "Trang chủ, Đơn hàng, Tạo đơn, Sổ công nợ");
assert.equal(nk[0].target_id, LAI.id);
assert.ok(!nk[0].detail.includes(LAI.phone), "nhật ký không chứa số điện thoại");
console.log("✓ Bán hàng + Kế toán chọn Sổ công nợ: 200, /me mang danh sách, một dòng nhật ký");

// 2. Tiêu chí 2: Bán hàng chọn trang không mở được — Sổ công nợ và Thiết lập (Sổ công nợ KHÔNG khai moTrang: bắt cổng chỉ hỏi moTrang) → 403 câu tiếng Việt; dữ liệu không đổi.
for (const trang of [["soCongNo"], ["donHang", "thietLap"]]) {
  r = await call(BAN.cookie, "PUT", DUONG, { trang });
  assert.equal(r.status, 403, `${trang}: ${JSON.stringify(r.body)}`);
  assert.match(r.body.error.message, /không mở được trang này/);
}
assert.equal(await dongLuu(BAN.id), undefined, "không ghi dòng nào khi bị từ chối");
console.log("✓ Bán hàng chọn Sổ công nợ / Thiết lập: 403 tiếng Việt, không ghi");

// 3. Tiêu chí 5: thân hỏng → 400.
for (const than of [{}, { trang: "donHang" }, { trang: ["donHang", "donHang"] }, { trang: ["toi"] }, { trang: ["xyz"] }, { trang: ["trangChu", "donHang", "taoDon", "danhBa", "gopY"] }]) {
  r = await call(BAN.cookie, "PUT", DUONG, than);
  assert.equal(r.status, 400, `${JSON.stringify(than)}: ${JSON.stringify(r.body)}`);
}
console.log("✓ thân hỏng, trùng, Tôi, khoá lạ, quá 4 trang: 400");

// 4. Tiêu chí 3: Tài xế đối tác → 403 (không có ô me.favorites.write).
r = await call(TX.cookie, "PUT", DUONG, { trang: [] });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(await dongLuu(TX.id), undefined);
console.log("✓ Tài xế đối tác: 403");

// 5. Tiêu chí 4: Toàn quyền đã chọn rồi bật xem như Bán hàng → /me không mang danh sách; PUT 403 acting_role; thoát → danh sách trở lại.
r = await call(SA.cookie, "PUT", DUONG, { trang: ["thietLap"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SA.cookie, "POST", "/api/auth/xem-nhu-vai", { role: "SALES" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const dongVai = await me(SA.cookie);
assert.equal(dongVai.actingRole, "SALES");
assert.equal(dongVai.staff.thanhDuoi, undefined, "đang đóng vai: /me không mang nút Toàn quyền đã chọn");
r = await call(SA.cookie, "PUT", DUONG, { trang: ["donHang"] });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.code, "acting_role");
assert.equal((await dongLuu(SA.id)).trang, "thietLap", "lựa chọn của Toàn quyền không bị đổi");
assert.equal((await call(SA.cookie, "DELETE", "/api/auth/xem-nhu-vai")).status, 200);
assert.deepEqual((await me(SA.cookie)).staff.thanhDuoi, ["thietLap"]);
console.log("✓ xem như vai trò khác: /me không mang lựa chọn, PUT 403 acting_role; thoát thì lựa chọn trở lại");

// 6. Tiêu chí 6: «Về mặc định» → cột NULL (không xoá dòng), /me không còn trường.
r = await call(LAI.cookie, "PUT", DUONG, { trang: [] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await me(LAI.cookie)).staff.thanhDuoi, undefined);
const sau = await dongLuu(LAI.id);
assert.ok(sau, "dòng vẫn còn (không xoá cứng)");
assert.equal(sau.trang, null);
assert.equal((await sqlRows(`SELECT detail FROM audit_log WHERE action = 'bottom_tabs_changed' AND staff_id = '${LAI.id}' ORDER BY created_at DESC LIMIT 1`))[0].detail, "Về mặc định");
console.log("✓ Về mặc định: cột rỗng, dòng còn, nhật ký «Về mặc định»");
