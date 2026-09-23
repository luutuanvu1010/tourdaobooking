import { test } from "node:test";
import assert from "node:assert/strict";
import type { CatalogAdminItemDto, FeedbackTicketDto } from "./contracts.ts";
import { reviewAlerts } from "./dashboard-review.ts";
import type { PermissionCode } from "./permissions.ts";

const who = (...permissions: PermissionCode[]) => ({ id: "w", permissions });
const ADMIN = who("ADMIN");
const SUPER_ADMIN = who("SUPER_ADMIN");
const SALES = who("SALES");
const ACCOUNTING = who("ACCOUNTING");

const PRICES = { adult: 0, child: null, senior: null, infant: null };
function catalogItem(code: string, conflicts: CatalogAdminItemDto["conflicts"] = [], hidden = false): CatalogAdminItemDto {
  return {
    code,
    name: `Dịch vụ ${code}`,
    unit: "perPax",
    supported: true,
    inSheet: true,
    notes: { child: null, senior: null, infant: null },
    sheetPrices: PRICES,
    prices: PRICES,
    hidden,
    overridden: [],
    conflicts,
    overrideUpdatedAt: null,
    updatedAt: "2026-09-23T00:00:00.000Z",
  };
}
function ticket(code: string, status: FeedbackTicketDto["status"], kindName = "Báo lỗi"): FeedbackTicketDto {
  return {
    id: code,
    code,
    kind: "BUG",
    kindName,
    status,
    statusName: status,
    title: "…",
    context: {},
    submitterId: "s",
    submitterName: "Ai đó",
    assigneeId: null,
    assigneeName: null,
    resolvedIn: null,
    lastActivityAt: "2026-09-23T00:00:00.000Z",
    lastPublicReplyAt: null,
    createdAt: "2026-09-23T00:00:00.000Z",
    unread: true,
    mailPending: false,
  };
}

test("reviewAlerts: ADMIN + dữ liệu có cả hai cảnh báo → trả đủ, đúng nội dung (khớp mẫu: base → current, mã + loại góp ý)", () => {
  const items = [catalogItem("A"), catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }])];
  const tickets = [ticket("YC-0042", "NEW", "Báo lỗi"), ticket("YC-0041", "NEW", "Đề xuất"), ticket("YC-0040", "ACK")];
  const r = reviewAlerts(ADMIN, { catalogItems: items, tickets });
  assert.deepEqual(r, {
    catalogConflict: { code: "CANO_RIENG", base: 2_400_000, current: 2_600_000, moreCount: 0, hidden: false },
    feedbackQueue: { count: 2, items: [{ code: "YC-0042", kindName: "Báo lỗi" }, { code: "YC-0041", kindName: "Đề xuất" }] },
  });
});

test("reviewAlerts: SUPER_ADMIN (không giữ ADMIN) cũng thấy — đúng cổng access:\"admin\" của router.ts, không phải cách web/shell.ts vẽ menu (chỉ ADMIN)", () => {
  const items = [catalogItem("X", [{ code: "adult", base: 1, current: 2, override: 1 }])];
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: items, tickets: [] });
  assert.ok(r?.catalogConflict, "SUPER_ADMIN phải thấy khối, giống hệt ADMIN");
});

test("reviewAlerts: KHÔNG phải quản trị (SALES/ACCOUNTING) → null DÙ dữ liệu có cảnh báo thật — TUYỆT ĐỐI KHÔNG mở quyền đọc cảnh báo giá cho nhân viên (quyết định chủ dự án)", () => {
  const items = [catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }])];
  const tickets = [ticket("YC-0042", "NEW")];
  assert.equal(reviewAlerts(SALES, { catalogItems: items, tickets }), null, "SALES không được nhận dữ liệu này dù data có cảnh báo thật");
  assert.equal(reviewAlerts(ACCOUNTING, { catalogItems: items, tickets }), null, "ACCOUNTING không được nhận dữ liệu này dù data có cảnh báo thật");
});

test("reviewAlerts: ADMIN nhưng chưa tải được dữ liệu (data=null — lỗi mạng ở web/home.ts) → null", () => {
  assert.equal(reviewAlerts(ADMIN, null), null);
});

test("reviewAlerts: ADMIN + không có cảnh báo nào (không dịch vụ lệch Sheet, không góp ý Mới) → null (ẩn cả khối, không hiện thẻ trống)", () => {
  const items = [catalogItem("A"), catalogItem("B")];
  const tickets = [ticket("YC-0001", "ACK"), ticket("YC-0002", "DONE")];
  assert.equal(reviewAlerts(ADMIN, { catalogItems: items, tickets }), null);
});

test("reviewAlerts: nhiều dịch vụ lệch Sheet → lấy dịch vụ ĐẦU (theo thứ tự items truyền vào, catalog/repository.ts loadAll() đã ORDER BY code), moreCount đếm phần còn lại", () => {
  const items = [
    catalogItem("A", [{ code: "adult", base: 1, current: 2, override: 1 }]),
    catalogItem("B", [{ code: "adult", base: 3, current: 4, override: 3 }]),
    catalogItem("C", [{ code: "adult", base: 5, current: 6, override: 5 }]),
  ];
  const r = reviewAlerts(ADMIN, { catalogItems: items, tickets: [] });
  assert.deepEqual(r?.catalogConflict, { code: "A", base: 1, current: 2, moreCount: 2, hidden: false });
});

test("reviewAlerts: góp ý ĐÃ ĐỌC (unread=false) nhưng còn trạng thái NEW vẫn tính là 'chưa trả lời' — không dùng cờ unread (admin mở xem nhưng chưa trả lời)", () => {
  const t = { ...ticket("YC-0099", "NEW"), unread: false };
  const r = reviewAlerts(ADMIN, { catalogItems: [], tickets: [t] });
  assert.deepEqual(r?.feedbackQueue, { count: 1, items: [{ code: "YC-0099", kindName: "Báo lỗi" }] });
});

test("reviewAlerts: hơn 2 góp ý Mới → items chỉ lấy 2 mục ĐẦU (đã sắp mới nhất trước), count = tổng thật", () => {
  const tickets = [ticket("YC-0004", "NEW"), ticket("YC-0003", "NEW"), ticket("YC-0002", "NEW")];
  const r = reviewAlerts(ADMIN, { catalogItems: [], tickets });
  assert.equal(r?.feedbackQueue?.count, 3);
  assert.deepEqual(r?.feedbackQueue?.items.map((i) => i.code), ["YC-0004", "YC-0003"]);
});

test("reviewAlerts: chỉ có cảnh báo góp ý (không có cảnh báo giá) → catalogConflict null, feedbackQueue có dữ liệu, khối vẫn hiện", () => {
  const r = reviewAlerts(ADMIN, { catalogItems: [catalogItem("A")], tickets: [ticket("YC-0001", "NEW")] });
  assert.equal(r?.catalogConflict, null);
  assert.ok(r?.feedbackQueue);
});

test("reviewAlerts: dịch vụ ĐÃ ẨN (không bán) mà vẫn có cảnh báo lệch Sheet → catalogConflict.hidden = true (Important fix: KHÔNG được báo 'vẫn đang bán' cho dịch vụ đã ẩn)", () => {
  const items = [catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }], true)];
  const r = reviewAlerts(ADMIN, { catalogItems: items, tickets: [] });
  assert.deepEqual(r?.catalogConflict, { code: "CANO_RIENG", base: 2_400_000, current: 2_600_000, moreCount: 0, hidden: true });
});
