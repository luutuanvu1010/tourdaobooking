# Sửa số khách/dịch vụ sau xác nhận cho FIELD (ADR-0014 điều 6) — đặc tả kỹ thuật

> Ngày 2026-09-22, nhánh `kiem-toan-doi-tac`. Tiếp nối `docs/superpowers/specs/2026-09-22-dong-dieu-chinh-sau-xac-nhan-cau-hoi.md` (câu hỏi chặn) — chủ dự án đã quyết ba điều ở mục 1 dưới đây qua hội thoại trực tiếp. Đặc tả này ghi lại quyết định + thiết kế kỹ thuật để lập kế hoạch thi công. Phần huỷ đơn (điều 11) đã thi công xong ở `docs/superpowers/plans/2026-09-22-adr-0014-phase-b-thi-cong.md`, không liên quan tới đặc tả này.

## 1. Quyết định của chủ dự án (đã hỏi trực tiếp, không suy đoán)

1. **Ghi thêm dòng điều chỉnh, KHÔNG ghi đè.** Số gốc của đơn (`order_service`, `order_item`, cột tiền của `orders`) giữ nguyên vĩnh viễn sau khi xác nhận — đúng khoá dữ liệu hiện có (trigger `0008`), không đụng gì tới nó. Mỗi lần FIELD sửa, thêm một dòng "điều chỉnh" mới, không sửa/xoá dòng cũ.
2. **Giá tính theo giá lúc lập đơn**, không tra giá hiện tại của danh mục. Khách không bị đổi giá âm thầm nếu bảng giá đổi sau lúc đặt.
3. **Màn hình chính của đơn hiện số MỚI** (đã cộng dồn điều chỉnh) — không phải số gốc. Xem số gốc/lịch sử sửa thì vào mục lịch sử đơn (`order.history.view`, đã có).

## 2. Phạm vi (thu hẹp có chủ đích, ghi rõ để chủ dự án biết)

- FIELD đổi được **số khách** của các dịch vụ **từ danh mục** (không phải nhập tay) đã có sẵn trên đơn — không thêm dịch vụ mới, không đổi dịch vụ nhập tay, không thêm/bớt hẳn một dịch vụ khỏi đơn (dịch vụ tính theo nhóm và theo người đều yêu cầu ≥ 1 khách sau khi sửa, đúng luật `buildLines` đã có — muốn "bỏ hẳn một dịch vụ" là việc khác, chưa làm ở đợt này).
- Lý do: **tự do** (không phải danh sách đóng như đường huỷ đơn) — đúng ADR-0014 điều 6 ("lý do bắt buộc (tự do)").
- Không đổi `discount`, `deposit_amount`, `deposit_method`, `payment_note` — những cột đó không thuộc "số khách, dịch vụ" và tiếp tục do `SALES`/`ACCOUNTING`/`ADMIN` quản lý qua đường khác (chưa có route, ngoài phạm vi ADR-0014).

## 3. Vì sao dùng lại được hạ tầng có sẵn (không viết logic tính giá mới)

`src/modules/orders/service-rules.ts` đã có sẵn đúng cơ chế "giá lúc lập đơn" cho việc sửa đơn NHÁP (Q11): `snapshotService(stored: StoredService): CatalogService | null` dựng lại một "dịch vụ danh mục" từ dữ liệu ĐÃ LƯU của đơn (giá lấy từ `order_item.catalog_price`, không tra danh mục hiện tại), rồi `buildLines(source, counts)` (`src/shared/order-lines.ts`) sinh lại các dòng tiền theo SỐ KHÁCH MỚI, dùng đúng giá đã chụp đó. Đây CHÍNH XÁC là "giá lúc lập đơn" chủ dự án vừa chọn — tái dùng nguyên hai hàm này, không viết logic tính giá mới.

`getStoredServices(db, orderId)` (`src/modules/orders/repository.ts`) đã trả về đúng dạng `StoredService[]` mà `snapshotService` cần.

