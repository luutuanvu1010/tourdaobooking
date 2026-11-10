// ADR-0071 (accepted 2026-10-01) — kiểm MỨC ROUTE trên CẢ ứng dụng, SQLite thật (khung tests/audit/harness.mjs, khuôn quan-tri-ky-thuat.test.ts):
//  điều 1: vai "Hành chính nhân sự" (quyền HR) tạo MỌI tài khoản; Quản trị KHÔNG tạo nữa; HCNS gán vai thường, không gán vai quản lý / quyền Quản trị,
//          Toàn quyền, Nhân sự; cấp bậc: HCNS và Quản trị không sửa tài khoản giữ ADMIN / SUPER_ADMIN / HR; HCNS không xem đơn, Danh bạ, danh mục, Nhật ký,
//          bảo trì và không hỗ trợ đăng nhập (đặt lại PIN, mở khoá, gỡ Face ID).
//  điều 2: đồng bộ nhân viên từ Google Sheet đã gỡ — route không còn.
//  điều 3: bảo trì miễn trừ theo Toàn quyền (không theo SĐT) — kể cả phiên đang mở; đăng nhập: mọi người không phải Toàn quyền đang hoạt động (kể cả SĐT không
//          có tài khoản) nhận CÙNG thân 503; GET/PUT /api/maintenance chỉ Toàn quyền.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CAU_VAI_XEM_KHACH_NHO_QUAN_TRI, HAU_TO_NHAT_KY_CHO_PIN } from "../../shared/xem-moi-khach.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "44444444-4444-4444-8444-444444444444";
const HR2 = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: HR2, phone: "0900000005", name: "Nhân sự Hai", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const logCount = (w: any, action: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = ?", action)[0].n;
const staffCount = (w: any) => w.q("SELECT count(*) n FROM staff")[0].n;
let so = 100;
const moi = (extra: Record<string, unknown> = {}) => ({ fullName: `Người Mới ${++so}`, phone: `0911000${so}`, taoHoSoMoi: true, ...extra });

test("điều 1b: Quản trị TẠO tài khoản → 403 (cả đường vai lẫn đường quyền cũ), không ghi gì; Toàn quyền → 201", async () => {
  const w = setup();
  const truoc = staffCount(w);
  for (const body of [moi({ roles: ["SALES_STAFF"] }), moi({ permissions: ["SALES"] }), moi({ roles: ["COLLABORATOR"] })]) {
    const r = await w.call("POST", "/api/staff", { as: ADM, body });
    assert.equal(r.status, 403, r.text);
  }
  assert.equal((await w.call("GET", "/api/staff/ho-so-khop?ten=An", { as: ADM })).status, 403, "hỏi hồ sơ khớp là một phần của luồng tạo");
  assert.equal(staffCount(w), truoc);
  assert.equal(logCount(w, "staff_created"), 0);
  assert.equal((await w.call("POST", "/api/staff", { as: SUP, body: moi({ roles: ["SALES_STAFF"] }) })).status, 201);
});

// ADR-0090 (bảng "Thay câu nào"): "mọi loại" của điều 1b nay TRỪ tài khoản mang quyền tiền — ca đường quyền cũ đổi từ Kế toán sang Hướng dẫn viên; ca Kế toán
// bị chặn ở accounts/quyen-tien.test.ts (Q-T4).
test("điều 1b, 1f: HCNS tạo MỌI loại tài khoản (nội bộ, đối tác, tài xế đối tác, đường quyền cũ) trừ tài khoản mang quyền tiền → 201 kèm PIN đầu tiên; hỏi hồ sơ khớp được", async () => {
  const w = setup();
  for (const body of [moi({ roles: ["SALES_STAFF"] }), moi({ roles: ["GUIDE_INTERNAL", "SALES_STAFF"] }), moi({ roles: ["COLLABORATOR"] }), moi({ roles: ["DRIVER_EXTERNAL"] }), moi({ permissions: ["FIELD"] })]) {
    const r = await w.call("POST", "/api/staff", { as: HR, body });
    assert.equal(r.status, 201, `${JSON.stringify(body)}: ${r.text}`);
    // ADR-0191: tài khoản xem mọi khách (Bán hàng) không trả PIN; các loại còn lại vẫn nhận PIN
    if (r.json.choQuanTriCapPin) assert.equal(r.json.pin, null);
    else assert.match(r.json.pin, /^\d{6}$/);
  }
  assert.equal(logCount(w, "staff_created"), 5);
  assert.equal((await w.call("GET", "/api/staff/ho-so-khop?ten=An", { as: HR })).status, 200);
});

test("điều 1d: HCNS KHÔNG gán vai quản lý (Giám đốc, Điều hành chung, IT, Hành chính nhân sự) và không cấp Quản trị / Toàn quyền / Nhân sự → 403, không tạo", async () => {
  const w = setup();
  const truoc = staffCount(w);
  for (const body of [
    moi({ roles: ["DIRECTOR"] }), moi({ roles: ["OPERATIONS_MANAGER"] }), moi({ roles: ["IT"] }), moi({ roles: ["HR_STAFF"] }),
    moi({ roles: ["SALES_STAFF"], adds: ["HR"], reason: "kiêm" }), moi({ permissions: ["ADMIN"] }), moi({ permissions: ["HR"] }), moi({ permissions: ["SUPER_ADMIN"] }),
  ]) {
    const r = await w.call("POST", "/api/staff", { as: HR, body });
    assert.equal(r.status, 403, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(staffCount(w), truoc);
  // Gán vai cho tài khoản có sẵn: vai thường được, vai HCNS / Giám đốc thì không.
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: HR, body: { roles: ["GUIDE_INTERNAL"] } })).status, 200);
  for (const roles of [["HR_STAFF"], ["DIRECTOR"], ["OPERATIONS_MANAGER"]]) {
    assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: HR, body: { roles } })).status, 403, roles.join());
  }
  // Toàn quyền gán vai HCNS được.
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["HR_STAFF"] } })).status, 200);
});

