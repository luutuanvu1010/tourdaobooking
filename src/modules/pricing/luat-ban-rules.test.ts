// Luật thuần «luật bán theo loại đối tác» (ADR-0146 Đ2, ADR-0152 Đ2, Đ5; kế hoạch 2026-10-30 T4, R-1). Dữ liệu tự tạo: loại `L`, `L2`, nhóm `G`, đặc điểm `X` = {x1, x2, x3}.
// Tên trong chú thích (Lễ tân khách sạn, Hòn Tằm, «Vận chuyển cảng–đảo») chỉ là ví dụ của ca vàng — mã không biết loại, nhóm hay đặc điểm nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauBiChan, chanBan, kiemThanLuatBan, ngayKetThucLuat, type DichVuXet, type DongLuatBan } from "./luat-ban-rules.ts";

const HOM_NAY = "2026-10-30";
let n = 0;
const luat = (p: Partial<DongLuatBan> & Pick<DongLuatBan, "roleTypeCode" | "scope">): DongLuatBan => ({
  id: `l${++n}`, catalogCode: null, groupCode: null, attributeCode: null, valueCode: null, validFrom: "2026-10-01", validTo: null, ...p,
});
const dv = (code: string, nhom: string | null, giaTri: Record<string, string> = {}): DichVuXet => ({ code, nhom, giaTri: new Map(Object.entries(giaTri)) });
const bi = (r: ReturnType<typeof chanBan>) => [...new Set(r.map((t) => t.catalogCode))];

test("ADR-0146 tiêu chí 4 / CV-1: luật một dịch vụ chặn đúng dịch vụ đó; dịch vụ khác cùng nhóm đặt được; bên đặt loại khác đặt được", () => {
  const l = [luat({ roleTypeCode: "L", scope: "SERVICE", catalogCode: "A" })];
  const ds = [dv("A", "G"), dv("B", "G")];
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L"], luat: l, dichVu: ds, ngay: HOM_NAY })), ["A"]);
  assert.deepEqual(chanBan({ vaiBenDat: ["L2"], luat: l, dichVu: ds, ngay: HOM_NAY }), []);
});

test("CV-2: luật nhóm chặn mọi dịch vụ đang thuộc nhóm hiện hành; dịch vụ đã chuyển khỏi nhóm / Chưa phân loại thôi bị chặn", () => {
  const l = [luat({ roleTypeCode: "L", scope: "GROUP", groupCode: "G" })];
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L"], luat: l, dichVu: [dv("A", "G"), dv("B", "G"), dv("C", "H"), dv("D", null)], ngay: HOM_NAY })), ["A", "B"]);
});

test("ADR-0146 tiêu chí 7: hồ sơ mang hai loại, chỉ một có luật ⇒ bị chặn; không mang loại nào (hoặc không có bên đặt) ⇒ không bị chặn", () => {
  const l = [luat({ roleTypeCode: "L", scope: "SERVICE", catalogCode: "A" })];
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L2", "L"], luat: l, dichVu: [dv("A", null)], ngay: HOM_NAY })), ["A"]);
  assert.deepEqual(chanBan({ vaiBenDat: [], luat: l, dichVu: [dv("A", null)], ngay: HOM_NAY }), []);
});

test("ADR-0152 tiêu chí 8: luật ATTRIBUTE(X = x1) chặn dịch vụ mang x1, không chặn dịch vụ mang x2", () => {
  const l = [luat({ roleTypeCode: "L", scope: "ATTRIBUTE", attributeCode: "X", valueCode: "x1" })];
  const r = chanBan({ vaiBenDat: ["L"], luat: l, dichVu: [dv("A", "G", { X: "x1" }), dv("B", "G", { X: "x2" }), dv("C", "H", { X: "x1" })], ngay: HOM_NAY });
  assert.deepEqual(bi(r), ["A", "C"]);
  assert.deepEqual(r[0], { catalogCode: "A", luatId: l[0]!.id, roleTypeCode: "L", scope: "ATTRIBUTE", attributeCode: "X", valueCode: "x1" }, "trả mã đặc điểm + giá trị trúng (để lấy tên ở catalog)");
});

