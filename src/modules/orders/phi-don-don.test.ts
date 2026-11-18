// Phí đưa đón trên đơn do MÁY TÍNH (ADR-0218, Task 8): phần THUẦN ở phía orders — đầu vào của hàm tính theo từng lượt, kết quả → dòng `order_item` nguồn mới (0179), lượt thiếu giá ⇒ THIEU
// (không bao giờ 0 đồng), số đổi của văn phòng giữ / bỏ / thay theo khoá lượt, câu nhật ký. Bài thay bài ADR-0214 (mức văn phòng chọn). Phần ghi chạy CẢ ứng dụng ở `phi-don-don-route.test.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { doiTayTheoThan, doiTayTuDong, dongPhiTuKetQua, luotDauVao, moTaPhiDonNhatKy, phiNhapMay, tomTatTuDongDaLuu, tomTatTuKetQua, type DichVuChoPhi, type KetQuaCoPhi } from "./phi-don-don.ts";
import { tinhPhiLuotDon, type BoiCanh } from "../pricing/phi-don-gia-goc-rules.ts";

const PAX = (adult: number, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const leg = (legKey: string, direction: "OUT" | "RETURN", them: Partial<{ exclusiveVehicle: boolean; paxOverride: number | null; closed: boolean; pickupDate: string | null }> = {}) => ({ legKey, direction, ...them });
const dv = (ref: string, pax: ReturnType<typeof PAX>, legs: DichVuChoPhi["legs"], catalogCode: string | null = "TOUR_A"): DichVuChoPhi => ({ ref, ten: `Dịch vụ ${ref}`, catalogCode, pax, legs });
const BOI: BoiCanh = {
  bookerPartyId: null, cap: { loai: "KHONG_CAP" }, mucGiam: null, chuongTrinh: [],
  giaGoc: new Map([["TOUR_A", { moiKhach: 50_000, xeRieng: 300_000 }], ["TOUR_C", { moiKhach: null, xeRieng: null }]]),
};
/** Đường tính của pricing (thuần) cho danh sách dịch vụ — thay `tinhPhiDonGiaGoc` (cần CSDL) trong bài thuần. */
function tinh(ds: DichVuChoPhi[], doiTay: ReadonlyMap<string, { donGia: number; lyDo: string; nguoi: string }> = new Map(), boi: BoiCanh = BOI) {
  const ketQua = new Map(luotDauVao(ds, doiTay).flatMap((l) => { const k = tinhPhiLuotDon(l, boi); return k ? [[l.luotKey, k] as const] : []; }));
  return phiNhapMay(ds, ketQua);
}

test("ADR-0218 / GG-02: 2 người lớn + 1 em bé đi chung, giá gốc 50.000, khách lẻ ⇒ một dòng GIA_GOC 50.000 × 2 = 100.000; fee_source, fee_choice, mã mức, vùng TRỐNG", () => {
  const p = tinh([dv("s1", PAX(2, 0, 0, 1), [leg("a", "OUT")])]);
  assert.equal(p.apDung, true);
  assert.equal(p.tong, 100_000);
  assert.deepEqual(p.thieu, []);
  assert.deepEqual(p.theoChang.get("a"), {
    feeSource: null, feeChoice: null, feeRuleId: null, feeKind: "PER_PAX", feeZoneCode: null, feeTierCode: null, feeReturnPax: null,
    description: "Phí đưa đón — chiều đi", quantity: 2, unitPrice: 50_000, lineTotal: 100_000,
    feeCalcSource: "GIA_GOC", feeBasePrice: 50_000, feeTierDiscount: 0, feeProgramId: null, feeProgramName: null, feeOverrideReason: null, feeOverrideBy: null,
  });
});

test("xe riêng ⇒ PER_TRIP × 1 giá gốc xe riêng; chiều về 1 người ⇒ min(1, 3) và số người chiều về GỐC chụp vào fee_return_pax; xe riêng không chụp fee_return_pax", () => {
  const p = tinh([dv("s1", PAX(4), [leg("x", "OUT", { exclusiveVehicle: true }), leg("xr", "RETURN", { exclusiveVehicle: true, paxOverride: 2 })]), dv("s2", PAX(3), [leg("o", "OUT"), leg("r", "RETURN", { paxOverride: 1 })])]);
  const x = p.theoChang.get("x")!;
  assert.deepEqual([x.feeKind, x.quantity, x.unitPrice, x.lineTotal, x.feeReturnPax], ["PER_TRIP", 1, 300_000, 300_000, null]);
  assert.equal(p.theoChang.get("xr")!.feeReturnPax, null);
  const r = p.theoChang.get("r")!;
  assert.deepEqual([r.feeKind, r.quantity, r.lineTotal, r.feeReturnPax, r.description], ["PER_PAX", 1, 50_000, 1, "Phí đưa đón — chiều về"]);
  assert.equal(p.tong, 300_000 + 300_000 + 150_000 + 50_000);
});

test("lượt mở thiếu giá ⇒ THIEU (không dòng, không 0 đồng): ô Sheet trống, dịch vụ nhập tay; lượt đã đóng bị bỏ; số khách tính tiền 0 ⇒ không dòng, không thiếu", () => {
  const p = tinh([dv("s1", PAX(2), [leg("a", "OUT"), leg("c", "OUT", { closed: true })], "TOUR_C"), dv("s2", PAX(1), [leg("d", "RETURN")], null), dv("s3", PAX(0, 0, 0, 2), [leg("e", "OUT")])]);
  assert.deepEqual(p.thieu, [
    { legKey: "a", serviceRef: "s1", tenDichVu: "Dịch vụ s1", direction: "OUT", lyDo: "O_TRONG" },
    { legKey: "d", serviceRef: "s2", tenDichVu: "Dịch vụ s2", direction: "RETURN", lyDo: "O_TRONG" },
  ]);
  assert.deepEqual([...p.theoChang.keys()], []);
  assert.equal(p.tong, 0);
});

test("dịch vụ nhập tay (không mã danh mục) + số đổi của văn phòng ⇒ có dòng DOI_TAY với lý do và người đổi; đổi về 0 vẫn là dòng 0 đồng", () => {
  const p = tinh([dv("s1", PAX(2), [leg("a", "OUT"), leg("b", "RETURN")], null)], new Map([["a", { donGia: 80_000, lyDo: "Khách ở xa", nguoi: "nv1" }], ["b", { donGia: 0, lyDo: "Giám đốc cho miễn", nguoi: "nv1" }]]));
  assert.deepEqual(p.thieu, []);
  const a = p.theoChang.get("a")!;
  assert.deepEqual([a.feeCalcSource, a.unitPrice, a.lineTotal, a.feeOverrideReason, a.feeOverrideBy, a.feeBasePrice, a.feeTierDiscount], ["DOI_TAY", 80_000, 160_000, "Khách ở xa", "nv1", null, null]);
  assert.deepEqual([p.theoChang.get("b")!.unitPrice, p.theoChang.get("b")!.lineTotal], [0, 0]);
});

test("chương trình miễn phí ⇒ dòng CHUONG_TRINH đơn giá 0 mang mã và tên chương trình; khớp theo ngày đón của lượt (nháp chưa ngày đón không khớp)", () => {
  const boi: BoiCanh = { ...BOI, chuongTrinh: [{ id: "P1", name: "Miễn phí đón tháng 12", scope: "ALL", tripFrom: "2026-12-01", tripTo: "2026-12-31", includePrivate: false, createdAt: "2026-11-01T00:00:00Z", services: [], parties: [] }] };
  const p = tinh([dv("s1", PAX(2), [leg("a", "OUT", { pickupDate: "2026-12-05" }), leg("b", "RETURN", { pickupDate: "2027-01-02" }), leg("c", "OUT", { pickupDate: null })])], new Map(), boi);
  const a = p.theoChang.get("a")!;
  assert.deepEqual([a.feeCalcSource, a.unitPrice, a.feeProgramId, a.feeProgramName, a.feeBasePrice], ["CHUONG_TRINH", 0, "P1", "Miễn phí đón tháng 12", null]);
  assert.equal(p.theoChang.get("b")!.feeCalcSource, "GIA_GOC");
  assert.equal(p.theoChang.get("c")!.feeCalcSource, "GIA_GOC");
});

test("doiTayTheoThan: khoá `doiPhi` vắng ⇒ GIỮ số đã lưu (kể cả người đổi gốc); null ⇒ bỏ; có ⇒ số thân do người lưu; cùng số cùng lý do ⇒ giữ người gốc; lượt mới không khoá ⇒ không số đổi", () => {
  const daLuu = new Map([["L1", { donGia: 15_000, lyDo: "Lý do 1", nguoi: "goc" }], ["L2", { donGia: 20_000, lyDo: "Lý do 2", nguoi: "goc" }], ["L3", { donGia: 70_000, lyDo: "Lý do 3", nguoi: "goc" }]]);
  const m = doiTayTheoThan(
    [{ legs: [{ id: "L1" }, { id: "L2", doiPhi: null }, { id: "L3", doiPhi: { donGia: 70_000, lyDo: "Lý do 3" } }] }, { legs: [{ id: null }, { id: null, doiPhi: { donGia: 1, lyDo: "mới" } }] }, { legs: [{ id: "L1", doiPhi: { donGia: 99, lyDo: "đổi" } }] }],
    daLuu, "nguoi-luu",
  );
  assert.deepEqual([...m.entries()], [
    ["0|0", { donGia: 15_000, lyDo: "Lý do 1", nguoi: "goc" }], ["0|2", { donGia: 70_000, lyDo: "Lý do 3", nguoi: "goc" }],
    ["1|1", { donGia: 1, lyDo: "mới", nguoi: "nguoi-luu" }], ["2|0", { donGia: 99, lyDo: "đổi", nguoi: "nguoi-luu" }],
  ]);
});

test("doiTayTuDong: chỉ dòng nguồn DOI_TAY mới thành số đổi; dòng GIA_GOC / CHUONG_TRINH / dòng cũ thì không", () => {
  const m = doiTayTuDong([
    { transfer_leg_id: "L1", fee_calc_source: "DOI_TAY", unit_price: 80_000, fee_override_reason: "x", fee_override_by: "nv1" },
    { transfer_leg_id: "L2", fee_calc_source: "GIA_GOC", unit_price: 50_000, fee_override_reason: null, fee_override_by: null },
    { transfer_leg_id: "L3", fee_calc_source: null, unit_price: 100_000, fee_override_reason: null, fee_override_by: null },
  ]);
  assert.deepEqual([...m.entries()], [["L1", { donGia: 80_000, lyDo: "x", nguoi: "nv1" }]]);
});

test("moTaPhiDonNhatKy: chỉ ghi lượt đón có phí ĐỔI — chiều, tên dịch vụ, số, nguồn, tên chương trình, lý do (che số dài); không đổi ⇒ null", () => {
  const gg = (donGia: number, soLuong: number) => ({ nguon: "GIA_GOC" as const, donGia, soLuong, tenChuongTrinh: null, lyDo: null });
  const dong = [
    { chieu: "OUT" as const, tenDichVu: "Tour lặn biển", cu: null, moi: gg(50_000, 2) },
    { chieu: "RETURN" as const, tenDichVu: "Tour lặn biển", cu: gg(30_000, 1), moi: gg(30_000, 1) },
    { chieu: "RETURN" as const, tenDichVu: "Tour 3 đảo", cu: gg(30_000, 2), moi: { nguon: "DOI_TAY" as const, donGia: 80_000, soLuong: 2, tenChuongTrinh: null, lyDo: "Khách quen gọi 0901234567" } },
    { chieu: "OUT" as const, tenDichVu: "Tour 3 đảo", cu: { nguon: "CU" as const, donGia: 5_000, soLuong: 2, tenChuongTrinh: null, lyDo: null }, moi: { nguon: "CHUONG_TRINH" as const, donGia: 0, soLuong: 2, tenChuongTrinh: "Miễn phí đón tháng 12", lyDo: null } },
  ];
  const s = moTaPhiDonNhatKy(dong)!;
  assert.match(s, /^phí đưa đón chiều đi · Tour lặn biển: chưa có → 50\.000 ₫ × 2 \(giá gốc\); /);
  assert.match(s, /phí đưa đón chiều về · Tour 3 đảo: 30\.000 ₫ × 2 \(giá gốc\) → 80\.000 ₫ × 2 \(đổi số: Khách quen gọi •+\)/);
  assert.doesNotMatch(s, /0901234567/);
  assert.match(s, /phí đưa đón chiều đi · Tour 3 đảo: 5\.000 ₫ × 2 \(dòng cũ\) → Miễn phí \(chương trình «Miễn phí đón tháng 12»\)$/);
  assert.equal(moTaPhiDonNhatKy([dong[1]!]), null);
});

test("tomTatTuKetQua / tomTatTuDongDaLuu: cùng một dòng cho hai đường đọc (kết quả tính và dòng đã lưu) ⇒ nhật ký không báo đổi khi không đổi gì", () => {
  const ds = [dv("s1", PAX(2), [leg("a", "OUT")])];
  const p = tinh(ds);
  const k = [...p.chiTiet.values()][0] as KetQuaCoPhi;
  const d = dongPhiTuKetQua(k, { direction: "OUT", xeRieng: false, paxOverride: null });
  const luu = tomTatTuDongDaLuu({ fee_calc_source: d.feeCalcSource, unit_price: d.unitPrice, quantity: d.quantity, fee_program_name: d.feeProgramName, fee_override_reason: d.feeOverrideReason });
  assert.equal(moTaPhiDonNhatKy([{ chieu: "OUT", tenDichVu: "x", cu: luu, moi: tomTatTuKetQua(k) }]), null);
});

test("lý do đổi phí (chữ văn phòng gõ) chỉ người có ô xem đặt gấp thấy: `anLyDoDoiPhi` (do `datGapTheoVai` gọi cho người khác — Đối tác, hướng dẫn viên, thực tập) bỏ `lyDoDoi`, dựng đối tượng mới", async () => {
  const { anLyDoDoiPhi } = await import("./phi-don-don.ts");
  const dongPhi = { id: "f", legId: "l", serviceId: "s", direction: "OUT", zoneCode: null, zoneName: null, loaiChon: null, nguon: "DOI_TAY", tenChuongTrinh: null, lyDoDoi: "Khách quen", kind: "PER_PAX", returnPax: null, quantity: 2, unitPrice: 1000, lineTotal: 2000, description: "x" } as const;
  const p = { dong: [dongPhi], thieu: [], duKien: false } as any;
  assert.equal(anLyDoDoiPhi(p)!.dong[0]!.lyDoDoi, null);
  assert.equal(p.dong[0].lyDoDoi, "Khách quen", "không sửa bản gốc");
  assert.equal(anLyDoDoiPhi(null), null);
});