test("điều 1b, 1c: HCNS xem danh sách, sửa / ngưng cấp dưới; KHÔNG sửa Quản trị, Toàn quyền, HCNS khác; Quản trị KHÔNG sửa / xem vai của HCNS", async () => {
  const w = setup();
  const list = await w.call("GET", "/api/staff", { as: HR });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.staff.find((s: any) => s.id === SUP).permissions, ["ADMIN"], "Toàn quyền vẫn là vai ẩn với HCNS (ADR-0042)");
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: HR, body: { fullName: "An Đổi Tên" } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: HR, body: { active: false } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: HR, body: { active: true } })).status, 200);
  assert.equal((await w.call("GET", `/api/staff/${SALES}/roles`, { as: HR })).status, 200);
  for (const t of [ADM, SUP, HR2]) {
    assert.equal((await w.call("PATCH", `/api/staff/${t}`, { as: HR, body: { active: false } })).status, 403, t);
    assert.equal((await w.call("GET", `/api/staff/${t}/roles`, { as: HR })).status, 403, t);
    assert.equal((await w.call("PUT", `/api/staff/${t}/roles`, { as: HR, body: { roles: ["SALES_STAFF"] } })).status, 403, t);
  }
  assert.equal((await w.call("PATCH", `/api/staff/${HR}`, { as: ADM, body: { active: false } })).status, 403, "Quản trị không sửa HCNS");
  assert.equal((await w.call("GET", `/api/staff/${HR}/roles`, { as: ADM })).status, 403);
  // Từ ADR-0083 điều 1a, 403 này đến SỚM hơn luật cấp bậc (đường kiểu cũ chỉ Toàn quyền); cấp bậc vẫn khoá ở PATCH và …/roles ngay trên.
  assert.equal((await w.call("PUT", `/api/staff/${HR}/permissions`, { as: ADM, body: { permissions: ["SALES"] } })).status, 403);
  // Quản trị GIỮ sửa / ngưng cấp dưới (ADR-0071 Hệ quả).
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { fullName: "An Lần Hai" } })).status, 200);
  assert.equal(w.q("SELECT active FROM staff WHERE id = ?", HR)[0].active, 1);
});

test("điều 1e: HCNS KHÔNG hỗ trợ đăng nhập (đặt lại PIN, mở khoá, gỡ Face ID) và không vào đơn, Danh bạ, danh mục, Nhật ký, bảo trì, Góp ý người khác", async () => {
  const w = setup();
  const pin = w.q("SELECT pin_hash FROM staff WHERE id = ?", SALES)[0].pin_hash;
  for (const p of [`/api/staff/${SALES}/reset-pin`, `/api/staff/${SALES}/unlock`, `/api/staff/${SALES}/passkeys/remove-all`]) {
    assert.equal((await w.call("POST", p, { as: HR })).status, 403, p);
  }
  assert.equal(w.q("SELECT pin_hash FROM staff WHERE id = ?", SALES)[0].pin_hash, pin);
  for (const p of ["/api/orders", "/api/orders/dashboard", "/api/parties", "/api/catalog", "/api/catalog/admin", "/api/audit", "/api/maintenance", "/api/feedback", "/api/dispatch/assignees"]) {
    assert.equal((await w.call("GET", p, { as: HR })).status, 403, p);
  }
  assert.equal((await w.call("POST", "/api/locations", { as: HR, body: { name: "Bến mới" } })).status, 403, "địa điểm: không");
});

