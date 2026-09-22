# Tài khoản đối tác, phạm vi "của mình", Super Admin — đặc tả ngắn

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt kế hoạch thi công** — `ADR-0014` đã **accepted** (chủ dự án duyệt §4.5 câu 6). Chưa có mã, chưa qua kiểm độc lập.
> Nguồn: `docs/AUDIT-2026-09-22-DOI-TAC.md` (D-01, D-02, D-03, §4.1–§4.5); quyết định kiến trúc: `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` (điều 1–12).
> Đặc tả này **mô tả hành vi**, không phải kế hoạch thi công (số migration, tên hàm cụ thể, cấu trúc bảng lưu yêu cầu/chấm đếm lấy lúc lập kế hoạch thi công riêng, theo `CLAUDE.md` §10).
> Loại việc: **việc lớn** (quyền + tiền + dữ liệu) → bắt buộc kiểm độc lập, chỉ đọc, sau khi thi công, trước khi báo "đạt" (CLAUDE.md §3). Phạm vi lớn hơn một việc — tách kế hoạch thi công thành nhiều việc nhỏ (CLAUDE.md §9), mỗi việc một subagent kiểm riêng nếu cần.

## 1. Hành vi mong muốn (lời thường)

- Có hai mã quyền mới cạnh bốn mã đã có (Bán hàng, Kế toán, Quản trị, Thực hiện): **Đối tác** và **Super Admin**.
- Tài khoản **Đối tác** (CTV, hướng dẫn viên/lái xe/lái cano bên ngoài, lễ tân khách sạn, công ty du lịch — mỗi người một tài khoản):
  - Tự lập đơn, giá luôn là giá bán lẻ. Lúc lập đơn, **chọn một hướng dẫn viên nội bộ** làm người phụ trách, hoặc **để trống** (đơn chưa có người phụ trách) — chọn từ một danh sách hẹp, chỉ tên hướng dẫn viên nội bộ, không phải danh sách mọi tài khoản văn phòng.
  - Chỉ thấy, sửa, xác nhận, huỷ **đơn do chính mình lập** — không thấy đơn của người khác, không tra được hồ sơ khách/đại lý theo số điện thoại.
  - Không tự đặt mình làm người phụ trách của bất kỳ đơn nào (`dispatch.assign`/`dispatch.claim` không dùng được). Với đơn của người khác cần người thực hiện tại chỗ (hướng dẫn viên/lái xe/lái cano bên ngoài), họ **bấm "xin nhận"** — gửi yêu cầu, **chưa** thành người phụ trách; một nhân viên (Bán hàng/Quản trị) **duyệt** thì mới thành người phụ trách, hoặc **từ chối** thì thôi. Nhân viên không được tự ý gán một tài khoản Đối tác làm người phụ trách nếu tài khoản đó chưa gửi yêu cầu.
  - Sau khi được duyệt, họ thấy tên/SĐT khách, điểm đón, giờ và cập nhật được tiến độ (đã đón, giờ thực tế…) của đúng đơn đang phụ trách — **không** sửa được số khách/dịch vụ/tiền, không xác nhận/huỷ đơn đó (khác hướng dẫn viên **nội bộ**, xem dưới).
  - Không thấy màn quản trị, không ghi thu/hoàn tiền, không xuất hoá đơn.
  - Chỉ Quản trị viên hoặc Super Admin mở, khoá, đặt lại mã cho tài khoản Đối tác — không có ai của bên đối tác tự quản người của họ.
