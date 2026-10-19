// Bên đặt là đối tác (sổ đại lý đợt 1, Task 6; Review Focus 2). Route thật qua khung thử (SQLite thật + cả ứng dụng):
//  - văn phòng gắn được hồ sơ TỔ CHỨC mang vai được hưởng (trước đây bị loại, `BOOKER_VALUE` ghi NULL lặng lẽ);
//  - tài khoản Đối tác có hồ sơ cá nhân đang mang vai được hưởng luôn là bên đặt của đơn mình lập (thu hẹp theo lời chủ 2026-10-08);
//  - đổi bên đặt trên đơn đã xác nhận có bản chụp ⇒ chụp lại CÙNG lô; đơn xác nhận trước đợt 1 (không bản chụp) không chụp (N15);
//  - `OrderDetailDto.bookerLaDoiTac` do máy chủ tính; biên nhận in tên khách, không in tên bên đặt;
//  - vòng sửa 1 — K1 (lời chủ 2026-10-09): mọi tài khoản giữ quyền Đối tác (kể cả lai) KHÔNG chọn được đại lý / cộng tác viên khác làm bên đặt ở cả ba đường
//    (lập đơn, lưu nháp, đổi khách) — văn phòng lập hộ; I1: bên đặt mất điều kiện ngay trước lô đổi khách ⇒ 409, không bản chụp có người hưởng trên đơn mất bên đặt.
// Id hồ sơ trong bài là chuỗi dạng UUID (máy chủ chỉ nhận `PARTY_ID_RE`); không dùng chữ "pty-dla" rút gọn vì thân yêu cầu sẽ bị 400 "Hồ sơ khách không hợp lệ".
// Ca tranh chấp dùng `chenTruocLo` / `chenTruocLoCho` (mẫu của chup-xac-nhan.test.ts), không dùng `Promise.all` (không tạo tranh chấp thật trong khung thử).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoDongTienKhop } from "../../../tests/audit/dong-tien.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác, hồ sơ cá nhân mang TRAVEL_AGENCY
const DT2 = "66666666-6666-4666-8666-666666666667"; // Đối tác, hồ sơ chỉ mang CUSTOMER
const DT3 = "66666666-6666-4666-8666-666666666668"; // Đối tác chưa gắn hồ sơ (staff.party_id NULL)
const LAI = "66666666-6666-4666-8666-666666666669"; // Bán hàng + Đối tác (tài khoản lai)
const DLA = "dda00000-0000-4000-8000-000000000001"; // tổ chức mang TRAVEL_AGENCY
const DLB = "dda00000-0000-4000-8000-000000000003"; // tổ chức thứ hai mang TRAVEL_AGENCY
const KXH = "dda00000-0000-4000-8000-000000000002"; // tổ chức KHÔNG mang vai được hưởng (chỉ SUPPLIER)
const KHACH = "dda00000-0000-4000-8000-000000000004"; // cá nhân khách lẻ (CUSTOMER)
const HDV = "dda00000-0000-4000-8000-000000000005"; // cá nhân mang GUIDE_FREELANCE (vai được hưởng cấp cá nhân)
const AT = "2026-10-01T00:00:00.000Z";
const CAU_KHONG_HUONG = "Hồ sơ tổ chức này không phải đối tác được hưởng hoa hồng.";
const CAU_DOI_TAC_CAM = "Đơn qua đại lý hoặc cộng tác viên do văn phòng lập hộ — tài khoản đối tác không chọn được bên đặt này.";
const CAU_STALE = "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.";

