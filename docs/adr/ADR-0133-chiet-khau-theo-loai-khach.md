# ADR-0133 — Chiết khấu "mỗi khách" tách theo loại khách: người lớn, trẻ em, người cao tuổi

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-19: *"Duyệt Q1=A, Q2=A, Q3=A. Hoàn thiện ADR và lập kế hoạch thi công."* (nguyên văn). Bản nháp: `docs/superpowers/specs/2026-10-19-chiet-khau-theo-loai-khach/ADR-0133-nhap.md`. AI soạn, không tự duyệt (Hiến pháp N3). Cần người kiểm độc lập sau thi công.
- **Ngày:** 2026-10-19. **Loại:** việc lớn (tiền + dữ liệu). **Một chiều ở phần dữ liệu** (thêm cột/bảng): thi công theo expand–contract, không sửa migration đã áp.
- **Quan hệ với ADR cũ:** **bổ sung** ADR-0077 (điều H7: cách đếm "mỗi khách" nay có thêm lựa chọn tách theo loại); **không đổi** H5 (chụp lúc Xác nhận), A1 (làm tròn nửa lên), ADR-0117 (mức TA). Kiểu `RATE` và `PER_PAX` cũ giữ nguyên nghĩa.
- **Xây trên lỗ đang hở:** không có (đã đối chiếu `docs/quyen-hoan.json` ở bước thi công đầu tiên; nếu có mục chạm hoa hồng thì dừng).

## Bối cảnh
Hôm nay một dòng mức chỉ có phần trăm trên thành tiền, hoặc một số tiền cố định × số khách tính (người lớn + trẻ em + người cao tuổi, không em bé). Số tiền cố định áp như nhau cho cả ba loại. Chủ muốn chiết khấu "mỗi khách" khác nhau theo loại.

## Quyết định
1. **Thêm cách khai "mỗi khách theo loại"** (Q1 = A): một dòng mức khai ba số tiền riêng — người lớn, trẻ em, người cao tuổi. Em bé luôn 0. Kiểu phần trăm và kiểu một-số-tiền cũ không đổi, đơn cũ tính y như trước.
2. **Trẻ em và người cao tuổi BẮT BUỘC điền, không có «ô trống = 0»** *(sửa đổi 2026-10-19 — xem cuối văn bản; bản đầu của điều này là «ô bỏ trống = 0 đồng»)*. Máy chủ từ chối (400) khi thiếu hoặc để trống một trong hai ô; giao diện báo lỗi ngay dưới ô và nói «không trả thì gõ 0». Gõ 0 thì là 0 đồng. Không tự lấy theo người lớn. Em bé không có ô: luôn 0.
3. **Chụp cả ba số tiền lúc Xác nhận** (Q3 = A, theo H5). Đổi mức về sau chỉ áp đơn mới. Văn phòng sửa số khách sau xác nhận (ADR-0063) thì tính lại **theo ba số đã chụp**, không đọc mức hiện hành.
4. **Công thức:** hoa hồng dòng = (số người lớn × tiền người lớn) + (số trẻ em × tiền trẻ em) + (số người cao tuổi × tiền người cao tuổi). Dịch vụ tính theo nhóm/lượt (không tách loại khách) dùng số tiền **người lớn** cho mỗi lượt — điểm này suy từ H7 "đếm theo lượt", **chủ xem lại khi nghiệm thu sổ vàng**.
5. **Sổ vàng:** thêm ca mẫu cho luật này, đáp án đúng đến đồng, Kế toán xác nhận trước khi phát hành (Hiến chương 5.17).

## Sửa đổi 2026-10-19 — điều 2 (chủ dự án, trong chat)
Khi duyệt sổ vàng ca 3, chủ dự án nói: *"em bé được miễn phí khi đi cùng người lớn, trẻ em là khách hàng tính theo chiều cao (thường như vậy) hoặc theo tuổi. Trẻ em có giá riêng (khoảng 70% giá vé người lớn, tùy dịch vụ), em bé mới là miễn phí"*. Trẻ em là khách trả tiền nên đại lý có hoa hồng cho trẻ em; quy tắc «ô trống = 0» ở bản đầu (duyệt khi AI còn hiểu trẻ em là miễn phí) có thể làm đại lý mất hoa hồng lặng lẽ. Chủ chọn **«Bắt buộc điền: ô trẻ em và ô người cao tuổi không được bỏ trống, muốn 0 thì gõ 0»** (nguyên văn). Điều 2 ở trên là bản đã sửa. Không đổi điều 1, 3, 4, 5; ca sổ vàng 03 làm lại theo điều 2 mới; ca 01, 02 vẫn đúng (em bé vốn không tính). Ghi chú: giá trẻ em ≈ 70% giá người lớn là về GIÁ VÉ; số tiền hoa hồng cho trẻ em vẫn do Kế toán khai từng mức.

## Điều giữ nguyên
Tiền là số nguyên VNĐ, tính ở máy chủ (`hoaHongDong`); không tin số từ trình duyệt; mức đã chụp không đổi theo cài đặt mới.

## Hệ quả và rủi ro
- Chạm bảng mức và bảng chụp điều khoản (`prc_commission_rule`, `ord_service_terms`); cột `kind` đang có ràng buộc CHECK chỉ cho hai giá trị nên cách lưu phải chọn ở kế hoạch (xem `docs/superpowers/plans/2026-10-19-chiet-khau-theo-loai-khach.md`).
- Đơn đã chụp trước ngày phát hành: không đổi, không chuyển đổi dữ liệu.
- Thêm một kiểu tính mới là thêm một chỗ có thể sai tiền: bắt buộc bài kiểm đỏ-trước-xanh-sau và người kiểm độc lập.
