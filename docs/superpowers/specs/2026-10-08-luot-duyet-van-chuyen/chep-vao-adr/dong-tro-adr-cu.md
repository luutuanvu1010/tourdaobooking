# Dòng trỏ cho dòng Trạng thái của ADR cũ (bản chép lượt 8a, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Theo khuôn commit `928f33f9` ("Ghi dòng 'thay câu' vào 12 ADR cũ"): **chỉ thêm một câu vào cuối dòng Trạng thái**, thân ADR cũ không đổi (luật "từ mốc accepted chỉ sửa dòng trạng thái"). Dòng "Cũ" chép nguyên văn từ `docs/adr/` @ `c3b6d66a` (nhánh `claude/van-chuyen-goi-a-c`; `docs/adr/` không đổi từ `2f0c74e7`) để làm chuỗi tìm khi thay; dòng "Mới" = dòng cũ + câu trỏ.
>
> Bảy ADR bị sửa: 0007, 0049, 0050, 0052, 0056 (bởi ADR-0104); 0014, 0061 (bởi ADR-0063). Không có ADR đã duyệt nào khác bị hai ADR này sửa; đề xuất ADR-0091 chưa có tệp trong `docs/adr/` (xem mục tuỳ chọn ở `README-dong-moi.md`).
>
> Câu trỏ của ADR-0049 và ADR-0056 viết theo hai điểm chủ đã xác nhận 2026-10-08 (dòng Trạng thái của ADR-0104): cam kết gồm cả xe riêng lẫn số chỗ tối thiểu; khoảng nghỉ, cam kết chỉ mở cho Bán hàng khi chuyến còn dưới 6 giờ.

## ADR-0007 — bởi ADR-0104

Tệp `docs/adr/ADR-0007-ban-do-quyen-thao-tac-va-sua-sau-xac-nhan.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-20). Các dòng ◆ được chủ dự án duyệt cùng ADR. Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): điều 4(b) — hai hàm tiêm `ctx.baoThayDoiChuyen`, `ctx.chuyenLienQuan` — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052.
```

Mới:

```
- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-20). Các dòng ◆ được chủ dự án duyệt cùng ADR. Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): điều 4(b) — hai hàm tiêm `ctx.baoThayDoiChuyen`, `ctx.chuyenLienQuan` — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052. **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): điều 4(b) (`:37`, khuôn hàm tiêm) thêm `ctx.dongBoChuyen` — nhận câu đơn đã soạn, trả lô đầy đủ chưa chạy (Đồng bộ chuyến theo đơn); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104.
```

## ADR-0014 — bởi ADR-0063

Tệp `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-22, §4.5 câu 6 của `docs/AUDIT-2026-09-22-DOI-TAC.md`). Văn bản đã sửa theo đúng các câu trả lời §4.5 (điều 9–12 thêm vào) **trước khi** chuyển trạng thái, theo đúng ghi chú của người kiểm ở §4.5 — không có nội dung nào ở đây khác với điều chủ đã trả lời. Sau đây chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này. **Thay câu bởi [ADR-0098](ADR-0098-tra-trung-ho-so-theo-sdt.md)** (accepted 2026-10-03): điều 5 và bảng ô (`:69`) — máy chủ tra theo SĐT chuẩn hoá trước khi tạo; đã có ⇒ dùng lại hồ sơ, không tạo thứ hai; Đối tác / Thực tập chỉ nhận thông điệp "đã có hồ sơ, dùng lại", không nhận chi tiết hồ sơ (phần "không tra / sửa danh bạ" giữ nguyên).
```

Mới:

```
- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-22, §4.5 câu 6 của `docs/AUDIT-2026-09-22-DOI-TAC.md`). Văn bản đã sửa theo đúng các câu trả lời §4.5 (điều 9–12 thêm vào) **trước khi** chuyển trạng thái, theo đúng ghi chú của người kiểm ở §4.5 — không có nội dung nào ở đây khác với điều chủ đã trả lời. Sau đây chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này. **Thay câu bởi [ADR-0098](ADR-0098-tra-trung-ho-so-theo-sdt.md)** (accepted 2026-10-03): điều 5 và bảng ô (`:69`) — máy chủ tra theo SĐT chuẩn hoá trước khi tạo; đã có ⇒ dùng lại hồ sơ, không tạo thứ hai; Đối tác / Thực tập chỉ nhận thông điệp "đã có hồ sơ, dùng lại", không nhận chi tiết hồ sơ (phần "không tra / sửa danh bạ" giữ nguyên). **Bổ sung/sửa bởi [ADR-0063](ADR-0063-sua-don-sau-xac-nhan.md)** (accepted một phần 2026-10-08, D1): `:86` (cấp đầy đủ của người phụ trách Bán hàng) trừ ô `order.money.edit` — Bán hàng chỉ sửa số khách sau xác nhận cho đơn mình lập (ô `own`, D1); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0063.
```

