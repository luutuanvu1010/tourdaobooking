import { test } from "node:test";
import assert from "node:assert/strict";
import type { CompanyDto, OrderDetailDto, OrderItemDto, OrderServiceDto, OrderStatus } from "./contracts.ts";
import { buildConfirmation, type ConfirmationBlock, type ConfirmationModel } from "./order-confirmation.ts";

// ---- dữ liệu mẫu: đúng hình dạng OrderDetailDto (id/mã nội bộ có tên riêng để phép thử "không lộ" không đúng/sai do trùng chữ) ----
const NO_TRIP = { departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
const FULL_TRIP = {
  departDate: "2026-09-25", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise",
  checkinDate: "2026-09-25", checkinTime: "06:45", checkinPlace: "Bến Cầu Đá", note: "GHI-CHU-NOI-BO: khách đi xe lăn, báo tài xế",
};
const COMPANY: CompanyDto = {
  name: "CÔNG TY TNHH TOUR ĐẢO", taxCode: "4201969169", hotline: "0845 256 256", email: "Tourdaotravel@gmail.com",
  address: "19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà",
};
const item = (o: Partial<OrderItemDto> = {}): OrderItemDto => ({
  id: "item_INTERNAL_1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo Nha Trang — Người lớn", detail: null,
  quantity: 2, unitPrice: 1350000, catalogPrice: 1350000, lineTotal: 2700000, ...o,
});
// Trẻ em: đơn giá thương lượng 900.000 thấp hơn giá danh mục 950.000 → giao diện trong nhà có nhãn "khác giá danh mục", ảnh gửi khách thì KHÔNG.
const childItem = (): OrderItemDto =>
  item({ id: "item_INTERNAL_2", paxCode: "child", description: "Tour 4 đảo Nha Trang — Trẻ em", detail: "Trẻ 5–10 tuổi", quantity: 1, unitPrice: 900000, catalogPrice: 950000, lineTotal: 900000 });
const svc = (o: Partial<OrderServiceDto> = {}): OrderServiceDto => ({
  id: "svc_INTERNAL_1", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
  items: [item(), childItem()], catalogStatus: "price_changed", ...FULL_TRIP, ...o,
});
const order = (o: Partial<OrderDetailDto> = {}): OrderDetailDto => ({
  id: "ord_INTERNAL", orderCode: "TD-20260921-0007", staffId: "stf_INTERNAL", staffName: "Nguyễn Thu Hà", status: "draft",
  customerName: "Trần Văn Bình", customerPhone: "0901234567", customerEmail: "binh.tran@example.com", customerNote: "Cả nhà ăn chay, xin xếp ghế gần nhau",
  subtotal: 3600000, discount: 100000, total: 3500000, depositAmount: 1000000, depositMethod: "cash", remainingAmount: 2500000,
  paymentNote: "PAYMENT-NOTE-NOI-BO: cọc qua Vietcombank", createdAt: "2026-09-20T18:30:00.000Z", updatedAt: "2026-09-20T18:35:00.000Z", confirmedAt: null,
  services: [svc()], ...o,
});

// ---- tiện ích đọc mô hình ----
type Kind = ConfirmationBlock["kind"];
const blocksOf = <K extends Kind>(m: ConfirmationModel, kind: K): Extract<ConfirmationBlock, { kind: K }>[] =>
  m.blocks.filter((b): b is Extract<ConfirmationBlock, { kind: K }> => b.kind === kind);
function one<K extends Kind>(m: ConfirmationModel, kind: K): Extract<ConfirmationBlock, { kind: K }> {
  const all = blocksOf(m, kind);
  assert.equal(all.length, 1, `phải có đúng một khối "${kind}"`);
  return all[0]!;
}
const build = (o: OrderDetailDto, handler: string | null = "Lê Minh Tuấn", company: CompanyDto = COMPANY): ConfirmationModel => buildConfirmation(o, company, handler);
/** Giá trị của dòng nhãn/giá trị có nhãn `label` (undefined = không có dòng đó). */
const value = (rows: { label: string; value: string }[], label: string): string | undefined => rows.find((r) => r.label === label)?.value;
const details = (s: OrderServiceDto): { label: string; value: string }[] => one(build(order({ services: [s] })), "service").details;

test("đủ trường: khối theo thứ tự đầu trang → tiêu đề → khách → dịch vụ → tổng kết → chân trang, chữ đã định dạng sẵn", () => {
  const m = build(order());
  assert.deepEqual(m.blocks.map((b) => b.kind), ["header", "title", "customer", "service", "summary", "footer"]);
  assert.equal(m.orderCode, "TD-20260921-0007");
  assert.equal(m.fileName, "xac-nhan-TD-20260921-0007.png");
  assert.deepEqual(m.blocks, [
    { kind: "header", companyName: "CÔNG TY TNHH TOUR ĐẢO", lines: ["MST: 4201969169", COMPANY.address, "Hotline: 0845 256 256 · Email: Tourdaotravel@gmail.com"] },
    {
      kind: "title", title: "XÁC NHẬN ĐƠN DỊCH VỤ", status: { code: "draft", text: "Chờ xác nhận" },
      rows: [{ label: "Mã đơn", value: "TD-20260921-0007" }, { label: "Ngày lập", value: "21/09/2026" }, { label: "Nhân viên phụ trách", value: "Lê Minh Tuấn" }],
    },
    {
      kind: "customer", heading: "Thông tin khách hàng",
      rows: [
        { label: "Họ tên", value: "Trần Văn Bình" }, { label: "Số điện thoại", value: "0901234567" },
        { label: "Email", value: "binh.tran@example.com" }, { label: "Ghi chú / yêu cầu", value: "Cả nhà ăn chay, xin xếp ghế gần nhau" },
      ],
    },
    {
      kind: "service", index: 1, name: "Tour 4 đảo Nha Trang",
      details: [
        { label: "Số khách", value: "2 người lớn, 1 trẻ em" }, { label: "Khởi hành", value: "25/09/2026 · 07:30" },
        { label: "Đón khách", value: "07:00 · Khách sạn Sunrise" }, { label: "Check-in", value: "25/09/2026 · 06:45 · Bến Cầu Đá" },
      ],
      columns: { description: "Mô tả", quantity: "SL", unitPrice: "Đơn giá", lineTotal: "Thành tiền" },
      lines: [
        { description: "Tour 4 đảo Nha Trang — Người lớn", detail: null, quantity: "2", unitPrice: "1.350.000 ₫", lineTotal: "2.700.000 ₫" },
        { description: "Tour 4 đảo Nha Trang — Trẻ em", detail: "Trẻ 5–10 tuổi", quantity: "1", unitPrice: "900.000 ₫", lineTotal: "900.000 ₫" },
      ],
      subtotal: { label: "Cộng dịch vụ", value: "3.600.000 ₫" },
    },
    {
      kind: "summary",
      rows: [
        { label: "Tạm tính", value: "3.600.000 ₫", emphasis: false }, { label: "Giảm giá", value: "-100.000 ₫", emphasis: false },
        { label: "Tổng cộng", value: "3.500.000 ₫", emphasis: true }, { label: "Đã cọc", value: "1.000.000 ₫", emphasis: false },
        { label: "Còn lại", value: "2.500.000 ₫", emphasis: true },
      ],
    },
    { kind: "footer", lines: ["Cảm ơn quý khách đã tin tưởng và lựa chọn dịch vụ của chúng tôi.", "Cần hỗ trợ, quý khách vui lòng liên hệ hotline 0845 256 256."] },
  ]);
});

test("dòng rỗng bị ẩn: không email/ghi chú của khách, không giờ đón, không check-in, không ngày khởi hành", () => {
  const m = build(order({ customerEmail: null, customerNote: null, services: [svc({ ...NO_TRIP })] }));
  assert.deepEqual(one(m, "customer").rows.map((r) => r.label), ["Họ tên", "Số điện thoại"]);
  assert.deepEqual(one(m, "service").details.map((d) => d.label), ["Số khách"]);
  // chuỗi chỉ có khoảng trắng cũng coi là rỗng
  assert.deepEqual(one(build(order({ customerEmail: "   ", customerNote: " \n " })), "customer").rows.map((r) => r.label), ["Họ tên", "Số điện thoại"]);
});

test("chân trang/đầu trang: công ty không email → không dòng Email; không hotline → không dòng liên hệ; không MST → không dòng MST", () => {
  const bare: CompanyDto = { ...COMPANY, email: null };
  assert.deepEqual(one(build(order(), null, bare), "header").lines, ["MST: 4201969169", COMPANY.address, "Hotline: 0845 256 256"]);
  const noHotline: CompanyDto = { ...COMPANY, hotline: "", taxCode: "", email: null };
  const m = build(order(), null, noHotline);
  assert.deepEqual(one(m, "header").lines, [COMPANY.address]);
  assert.deepEqual(one(m, "footer").lines, ["Cảm ơn quý khách đã tin tưởng và lựa chọn dịch vụ của chúng tôi."]);
});

test("thông tin chuyến: từng mảnh vắng thì dòng rút gọn; chỉ ẩn dòng khi mọi mảnh của nó đều vắng", () => {
  assert.equal(value(details(svc({ ...NO_TRIP, pickupTime: "07:00" })), "Đón khách"), "07:00");
  assert.equal(value(details(svc({ ...NO_TRIP, pickupPlace: "Bến Cầu Đá" })), "Đón khách"), "Bến Cầu Đá");
  assert.equal(value(details(svc({ ...NO_TRIP, departDate: "2026-09-25" })), "Khởi hành"), "25/09/2026");
  assert.equal(value(details(svc({ ...NO_TRIP, departTime: "07:30" })), "Khởi hành"), "07:30");
  assert.equal(value(details(svc({ ...NO_TRIP })), "Khởi hành"), undefined);
  assert.equal(value(details(svc({ ...NO_TRIP })), "Đón khách"), undefined);
});

test("check-in: chỉ ẩn khi cả ngày, giờ và nơi đều vắng; vắng ngày = 'Cùng ngày khởi hành' (như trang đơn)", () => {
  assert.equal(value(details(svc({ ...NO_TRIP })), "Check-in"), undefined);
  assert.equal(value(details(svc({ ...NO_TRIP, checkinTime: "09:00" })), "Check-in"), "Cùng ngày khởi hành · 09:00");
  assert.equal(value(details(svc({ ...NO_TRIP, checkinPlace: "Bến Cầu Đá" })), "Check-in"), "Cùng ngày khởi hành · Bến Cầu Đá");
  assert.equal(value(details(svc({ ...NO_TRIP, checkinDate: "2026-09-26", checkinTime: "09:00" })), "Check-in"), "26/09/2026 · 09:00");
});

test("nhiều dịch vụ: mỗi dịch vụ một khối đánh số từ 1; tổng dịch vụ chỉ hiện khi dịch vụ có từ hai dòng tiền trở lên", () => {
  const manual = svc({
    id: "svc_INTERNAL_2", kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogStatus: null, ...NO_TRIP,
    items: [item({ id: "item_INTERNAL_3", catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", detail: "Cả đoàn", quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 })],
  });
  const m = build(order({ services: [svc(), manual, svc({ id: "svc_INTERNAL_3", name: "Lặn biển", ...NO_TRIP })] }));
  const services = blocksOf(m, "service");
  assert.deepEqual(services.map((s) => [s.index, s.name, s.lines.length, s.subtotal?.value ?? null]), [
    [1, "Tour 4 đảo Nha Trang", 2, "3.600.000 ₫"],
    [2, "Xe đưa đón riêng", 1, null],
    [3, "Lặn biển", 2, "3.600.000 ₫"],
  ]);
  assert.deepEqual(m.blocks.map((b) => b.kind), ["header", "title", "customer", "service", "service", "service", "summary", "footer"]);
});

test("dịch vụ theo nhóm (per5Pax): 'N khách' không tách loại; dòng tiền giữ chi tiết 'giá mỗi nhóm' và số lượt", () => {
  const group = svc({
    name: "Phao chuối", catalogCode: "TTB03", unit: "per5Pax", pax: { adult: 7, child: 0, senior: 0, infant: 0 }, ...NO_TRIP,
    items: [item({ catalogCode: "TTB03", description: "Phao chuối", detail: "7 khách (giá mỗi nhóm tối đa 5 khách)", quantity: 2, unitPrice: 1500000, catalogPrice: 1500000, lineTotal: 3000000 })],
  });
  const s = one(build(order({ services: [group] })), "service");
  assert.equal(value(s.details, "Số khách"), "7 khách");
  assert.deepEqual(s.lines, [{ description: "Phao chuối", detail: "7 khách (giá mỗi nhóm tối đa 5 khách)", quantity: "2", unitPrice: "1.500.000 ₫", lineTotal: "3.000.000 ₫" }]);
  assert.equal(s.subtotal, null);
});

test("dịch vụ nhập tay: số khách chỉ 'N khách' (0 khách → không dòng); dòng tiền nhiều dòng, chi tiết rỗng → null, có tổng dịch vụ", () => {
  const manual = (guests: number): OrderServiceDto => svc({
    kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual", pax: { adult: guests, child: 0, senior: 0, infant: 0 }, catalogStatus: null, ...NO_TRIP,
    items: [
      item({ catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", detail: "Cả đoàn", quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 }),
      item({ id: "item_INTERNAL_4", catalogCode: null, paxCode: null, description: "Nước suối", detail: "", quantity: 6, unitPrice: 10000, catalogPrice: null, lineTotal: 60000 }),
    ],
  });
  const s = one(build(order({ services: [manual(3)] })), "service");
  assert.equal(value(s.details, "Số khách"), "3 khách");
  assert.deepEqual(s.lines.map((l) => [l.description, l.detail, l.quantity, l.unitPrice, l.lineTotal]), [
    ["Xe 7 chỗ 2 chiều", "Cả đoàn", "1", "800.000 ₫", "800.000 ₫"],
    ["Nước suối", null, "6", "10.000 ₫", "60.000 ₫"],
  ]);
  assert.deepEqual(s.subtotal, { label: "Cộng dịch vụ", value: "860.000 ₫" });
  assert.equal(value(details(manual(0)), "Số khách"), undefined);
});

test("số khách theo người: loại có 0 khách không in; giữ thứ tự người lớn, trẻ em, người cao tuổi, em bé; phân cách bằng dấu phẩy", () => {
  const pax = (adult: number, child: number, senior: number, infant: number) => value(details(svc({ ...NO_TRIP, pax: { adult, child, senior, infant } })), "Số khách");
  assert.equal(pax(2, 0, 1, 0), "2 người lớn, 1 người cao tuổi");
  assert.equal(pax(0, 1, 0, 0), "1 trẻ em");
  assert.equal(pax(0, 0, 0, 3), "3 em bé");
  assert.equal(pax(1, 2, 3, 4), "1 người lớn, 2 trẻ em, 3 người cao tuổi, 4 em bé");
  assert.equal(pax(0, 0, 0, 0), undefined);
});

test("KHÔNG lộ nội bộ: ghi chú vận hành, nhãn khác giá/đổi giá danh mục, mã danh mục, id, đơn vị thô, ghi chú thanh toán, cách cọc, giá danh mục", () => {
  const manual = svc({
    id: "svc_INTERNAL_2", kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogStatus: "unavailable",
    items: [item({ id: "item_INTERNAL_3", catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 })],
  });
  const text = JSON.stringify(build(order({ services: [svc(), manual] })));
  for (const banned of [
    "ord_INTERNAL", "stf_INTERNAL", "svc_INTERNAL", "item_INTERNAL", "TD101",
    "GHI-CHU-NOI-BO", "PAYMENT-NOTE-NOI-BO", "Vietcombank", "Tiền mặt", "cash",
    "Khác giá", "khác giá", "Giá danh mục đã đổi", "Dịch vụ đã ẩn khỏi danh mục", "price_changed", "unavailable",
    "perPax", "manual", "950.000", "950000", "Nguyễn Thu Hà", // Nguyễn Thu Hà = người lập; đã có handlerName nên không in
  ]) assert.ok(!text.includes(banned), `không được có "${banned}" trong ảnh gửi khách`);
  // ghi chú/yêu cầu CỦA KHÁCH thì có in (khác ghi chú vận hành của dịch vụ)
  assert.ok(text.includes("Cả nhà ăn chay"));
});

test("trạng thái: nháp 'Chờ xác nhận', đã xác nhận 'Đã xác nhận', đã huỷ 'Đã huỷ' (kèm mã trạng thái để bộ vẽ tô màu)", () => {
  const cases: [OrderStatus, string][] = [["draft", "Chờ xác nhận"], ["confirmed", "Đã xác nhận"], ["cancelled", "Đã huỷ"]];
  for (const [code, text] of cases) assert.deepEqual(one(build(order({ status: code })), "title").status, { code, text });
});

test("nhân viên phụ trách: dùng tên người phụ trách; null hoặc trống → tên người lập của đơn; cả hai trống → không dòng", () => {
  const rows = (o: OrderDetailDto, handler: string | null) => one(build(o, handler), "title").rows;
  assert.equal(value(rows(order(), "Lê Minh Tuấn"), "Nhân viên phụ trách"), "Lê Minh Tuấn");
  assert.equal(value(rows(order(), null), "Nhân viên phụ trách"), "Nguyễn Thu Hà");
  assert.equal(value(rows(order(), "   "), "Nhân viên phụ trách"), "Nguyễn Thu Hà");
  assert.equal(value(rows(order({ staffName: "" }), null), "Nhân viên phụ trách"), undefined);
  // tên người lập chỉ xuất hiện làm phương án dự phòng, không thành dòng riêng
  assert.ok(!JSON.stringify(build(order(), "Lê Minh Tuấn")).includes("Nguyễn Thu Hà"));
});

test("tổng kết: đúng số của đơn (không tự tính lại); chỉ Tổng cộng và Còn lại nổi bật; giảm giá 0 in '0 ₫'; còn lại âm giữ nguyên dấu", () => {
  const rows = (o: OrderDetailDto) => one(build(o), "summary").rows;
  const a = rows(order({ subtotal: 12345678, discount: 0, total: 12345678, depositAmount: 5000000, remainingAmount: 7345678 }));
  assert.deepEqual(a.map((r) => [r.label, r.value, r.emphasis]), [
    ["Tạm tính", "12.345.678 ₫", false], ["Giảm giá", "0 ₫", false], ["Tổng cộng", "12.345.678 ₫", true], ["Đã cọc", "5.000.000 ₫", false], ["Còn lại", "7.345.678 ₫", true],
  ]);
  const over = rows(order({ subtotal: 4000000, discount: 0, total: 4000000, depositAmount: 5000000, remainingAmount: -1000000 }));
  assert.equal(over.find((r) => r.label === "Còn lại")!.value, "-1.000.000 ₫");
  // số hiển thị là số của đơn, kể cả khi lệch so với tổng các dòng (máy chủ là nơi tính; ảnh chỉ in lại)
  const odd = rows(order({ subtotal: 111, total: 222, remainingAmount: 333, depositAmount: 444, discount: 5 }));
  assert.deepEqual(odd.map((r) => r.value), ["111 ₫", "-5 ₫", "222 ₫", "444 ₫", "333 ₫"]);
});

test("ngày lập: đổi UTC sang ngày giờ Việt Nam (UTC+7) rồi dd/mm/yyyy; dữ liệu ngày hỏng → không dòng", () => {
  const day = (createdAt: string) => value(one(build(order({ createdAt })), "title").rows, "Ngày lập");
  assert.equal(day("2026-09-20T18:30:00.000Z"), "21/09/2026"); // 01:30 sáng 21/09 giờ VN
  assert.equal(day("2026-09-21T16:59:59.000Z"), "21/09/2026"); // 23:59:59 giờ VN
  assert.equal(day("2026-09-21T17:00:00.000Z"), "22/09/2026"); // 00:00 ngày kế
  assert.equal(day("không-phải-ngày"), undefined);
});

test("tên tệp: xac-nhan-<mã đơn>.png; ký tự lạ trong mã đơn bị thay bằng gạch để tên tệp luôn an toàn", () => {
  assert.equal(build(order({ orderCode: "TD-20260921-0007" })).fileName, "xac-nhan-TD-20260921-0007.png");
  assert.equal(build(order({ orderCode: "TD 2026/09?21" })).fileName, "xac-nhan-TD-2026-09-21.png");
  assert.equal(build(order({ orderCode: "  " })).fileName, "xac-nhan.png");
});

test("chữ nhiều dòng: xuống dòng kiểu Windows được chuẩn về \\n và cắt khoảng trắng hai đầu (bộ vẽ tách theo \\n)", () => {
  const m = build(order({ customerNote: "  Dị ứng hải sản\r\nĐón sớm\rGhế trẻ em \n" }));
  assert.equal(value(one(m, "customer").rows, "Ghi chú / yêu cầu"), "Dị ứng hải sản\nĐón sớm\nGhế trẻ em");
});

test("thuần: không sửa dữ liệu vào; kết quả chỉ gồm chữ/số/mảng/đối tượng (đi qua JSON không đổi); đơn không dịch vụ vẫn dựng được", () => {
  const input = order({ services: [svc(), svc({ id: "svc_INTERNAL_2", ...NO_TRIP })] });
  const before = structuredClone(input);
  const m = build(input);
  assert.deepEqual(input, before);
  assert.deepEqual(JSON.parse(JSON.stringify(m)), m);
  assert.deepEqual(build(order({ services: [] })).blocks.map((b) => b.kind), ["header", "title", "customer", "summary", "footer"]);
});

// ---- làm sạch chuỗi in ra ảnh (rà soát Task 9 → Task 10): mọi chuỗi trong mô hình đi qua clean(), nên đủ các ô người dùng nhập tay ----
// Bộ vẽ đưa thẳng chuỗi vào canvas: ký tự điều khiển/NUL làm lệch phép đo, còn bidi (U+202A–202E, U+2066–2069) đảo chiều chữ ngay trong ảnh gửi khách.
// Ký tự ẩn viết bằng MÃ SỐ (cp) chứ không chép vào tệp: chép vào thì mắt thường không thấy và công cụ soạn thảo dễ đổi mất.
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);
const NUL = cp(0), BEL = cp(7), TAB = cp(9), VT = cp(0x0b), FF = cp(0x0c), CR = cp(0x0d), SOH = cp(1), DEL = cp(0x7f), NEL = cp(0x85);
const LINE_SEP = cp(0x2028), PARA_SEP = cp(0x2029);
const LRE = cp(0x202a), RLE = cp(0x202b), LRO = cp(0x202d), RLO = cp(0x202e), LRI = cp(0x2066), RLI = cp(0x2067), FSI = cp(0x2068), PDI = cp(0x2069);
/** Có ký tự điều khiển (trừ "\n") hoặc bidi không? — dò từng mã, không dùng biểu thức chính quy có ký tự lạ. */
const hasBanned = (s: string): boolean =>
  [...s].some((ch) => {
    const c = ch.codePointAt(0)!;
    return (c <= 0x1f && c !== 0x0a) || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029 || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069);
  });
/** Mọi chuỗi (giá trị và khoá) nằm sâu trong `v`. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v !== null && typeof v === "object") for (const [k, x] of Object.entries(v)) (out.push(k), strings(x, out));
  return out;
}

test("làm sạch: ký tự điều khiển, NUL và bidi bị bỏ ở MỌI ô nhập tay (tên/ghi chú khách, tên dịch vụ, mô tả/chi tiết dòng, nơi đón, tên phụ trách, công ty)", () => {
  const dirty = order({
    orderCode: `TD-20260921-0007${RLO}`,
    customerName: `Trần${RLO} Văn${NUL} Bình${BEL}`,
    customerNote: `${LRI}Ăn chay${PDI}\nĐón sớm${RLI}${DEL}`,
    services: [
      svc({
        kind: "manual", catalogCode: null, name: `Xe${LRE} đưa đón${SOH}`, unit: "manual", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogStatus: null,
        ...FULL_TRIP, pickupPlace: `Bến${LRO} Cầu Đá${NUL}`, note: "GHI-CHU-NOI-BO",
        items: [item({ catalogCode: null, paxCode: null, description: `Xe 7 chỗ${NUL} 2 chiều${RLE}`, detail: `Cả${FSI} đoàn${PDI}`, catalogPrice: null })],
      }),
    ],
  });
  const m = buildConfirmation(dirty, { ...COMPANY, name: `CÔNG TY${RLO} TNHH TOUR ĐẢO`, address: `${COMPANY.address}${NUL}` }, `Lê${RLO} Minh Tuấn${NEL}`);
  assert.deepEqual(strings(m).filter(hasBanned), [], "không chuỗi nào còn ký tự điều khiển/bidi");
  assert.equal(m.orderCode, "TD-20260921-0007");
  assert.equal(m.fileName, "xac-nhan-TD-20260921-0007.png");
  assert.equal(value(one(m, "customer").rows, "Họ tên"), "Trần Văn Bình");
  assert.equal(value(one(m, "customer").rows, "Ghi chú / yêu cầu"), "Ăn chay\nĐón sớm");
  const s = one(m, "service");
  assert.equal(s.name, "Xe đưa đón");
  assert.equal(value(s.details, "Đón khách"), "07:00 · Bến Cầu Đá");
  assert.deepEqual(s.lines.map((l) => [l.description, l.detail]), [["Xe 7 chỗ 2 chiều", "Cả đoàn"]]);
  assert.equal(one(m, "header").companyName, "CÔNG TY TNHH TOUR ĐẢO");
  assert.equal(value(one(m, "title").rows, "Nhân viên phụ trách"), "Lê Minh Tuấn");
});

test("làm sạch: tab thành dấu cách; các dấu ngắt dòng lạ (VT, FF, NEL, U+2028, U+2029, CRLF, CR) thành \\n — không dính chữ, dòng trống giữa giữ nguyên", () => {
  const raw = `a${TAB}b${VT}c${FF}d${NEL}e${LINE_SEP}f${PARA_SEP}g${CR}\nh${CR}i\n\nj`;
  const note = value(one(build(order({ customerNote: raw })), "customer").rows, "Ghi chú / yêu cầu");
  assert.equal(note, "a b\nc\nd\ne\nf\ng\nh\ni\n\nj");
});

test("làm sạch: chuỗi chỉ toàn ký tự điều khiển/bidi coi như rỗng (dòng bị ẩn); dấu gõ rời được gộp về dạng dựng sẵn (NFC) để đo chữ đúng", () => {
  const m = build(order({ customerEmail: `${RLO}${NUL}${LRI}`, customerNote: ` ${LINE_SEP}${PARA_SEP} ${BEL} ` }));
  assert.deepEqual(one(m, "customer").rows.map((r) => r.label), ["Họ tên", "Số điện thoại"]);
  // "Nguyễn" gõ rời: e + dấu mũ (U+0302) + dấu ngã (U+0303); "Thành": a + dấu huyền (U+0300)
  const decomposed = `Nguye${cp(0x302, 0x303)}n Tha${cp(0x300)}nh`;
  const composed = value(one(build(order({ customerName: decomposed })), "customer").rows, "Họ tên");
  assert.equal(composed, `Nguy${cp(0x1ec5)}n Th${cp(0xe0)}nh`);
  assert.equal(composed!.length, "Nguyễn Thành".length);
});