type W = ReturnType<typeof world>;
function toChuc(w: W, id: string, ten: string, vai: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`r-${id}`, id, vai, AT, AT);
}
function caNhan(w: W, id: string, ten: string, vai: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`r-${id}`, id, vai, AT, AT);
}
function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000008", name: "Đối Tác Một", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT2, phone: "0900000009", name: "Đối Tác Hai", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT3, phone: "0900000010", name: "Đối Tác Ba", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Lai Bán Đối Tác", perms: ["SALES", "PARTNER"] });
  // Đối tác phải dùng đúng giá danh mục (R2): hai mã danh mục giả.
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA2', 'Tour lặn', 'perPax', 300000, 1, '2026-01-01', '2026-01-01')");
  toChuc(w, DLA, "Đại lý A", "TRAVEL_AGENCY");
  toChuc(w, DLB, "Đại lý B", "TRAVEL_AGENCY");
  toChuc(w, KXH, "Công ty Không Hưởng", "SUPPLIER");
  caNhan(w, KHACH, "Khách Lẻ", "CUSTOMER");
  caNhan(w, HDV, "Hướng Dẫn Tự Do", "GUIDE_FREELANCE");
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT}`, `pty-${DT}`, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'CUSTOMER', '2026-01-01', ?, ?)").run(`r-${DT2}`, `pty-${DT2}`, AT, AT);
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(DT3);
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const thanDon = (extra: Record<string, unknown> = {}, nhieuDv = false) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [
    { kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) },
    ...(nhieuDv ? [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA2", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, departDate: inDays(3) }] : []),
  ],
  ...extra,
});
const lap = (w: W, as: string, extra: Record<string, unknown> = {}, nhieuDv = false) => w.call("POST", "/api/orders", { as, body: thanDon(extra, nhieuDv) });
const bookerCua = (w: W, id: string): string | null => w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b as string | null;
const mocCua = (w: W, id: string): string => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u as string;
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const nhatKy = (w: W, id: string, action: string): number => dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = ?", id, action);
/** Dấu vết ghi vào CSDL của cả thế giới thử — một ca 403 / 409 không được làm nó đổi. Nhật ký đếm TRỪ `client_outdated_body` (dòng đếm máy gửi thân kiểu cũ — thân bài
 * không mang mã lần gửi — ghi NGOÀI lô, trước mọi kiểm bên đặt; không phải việc của luật đang thử). */
const dauVet = (w: W) => ({
  don: dem(w, "SELECT count(*) AS n FROM orders"), hoSo: dem(w, "SELECT count(*) AS n FROM pty_party"),
  chup: dem(w, "SELECT count(*) AS n FROM ord_service_terms"), nhatKy: dem(w, "SELECT count(*) AS n FROM audit_log WHERE action <> 'client_outdated_body'"),
});
const laCam = (r: { status: number; json: any; text: string }): void => {
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "partner_booker_forbidden");
  assert.equal(r.json.error.message, CAU_DOI_TAC_CAM);
};
/** Văn phòng "lập hộ": gắn thẳng bên đặt lên một đơn của tài khoản Đối tác bằng SQL (đơn nháp hoặc trước khi xác nhận). */
const vanPhongGan = (w: W, id: string, ben: string): void => { w.sqlite.prepare("UPDATE orders SET booker_party_id = ? WHERE id = ?").run(ben, id); };
const chup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY created_at, order_service_id", id);
/** Bản chụp HIỆN HÀNH (chưa bị bản nào thay) của đơn, theo dòng dịch vụ. */
const hienHanh = (w: W, id: string) =>
  w.q("SELECT t.* FROM ord_service_terms t WHERE t.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id) ORDER BY t.order_service_id", id);
const xacNhan = (w: W, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const doiBen = (w: W, id: string, bookerPartyId: string | null, as = SALES, extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${id}/booker`, { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId, expectedUpdatedAt: mocCua(w, id), ...extra } });
const muc = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", ...body } });
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác ghi giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}
/** Như `chenTruocLo`, nhưng CHỜ `truoc()` (không đồng bộ) xong rồi mới chạy lô — để một lệnh THẬT chen vào giữa. */
function chenTruocLoCho(w: W, re: RegExp, truoc: () => Promise<void>): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; await truoc(); }
    return goc(stmts);
  };
}
const LO_DOI_BEN = /UPDATE orders SET customer_name = \?, customer_phone = \?, booker_party_id/;
/** Đơn khách lẻ hai dịch vụ ĐÃ xác nhận qua route (có hai bản chụp NONE) + một mức 10% cho đại lý. */
async function donDaXacNhan(w: W): Promise<string> {
  assert.equal((await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).status, 201);
  const r = await lap(w, SALES, {}, true);
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.equal(chup(w, id).length, 2);
  return id;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca 1 — văn phòng gắn tổ chức được hưởng
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("ca 1: Bán hàng lập đơn với tổ chức mang vai được hưởng ⇒ 201 và bên đặt đúng là tổ chức; tổ chức không mang vai được hưởng ⇒ 400 đúng câu", async () => {
  const w = setup();
  const r = await lap(w, SALES, { bookerPartyId: DLA });
  assert.equal(r.status, 201, r.text);
  assert.equal(bookerCua(w, r.json.order.id), DLA, "bên đặt phải là tổ chức, không phải NULL lặng lẽ");
  assert.equal(r.json.order.bookerPartyId, DLA);
  const loi = await lap(w, SALES, { bookerPartyId: KXH });
  assert.equal(loi.status, 400, loi.text);
  assert.equal(loi.json.error.message, CAU_KHONG_HUONG);
  assert.equal(dem(w, "SELECT count(*) AS n FROM orders"), 1, "đơn bị từ chối không được tạo");
});

test("ca 1b: vai được hưởng đã đóng ngày / loại vai bị tắt ⇒ tổ chức không còn gắn được (400 cùng câu)", async () => {
  const w = setup();
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-02-01' WHERE party_id = ?").run(DLB);
  const dongVai = await lap(w, SALES, { bookerPartyId: DLB });
  assert.equal(dongVai.status, 400, dongVai.text);
  assert.equal(dongVai.json.error.message, CAU_KHONG_HUONG);
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TRAVEL_AGENCY'").run();
  const tatLoai = await lap(w, SALES, { bookerPartyId: DLA });
  assert.equal(tatLoai.status, 400, tatLoai.text);
  assert.equal(tatLoai.json.error.message, CAU_KHONG_HUONG);
});

test("ca 1c: cá nhân vẫn gắn được như cũ (cả cá nhân mang vai được hưởng lẫn khách lẻ); tổ chức ngưng hoạt động ⇒ 400 'không còn dùng được'", async () => {
  const w = setup();
  for (const ben of [KHACH, HDV]) {
    const r = await lap(w, SALES, { bookerPartyId: ben });
    assert.equal(r.status, 201, r.text);
    assert.equal(bookerCua(w, r.json.order.id), ben);
  }
  w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(DLB);
  const r = await lap(w, SALES, { bookerPartyId: DLB });
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /không còn dùng được/);
});