## ADR-0049 — bởi ADR-0104

Tệp `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29, câu "Duyệt quyết định Bảng điều phối chung, lượt 1 (9 điểm ở trên)?". Nguyên văn: **"Duyệt, ghi theo câu 1"**. Câu 1 là ĐP2(v); chủ chọn **"Cho lưu nháp, chặn ở Xác nhận"** (nguyên văn câu hỏi và trả lời: [HĐ] "Trả lời lần 4"). Điều kiện điều phối đã nêu với chủ: người kiểm độc lập xem bản cuối rồi mới ghi. Đã kiểm 29/9, **ĐẠT** (bản đề xuất đỉnh `dcea833`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **D1 (bảng `vc_trip`: thêm `route_code`, cờ `rented`) và D2 (cổng xuất bến: chuyến xe thuê phải có nguồn giá, không phá lệ) bị bổ sung bởi ADR-0057** (duyệt 2026-09-30). **Bổ sung bởi ADR-0055** (duyệt 2026-09-30): LC-03 thêm "không chồng khung bận"; `vc_dispatch_policy` thêm giờ lái tối đa/ngày và giờ lái liên tục (chỉ cảnh báo); `lichChungChang` và trường cho tài xế thêm số hiệu chuyến bay. **Bổ sung bởi ADR-0056** (duyệt 2026-09-30): cổng xuất bến thêm cam kết xe riêng / số chỗ tối thiểu (Quản trị/Toàn quyền phá lệ, ô `trip.override`); `vc_trip` thêm cột phá lệ cam kết; `lichChungChang` thêm cờ xe riêng, số chỗ tối thiểu. **Bổ sung bởi ADR-0054** (duyệt 2026-09-30): `lichChungChang` dùng số người hiệu lực của chặng (`soNguoiChang`). **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): LC-15 (xe đang chạy: bốn đường mở/đóng suất có tên), ô `trip.transfer`/`trip.passenger.add`, danh sách trường tài xế thấy về xe khác, dòng "Xếp" của mốc 6 giờ (chuyển điểm chỉ miễn khi xe nhận đang chạy), `vc_dispatch_policy` — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052. **Bổ sung bởi ADR-0053** (duyệt 2026-09-30): cột `DRIVER_PARTNER` mở `assigned` ở các ô chuyến, "trong ngày chạy" siết cho mọi tài xế (xuất bến sớm không mở sớm), `vc_trip_driver`, `refuse_lead_minutes`, LC-03 khung bận — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0053. **Thay câu (2026-10-03):** bảng luật lõi + LC-19 (điểm đón đứng trước điểm trả), LC-20 (cửa sổ xuất bến — cột `departure_window_minutes` ở D2, mặc định 720 phút, không phá lệ), LC-21 (giờ hẹn đón không sớm hơn giờ khởi hành); cổng xuất bến + ba lý do giữ — [ADR-0096](ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md). LC-07 + cạnh có điều kiện `RUNNING → PLANNED` (thu hồi xuất bến), LC-15 + ngoại lệ lô `CORRECTION`, nhóm lý do `DIEU_CHINH` — [ADR-0097](ADR-0097-su-kien-dieu-chinh-co-ly-do.md).
```

Mới:

