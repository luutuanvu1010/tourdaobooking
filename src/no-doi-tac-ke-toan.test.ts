// ADR-0226 (Việc 6, chủ duyệt 21/11 «còn lại áp dụng như khuyến nghị»): Kế toán thuần mở Đơn hàng / Trang chủ — đơn đối tác chỉ hiện «Đối tác nợ Tour Đảo» và «Tour Đảo đã thu hộ tiền mặt»,
// máy chủ KHÔNG gửi số bán lẻ (Tổng, phải thu, đã thu bán lẻ) của đơn đó; đơn khách lẻ như cũ; người khác (Toàn quyền, Quản trị, Bán hàng) như cũ.
// Ví dụ tiền của kế hoạch: thành tiền 5.000.000 đ (ZA1 500.000 × 10 người lớn), hoa hồng 800.000 đ (80.000 / khách), không phí đón, Tour Đảo đã nhận thật 1.000.000 đ ⇒ 3.200.000 đ.
// Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, SUP, datCo, inDays, lap, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { keToanThuan, nhanNoDoiTac } from "./shared/no-doi-tac-ke-toan.ts";
import { thuHoTienMat } from "./modules/billing/rules.ts";

const DT = "88888888-8888-4888-8888-888888888802";
const BEN = `pty-${DT}`;
type W = ReturnType<typeof setup>;

test("luật thuần: Kế toán thuần = có Kế toán, không có Bán hàng / Quản lý bán hàng / Quản trị / Toàn quyền", () => {
  const la = (p: string[]) => keToanThuan({ permissions: p as never });
  assert.equal(la(["ACCOUNTING"]), true);
  assert.equal(la(["ACCOUNTING", "HR"]), true);
  for (const kem of ["SALES", "SALES_MANAGER", "ADMIN", "SUPER_ADMIN"]) assert.equal(la(["ACCOUNTING", kem]), false, kem);
  assert.equal(la(["ADMIN"]), false);
  assert.equal(la(["SUPER_ADMIN"]), false);
  assert.equal(la([]), false);
});

test("luật thuần: nhãn nợ — dương «Đối tác nợ Tour Đảo», âm «Tour Đảo cần trả lại đối tác» (số dương), 0 vẫn là «Đối tác nợ Tour Đảo»", () => {
  assert.deepEqual(nhanNoDoiTac(3_200_000), { nhan: "Đối tác nợ Tour Đảo", soTien: 3_200_000 });
  assert.deepEqual(nhanNoDoiTac(-300_000), { nhan: "Tour Đảo cần trả lại đối tác", soTien: 300_000 });
  assert.deepEqual(nhanNoDoiTac(0), { nhan: "Đối tác nợ Tour Đảo", soTien: 0 });
});

