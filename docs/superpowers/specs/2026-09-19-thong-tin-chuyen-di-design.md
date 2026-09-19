# Thông tin chuyến đi theo từng dịch vụ trong đơn — thiết kế (bản 2, sau rà soát)

Ngày: 2026-09-19 · Trạng thái: chủ dự án đã duyệt các quyết định Q1–Q12 trong phiên brainstorming; **chờ duyệt bản viết này**. Bản 1 (`53956e9`) đã được một subagent rà soát theo Hiến Pháp/Ràng buộc/Kiến trúc của tourdaovn và ARCHITECTURE của chính dự án; các phát hiện đã kiểm chứng được tích hợp ở đây (đánh dấu **[RS#n]**).

## 1. Bối cảnh và vấn đề

Rà soát luồng lập đơn so với module booking của tourdaovn (`tourdaovn/src/lib/booking/quote.ts`, `schema.ts`, `BookingForm.astro`) cho thấy:

- Phép tính tiền cùng bản chất: `perPax` sinh một dòng mỗi loại khách có giá; `perNPax` sinh một dòng số lượt = `ceil(khách / N)`. Khác biệt cần nói rõ: booking **tin** `quoted.perPax` do trình duyệt gửi và chỉ kiểm nhất quán số học (`schema.ts:309-341`); spec này để **máy chủ tự sinh dòng tiền**, chặt hơn booking.
- Dịch vụ nhóm TTB chỉ có giá người lớn là **đúng chủ ý** (một giá cho mọi loại khách); website cũng chỉ hiện một ô. Booking gắn nhãn "Số khách" theo số hạng giá (`codes.length === 1`, `BookingForm.astro:53-55`), sales đang gắn theo `unit.kind === "group"` (`web/order-form.ts:193`) → Q8 đổi cách gắn.
- Điểm bất hợp lý thật sự: đơn **không lưu thông tin vận hành**.
  1. Không có ngày giờ khởi hành. Spec cũ để ở ô chữ `detail`, nhưng khi chọn từ danh mục ô đó bị ghi chú loại khách chiếm → không lọc được "chuyến ngày mai".
  2. Không lưu số khách theo loại; sửa nháp chỉ còn ô "SL", có thể lệch số khách (vd phao chuối: chi tiết "7 khách" nhưng SL sửa thành 1).
  3. `buildLines` đã đòi ≥ 1 khách nhưng trần là `MAX_COUNT = 100.000`, dòng nhập tay không có tối thiểu nào, và không có luật "tối thiểu 1 người lớn/khách trả tiền" như booking (`ADULT_MIN`, `PER_TYPE_MAX 20`, `TOTAL_MAX 30`, `schema.ts:13`).
  4. Không có điểm đón / check-in.
  5. Ghi chú loại khách chỉ hiện sau khi thêm dòng.
  6. Máy chủ không đối chiếu đơn giá với danh mục và không lưu giá danh mục lúc lập đơn.
- Dịch vụ giá chung hiện ô "Người lớn" → nhân viên hiểu nhầm là không thêm được trẻ em.

## 2. Quyết định

Đã chốt (chủ dự án):

| # | Quyết định |
|---|---|
| Q1 | Thông tin chuyến gắn **theo từng dịch vụ** trong đơn (một đơn có thể nhiều dịch vụ khác ngày, khác điểm đón). |
| Q2 | Mỗi dịch vụ có: ngày + giờ khởi hành; giờ + điểm đón; ngày + giờ + nơi check-in; ghi chú riêng. |
| Q3 | Đón và check-in **có thể có cả hai**, đều tùy chọn. |
| Q4 | Nháp lưu được khi thiếu ngày; **xác nhận đơn** bắt buộc mọi dịch vụ có ngày khởi hành (giờ được để "chưa rõ"). |
| Q5 | Tối đa **50 khách mỗi dịch vụ** (tổng các loại ≤ 50). |
| Q6 | Lưu bằng bảng mới `order_service`; `order_item` trỏ về nó. Một chiều (đổi schema sau khi có dữ liệu thật tốn kém) — thuộc dòng "Schema `order`/`order_item`" của SPEC §7. **Phương án bị loại:** (2) thêm cột chuyến vào `order_item` — chép lặp trên tối đa 4 dòng của một tour, sửa một dòng là lệch; (3) bỏ `order_item`, tính dòng tiền khi đọc — viết lại chốt chặn tiền, xuất file và trang đơn, rủi ro cao mà không được thêm gì. |
| Q7 | Đơn giá lệch giá danh mục: **cảnh báo, không chặn** (Sales được thương lượng). |
| Q8 | Giá Sheet giữ nguyên; dịch vụ chỉ có một loại giá (giá chung hoặc theo nhóm) hiện nhãn **"Số khách"**, gắn theo `availableCodes(item).length === 1` như booking. |
| Q9 | **Sau khi xác nhận** vẫn sửa được các **trường vận hành** (ngày giờ khởi hành, đón, check-in, ghi chú dịch vụ), có nhật ký; số khách, dịch vụ và tiền vẫn khóa — muốn đổi thì hủy và lập đơn mới (SPEC §2.3). |
| Q10 | Dịch vụ **nhập tay**: số khách là thông tin vận hành, ≥ 1 khi xác nhận, **không** ràng buộc với dòng tiền (tiền nhập tự do). |
| Q11 | Nháp cũ có dịch vụ đã ẩn / bị Sheet bỏ / đổi giá: **giữ bản chụp đã lưu, chỉ cảnh báo**. Đổi số khách hoặc dịch vụ thì phải chọn lại dịch vụ còn hiện. |
| Q12 | **Xác nhận** đơn: ngày khởi hành ở quá khứ hoặc xa hơn 365 ngày (giờ VN) bị **chặn**; nháp luôn lưu được (giao diện cảnh báo). |

Đề xuất của người thiết kế, **chờ chủ dự án duyệt khi đọc spec** (luật dữ liệu, Điều 7.1 / P8): dịch vụ danh mục cần ≥ 1 khách không phải em bé (dịch vụ chỉ tính "số khách" thì ≥ 1 khách); tối đa 20 dịch vụ mỗi đơn; chỉ người lập đơn hoặc admin được sửa (như `canModify` hiện nay).

## 3. Dữ liệu — migration `0008_order_service.sql`

Chỉ thêm file mới; thử local → e2e xanh → hỏi chủ dự án → remote (ARCHITECTURE "Luật dữ liệu").

```sql
CREATE TABLE order_service (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  catalog_code  TEXT,                -- NULL = nhập tay; không FK (như order_item.catalog_code)
  name          TEXT NOT NULL,       -- chụp lúc lập đơn
  unit          TEXT NOT NULL,       -- chuỗi đơn vị của Sheet chụp lúc lập đơn ('perPax','per5Pax'…); 'manual' = nhập tay
  pax_adult     INTEGER NOT NULL DEFAULT 0 CHECK (pax_adult  >= 0),   -- dịch vụ tính "số khách": lưu ở đây
  pax_child     INTEGER NOT NULL DEFAULT 0 CHECK (pax_child  >= 0),
  pax_senior    INTEGER NOT NULL DEFAULT 0 CHECK (pax_senior >= 0),
  pax_infant    INTEGER NOT NULL DEFAULT 0 CHECK (pax_infant >= 0),
  depart_date   TEXT CHECK (date(depart_date) IS depart_date),        -- YYYY-MM-DD, giờ Việt Nam
  depart_time   TEXT CHECK (depart_time  IS NULL OR depart_time  GLOB '[01][0-9]:[0-5][0-9]' OR depart_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_time   TEXT CHECK (pickup_time  IS NULL OR pickup_time  GLOB '[01][0-9]:[0-5][0-9]' OR pickup_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_place  TEXT,
  checkin_date  TEXT CHECK (date(checkin_date) IS checkin_date),      -- NULL = cùng ngày khởi hành (không lưu trùng)
  checkin_time  TEXT CHECK (checkin_time IS NULL OR checkin_time GLOB '[01][0-9]:[0-5][0-9]' OR checkin_time GLOB '2[0-3]:[0-5][0-9]'),
  checkin_place TEXT,
  note          TEXT
);
CREATE INDEX idx_order_service_order  ON order_service(order_id);
CREATE INDEX idx_order_service_depart ON order_service(depart_date);

ALTER TABLE order_item ADD COLUMN service_id TEXT REFERENCES order_service(id);  -- NULL mặc định → SQLite cho phép
ALTER TABLE order_item ADD COLUMN catalog_price INTEGER;   -- giá danh mục hiệu lực lúc lập dòng; NULL = dòng nhập tay [RS#3]
CREATE INDEX idx_order_item_service ON order_item(service_id);
```

- **`CHECK` chỉ dùng cho bất biến không đổi** (ARCHITECTURE "Luật dữ liệu") **[RS#8]**: khuôn dạng ngày/giờ và số khách ≥ 0. Trần 50 khách **không** nằm trong SQL (SQLite không ALTER được `CHECK`, booking còn đổi trần 20/30) mà là một hằng duy nhất `MAX_GUESTS_PER_SERVICE` trong `src/shared/order-lines.ts`, thay `MAX_COUNT = 100_000` ở `buildLines`, dùng chung cho luật máy chủ và giao diện. Biểu thức ngày/giờ trên đã thử trên SQLite: nhận `NULL`, `2026-09-20`, `07:30`, `23:59`; từ chối `2026-02-30`, `2026-9-2`, `24:00`, `7:30`, `07:60`.
- **Backfill (chạy trước khi tạo trigger)**: mỗi `order_item` cũ có `service_id IS NULL` → chèn `order_service` với `id = order_item.id`, `unit = 'manual'`, `name = description`, khách = 0, các trường chuyến NULL; rồi `UPDATE order_item SET service_id = id`. Remote hiện có 0 đơn; local có đơn thử, nháp cũ sẽ chưa xác nhận được cho tới khi nhập khách + ngày (chấp nhận).
- **Lưới SQL thứ hai** (mẫu `0007`), tạo **sau** backfill:
  - `order_item` BEFORE INSERT/UPDATE: `service_id` phải thuộc cùng `order_id` (`RAISE(ABORT, 'service_scope')`).
  - `order_service` BEFORE INSERT/DELETE khi đơn cha **không còn `draft`**, và BEFORE UPDATE khi đơn cha không còn `draft` mà đổi `order_id`, `catalog_code`, `name`, `unit` hoặc bất kỳ `pax_*` (Q9: chỉ trường vận hành được sửa sau xác nhận).
  - `order_service` BEFORE UPDATE khi đơn cha `confirmed` mà `NEW.depart_date IS NULL`.
  - `orders` BEFORE UPDATE khi `NEW.status = 'confirmed' AND OLD.status <> 'confirmed'` (chỉ lúc chuyển sang xác nhận, để không chặn nhầm các lần cập nhật sau đó): có ≥ 1 dịch vụ, mọi dịch vụ có `depart_date` và ≥ 1 khách (`'incomplete_trip'`). Khoảng ngày quá khứ/365 ngày (Q12) là luật đổi được → nằm ở code, không ở trigger.
- `order_item.detail` giữ vai ghi chú loại khách. Chốt chặn tiền (0007) giữ nguyên.

## 4. API và luật

### 4.1 Hợp đồng (`src/shared/contracts.ts`)

```ts
type PaxCounts = Record<PaxCode, number>;
interface TripInfo {
  departDate: string; departTime: string; pickupTime: string; pickupPlace: string;
  checkinDate: string; checkinTime: string; checkinPlace: string; note: string;   // "" = chưa có
}
type ServiceInput = { id?: string /* dịch vụ đã lưu của chính đơn này */; pax: PaxCounts } & TripInfo & (
  | { kind: "catalog"; catalogCode: string;
      unitPrices: Partial<Record<PaxCode, number>>;        // đơn giá thực tế cho từng loại có khách (mặc định giao diện = giá danh mục)
      catalogPriceSeen: Partial<Record<PaxCode, number>> } // giá danh mục mà form đang hiển thị
  | { kind: "manual"; name: string; items: { description: string; detail: string; quantity: number; unitPrice: number }[] });
interface OrderInput { customerName; customerPhone; customerEmail; customerNote; services: ServiceInput[];
  discount; depositAmount; depositMethod; paymentNote; expectedUpdatedAt?: string /* chỉ PUT */ }
```

- `OrderDetailDto.services: OrderServiceDto[]` (thay `items` phẳng): mỗi dịch vụ có `kind`, `catalogCode`, `name`, `unit`, `pax`, thông tin chuyến, `items: OrderItemDto[]` (thêm `catalogPrice: number | null`) và — chỉ đơn nháp — `catalogStatus: "ok" | "price_changed" | "unavailable"` (so `catalogPrice` đã lưu với danh mục hiện tại). `OrderSummaryDto.nextDepartDate: string | null`.
- **Không có `priceWarnings` riêng** **[RS#3]**: form chuyển trang ngay sau khi lưu nên cảnh báo trong phản hồi không bao giờ hiện. Lệch giá là dữ liệu đã lưu (`unit_price` ≠ `catalog_price`), nhãn "khác giá danh mục" do **một hàm chung** `priceDeviation(item)` trong `src/shared/order-lines.ts` tính cho trang đơn, form sửa và nhật ký (một nguồn, P6).
- Mã lỗi mới: `stale` (409), `catalog_changed` (409, kèm giá hiện tại), `catalog_unavailable` (400), `incomplete_trip` (409, kèm `missing: { serviceId, name, reasons: ("no_date"|"past_date"|"too_far"|"no_guests")[] }[]`), `client_outdated` (409, khi body còn `items` kiểu cũ).

### 4.2 Luật thuần (`src/modules/orders/rules.ts`, có unit test)

`validateOrder(input, ctx)` với `ctx = { catalog: Map<mã, EffectiveService>, stored: StoredService[] | null, today: string }` — vẫn thuần (không I/O).

- **Dịch vụ `catalog`**, hai nhánh **[RS#4, Q11]**:
  - *Giữ bản chụp*: `id` khớp một dịch vụ đã lưu của đơn này **và** `catalogCode` + `pax` không đổi → không tra danh mục; giữ `name`, `unit`, `catalog_price` đã lưu; `unitPrices` do người dùng sửa được. Dịch vụ đã ẩn / bị Sheet bỏ / đổi đơn vị vẫn sửa và xác nhận được.
  - *Mới hoặc đổi thành phần*: mã phải có trong danh mục đang hiện, nếu không → 400 `catalog_unavailable`. So `catalogPriceSeen[c]` với giá hiệu lực hiện tại của mọi loại có khách; lệch → 409 `catalog_changed` (giao diện tải lại danh mục, giữ đơn giá đã thương lượng, người dùng xem lại rồi lưu) **[RS#6]**. Không lệch → lưu `catalog_price = giá hiện tại`.
  - Dòng tiền do **máy chủ** sinh bằng `buildLines`; đơn giá mỗi dòng = `unitPrices[c]` (số nguyên trong `[0, MAX_AMOUNT_VND]`), kiểm loại-có-giá **trước** khi áp: loại khách mà danh mục không có giá phải có số khách = 0 và không nhận `unitPrices` cho nó **[RS#5b]**. Trình duyệt không gửi được số lượng; số lượng dòng luôn khớp số khách (phao chuối 7 khách → 2 lượt).
- **Số khách**: số nguyên ≥ 0 mỗi loại, tổng ≤ `MAX_GUESTS_PER_SERVICE` (50). Dịch vụ danh mục cần ≥ 1 khách không phải em bé (đề xuất chờ duyệt). Loại khách nào có "số khách" hay "người lớn" đọc qua **một helper chung** `guestCount(unit, pax)` cạnh `parseUnit` **[RS#5c]** (dịch vụ giá chung/nhóm: số khách ở `adult`).
- **Dịch vụ `manual`** (Q10): `name` ≤ 300; `items` 1–50 dòng theo luật hiện có; `pax` chỉ là thông tin vận hành, **không** so với dòng tiền; ≥ 1 khách khi xác nhận (không khi lưu nháp). Tóm lại: **luật "≥ 1 khách" áp cho mọi dịch vụ lúc xác nhận**; riêng dịch vụ danh mục còn bị `buildLines` đòi ≥ 1 ngay lúc lưu nháp.
- **Ngày giờ**: dùng `isISODate` chặt theo lịch (bản dùng chung `src/shared/vn-date.ts`, một hàm `vnToday(now)` thay cho bản riêng trong `orders/rules.ts`) và regex giờ `HH:MM` 00:00–23:59. Máy chủ truyền `today` (bind từ TS), **không dùng `date('now')`** (UTC, sai ngày 00:00–07:00 giờ VN) **[RS#9]**. `checkin_date` bỏ trống = cùng ngày khởi hành. Cảnh báo giao diện (không chặn): `pickup_time` sau `depart_time` cùng ngày.
- **Chuỗi tự do** (`pickup_place`, `checkin_place` ≤ 200; `note` ≤ 1000): bỏ ký tự điều khiển (một dòng cho điểm đón/nơi check-in; `note` chỉ giữ xuống dòng) như `schema.ts:148-150` của booking, vì sẽ đi vào PNG/PDF (M4) **[RS#12a]**. Đây là dữ liệu cá nhân: **nhật ký không ghi giá trị của chúng**, chỉ ghi "đổi điểm đón".
- Giới hạn: ≤ 20 dịch vụ (đề xuất chờ duyệt), ≤ 50 dòng tiền mỗi đơn.
- `checkConfirmable(services, today)`: trả `missing[]` theo Q4 + Q12 (`no_date`, `past_date` nếu < `today`, `too_far` nếu > `today` + 365 ngày, `no_guests`).

### 4.3 Ghi dữ liệu (`orders/repository.ts`)

- **Thứ tự bắt buộc khi sửa nháp** **[RS#2]** (FK không có `ON DELETE` giữa `order_item` → `order_service`): `UPDATE orders` → audit (`changes() > 0`) → `DELETE order_item` → `DELETE order_service` → `INSERT order_service` → `INSERT order_item`. **Mọi** câu sau `UPDATE orders` mang điều kiện `EXISTS (đơn còn draft)`, như hiện có.
- **Xác nhận** **[RS#1]**: điều kiện "đủ ngày, đủ khách, trong khoảng cho phép" nằm **trong chính câu `UPDATE orders SET status='confirmed'`** (`AND NOT EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = orders.id AND (s.depart_date IS NULL OR s.depart_date < ?today OR s.depart_date > ?max OR khách = 0))`), không đọc-rồi-ghi ở route. `changes() = 0` → đọc lại để phân biệt "đơn đã đổi trạng thái" với "thiếu chuyến" (409 `incomplete_trip` kèm danh sách). Xác nhận thất bại **không** ghi nhật ký (khớp `tests/e2e/orders.mjs`). Ghi nhật ký `confirmed` kèm tóm tắt lệch giá nếu có.
- **Sửa đồng thời** **[RS#10]**: `PUT /api/orders/:id` bắt buộc `expectedUpdatedAt`; câu `UPDATE orders` thêm `AND updated_at = ?` → 409 `stale` ("Đơn vừa được người khác sửa, hãy tải lại") khi lệch. `POST .../status` không cần.
- **Sửa trường vận hành sau xác nhận** (Q9): `PUT /api/orders/:id/trip` với `{ expectedUpdatedAt, services: [{ id } & TripInfo] }`, cho đơn `draft` hoặc `confirmed` (không `cancelled`), quyền `canModify`. Ngày khởi hành **chỉ kiểm khoảng hôm nay…+365 ngày khi giá trị đổi** (ghi chú chuyến đã đi vẫn sửa được). Không được xóa `depart_date` khi đơn `confirmed`. Cập nhật `orders.updated_at`; nhật ký hành động mới `trip_updated` (thêm vào `src/shared/audit-actions.ts`) ghi trường nào đổi, với ngày/giờ ghi trước → sau, còn địa điểm/ghi chú chỉ ghi "đổi".
- `findOrder` đọc thêm `order_service`; `listOrders` tính `nextDepartDate` = `MIN(depart_date)` các dịch vụ có ngày ≥ `today` (bind từ TS) và nhận bộ lọc `depart=YYYY-MM-DD`.
- **Ranh giới module** **[RS#7]**: `catalog/index.ts` xuất hàm công khai `getEffectiveServices(db, codes?)` → `Map<mã, CatalogService & { visible: boolean }>` (giá đã áp ghi đè; `visible = inSheet && !hidden`). `GET /api/catalog` dùng **chính hàm này** để lọc "đang hiện" (một nguồn "giá hiệu lực"). `orders/index.ts` gọi hàm đó rồi đưa kết quả vào `validateOrder` — cạnh `orders → catalog` qua `index.ts`, đồ thị vẫn không vòng (ghi vào ARCHITECTURE).
- **Kích thước batch**: tối đa ≈ 74 câu (1 + 1 + 2 + 20 dịch vụ + 50 dòng); hiện tại là 52. Giới hạn số câu của một `db.batch` trên D1 production **chưa kiểm chứng** (`wrangler dev` không thực thi giới hạn đó) → bước đầu của kế hoạch phải kiểm theo tài liệu D1; nếu không đủ thì hạ trần dịch vụ/dòng chứ không chia lô (mất tính nguyên tử).

## 5. Giao diện

- **Form lập đơn (`web/order-form.ts`)**: phần "Dịch vụ" là danh sách thẻ.
  - Chọn từ danh mục → thêm thẻ: bộ đếm −/+ theo loại khách, ghi chú loại khách hiện **ngay cạnh ô nhập**; dịch vụ chỉ một loại giá chỉ có ô "Số khách".
  - Thẻ có ngày/giờ khởi hành, giờ + điểm đón, ngày/giờ + nơi check-in (ngày check-in để trống = cùng ngày khởi hành), ghi chú.
  - Dòng tiền do hệ thống sinh, xem trước bằng cùng `buildLines`/`priceDeviation`; sửa được đơn giá, lệch danh mục hiện nhãn "khác giá danh mục".
  - Nháp mở lại đúng số khách đã lưu; dịch vụ `catalogStatus ≠ ok` hiện nhãn "giá danh mục đã đổi" / "dịch vụ đã ẩn" (Q11). Gặp 409 `catalog_changed` → tải lại danh mục và báo giá mới.
  - "+ Dịch vụ nhập tay": tên, số khách, thông tin chuyến, dòng tiền tự nhập.
  - Ngày khởi hành quá khứ / quá 365 ngày: cảnh báo vàng khi lưu nháp (nút "Xác nhận" sẽ bị máy chủ chặn).
  - Tiền vẫn có hai nơi tính (`recompute()` xem trước, `validateOrder` chính thức) như hiện nay — chấp nhận, vì trang chỉ để xem trước; nhưng phần lệch giá và trần khách dùng hàm/hằng chung.
- **Trang đơn (`web/order.ts`)**: mỗi dịch vụ một khối (ngày giờ, đón, check-in, số khách, ghi chú, dòng tiền, nhãn lệch giá); đơn `confirmed` có nút "Sửa thông tin chuyến" (Q9). "Xác nhận" hiện danh sách dịch vụ còn thiếu/sai khi nhận `incomplete_trip`.
- **Danh sách đơn (`web/orders.ts`)**: cột "Khởi hành gần nhất" và ô lọc theo ngày.

## 6. Triển khai và tương thích

- **Thứ tự**: áp `0008` lên remote (kiểm `wrangler d1 migrations list --remote` trước — `HANDOFF-M4` và bộ nhớ dự án ghi khác nhau về `0007`; **chưa kiểm chứng**) → deploy. Bảng mới và cột nullable nên Worker cũ vẫn chạy; remote đang 0 đơn. Áp remote/deploy do chủ dự án chạy (ràng buộc vận hành đã ghi).
- Tab đang mở bản cũ gửi `items` → 409 `client_outdated` ("Tải lại trang").
- **Tài liệu cập nhật cùng lúc (Điều 6.1)**: `SPEC-tourdao-sales.md` §2.1 (`order_service`, hai cột mới của `order_item`; dòng `detail = ngày khởi hành, số khách` không còn đúng), §2.3 (bất biến: sau xác nhận chỉ trường vận hành đổi được), §7 (cửa một chiều của `order_service`); `ARCHITECTURE.md` (cạnh `orders → catalog`, quy ước ngày/giờ dân sự là TEXT `YYYY-MM-DD`/`HH:MM` theo giờ VN, `shared/vn-date.ts`); `HANDOFF-M4.md` (M4 đọc thông tin chuyến từ `order_service`).

## 7. Kiểm thử

- Unit (`npm test`): luật dịch vụ (trần khách, loại không có giá, tối thiểu khách, hai nhánh Q11, `catalog_changed`), `buildLines` phía máy chủ (phao chuối 7 khách → 2 lượt), `priceDeviation`, `checkConfirmable` (quá khứ, > 365 ngày), `guestCount`, `vnToday` (00:30 giờ VN vẫn là ngày VN), ngày/giờ chặt (30/02, 24:00).
- E2e (`tests/e2e/orders.mjs`, sửa các đoạn dựng đơn phẳng cũ; `platform.mjs`; `rules.test.ts`):
  - nháp thiếu ngày → xác nhận bị 409 `incomplete_trip` → bổ sung → xác nhận được;
  - **đua "lưu xóa ngày" với "xác nhận"**: đơn không bao giờ `confirmed` mà thiếu ngày;
  - đua "xác nhận" với "hủy" (đoạn hiện có **phải** dựng dịch vụ đủ ngày trước, nếu không cả hai nhánh chỉ còn 409 `incomplete_trip` và bài đua vô nghĩa);
  - số lượng giả gửi lên bị bỏ qua; đơn giá thương lượng lưu `catalog_price` khác `unit_price`; giá danh mục đổi giữa chừng → 409 `catalog_changed`;
  - dịch vụ đã ẩn: nháp cũ vẫn sửa/xác nhận được, thêm mới thì 400;
  - `PUT` với `expectedUpdatedAt` cũ → 409 `stale`; sửa trường vận hành sau xác nhận có nhật ký `trip_updated`, đổi số khách sau xác nhận bị trigger chặn;
  - bất biến "Σ số lượng dòng = số khách" cho mọi dịch vụ danh mục kiểm bằng một truy vấn SQL sau các kịch bản (Điều 8.3);
  - lọc danh sách theo ngày; đơn 20 dịch vụ × 50 dòng chạy qua batch.
- `npm run typecheck`; chạy thử giao diện thật trên `wrangler dev`.

## 8. Ngoài phạm vi

- Mùa vụ / ưu đãi trả trước / mã giảm giá của booking (đã hoãn, `HANDOFF-M4.md`).
- Turnstile, giới hạn tần suất, chống đơn trùng, báo tin Zalo/email của booking — lớp chống spam cho form công khai, không cần cho công cụ nội bộ đã đăng nhập.
- Xuất PNG/PDF (M4) — sẽ đọc từ `order_service`.

## 9. Chia giai đoạn thi công

Ba giai đoạn cho ba kế hoạch riêng (một kế hoạch cho toàn bộ là quá lớn):

1. **A1 — nền dữ liệu**: migration 0008 + trigger + backfill, hợp đồng, `rules.ts`, `repository.ts`, `catalog.getEffectiveServices`, `shared/vn-date.ts`, `audit-actions`, unit + e2e API.
2. **A2 — giao diện**: form thẻ dịch vụ, trang đơn, sửa trường vận hành sau xác nhận.
3. **A3 — danh sách**: cột và lọc theo ngày khởi hành (độc lập).

API đổi `items` → `services` nên **A1 và A2 phải cùng xong trước khi merge/deploy**; trong lúc đó làm trên nhánh, không đẩy lên `main`.

## 10. Phần B — vai trò Guide (spec riêng, làm sau phần A)

Quyết định đã chốt:

- Vai trò `guide`, đăng nhập SĐT + PIN như nhân viên; nạp từ **một Google Sheet riêng** (xem trước → xác nhận, PIN ngẫu nhiên hiện một lần). Chờ chủ dự án gửi link.
- Giá Guide = giá bán × (1 − %), **% chiết khấu theo từng dịch vụ**. Cột % **không** đặt trên Sheet dịch vụ đang chia sẻ "bất kỳ ai có link" (lộ biên lợi nhuận, và Sheet này cũng là Sheet của booking); dùng tab/Sheet riêng có quyền hạn chế.
- Guide tự lập đơn, chỉ thấy/sửa đơn của mình, không vào trang quản trị. Đơn của Guide ghi **giá net**.
- Hệ quả đã thấy trước: với đơn Guide, máy chủ **bỏ qua** `unitPrices` từ trình duyệt và tự tính từ danh mục theo giá Guide; **không** cho dịch vụ nhập tay; **ép `discount` = 0** (ô giảm giá cấp đơn, đoạn kiểm `discount` trong `validateOrder` ở `orders/rules.ts`, là đường hạ giá thứ ba). Phần A dựng sẵn đường sinh dòng tiền phía máy chủ cho việc này.

## 11. Ghi chú thi công A1 (sai khác so với bản 2)

Phát sinh khi lập và chạy kế hoạch A1 (`docs/superpowers/plans/2026-09-19-thong-tin-chuyen-di-a1.md`); mã là nguồn sự thật:

- **`order_item.pax_code`** (thêm vào §3): loại khách của dòng tiền, `CHECK` bốn mã, NULL = nhập tay. Cần để dựng "bản chụp" (Q11) và hiển thị mà không phải suy từ thứ tự dòng.
- **Guard sau UPDATE (đổi §4.3):** khoá lạc quan vẫn là `UPDATE … AND updated_at = ?`, nhưng các câu ghi sau nó KHÔNG so lại mốc thời gian mà hỏi `EXISTS` dòng nhật ký có id riêng của request (`AuditInput.id`). Lý do: hai request cùng mili-giây tính ra cùng mốc mới, bên thua sẽ lọt qua và ghi đè bản của bên thắng.
- **Không có `priceWarnings` trong phản hồi** (đã ghi ở §4.1): lệch giá = `unit_price ≠ catalog_price`, một hàm `priceDeviation` cho mọi nơi.
- **`unitPrices` tuỳ chọn** khi tạo/sửa: vắng = giá danh mục; `catalogPriceSeen` bắt buộc cho mỗi loại có khách của dịch vụ mới/đổi thành phần.
- **`PUT /api/orders/:id/trip` thay TOÀN BỘ** thông tin chuyến của các dịch vụ được liệt kê (trường vắng = xoá) — client gửi đủ.
- **Trigger `orders_confirm_requires_trip` chỉ bắn lúc CHUYỂN sang xác nhận** (`OLD.status <> 'confirmed'`), để không chặn nhầm cập nhật sau đó và đơn cũ đã xác nhận trước migration.
- **`GET /api/orders` (danh sách)** chưa có `nextDepartDate` / lọc `?depart=` — thuộc A3 như §9.
- **Tên hàm/tệp khác spec:** `checkConfirmable` → `confirmGaps` (`orders/service-rules.ts`); `guestCount` không tồn tại — dùng `paxTotal`/`payingGuests` (`shared/order-lines.ts`); luật một dịch vụ nằm ở `orders/service-rules.ts` + `orders/fields.ts` (không phải `rules.ts`, chỉ còn `validateOrder` ghép các dịch vụ); ngữ cảnh của `validateOrder` không có `today` (ngày hôm nay chỉ dùng ở `confirmWindow`/`confirmOrder`, truyền từ route); `GET /api/catalog` dùng `loadAll` + `toEffective` (cùng nguồn giá hiệu lực với `getEffectiveServices`), không gọi `getEffectiveServices` trực tiếp.
- **Giới hạn D1 (đã tra tài liệu 2026-09-19, thay cho "kích thước batch" ở §4.3):** tài liệu giới hạn D1 không nêu trần số câu của một `db.batch()`, nhưng nêu trần truy vấn trên mỗi lần gọi Worker (1.000 gói Paid / 50 gói Free); giả định thận trọng: mỗi câu trong batch là một truy vấn. Đơn lớn nhất hợp lệ (20 dịch vụ + 50 dòng tiền) ≈ 77 truy vấn/lần gọi khi tạo (batch 72 câu + đọc ngữ cảnh + đọc lại) và ≈ 80 khi sửa nháp (batch 74 câu); trước A1 đơn lớn nhất (50 dòng, không có dịch vụ) ≈ 57. Việc phải làm trước deploy là **kiểm gói Workers của tài khoản** và, nếu là Free, hạ `MAX_SERVICES`/`MAX_LINES_PER_ORDER` — không chia lô. Chưa có e2e cho đơn cỡ tối đa (§7 dòng "20 dịch vụ × 50 dòng") — `wrangler dev` không thực thi giới hạn này nên e2e cục bộ cũng không chứng minh được.
- **Việc giao cho A2:** (1) `PUT /api/orders/:id/trip` trả `400 invalid_input` ("Dịch vụ n: không thuộc đơn này") thay vì `409 stale` khi có lần lưu nháp đồng thời đã sinh lại id dịch vụ (form kia không gửi `id`) — client phải coi 400 này là "tải lại đơn"; (2) client xử lý đủ `409 stale` / `409 catalog_changed` (có `changes[]`) / `409 incomplete_trip` (có `missing[]`) / `409 client_outdated` / `400 catalog_unavailable`; (3) `web/tsconfig.json` cần `allowImportingTsExtensions` khi import giá trị từ `shared/vn-date.ts` (nếu không: TS5097); (4) tên dịch vụ NHẬP TAY đi nguyên vào dòng nhật ký `trip_updated` — giao diện nên nhắc "tên dịch vụ, không ghi tên khách".
- **Lỗi trigger chưa có ánh xạ HTTP:** `order_frozen` / `incomplete_trip` / `service_scope` (RAISE ABORT trong 0008) không được bắt để đổi thành 409/400; mọi đường hiện tại đều không thể kích hoạt chúng (đã kiểm khi review) nên nếu chúng bắn sẽ ra 500 — coi là lưới phòng thủ, không phải đường xử lý bình thường.
