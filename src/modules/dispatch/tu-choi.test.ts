// Nút «Từ chối» đơn (ADR-0030 điều 1, kế hoạch 2026-10-20 TC-1…TC-6): hành vi API thật `POST /api/orders/:id/handler-refuse` trên SQLite thật qua khung
// tests/audit/harness.mjs (khuôn nhan-don.test.ts, huy-don-khac.test.ts). Đọc thẳng `dsp_assignment`, `audit_log` để kiểm dữ liệu sau lệnh.
// Lô ghi (thứ tự câu, thua đua mức SQL) kiểm riêng ở service.test.ts; luật thuần (lý do, hạn Q-E) ở src/shared.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const FIELD2 = "55555555-5555-4555-8555-555555555555";
const SUP = "66666666-6666-4666-8666-666666666666";
const ACC = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const DRIVER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn A", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: FIELD2, phone: "0900000005", name: "Hướng Dẫn B", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000006", name: "Toàn quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000007", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000010", name: "Tài xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000011", name: "Nhân sự", perms: ["HR"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const dichVu = (departDate: string) => ({ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate });
const orderBody = (departDate: string, extra: Record<string, unknown> = {}, soDichVu = 1) => ({
  customerName: "Khách Thử", customerPhone: "0912345678", ...extra,
  services: Array.from({ length: soDichVu }, () => dichVu(departDate)),
});

/** Đơn đã xác nhận do `chu` lập (mặc định Bán hàng An), ngày đi = `departDate`, người phụ trách = `handler` (giao bằng Quản trị). */
async function donDaXacNhan(w: any, handler: string, opts: { departDate?: string; chu?: string; soDichVu?: number } = {}): Promise<string> {
  const chu = opts.chu ?? SALES;
  const created = await w.call("POST", "/api/orders", { as: chu, body: orderBody(opts.departDate ?? inDays(2), {}, opts.soDichVu ?? 1) });
  assert.equal(created.status, 201, created.text);
  const id = created.json.order.id;
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: chu === PARTNER ? ADM : chu, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  const giao = await w.call("PUT", `/api/orders/${id}/handler`, { as: ADM, body: { staffId: handler } });
  assert.equal(giao.status, 200, giao.text);
  return id;
}
const tuChoi = (w: any, id: string, as: string, body: unknown = { lyDo: "BAN_LICH" }) => w.call("POST", `/api/orders/${id}/handler-refuse`, { as, body });
const moDong = (w: any, id: string) => w.q("SELECT party_id FROM dsp_assignment WHERE order_id = ? AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL", id);
const tatCaDong = (w: any, id: string) => w.q("SELECT party_id, valid_from_at, valid_to_at, updated_at, updated_by FROM dsp_assignment WHERE order_id = ? AND task_kind_code = 'HANDLE' ORDER BY valid_from_at, rowid", id);
const dongTuChoi = (w: any, id: string) => w.q("SELECT staff_id, detail, created_at FROM audit_log WHERE order_id = ? AND action = 'order_handler_refused' ORDER BY rowid", id);
const soNhatKy = (w: any) => w.q("SELECT count(*) n FROM audit_log")[0].n;

// ---- TC-1 ----
test("TC-1: HDV đang phụ trách đơn đã xác nhận (ngày đi = ngày kia) Từ chối → 200 {ok:true}; đơn không còn ai phụ trách, dòng cũ đóng đúng mốc, đúng MỘT nhật ký chỉ nhãn lý do", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  const r = await tuChoi(w, id, FIELD);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });
  assert.equal(moDong(w, id).length, 0, "không còn dòng HANDLE mở, không dòng mới");
  const dong = tatCaDong(w, id);
  assert.equal(dong.length, 1, "chỉ dòng cũ, không mở dòng mới");
  const nk = dongTuChoi(w, id);
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, FIELD);
  assert.equal(nk[0].detail, "Bận lịch khác");
  assert.ok(!/\d{8,}/.test(nk[0].detail) && !nk[0].detail.includes("@"));
  assert.equal(dong[0].valid_to_at, nk[0].created_at, "valid_to_at = mốc lệnh = mốc nhật ký");
  assert.equal(dong[0].updated_by, FIELD);
});

