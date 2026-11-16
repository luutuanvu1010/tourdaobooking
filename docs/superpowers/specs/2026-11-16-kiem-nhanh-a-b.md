# Đặc tả ngắn: lượt kiểm gọn hơn (A) và `day-len` hỏi trước rồi tự chạy (B)

- **Ngày:** 2026-11-16. **Trạng thái:** đề xuất, chờ chủ duyệt. Chủ đã chọn hướng A + B trong phiên (nguyên văn: «ok làm A và B, soạn đề xuất đi»).
- **Đi kèm:** ADR-0215 (đề xuất) — phần B đổi thứ tự bước của ADR-0179 Đ2.1 và Đ3.1 nên cần quyết định mới.
- **Số liệu gốc:** lượt kiểm https://github.com/luutuanvu1010/tourdaobooking/actions/runs/43819969293 (16/11, 8 phút 52 giây, 21 việc).

## 1. Việc gì, cho ai, vì sao
Chủ phải ngồi chờ 9 phút mỗi lần `npm run day-len`, trả lời câu hỏi rải rác lúc đầu và lúc cuối. Chủ muốn chỉ chờ khoảng 1 phút. Kiểm toàn bộ trong 1 phút không làm được (gói GitHub miễn phí trần 20 máy cùng lúc; lượt kiểm tốn ~75 phút máy; riêng kịch bản `dispatch` đã 177 giây). Nên: (A) làm lượt kiểm nhanh hơn, vẫn đủ bộ, vẫn miễn phí; (B) chủ trả lời mọi câu trong phút đầu, phần chờ còn lại máy tự làm.

Đo được chỗ phí: mỗi máy tải 823 MB mã, trong đó ~718 MB là ảnh `.png`/`.jpg` ở `docs/evidence/` (bước tải mất 16–112 giây mỗi máy); bước «Chia phần» và «Gom kết quả» chạy nối đuôi tốn ~66 giây; 9 phần `npm test` xong sau 79–214 giây nhưng phần 3 mất 458 giây (gồm 112 giây tải) — đó là việc lâu nhất lượt, hơn cả phần e2e lâu nhất (446 giây).

## 2. Xong khi
**A — lượt kiểm:**
- Một lần lưu bình thường: lượt kiểm trên GitHub xong trong **≤ 6 phút** (mục tiêu, đo ba lượt liên tiếp; vượt thì in cảnh báo, không chặn — như ADR-0179 Đ2.5).
- Bước tải mã mỗi máy **≤ 10 giây** (mục tiêu, chưa thử): ảnh `.png`/`.jpg` của `docs/evidence/` không được tải. Cơ chế: tải mờ (`filter: blob:none` của `actions/checkout`, chỉ tải nội dung tệp được ghi ra) **cộng** tải thưa kiểu mẫu loại theo đuôi (`sparse-checkout-cone-mode: false`). Chỉ tải thưa thôi thì không đủ: thử ở máy, bản sao vẫn kéo về 674 MB. Các tệp khác trong `docs/evidence/` (kịch bản Chrome `.mjs`, `.sql`, báo cáo) vẫn tải, vì có hai bài kiểm đọc chúng (`d1-thamdo.test.ts`, `migrations-ho-so-cong-ty-chu.test.ts`); không bài nào đọc ảnh.
- Số tệp kiểm, số bài, số kịch bản e2e **bằng đúng** lượt trước; máy gom vẫn đỏ nếu thiếu hay trùng (ADR-0179 Đ1.3 giữ nguyên; việc «thiếu/trùng» lệnh `ma-tran` đang làm chuyển hẳn sang máy gom).
- Không còn việc «Chia phần» riêng; vẫn ≤ 20 việc chạy cùng lúc. Sửa theo hai bài đang khoá cấu trúc cũ: `src/release-lib.test.ts` (khoá `needs: [chia, rieng, test, e2e]`) và `src/kiem-phan.test.ts` (lệnh `ma-tran`).

