// ADR-0154 Đ2, Đ3.1, C2 — kế hoạch lượt 2 Task 2.1: công tắc «Ẩn thông tin khách khi đối tác đặt vé». MÁY CHỦ quyết, không tin trình duyệt:
//   - `POST /api/cai-dat/an-thong-tin-khach` (chỉ ô `settings.ops`, một lô: dòng mới chỉ-thêm + nhật ký; thua mốc ⇒ 409 `stale`, không ghi gì) và `GET` cùng đường (cổng `orders`);
//   - lập đơn lúc BẬT: tên và SĐT lấy từ tài khoản, email và ghi chú khách trống, bỏ `passengers`, `newBooker`, `bookerPartyId` (bên đặt theo luật ép có sẵn), dấu `manifest_exempt = 1`;
//   - lưu nháp lúc BẬT: giữ bốn trường đang lưu, bỏ ba khoá trên; đơn lập lúc TẮT không mang dấu, đổi công tắc sau đó không đổi dấu;
//   - tài khoản lai (có quyền ngoài nhóm bên ngoài) không bị áp (C2). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); tên, SĐT là GIẢ.
// Công tắc đọc theo ĐỒNG HỒ: bài không bật đồng hồ giả, hai lần đổi cách nhau hàng ms của một lời gọi HTTP.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, H, INTERN, LAI, PARTNER, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { thanLapDonKhiAn, thanNhapKhiAn } from "./an-thong-tin-khach.ts";
import { anKhachBat } from "./xac-nhan-repo.ts";

const URL = "/api/cai-dat/an-thong-tin-khach";
const AT = "2026-10-01T00:00:00.000Z";
const DT_HUONG = "88888888-8888-4888-8888-888888888801"; // Đối tác, hồ sơ cá nhân mang TRAVEL_AGENCY (đang được hưởng) ⇒ luật ép bên đặt = chính hồ sơ này
const DT_KHONG_HO_SO = "88888888-8888-4888-8888-888888888802"; // Đối tác chưa gắn hồ sơ (staff.party_id NULL)
const KHACH = "dda00000-0000-4000-8000-000000000004"; // cá nhân khách lẻ (CUSTOMER) — không được hưởng
// Đối tác của khung thử mang vai trò Công ty lữ hành (ADR-0185) ⇒ luật ép có sẵn ghi bên đặt = hồ sơ của chính nó. Ca BẬT bỏ bookerPartyId / newBooker chỉ thấy được ở
// tài khoản Đối tác kiểu cũ (hồ sơ không vai trò đối tác, không bị ép) — chỉ lập, sửa nháp: tài khoản đó không Gửi đơn được nữa.
const DT_CU = "88888888-8888-4888-8888-888888888803";
const PAX = (ten: string, nam = 1990) => ({ fullName: ten, birthYear: nam, paxCode: "adult" });

