# ADR-0215 — `day-len` hỏi hết trong phút đầu rồi tự chờ kiểm; lượt kiểm gọn hơn; ảnh bằng chứng ra khỏi kho

- **Trạng thái:** **accepted** 2026-11-16 — chủ dự án duyệt trong phiên, nguyên văn: «Duyệt ADR-0215 và hoàn tất nhiệm vụ của phiên». Trước đó chọn hướng: «ok làm A và B, soạn đề xuất đi».
- **Loại:** việc lớn (luật phát hành, triển khai, tệp luật `.github/workflows/`). **Cửa:** hai chiều — quay lại = trả `day-len` và tệp quy trình về bản trước (còn trong lịch sử git); không đụng dữ liệu production.
- **Số quyết định trong lượt duyệt:** 3 (Đ1–Đ3). Không chạm quyền hay dữ liệu nghiệp vụ, nên không cần trang ghép (`CLAUDE.md` §9).
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với văn bản khác:** thay **thứ tự hỏi** của ADR-0179 Đ2.1 và cách xử lý đỏ của Đ3.1 (chi tiết ở Đ2 dưới); giữ nguyên mọi điều khác của ADR-0179 (kiểm đủ bộ trên GitHub, không bỏ bài, `trien-khai` chỉ đọc kết quả, lý do bắt buộc khi cho qua hay đổi quy trình kiểm). Đặc tả: `docs/superpowers/specs/2026-11-16-kiem-nhanh-a-b.md` (ví dụ «xong khi», số liệu đo).

## Bối cảnh
Lượt kiểm 16/11 mất 8 phút 52 giây; chủ phải ngồi chờ suốt vì câu hỏi nằm cả ở đầu lẫn cuối. Chủ muốn chỉ chờ khoảng 1 phút. Kiểm toàn bộ trong 1 phút không làm được trên gói GitHub miễn phí (trần 20 máy cùng lúc, lượt kiểm ~75 phút máy, kịch bản `dispatch` một mình 177 giây); kiểm riêng phần vừa sửa thì chủ đã gạt 6/11. Đo được ba chỗ phí: mỗi máy tải ~717 MB ảnh `docs/evidence/` không dùng để kiểm; việc «Chia phần» riêng chạy trước mọi việc; máy dồn cho `npm test` (xong sau 1–3 phút) trong khi e2e là nút cổ chai (5–7 phút).

## Đ1 — Lượt kiểm gọn hơn (vẫn đủ bộ, vẫn miễn phí)
1. Mỗi máy không còn tải ảnh: sau Đ3 bản hiện tại không còn ảnh, và lượt kiểm chỉ tải đúng một lần lưu (độ sâu 1), nên không cần cấu hình gì thêm. (Nếu Đ3 chưa làm thì phải dùng tải mờ `filter: blob:none` cộng tải thưa loại theo đuôi — chỉ tải thưa thì vẫn kéo về ~674 MB, người kiểm độc lập thử ở máy 16/11.)
2. Bỏ việc «Chia phần» riêng: danh sách phần ghi trong tệp quy trình, mỗi máy tự tính phần của mình bằng `scripts/kiem-phan.mjs` như hôm nay; bài kiểm khoá danh sách khớp hằng số `SO_PHAN_*`. Việc gom vẫn kiểm hợp các phần = toàn bộ, thiếu hay trùng là đỏ (ADR-0179 Đ1.3; nhận luôn việc này từ lệnh `ma-tran`). Sửa theo `src/release-lib.test.ts` (khoá `needs` của việc gom) và `src/kiem-phan.test.ts`.
3. Chia lại máy theo số đo trong trần 20 việc cùng lúc: thêm phần cho e2e; tách các tệp kiểm chậm nhất (`audit-invariants.test.ts`, `muc-hien-mo-duoc-*`) để không phần `npm test` nào thành việc lâu nhất (16/11 phần 3 mất 458 giây, lâu hơn mọi phần e2e).
4. Mục tiêu ≤ 6 phút cho một lượt (ước lượng, chưa thử); vượt thì cảnh báo, không chặn.

