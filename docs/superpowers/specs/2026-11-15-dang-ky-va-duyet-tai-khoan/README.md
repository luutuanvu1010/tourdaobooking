# Đăng ký và duyệt tài khoản đối tác — trang trình chủ (15/11/2026)

Hồ sơ có ngày; viết xong là đóng băng. Trang này trình **hướng đi** để bạn duyệt. Nó chưa phải quyết định kiến trúc và chưa có dòng mã nào. Bản đầy đủ cho người lập kế hoạch thi công là `THIET-KE.md` cùng thư mục. Bản đó đã được một người đọc độc lập soát một vòng (chỉ đọc, không chạy thử).

**Sửa lần 2, cùng ngày, theo lời bạn:** thêm cấp độ đại lý mặc định và dấu xác minh. Phần thêm này tôi đã tự đối chiếu với mã, nhưng chưa qua người đọc độc lập.

## Kết luận

Đối tác sẽ tự đăng ký bằng một **phiếu đăng ký**: xác nhận email, điền thông tin, chụp gửi giấy tờ ngay trên điện thoại. Quản trị xác minh, Nhân sự duyệt; **chỉ khi duyệt, Nền tảng mới sinh hồ sơ và tài khoản**. Người được duyệt tự đặt PIN rồi đăng nhập, **nhận sẵn cấp độ đại lý mặc định** (ví dụ TA1) và mang dấu **«Đã xác minh»**. Thông tin đã xác minh nằm ở hồ sơ, Kế toán dùng cho hoá đơn.

Phần nền đã có sẵn: kho R2 riêng cho ảnh hồ sơ, luật xác minh, chính sách riêng tư, yêu cầu xoá, các cấp độ đại lý. Phần phải dựng mới là lối vào cho người đăng ký, bước duyệt, và các màn hình tải và xem ảnh, vì hôm nay chưa có màn nào.

## Một phiếu đi như thế nào

1. **Người đăng ký** xác nhận email bằng mã, điền phiếu, chụp gửi giấy tờ, bấm gửi.
2. **Quản trị** xác minh: mở ảnh, đối chiếu, gọi số điện thoại, và soát Danh bạ để không sinh hồ sơ trùng. Thiếu hay mờ thì trả phiếu về kèm lý do.
3. **Nhân sự** duyệt mở tài khoản và chọn vai trò đối tác. Người duyệt phải khác người xác minh.
4. **Nền tảng** sinh hồ sơ, tài khoản, vai trò và gắn cấp độ đại lý mặc định trong một lần ghi, rồi gửi thư báo.
5. **Người đăng ký** tự đặt PIN và đăng nhập. Phiếu bị từ chối, bị rút hoặc hết hạn thì ảnh giấy tờ được xoá.

## Bảng việc

| Đợt | Bạn và đối tác nhận được | Xong khi | Trạng thái |
|---|---|---|---|
| 1 | Cá nhân tự đăng ký; công ty xác minh và duyệt; đối tác mới nhận sẵn cấp mặc định; mọi tài khoản hiện dấu xác minh | Một người lạ đăng ký trên iPhone, được hai người duyệt, tự đặt PIN, đăng nhập được, đơn đầu tiên tính đúng cấp mặc định; người kiểm độc lập báo đạt | Chờ bạn duyệt hướng |
| 2 | Công ty tự đăng ký; tài khoản gắn hồ sơ công ty; Kế toán thấy thông tin hoá đơn nào đã xác minh | Đơn do tài khoản công ty lập ghi bên đặt, hoa hồng, công nợ cho công ty | Chưa bắt đầu |
| 3 | Toàn quyền có một màn thấy mọi tệp hồ sơ: xem lại, ẩn, xoá | Ẩn một tệp thì người khác không mở được; xoá thì tệp rời khỏi kho | Chưa bắt đầu |
| 4 | Đăng ký và đăng nhập bằng Google, Apple | Thử đạt trên iPhone thật trước, rồi mới quyết làm tới đâu | Chưa bắt đầu |
| 5 (đề xuất thêm) | Người đã có tài khoản tự nộp ảnh giấy tờ để được dấu «Đã xác minh» | Một tài khoản do Nhân sự tạo nộp căn cước, được xác minh, dấu đổi thành «Đã xác minh» | Chờ bạn gật mới đưa vào bảng |

Mỗi đợt có quyết định riêng để bạn duyệt trước khi làm. Đợt 1 có năm quyết định, chia hai lượt (ba và hai), vì luật dự án không cho quá ba quyết định một lượt.

## Bạn đã chốt (15/11)

