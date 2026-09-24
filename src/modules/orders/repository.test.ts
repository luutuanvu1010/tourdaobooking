import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { applyAdjustmentToOrder, parseAdjustmentAfter } from "./money-adjustment.ts";
import type { OrderDetailDto } from "../../shared/contracts.ts";

const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}

const { summarizeServices, applyAdjustedPax } = await loadModule();

type ServiceSummaryRow = typeof import("./repository.ts").ServiceSummaryRow;
const row = (o: Partial<ServiceSummaryRow> & { order_id: string; name: string; sort_order: number }): ServiceSummaryRow => ({
  id: "", pax_adult: 0, pax_child: 0, pax_senior: 0, pax_infant: 0, depart_date: null, pickup_time: null, pickup_place: null, ...o,
});

test("summarizeServices: dịch vụ ĐẦU (sort_order nhỏ nhất) quyết định trip; pax cộng dồn mọi dịch vụ của đơn; nhiều đơn không lẫn nhau", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o1", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2, pax_child: 1, depart_date: "2026-10-01", pickup_time: "07:00", pickup_place: "Cảng Cầu Đá" }),
    row({ order_id: "o1", name: "Áo phao", sort_order: 1, depart_date: "2026-10-02", pickup_time: "08:00", pickup_place: "Khách sạn" }),
    row({ order_id: "o2", name: "Tour 4 đảo", sort_order: 0, pax_adult: 1, pax_senior: 1 }),
  ];
  const out = summarizeServices(rows);
  assert.deepEqual(out.get("o1"), {
    serviceNames: ["Tour Hòn Mun", "Áo phao"],
    pax: { adult: 2, child: 1, senior: 0, infant: 0 },
    trip: { departDate: "2026-10-01", pickupTime: "07:00", pickupPlace: "Cảng Cầu Đá" },
  });
  assert.deepEqual(out.get("o2"), {
    serviceNames: ["Tour 4 đảo"],
    pax: { adult: 1, child: 0, senior: 1, infant: 0 },
    trip: { departDate: null, pickupTime: null, pickupPlace: null },
  });
  assert.equal(out.has("o3"), false, "đơn không có trong rows thì không có trong Map");
});

