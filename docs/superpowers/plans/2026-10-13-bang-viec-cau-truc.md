# Bảng việc cấu trúc còn lại của Nền tảng

> Lập ngày 13/10/2026 theo yêu cầu của chủ dự án; cột "Mức quan trọng" thêm cùng ngày theo lời chủ. Đây là **tài liệu sống**: mỗi phiên chỉ cập nhật cột "Tình trạng" (và "Mức quan trọng" khi chủ đổi ý); thêm việc mới vào bảng phải hỏi chủ trước. Báo cáo theo kiểu "xong x / 14". Chi tiết kỹ thuật để cuối tệp.

## Đọc trước (một phút)

Nền tảng đang chạy thật ở bản 1.90 và đã qua kiểm tra của máy. Phần còn lại không phải là sửa lỗi lặt vặt mà là **mười bốn việc lớn**, chia thành bốn nhóm: luật cần bạn duyệt, tiền, dữ liệu thật và vận hành, và các mốc hạn. Hiện **xong 0 / 14**. Việc cần riêng bạn trả lời là A1, A2, A3, A4, B3 và D1. Hai việc cần một buổi của bạn hoặc Kế toán là B2 (xác nhận sổ vàng) và C3 (dùng thử đủ vai), cộng thêm C2 (hẹn buổi diễn tập khôi phục).

**Không phải việc nào cũng quan trọng như nhau.** Cột "Mức quan trọng" chia thành ba bậc:
- **Bắt buộc (6 việc: B2, C1, C2, C3, C4, D1):** phải xong trước khi dùng tiền thật và dữ liệu thật. Dùng thử với nhóm nhỏ thì chưa cần, nhưng mở rộng mà bỏ qua thì sẽ không biết số tiền đúng hay sai, và không biết cứu dữ liệu được hay không.
- **Nên làm, chậm được (4 việc: A1, B1, B3, B4):** bỏ qua thì phần mềm vẫn chạy, chỉ thêm sai sót nhỏ hoặc thiếu một chức năng.
- **Dọn dẹp (4 việc: A2, A3, A4, D2):** thuộc luật làm việc nội bộ và nợ nhỏ, không ảnh hưởng người dùng. Bỏ qua thì chỉ thêm rối cho các phiên làm việc sau.

Đây là đánh giá của tôi, chưa có người kiểm độc lập; bạn đổi bậc được bất cứ lúc nào.

Thứ tự tôi đề xuất: trả lời A1, A2, A3 trong một lượt (mỗi lượt duyệt chỉ nên có tối đa ba quyết định chạm tiền hoặc dữ liệu). Sau đó làm D1 trước vì có hạn 31/10, rồi B1. Phần vận hành đi theo chuỗi C2 → C1 → C3 → C4. B2 làm song song được. B3, B4 và A4 đi sau.

Cách hiểu cột "Tình trạng": **Chờ bạn** là bạn phải trả lời hoặc làm; **Chờ việc trước** là phải xong việc khác trước; **Chưa mở** là cố ý chưa làm.

## Nhóm A — Luật: những điều chỉ bạn được quyết