type W = ReturnType<typeof setup>;
function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT_HUONG, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT_KHONG_HO_SO, phone: "0900000022", name: "Đối Tác Không Hồ Sơ", perms: ["PARTNER"] });
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(DT_KHONG_HO_SO);
  seedStaff(w.sqlite, { id: DT_CU, phone: "0900000023", name: "Đối Tác Kiểu Cũ", perms: ["PARTNER"], kieuCu: true });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Khách Lẻ', 1, ?, ?)").run(KHACH, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Khách Lẻ', ?, ?)").run(KHACH, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'CUSTOMER', '2026-01-01', ?, ?)").run(`r-${KHACH}`, KHACH, AT, AT);
  return w;
}
const dat = (w: W, as: string, bat: unknown) => w.call("POST", URL, { as, body: { bat } });
async function bat(w: W, v: boolean): Promise<void> {
  const r = await dat(w, SUP, v);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.bat, v);
}
/** Thân lập đơn của trình duyệt (kể cả bản cũ trong bộ nhớ đệm PWA): tên giả, SĐT giả, email, ghi chú, dịch vụ không đón. */
const than = (extra: Record<string, unknown> = {}) => ({
  customerName: "Tên Giả Của Trình Duyệt", customerPhone: "0966666666", customerEmail: "gia@example.com", customerNote: "ghi chú giả", services: [svc("ZB1", inDays(3))], ...extra,
});
const lap = (w: W, as: string, extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: than(extra) });
async function lap201(w: W, as: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await lap(w, as, extra);
  assert.equal(r.status, 201, r.text);
  return r.json.order.id as string;
}
const dong = (w: W, id: string) => ({ ...w.q("SELECT customer_name AS ten, customer_phone AS sdt, customer_email AS email, customer_note AS ghiChu, manifest_exempt AS mien, booker_party_id AS ben FROM orders WHERE id = ?", id)[0] });
const hanhKhach = (w: W, id: string) => w.q("SELECT id, full_name AS ten FROM ord_passenger WHERE order_id = ? ORDER BY id", id).map((r: any) => ({ ...r }));
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDon = (w: W) => dem(w, "SELECT count(*) AS n FROM orders");
const soHoSo = (w: W) => dem(w, "SELECT count(*) AS n FROM pty_party");
const TEN = (w: W, id: string): string => w.q("SELECT display_name AS n FROM pty_party WHERE id = ?", `pty-${id}`)[0].n as string;
const SDT = (w: W, id: string): string => w.q("SELECT phone AS p FROM staff WHERE id = ?", id)[0].p as string;
/** Sửa nháp: gửi lại dịch vụ giữ id, kèm các trường người trình duyệt muốn đổi. */
async function sua(w: W, id: string, as: string, extra: Record<string, unknown> = {}) {
  const doc = (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
  return w.call("PUT", `/api/orders/${id}`, {
    as, body: { customerName: "Tên Khác", customerPhone: "0977777777", customerEmail: "khac@example.com", customerNote: "ghi chú khác", expectedUpdatedAt: doc.updatedAt, services: [{ ...svc("ZB1", inDays(3)), id: doc.services[0].id }], ...extra },
  });
}

// ---- luật thuần của hai hàm viết lại thân ------------------------------------------------------------------------------------------------------------------
test("thanLapDonKhiAn: ghi đè tên, SĐT; email, ghi chú trống; xoá passengers, newBooker, bookerPartyId; GIỮ mọi khoá khác; không đổi thân gốc", () => {
  const goc = { customerName: "Giả", customerPhone: "0966666666", customerEmail: "g@e.com", customerNote: "n", passengers: [PAX("A")], newBooker: { fullName: "X", phone: "0911111111" }, bookerPartyId: KHACH,
    services: [{ id: 1 }], handlerStaffId: "h", discount: 5, paymentNote: "p", expectedUpdatedAt: "t" };
  const copy = structuredClone(goc);
  const ra = thanLapDonKhiAn(goc, { fullName: "Tên Tài Khoản", phone: "0900000008" }) as Record<string, unknown>;
  assert.deepEqual(goc, copy, "không sửa thân gốc");
  assert.deepEqual(ra, { customerName: "Tên Tài Khoản", customerPhone: "0900000008", customerEmail: "", customerNote: "", services: [{ id: 1 }], handlerStaffId: "h", discount: 5, paymentNote: "p", expectedUpdatedAt: "t" });
  for (const khong of [null, undefined, "x", 5, [1, 2]]) assert.equal(thanLapDonKhiAn(khong, { fullName: "T", phone: "0900000008" }), khong, "thân không phải đối tượng: trả nguyên để validateOrder báo lỗi");
});

test("thanNhapKhiAn: ghi đè bốn trường từ bản đang lưu (email, ghi chú NULL → rỗng); xoá ba khoá; GIỮ mọi khoá khác", () => {
  const goc = { customerName: "Giả", customerPhone: "0966666666", customerEmail: "g@e.com", customerNote: "n", passengers: [], newBooker: null, bookerPartyId: null, services: [{ id: 1 }], expectedUpdatedAt: "t", discount: 7 };
  const ra = thanNhapKhiAn(goc, { customerName: "Tên Cũ", customerPhone: "0933333333", customerEmail: null, customerNote: null }) as Record<string, unknown>;
  assert.deepEqual(ra, { customerName: "Tên Cũ", customerPhone: "0933333333", customerEmail: "", customerNote: "", services: [{ id: 1 }], expectedUpdatedAt: "t", discount: 7 });
  const day = thanNhapKhiAn({ services: [] }, { customerName: "Tên Cũ", customerPhone: "0933333333", customerEmail: "e@x.vn", customerNote: "ghi" }) as Record<string, unknown>;
  assert.deepEqual([day.customerEmail, day.customerNote], ["e@x.vn", "ghi"]);
  assert.equal(thanNhapKhiAn(null, { customerName: "T", customerPhone: "0900000008", customerEmail: null, customerNote: null }), null);
});

// ---- đường cài đặt ----------------------------------------------------------------------------------------------------------------------------------------------
test("(g2) cổng: Quản trị POST 403 (qua cổng admin, không có settings.ops), Bán hàng 403; Toàn quyền 200 + nhật ký không gắn đơn; đọc lại bat đúng; gửi đúng trạng thái đang có = 200, không ghi gì", async () => {
  const w = dung();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { bat: false, apChoToi: false, doiDuoc: true }, "mặc định TẮT (migration gieo 0)");
  for (const ai of [ADM, A, INTERN, PARTNER, ACC, H]) assert.equal((await dat(w, ai, true)).status, 403, `POST ${ai}`);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_partner_customer_policy"), 1, "từ chối thì không ghi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'partner_customer_policy_changed'"), 0);
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { bat: true, apChoToi: false, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type FROM audit_log WHERE action = 'partner_customer_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id ?? null, null, "không gắn đơn");
  assert.equal(nk[0].target_type, "system");
  assert.doesNotMatch(String(nk[0].detail), /0\d{9}/, "nhật ký không số điện thoại");
  assert.equal((await w.call("GET", URL, { as: SUP })).json.bat, true);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_partner_customer_policy"), 2);
  assert.equal((await dat(w, SUP, true)).status, 200);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_partner_customer_policy"), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'partner_customer_policy_changed'"), 1, "cũng không thêm nhật ký");
  assert.equal((await dat(w, SUP, false)).json.bat, false);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_partner_customer_policy"), 3, "chỉ-thêm: dòng cũ còn nguyên");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
  assert.equal((await w.call("POST", URL, { as: SUP, body: null })).status, 400);
});

