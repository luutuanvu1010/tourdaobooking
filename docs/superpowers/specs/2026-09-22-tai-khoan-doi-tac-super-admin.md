# Tài khoản đối tác, phạm vi "của mình", Super Admin — đặc tả ngắn

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt** cùng `ADR-0014` (bắt buộc duyệt ADR trước, đặc tả này không tự đứng). Chưa có mã, chưa qua kiểm độc lập.
> Nguồn: `docs/AUDIT-2026-09-22-DOI-TAC.md` (D-01, D-02, D-03), trả lời chủ dự án §4.1–§4.3 của tài liệu đó; quyết định kiến trúc: `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md`.
> Đặc tả này **mô tả hành vi**, không phải kế hoạch thi công (số migration, tên hàm cụ thể lấy lúc lập kế hoạch thi công riêng, theo `CLAUDE.md` §10).
> Loại việc: **việc lớn** (quyền + dữ liệu) → bắt buộc kiểm độc lập, chỉ đọc, sau khi thi công, trước khi báo "đạt" (CLAUDE.md §3).

## 1. Hành vi mong muốn (lời thường)

- Có hai mã quyền mới cạnh bốn mã đã có (Bán hàng, Kế toán, Quản trị, Thực hiện): **Đối tác** và **Super Admin**.
- Tài khoản **Đối tác** (CTV, hướng dẫn viên/lái xe/lái cano bên ngoài, lễ tân khách sạn, công ty du lịch — mỗi người một tài khoản):
  - Tự lập đơn, giá luôn là giá bán lẻ.
  - Chỉ thấy, sửa, xác nhận, huỷ **đơn do chính mình lập** — không thấy đơn của người khác, không tra được hồ sơ khách/đại lý theo số điện thoại.
  - Không tự nhận việc (không tự đặt mình làm người phụ trách của bất kỳ đơn nào).
  - Không xác nhận/huỷ đơn của người khác, không thấy màn quản trị, không ghi thu/hoàn tiền, không xuất hoá đơn.
  - Chỉ Quản trị viên hoặc Super Admin mở, khoá, đặt lại mã cho tài khoản Đối tác — không có ai của bên đối tác tự quản người của họ.
- Tài khoản **Super Admin**: làm được mọi việc Quản trị viên làm được, cộng thêm việc chỉ Super Admin làm: cấp hoặc gỡ vai Super Admin của một tài khoản khác (Quản trị viên không tự nâng mình lên Super Admin được). Trước mắt chỉ có tài khoản của chủ dự án giữ vai này.
- Nhân viên nội bộ giữ quyền Thực hiện (hướng dẫn viên nội bộ) **nhận phụ trách được** đơn do Đối tác lập (trước đây chỉ Bán hàng/Quản trị mới nhận được). Khi đang phụ trách một đơn, họ **sửa được số khách, dịch vụ và tiền của đơn đã xác nhận** (việc trước đây hoàn toàn không ai làm được qua ứng dụng), nhưng vẫn **không tự xác nhận/huỷ đơn, không thấy tổng tiền hay bảng giá** ở bất kỳ màn nào — máy tự tính lại tiền, phần chênh do người lập đơn (Đối tác) và Kế toán/Quản trị nhìn thấy, không phải người sửa.
- Mỗi lần sửa số khách/dịch vụ/tiền sau xác nhận: **không ghi đè** số cũ, mà thêm một **dòng điều chỉnh** ghi ai sửa, khi nào, vì sao, số trước và số sau. Người lập đơn (Đối tác) và Quản trị đều xem được các dòng điều chỉnh này khi mở lại đơn.

## 2. Việc KHÔNG đổi

- Nhân viên nội bộ (Bán hàng/Kế toán/Quản trị) vẫn thấy hết mọi đơn như hôm nay — chỉ tài khoản Đối tác mới bị giới hạn "của mình".
- Cách sửa nháp, xác nhận, huỷ đơn của nhân viên nội bộ không đổi.
- Ba lớp bảo vệ dữ liệu đã có (chỉ máy chủ tính tiền, ngày giờ theo múi Việt Nam, không xoá cứng) giữ nguyên.

## 3. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

