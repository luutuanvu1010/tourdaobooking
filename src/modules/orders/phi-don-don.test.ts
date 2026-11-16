// Phí đưa đón trên đơn (Đợt C, Task 3; ADR-0147 Đ1, ADR-0203): làm phẳng chặng → đầu vào của `pricing`, và dòng phí → dòng `order_item`.
// Phần thuần ở đây (không I/O). Phần ghi khi lập / lưu nháp / sửa chặng nháp và DTO `phiDuaDon` chạy CẢ ứng dụng ở `phi-don-don-route.test.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dongPhiThanhItem, lamPhangChang } from "./phi-don-don.ts";

const NGOAI = "NGOAI_VUNG";
const KS_CR = "loc-cr"; // khách sạn ở Bãi Dài – Cam Ranh
const KS_TT = "loc-tt"; // khách sạn ở trung tâm
const BEN = "loc-ben"; // bến tàu, chưa xếp vùng ⇒ view trả NGOAI_VUNG
const vung = new Map([[KS_CR, "CR"], [KS_TT, "TT"], [BEN, NGOAI]]);
const dv = (ref: string, adult: number, child = 0, senior = 0, catalogCode: string | null = "TOUR_LAN") => ({ ref, catalogCode, adult, child, senior });
const chang = (legKey: string, serviceRef: string, direction: "OUT" | "RETURN", pickupLocationId: string | null, dropoffLocationId: string | null, them: Partial<{ exclusive: boolean; paxOverride: number | null; closed: boolean }> = {}) =>
  ({ legKey, serviceRef, direction, pickupLocationId, dropoffLocationId, exclusive: false, paxOverride: null, closed: false, ...them });

test("chiều đi lấy vùng của NƠI ĐÓN, chiều về lấy vùng của NƠI TRẢ (đầu khách sạn — ADR-0147 Đ1)", () => {
  const kq = lamPhangChang({
    services: [dv("0", 2)],
    legs: [chang("0|0", "0", "OUT", KS_CR, BEN), chang("0|1", "0", "RETURN", BEN, KS_TT)],
    vung,
  });
  assert.deepEqual(kq.map((c) => [c.legKey, c.direction, c.zoneCode]), [["0|0", "OUT", "CR"], ["0|1", "RETURN", "TT"]]);
});

test("đầu khách sạn là chữ gõ tay hoặc để trống ⇒ NGOAI_VUNG; địa điểm không có trong bản đồ vùng ⇒ NGOAI_VUNG", () => {
  const kq = lamPhangChang({
    services: [dv("0", 1)],
    legs: [chang("a", "0", "OUT", null, BEN), chang("b", "0", "RETURN", BEN, null), chang("c", "0", "OUT", "loc-la", BEN)],
    vung,
  });
  assert.deepEqual(kq.map((c) => c.zoneCode), [NGOAI, NGOAI, NGOAI]);
});

test("chặng đã đóng bị bỏ (chỉ chặng còn mở sinh dòng phí)", () => {
  const kq = lamPhangChang({ services: [dv("0", 2)], legs: [chang("a", "0", "OUT", KS_CR, BEN, { closed: true }), chang("b", "0", "RETURN", BEN, KS_CR)], vung });
  assert.deepEqual(kq.map((c) => c.legKey), ["b"]);
});

test("số khách tính tiền = người lớn + trẻ em + người cao tuổi (em bé không tính): 2 NL + 1 em bé ⇒ 2", () => {
  const svc = { ref: "0", catalogCode: "TOUR_LAN", adult: 2, child: 0, senior: 0, infant: 1 };
  const [c] = lamPhangChang({ services: [svc], legs: [chang("a", "0", "OUT", KS_CR, BEN)], vung });
  assert.equal(c!.soKhachTinhTien, 2);
  const [d] = lamPhangChang({ services: [dv("0", 2, 1, 1)], legs: [chang("a", "0", "OUT", KS_CR, BEN)], vung });
  assert.equal(d!.soKhachTinhTien, 4);
});

test("mang theo xe riêng, số người chiều về, mã dịch vụ của chính dịch vụ chứa chặng", () => {
  const kq = lamPhangChang({
    services: [dv("0", 3), dv("1", 2, 0, 0, null)],
    legs: [chang("x", "1", "RETURN", BEN, KS_CR, { exclusive: true, paxOverride: 1 }), chang("y", "0", "OUT", KS_TT, BEN)],
    vung,
  });
  assert.deepEqual(kq, [
    { legKey: "x", zoneCode: "CR", direction: "RETURN", exclusive: true, catalogCode: null, soKhachTinhTien: 2, paxOverride: 1 },
    { legKey: "y", zoneCode: "TT", direction: "OUT", exclusive: false, catalogCode: "TOUR_LAN", soKhachTinhTien: 3, paxOverride: null },
  ]);
});

test("dòng phí → dòng order_item: mô tả «Phí đưa đón — chiều đi/về, <khu vực>», số lượng × đơn giá, bản chụp mức", () => {
  const d = { legKey: "0|0", ruleId: "r1", kind: "PER_PAX" as const, zoneCode: "CR", tierCode: null, donGia: 100_000, soLuong: 3, tien: 300_000, returnPax: null };
  assert.deepEqual(dongPhiThanhItem(d, "leg-1", "Bãi Dài – Cam Ranh", "OUT"), {
    legId: "leg-1", feeRuleId: "r1", feeKind: "PER_PAX", feeZoneCode: "CR", feeTierCode: null, feeReturnPax: null,
    description: "Phí đưa đón — chiều đi, Bãi Dài – Cam Ranh", quantity: 3, unitPrice: 100_000, lineTotal: 300_000,
  });
  const v = dongPhiThanhItem({ ...d, kind: "PER_TRIP", tierCode: "C1", donGia: 0, soLuong: 1, tien: 0, returnPax: 2 }, "leg-2", "Trung tâm", "RETURN");
  assert.equal(v.description, "Phí đưa đón — chiều về, Trung tâm");
  assert.deepEqual([v.feeKind, v.feeTierCode, v.feeReturnPax, v.quantity, v.unitPrice, v.lineTotal], ["PER_TRIP", "C1", 2, 1, 0, 0]);
});
