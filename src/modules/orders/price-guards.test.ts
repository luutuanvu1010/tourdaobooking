// DK-T3-01 (kiểm toán 24/9; chủ dự án trả lời 2026-09-26): R1 dịch vụ nhập tay "đóng băng", R2 giá bán lẻ cho tài khoản CHỈ Đối tác,
// R3 trần giảm giá cấp đơn cho tài khoản CHỈ Đối tác (hôm nay trần = 0: "tạm không cho giảm" tới khi có bảng mức chiết khấu).
// ADR-0061 (accepted 2026-09-30) THU HẸP R1 — NỚI hàng rào đã duyệt (Điều 9.4; chủ duyệt ADR-0061 là duyệt việc nới, dòng R1 ở docs/SO-HANG-RAO.md): R1 nay
// chỉ áp khi công tắc nhập tay TẮT, với người không có ô `order.service.manual`, và LUÔN với tài khoản có quyền Đối tác (`duocNhapTay`, bảng ca dưới cùng).
// Các ca R1 "mọi tài khoản" cũ đổi thành ca của `manualFreezeViolation` (luật đóng băng giữ nguyên) + câu lỗi theo LÝ DO (ADR-0061 "Mã").
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NHAP_TAY_MESSAGE, PARTNER_DISCOUNT_CAP, PARTNER_DISCOUNT_MESSAGE, RETAIL_PRICE_MESSAGE, discountWithinCap, duocNhapTay, holdsPartner, lyDoKhongNhapTay, manualFreezeViolation,
  retailPricesOnly, type FrozenStored,
} from "./price-guards.ts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";

const MANUAL_FROZEN_MESSAGE = NHAP_TAY_MESSAGE.tat; // lý do mặc định của manualFreezeViolation (công tắc TẮT)

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

test("R1 (ADR-0061): câu lỗi nói rõ LÝ DO (công tắc tắt / tài khoản không được nhập tay / tài khoản Đối tác), tiếng Việt, chỉ cách làm tiếp", () => {
  const TIEP = " — không thêm mới, không sửa tên hay giá. Muốn đổi, hãy xoá dịch vụ này rồi chọn dịch vụ từ danh mục.";
  assert.deepEqual(NHAP_TAY_MESSAGE, {
    tat: `dịch vụ nhập tay đang tắt${TIEP}`,
    khong_o: `tài khoản này không được dùng dịch vụ nhập tay${TIEP}`,
    doi_tac: `tài khoản có quyền Đối tác không dùng được dịch vụ nhập tay${TIEP}`,
  });
  const moi = [manual(null, "Xe", [line("Xe", 1, 1)])];
  assert.equal(manualFreezeViolation(moi, [], "khong_o"), `Dịch vụ 1: ${NHAP_TAY_MESSAGE.khong_o}`);
  assert.equal(manualFreezeViolation(moi, [], "doi_tac"), `Dịch vụ 1: ${NHAP_TAY_MESSAGE.doi_tac}`);
});

// ---- ADR-0061: MỘT hàm quyết "được nhập tay" = công tắc bật && can(order.service.manual) && !holdsPartner — Đối tác kiểm TRƯỚC -------------------
// Kỳ vọng VIẾT TAY từ bảng quyền của ADR-0061 (không suy từ can()/MATRIX — suy thì bài không chứng minh gì).
const NOI_BO_DUOC = new Set<PermissionCode>(["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"]);
const ai = (...permissions: PermissionCode[]) => ({ id: "u1", permissions });

test("ADR-0061 bảng quyền: công tắc BẬT — chỉ Bán hàng, Kế toán, Quản trị, Toàn quyền; HDV, Đối tác, Thực tập, Tài xế, Tài xế đối tác KHÔNG", () => {
  const bat: Record<PermissionCode, boolean> = {
    SALES: true, ACCOUNTING: true, ADMIN: true, FIELD: false, PARTNER: false, SUPER_ADMIN: true, INTERN: false, DRIVER: false, DRIVER_PARTNER: false,
  };
  for (const p of PERMISSION_CODES) assert.equal(duocNhapTay(ai(p), true), bat[p], `${p}, công tắc BẬT`);
});