- **«Ghi cho công ty».** Công ty đăng ký thì đơn, hoa hồng, công nợ ghi cho công ty. Lựa chọn này trùng với điều bạn đã duyệt ngày 24/9 («công ty lữ hành dùng một tài khoản chung gắn hồ sơ công ty»). Mã đang ghi phần đó «làm ở giai đoạn sau», nên đợt 2 là lần đầu dựng nó; làm đúng theo câu ấy thì luật tiền không phải sửa. Hệ quả: mỗi công ty một tài khoản dùng chung; cho từng nhân viên một tài khoản riêng vẫn là việc bạn đã gác ngày 24/10.
- **Cấp độ đại lý mặc định.** Đối tác tự đăng ký nhận sẵn một cấp cụ thể, ví dụ TA1; Quản lý bán hàng, Quản trị, Toàn quyền đặt được cấp mặc định.
- **Dấu xác minh.** Tài khoản nào đã xác minh thì có dấu «Đã xác minh»; ngược lại là «Chưa xác minh» hoặc «Cần xác minh lại».

## Tôi làm hai điều mới như thế nào (bạn bác điều nào thì nói)

**Cấp độ đại lý mặc định.** Tôi dùng lại đúng cơ chế «cấp riêng» đang chạy: lúc duyệt, Nền tảng gắn cho đối tác mới một cấp riêng bằng cấp mặc định. Cách tính hoa hồng không đổi gì.

- Cấp mặc định đặt **theo từng loại đối tác** (cộng tác viên, hướng dẫn viên, công ty…); bạn đặt cùng một cấp cho mọi loại cũng được.
- **Đổi cấp mặc định chỉ áp cho người được duyệt về sau.** Người đã duyệt giữ cấp đã nhận; muốn đổi cho từng người thì dùng «Đổi cấp riêng» như hôm nay.
- Loại nào chưa đặt mặc định thì đối tác theo cấp của vai trò, như hôm nay.
- Kế toán không nằm trong danh sách đặt mặc định (đúng lời bạn), nhưng vẫn đổi được cấp riêng của từng đối tác.
- Điều tôi nói một lần: đây là ô đầu tiên cho một vai bán hàng quyết mức hoa hồng của người mới vào. Có ba lớp giữ: chỉ áp về sau, mọi lần đổi có nhật ký, và người đặt không tạo được cấp hay sửa được mức.

**Dấu xác minh.** Ba trạng thái dùng đúng tên bạn đặt.

- «Đã xác minh»: đủ mọi mục bắt buộc và giấy tờ còn hạn. «Cần xác minh lại»: đã từng đủ, nay có mục bị sửa hoặc giấy tờ hết hạn. Còn lại là «Chưa xác minh».
- Dấu hiện ở trang Tôi của chính người đó, ở màn Quản lý tài khoản, và ở Danh bạ. Ai vốn thấy tài khoản ở đâu thì thấy dấu ở đó.
- Tôi coi dấu **chỉ để biết, không chặn việc gì**. Nếu bạn muốn chặn (ví dụ chưa xác minh thì chưa được Trả sau) thì đó là một quyết định riêng.
- Hệ quả: đối tác duyệt từ phiếu có «Đã xác minh» ngay. Tài khoản do Nhân sự tạo sẽ hiện «Chưa xác minh», và hôm nay họ chưa có cách nào tự nộp ảnh giấy tờ. Vì thế tôi đề xuất đợt 5.

## Tôi đã tự chọn theo khuyến nghị (bạn bác điều nào thì nói)

1. **Phiếu trước, tài khoản sau.** Người lạ không bao giờ vào được bên trong Nền tảng, và Danh bạ không dính hồ sơ trùng hay rác.
2. **Xác nhận bằng mã gửi email.** Số điện thoại do Quản trị gọi, vì Nền tảng chưa gửi được SMS hay Zalo.
3. **Hai người cho một phiếu.** Quản trị xác minh, Nhân sự mở tài khoản. Luật «người xác minh khác người tạo tài khoản» bạn đã duyệt ngày 16/10; ở đây tôi áp sang ca mới. Khi không còn ai hợp lệ thì Toàn quyền làm được cả hai bước, có ghi dấu.
4. **Người được duyệt tự đặt PIN.** Không ai trong công ty biết PIN.
5. **Giấy tờ bắt buộc lúc đầu:** cá nhân nộp căn cước hai mặt; công ty nộp thêm giấy đăng ký kinh doanh và căn cước người đại diện. Danh sách này sửa được.
6. **Công ty lữ hành chỉ đăng ký bằng phiếu công ty** (đợt 2). Phiếu cá nhân của đợt 1 chỉ nhận hướng dẫn viên độc lập, lễ tân khách sạn, tài xế taxi, cộng tác viên; nếu không, công ty sẽ đứng tên một người.
7. **Máy tự dọn** ảnh và thông tin của phiếu bỏ dở, bị từ chối, bị rút.
8. **Có công tắc mở, đóng đăng ký** do Toàn quyền giữ, lúc đầu để đóng.
9. **Ô «người giới thiệu»** chỉ ghi nhận, chưa tính tiền. Affiliates làm sau trên nền này.