1. Tài khoản chỉ có quyền Đối tác: gọi API liệt kê đơn → chỉ thấy đơn có người lập là chính mình; gọi API xem chi tiết đơn của người khác → bị từ chối; gọi API tra hồ sơ theo số điện thoại hoặc danh bạ → bị từ chối.
2. Tài khoản Đối tác lập đơn mới → thành công, là người lập đơn. **Tiêu chí "ai là người phụ trách mặc định khi chưa ai nhận" chưa chốt được** (câu hỏi 4 ở mục 6 dưới) — viết cụ thể thành tiêu chí kiểm được ngay sau khi có câu trả lời, trước khi lập kế hoạch thi công.
3. Tài khoản Đối tác gọi API "tự nhận đơn chưa có người phụ trách" → bị từ chối.
4. Tài khoản chỉ có quyền Quản trị: gọi API cấp vai Super Admin cho một tài khoản khác → bị từ chối. Tài khoản có vai Super Admin: gọi cùng API → thành công.
5. Tài khoản chỉ có quyền Thực hiện, đang là người phụ trách một đơn đã xác nhận: sửa số khách/dịch vụ của đơn đó → thành công, có dòng điều chỉnh mới (ai, khi, vì sao, trước → sau); gọi API xem tổng tiền/bảng giá của đơn → vẫn bị từ chối như hôm nay.
6. Tài khoản chỉ có quyền Thực hiện, KHÔNG phải người phụ trách của một đơn: sửa số khách/dịch vụ của đơn đó → bị từ chối.
7. Tài khoản chỉ có quyền Thực hiện gọi API xác nhận/huỷ đơn, kể cả đơn mình đang phụ trách → vẫn bị từ chối (không đổi).
8. Tạo tài khoản mới qua API mà không kèm danh sách quyền → tài khoản không có quyền nào (không còn tự động thành Bán hàng).
9. Test khoá bản đồ quyền (mọi ô của `PERMISSION_CODES` × mọi thao tác) xanh; `npm test`, `npm run typecheck` xanh; `npm run test:e2e` phủ ít nhất một kịch bản đăng nhập bằng tài khoản Đối tác.
10. Quan sát ít nhất một hàng rào chặn thật một lần trước khi coi là hoạt động (P16): ví dụ tạm bỏ điều kiện lọc "của mình" ở API liệt kê đơn → test đỏ → hoàn nguyên.

## 4. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. "Của mình" cho Đối tác nghĩa là **người lập đơn**, không phải "mọi đơn của cùng một công ty đối tác" — đúng câu trả lời 1 của chủ dự án. Nếu sau này một công ty đối tác có nhiều tài khoản cùng cần xem chung một tập đơn, đó là ngưỡng mới, cần ADR khác (đã ghi ở ADR-0014 điều 5).
2. Đối tác không thấy giá net/hoa hồng ở bản này — luôn giá bán lẻ, đúng câu trả lời 3 của chủ dự án; giá net/hoa hồng là việc riêng (D-06), chưa làm.
3. Việc "gán hoặc xác nhận thủ công" cho hướng dẫn viên/lái xe bên ngoài (câu trả lời 8) **chưa được chốt cơ chế** — đặc tả này chỉ đảm bảo họ không tự nhận việc; cách nhân viên giao việc cho họ cụ thể (giao thẳng hay có bước xin/nhận) chốt ở một đặc tả sau, không chặn việc duyệt ADR-0014.

## 5. Ngoài phạm vi

Phạm vi theo tổ chức/nhiều tài khoản dùng chung một tập đơn; "nút bấm tuỳ chọn" đổi phạm vi lúc chạy; giá net/hoa hồng/đối soát (D-06); giới hạn số lượng/phân trang danh sách tài khoản khi có hàng trăm Đối tác (D-07); băng thông duyệt tài khoản của một/hai Quản trị (D-08); khoá theo số điện thoại/IP và thời hạn phiên đăng nhập (D-04); gộp chế độ bảo trì vào khái niệm Super Admin. Tất cả nêu ở `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` mục "Ngoài phạm vi"/"Hệ quả".

## 6. Câu hỏi cho chủ dự án (trước khi lập kế hoạch thi công)

1. **Bạn từng nói phạm vi xem đơn phải là nút bấm tuỳ chọn trong bảng điều khiển Super Admin** (câu 1, §4.1 tài liệu kiểm toán). Trước mắt chỉ có một lựa chọn thật sự cần ("chỉ đơn của mình"), nên đặc tả này **đề xuất chưa xây nút bấm**, chờ khi có lựa chọn thứ hai thật sự cần dùng. Bạn đồng ý hoãn, hay muốn có nút bấm ngay dù chỉ có một lựa chọn?
2. Duyệt `ADR-0014` không? (mở hai quyền mới, mở sửa sau xác nhận cho Thực hiện qua dòng điều chỉnh, đổi mặc định quyền tài khoản mới sang "không quyền")
3. ~~Mở thí điểm cho một nhóm nhỏ CTV trước, hay mở hết cùng lúc?~~ — **Đã trả lời 2026-09-22: thí điểm 5 CTV trước** (§4.4 tài liệu kiểm toán). Còn chốt: thời gian thí điểm, tiêu chí mở rộng.
4. "Gán hoặc xác nhận thủ công" cho hướng dẫn viên/lái xe bên ngoài: nhân viên gán thẳng, hay họ xin nhận rồi nhân viên duyệt?
5. Đơn do Đối tác lập mà chưa ai nhận: có tự động lấy người lập làm người phụ trách mặc định như hôm nay không, hay bắt buộc chờ một nhân viên/hướng dẫn viên nội bộ nhận trước khi xác nhận?