## Đ2 — `day-len` hỏi trước, rồi tự chạy tới khi xong
1. Mọi câu hỏi biết được TRƯỚC khi kiểm được hỏi ngay sau bước gộp ở máy, trước lần đẩy lên nhánh chờ kiểm: lý do đổi tệp luật, lý do đổi tệp điều khiển việc kiểm. Rồi in khối «SẮP ĐẨY LÊN GITHUB» (lần lưu, migration mới kèm cảnh báo, lý do) và hỏi một câu ba lựa chọn, chỉ nhận đúng chữ thường: `c` = kiểm xanh thì tự đẩy, rời máy được; `x` = ngồi chờ, xem kết quả rồi mới quyết — đúng luồng ADR-0179 hôm nay (r/d/q, cho qua có lý do, câu c/k cuối); `k` = dừng. Lựa chọn `c` thay câu «Đẩy lên GitHub? (c/k)» đang hỏi sau khi kiểm (ADR-0179 Đ2.1).
2. Chọn `c`: lệnh tự chờ, giữ máy thức (`caffeinate`), không hỏi thêm. Xanh ⇒ ghi bản ghi kết luận kiểm như hôm nay, tự đẩy `main`, thông báo macOS.
3. Chọn `c` mà đỏ ⇒ tự chạy lại phần đỏ **đúng một lần**; vẫn đỏ ⇒ không đẩy, thông báo, in tên bài đỏ. Lệnh không tự «cho qua»; muốn cho qua thì chủ chạy lại và chọn `x` (ADR-0179 Đ3.1 giữ nguyên ở lựa chọn này).
4. Chọn `c` mà gặp điều chỉ biết SAU khi kiểm ⇒ không đẩy, thông báo; chủ chạy lại với `x` để gõ lý do. Gồm: số tệp/bài giảm hay số bỏ qua tăng, không đọc được số liệu, không có lượt xanh của `origin/main` để so (hàm `soSanhSoLieu`, ADR-0179 Đ3.2); và lượt kiểm nhận được cũ hơn 24 giờ.
5. Lệnh vẫn chạy trong cửa sổ Terminal của chủ (vẫn đòi TTY như hôm nay); đóng cửa sổ là dừng, `main` trên GitHub không đổi.

## Đ3 — Ảnh bằng chứng không nằm trong kho nữa
Chủ dự án 16/11, nguyên văn: «đồng ý bỏ ảnh, vì giữ lại không có tác dụng gì sau khi việc đã hoàn thành, áp dụng không chỉ ở Local mà còn cả trên Github, nếu luật không phù hợp thì phải sửa luật». Đo 16/11: ảnh có mặt trong 23 bản làm việc trên máy, tổng ~16 GB, ổ đĩa còn 23 GB trống.
1. Một lần lưu bỏ mọi tệp `.png`, `.jpg` dưới `docs/evidence/` khỏi bản hiện tại; tệp khác (kịch bản Chrome, `.sql`, báo cáo, ghi chú) giữ nguyên. Lên GitHub qua `day-len` như mọi lần, nên bản hiện tại trên GitHub cũng không còn ảnh.
2. `.gitignore` chặn `.png`, `.jpg` dưới `docs/evidence/`: AI vẫn chụp vào đúng chỗ cũ để chủ xem và người kiểm độc lập đọc (cùng máy), nhưng ảnh không bao giờ vào kho; dọn bản làm việc là ảnh mất theo.
3. Luật sửa theo (đề xuất trên cùng nhánh, chủ duyệt — Hiến pháp N9): dòng «Bằng chứng giao diện» ở `CLAUDE.md` §6 và dòng ảnh giao diện thật ở `web/CLAUDE.md` ghi rõ ảnh chỉ nằm trên máy.
4. Ảnh trong **lịch sử** kho (GitHub vẫn giữ, ai cũng xem được vì kho công khai) là quyết định một chiều riêng: ADR-0216.

## Hệ quả
- **Được:** chủ chờ ~1 phút thay vì ~9; lượt kiểm nhanh hơn ~3 phút (ước lượng); `main` trên GitHub vẫn chỉ nhận mã xanh hoặc đỏ có lý do chủ gõ.
- **Mất / rủi ro:** chủ trả lời `c` trước khi thấy kết quả kiểm (bù lại: đỏ hay số liệu lạ thì không bao giờ tự đẩy; muốn xem trước thì chọn `x`); `caffeinate`, `osascript` là mã mới phải có bài kiểm; Mac phải mở, có mạng, cửa sổ Terminal không đóng tới khi xong; hai lần `day-len` cùng lúc vẫn chia chung trần 20 máy (lượt sau xếp hàng); tải thưa nếu cấu hình sai có thể làm thiếu tệp — bài kiểm số tệp/bài của việc gom sẽ bắt.