test("ca 1d: lưu nháp đổi sang tổ chức được hưởng ⇒ 200 và bên đặt là tổ chức; sang tổ chức không được hưởng ⇒ 400, bên đặt cũ giữ nguyên", async () => {
  const w = setup();
  const tao = await lap(w, SALES, { bookerPartyId: KHACH });
  const id = tao.json.order.id as string;
  const sua = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: thanDon({ expectedUpdatedAt: tao.json.order.updatedAt, bookerPartyId: DLA }) });
  assert.equal(sua.status, 200, sua.text);
  assert.equal(bookerCua(w, id), DLA);
  const hong = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: thanDon({ expectedUpdatedAt: sua.json.order.updatedAt, bookerPartyId: KXH }) });
  assert.equal(hong.status, 400, hong.text);
  assert.equal(hong.json.error.message, CAU_KHONG_HUONG);
  assert.equal(bookerCua(w, id), DLA);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca 2 — Review Focus 2: tài khoản Đối tác có hồ sơ được hưởng luôn là bên đặt
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("ca 2 (Review Focus 2): Đối tác lập đơn mà thân gửi bên đặt khác ⇒ 201, bên đặt là chính hồ sơ của tài khoản (không NULL, không tổ chức gửi lên); tên khách giữ nguyên", async () => {
  const w = setup();
  const r = await lap(w, DT, { bookerPartyId: DLA, customerName: "Khách Của Đại Lý" });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal(bookerCua(w, id), `pty-${DT}`);
  assert.equal(w.q("SELECT customer_name AS n FROM orders WHERE id = ?", id)[0].n, "Khách Của Đại Lý");
});