test("(g2) hai lần đổi trùng mốc → 409 stale, KHÔNG ghi gì (không dòng chính sách, không nhật ký): thua thì không để lại dấu vết", async () => {
  const w = dung();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_partner_customer_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const cau = stmts.find((s) => /INSERT INTO ord_partner_customer_policy/.test(s.sql))!;
      const at = cau.args[2] as string; // ?3 = valid_from_at của chính lô này
      w.sqlite.prepare("INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 1, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_partner_customer_policy"), 2, "gieo + dòng của người chen; không dòng của lô thua");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'partner_customer_policy_changed'"), 0, "lô thua không để lại nhật ký");
});

test("GET: apChoToi = công tắc BẬT và tài khoản thuộc nhóm bên ngoài thuần; tài khoản lai, Bán hàng, Thực tập luôn false; Kế toán, HDV không lập đơn ⇒ 403", async () => {
  const w = dung();
  const doc = async (as: string) => (await w.call("GET", URL, { as })).json;
  assert.deepEqual(await doc(PARTNER), { bat: false, apChoToi: false, doiDuoc: false }, "TẮT: không áp cho ai");
  await bat(w, true);
  assert.deepEqual(await doc(PARTNER), { bat: true, apChoToi: true, doiDuoc: false });
  assert.deepEqual(await doc(LAI), { bat: true, apChoToi: false, doiDuoc: false }, "(q) tài khoản lai không bị áp");
  assert.deepEqual(await doc(A), { bat: true, apChoToi: false, doiDuoc: false });
  assert.deepEqual(await doc(INTERN), { bat: true, apChoToi: false, doiDuoc: false });
  assert.deepEqual(await doc(ADM), { bat: true, apChoToi: false, doiDuoc: false });
  assert.deepEqual(await doc(SUP), { bat: true, apChoToi: false, doiDuoc: true });
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
});

// ---- lập đơn --------------------------------------------------------------------------------------------------------------------------------------------------
test("(f) TẮT: đối tác gửi tên, SĐT, email, ghi chú, passengers → lưu đúng như gửi, manifest_exempt = 0", async () => {
  const w = dung();
  const id = await lap201(w, PARTNER, { passengers: [PAX("Khách Một"), PAX("Khách Hai", 1991)] });
  assert.deepEqual(dong(w, id), { ten: "Tên Giả Của Trình Duyệt", sdt: "0966666666", email: "gia@example.com", ghiChu: "ghi chú giả", mien: 0, ben: `pty-${PARTNER}` });
  assert.equal(hanhKhach(w, id).length, 2);
});