// ---- TC-2 ----
test("TC-2: sau Từ chối — HDV mở chi tiết → 404, đơn ở hàng chờ, không còn ở «Việc của tôi»; Bán hàng vừa trả vẫn xem được; văn phòng giao lại cho chính người vừa trả → 200", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  assert.equal((await tuChoi(w, id, FIELD)).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: FIELD })).status, 404);
  const pool = await w.call("GET", "/api/orders/pool", { as: FIELD2 });
  assert.equal(pool.status, 200, pool.text);
  assert.equal(pool.json.orders.find((o: any) => o.orderId === id)?.traLai, true, "đơn phải về hàng chờ, kèm cờ «được trả lại» (TC-8)");
  const hs = await w.call("GET", `/api/dispatch/handlers?orderIds=${id}`, { as: SALES });
  assert.equal(hs.status, 200, hs.text);
  assert.deepEqual(hs.json, { handlers: { [id]: null }, traLai: [id] }, "trang đơn văn phòng: chỉ thêm trường traLai, không tên, không lý do");
  const mine = await w.call("GET", "/api/dispatch/mine", { as: FIELD });
  assert.equal(mine.status, 200, mine.text);
  assert.ok(!mine.json.assignments.some((a: any) => a.orderId === id));
  const lai = await w.call("PUT", `/api/orders/${id}/handler`, { as: ADM, body: { staffId: FIELD } });
  assert.equal(lai.status, 200, lai.text);
  const hs2 = await w.call("GET", `/api/dispatch/handlers?orderIds=${id}`, { as: SALES });
  assert.deepEqual(hs2.json.traLai, [], "đã có người lại thì không còn «được trả lại»");

  const id2 = await donDaXacNhan(w, SALES);
  assert.equal((await tuChoi(w, id2, SALES)).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${id2}`, { as: SALES })).status, 200, "Bán hàng (order.view any) vẫn xem đơn mình vừa trả");
});

// ---- TC-3 ----
test("TC-3: người KHÔNG đang phụ trách → 403 (cả Toàn quyền, Bán hàng, Quản trị, HDV khác); không dòng nào đổi", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  const truoc = soNhatKy(w);
  for (const as of [SUP, SALES, SALES2, ADM, FIELD2]) {
    const r = await tuChoi(w, id, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.deepEqual(moDong(w, id).map((x: any) => x.party_id), [`pty-${FIELD}`]);
  assert.equal(soNhatKy(w), truoc, "403 không ghi nhật ký");
});

test("TC-3: Kế toán, Thực tập, Đối tác → 403 SÀNG SỚM (trước mọi đọc: id sai dạng vẫn 403, không 404); Tài xế, Nhân sự → 403 ở cổng orders", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  for (const as of [ACC, INTERN, PARTNER, DRIVER, HR]) {
    assert.equal((await tuChoi(w, id, as)).status, 403, `${as} trên đơn thật`);
    assert.equal((await tuChoi(w, "khong-phai-uuid", as)).status, 403, `${as} trên id sai dạng — phải 403 trước 404`);
  }
  assert.equal(moDong(w, id).length, 1);
});

test("TC-3: Toàn quyền / Bán hàng / Quản trị ĐANG phụ trách → 200; đơn do Đối tác lập, HDV đang phụ trách → 200", async () => {
  const w = setup();
  for (const nguoi of [SUP, SALES, ADM]) {
    const id = await donDaXacNhan(w, nguoi);
    const r = await tuChoi(w, id, nguoi);
    assert.equal(r.status, 200, `${nguoi}: ${r.text}`);
    assert.equal(moDong(w, id).length, 0);
  }
  const idDt = await donDaXacNhan(w, FIELD, { chu: PARTNER });
  assert.equal((await tuChoi(w, idDt, FIELD)).status, 200);
});

// ---- TC-4 ----
test("TC-4: đơn đã huỷ → 409 cancelled; đơn Đã giao → 409 order_delivered; đơn nháp (người phụ trách chọn sẵn) → 409 order_not_confirmed", async () => {
  const w = setup();
  const huy = await donDaXacNhan(w, FIELD);
  assert.equal((await w.call("POST", `/api/orders/${huy}/status`, { as: ADM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  const r1 = await tuChoi(w, huy, FIELD);
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "cancelled");

  const giao = await donDaXacNhan(w, FIELD);
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(new Date().toISOString(), ACC, giao);
  const r2 = await tuChoi(w, giao, FIELD);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "order_delivered");

  const nhap = await w.call("POST", "/api/orders", { as: SALES, body: orderBody(inDays(5), { handlerStaffId: FIELD }) });
  assert.equal(nhap.status, 201, nhap.text);
  assert.equal(moDong(w, nhap.json.order.id).length, 1, "đơn nháp có người phụ trách chọn sẵn");
  const r3 = await tuChoi(w, nhap.json.order.id, FIELD);
  assert.equal(r3.status, 409, r3.text);
  assert.equal(r3.json.error.code, "order_not_confirmed");
  for (const id of [huy, giao, nhap.json.order.id]) assert.equal(moDong(w, id).length, 1, "409 không đóng dòng nào");
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'order_handler_refused'")[0].n, 0);
});

test("TC-4: hạn Q-E — ngày đi hôm nay / ngày mai / đã qua → 409 too_late «…Gọi văn phòng để đổi người.»; ngày kia → 200; [hôm nay, ngày kia] → 200", async () => {
  const w = setup();
  const conHan = async (ngay: (string | null)[]): Promise<{ status: number; json: any; text: string }> => {
    const id = await donDaXacNhan(w, FIELD, { departDate: inDays(3), soDichVu: ngay.length });
    // Ghi thẳng ngày từng dịch vụ (đường API chặn ngày quá khứ khi xác nhận và một-ngày-cho-cả-đơn) — chỉ để dựng dữ liệu bài kiểm.
    const svcs = w.q("SELECT id FROM order_service WHERE order_id = ? ORDER BY sort_order", id);
    ngay.forEach((d, i) => w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE id = ?").run(d, svcs[i].id));
    return tuChoi(w, id, FIELD);
  };
  for (const [ten, ngay] of [["hôm nay", [inDays(0)]], ["ngày mai", [inDays(1)]], ["hôm qua", [inDays(-1)]]] as const) {
    const r = await conHan([...ngay]);
    assert.equal(r.status, 409, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "too_late", ten);
    assert.ok(r.json.error.message.includes("Gọi văn phòng để đổi người."), ten);
  }
  assert.equal((await conHan([inDays(2)])).status, 200, "ngày kia");
  assert.equal((await conHan([inDays(0), inDays(2)])).status, 200, "lấy ngày lớn nhất");
  // "Chưa có ngày nào → 200" (TC-4) không dựng được ở mức route: CSDL chặn đơn đã xác nhận thiếu ngày (incomplete_trip) — ca này kiểm ở luật thuần
  // `tuChoiQuaMuon([null], …) === false` (src/shared/trip-rules.test.ts).
});

// ---- TC-5 ----
test("TC-5: thân sai (thiếu lyDo, mã lạ, sai kiểu, có thêm khoá chữ — kể cả với «Khác») → 400 tiếng Việt liệt kê bốn lý do; không dòng nào đổi", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  const truoc = soNhatKy(w);
  const sai: unknown[] = [{}, { lyDo: "KHAC" }, { lyDo: 3 }, { lyDo: "OTHER", ghiChu: "bận" }, { lyDo: "BAN_LICH", note: "x" }, { lyDo: "OTHER", reason: "x" }, null];
  for (const body of sai) {
    const r = await tuChoi(w, id, FIELD, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    for (const nhan of ["Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác"]) assert.ok(r.json.error.message.includes(nhan), nhan);
  }
  assert.equal(moDong(w, id).length, 1);
  assert.equal(soNhatKy(w), truoc);
  for (const ma of ["OM_VIEC_RIENG"]) assert.equal((await tuChoi(w, id, FIELD, { lyDo: ma })).status, 200);
  assert.equal(dongTuChoi(w, id)[0].detail, "Ốm / việc riêng");
});

// ---- TC-6 (mức route; đua mức SQL ở service.test.ts, đua song song thật ở tests/e2e/dispatch.mjs) ----
test("TC-6 (b): HDV B bấm Nhận khi A còn phụ trách → 409 stale, A Từ chối vẫn 200; A Từ chối trước → B Nhận sau 200", async () => {
  const w = setup();
  const id = await donDaXacNhan(w, FIELD);
  const nhanSom = await w.call("PUT", `/api/orders/${id}/handler`, { as: FIELD2, body: { staffId: FIELD2 } });
  assert.equal(nhanSom.status, 409, nhanSom.text);
  assert.equal(nhanSom.json.error.code, "stale");
  assert.equal((await tuChoi(w, id, FIELD)).status, 200);
  const nhanSau = await w.call("PUT", `/api/orders/${id}/handler`, { as: FIELD2, body: { staffId: FIELD2 } });
  assert.equal(nhanSau.status, 200, nhanSau.text);
  assert.deepEqual(moDong(w, id).map((x: any) => x.party_id), [`pty-${FIELD2}`]);
  assert.equal(dongTuChoi(w, id).length, 1);
});

test("TC-6 (a): văn phòng đổi A→B cùng lúc A Từ chối (10 vòng Promise.all) — tối đa một dòng mở, nhật ký khớp đúng các lệnh 200, bên thua chỉ 409 stale hoặc 403", async () => {
  const w = setup();
  for (let i = 0; i < 10; i++) {
    const id = await donDaXacNhan(w, FIELD);
    const [tc, doi] = await Promise.all([tuChoi(w, id, FIELD), w.call("PUT", `/api/orders/${id}/handler`, { as: ADM, body: { staffId: FIELD2 } })]);
    assert.ok(moDong(w, id).length <= 1, `vòng ${i}`);
    assert.ok([200, 403, 409].includes(tc.status), `vòng ${i} Từ chối: ${tc.text}`);
    if (tc.status === 409) assert.equal(tc.json.error.code, "stale");
    assert.ok([200, 409].includes(doi.status), `vòng ${i} đổi người: ${doi.text}`);
    assert.equal(dongTuChoi(w, id).length, tc.status === 200 ? 1 : 0, `vòng ${i}: nhật ký Từ chối khớp`);
    const doiNguoi = w.q("SELECT count(*) n FROM audit_log WHERE order_id = ? AND action = 'order_handler_changed' AND detail LIKE '%Hướng Dẫn B'", id)[0].n;
    assert.equal(doiNguoi, doi.status === 200 ? 1 : 0, `vòng ${i}: nhật ký đổi người khớp`);
  }
});