test("ca 2b: Đối tác gửi bên đặt rỗng, không gửi gì, hoặc tạo hồ sơ mới ⇒ vẫn là hồ sơ của tài khoản; không sinh hồ sơ thừa", async () => {
  const w = setup();
  const soHoSo = dem(w, "SELECT count(*) AS n FROM pty_party");
  for (const extra of [{ bookerPartyId: null }, {}, { newBooker: { fullName: "Người Lạ", phone: "0933333333" } }, { bookerPartyId: KHACH }]) {
    const r = await lap(w, DT, extra);
    assert.equal(r.status, 201, r.text);
    assert.equal(bookerCua(w, r.json.order.id), `pty-${DT}`, JSON.stringify(extra));
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM pty_party"), soHoSo, "newBooker bị bỏ qua nên không tạo hồ sơ cá nhân mới");
});

test("ca 2c: Đối tác lưu nháp gửi bên đặt khác, hoặc thân cũ không có khoá bên đặt, hoặc bên đặt cũ trống ⇒ vẫn là hồ sơ của tài khoản", async () => {
  const w = setup();
  const tao = await lap(w, DT, {});
  const id = tao.json.order.id as string;
  const khac = await w.call("PUT", `/api/orders/${id}`, { as: DT, body: thanDon({ expectedUpdatedAt: tao.json.order.updatedAt, bookerPartyId: DLA }) });
  assert.equal(khac.status, 200, khac.text);
  assert.equal(bookerCua(w, id), `pty-${DT}`);
  // Đơn nháp cũ có bên đặt trống (lập trước bản này): thân cũ KHÔNG có khoá bên đặt cũng được ghi lại thành hồ sơ của tài khoản.
  w.sqlite.prepare("UPDATE orders SET booker_party_id = NULL WHERE id = ?").run(id);
  const cu = await w.call("PUT", `/api/orders/${id}`, { as: DT, body: thanDon({ expectedUpdatedAt: mocCua(w, id) }) });
  assert.equal(cu.status, 200, cu.text);
  assert.equal(bookerCua(w, id), `pty-${DT}`);
  const xoa = await w.call("PUT", `/api/orders/${id}`, { as: DT, body: thanDon({ expectedUpdatedAt: mocCua(w, id), bookerPartyId: null }) });
  assert.equal(xoa.status, 200, xoa.text);
  assert.equal(bookerCua(w, id), `pty-${DT}`, "gửi null tường minh cũng không bỏ gắn được");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca 3 — Đối tác không đủ điều kiện giữ hành vi cũ; chưa gắn hồ sơ thì báo văn phòng
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("ca 3: Đối tác có hồ sơ KHÔNG mang vai được hưởng ⇒ bên đặt theo thân gửi lên (hành vi hôm nay); không gửi ⇒ trống", async () => {
  const w = setup();
  const co = await lap(w, DT2, { bookerPartyId: KHACH });
  assert.equal(co.status, 201, co.text);
  assert.equal(bookerCua(w, co.json.order.id), KHACH);
  const khong = await lap(w, DT2, {});
  assert.equal(khong.status, 201, khong.text);
  assert.equal(bookerCua(w, khong.json.order.id), null);
});

test("ca 3b: Đối tác CHƯA gắn hồ sơ gửi bên đặt được hưởng ⇒ 409 'nhờ văn phòng', không tạo đơn; không gửi bên đặt, hoặc gửi bên đặt không được hưởng ⇒ hành vi hôm nay", async () => {
  const w = setup();
  const chan = await lap(w, DT3, { bookerPartyId: DLA });
  assert.equal(chan.status, 409, chan.text);
  assert.equal(chan.json.error.code, "partner_no_party");
  assert.equal(chan.json.error.message, "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng");
  assert.equal(dem(w, "SELECT count(*) AS n FROM orders"), 0);
  const khong = await lap(w, DT3, {});
  assert.equal(khong.status, 201, khong.text);
  assert.equal(bookerCua(w, khong.json.order.id), null);
  const khach = await lap(w, DT3, { bookerPartyId: KHACH });
  assert.equal(khach.status, 201, khach.text);
  assert.equal(bookerCua(w, khach.json.order.id), KHACH);
  // Lưu nháp: cùng câu chặn.
  const sua = await w.call("PUT", `/api/orders/${khong.json.order.id}`, { as: DT3, body: thanDon({ expectedUpdatedAt: khong.json.order.updatedAt, bookerPartyId: DLA }) });
  assert.equal(sua.status, 409, sua.text);
  assert.equal(sua.json.error.code, "partner_no_party");
});

test("ca 3c (K1): tài khoản lai (Bán hàng + Đối tác) có hồ sơ không mang vai được hưởng — chọn đại lý làm bên đặt ⇒ 403 đúng câu, không để lại đơn / hồ sơ / nhật ký; khách lẻ hoặc không gửi vẫn 201", async () => {
  const w = setup();
  const truoc = dauVet(w);
  laCam(await lap(w, LAI, { bookerPartyId: DLA }));
  assert.deepEqual(dauVet(w), truoc, "ca 403 không được để lại gì (đơn, hồ sơ, bản chụp, nhật ký)");
  const khach = await lap(w, LAI, { bookerPartyId: KHACH });
  assert.equal(khach.status, 201, khach.text);
  assert.equal(bookerCua(w, khach.json.order.id), KHACH);
  const khong = await lap(w, LAI, {});
  assert.equal(khong.status, 201, khong.text);
  assert.equal(bookerCua(w, khong.json.order.id), null);
});

test("ca 3d (K1): Đối tác có hồ sơ KHÔNG mang vai được hưởng (DT2) — chọn tổ chức được hưởng, hoặc cá nhân mang vai được hưởng ⇒ 403; tổ chức không được hưởng ⇒ 400 như cũ; lưu nháp cùng luật", async () => {
  const w = setup();
  const truoc = dauVet(w);
  laCam(await lap(w, DT2, { bookerPartyId: DLA }));
  laCam(await lap(w, DT2, { bookerPartyId: HDV }));
  assert.deepEqual(dauVet(w), truoc);
  const khongHuong = await lap(w, DT2, { bookerPartyId: KXH });
  assert.equal(khongHuong.status, 400, khongHuong.text);
  assert.equal(khongHuong.json.error.message, CAU_KHONG_HUONG);
  const tao = await lap(w, DT2, { bookerPartyId: KHACH });
  assert.equal(tao.status, 201, tao.text);
  const id = tao.json.order.id as string;
  const sau = dauVet(w);
  const moc = mocCua(w, id);
  for (const ben of [DLA, HDV]) laCam(await w.call("PUT", `/api/orders/${id}`, { as: DT2, body: thanDon({ expectedUpdatedAt: tao.json.order.updatedAt, bookerPartyId: ben }) }));
  assert.deepEqual(dauVet(w), sau);
  assert.equal(bookerCua(w, id), KHACH, "lưu nháp bị từ chối thì bên đặt cũ giữ nguyên");
  assert.equal(mocCua(w, id), moc);
});

test("ca 3e (K1): tài khoản lai gửi đại lý ở CẢ BA đường — lập đơn, lưu nháp, đổi khách (nháp và đã xác nhận) ⇒ 403, không đổi gì; Bán hàng thuần vẫn qua cả ba", async () => {
  const w = setup();
  assert.equal((await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).status, 201);
  // (1) lập đơn
  laCam(await lap(w, LAI, { bookerPartyId: DLA }));
  // (2) lưu nháp
  const nhap = await lap(w, LAI, {});
  const idNhap = nhap.json.order.id as string;
  laCam(await w.call("PUT", `/api/orders/${idNhap}`, { as: LAI, body: thanDon({ expectedUpdatedAt: nhap.json.order.updatedAt, bookerPartyId: DLA }) }));
  // (3) đổi khách: đơn nháp rồi đơn đã xác nhận (có bản chụp)
  const truocNhap = dauVet(w);
  laCam(await doiBen(w, idNhap, DLA, LAI));
  assert.deepEqual(dauVet(w), truocNhap);
  const xn = await lap(w, LAI, {});
  const idXn = xn.json.order.id as string;
  assert.equal((await xacNhan(w, idXn, LAI)).status, 200);
  const truocXn = dauVet(w);
  laCam(await doiBen(w, idXn, DLA, LAI));
  assert.deepEqual(dauVet(w), truocXn, "không bản chụp mới, không nhật ký đổi khách / chụp lại");
  for (const id of [idNhap, idXn]) assert.equal(bookerCua(w, id), null);
  // Bán hàng thuần (không giữ quyền Đối tác): lập đơn, lưu nháp, đổi khách đều qua.
  const ban = await lap(w, SALES, { bookerPartyId: DLA });
  assert.equal(ban.status, 201, ban.text);
  const suaBan = await w.call("PUT", `/api/orders/${ban.json.order.id}`, { as: SALES, body: thanDon({ expectedUpdatedAt: ban.json.order.updatedAt, bookerPartyId: DLB }) });
  assert.equal(suaBan.status, 200, suaBan.text);
  assert.equal(bookerCua(w, ban.json.order.id), DLB);
  const banXn = await lap(w, SALES, {});
  assert.equal((await xacNhan(w, banXn.json.order.id)).status, 200);
  assert.equal((await doiBen(w, banXn.json.order.id, DLA)).status, 200);
  assert.equal(bookerCua(w, banXn.json.order.id), DLA);
});

test("ca 3f (K1): bên đặt ĐANG LƯU trên đơn do văn phòng gắn thì Đối tác / tài khoản lai lưu lại nháp và sửa tên khách không bị chặn; đổi sang đại lý KHÁC thì 403", async () => {
  const w = setup();
  for (const as of [LAI, DT2]) {
    const tao = await lap(w, as, {});
    const id = tao.json.order.id as string;
    vanPhongGan(w, id, DLA);
    const luu = await w.call("PUT", `/api/orders/${id}`, { as, body: thanDon({ expectedUpdatedAt: mocCua(w, id), bookerPartyId: DLA, customerName: "Khách Sửa Tên" }) });
    assert.equal(luu.status, 200, `${as}: ${luu.text}`);
    assert.equal(bookerCua(w, id), DLA);
    const truoc = dauVet(w);
    laCam(await w.call("PUT", `/api/orders/${id}`, { as, body: thanDon({ expectedUpdatedAt: mocCua(w, id), bookerPartyId: DLB }) }));
    assert.deepEqual(dauVet(w), truoc);
    assert.equal(bookerCua(w, id), DLA, "đổi sang đại lý khác bị từ chối ⇒ bên đặt do văn phòng gắn giữ nguyên");
  }
});

test("ca 3g (K1): thứ tự nhánh — ép bên đặt thắng 403; Đối tác chưa gắn hồ sơ gửi đại lý vẫn 409 'nhờ văn phòng' (không phải 403)", async () => {
  const w = setup();
  const ep = await lap(w, DT, { bookerPartyId: DLB });
  assert.equal(ep.status, 201, ep.text);
  assert.equal(bookerCua(w, ep.json.order.id), `pty-${DT}`, "hồ sơ được hưởng: bên đặt bị ép, không phải 403");
  const chuaGan = await lap(w, DT3, { bookerPartyId: DLB });
  assert.equal(chuaGan.status, 409, chuaGan.text);
  assert.equal(chuaGan.json.error.code, "partner_no_party");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca 4 — đổi bên đặt trên đơn đã xác nhận ⇒ chụp lại cùng lô
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("ca 4: đơn khách lẻ đã xác nhận, đổi sang đại lý ⇒ 200; mỗi dòng có bản chụp MỚI trỏ bản cũ (bản cũ còn); nhật ký order_terms_recaptured đúng một dòng, chỉ đếm dòng", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  const truoc = chup(w, id);
  assert.deepEqual(truoc.map((c) => c.commission_status), ["NONE", "NONE"]);
  const r = await doiBen(w, id, DLA);
  assert.equal(r.status, 200, r.text);
  assert.equal(bookerCua(w, id), DLA);
  const sau = chup(w, id);
  assert.equal(sau.length, 4, "hai bản cũ còn nguyên + hai bản mới");
  const moi = hienHanh(w, id);
  assert.equal(moi.length, 2);
  for (const c of moi) {
    assert.equal(c.beneficiary_party_id, DLA);
    assert.equal(c.commission_status, "SET");
    assert.equal(c.commission_rate_bp, 1000);
    assert.equal(c.source, "AUTO");
    const cu = truoc.find((t) => t.order_service_id === c.order_service_id)!;
    assert.equal(c.supersedes_id, cu.id, "bản mới trỏ đúng bản cũ của CÙNG dòng dịch vụ");
  }
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 1);
  assert.equal(nhatKy(w, id, "booker_changed"), 1);
  const chiTiet = String(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_terms_recaptured'", id)[0].detail);
  assert.equal(chiTiet, "2 dòng: 2 có mức, 0 thiếu mức", "nhật ký chỉ đếm dòng — không tỷ lệ, không tiền, không tên đối tác");
});

test("ca 4b: đổi tiếp sang đại lý khác rồi về khách lẻ ⇒ mỗi lần một thế hệ bản chụp mới; về khách lẻ ⇒ NONE không người hưởng", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  assert.equal((await doiBen(w, id, DLA)).status, 200);
  assert.equal((await doiBen(w, id, DLB)).status, 200);
  assert.deepEqual(hienHanh(w, id).map((c) => c.beneficiary_party_id), [DLB, DLB]);
  assert.equal((await doiBen(w, id, null)).status, 200);
  assert.equal(bookerCua(w, id), null);
  assert.deepEqual(hienHanh(w, id).map((c) => [c.commission_status, c.beneficiary_party_id]), [["NONE", null], ["NONE", null]]);
  assert.equal(chup(w, id).length, 8, "bốn thế hệ × hai dòng, không bản nào bị sửa hay xoá");
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 3);
});

test("ca 4c: chỉ sửa tên/SĐT khách trên đơn (bên đặt giữ nguyên) ⇒ KHÔNG chụp lại, không nhật ký order_terms_recaptured", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  assert.equal((await doiBen(w, id, DLA)).status, 200);
  const soBan = chup(w, id).length;
  const r = await doiBen(w, id, DLA, SALES, { customerName: "Khách Đổi Tên" });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT customer_name AS n FROM orders WHERE id = ?", id)[0].n, "Khách Đổi Tên");
  assert.equal(chup(w, id).length, soBan);
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 1, "chỉ lần đổi bên đặt trước đó");
});

