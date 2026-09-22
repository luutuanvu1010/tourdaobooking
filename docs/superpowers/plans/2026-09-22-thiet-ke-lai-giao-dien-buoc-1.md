# Thiết kế lại giao diện — Bước 1 (khung dùng chung + trang mẫu "Đơn hàng") — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle khung dùng chung (thanh đầu trang, bề rộng nội dung) và trang "Đơn hàng" (`/`) theo bản thiết kế mới đã duyệt, mở rộng `GET /api/orders` để trả đủ dữ liệu cho thẻ đơn mới, làm mẫu để chủ dự án duyệt phong cách trước khi restyle 10 trang còn lại (Bước 2, kế hoạch riêng).

**Architecture:** Không đổi kiến trúc — vẫn HTML tĩnh + TypeScript thuần (`web/*.ts`) → esbuild → `public/js/`. Thêm một hàm gộp dữ liệu thuần (`summarizeServices`) trong module `orders` để tính tóm tắt dịch vụ/số khách/thông tin chuyến cho danh sách đơn, nối vào truy vấn `listOrders` hiện có. Phần giao diện chỉ đổi trong `public/index.html`, `web/orders.ts`, `web/format.ts`, và token/mốc dùng chung trong `public/app.css`.

**Tech Stack:** TypeScript thuần, Node 22 (`node --test`), esbuild, D1 (SQLite), Cloudflare Workers. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` (đọc cả §16 — quyết định bổ sung của chủ dự án). Kế hoạch này CHỈ làm Bước 1 của §11; Bước 2 (10 trang còn lại) và Bước 3 (Trang chủ mới) là kế hoạch riêng, làm sau khi chủ duyệt hình ảnh của Bước 1.

## Global Constraints

- Tiếng Việt có dấu đầy đủ ở mọi thông báo/giao diện; không lộ chữ Anh hay mã trạng thái thô cho người dùng.
- Không dùng `innerHTML`; mọi DOM dựng bằng `h()` (`web/dom.ts`).
- CSS trong `public/app.css` từ mốc `/* ---------- app iPhone (PWA)` trở đi: CHỈ dùng token (biến `var(--...)`), không hex/px viết cứng (trừ đúng `1px`).
- `web/` chỉ import từ `../src/shared/*` (không đuôi `.ts`), KHÔNG được import `src/modules/`.
- Module `orders` (`src/modules/orders/*`) chỉ đọc/ghi trực tiếp bảng của chính nó (`orders`, `order_service`, `order_item`); đọc module khác phải qua view `v_<tiền tố>_*` — không áp dụng ở đây vì không đọc module khác.
- Sửa hành vi → viết test đỏ trước, xanh sau. Logic thuần có `*.test.ts` cạnh tệp. Hành vi API có kịch bản `tests/e2e`.
- Sửa `web/*.ts` nào thì chạy lại đúng kịch bản Chrome tương ứng (bảng cuối `web/CLAUDE.md`); các kịch bản dùng CHUNG kho cookie — trang của tài khoản nào mở SAU CÙNG.
- Không tự chạy `git push`, deploy, hay bất kỳ lệnh ghi lên D1 remote (CLAUDE.md §8) — dừng lại, đưa lệnh cho chủ dự án tự chạy nếu cần.
- Tiền = số nguyên VNĐ; ngày/giờ dân sự theo giờ Việt Nam; không xoá cứng dữ liệu (không áp dụng trực tiếp ở việc này, nhắc lại vì đụng bảng `order_service`).

## Phát hiện quan trọng khi lập kế hoạch (đọc trước khi làm Task 3)

Đặc tả §6/§16 mục 3 nói mốc "bảng → thẻ 900px" đổi từ 960px hiện tại. Đã đọc `public/app.css` thật: **mốc `@media (min-width: 960px)` duy nhất trong CSS (dòng 323) là của TRANG LẬP ĐƠN** (`main.form-page`, cột phụ dính `#order-form`) — không phải mốc dùng chung cho bảng→thẻ của các trang Nhân viên/Dịch vụ/Địa điểm/Hồ sơ/Nhật ký. Mốc bảng→thẻ dùng chung đó **CHƯA TỒN TẠI trong mã** — nó sẽ được TẠO MỚI khi Bước 2 restyle các trang có bảng. Vì Bước 1 không đụng trang nào có bảng (trang Đơn hàng chỉ có MỘT dạng thẻ, không có bảng — §16 mục 2), **Task 3 dưới đây KHÔNG đổi mốc 960px này** — chỉ đổi `--bar-h` và thêm token bề rộng nội dung. Việc lập mốc "900px bảng→thẻ" dùng chung để lại cho kế hoạch Bước 2.

## Task 1: Hàm gộp dữ liệu dịch vụ cho danh sách đơn (logic thuần)

**Files:**
- Modify: `src/modules/orders/repository.ts`
- Test: `src/modules/orders/repository.test.ts` (tạo mới — module này hiện chưa có test riêng, `listOrders` mới chỉ được kiểm qua `tests/e2e/orders.mjs`)

**Interfaces:**
- Produces: `export interface ServiceSummaryRow { order_id: string; name: string; sort_order: number; pax_adult: number; pax_child: number; pax_senior: number; pax_infant: number; depart_date: string | null; pickup_time: string | null; pickup_place: string | null }`, `export interface ServiceSummary { serviceNames: string[]; pax: PaxCounts; trip: OrderSummaryTripDto }`, `export const EMPTY_SUMMARY: ServiceSummary`, `export function summarizeServices(rows: readonly ServiceSummaryRow[]): Map<string, ServiceSummary>`.
- Consumes (Task 2): các export trên; `OrderSummaryTripDto` sẽ được thêm ở Task 2 vào `src/shared/contracts.ts` — Task 1 cần type đó tồn tại trước khi biên dịch được, nên **làm luôn phần thêm type vào `contracts.ts` ở bước 1 của Task này** (không đợi Task 2), Task 2 chỉ mở rộng `OrderSummaryDto` và nối hàm vào `listOrders`.

- [ ] **Step 1: Thêm kiểu `OrderSummaryTripDto` vào `src/shared/contracts.ts`**

Mở `src/shared/contracts.ts`, thêm ngay TRƯỚC dòng `export type OrderSummaryDto = Pick<` (dòng 156):

```ts
/** Thông tin chuyến rút gọn cho thẻ trong danh sách đơn — lấy từ dịch vụ ĐẦU TIÊN theo sort_order của đơn (không gộp nhiều dịch vụ). */
export interface OrderSummaryTripDto {
  departDate: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
}