- Tài khoản **Super Admin**: quyền cao nhất, làm được mọi việc — kể cả những việc Quản trị viên không được làm. Trước mắt chỉ có tài khoản của chủ dự án giữ vai này.
- Tài khoản **Quản trị viên** (không đổi so với hôm nay về đơn: xem mọi đơn, tạo, duyệt, huỷ đơn). Về quản lý TÀI KHOẢN (mở, đình chỉ, sửa, khôi phục, lấy lại mật khẩu): **chỉ làm được với "cấp dưới"** — tài khoản không giữ Quản trị hay Super Admin (tức Bán hàng/Kế toán/Thực hiện/Đối tác). Quản trị viên **không** làm được các việc đó với một Quản trị viên khác hay với Super Admin — kể cả cấp hoặc gỡ vai Super Admin của một tài khoản (chỉ Super Admin tự làm được việc này).
- Nhân viên nội bộ giữ quyền Thực hiện (hướng dẫn viên nội bộ) **nhận phụ trách được** đơn do Đối tác lập (trước đây chỉ Bán hàng/Quản trị mới nhận được), qua đường bình thường (nhân viên gán, hoặc tự nhận nếu đơn chưa có người). Khi đang phụ trách một đơn, họ:
  - **sửa được số khách, dịch vụ và tiền của đơn đã xác nhận** (việc trước đây hoàn toàn không ai làm được qua ứng dụng) — máy tự tính lại tiền, phần chênh do người lập đơn (Đối tác) và Kế toán/Quản trị nhìn thấy, không phải người sửa; họ vẫn **không thấy tổng tiền hay bảng giá** ở bất kỳ màn nào.
  - **hoặc huỷ đơn đang phụ trách**, phải chọn đúng một trong hai lý do có sẵn: "Không liên hệ được với khách" hoặc "Khách yêu cầu huỷ" — không được gõ lý do tự do, không được huỷ mà không có lý do.
  - vẫn **không** tự xác nhận đơn hay sửa đơn nháp (đó là việc của Bán hàng/Quản trị).
- Mỗi lần sửa số khách/dịch vụ/tiền sau xác nhận: **không ghi đè** số cũ, mà thêm một **dòng điều chỉnh** ghi ai sửa, khi nào, vì sao, số trước và số sau.
- Huỷ đơn (bởi bất kỳ ai) **không đổi số tiền đã ghi trên đơn** — cọc vẫn giữ nguyên số cũ, không tự động hoàn. Nếu đơn có cọc mà bị hướng dẫn viên huỷ, đơn được đánh dấu để Kế toán chú ý xử lý hoàn cọc (việc hoàn tiền thật vẫn làm tay ngoài hệ thống, như hôm nay, cho tới khi có sổ thu tiền).
- Khi hướng dẫn viên sửa hoặc huỷ đơn, người lập đơn (Đối tác) thấy một **chấm đếm** báo "có đơn vừa thay đổi" khi mở ứng dụng (không phải thông báo đẩy về điện thoại) — cùng cách chấm đếm Góp ý đã có. Mở đơn ra thì hết chấm.
- Xuất lại ảnh xác nhận sau khi sửa: **tuỳ chọn**, có nút bấm sẵn — không tự động xuất lại.

## 2. Việc KHÔNG đổi

- Nhân viên nội bộ (Bán hàng/Kế toán/Quản trị) vẫn thấy hết mọi đơn như hôm nay — chỉ tài khoản Đối tác mới bị giới hạn "của mình".
- Cách sửa nháp, xác nhận đơn của Bán hàng/Quản trị không đổi.
- Ba lớp bảo vệ dữ liệu đã có (chỉ máy chủ tính tiền, ngày giờ theo múi Việt Nam, không xoá cứng) giữ nguyên. Khoá tiền của đơn đã xác nhận/đã huỷ (đặc tả khoá tiền 2026-09-22) không đổi — huỷ đơn qua đường mới của hướng dẫn viên cũng không đụng cột tiền.

## 3. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