test("điều 2: đồng bộ nhân viên từ Google Sheet đã GỠ — không route nào phục vụ (GET 405 vì trùng khuôn PATCH /api/staff/:id; POST …/apply 404), không ghi gì", async () => {
  const w = setup();
  const truoc = staffCount(w);
  for (const who of [SUP, ADM]) {
    const g = await w.call("GET", "/api/staff/sheet", { as: who });
    assert.ok(g.status === 404 || g.status === 405, `GET: ${g.status}`);
    assert.equal((await w.call("POST", "/api/staff/sheet/apply", { as: who, body: { phones: ["0911999999"] } })).status, 404);
  }
  assert.equal(staffCount(w), truoc);
  assert.equal(logCount(w, "staff_synced"), 0);
});

// ---- điều 3: bảo trì ----------------------------------------------------------------------------------------------------------------------------
const ENDS = () => new Date(Date.now() + 2 * 24 * 3600_000).toISOString(); // ≥ 1 ngày: đồng hồ không có giây ⇒ hai thân 503 so được bằng nhau
const bat = (w: any, allowed = "0900000003") => w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${ENDS()}', allowed_phones = '${allowed}' WHERE id = 'default'`);
const login = (w: any, phone: string) => w.call("POST", "/api/auth/login", { body: { phone, pin: "135790" } });

test("điều 3c: GET và PUT /api/maintenance chỉ Toàn quyền (settings.ops) — Quản trị 403 dù SĐT nằm trong danh sách cũ; Toàn quyền KHÔNG cần SĐT trong danh sách", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE mnt_setting SET allowed_phones = '0900000003' WHERE id = 'default'"); // SĐT của Quản trị
  assert.equal((await w.call("GET", "/api/maintenance", { as: ADM })).status, 403);
  assert.equal((await w.call("PUT", "/api/maintenance", { as: ADM, body: { on: true, endsAt: ENDS() } })).status, 403);
  const g = await w.call("GET", "/api/maintenance", { as: SUP });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.canToggle, true);
  const p = await w.call("PUT", "/api/maintenance", { as: SUP, body: { on: true, endsAt: ENDS() } });
  assert.equal(p.status, 200, p.text);
  assert.equal(w.q("SELECT enabled FROM mnt_setting")[0].enabled, 1);
  assert.equal((await w.call("PUT", "/api/maintenance", { as: SUP, body: { on: false } })).status, 200);
});

test("điều 3a: bảo trì BẬT — phiên đang mở của Quản trị / Bán hàng / HCNS bị 503 (kể cả SĐT nằm trong danh sách cũ); Toàn quyền dùng bình thường", async () => {
  const w = setup();
  bat(w, "0900000003,0900000001"); // danh sách cũ có SĐT Quản trị + Bán hàng — nay KHÔNG còn nghĩa
  for (const who of [ADM, SALES, HR]) {
    const r = await w.call("GET", "/api/auth/me", { as: who });
    assert.equal(r.status, 503, `${who}: ${r.text}`);
    assert.equal(r.json.error.code, "maintenance");
  }
  const me = await w.call("GET", "/api/auth/me", { as: SUP });
  assert.equal(me.status, 200, me.text);
  assert.equal(me.json.maintenance.on, true, "Toàn quyền vẫn thấy dải nhắc (điều 3e)");
  assert.equal((await w.call("GET", "/api/staff", { as: SUP })).status, 200);
});

