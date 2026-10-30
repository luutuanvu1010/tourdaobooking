# QA1 lần 4 — đặc tả bản 4 (2026-10-30)

Hồ sơ có ngày, không sửa. Kiểm phạm vi hẹp diff 516e1700..37c6638c. Kết luận: ĐẠT — đặc tả bản 4 và ADR-0151 bản 2 qua cổng QA1.

### Verdict: ĐẠT

Lỗ hổng của lần 3 đã được vá. Luật cấm chữ mới đi theo bộ 14 tệp hoa hồng, và tôi chạy lại bằng đúng bộ quét `chuoiTrongMa` của bài kiểm thì ra đúng con số đặc tả ghi: 129 chuỗi (142 lần khớp), cộng 2 chuỗi được miễn. Cả 25 chuỗi bị lọt ở lần 3 nay đều bị bắt, và không có chuỗi nào ngoài phần hoa hồng bị bắt nhầm. Danh sách miễn với mảnh «chính sách » đếm đúng 2 lần là làm được như mô tả. Tôi không thấy mâu thuẫn mới, nên đặc tả bản 4 qua cổng QA1.

### Chặn

Không có.

### Sửa

Không có.

### Ghi

- Đã đo, không chặn: lấy trọn tệp có rủi ro. Nếu sau này `audit-actions.ts`, `web/parties.ts` hay `huong-dan-ke-toan.ts` có thêm một chuỗi «chính sách» không thuộc hoa hồng và cũng không có «riêng tư», «điều phối» hay «đăng nhập» theo sau (ví dụ «chính sách huỷ»), luật sẽ báo đỏ. Hôm nay ba tệp này không có chuỗi nào như vậy, vì các chuỗi của chính sách riêng tư, điều phối, đăng nhập ở `audit-actions.ts:159–161`, `:192`, `:309` đều được lookahead cho qua. Khi chuyện đó xảy ra thì người làm phải nới luật có chủ đích. Nên ghi một câu như vậy ngay cạnh `CAM_THEO_TEP`.
- Ca dương «đặt vào một tệp giả nằm trong bộ tệp» đòi hàm kiểm của bài nhận đầu vào là (đường dẫn tệp, nội dung). Bài hiện tại chỉ đọc tệp thật trên đĩa. Người thi công nên tách hàm kiểm ra ngay từ đầu. Đây là chi tiết cách làm, không cần đoán gì về luật.
- Câu «`:221` hôm nay chưa bài nào ghim» là đúng. Chỗ duy nhất có chữ «đã tắt rồi» là `docs/evidence/2026-10-14-loai-doi-tac/kich-ban/loai-doi-tac-smoke.mjs:39`, và đó là câu của loại («Loại này đã tắt rồi»), không phải của cấp. Câu `:69` đang được ghim ở `gan-rieng-route.test.ts`, câu `:454` ở `doi-chinh-sach.test.ts`, khớp đặc tả.

**Kết quả các điểm được giao kiểm:**
- (1) Chặn 1 của lần 3: đã gỡ. Sửa 2: con số mới 129 chuỗi / 142 lần khớp đúng như đo. Sửa 3: ca dương chỉ còn các câu có chữ «chính sách»; ba câu `:69`, `:221`, `:454` đã có bài riêng ghim nguyên văn.
- (2) Mỗi tệp ra đúng số đặc tả ghi: `parties.ts` 30, `hoa-hong-hop.ts` 25, `hoa-hong-hien-thi.ts` 18, `pricing/index.ts` 17, `hoa-hong-thiet-lap.ts` 11, `hoa-hong-bang.ts` 10, `audit-actions.ts` 9, `rules.ts` 6, `huong-dan-ke-toan.ts` 2, `so-dai-ly-nhap.ts` 1. Cả 25 chuỗi lọt ở lần 3 đều có mặt, kể cả `audit-actions.ts:110`. Mọi chuỗi bắt được trong ba tệp lấy trọn đều là chữ hoa hồng.
- (3) Danh sách miễn làm được: ở `pricing/index.ts`, `chuoiTrongMa` trả đúng mảnh `"chính sách "` (có dấu cách cuối), một lần ở dòng 129 và một lần ở dòng 535, và trong tệp này không còn mảnh nào khác trùng nguyên chuỗi đó. Vì vậy điều kiện khớp nguyên chuỗi với số lần đúng 2 được thoả.
- (4) Không có mâu thuẫn mới. Sau phần 1, hai mục 6a và 6b toàn cục đòi về 0 trên mọi tệp. Hôm nay chúng chỉ bắt chuỗi trong các tệp hoa hồng (đo ở lần 3), nên đòi hỏi đó nhất quán với luật theo tệp.

### Checks run

- Đọc phần đổi chữ của `git diff --word-diff 516e1700 37c6638c`; bản này chỉ đổi `DAC-TA.md`.
- Viết một kịch bản tạm ở `/tmp/qa1r3/r4.ts`, chép nguyên văn hàm `chuoiTrongMa` từ `src/bang-tu-giao-dien.test.ts`, chạy bằng `node --experimental-strip-types` (Node 22). Bộ tệp gồm `web/hoa-hong*.ts` (6 tệp), `web/parties.ts`, bốn tệp `src/shared`, và ba tệp `src/modules/pricing` không phải bài kiểm (`index.ts`, `repository.ts`, `rules.ts`), tổng 14 tệp.
- Dùng đúng biểu thức chính quy và đúng mục miễn như đặc tả. Kết quả: 129 chuỗi, 142 lần khớp, miễn 2 (dòng 129 và 535, mảnh `"chính sách "`).
- Dò từng dòng trong 25 chuỗi của lần 3: đều bị bắt. Rà tay mọi chuỗi bắt được trong `parties.ts`, `audit-actions.ts`, `huong-dan-ke-toan.ts`: không có chuỗi nào ngoài hoa hồng.
- Tìm xem bài nào đang ghim các câu `:69`, `:221`, `:454`. Không sửa tệp nào trong kho, `git status` sạch.