`snapshotService` trả `null` nếu dịch vụ nhập tay hoặc dữ liệu không đủ (thiếu giá/loại khách đã lưu) — đúng ranh giới phạm vi ở mục 2 (loại các dịch vụ đó khỏi khả năng sửa).

## 4. Mô hình dữ liệu

### Bảng mới `order_money_adjustment` (module `orders` sở hữu — đúng ADR-0007 điều 2(b): "module orders sở hữu" bản ghi trước→sau)

```sql
CREATE TABLE order_money_adjustment (
  id              TEXT PRIMARY KEY,   -- = audit_log.id (ADR-0007 điều 2: "hai bảng nối bằng audit_log.id, không lặp nội dung" — KHÔNG có cột staff_id/created_at/reason ở đây, lấy từ audit_log)
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,   -- 1, 2, 3… theo đơn — dùng để tìm "lần sửa gần nhất" và làm khoá lạc quan khi ghi thêm (mục 6)
  before_json     TEXT NOT NULL,      -- [{serviceId, pax:{adult,child,senior,infant}}] — CHỈ dịch vụ từ danh mục, đủ cho MỌI dịch vụ từ danh mục của đơn (không chỉ phần đổi)
  after_json      TEXT NOT NULL,      -- cùng dạng, SAU lần sửa này
  subtotal_before INTEGER NOT NULL,   -- số học, không chỉ chữ — để đối chiếu/đọc máy được, không chỉ đọc người
  subtotal_after  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_order_money_adjustment_seq ON order_money_adjustment(order_id, seq);
CREATE INDEX idx_order_money_adjustment_order ON order_money_adjustment(order_id);

-- Chỉ-thêm: không sửa/xoá dòng điều chỉnh (P16: có test tắt rồi bật lại để quan sát chặn thật).
CREATE TRIGGER order_money_adjustment_frozen_update BEFORE UPDATE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không sửa được'); END;
CREATE TRIGGER order_money_adjustment_frozen_delete BEFORE DELETE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không xoá được'); END;
```

**Vì sao `after_json` phải đủ cho MỌI dịch vụ từ danh mục, không chỉ phần đổi:** để "trạng thái hiện tại" = `after_json` của dòng `seq` LỚN NHẤT của đơn (nếu có), không cần gộp nhiều dòng lại (không có bài toán "dịch vụ A đổi ở lần 1, dịch vụ B đổi ở lần 2, giờ cần hợp cả hai"). Route (mục 7) BẮT BUỘC thân yêu cầu liệt kê đủ mọi dịch vụ-từ-danh-mục của đơn, không phải một tập con.

**Không cần đụng trigger `0008` (`order_service_frozen_*`) hay bất kỳ trigger tiền nào:** `order_service`/`order_item`/cột tiền của `orders` không hề bị ghi — đây là lý do chọn "ghi thêm dòng điều chỉnh" thay vì "ghi đè" (mục 1).

### Migration
Số hiệu lấy **lúc thi công** — `ls migrations` (hiện cao nhất `0020`, dự tính `0021`) + kiểm mọi nhánh/worktree chưa gộp theo `CLAUDE.md` §10 (làm lại bước này trong kế hoạch thi công, đừng tin số ở đây).

## 5. Đọc dữ liệu — "trạng thái hiện tại" của đơn

Hàm thuần mới, ví dụ `src/modules/orders/service-rules.ts` hoặc tệp riêng `money-adjustment.ts` cùng thư mục:

```ts
/** Áp dòng điều chỉnh tiền gần nhất (nếu có) lên các dịch vụ đã lưu — trả về dịch vụ theo TRẠNG THÁI HIỆN TẠI (gốc nếu chưa có điều chỉnh nào). */
export function applyLatestAdjustment(
  stored: readonly StoredService[],
  latest: { after: { serviceId: string; pax: PaxCounts }[] } | null,
): { service: StoredService; pax: PaxCounts }[] // hoặc dạng phù hợp để service.ts dựng lại OrderServiceDto/items
```

