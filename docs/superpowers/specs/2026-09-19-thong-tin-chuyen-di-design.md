# Thông tin chuyến đi theo từng dịch vụ trong đơn — thiết kế

Ngày: 2026-09-19 · Trạng thái: chủ dự án đã duyệt từng mục trong phiên brainstorming, chờ duyệt bản viết này.

## 1. Bối cảnh và vấn đề

Rà soát luồng lập đơn so với module booking của tourdaovn (`tourdaovn/src/lib/booking/quote.ts`, `schema.ts`, `BookingForm.astro`) cho thấy:

- Cách tính tiền đã khớp booking: dịch vụ `perPax` sinh một dòng cho mỗi loại khách có giá; `perNPax` sinh một dòng số lượt = `ceil(khách / N)`. Dịch vụ nhóm TTB chỉ có giá người lớn là **đúng chủ ý** (một giá cho mọi loại khách) — website cũng chỉ hiện một ô.
- Điểm bất hợp lý thật sự nằm ở chỗ đơn **không lưu thông tin vận hành**:
  1. Không có ngày giờ khởi hành. Spec cũ để ở ô chữ `detail`, nhưng khi chọn từ danh mục ô đó bị ghi chú loại khách chiếm → không lọc được "chuyến ngày mai".
  2. Không lưu số khách theo loại; sửa nháp chỉ còn ô "SL", có thể lệch với số khách (vd phao chuối: chi tiết "7 khách" nhưng SL sửa thành 1).
  3. Trần số khách 100.000, không có tối thiểu.
  4. Không có điểm đón / check-in.
  5. Ghi chú loại khách chỉ hiện sau khi thêm dòng.
  6. Máy chủ không đối chiếu đơn giá với danh mục.
- Dịch vụ giá chung hiện ô "Người lớn" → nhân viên hiểu nhầm là không thêm được trẻ em.

## 2. Quyết định đã chốt

| # | Quyết định |
|---|---|
| Q1 | Thông tin chuyến gắn **theo từng dịch vụ** trong đơn (một đơn có thể nhiều dịch vụ khác ngày, khác điểm đón). |
| Q2 | Mỗi dịch vụ có: ngày + giờ khởi hành; giờ + điểm đón; ngày + giờ + nơi check-in; ghi chú riêng. |
| Q3 | Đón và check-in **có thể có cả hai**, đều tùy chọn. |
| Q4 | Nháp lưu được khi thiếu ngày; **xác nhận đơn** bắt buộc mọi dịch vụ có ngày khởi hành (giờ được để "chưa rõ"). |
| Q5 | Tối đa **50 khách mỗi dịch vụ** (mỗi loại ≤ 50, tổng ≤ 50). |
| Q6 | Lưu bằng bảng mới `order_service`; `order_item` trỏ về dịch vụ (phương án 1 trong 3). |
| Q7 | Lệch giá so với danh mục: **cảnh báo, không chặn** (Sales được thương lượng). |
| Q8 | Giá Sheet giữ nguyên; dịch vụ chỉ có giá người lớn hiện nhãn **"Số khách"**. |

Mặc định do người thiết kế chọn (chủ dự án có thể đổi): dịch vụ từ danh mục phải có ít nhất 1 khách không phải em bé; ngày đã qua vẫn lưu được nhưng giao diện cảnh báo; dịch vụ nhập tay cũng có đủ khối thông tin chuyến; tối đa 20 dịch vụ mỗi đơn.

## 3. Dữ liệu — migration `0008_order_service.sql`

