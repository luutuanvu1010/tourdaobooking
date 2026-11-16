# Đặc tả ngắn: lượt kiểm gọn hơn (A) và `day-len` hỏi trước rồi tự chạy (B)

- **Ngày:** 2026-11-16. **Trạng thái:** đề xuất, chờ chủ duyệt. Chủ đã chọn hướng A + B trong phiên (nguyên văn: «ok làm A và B, soạn đề xuất đi»).
- **Đi kèm:** ADR-0215 (đề xuất) — phần B đổi thứ tự bước của ADR-0179 Đ2.1 và Đ3.1 nên cần quyết định mới.
- **Số liệu gốc:** lượt kiểm https://github.com/luutuanvu1010/tourdaobooking/actions/runs/43819969293 (16/11, 8 phút 52 giây, 21 việc).

## 1. Việc gì, cho ai, vì sao
Chủ phải ngồi chờ 9 phút mỗi lần `npm run day-len`, trả lời câu hỏi rải rác lúc đầu và lúc cuối. Chủ muốn chỉ chờ khoảng 1 phút. Kiểm toàn bộ trong 1 phút không làm được (gói GitHub miễn phí trần 20 máy cùng lúc; lượt kiểm tốn ~75 phút máy; riêng kịch bản `dispatch` đã 177 giây). Nên: (A) làm lượt kiểm nhanh hơn, vẫn đủ bộ, vẫn miễn phí; (B) chủ trả lời mọi câu trong phút đầu, phần chờ còn lại máy tự làm.

Đo được chỗ phí: mỗi máy tải 823 MB mã, trong đó ~717 MB là ảnh `.png`/`.jpg` ở `docs/evidence/` (bước tải mất 16–112 giây mỗi máy); bước «Chia phần» và «Gom kết quả» chạy nối đuôi tốn ~66 giây; 10 phần `npm test` xong sau 1–3 phút (trừ một phần 5,5 phút) trong khi 8 phần e2e mất 5–7 phút.

## 2. Xong khi
**A — lượt kiểm:**
- Một lần lưu bình thường: lượt kiểm trên GitHub xong trong **≤ 6 phút** (mục tiêu, đo ba lượt liên tiếp; vượt thì in cảnh báo, không chặn — như ADR-0179 Đ2.5).
- Bước tải mã mỗi máy **≤ 10 giây**; ảnh `.png`/`.jpg` của `docs/evidence/` không được tải. Các tệp khác trong đó (kịch bản Chrome `.mjs`, `.sql`, báo cáo) vẫn tải, vì có hai bài kiểm đọc chúng (`d1-thamdo.test.ts`, `migrations-ho-so-cong-ty-chu.test.ts`).
- Số tệp kiểm, số bài, số kịch bản e2e **bằng đúng** lượt trước; máy gom vẫn đỏ nếu thiếu hay trùng (ADR-0179 Đ1.3 giữ nguyên).
- Không còn việc «Chia phần» riêng; vẫn ≤ 20 việc chạy cùng lúc.

**B — `day-len`:**
- Chủ gõ `npm run day-len -- <nhánh>`. Trong **khoảng 1 phút**, lệnh hỏi hết: lý do đổi tệp luật (nếu có), lý do đổi tệp điều khiển việc kiểm (nếu có), rồi «Kiểm xanh thì tự đẩy lên GitHub? (c/k)». Gõ `c` xong, lệnh in «Bạn có thể rời máy. Để nguyên cửa sổ Terminal này mở.»
- Kiểm **xanh**: lệnh tự đẩy `main`, hiện thông báo macOS «Đã đẩy lên bản chính» kèm tiếng. Dòng cuối vẫn là «Đã đẩy. GitHub (origin/main) giờ là: …».
- Kiểm **đỏ**: lệnh tự chạy lại phần đỏ **một lần** (e2e từng đỏ giả). Vẫn đỏ thì **không đẩy**, thông báo «Kiểm đỏ, chưa đẩy», in tên bài đỏ và in hướng dẫn như khi dừng hôm nay (`main` máy đã gộp nhưng chưa đẩy; lệnh không tự quay `main` về).
- **Số bài giảm** so với lượt của `origin/main` (chỉ biết sau khi kiểm): không đẩy, thông báo, chủ chạy lại lệnh để gõ lý do (như Đ3.2 hôm nay).
- `main` trên GitHub vẫn không bao giờ nhận mã đỏ mà thiếu lý do chủ gõ tay. «Cho qua» bài đỏ vẫn có, nhưng chỉ khi chủ chạy lại `day-len` và có mặt.
- Máy Mac không ngủ trong lúc chờ (lệnh tự giữ thức bằng `caffeinate`, nhả khi xong).

## 3. Không làm lần này
- Không kiểm riêng phần vừa sửa (chủ đã gạt hôm 6/11).
- Không xoá ảnh trong `docs/evidence/` (xem câu hỏi 1); không viết lại lịch sử kho.
- Không tự nối `trien-khai` sau `day-len`; chủ vẫn gõ `trien-khai` sau khi thấy «Đã đẩy».
- Không trả tiền để chạy hơn 20 máy; không viết lại các kịch bản dài (hướng C).

## 4. Loại việc
- [x] Việc lớn (luật phát hành, triển khai, tệp luật `.github/workflows/`) ⇒ có người kiểm độc lập; `day-len` sẽ đòi lý do «đổi quy trình kiểm» ở lần đưa lên — đi một lần phát hành riêng, không gộp tính năng.
- Cần ADR: có, ADR-0215 cho phần B.

## 5. Câu hỏi cho chủ
1. **Ảnh bằng chứng (`docs/evidence/`, ~717 MB ảnh, 172 đợt từ 19/9):** khuyến nghị **giữ nguyên**, lượt kiểm chỉ bỏ không tải ảnh. Lý do: xoá khỏi bản mới nhất không làm kho trên GitHub nhỏ đi (lịch sử vẫn giữ, ~1 GB), còn xoá khỏi lịch sử phải đẩy cưỡng bức — điều cấm. Muốn kho thôi phình thì quyết riêng: ảnh mới từ nay lưu ngoài kho.

## 6. Điều AI tự quyết (chủ bác được)
- Đỏ khi chủ vắng: tự chạy lại phần đỏ đúng một lần rồi dừng, không tự «cho qua».
- Thông báo bằng `osascript` (như hook `bao-tin.sh` cấp máy); chữ đưa qua tham số, không ghép vào mã lệnh.
- Chia lại máy: khoảng 6 phần `npm test` + 13 phần e2e + 1 phần riêng (= 20), chỉnh theo số đo; tách tệp kiểm chậm nhất (`audit-invariants.test.ts` 127 giây) nếu nó thành nút cổ chai.
- Danh sách phần ghi cứng trong tệp quy trình; một bài kiểm khoá danh sách đó khớp hằng số `SO_PHAN_*` của `scripts/kiem-phan.mjs`.
