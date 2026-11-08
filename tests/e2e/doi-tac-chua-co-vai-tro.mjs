// ADR-0185 Đ1 (a) (chủ duyệt 2026-11-08) — Đối tác CHƯA CÓ VAI TRÒ ĐỐI TÁC bấm Gửi đơn, trên API THẬT (wrangler dev, D1 local tạm). Kế hoạch
// docs/superpowers/plans/2026-11-08-adr-0185-chan-don-doi-tac-thieu-vai-tro.md, Task 5 Step 3:
//   (1) tài khoản KIỂU CŨ (quyền Đối tác, hồ sơ chỉ vai STAFF — dữ liệu trước ADR, dựng bằng `gieoTaiKhoanLai(…, { kieuCu: true })`) lập nháp: máy chủ không ép bên
//       đặt (trống). Gửi đơn → 409 `doi_tac_chua_co_vai_tro` câu ca 1; đơn vẫn nháp, không bản chụp hoa hồng, không yêu cầu kiểm vé;
//   (2) Toàn quyền gán vai trò Cộng tác viên ở màn Quản lý tài khoản (PUT /api/staff/:id/roles) → 200, tài khoản vẫn chỉ giữ quyền Đối tác. Gửi đơn NGAY (nháp lưu
//       từ trước) → 409 câu ca 2, vẫn không bản chụp;
//   (3) Lưu thay đổi (PUT nguyên dịch vụ) → máy chủ ép bên đặt = hồ sơ của chính Đối tác; Gửi đơn → 200 nhánh B, đơn đã xác nhận, mọi bản chụp hiện hành có người
//       hưởng là hồ sơ đó (không còn «không người hưởng»).
// Bài khung thử cùng ý (Công ty lữ hành thay Cộng tác viên; thêm Còn vé, nhật ký; khoá NGUYÊN VĂN ba câu bằng hằng của xac-nhan-chung.ts):
// src/modules/orders/doi-tac-chua-co-vai-tro.test.ts. Ở đây chỉ phân biệt ca 1 / ca 2 bằng TÊN NÚT (bảng tham chiếu) để đổi chữ vẫn chỉ sửa hằng; phần thêm là đường
// thật qua wrangler dev, vai trò cá nhân (Cộng tác viên), và TRẠNG THÁI CUỐI do audit-invariants cuối máy kiểm — tài khoản KHÔNG vào danh sách ngưng
// (`ghiNgung: false`), nên nếu gán vai trò không sửa được nó thì R-LC-1c (mức fail) đỏ.
// D1 chung với kịch bản khác: mã danh mục giả ZCV1 riêng, đặt cờ «không cần xác nhận» tường minh (luôn nhánh B). Ngày đi ≥ 3 ngày (không chạm mốc 6 giờ).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZCV1','Dịch vụ thử Đối tác chưa có vai trò','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,94,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SUPER = await session(ACCOUNTS.superAdmin);
let r = await call(SUPER, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "ZCV1", canXacNhan: false });
assert.equal(r.status, 200, JSON.stringify(r.body));