test("ca 4d (N15): đơn đã xác nhận KHÔNG có bản chụp (xác nhận trước đợt 1) đổi bên đặt ⇒ 200, ord_service_terms của đơn vẫn 0 dòng, không nhật ký chụp lại", async () => {
  const w = setup();
  const id = "99999999-9999-4999-8999-000000000001";
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, 'TD-N15', ?, 'draft', 'Khách Cũ', '0900000099', 100000, 100000, 100000, ?, ?)`).run(id, SALES, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', 'sv-n15', ?, 'Vé', 'perPax', 1, ?)").run(id, inDays(3));
  gieoDongTienKhop(w.sqlite, id);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
  assert.equal(chup(w, id).length, 0);
  const r = await doiBen(w, id, DLA);
  assert.equal(r.status, 200, r.text);
  assert.equal(bookerCua(w, id), DLA);
  assert.equal(chup(w, id).length, 0, "đợt 1 không chụp bù — để đợt 2");
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 0);
  assert.equal(nhatKy(w, id, "booker_changed"), 1);
});

test("ca 4e: đơn NHÁP đổi bên đặt ⇒ không có bản chụp nào (chụp ở lúc xác nhận); xác nhận sau đó chụp theo bên đặt mới", async () => {
  const w = setup();
  assert.equal((await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).status, 201);
  const tao = await lap(w, SALES, {});
  const id = tao.json.order.id as string;
  assert.equal((await doiBen(w, id, DLA)).status, 200);
  assert.equal(chup(w, id).length, 0);
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 0);
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.deepEqual(chup(w, id).map((c) => [c.commission_status, c.beneficiary_party_id]), [["SET", DLA]]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca tranh chấp của lô đổi bên đặt (ghi chú điều phối 1, 4): lô phải tự kín bằng chuỗi `changes() > 0`
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("tranh chấp (i): đơn bị người khác sửa giữa lúc đọc và lúc ghi ⇒ 409 vừa được sửa; không bản chụp mới, không nhật ký đổi/chụp lại, bên đặt giữ nguyên", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  const soBan = chup(w, id).length;
  chenTruocLo(w, LO_DOI_BEN, () => w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run("2099-01-01T00:00:00.000Z", id));
  const r = await doiBen(w, id, DLA);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /vừa được người khác sửa/);
  assert.equal(chup(w, id).length, soBan);
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 0);
  assert.equal(nhatKy(w, id, "booker_changed"), 0);
  assert.equal(bookerCua(w, id), null);
});

test("tranh chấp (ii): dòng mức bị đóng giữa lúc đọc và lúc ghi ⇒ 409 'Bảng mức vừa đổi — thử lại'; CẢ lô rơi (bên đặt, nhật ký, bản chụp); bấm lại thì chụp theo bảng mới", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  const soBan = chup(w, id).length;
  const ruleId = w.q("SELECT id FROM prc_commission_rule")[0].id as string;
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE prc_commission_rule SET valid_to_date = '2026-01-02' WHERE id = ?").run(ruleId));
  const r = await doiBen(w, id, DLA);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /Bảng mức vừa đổi — thử lại/);
  assert.equal(bookerCua(w, id), null, "lô rơi cả: bên đặt chưa đổi");
  assert.equal(chup(w, id).length, soBan);
  assert.equal(nhatKy(w, id, "booker_changed"), 0);
  const lai = await doiBen(w, id, DLA);
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual(hienHanh(w, id).map((c) => [c.commission_status, c.missing_reason]), [["MISSING", "NO_RULE"], ["MISSING", "NO_RULE"]], "mức đã đóng ⇒ thiếu mức, không ghi số cũ");
});

test("tranh chấp (iii): một lệnh đổi bên đặt khác chạy trọn VẸN trước lô của lệnh thứ nhất ⇒ lệnh thứ nhất 409, đúng một thế hệ bản chụp mới, một nhật ký chụp lại", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  let thuHai: { status: number } | null = null;
  chenTruocLoCho(w, LO_DOI_BEN, async () => { thuHai = await doiBen(w, id, DLB); });
  const dau = await doiBen(w, id, DLA);
  assert.equal(thuHai!.status, 200, "lệnh chen vào thắng");
  assert.equal(dau.status, 409, dau.text);
  assert.equal(bookerCua(w, id), DLB);
  assert.equal(chup(w, id).length, 4);
  assert.deepEqual(hienHanh(w, id).map((c) => c.beneficiary_party_id), [DLB, DLB]);
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 1);
  assert.equal(nhatKy(w, id, "booker_changed"), 1);
});

test("tranh chấp (iv): bản chụp hiện hành bị thay (ghi mức tay chen vào) giữa lúc đọc và lúc ghi ⇒ 409, không 500, cả lô rơi", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  const soBan = chup(w, id).length;
  const [dong1] = chup(w, id);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => {
    // Một bản chụp khác đã thay đúng bản hiện hành của dòng dịch vụ thứ nhất (không đổi `orders.updated_at`).
    w.sqlite.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, supply_status, seller_party_id, supply_term_id, source,
      supersedes_id, captured_date, created_at, updated_at) SELECT 'chen-1', order_id, order_service_id, NULL, 'NONE', supply_status, seller_party_id, supply_term_id, 'AUTO', id,
      captured_date, created_at, updated_at FROM ord_service_terms WHERE id = ?`).run(dong1.id);
  });
  const r = await doiBen(w, id, DLA);
  assert.equal(r.status, 409, r.text);
  assert.equal(bookerCua(w, id), null);
  assert.equal(chup(w, id).length, soBan + 1, "chỉ còn bản do bên chen vào ghi");
  assert.equal(nhatKy(w, id, "booker_changed"), 0);
  assert.equal(nhatKy(w, id, "order_terms_recaptured"), 0);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ca 5 — cờ DTO và biên nhận
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("ca 5: GET chi tiết đơn — bên đặt tổ chức được hưởng ⇒ bookerLaDoiTac true; khách lẻ / cá nhân khách ⇒ false; cá nhân mang vai được hưởng ⇒ true; tắt loại vai ⇒ false", async () => {
  const w = setup();
  const dla = (await lap(w, SALES, { bookerPartyId: DLA })).json.order.id as string;
  const le = (await lap(w, SALES, {})).json.order.id as string;
  const khach = (await lap(w, SALES, { bookerPartyId: KHACH })).json.order.id as string;
  const hdv = (await lap(w, SALES, { bookerPartyId: HDV })).json.order.id as string;
  const co = async (id: string) => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order.bookerLaDoiTac;
  assert.equal(await co(dla), true);
  assert.equal(await co(le), false);
  assert.equal(await co(khach), false);
  assert.equal(await co(hdv), true);
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-02-01' WHERE party_id = ?").run(DLA);
  assert.equal(await co(dla), false, "vai đã kết thúc ⇒ không còn 'đang mở'");
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'GUIDE_FREELANCE'").run();
  assert.equal(await co(hdv), false, "loại vai bị tắt khỏi danh sách được hưởng");
  // Phản hồi lập đơn và lưu nháp cũng mang cờ (cùng một DTO chi tiết).
  const moi = await lap(w, SALES, { bookerPartyId: DLB });
  assert.equal(moi.json.order.bookerLaDoiTac, true);
});