```
- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29, câu "Duyệt quyết định Bảng điều phối chung, lượt 1 (9 điểm ở trên)?". Nguyên văn: **"Duyệt, ghi theo câu 1"**. Câu 1 là ĐP2(v); chủ chọn **"Cho lưu nháp, chặn ở Xác nhận"** (nguyên văn câu hỏi và trả lời: [HĐ] "Trả lời lần 4"). Điều kiện điều phối đã nêu với chủ: người kiểm độc lập xem bản cuối rồi mới ghi. Đã kiểm 29/9, **ĐẠT** (bản đề xuất đỉnh `dcea833`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **D1 (bảng `vc_trip`: thêm `route_code`, cờ `rented`) và D2 (cổng xuất bến: chuyến xe thuê phải có nguồn giá, không phá lệ) bị bổ sung bởi ADR-0057** (duyệt 2026-09-30). **Bổ sung bởi ADR-0055** (duyệt 2026-09-30): LC-03 thêm "không chồng khung bận"; `vc_dispatch_policy` thêm giờ lái tối đa/ngày và giờ lái liên tục (chỉ cảnh báo); `lichChungChang` và trường cho tài xế thêm số hiệu chuyến bay. **Bổ sung bởi ADR-0056** (duyệt 2026-09-30): cổng xuất bến thêm cam kết xe riêng / số chỗ tối thiểu (Quản trị/Toàn quyền phá lệ, ô `trip.override`); `vc_trip` thêm cột phá lệ cam kết; `lichChungChang` thêm cờ xe riêng, số chỗ tối thiểu. **Bổ sung bởi ADR-0054** (duyệt 2026-09-30): `lichChungChang` dùng số người hiệu lực của chặng (`soNguoiChang`). **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): LC-15 (xe đang chạy: bốn đường mở/đóng suất có tên), ô `trip.transfer`/`trip.passenger.add`, danh sách trường tài xế thấy về xe khác, dòng "Xếp" của mốc 6 giờ (chuyển điểm chỉ miễn khi xe nhận đang chạy), `vc_dispatch_policy` — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052. **Bổ sung bởi ADR-0053** (duyệt 2026-09-30): cột `DRIVER_PARTNER` mở `assigned` ở các ô chuyến, "trong ngày chạy" siết cho mọi tài xế (xuất bến sớm không mở sớm), `vc_trip_driver`, `refuse_lead_minutes`, LC-03 khung bận — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0053. **Thay câu (2026-10-03):** bảng luật lõi + LC-19 (điểm đón đứng trước điểm trả), LC-20 (cửa sổ xuất bến — cột `departure_window_minutes` ở D2, mặc định 720 phút, không phá lệ), LC-21 (giờ hẹn đón không sớm hơn giờ khởi hành); cổng xuất bến + ba lý do giữ — [ADR-0096](ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md). LC-07 + cạnh có điều kiện `RUNNING → PLANNED` (thu hồi xuất bến), LC-15 + ngoại lệ lô `CORRECTION`, nhóm lý do `DIEU_CHINH` — [ADR-0097](ADR-0097-su-kien-dieu-chinh-co-ly-do.md). **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): mốc 6 giờ — Bán hàng, Quản trị, Toàn quyền điều chỉnh khẩn cấp mọi lệnh bị khoá (ô mới `trip.urgent_adjust`); khoảng nghỉ và cam kết xe riêng / số chỗ: chuyến dưới mốc như trên, ngoài mốc chỉ Quản trị, Toàn quyền (`trip.override`) — sửa `:29`, `:48` (ĐP3), `:162`, `:171`, `:200`, `:302`, `:313`, `:365` và phần "Bổ sung bởi ADR-0056" của dòng này; LC-09 (`:129`): đơn huỷ sau khi xếp → máy rút suất trên chuyến chưa chạy trong cùng lô (Đồng bộ chuyến theo đơn); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104.
```

## ADR-0050 — bởi ADR-0104

Tệp `docs/adr/ADR-0050-van-chuyen-kernel-luot-1.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29: Q-L1-1 **"Sửa được giờ thật"**, Q-L1-2 **"Giữ chuyến tới khi cập nhật"**, Q-L1-3 **"Kiểm định + Bảo hiểm"** (cả ba là phương án (a) khuyến nghị); câu duyệt "Duyệt ghi lượt 1 này thành quyết định chính thức ADR-0050 theo 3 câu trả lời trên? (Tôi chỉ ghi sau khi người kiểm độc lập xem bản cuối và báo đạt.)" → **"Duyệt, ghi theo 3 câu"** (nguyên văn: [HĐ] "Trả lời lần 10"). Điều kiện đã nêu với chủ: người kiểm độc lập xem bản cuối → **ĐẠT** (bản đề xuất đỉnh `73d3c2d`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): VK1-B — đường sửa trên xe đang chạy (thêm điểm, báo huỷ điểm, cập nhật điểm theo đơn) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052.
```

