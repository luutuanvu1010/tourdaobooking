# QA1 lần 5 — đặc tả bản 5 + ADR-0151 bản 3 (2026-10-30)

Hồ sơ có ngày, không sửa. Kiểm phạm vi hẹp diff 37c6638c..aba2750d. Kết luận: ĐẠT.

### Verdict: ĐẠT

Bước xét trước mà quyết định 12 thêm vào chép đúng luật `kiemDoi`. Hai điều kiện X1 và X2 chặn đúng hai ca mà `kiemDoi` từ chối ở `rules.ts:335` và `:338`, và không chặn thêm ca nào. Bài ghim hai phía, như đặc tả mô tả, sẽ báo đỏ khi một trong hai bản bị sửa lệch. Thứ tự xét cũng khớp với route «Đổi chính sách» của loại. Sáu câu đổi chữ ở `rules.ts` thuộc phần 1 không đụng `kiemDoi`. Tôi không thấy mâu thuẫn mới, và câu chữ về cổng duyệt khớp biên bản quyết định 10–12.

### Chặn

Không có.

### Sửa

Không có.

### Ghi

- **X2 trên thực tế chỉ bắn ở đúng một ca.** Ba điều kiện `cu.validFrom <= homNay`, `tuNgay >= homNay` và `cu.validFrom >= tuNgay` gộp lại thì chỉ đúng khi `validFrom = tuNgay = homNay`. Tức là dòng cũ bắt đầu hôm nay và người dùng cũng chọn đổi từ hôm nay. Câu «Chọn ngày bắt đầu muộn hơn» vẫn đúng cho ca này. Nên ghi một câu như vậy vào ADR Đ3 để người đọc khỏi phải tự suy.
- **Bảng ca của bài ghim cần ghi rõ một ca giao nhau** để ví dụ «bỏ `cu.validFrom <= homNay` phải làm bài đỏ» thực sự đỏ. Ca đó là: dòng chưa tới ngày, và `homNay <= tuNgay <= cu.validFrom`. Nếu ca «chưa tới ngày» lại dùng `tuNgay` sau `validFrom` thì bỏ điều kiện kia vẫn xanh. Chữ «mọi tổ hợp» cùng luật sửa-cố-ý-phải-đỏ (P16) đã buộc người thi công thêm ca này, nhưng viết tường minh thì chắc hơn.
- **`index.ts` hôm nay chỉ nhập `vnToday`** từ `vn-date.ts` (`index.ts:13`), chưa nhập `ngayDayDu`. Phần 2 phải thêm dòng nhập này. Việc đó vẫn nằm trong tệp đã có tên ở mục «Tệp được chạm», nên danh sách tệp vẫn đủ.
- **Đoạn đầu mục «Lệch có tên» ở §10 (khoảng dòng 359–363) vẫn tả hai câu chỉ sai đường như chuyện hiện tại.** Đầu mục đã ghi «ở route mới đã gỡ theo quyết định 12» và có đoạn «Bản 5» ngay sau, nên không đọc sai, chỉ hơi dài.

**Kết quả từng điểm được giao kiểm:**

1. **X1, X2 so với `kiemDoi`.** `kiemDoi` (`rules.ts:332–345`) xét theo thứ tự: đã huỷ → đã có ngày ngừng (`:335`) → chưa tới ngày (`:336`) → ngày mới sai dạng hoặc trước hôm nay (`:337`) → `validFrom >= tuNgay` (`:338`) → ngày đã chụp.
   - X1 = `!daHuy && validTo !== null`, đúng điều kiện để tới câu `:335`.
   - X2 phủ định đủ các nhánh đứng trước rồi thêm `validFrom >= tuNgay`, đúng điều kiện để tới câu `:338`.
   - Dòng đã huỷ vẫn ra câu `CAU_DA_HUY` của `kiemDoi`. Hai câu X1, X2 không dùng ngày đã chụp, nên không chặn nhầm ca nào khác.
2. **Bài ghim.** Hai phía được nối bằng dấu ⇔ trên cùng một bảng ca. Nếu chữ hoặc điều kiện ở `kiemDoi` đổi, `kiemDoi` sẽ không còn trả câu `:335`/`:338` trong khi route vẫn trả X1/X2, nên bài đỏ. Nếu điều kiện của bước xét trước đổi, route sẽ trả X1/X2 ở ca mà `kiemDoi` trả câu khác, nên bài cũng đỏ.
3. **Thứ tự.** Quyền → tìm dòng → kiểm thân → «đã chụp chưa» → X1/X2 → `kiemDoi` → cấp trùng → cấp không có. Route anh em `/muc-ta/gan/:id/doi` (`index.ts:442–456`) xét: quyền → dòng → thân → đã chụp → `kiemDoi` → cấp trùng → `timMuc`. Bước xét trước chỉ chen ngay trước `kiemDoi`. Vì X1/X2 không phụ thuộc kết quả «đã chụp», để nó sau bước «đã chụp» như đặc tả là được: kết quả 503 khi thiếu hàm tiêm vẫn như route anh em.
4. **Sáu câu ở `rules.ts`.** Bảng §6.1 đổi `rules.ts` 374, 375, 377 (tên cấp), 386, 395 và 402 (thân lệnh). Cả sáu dòng nằm ngoài `kiemDoi` (332–345) và chỉ đổi chữ. ADR dòng 61 viết «phần 2 không chạm `rules.ts` (phần 1 chỉ đổi các chuỗi «chính sách» của tệp này…, không đụng câu nào của `kiemDoi`)». Mục «Tệp được chạm» không có `rules.ts`, và đặc tả §8 ghi cùng ý. Grep không còn câu «`rules.ts` không đổi» nào mà thực ra ý là `kiemDoi`.
5. **Câu chữ cổng.** Đặc tả §0 khớp quyết định 10 (chủ duyệt kế hoạch trước khi viết mã) và quyết định 11 (phần 2 vào cùng kế hoạch). ADR ghi `accepted` theo quyết định 11, và bản 3 của ADR chép quyết định 12 vào Đ3. Dòng README cũng đổi sang `accepted`. Tôi không thấy mâu thuẫn nào.

### Checks run

- Đọc `git diff --word-diff 37c6638c aba2750d` cho ADR-0151, README và DAC-TA. Đọc `BIEN-BAN-DUYET-2026-10-30.md` mục 10–12.
- Đọc lại `kiemDoi` (`rules.ts:332–345`), route `/muc-ta/gan/:id/doi` (`index.ts:442–471`), các dòng nhập của `index.ts` (13, 17) và `src/shared/vn-date.ts:102` (`ngayDayDu`).
- Grep `rules.ts` trong ADR, DAC-TA, biên bản duyệt và README.
- Không sửa tệp nào, không đổi trạng thái git.