```sql
CREATE TABLE order_service (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  catalog_code  TEXT,                -- NULL = dịch vụ nhập tay; không FK (như order_item.catalog_code)
  name          TEXT NOT NULL,       -- chụp lúc lập đơn
  unit          TEXT NOT NULL,       -- chuỗi đơn vị của Sheet ('perPax', 'per5Pax'…) chụp lúc lập đơn; 'manual' = nhập tay
  pax_adult     INTEGER NOT NULL DEFAULT 0 CHECK (pax_adult  BETWEEN 0 AND 50),
  pax_child     INTEGER NOT NULL DEFAULT 0 CHECK (pax_child  BETWEEN 0 AND 50),
  pax_senior    INTEGER NOT NULL DEFAULT 0 CHECK (pax_senior BETWEEN 0 AND 50),
  pax_infant    INTEGER NOT NULL DEFAULT 0 CHECK (pax_infant BETWEEN 0 AND 50),
  depart_date   TEXT,                -- YYYY-MM-DD, giờ Việt Nam
  depart_time   TEXT,                -- HH:MM
  pickup_time   TEXT,
  pickup_place  TEXT,
  checkin_date  TEXT,
  checkin_time  TEXT,
  checkin_place TEXT,
  note          TEXT,
  CHECK (pax_adult + pax_child + pax_senior + pax_infant <= 50)
);
CREATE INDEX idx_order_service_order  ON order_service(order_id);
CREATE INDEX idx_order_service_depart ON order_service(depart_date);

ALTER TABLE order_item ADD COLUMN service_id TEXT REFERENCES order_service(id);
```

- Với dịch vụ giá chung và dịch vụ nhóm, số khách lưu ở `pax_adult` (nghĩa "số khách"), giống `buildLines` hiện tại.
- Dữ liệu cũ: remote có 0 đơn. Migration gom mỗi `order_item` cũ chưa có `service_id` thành một `order_service` `unit='manual'` (tên = `description`) để đơn thử ở local không hỏng. Mã mới luôn ghi `service_id`.
- Chốt chặn tiền (trigger 0007) giữ nguyên — tiền vẫn ở `order_item`.
- `order_item.detail` giữ vai ghi chú loại khách.

## 4. API và luật

### 4.1 Hợp đồng (`src/shared/contracts.ts`)

`OrderInput.items` được thay bằng `services`:

```ts
type PaxCounts = { adult: number; child: number; senior: number; infant: number };
interface TripInfo {
  departDate: string; departTime: string; pickupTime: string; pickupPlace: string;
  checkinDate: string; checkinTime: string; checkinPlace: string; note: string;
}
type ServiceInput =
  | ({ kind: "catalog"; catalogCode: string; pax: PaxCounts;
       /** Đơn giá thương lượng theo loại khách; vắng = giá danh mục hiện tại. */
       priceOverrides?: Partial<Record<PaxCode, number>> } & TripInfo)
  | ({ kind: "manual"; name: string; pax: PaxCounts;
       items: { description: string; detail: string; quantity: number; unitPrice: number }[] } & TripInfo);
```

`OrderDetailDto` có thêm `services: OrderServiceDto[]`; mỗi dịch vụ gồm thông tin chuyến, số khách và `items` của nó. `OrderResponse` có thêm `priceWarnings: { serviceIndex: number; pax: PaxCode | null; catalogPrice: number; unitPrice: number }[]`. `OrderSummaryDto` có thêm `nextDepartDate: string | null`.

### 4.2 Luật (`src/modules/orders/rules.ts`, thuần, có unit test)

- `validateOrder` nhận danh mục hiệu lực (map mã → `CatalogService` đã áp ghi đè) làm tham số, để vẫn thuần.
- Dịch vụ `catalog`: mã phải có trong danh mục đang hiện; loại khách không có giá thì phải bằng 0; các dòng tiền do **máy chủ** sinh bằng `buildLines` (`src/shared/order-lines.ts`), đơn giá lấy `priceOverrides[c]` nếu có, không thì giá danh mục. Trình duyệt không gửi được số lượng.
- Số khách: số nguyên 0–50 mỗi loại, tổng ≤ 50; dịch vụ `catalog` cần ≥ 1 khách không phải em bé.
- Ngày `YYYY-MM-DD` hợp lệ theo lịch, giờ `HH:MM` 00:00–23:59; điểm đón / nơi check-in ≤ 200 ký tự, ghi chú ≤ 1000.
- Giới hạn: ≤ 20 dịch vụ, ≤ 50 dòng tiền mỗi đơn (giữ `MAX_ITEMS`).
- `priceWarnings`: một mục cho mỗi dòng có đơn giá khác giá danh mục hiệu lực lúc lưu. Nhật ký `created`/`updated` ghi thêm chi tiết lệch giá.
- `canConfirm(services)`: trả danh sách thiếu (dịch vụ nào thiếu ngày khởi hành hoặc 0 khách). Route `POST /api/orders/:id/status` với `confirmed` trả **409 `incomplete_trip`** kèm danh sách đó nếu còn thiếu.

