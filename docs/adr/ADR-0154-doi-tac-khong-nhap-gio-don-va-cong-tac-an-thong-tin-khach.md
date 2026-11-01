# ADR-0154 — Đối tác không nhập giờ đón; công tắc ẩn thông tin khách khi đối tác đặt vé

- **Trạng thái:** Đề xuất (2026-11-02), chờ chủ dự án duyệt. Chưa có mã.
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-B, §8 (chủ duyệt thiết kế 2026-11-02, nguyên văn «Duyệt thiết kế»; thiết kế nói rõ mỗi quyết định vẫn qua ADR riêng). Trang ghép lượt duyệt: `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`.
- **Số:** 0154 kiểm còn trống 2026-11-02 trên `main` và mọi nhánh trong máy. Migration dự kiến `0132`, kiểm lại lúc thi công.
- **Loại:** việc lớn (dữ liệu, luồng xác nhận). **Không chạm tiền.** **Cửa:** Đ1 hai chiều. Đ2, Đ3 một chiều mềm: bảng chính sách và cột `manifest_exempt` chỉ thêm, ở lại; công tắc tắt được, đơn đã mang dấu giữ dấu.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 2** (ADR-0154, ADR-0155), trần là 3.
- **Xây trên lỗ đang hở:** không. `TNV-G1`, `TNV-G3`, `TNV-G4` thuộc sổ tiền, `HC-5.19` thuộc khôi phục dữ liệu, `HC-5.11` thuộc tác vụ tự động, `HC-4.2` thuộc bút toán điều chỉnh (`docs/quyen-hoan.json`, kiểm 2026-11-02).
- **Quan hệ với ADR cũ:** **mở rộng** ADR-0136 Đ1 (thêm một lý do phải qua bước xác nhận). **Nới** ADR-0136 Đ6 (người xét đọc thêm ghi chú dịch vụ). **Ngoại lệ có tên** của luật `THIEU_TEN` (ADR-0049) cho đơn mang dấu. **Giữ** mốc 6 giờ và Đặt gấp (ADR-0049, ADR-0107), chặng đưa đón (ADR-0047), ADR-0135 Đ2, ADR-0136 Đ13.5, vé điện tử (ADR-0153).

## Bối cảnh

Chủ muốn đối tác bên ngoài đặt vé bằng vài thao tác, văn phòng lo phần còn lại: «Ghi chú thay giờ đón», «Ẩn cả danh sách hành khách», «Bỏ luật với đơn của đối tác» (chủ 2026-11-01, 2026-11-02). Lượt 1 đã ẩn «Thông tin chuyến» và thêm dòng Ghi chú, nhưng khung giờ ở Đưa đón còn nguyên.

Chủ 2026-11-02, sau khi người soạn nêu rủi ro đơn có đón mà không giờ, nguyên văn: *«Phần ghi chú gợi ý Thời gian đón là đúng ý, phần khung giờ bị bỏ trống là 1 chủ ý thiết kế, và cả phần "Hành khách" để nhập danh sách khách khởi hành thì cũng tạm thời cho phép bật /tắt ở trong bảng điều khiển của Super Admin, lý do là để làm cho bước 1 thực sự đơn giản và làm quen với người mới. Sau 1 thời gian thì có thể sẽ bật lại hiển thị phần nhập danh sách hành khách.»*

Hôm nay đơn có Đón mà không giờ được coi là không dưới mốc (`src/shared/moc-toi-thieu.ts`) và form không đòi giờ (`src/shared/chang-form.ts`). Nếu dịch vụ không đánh dấu cần xác nhận, đơn đó xác nhận thẳng. Đặc tả §1 gọi «đơn có đón được xác nhận mà không ai nhập giờ» là thất bại. Đối tác bỏ trống giờ là chủ ý; Đ1 đặt việc chốt giờ về phía văn phòng, không đòi đối tác nhập.

## Quyết định

**Đ1. Giờ đón: đối tác ghi vào Ghi chú, văn phòng chốt giờ ở bảng Còn vé.** Áp cho mọi tài khoản giữ quyền Đối tác, không công tắc.