test("ADR-0061: công tắc TẮT — KHÔNG ai được, kể cả Toàn quyền (tiêu chí 1)", () => {
  for (const p of PERMISSION_CODES) assert.equal(duocNhapTay(ai(p), false), false, `${p}, công tắc TẮT`);
});

test("ADR-0061: tài khoản LAI có quyền Đối tác luôn bị chặn, dù ô của quyền kia = any (SALES+PARTNER, PARTNER+FIELD, ADMIN+PARTNER, SUPER_ADMIN+PARTNER)", () => {
  for (const lai of [["SALES", "PARTNER"], ["PARTNER", "FIELD"], ["ADMIN", "PARTNER"], ["SUPER_ADMIN", "PARTNER"], ["ACCOUNTING", "PARTNER"]] as PermissionCode[][]) {
    assert.equal(duocNhapTay(ai(...lai), true), false, `${lai.join("+")}, công tắc BẬT`);
    assert.equal(lyDoKhongNhapTay(ai(...lai), true), "doi_tac", `${lai.join("+")}: lý do là Đối tác`);
  }
  assert.equal(duocNhapTay(ai("SALES", "FIELD"), true), true, "đối chứng: lai nội bộ SALES+FIELD vẫn được");
  assert.equal(duocNhapTay(ai("FIELD", "INTERN"), true), false, "đối chứng: FIELD+INTERN không có ô");
});

test("ADR-0061: thứ tự lý do — Đối tác TRƯỚC công tắc, công tắc TRƯỚC ô", () => {
  assert.equal(lyDoKhongNhapTay(ai("PARTNER"), false), "doi_tac", "Đối tác, công tắc tắt → vẫn là lý do Đối tác");
  assert.equal(lyDoKhongNhapTay(ai("INTERN"), false), "tat", "không có ô, công tắc tắt → lý do công tắc");
  assert.equal(lyDoKhongNhapTay(ai("INTERN"), true), "khong_o");
  assert.equal(lyDoKhongNhapTay(ai("SALES"), true), null);
});

test("ADR-0061: MỌI tập con của 9 quyền (512) — được nhập tay ⇔ công tắc bật && có một quyền nội bộ được phép && KHÔNG có PARTNER", () => {
  let n = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const perms = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const mong = perms.some((p) => NOI_BO_DUOC.has(p)) && !perms.includes("PARTNER");
    assert.equal(duocNhapTay(ai(...perms), true), mong, `${perms.join("+") || "(không quyền)"}, BẬT`);
    assert.equal(duocNhapTay(ai(...perms), false), false, `${perms.join("+") || "(không quyền)"}, TẮT`);
    n++;
  }
  assert.equal(n, 512);
});

test("holdsPartner: CÓ quyền PARTNER là áp luật giá Đối tác, kể cả khi kèm quyền khác (chủ dự án chốt 2026-09-26)", () => {
  assert.equal(holdsPartner({ permissions: ["PARTNER"] }), true);
  assert.equal(holdsPartner({ permissions: ["PARTNER", "SALES"] }), true, "Đối tác bị gán thêm quyền nội bộ qua màn quản lý cũ vẫn theo luật giá Đối tác");
  assert.equal(holdsPartner({ permissions: ["PARTNER", "FIELD"] }), true, "đường lách người kiểm độc lập chứng minh 26/9: PARTNER+FIELD lập đơn 1đ → 201");
  assert.equal(holdsPartner({ permissions: ["SALES"] }), false);
  assert.equal(holdsPartner({ permissions: ["INTERN"] }), false);
  assert.equal(holdsPartner({ permissions: ["SUPER_ADMIN"] }), false);
  assert.equal(holdsPartner({ permissions: [] }), false);
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
