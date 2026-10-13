# Phụ lục B — Vòng đời đơn

> Mốc `483b3aa0`. Người kiểm độc lập đọc mã và chạy bài thử trên khung thử (`tests/audit/harness.mjs`) từ thư mục tạm; cây mã không đổi (`git status` sạch). Tôi (điều phối) chưa chạy lại các bài B-1, B-2.

## Bảng trạng thái đơn (từ mã)

| Chuyển | Ai bấm | Cổng chặn | Nhật ký |
|---|---|---|---|
| nháp → xác nhận (`POST /orders/:id/status`) | `order.modify`: Bán hàng (đơn mình/được giao), Quản trị, Toàn quyền, Đối tác (đơn mình), Thực tập (đơn mình) | Ngày đi trong [hôm nay, +365]; ≥ 1 khách; mốc 6 giờ (Đặt gấp); Đối tác/Thực tập đúng giá danh mục, giảm giá = 0; trigger tạm tính = Σ dòng (0081) | `confirmed`, `order_terms_captured` |
| nháp/xác nhận → huỷ | cùng route; nhóm "Công ty huỷ" chỉ người có `order.cancel.classify` | Lý do bắt buộc (trigger `orders_cancel_requires_reason`) | huỷ + lý do |
| xác nhận → huỷ (HDV) `POST /orders/:id/handler-cancel` | HDV đang phụ trách | chỉ đơn xác nhận, chưa qua ngày đi (văn phòng huỷ được cả sau ngày đi — theo thiết kế) | có |
| huỷ → ? | không có đường ra | TRANSITIONS rỗng; thu chỉ Kế toán/Toàn quyền; hoàn qua duyệt/chi khác người | — |
| xác nhận → Đã giao (`/delivered`) | HDV đang phụ trách, Quản trị, Toàn quyền | từ ngày đi muộn nhất; thu đủ = phải thu; không còn lần thu "chưa rõ"; bên đặt không mang vai nhóm ngoài (xem N-2); trigger `delivered_not_paid` | `order_delivered` |
| Đã giao → Hoàn thành (`/completed`) | Kế toán, Toàn quyền | không ai nợ công ty; I1 (trigger 0083) | có |
| lùi từ Đã giao/Hoàn thành | không có | tiền đơn khoá từ khi hết nháp (0081), khoá hẳn từ Đã giao; sửa lần thu chỉ qua "Thay lần thu" | — |

Dịch vụ không có trạng thái riêng, đóng băng theo đơn. Chặng đón đóng/thay bằng `valid_to`.

## Phát hiện

| Mã | Mức | Chuyện gì | Tái hiện | Tệp:dòng | Xử lý |
|---|---|---|---|---|---|
| B-1 | Medium | Ba mốc giờ của dịch vụ không được máy chủ kiểm chéo. | Bán hàng `PUT /api/orders/:id/trip` trên đơn **đã xác nhận**: departTime 07:00, pickupTime 22:00, checkinDate 2001-01-01, checkinTime 23:59 → 200, lưu đúng. Cảnh báo duy nhất là `tripWarnings` phía trình duyệt. | `src/modules/orders/service-rules.ts:86-103`; `src/shared/trip-form.ts:29-45` | Chặn check-in ngoài khoảng ngày dịch vụ và sau khởi hành; giờ đón sau khởi hành tối thiểu cảnh báo có nhật ký. Nhỏ. |
| B-2 | Medium (theo thiết kế giai đoạn 1) | Hai lần bấm ghi lần thu **không** header `idempotency-key` ra hai lần thu. | `POST /api/orders/:id/payments` hai lần cùng thân, không header → 201, 201, hai dòng `bil_payment_receipt`; có header → lần 2 trả 200 `da_ghi_truoc_do`. Web luôn gửi header (`web/api.ts:155`). | `src/shared/router.ts:~468-474` | Chủ chọn ngày bật giai đoạn 2 của ADR-0094 trước khi tiền thật chảy. |
| B-3 | Low | "Nơi check-in" (`order_service.checkin_place`) và "nơi trả chặng đi" (`ord_transfer_leg.dropoff_place`) là hai ô độc lập, không đồng bộ. Cột ghi kép `pickup_*` hiện **không còn đọc**. | Đọc cột và đường ghi. | `orders/repository.ts:1320`; `shared/order-confirmation.ts:154` | Chọn một nguồn hoặc cảnh báo lệch. Nhỏ. |

## Nghi ngờ

- N-1: Gộp hồ sơ (ADR-0068) đổi `booker_party_id` cho đơn đã xác nhận nhưng không chụp lại hoa hồng. Đường tới lỗi rất hẹp (hồ sơ phụ có vai nhóm ngoài/tài khoản bị chặn gộp), chưa dựng được chuỗi đầy đủ.
- N-2: Đơn đại lý (bên đặt mang vai nhóm ngoài) không bấm được "Đã giao"/"Hoàn thành" cho tới đợt 2 (409 `not_deliverable`, đã chạy). Gate dùng mọi vai nhóm ngoài (kể cả nhà xe), rộng hơn danh sách vai hưởng hoa hồng. Quyết định đã duyệt (ADR-0025/0077), ghi để chủ biết khi mở cho đối tác thật.
- N-3: Đối tác/Thực tập/Bán hàng ghi lần thu cho đơn nháp/đơn của mình với số ≤ 10 tỷ; thu vượt chỉ bị chặn ở "Đã giao" (thiết kế M2). Chưa thấy cách làm mất tiền.

## Trạng thái mục đã biết (vùng B)

- K-B-1: **đã vá** — `priceGuard` (`orders/index.ts:250-256`) phủ tạo và sửa nháp; xác nhận gọi `giaDanhMucViolation` (`index.ts:~1357/1374`); `chiGiaDanhMuc = holdsPartner || holdsIntern` (`permissions.ts:369`). Chưa chạy lại bằng route Thực tập.
- K-B-3: **còn hở** — `PUT /api/orders/:id/booker` chỉ hỏi `order.trip.edit`; mức có chụp lại nhưng người hưởng đổi theo người gọi.
- ADR-0114 (sửa số khách): chủ chưa duyệt; hành vi hiện tại là đã biết, không báo lại.

## Đã kiểm, sạch

- Xoá–chèn lại khi lưu nháp (`XOA_CUNG_NHAP`): `LEG_DELETE_DRAFT`/`PASSENGER_DELETE_DRAFT` (`chang-hanh-khach-repo.ts:179-186, 508-512`) có `status='draft'` ngay trong câu + guard `audit_log`; trigger `ord_transfer_leg_no_delete`/`ord_passenger_no_delete` chặn khi hết nháp.
- Chống ghi trùng: `LAN_GUI_MIEN` rỗng (mọi route ghi có đăng nhập đi qua lớp vé); `lan-gui-phu-route.test.ts` ép 173 route và 5 route công khai (bài này nằm trong `npm test` xanh).
- Sổ billing chỉ thêm: `grep "UPDATE bil_|DELETE FROM bil_"` ngoài test = 0; trigger no_update/no_delete có cho receipt, posting, debt_line, deposit_approval, outside_refund, bank_txn, vc_trip_cost_line.