```

- [ ] **Step 2: Viết test đỏ cho `summarizeServices`**

Tạo tệp `src/modules/orders/repository.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeServices, type ServiceSummaryRow } from "./repository.ts";

const row = (o: Partial<ServiceSummaryRow> & { order_id: string; name: string; sort_order: number }): ServiceSummaryRow => ({
  pax_adult: 0, pax_child: 0, pax_senior: 0, pax_infant: 0, depart_date: null, pickup_time: null, pickup_place: null, ...o,
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
```

- [ ] **Step 3: Chạy test, xác nhận LỖI**

Run: `node --test src/modules/orders/repository.test.ts`
Expected: FAIL — `summarizeServices` chưa được export từ `repository.ts` (lỗi import/`is not a function`).

- [ ] **Step 4: Cài `summarizeServices` trong `repository.ts`**

Mở `src/modules/orders/repository.ts`. Thêm `OrderSummaryTripDto` vào dòng import type đầu tệp (dòng 2), sau `OrderDetailDto`:

```ts
import type { OrderDetailDto, OrderDto, OrderItemDto, OrderServiceDto, OrderSummaryDto, OrderSummaryTripDto } from "../../shared/contracts";
```

Thêm khối sau, ngay TRƯỚC hàm `toDto` (trước dòng `function toDto(r: OrderRow): OrderDto {`):

```ts
export interface ServiceSummaryRow {
  order_id: string;
  name: string;
  sort_order: number;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
  depart_date: string | null;
  pickup_time: string | null;
  pickup_place: string | null;
}

export interface ServiceSummary {
  serviceNames: string[];
  pax: PaxCounts;
  trip: OrderSummaryTripDto;
}

export const EMPTY_SUMMARY: ServiceSummary = {
  serviceNames: [],
  pax: { adult: 0, child: 0, senior: 0, infant: 0 },
  trip: { departDate: null, pickupTime: null, pickupPlace: null },
};

/**
 * Gộp các dòng order_service thành tóm tắt cho từng đơn, dùng cho thẻ ở danh sách đơn (đặc tả §7).
 * ĐÒI HỎI `rows` đã sắp theo (order_id, sort_order) — dòng đầu gặp của mỗi order_id quyết định `trip`
 * (dịch vụ có sort_order nhỏ nhất, cùng quy ước với SERVICE_SELECT đã dùng ở tệp này). `pax` cộng dồn TẤT CẢ dịch vụ của đơn.
 * Thuần, không đụng DB — test độc lập ở repository.test.ts.
 */
export function summarizeServices(rows: readonly ServiceSummaryRow[]): Map<string, ServiceSummary> {
  const out = new Map<string, ServiceSummary>();
  for (const r of rows) {
    let s = out.get(r.order_id);
    if (!s) {
      s = { serviceNames: [], pax: { adult: 0, child: 0, senior: 0, infant: 0 }, trip: { departDate: r.depart_date, pickupTime: r.pickup_time, pickupPlace: r.pickup_place } };
      out.set(r.order_id, s);
    }
    s.serviceNames.push(r.name);
    s.pax = { adult: s.pax.adult + r.pax_adult, child: s.pax.child + r.pax_child, senior: s.pax.senior + r.pax_senior, infant: s.pax.infant + r.pax_infant };
  }
  return out;
}

```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `node --test src/modules/orders/repository.test.ts`
Expected: PASS (2/2 test).

- [ ] **Step 6: Kiểm kiểu toàn bộ**

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/shared/contracts.ts src/modules/orders/repository.ts src/modules/orders/repository.test.ts
git commit -m "Thêm hàm gộp dịch vụ cho thẻ đơn ở danh sách (thuần, chưa nối vào API)"
```

## Task 2: Mở rộng `GET /api/orders` trả đủ trường cho thẻ đơn

**Files:**
- Modify: `src/shared/contracts.ts`
- Modify: `src/modules/orders/repository.ts`
- Test: `tests/e2e/orders.mjs`

**Interfaces:**
- Consumes: `summarizeServices`, `ServiceSummaryRow`, `ServiceSummary`, `EMPTY_SUMMARY` (Task 1); `OrderSummaryTripDto` (Task 1 Step 1).
- Produces: `OrderSummaryDto` mới có thêm `customerNote`, `depositAmount`, `serviceNames`, `pax`, `trip`; `listOrders()` trả đúng các trường này qua `GET /api/orders`. Trang Đơn hàng (Task 5) và mọi việc sau này DÙNG các trường này qua `Api.OrderSummary` (alias tái xuất ở `web/api.ts`, không cần sửa `web/api.ts`).

- [ ] **Step 1: Mở rộng `OrderSummaryDto`**

Trong `src/shared/contracts.ts`, thay khối `OrderSummaryDto` hiện tại (dòng 156-159):

```ts
export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "total" | "remainingAmount" | "staffName" | "createdAt"
>;
```

thành:

```ts
export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "customerNote" | "total" | "depositAmount" | "remainingAmount" | "staffName" | "createdAt"
> & {
  /** Tên các dịch vụ theo đúng thứ tự trong đơn (sort_order) — client tự quyết hiện đầu + "+N dịch vụ" hay liệt kê hết (§7 mục 3). */
  serviceNames: string[];
  /** Tổng số khách theo loại, CỘNG DỒN mọi dịch vụ của đơn. */
  pax: PaxCounts;
  /** Của dịch vụ ĐẦU TIÊN (sort_order nhỏ nhất); mọi trường null nếu đơn chưa có dịch vụ nào. */
  trip: OrderSummaryTripDto;
};
```

- [ ] **Step 2: Viết test e2e ĐỎ cho trường mới**

Mở `tests/e2e/orders.mjs`. Sửa dòng import đầu tệp (dòng 2) từ:

```js
import { ACCOUNTS, call, login, manualService, randomPhone, session, sql } from "./lib.mjs";
```

thành:

```js
import { ACCOUNTS, call, login, manualService, randomPhone, session, sql, vnDate } from "./lib.mjs";
```

Tìm dòng `assert.deepEqual(lines(o).map((i) => i.lineTotal), [1350000, 50000]);` (dòng 28 hiện tại) — đây là dòng CUỐI của khối kiểm tra tạo đơn `o`. Thêm NGAY SAU dòng đó (trước dòng comment `// nhân viên B xem được đơn của A`):

```js

// Danh sách đơn trả đủ trường cho thẻ mới (đặc tả thiết kế lại giao diện §7, §16 mục 1)
r = await call(A, "GET", "/api/orders?limit=100");
assert.equal(r.status, 200);
const summary = r.body.orders.find((x) => x.id === o.id);
assert.ok(summary, "đơn vừa tạo phải có trong danh sách");
assert.deepEqual(summary.serviceNames, ["Dịch vụ thử"], "tên dịch vụ mặc định của manualService");
assert.deepEqual(summary.pax, { adult: 3, child: 0, senior: 0, infant: 0 });
assert.equal(summary.trip.departDate, vnDate(7), "departDate mặc định của manualService");
assert.equal(summary.trip.pickupTime, null, "không gửi pickupTime trong input này");
assert.equal(summary.trip.pickupPlace, null);
assert.equal(summary.depositAmount, 500000);
assert.equal(summary.customerNote, null, "input không gửi customerNote");
```

*Ghi chú cho người thi công:* nếu giá trị thật khi chạy lệch với dự đoán ở trên (ví dụ `pax` không mặc định 0 cho loại không gửi), sửa đúng theo giá trị THẬT quan sát được — các con số trên là suy ra từ đọc mã (`manualService` ở `tests/e2e/lib.mjs`), chưa chạy thật lần nào.

- [ ] **Step 3: Chạy test e2e, xác nhận LỖI**

Cần `wrangler dev` + D1 local đang chạy (xem `docs/CHANGE-GUIDE.md`/`tests/e2e/README.md` nếu chưa quen; script test tự khởi tạo môi trường tạm — xem cách các lệnh `test:e2e` khác trong `package.json` chạy).
Run: `npm run test:e2e -- orders`
Expected: FAIL — `summary.serviceNames`/`summary.pax`/`summary.trip`/`summary.depositAmount`/`summary.customerNote` là `undefined` (trường chưa tồn tại trong response thật).

- [ ] **Step 4: Nối `summarizeServices` vào `listOrders`**

Trong `src/modules/orders/repository.ts`, thay toàn bộ hàm `listOrders` (dòng 197-232) bằng:

```ts
export async function listOrders(
  db: D1Database,
  opts: { q: string; status: OrderStatus | null; limit: number; offset: number },
): Promise<{ orders: OrderSummaryDto[]; hasMore: boolean }> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.status) {
    where.push("o.status = ?");
    binds.push(opts.status);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }
  const sql = `${ORDER_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.created_at DESC, o.rowid DESC LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<OrderRow>();
  const page = results.slice(0, opts.limit).map(toDto);

  // Tóm tắt dịch vụ CHỈ cho các đơn thật sự trả về (page, KHÔNG PHẢI results — results có thêm 1 dòng để dò hasMore).
  // page.length ≤ opts.limit ≤ 100 (chặn ở intParam của route GET /api/orders) nên IN (...) luôn có giới hạn.
  const summaries = page.length
    ? summarizeServices(
        (
          await db
            .prepare(
              `SELECT order_id, name, sort_order, pax_adult, pax_child, pax_senior, pax_infant, depart_date, pickup_time, pickup_place
               FROM order_service WHERE order_id IN (${page.map(() => "?").join(",")}) ORDER BY order_id, sort_order`,
            )
            .bind(...page.map((d) => d.id))
            .all<ServiceSummaryRow>()
        ).results,
      )
    : new Map<string, ServiceSummary>();

  const orders: OrderSummaryDto[] = page.map((d) => {
    const s = summaries.get(d.id) ?? EMPTY_SUMMARY;
    return {
      id: d.id,
      orderCode: d.orderCode,
      status: d.status,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerNote: d.customerNote,
      total: d.total,
      depositAmount: d.depositAmount,
      remainingAmount: d.remainingAmount,
      staffName: d.staffName,
      createdAt: d.createdAt,
      serviceNames: s.serviceNames,
      pax: s.pax,
      trip: s.trip,
    };
  });
  return { orders, hasMore: results.length > opts.limit };
}
```

- [ ] **Step 5: Chạy test e2e, xác nhận PASS**

Run: `npm run test:e2e -- orders`
Expected: PASS toàn bộ (kể cả các assert cũ trong tệp, không chỉ đoạn mới thêm).

- [ ] **Step 6: `npm test` + `npm run typecheck`**

Run: `npm test && npm run typecheck`
Expected: cả hai xanh / 0 lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/shared/contracts.ts src/modules/orders/repository.ts tests/e2e/orders.mjs
git commit -m "Mở rộng GET /api/orders: trả tên dịch vụ, số khách, thông tin chuyến, ghi chú, đã trả cho thẻ đơn"
```

## Task 3: Cập nhật khung dùng chung (thanh đầu trang, bề rộng nội dung)

**Files:**
- Modify: `public/app.css`

**Interfaces:**
- Produces: token `--bar-h` đổi giá trị (52px→60px, đã tồn tại — không đổi tên); token MỚI `--w-main: 1200px` (nhóm "Riêng của Tour Đảo Booking"). Mọi trang dùng `<main>` mặc định (không có class riêng) tự động nhận bề rộng mới — trừ trang Lập đơn (`main.form-page`, có override riêng `--w-form`, không đổi ở đây).

Không có test tự động cho giá trị CSS cụ thể — kiểm bằng `test:e2e -- pwa` (quét không còn hex/px viết cứng ngoài `1px`) và kịch bản Chrome (Task 6, vì `shell.ts`/`app.css` là khung DÙNG CHUNG, ảnh hưởng mọi trang, không chỉ trang Đơn hàng).

- [ ] **Step 1: Đổi `--bar-h`**

Trong `public/app.css` dòng 70, đổi:

```css
  --bar-h: 52px;            /* thanh đầu trang, chưa tính vùng an toàn */
```

thành:

```css
  --bar-h: 60px;            /* thanh đầu trang, chưa tính vùng an toàn — chủ dự án duyệt tăng từ 52px theo bản thiết kế mới (đặc tả §16 mục 3) */
```

- [ ] **Step 2: Thêm token `--w-main` vào nhóm "Riêng của Tour Đảo Booking"**

Tìm dòng comment nhóm (khoảng dòng 67: `/* — Riêng của Tour Đảo Booking (KHÔNG có trong tourdaovn)... — */`). Thêm ngay dòng sau đó (trước token tiếp theo của nhóm):

```css
  --w-main: 1200px;         /* bề rộng nội dung tối đa các trang mặc định — chủ dự án duyệt tăng từ 960px (đặc tả §16 mục 3); trang Lập đơn dùng --w-form riêng, không đổi */
```

- [ ] **Step 3: Áp token vào `main`**

Dòng 102, đổi:

```css
main { max-width: 960px; margin: 0 auto; padding: var(--s4) max(var(--s4), env(safe-area-inset-right)) var(--s4) max(var(--s4), env(safe-area-inset-left)); }
```

thành:

```css
main { max-width: var(--w-main); margin: 0 auto; padding: var(--s4) max(var(--s4), env(safe-area-inset-right)) var(--s4) max(var(--s4), env(safe-area-inset-left)); }
```

- [ ] **Step 4: Sửa chú thích lỗi thời**

Dòng 66 có chú thích nhắc "≥ 960px" cho `--w-side` — không đổi hành vi, nhưng để tránh gây hiểu lầm khi đọc lại sau này, sửa số trong chú thích đó thành khớp mốc order-form thật (960px KHÔNG đổi ở token này — mốc 960px của `.form-page` vẫn giữ nguyên, xem "Phát hiện quan trọng" ở đầu tài liệu). Nếu dòng đó đang viết đúng "≥ 960px", **không cần sửa** — chỉ kiểm tra khớp, đây không phải lỗi.

- [ ] **Step 5: Build + quét token**

Run: `npm run build:web && npm run test:e2e -- pwa`
Expected: PASS (không có hex/px viết cứng lọt qua quét; nếu `pwa.mjs` báo lỗi khác không liên quan tới thay đổi ở trên, DỪNG lại và báo — không tự sửa phần không liên quan).

- [ ] **Step 6: Commit**

```bash
git add public/app.css
git commit -m "Khung dùng chung: tăng thanh đầu trang lên 60px, thêm token bề rộng nội dung 1200px"
```

*Việc kiểm bằng mắt trên nhiều trang (vì đây là token DÙNG CHUNG) gộp vào Task 6, không lặp lại ở đây.*

## Task 4: Rà soát khuôn lớp phủ dùng chung (đặc tả §8)

**Files:**
- Đọc (không chắc sẽ sửa): `web/confirmation-dialog.ts`, `web/trip-sheet.ts`
- Ghi kết quả: `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md` (tạo mới — sổ điều phối theo CLAUDE.md §9, dùng chung cho cả Bước 1/2/3 sau này)

Đã đối chiếu trước 4 tiêu chí của §8 với 2 tệp hộp thoại thật (KHÔNG phải đoán — trích nguyên văn mã):

| Tiêu chí §8 | `confirmation-dialog.ts` | `trip-sheet.ts` |
|---|---|---|
| `role="dialog"` + `aria-modal` + `aria-labelledby` | Có (dòng 135) | Có (dòng 62) |
| Nền `inert` khi mở, gỡ khi đóng | Có (dòng 143, 156, 231) | Có (dòng 69, 80, 126) |
| Esc / ✕ / chạm nền đóng, trả focus | Esc có (dòng 149); trả focus (dòng 160, 182) | Esc có (dòng 75); trả focus (dòng 83) |
| Hai khung `requestAnimationFrame` trước khi mở | Có (dòng 234) | Có (dòng 129) |

**Kết luận: cả hai tệp đã ĐẠT đủ 4 tiêu chí — KHÔNG cần sửa mã.** `web/catalog-picker.ts` (cũng có trong bảng ánh xạ §4 của tài liệu bàn giao) thực chất là một Ô TÌM + DANH SÁCH nội tuyến (không phải hộp thoại — tự tệp đó ghi chú "không role listbox/option", không có `role="dialog"`, không `inert`), nên 4 tiêu chí trên KHÔNG áp dụng cho nó; `web/banner.ts`/`web/maintenance-screen.ts` cũng không phải hộp thoại (banner nội tuyến / lớp phủ toàn trang không có focus trap) — hai tệp này thuộc bảng "trạng thái/thông báo" của §8 (chỉ đổi trình bày lúc restyle từng trang, không phải việc audit ở đây).

- [ ] **Step 1: Ghi kết quả rà soát vào sổ điều phối**

Tạo `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md`:

```markdown
# Nhật ký thi công — Thiết kế lại giao diện

## Bước 1 — Khung dùng chung + trang mẫu "Đơn hàng"

### Task 4: Rà soát khuôn lớp phủ dùng chung (2026-09-22)

Đối chiếu `web/confirmation-dialog.ts` và `web/trip-sheet.ts` với 4 tiêu chí §8 đặc tả
(role=dialog+aria-modal+aria-labelledby, inert nền, Esc/✕/chạm nền + trả focus, hai khung
requestAnimationFrame). Cả hai ĐÃ ĐẠT đủ — không sửa mã, không cần test mới.

`web/catalog-picker.ts` không phải hộp thoại (ô tìm + danh sách nội tuyến, tự tệp ghi chú
không dùng role listbox) — không áp dụng 4 tiêu chí trên. `web/banner.ts`/`web/maintenance-screen.ts`
thuộc bảng "trạng thái/thông báo" của §8, không phải bảng hộp thoại — audit khi restyle từng
trang dùng chúng (Bước 2), không phải ở đây.

Kết luận: Task 4 không có thay đổi mã.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md
git commit -m "Ghi nhật ký: rà soát khuôn lớp phủ dùng chung đã đạt, không cần sửa"
```

## Task 5: Restyle trang "Đơn hàng" (`/`)

**Files:**
- Modify: `public/index.html`
- Modify: `web/orders.ts`
- Modify: `web/format.ts`
- Modify: `public/app.css`

**Interfaces:**
- Consumes: `Api.OrderSummary` (= `OrderSummaryDto` mở rộng ở Task 2, tái xuất qua `web/api.ts` — KHÔNG cần sửa `web/api.ts`); `PAX_ORDER` (`src/shared/order-lines.ts`); `PaxCounts` (đã có, qua `./api`).
- Produces: `dayMonth(iso: string): string`, `paxCounts(pax: PaxCounts): string` trong `web/format.ts` — có thể dùng lại ở Bước 2/3 nếu trang khác cần cùng cách hiển thị.

Quyết định trình bày (surface, đảo ngược được — không cần hỏi chủ, ghi lại ở đây theo đúng quy tắc P8):
- "Ngày + giờ đón" thiếu cả `departDate` lẫn `pickupTime`: hiện chữ "Chưa có ngày đón" (thay vì để trống) — đơn nháp mới tạo, chưa nhập thông tin chuyến ở dịch vụ nào, vẫn hợp lệ.
- "+N dịch vụ" (đặc tả §12 mục 3): hiện tên dịch vụ ĐẦU + " +N dịch vụ" nếu có từ 2 dịch vụ trở lên; KHÔNG liệt kê hết (khớp đúng chữ trong tài liệu bàn giao gốc, mục 4 bảng thông tin cốt lõi).
- Viết tắt số khách theo đúng ký tự đầu tên tiếng Việt (giống ví dụ trong tài liệu bàn giao "05 NL · 02 TE · 01 EB"): NL=Người lớn, TE=Trẻ em, NCT=Người cao tuổi, EB=Em bé; đếm đệm 2 chữ số; bỏ loại 0 khách.

- [ ] **Step 1: Thêm 2 hàm định dạng vào `web/format.ts`**

Thêm dòng import đầu tệp (dòng 2, cạnh import `type` hiện có):

```ts
import { PAX_ORDER, type PaxCounts } from "../src/shared/order-lines";
```

Thêm cuối tệp:

```ts

/** "2026-10-01" → "01/10" — thao tác chuỗi thuần, KHÔNG dùng `new Date()` (tránh lệch múi giờ khi ngày không kèm giờ). */
export function dayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

const PAX_ABBR: Record<(typeof PAX_ORDER)[number], string> = { adult: "NL", child: "TE", senior: "NCT", infant: "EB" };

/** "05 NL · 02 TE · 01 EB" — đếm 2 chữ số, bỏ loại có 0 khách, đúng thứ tự PAX_ORDER (đặc tả §7 mục 4). */
export function paxCounts(pax: PaxCounts): string {
  return PAX_ORDER.filter((c) => pax[c] > 0)
    .map((c) => `${String(pax[c]).padStart(2, "0")} ${PAX_ABBR[c]}`)
    .join(" · ");
}
```

- [ ] **Step 2: Thêm khối "đang tải" vào `public/index.html`**

Trong `public/index.html`, thay dòng 15 (`  <div id="list"></div>`) thành:

```html
  <div id="loading" class="skeleton-list" aria-hidden="true"><div class="skeleton-row"></div><div class="skeleton-row"></div></div>
  <div id="list"></div>
```

- [ ] **Step 3: Viết lại `row()` trong `web/orders.ts`**

Thay hàm `row()` hiện tại (dòng 26-39) bằng:

```ts
function row(o: OrderSummary): Row {
  // Chỗ giữ sẵn một dòng chữ (không nhảy bố cục khi tên về); `is-pending` = chưa biết. Lời gọi lỗi → ẩn hẳn chỗ này, KHÔNG hiện "Chưa có người phụ trách" (đó là khẳng định về dữ liệu).
  const slot = h("div", { class: "order-row-handler is-pending" });
  const when = o.trip.departDate ? `${dayMonth(o.trip.departDate)}${o.trip.pickupTime ? ` · ${o.trip.pickupTime}` : ""}` : "Chưa có ngày đón";
  const serviceLine = o.serviceNames.length === 0 ? "—" : o.serviceNames.length === 1 ? o.serviceNames[0] : `${o.serviceNames[0]} +${o.serviceNames.length - 1} dịch vụ`;
  const el = h(
    "a",
    { class: "order-row", href: `/order?id=${encodeURIComponent(o.id)}` },
    h("div", { class: "order-row-top" }, h("strong", null, when), h("span", { class: `badge badge-${o.status}` }, STATUS_LABEL[o.status])),
    h("div", { class: "order-row-main" }, h("strong", null, o.orderCode), h("span", null, o.customerName, " · ", o.customerPhone)),
    h("div", { class: "muted" }, serviceLine),
    h("div", { class: "muted" }, paxCounts(o.pax)),
    slot,
    h("div", { class: "order-row-money" }, h("span", null, "Tổng ", h("b", null, vnd(o.total))), h("span", null, "Đã trả ", h("b", null, vnd(o.depositAmount))), h("span", null, "Còn lại ", h("b", null, vnd(o.remainingAmount)))),
    ...(o.trip.pickupPlace ? [h("div", { class: "muted" }, "Đón tại ", o.trip.pickupPlace)] : []),
    ...(o.customerNote ? [h("div", { class: "order-row-note" }, o.customerNote)] : []),
  );
  return { id: o.id, el, slot };
}
```

Sửa dòng import `format` (dòng 5) từ:

```ts
import { STATUS_LABEL, dateTime, vnd } from "./format";
```

thành:

```ts
import { STATUS_LABEL, dayMonth, paxCounts, vnd } from "./format";
```

(`dateTime` không còn dùng ở tệp này sau khi đổi `row()` — nếu `tsc` báo "declared but never used", xoá khỏi import; kiểm ở Step 6.)

- [ ] **Step 4: Hiện/ẩn khối "đang tải" trong `load()`**

Thêm biến ở đầu tệp, cạnh khai báo `emptyEl`/`errorEl` (dòng 13-14):

```ts
const loadingEl = byId("loading");
```

Trong hàm `load()`, sau dòng `showError(errorEl, null);` (dòng 67), thêm:

```ts
  if (reset) loadingEl.hidden = false;
```

Ngay sau dòng `if (seq !== loadSeq) return;` (dòng 73), thêm:

```ts
    loadingEl.hidden = true;
```

Trong khối `catch`, đầu dòng xử lý lỗi (dòng 82), thêm trước `showError(...)`:

```ts
      loadingEl.hidden = true;
```

- [ ] **Step 5: CSS — thẻ đơn kiểu "Tiêu chuẩn" + khối "đang tải"**

Trong `public/app.css`, thay dòng 133 (`.order-row { ... }`) thành:

```css
.order-row { display: grid; gap: var(--s1); padding: var(--s3) var(--s4); margin-bottom: var(--s2); color: inherit; text-decoration: none; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-md); }
```

(đổi nền từ `var(--c-bg)` — xám nhạt — sang `var(--c-surface)` trắng + thêm viền 1px, đúng phong cách "1a Tiêu chuẩn" đã chốt ở §16 mục 4; giữ nguyên `.order-row:hover` dòng 134, không đổi opacity.)

Thêm dòng mới ngay sau `.order-row-money { ... }` (dòng 136):

```css
.order-row-top { display: flex; justify-content: space-between; align-items: baseline; }
.order-row-note { color: var(--c-accent-strong); font-weight: 600; }
.skeleton-list { display: grid; gap: var(--s2); margin-bottom: var(--s2); }
.skeleton-row { height: 96px; border-radius: var(--radius-md); background: var(--c-surface-alt); animation: skeleton-pulse 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .skeleton-row { animation: none; } }
@keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .6; } }
```

- [ ] **Step 6: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi. Nếu `tsc` báo `dateTime`/`OrderSummary` (import cũ) không dùng, xoá import thừa trong `web/orders.ts` rồi chạy lại.

- [ ] **Step 7: `npm test` + quét token PWA**

Run: `npm test && npm run test:e2e -- pwa`
Expected: cả hai xanh.

- [ ] **Step 8: Kịch bản Chrome `v1-nguoi-phu-trach.mjs`**

Đây là kịch bản DUY NHẤT của `web/CLAUDE.md` liệt kê cho `web/orders.ts`. Chạy theo hướng dẫn đầu tệp kịch bản (`docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs`, cần `npm run build:web` trước, cần biến `AXE_JS`/`CHROME_BIN` trỏ tới Chrome + axe-core NGOÀI repo — xem `tests/e2e/README.md` nếu chưa có sẵn):

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs`
Expected: mọi bước in "✓", thoát mã 0. Đây là kịch bản CŨ (kiểm người phụ trách) — nó KHÔNG biết về các trường mới (ngày đón, dịch vụ, số khách...), chỉ xác nhận layout mới không làm hỏng phần "Phụ trách: <tên>" đã có. Nếu ✗ ở bước nào liên quan tới vị trí/format dòng người phụ trách do bố cục mới đổi chỗ, SỬA lại CSS/DOM của khối đó cho khớp lại hành vi cũ (không đổi hành vi người phụ trách), rồi chạy lại tới khi ✓ hết — không được sửa kịch bản để "cho qua".

- [ ] **Step 9: Commit**

```bash
git add public/index.html web/orders.ts web/format.ts public/app.css
git commit -m "Restyle trang Đơn hàng: thêm ngày đón/dịch vụ/số khách/đã trả/nơi đón/ghi chú, khối đang tải, thẻ kiểu Tiêu chuẩn"
```

## Task 6: Kiểm xuyên trang (vì Task 3 đổi khung dùng chung)

**Files:** không sửa thêm — chỉ chạy lại các kịch bản đã có, vì `--bar-h`/`--w-main` (Task 3) ảnh hưởng MỌI trang gọi `initShell()`, không chỉ trang Đơn hàng. `web/CLAUDE.md` không có dòng riêng cho `web/shell.ts` trong bảng "sửa tệp nào → chạy kịch bản nào" — suy luận đúng là chạy TẤT CẢ kịch bản Chrome hiện có (mỗi kịch bản đều mở trang qua `initShell()`).

- [ ] **Step 1: Ba kịch bản A2** (đụng `web/order-form.ts`/`web/order.ts`/`web/trip-sheet.ts`, dùng chung khung)

Cùng mẫu lệnh như Task 5 Step 8 (đọc đầu mỗi tệp trước khi chạy — nếu có ghi chú thứ tự tài khoản/tham số riêng khác mẫu dưới, làm theo đúng tệp, không theo mẫu này):

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs`
Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs`
Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-sheet.mjs`

(đã xác nhận đúng 3 tên tệp thật bằng `ls docs/evidence/2026-09-20-a2/kich-ban/`.)
Expected: cả 3 thoát mã 0.

- [ ] **Step 2: `v1-dang-nhap.mjs`** (cần mạng — dài, ~9 phút)

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs`
Expected: thoát mã 0.

- [ ] **Step 3: `v1-bao-tri.mjs`**

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs`
Expected: thoát mã 0.

- [ ] **Step 4: Xem bằng mắt trên điện thoại thật**

Không tự động hoá được — đúng theo đặc tả §11 Bước 1: chủ dự án tự mở app trên điện thoại thật, xác nhận thanh đầu trang/bề rộng nội dung không vỡ ở CÁC TRANG CHƯA RESTYLE (10 trang còn lại tạm thời rộng hơn trước — nội dung của chúng chưa đổi, chỉ khung ngoài rộng hơn — đây là hiệu ứng phụ tạm thời đã biết trước, sẽ hết khi Bước 2 xong). Ghi kết quả vào sổ điều phối (Task 4 Step 1 đã tạo).

- [ ] **Step 5: Ghi kết quả Bước 1 vào sổ điều phối, commit**

Thêm vào `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md`:

```markdown
### Bước 1 hoàn tất thi công (2026-09-22 hoặc ngày thật lúc chạy)

- `npm test`, `npm run typecheck`, `npm run test:e2e -- orders`, `npm run test:e2e -- pwa`: xanh.
- Kịch bản Chrome: v1-nguoi-phu-trach, 3× a2-smoke-*, v1-dang-nhap, v1-bao-tri — kết quả: <điền ✓/✗ từng cái>.
- Xem tay trên điện thoại thật: <điền kết quả>.
- CHƯA có người kiểm độc lập đọc lại mã (việc lớn theo CLAUDE.md §3 — cần trước khi báo "đạt" với chủ dự án).
```

```bash
git add docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md
git commit -m "Ghi trạng thái: Bước 1 (khung dùng chung + trang mẫu Đơn hàng) đã thi công, chờ kiểm độc lập"
```

---

## Sau khi Task 6 xong (không phải một Task thi công — bắt buộc theo CLAUDE.md §3)

Đây là việc lớn (đụng giao diện dùng chung + đổi hợp đồng API). Trước khi báo "đạt" với chủ dự án:
1. Dispatch một subagent **kiểm độc lập, chỉ đọc**: đọc lại mã thật (không phải đọc kế hoạch này), tự chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- orders`, `npm run test:e2e -- pwa`, và ít nhất một kịch bản Chrome — báo cáo, KHÔNG sửa mã.
2. Chỉ báo "đạt" với chủ dự án dựa trên báo cáo đó, theo đúng khuôn 4 mục ở CLAUDE.md §4.
3. Sau khi chủ dự án duyệt hình ảnh trên điện thoại thật, mới bắt đầu lập kế hoạch Bước 2 (10 trang còn lại).
