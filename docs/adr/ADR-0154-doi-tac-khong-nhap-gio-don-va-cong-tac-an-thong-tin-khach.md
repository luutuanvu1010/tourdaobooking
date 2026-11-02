# ADR-0154 — Đối tác không nhập giờ đón; công tắc ẩn thông tin khách khi đối tác đặt vé

- **Trạng thái:** Đề xuất (2026-11-02), viết lại sau kiểm độc lập, chờ chủ dự án duyệt. Chưa có mã. Hai câu ở mục «Câu chờ chủ quyết» chưa chốt.
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-B, §8 (chủ duyệt thiết kế 2026-11-02, nguyên văn «Duyệt thiết kế»; thiết kế nói rõ mỗi quyết định vẫn qua ADR riêng). Trang ghép: `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`. Dẫn chứng từng lỗi đã sửa: `docs/superpowers/specs/2026-11-02-ket-qua-kiem-adr-0154-0155.md`. Văn bản đề xuất kiểm một vòng nên bản này không kiểm vòng hai; thi công có người kiểm riêng.
- **Lệch chữ đặc tả, ADR này thắng:** luật giờ xét chặng đầu của dịch vụ, không xét chiều đi; Còn vé chỉ từ chối yêu cầu mang cờ; lúc xếp `THIEU_TEN` vốn chỉ cảnh báo; dấu đọc qua hàm hẹp, không qua view.
- **Số:** 0154 kiểm còn trống 2026-11-02 trên `main` và mọi nhánh trong máy. Migration dự kiến `0132`, kiểm lại lúc thi công.
- **Loại:** việc lớn (dữ liệu, quyền, luồng xác nhận, tiền). **Không đổi cách tính tiền, nhưng dời mốc:** đơn có đón của đối tác nay chụp hoa hồng lúc Còn vé thay vì lúc gửi đơn; mã QR, ảnh xác nhận và cấp vé chờ tới lúc đó. **Cửa:** Đ1 hai chiều về hành vi. Đ2, Đ3 một chiều mềm: bảng chính sách và hai cột mới chỉ thêm, ở lại; công tắc tắt được, đơn đã mang dấu giữ dấu; tên khách thật của các đơn đó không khôi phục được.
- **Số quyết định chạm quyền/dữ liệu:** đếm theo điều như trang ghép 24/10 và 25/10, lượt này có **5 điều** (ADR-0154 Đ1, Đ2, Đ3; ADR-0155 Đ1, Đ2), trần là 3, và Đ1 tự nó gồm ba thay đổi về quyền hoặc luồng (mục 2, 4, 5). Chủ chọn phương án «Cho vượt mức, trình cả hai» ở hộp hỏi 2026-11-02.
- **Xây trên lỗ đang hở:** không. `TNV-G1`, `TNV-G3`, `TNV-G4` thuộc sổ tiền, `HC-5.19` thuộc khôi phục dữ liệu, `HC-5.11` thuộc tác vụ tự động, `HC-4.2` thuộc bút toán điều chỉnh (`docs/quyen-hoan.json`, người kiểm đối chiếu 2026-11-02).
- **Hiến chương (6.1):** áp 5.6 (dấu và cờ chụp tại mốc), 5.7 (đơn chờ vì thiếu giờ). **Lệch có chủ ý, chỉ hợp lệ khi chủ duyệt:** 5.7 ở Đ3 (đơn có dấu không bị giữ vì thiếu tên, vì chủ chọn «Bỏ luật với đơn của đối tác»); 5.1 ở Đ1 (một lớp máy chủ, kiểm định kỳ mức cảnh báo thay lớp thứ hai). Người thi công đối chiếu thêm 5.21 cho việc dùng SĐT đối tác làm liên hệ chuyến.
- **Quan hệ với ADR cũ:** **mở rộng** ADR-0136 Đ13.3 (thêm một lý do đi nhánh A), **thu hẹp** Đ13.4; không đổi Đ1 và `tinhCanXacNhan`. **Mở rộng** ADR-0136 Đ7, ADR-0107, ADR-0049 D2 (Còn vé nhận đặt gấp theo chặng). **Sửa một phần** ADR-0134 Đ6 (thêm người đọc khung giờ), Đ7 (đối tác không còn hàng khung). **Ngoại lệ có tên** của luật `THIEU_TEN` (ADR-0049) cho đơn mang dấu. **Giữ** ADR-0135 Đ2, ADR-0136 Đ6, Đ13.5, ADR-0047 R1, R2b, ADR-0052 D5b, vé điện tử (ADR-0153). ADR-0053 và ADR-0049 D3 giữ luật, nhưng số liên hệ tới HDV và tài xế là số đối tác khi công tắc BẬT. Tiền lệ máy chủ ép trường: ADR-0077 đ3.

