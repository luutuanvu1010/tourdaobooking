// ADR-0135 (chủ duyệt 19/10/2026), kế hoạch Đợt 2 Task 2.1 + 2.3: đơn NHÁP chỉ người lập đọc và ghi; người khác (Bán hàng khác, Kế toán, Quản trị, Toàn quyền,
// hướng dẫn viên được chọn sẵn) nhận 404 ở MỌI đường đọc và MỌI đường ghi; số đếm theo người; hàng chờ nhận chỉ đơn đã xác nhận; lịch chung điều phối
// tắt phần nháp. Mỗi hàng của trang ghép lượt 1 mục 3 (docs/superpowers/specs/2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-1.md) có MỘT bài ở đây.
// Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // Bán hàng — người lập
const B = "11111111-1111-4111-8111-222222222222"; // Bán hàng khác
const ADM = "33333333-3333-4333-8333-333333333333";
const H = "44444444-4444-4444-8444-444444444444"; // hướng dẫn viên được người lập chọn sẵn
const H2 = "44444444-4444-4444-8444-bbbbbbbbbbbb"; // hướng dẫn viên khác
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const NGUOI_KHAC = { B, ACC, ADM, SUP, H } as const;
const LEG = "99999999-9999-4999-8999-999999999991";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: H, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: H2, phone: "0900000014", name: "Hướng Dẫn Hai", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const body = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  ...extra,
});
async function lap(w: any, as: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: body(extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
async function xacNhan(w: any, as: string, id: string) {
  const r = await w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
}
const dem = (w: any, sql: string, ...a: unknown[]) => w.q(sql, ...a)[0].n as number;
const khongThay = (r: { status: number; json: any }, nhan: string) => {
  assert.equal(r.status, 404, `${nhan}: ${JSON.stringify(r.json)}`);
  assert.equal(r.json?.error?.code, "not_found", nhan);
};

/** Thế giới chuẩn: nháp N1 của A chọn sẵn HDV H. */
async function theGioi() {
  const w = setup();
  const nhap = await lap(w, A, { handlerStaffId: H });
  return { w, nhap };
}

// ================= ĐỌC (Task 2.1) =================

test("[GET /api/orders] danh sách: nháp của A chỉ A thấy; tìm theo mã đơn / tên khách cũng không ra với người khác", async () => {
  const { w, nhap } = await theGioi();
  const ma = w.q("SELECT order_code c FROM orders WHERE id = ?", nhap)[0].c as string;
  const ids = async (as: string, q = "") => (await w.call("GET", `/api/orders?limit=100${q}`, { as })).json?.orders?.map((x: any) => x.id) ?? [];
  assert.deepEqual(await ids(A), [nhap]);
  for (const [ten, id] of Object.entries(NGUOI_KHAC)) {
    assert.deepEqual(await ids(id), [], `${ten} thấy nháp của A trong danh sách`);
    assert.deepEqual(await ids(id, `&q=${encodeURIComponent(ma)}`), [], `${ten} tìm theo mã đơn`);
    assert.deepEqual(await ids(id, `&q=${encodeURIComponent("Khách Thử")}`), [], `${ten} tìm theo tên khách`);
  }
  assert.deepEqual(await ids(A, `&q=${encodeURIComponent(ma)}`), [nhap]);
});

test("[GET /api/orders/:id] chi tiết: A mở được; người khác (kể cả HDV chọn sẵn, Toàn quyền) 404; sau khi xác nhận thì HDV mở được", async () => {
  const { w, nhap } = await theGioi();
  assert.equal((await w.call("GET", `/api/orders/${nhap}`, { as: A })).status, 200);
  for (const [ten, id] of Object.entries(NGUOI_KHAC)) khongThay(await w.call("GET", `/api/orders/${nhap}`, { as: id }), ten);
  await xacNhan(w, A, nhap);
  assert.equal((await w.call("GET", `/api/orders/${nhap}`, { as: H })).status, 200, "đã xác nhận: HDV phụ trách mở được (Review Focus 7)");
  assert.equal((await w.call("GET", `/api/orders/${nhap}`, { as: SUP })).status, 200);
});

test("[GET …/passengers] [GET …/thuong-mai] [GET …/receipt] [GET …/qr-thanh-toan] [GET …/payments] [GET …/nhap-ke-toan]: người khác 404", async () => {
  const { w, nhap } = await theGioi();
  const duong = ["passengers", "thuong-mai", "receipt", "qr-thanh-toan", "payments", "nhap-ke-toan"];
  for (const d of duong) {
    for (const [ten, id] of Object.entries(NGUOI_KHAC)) khongThay(await w.call("GET", `/api/orders/${nhap}/${d}`, { as: id }), `${d}/${ten}`);
    const r = await w.call("GET", `/api/orders/${nhap}/${d}`, { as: A });
    assert.ok(!(r.status === 404 && r.json?.error?.message === "Không tìm thấy đơn."), `${d}: người lập A bị 404 đơn`);
  }
});

test("[POST /api/ledger/balances] số dư: đơn nháp của người khác bị bỏ khỏi kết quả", async () => {
  const { w, nhap } = await theGioi();
  const lay = async (as: string) => (await w.call("POST", "/api/ledger/balances", { as, body: { orderIds: [nhap] } })).json?.balances ?? {};
  for (const [ten, id] of Object.entries(NGUOI_KHAC)) assert.equal(nhap in (await lay(id)), false, `${ten} thấy số dư của nháp`);
  assert.equal(nhap in (await lay(A)), true);
});

test("[GET /api/van-chuyen/xe-cua-don/:orderId] xe trên đơn nháp của người khác: 404", async () => {
  const { w, nhap } = await theGioi();
  for (const id of [ADM, SUP, ACC]) khongThay(await w.call("GET", `/api/van-chuyen/xe-cua-don/${nhap}`, { as: id }), "xe-cua-don");
});

test("[GET /api/orders/dashboard] [GET /api/orders/dem-nhap] số nháp đếm THEO NGƯỜI; 'Chưa phụ trách' chỉ đếm đơn đã xác nhận", async () => {
  const { w, nhap } = await theGioi(); // nháp có HDV
  await lap(w, B); // nháp của B, chưa ai phụ trách
  const chuaXong = await lap(w, A); // sẽ xác nhận, chưa ai phụ trách
  await xacNhan(w, A, chuaXong);
  const dem2 = async (as: string) => [
    (await w.call("GET", "/api/orders/dem-nhap", { as })).json.draftCount,
    (await w.call("GET", "/api/orders/dashboard", { as })).json.draftCount,
  ];
  assert.deepEqual(await dem2(A), [1, 1], "A có một nháp (nháp thứ hai đã xác nhận)");
  assert.deepEqual(await dem2(B), [1, 1]);
  assert.deepEqual(await dem2(SUP), [0, 0], "Toàn quyền không có nháp của riêng mình");
  assert.deepEqual(await dem2(ADM), [0, 0]);
  assert.equal((await w.call("GET", "/api/orders/dashboard", { as: SUP })).json.unassignedCount, 1, "chỉ đơn đã xác nhận chưa ai phụ trách");
  void nhap;
});

test("[GET /api/orders/pool] hàng chờ nhận: không có đơn nháp, có đơn đã xác nhận chưa ai nhận", async () => {
  const { w } = await theGioi();
  const nhapKhongNguoi = await lap(w, A);
  const daXn = await lap(w, A);
  await xacNhan(w, A, daXn);
  for (const as of [H2, SUP]) {
    const r = await w.call("GET", "/api/orders/pool", { as });
    assert.equal(r.status, 200, r.text);
    const ids = r.json.orders.map((o: any) => o.orderId);
    assert.ok(!ids.includes(nhapKhongNguoi), `${as}: thấy nháp trong hàng chờ`);
    assert.ok(ids.includes(daXn), `${as}: thiếu đơn đã xác nhận`);
  }
});

test("[GET /api/dispatch/handlers] người phụ trách chọn sẵn của NHÁP người khác không lộ (như đơn không tồn tại); người lập vẫn thấy; sau xác nhận ai có quyền xem cũng thấy", async () => {
  const { w, nhap } = await theGioi();
  const ma = await lap(w, A);
  for (const [ten, id] of Object.entries({ B, ACC, ADM, SUP })) {
    const r = await w.call("GET", `/api/dispatch/handlers?orderIds=${nhap},${ma}`, { as: id });
    assert.equal(r.status, 200, `${ten}: ${r.text}`);
    assert.equal(r.json.handlers[nhap], null, `${ten}: lộ người phụ trách chọn sẵn của nháp`);
    assert.ok(!JSON.stringify(r.json).includes("party_id") && !JSON.stringify(r.json).includes(H), `${ten}: lộ hồ sơ`);
  }
  const rA = await w.call("GET", `/api/dispatch/handlers?orderIds=${nhap}`, { as: A });
  assert.equal(rA.status, 200, rA.text);
  assert.ok(rA.json.handlers[nhap], "người lập phải thấy người mình chọn sẵn");
  await xacNhan(w, A, nhap);
  const rS = await w.call("GET", `/api/dispatch/handlers?orderIds=${nhap}`, { as: SUP });
  assert.ok(rS.json.handlers[nhap], "sau xác nhận Toàn quyền thấy người phụ trách");
});

test("[GET …/tu-choi-truoc] [GET …/han-muc-tu-choi] nháp của người khác: 404 (Quản trị, Toàn quyền, HDV chọn sẵn); người lập không bị chặn bởi cổng nháp", async () => {
  const { w, nhap } = await theGioi();
  for (const id of [ADM, SUP]) khongThay(await w.call("GET", `/api/orders/${nhap}/tu-choi-truoc`, { as: id }), `tu-choi-truoc/${id}`);
  khongThay(await w.call("GET", `/api/orders/${nhap}/han-muc-tu-choi`, { as: H }), "han-muc-tu-choi/HDV chọn sẵn");
  const rA = await w.call("GET", `/api/orders/${nhap}/tu-choi-truoc`, { as: A });
  assert.notEqual(rA.status, 404, rA.text);
});

test("[GET /api/dispatch/mine] 'việc của tôi' của HDV chọn sẵn không có đơn nháp; sau xác nhận thì có", async () => {
  const { w, nhap } = await theGioi();
  const ids = async () => (await w.call("GET", "/api/dispatch/mine", { as: H })).json.assignments.map((x: any) => x.orderId ?? x.id);
  assert.ok(!(await ids()).includes(nhap));
  await xacNhan(w, A, nhap);
  assert.ok((await ids()).includes(nhap));
});

test("[findHandledOrderIds / isAssigned] HDV chọn sẵn không được coi là 'đang phụ trách' đơn nháp: danh sách của H rỗng, sau xác nhận có", async () => {
  const { w, nhap } = await theGioi();
  const ids = async () => (await w.call("GET", "/api/orders?limit=100", { as: H })).json.orders.map((x: any) => x.id);
  assert.deepEqual(await ids(), []);
  await xacNhan(w, A, nhap);
  assert.deepEqual(await ids(), [nhap]);
});

test("[donCuaNguoiDat] gộp hồ sơ người đặt: nháp chỉ được ĐẾM, không trả mã đơn nháp; đơn đã xác nhận vẫn trả mã", async () => {
  const { w, nhap } = await theGioi();
  const daXn = await lap(w, A);
  await xacNhan(w, A, daXn);
  const pid = "aaaaaaaa-0000-4000-8000-000000000001";
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('${pid}', 'PERSON', 'Khách', '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`UPDATE orders SET booker_party_id = '${pid}'`);
  // nháp LỆCH TIỀN (lech = 1) cũng không được lộ mã qua `lechTien` (mã đơn nháp không ra khỏi hàm — Đ1). Trigger tiền chặn UPDATE lệch nên gỡ nó (chỉ DB thử).
  w.sqlite.exec("DROP TRIGGER IF EXISTS orders_money_update");
  w.sqlite.exec(`UPDATE orders SET total = subtotal - discount + 1 WHERE id = '${nhap}'`);
  assert.equal(w.q("SELECT (total IS NOT subtotal - discount) AS l FROM orders WHERE id = ?", nhap)[0].l, 1, "nháp thử phải lệch tiền");
  const { donCuaNguoiDat } = await import("./nguoi-dat-gop-repo.ts");
  const kq = await donCuaNguoiDat(w.env.DB, pid);
  const maNhap = w.q("SELECT order_code c FROM orders WHERE id = ?", nhap)[0].c as string;
  const maXn = w.q("SELECT order_code c FROM orders WHERE id = ?", daXn)[0].c as string;
  assert.equal(kq.doi, 2, "nháp vẫn được đếm");
  assert.deepEqual(kq.maDoi, [maXn]);
  assert.deepEqual(kq.lechTien, [], "nháp lệch tiền không vào lechTien");
  assert.equal(JSON.stringify(kq).includes(maNhap), false, "mã đơn nháp lộ trong donCuaNguoiDat");
});

test("[trang Nhật ký của Toàn quyền] vẫn liệt kê dòng 'created' của đơn nháp (ngoại lệ có tên ADR-0135 Đ1)", async () => {
  const { w, nhap } = await theGioi();
  const ma = w.q("SELECT order_code c FROM orders WHERE id = ?", nhap)[0].c as string;
  const r = await w.call("GET", "/api/audit?limit=100", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.text.includes(ma), "Nhật ký của Toàn quyền không còn dòng của đơn nháp");
});

// ================= GHI (Task 2.3) =================

type Duong = { ten: string; method: string; path: (id: string) => string; body?: unknown };
const DUONG_GHI: Duong[] = [
  { ten: "PUT /api/orders/:id", method: "PUT", path: (id) => `/api/orders/${id}`, body: { ...body(), expectedUpdatedAt: "x" } },
  { ten: "PUT …/trip", method: "PUT", path: (id) => `/api/orders/${id}/trip`, body: { expectedUpdatedAt: "x", updates: [] } },
  { ten: "POST …/legs", method: "POST", path: (id) => `/api/orders/${id}/legs`, body: {} },
  { ten: "PUT …/legs/:legId", method: "PUT", path: (id) => `/api/orders/${id}/legs/${LEG}`, body: {} },
  { ten: "POST …/legs/:legId/close", method: "POST", path: (id) => `/api/orders/${id}/legs/${LEG}/close`, body: {} },
  { ten: "POST …/legs/:legId/replace", method: "POST", path: (id) => `/api/orders/${id}/legs/${LEG}/replace`, body: {} },
  { ten: "POST …/legs/:legId/short-notice", method: "POST", path: (id) => `/api/orders/${id}/legs/${LEG}/short-notice`, body: { lyDo: "KHAC" } },
  { ten: "POST …/passengers", method: "POST", path: (id) => `/api/orders/${id}/passengers`, body: {} },
  { ten: "PUT …/booker", method: "PUT", path: (id) => `/api/orders/${id}/booker`, body: { customerName: "Khách Mới", customerPhone: "0912345679" } },
  { ten: "POST …/status", method: "POST", path: (id) => `/api/orders/${id}/status`, body: { status: "confirmed" } },
  { ten: "POST …/cancel-reason", method: "POST", path: (id) => `/api/orders/${id}/cancel-reason`, body: {} },
  { ten: "POST …/thuong-mai/:serviceId", method: "POST", path: (id) => `/api/orders/${id}/thuong-mai/${LEG}`, body: { lyDo: "Ghi tay thử nghiệm mức", hoaHong: { kieu: "RATE", tyLeBp: 500 } } },
  { ten: "POST …/chup-bu", method: "POST", path: (id) => `/api/orders/${id}/chup-bu`, body: {} },
  { ten: "POST …/money-edit", method: "POST", path: (id) => `/api/orders/${id}/money-edit`, body: {} },
  { ten: "PUT …/handler (dispatch)", method: "PUT", path: (id) => `/api/orders/${id}/handler`, body: { staffId: H2 } },
  { ten: "POST …/handler-cancel (dispatch)", method: "POST", path: (id) => `/api/orders/${id}/handler-cancel`, body: { reason: "other", note: "thử" } },
  { ten: "POST …/handler-money-edit (dispatch)", method: "POST", path: (id) => `/api/orders/${id}/handler-money-edit`, body: { reason: "thử", services: [] } },
  { ten: "POST …/handler-refuse (dispatch)", method: "POST", path: (id) => `/api/orders/${id}/handler-refuse`, body: { lyDo: "OTHER" } },
];
// HDV được chọn sẵn là người ĐẦU TIÊN lòi ra nếu luật rò: ở ba route của chính HDV (và route giao người) phải đúng 404, không phải 403 / 409.
for (const d of DUONG_GHI.filter((x) => /dispatch/.test(x.ten))) {
  test(`[ghi] ${d.ten}: HDV chọn sẵn của nháp → đúng 404 (không 403 / 409 lộ trạng thái)`, async () => {
    const { w, nhap } = await theGioi();
    khongThay(await w.call(d.method, d.path(nhap), { as: H, body: d.body }), `${d.ten}/HDV chọn sẵn`);
  });
}
for (const d of DUONG_GHI) {
  test(`[ghi] ${d.ten}: nháp của A — người khác 404 và đơn KHÔNG đổi`, async () => {
    const { w, nhap } = await theGioi();
    const truoc = JSON.stringify([w.q("SELECT * FROM orders WHERE id = ?", nhap), w.q("SELECT count(*) n FROM audit_log"), w.q("SELECT * FROM dsp_assignment")]);
    for (const [ten, id] of Object.entries(NGUOI_KHAC)) {
      const r = await w.call(d.method, d.path(nhap), { as: id, body: d.body });
      // Tài khoản không có ô nào của route (cổng 403 đứng trước mọi đọc đơn) chỉ được 403/404; người có ô thì phải đúng 404.
      assert.ok(r.status === 404 || r.status === 403, `${d.ten}/${ten}: ${r.status} ${r.text}`);
    }
    // Quản trị, Toàn quyền (có đủ ô của mọi route ghi) bắt buộc 404 — không phải 403.
    for (const id of [ADM, SUP]) khongThay(await w.call(d.method, d.path(nhap), { as: id, body: d.body }), `${d.ten}/${id}`);
    const sau = JSON.stringify([w.q("SELECT * FROM orders WHERE id = ?", nhap), w.q("SELECT count(*) n FROM audit_log"), w.q("SELECT * FROM dsp_assignment")]);
    assert.equal(sau, truoc, "đơn / nhật ký / phân công đổi sau lệnh bị từ chối");
  });
}

test("[ghi] người lập A vẫn ghi như cũ: money-edit nháp 409 (không mong 200), POST …/legs 409 use_order_form, PUT /:id 200", async () => {
  const { w, nhap } = await theGioi();
  const me = await w.call("POST", `/api/orders/${nhap}/money-edit`, { as: A, body: {} });
  assert.equal(me.status, 409, me.text);
  assert.equal(me.json.error.code, "use_order_form");
  const lg = await w.call("POST", `/api/orders/${nhap}/legs`, { as: A, body: {} });
  assert.equal(lg.status, 409, lg.text);
  const chiTiet = await w.call("GET", `/api/orders/${nhap}`, { as: A });
  const sua = await w.call("PUT", `/api/orders/${nhap}`, { as: A, body: { ...body(), expectedUpdatedAt: chiTiet.json.order.updatedAt } });
  assert.equal(sua.status, 200, sua.text);
});

test("[dispatch PUT …/handler] người lập tự Nhận nháp của mình: 409 order_not_confirmed; sau khi xác nhận thì giao được", async () => {
  const { w } = await theGioi();
  const nhapTrong = await lap(w, A);
  const r = await w.call("PUT", `/api/orders/${nhapTrong}/handler`, { as: A, body: { staffId: A } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "order_not_confirmed");
  assert.equal(dem(w, "SELECT count(*) n FROM dsp_assignment WHERE order_id = ?", nhapTrong), 0);
  await xacNhan(w, A, nhapTrong);
  assert.equal((await w.call("PUT", `/api/orders/${nhapTrong}/handler`, { as: A, body: { staffId: H2 } })).status, 200);
});

// ================= LỊCH CHUNG ĐIỀU PHỐI =================

test("[legLichChungNhapRows] lịch chung điều phối: không còn chặng của đơn nháp (phần nháp tắt tới Đợt 3)", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", {
    as: A,
    body: body({ services: [{ ...body().services[0], pickupChoice: "DON", legs: [{ direction: "OUT", pickupDate: inDays(3), pickupTime: "08:00", pickupPlace: "Khách sạn A" }] }] }),
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.ok(dem(w, "SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ? AND closed_at IS NULL", id) > 0, "đơn thử phải có chặng mở");
  const { legLichChungNhapRows } = await import("./chang-hanh-khach-repo.ts");
  assert.deepEqual(await legLichChungNhapRows(w.env.DB, inDays(0), inDays(10)), []);
});
