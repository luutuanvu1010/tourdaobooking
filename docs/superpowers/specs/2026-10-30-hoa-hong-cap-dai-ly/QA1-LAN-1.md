# QA1 lần 1 — đặc tả Hoa hồng cấp đại lý bản 1 (2026-10-30)

Hồ sơ có ngày, không sửa. Người kiểm độc lập (subagent), chỉ đọc.

### Verdict: KHÔNG ĐẠT

Phần lớn chỗ đặc tả trích mã là đúng. Tôi dò 30 chỗ (tệp:dòng, route, bảng). Các route trong `src/modules/pricing/index.ts` khớp đúng từng số dòng. Thứ tự áp mức ở Q-2 (bậc 1–3 → 10–12 → 4–6 → 7–9) khớp `chonMuc` (`rules.ts:94–131`). Nhận định về `web/hoa-hong-bang.ts:214` cũng đúng. Dù vậy đặc tả chưa qua cổng QA1, vì bốn chỗ người thi công vẫn phải tự đoán. Có chỗ đoán sai sẽ làm tiền lệch, có chỗ buộc phải sửa phần máy chủ dù mục đó được xếp loại A. Cụ thể: thẻ «Riêng từng đối tác» cần dữ liệu mà danh sách hiện không trả về; «chuyển cấp riêng» đang đi nhờ đường «Sửa» (vốn là đường sửa sai, bắt ghi lý do, có thể huỷ dòng cũ); luật đếm của dải cảnh báo vẫn còn đúng loại lỗ hổng mà nó định vá; và phương án A của Câu 3 mâu thuẫn với tiêu chí 9. Đặc tả cũng chưa tính tới việc chủ đã tạm dừng đợt 0b, nên thi công đang bị chặn vô thời hạn.

### Chặn

1. **T30/T33/Q-9, thẻ «Riêng từng đối tác»: thiếu dữ liệu nhưng vẫn xếp loại A.** Bản vẽ có bảng «Đối tác | Nhóm khách hàng | Ngoại lệ | Mức | Áp dụng từ» (mẫu ở dòng 310–312 của `.dc.html`). Nguồn danh sách là `ghepDoiTacRieng` (`hoa-hong-hien-thi.ts:257`). Nguồn này chỉ có `partyId`, `ten`, `mucRieng`, `chinhSach`, không có loại đối tác của từng người. `xungDot` cũng chỉ có trong `HoaHongHoSoResponse` (`contracts.ts:2812`), tức là phải gọi `GET /ho-so/:id/hoa-hong` riêng cho từng đối tác. Thêm nữa, đối tác bị xung đột mà không có mức riêng hay cấp riêng thì hoàn toàn không có mặt trong danh sách. Người thi công sẽ phải tự chọn một trong ba cách: bỏ cột «Nhóm» và nhãn xung đột ở dòng (chỉ hiện khi mở một đối tác), gọi N lần, hoặc thêm route mới (loại B). **Sửa:** ghi rõ cách chọn vào Q-9/§3. Khuyến nghị: chỉ hiện khi mở một đối tác, bỏ cột «Nhóm» ở dòng. Nếu chọn route mới thì chuyển T30/T33 sang loại B.

2. **T31/Q-8, «đổi cấp riêng» bằng `POST /muc-rieng/:id/sua` không phải một lần chuyển cấp tới.** `kiemSua` (`rules.ts:289`) bắt lý do dài 10–300 ký tự (`docLyDoSua`). Khi chưa có đơn nào chụp, nó đi đường HUY_THAY: huỷ dòng cũ và thay hẳn, giữ ngày bắt đầu cũ hoặc tính từ hôm nay. Nhật ký ghi `prc_party_tier_voided`. Đây là đường sửa sai của ADR-0148 Đ1, khác hẳn «Đổi» của loại (`/muc-ta/gan/:id/doi` chạy gọn trong một lô). BACKLOG §50 cũng ghi «Chưa có «Đổi» cho chính sách riêng của đối tác». Cách thay thế là `ket-thuc` rồi `POST muc-rieng`, gồm hai lệnh không gói chung: lệnh thứ hai hỏng thì đối tác lặng lẽ quay về cấp của loại, tức là tiền đổi mà không ai hay. **Sửa:** nói thẳng đường nào được dùng và hậu quả của nó. Hoặc xếp lại thành loại B (route `/muc-rieng/:id/doi` mới, cần ADR nhỏ) và đưa thành câu hỏi chủ, phương án an toàn đứng đầu.

