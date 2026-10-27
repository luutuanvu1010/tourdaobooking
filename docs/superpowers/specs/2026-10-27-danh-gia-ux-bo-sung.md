# Bổ sung cho đánh giá UX tổng thể Chặng 1 (27/10/2026)

Hồ sơ có ngày. Trỏ về bộ hồ sơ chính `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/` (nhánh `worktree-danh-gia-ux-tong-the-v2`). Không thay bộ đó.

## Vì sao có tờ này

Ngày 27/10/2026 có hai phiên chạy song song cùng một đề bài. Phiên này đã đo 454 ô (10 bộ quyền × mọi trang có lối vào × 390/1040, thêm 768/1440 cho danh sách và bảng điều khiển) và chạy 10 hành trình ở hai khổ màn hình. Sau đó phiên này phát hiện phiên kia đã làm xong Chặng 1, rộng hơn: 1.422 ô, ba trạng thái dữ liệu, đo tốc độ, 63 phát hiện. Phiên này dừng để không làm hai bộ hồ sơ trùng tên. Đối chiếu từng điểm thì gần như mọi phát hiện của phiên này đã có trong phụ lục bản kia, kể cả khoá phóng to, mã thô ở danh mục, cách ghi tiền "1,08tr", bộ hệ thống thiết kế lệch bên Claude Design, ba nút "Tạo đơn", màn 403/404, thanh bên bị cắt.

Dưới đây chỉ là những điểm **chưa thấy** trong `PHU-LUC-PHAT-HIEN.md` của bản kia (đã dò theo từ khoá; người gộp nên đọc lại trước khi thêm).

| Mã đề xuất | Phạm vi | Trang · bộ · khổ | Phát hiện | Mặt / tiêu chí | Mức |
|---|---|---|---|---|---|
| B-BO-QUA-DIEU-HUONG | Hệ thống | mọi trang · mọi bộ có thanh bên · 1040 | Không có lối "Bỏ qua tới nội dung chính". Bấm Tab 12 lần từ đầu trang chỉ đi qua logo, nút Tạo đơn và các mục thanh bên; Toàn quyền có hơn 20 mục nên phải bấm Tab quá 20 lần mới vào nội dung. Viền tiêu điểm thì thấy rõ (2–3 px), điểm này bản kia đã ghi đúng. | 8, 9 / 4 | Vừa |
| B-THIET-LAP-CHE | Hệ thống | thanh bên · Kế toán, Quản trị, Toàn quyền · 1040×800 | Mở nhóm "Thiết lập" ở thanh bên thì các mục con bị khối chân thanh bên (Của tôi, Hỗ trợ, Hướng dẫn, tên người) che. Ở Kế toán chỉ còn thấy mục đầu "Hoa hồng đối tác"; phải cuộn trong thanh bên mới thấy phần còn lại, mà không có dấu hiệu nào cho biết cuộn được. Bản kia ghi C-SIDEBAR-CAT (một mục bị cắt nửa chữ khi nhóm đóng); đây là trường hợp nhóm mở. | 1, 8 / 2, 4 | Vừa |
| B-NHAN-IN-HOA | Hệ thống | Điều phối, Hoa hồng, thanh bên · cả hai | Nhãn cùng vai trò lúc in hoa (ô số liệu Điều phối "ĐÃ XẾP", "CHƯA XẾP"; tiêu đề nhóm "THEO LOẠI ĐỐI TÁC"; nhóm thanh bên "VẬN CHUYỂN"), lúc viết thường (ô số liệu Sổ công nợ "Các bên đang giữ"). Nên gom vào một luật trong thang chữ của đề cương hợp nhất. | 7, 10 / 2, 3 | Nhẹ |
| B-TEN-NUT-XAC-NHAN | Cục bộ | Tạo đơn → Chi tiết đơn · Bán hàng · cả hai | Một việc mang ba tên: nút "Lưu, chờ xác nhận" → hộp tự mở "Xác nhận đơn để gửi khách" → ảnh gửi khách ghi huy hiệu "Chờ xác nhận" và câu "đang chờ hướng dẫn viên nhận khách". Người mới khó biết đơn đã xác nhận hay chưa. | 5, 10 / 4 | Vừa |
| B-TONG-HOA-HONG-DOI-TAC | — (câu hỏi cho chủ) | Đối tác · cả hai | Đối tác xem được hoa hồng **từng đơn** (khối "Hoa hồng của bạn" trong trang đơn), nhưng không có chỗ xem **tổng** theo tháng. Thanh điều hướng của Đối tác chỉ có Đơn hàng và Tôi. Thêm chỗ xem tổng là thêm tính năng chạm tiền và quyền (`partner.commission.view` hôm nay không mở cho Đối tác), nên chỉ ghi để chủ quyết, không đưa vào thiết kế. | 1 / 4 | — |

## Bằng chứng

Ảnh, số đo và kịch bản của phiên này **không đưa vào kho**, vì trùng tên tệp với bộ bằng chứng của bản kia. Chúng nằm ngoài kho ở `~/tourdao-ux-2026-10-27/` (`anh-day-du/nhieu/<bộ>/`, `ban-sao-phien-song-song/evidence/` gồm kịch bản, `so-lieu/nhieu-*.json`, `so-lieu/tong-hop-nhieu.json`, `hanh-trinh/`). Ảnh cho từng dòng trên (`anh-day-du/…` tính từ `~/tourdao-ux-2026-10-27/`; `so-lieu/…`, `hanh-trinh/…` tính từ `~/tourdao-ux-2026-10-27/ban-sao-phien-song-song/evidence/`):

- B-BO-QUA-DIEU-HUONG: `so-lieu/nhieu-SUPER_ADMIN.json`, trường `focus` của mọi ô khổ 1040.
- B-THIET-LAP-CHE: `anh-day-du/nhieu/ACCOUNTING/hoa-hong-1040-man-dau.jpg`.
- B-NHAN-IN-HOA: `anh-day-du/nhieu/ADMIN/dieu-phoi-1040-man-dau.jpg`, `…/ACCOUNTING/so-cong-no-1040-man-dau.jpg`.
- B-TEN-NUT-XAC-NHAN: `hanh-trinh/SALES-390/07.jpg`, `08.jpg`.
- B-TONG-HOA-HONG-DOI-TAC: `anh-day-du/nhieu/PARTNER/account-1040.jpg`; mã `web/phan-doi-tac.ts` (khối `doiTac`), `src/shared/permissions.ts` dòng `partner.commission.view`.

Thư mục ngoài kho xoá được bất cứ lúc nào; khi đó tờ này vẫn đúng nhưng mất ảnh kèm.
