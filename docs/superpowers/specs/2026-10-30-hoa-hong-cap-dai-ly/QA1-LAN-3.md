# QA1 lần 3 — đặc tả bản 3 + ADR-0151 bản 2 (2026-10-30)

Hồ sơ có ngày, không sửa. Kiểm phạm vi hẹp diff 353230c2..3d9f26bb.

### Verdict: KHÔNG ĐẠT

Lần này đặc tả và ADR đã sửa đủ các mục Chặn và Sửa của lần 2, và cả ba quyết định 7–9 của chủ đều đã vào văn bản. Cổng vẫn chưa qua vì phép thử ba biểu thức chữ cấm cho thấy một lỗ mới. Ba biểu thức này bỏ lọt 25 chuỗi hoa hồng vẫn còn chữ «chính sách», nhưng đặc tả lại gọi danh sách chúng bắt được là «danh sách việc của phần 1». Như vậy làm xong phần 1, màn hình vẫn có thể hiện cả «cấp» lẫn «chính sách» cho cùng một nghĩa, và không bài kiểm nào bắt được. Ngoài ra con số «112 chuỗi» cũng sai: số chuỗi bị bắt là 104.

### Chặn

1. **6a, 6b, 6c bỏ lọt 25 chuỗi hoa hồng còn chữ «chính sách» theo nghĩa cấp.** Theo quyết định 3 thì các chuỗi này phải đổi, nhưng §6.2 lại viết «ba mục bắt 112 chuỗi… Đó là danh sách việc của phần 1: sau khi đổi chữ, số bắt phải về 0». Tôi chạy lại bằng đúng hàm `chuoiTrongMa` và đúng danh sách tệp mà bài kiểm dùng. Kết quả lọt như sau:
   - `web/hoa-hong-bang.ts`: 125 «, chính sách», 126 «Chính sách:», 145 «Theo chính sách», 160 «Sửa áp dụng chính sách:»
   - `web/hoa-hong-hop.ts`: 432 «Sửa áp dụng chính sách», 568 «Đã thêm chính sách.»
   - `web/hoa-hong-thiet-lap.ts`: 14 «Chưa áp dụng chính sách nào», 35 «Sửa áp dụng chính sách:», 127 «Đã tắt chính sách.» và «Đã bật chính sách.», 128 «chính sách:»
   - `web/parties.ts`: 760, 769, 771 («thắng chính sách của loại»), 795, 798
   - `src/shared/audit-actions.ts:110`: «Huỷ lần áp dụng chính sách cho loại…». Đây là nhãn hiện trên trang Nhật ký, mà quyết định 8 nói nhãn thì đổi chữ. Nó lọt vì 6c chỉ có «Lần áp dụng» viết hoa.
   - `src/shared/hoa-hong-hien-thi.ts`: 111–113 («chính sách của loại đối tác…»), 167 «Chưa có chính sách nào.», 176 (hai mảnh), 180 «Tắt chính sách:», 181 «Bật chính sách:»

   **Sửa:** chọn một trong hai cách.
   - (a) Mở rộng 6c cho phủ hết 25 chuỗi trên, ví dụ thêm `[Ll]ần áp dụng`, `[Ss]ửa áp dụng`, `[Tt]ắt|[Bb]ật`, «chính sách» đứng trước `[:.,]` hoặc cuối chuỗi, «chính sách của loại», «chính sách nào», «Theo chính sách». Thêm cả một ca dương cho mỗi chuỗi.
   - (b) Viết một luật riêng cho các tệp hoa hồng: mọi «chính sách» không đi kèm «riêng tư», «điều phối» hay «đăng nhập» đều bị cấm, và `index.ts:129`, `:535` là hai ngoại lệ có tên (theo quyết định 8).

   Dù chọn cách nào, phải đo lại số bắt được, và sửa câu «danh sách việc» cho đúng.

### Sửa

2. **Số «112 chuỗi» sai.** Có 104 chuỗi khác nhau bị bắt (6a: 10, 6b: 30, 6c: 64). Con số 112 chỉ ra được khi đếm mỗi chuỗi một lần cho mỗi biểu thức nó khớp: có 8 chuỗi khớp cùng lúc 6b và 6c (ví dụ `web/parties.ts:764`, `:869`). **Sửa:** ghi «104 chuỗi (112 lần khớp)».
3. **Ca dương «mỗi mục một câu cũ của §6.1 phải khớp» hơi mơ hồ.** Có ba câu ở §6.1 không chứa chữ «chính sách» nên không biểu thức nào khớp được: `index.ts:69` («một mức riêng…»), `:221` («Mức này đang bật rồi»), `:454` («Mức mới giống hệt mức đang gắn»). Chưa có máy nào canh ba câu này. **Sửa:** ghi rõ ca dương chỉ lấy các câu có chữ «chính sách», và để ba câu kia cho bài của §6.3 ghim nguyên văn.