1. Tài khoản chỉ có quyền Đối tác: gọi API liệt kê đơn → chỉ thấy đơn có người lập là chính mình; gọi API xem chi tiết đơn của người khác → bị từ chối; gọi API tra hồ sơ theo số điện thoại hoặc danh bạ → bị từ chối.
2. Tài khoản Đối tác lập đơn, có chọn một hướng dẫn viên nội bộ đang hoạt động → đơn tạo ra có người phụ trách là người đó ngay. Không chọn → đơn chưa có người phụ trách. Chọn một tài khoản không giữ quyền Thực hiện hoặc đã ngưng hoạt động → bị từ chối.
3. Tài khoản Đối tác gọi API danh sách hướng dẫn viên nội bộ (`dispatch.guides.view`) → chỉ thấy tên các tài khoản đang giữ quyền Thực hiện, đang hoạt động — không thấy tài khoản Bán hàng/Kế toán/Quản trị/Đối tác khác.
4. Tài khoản Đối tác gọi API "tự nhận đơn chưa có người phụ trách" (`dispatch.claim`) hoặc "tự gán mình làm người phụ trách" (`dispatch.assign`) → bị từ chối ở cả hai.
5. Tài khoản Đối tác gọi API "xin nhận việc" trên một đơn chưa có người phụ trách → tạo yêu cầu, đơn **chưa** đổi người phụ trách. Một tài khoản Bán hàng/Quản trị **duyệt** yêu cầu đó → đơn có người phụ trách là tài khoản Đối tác đã xin; tài khoản Bán hàng/Quản trị gọi thẳng API gán người phụ trách cho một Đối tác **chưa từng xin** → bị từ chối (đúng luật "chỉ qua duyệt yêu cầu").
6. Sau khi được duyệt (mục 5), tài khoản Đối tác đó gọi API xem tên/SĐT khách/điểm đón của đúng đơn đang phụ trách → thành công; gọi API sửa số khách/dịch vụ/tiền hoặc huỷ đơn đó → bị từ chối (họ không có `order.money.edit`/`order.cancel`).
7. Tài khoản chỉ có quyền Quản trị: gọi API cấp vai Super Admin cho một tài khoản khác → bị từ chối. Tài khoản có vai Super Admin: gọi cùng API → thành công.
8. Tài khoản chỉ có quyền Quản trị: gọi API mở/đình chỉ/khôi phục/lấy lại mật khẩu cho một tài khoản **Đối tác/Bán hàng/Kế toán/Thực hiện** → thành công; gọi cùng API cho một tài khoản **Quản trị khác hoặc Super Admin** → bị từ chối. Tài khoản Super Admin: gọi cùng API cho bất kỳ tài khoản nào (kể cả Quản trị/Super Admin khác) → thành công.
9. Tài khoản chỉ có quyền Thực hiện, đang là người phụ trách một đơn đã xác nhận: sửa số khách/dịch vụ của đơn đó → thành công, có dòng điều chỉnh mới (ai, khi, vì sao, trước → sau); gọi API xem tổng tiền/bảng giá của đơn → vẫn bị từ chối như hôm nay.
10. Tài khoản chỉ có quyền Thực hiện, KHÔNG phải người phụ trách của một đơn: sửa số khách/dịch vụ của đơn đó → bị từ chối.
11. Tài khoản chỉ có quyền Thực hiện, đang là người phụ trách một đơn đã xác nhận: huỷ đơn kèm lý do **đúng một trong hai lựa chọn có sẵn** → thành công, cột tiền của đơn **không đổi**, đơn được đánh dấu cho Kế toán nếu có cọc > 0. Huỷ **không kèm lý do**, hoặc lý do ngoài danh sách → bị từ chối. Gọi API xác nhận đơn (không phải huỷ), hoặc huỷ đơn **không phải mình phụ trách** → vẫn bị từ chối.
12. Sau khi hướng dẫn viên sửa hoặc huỷ một đơn (mục 9/11), tài khoản Đối tác đã lập đơn đó gọi API chấm đếm → thấy đơn này được tính vào số "có thay đổi chưa xem"; mở đơn ra → chấm đếm giảm, không còn tính đơn đó nữa.
13. Tạo tài khoản mới qua API mà không kèm danh sách quyền → tài khoản không có quyền nào (không còn tự động thành Bán hàng).
14. Test khoá bản đồ quyền (mọi ô của `PERMISSION_CODES` × mọi thao tác) xanh; `npm test`, `npm run typecheck` xanh; `npm run test:e2e` phủ ít nhất một kịch bản đăng nhập bằng tài khoản Đối tác và một kịch bản "xin nhận → duyệt".
15. Quan sát ít nhất một hàng rào chặn thật một lần trước khi coi là hoạt động (P16): ví dụ tạm bỏ điều kiện lọc "của mình" ở API liệt kê đơn → test đỏ → hoàn nguyên; tạm bỏ điều kiện danh sách đóng của lý do huỷ → test đỏ → hoàn nguyên.

