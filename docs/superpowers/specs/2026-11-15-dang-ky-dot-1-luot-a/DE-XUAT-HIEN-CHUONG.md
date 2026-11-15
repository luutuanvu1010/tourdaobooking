# Đề xuất thêm một điều vào Hiến chương — «Cửa vào của người ngoài» (15/11/2026)

> **Đề xuất, chờ chủ duyệt** cùng lượt với ADR-0206, ADR-0207, ADR-0208. Hồ sơ có ngày: duyệt xong thì đóng băng.
> Hiến chương Phần I chỉ chủ dự án sửa (điều 6.4; Hiến pháp N9). Tệp này **không** sửa `docs/ARCHITECTURE.md`; nó chỉ nêu chữ đề xuất. Khi chủ duyệt, phiên thi công chép nguyên văn vào Phần I và ghi ngày, lý do ở dòng «Trạng thái» đầu tệp đó.
> Số điều `5.29` là số giữ chỗ: lấy số trống kế tiếp lúc chép, sau khi xem mọi nhánh.

## Vì sao cần một điều, không chỉ ba ADR

Ba ADR của lượt này cùng đứng trên hai luật. Nếu hai luật chỉ nằm trong ADR của tính năng đăng ký, thì cửa công khai kế tiếp (ví dụ khách lẻ đặt chỗ, người giới thiệu tự đăng ký) sẽ phải tự tìm lại chúng. Chủ đã dặn: lỗi lặp cùng loại thì thành luật chung kèm rào máy, rồi mới suy ra việc.

## Chữ đề xuất (thêm vào Điều 5, sau 5.28)

**5.29 Cửa vào của người ngoài: phiếu trước, hồ sơ và tài khoản sau.** Người chưa được một người có trách nhiệm của công ty tạo hoặc duyệt thì **không có phiên của Nền tảng**. Họ chỉ có một phiên riêng cho việc đăng ký, ký bằng khoá khác, mở được **đúng phiếu của chính mình** qua một tập đường lệnh đóng; mọi cổng dành cho tài khoản không bao giờ nhận phiên đó. Mọi điều họ khai là **đề xuất nằm trong phiếu** (5.23 áp cho cả một bộ hồ sơ kèm tài khoản): không sinh hồ sơ, không sinh tài khoản, không lên Danh bạ, nhãn hay chứng từ, cho tới khi **lệnh duyệt** chạy trong một lô. Trước lệnh duyệt, một người **xem được Danh bạ** phải kết luận «gắn vào hồ sơ có sẵn» hay «hồ sơ mới» (2.1). **Người xác minh và người duyệt là hai người khác nhau**; Toàn quyền là chốt cuối và khi làm cả hai thì có ghi dấu (5.8, 5.28). Dữ liệu cá nhân của phiếu **không được duyệt** chỉ giữ theo hạn ghi trong chính sách, rồi do tác nhân tự động có định danh riêng (5.11) xoá tệp và ẩn danh nội dung (5.24). Đây là **ngoại lệ có tên** của câu «máy không tự ghi» ở 5.25, và chỉ áp cho dữ liệu chưa bao giờ thành hồ sơ. Cửa công khai nào thêm sau cũng theo điều này. Nguồn: ADR-0206, ADR-0207, ADR-0208.

## Dòng đề xuất cho bảng thi hành

| Điều | Cưỡng chế bằng | Lệch hiện có (nợ có tên) | Nguồn |
|---|---|---|---|
| 5.29 Cửa vào của người ngoài | (sau thi công đợt 1) bài «cookie đăng ký không qua được hàm kiểm phiên, và ngược lại»; ảnh chụp cổng `src/route-access.test.ts` với danh sách đóng các route nhận phiên đăng ký; bài «gửi phiếu không sinh dòng hồ sơ, tệp hồ sơ, tài khoản»; điều kiện «người duyệt khác người xác minh» nằm trong câu ghi của lệnh duyệt; `src/tac-nhan-tu-dong.test.ts` cho tác nhân dọn phiếu; bất biến mới ở `scripts/audit-checks.mjs`. Mỗi rào có dòng ở `docs/SO-HANG-RAO.md` sau khi thấy chặn thật | Hai người thông đồng không bị bắt (lớp bù: nhật ký). Số điện thoại chỉ được xác nhận bằng cuộc gọi do người xác minh tự khai. Cho tới khi thi công xong, điều này **dựa vào kỷ luật** | ADR-0206, 0207, 0208 |

## Điều này không đổi gì

- Không đổi 5.23 cho người đã có tài khoản: phiếu tự khai của họ vẫn theo ADR-0124, ADR-0125.
- Không đổi 5.25 cho ảnh của hồ sơ: vẫn «người có quyền bấm xoá».
- Không mở cửa công khai nào ngoài cửa đăng ký của ADR-0206.
