// ADR-0213 Đ5, Đ8.1 (mốc B1 đợt 2 đăng ký, Task 12) qua route thật (tests/audit/harness.mjs — cả ứng dụng trên SQLite thật dựng từ migrations/). Mọi giá trị là GIẢ.
// Người quản lý CÓ HIỆU LỰC (Đ2.8) của tổ chức bên đặt thấy đơn ĐÃ GỬI LÊN Tour Đảo của tổ chức (đã xác nhận, đã huỷ, nháp đang chờ văn phòng) ở chi tiết VÀ «Đơn của tôi»;
// thấy Trả sau và phiếu công nợ của tổ chức; KHÔNG sửa / huỷ / gửi vé / nộp tiền đơn người khác lập (ruling R13). Thành viên, Bán hàng, Thực tập, văn phòng không đổi.
// Ở B1 chỉ người quản lý có hiệu lực mới thay mặt tổ chức (R4), nên «Gửi đơn» đơn tổ chức chỉ do chính người quản lý bấm (Đ8.1).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const INTERN = "22222222-2222-4222-8222-222222222222";
const SUP = "77777777-7777-4777-8777-777777777777";
const NAM = "66666666-6666-4666-8666-666666666601"; // người quản lý của Sunrise (có vai riêng)
const TV = "66666666-6666-4666-8666-666666666603"; // thành viên Sunrise
const LA = "66666666-6666-4666-8666-666666666604"; // Đối tác không dính Sunrise
const SUNRISE = "dda00000-0000-4000-8000-0000000000a1";
const KHAC = "dda00000-0000-4000-8000-0000000000a3";
const AT = "2026-10-01T00:00:00.000Z";

type W = ReturnType<typeof world>;
function toChuc(w: W, id: string, ten: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${id}`, id, AT, AT);
}
function lienKet(w: W, person: string, org: string, loai: "MANAGER_OF" | "MEMBER_OF"): void {
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-10-01', ?, ?)")
    .run(`lk-${person}-${org}`, person, org, loai, AT, AT);
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const thanDon = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(4) }],
  ...extra,
});
const lap = async (w: W, as: string, extra: Record<string, unknown> = {}): Promise<string> => {
  const r = await w.call("POST", "/api/orders", { as, body: thanDon(extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id as string;
};
/** Nháp đang chờ văn phòng (yêu cầu xác nhận mở) — chèn thẳng như dữ liệu đã có, không đi lại luật Gửi kiểm vé (bài khác canh). */
function choVanPhong(w: W, orderId: string, by: string): void {
  w.sqlite.prepare("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`yc-${orderId}`, orderId, AT, by, "2099-01-01T00:00:00.000Z", AT, AT);
}

async function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000002", name: "Bình Thực Tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: NAM, phone: "0900000021", name: "Nam Lễ Tân", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: TV, phone: "0900000023", name: "Tú Thành Viên", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LA, phone: "0900000024", name: "Lạ Đối Tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  toChuc(w, SUNRISE, "Khách sạn Sunrise");
  toChuc(w, KHAC, "Đại lý Khác");
  lienKet(w, `pty-${NAM}`, SUNRISE, "MANAGER_OF");
  lienKet(w, `pty-${TV}`, SUNRISE, "MEMBER_OF");
  // D1: văn phòng lập cho Sunrise, đã xác nhận (đơn tổ chức do người khác lập). D2: nháp văn phòng cho Sunrise (chưa gửi). D3: nháp văn phòng cho Sunrise đang chờ văn phòng.
  // D5: văn phòng lập cho tổ chức khác, đã xác nhận. D4: anh Nam thay mặt Sunrise rồi Gửi đơn.
  const d1 = await lap(w, SALES, { bookerPartyId: SUNRISE });
  assert.equal((await w.xacNhanDon(d1, SALES)).status, 200);
  const d2 = await lap(w, SALES, { bookerPartyId: SUNRISE });
  const d3 = await lap(w, SALES, { bookerPartyId: SUNRISE });
  choVanPhong(w, d3, SALES);
  const d5 = await lap(w, SALES, { bookerPartyId: KHAC });
  assert.equal((await w.xacNhanDon(d5, SALES)).status, 200);
  return { w, d1, d2, d3, d5 };
}
const idsDanhSach = async (w: W, as: string): Promise<string[]> => {
  const r = await w.call("GET", "/api/orders?limit=100", { as });
  assert.equal(r.status, 200, r.text);
  return (r.json.orders as { id: string }[]).map((o) => o.id);
};

test("Đ5: người quản lý thấy đơn đã gửi của tổ chức (kể cả nháp đang chờ văn phòng) ở chi tiết, hành khách, biên nhận, tiền và «Đơn của tôi»; không thấy nháp chưa gửi, đơn tổ chức khác", async () => {
  const { w, d1, d2, d3, d5 } = await setup();
  const ct = await w.call("GET", `/api/orders/${d1}`, { as: NAM });
  assert.equal(ct.status, 200, ct.text);
  assert.equal(ct.json.canModify, false, "R13: người quản lý không sửa / huỷ đơn người khác lập");
  assert.ok(Array.isArray(ct.json.history) && ct.json.history.length > 0, "order.history.view mở theo cờ");
  assert.equal((await w.call("GET", `/api/orders/${d3}`, { as: NAM })).status, 200, "nháp đang chờ văn phòng = đã gửi lên");
  assert.equal((await w.call("GET", `/api/orders/${d2}`, { as: NAM })).status, 404, "nháp chưa gửi vẫn theo ADR-0135 (404)");
  assert.equal((await w.call("GET", `/api/orders/${d5}`, { as: NAM })).status, 403, "tổ chức khác: như hôm nay");
  for (const duong of ["passengers", "receipt", "payments"]) {
    const r = await w.call("GET", `/api/orders/${d1}/${duong}`, { as: NAM });
    assert.equal(r.status, 200, `${duong}: ${r.text}`);
  }
  const ds = await idsDanhSach(w, NAM);
  assert.ok(ds.includes(d1) && ds.includes(d3), "«Đơn của tôi» gồm đơn đã gửi của tổ chức");
  assert.ok(!ds.includes(d2) && !ds.includes(d5), "không nháp chưa gửi, không tổ chức khác");
  const tien = await w.call("POST", "/api/ledger/balances", { as: NAM, body: { orderIds: [d1, d5] } });
  assert.equal(tien.status, 200, tien.text);
  assert.deepEqual(Object.keys(tien.json.balances), [d1], "tiền của đơn tổ chức trên danh sách");
});

test("R13: người quản lý không huỷ, không sửa hành khách, không xem / gửi vé đơn tổ chức người khác lập", async () => {
  const { w, d1 } = await setup();
  assert.equal((await w.call("POST", `/api/orders/${d1}/status`, { as: NAM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 403);
  assert.equal((await w.call("POST", `/api/orders/${d1}/passengers`, { as: NAM, body: { expectedUpdatedAt: "x", them: [] } })).status, 403);
  assert.equal((await w.call("GET", `/api/ve/don/${d1}`, { as: NAM })).status, 404, "ADR-0170 Đ1: vé giữ cho người lập — kho vé không nhận cờ (miễn có tên ở bài quét), như đơn không thấy");
});

test("Đ5: thành viên, Đối tác lạ, Thực tập, Bán hàng không rộng thêm; Toàn quyền giữ nguyên", async () => {
  const { w, d1, d3 } = await setup();
  for (const ai of [TV, LA]) {
    assert.equal((await w.call("GET", `/api/orders/${d1}`, { as: ai })).status, 403, `${ai}: đơn người khác như hôm nay`);
    assert.equal((await w.call("GET", `/api/orders/${d3}`, { as: ai })).status, 404);
    const ds = await idsDanhSach(w, ai);
    assert.ok(!ds.includes(d1) && !ds.includes(d3));
    const ts = await w.call("GET", "/api/tra-sau/cua-toi", { as: ai });
    assert.equal(ts.status, 200, ts.text);
    assert.deepEqual(ts.json.toChuc, [], "thành viên không thấy sổ của tổ chức");
    assert.equal((await w.call("GET", `/api/orders/${d1}/cong-no-dai-ly`, { as: ai })).status, 403);
  }
  assert.equal((await w.call("GET", `/api/orders/${d1}`, { as: INTERN })).status, 403);
  assert.equal((await w.call("GET", `/api/orders/${d1}`, { as: SUP })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${d3}`, { as: SUP })).status, 200, "người xét duyệt đọc nháp đang chờ (ADR-0136 Đ6) — không đổi");
});