**B — `day-len`:**
- Chủ gõ `npm run day-len -- <nhánh>`. Trong **khoảng 1 phút**, lệnh hỏi hết: lý do đổi tệp luật (nếu có), lý do đổi tệp điều khiển việc kiểm (nếu có); in khối «SẮP ĐẨY LÊN GITHUB» như hôm nay (danh sách lần lưu, migration mới kèm cảnh báo đỏ, lý do đổi luật); rồi hỏi một câu ba lựa chọn: `c` = kiểm xanh thì tự đẩy (rời máy được), `x` = chờ ở đây xem kết quả rồi mới quyết (đúng luồng hôm nay, có chạy lại / dừng / cho qua có lý do), `k` = dừng. Gõ `c` xong, lệnh in «Bạn có thể rời máy. Để nguyên cửa sổ Terminal này mở.»
- Kiểm **xanh**: lệnh tự đẩy `main`, hiện thông báo macOS «Đã đẩy lên bản chính» kèm tiếng. Dòng cuối vẫn là «Đã đẩy. GitHub (origin/main) giờ là: …». Lượt kiểm nhận được cũ hơn 24 giờ (chạy lại `day-len` cho lần lưu cũ) thì **không** tự đẩy: thông báo, chủ chạy lại lượt kiểm.
- Kiểm **đỏ**: lệnh tự chạy lại phần đỏ **một lần** (e2e từng đỏ giả). Vẫn đỏ thì **không đẩy**, thông báo «Kiểm đỏ, chưa đẩy», in tên bài đỏ và in hướng dẫn như khi dừng hôm nay (`main` máy đã gộp nhưng chưa đẩy; lệnh không tự quay `main` về).
- Ba trường hợp chỉ biết **sau** khi kiểm (so với lượt xanh của `origin/main`, hàm `soSanhSoLieu`): số tệp/bài giảm hay số bỏ qua tăng; không đọc được số liệu; không có lượt của `origin/main` để so. Cả ba: không đẩy, thông báo, chủ chạy lại với lựa chọn `x` để gõ lý do (như Đ3.2 hôm nay). Lần phát hành của chính việc A sẽ rơi vào đây vì đổi tệp quy trình.
- `main` trên GitHub vẫn không bao giờ nhận mã đỏ mà thiếu lý do chủ gõ tay. «Cho qua» bài đỏ vẫn có, qua lựa chọn `x` (chủ ngồi chờ).
- Máy Mac không ngủ trong lúc chờ (lệnh tự giữ thức bằng `caffeinate`, nhả khi xong).

## 3. Không làm lần này
- Không kiểm riêng phần vừa sửa (chủ đã gạt hôm 6/11).
- Không viết lại lịch sử kho trong việc này (ảnh trong lịch sử: ADR-0216, một chiều, quyết riêng).
- Không tự nối `trien-khai` sau `day-len`; chủ vẫn gõ `trien-khai` sau khi thấy «Đã đẩy».
- Không trả tiền để chạy hơn 20 máy; không viết lại các kịch bản dài (hướng C).

## 4. Loại việc
- [x] Việc lớn (luật phát hành, triển khai, tệp luật `.github/workflows/`) ⇒ có người kiểm độc lập; `day-len` sẽ đòi lý do «đổi quy trình kiểm» ở lần đưa lên — đi một lần phát hành riêng, không gộp tính năng.
- Cần ADR: có, ADR-0215 cho phần B.

## 5. Câu hỏi cho chủ
1. ~~Ảnh bằng chứng giữ hay bỏ?~~ **Đã chốt 16/11:** bỏ khỏi kho, cả ở máy lẫn trên GitHub (nguyên văn ở ADR-0215 Đ3). **Xong khi:** bản hiện tại không còn tệp `.png`/`.jpg` nào dưới `docs/evidence/`; chụp ảnh mới vào đó thì `git status` không thấy; bản làm việc mới nhẹ hơn ~700 MB. Ảnh trong lịch sử: ADR-0216.

## 6. Điều AI tự quyết (chủ bác được)
- Đỏ khi chủ vắng: tự chạy lại phần đỏ đúng một lần rồi dừng, không tự «cho qua».
- Thông báo bằng `osascript` (cùng cách hook báo tin cấp máy ngoài kho đang dùng); chữ đưa qua tham số, không ghép vào mã lệnh. `caffeinate` và `osascript` là mã mới, có bài kiểm (tiêm giả như các bước khác của `day-len`).
- Chia lại máy theo số đo, trong 20 việc: dồn thêm phần cho e2e, nhưng KHÔNG bớt phần `npm test` một cách máy móc (phần 3 đang là việc lâu nhất); trước hết tách các tệp kiểm chậm nhất (`audit-invariants.test.ts` 127 giây, ba tệp `muc-hien-mo-duoc-*` 67–93 giây) để không phần nào vượt ~3 phút. Ước tính thô từ số đo: ~4–5 phút; chưa phải bằng chứng.
- Danh sách phần ghi cứng trong tệp quy trình; một bài kiểm khoá danh sách đó khớp hằng số `SO_PHAN_*` của `scripts/kiem-phan.mjs`.
