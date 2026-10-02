import { test } from "node:test";
import assert from "node:assert/strict";
import type { CatalogAdminItemDto, FeedbackTicketDto } from "./contracts.ts";
import { canSeeReviewAlerts, reviewAlerts } from "./dashboard-review.ts";
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
    groupCode: null,
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

test("reviewAlerts: Toàn quyền + dữ liệu có cả hai cảnh báo → trả đủ, đúng nội dung (khớp mẫu: base → current, mã + loại góp ý)", () => {
  const items = [catalogItem("A"), catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }])];
  const tickets = [ticket("YC-0042", "NEW", "Báo lỗi"), ticket("YC-0041", "NEW", "Đề xuất"), ticket("YC-0040", "ACK")];
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: items, tickets });
  assert.deepEqual(r, {
    catalogConflict: { code: "CANO_RIENG", base: 2_400_000, current: 2_600_000, moreCount: 0, hidden: false },
    feedbackQueue: { count: 2, items: [{ code: "YC-0042", kindName: "Báo lỗi" }, { code: "YC-0041", kindName: "Đề xuất" }] },
    expiringDocs: null,
  });
});

test("reviewAlerts: SUPER_ADMIN (không giữ ADMIN) cũng thấy — hỏi ô admin.manage như route GET /api/catalog/admin (ADR-0072 mục 4a)", () => {
  const items = [catalogItem("X", [{ code: "adult", base: 1, current: 2, override: 1 }])];
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: items, tickets: [] });
  assert.ok(r?.catalogConflict, "SUPER_ADMIN phải thấy khối, giống hệt ADMIN");
});

test("canSeeReviewAlerts: Nhân sự (HR, ADR-0071) không thấy khối — ô admin.manage không cho HR; Quản trị, Toàn quyền thấy", () => {
  assert.equal(canSeeReviewAlerts(who("HR")), false);
  assert.equal(canSeeReviewAlerts(ADMIN), true);
  assert.equal(canSeeReviewAlerts(SUPER_ADMIN), true);
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
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: [], tickets: [t] });
  assert.deepEqual(r?.feedbackQueue, { count: 1, items: [{ code: "YC-0099", kindName: "Báo lỗi" }] });
});

test("reviewAlerts: hơn 2 góp ý Mới → items chỉ lấy 2 mục ĐẦU (đã sắp mới nhất trước), count = tổng thật", () => {
  const tickets = [ticket("YC-0004", "NEW"), ticket("YC-0003", "NEW"), ticket("YC-0002", "NEW")];
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: [], tickets });
  assert.equal(r?.feedbackQueue?.count, 3);
  assert.deepEqual(r?.feedbackQueue?.items.map((i) => i.code), ["YC-0004", "YC-0003"]);
});

test("reviewAlerts: chỉ có cảnh báo góp ý (không có cảnh báo giá) → catalogConflict null, feedbackQueue có dữ liệu, khối vẫn hiện", () => {
  const r = reviewAlerts(SUPER_ADMIN, { catalogItems: [catalogItem("A")], tickets: [ticket("YC-0001", "NEW")] });
  assert.equal(r?.catalogConflict, null);
  assert.ok(r?.feedbackQueue);
});

test("reviewAlerts: dịch vụ ĐÃ ẨN (không bán) mà vẫn có cảnh báo lệch Sheet → catalogConflict.hidden = true (Important fix: KHÔNG được báo 'vẫn đang bán' cho dịch vụ đã ẩn)", () => {
  const items = [catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }], true)];
  const r = reviewAlerts(ADMIN, { catalogItems: items, tickets: [] });
  assert.deepEqual(r?.catalogConflict, { code: "CANO_RIENG", base: 2_400_000, current: 2_600_000, moreCount: 0, hidden: true });
});

test("reviewAlerts (ADR-0038): Quản trị KHÔNG thấy cảnh báo góp ý DÙ dữ liệu có góp ý Mới — chỉ Toàn quyền xử lý Góp ý; cảnh báo giá vẫn giữ", () => {
  const items = [catalogItem("CANO_RIENG", [{ code: "adult", base: 2_400_000, current: 2_600_000, override: 2_500_000 }])];
  const tickets = [ticket("YC-0042", "NEW")];
  assert.deepEqual(reviewAlerts(ADMIN, { catalogItems: items, tickets }), {
    catalogConflict: { code: "CANO_RIENG", base: 2_400_000, current: 2_600_000, moreCount: 0, hidden: false },
    feedbackQueue: null,
    expiringDocs: null,
  });
  assert.equal(reviewAlerts(ADMIN, { catalogItems: [], tickets }), null, "chỉ có góp ý → ẩn cả khối với Quản trị");
});

// Bản vẽ "Trang chu Quan tri.dc.html" (1.73): "Cần xem lại" gom thêm giấy tờ sắp hết hạn (số `count` của GET /api/van-chuyen/sap-het-han — xe + tài xế).
test("reviewAlerts 1.73: giấy tờ sắp hết hạn — Quản trị / Toàn quyền (ô vehicle.manage) thấy; một mình nó cũng đủ hiện khối; 0 hoặc chưa tải → không dòng", () => {
  for (const w of [ADMIN, SUPER_ADMIN]) {
    assert.deepEqual(reviewAlerts(w, { catalogItems: [], tickets: [], expiringCount: 2 }), { catalogConflict: null, feedbackQueue: null, expiringDocs: { count: 2 } });
    assert.equal(reviewAlerts(w, { catalogItems: [], tickets: [], expiringCount: 0 }), null);
    assert.equal(reviewAlerts(w, { catalogItems: [], tickets: [], expiringCount: null }), null);
    assert.equal(reviewAlerts(w, { catalogItems: [], tickets: [] }), null);
  }
});

test("reviewAlerts 1.73: Bán hàng / Kế toán / Nhân sự không nhận dòng giấy tờ dù có số", () => {
  for (const w of [SALES, ACCOUNTING, who("HR")]) assert.equal(reviewAlerts(w, { catalogItems: [], tickets: [], expiringCount: 3 }), null);
});
