# Phiếu trả lời đề xuất cho chủ dự án — bản 6 (2026-10-02)

> **Từ bản 6 không còn câu hỏi.** Lời chủ 2026-10-02: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*.
> - Câu nào có khuyến nghị rõ thì AI **tự áp** và ghi lại ở đây.
> - Chủ bác điểm nào thì nói tên điểm đó; AI sửa trước khi thi công.
> - ADR chỉ có hiệu lực khi chủ nói "Duyệt" (Hiến pháp N3).

## Đã xong theo lời chủ
- **ADR-0089 (accepted):** đơn huỷ và cọc.
  - Cọc là tiền trả trước; khách huỷ thì mặc định không hoàn.
  - Quản trị duyệt hoàn, Kế toán chi; không ai vừa duyệt vừa chi.
  - Hạn 60 ngày chỉ chặn duyệt mới, và chỉ cho đơn khách huỷ.
  - Công ty huỷ thì hoàn toàn bộ hoặc dời lịch, không thu thêm, và chỉ nhắc.
  - Đại lý cầm cọc thì trừ vào đối soát.
  - Nhãn tiền: chưa giao là "Khách hàng đã trả trước"; đã giao là "Đã thu"; khách huỷ là "Cọc giữ lại".
  - Điều khoản huỷ ngắn in trên ảnh xác nhận, in luôn đường dẫn chính sách.
  - Lời chủ lần 5:
    - chuyển tiền sang đơn mới cần Quản trị duyệt;
    - chỉ Quản trị, Toàn quyền chọn "công ty huỷ";
    - huỷ để lập lại không bị hạn chặn;
    - đơn cũ đã hoàn tay thì Toàn quyền ghi bổ sung "đã hoàn ngoài hệ thống".
- **ADR-0090 (accepted):** chỉ Toàn quyền đặt lại PIN, gán quyền và tạo tài khoản Kế toán.
- **Luật mới trong CLAUDE.md:** gọi hệ thống là **"Nền tảng"**, không gọi "App".
- **Bảng 11 trường hợp trách nhiệm** (ADR-0088): đã có lời chủ.
- **Cảnh báo lần thu tiền mặt giống nhau** (CT3, CT4): chỉ cảnh báo, người đang ghi bỏ qua được với lý do bắt buộc (ADR-0092 đ6a).
- **Lớp chống ghi trùng chung** (ADR-0094), ba câu V1–V3:
  - giữ vé 365 ngày, Toàn quyền chọn được;
  - gửi lại thì báo "đã ghi" và mở trang kết quả;
  - bắt buộc từ từ.

## Đã áp theo khuyến nghị (chủ bác điểm nào thì nói tên điểm đó)
**ADR-0094 — lớp chống ghi trùng chung** (đã qua người kiểm độc lập hai vòng):
- A-1: đếm số lần gửi lặp của mỗi vé.
- A-2: màn "Thời hạn giữ vé" dùng chung ô cài đặt vận hành của Toàn quyền.
- A-3: sàn 90 ngày; lựa chọn 90 / 180 / 365 (mặc định) / 730 ngày / Không dọn.
- A-4: rút ngắn thời hạn thì chờ 7 ngày mới xoá.
- A-5: dọn mỗi đêm một lần, tối đa 250.000 vé mỗi đêm.
- A-6: bản siết bật sau 7 ngày liên tiếp không còn máy cũ.
- A-7: tên kỹ thuật; nhật ký dọn vé thuộc nhóm im lặng.
- A-8: thêm khái niệm lõi "mỗi lệnh ghi chạy đúng một lần" vào Hiến chương (chỉ chủ sửa Phần I).
- A-9: đóng lỗi gửi lặp (F-02) khi bản đầu lên production và 6 kịch bản chạy lại đạt.
- A-10: mọi lệnh tạo mới cho biết địa chỉ trang kết quả.
- A-11: màn chỉnh thời hạn và việc dọn vé ra ở bản sau, trước ngày thứ 90.

**ADR-0089 — ba chi tiết khi ghi lời chủ lần 5** (X-4 ở mục cuối, chờ chủ):
- X-3: chỉ áp cho đơn huỷ trước ngày phát hành; số ≤ tiền còn giữ; có lý do.
- X-2: đơn có lý do huỷ "chưa kết luận" thì chưa duyệt hoàn được tới khi Quản trị phân loại.
- X-1: duyệt chuyển tiền dùng cùng ô quyền với duyệt hoàn cọc.

**ADR-0092 (lượt 2b):**
- Q-A1: trần phiếu điều chỉnh; người bị đổi số nhận tin báo.
- Q-A2: ô mã giao dịch ngân hàng; chặn trùng trong cùng đơn, cảnh báo khi trùng ở đơn khác.

**ADR-0093, ADR-0091 (lượt 3):**
- Q-B1: PIN tạm hết hạn sau 24 giờ khi đặt lại, 7 ngày khi tạo mới.
- Q-B6: tài khoản nội bộ cũ phải đổi PIN một lần; đối tác không bắt.
- Q-B3: Bán hàng phá lệ mốc 6 giờ được mọi giờ.
- Q-B4: chỉ báo vào hộp thông báo, không đẩy ra điện thoại.
- Q-B5: Đối tác, HDV, Thực tập, Kế toán không được phá lệ.
- Q-B7: mở đúng các lệnh ở đ3.
- Q-B8: Đối tác thấy loại dấu.
- Q-B9: Toàn quyền nhận tin ở ngăn "Tất cả".

## Lời chủ 2/10 sau bản 6
- **X-4:** *"1- có"* → Quản trị xác nhận dòng "đã hoàn ngoài hệ thống" (ADR-0089).
- **ADR-0094:** *"2- Duyệt"* → accepted.

## Chờ chủ nói "Duyệt" (không phải câu hỏi)
1. **ADR-0088 + ADR-0092** (lượt 2).
2. **ADR-0093 + ADR-0091** (lượt 3).

## Việc của chủ khi triển khai lớp chống ghi trùng
- Đặt khoá bí mật trước lần triển khai. Thiếu khoá thì mọi màn báo lỗi.
- Gửi lặp lệnh tạo tài khoản hay đặt lại PIN sẽ **không hiện lại PIN**; khi đó bấm đặt lại PIN lần nữa. Nhân sự không tự đặt lại được, phải nhờ Quản trị; tài khoản Kế toán thì nhờ Toàn quyền.

## Việc ngoài Nền tảng
- Trang `tourdao.vn/chinh-sach-thanh-toan` đang là bản nháp. Chủ đã biết và chấp nhận in luôn đường dẫn.
