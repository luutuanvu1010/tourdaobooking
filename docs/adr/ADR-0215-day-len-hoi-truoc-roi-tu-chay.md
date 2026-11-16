# ADR-0215 — `day-len` hỏi hết trong phút đầu rồi tự chờ kiểm; lượt kiểm gọn hơn

- **Trạng thái:** **đề xuất** 2026-11-16. Chủ dự án chọn hướng trong phiên, nguyên văn: «ok làm A và B, soạn đề xuất đi». Chưa có lời duyệt văn bản này; nhập vào bản chính KHÔNG phải là duyệt.
- **Loại:** việc lớn (luật phát hành, triển khai, tệp luật `.github/workflows/`). **Cửa:** hai chiều — quay lại = trả `day-len` và tệp quy trình về bản trước (còn trong lịch sử git); không đụng dữ liệu production.
- **Số quyết định trong lượt duyệt:** 3 (Đ1–Đ3). Không chạm quyền hay dữ liệu nghiệp vụ, nên không cần trang ghép (`CLAUDE.md` §9).
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với văn bản khác:** thay **thứ tự hỏi** của ADR-0179 Đ2.1 và cách xử lý đỏ của Đ3.1 (chi tiết ở Đ2 dưới); giữ nguyên mọi điều khác của ADR-0179 (kiểm đủ bộ trên GitHub, không bỏ bài, `trien-khai` chỉ đọc kết quả, lý do bắt buộc khi cho qua hay đổi quy trình kiểm). Đặc tả: `docs/superpowers/specs/2026-11-16-kiem-nhanh-a-b.md` (ví dụ «xong khi», số liệu đo).

## Bối cảnh
Lượt kiểm 16/11 mất 8 phút 52 giây; chủ phải ngồi chờ suốt vì câu hỏi nằm cả ở đầu lẫn cuối. Chủ muốn chỉ chờ khoảng 1 phút. Kiểm toàn bộ trong 1 phút không làm được trên gói GitHub miễn phí (trần 20 máy cùng lúc, lượt kiểm ~75 phút máy, kịch bản `dispatch` một mình 177 giây); kiểm riêng phần vừa sửa thì chủ đã gạt 6/11. Đo được ba chỗ phí: mỗi máy tải ~717 MB ảnh `docs/evidence/` không dùng để kiểm; việc «Chia phần» riêng chạy trước mọi việc; máy dồn cho `npm test` (xong sau 1–3 phút) trong khi e2e là nút cổ chai (5–7 phút).

## Đ1 — Lượt kiểm gọn hơn (vẫn đủ bộ, vẫn miễn phí)
1. Mỗi máy chỉ tải phần mã cần kiểm: bỏ tệp `.png`, `.jpg` dưới `docs/evidence/` (tải thưa — sparse checkout). Tệp khác trong `docs/evidence/` vẫn tải.
2. Bỏ việc «Chia phần» riêng: danh sách phần ghi trong tệp quy trình, mỗi máy tự tính phần của mình bằng `scripts/kiem-phan.mjs` như hôm nay; bài kiểm khoá danh sách khớp hằng số `SO_PHAN_*`. Việc gom vẫn kiểm hợp các phần = toàn bộ (ADR-0179 Đ1.3).
3. Dồn máy cho e2e trong trần 20 việc cùng lúc (khởi điểm: 1 phần riêng + ~6 `npm test` + ~13 e2e), chỉnh theo số đo.
4. Mục tiêu ≤ 6 phút cho một lượt (ước lượng, chưa thử); vượt thì cảnh báo, không chặn.

## Đ2 — `day-len` hỏi trước, rồi tự chạy tới khi xong
1. Mọi câu hỏi biết được TRƯỚC khi kiểm được hỏi ngay sau bước gộp ở máy, trước lần đẩy lên nhánh chờ kiểm: lý do đổi tệp luật, lý do đổi tệp điều khiển việc kiểm, và câu xác nhận «Kiểm xanh thì tự đẩy lên GitHub? (c/k)» (chỉ đúng chữ `c` thường mới nhận). Câu `c` này thay câu «Đẩy lên GitHub? (c/k)» đang hỏi sau khi kiểm (ADR-0179 Đ2.1).
2. Sau đó lệnh tự chờ, giữ máy thức (`caffeinate`), không hỏi thêm. Xanh ⇒ tự đẩy `main`, ghi bản ghi kết luận kiểm như hôm nay, thông báo macOS.
3. Đỏ ⇒ tự chạy lại phần đỏ **đúng một lần**; vẫn đỏ ⇒ không đẩy, thông báo, in tên bài đỏ. Lệnh không tự «cho qua». Muốn cho qua: chủ chạy lại `day-len` và có mặt — khi đó lệnh hỏi r/d/q như ADR-0179 Đ3.1 (thay Đ3.1 chỉ ở chỗ: khi chủ đã trả lời trước và rời máy, mặc định là «chạy lại một lần rồi dừng»).
4. Điều chỉ biết SAU khi kiểm (số tệp/bài giảm, số bỏ qua tăng so với lượt của `origin/main` — ADR-0179 Đ3.2) ⇒ không đẩy, thông báo; chủ chạy lại để gõ lý do.
5. Lệnh vẫn chạy trong cửa sổ Terminal của chủ (vẫn đòi TTY như hôm nay); đóng cửa sổ là dừng, `main` trên GitHub không đổi.

## Đ3 — Ảnh bằng chứng giữ nguyên trong kho
Không xoá ảnh khỏi `docs/evidence/` trong việc này. Xoá khỏi bản mới nhất không làm kho trên GitHub nhỏ đi (lịch sử vẫn giữ); xoá khỏi lịch sử cần đẩy cưỡng bức (`CLAUDE.md` §8 cấm). Nơi lưu ảnh mới từ nay là quyết định riêng nếu chủ muốn.

## Hệ quả
- **Được:** chủ chờ ~1 phút thay vì ~9; lượt kiểm nhanh hơn ~3 phút (ước lượng); `main` trên GitHub vẫn chỉ nhận mã xanh hoặc đỏ có lý do chủ gõ.
- **Mất / rủi ro:** chủ trả lời `c` trước khi thấy kết quả kiểm (bù lại: đỏ thì không bao giờ tự đẩy); Mac phải mở, có mạng, cửa sổ Terminal không đóng tới khi xong; hai lần `day-len` cùng lúc vẫn chia chung trần 20 máy (lượt sau xếp hàng); tải thưa nếu cấu hình sai có thể làm thiếu tệp — bài kiểm số tệp/bài của việc gom sẽ bắt.