## Bối cảnh

Chủ muốn đối tác bên ngoài đặt vé bằng vài thao tác, văn phòng lo phần còn lại. Ba phương án chủ chọn ở hộp hỏi 2026-11-01, 2026-11-02: «Ghi chú thay giờ đón», «Ẩn cả danh sách hành khách», «Bỏ luật với đơn của đối tác». Lượt 1 đã ẩn «Thông tin chuyến» và thêm dòng Ghi chú, nhưng khung giờ ở Đưa đón còn nguyên.

Chủ 2026-11-02, sau khi người soạn nêu rủi ro đơn có đón mà không giờ, nguyên văn: *«Phần ghi chú gợi ý Thời gian đón là đúng ý, phần khung giờ bị bỏ trống là 1 chủ ý thiết kế, và cả phần "Hành khách" để nhập danh sách khách khởi hành thì cũng tạm thời cho phép bật /tắt ở trong bảng điều khiển của Super Admin, lý do là để làm cho bước 1 thực sự đơn giản và làm quen với người mới. Sau 1 thời gian thì có thể sẽ bật lại hiển thị phần nhập danh sách hành khách.»*

Hôm nay đơn có Đón mà không giờ được coi là không dưới mốc (`src/shared/moc-toi-thieu.ts`) và form không đòi giờ (`src/shared/chang-form.ts`). Nếu dịch vụ không đánh dấu cần xác nhận, đơn đó xác nhận thẳng. Đối tác bỏ trống giờ là chủ ý; Đ1 đặt việc chốt giờ về phía văn phòng, không đòi đối tác nhập.

## Quyết định

**Đ1. Giờ đón: đối tác ghi vào Ghi chú, văn phòng chốt giờ ở bảng Còn vé.** Áp cho mọi tài khoản giữ quyền Đối tác, không công tắc.

1. Khối Đưa đón của đối tác còn Đón / Không đón, Nơi đón, Nơi trả. Bỏ khung giờ và ô giờ. Phí đón theo nơi không đổi.
2. **Luật mới ở nhánh Gửi đơn:** người lập giữ quyền Đối tác và **chặng đầu tiên của dịch vụ** chọn Đón mà chưa có giờ, không phân biệt chiều, thì luôn vào nhánh A, dù dịch vụ không đánh dấu cần xác nhận. Lúc gửi, máy chủ chụp cờ «cần chốt giờ» vào `ord_confirm_request`. Đơn Không đón không đổi nhánh. Luật này không đưa vào `tinhCanXacNhan`, nên đơn văn phòng không đổi.
3. **Bảng Còn vé** hiện ghi chú dịch vụ ngay trên khối giờ và liệt kê cả chặng chưa có giờ. Chặng đầu chưa có giờ có ô chọn khung hoặc tự gõ, bắt buộc; các chặng khác hiện để sửa, không bắt buộc. Máy chủ từ chối Còn vé (409, câu tiếng Việt) chỉ với yêu cầu mang cờ mà chặng đó còn thiếu giờ. Yêu cầu không mang cờ đi như hôm nay.
4. **Giờ nhập còn dưới 6 tiếng:** Còn vé nhận thêm `datGap` theo từng chặng, kiểm ô `order.leg.short_notice`, dựng dấu qua `xetDatGapSua`; ghi giờ, dấu và xác nhận trong một lô. Người xét không có ô đó (Kế toán, HDV nội bộ) vẫn nhận 409 như hôm nay và nhờ Bán hàng hoặc Quản trị bấm. Thiếu mục này thì đơn đi trong ngày kẹt ở nháp: nút Đặt gấp đọc giờ đã lưu là rỗng nên cũng từ chối.
5. **Route khung giờ** `GET /api/cai-dat/khung-gio-don` mở thêm cho `order.confirm.review`, vì ô giờ nay bắt buộc mà người xét không lập đơn đang nhận 403 và dùng bộ mặc định.
6. Ghi chú dịch vụ đã có trong dữ liệu người xét đọc được. Riêng đơn do tài khoản Đối tác lập, người xét không phải người lập nhận ghi chú đã che dãy số dài (`maskLongDigits`), giữ đúng ý ADR-0136 Đ6; đơn văn phòng không đổi.
7. **Đối tác gửi thẳng giờ qua API** không phải lỗ: giờ đó vẫn qua cổng 6 giờ. Đơn nháp của đối tác không có đường xác nhận nào khác (người khác 404, người lập 409), **trừ** tài khoản đã thôi giữ quyền Đối tác khi đơn còn nháp: `/status` của họ chạy như hôm nay. Chấp nhận, có kiểm `audit-invariants` mức cảnh báo cho đơn đã xác nhận mà chặng đầu có Đón không giờ. Bài kiểm ghim cả hai vế.