| Việc | Mức quan trọng | Nói đời thường | Xong khi | Ai làm | Tình trạng |
|---|---|---|---|---|---|
| **A1. Duyệt bản quyết định ADR-0114** | **Nên làm**, chậm được. Bỏ qua thì đơn vẫn lọt khi không có người lớn và bớt khách thì Kế toán không được nhắc về giảm giá | Bạn đã nêu ba yêu cầu về sổ vàng sửa số khách: bớt khách trên đơn có giảm giá thì nhắc màu đỏ; lịch sử số khách hiện đủ dòng từ lúc đầu; mỗi đơn phải có ít nhất một người lớn. Điều thứ ba đổi cách máy nhận đơn nên phải có bản quyết định do bạn duyệt, tôi không được tự làm. | Bạn trả lời "duyệt" hoặc nói điều khoản nào đổi, và bản quyết định được lưu vào kho. Trong đó có ba điều khoản cần bạn nhìn kỹ: người cao tuổi có tính là người đi kèm không (tôi khuyến nghị có); dịch vụ tính theo nhóm hoặc nhập tay thì tính là người lớn; đơn cũ chưa có người lớn thì không bị chặn thêm. | Bạn | **Đã duyệt 13/10/2026**, kèm điều kiện Kế toán xem lại hai khoá mới |
| **A2. Luật chung: "lịch sử nào cũng phải có dòng đầu tiên"** | **Dọn dẹp.** Phòng lỗi lặp, không ảnh hưởng vận hành hôm nay | Lỗi ở ca SV-SK-07 (thiếu dòng lúc khởi tạo) có thể lặp ở các sổ khác như sổ tiền hay chuyến xe. Thay vì sửa lẻ từng chỗ, nên có một luật chung và một bài kiểm tự quét mọi sổ. | Bạn duyệt luật và bài quét chạy được. | Tôi soạn, bạn duyệt | Bạn đã cho ghi vào bảng; luật chưa soạn, chưa duyệt. Làm cùng lượt duyệt với A1 |
| **A3. Đồng ý một ngoại lệ cho tài khoản Thực tập** | **Dọn dẹp.** Không trả lời thì ngoại lệ cứ giữ nguyên, không có hại | Có một bài kiểm tự động bảo đảm màn hình chỉ hiện nút đúng theo quyền. Với tài khoản Thực tập tôi phải thêm một ngoại lệ có tên. Đó là nới nhẹ một chốt chặn nên cần bạn đồng ý. Tôi khuyến nghị giữ ngoại lệ. | Bạn trả lời giữ hoặc bỏ. | Bạn | **Chờ bạn** |
| **A4. Đọc gói đề xuất sửa luật và chọn cách ghi số hiệu 0019** | **Dọn dẹp.** Các tệp luật đang ghi mâu thuẫn, chỉ làm rối các phiên làm việc | Tôi không được tự sửa các tệp luật nên đã gom sẵn đề xuất theo từng tệp. Ngoài ra số hiệu một thay đổi dữ liệu đang chờ (gọi tắt B5) hiện được ghi ba cách khác nhau trong các tệp luật; bạn chọn một cách. | Tệp luật được sửa theo ý bạn và hết chỗ ghi mâu thuẫn. | Bạn duyệt, tôi áp | **Chờ bạn** |

## Nhóm B — Tiền

| Việc | Mức quan trọng | Nói đời thường | Xong khi | Ai làm | Tình trạng |
|---|---|---|---|---|---|
| **B1. Làm phần mềm cho ba điều ở A1** | **Nên làm**, chậm được (cùng lý do với A1) | Biến ba điều đã duyệt thành chức năng: dòng nhắc đỏ, lịch sử đủ dòng, chặn đơn không có người lớn. Kế hoạch tám bước đã viết sẵn. | Có người kiểm độc lập (không phải người làm) xác nhận đạt; các chốt chặn tự động đã thử chặn thật một lần; đã đưa lên hệ thống thật. | Tôi làm, người kiểm độc lập kiểm, bạn chạy lệnh đưa lên | **Đã làm xong và qua người kiểm độc lập (13/10, "đạt có điều kiện").** Chờ bạn chạy lệnh đưa lên và trả lời ba chỗ máy làm hơi khác chữ ADR (đã ghi ở tài liệu hệ thống, mục sai lệch) |
| **B2. Xác nhận bộ ví dụ chuẩn của sổ tiền (sổ vàng)** | **Bắt buộc** cho phần 25 ca cũ: chưa xác nhận thì không ai đối chiếu được hoa hồng, cọc, công nợ với cách tính đúng của công ty | Sổ vàng là các ví dụ có đáp án tính đến từng đồng. Máy tính ra khớp, nhưng chưa ai chịu trách nhiệm xác nhận đáp án đúng. Có 25 ca cũ (cọc đơn huỷ, hoa hồng đại lý, công nợ) và 11 ca sửa số khách. Tôi không được tự đánh dấu "đã xác nhận". | Mỗi ca ghi tên người xác nhận và ngày; dòng "✖ failing tests … LỚP 2" trong kết quả kiểm biến mất. | Bạn hoặc Kế toán (một buổi) | **25 ca cũ làm ngay được.** Sổ vàng sửa số khách nay có 12 ca: 5 ca tiền đã xác nhận (13/10), 7 ca tiền còn chờ; riêng hai khoá đáp án mới (nhắc khuyến mại, lịch sử số khách) chờ Kế toán xem cả 12 ca theo `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/02-danh-sach-ke-toan-xem-lai.md` |
| **B3. Trả lời hai câu trước khi mở đợt 2 của sổ đại lý** | **Nên làm**, chậm được. Chỉ cần khi muốn làm B4 | Có ba điều kiện. Điều thứ nhất (đưa ADR-0109 vào bản chính) **đã xong** và đang chạy từ bản 1.88. Còn lại: (b) bạn từng đặt hai điều kiện để dựng một nơi chạy thử riêng không đụng dữ liệu thật; hồ sơ kiểm toán ghi cả hai điều kiện đã xảy ra mà không có dấu nào cho thấy bạn được nhắc, nên cần bạn trả lời có dựng ngay không; (c) dặn rõ không ai khoá tháng nào cho tới khi diễn tập khôi phục xong. | Bạn trả lời được (b) và (c). | Bạn | **Chờ bạn** |
| **B4. Đợt 2 của sổ đại lý** | **Nên làm**, chậm được. Lúc đầu có thể đối soát đại lý bằng bảng tính | Đối soát công nợ với đại lý từng đơn một và cho phép chiết khấu khác nhau theo từng dịch vụ. Đây là phần ghi tiền nhiều nhất nên không mở khi nền chưa chắc. | Theo kế hoạch riêng sẽ lập sau. | Tôi và người kiểm độc lập | **Chưa mở**, chờ B2 (phần 25 ca cũ), B3 và C2 |