test("ca 5b: biên nhận của đơn bên đặt là đại lý in tên KHÁCH (customer_name), không in tên đại lý", async () => {
  const w = setup();
  const r = await lap(w, SALES, { bookerPartyId: DLA, customerName: "Trần Văn Khách" });
  const id = r.json.order.id as string;
  assert.equal((await xacNhan(w, id)).status, 200);
  const bn = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(bn.status, 200, bn.text);
  assert.equal(bn.json.receipt.customerName, "Trần Văn Khách");
  assert.doesNotMatch(bn.text, /Đại lý A/);
  assert.equal("bookerLaDoiTac" in bn.json.receipt, false, "biên nhận theo danh sách trắng, không mang cờ");
});

test("ca 5c: Đối tác và tài khoản lai gọi chi tiết đơn ⇒ thêm đúng MỘT khoá boolean bookerLaDoiTac; không khoá nào tên tỷ lệ / giá vốn / nhà cung cấp", async () => {
  const w = setup();
  const cam = /rate|perPax|cost|ruleId|termId|source|supplier/i;
  const khoa = (v: unknown, ra: string[] = []): string[] => {
    if (Array.isArray(v)) v.forEach((x) => khoa(x, ra));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { ra.push(k); khoa(x, ra); }
    return ra;
  };
  const dt = await lap(w, DT, {});
  const idDt = dt.json.order.id as string;
  const chiTietDt = await w.call("GET", `/api/orders/${idDt}`, { as: DT });
  assert.equal(chiTietDt.status, 200, chiTietDt.text);
  assert.equal(chiTietDt.json.order.bookerLaDoiTac, true, "bên đặt là hồ sơ của chính tài khoản, đang mang vai được hưởng");
  assert.deepEqual(khoa(chiTietDt.json).filter((k) => cam.test(k)), []);
  // K1 (vòng sửa 1): tài khoản lai không tự chọn được đại lý; đơn do văn phòng lập hộ (gắn đại lý bằng SQL) thì lai vẫn xác nhận / sửa tên khách / đọc chi tiết được.
  const lai = await lap(w, LAI, {});
  const idLai = lai.json.order.id as string;
  vanPhongGan(w, idLai, DLA);
  assert.equal((await xacNhan(w, idLai, LAI)).status, 200);
  const chiTietLai = await w.call("GET", `/api/orders/${idLai}`, { as: LAI });
  assert.equal(chiTietLai.status, 200, chiTietLai.text);
  assert.equal(chiTietLai.json.order.bookerLaDoiTac, true);
  assert.deepEqual(khoa(chiTietLai.json).filter((k) => cam.test(k)), []);
  laCam(await doiBen(w, idLai, DLB, LAI));
  const doi = await doiBen(w, idLai, DLA, LAI, { customerName: "Khách Đổi Tên" });
  assert.equal(doi.status, 200, doi.text);
  assert.equal(bookerCua(w, idLai), DLA);
  assert.deepEqual(khoa(doi.json).filter((k) => cam.test(k)), [], "phản hồi đổi khách của tài khoản lai cũng không mang khoá thương mại");
  // Đổi sang khách lẻ (được phép) chụp lại mức: phản hồi vẫn sạch khoá thương mại.
  const veKhach = await doiBen(w, idLai, KHACH, LAI);
  assert.equal(veKhach.status, 200, veKhach.text);
  assert.deepEqual(khoa(veKhach.json).filter((k) => cam.test(k)), []);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// I1 (người kiểm vòng 1) — bên đặt hợp lệ lúc route kiểm nhưng mất điều kiện NGAY TRƯỚC lô đổi khách: `BOOKER_VALUE` ra NULL
// ---------------------------------------------------------------------------------------------------------------------------------------------
const MAT_DIEU_KIEN: ReadonlyArray<readonly [string, (w: W) => void]> = [
  ["hồ sơ bị ngưng", (w) => { w.sqlite.prepare("UPDATE pty_party SET active = 0 WHERE id = ?").run(DLA); }],
  ["vai được hưởng bị đóng ngày", (w) => { w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-02-01' WHERE party_id = ?").run(DLA); }],
  ["loại vai bị tắt khỏi danh sách được hưởng", (w) => { w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TRAVEL_AGENCY'").run(); }],
];

for (const [ten, phaMat] of MAT_DIEU_KIEN) {
  test(`I1 (${ten}): đơn ĐÃ XÁC NHẬN, bên đặt mới mất điều kiện ngay trước lô đổi khách ⇒ 409 'vừa được sửa'; bên đặt cũ giữ, không bản chụp mới (nhất là không bản chụp có người hưởng), không nhật ký đổi / chụp lại`, async () => {
    const w = setup();
    const id = await donDaXacNhan(w);
    const truoc = dauVet(w);
    chenTruocLo(w, LO_DOI_BEN, () => phaMat(w));
    const r = await doiBen(w, id, DLA);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "stale");
    assert.equal(r.json.error.message, CAU_STALE);
    assert.equal(bookerCua(w, id), null, "bên đặt cũ (khách lẻ) giữ nguyên");
    assert.deepEqual(dauVet(w), truoc, "cả lô không ghi gì");
    assert.equal(nhatKy(w, id, "booker_changed"), 0);
    assert.equal(nhatKy(w, id, "order_terms_recaptured"), 0);
    assert.equal(hienHanh(w, id).filter((c) => c.beneficiary_party_id !== null).length, 0, "không bản chụp hiện hành nào mang người hưởng");
    // Đơn không bị kẹt: đổi sang khách lẻ cá nhân (không cần điều kiện hưởng) vẫn chạy bình thường.
    const lai = await doiBen(w, id, KHACH);
    assert.equal(lai.status, 200, lai.text);
    assert.equal(bookerCua(w, id), KHACH);
  });

  test(`I1b (${ten}): đơn NHÁP — cùng khe ⇒ 409, không ghi NULL lặng lẽ, không nhật ký 'gắn hồ sơ khách' sai`, async () => {
    const w = setup();
    const tao = await lap(w, SALES, { bookerPartyId: KHACH });
    const id = tao.json.order.id as string;
    const truoc = dauVet(w);
    chenTruocLo(w, LO_DOI_BEN, () => phaMat(w));
    const r = await doiBen(w, id, DLA);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.message, CAU_STALE);
    assert.equal(bookerCua(w, id), KHACH, "bên đặt cũ giữ nguyên, không bị ghi NULL");
    assert.deepEqual(dauVet(w), truoc);
    assert.equal(nhatKy(w, id, "booker_changed"), 0);
  });
}

test("I1c: bỏ gắn bên đặt (null) và đổi sang khách lẻ vẫn chạy khi không bên đặt nào mất điều kiện — vế mới của câu UPDATE không chặn nhầm", async () => {
  const w = setup();
  const id = await donDaXacNhan(w);
  assert.equal((await doiBen(w, id, DLA)).status, 200);
  assert.equal((await doiBen(w, id, null)).status, 200);
  assert.equal(bookerCua(w, id), null);
  assert.equal((await doiBen(w, id, KHACH)).status, 200);
  assert.equal(bookerCua(w, id), KHACH);
  const moi = await w.call("PUT", `/api/orders/${id}/booker`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", newBooker: { fullName: "Người Mới Hoàn Toàn", phone: "0977777777" }, expectedUpdatedAt: mocCua(w, id) } });
  assert.equal(moi.status, 200, moi.text);
  assert.ok(bookerCua(w, id), "tạo hồ sơ cá nhân mới cùng lô vẫn gắn được");
});