**Đ2. Công tắc «Ẩn thông tin khách khi đối tác đặt vé».**

1. **Mặc định TẮT**, nên phát hành không đổi gì cho tới khi Toàn quyền bật. Chỉ ô `settings.ops`. Đặt ở trang Tôi, cạnh «Dịch vụ nhập tay», vì Nền tảng chưa có trang bảng điều khiển chung của Toàn quyền (trang mang tên đó chỉ dành cho Trợ lý); bảng chính sách chỉ thêm theo khuôn `ord_confirm_policy`; có nhật ký.
2. Khi BẬT, tài khoản giữ quyền Đối tác không thấy khối Khách hàng và khối Hành khách ở form Tạo đơn. Ngày khởi hành giữ nguyên. Tài khoản lai: xem câu C2.
3. **Máy chủ quyết, không tin trình duyệt.** Lập đơn mới khi BẬT: bỏ tên và SĐT gửi lên, điền từ tài khoản; email, ghi chú khách trống; bỏ khoá `passengers` và `newBooker`; `bookerPartyId` đi theo luật ép có sẵn, ngoài luật thì bỏ. Tài khoản không có hồ sơ: 409 `partner_no_party`, vì nếu không biên nhận sẽ ghi «(chưa có hồ sơ)». `PUT` nháp: giữ bốn trường đang lưu (tên, SĐT, email, ghi chú khách), bỏ `passengers`. Đổi công tắc không chạm đơn cũ. Form đang ẩn mà công tắc vừa tắt: nhận lỗi thiếu tên thì đọc lại công tắc và hiện khối.
4. Thực tập, Bán hàng và mọi tài khoản không giữ quyền Đối tác: không đổi. Đối tác chỉ bổ sung được danh sách hành khách sau khi đơn đã xác nhận (đơn nháp 409 `use_order_form`), không sửa được tên liên hệ. «Đổi khách», «Sửa danh sách khách» của văn phòng: không đổi.
5. **Đây là biện pháp tạm** để bước đầu đơn giản, giúp người mới làm quen. Tắt công tắc thì form hiện lại hai khối đó với đơn mới, và đơn lập sau lúc tắt không mang dấu của Đ3.

**Đ3. Miễn luật thiếu tên cho đơn lập lúc công tắc BẬT.**

1. Đơn do tài khoản giữ quyền Đối tác lập khi công tắc BẬT mang dấu `orders.manifest_exempt = 1`, chụp lúc lập; đổi công tắc sau đó không đổi dấu đơn cũ. Tài khoản lai: xem câu C2.
2. Chặng của đơn có dấu không bị giữ `THIEU_TEN` lúc xuất bến. Miễn ở lời gọi trong `kiemXuatBen`, không sửa `lyDoThieuTen`. Lúc xếp, `THIEU_TEN` vốn chỉ cảnh báo, giữ nguyên. `THIEU_SUAT`, `KHACH_DA_DOI` vẫn giữ xe như mọi đơn. `THIEU_TEN` chỉ ở lớp máy chủ, không có trigger.
3. **Không ghi đạt giả:** `kiemXuatBen` trả thêm danh sách nhắc, không chặn. Chi tiết chuyến ghi «Miễn danh sách» ở dòng «Đủ tên khách». Câu «cần đủ trước khi xe chạy» trên trang đơn đổi chữ với đơn có dấu.
4. **Đường đọc:** thêm một khoá vào `lichChungChang` và `ChangVao`; `OrderDetailDto` thêm cờ. Không sửa `v_ord_order_flag`, vì trigger đang đọc view này. Mọi đơn khác và cờ `require_manifest` không đổi. Sửa cột luật của dòng xuất bến ở bảng sự kiện vận chuyển.

## Câu chờ chủ quyết

