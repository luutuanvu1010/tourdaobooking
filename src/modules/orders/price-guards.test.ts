// DK-T3-01 (kiểm toán 24/9; chủ dự án trả lời 2026-09-26): R1 dịch vụ nhập tay "đóng băng" (mọi tài khoản), R2 giá bán lẻ cho tài khoản CHỈ Đối tác,
// R3 trần giảm giá cấp đơn cho tài khoản CHỈ Đối tác (hôm nay trần = 0: "tạm không cho giảm" tới khi có bảng mức chiết khấu).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MANUAL_FROZEN_MESSAGE, PARTNER_DISCOUNT_CAP, PARTNER_DISCOUNT_MESSAGE, RETAIL_PRICE_MESSAGE, discountWithinCap, isPartnerOnly, manualFreezeViolation, retailPricesOnly,
  type FrozenStored,
} from "./price-guards.ts";

const trip = { departDate: "2026-10-01", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });
const line = (description: string, quantity: number, unitPrice: number, detail: string | null = null) =>
  ({ catalogCode: null, paxCode: null, description, detail, quantity, unitPrice, catalogPrice: null, lineTotal: quantity * unitPrice });
const manual = (id: string | null, name: string, items: ReturnType<typeof line>[], guests = 1) => ({ id, kind: "manual" as const, catalogCode: null, name, unit: "manual", pax: pax(guests), trip, items });
const catalog = (id: string | null) => ({
  id, kind: "catalog" as const, catalogCode: "TD101", name: "Tour", unit: "perPax", pax: pax(2), trip,
  items: [{ catalogCode: "TD101", paxCode: "adult" as const, description: "Người lớn", detail: null, quantity: 2, unitPrice: 800000, catalogPrice: 850000, lineTotal: 1600000 }],
});
const STORED: FrozenStored[] = [
  { id: "s-cat", catalogCode: "TD101", name: "Tour", lines: [{ description: "Người lớn", detail: null, quantity: 2, unitPrice: 800000 }] },
  { id: "s-man", catalogCode: null, name: "Xe đưa đón", lines: [{ description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice: 400000 }, { description: "Phí cầu", detail: null, quantity: 1, unitPrice: 20000 }] },
];
const keptManual = () => manual("s-man", "Xe đưa đón", [line("Xe 7 chỗ", 2, 400000, "2 chiều"), line("Phí cầu", 1, 20000)]);

test("R1: dịch vụ nhập tay MỚI (không id / đơn mới chưa có gì đã lưu) → vi phạm, câu lỗi chỉ đúng dịch vụ", () => {
  assert.equal(manualFreezeViolation([manual(null, "Xe", [line("Xe", 1, 1)])], []), `Dịch vụ 1: ${MANUAL_FROZEN_MESSAGE}`);
  assert.equal(manualFreezeViolation([catalog(null), manual(null, "Xe", [line("Xe", 1, 1)])], STORED), `Dịch vụ 2: ${MANUAL_FROZEN_MESSAGE}`);
});

test("R1: gửi lại NGUYÊN dịch vụ nhập tay đã lưu → không vi phạm; số khách + thông tin chuyến đổi vẫn được", () => {
  assert.equal(manualFreezeViolation([catalog("s-cat"), keptManual()], STORED), null);
  const moved = { ...keptManual(), pax: pax(9), trip: { ...trip, departDate: "2026-12-24", pickupPlace: "KS mới", note: "đổi" } };
  assert.equal(manualFreezeViolation([moved], STORED), null, "đổi ngày (một ngày cho cả đơn), số khách, điểm đón, ghi chú vẫn được");
});

test("R1: chỉ có dịch vụ danh mục, hoặc bỏ dịch vụ nhập tay khỏi đơn → không vi phạm", () => {
  assert.equal(manualFreezeViolation([catalog("s-cat")], STORED), null);
  assert.equal(manualFreezeViolation([catalog(null)], []), null);
});

test("R1: sửa tên / mô tả / chi tiết / số lượng / đơn giá / thêm-bớt dòng / đảo thứ tự dòng của dịch vụ nhập tay đã lưu → vi phạm", () => {
  const k = keptManual();
  const cases: [string, ReturnType<typeof manual>][] = [
    ["tên", { ...k, name: "Xe đưa đón VIP" }],
    ["mô tả", { ...k, items: [line("Xe 16 chỗ", 2, 400000, "2 chiều"), k.items[1]!] }],
    ["chi tiết", { ...k, items: [line("Xe 7 chỗ", 2, 400000, "1 chiều"), k.items[1]!] }],
    ["chi tiết bị xoá", { ...k, items: [line("Xe 7 chỗ", 2, 400000, null), k.items[1]!] }],
    ["số lượng", { ...k, items: [line("Xe 7 chỗ", 3, 400000, "2 chiều"), k.items[1]!] }],
    ["đơn giá", { ...k, items: [line("Xe 7 chỗ", 2, 1, "2 chiều"), k.items[1]!] }],
    ["thêm dòng", { ...k, items: [...k.items, line("Phụ phí", 1, 1)] }],
    ["bớt dòng", { ...k, items: [k.items[0]!] }],
    ["đảo thứ tự dòng", { ...k, items: [k.items[1]!, k.items[0]!] }],
  ];
  for (const [what, svc] of cases) assert.equal(manualFreezeViolation([catalog("s-cat"), svc], STORED), `Dịch vụ 2: ${MANUAL_FROZEN_MESSAGE}`, what);
});

