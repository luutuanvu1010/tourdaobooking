// Hàng chờ nhận — PHẦN HẸP (ADR-0030 S23-2, Hiến chương 4.4 "danh sách trường được phép"): luật thuần ở `pool.ts`. Bài RIÊNG cho phần hẹp vì bài khoá
// `src/shared/cong-quyen.test.ts` (money.view = order.view…) không canh ô `order.pool.view` (S23-2). Thấy chặn thật (docs/SO-HANG-RAO.md): thêm
// `customerPhone` vào đối tượng dựng ở `pool.ts` → ca "đơn đủ mọi trường" đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrderDetailDto } from "../../shared/contracts.ts";
import { maskLongDigits, toPoolOrders, type PoolSourceOrder } from "./pool.ts";

const TODAY = "2026-09-27";

// Danh sách trường được phép — CHÉP TAY từ ADR-0030 S23-2 / ADR-0023 điều 1 gạch 1 (mã đơn, ngày đi; theo từng dịch vụ: tên, số khách, nơi đón, giờ
// đón). KHÔNG suy từ `PoolOrderDto` hay từ mã nguồn: đổi danh sách = sửa ở đây, người rà thấy ngay.
const ORDER_KEYS = ["departDate", "orderCode", "orderId", "services", "traLai"];
const SERVICE_KEYS = ["name", "pax", "pickupPlace", "pickupTime"];
const PAX_KEYS = ["adult", "child", "infant", "senior"];

/** Một đơn điền ĐỦ MỌI TRƯỜNG của `OrderDetailDto` (kể cả tiền, SĐT, email, ghi chú, dòng tiền, check-in) — nguồn "giàu" nhất có thể đưa vào. */
function fullOrder(over: Partial<OrderDetailDto> = {}): OrderDetailDto & { status: "draft" | "confirmed" | "cancelled" } {
  return {
    id: "o-du-truong",
    orderCode: "TD-20260927-0007",
    staffId: "nguoi-lap-1",
    staffName: "Người Lập Đơn",
    bookerPartyId: "pty-khach-1",
    bookerName: "Hồ Sơ Khách Riêng",
    bookerLaDoiTac: true,
    status: "confirmed",
    customerName: "Khách Bí Mật",
    customerPhone: "0912345678",
    customerEmail: "khach@example.com",
    customerNote: "Ghi chú riêng của khách 0987654321",
    subtotal: 1234567,
    discount: 1000,
    total: 1233567,
    deliveredAt: null,
    completedAt: null,
    paymentNote: "Đã chuyển khoản 777",
    createdAt: "2026-09-20T01:02:03.000Z",
    updatedAt: "2026-09-21T01:02:03.000Z",
    confirmedAt: "2026-09-21T01:02:03.000Z",
    services: [
      {
        id: "sv-1",
        kind: "catalog",
        catalogCode: "TOUR4DAO",
        name: "Tour 4 đảo",
        unit: "perPax",
        pax: { adult: 2, child: 1, senior: 0, infant: 1 },
        items: [{ id: "it-1", serviceId: "sv-1", catalogCode: "TOUR4DAO", paxCode: "adult", description: "Người lớn", detail: null, quantity: 2, unitPrice: 500000, catalogPrice: 500000, lineTotal: 1000000 }] as never,
        catalogStatus: "ok",
        departDate: "2026-09-30",
        departTime: "07:30",
        pickupTime: "06:45",
        pickupPlace: "Đón ở 0905 123.456 cổng sau",
        checkinDate: null,
        checkinTime: "08:00",
        checkinPlace: "Cầu tàu Vĩnh Nguyên",
        note: "Ghi chú dịch vụ riêng",
      },
    ],
    ...over,
  };
}