test("ADR-0152 tiêu chí 9: luật ATTRIBUTE(G, X = x1) — dịch vụ x1 NGOÀI G đặt được, trong G bị chặn", () => {
  const l = [luat({ roleTypeCode: "L", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x1" })];
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L"], luat: l, dichVu: [dv("A", "G", { X: "x1" }), dv("B", "H", { X: "x1" }), dv("C", null, { X: "x1" })], ngay: HOM_NAY })), ["A"]);
});

test("ADR-0152 tiêu chí 10 / CV-3: nhóm G có giá trị chung x1 (thừa hưởng), một vé đặt riêng x2 ⇒ vé đó đặt được, các vé còn lại của G bị chặn cho L (giá trị hiệu lực đến từ view)", () => {
  // Cả hai luật của ca vàng (Lễ tân khách sạn, Tài xế taxi) cùng phạm vi.
  const l = [luat({ roleTypeCode: "L", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x1" }),
    luat({ roleTypeCode: "L2", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x1" })];
  const ds = [dv("H1", "G", { X: "x2" }), dv("H2", "G", { X: "x1" }), dv("H3", "G", { X: "x1" }), dv("NGOAI", "K", { X: "x1" })];
  for (const vai of [["L"], ["L2"]]) assert.deepEqual(bi(chanBan({ vaiBenDat: vai, luat: l, dichVu: ds, ngay: HOM_NAY })), ["H2", "H3"], vai.join());
  assert.deepEqual(chanBan({ vaiBenDat: ["L3"], luat: l, dichVu: ds, ngay: HOM_NAY }), []);
});

test("ADR-0152 tiêu chí 10b / CV-4, CV-5 + R3-2: ba giá trị; L chặn x2, x3; L2 chặn x1; bên đặt mang cả L và L2 ⇒ chặn cả ba (cộng dồn, «chặn thắng»)", () => {
  const l = [
    luat({ roleTypeCode: "L", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x2" }),
    luat({ roleTypeCode: "L", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x3" }),
    luat({ roleTypeCode: "L2", scope: "ATTRIBUTE", groupCode: "G", attributeCode: "X", valueCode: "x1" }),
  ];
  const ds = [dv("V1", "G", { X: "x1" }), dv("V2", "G", { X: "x2" }), dv("V3", "G", { X: "x3" })];
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L"], luat: l, dichVu: ds, ngay: HOM_NAY })), ["V2", "V3"]);
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L2"], luat: l, dichVu: ds, ngay: HOM_NAY })), ["V1"]);
  assert.deepEqual(bi(chanBan({ vaiBenDat: ["L", "L2"], luat: l, dichVu: ds, ngay: HOM_NAY })), ["V1", "V2", "V3"]);
});

test("ADR-0152 tiêu chí 12 / CV-6: dịch vụ CHƯA KHAI đặc điểm (không có giá trị hiệu lực) không bị luật ATTRIBUTE phủ; luật đặc điểm khác không phủ", () => {
  const l = [luat({ roleTypeCode: "L", scope: "ATTRIBUTE", attributeCode: "X", valueCode: "x1" })];
  assert.deepEqual(chanBan({ vaiBenDat: ["L"], luat: l, dichVu: [dv("H9", null), dv("Y", "G", { Y: "x1" })], ngay: HOM_NAY }), []);
});

test("Hiệu lực R-1 (ADR-0146 tiêu chí 5, ADR-0152 12b ở mức thuần): kết thúc hôm qua ⇒ không chặn hôm nay; kết thúc hôm nay ⇒ còn chặn; luật tương lai chưa chặn; khoảng rỗng không bao giờ chặn", () => {
  const ca: [Partial<DongLuatBan>, boolean, string][] = [
    [{ validFrom: "2026-10-01", validTo: "2026-10-29" }, false, "kết thúc hôm qua"],
    [{ validFrom: "2026-10-01", validTo: "2026-10-30" }, true, "kết thúc hôm nay — còn chặn tới hết hôm nay"],
    [{ validFrom: "2026-10-30", validTo: null }, true, "bắt đầu hôm nay"],
    [{ validFrom: "2026-10-31", validTo: null }, false, "luật tương lai"],
    [{ validFrom: "2026-10-30", validTo: "2026-10-29" }, false, "khoảng rỗng"],
  ];
  for (const [p, chan, ten] of ca) {
    const r = chanBan({ vaiBenDat: ["L"], luat: [luat({ roleTypeCode: "L", scope: "SERVICE", catalogCode: "A", ...p })], dichVu: [dv("A", null)], ngay: HOM_NAY });
    assert.equal(r.length > 0, chan, ten);
  }
  for (const ngay of ["2026-10-29", "2026-10-30", "2026-10-31"]) {
    const r = chanBan({ vaiBenDat: ["L"], luat: [luat({ roleTypeCode: "L", scope: "SERVICE", catalogCode: "A", validFrom: "2026-10-30", validTo: "2026-10-29" })], dichVu: [dv("A", null)], ngay });
    assert.deepEqual(r, [], `khoảng rỗng ngày ${ngay}`);
  }
});

test("Không thứ tự ưu tiên: hai luật cùng trúng một dịch vụ ⇒ trả cả hai; thứ tự = thứ tự dòng đơn rồi thứ tự luật (câu báo dùng trúng đầu tiên)", () => {
  const l1 = luat({ roleTypeCode: "L", scope: "GROUP", groupCode: "G" });
  const l2 = luat({ roleTypeCode: "L", scope: "SERVICE", catalogCode: "B" });
  const r = chanBan({ vaiBenDat: ["L"], luat: [l1, l2], dichVu: [dv("B", "G"), dv("A", "G")], ngay: HOM_NAY });
  assert.deepEqual(r.map((t) => [t.catalogCode, t.luatId]), [["B", l1.id], ["B", l2.id], ["A", l1.id]]);
});

test("ngayKetThucLuat (R-1): «Kết thúc ngay» = max(hôm qua, bắt đầu − 1); hẹn ngày ≥ biên đó; sớm hơn hoặc sai dạng ⇒ câu lỗi", () => {
  assert.deepEqual(ngayKetThucLuat({ homNay: HOM_NAY, validFrom: "2026-10-23" }), { ok: true, value: "2026-10-29" }, "bắt đầu tuần trước ⇒ hôm qua");
  assert.deepEqual(ngayKetThucLuat({ homNay: HOM_NAY, validFrom: "2026-10-30" }), { ok: true, value: "2026-10-29" }, "bắt đầu hôm nay ⇒ bắt đầu − 1");
  assert.deepEqual(ngayKetThucLuat({ homNay: HOM_NAY, validFrom: "2026-11-06" }), { ok: true, value: "2026-11-05" }, "bắt đầu tuần sau ⇒ bắt đầu − 1");
  assert.deepEqual(ngayKetThucLuat({ homNay: HOM_NAY, validFrom: "2026-10-23", denNgay: "2026-11-15" }), { ok: true, value: "2026-11-15" }, "hẹn tương lai");
  assert.deepEqual(ngayKetThucLuat({ homNay: HOM_NAY, validFrom: "2026-10-23", denNgay: "2026-10-30" }), { ok: true, value: "2026-10-30" }, "hẹn hôm nay — còn chặn tới hết hôm nay");
  for (const [validFrom, denNgay] of [["2026-10-23", "2026-10-28"], ["2026-11-06", "2026-11-04"], ["2026-10-23", "30/10/2026"], ["2026-10-23", "2026-02-30"]] as const) {
    const r = ngayKetThucLuat({ homNay: HOM_NAY, validFrom, denNgay });
    assert.equal(r.ok, false, `${validFrom} → ${denNgay}`);
    if (!r.ok) assert.match(r.message, /ngày kết thúc/i);
  }
});

test("kiemThanLuatBan: ba kiểu phạm vi; mã đúng kiểu; ngày bắt đầu mặc định hôm nay, không trong quá khứ; ngày kết thúc ≥ ngày bắt đầu; ghi chú ≤ 200, không dãy số dài", () => {
  assert.deepEqual(kiemThanLuatBan({ loai: "L", phamVi: "SERVICE", catalogCode: "A1" }, HOM_NAY), {
    ok: true, value: { roleTypeCode: "L", scope: "SERVICE", catalogCode: "A1", groupCode: null, attributeCode: null, valueCode: null, validFrom: HOM_NAY, validTo: null, note: null },
  });
  assert.deepEqual(kiemThanLuatBan({ loai: "L", phamVi: "GROUP", groupCode: "G", tuNgay: "2026-11-01", denNgay: "2026-11-30", ghiChu: " Mùa cao điểm " }, HOM_NAY), {
    ok: true, value: { roleTypeCode: "L", scope: "GROUP", catalogCode: null, groupCode: "G", attributeCode: null, valueCode: null, validFrom: "2026-11-01", validTo: "2026-11-30", note: "Mùa cao điểm" },
  });
  const attr = kiemThanLuatBan({ loai: "L", phamVi: "ATTRIBUTE", attributeCode: "a0123456789ab", valueCode: "v0123456789ab", groupCode: "G" }, HOM_NAY);
  assert.ok(attr.ok && attr.value.groupCode === "G" && attr.value.attributeCode === "a0123456789ab" && attr.value.valueCode === "v0123456789ab", "ATTRIBUTE kèm nhóm tuỳ chọn");
  const attr2 = kiemThanLuatBan({ loai: "L", phamVi: "ATTRIBUTE", attributeCode: "a0123456789ab", valueCode: "v0123456789ab" }, HOM_NAY);
  assert.ok(attr2.ok && attr2.value.groupCode === null, "ATTRIBUTE không nhóm");
  const sai: [unknown, RegExp][] = [
    [null, /luật bán/],
    [{ phamVi: "SERVICE", catalogCode: "A1" }, /loại đối tác/],
    [{ loai: "L", phamVi: "ALL" }, /phạm vi/],
    [{ loai: "L", phamVi: "SERVICE" }, /phạm vi/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", groupCode: "G" }, /phạm vi/],
    [{ loai: "L", phamVi: "GROUP", groupCode: "G", attributeCode: "a0123456789ab", valueCode: "v0123456789ab" }, /phạm vi/],
    [{ loai: "L", phamVi: "ATTRIBUTE", attributeCode: "a0123456789ab" }, /phạm vi/],
    [{ loai: "L", phamVi: "ATTRIBUTE", attributeCode: "a0123456789ab", valueCode: "v0123456789ab", catalogCode: "A1" }, /phạm vi/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", tuNgay: "2026-10-29" }, /quá khứ/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", tuNgay: "2026-13-01" }, /Ngày bắt đầu/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", tuNgay: "2026-11-05", denNgay: "2026-11-04" }, /Ngày kết thúc/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", ghiChu: "x".repeat(201) }, /200/],
    [{ loai: "L", phamVi: "SERVICE", catalogCode: "A1", ghiChu: "Gọi 0901 234 567" }, /số điện thoại/],
  ];
  for (const [raw, loi] of sai) {
    const r = kiemThanLuatBan(raw, HOM_NAY);
    assert.equal(r.ok, false, JSON.stringify(raw));
    if (!r.ok) assert.match(r.message, loi, `${JSON.stringify(raw)} → ${r.message}`);
  }
});

test("cauBiChan: câu 409 tiếng Việt nêu tên dịch vụ; luật theo đặc điểm nêu thêm «(đặc điểm: giá trị)» — chữ lấy từ dữ liệu; không chữ «chính sách»", () => {
  assert.equal(cauBiChan({ tenDichVu: "Tour Hòn Tằm" }), "Dịch vụ «Tour Hòn Tằm» không bán cho loại đối tác của bên đặt này.");
  assert.equal(cauBiChan({ tenDichVu: "Tour Hòn Tằm", tenDacDiem: "Vận chuyển cảng–đảo", tenGiaTri: "Không gồm" }),
    "Dịch vụ «Tour Hòn Tằm» không bán cho loại đối tác của bên đặt này (Vận chuyển cảng–đảo: Không gồm).");
  assert.equal(cauBiChan({ tenDichVu: "Tour Hòn Tằm", tenDacDiem: "Vận chuyển cảng–đảo" }), "Dịch vụ «Tour Hòn Tằm» không bán cho loại đối tác của bên đặt này.", "thiếu tên giá trị ⇒ bỏ ngoặc");
  assert.doesNotMatch(cauBiChan({ tenDichVu: "x" }), /chính sách/i);
});
