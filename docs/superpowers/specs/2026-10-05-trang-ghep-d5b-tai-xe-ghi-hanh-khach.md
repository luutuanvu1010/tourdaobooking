# Trang ghép — D5b: tài xế ghi hành khách vào `ord_passenger` (Vận chuyển Đợt 5, lát A-1b)

> Trạng thái: **NHÁP — CHỜ CHỦ DUYỆT** cùng tệp đề xuất luật A-1b (`docs/superpowers/plans/2026-10-05-adr-0052-a1b-de-xuat-luat.md`). Bắt buộc theo CLAUDE.md §9 "bước ghép khi duyệt": bảng dùng chung `ord_passenger` nhận một **người ghi mới** (tài xế). Đo trên mã của nhánh `worktree-agent-a51d501a3883b17a1` ngày 2026-10-05; khuôn: `2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`.
>
> **Cổng vào chưa đạt (kế hoạch Task 12 Step 1):** A-1 chưa lên `main`; Đợt 4 (cổng `THIEU_GIA`, ô `transport.cost.adjust`) chưa lên `main`. Điều phối giao làm A-1b trong cùng làn (nhật ký Task 0) ⇒ phần phụ thuộc Đợt 4 (giá thoả thuận cứu hộ) để NỢ.

## (1) `ord_passenger` chứa loại thực thể nào

- **Một loại**: khách đi của MỘT đơn (họ tên + năm sinh + loại khách), theo chuỗi `previous_id` / `person_key` (ADR-0047 A2, migration `0035`).
- Cột `source ∈ {OFFICE, DRIVER}` (CHECK có sẵn từ `0035:19`) chỉ ghi **người nhập**, không đổi loại thực thể: dòng `DRIVER` vẫn là khách của đơn, cùng luật chuỗi, cùng trigger `ord_passenger_frozen_update` (`0035:37` — `source` bất biến), cùng khoá "đơn đã giao" (`0044:87–93`).
- Hôm nay **chưa có đường ghi `DRIVER`**: R-ORD-11 (`scripts/audit-checks.mjs:816–826`) `fail` khi có bất kỳ dòng `DRIVER` nào.

## (2) Dòng bản đồ quyền chạm `ord_passenger` (10 cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR)

| Ô | Giá trị (`src/shared/permissions.ts`) | Áp cho dòng OFFICE | Áp cho dòng DRIVER |
|---|---|---|---|
| `order.view` (:74) | any, any, any, assigned, own, any, own, none, none, none | xem đơn | như OFFICE — dòng DRIVER hiện ở trang đơn như mọi khách |
| `contact.view` (:77) | any, any, any, assigned, ownOrAssigned, any, own, none, none, none | đọc họ tên + năm sinh (`GET /api/orders/:id/passengers`) | như OFFICE |
| `order.passenger.write` (:88) | ownOrAssigned, none, any, none, own, any, own, none, none, none | văn phòng nhập / sửa (dòng mới) / huỷ | văn phòng sửa dòng DRIVER bằng dòng mới `source = 'OFFICE'` (chuỗi giữ `person_key`) |
| `trip.view` (:169) | any, any, any, none, none, any, none, assigned, none, none | tên khách trong DTO chuyến (văn phòng mọi lúc; tài xế trong ngày chạy) | như OFFICE |
| **`trip.passenger.add` (MỚI — đề xuất)** | none, none, none, none, none, any, none, **assigned**, none, none | — | tài xế đang lái chuyến có chặng của đơn, **trong ngày chạy**, chỉ cho suất mở chưa tên |

- DRIVER_PARTNER `none` (Đợt 6 mới mở theo ADR-0053 — câu hỏi chờ chủ). SALES / ADMIN `none` (văn phòng đã có `order.passenger.write`; không có route văn phòng cho ô này).
- Ghim DRIVER (`permissions.test.ts`) từ 2 ô `assigned` (`trip.view`, `trip.progress`) → **3** — đây là NỚI, mục 1 tệp đề xuất.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Route `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` | cổng `staff` → `can(trip.passenger.add, { assigned })` (assigned = có dòng lái mở của chính tài khoản) → chuyến mình đang lái (PLANNED trong ngày chạy hoặc RUNNING) → `trongNgayChay` → suất chưa tên, mở, đúng chuyến → đơn của chặng | ngoài phạm vi → 404 (không dò được đơn khác); suất đã có tên → 409; phản hồi `{ ok, soNguoi }` không tên |
| Câu ghi của `orders` (`cauThemHanhKhachTaiXe`) | KHÔNG tự kiểm quyền; gác bằng `EXISTS audit_log id` + đơn đã xác nhận, chưa huỷ, chưa giao + số người hiện hành < số khách hiệu lực | bài `orders-cong-bo.test.ts`: nơi gọi phải đứng sau `can(` trong thân route |
| Lô `loBoSungTen` (van-chuyen) | cổng phiên bản chuyến → nhật ký → sự kiện `PASSENGER_NAMED` → câu orders (nhãn `GHI_NGOAI`, gác id nhật ký — ngoại lệ hẹp, mục 2 đề xuất) → `ALLOC_GAN_TEN` → bản chốt nếu đã xuất bến | trigger LC-10 (gắn tên đúng đơn) có sẵn |
| CSDL | `ord_passenger_frozen_update` (0035), `ord_passenger_delivered_lock_*` (0044), CHECK `source` | không migration mới |
| Kiểm định kỳ | R-ORD-11 đổi nghĩa: dòng `DRIVER` phải có sự kiện `PASSENGER_NAMED` + suất mang `passenger_key` đó (mục 3 đề xuất) | trước khi duyệt, dòng DRIVER đầu tiên làm R-ORD-11 đỏ |
| **Giao diện ẩn/hiện** | `web/cuoc-chuyen.ts`: link "Bổ sung tên" chỉ khi `can(staff, "trip.passenger.add", { assigned: true })` VÀ suất mở chưa tên VÀ trong ngày chạy; trang đơn (`web/order.ts`) hiện dòng tài xế nhập như mọi dòng (không nhãn riêng — chưa có bản vẽ) | đổi nghĩa ẩn/hiện: KHÔNG có chỗ hiện có nào đổi nghĩa; chỉ thêm link mới |

## Điều chưa chắc (ghi để chủ quyết)

- Dòng DRIVER có cần nhãn "Tài xế nhập" ở trang đơn không (bản vẽ chưa có) — hôm nay không hiện nhãn.
- Đơn đã đủ số người nhưng khách thật trên xe khác tên (đổi người): tài xế không sửa được; gọi văn phòng (giữ như lượt 1).
