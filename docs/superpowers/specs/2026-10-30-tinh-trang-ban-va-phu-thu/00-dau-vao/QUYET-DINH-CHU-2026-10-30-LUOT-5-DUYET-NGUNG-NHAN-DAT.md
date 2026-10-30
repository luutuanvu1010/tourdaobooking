# Quyết định của chủ — lượt 5 (30/10/2026): duyệt kế hoạch «availability» (đề xuất Lượt B), đổi tên gọi cho phổ thông

> Hồ sơ có ngày, do phiên thi công ghi lại; không sửa về sau. Có gì mới thì viết bản mới trỏ về bản này.

## Lời chủ (nguyên văn)
«ok duyệt kế hoạch của availability, nhưng lưu ý dùng từ ngữ cho phổ thông và chuẩn mực chứ "Đóng bán" thì khó hiểu»

## Phiên thi công hiểu và ghi như sau (người ghi chép, không phải lời chủ)
1. **Duyệt đề xuất Lượt B** (`../B-dong-ban/DE-XUAT-ADR.md`): tạm ngừng bán một dịch vụ hoặc một nhóm cho mọi bên đặt, theo ngày đi và theo thời điểm thao tác. Chủ không nêu ý khác ở sáu câu C1–C6 của đề xuất, nên ghi là **duyệt theo các khuyến nghị**: C1 (a) một ô lý do hiện cho cả Đối tác; C2 (a) chưa đóng theo đặc điểm; C3 (a) báo bằng tin trong hộp thông báo và nhãn trên đơn; C4 (a) đóng nhầm thì Quản trị / Toàn quyền mở lại; C5 (a) báo chặn ngay (đã thi công ở ADR-0146 theo Q-1); C6 (b) tách hai lượt duyệt, B-lõi (Đ1, Đ3, Đ5) rồi B-hiển thị (Đ4), phát hành cùng lần. Nếu chủ muốn khác ở câu nào, nói lại câu đó.
2. **Chưa có mã.** Còn việc: chép đề xuất thành ADR (số kế tiếp kiểm lúc chép; hôm nay là 0153 nếu không nhánh nào lấy trước), lập kế hoạch thi công riêng, rồi thi công ở phiên khác (Hiến pháp P15). Chỗ gắn đã chừa sẵn ở `src/modules/orders/cong-ban.ts` (kế hoạch ADR-0146 mục 7).
3. **Tên gọi.** Chữ «Đóng bán» (và «đóng bán» trong đề xuất) bị chủ chê khó hiểu. Chữ mới do chủ chọn từ các phương án phiên thi công đưa ở cuối cuộc trò chuyện 30/10; **khuyến nghị: «Ngừng nhận đặt»** cho hành động và tên màn, «Tạm ngừng nhận đặt» cho nhãn trên danh mục lập đơn, «Mở nhận đặt lại» cho nút mở lại. Tên chốt xong phải đi vào bảng từ giao diện (`src/shared/bang-tu-giao-dien.ts`) để chữ cũ «Đóng bán» không quay lại. Hồ sơ đề xuất cũ giữ nguyên chữ «Đóng bán» (hồ sơ có ngày).