test("(g) BẬT: đối tác gửi tên giả → tên, SĐT là của tài khoản; email, ghi chú NULL; passengers bị bỏ (ord_passenger rỗng, không 403); manifest_exempt = 1", async () => {
  const w = dung();
  await bat(w, true);
  const r = await lap(w, PARTNER, { passengers: [PAX("Khách Một"), PAX("Khách Hai", 1991)] });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.deepEqual(dong(w, id), { ten: TEN(w, PARTNER), sdt: SDT(w, PARTNER), email: null, ghiChu: null, mien: 1, ben: `pty-${PARTNER}` });
  assert.equal(hanhKhach(w, id).length, 0);
  assert.equal(r.json.order.customerName, TEN(w, PARTNER), "phản hồi cũng là tên tài khoản");
  assert.equal(r.json.order.manifestExempt, true, "DTO lập đơn mang cờ");
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: PARTNER })).json.order.manifestExempt, true, "chi tiết đơn của chính đối tác");
  // nháp là vùng riêng của người lập: văn phòng đọc được cờ sau khi đơn đã được xác nhận
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: SUP })).json.order.manifestExempt, true, "chi tiết đơn cho văn phòng");
  const thuong = await lap201(w, A);
  assert.equal((await w.call("POST", `/api/orders/${thuong}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${thuong}`, { as: SUP })).json.order.manifestExempt, false, "đơn văn phòng: không cờ");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_passenger"), 0);
  assert.doesNotMatch(r.text, /Tên Giả Của Trình Duyệt|0966666666|Khách Một/);
});

test("(n) BẬT: newBooker bị bỏ — không thêm dòng pty_party, đơn không có bên đặt", async () => {
  const w = dung();
  await bat(w, true);
  const truoc = soHoSo(w);
  const id = await lap201(w, DT_CU, { newBooker: { fullName: "Khách Mới Tạo", phone: "0911111111" } });
  assert.equal(soHoSo(w), truoc, "không tạo hồ sơ");
  assert.equal(dong(w, id).ben, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM pty_party WHERE display_name = 'Khách Mới Tạo'"), 0);
  // đối chứng: TẮT thì cùng thân tạo hồ sơ như hôm nay
  await bat(w, false);
  const id2 = await lap201(w, DT_CU, { newBooker: { fullName: "Khách Mới Tạo", phone: "0911111111" } });
  assert.equal(soHoSo(w), truoc + 1, "đối chứng TẮT: hồ sơ được tạo");
  assert.notEqual(dong(w, id2).ben, null);
});

test("(n2) BẬT: tài khoản không hồ sơ → 409 partner_no_party, không đơn; đối chứng TẮT lập được; tài khoản lai không hồ sơ không bị áp luật này", async () => {
  const w = dung();
  await bat(w, true);
  const truoc = soDon(w);
  const r = await lap(w, DT_KHONG_HO_SO);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "partner_no_party");
  assert.equal(soDon(w), truoc, "không đơn");
  // cổng 403 «không có dispatch.assign» (G4) vẫn đứng TRƯỚC mọi đọc CSDL — kể cả đọc công tắc và luật «chưa gắn hồ sơ»
  const chonHdv = await lap(w, DT_KHONG_HO_SO, { handlerStaffId: A });
  assert.equal(chonHdv.status, 403, chonHdv.text);
  await bat(w, false);
  assert.equal((await lap(w, DT_KHONG_HO_SO)).status, 201, "đối chứng TẮT: như hôm nay");
});

test("(n4) bên đặt: đối tác có hồ sơ được hưởng → chính hồ sơ của mình dù gửi gì; đối tác không được hưởng gửi bookerPartyId khách lẻ → TẮT ghi khách lẻ, BẬT bỏ (NULL)", async () => {
  const w = dung();
  await bat(w, true);
  const huong = await lap201(w, DT_HUONG, { bookerPartyId: KHACH });
  assert.equal(dong(w, huong).ben, `pty-${DT_HUONG}`, "luật ép có sẵn: bên đặt = hồ sơ của chính mình");
  const khong = await lap201(w, DT_CU, { bookerPartyId: KHACH });
  assert.equal(dong(w, khong).ben, null, "ngoài luật ép: bỏ");
  await bat(w, false);
  const doiChung = await lap201(w, DT_CU, { bookerPartyId: KHACH });
  assert.equal(dong(w, doiChung).ben, KHACH, "đối chứng TẮT: giữ điều gửi (hôm nay)");
});

