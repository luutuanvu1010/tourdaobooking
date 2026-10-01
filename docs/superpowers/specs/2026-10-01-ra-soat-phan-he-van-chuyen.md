# Rà soát toàn phân hệ Vận chuyển (2026-10-01, nhánh `worktree-doi-chieu-phieu-giam-doc` = `main` 1.62 + bản 1.63)

> Chỉ đọc. Ba người rà song song (đối chiếu ADR ↔ mã; đi luồng theo vai qua giao diện; gom nợ/việc treo), điều phối kiểm lại bằng grep các điểm chính. Không chạy app, không chạm production.

## Kết luận

Khung chạy xe hằng ngày bằng **xe + tài xế công ty** đã đủ, cả máy chủ lẫn màn hình: đơn có chặng (nơi đón, nơi trả, chiều về, số hiệu chuyến bay), danh sách khách, mẫu chặng, cảnh báo sớm, bảng điều phối (xếp, rút, dời, huỷ, cập nhật điểm/khách, gọi báo), xuất bến, tiến độ, kết thúc, hồ sơ xe + giấy tờ + hạn. Phần thiếu tập trung ở **4 ADR đã duyệt chưa thi công** (0052, 0053, 0055 phần còn lại, 0057) + nửa 0056, và vài màn nhỏ.

## Đã duyệt, chưa thi công (xếp theo ảnh hưởng xe chạy)

| # | Thiếu | ADR | Bằng chứng (kiểm 1/10) |
|---|---|---|---|
| 1 | Tài xế nhà xe đối tác không xem chuyến, không bấm tiến độ, không Từ chối / Báo bận ⇒ văn phòng bấm thay | 0053 (D2 bổ sung 0048) | `src/shared/permissions.ts:169,174` cột `DRIVER_PARTNER` = `none`; grep `trip.refuse` = 0 |
| 2 | Xe đang chạy: thêm điểm/khách, báo huỷ điểm, cứu hộ, tài xế ghi tên khách thiếu | 0052 D5 | grep `cuu-ho`, `trip.passenger.add` = 0 |
| 3 | Nhờ xe khác đón (chuyển điểm giữa hai xe) | 0052 D4 | grep `trip.transfer` = 0 |
| 4 | Báo tài xế khi được xếp / dời / huỷ / đổi chuyến (tin đẩy, bảng tin) | 0052 D6 | `src/modules/van-chuyen` không gọi đẩy tin |
| 5 | Tiền xe thuê: bảng giá nhà xe, chi phí chuyến, cổng "thiếu giá không xuất bến" | 0057 | grep `vc_trip_cost_line` = 0 |
| 6 | Cam kết xe riêng / số chỗ tối thiểu | 0056 VK3-A | grep `exclusive_vehicle`, `min_vehicle_seats` = 0 |
| 7 | Lịch xe vào xưởng (khung bận) | 0055 VK2-A | không có cột/bảng |
| 8 | Cảnh báo giờ lái | 0055 VK2-B | `vc_dispatch_policy` không có cột |
| 9 | Thêm giấy tờ xe chưa chặn trùng loại đang hiệu lực | 0056 VK3-B | `src/modules/van-chuyen/index.ts:401-424` |
| 10 | Nhiệm vụ theo từng dịch vụ (người đón, lái cano…) | 0006 | `src/modules/dispatch/index.ts:1` chỉ người phụ trách đơn; ô `task.progress` hạn 2026-11-30 (`docs/quyen-hoan.json`) |
| 11 | Bỏ đường ghi chặng kiểu cũ (ngừng ghi kép, cột chết `pickup_*`) | 0047 Phần C | `tronChangCu` còn gọi ở `src/modules/orders/service.ts:73` |

## Có API, thiếu màn hình

- Văn phòng đổi thứ tự điểm khi xe đang chạy: route `…/chuyen/:id/thu-tu` có; chỉ màn tài xế (`web/cuoc-chuyen.ts:153`) gọi, `web/chuyen.ts` không.
- Gắn người đi kèm (HDV) lên xe: thân xếp nhận `nguoiDiKem` (`dieu-phoi-than.ts:95`), không màn nào gửi.
- Ngưỡng nhắc giấy tờ sắp hết hạn: `POST /api/van-chuyen/nguong-het-han` (`index.ts:743`) không màn nào gọi.

## Giới hạn theo quyền (đúng luật hiện hành — đổi cần chủ)

- Đối tác / Thực tập không sửa chặng, khách sau xác nhận (`order.trip.edit`), phải nhờ văn phòng. ADR-0063 (proposed) bàn việc này.
- Hướng dẫn viên không thấy xe của đơn mình: route xe-của-đơn cổng văn phòng. ADR-0064 (proposed).
- Chính sách điều phối chỉ Toàn quyền sửa; duyệt đặt gấp chỉ Quản trị / Toàn quyền.

## Chờ chủ quyết

- ADR-0063, 0064, 0065 (`ride_pax`) còn proposed; văn bản ở `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/`.
- Phiếu Giám đốc nhóm trái ADR đã duyệt (bỏ mốc 6 giờ, Trưởng ca đổi tài xế, bỏ điều kiện Bảo hiểm, một người trực, huỷ đơn tự rút khách) và nhóm chưa có kế hoạch (xe hỏng giữa đường, giờ lái 10 giờ, nhiên liệu/km, máy tự xếp điểm, iPad 3 cột): `docs/BACKLOG.md:116-124`.
- D6 "Nhà riêng"; biên nhận PNG dòng đưa đón; "Việc của tôi" hiện chặng; chữ tự đặt của 1.62.
- Hỏi luật sư ghép khách trên xe hợp đồng (NĐ 158/2024) — chặn chuyến ghép.
- Chủ đã cho dùng Bảng điều phối cho chuyến thật chưa (`docs/SYSTEM-DESIGN.md` §14 còn ghi chờ màn nhập tên khách — nay đã có).

## Tài liệu cũ cần sửa (mô tả, thua mã)

- `docs/VAN-CHUYEN.md:87-89` còn ghi "chưa có màn nhập tên khách / nơi trả".
- `docs/BACKLOG.md:69` (thứ tự khách) đã xong ở 1.63.
- Chú thích "GIẢ ĐỊNH chờ chủ chạy truy vấn đếm" cũ ở `scripts/audit-checks.mjs:783`.

## Chưa kiểm thật

- iPhone / iPad thật cho tài xế và điều phối.
- Các kịch bản Chrome `xe-smoke`, `chuyen-smoke`, `chuyen-sua`, `rut-doi`, `goi-bao`, `chinh-sach-dieu-phoi-smoke` chưa chạy lại sau 1.62; `cuoc-smoke` đỏ 5 bước (dựng tài khoản lai, đỏ y hệt trên gốc).