1. Khối Đưa đón của đối tác còn Đón / Không đón, Nơi đón, Nơi trả. Bỏ khung giờ và ô giờ. Phí đón theo nơi không đổi.
2. **Luật mới ở nhánh Gửi đơn:** người lập giữ quyền Đối tác và đơn có **chiều đi** chọn Đón mà chưa có giờ thì luôn vào nhánh A (mở yêu cầu xác nhận), dù dịch vụ không đánh dấu cần xác nhận. Đơn Không đón không đổi nhánh. Chiều về giữ giờ gợi ý theo mẫu dịch vụ như hôm nay, không tính vào luật này.
3. **Bảng Còn vé** hiện ghi chú dịch vụ ngay trên khối giờ. Chiều đi chưa có giờ có ô chọn khung giờ hoặc tự gõ, bắt buộc. Máy chủ từ chối Còn vé nếu chiều đi còn thiếu giờ (409, câu tiếng Việt). Có giờ rồi thì mốc 6 giờ và Đặt gấp chạy như hôm nay.
4. Ghi chú dịch vụ vào dữ liệu người xét đọc được. Người xét vẫn không nhận SĐT trong dữ liệu trả về, nhưng ghi chú là chữ tự do nên đối tác có thể gõ SĐT vào: chấp nhận.
5. Đối tác gửi thẳng giờ qua API không phải lỗ: giờ đó vẫn qua cổng 6 giờ. Đơn nháp của đối tác không có đường xác nhận nào khác (người khác 404, người lập 409); bài kiểm ghim điều này.

**Đ2. Công tắc «Ẩn thông tin khách khi đối tác đặt vé».**

1. **Mặc định TẮT**, nên phát hành không đổi gì cho tới khi Toàn quyền bật. Chỉ ô `settings.ops`. Đặt ở trang Tôi, cạnh «Dịch vụ nhập tay», vì Nền tảng chưa có trang bảng điều khiển chung của Toàn quyền (trang mang tên đó chỉ dành cho Trợ lý); bảng chính sách chỉ thêm theo khuôn `ord_confirm_policy`; có nhật ký.
2. Khi BẬT, tài khoản giữ quyền Đối tác không thấy khối Khách hàng và khối Hành khách ở form Tạo đơn. Ngày khởi hành giữ nguyên.
3. **Máy chủ quyết, không tin trình duyệt:** lập đơn mới khi BẬT thì bỏ tên và SĐT gửi lên, điền từ tài khoản; email, ghi chú khách trống; không nhận khoá `passengers`. Sửa nháp đã có thông tin: giữ giá trị đang lưu. Đổi công tắc không chạm đơn cũ.
4. Thực tập, Bán hàng và mọi tài khoản không giữ quyền Đối tác: không đổi. Đối tác vẫn bổ sung được tên ở trang đơn của mình. «Đổi khách», «Sửa danh sách khách» của văn phòng: không đổi.
5. **Đây là biện pháp tạm** để bước đầu đơn giản, giúp người mới làm quen. Tắt công tắc thì form hiện lại hai khối đó với đơn mới, và đơn lập sau lúc tắt không mang dấu của Đ3.

**Đ3. Miễn luật thiếu tên cho đơn lập lúc công tắc BẬT.** Đơn do tài khoản giữ quyền Đối tác lập khi công tắc BẬT mang dấu `orders.manifest_exempt = 1`, chụp lúc lập; đổi công tắc sau đó không đổi dấu đơn cũ. Chặng của đơn có dấu không bị giữ `THIEU_TEN` lúc xếp và lúc xuất bến (`lyDoThieuTen`, `kiemXuatBen`), câu nhắc vẫn hiện, không chặn. `THIEU_TEN` chỉ ở lớp máy chủ, không có trigger (kiểm 2026-11-02), nên không phải sửa trigger. Vận chuyển đọc dấu qua view công bố của `orders`. Mọi đơn khác và cờ `require_manifest` không đổi. Thêm dòng ở bảng sự kiện vận chuyển.

## Rủi ro chủ đã chấp nhận

- Khi công tắc BẬT, tên khách trên biên nhận và SĐT liên hệ trên chuyến là của đối tác; danh sách hành khách có thể trống cả khi xe chạy. Quy định xe hợp đồng đòi danh sách hành khách (nguồn tra 2026-09-27, chưa có luật sư xác nhận). Chủ nghe hệ quả ngày 2026-11-02 và vẫn chọn «Bỏ luật với đơn của đối tác».
- Mọi đơn có đón mà đối tác không ghi giờ ở khung giờ đều phải chờ văn phòng chốt giờ. Đó là việc thêm cho văn phòng, đổi lại không có đơn thiếu giờ.
- Từ lúc lượt 1 phát hành tới khi Đ1 lên, đơn có Đón mà không giờ vẫn xác nhận thẳng được nếu dịch vụ không đánh dấu cần xác nhận, và không qua mốc 6 giờ. Người soạn đã nêu ngày 2026-11-02; lời chủ ở phần Bối cảnh.

## Tiêu chí nghiệm thu

Đặc tả §8 mục QĐ-B (a) tới (h) và phần Chung. Sửa cố ý để dấu đọc theo công tắc hiện hành thì bài đỏ rồi hoàn nguyên (P16). Thi công xong phải có người kiểm độc lập.