test("summarizeServices([]) → Map rỗng", () => {
  assert.equal(summarizeServices([]).size, 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// applyAdjustedPax (Đợt E: sau khi FIELD sửa số khách hậu xác nhận, /orders và Trang chủ hiện đúng tiền nhưng vẫn hiện số khách CŨ — gốc lỗi là
// toSummaryDtos() lấy pax từ order_service đã đóng băng thay vì từ after_json của dòng điều chỉnh gần nhất, như trang chi tiết đơn đã làm đúng).
// ---------------------------------------------------------------------------------------------------------------------
test("applyAdjustedPax: dịch vụ có mặt trong điều chỉnh gần nhất của đơn → pax_* đổi thành số MỚI, các trường khác (tên, ngày…) giữ nguyên", () => {
  const rows: ServiceSummaryRow[] = [row({ order_id: "o1", id: "sv1", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2, pax_child: 1, depart_date: "2026-10-01" })];
  const afterByOrder = new Map([["o1", [{ serviceId: "sv1", pax: { adult: 5, child: 0, senior: 0, infant: 0 } }]]]);
  const out = applyAdjustedPax(rows, afterByOrder);
  assert.deepEqual(out, [{ ...rows[0], pax_adult: 5, pax_child: 0, pax_senior: 0, pax_infant: 0 }]);
});

test("applyAdjustedPax: đơn KHÔNG có trong afterByOrder (chưa có điều chỉnh nào) → giữ NGUYÊN số khách gốc", () => {
  const rows: ServiceSummaryRow[] = [row({ order_id: "o2", id: "sv2", name: "Tour 4 đảo", sort_order: 0, pax_adult: 1, pax_senior: 1 })];
  const out = applyAdjustedPax(rows, new Map());
  assert.deepEqual(out, rows);
});

test("applyAdjustedPax: dịch vụ KHÔNG có mặt trong after (nhập tay, hoặc không thuộc danh mục) → giữ nguyên dòng đó dù đơn có điều chỉnh dịch vụ khác", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o3", id: "sv-catalog", name: "Tour", sort_order: 0, pax_adult: 2 }),
    row({ order_id: "o3", id: "sv-manual", name: "Áo phao (nhập tay)", sort_order: 1, pax_adult: 1 }),
  ];
  const afterByOrder = new Map([["o3", [{ serviceId: "sv-catalog", pax: { adult: 4, child: 0, senior: 0, infant: 0 } }]]]);
  const out = applyAdjustedPax(rows, afterByOrder);
  assert.equal(out[0]!.pax_adult, 4, "dịch vụ có trong after → số mới");
  assert.equal(out[1]!.pax_adult, 1, "dịch vụ nhập tay không có trong after → giữ số gốc");
});

// Bản trước (Đợt E vòng 1) kiểm applyAdjustedPax tự chặn pax hỏng bằng isPaxCounts CỦA RIÊNG NÓ. Kiểm độc lập Đợt E vòng 2 (Lỗi 1) bắt đúng lỗi
// SINH RA TỪ cách làm đó: money-adjustment.ts (đường chi tiết đơn) không có luật tương tự nên lệch với chỗ này. Sửa: chuyển việc lọc pax hỏng
// vào MỘT hàm duy nhất (`money-adjustment.ts:parseAdjustmentAfter`, dùng CHUNG cho cả `getLatestAdjustment`/`getLatestAdjustments`) — applyAdjustedPax
// giờ chỉ còn nhận dữ liệu ĐÃ được hàm đó lọc, không tự kiểm lại nữa. Test này CHUYỂN CHỖ (không xoá): vẫn đúng khẳng định cũ (pax hỏng → giữ số
// gốc, không sinh NaN), chỉ đổi đường dữ liệu đi qua parseAdjustmentAfter trước, đúng như getLatestAdjustments thật sự làm.
test("applyAdjustedPax: pax của after_json HỎNG (thiếu trường, không đủ 4 loại khách) → giữ nguyên số gốc, KHÔNG sinh NaN/undefined (kiểm độc lập đợt này)", () => {
  const rows: ServiceSummaryRow[] = [row({ order_id: "o4", id: "sv4", name: "Tour", sort_order: 0, pax_adult: 2, pax_child: 1 })];
  // after_json THẬT SỰ hỏng dạng mềm (mảng đọc được, pax thiếu trường) — đi qua parseAdjustmentAfter TRƯỚC, đúng đường getLatestAdjustments thật.
  const after = parseAdjustmentAfter(JSON.stringify([{ serviceId: "sv4", pax: {} }]));
  assert.deepEqual(after, [], "parseAdjustmentAfter đã lọc phần tử pax hỏng ngay từ nguồn — không còn lọt tới applyAdjustedPax");
  const afterByOrder = new Map([["o4", after]]);
  const out = applyAdjustedPax(rows, afterByOrder);
  assert.deepEqual(out, rows, "pax hỏng → giữ nguyên dòng gốc, không ghi đè bằng giá trị thiếu");
  const summarized = summarizeServices(out);
  assert.equal(Number.isInteger(summarized.get("o4")!.pax.adult), true, "tổng số khách phải là số nguyên, không phải NaN");
});

// ---------------------------------------------------------------------------------------------------------------------
// Lỗi 1 (kiểm độc lập Đợt E vòng 2): MỘT after_json hỏng dạng mềm phải cho CÙNG MỘT số khách ở CẢ HAI đường đọc — chi tiết đơn
// (money-adjustment.ts:applyAdjustmentToOrder) và danh sách/Trang chủ (repository.ts:applyAdjustedPax) — vì cả hai giờ nhận dữ liệu từ CÙNG một
// lần gọi parseAdjustmentAfter (mô phỏng đúng những gì getLatestAdjustment/getLatestAdjustments thật làm với CÙNG một after_json trong CSDL).
// ---------------------------------------------------------------------------------------------------------------------
const baseOrder = (): OrderDetailDto => ({
  id: "o1", orderCode: "TD-1", staffId: "s1", staffName: "A", bookerPartyId: null, bookerName: null,
  status: "confirmed", customerName: "K", customerPhone: "090", customerEmail: null, customerNote: null,
  subtotal: 600000, discount: 0, total: 600000, depositAmount: 100000, depositMethod: "cash", remainingAmount: 500000,
  paymentNote: null, createdAt: "t", updatedAt: "t", confirmedAt: "t",
  services: [
    {
      id: "svc-1", kind: "catalog", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
      pax: { adult: 2, child: 0, senior: 0, infant: 0 },
      departDate: "2026-10-01", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
      items: [{ id: "it-1", catalogCode: "TOUR-1", paxCode: "adult", description: "Tour đảo — Người lớn", detail: "", quantity: 2, unitPrice: 300000, catalogPrice: 300000, lineTotal: 600000 }],
      catalogStatus: null,
    },
  ],
});

test("Lỗi 1 — KHÔNG còn lệch: after_json hỏng dạng mềm (pax chỉ có adult, thiếu child/senior/infant) → chi tiết đơn VÀ danh sách/Trang chủ cùng lùi về số ĐÃ LƯU (2), không phải 5 bịa từ dữ liệu thiếu", () => {
  // ĐÚNG ca đo được của kiểm độc lập: after_json = '[{"serviceId":"svc-1","pax":{"adult":5}}]' — mảng đọc được nhưng pax thiếu 3/4 trường.
  const after = parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: { adult: 5 } }]));

  const detail = applyAdjustmentToOrder(baseOrder(), after);
  const rows: ServiceSummaryRow[] = [row({ order_id: "o1", id: "svc-1", name: "Tour đảo", sort_order: 0, pax_adult: 2, pax_child: 0, pax_senior: 0, pax_infant: 0 })];
  const listSummary = summarizeServices(applyAdjustedPax(rows, new Map([["o1", after]])));

  assert.deepEqual(detail.services[0]!.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: pax hỏng → lùi về số ĐÃ LƯU, không hiện 5 người lớn bịa ra");
  assert.deepEqual(listSummary.get("o1")!.pax, detail.services[0]!.pax, "danh sách/Trang chủ PHẢI khớp CHÍNH XÁC trang chi tiết — không còn 'hai luật'");
  assert.equal(detail.subtotal, 600000, "tiền cũng lùi về số gốc (2 khách × 300,000), không tính theo pax hỏng");
});