## Nhóm C — Dữ liệu thật và vận hành

| Việc | Mức quan trọng | Nói đời thường | Xong khi | Ai làm | Tình trạng |
|---|---|---|---|---|---|
| **C1. Quyết định dữ liệu thử và nạp dữ liệu thật** | **Bắt buộc** để dùng thật. Hiện chỉ có dữ liệu thử nên chưa có rủi ro; rủi ro bắt đầu khi nạp dữ liệu thật | Hệ thống thật hiện chỉ có dữ liệu thử (theo ghi nhận trước đó; tôi không đọc được dữ liệu thật). Bạn quyết dọn hay giữ, rồi nạp nhân viên thật, danh mục, hồ sơ đại lý và đối tác thật. | Dữ liệu thật vào đủ, kiểm dữ liệu tự động đạt, và trước khi nạp đã ghi điểm khôi phục. | Bạn quyết, tôi chuẩn bị lệnh | Chờ việc trước (C2) |
| **C2. Diễn tập khôi phục dữ liệu** | **Bắt buộc** trước khi nạp dữ liệu thật. Có điểm khôi phục sẵn nhưng chưa ai thử, nên chưa biết mất bao lâu, mất gì | Chưa bao giờ thử khôi phục từ bản sao lưu. Nếu sự cố thật xảy ra mà khôi phục không chạy thì có thể mất đơn. Cần thử một lần trên bản sao, không đụng dữ liệu thật. | Có biên bản ghi khôi phục thành công, mất bao lâu, mất những gì. | Tôi chuẩn bị, bạn hẹn buổi | **Chờ bạn hẹn**; làm trước C1 và trước khi khoá tháng nào |
| **C3. Dùng thử thật đủ các vai** | **Bắt buộc** trước khi mở rộng: chỉ máy kiểm thì chưa thấy được lỗi người dùng gặp | Đăng nhập thật từng vai: Bán hàng, Thực tập, Kế toán, Quản trị, Đối tác, tài xế; thử trên iPhone, Face ID, thông báo; kiểm đã cài tài khoản nhận tiền thật cho QR chưa; thử nút "Lưu ảnh" QR trên iPhone. Các bước cụ thể ở biên bản nghiệm thu. | Mỗi vai một tài khoản thật, kết quả được ghi lại. | Bạn và người dùng | **Chờ bạn** |
| **C4. Tắt chế độ bảo trì và báo người dùng** | **Bắt buộc**, là bước cuối để mở cửa cho mọi người | Chỉ bạn làm được. Chỉ tắt sau khi mọi người đã đăng nhập bằng bản mới; nói rõ chỗ báo lỗi (kênh Góp ý) và ai trực. | Mọi người vào được và biết báo lỗi ở đâu. | Bạn | Chờ việc trước (C1–C3) |

