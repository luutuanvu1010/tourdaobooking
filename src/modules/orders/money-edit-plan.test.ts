// `planMoneyEdit` — luật THUẦN quyết định một lần "HDV sửa số khách" (POST /api/orders/:id/handler-money-edit) làm gì: không ghi (y nguyên), ghi
// một dòng điều chỉnh, hay từ chối (thân sai dạng). Tách khỏi `editMoneyAsHandler` (I/O) để kiểm được không cần D1. Bối cảnh: DK-T2-01 (giá
// thoả thuận; lưu y nguyên không ghi dòng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_THIEU_NGUOI_LON } from "../../shared/nguoi-di-kem.ts";
import { effectiveSubtotal, parseAdjustmentAfter, planMoneyEdit, type SubtotalServiceInput } from "./money-adjustment.ts";

const ZERO = { adult: 0, child: 0, senior: 0, infant: 0 };
const pax = (adult: number) => ({ ...ZERO, adult });
const DEAL = 1_000_000;
const LIST = 1_350_000;

const catalogSvc: SubtotalServiceInput = {
  id: "svc-1", catalogCode: "TD101", name: "Tour 4 đảo", unit: "perPax",
  items: [{ paxCode: "adult", catalogPrice: LIST, unitPrice: DEAL, lineTotal: 2 * DEAL }],
};
const manualSvc: SubtotalServiceInput = {
  id: "svc-m", catalogCode: null, name: "Xe đưa đón", unit: "manual",
  items: [{ paxCode: null, catalogPrice: null, unitPrice: 200_000, lineTotal: 200_000 }],
};

const ctx = (over: Partial<Parameters<typeof planMoneyEdit>[0]> = {}): Parameters<typeof planMoneyEdit>[0] => ({
  services: [catalogSvc],
  storedPax: new Map([["svc-1", pax(2)]]),
  latestAfter: null,
  body: { reason: "Khách báo thêm 1 người", services: [{ id: "svc-1", pax: pax(3) }] },
  ...over,
});

test("planMoneyEdit: gửi lại Y NGUYÊN số khách → không ghi dòng điều chỉnh nào (ok, write=false)", () => {
  const r = planMoneyEdit(ctx({ body: { reason: "Kiểm lại danh sách, không đổi", services: [{ id: "svc-1", pax: pax(2) }] } }));
  assert.deepEqual(r, { ok: true, write: false });
});

test("planMoneyEdit: y nguyên so với dòng điều chỉnh GẦN NHẤT (không phải số gốc) → không ghi", () => {
  const r = planMoneyEdit(ctx({ latestAfter: [{ serviceId: "svc-1", pax: pax(4) }], body: { reason: "x", services: [{ id: "svc-1", pax: pax(4) }] } }));
  assert.deepEqual(r, { ok: true, write: false });
});

test("planMoneyEdit: y nguyên nhưng THIẾU lý do → vẫn từ chối (lý do luôn bắt buộc, kiểm trước)", () => {
  const r = planMoneyEdit(ctx({ body: { reason: " ", services: [{ id: "svc-1", pax: pax(2) }] } }));
  assert.ok(!r.ok && r.code === "invalid_input");
});

test("planMoneyEdit: 2→3 người lớn → ghi; tiền trước/sau theo GIÁ THOẢ THUẬN; dòng after lưu kèm đơn giá", () => {
  const r = planMoneyEdit(ctx());
  assert.ok(r.ok && r.write, JSON.stringify(r));
  if (!(r.ok && r.write)) return;
  assert.equal(r.subtotalBefore, 2 * DEAL);
  assert.equal(r.subtotalAfter, 3 * DEAL);
  assert.equal(r.reason, "Khách báo thêm 1 người");
  assert.deepEqual(r.before, [{ serviceId: "svc-1", pax: pax(2), unitPrices: { adult: DEAL } }]);
  assert.deepEqual(r.after, [{ serviceId: "svc-1", pax: pax(3), unitPrices: { adult: DEAL } }]);
});