3. **Q-3/T4/T27, luật đếm «chưa có mức» vẫn bỏ sót phần phủ không đủ.** Một loại chỉ cần có *một* dòng mức riêng bất kỳ (ví dụ một dòng SERVICE cho một dịch vụ) là đã tính «có mức riêng», nên không bị đếm. Trong khi đó `chonMuc` sẽ trả NO_RULE cho mọi dịch vụ khác, và đơn bị giữ. Đây đúng là kiểu lỗi đang có ở `hoa-hong-bang.ts:214` (`coDongRieng(...) || cs !== null`). Riêng với cấp thì đặc tả đã chọn «ghi một dòng nhắc, không đếm», còn với loại thì không nói gì. Đặc tả cũng chưa định nghĩa «còn áp»: chỉ tính hôm nay, hay tính cả dòng sắp áp và lần xếp sắp áp. Ngoài ra, câu «đơn ... sẽ bị giữ» phát biểu quá rộng: đối tác mang thêm một loại khác có mức thì vẫn được hưởng (`nguoiHuongCua`, `rules.ts:61–74`; bậc 4–9 xét mọi loại của hồ sơ). **Sửa:** viết luật chính xác cho cả loại và cấp (đếm hay chỉ nhắc khi phủ không đủ; tính theo ngày nào), sửa câu thành «đối tác chỉ mang loại này…», và ghi số đếm mong đợi cho từng ca ở tiêu chí 3.

4. **Câu 3 phương án A (đang khuyến nghị) mâu thuẫn với tiêu chí 9.** Các câu báo lỗi của máy chủ dùng chữ «chính sách riêng» và «chính sách»: `src/modules/pricing/index.ts:570, 591, 599` («Không tìm thấy chính sách riêng này.»), các câu 409 «Chính sách riêng này vừa được…», và `MUC_KHONG_CO`. Tiêu chí 5 lại bắt «400/409 hiện nguyên câu máy chủ». Nếu đổi sang «Cấp riêng» thì trên cùng một màn có hai chữ cho một nghĩa, trái luật một nghĩa một chữ (Q1 = A ngày 25/10). Muốn sửa thì phải chạm `src/modules/`, mà tiêu chí 9 cấm. Hướng dẫn nằm ở `src/shared/huong-dan-ke-toan.ts` và `huong-dan-quan-tri.ts`, chỗ này không bị cấm, nhưng nên kể tên trong đặc tả. **Sửa:** Câu 3 A phải nói rõ là cần sửa chữ ở máy chủ (nới tiêu chí 9 cho các chuỗi báo lỗi), hoặc thêm lớp đổi chữ ở `web/`, hoặc bỏ yêu cầu «hiện nguyên câu».

### Sửa