Với mỗi dịch vụ có mặt trong `latest.after`: gọi `snapshotService(stored đó)` rồi `buildLines(source, pax mới)` để sinh lại `items`/`pax` hiển thị (giữ nguyên `trip`, `name`, `unit`, `catalogCode`, id — những thứ route này không đổi). Dịch vụ KHÔNG có trong `latest.after` (dịch vụ nhập tay, hoặc `latest === null`): giữ nguyên như lưu trong `order_service`/`order_item`.

`subtotal` hiệu lực = tổng `lineTotal` của mọi dịch vụ sau khi áp; `total = subtotal - orders.discount` (không đổi); `remainingAmount = total - orders.deposit_amount` (không đổi).

**Nơi gắn vào:** `loadOrderView`/`findOrder` (`src/modules/orders/service.ts`, `repository.ts`) — route `GET /api/orders/:id` và `GET /api/orders` (danh sách, nếu có hiển thị tổng tiền) phải trả số HIỆU LỰC, không phải số cột gốc, cho đơn có điều chỉnh. Chi tiết chỗ sửa thuộc kế hoạch thi công.

## 6. Ghi dữ liệu — route mới, khoá lạc quan

**Route:** `POST /api/orders/:id/handler-money-edit` (module `dispatch`, cùng khuôn `handler-cancel` đã có — không dùng `/api/orders*` cho FIELD, ADR-0007 điều 4(c)). Access `"staff"`, tự gọi `can(staff, "order.money.edit", { assigned })` bên trong (ô đã có từ Phase A: `FIELD = "assigned"`).

**Thân yêu cầu:** `{ reason: string (không rỗng, tự do), services: [{ id: string; pax: { adult, child, senior, infant } }] }` — PHẢI đúng tập id các dịch vụ TỪ DANH MỤC hiện có của đơn (không thiếu, không thừa, không lẫn dịch vụ nhập tay) — sai tập → 400.

**Thứ tự kiểm** (khuôn giống `handler-cancel`): 404 (đơn không tồn tại) → 403 (`can()` từ chối) → 409 `not_editable` (đơn không phải `confirmed`) → 400 (thân sai dạng, thiếu/thừa dịch vụ, số khách âm/vượt trần, dịch vụ không định giá được — `buildLines` báo lỗi) → ghi.

**Khoá lạc quan (chống tranh chấp — mục "chain continuity" của thiết kế):** route đọc "dòng điều chỉnh gần nhất" (`seq` lớn nhất, có thể không có) CÙNG lúc với đọc `order_service`/`order_item`, tính ra `before` (trạng thái hiện tại trước khi sửa) và `after` (theo thân yêu cầu). Câu `INSERT` dùng idiom `guard`/`wonGuard` đã có trong `orders/repository.ts` — ví dụ:

```sql
INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after)
SELECT ?, ?, COALESCE((SELECT MAX(seq) FROM order_money_adjustment WHERE order_id = ?), 0) + 1, ?, ?, ?, ?
WHERE (SELECT id FROM order_money_adjustment WHERE order_id = ? ORDER BY seq DESC LIMIT 1) IS ?  -- ? cuối = id dòng gần nhất ĐÃ ĐỌC lúc đầu route (NULL nếu chưa có dòng nào)
```

Nếu 0 dòng được ghi (ai đó vừa sửa xong ngay trước) → 409 `stale` (đúng khuôn `STALE()` đã dùng ở dispatch), giao diện/client tải lại và thử lại — KHÔNG âm thầm ghi đè dựa trên `before` đã cũ.