test("R1: kind \"manual\" mượn id của dịch vụ DANH MỤC đã lưu, hoặc id không thuộc đơn → vi phạm", () => {
  assert.notEqual(manualFreezeViolation([{ ...keptManual(), id: "s-cat" }], STORED), null, "id của dịch vụ danh mục");
  assert.notEqual(manualFreezeViolation([{ ...keptManual(), id: "khac" }], STORED), null, "id lạ");
});

test("R1: chi tiết đã lưu là chuỗi rỗng (dòng cũ) so khớp với null gửi lên (và ngược lại); khoảng trắng hai đầu không tính", () => {
  const stored: FrozenStored[] = [{ id: "m", catalogCode: null, name: "Xe", lines: [{ description: "Xe", detail: "", quantity: 1, unitPrice: 5 }] }];
  assert.equal(manualFreezeViolation([manual("m", "Xe", [line("Xe", 1, 5, null)])], stored), null);
  const stored2: FrozenStored[] = [{ id: "m", catalogCode: null, name: " Xe ", lines: [{ description: "Xe ", detail: null, quantity: 1, unitPrice: 5 }] }];
  assert.equal(manualFreezeViolation([manual("m", "Xe", [line("Xe", 1, 5, "")])], stored2), null);
});

test("R1: câu lỗi đúng lời chủ dự án (tiếng Việt, chỉ cách làm tiếp)", () => {
  assert.equal(MANUAL_FROZEN_MESSAGE, "dịch vụ nhập tay đã ngừng — không thêm mới, không sửa tên hay giá. Muốn đổi, hãy xoá dịch vụ này rồi chọn dịch vụ từ danh mục.");
});

test("isPartnerOnly: mọi quyền đều là PARTNER (có ít nhất một quyền)", () => {
  assert.equal(isPartnerOnly({ permissions: ["PARTNER"] }), true);
  assert.equal(isPartnerOnly({ permissions: ["PARTNER", "PARTNER"] }), true);
  assert.equal(isPartnerOnly({ permissions: ["PARTNER", "SALES"] }), false);
  assert.equal(isPartnerOnly({ permissions: ["PARTNER", "FIELD"] }), false, "định nghĩa của điều phối viên: chỉ Đối tác = MỌI quyền là PARTNER");
  assert.equal(isPartnerOnly({ permissions: ["SALES"] }), false);
  assert.equal(isPartnerOnly({ permissions: ["INTERN"] }), false);
  assert.equal(isPartnerOnly({ permissions: [] }), false, "không quyền nào: không phải Đối tác (và cũng không lập được đơn)");
});

test("R2 retailPricesOnly: mọi dòng có giá danh mục và đơn giá = giá danh mục", () => {
  assert.equal(retailPricesOnly([{ catalogPrice: 850000, unitPrice: 850000 }, { catalogPrice: 0, unitPrice: 0 }]), true);
  assert.equal(retailPricesOnly([]), true);
  assert.equal(retailPricesOnly([{ catalogPrice: 850000, unitPrice: 849999 }]), false, "thấp hơn");
  assert.equal(retailPricesOnly([{ catalogPrice: 850000, unitPrice: 850001 }]), false, "cao hơn");
  assert.equal(retailPricesOnly([{ catalogPrice: 850000, unitPrice: 850000 }, { catalogPrice: null, unitPrice: 1 }]), false, "dòng nhập tay (không giá danh mục)");
});

test("R2: câu lỗi tiếng Việt", () => {
  assert.equal(RETAIL_PRICE_MESSAGE, "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng.");
});

test("R3 discountWithinCap: giảm giá cấp đơn ≤ trần (trần là THAM SỐ — hôm nay 0, sau này là mức chiết khấu Tour Đảo dành cho đối tác)", () => {
  assert.equal(discountWithinCap(0, 0), true, "trần 0: không giảm thì đạt");
  assert.equal(discountWithinCap(1, 0), false, "trần 0: giảm 1₫ cũng không đạt");
  assert.equal(discountWithinCap(50000, 50000), true, "trần 50.000: giảm đúng bằng trần thì đạt");
  assert.equal(discountWithinCap(50001, 50000), false, "trần 50.000: vượt 1₫ thì không đạt");
});

test("R3: trần hôm nay = 0 (chủ dự án 26/9 chọn \"Tạm không cho giảm\" — app chưa có bảng mức chiết khấu) và câu lỗi tiếng Việt", () => {
  assert.equal(PARTNER_DISCOUNT_CAP, 0);
  assert.equal(
    PARTNER_DISCOUNT_MESSAGE,
    "Tài khoản đối tác chưa được giảm giá: mức giảm tối đa bằng mức chiết khấu Tour Đảo dành cho đối tác, mà mức này chưa được thiết lập. Muốn giảm cho khách, nhờ văn phòng.",
  );
});