5. **§6, phụ thuộc đợt 0b đã lỗi thời.** Đặc tả ghi «đã duyệt, chưa gộp ... thi công sau khi 0b vào main», nhưng chủ đã dừng 0b. Tôi đã đo, việc làm trên `main` ngay bây giờ là khả thi, và chi phí gộp sau thấp:
   - 0b (`dot-0b-khung-tai`, 29 lần lưu) không chạm `web/hoa-hong*.ts` hay `src/shared/hoa-hong-hien-thi.ts`.
   - Với `public/hoa-hong.html`, 0b chỉ đổi tên tệp sang `web/html/hoa-hong.html` (giống 65%): bỏ phần head, thêm `data-khung="co"`. Khi phần thân đã viết lại thì máy khó nhận ra đó là đổi tên, nên phải chuyển tay khoảng 26 dòng.
   - `app.css` chỉ đổi 49 dòng ở bộ chọn khung (`body:is(.has-sidebar, [data-khung="co"])`), không đụng `.nut`, `.tab-phu`, `.bang`.
   - `build:web` được thay bằng `scripts/dung-web.mjs`. Bản thiết kế lại không thêm tệp vào mới nên không phải khai.
   - Cần sinh lại `src/shared/so-do-trang.ts` và `src/muc-giao-dien-hien-trang.json` (vì tên thẻ và tên nút đổi), xem lại khung xương `bang-dieu-khien` mà 0b gán cho `/hoa-hong` (`src/shared/khuon-trang.ts` của 0b), và đo lại cỡ gói của 0b.
   - Bằng chứng bố cục (tiêu chí 8, bộ đo Chặng 1) phải chạy lại sau khi 0b vào `main`, vì 0b đổi khung.

   **Sửa:** biến thành một quyết định đảo ngược được hoặc một câu hỏi chủ: «làm trên main ngay, chuyển sang web/html khi 0b gộp, chạy lại tiêu chí 8 sau 0b» (khuyến nghị), hoặc «chờ 0b».

6. **T14/Câu 1, gọi N-23 là «luật đã duyệt» là sai sự thật.** N-23 chỉ là *giả định kế hoạch* (`docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md:75`). Nhật ký thi công ADR-0117 lần 2 vẫn để «Việc treo chờ chủ» mục 3: «Chốt ý nghĩa «tắt mức» (N-23)». ADR-0117 không có câu nào về nghĩa của tắt cấp, và `contracts.ts` cũng ghi «giả định kế hoạch, N-23». **Sửa:** ghi rằng Câu 1 là lần đầu chủ chốt N-23, và sửa câu ở phương án B («sửa câu ruling N-23 / ADR-0117 lần 2»). Phương án C vẫn cần ADR, vì nó đổi `chonMuc`.

7. **T5, trích ADR-0077 chưa đủ.** Phần «Tóm tắt cho chủ» mục 4 của ADR-0077 viết «giữ ... cho tới khi Kế toán **cài mức** hoặc ghi mức tay». Trong khi điều 9 và mã (`orders/index.ts:957`, chụp bù trả 409 khi đơn đã có bản chụp; ngoài ra không có đường chụp lại khi thêm mức) cho thấy cài mức *không* thả đơn cũ. Kết luận của đặc tả đúng theo mã, nhưng nên ghi chỗ lệch này vào sổ lệch của ADR-0077, vì chủ có thể đã hiểu theo câu tóm tắt.

8. **Q-7/tiêu chí 4, chưa có câu chữ cố định.** Câu trong hộp hỏi lại khi tắt cấp và tắt loại mới chỉ có ví dụ («vd ...»), nên tiêu chí 4 không kiểm được. T29 viết «giữ đơn mọi đối tác của loại» là quá rộng (đối tác mang thêm loại khác vẫn được hưởng). **Sửa:** viết nguyên văn hai câu hậu quả.

9. **Q-6, nút menu «⋯» là mẫu giao diện mới.** Trong `web/` chưa có thành phần menu bật ra nào (chỉ có `aria-haspopup="dialog"` ở `home.ts` và `tro-ly.ts`), và nó cũng không có trong danh sách Q-10. Đây là phần việc ẩn, và luật dự án (§8) cấm thêm mẫu mới khi chưa có quyết định. **Sửa:** hoặc dùng `moBangTruot` làm menu, hoặc ghi rõ đây là thành phần mới, kèm bài kiểm bàn phím và aria.

10. **Q-6, ba việc Đổi/Sửa/Ngừng không có đủ cho mọi đối tượng.** Dòng mức có cả ba. Lần xếp loại vào cấp có doi, sua, ket-thuc. Cấp riêng của đối tác chỉ có sua và ket-thuc. Đặc tả cần ghi bảng «đối tượng → việc nào có».

11. **§3, Tra nhanh «Xem dòng ↓».** `cuonToiDong` (`hoa-hong-bang.ts:261`) dựa vào `.hh-lo`, `.hh-dt`, `data-loai` và hai thẻ cũ. Khi có ba thẻ thì dòng của cấp, của loại, của đối tác phải nhảy sang thẻ nào? Đặc tả chưa nói, nên chữ «giữ nguyên hành vi» chưa đủ để làm theo.