### Ghi

- Không có khớp nhầm ngoài phần hoa hồng. Cả 104 chuỗi đều nằm trong `web/hoa-hong*.ts`, `web/parties.ts`, `hoa-hong-hien-thi.ts`, `audit-actions.ts:100–111`, `huong-dan-ke-toan.ts:140–141`, `so-dai-ly-nhap.ts:183`, `pricing/index.ts` (17) và `pricing/rules.ts` (6). Các chuỗi về chính sách riêng tư, điều phối, đăng nhập, «Theo chính sách của Tour Đảo…», «Lưu chính sách» và câu ở `accounts:63` đều không bị bắt, đúng như các ca kiểm âm đã nêu.
- `index.ts:129` và `:535`: mảnh chuỗi «chính sách » không khớp mục nào. Vậy Chặn 1 của lần 2 đã được gỡ.
- Biên bản quyết định 7 viết «bảng từ lượt 4», trong khi đặc tả viết đúng là lượt 6. Biên bản là hồ sơ có ngày nên không sửa, nhưng nên ghi một dòng lệch cho người đọc sau.
- Dòng ở `rules.ts` đúng là `:338` («Mức cũ bắt đầu từ…»). Ở lần 2 tôi ghi `:339` là tôi ghi sai.

**Đối chiếu lần 2:**
- Mục 2: đã sang lượt 6 (lượt 4 ở dòng 40, lượt 5 ở dòng 43), và dòng 39 nay nằm trong danh sách viết lại.
- Mục 3: tiêu chí 8 nay khớp `moBangTruot` (`bang-truot.ts:70`).
- Mục 4: hết câu hỏi vì quyết định 7 đã chốt.
- Mục 5: huy hiệu đã thêm «và đối tác».
- Mục 6: đã ghi `vaiMo` của L1, thêm bộ mẫu S' riêng, thêm L15.
- Mục 7: (a) đã trỏ đúng §12 câu 2; (b) đã có mục «Tệp được chạm», không có `rules.ts`; (c) đã thêm HDV và tài khoản lai; (d) đã ghi giới hạn khi cấp cũ đang khoá, kèm câu cố định trong hộp. Mã 409 `muc_tat` đi qua `loiBang` ở `index.ts:72`.
- Mục 8: đã thành lệch có tên theo quyết định 9.

**Danh sách «Tệp được chạm»** đủ so với dấu chân của route anh em `/muc-ta/gan/:id/doi`. Route anh em xuất hiện ở `index.ts`, `rules.ts`, `doi-chinh-sach.test.ts`, `so-dai-ly-quyen-route.test.ts`, `route-access.test.ts`, `lan-gui-phu-route.test.ts` và `SYSTEM-DESIGN.md`. Route mới dùng lại `kiemThanDoiChinhSach` nên không cần đụng `rules.ts`.

Tôi không thấy chỗ mâu thuẫn mới nào khác ngoài Chặn 1.

### Checks run

- Đọc `git diff 353230c2 3d9f26bb` (word-diff) cho ADR, DAC-TA và DOI-CHIEU. Đọc thêm `QUYET-DINH-CHU-2026-10-30-LAN-3.md`.
- Chép nguyên văn `chuoiTrongMa`, `chuTrongHtml`, `tepTs` từ `src/bang-tu-giao-dien.test.ts` sang một kịch bản tạm ở `/tmp/qa1r3/`, dùng đúng danh sách tệp và tệp miễn (`TEP`, `NGOAI_LE`) của bài. Ba biểu thức được đọc thẳng từ `DAC-TA.md:268–270` (đổi `\|` thành `|`). Chạy bằng `node --experimental-strip-types` trên Node 22.
- Kết quả: 104 chuỗi; 8 chuỗi khớp hai biểu thức; 0 khớp nhầm. In thêm mọi chuỗi có chữ «chính sách» mà không biểu thức nào khớp, để tìm chỗ lọt (danh sách ở Chặn 1).
- Tìm mọi tệp nhắc tới route `/muc-ta/gan/:id/doi` để so với «Tệp được chạm». Kiểm `rules.ts:335`, `:338`, và `index.ts:72`.
- Không sửa tệp nào trong kho, không đổi trạng thái git (`git status` sạch). Chỉ ghi tệp tạm dưới `/tmp`.