test("phần hẹp: đơn điền ĐỦ MỌI TRƯỜNG → đơn, dịch vụ và số khách chỉ có đúng các khoá được phép (không tên/SĐT/email khách, không tiền, không ghi chú, không người lập)", () => {
  const out = toPoolOrders([fullOrder()], new Set(), TODAY, new Set());
  assert.equal(out.length, 1);
  const [o] = out;
  assert.deepEqual(Object.keys(o!).sort(), ORDER_KEYS, "khoá của đơn");
  assert.equal(o!.services.length, 1);
  for (const s of o!.services) {
    assert.deepEqual(Object.keys(s).sort(), SERVICE_KEYS, "khoá của dịch vụ");
    assert.deepEqual(Object.keys(s.pax).sort(), PAX_KEYS, "khoá của số khách");
  }
  assert.deepEqual(o, {
    orderId: "o-du-truong",
    orderCode: "TD-20260927-0007",
    departDate: "2026-09-30",
    traLai: false,
    services: [{ name: "Tour 4 đảo", pax: { adult: 2, child: 1, senior: 0, infant: 1 }, pickupPlace: "Đón ở •••• •••.••• cổng sau", pickupTime: "06:45" }],
  });
  // Lưới thứ hai: không một GIÁ TRỊ nhạy cảm nào của nguồn lọt ra dưới bất kỳ khoá nào.
  const text = JSON.stringify(out);
  for (const secret of ["Khách Bí Mật", "0912345678", "khach@example.com", "0987654321", "1233567", "1033567", "Người Lập Đơn", "nguoi-lap-1", "Hồ Sơ Khách Riêng", "Ghi chú", "Cầu tàu", "777", "500000"]) {
    assert.ok(!text.includes(secret), `phần hẹp lộ "${secret}": ${text}`);
  }
});

test("phần hẹp: số khách chép TỪNG KHOÁ — khoá lạ gắn vào đối tượng số khách của nguồn không lọt ra", () => {
  const src = fullOrder();
  (src.services[0]!.pax as Record<string, unknown>).giaMotNguoi = 500000;
  const [o] = toPoolOrders([src], new Set(), TODAY, new Set());
  assert.deepEqual(Object.keys(o!.services[0]!.pax).sort(), PAX_KEYS);
});

test("hàng chờ chỉ gồm đơn CHƯA có người phụ trách, CHƯA huỷ, CHƯA qua ngày đi (đơn chưa có ngày nào vẫn giữ; ngày đi = ngày khởi hành LỚN NHẤT)", () => {
  const svc = (departDate: string | null) => ({ name: "Tour", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, departDate, pickupTime: null, pickupPlace: null });
  const src = (id: string, status: PoolSourceOrder["status"], dates: (string | null)[]): PoolSourceOrder => ({ id, orderCode: `TD-${id}`, status, services: dates.map(svc) });
  const out = toPoolOrders(
    [
      src("ngay-mai", "confirmed", ["2026-09-28"]),
      src("hom-nay", "draft", ["2026-09-27"]),
      src("hom-qua", "confirmed", ["2026-09-26"]),
      src("lech-ngay", "draft", ["2026-09-26", "2026-09-29"]), // đơn cũ (trước 1.11) lệch ngày: ngày đi = ngày lớn nhất → chưa qua
      src("chua-co-ngay", "draft", [null, null]),
      src("khong-dich-vu", "draft", []),
      src("da-huy", "cancelled", ["2026-09-30"]),
      src("co-nguoi", "confirmed", ["2026-09-30"]),
    ],
    new Set(["co-nguoi"]),
    TODAY,
    new Set(),
  );
  assert.deepEqual(out.map((o) => o.orderId), ["hom-nay", "ngay-mai", "lech-ngay", "chua-co-ngay", "khong-dich-vu"], "xếp theo ngày đi tăng dần, chưa có ngày xuống cuối (rồi theo mã đơn)");
  assert.deepEqual(out.map((o) => o.departDate), ["2026-09-27", "2026-09-28", "2026-09-29", null, null]);
});