test("planMoneyEdit: đơn trộn danh mục + nhập tay → tiền trước/sau cộng CẢ dịch vụ nhập tay (bài học Đợt E giữ nguyên)", () => {
  const r = planMoneyEdit(ctx({ services: [catalogSvc, manualSvc], storedPax: new Map([["svc-1", pax(2)], ["svc-m", pax(0)]]) }));
  assert.ok(r.ok && r.write, JSON.stringify(r));
  if (r.ok && r.write) assert.deepEqual([r.subtotalBefore, r.subtotalAfter], [2 * DEAL + 200_000, 3 * DEAL + 200_000]);
});

test("planMoneyEdit: GIẢM khách → cho ghi, tiền theo giá thoả thuận (KHÔNG chặn 'còn lại' âm — giữ hành vi trước bản vá, việc mở chưa quyết)", () => {
  const r = planMoneyEdit(ctx({ storedPax: new Map([["svc-1", pax(3)]]), body: { reason: "Khách huỷ bớt", services: [{ id: "svc-1", pax: pax(1) }] } }));
  assert.ok(r.ok && r.write, JSON.stringify(r));
  if (r.ok && r.write) assert.deepEqual([r.subtotalBefore, r.subtotalAfter], [3 * DEAL, 1 * DEAL]);
});

test("planMoneyEdit: thân sai dạng → invalid_input (giữ luật parseMoneyEditInput)", () => {
  const r = planMoneyEdit(ctx({ body: { reason: "x", services: [] } }));
  assert.ok(!r.ok && r.code === "invalid_input");
});

// ---- ADR-0114 D3 (cửa sửa số khách; MỘT luật cho đường văn phòng `money-edit` lẫn hướng dẫn viên `handler-money-edit`) -------------------------------
// Từ chối `thieu_nguoi_lon` CHỈ KHI tổng người đi kèm (người lớn + người cao tuổi) của CẢ ĐƠN — kể cả dịch vụ nhập tay — đi từ ≥ 1 xuống 0 qua lần sửa này.
const GIA_DINH: SubtotalServiceInput = {
  id: "svc-g", catalogCode: "TD101", name: "Tour 3 đảo", unit: "perPax",
  items: [
    { paxCode: "adult", catalogPrice: LIST, unitPrice: DEAL, lineTotal: DEAL },
    { paxCode: "child", catalogPrice: 595_000, unitPrice: 500_000, lineTotal: 500_000 },
    { paxCode: "senior", catalogPrice: LIST, unitPrice: DEAL, lineTotal: DEAL },
  ],
};
const khach = (adult: number, child = 0, senior = 0) => ({ ...ZERO, adult, child, senior });
const suaGiaDinh = (truoc: ReturnType<typeof khach>, sau: ReturnType<typeof khach>, over: Partial<Parameters<typeof planMoneyEdit>[0]> = {}) =>
  planMoneyEdit({
    services: [GIA_DINH], storedPax: new Map([["svc-g", truoc]]), latestAfter: null,
    body: { reason: "Khách bớt người", services: [{ id: "svc-g", pax: sau }] },
    ...over,
  });

test("D3: bớt người lớn cuối cùng (còn trẻ em) → từ chối thieu_nguoi_lon bằng câu cố định, không ghi", () => {
  const r = suaGiaDinh(khach(1, 1), khach(0, 1));
  assert.deepEqual(r, { ok: false, code: "thieu_nguoi_lon", message: CAU_THIEU_NGUOI_LON });
});

test("D3: đưa hết khách về 0 cũng là thieu_nguoi_lon (không phải lỗi dạng chung 'nhập số khách')", () => {
  const r = suaGiaDinh(khach(2), khach(0));
  assert.ok(!r.ok && r.code === "thieu_nguoi_lon", JSON.stringify(r));
});

