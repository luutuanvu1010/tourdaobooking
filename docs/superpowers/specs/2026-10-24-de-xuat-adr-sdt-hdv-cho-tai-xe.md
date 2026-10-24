# Đề xuất ADR (số tạm 0139) — Tài xế công ty thấy SĐT hướng dẫn viên phụ trách và tên dịch vụ của chuyến mình chạy

> **Bản nháp chờ chủ duyệt**, không phải ADR; chưa chuyển vào `docs/adr/`. Số tạm 0139 (0138 giữ cho nháp «gắn mức TA riêng»; 0137 là số lớn nhất ở mọi nhánh, kiểm 24/10).
> Nguồn: góp ý YC-0015 (20/10): «Chi tiết chuyến xe: chi tiết sản phẩm, SĐT khách hàng, SĐT HDV phụ trách». Kế hoạch `2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md` mục 8 (Q3), 9, 10.
> Việc lớn (quyền + dữ liệu cá nhân): ADR chủ duyệt + trang ghép (`2026-10-24-trang-ghep-luot-duyet-1.md`) + người kiểm độc lập. **Sửa/bổ sung:** ADR-0049 D3 (thứ tài xế công ty thấy) và ADR-0053 D7 (danh sách «không bao giờ»); không sửa thân ADR cũ. **Xây trên lỗ đang hở:** chưa rà `docs/quyen-hoan.json` cho lượt này — người lập kế hoạch thi công rà và ghi.

## 1. Hiện trạng (đọc mã 24/10)

- DTO tài xế (`src/modules/van-chuyen/tai-xe-dto.ts`) đã có: **tên + SĐT người liên hệ của đơn** (khách hoặc nhân viên đại lý) chỉ trong ngày chạy (`lienHe`, lấy qua `lienHeChoTaiXe` của `orders`), SĐT văn phòng (`sdtVanPhong`), mã đơn (tài xế công ty mọi lúc; tài xế đối tác chỉ trong khung xem khách).
- **Chưa có:** SĐT hướng dẫn viên phụ trách đơn; tên dịch vụ của đơn.
- ADR-0053 D7 ghi rõ tài xế **đối tác** «không bao giờ» thấy: dịch vụ khác của đơn, ghi chú đơn, người lập, **người phụ trách**, tên bên đặt. Tức là phần góp ý xin, với tài xế đối tác, đụng thẳng một cửa một chiều đã duyệt.
- «SĐT khách» người gửi xin **đã có** (là SĐT người liên hệ) — chỉ cần trả lời người gửi.

## 2. Quyết định đề xuất

**D1 — Ai thấy.** Phương án A (khuyến nghị): chỉ **tài xế công ty** (quyền `DRIVER`) thấy thêm. Tài xế **đối tác** (`DRIVER_PARTNER`) giữ nguyên ADR-0053 D7 (người ngoài; số điện thoại nhân viên đã lộ thì không lấy lại được). Phương án B: cả tài xế đối tác, trong cùng khung xem khách — phải sửa D7 và chủ chấp nhận cửa một chiều thêm một lần.

**D2 — Thấy gì, khi nào.** Trên chuyến **mình đang có dòng lái mở**, **chỉ trong ngày chạy** (cùng hàm khung xem khách đã có, `trongKhungXemKhach`/`trongNgayChay`):
- **Tên + SĐT hướng dẫn viên đang phụ trách** từng đơn có khách trên chuyến (người phụ trách *hiện hành*; đơn chưa ai nhận thì không có dòng). Chỉ hướng dẫn viên **nội bộ** (tài khoản nhân viên); người phụ trách là tài khoản bên ngoài thì không hiện số (không lộ số người ngoài cho người khác).
- **Tên dịch vụ** của chính dịch vụ có chặng nằm trên chuyến (không phải mọi dịch vụ của đơn), không kèm giá.
- Không bao giờ: tiền, ghi chú đơn, người lập, bên đặt/đại lý.

**D3 — Đường dữ liệu.** `van-chuyen` không import `dispatch`/`orders` ngoài `index.ts`; đọc người phụ trách qua **hàm hẹp do gốc lắp ráp tiêm** hoặc **view công bố mới** `v_dsp_*` (chỉ khoá + nhãn, không SĐT; SĐT lấy qua đường liên hệ hẹp như `lienHeChoTaiXe`, gọi **trong thân route sau `can(`** — luật `src/CLAUDE.md`, bài `src/orders-cong-bo.test.ts`). Nhật ký không ghi SĐT. Chọn cách cụ thể ở kế hoạch thi công (chưa kiểm view nào có sẵn).

## 3. Tiêu chí nghiệm thu (viết trước)

1. Tài xế công ty, chuyến mình lái, **trong ngày chạy**: thấy tên + SĐT HDV phụ trách và tên dịch vụ của chặng; **ngày mai**: không thấy SĐT HDV (thấy như hôm nay).
2. Tài xế công ty không lái chuyến đó: 404 như hiện nay.
3. Tài xế đối tác (phương án A): phản hồi **không có** khoá SĐT HDV hay tên dịch vụ ở bất kỳ thời điểm nào — thêm ca vào bài `tai-xe-dto.test.ts` và bài «số lạ» kiểu toàn Nền tảng.
4. Đơn đổi người phụ trách giữa ngày: tài xế thấy người mới ở lần tải sau.
5. Người phụ trách là tài khoản bên ngoài: không hiện số.
6. Nhật ký `trip_*` vẫn `order_id` NULL, không ghi SĐT.

## 4. Điều phải nói thẳng

- Phương án B chạm cửa một chiều thứ hai cho người ngoài; khuyến nghị A vì nhu cầu trong góp ý đến từ vận hành nội bộ.
- Thêm một số điện thoại nhân viên vào máy tài xế: tài xế công ty là nhân viên, rủi ro thấp; vẫn giới hạn trong ngày chạy để số không nằm sẵn trên máy nhiều ngày.

## 5. Câu cho chủ

Chọn **A** (chỉ tài xế công ty) hay **B** (cả tài xế đối tác)?
