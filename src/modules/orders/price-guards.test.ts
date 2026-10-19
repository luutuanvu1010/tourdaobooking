// DK-T3-01 (kiểm toán 24/9; chủ dự án trả lời 2026-09-26): R1 dịch vụ nhập tay "đóng băng", R2 giá bán lẻ cho tài khoản Đối tác (các ca đầu tệp: CHỈ Đối tác),
// R3 trần giảm giá cấp đơn cho tài khoản Đối tác (hôm nay trần = 0: "tạm không cho giảm" tới khi có bảng mức chiết khấu).
// ADR-0100 (accepted 2026-10-03): R2/R3 áp cả cho tài khoản có quyền Thực tập (`chiGiaDanhMuc`: Đối tác HOẶC Thực tập; `giaDanhMucViolation`, `tranGiamGia`, cuối tệp), trần giảm giá
// của Thực tập là 0 riêng; tập con quyền ở src/shared/permissions.test.ts.
// ADR-0061 (accepted 2026-09-30) THU HẸP R1 — NỚI hàng rào đã duyệt (Điều 9.4; chủ duyệt ADR-0061 là duyệt việc nới, dòng R1 ở docs/SO-HANG-RAO.md): R1 nay
// chỉ áp khi công tắc nhập tay TẮT, với người không có ô `order.service.manual`, và LUÔN với tài khoản có quyền Đối tác (`duocNhapTay`, bảng ca dưới cùng).
// Các ca R1 "mọi tài khoản" cũ đổi thành ca của `manualFreezeViolation` (luật đóng băng giữ nguyên) + câu lỗi theo LÝ DO (ADR-0061 "Mã").
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERN_DISCOUNT_CAP, INTERN_PRICE_MESSAGE, NHAP_TAY_MESSAGE, PARTNER_DISCOUNT_CAP, PARTNER_DISCOUNT_MESSAGE, RETAIL_PRICE_MESSAGE, discountWithinCap, duocNhapTay, giaDanhMucViolation,
  holdsPartner, lyDoKhongNhapTay, manualFreezeViolation, retailPricesOnly, tranGiamGia, type FrozenStored,
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
    SALES: true, ACCOUNTING: true, ADMIN: true, FIELD: false, PARTNER: false, SUPER_ADMIN: true, INTERN: false, DRIVER: false, DRIVER_PARTNER: false, HR: false, // ADR-0071: Nhân sự không lập / sửa đơn
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