## 4. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. "Của mình" cho Đối tác nghĩa là **người lập đơn**, không phải "mọi đơn của cùng một công ty đối tác" — đúng câu trả lời 1 của chủ dự án. Nếu sau này một công ty đối tác có nhiều tài khoản cùng cần xem chung một tập đơn, đó là ngưỡng mới, cần ADR khác (đã ghi ở ADR-0014 điều 5).
2. Đối tác không thấy giá net/hoa hồng ở bản này — luôn giá bán lẻ, đúng câu trả lời 3 của chủ dự án; giá net/hoa hồng là việc riêng (D-06), chưa làm.
3. Đính chính của chủ về "Quản trị viên quản lý tài khoản với cấp dưới" chỉ nói về quyền trên MỘT tài khoản (mở/đình chỉ/sửa/khôi phục/lấy lại mật khẩu) — **không** đụng tới việc Quản trị viên quản lý danh mục, địa điểm, vai trò hồ sơ, gộp hồ sơ (những việc này giữ nguyên như hôm nay).
4. Cơ chế "xin nhận" (câu 2, §4.5) áp dụng chung cho MỌI tài khoản Đối tác (CTV, hướng dẫn viên/lái xe bên ngoài…) vì tất cả dùng chung một mã quyền — kể cả một CTV kỹ thuật cũng bấm "xin nhận" được trên đơn của người khác. Chủ dự án không phân biệt loại đối tác nào được/không được làm việc này; nếu cần phân biệt, đó là việc thêm sau.
5. Hai lý do huỷ đóng ("Không liên hệ được với khách", "Khách yêu cầu huỷ") lấy đúng nguyên văn câu trả lời của chủ (§4.5 câu 4) — không thêm/bớt lựa chọn nào khác cho tới khi chủ yêu cầu.
6. "Đánh dấu cần chú ý hoàn cọc cho Kế toán" (mục 1, phần tiền cọc) là một cờ hiển thị, không phải một luồng hoàn tiền hay bút toán mới — hệ thống chưa có sổ thu tiền thật (N3 chưa triển khai).

## 5. Ngoài phạm vi

Phạm vi theo tổ chức/nhiều tài khoản dùng chung một tập đơn; "nút bấm tuỳ chọn" đổi phạm vi lúc chạy (chủ đồng ý hoãn); giá net/hoa hồng/đối soát (D-06); giới hạn số lượng/phân trang danh sách tài khoản khi có hàng trăm Đối tác (D-07); băng thông duyệt tài khoản của một/hai Quản trị (D-08); khoá theo số điện thoại/IP và thời hạn phiên đăng nhập (D-04); gộp chế độ bảo trì vào khái niệm Super Admin; thông báo đẩy (PWA push); sổ thu tiền thật và hoàn cọc tự động (N3). (Loại sửa cấm và tiêu chí mở rộng thí điểm không còn là câu hỏi mở — xem mục 6.) Tất cả nêu ở `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` mục "Ngoài phạm vi"/"Hệ quả".

## 6. Hai điều từng để "hỏi chủ", nay tự giải quyết bằng nguyên tắc chung của hệ thống (không phải câu hỏi kiến trúc — không cần chủ quyết riêng lẻ)

1. **Loại sửa nào hướng dẫn viên không được làm (ví dụ giảm giá):** **không đặt danh sách cấm riêng.** ADR-0007 điều 2 (đã duyệt) đặt sẵn nguyên tắc chung cho MỌI lần sửa tiền sau xác nhận, áp dụng như nhau cho mọi quyền được phép sửa: lý do bắt buộc, dòng điều chỉnh trước→sau chỉ-thêm, tiền tự tính lại ở máy chủ, chênh lệch với tiền đã thu tự động đánh dấu cho Kế toán. Đây là kiểm soát **hai lớp** (P21: dấu vết + đối chiếu tiền), không phải một danh sách loại sửa bị cấm — danh sách cấm dễ sót và không phải cách hệ thống này chọn để kiểm soát rủi ro tiền. Hướng dẫn viên sửa số khách/dịch vụ tự do (không giới hạn loại), an toàn nằm ở việc mọi lần sửa đều để lại dấu vết và bị đối chiếu, không nằm ở việc chặn trước một số loại sửa cụ thể.
2. **Tiêu chí mở rộng thí điểm sau 2 tuần:** đây là quyết định vận hành/kinh doanh, không thuộc kiến trúc vai trò-quyền — không cần đặt luật trước trong đặc tả này. Đến lúc thí điểm kết thúc, chủ dự án xem thực tế (có sự cố không, phản hồi thế nào) rồi quyết, không cần tiêu chí viết sẵn.