test("D3: người cao tuổi tính là người đi kèm — đổi 1 người lớn thành 1 người cao tuổi qua; toàn người cao tuổi bớt còn 1 qua; bớt hết người cao tuổi bị từ chối", () => {
  assert.ok(suaGiaDinh(khach(1, 1), khach(0, 1, 1)).ok);
  assert.ok(suaGiaDinh(khach(0, 0, 3), khach(0, 0, 1)).ok);
  const r = suaGiaDinh(khach(0, 1, 2), khach(0, 1, 0));
  assert.ok(!r.ok && r.code === "thieu_nguoi_lon", JSON.stringify(r));
});

test("D3: đơn CŨ không có người lớn (trước ADR) — sửa không làm tệ hơn thì qua; chỉ chặn khi đưa từ ≥ 1 xuống 0", () => {
  const thuc = suaGiaDinh(khach(0, 2), khach(0, 3));
  assert.ok(thuc.ok && thuc.write, "tăng trẻ em trên đơn cũ 0 người lớn: qua");
  assert.ok(suaGiaDinh(khach(0, 2), khach(0, 1)).ok, "bớt trẻ em: qua");
  assert.ok(suaGiaDinh(khach(0, 2), khach(1, 2)).ok, "thêm người lớn: qua");
  assert.deepEqual(suaGiaDinh(khach(0, 2), khach(0, 2)), { ok: true, write: false }, "y nguyên: không ghi, không từ chối");
});

test("D3: tính trên CẢ ĐƠN — dịch vụ nhập tay có ô số khách (người lớn) giữ cho đơn không bị từ chối oan; không có thì bị từ chối", () => {
  const nhapTay = (adult: number) => ({ services: [GIA_DINH, manualSvc], storedPax: new Map([["svc-g", khach(1, 1)], ["svc-m", pax(adult)]]) });
  const body = { reason: "Khách bớt người", services: [{ id: "svc-g", pax: khach(0, 1) }] };
  const qua = planMoneyEdit(ctx({ ...nhapTay(1), body }));
  assert.ok(qua.ok && qua.write, `nhập tay còn 1 người lớn: ${JSON.stringify(qua)}`);
  const khong = planMoneyEdit(ctx({ ...nhapTay(0), body }));
  assert.ok(!khong.ok && khong.code === "thieu_nguoi_lon", `nhập tay 0 người: ${JSON.stringify(khong)}`);
});

test("D3: 'trước' là số HIỆN HÀNH (dòng điều chỉnh gần nhất), không phải số đã lưu — đã bớt còn 1 thì bớt nốt là bị từ chối; đã bớt từ 0 lên thì không", () => {
  const r = planMoneyEdit(ctx({ storedPax: new Map([["svc-1", pax(4)]]), latestAfter: [{ serviceId: "svc-1", pax: pax(1) }], body: { reason: "x", services: [{ id: "svc-1", pax: pax(0) }] } }));
  assert.ok(!r.ok && r.code === "thieu_nguoi_lon", JSON.stringify(r));
  const cu = suaGiaDinh(khach(4, 1), khach(2, 1), { latestAfter: [{ serviceId: "svc-g", pax: khach(0, 1) }] });
  assert.ok(cu.ok && cu.write, `lần sửa trước (trước ADR) đã để 0 người lớn, nay tăng lên: ${JSON.stringify(cu)}`);
});

test("phát lại dòng cũ KHÔNG có unitPrices (ghi trước bản vá) → tính theo đơn giá của order_item gốc, không phải giá niêm yết", () => {
  const after = parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: pax(3) }]));
  assert.equal(effectiveSubtotal([catalogSvc], after), 3 * DEAL);
});

test("MỘT nguồn đơn giá: unitPrices ghi trong after_json chỉ để truy vết — số đọc lại LUÔN theo order_item gốc, kể cả khi after_json ghi giá khác", () => {
  const after = parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: pax(3), unitPrices: { adult: 1 } }]));
  assert.deepEqual(after, [{ serviceId: "svc-1", pax: pax(3) }], "parseAdjustmentAfter không mang unitPrices ra ngoài");
  assert.equal(effectiveSubtotal([catalogSvc], after), 3 * DEAL);
});