## Nhóm D — Mốc hạn

| Việc | Mức quan trọng | Nói đời thường | Xong khi | Ai làm | Tình trạng |
|---|---|---|---|---|---|
| **D1. Mốc 31/10: năm lỗ hổng đã biết hết hạn cho phép** | **Bắt buộc**, hạn cứng. Người dùng không bị ảnh hưởng, nhưng từ 1/11 mọi nhánh đỏ và mọi phiên làm việc bị giữ lại; riêng chỗ hở bút toán điều chỉnh sổ tiền chưa cần hai người duyệt là có thật | Năm lỗ hổng đã được ghi nhận và cho phép tồn tại đến 31/10. Từ 1/11 bộ kiểm tự động sẽ đỏ ở mọi nhánh và các phiên làm việc bị giữ lại. Ba trong năm lỗ (đơn huỷ còn cọc, sửa sai sau "Đã giao", sổ tiền thiếu ràng buộc) đã có mã vá chạy thật; ghi chú trong danh sách còn ghi "chưa lên hệ thống thật" nên cần cập nhật. Hai lỗ còn hở thật: bút toán điều chỉnh sổ tiền chưa bắt buộc hai người duyệt, và chưa diễn tập khôi phục (chính là C2). Tôi chưa đối chiếu từng mục, người kiểm cần làm bước này. | Trước 1/11, mỗi mục hoặc được vá, hoặc được gia hạn có lý do và người chịu trách nhiệm. | Tôi đối chiếu, bạn quyết gia hạn hay vá | Còn **18 ngày**. Chờ bạn |
| **D2. Gom các nợ nhỏ** | **Dọn dẹp.** Làm sau cùng | Một số việc nhỏ đã ghi lại để sau: ví dụ Thực tập kèm Bán hàng thấy nút nhập tay nhưng lưu luôn bị từ chối, Thực tập kèm Quản trị bị chặn khi xác nhận đơn có giảm giá. Gom làm một đợt thay vì rải rác. | Mục nợ tương ứng hết dòng. | Tôi | Làm sau cùng |

## Việc tôi thấy còn thiếu (chưa thêm vào bảng, chờ bạn đồng ý)

- **Bán hàng đổi được người hưởng hoa hồng của đơn đã xác nhận** (hồ sơ kiểm toán K-B-3): chỉ cần quyền sửa chuyến là đổi được bên đặt. Có thể một phần đã được xử lý trong các thay đổi sau, chưa kiểm.
- **Cơ sở dữ liệu không phát hiện tài khoản cũ giữ cùng lúc quyền nội bộ và quyền Đối tác** (K-B-4).
- **Đổi chữ "lần thu" thành "khoản thu"** trên toàn Nền tảng: bạn đã chốt tên, chưa làm.

## Tài liệu liên quan (cho người cần chi tiết)

- Đề xuất ADR-0114 và trang ghép: `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/`; kế hoạch thi công tám bước: `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-ke-hoach.md`.
- Nghiệm thu phiên, bảy bước kiểm theo vai, các việc trước khi mở cho toàn bộ người dùng: `docs/superpowers/specs/2026-10-13-nghiem-thu-phien-va-san-sang-su-dung.md`.
- Kiểm toán toàn Nền tảng 12/10 (mã K-A, K-B, K-C) và gói đề xuất sửa luật: `docs/superpowers/specs/2026-10-12-kiem-toan-toan-nen-tang/` (`README.md`, `de-xuat-sua-luat.md`).
- Danh sách lỗ hổng được phép tồn tại đến hạn (TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19): `docs/quyen-hoan.json`.
- Diễn tập khôi phục: đặc tả `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` (cần cập nhật cho hiện trạng).
- Sổ vàng: thư mục `golden/` và `golden/README.md` (quy tắc: chỉ chủ dự án hoặc Kế toán được xác nhận ca).
- Nợ nhỏ: `docs/BACKLOG.md` mục 28; đổi chữ "khoản thu": mục 25.