12. **Tiêu chí 3:** thiếu số mong đợi cho từng ca, và thiếu ca «cấp chỉ có dòng sắp áp», «loại chỉ có dòng nhóm hoặc một dịch vụ».

### Ghi

- DOI-CHIEU có những chỗ ghi `:N` trần, đọc liền thì tưởng là tệp vừa nhắc, nhưng thật ra trỏ sang `hoa-hong-hien-thi.ts`: T12 `:104`, `:244` (đứng sau `rules.ts`); T17 `:193`, `:205`, `:226` (đứng sau các route của index.ts). Số dòng đều đúng, chỉ là trỏ khó hiểu.
- T35: `.nut` bắt đầu ở dòng 3943, không phải 3946. T3: tên cấp dài 2–60 ký tự (`rules.ts:374`), không phải «≤ 60».
- T4 «mẫu bản vẽ đếm 7»: chưa kiểm.
- Tiêu chí 2 mới ghim một câu cố định. Bài sẽ chắc hơn nếu dựng ca bằng `chonMuc` (bậc 10–12 thắng 4–6; có cấp riêng thì bỏ 7–9; có ca RULE_CONFLICT) rồi đối chiếu với câu.
- Luật thuần mới của Q-3 là một bản suy gần đúng của `chonMuc` để cảnh báo. Nên có bài đối chiếu với `chonMuc` để hai bên không lệch nhau.
- Q-8: `/nguoi-huong` trả tối đa 20 kết quả và chỉ trả hồ sơ đang mang loại được hưởng còn bật (`repository.ts:93–96`). Cổng là `order.create || partner.commission.write`, nên Kế toán dùng được.
- Đúng như đặc tả nói: `docs/quyen-hoan.json` không có mục nào về giá hay hoa hồng; quyền xem/ghi ở `permissions.ts:161–162` khớp §4.

### Checks run

- Đọc trọn DAC-TA.md và DOI-CHIEU-MOCKUP.md. Lọc chữ của bản vẽ `.dc.html` bằng `python3 -I`, không chạy tệp, có xem dữ liệu mẫu ở dòng 277–329.
- So `chonMuc`/`nguoiHuongCua` (`rules.ts:55–131`) với Q-2/T12. So `kiemSua`/`kiemNgung` (`rules.ts:~280–330`) với Q-8/T31.
- Dò cả 30 route của pricing (grep `route(`). Đọc thân `/hoa-hong`, `/loai-doi-tac`, `/muc-ta*`, `/ho-so/:id/*`, `/muc-rieng/*`, `/nguoi-huong`, và `hoaHongHoSo` (`index.ts:130–200`).
- Đọc `hoa-hong-hien-thi.ts:40–314` (khớp mọi số dòng được trích), `hoa-hong-bang.ts:180–283`, `contracts.ts:2755–2830`, `repository.ts:93–140`, `permissions.ts:158–164`, `orders/index.ts:950–962`.
- Đọc trigger của các migration 0090, 0096, 0118, 0126. Kiểm `app.css` dòng 3943–4006.
- Đọc ADR-0077 (tóm tắt, điều 6, 8, 9), ADR-0117, ADR-0148 (trạng thái, Đ1/Đ2), BACKLOG §50–51, đặc tả 25/10 dòng 7 và 18–19, đề bài 29/10 mục 3.6–3.9; lần theo nguồn gốc N-23 qua kế hoạch và nhật ký thi công.
- `git diff main...dot-0b-khung-tai` theo tên tệp, cho `hoa-hong.html`, `app.css`, `shell.ts`, `package.json`; đọc `dung-web.mjs` và `khuon-trang.ts` của 0b.
- Grep chữ «chính sách riêng» trong `src/modules`, grep menu bật ra trong `web/`, và kiểm `git ls-files` thấy đủ các kịch bản chạy lại được kể tên.
- Không sửa tệp nào, không đổi trạng thái git.