test("ADR-0061: MỌI tập con của 10 quyền (1024) — được nhập tay ⇔ công tắc bật && có một quyền nội bộ được phép && KHÔNG có PARTNER", () => {
  let n = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const perms = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const mong = perms.some((p) => NOI_BO_DUOC.has(p)) && !perms.includes("PARTNER");
    assert.equal(duocNhapTay(ai(...perms), true), mong, `${perms.join("+") || "(không quyền)"}, BẬT`);
    assert.equal(duocNhapTay(ai(...perms), false), false, `${perms.join("+") || "(không quyền)"}, TẮT`);
    n++;
  }
  assert.equal(n, 1024); // 10 mã (ADR-0071 thêm HR)
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

test("R3: trần Đối tác trên đơn không người hưởng = 0; câu lỗi tiếng Việt (Task 12: câu cũ «mức này chưa được thiết lập» không còn đúng từ Task 7)", () => {
  assert.equal(PARTNER_DISCOUNT_CAP, 0);
  assert.equal(
    PARTNER_DISCOUNT_MESSAGE,
    "Tài khoản đối tác không giảm giá được trên đơn này: chỉ đơn mà chính bạn được hưởng hoa hồng mới giảm được, tối đa bằng hoa hồng đó. Muốn giảm cho khách, nhờ văn phòng.",
  );
});

// ---- ADR-0100: Thực tập theo luật giá R2/R3 — `giaDanhMucViolation` (MỘT hàm cho ba cổng), trần riêng của Thực tập, câu báo theo quyền -------------------
const dung = [{ catalogPrice: 850000, unitPrice: 850000 }];
const lech = [{ catalogPrice: 850000, unitPrice: 849999 }];
const nhapTay = [{ catalogPrice: null, unitPrice: 400000 }]; // dòng nhập tay cũ: không có giá danh mục
const nguoi = (...permissions: PermissionCode[]) => ({ id: "u1", permissions });

test("ADR-0100 Đ3: câu báo của Thực tập đúng nguyên văn; Đối tác giữ nguyên hai câu cũ", () => {
  assert.equal(INTERN_PRICE_MESSAGE, "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác.");
  assert.equal(giaDanhMucViolation(nguoi("PARTNER"), lech, 0), RETAIL_PRICE_MESSAGE);
  assert.equal(giaDanhMucViolation(nguoi("PARTNER"), dung, 1), PARTNER_DISCOUNT_MESSAGE);
});

test("ADR-0100 Đ1: Thực tập (đứng một mình hoặc kèm quyền nội bộ) — dòng lệch giá, dòng nhập tay hoặc giảm giá > 0 đều bị chặn bằng câu của Thực tập; giá đúng + giảm 0 thì đạt", () => {
  for (const lai of [["INTERN"], ["INTERN", "SALES"], ["INTERN", "ADMIN"], ["SUPER_ADMIN", "INTERN"], ["FIELD", "INTERN"]] as PermissionCode[][]) {
    const tk = nguoi(...lai);
    const ten = lai.join("+");
    assert.equal(giaDanhMucViolation(tk, lech, 0), INTERN_PRICE_MESSAGE, `${ten}: đơn giá thấp hơn danh mục`);
    assert.equal(giaDanhMucViolation(tk, [{ catalogPrice: 850000, unitPrice: 850001 }], 0), INTERN_PRICE_MESSAGE, `${ten}: đơn giá cao hơn danh mục`);
    assert.equal(giaDanhMucViolation(tk, nhapTay, 0), INTERN_PRICE_MESSAGE, `${ten}: dòng nhập tay (không có giá danh mục)`);
    assert.equal(giaDanhMucViolation(tk, dung, 1), INTERN_PRICE_MESSAGE, `${ten}: giảm giá 1₫`);
    assert.equal(giaDanhMucViolation(tk, dung, 0), null, `${ten}: đúng giá danh mục, không giảm → đạt`);
    assert.equal(giaDanhMucViolation(tk, [], 0), null, `${ten}: không dòng nào`);
  }
});

test("ADR-0100 Đ3: tài khoản vừa Đối tác vừa Thực tập dùng câu của Đối tác (cả lỗi giá lẫn giảm giá)", () => {
  for (const lai of [["PARTNER", "INTERN"], ["PARTNER", "INTERN", "SALES"]] as PermissionCode[][]) {
    assert.equal(giaDanhMucViolation(nguoi(...lai), lech, 0), RETAIL_PRICE_MESSAGE, lai.join("+"));
    assert.equal(giaDanhMucViolation(nguoi(...lai), dung, 1), PARTNER_DISCOUNT_MESSAGE, lai.join("+"));
  }
});

test("ADR-0100: tài khoản KHÔNG bị áp (Bán hàng, Kế toán, Quản trị, Toàn quyền, HDV, Nhân sự, không quyền) không bị chặn giá hay giảm giá", () => {
  for (const lai of [["SALES"], ["ACCOUNTING"], ["ADMIN"], ["SUPER_ADMIN"], ["FIELD"], ["HR"], ["SALES", "FIELD"], []] as PermissionCode[][]) {
    assert.equal(giaDanhMucViolation(nguoi(...lai), lech, 500000), null, lai.join("+") || "(không quyền)");
    assert.equal(giaDanhMucViolation(nguoi(...lai), nhapTay, 500000), null, lai.join("+") || "(không quyền)");
  }
});

test("ADR-0100 Đ1: trần giảm giá của Thực tập luôn 0, KHÔNG đổi theo trần Đối tác; có cả hai quyền thì lấy số nhỏ hơn", () => {
  assert.equal(INTERN_DISCOUNT_CAP, 0);
  assert.equal(tranGiamGia(nguoi("PARTNER")), PARTNER_DISCOUNT_CAP);
  assert.equal(tranGiamGia(nguoi("INTERN")), 0);
  // Sau này có bảng chiết khấu và trần Đối tác > 0: Thực tập vẫn 0, Đối tác theo bảng, tài khoản có cả hai không vượt 0.
  assert.equal(tranGiamGia(nguoi("PARTNER"), 50000), 50000);
  assert.equal(tranGiamGia(nguoi("INTERN"), 50000), 0, "trần Đối tác không kéo theo Thực tập");
  assert.equal(tranGiamGia(nguoi("INTERN", "SALES"), 50000), 0);
  assert.equal(tranGiamGia(nguoi("PARTNER", "INTERN"), 50000), 0, "có quyền Thực tập thì không bao giờ được giảm hơn 0");
  assert.equal(giaDanhMucViolation(nguoi("PARTNER"), dung, 50000, 50000), null, "Đối tác giảm đúng bằng trần bảng → đạt");
  assert.equal(giaDanhMucViolation(nguoi("INTERN"), dung, 1, 50000), INTERN_PRICE_MESSAGE, "Thực tập giảm 1₫ dù trần Đối tác 50.000 → bị chặn");
  assert.equal(giaDanhMucViolation(nguoi("PARTNER", "INTERN"), dung, 1, 50000), PARTNER_DISCOUNT_MESSAGE, "có cả hai: số nhỏ hơn (0), câu của Đối tác");
  assert.equal(tranGiamGia(nguoi("SALES"), 50000), Number.POSITIVE_INFINITY, "tài khoản không bị áp: không có trần");
});

// ---- Sổ đại lý đợt 2, Task 7 (ADR-0079 điều 8, 9; C8 = A; đặc tả P7): trần giảm giá theo NGƯỜI HƯỞNG của đơn -----------------------------------------------
// Đơn CÓ người hưởng ⇒ trần = tổng hoa hồng của đơn, cho MỌI người sửa đơn (Bán hàng, Quản trị, Đối tác…); Thực tập vẫn 0. Đơn KHÔNG người hưởng ⇒ đúng luật hôm nay
// (Đối tác kể cả lai 0, Thực tập 0, còn lại không trần). Vế giá danh mục (R2) vẫn theo người thao tác — `viPhamGiaDanhMuc`.
import { CAU_BEN_DAT_KHONG_HUONG, CAU_TRAN_HOA_HONG, canhBaoGiamGiaDon, cauDoiBenDatVuotHoaHong, tranGiamGiaDon, viPhamGiaDanhMuc, viPhamTranGiamGia } from "./price-guards.ts";

const coHuong = (tongHoaHong: number, beneficiaryPartyId = "dla") => ({ coNguoiHuong: true, tongHoaHong, beneficiaryPartyId, benDatKhongHuong: false });
const khachLe = { coNguoiHuong: false, tongHoaHong: 0, beneficiaryPartyId: null, benDatKhongHuong: false };
/** Tài khoản giữ quyền Đối tác gắn hồ sơ `dla` — chính là người hưởng của đơn `coHuong(…)`. */
const cuaMinh = (...permissions: PermissionCode[]) => ({ ...nguoi(...permissions), partyId: "dla" });

test("Task 7 tranGiamGiaDon: có người hưởng ⇒ tổng hoa hồng (kể cả Đối tác); Thực tập 0; không người hưởng ⇒ Đối tác 0, Thực tập 0, còn lại null", () => {
  assert.equal(tranGiamGiaDon({ ...coHuong(790000), laDoiTac: false, laThucTap: false, nguoiHuongLaMinh: false }), 790000, "Bán hàng / Quản trị trên đơn đại lý");
  assert.equal(tranGiamGiaDon({ ...coHuong(790000), laDoiTac: true, laThucTap: false, nguoiHuongLaMinh: true }), 790000, "Đối tác trên đơn của chính mình");
  assert.equal(tranGiamGiaDon({ ...coHuong(790000), laDoiTac: true, laThucTap: false, nguoiHuongLaMinh: false }), PARTNER_DISCOUNT_CAP, "Đối tác (kể cả lai) trên đơn mà người hưởng là bên KHÁC ⇒ luật cũ (I-1)");
  assert.equal(tranGiamGiaDon({ ...coHuong(790000), laDoiTac: false, laThucTap: true, nguoiHuongLaMinh: false }), 0, "Thực tập trên đơn có người hưởng vẫn 0");
  assert.equal(tranGiamGiaDon({ ...coHuong(790000), laDoiTac: true, laThucTap: true, nguoiHuongLaMinh: false }), 0);
  assert.equal(tranGiamGiaDon({ ...coHuong(0), laDoiTac: false, laThucTap: false, nguoiHuongLaMinh: false }), 0, "đơn có người hưởng mà hoa hồng 0 (thiếu mức tính 0) ⇒ không giảm được");
  assert.equal(tranGiamGiaDon({ ...khachLe, laDoiTac: true, laThucTap: false, nguoiHuongLaMinh: false }), PARTNER_DISCOUNT_CAP);
  assert.equal(tranGiamGiaDon({ ...khachLe, laDoiTac: false, laThucTap: true, nguoiHuongLaMinh: false }), INTERN_DISCOUNT_CAP);
  assert.equal(tranGiamGiaDon({ ...khachLe, laDoiTac: false, laThucTap: false, nguoiHuongLaMinh: false }), null, "Bán hàng trên đơn khách lẻ: không trần");
});

test("Task 7: đơn KHÔNG người hưởng — tranGiamGiaDon trùng đúng luật hôm nay `tranGiamGia` cho MỌI tập con quyền (giữ vá DK-T3-01)", () => {
  const n = PERMISSION_CODES.length;
  for (let m = 0; m < 1 << n; m++) {
    const tk = nguoi(...PERMISSION_CODES.filter((_, i) => (m >> i) & 1));
    const cu = tranGiamGia(tk);
    const moi = tranGiamGiaDon({ ...khachLe, laDoiTac: holdsPartner(tk), laThucTap: tk.permissions.includes("INTERN"), nguoiHuongLaMinh: false });
    assert.equal(moi, cu === Number.POSITIVE_INFINITY ? null : cu, tk.permissions.join("+") || "(không quyền)");
  }
});

test("Task 7 C-5 (ADR-0079): hoa hồng 790.000 — giảm 800.000 ⇒ 400 «Giảm tối đa 790.000 ₫ (bằng hoa hồng của đơn).», giảm 790.000 ⇒ được; Bán hàng, Quản trị, Đối tác", () => {
  for (const tk of [nguoi("SALES"), nguoi("ADMIN"), cuaMinh("PARTNER"), cuaMinh("SALES", "PARTNER")]) {
    const ten = tk.permissions.join("+");
    assert.deepEqual(viPhamTranGiamGia(tk, 800000, coHuong(790000)), { status: 400, code: "discount_exceeds_commission", cau: "Giảm tối đa 790.000 ₫ (bằng hoa hồng của đơn)." }, ten);
    assert.equal(viPhamTranGiamGia(tk, 790000, coHuong(790000)), null, ten);
    assert.equal(viPhamTranGiamGia(tk, 0, coHuong(790000)), null, ten);
  }
  assert.equal(CAU_TRAN_HOA_HONG(790000), "Giảm tối đa 790.000 ₫ (bằng hoa hồng của đơn).");
});

test("Task 7 B-5: hoa hồng 100.000 — giảm 150.000 ⇒ từ chối, 20.000 ⇒ được", () => {
  assert.deepEqual(viPhamTranGiamGia(nguoi("SALES"), 150000, coHuong(100000)), { status: 400, code: "discount_exceeds_commission", cau: "Giảm tối đa 100.000 ₫ (bằng hoa hồng của đơn)." });
  assert.equal(viPhamTranGiamGia(nguoi("SALES"), 20000, coHuong(100000)), null);
  assert.equal(viPhamTranGiamGia(nguoi("SALES"), 100001, coHuong(100000))?.code, "discount_exceeds_commission", "vượt 1 ₫");
});

test("Task 7: Thực tập trên đơn có người hưởng ⇒ trần 0, câu của Thực tập (403); kèm Đối tác ⇒ câu của Đối tác", () => {
  for (const tk of [nguoi("INTERN"), nguoi("INTERN", "SALES"), nguoi("INTERN", "ADMIN")]) {
    assert.deepEqual(viPhamTranGiamGia(tk, 1, coHuong(790000)), { status: 403, code: "forbidden", cau: INTERN_PRICE_MESSAGE }, tk.permissions.join("+"));
    assert.equal(viPhamTranGiamGia(tk, 0, coHuong(790000)), null);
  }
  assert.deepEqual(viPhamTranGiamGia(nguoi("PARTNER", "INTERN"), 1, coHuong(790000)), { status: 403, code: "forbidden", cau: PARTNER_DISCOUNT_MESSAGE });
});

test("Task 7: đơn KHÔNG người hưởng giữ luật hôm nay — Đối tác (kể cả lai Bán hàng + Đối tác) 403 câu cũ; Bán hàng, Quản trị không trần", () => {
  for (const tk of [nguoi("PARTNER"), nguoi("SALES", "PARTNER"), nguoi("ADMIN", "PARTNER"), nguoi("PARTNER", "FIELD")]) {
    assert.deepEqual(viPhamTranGiamGia(tk, 1, khachLe), { status: 403, code: "forbidden", cau: PARTNER_DISCOUNT_MESSAGE }, tk.permissions.join("+"));
    assert.equal(viPhamTranGiamGia(tk, 0, khachLe), null);
  }
  assert.deepEqual(viPhamTranGiamGia(nguoi("INTERN"), 1, khachLe), { status: 403, code: "forbidden", cau: INTERN_PRICE_MESSAGE });
  for (const tk of [nguoi("SALES"), nguoi("ADMIN"), nguoi("SUPER_ADMIN"), nguoi("ACCOUNTING")]) assert.equal(viPhamTranGiamGia(tk, 5_000_000, khachLe), null, tk.permissions.join("+"));
});

test("Task 7: vế giá danh mục tách riêng, vẫn theo NGƯỜI THAO TÁC (không phụ thuộc người hưởng); giaDanhMucViolation cũ không đổi nghĩa", () => {
  assert.equal(viPhamGiaDanhMuc(nguoi("PARTNER"), lech), RETAIL_PRICE_MESSAGE);
  assert.equal(viPhamGiaDanhMuc(nguoi("INTERN"), lech), INTERN_PRICE_MESSAGE);
  assert.equal(viPhamGiaDanhMuc(nguoi("PARTNER"), dung), null);
  assert.equal(viPhamGiaDanhMuc(nguoi("SALES"), lech), null, "Bán hàng giá thoả thuận được (kể cả trên đơn đại lý)");
  assert.equal(viPhamGiaDanhMuc(nguoi("SALES"), nhapTay), null);
});

test("Task 7 sau xác nhận: canhBaoGiamGiaDon — giảm giá hiệu lực > hoa hồng ⇒ { vuot }, không chặn; bằng / nhỏ hơn / khách lẻ / thiếu mức ⇒ null", () => {
  assert.deepEqual(canhBaoGiamGiaDon({ coNguoiHuong: true, tongHoaHong: 500000, giamGiaHieuLuc: 790000 }), { vuot: 290000 });
  assert.equal(canhBaoGiamGiaDon({ coNguoiHuong: true, tongHoaHong: 790000, giamGiaHieuLuc: 790000 }), null);
  assert.equal(canhBaoGiamGiaDon({ coNguoiHuong: true, tongHoaHong: 800000, giamGiaHieuLuc: 790000 }), null);
  assert.equal(canhBaoGiamGiaDon({ coNguoiHuong: false, tongHoaHong: 0, giamGiaHieuLuc: 790000 }), null, "đơn khách lẻ: không cảnh báo theo hoa hồng");
  assert.equal(canhBaoGiamGiaDon({ coNguoiHuong: true, tongHoaHong: null, giamGiaHieuLuc: 790000 }), null, "còn dòng thiếu mức: không đoán số vượt (đơn đã bị giữ ở «Đã giao»)");
});

test("Task 7 đổi bên đặt sau xác nhận: bên đặt mới có người hưởng mà giảm giá > tổng hoa hồng mới ⇒ câu nêu hai số; bằng ⇒ null; khách lẻ ⇒ null", () => {
  assert.equal(
    cauDoiBenDatVuotHoaHong({ coNguoiHuong: true, tongHoaHong: 200000, giamGiaHieuLuc: 300000 }),
    "Đơn đang giảm giá 300.000 ₫, lớn hơn hoa hồng của bên đặt mới (200.000 ₫) — giảm giá trên đơn có người hưởng tối đa bằng hoa hồng của đơn, nên chưa đổi được bên đặt.",
  );
  assert.equal(cauDoiBenDatVuotHoaHong({ coNguoiHuong: true, tongHoaHong: 300000, giamGiaHieuLuc: 300000 }), null);
  assert.equal(cauDoiBenDatVuotHoaHong({ coNguoiHuong: false, tongHoaHong: 0, giamGiaHieuLuc: 300000 }), null);
});

test("Task 7 vòng sửa (I-1): Đối tác / tài khoản lai Bán hàng + Đối tác trên đơn mà văn phòng gắn đại lý KHÁC ⇒ luật cũ: 403 câu cũ, KHÔNG nêu số hoa hồng", () => {
  for (const tk of [nguoi("PARTNER"), nguoi("SALES", "PARTNER"), { ...nguoi("PARTNER"), partyId: "khac" }, { ...nguoi("ADMIN", "PARTNER"), partyId: "khac" }]) {
    const ten = tk.permissions.join("+");
    const v = viPhamTranGiamGia(tk, 790000, coHuong(790000));
    assert.deepEqual(v, { status: 403, code: "forbidden", cau: PARTNER_DISCOUNT_MESSAGE }, ten);
    assert.doesNotMatch(v!.cau, /790/, `${ten}: câu không lộ số hoa hồng của bên khác`);
    assert.equal(viPhamTranGiamGia(tk, 0, coHuong(790000)), null, ten);
  }
  assert.equal(viPhamTranGiamGia(cuaMinh("PARTNER"), 790000, coHuong(790000)), null, "chính người hưởng: trần = hoa hồng (ADR-0027 2b)");
});

test("Task 7 vòng sửa (M-1): bên đặt không còn được hưởng ⇒ câu riêng, không «Giảm tối đa 0 ₫»", () => {
  const khongHuong = { coNguoiHuong: true, tongHoaHong: 0, beneficiaryPartyId: "dla", benDatKhongHuong: true };
  assert.deepEqual(viPhamTranGiamGia(nguoi("SALES"), 1, khongHuong), { status: 400, code: "discount_exceeds_commission", cau: CAU_BEN_DAT_KHONG_HUONG });
  assert.equal(CAU_BEN_DAT_KHONG_HUONG, "Chưa giảm giá được: bên đặt không còn được hưởng hoa hồng — nhờ văn phòng sửa bên đặt hoặc Kế toán ghi mức.");
  assert.equal(viPhamTranGiamGia(nguoi("SALES"), 0, khongHuong), null);
});
