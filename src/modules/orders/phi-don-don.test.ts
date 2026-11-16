// Phí đưa đón trên đơn do văn phòng chọn (ADR-0214, Task 3): phần THUẦN ở phía orders — mức theo chặng (thân lưu nháp, hoặc mức đã lưu theo id chặng), chặng → dòng
// `order_item` loại phí (nguồn CHON), chặng mở chưa chọn ⇒ CHUA_CHON (không bao giờ 0 đồng), mô tả nhật ký khi mức đổi. Phần ghi chạy CẢ ứng dụng ở `phi-don-don-route.test.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mucDaLuuTheoChang, mucTheoThan, moTaPhiDonNhatKy, phiNhapChon, type DichVuChoPhi } from "./phi-don-don.ts";

const PAX = (adult: number, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const leg = (legKey: string, direction: "OUT" | "RETURN", them: Partial<{ exclusiveVehicle: boolean; paxOverride: number | null; closed: boolean }> = {}) => ({ legKey, direction, ...them });
const dv = (ref: string, pax: ReturnType<typeof PAX>, legs: DichVuChoPhi["legs"]): DichVuChoPhi => ({ ref, pax, legs });
const DS = (soTien: number) => ({ loai: "DANH_SACH" as const, soTien });
const SK = (soTien: number) => ({ loai: "SO_KHAC" as const, soTien });

test("SV-PC-01: 2 người lớn + 1 em bé, chiều đi 30.000 (danh sách) ⇒ một dòng CHON 30.000 × 2 = 60.000, không mã mức / vùng / cấp", () => {
  const p = phiNhapChon([dv("s1", PAX(2, 0, 0, 1), [leg("a", "OUT")])], new Map([["a", DS(30_000)]]));
  assert.equal(p.apDung, true);
  assert.equal(p.tong, 60_000);
  assert.deepEqual(p.thieu, []);
  assert.deepEqual(p.theoChang.get("a"), {
    feeSource: "CHON", feeChoice: "DANH_SACH", feeRuleId: null, feeKind: "PER_PAX", feeZoneCode: null, feeTierCode: null, feeReturnPax: null,
    description: "Phí đưa đón — chiều đi", quantity: 2, unitPrice: 30_000, lineTotal: 60_000,
  });
});

test("SV-PC-06 xe riêng: số khác 500.000 ⇒ PER_TRIP × 1; SV-PC-07 chiều về 1 người ⇒ min(1, 3), số người chiều về GỐC chụp vào fee_return_pax", () => {
  const p = phiNhapChon(
    [dv("s1", PAX(4), [leg("x", "OUT", { exclusiveVehicle: true })]), dv("s2", PAX(3), [leg("o", "OUT"), leg("r", "RETURN", { paxOverride: 1 })])],
    new Map([["x", SK(500_000)], ["o", DS(20_000)], ["r", DS(20_000)]]),
  );
  const x = p.theoChang.get("x")!;
  assert.deepEqual([x.feeKind, x.feeChoice, x.quantity, x.unitPrice, x.lineTotal, x.feeReturnPax], ["PER_TRIP", "SO_KHAC", 1, 500_000, 500_000, null]);
  const r = p.theoChang.get("r")!;
  assert.deepEqual([r.feeKind, r.quantity, r.lineTotal, r.feeReturnPax, r.description], ["PER_PAX", 1, 20_000, 1, "Phí đưa đón — chiều về"]);
  assert.equal(p.tong, 500_000 + 60_000 + 20_000);
});

test("chặng mở chưa có mức ⇒ CHUA_CHON (không dòng, không 0 đồng); chặng đã đóng bị bỏ; Miễn phí là mức rõ (dòng 0 đồng)", () => {
  const p = phiNhapChon(
    [dv("s1", PAX(2), [leg("a", "OUT"), leg("b", "RETURN"), leg("c", "OUT", { closed: true })]), dv("s2", PAX(1), [leg("d", "OUT")])],
    new Map([["a", DS(0)]]),
  );
  assert.deepEqual(p.thieu, [
    { legKey: "b", serviceRef: "s1", direction: "RETURN", zoneName: null, lyDo: "CHUA_CHON" },
    { legKey: "d", serviceRef: "s2", direction: "OUT", zoneName: null, lyDo: "CHUA_CHON" },
  ]);
  assert.deepEqual([...p.theoChang.keys()], ["a"]);
  assert.deepEqual([p.theoChang.get("a")!.unitPrice, p.theoChang.get("a")!.lineTotal], [0, 0]);
  assert.equal(p.tong, 0);
});

test("mức chọn nhưng không có khách tính tiền (toàn em bé) ⇒ không dòng, không thiếu", () => {
  const p = phiNhapChon([dv("s1", PAX(0, 0, 0, 2), [leg("a", "OUT")])], new Map([["a", DS(10_000)]]));
  assert.deepEqual([p.theoChang.size, p.thieu.length, p.tong], [0, 0, 0]);
});

test("mucTheoThan: khoá `phiDon` vắng ⇒ GIỮ mức đã lưu theo id chặng; null ⇒ bỏ chọn; có ⇒ mức thân; chặng mới không khoá ⇒ chưa chọn. Khoá theo vị trí «dịch vụ|chặng»", () => {
  const daLuu = new Map([["L1", DS(15_000)], ["L2", DS(20_000)], ["L3", SK(70_000)]]);
  const m = mucTheoThan(
    [{ legs: [{ id: "L1" }, { id: "L2", phiDon: null }, { id: "L3", phiDon: DS(50_000) }] }, { legs: [{ id: null }, { id: null, phiDon: SK(1) }] }],
    daLuu,
  );
  assert.deepEqual([...m.entries()], [["0|0", DS(15_000)], ["0|2", DS(50_000)], ["1|1", SK(1)]]);
});

test("mucDaLuuTheoChang: chỉ dòng do văn phòng chọn (có kiểu chọn) — dòng bảng phí cũ của Đợt C coi như chưa chọn", () => {
  const m = mucDaLuuTheoChang([
    { legId: "L1", loaiChon: "DANH_SACH", unitPrice: 15_000 },
    { legId: "L2", loaiChon: null, unitPrice: 100_000 },
    { legId: "L3", loaiChon: "SO_KHAC", unitPrice: 70_000 },
  ]);
  assert.deepEqual([...m.entries()], [["L1", DS(15_000)], ["L3", SK(70_000)]]);
});

test("moTaPhiDonNhatKy: chỉ ghi lượt đón có mức ĐỔI — chiều, tên dịch vụ, mức, kiểu chọn; không có gì đổi ⇒ null", () => {
  const dong = [
    { chieu: "OUT" as const, tenDichVu: "Tour lặn biển", cu: null, moi: DS(30_000) },
    { chieu: "RETURN" as const, tenDichVu: "Tour lặn biển", cu: DS(15_000), moi: DS(15_000) },
    { chieu: "RETURN" as const, tenDichVu: "Tour 3 đảo", cu: DS(10_000), moi: SK(70_000) },
    { chieu: "OUT" as const, tenDichVu: "Tour 3 đảo", cu: DS(5_000), moi: DS(0) },
    { chieu: "OUT" as const, tenDichVu: "Vé", cu: DS(5_000), moi: null },
  ];
  assert.equal(
    moTaPhiDonNhatKy(dong),
    "phí đưa đón chiều đi · Tour lặn biển: chưa chọn → 30.000 ₫ (trong danh sách); phí đưa đón chiều về · Tour 3 đảo: 10.000 ₫ (trong danh sách) → 70.000 ₫ (số khác); "
      + "phí đưa đón chiều đi · Tour 3 đảo: 5.000 ₫ (trong danh sách) → Miễn phí; phí đưa đón chiều đi · Vé: 5.000 ₫ (trong danh sách) → chưa chọn",
  );
  assert.equal(moTaPhiDonNhatKy([dong[1]!]), null);
});