test("điều 3b: bảo trì BẬT — đăng nhập: SĐT lạ, SĐT Quản trị (kể cả trong danh sách cũ), SĐT bị ngưng giữ Toàn quyền nhận CÙNG thân 503 trước khi kiểm PIN; Toàn quyền đang hoạt động qua tới bước PIN", async () => {
  const w = setup();
  const SUP_NGUNG = "99999999-9999-4999-8999-999999999999";
  seedStaff(w.sqlite, { id: SUP_NGUNG, phone: "0900000009", name: "Chủ Cũ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${SUP_NGUNG}'`);
  bat(w, "0900000003");
  const bodies = [];
  for (const phone of ["0988777666", "0900000003", "0900000001", "0900000004", "0900000009", "12345"]) {
    const r = await login(w, phone);
    assert.equal(r.status, 503, `${phone}: ${r.text}`);
    bodies.push(r.text);
  }
  assert.equal(new Set(bodies).size, 1, "mọi người bị chặn nhận CÙNG MỘT thân — không lộ ai có tài khoản");
  const owner = await login(w, "0900000007");
  assert.notEqual(owner.status, 503, "Toàn quyền đang hoạt động không bị chặn ở đăng nhập");
  assert.equal(owner.status, 401, "qua cổng bảo trì, tới bước kiểm PIN (PIN khung thử không đúng)");
});

test("điều 3d: đổi SĐT của tài khoản có SĐT trong danh sách cũ KHÔNG còn bị chặn (luật phoneChangeProblem đã bỏ)", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE mnt_setting SET allowed_phones = '0900000001' WHERE id = 'default'");
  const r = await w.call("PATCH", `/api/staff/${SALES}`, { as: SUP, body: { phone: "0911222333" } });
  assert.equal(r.status, 200, r.text);
});

// ---- ADR-0191: tài khoản xem mọi khách do Nhân sự tạo thì PIN đầu do Quản trị cấp; Nhân sự không gán thêm vai xem mọi khách -------------------------------------
const dangNhap = (w: any, phone: string, pin: string) => w.call("POST", "/api/auth/login", { body: { phone, pin } });
const khongDangNhapDuoc = async (w: any, phone: string) => {
  for (const pin of ["000000", "123456"]) assert.equal((await dangNhap(w, phone, pin)).status, 401, `${phone} / ${pin}`);
};

test("ADR-0191 mục 1: Nhân sự tạo tài khoản Bán hàng (đường vai SALES_STAFF) ⇒ 201, pin null, chờ Quản trị cấp; PIN thử đều 401", async () => {
  const w = setup();
  const body = moi({ roles: ["SALES_STAFF"] });
  const r = await w.call("POST", "/api/staff", { as: HR, body });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.pin, null);
  assert.equal(r.json.choQuanTriCapPin, true);
  await khongDangNhapDuoc(w, r.json.staff.phone);
});

test("ADR-0191 mục 1: Nhân sự tạo theo đường quyền cũ [SALES] ⇒ như trên", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: HR, body: moi({ permissions: ["SALES"] }) });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.pin, null);
  assert.equal(r.json.choQuanTriCapPin, true);
  await khongDangNhapDuoc(w, r.json.staff.phone);
});

test("ADR-0191: Nhân sự tạo Quản lý bán hàng ⇒ 403 như hôm nay (ADR-0169), không tạo", async () => {
  const w = setup();
  const truoc = staffCount(w);
  const r = await w.call("POST", "/api/staff", { as: HR, body: moi({ roles: ["SALES_MANAGER"] }) });
  assert.equal(r.status, 403, r.text);
  assert.equal(staffCount(w), truoc);
});

test("ADR-0191 mục 1: Nhân sự tạo tài xế công ty ⇒ vẫn nhận PIN 6 số, choQuanTriCapPin false, và PIN đó đăng nhập được", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: HR, body: moi({ roles: ["DRIVER_INTERNAL"] }) });
  assert.equal(r.status, 201, r.text);
  assert.match(r.json.pin, /^\d{6}$/);
  assert.equal(r.json.choQuanTriCapPin, false);
  assert.notEqual((await dangNhap(w, r.json.staff.phone, r.json.pin)).status, 401);
});

test("ADR-0191 mục 1: Toàn quyền tạo Bán hàng ⇒ có PIN như hôm nay", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: SUP, body: moi({ roles: ["SALES_STAFF"] }) });
  assert.equal(r.status, 201, r.text);
  assert.match(r.json.pin, /^\d{6}$/);
  assert.equal(r.json.choQuanTriCapPin, false);
});

test("ADR-0191 mục 2: Quản trị bấm Đặt lại PIN tài khoản pin null ⇒ đăng nhập bằng PIN mới được", async () => {
  const w = setup();
  const c = await w.call("POST", "/api/staff", { as: HR, body: moi({ roles: ["SALES_STAFF"] }) });
  assert.equal(c.json.pin, null);
  const rs = await w.call("POST", `/api/staff/${c.json.staff.id}/reset-pin`, { as: ADM });
  assert.equal(rs.status, 200, rs.text);
  assert.match(rs.json.pin, /^\d{6}$/);
  assert.notEqual((await dangNhap(w, c.json.staff.phone, rs.json.pin)).status, 401);
});