**C1. Đối tác để trống Ghi chú thì văn phòng lấy giờ ở đâu?** Người xét hôm nay chỉ thấy tên người lập, không thấy số. Ở hộp hỏi 2026-11-02 chủ chọn «Quyết khi duyệt».
- **Khuyến nghị:** người xét thấy SĐT của đối tác lập đơn, không phải SĐT khách; form nhắc ghi giờ, không bắt buộc. Đổi lại thêm một nhóm người thấy số đối tác.
- Cách khác: bắt buộc Ghi chú khi chọn Đón. Không mở số, nhưng thêm một thao tác, và ghi mơ hồ vẫn phải hỏi lại.

**C2. Có nhân viên bán hàng nào cũng được cấp quyền Đối tác không? Nếu có, họ có bị ẩn thông tin khách và miễn tên không?** Đặc tả §7 ghi là có, tức đơn bán cho khách thật của họ cũng mang tên họ và được miễn danh sách. Chưa kiểm production có tài khoản như vậy hay không; không có thì câu này chỉ còn là luật dự phòng.
- **Khuyến nghị:** tài khoản lai vẫn nhập thông tin khách, không mang dấu miễn; Đ1 vẫn áp.
- Cách khác: ẩn như đối tác, đúng chữ đặc tả.

## Rủi ro chủ đã chấp nhận

- Khi công tắc BẬT, tên khách trên biên nhận và SĐT liên hệ trên chuyến là của đối tác; danh sách hành khách có thể trống cả khi xe chạy. Quy định xe hợp đồng đòi danh sách hành khách (nguồn tra 2026-09-27, chưa có luật sư xác nhận). Chủ nghe hệ quả ngày 2026-11-02 và vẫn chọn «Bỏ luật với đơn của đối tác».
- Từ lúc lượt 1 phát hành tới khi Đ1 lên, đơn có Đón mà không giờ vẫn xác nhận thẳng được nếu dịch vụ không đánh dấu cần xác nhận, và không qua mốc 6 giờ. Người soạn đã nêu ngày 2026-11-02; lời chủ ở phần Bối cảnh.

## Hệ quả chủ cần biết khi duyệt

Mọi đơn có đón của đối tác đều phải chờ văn phòng chốt giờ, vì Đ1.1 đã bỏ ô giờ. Kể cả vé Hòn Tằm: chủ 25/10 nói không cần xác nhận thủ công (ADR-0136), nay có đón thì cũng chờ. Mã QR, ảnh xác nhận, cấp vé chờ theo. Đồng hồ hạn xác nhận nghỉ từ 22:00 tới 06:00. Tin báo gửi mọi người giữ ô xét duyệt (ADR-0136 Đ9, Đ10). Đó là việc thêm cho văn phòng, đổi lại không có đơn thiếu giờ.

## Để lại cho người thi công

Ghi kép cột cũ theo chặng đi đầu (`R-ORD-7`), không ghi theo mọi chặng đi. Viết lại `src/shared/huong-dan-doi-tac.ts` khi Đ1, Đ2 lên. Khoá phí đón theo giờ dự kiến sau này (ADR-0147) sẽ vướng vì đối tác không có giờ. Gửi đơn và Còn vé nằm trong bốn route đang đỏ `H5` của e2e; việc riêng đó phải xong trước lần phát hành kế tiếp.

## Tiêu chí nghiệm thu

Đặc tả §8 mục QĐ-B (a) tới (h) và phần Chung, đọc theo các lệch ở đầu trang, cộng:

- (i) Đơn đi trong ngày, nhập giờ còn 2 tiếng: Còn vé kèm đặt gấp 200 với người có ô, 409 với người không có ô; không có dấu nào nếu giờ trên 6 tiếng.
- (j) Đơn văn phòng có cờ, không giờ: Còn vé 200 như hôm nay.
- (k) Đơn chỉ có chiều về, không giờ: đối tác gửi đơn vào nhánh A.
- (l) Tài khoản thôi quyền khi đơn còn nháp: xác nhận được, kiểm định kỳ báo cảnh báo.
- (m) Kế toán xét đọc đúng khung đang cài; Toàn quyền đổi khung thì ô không báo sai.
- (n) BẬT: `newBooker` không tạo hồ sơ; tài khoản không hồ sơ 409; `PUT` giữ bốn trường; form tự hiện lại khi công tắc vừa tắt.
- (o) Chi tiết chuyến của đơn có dấu ghi «Miễn danh sách», không ghi đạt.

Sửa cố ý để dấu đọc theo công tắc hiện hành thì bài đỏ rồi hoàn nguyên (P16). Thi công xong phải có người kiểm độc lập.