test("Đ5: người quản lý thấy Trả sau và phiếu công nợ của tổ chức; không nút «Đã chuyển tiền» (R13)", async () => {
  const { w, d1 } = await setup();
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: SUNRISE, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 12, lyDo: "thử" } })).status, 201);
  const ts = await w.call("GET", "/api/tra-sau/cua-toi", { as: NAM });
  assert.equal(ts.status, 200, ts.text);
  assert.equal(ts.json.toChuc.length, 1);
  assert.equal(ts.json.toChuc[0].partyId, SUNRISE);
  assert.equal(ts.json.toChuc[0].hanMuc, 10_000_000);
  assert.equal(ts.json.toChuc[0].coHanMuc, true);
  const p = await w.call("GET", `/api/orders/${d1}/cong-no-dai-ly`, { as: NAM });
  assert.equal(p.status, 200, p.text);
  assert.equal(p.json.phieu.nop.ghiDuoc, false, "không nộp tiền thay tổ chức (dai-ly.nop.ghi không nhận cờ)");
});

test("Đ8.1: người quản lý Gửi đơn đơn tư cách tổ chức mình lập; mất hiệu lực ⇒ 403 và thôi thấy đơn tổ chức", async () => {
  const { w, d1 } = await setup();
  const d4 = await lap(w, NAM, { tuCach: SUNRISE });
  const gui = await w.call("POST", `/api/orders/${d4}/gui-don`, { as: NAM, body: {} });
  assert.equal(gui.status, 200, gui.text);
  assert.equal(w.q("SELECT staff_id AS s, status AS t FROM orders WHERE id = ?", d4)[0].t, "confirmed");
  const d6 = await lap(w, NAM, { tuCach: SUNRISE });
  // Mất hiệu lực (Đ2.8): tài khoản mất quyền Đối tác? — dùng cách tổ chức thôi vai được hưởng (không ai là người quản lý có hiệu lực).
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-10-02' WHERE id = ?").run(`r-${SUNRISE}`);
  const g2 = await w.call("POST", `/api/orders/${d6}/gui-don`, { as: NAM, body: {} });
  assert.equal(g2.status, 403, g2.text);
  assert.equal(w.q("SELECT status AS t FROM orders WHERE id = ?", d6)[0].t, "draft");
  assert.equal((await w.call("GET", `/api/orders/${d1}`, { as: NAM })).status, 403, "cờ tính lại mỗi request — mất hiệu lực thì thôi thấy");
  assert.ok(!(await idsDanhSach(w, NAM)).includes(d1));
});