const MA = "doi_tac_chua_co_vai_tro";
const tag = Date.now().toString(36);
const dt = await gieoTaiKhoanLai(`Đối tác chưa có vai trò ${tag}`, ["PARTNER"], { kieuCu: true, ghiNgung: false });
const vaiBenNgoai = async () => (await sqlRows(`SELECT count(*) AS n FROM v_pty_open_role_group WHERE party_id = '${dt.partyId}' AND role_group = 'EXTERNAL'`))[0].n;
const trangThai = async (id) => (await sqlRows(`SELECT status FROM orders WHERE id = '${id}'`))[0].status;
const soChup = async (id) => (await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_id = '${id}'`))[0].n;
const soYeuCau = async (id) => (await sqlRows(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${id}'`))[0].n;
const dichVu = () => catalogService({ catalogCode: "ZCV1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(3) });
const khach = { customerName: `Khách Đối Tác Chưa Vai Trò ${tag}`, customerPhone: "0913572468" };
const guiDon = (who, id) => call(who, "POST", `/api/orders/${id}/gui-don`, {});

// (1) chống bài rỗng: hồ sơ thật sự chưa mang vai trò bên ngoài
assert.equal(await vaiBenNgoai(), 0, "tài khoản kiểu cũ: hồ sơ chưa có vai trò nhóm bên ngoài");
r = await call(dt.cookie, "POST", "/api/orders", orderInput({ ...khach, services: [dichVu()] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const nhap = r.body.order;
assert.equal(nhap.bookerPartyId, null, "máy chủ không ép bên đặt cho tài khoản chưa có vai trò");
r = await guiDon(dt.cookie, nhap.id);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, MA);
const cauCa1 = r.body.error.message;
assert.match(cauCa1, /Gửi đơn/, "ca 1 nói tên nút Gửi đơn");
assert.doesNotMatch(cauCa1, /Lưu thay đổi/, "ca 1 không bảo lưu lại (lưu lại chưa giúp gì khi chưa có vai trò)");
assert.deepEqual([await trangThai(nhap.id), await soChup(nhap.id), await soYeuCau(nhap.id)], ["draft", 0, 0], "đơn vẫn nháp, không bản chụp, không yêu cầu kiểm vé");
console.log("✓ (1) Đối tác kiểu cũ lập nháp (bên đặt trống); Gửi đơn → 409 doi_tac_chua_co_vai_tro câu ca 1; đơn nháp, không bản chụp, không yêu cầu kiểm vé");

// (2) Toàn quyền gán vai trò Cộng tác viên; nháp lưu từ trước vẫn bị chặn, câu ca 2
r = await call(SUPER, "PUT", `/api/staff/${dt.id}/roles`, { roles: ["COLLABORATOR"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["PARTNER"], "gán vai trò không đổi quyền: vẫn chỉ Đối tác");
assert.equal(await vaiBenNgoai(), 1, "hồ sơ nay mang vai trò nhóm bên ngoài");
const DT = await session({ phone: dt.phone, pin: dt.pin }); // đổi vai trò có thể kết thúc phiên cũ: session() hỏi /api/auth/me rồi đăng nhập lại khi cần
r = await guiDon(DT, nhap.id);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, MA);
assert.notEqual(r.body.error.message, cauCa1, "đã có vai trò thì câu khác ca 1");
assert.match(r.body.error.message, /Sửa.*Lưu thay đổi.*Gửi đơn/, "ca 2 chỉ đúng ba nút theo thứ tự");
assert.deepEqual([await trangThai(nhap.id), await soChup(nhap.id)], ["draft", 0]);
console.log("✓ (2) Toàn quyền gán Cộng tác viên → 200 (quyền giữ nguyên Đối tác); Gửi đơn nháp lưu từ trước → 409 câu ca 2 (Sửa → Lưu thay đổi → Gửi đơn)");

// (3) Lưu thay đổi → bên đặt là hồ sơ của chính Đối tác; Gửi đơn → xác nhận, có người hưởng
r = await call(DT, "PUT", `/api/orders/${nhap.id}`, orderInput({ ...khach, services: [dichVu()], expectedUpdatedAt: nhap.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, dt.partyId, "lưu lại thì máy chủ ép bên đặt là hồ sơ đối tác");
r = await guiDon(DT, nhap.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.nhanh, "B");
assert.equal(await trangThai(nhap.id), "confirmed");
const chup = await sqlRows(
  `SELECT t.beneficiary_party_id AS b, t.commission_status AS c FROM ord_service_terms t WHERE t.order_id = '${nhap.id}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`,
);
assert.ok(chup.length >= 1, "có bản chụp hiện hành");
for (const x of chup) {
  assert.equal(x.b, dt.partyId, "người hưởng là hồ sơ của Đối tác");
  assert.notEqual(x.c, "NONE", "không còn «không người hưởng»");
}
console.log(`✓ (3) Lưu thay đổi → bên đặt = hồ sơ Đối tác; Gửi đơn → 200 nhánh B, đơn đã xác nhận, ${chup.length} bản chụp hiện hành đều có người hưởng (tài khoản để lại cho audit cuối máy)`);