test("maskLongDigits: che MỌI dãy từ 8 chữ số, đếm sau khi bỏ dấu cách/chấm/gạch (Q-N) — nhiều cách viết SĐT thật", () => {
  const cases: [string, string][] = [
    ["Đón ở 0905 123.456 cổng sau", "Đón ở •••• •••.••• cổng sau"],
    ["gọi +84-905-123-456 khi tới", "gọi +••-•••-•••-••• khi tới"],
    ["0905123456", "••••••••••"],
    ["SĐT: 0905.123.456", "SĐT: ••••.•••.•••"],
    ["090 512 3456 (anh Tuấn)", "••• ••• •••• (anh Tuấn)"],
    ["+84905123456", "+•••••••••••"],
    ["84 905 123 456", "•• ••• ••• •••"],
    ["0905 - 123 - 456", "•••• - ••• - •••"],
    ["số 0905  123   456", "số ••••  •••   •••"], // nhiều dấu cách liền
    ["12345678", "••••••••"], // đúng 8 chữ số
    ["hai số: 0905123456 / 0914 222 333", "hai số: •••••••••• / •••• ••• •••"],
  ];
  for (const [input, expected] of cases) assert.equal(maskLongDigits(input), expected, input);
});

test("maskLongDigits (Ruling người thi công, chặt hơn Q-N): ngoặc đơn và gạch dài cũng coi là dấu ngăn — số bàn Nha Trang '(0258) 3521 234' bị che", () => {
  assert.equal(maskLongDigits("(0258) 3521 234"), "(••••) •••• •••");
  assert.equal(maskLongDigits("(+84) 905 123 456"), "(+••) ••• ••• •••");
  assert.equal(maskLongDigits("0905–123–456"), "••••–•••–•••"); // gạch nối dài (en dash)
  assert.equal(maskLongDigits("0905—123—456"), "••••—•••—•••"); // em dash
});

test("maskLongDigits: dãy DƯỚI 8 chữ số giữ nguyên (giờ, số phòng, số nhà, dãy 7 chữ số)", () => {
  for (const s of ["Khách sạn Mường Thanh phòng 1203", "số 45 Trần Phú, 6:30", "mã 1234567", "123 4567", "Tour 4 đảo", "", "không có số"]) {
    assert.equal(maskLongDigits(s), s, s);
  }
  assert.equal(maskLongDigits(null), null);
});

test("maskLongDigits: che cả dãy dài lẫn trong chữ, giữ nguyên phần chữ và dãy ngắn khác", () => {
  assert.equal(maskLongDigits("P.1203, gọi 0905123456 trước 6:30"), "P.1203, gọi •••••••••• trước 6:30");
});

test("phần hẹp: tên dịch vụ (dịch vụ nhập tay là chữ tự do) cũng che dãy từ 8 chữ số (Ruling người thi công, chặt hơn S23-2)", () => {
  const src = fullOrder();
  src.services[0]!.name = "Xe đón anh Tuấn 0905123456";
  const [o] = toPoolOrders([src], new Set(), TODAY, new Set());
  assert.equal(o!.services[0]!.name, "Xe đón anh Tuấn ••••••••••");
});

test("ADR-0030 điều 3 (nút Từ chối): cờ traLai = đơn có trong tập «được trả lại» do audit trả lời — chỉ cờ, không tên, không lý do", () => {
  const svc = { name: "Tour", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, departDate: "2026-09-30", pickupTime: null, pickupPlace: null };
  const out = toPoolOrders(
    [{ id: "a", orderCode: "TD-a", status: "confirmed", services: [svc] }, { id: "b", orderCode: "TD-b", status: "confirmed", services: [svc] }],
    new Set(),
    TODAY,
    new Set(["b", "khong-co"]),
  );
  assert.deepEqual(out.map((o) => [o.orderId, o.traLai]), [["a", false], ["b", true]]);
});
