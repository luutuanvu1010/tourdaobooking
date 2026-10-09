# Bảng sự kiện Vận chuyển — bản đầy đủ cho người kiểm

> **Ghi chú (2026-10-09, sau phiếu kiểm 6b):** bản chụp trước khi gộp G17; bản sống là `src/shared/bang-su-kien-van-chuyen.ts`.

> Sinh từ `src/shared/bang-su-kien-van-chuyen.ts` (hàm `veBangDayDu`). Đây là bản chụp ngày lập; bản sống là tệp mã. Sinh lại:
> `node -e "import('./src/shared/bang-su-kien-van-chuyen.ts').then((m) => process.stdout.write(m.veBangDayDu()))" > <tệp>`

Tổng: 40 lệnh (33 có mã, 7 chưa có mã).

| # | Lệnh | Route (cổng) | Ô quyền — ai bấm được | Bỏ qua luật | Sự kiện chuyến | Nhật ký | Lô | Tin — ai nhận | Bảng tin | Bảng bị ghi | Nguồn |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Tạo chuyến | `POST /api/van-chuyen/chuyen` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | KHOANG_NGHI | CREATED | `trip_created` | `loTaoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: xep_lai | tao | vc_trip, vc_trip_event, audit_log, vc_trip_driver, vc_trip_cost_line | ADR-0049 D1; ADR-0104 Đ1.2; ADR-0052 D6.2 |
| 2 | Sửa chuyến (giờ, xe, tài xế, điểm) | `PUT /api/van-chuyen/chuyen/:id` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU, KHOANG_NGHI, CAM_KET | UPDATED | `trip_edited` | `loSuaChuyen` | tài xế đang lái: doi_chuyen; tài xế vừa được xếp: xep_lai; tài xế vừa bị gỡ: go_lai | sua | vc_trip, vc_trip_event, audit_log, vc_trip_driver, vc_trip_stop, vc_trip_cost_line | ADR-0049 D1; ADR-0104 Đ1.2, Đ1.6; ADR-0052 D6.2 |
| 3 | Xếp khách lên xe | `POST /api/van-chuyen/chuyen/:id/phan-bo` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU, CAM_KET | ALLOCATED | `trip_allocated` | `loXep` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khan_cap (khi bỏ qua luật) | xep | vc_trip, vc_trip_event, audit_log, vc_trip_stop, vc_trip_allocation, vc_leg_appt_ack | ADR-0049 D1; ADR-0104 Đ1.6 + CAO-C (SYSTEM-DESIGN §16) |
| 4 | Thêm điểm / khách khi xe đang chạy | `POST /api/van-chuyen/chuyen/:id/them-diem` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU, CAM_KET | STOP_ADDED_RUNNING | `trip_stop_added_running` | `loThemDiemDangChay` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: xe_chay_doi (khi xe đang chạy) | xe_chay | vc_trip, vc_trip_event, audit_log, vc_trip_stop, vc_trip_allocation, vc_leg_appt_ack, vc_trip_manifest | ADR-0052 D5.1; ADR-0104 Đ1.2 |
| 5 | Văn phòng báo khách huỷ (xe đang chạy) | `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | — | ALLOCATION_OFFICE_CANCELLED | `trip_allocation_office_cancelled` | `loBaoHuy` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: xe_chay_doi (khi xe đang chạy) | xe_chay | vc_trip, vc_trip_event, audit_log, vc_trip_allocation | ADR-0052 D5.2, D6.2 |
| 6 | Rút khách khỏi xe | `POST /api/van-chuyen/chuyen/:id/rut` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU | ALLOCATION_REMOVED | `trip_allocation_removed` | `loRut` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khan_cap (khi bỏ qua luật) | rut | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D1; ADR-0104 Đ1.6 + CAO-C |
| 7 | Dời khách sang chuyến khác | `POST /api/van-chuyen/chuyen/:id/doi` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU, CAM_KET | ALLOCATION_MOVED | `trip_allocation_moved` | `loDoi` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khan_cap (khi bỏ qua luật); tài xế chuyến nguồn: khan_cap (khi bỏ qua luật) | doi | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D1; ADR-0104 Đ1.6 + phiếu kiểm D1 CAO-2 |
| 8 | Huỷ chuyến | `POST /api/van-chuyen/chuyen/:id/huy` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | MOC_TOI_THIEU | CANCELLED | `trip_cancelled` | `loHuy` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: huy_chuyen | huy | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_driver, vc_trip_stop, vc_trip_cost_line | ADR-0049 D1; ADR-0104 Đ1.2; ADR-0052 D6.2 |
| 9 | Cập nhật điểm theo đơn (nút tay) | `POST /api/van-chuyen/chuyen/:id/cap-nhat-diem` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | — | ALLOCATION_STOP_CHANGED | `trip_stops_synced` | `loCapNhatDiem` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: xe_chay_doi (khi xe đang chạy) | cap_nhat / xe chạy: xe_chay | vc_trip, vc_trip_event, audit_log, vc_trip_stop, vc_trip_allocation | ADR-0050 VK1-B; ADR-0052 D5.3a, D6.1 |
| 10 | Cập nhật khách theo đơn (nút tay) | `POST /api/van-chuyen/chuyen/:id/cap-nhat-khach` (office) | `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền | — | ALLOCATION_PASSENGER_CHANGED | `trip_passengers_synced` | `loCapNhatKhach` | không ai | cap_nhat | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | R-P29 (chủ lần 16); ADR-0104 Đ2.11 |
| 11 | Xuất bến | `POST /api/van-chuyen/cuoc-cua-toi/:id/xuat-ben` (staff)<br>`POST /api/van-chuyen/chuyen/:id/xuat-ben` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | DEPARTED | `trip_departed` | `loXuatBen` | không ai | xuat_ben | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_departure_check, vc_trip_departure_check_item, vc_trip_manifest | ADR-0049 D3; ADR-0050 VK1-A |
| 12 | Xe đã tới điểm | `POST /api/van-chuyen/cuoc-cua-toi/:id/diem/:sid/da-toi` (staff)<br>`POST /api/van-chuyen/chuyen/:id/diem/:sid/da-toi` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | STOP_ARRIVED | `trip_stop_arrived` | `loDaToi` | không ai | tien_do | vc_trip, vc_trip_event, audit_log, vc_trip_stop | ADR-0049 D3 |
| 13 | Đã đón khách | `POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/don` (staff)<br>`POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/don` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | PASSENGER_BOARDED | `trip_passenger_boarded` | `loSuat:DA_DON` | không ai | tien_do | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D3 |
| 14 | Khách vắng | `POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang` (staff)<br>`POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/vang` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | PASSENGER_NO_SHOW | `trip_passenger_no_show` | `loSuat:VANG` | người lập đơn (Bán hàng): khach_vang | vang | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D3; ADR-0052 D6.2 (người lập + phụ trách có trip.view) |
| 15 | Khách đã huỷ tại điểm | `POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy` (staff)<br>`POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/khach-huy` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | PASSENGER_CANCELLED_AT_STOP | `trip_passenger_cancelled_at_stop` | `loSuat:KHACH_HUY` | không ai | tien_do | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D3; ADR-0052 D5.2 |
| 16 | Đã trả khách | `POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/tra` (staff)<br>`POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/tra` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | PASSENGER_DROPPED | `trip_passenger_dropped` | `loSuat:DA_TRA` | không ai | tien_do | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D3 |
| 17 | Kết thúc chuyến | `POST /api/van-chuyen/cuoc-cua-toi/:id/ket-thuc` (staff)<br>`POST /api/van-chuyen/chuyen/:id/ket-thuc` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | ENDED | `trip_ended` | `loKetThuc` | không ai | ket_thuc | vc_trip, vc_trip_event, audit_log | ADR-0049 D3 |
| 18 | Kết thúc chuyến gián đoạn | `POST /api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan` (staff)<br>`POST /api/van-chuyen/chuyen/:id/ket-thuc-gian-doan` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | ENDED_INTERRUPTED | `trip_ended_interrupted` | `loKetThucGianDoan` | Bán hàng / người lập đơn (Bán hàng) / Quản trị / Toàn quyền: gian_doan | gian_doan | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0049 D3; ADR-0052 D6.2 (người có trip.dispatch any) |
| 19 | Đổi thứ tự điểm khi đang chạy | `POST /api/van-chuyen/cuoc-cua-toi/:id/thu-tu` (staff)<br>`POST /api/van-chuyen/chuyen/:id/thu-tu` (office) | `trip.progress` [assigned]: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned)<br>`trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | STOPS_REORDERED | `trip_stops_reordered` | `loDoiThuTu` | không ai | tien_do | vc_trip, vc_trip_event, audit_log, vc_trip_stop | ADR-0049 D3; ADR-0110 |
| 20 | Tài xế bổ sung tên khách | `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` (staff) | `trip.passenger.add` [assigned]: Toàn quyền, Tài xế (assigned) | — | PASSENGER_NAMED | `trip_passenger_named` | `loBoSungTen` | không ai | sua | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_manifest, ord_passenger (câu do orders cấp) | ADR-0052 D5b |
| 21 | Văn phòng điều chỉnh kết quả một khách | `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/dieu-chinh` (office) | `trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | CORRECTION | `trip_allocation_corrected` | `loDieuChinh` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: xe_chay_doi (khi xe đang chạy); Bán hàng / người lập đơn (Bán hàng) / Quản trị / Toàn quyền: dieu_chinh | xe_chay | vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_manifest, vc_trip_stop | ADR-0097 Đ2, Đ5 |
| 22 | Văn phòng thu hồi xuất bến | `POST /api/van-chuyen/chuyen/:id/thu-hoi-xuat-ben` (office) | `trip.progress`: Bán hàng, Quản trị, Toàn quyền, Tài xế (assigned) | — | DEPARTURE_REVOKED | `trip_departure_revoked` | `loThuHoiXuatBen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: thu_hoi_xuat_ben; Bán hàng / người lập đơn (Bán hàng) / Quản trị / Toàn quyền: dieu_chinh | sua | vc_trip, vc_trip_event, audit_log | ADR-0097 Đ3, Đ5 |
| 23 | Sửa chặng (số người, giờ, nơi) — máy cập nhật chuyến | `PUT /api/orders/:id/legs/:legId` (orders) | `order.trip.edit` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_leg_updated` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi; giờ hẹn: tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: gio_hen_tai_xe; người lập đơn (Bán hàng): gio_hen_goi_bao | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 24 | Bỏ chặng — máy cập nhật chuyến | `POST /api/orders/:id/legs/:legId/close` (orders) | `order.trip.edit` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_leg_closed` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 25 | Thay chặng — máy cập nhật chuyến | `POST /api/orders/:id/legs/:legId/replace` (orders) | `order.trip.edit` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_leg_closed`, `order_leg_added` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 26 | Thêm / sửa / huỷ khách của đơn — máy cập nhật chuyến | `POST /api/orders/:id/passengers` (orders) | `order.passenger.write` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Đối tác (own), Toàn quyền, Thực tập (own) | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_passenger_changed` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 27 | Văn phòng sửa số khách — máy cập nhật chuyến | `POST /api/orders/:id/money-edit` (office) | `order.money.edit` [ownerId]: Bán hàng (own), Kế toán, Quản trị, Hướng dẫn viên (assigned), Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_money_adjusted` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 28 | Huỷ đơn — máy cập nhật chuyến | `POST /api/orders/:id/status` (orders) | `order.modify` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Đối tác (own), Toàn quyền, Thực tập (own) | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `cancelled` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 29 | HDV huỷ đơn đang phụ trách — máy cập nhật chuyến | `POST /api/orders/:id/handler-cancel` (staff) | `order.cancel` [assigned]: Hướng dẫn viên (assigned), Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_cancelled_by_field` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 30 | HDV sửa số khách — máy cập nhật chuyến | `POST /api/orders/:id/handler-money-edit` (staff) | `order.money.edit` [MATRIX_TRUC_TIEP]: Hướng dẫn viên (assigned), Toàn quyền | — | ALLOCATION_ORDER_SYNCED | `trip_order_synced`, `order_money_adjusted_by_field` | `loDongBoChuyen` | tài xế đang lái / tài xế vừa được xếp / tài xế vừa bị gỡ: khach_doi | cap_nhat | câu đơn (orders), vc_trip, vc_trip_event, audit_log, vc_trip_allocation, vc_trip_stop | ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07) |
| 31 | Sửa thông tin chuyến của đơn (ngày đi, giờ đón — bảng cũ) | `PUT /api/orders/:id/trip` (orders) | `order.trip.edit` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | — | `trip_updated` | — | không ai | — | orders, ord_transfer_leg, audit_log | ADR-0047 R2c; ADR-0104 Đ2.4; G8, G17 (sổ thi công 2026-10-08) |
| 32 | Đánh dấu đã gọi báo khách giờ hẹn mới | `POST /api/van-chuyen/chang/:legId/da-goi-bao` (office) | `trip.call_ack` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | — | `trip_appt_called` | `lenhDaGoiBao` | không ai | — | vc_leg_appt_ack, audit_log | ADR-0051 GB1, GB2 |
| 33 | Bỏ đánh dấu đã gọi báo | `POST /api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao` (office) | `trip.call_ack` [ownerId+assigned]: Bán hàng (ownOrAssigned), Quản trị, Toàn quyền | — | — | `trip_appt_call_undone` | `lenhBoDanhDauGoiBao` | không ai | — | vc_leg_appt_ack, audit_log | ADR-0051 GB1, GB2 |
| 34 | Gửi đề nghị chuyển khách *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_SENT | `trip_transfer_sent` | — | tài xế đang lái: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 35 | Rút lại đề nghị *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_WITHDRAWN | `trip_transfer_withdrawn` | — | không ai | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 36 | Tài xế đích không nhận *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_DECLINED | `trip_transfer_declined` | — | tài xế chuyến nguồn: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 37 | Đề nghị hết hạn (máy) *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_EXPIRED | `trip_transfer_expired` | — | tài xế đang lái / tài xế chuyến nguồn: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 38 | Đề nghị leo thang chờ Quản trị *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_ESCALATED | `trip_transfer_escalated` | — | Quản trị / Toàn quyền: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 39 | Đề nghị được xác nhận (khách sang xe nhận) *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_CONFIRMED | `trip_transfer_confirmed` | — | tài xế đang lái / tài xế chuyến nguồn: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |
| 40 | Quản trị bác đề nghị *(chưa có mã)* | chưa có | dự kiến `trip.transfer` | — | TRANSFER_REJECTED | `trip_transfer_rejected` | — | tài xế đang lái / tài xế chuyến nguồn: chua_dat | — | vc_trip, vc_trip_event, audit_log, vc_transfer_request, vc_transfer_check, vc_trip_allocation | ADR-0111 Đ3; ADR-0052 D4, D6.2 |

## Quy tắc chung (máy kiểm)

- **QT1** — Văn phòng hoặc máy đổi một chuyến đang có tài xế thì tài xế đang lái được báo.
- **QT2** — Lệnh có bỏ qua luật thì tài xế đang lái được báo.
- **QT3** — Lệnh tiến độ có cả nút tài xế lẫn nút văn phòng bấm thay, cùng một cách xử lý.

## Chỗ lệch và ngoại lệ

| Mã | Loại | Mức | Lệnh | Quy tắc | Mã đang làm | Văn bản nói | Đề nghị |
|---|---|---|---|---|---|---|---|
| G17 | LECH_ADR | CAO | sua-thong-tin-chuyen-don | QT1 | Bảng cũ "Sửa thông tin chuyến" đổi ngày đi / giờ đón của chặng đã xếp xe, chỉ ghi một dòng nhật ký đơn không gắn chặng — tài xế không nhận tin, người lập đơn không được nhắc gọi khách. | ADR-0052 D6.2: giờ hẹn chặng đổi khi đã xếp → tài xế đang lái chuyến có suất của chặng + người lập / phụ trách đơn nhận tin. | Làm việc 6 (G17) đúng sáu điều kiện đã ghi ở sổ thi công. (việc 6 — G17) |
| N-CAP-NHAT-KHACH | CHUA_CO_LUAT | VUA | cap-nhat-khach | QT1 | Người xếp xe bấm "Cập nhật khách theo đơn" làm đổi khách trên chuyến chưa chạy — tài xế đang lái không nhận tin; còn khi MÁY làm đúng việc đó (sửa đơn) thì tài xế nhận "Đơn vừa đổi khách". | ADR-0052 D6.1 không liệt kê việc này; ADR-0104 Đ2.10 chỉ nói tin cho máy đồng bộ. Không văn bản nào quyết "nút tay thì không báo". | Cho nút tay sinh cùng tin "khach_doi" với máy (thêm `trip_passengers_synced` vào danh sách tin — cần ADR vì danh sách tin là cửa một chiều). |
| N-CAP-NHAT-DIEM | CHUA_CO_LUAT | VUA | cap-nhat-diem | QT1 | "Cập nhật điểm theo đơn" trên chuyến chưa chạy đổi điểm đón của khách — tài xế đang lái không nhận tin (chỉ nhận khi xe đã chạy). | ADR-0052 D6.1, D6.2 chỉ ghi tin khi xe đang chạy; chuyến chưa chạy không được nói tới. | Hỏi chủ: tài xế đã được xếp lái có cần tin khi điểm đón đổi trước giờ chạy không (khuyến nghị: có, cùng câu "đổi điểm đón"). |
| N-BAM-THAY | CHUA_CO_LUAT | THAP | xuat-ben, da-toi, da-don, vang, khach-huy-tai-diem, da-tra, ket-thuc, ket-thuc-gian-doan, doi-thu-tu | QT1 | Văn phòng bấm thay tiến độ (xuất bến, đã đón, vắng, kết thúc…) trên chuyến của tài xế — tài xế không nhận tin đẩy, chỉ màn đang mở tự tải lại. | ADR-0049 D3, ADR-0050 VK1-A không nói tới tin cho tài xế khi văn phòng bấm thay. | Hỏi chủ khi làm C2 (màn tài xế); khuyến nghị giữ như hiện tại (bấm thay thường khi tài xế không bấm được). |
| N-XEP-RUT-DOI | DA_DUYET | — | xep, rut, doi | QT1 | Xếp / rút / dời khách bình thường (không bỏ qua luật) không báo tài xế. | ADR-0104 Đ1.6 + lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật" (CAO-C, SYSTEM-DESIGN §16): chỉ báo khi bỏ qua luật. | Giữ. |
| N-BO-SUNG-TEN | DA_DUYET | — | bo-sung-ten | QT3 | Chỉ tài xế có nút bổ sung tên khách; văn phòng nhập tên ở đơn. | ADR-0052 D5b. | Giữ. |
| G8 | DA_DUYET | — | sua-thong-tin-chuyen-don | — | Bảng cũ "Sửa thông tin chuyến" (thân kiểu cũ, giờ và nơi đều rỗng) đóng được chặng của đơn đã xác nhận mà không gọi máy đồng bộ — suất trên chuyến chỉ hiện lý do giữ, người xếp xe gỡ bằng nút tay. | ADR-0104 Đ2.4: route này không cần máy đồng bộ; phán quyết G8 (sổ thi công 2026-10-08) giữ nguyên, đường thân cũ mất khi ngừng nhận bản cũ. | Giữ; mở lại nếu chủ đếm thấy máy bản cũ còn dùng đáng kể. |
| BANG-TIN-BO-SUNG-TEN | CHUA_CO_LUAT | THAP | bo-sung-ten | — | Tài xế bổ sung tên khách: Bảng tin gửi loại "sửa chuyến" vì việc này không có dòng riêng trong bảng loại thay đổi (rơi vào mặc định). | ADR-0052 D6.4 không nói; các việc khác đều có dòng riêng. | Thêm dòng riêng ("tien_do") khi sửa tệp tin chuyến lần tới — chỉ đổi màn tự tải lại. |
| TAI-XE-DOI-TAC | LECH_ADR | — | bo-sung-ten | — | Tài xế đối tác chưa có ô bổ sung tên khách (và chưa có ô chuyển khách). | ADR-0053 nới hai ô này cho tài xế đối tác; chủ 5/10 chọn làm sau (chỉ tài xế công ty trước). | Làm trong A4 (việc 7). (việc 7 — A4) |

## Ngoài phạm vi

Việc nhật ký:

- `dispatch_policy_changed` — cấu hình (chính sách điều phối)
- `departure_rule_added` — cấu hình (điều kiện xuất bến)
- `departure_rule_closed` — cấu hình (điều kiện xuất bến)
- `license_capacity_changed` — cấu hình (số khách theo hạng bằng)
- `trip_reason_added` — danh mục lý do
- `trip_reason_updated` — danh mục lý do
- `transfer_template_set` — mẫu đưa đón của dịch vụ (danh mục)
- `trip_cost_adjusted` — chi phí xe thuê — chỉ dòng chi phí, không đổi chuyến, không sự kiện chuyến (ADR-0057)
- `trip_cost_reversed` — chi phí xe thuê (ADR-0057)
- `trip_cost_snapshot` — chi phí xe thuê (ADR-0057)
- `trip_cost_agreed` — chi phí xe thuê (ADR-0057)
- `rental_rate_added` — bảng giá thuê xe
- `rental_rate_closed` — bảng giá thuê xe
- `route_saved` — danh mục tuyến
- `vehicle_size_saved` — danh mục cỡ xe

Route ghi:

- `POST /api/van-chuyen/xe` — hồ sơ xe
- `PUT /api/van-chuyen/xe/:id` — hồ sơ xe
- `POST /api/van-chuyen/xe/:id/giay-to` — giấy tờ xe
- `POST /api/van-chuyen/xe/:id/giay-to/:did/gia-han` — giấy tờ xe
- `POST /api/van-chuyen/xe/:id/giay-to/:did/sua-sai` — giấy tờ xe
- `POST /api/van-chuyen/xe/:id/ban` — lịch xe bận (luật chéo với chuyến ở trigger, không ghi chuyến)
- `POST /api/van-chuyen/xe/:id/ban/:bid/rut` — lịch xe bận
- `POST /api/van-chuyen/chinh-sach-dieu-phoi` — cấu hình
- `POST /api/van-chuyen/dieu-kien` — cấu hình
- `POST /api/van-chuyen/dieu-kien/:id/dong` — cấu hình
- `POST /api/van-chuyen/hang-bang` — cấu hình
- `POST /api/van-chuyen/ly-do` — danh mục lý do
- `PUT /api/van-chuyen/ly-do/:code` — danh mục lý do
- `POST /api/van-chuyen/mau-chang/:code` — mẫu đưa đón
- `POST /api/van-chuyen/loai-giay-to-xe` — danh mục giấy tờ xe
- `PUT /api/van-chuyen/loai-giay-to-xe/:code` — danh mục giấy tờ xe
- `POST /api/van-chuyen/nguong-het-han` — cấu hình
- `POST /api/van-chuyen/bang-gia` — bảng giá thuê xe
- `POST /api/van-chuyen/bang-gia/:id/ket-thuc` — bảng giá thuê xe
- `POST /api/van-chuyen/tuyen` — danh mục tuyến
- `PUT /api/van-chuyen/tuyen/:code` — danh mục tuyến
- `POST /api/van-chuyen/co-xe` — danh mục cỡ xe
- `PUT /api/van-chuyen/co-xe/:code` — danh mục cỡ xe
- `POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh` — chi phí xe thuê
- `POST /api/van-chuyen/chuyen/:id/chi-phi/dao` — chi phí xe thuê
- `POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai` — chi phí xe thuê
- `POST /api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan` — chi phí xe thuê
- `PUT /api/orders/:id/handler` — đổi người phụ trách đơn (dispatch)