test("(q) BẬT, tài khoản lai Bán hàng + Đối tác: không bị áp — tên gửi lên giữ nguyên, hành khách lưu, manifest_exempt = 0", async () => {
  const w = dung();
  await bat(w, true);
  const id = await lap201(w, LAI, { passengers: [PAX("Khách Một")] });
  assert.deepEqual(dong(w, id), { ten: "Tên Giả Của Trình Duyệt", sdt: "0966666666", email: "gia@example.com", ghiChu: "ghi chú giả", mien: 0, ben: null });
  assert.equal(hanhKhach(w, id).length, 1);
});

test("Bán hàng, Thực tập khi BẬT: như hôm nay — tên gửi lên giữ nguyên, hành khách lưu, không dấu", async () => {
  const w = dung();
  await bat(w, true);
  for (const as of [A, INTERN]) {
    const id = await lap201(w, as, { passengers: [PAX("Khách Một")] });
    assert.deepEqual(dong(w, id), { ten: "Tên Giả Của Trình Duyệt", sdt: "0966666666", email: "gia@example.com", ghiChu: "ghi chú giả", mien: 0, ben: null }, as);
    assert.equal(hanhKhach(w, id).length, 1, as);
  }
});

test("Review Focus 5: thân kiểu cũ (PWA trong bộ nhớ đệm) đủ passengers, newBooker, bookerPartyId, tên giả, BẬT → 201, GIỐNG HỆT (g), không 403, không hồ sơ mới", async () => {
  const w = dung();
  await bat(w, true);
  const truoc = soHoSo(w);
  const r = await lap(w, PARTNER, { passengers: [PAX("Khách Một")], newBooker: { fullName: "Khách Mới Tạo", phone: "0911111111" }, bookerPartyId: KHACH });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.deepEqual(dong(w, id), { ten: TEN(w, PARTNER), sdt: SDT(w, PARTNER), email: null, ghiChu: null, mien: 1, ben: `pty-${PARTNER}` });
  assert.equal(hanhKhach(w, id).length, 0);
  assert.equal(soHoSo(w), truoc);
});