**Nhật ký:** một hành động mới `order_money_adjusted_by_field` (nhóm `order`, `src/shared/audit-actions.ts`), `id` = id dùng chung với dòng điều chỉnh, `detail` = lý do (tự do, FIELD gõ) — KHÔNG kèm số tiền cụ thể trong `detail` (tránh trùng nội dung với `before_json`/`after_json`, đúng "audit_log giữ mục lục, bản ghi trước→sau giữ nội dung"); ai muốn xem số cụ thể tra `order_money_adjustment` qua `id` đó (route `order.history.view` hiện có, hoặc mở rộng nhỏ để join thêm chênh lệch — thuộc kế hoạch thi công).

**Đánh dấu cho ACCOUNTING khi có chênh lệch với tiền đã thu:** so `subtotal_after - subtotal_before` (dùng lại đúng cơ chế "phát hiện qua `order.history.view` đã có", cùng khuôn với đường huỷ đơn — không xây thêm hàng đợi/UI riêng ở đợt này).

**Phản hồi:** không lộ giá cho FIELD — trả tối thiểu, ví dụ `{ ok: true }` (giống `HandlerCancelResponse`), KHÔNG trả `subtotal`/`total`/`items` trong phản hồi của chính route này (khác với route `GET` mà CTV/ACCOUNTING/ADMIN gọi).

## 7. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

1. FIELD đang phụ trách một đơn đã xác nhận, đổi số khách của MỘT dịch vụ từ danh mục (dịch vụ khác giữ nguyên số khách trong thân yêu cầu) → 200; `order_money_adjustment` có thêm đúng một dòng, `seq` tăng 1; `subtotal_after` = tổng đúng theo giá đã chụp lúc lập đơn.
2. Gọi `GET /api/orders/:id` sau đó (bằng CTV đã lập đơn, hoặc ACCOUNTING/ADMIN) → `subtotal`/`total`/`remainingAmount`/`services[].pax`/`services[].items` phản ánh SỐ MỚI (đã cộng dồn), không phải số gốc.
3. Thân yêu cầu thiếu một dịch vụ từ danh mục của đơn, hoặc kèm dịch vụ không thuộc đơn, hoặc kèm dịch vụ nhập tay → 400.
4. Đơn có dịch vụ nhập tay: dịch vụ đó KHÔNG đổi được qua route này, số khách/tiền giữ nguyên dù các dịch vụ từ danh mục khác trong CÙNG đơn đổi được.
5. Đơn chưa xác nhận (nháp) hoặc đã huỷ → 409; không phải người phụ trách → 403; thiếu lý do → 400.
6. Hai yêu cầu sửa gửi gần như đồng thời cho cùng đơn (cùng dựa trên trạng thái CŨ) → đúng MỘT thành công (`seq` không trùng, `idx_order_money_adjustment_seq` là lưới cuối), bên thua 409 `stale`.
7. Sau khi sửa: `order.money.edit`/`money.view`/giá — FIELD vẫn bị từ chối hoàn toàn (đúng ADR-0007 điều 3, không đổi).
8. Quan sát P16: tạm bỏ điều kiện "đủ tập dịch vụ từ danh mục" → test đỏ → hoàn nguyên; thử `UPDATE`/`DELETE` trực tiếp `order_money_adjustment` bằng SQL → bị chặn bởi trigger chỉ-thêm → hoàn nguyên (không cần hoàn nguyên gì, trigger luôn bật).
9. `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --strict` xanh.

## 8. Ngoài phạm vi (ghi rõ, không phải câu hỏi mở)

Bỏ hẳn một dịch vụ khỏi đơn qua đường này; thêm dịch vụ mới; đổi dịch vụ nhập tay; đổi `discount`/tiền cọc/hình thức cọc; hàng đợi/UI riêng cho ACCOUNTING xem "đơn cần chú ý" (xem qua `order.history.view` hiện có); giao diện web cho FIELD (route API-only, cùng khuôn `handler-cancel` đã thi công — chưa có màn hình di động/PWA riêng cho FIELD ở đợt này).