// Lỗi 1 — biến thể TRÙNG serviceId (kiểm độc lập vòng thứ hai trên CHÍNH task này, sau khi báo cáo đầu tiên "coi là xong"): after_json có HAI phần
// tử CÙNG serviceId, cả hai đều hợp lệ về DẠNG (parseMoneyEditInput chặn khi GHI — chỉ tới được đây qua dữ liệu hỏng ngoài tầm kiểm). Nếu
// parseAdjustmentAfter không tự gom, hai nơi TIÊU THỤ sẽ lại tự chọn khác nhau: applyAdjustmentToOrder dựng Map từ mảng (phần tử ĐỨNG SAU thắng),
// còn applyAdjustedPax dùng Array.find (phần tử ĐỨNG TRƯỚC thắng) — CHÍNH LÀ "hai luật khác nhau ở hai nơi" mà việc này phải xoá bỏ, chỉ chuyển
// từ khâu LỌC DẠNG sang khâu HỢP GIẢI TRÙNG LẶP. R-ORD-5 (scripts/audit-checks.mjs) KHÔNG bắt được ca này (chỉ đếm số lượng + đối chiếu serviceId
// — hai phần tử trùng serviceId vẫn đủ số lượng và serviceId vẫn khớp dịch vụ thật của đơn).
test("Lỗi 1 (biến thể TRÙNG serviceId) — KHÔNG còn lệch: after_json có hai phần tử CÙNG serviceId (3 rồi 7) → chi tiết đơn VÀ danh sách/Trang chủ CÙNG lấy phần tử ĐỨNG SAU (7), không phải mỗi bên một số", () => {
  const rawAfter = [
    { serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } },
    { serviceId: "svc-1", pax: { adult: 7, child: 0, senior: 0, infant: 0 } },
  ];
  const after = parseAdjustmentAfter(JSON.stringify(rawAfter));
  assert.deepEqual(after, [{ serviceId: "svc-1", pax: { adult: 7, child: 0, senior: 0, infant: 0 } }], "parseAdjustmentAfter đã gom về MỘT phần tử, đứng sau (7) thắng, ngay từ nguồn");

  const detail = applyAdjustmentToOrder(baseOrder(), after);
  const rows: ServiceSummaryRow[] = [row({ order_id: "o1", id: "svc-1", name: "Tour đảo", sort_order: 0, pax_adult: 2, pax_child: 0, pax_senior: 0, pax_infant: 0 })];
  const listSummary = summarizeServices(applyAdjustedPax(rows, new Map([["o1", after]])));

  assert.deepEqual(detail.services[0]!.pax, { adult: 7, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: phải là 7 (phần tử đứng sau), không phải 3");
  assert.deepEqual(listSummary.get("o1")!.pax, detail.services[0]!.pax, "danh sách/Trang chủ PHẢI khớp CHÍNH XÁC trang chi tiết (cùng 7) — không phải mỗi bên tự chọn một số khác nhau");
  assert.equal(detail.subtotal, 2100000, "tiền cũng theo phần tử thắng (7×300,000), không phải 3×300,000");
});

test("summarizeServices(applyAdjustedPax(...)): số khách TÓM TẮT của đơn CÓ điều chỉnh là số MỚI; đơn KHÔNG có điều chỉnh là số GỐC — đúng hành vi phải sửa (Đợt E)", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o-adjusted", id: "sv-a", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2 }),
    row({ order_id: "o-plain", id: "sv-b", name: "Tour 4 đảo", sort_order: 0, pax_adult: 2 }),
  ];
  const afterByOrder = new Map([["o-adjusted", [{ serviceId: "sv-a", pax: { adult: 5, child: 0, senior: 0, infant: 0 } }]]]);
  const out = summarizeServices(applyAdjustedPax(rows, afterByOrder));
  assert.deepEqual(out.get("o-adjusted")!.pax, { adult: 5, child: 0, senior: 0, infant: 0 }, "đơn có điều chỉnh → số khách tóm tắt là số MỚI");
  assert.deepEqual(out.get("o-plain")!.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "đơn không có điều chỉnh → số khách tóm tắt là số GỐC");
});
