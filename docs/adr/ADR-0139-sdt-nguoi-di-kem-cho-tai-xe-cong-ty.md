# ADR-0139 — Tài xế công ty thấy SĐT người đi kèm chuyến và tên dịch vụ của chặng mình chạy

- **Trạng thái:** **accepted** 2026-10-24 — chủ dự án trong chat, nguyên văn: «Duyệt nháp 0139 theo khuyến nghị: SĐT người đi kèm chuyến, chỉ tài xế công ty.»
- **Ngày:** 2026-10-24.
- **Loại:** việc lớn (quyền + dữ liệu cá nhân). **Cửa:** một chiều về thông tin (số đã lộ cho tài xế không lấy lại được); mã đảo được.
- **Nguồn:** góp ý YC-0015 (20/10). Nháp: `docs/superpowers/specs/2026-10-24-de-xuat-adr-sdt-hdv-cho-tai-xe.md` (bản 2); trang ghép: `docs/superpowers/specs/2026-10-24-trang-ghep-luot-duyet-1.md` lượt 1.
- **Sửa/bổ sung:** ADR-0049 D3 (thứ tài xế công ty thấy). **Không** đổi ADR-0053 D7 (tài xế đối tác).
- **Xây trên lỗ đang hở:** không (rà `docs/quyen-hoan.json` 24/10 — sáu mục HIGH đang mở, không mục nào thuộc DTO tài xế hay liên hệ nhân viên).

## Bối cảnh
DTO tài xế đã có tên + SĐT người liên hệ của đơn (trong ngày chạy), SĐT văn phòng, tên người đi kèm chuyến (suất `CREW`, mọi lúc, chỉ tên). Tài xế xin thêm SĐT HDV và chi tiết sản phẩm. «HDV phụ trách đơn» (dòng `HANDLE` của `dispatch`) khác «người đi kèm chuyến» (suất `CREW` của `van-chuyen`); chỉ người đi kèm là người thật sự có mặt cùng xe, và đọc được mà không nới ranh giới module.

## Quyết định
1. **D1 — Số của người đi kèm chuyến** (suất `CREW` đang mở trên chuyến). SĐT là **số liên hệ chính trên hồ sơ** của người đó trong Danh bạ (không phải SĐT đăng nhập — số đăng nhập không được chép sang hồ sơ, R-N1-13), đọc qua một hàm công bố hẹp mới của `parties` (cạnh `van-chuyen → parties` đã có), đọc trong thân route sau khi đã xác định người gọi đang lái chuyến. Không nới cạnh kiến trúc, không đọc người phụ trách đơn.
2. **D2 — Chỉ tài xế công ty, chỉ trong ngày chạy.** Người gọi không có vế hạn Từ chối (`khung.han === undefined` — dấu hiện có của hàm khung) và `trongNgayChay`. Tài xế đối tác (`DRIVER_PARTNER`) không bao giờ nhận hai khoá mới, ở bất kỳ thời điểm nào. Văn phòng xem chuyến qua route của mình, không đổi.
3. **D3 — Thấy gì.** Thêm hai thứ: SĐT người đi kèm (cạnh tên đã có), và tên dịch vụ của chính dịch vụ có chặng trên suất khách đó (không giá, không dịch vụ khác của đơn). Không bao giờ: tiền, ghi chú đơn, người lập, người phụ trách đơn, bên đặt / đại lý. Nhật ký không ghi SĐT; nhật ký `trip_*` vẫn `order_id` NULL. Người đi kèm không có SĐT ⇒ không có khoá, không lỗi.

## Hệ quả
- Phản hồi lệnh tiến độ của tài xế không kèm hai khoá mới (giống `lienHe` — chỉ GET chi tiết).
- Bài «tài xế đối tác không bao giờ có khoá mới» và bài «số lạ» kiểu toàn Nền tảng phải có ca cho hai khoá này.
- Màn chi tiết cuốc của tài xế công ty hiện thêm SĐT (bấm gọi được) và tên dịch vụ — chỗ ẩn/hiện mới theo dữ liệu máy chủ gửi, không theo quyền ở giao diện.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)
1. Tài xế công ty, chuyến mình lái, trong ngày chạy: thấy tên dịch vụ của suất khách và SĐT người đi kèm.
2. Ngoài ngày chạy: không có hai khoá đó.
3. Tài xế công ty không lái chuyến: 404 như cũ.
4. Tài xế đối tác: không có hai khoá ở mọi thời điểm.
5. Người đi kèm không có SĐT: không khoá, không lỗi.
6. Nhật ký không chứa SĐT.

## Phương án bị loại
- SĐT người phụ trách đơn: phải nới cạnh `van-chuyen → dispatch` hoặc tiêm hàm, và số có thể là của Bán hàng/Quản trị (không đi xe).
- Cả tài xế đối tác: sửa ADR-0053 D7, lộ số nhân viên cho người ngoài.