Mới:

```
- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29: Q-L1-1 **"Sửa được giờ thật"**, Q-L1-2 **"Giữ chuyến tới khi cập nhật"**, Q-L1-3 **"Kiểm định + Bảo hiểm"** (cả ba là phương án (a) khuyến nghị); câu duyệt "Duyệt ghi lượt 1 này thành quyết định chính thức ADR-0050 theo 3 câu trả lời trên? (Tôi chỉ ghi sau khi người kiểm độc lập xem bản cuối và báo đạt.)" → **"Duyệt, ghi theo 3 câu"** (nguyên văn: [HĐ] "Trả lời lần 10"). Điều kiện đã nêu với chủ: người kiểm độc lập xem bản cuối → **ĐẠT** (bản đề xuất đỉnh `73d3c2d`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): VK1-B — đường sửa trên xe đang chạy (thêm điểm, báo huỷ điểm, cập nhật điểm theo đơn) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052. **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): `:219-221`, `:361` — huỷ đơn, bớt / thêm khách, đổi người, bỏ chặng: máy đồng bộ chuyến trong cùng lô lệnh sửa đơn của người, không chạy nền; đổi nơi vẫn giữ chuyến + nút (VK1-B); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104.
```

## ADR-0052 — bởi ADR-0104

Tệp `docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 hai hộp hỏi: "Bạn có duyệt A-1 — ADR-0052 phần đầu (nhờ xe khác đón, ba việc văn phòng được làm khi xe chạy, tin báo) không?" → **"Duyệt A-1"**; và "Bạn có duyệt A-1b — ADR-0052 phần sau (cứu hộ chuyển khách, xe cứu hộ nhà xe phải có giá, tài xế ghi tên khách chưa có tên) không?" → **"Duyệt A-1b"**. Toàn bộ ADR (D4, D5 gồm D5b, D5c, D6) accepted. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17 (hệ quả ADR-0057 lần 18–19); người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt A; kiểm nhanh cuối @ `3bc38d7`, sửa chữ theo đó ở `eebcf15`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0053** (duyệt 2026-09-30): D4.3 `trip.transfer` và D5b `trip.passenger.add` của cột `DRIVER_PARTNER` đổi `none` → `assigned` (tài xế đối tác dùng app cho chuyến; ô `trip.passenger.add` của họ chỉ mở vì A-1b đã duyệt) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0053. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)* **Bổ sung bởi [ADR-0097](ADR-0097-su-kien-dieu-chinh-co-ly-do.md)** (accepted 2026-10-03): D6.1 / `:210` danh sách tin chuyến đóng + `trip_allocation_corrected`, `trip_departure_revoked` (người nhận: tài xế đang lái + người có `trip.dispatch`).
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 hai hộp hỏi: "Bạn có duyệt A-1 — ADR-0052 phần đầu (nhờ xe khác đón, ba việc văn phòng được làm khi xe chạy, tin báo) không?" → **"Duyệt A-1"**; và "Bạn có duyệt A-1b — ADR-0052 phần sau (cứu hộ chuyển khách, xe cứu hộ nhà xe phải có giá, tài xế ghi tên khách chưa có tên) không?" → **"Duyệt A-1b"**. Toàn bộ ADR (D4, D5 gồm D5b, D5c, D6) accepted. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17 (hệ quả ADR-0057 lần 18–19); người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt A; kiểm nhanh cuối @ `3bc38d7`, sửa chữ theo đó ở `eebcf15`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0053** (duyệt 2026-09-30): D4.3 `trip.transfer` và D5b `trip.passenger.add` của cột `DRIVER_PARTNER` đổi `none` → `assigned` (tài xế đối tác dùng app cho chuyến; ô `trip.passenger.add` của họ chỉ mở vì A-1b đã duyệt) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0053. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)* **Bổ sung bởi [ADR-0097](ADR-0097-su-kien-dieu-chinh-co-ly-do.md)** (accepted 2026-10-03): D6.1 / `:210` danh sách tin chuyến đóng + `trip_allocation_corrected`, `trip_departure_revoked` (người nhận: tài xế đang lái + người có `trip.dispatch`). **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): thêm khách vào xe đang chạy / chặng khác trong mốc: điều chỉnh khẩn cấp của Bán hàng, Quản trị, Toàn quyền (`:29`, `:98`, `:192`, bài 7 `:246`); danh sách hành động sinh tin D6.1 (`:148`) thêm đồng bộ chuyến theo đơn và xếp / rút / dời khách lớp khẩn cấp; đề nghị chuyển khách leo thang (`:77`, `:80-85`) vẫn `trip.override`; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104.
```

