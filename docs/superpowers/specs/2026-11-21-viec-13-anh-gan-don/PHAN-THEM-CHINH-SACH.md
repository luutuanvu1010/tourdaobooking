# Phần thêm cho bản nháp chính sách riêng tư: ảnh chụp lúc làm việc gắn vào đơn (để luật sư xem)

Hồ sơ có ngày 21/11/2026 (cập nhật 22/11: chủ chọn tên «Ảnh bàn giao», sao lưu kho ảnh giữ 4 gói ≈ 1 tháng, không chờ luật sư — ADR-0232 accepted). Đây là PHẦN THÊM cho `docs/superpowers/specs/2026-11-16-chinh-sach-rieng-tu-ban-nhap/BAN-NHAP.md`, không thay và không sửa bản đó. BẢN NHÁP, chưa được luật sư duyệt. Không đăng khi chưa điền hết chỗ trong ngoặc vuông và chưa có luật sư xác nhận. Nguồn: ADR-0232 (đề xuất). «[TÊN TÍNH NĂNG]» thay bằng tên chủ chọn.

Lưu ý: bản nháp gốc viết cho người đăng ký làm đối tác. Ảnh gắn đơn chạm cả **khách đi tour** (không có tài khoản) và **nhân viên, tài xế**. Luật sư quyết chính sách có cần một phần riêng «Khách đi tour» hay không (câu hỏi 1 ở `CAU-HOI-LUAT-SU.md`).

## Khi đăng: nhớ tích ô

ADR-0232 Đ10 thêm ô số **«Số năm giữ ảnh gắn đơn»** vào form đăng chính sách (chưa có trên Nền tảng, làm khi thi công). Ô trống thì không ai tải được ảnh. Chỉ điền khi toàn văn đã ghép đủ các đoạn dưới đây, và điền **đúng con số ghi ở mục 6**. Các lần đăng bản sau, form chép sẵn số của bản trước; xoá trống là tắt tính năng ngay.

## 1. Nối vào cuối ô «Mục đích thu thập»

```
Khi chúng tôi giao vé, đón khách hoặc bàn giao khách cho tài xế, nhân viên của chúng tôi có thể chụp ảnh tại chỗ và lưu vào đơn hàng, để đối chiếu khi có khiếu nại hoặc tranh chấp về việc đã giao dịch vụ.
```

## 2. Thêm vào ô «Toàn văn chính sách»

Chèn vào cuối mục 2 («Chúng tôi thu thập gì»):

```
Khi nhân viên hoặc tài xế của chúng tôi giao vé, đón khách hoặc bàn giao khách cho tài xế khác, họ có thể chụp ảnh tại chỗ và lưu vào đơn hàng. Ảnh có thể có hình khách, người đi cùng, nhân viên và tài xế. Ảnh không ghi vị trí; giờ chụp là giờ hệ thống nhận ảnh.
```

Chèn vào cuối mục 3 («Chúng tôi dùng để làm gì»):

```
Ảnh chụp lúc giao dịch vụ chỉ dùng để đối chiếu khi có khiếu nại hoặc tranh chấp về việc đã giao vé, đã đón hay đã bàn giao khách. Chúng tôi không dùng ảnh để quảng cáo, không đăng lên mạng, không dùng máy để nhận diện khuôn mặt.
```

Chèn vào cuối mục 4 («Ai trong công ty được xem»):

```
Ảnh chụp lúc giao dịch vụ chỉ nhân viên văn phòng, kế toán và quản trị của công ty xem được; người chụp xem lại được ảnh mình chụp. Đại lý đặt tour và khách không xem được ảnh trên hệ thống. Mỗi lần mở ảnh đều được ghi lại ai mở và lúc nào.
```

Chèn vào cuối mục 6 («Chúng tôi giữ bao lâu»):

```
Ảnh chụp lúc giao dịch vụ được giữ [ĐIỀN: luật sư xác nhận, đề xuất 5 năm] kể từ ngày chụp, vì [ĐIỀN: luật sư xác nhận căn cứ]. Hết hạn, ảnh được đưa vào danh sách xoá. Ảnh vô tình chụp phải giấy tờ tuỳ thân (căn cước, hộ chiếu, bằng lái) được xoá ngay khi phát hiện. Bản sao lưu của chúng tôi (đã mã hoá) còn giữ ảnh đã xoá thêm tối đa khoảng 1 tháng; nếu phải khôi phục dữ liệu từ bản sao lưu, chúng tôi xoá lại những ảnh đã xoá trước đó.
```

Chèn vào cuối mục 9 («Quyền của bạn») — **chọn một trong hai câu theo trả lời của luật sư cho câu hỏi 4**:

Phương án A (giữ đủ hạn):
```
Nếu bạn yêu cầu xoá ảnh có hình mình trước khi hết hạn giữ, chúng tôi giữ ảnh tới hết hạn vì [ĐIỀN: căn cứ pháp lý], và nói rõ điều này trong phiếu trả lời. Trong thời gian đó ảnh không được dùng vào việc nào khác.
```

Phương án B (xoá theo yêu cầu):
```
Bạn có thể yêu cầu xoá ảnh có hình mình theo cách nêu ở trên; nếu bạn không có tài khoản trên Nền tảng (ví dụ bạn đặt tour qua đại lý), hãy liên hệ theo mục 1 và cho biết ngày đi tour để chúng tôi tìm ảnh. Chúng tôi xoá ảnh, trừ khi ảnh đang được dùng để giải quyết một khiếu nại hoặc tranh chấp chưa xong; khi đó chúng tôi nói rõ trong phiếu trả lời và xoá ngay khi việc đó kết thúc.
```

## 3. Điểm cần luật sư xác nhận

1. Căn cứ xử lý và có cần đồng ý của khách không (câu hỏi 1). Nếu cần, phần «8. Cơ sở để chúng tôi xử lý thông tin» của bản nháp gốc phải thêm câu riêng cho ảnh.
2. Con số và căn cứ giữ (câu hỏi 3); chọn phương án A hay B ở mục 9 (câu hỏi 4).
3. Câu về trẻ em (câu hỏi 2) — bản nháp chưa có câu nào.
4. Con số của bản sao lưu: «khoảng 12 tháng» lấy từ cách xoay vòng hiện nay (8 bản tuần gần nhất + 12 bản tháng, `scripts/sao-luu-lib.mjs`, mỗi bản chép toàn bộ kho); «khoảng 1 tháng» nếu chủ chọn giữ ít bản cho riêng kho ảnh (ADR-0232, Hệ quả). Thêm kho ảnh vào sao lưu là việc của lần thi công, chưa làm. Bản sao lưu được mã hoá và cất trên Google Drive của công ty: mục 5 («Thông tin được lưu ở đâu») của bản nháp gốc chưa nhắc Google — luật sư xem có phải thêm.
5. Câu «không đăng lên mạng, không nhận diện khuôn mặt»: đúng với thiết kế ADR-0232; chủ xác nhận công ty không có ý định dùng ảnh này cho quảng cáo.