## Hai câu cần bạn chọn

**Câu 1 — Có thêm đợt 5 không?** Tôi khuyên thêm, làm sau đợt 1. Không thêm thì dấu của các tài khoản do Nhân sự tạo sẽ đứng yên ở «Chưa xác minh».

**Câu 2 — Tài khoản tự đăng ký có bắt buộc bảo mật hai lớp ngay không?** Hôm nay mọi đối tác đăng nhập chỉ bằng số điện thoại và PIN; việc bắt buộc hai lớp cho đối tác bạn đã duyệt ngày 16/10 nhưng chưa làm.

- **(a) Chưa bắt buộc — tôi khuyên chọn.** Người tự đăng ký đăng nhập như mọi đối tác hôm nay, được mời bật hai lớp sau lần đăng nhập đầu. Việc bắt buộc làm chung cho mọi đối tác, thành một việc riêng. Đợt 1 giữ nguyên cỡ.
- **(b) Bắt buộc ngay.** An toàn hơn từ ngày đầu, nhưng đợt 1 lớn hơn rõ rệt vì phải dựng luôn phần hai lớp cho đối tác.

## Một việc cần bạn làm sớm

Thử gửi mã qua email trên bản chính thức. Sổ bàn giao ghi chưa ai thử gửi thư thật, mà mã email là cách duy nhất để xác nhận người đăng ký ở đợt 1. Thư không tới thì phải đổi cách làm từ gốc, nên cần biết trước khi lập kế hoạch. Bạn nói «chỉ tôi cách thử» thì tôi viết từng bước.

## Bốn điều bạn nên biết

- **Làm xong vẫn chưa mở được ngay.** Theo sổ bàn giao, bản chính thức chưa đăng chính sách riêng tư (đang chờ luật sư duyệt chữ), mà chưa có chính sách thì không ai gửi được phiếu.
- **Buổi diễn tập khôi phục dữ liệu đang hẹn 25/11.** Nếu tôi trình các quyết định của đợt 1 trước buổi đó, bạn sẽ cần ghi «cho phép, có lý do», như các lần trước.
- **Google, Apple trên iPhone khó hơn tưởng.** Google cấm mở trang đăng nhập của họ bên trong ứng dụng dạng vỏ web, đúng loại vỏ iPhone bạn đã chọn cho App Store. Ứng dụng iPhone có nút Google thì Apple còn đòi một lựa chọn tương đương, thường là nút Apple. Vì vậy đợt 4 bắt đầu bằng thử trên máy thật.
- **Lên kho ứng dụng.** Khi ứng dụng cho tự đăng ký, cả hai kho đòi có lối xin xoá tài khoản ngay trong ứng dụng. Phần này đã soạn nhưng chưa duyệt được, vì chờ buổi diễn tập.

## Hai chỗ tôi nói chưa đúng lúc trao đổi

- Tôi nói «hôm nay chỉ văn phòng gắn ảnh được». Thật ra chỉ Toàn quyền gắn được, và chưa có màn hình nào để gắn. Phiếu khai giấy tờ của người đã có tài khoản hôm nay cũng mới chỉ từ chối được, chưa chấp nhận được, vì phiếu chưa kèm được ảnh.
- Tôi nói chọn «ghi cho công ty» thì «cần một quyết định riêng về tiền». Nguyên tắc ấy bạn đã duyệt từ 24/9. Đợt 2 chỉ cần bạn duyệt cách dựng, và vẫn cần người kiểm độc lập.

## Câu duyệt mẫu (chép nguyên, hoặc sửa)

> Duyệt hướng đăng ký và duyệt tài khoản. Thêm đợt 5. Hai lớp chọn (a). Soạn lượt quyết định đầu của đợt 1.

---
Tệp: `THIET-KE.md` (cấp mặc định ở mục 5.6, dấu xác minh ở mục 5.7). Quyết định cũ có liên quan: ADR-0016 (Google), ADR-0018 điều 9 (tài khoản công ty), ADR-0121 (hai lớp cho đối tác), ADR-0122 đến ADR-0126 (hồ sơ, kho tệp, tự khai, xác minh, riêng tư), ADR-0138 và ADR-0151 (cấp riêng), ADR-0169 (Quản lý bán hàng), ADR-0186 (việc máy tự làm), ADR-0200 (kho ứng dụng). Việc để sau có liên quan ở `docs/BACKLOG.md`: mục 44 và các mã `BL-TK-ANH`, `BL-XM-ANH`, `BL-TK-TO-CHUC`, `BL-TEP-PHAT-LAI-500`, `BL-MST-UNIQUE`.