// ---- lưu nháp ---------------------------------------------------------------------------------------------------------------------------------------------------
test("(n3) BẬT: PUT nháp (lập lúc TẮT) gửi tên khác, passengers, newBooker → bốn trường GIỮ NGUYÊN, hành khách giữ, không hồ sơ mới, vẫn không dấu; PUT nháp lập lúc BẬT giữ bốn trường của tài khoản", async () => {
  const w = dung();
  const cu = await lap201(w, PARTNER, { customerName: "Tên Cũ", customerPhone: "0933333333", customerEmail: "cu@example.com", customerNote: "ghi chú cũ", passengers: [PAX("Khách Một"), PAX("Khách Hai", 1991)] });
  const hkTruoc = hanhKhach(w, cu);
  assert.equal(hkTruoc.length, 2);
  await bat(w, true);
  const truoc = soHoSo(w);
  const r = await sua(w, cu, PARTNER, { passengers: [PAX("Khách Ba", 1992)], newBooker: { fullName: "Khách Mới Tạo", phone: "0911111111" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(dong(w, cu), { ten: "Tên Cũ", sdt: "0933333333", email: "cu@example.com", ghiChu: "ghi chú cũ", mien: 0, ben: `pty-${PARTNER}` }, "bốn trường giữ nguyên; nháp lập lúc TẮT vẫn không dấu");
  assert.deepEqual(hanhKhach(w, cu), hkTruoc, "hành khách giữ nguyên");
  assert.equal(soHoSo(w), truoc, "không hồ sơ mới");
  // nháp lập lúc BẬT, PUT lúc BẬT: bốn trường vẫn của tài khoản
  const moi = await lap201(w, PARTNER);
  const r2 = await sua(w, moi, PARTNER, { passengers: [PAX("Khách Ba", 1992)] });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(dong(w, moi), { ten: TEN(w, PARTNER), sdt: SDT(w, PARTNER), email: null, ghiChu: null, mien: 1, ben: `pty-${PARTNER}` });
  assert.equal(hanhKhach(w, moi).length, 0);
});

test("(n3) BẬT: PUT nháp của người KHÔNG bị áp (Bán hàng) vẫn đổi được tên, hành khách như hôm nay", async () => {
  const w = dung();
  const id = await lap201(w, A, { passengers: [PAX("Khách Một")] });
  await bat(w, true);
  const r = await sua(w, id, A, { passengers: [PAX("Khách Ba", 1992)] });
  assert.equal(r.status, 200, r.text);
  assert.equal(dong(w, id).ten, "Tên Khác");
  assert.deepEqual(hanhKhach(w, id).map((x: any) => x.ten), ["Khách Ba"]);
});

test("(n7) nháp lập lúc BẬT, PUT lúc TẮT: tên mới và passengers được lưu, manifest_exempt vẫn 1 (đổi công tắc không đổi dấu đơn cũ)", async () => {
  const w = dung();
  await bat(w, true);
  const id = await lap201(w, PARTNER);
  assert.equal(dong(w, id).mien, 1);
  await bat(w, false);
  const r = await sua(w, id, PARTNER, { passengers: [PAX("Khách Ba", 1992)] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(dong(w, id), { ten: "Tên Khác", sdt: "0977777777", email: "khac@example.com", ghiChu: "ghi chú khác", mien: 1, ben: `pty-${PARTNER}` });
  assert.deepEqual(hanhKhach(w, id).map((x: any) => x.ten), ["Khách Ba"]);
});

// ---- sau xác nhận (Đ2.4, T10) ---------------------------------------------------------------------------------------------------------------------------
test("(n5) POST /passengers trên nháp 409 use_order_form; sau xác nhận đối tác bổ sung được danh sách; đổi tên liên hệ (PUT /booker) 403", async () => {
  const w = dung();
  await bat(w, true);
  const id = await lap201(w, PARTNER);
  const ds0 = (await w.call("GET", `/api/orders/${id}/passengers`, { as: PARTNER })).json;
  const them = (moc: string, ten: string) => w.call("POST", `/api/orders/${id}/passengers`, { as: PARTNER, body: { expectedUpdatedAt: moc, them: [PAX(ten)], sua: [], huy: [] } });
  const nhap = await them(ds0.orderUpdatedAt, "Khách Một");
  assert.equal(nhap.status, 409, nhap.text);
  assert.equal(nhap.json.error.code, "use_order_form");
  const gui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(gui.status, 200, gui.text);
  const ds1 = (await w.call("GET", `/api/orders/${id}/passengers`, { as: PARTNER })).json;
  const sau = await them(ds1.orderUpdatedAt, "Khách Một");
  assert.equal(sau.status, 200, sau.text);
  assert.deepEqual(hanhKhach(w, id).map((x: any) => x.ten), ["Khách Một"]);
  const doi = await w.call("PUT", `/api/orders/${id}/booker`, { as: PARTNER, body: { customerName: "Tên Đổi", customerPhone: "0977777777", bookerPartyId: null, expectedUpdatedAt: ds1.orderUpdatedAt } });
  assert.equal(doi.status, 403, doi.text);
  assert.equal(dong(w, id).ten, TEN(w, PARTNER), "tên liên hệ không đổi được");
});

// Người kiểm Đợt 2 (lỗi nhỏ gom lại): vế `valid_from_at <= ?1` của câu `AN_KHACH_HIEN_HANH` chưa bài nào canh — bỏ vế đó thì dòng BẬT hẹn ở tương lai áp ngay hôm nay.
test("(g3) dòng chính sách BẬT hẹn ở TƯƠNG LAI chưa áp: lập đơn giữ nguyên tên, SĐT, hành khách, không dấu; tới đúng mốc hẹn thì mới BẬT (vế valid_from_at <= ?1)", async () => {
  const w = dung();
  const henLuc = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const truocMotMs = new Date(Date.parse(henLuc) - 1).toISOString();
  w.sqlite.prepare("INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('hen-tuong-lai', 1, ?1, ?2, NULL, ?2, NULL)").run(henLuc, AT);
  assert.equal(await anKhachBat(w.env.DB, truocMotMs), false, "trước mốc hẹn 1 ms: còn TẮT");
  assert.equal(await anKhachBat(w.env.DB, henLuc), true, "đúng mốc hẹn: BẬT (dùng `<=`, không `<`)");
  assert.equal((await w.call("GET", URL, { as: SUP })).json.bat, false, "route đọc: dòng hẹn chưa áp");
  const id = await lap201(w, PARTNER, { passengers: [PAX("Khách Một")] });
  assert.deepEqual(dong(w, id), { ten: "Tên Giả Của Trình Duyệt", sdt: "0966666666", email: "gia@example.com", ghiChu: "ghi chú giả", mien: 0, ben: `pty-${PARTNER}` });
  assert.equal(hanhKhach(w, id).length, 1);
});