### 4.3 Repository

`createOrder` / `updateDraftOrder` ghi `order_service` rồi `order_item` (có `service_id`) trong cùng batch, vẫn giữ điều kiện `status = 'draft'` như hiện nay. `findOrder` đọc thêm dịch vụ. `listOrders` tính `MIN(depart_date)` các dịch vụ có ngày ≥ hôm nay (giờ VN) và nhận thêm bộ lọc `depart=YYYY-MM-DD`.

## 5. Giao diện

- **Form lập đơn (`web/order-form.ts`)**: phần "Dịch vụ" là danh sách thẻ.
  - Chọn từ danh mục → thêm một thẻ: bộ đếm −/+ theo loại khách (ghi chú loại khách hiện cạnh ô); dịch vụ giá chung và dịch vụ nhóm chỉ có ô "Số khách".
  - Thẻ có các ô ngày/giờ khởi hành, giờ + điểm đón, ngày/giờ + nơi check-in (ngày check-in mặc định bằng ngày khởi hành), ghi chú.
  - Các dòng tiền do hệ thống sinh, xem trước bằng cùng `buildLines`; sửa được đơn giá, lệch giá danh mục thì hiện nhãn "khác giá danh mục".
  - "+ Dịch vụ nhập tay" thêm thẻ có tên, số khách, thông tin chuyến và dòng tiền tự nhập.
  - Ngày đã qua: cảnh báo vàng, không chặn.
  - Sửa nháp: thẻ mở lại đúng số khách đã lưu.
- **Trang đơn (`web/order.ts`)**: mỗi dịch vụ một khối (ngày giờ, đón, check-in, số khách, ghi chú, dòng tiền, nhãn lệch giá). Nút "Xác nhận" hiện danh sách dịch vụ còn thiếu khi máy chủ trả `incomplete_trip`.
- **Danh sách đơn (`web/orders.ts`)**: cột "Khởi hành gần nhất" và ô lọc theo ngày khởi hành.

## 6. Kiểm thử

- Unit (`npm test`): luật dịch vụ (trần khách, loại không có giá, tối thiểu 1 khách), sinh dòng phía máy chủ (phao chuối 7 khách → 2 lượt), `priceWarnings`, `canConfirm`, định dạng ngày giờ.
- E2e (`tests/e2e/orders.mjs`): lưu nháp thiếu ngày → xác nhận bị 409 → bổ sung ngày → xác nhận được; gửi số lượng giả cho dịch vụ danh mục bị bỏ qua; đơn giá thương lượng trả `priceWarnings`; lọc danh sách theo ngày.
- `npm run typecheck`, chạy thử giao diện thật trên `wrangler dev`.

## 7. Ngoài phạm vi

- Mùa vụ / ưu đãi trả trước / mã giảm giá của booking (đã hoãn trong `HANDOFF-M4.md`).
- Turnstile, giới hạn tần suất, chống đơn trùng, báo tin Zalo/email của booking — là lớp chống spam cho form công khai, không cần cho công cụ nội bộ.
- Xuất PNG/PDF (M4) — sẽ đọc thông tin chuyến từ `order_service`.

## 8. Phần B — vai trò Guide (spec riêng, làm sau phần A)

Quyết định đã chốt để viết spec B:

- Vai trò mới `guide`, đăng nhập bằng SĐT + PIN như nhân viên.
- Nạp tài khoản từ **một Google Sheet riêng** (xem trước → xác nhận, PIN ngẫu nhiên hiện một lần), giống đồng bộ nhân viên. Chờ chủ dự án gửi link Sheet.
- Giá Guide = giá bán × (1 − %), với **% chiết khấu theo từng dịch vụ** — một cột mới trên Sheet dịch vụ.
- Guide **tự lập đơn, chỉ thấy/sửa đơn của mình**, không vào trang quản trị.
- Đơn của Guide ghi **giá net** (số Guide trả công ty).
- Hệ quả kỹ thuật đã thấy trước: với đơn của Guide, máy chủ phải tính giá từ danh mục (không nhận `priceOverrides`, không cho dịch vụ nhập tay) — phần A đã dựng sẵn đường sinh dòng phía máy chủ cho việc này.