test("luật thuần: thu hộ tiền mặt = khoản thu khách TIỀN MẶT còn hiệu lực, người thu phía Tour Đảo (Công ty / nhân viên), không đang chờ đối chiếu; không tính chuyển khoản, khoản bên đặt thu, khoản bị đảo", () => {
  const r = (id: string, x: Partial<Parameters<typeof thuHoTienMat>[0]["receipts"][number]>) =>
    ({ id, kind: "CUSTOMER_PAYMENT" as const, amount: 100, collectorRole: "COMPANY" as const, collectorPartyId: null, reversesId: null, method: "CASH", ...x });
  const so = thuHoTienMat({
    receipts: [
      r("a", { amount: 1_000_000 }),
      r("b", { amount: 200_000, collectorRole: "STAFF", collectorPartyId: "pty-hdv" }),
      r("c", { amount: 50_000, method: "TRANSFER" }),
      r("d", { amount: 70_000, collectorRole: "BOOKER", collectorPartyId: BEN }),
      r("e", { amount: 30_000 }),
      r("e-dao", { amount: 30_000, kind: "CUSTOMER_REFUND", reversesId: "e" }),
      r("f", { amount: 40_000 }),
    ],
    bookerPartyId: BEN,
    choXacNhan: new Set(["f"]),
  });
  assert.equal(so, 1_200_000);
});

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000022", name: "Đối Tác Thử", perms: ["PARTNER"] });
  return w;
}
async function chuanBi(w: W): Promise<void> {
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 50_000_000, gioTra: 168, gioAnHan: 12, lyDo: "thử" } })).status, 201);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 80_000, tuNgay: "2026-01-01" } });
  assert.equal(m.status, 201, m.text);
}
const muoiKhach = { pax: { adult: 10, child: 0, senior: 0, infant: 0 } };
async function donDoiTac(w: W, guiDon = true): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Của Đối Tác", customerPhone: "0912345679", services: [svc("ZA1", inDays(1), [], muoiKhach)], paymentTerm: "CREDIT", discount: 300_000 } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  if (guiDon) assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: DT, body: {} })).status, 200);
  return id;
}
const congTyThu = (w: W, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const balances = (w: W, as: string, ids: string[]) => w.call("POST", "/api/ledger/balances", { as, body: { orderIds: ids } });

test("Kế toán thuần: đơn đối tác ⇒ «Đối tác nợ Tour Đảo» 3.200.000 đ + thu hộ 1.000.000 đ, KHÔNG có số bán lẻ trong phản hồi; Toàn quyền vẫn thấy như cũ", async () => {
  const w = dung();
  await chuanBi(w);
  const id = await donDoiTac(w);
  assert.equal((await congTyThu(w, id, 1_000_000)).status, 201);

  const kt = await balances(w, ACC, [id]);
  assert.equal(kt.status, 200, kt.text);
  assert.equal(kt.json.balances[id], undefined, "không gửi phải thu / đã thu bán lẻ của đơn đối tác cho Kế toán thuần");
  assert.deepEqual(kt.json.noDoiTac[id], { tinh: "co", no: 3_200_000, thuHoTienMat: 1_000_000, nhan: "Đối tác nợ Tour Đảo", nhanThuHo: "Tour Đảo đã thu hộ tiền mặt" });
  assert.ok(!kt.text.includes("5000000") && !kt.text.includes("4700000") && !kt.text.includes("phaiThu"), kt.text);

  const ds = await w.call("GET", "/api/orders", { as: ACC });
  assert.equal(ds.status, 200, ds.text);
  const dong = (ds.json.orders as { id: string; total?: number }[]).find((o) => o.id === id)!;
  assert.ok(dong, "đơn vẫn có trong danh sách");
  assert.equal(dong.total, undefined, "danh sách không gửi Tổng bán lẻ của đơn đối tác cho Kế toán thuần");
  assert.ok(!ds.text.includes("4700000") && !ds.text.includes("5000000"), "không lộ số bán lẻ ở chỗ khác của danh sách");

  const tc = await w.call("GET", "/api/orders/dashboard", { as: ACC });
  assert.equal(tc.status, 200, tc.text);
  const homNay = [...tc.json.today, ...tc.json.tomorrow, ...tc.json.dayAfter] as { id: string; total?: number }[];
  assert.equal(homNay.find((o) => o.id === id)?.total, undefined, "Trang chủ cũng không gửi Tổng bán lẻ");
  assert.ok(homNay.some((o) => o.id === id), "đơn đi ngày mai có ở Trang chủ");

  for (const nguoi of [SUP, ADM]) {
    const b = await balances(w, nguoi, [id]);
    assert.equal(b.json.balances[id].phaiThu, 4_700_000, "người khác thấy như cũ (5.000.000 − giảm 300.000)");
    assert.equal(b.json.noDoiTac, undefined);
    const d = (await w.call("GET", "/api/orders", { as: nguoi })).json.orders.find((o: { id: string }) => o.id === id);
    assert.equal(d.total, 4_700_000);
  }
});

test("Kế toán thuần: Tour Đảo nhận quá giá đại lý ⇒ số nợ giữ dấu âm (−300.000) — giao diện hiện «Tour Đảo cần trả lại đối tác»", async () => {
  const w = dung();
  await chuanBi(w);
  const id = await donDoiTac(w);
  assert.equal((await congTyThu(w, id, 4_500_000)).status, 201);
  const kt = await balances(w, ACC, [id]);
  assert.deepEqual(kt.json.noDoiTac[id], { tinh: "co", no: -300_000, thuHoTienMat: 4_500_000, nhan: "Tour Đảo cần trả lại đối tác", nhanThuHo: "Tour Đảo đã thu hộ tiền mặt" });
});

test("Kế toán thuần: đơn đối tác CHƯA xác nhận (đang chờ văn phòng) ⇒ không Tổng, không số bán lẻ, máy chủ không tính nợ; đơn khách lẻ như cũ", async () => {
  const w = dung();
  await chuanBi(w);
  datCo(w, "SERVICE", "ZA1", true);
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Của Đối Tác", customerPhone: "0912345679", services: [svc("ZA1", inDays(1), [], muoiKhach)], paymentTerm: "CREDIT" } });
  assert.equal(r.status, 201, r.text);
  const cho = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${cho}/gui-don`, { as: DT, body: {} })).status, 201, "đơn chờ văn phòng xác nhận");
  const le = await lap(w, A, [svc("ZB1", inDays(2))]);
  assert.equal((await w.call("POST", `/api/orders/${le.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const ds = (await w.call("GET", "/api/orders", { as: ACC })).json.orders as { id: string; total?: number; status: string }[];
  // Đơn nháp đang chờ của người khác không nằm trong danh sách của Kế toán (ADR-0135 Đ1) — nếu sau này có, nó vẫn không được mang Tổng bán lẻ.
  assert.equal(ds.find((o) => o.id === cho)?.total, undefined, "không gửi Tổng bán lẻ của đơn đối tác chưa xác nhận");
  assert.equal(ds.find((o) => o.id === le.id)?.total, 600_000, "đơn khách lẻ như cũ");
  const kt = await balances(w, ACC, [cho, le.id]);
  assert.equal(kt.status, 200, kt.text);
  assert.equal(kt.json.balances[cho], undefined, "không số bán lẻ");
  assert.equal(kt.json.noDoiTac?.[cho], undefined, "chưa xác nhận ⇒ chưa có giá đại lý chụp ⇒ không tính nợ");
  assert.equal(kt.json.balances[le.id].phaiThu, 600_000, "đơn khách lẻ như cũ");
  assert.equal(kt.json.noDoiTac?.[le.id], undefined);
});