const taoTaiXe = async (w: any) => (await w.call("POST", "/api/staff", { as: HR, body: moi({ roles: ["DRIVER_INTERNAL"] }) })).json.staff.id as string;
const quyenCuaTaiKhoan = (w: any, id: string): string[] => w.q("SELECT permission_type_code AS permission FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY permission_type_code", id).map((x: any) => x.permission);

test("ADR-0191 mục 3(a): Nhân sự thêm vai Bán hàng cho tài khoản tài xế ⇒ 403 (đúng câu), quyền trong CSDL không đổi; Quản trị gán cùng vai ⇒ 200", async () => {
  const w = setup();
  const id = await taoTaiXe(w);
  const truoc = quyenCuaTaiKhoan(w, id);
  const nhanSu = await w.call("PUT", `/api/staff/${id}/roles`, { as: HR, body: { roles: ["DRIVER_INTERNAL", "SALES_STAFF"] } });
  assert.equal(nhanSu.status, 403, nhanSu.text);
  assert.equal(nhanSu.json.error.code, "forbidden");
  assert.equal(nhanSu.json.error.message, CAU_VAI_XEM_KHACH_NHO_QUAN_TRI);
  assert.deepEqual(quyenCuaTaiKhoan(w, id), truoc);
  const quanTri = await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["DRIVER_INTERNAL", "SALES_STAFF"] } });
  assert.equal(quanTri.status, 200, quanTri.text);
  assert.ok(quyenCuaTaiKhoan(w, id).includes("SALES"));
});

test("ADR-0191 mục 3(a): Nhân sự bỏ bớt vai, hoặc gán vai không xem khách ⇒ 200", async () => {
  const w = setup();
  const id = await taoTaiXe(w);
  assert.equal((await w.call("PUT", `/api/staff/${id}/roles`, { as: HR, body: { roles: ["DRIVER_INTERNAL", "GUIDE_INTERNAL"] } })).status, 200);
  assert.equal((await w.call("PUT", `/api/staff/${id}/roles`, { as: HR, body: { roles: ["DRIVER_INTERNAL"] } })).status, 200, "bỏ bớt vai");
  // tài khoản Bán hàng sẵn có (SALES): Nhân sự đổi sang vai không xem khách thì được; đổi qua lại vai CÓ xem khách (trước đã có) không bị chặn
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: HR, body: { roles: ["GUIDE_INTERNAL"] } })).status, 200);
});

test("ADR-0191 mục 3(a): tài khoản đã xem mọi khách thì Nhân sự đổi vai vẫn xem mọi khách (trước đã có) ⇒ không bị chặn", async () => {
  const w = setup();
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: HR, body: { roles: ["SALES_STAFF", "GUIDE_INTERNAL"] } })).status, 200);
});

test("ADR-0191 mục 6: nhật ký tạo tài khoản Bán hàng do Nhân sự có hậu tố chờ Quản trị cấp PIN, không chứa số điện thoại; tài xế thì không có hậu tố", async () => {
  const w = setup();
  const body = moi({ roles: ["SALES_STAFF"] });
  const phone = String(body.phone);
  await w.call("POST", "/api/staff", { as: HR, body });
  const body2 = moi({ permissions: ["SALES"] });
  await w.call("POST", "/api/staff", { as: HR, body: body2 });
  await w.call("POST", "/api/staff", { as: HR, body: moi({ roles: ["DRIVER_INTERNAL"] }) });
  const dong = w.q("SELECT detail FROM audit_log WHERE action = 'staff_created' ORDER BY rowid").map((x: any) => String(x.detail));
  assert.equal(dong.length, 3);
  assert.ok(dong[0]!.endsWith(HAU_TO_NHAT_KY_CHO_PIN), dong[0]);
  assert.ok(dong[1]!.endsWith(HAU_TO_NHAT_KY_CHO_PIN), dong[1]);
  assert.ok(!dong[2]!.includes(HAU_TO_NHAT_KY_CHO_PIN), dong[2]);
  for (const d of dong) assert.ok(!d.includes(phone) && !d.includes(String(body2.phone)), "nhật ký không ghi số điện thoại");
});