## ADR-0056 — bởi ADR-0104

Tệp `docs/adr/ADR-0056-van-chuyen-kernel-luot-3.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30, hộp hỏi "Bạn có duyệt B3 — ADR-0056 (xe riêng / số chỗ tối thiểu, mỗi loại giấy tờ xe một bản) không?" → **"Duyệt ADR-0056"**. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17; người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt B; kiểm nhanh cuối @ `0cae449`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)*
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30, hộp hỏi "Bạn có duyệt B3 — ADR-0056 (xe riêng / số chỗ tối thiểu, mỗi loại giấy tờ xe một bản) không?" → **"Duyệt ADR-0056"**. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17; người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt B; kiểm nhanh cuối @ `0cae449`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)* **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): phá lệ cam kết xe riêng / số chỗ tối thiểu: chuyến dưới mốc Bán hàng, Quản trị, Toàn quyền (`trip.urgent_adjust`), ngoài mốc Quản trị, Toàn quyền (`trip.override`); xếp lại trong 6 giờ cần điều chỉnh khẩn cấp — sửa `:53`, `:62-63`, `:68`, bài kiểm `:119`, `:134`; câu `:99` (vốn thay ADR-0049 `:200`) đọc theo dòng ADR-0049 `:200` của bảng; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104.
```

## ADR-0061 — bởi ADR-0063

Tệp `docs/adr/ADR-0061-mo-lai-dich-vu-nhap-tay-noi-bo.md`. Cũ (dòng Trạng thái hiện tại, nguyên văn):

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi gom; điều phối chuyển lại nguyên văn): *"Duyệt cả ba, kèm 14 điểm chi tiết"* (ADR-0059, ADR-0060, ADR-0061 cùng điểm A-1…A-14 của hồ sơ trình); Q-1 *"Giữ quyền sẵn, chờ việc C2"*; Q-2 *"Không"*. Nguyên tắc chủ đã chốt trước đó (góp ý người dùng, T1 lượt 2): *"Hiện lại 'Dịch vụ nhập tay' cho nội bộ công ty (đối tác không dùng được); công tắc bật/tắt ở màn của Toàn quyền"*; lượt 3: *"Bán hàng, Kế toán, Quản trị, Toàn quyền. Không: HDV, Thực tập sinh, Đối tác, Tài xế"*. Hồ sơ trình + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D3). Người kiểm độc lập chỉ-đọc hai vòng: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo cả hai vòng (bản sửa vòng 2 chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi gom; điều phối chuyển lại nguyên văn): *"Duyệt cả ba, kèm 14 điểm chi tiết"* (ADR-0059, ADR-0060, ADR-0061 cùng điểm A-1…A-14 của hồ sơ trình); Q-1 *"Giữ quyền sẵn, chờ việc C2"*; Q-2 *"Không"*. Nguyên tắc chủ đã chốt trước đó (góp ý người dùng, T1 lượt 2): *"Hiện lại 'Dịch vụ nhập tay' cho nội bộ công ty (đối tác không dùng được); công tắc bật/tắt ở màn của Toàn quyền"*; lượt 3: *"Bán hàng, Kế toán, Quản trị, Toàn quyền. Không: HDV, Thực tập sinh, Đối tác, Tài xế"*. Hồ sơ trình + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D3). Người kiểm độc lập chỉ-đọc hai vòng: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo cả hai vòng (bản sửa vòng 2 chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung/sửa bởi [ADR-0063](ADR-0063-sua-don-sau-xac-nhan.md)** (accepted một phần 2026-10-08, D1): điều 5 (`:38`) không áp cho route văn phòng sửa số khách (D1): route chỉ ghi điều chỉnh số khách của dịch vụ đã có; ô `order.service.manual` của Kế toán vẫn chưa có tác dụng; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0063.
```
