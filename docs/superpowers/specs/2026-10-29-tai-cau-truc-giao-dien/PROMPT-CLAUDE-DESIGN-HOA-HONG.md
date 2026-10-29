ĐỀ BÀI: VẼ LẠI TRANG «HOA HỒNG ĐỐI TÁC» — Island Booking System (Công ty TNHH Tour Đảo)

0. NGUỒN VÀ CÁCH LÀM
- Dùng lại bộ thiết kế «Island Booking System — Design System v2», khung chung (KhungApp: thanh trên, thanh bên, thanh tab) và khuôn trang ThanThietLap đã có trong dự án này. Theo đúng nguyên tắc vàng của bộ: một ý nghĩa một hình, mỗi vùng một nút Chính, chữ 16, điện thoại 390 trước rồi máy tính 1040 (kiểm thêm 768, 1440).
- Kho mã (chỉ đọc, để đối chiếu, không sửa): github.com/luutuanvu1010/tourdaobooking nhánh main.
  · web/hoa-hong.ts — khung trang, hai thẻ «Mức đang áp dụng» / «Thiết lập»
  · web/hoa-hong-thiet-lap.ts — thẻ Thiết lập (ba ảnh đính kèm)
  · web/hoa-hong-bang.ts, web/hoa-hong-tra-nhanh.ts — thẻ Mức đang áp dụng
  · web/hoa-hong-hop.ts — các hộp trượt (Thêm mức, Đổi, Ngừng, Sửa, Áp dụng cho loại)
  · src/shared/hoa-hong-hien-thi.ts — mọi câu chữ và luật khi nào hiện nút nào
  · docs/design/hoa-hong-ho-tro-2026-10-25/ — bản vẽ lần trước (25/10). Bản đó đã lên Nền tảng và VẪN bị chê khó hiểu; đừng vẽ lại nó.
- Ba ảnh đính kèm: thẻ «Thiết lập» trên máy tính, chụp trên Nền tảng thật ngày 29/10/2026 (dữ liệu trên ảnh lẫn nhiều loại thử như CTV TA5, TA1 — đừng dùng làm dữ liệu mẫu).
- Nền tảng viết bằng TypeScript thuần + HTML tĩnh (không React). Bản vẽ là ý định bố cục và chữ. Hạn chế thành phần mới; nếu cần thành phần mới thì nêu tên và lý do.

1. TRANG NÀY ĐỂ LÀM GÌ, AI DÙNG
Công ty trả hoa hồng cho đối tác giới thiệu khách (cộng tác viên, công ty lữ hành, hướng dẫn viên, lễ tân khách sạn, tài xế taxi…). Trang này để đặt và tra mức hoa hồng.
Ba câu người dùng hỏi, theo thứ tự hay gặp:
  (1) «Đối tác X (hoặc loại đối tác Y) bán dịch vụ Z vào ngày D thì được bao nhiêu, theo đâu mà ra?»
  (2) «Loại đối tác Y đang hưởng những gì? Có chỗ nào bị thiếu mức không?»
  (3) «Tôi muốn đổi mức / áp chính sách mới / ngừng một mức — bấm ở đâu, từ ngày nào, đơn cũ có bị ảnh hưởng không?»
Vai:
  · Kế toán, Quản trị, Toàn quyền: xem + mọi nút ghi. Kế toán dùng chủ yếu trên máy tính.
  · Bán hàng: cùng trang, KHÔNG có nút ghi, dùng được Tra nhanh (thường trên điện thoại).
  · Tài khoản Đối tác: không vào được (trang báo không có quyền). Thực tập: không vào.

2. VÌ SAO TRANG HIỆN TẠI THẤT BẠI (đừng lặp lại)
a) Trang xếp theo cách máy lưu dữ liệu chứ không theo câu hỏi: một danh sách loại, một danh sách chính sách, rồi mỗi lần «áp dụng» thành một dòng riêng. Cùng một sự thật «Cộng tác viên theo chính sách Đại lý cấp 1» hiện ở BA nơi (danh sách loại, thẻ chính sách, dòng mở rộng ở thẻ Mức đang áp dụng), nơi nào cũng có nút Ngừng áp dụng / Sửa.
b) Cả thẻ Thiết lập không có một con số hoa hồng nào. Trang hoa hồng mà không thấy hoa hồng.
c) Bức tường nút: mỗi dòng 3–4 nút viền cùng cỡ cùng màu (Tắt/Bật, Đổi chính sách, Ngừng áp dụng, Sửa), nút to hơn cả tên. Việc hay làm, việc hiếm, việc làm giữ đơn trông y hệt nhau. Không có nút chính.
d) Chữ «Tắt» mang hai nghĩa ngược nhau (xem luật 3.7, 3.8). Thêm nữa nút ghi việc sẽ làm chứ không ghi tình trạng: loại đang bật có nút «Tắt» to, còn tình trạng «Đã tắt» chỉ là chữ xám nhỏ, nên người đọc tưởng loại đang tắt.
e) Chỗ nguy hiểm in như chú thích («Chưa có mức nào.», «Chưa áp dụng chính sách nào» bằng chữ xám, trong khi thực tế đơn của loại đó có thể bị giữ), còn nhãn vô hại «Có sẵn» lại tô vàng như cảnh báo.
f) Bốn động từ na ná nằm cạnh nhau không lời phân biệt: Đổi, Sửa, Ngừng áp dụng, Tắt.
g) Máy tính: chữ dồn trái, nút trôi giữa dòng, «Sửa» dạt mép phải, khoảng trống lớn bên phải; ba kiểu xếp nút khác nhau; «Xem lịch sử (2)» là nút to riêng một dòng.

3. MÔ HÌNH NGHIỆP VỤ — LUẬT CỨNG, KHÔNG ĐƯỢC ĐỔI
3.1 Chính sách hoa hồng = một bảng mức dùng chung (giống bảng giá), có tên, ví dụ «Đại lý cấp 1». Mỗi mức gồm: phạm vi dịch vụ (một dịch vụ / một nhóm dịch vụ / mọi dịch vụ) + cách tính (phần trăm, hoặc số tiền mỗi khách) + hiệu lực (từ ngày, đến ngày hoặc không thời hạn).
3.2 Có thể tách theo loại khách: Người lớn / Trẻ em / Người cao tuổi — đã tách thì phải điền đủ cả ba (ghi 0 nếu không trả). Em bé không tính hoa hồng. Dịch vụ tính theo lượt dùng số của người lớn.
3.3 Loại đối tác: có 5 loại «Có sẵn» (Cộng tác viên, Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi (giới thiệu khách)) — đi kèm tài khoản đăng nhập của đối tác nên KHÔNG tắt được. Kế toán thêm được loại mới (chỉ cần tên); loại tự thêm tắt/bật được. Xếp một đối tác vào loại nào làm ở hồ sơ đối tác trong Danh bạ (Quản trị, Toàn quyền), không làm ở trang này.
3.4 Mỗi loại đối tác theo TỐI ĐA MỘT chính sách tại một thời điểm, có ngày bắt đầu. Một chính sách áp được cho nhiều loại. Một chính sách cũng có thể gắn riêng cho một đối tác cụ thể («chính sách riêng», đặt ở Danh bạ).
3.5 «Mức riêng» = một mức đặt thẳng cho một loại, hoặc cho một đối tác cụ thể; được ưu tiên hơn chính sách.
3.6 Thứ tự ưu tiên khi tính (MÁY CHỦ tính, giao diện chỉ được GIẢI THÍCH bằng lời, không tự tính):
    mức riêng của đối tác → chính sách riêng của đối tác → mức riêng của loại → chính sách của loại.
    Trong cùng một lớp: một dịch vụ → một nhóm → mọi dịch vụ. Không khớp lớp nào ⇒ «chưa có mức».
3.7 Tắt một LOẠI tự thêm ⇒ đơn của mọi đối tác thuộc loại đó bị GIỮ ở bước «Đã giao», không tính hoa hồng, tới khi bật lại. Hậu quả nặng ⇒ phải có hộp hỏi lại nói rõ hậu quả (hiện nay bấm một lần là chạy). Loại đã tắt thì không đổi / áp chính sách mới được (máy chủ từ chối) ⇒ đừng vẽ nút đó cho loại đã tắt.
3.8 Tắt một CHÍNH SÁCH ⇒ KHÔNG ngừng chi: các loại và đối tác đang theo nó vẫn hưởng y như cũ; chỉ không áp thêm cho loại mới và không thêm mức mới được. Muốn ngừng chi thì «Ngừng áp dụng» từng lần áp dụng. Giao diện phải làm hai trạng thái 3.7 và 3.8 trông và đọc KHÁC nhau, kèm một câu nói hậu quả.
3.9 Loại / đối tác không khớp mức nào (không chính sách, không mức riêng, hoặc chính sách rỗng) ⇒ đơn bị giữ ở «Đã giao» cho tới khi có mức. Đây là CẢNH BÁO, phải nổi bật, không phải chú thích.
3.10 Hiệu lực có bốn tình trạng: Đang áp dụng · Sắp áp dụng · Đã ngừng · Đã huỷ — thay bằng dòng khác. Không bao giờ xoá hẳn. Đơn đã xác nhận luôn giữ hoa hồng tại lúc xác nhận; mọi thay đổi chỉ áp cho đơn sau.
3.11 Ba cách thay đổi (máy chủ đã có, giữ nguyên nghĩa):
    · Đổi = từ một ngày (hôm nay trở đi, không lùi về quá khứ) dùng mức/chính sách mới; cái cũ tự ngừng đến hết ngày liền trước. Chỉ có ở dòng Đang áp dụng và bắt đầu trước hôm nay.
    · Sửa = chữa chỗ ghi nhầm: dòng mới thay hẳn dòng cũ (dòng cũ thành «Đã huỷ — thay bằng dòng khác»), bắt nhập lý do; nếu đã có đơn dùng mức cũ thì phần sửa chỉ áp từ sau ngày đó. Có ở dòng chưa ngừng, chưa huỷ (kể cả Sắp áp dụng).
    · Ngừng = chọn ngày cuối hiệu lực (không trước ngày bắt đầu). Chỉ có ở dòng Đang áp dụng và bắt đầu trước hôm nay.
    Người dùng không phân biệt nổi Đổi và Sửa ⇒ hãy đề xuất một lối vào duy nhất (ví dụ «Thay đổi…») rồi hỏi bằng lời thường «Từ một ngày áp mức mới» hay «Ghi nhầm, sửa lại». Đây là ĐỀ XUẤT để chủ dự án chọn.
3.12 Tra nhanh (đã có, giữ và đưa lên đầu): chọn một đối tác (gõ tên) HOẶC một loại, một dịch vụ, một ngày ⇒ máy chủ trả con số + câu nguồn (ví dụ «Theo mức riêng của loại Lễ tân khách sạn cho nhóm Du thuyền»). Tra theo loại thì kèm câu «Một đối tác cụ thể của loại này có thể có mức riêng hoặc chính sách riêng — gõ tên đối tác để chắc.»
3.13 Lịch sử: chỉ có các lần áp dụng / các dòng đã ngừng hoặc đã huỷ. Không có nhật ký đầy đủ «ai sửa gì lúc nào» cho trang này.

4. MỤC TIÊU THIẾT KẾ
- Xếp trang theo câu hỏi «ai được bao nhiêu», không theo bảng dữ liệu. Mỗi sự thật hiện MỘT nơi, mỗi việc có MỘT chỗ bấm.
- Mỗi loại đối tác trả lời đủ ba câu trong một dòng: đang theo chính sách nào (từ ngày nào), có mức riêng nào, có đang bị thiếu mức / giữ đơn không.
- Chính sách trình bày như một bảng giá hoa hồng: con số đứng trước, tên dịch vụ/nhóm sau; các loại đang theo nó hiện thành nhãn nhỏ.
- Mỗi vùng một nút Chính. Việc hay làm hiện sẵn; việc hiếm và việc nguy hiểm (Tắt loại, Ngừng) vào menu «⋯» với hộp hỏi lại nói rõ hậu quả. Tình trạng là nhãn (theo từ vựng trạng thái của bộ thiết kế), hành động là nút — không trộn.
- Thứ tự ưu tiên 3.6 được nhìn thấy bằng hình (ví dụ bậc thang bốn lớp ở Tra nhanh, hoặc nhãn «mức riêng — được ưu tiên» ngay cạnh số), không chỉ một câu nhắc nhỏ.
- Mục đã tắt / đã ngừng gom xuống dưới, gập lại («Đã tắt (3)»). Có ô tìm khi > 10 loại.
- Máy tính: tận dụng bề rộng (ví dụ hai cột: danh sách bên trái, chi tiết bên phải). Điện thoại: danh sách → chạm mở chi tiết, nút chính dính đáy, không có hàng nút nhỏ trong dòng.

5. TỪ NGỮ
- Tiếng Việt có dấu đầy đủ, chữ của người làm du lịch / kế toán, không chữ tiếng Anh, không mã máy. Gọi hệ thống là «Nền tảng», không gọi «App».
- Từ đã chốt, giữ nguyên: Chính sách hoa hồng · Mức riêng · Chính sách riêng · Áp dụng / Đang áp dụng / Sắp áp dụng / Đã ngừng · Ngừng / Ngừng áp dụng · Có sẵn · Tra nhanh · Thêm mức.
- Muốn đổi tên thì ghi rõ là ĐỀ XUẤT, tối đa BA tên, mỗi tên kèm lý do một câu; chủ dự án chọn. Ba chỗ nên đề xuất: (1) nút tắt của CHÍNH SÁCH (để không lẫn với tắt loại — nó chỉ chặn áp thêm); (2) lối vào chung cho Đổi/Sửa; (3) nút tắt của LOẠI (để người bấm biết nó làm giữ đơn). Không tự đặt tên mới cho thứ khác.

6. DỮ LIỆU MẪU (dùng thứ này, không dùng TA1–TA6)
Nhóm dịch vụ: Tour đảo, Long Phú, Hòn Tằm, Harbour, Vinwonders, Du thuyền. Dịch vụ ví dụ: «Tour 4 đảo · Cano», «Vé Hòn Tằm · Cano + tắm bùn», «Du thuyền ngắm hoàng hôn».
Chính sách:
  · Đại lý cấp 1 — Tour đảo 10% · Hòn Tằm 8% · Du thuyền 50.000 đ/khách (Người lớn 50.000 · Trẻ em 30.000 · Người cao tuổi 50.000) · Mọi dịch vụ khác 5%. Đang áp dụng cho: Cộng tác viên, Hướng dẫn viên độc lập; 1 đối tác dùng riêng.
  · Đại lý cấp 2 — Tour đảo 12% · Vinwonders 40.000 đ/vé · Mọi dịch vụ khác 6%. Đang áp dụng cho: Công ty lữ hành; sắp áp dụng cho Đại lý vé tàu từ 01/11/2026.
  · Giới thiệu khách — Mọi dịch vụ 30.000 đ/khách. Đang áp dụng cho: Tài xế taxi (giới thiệu khách).
  · Bảng 2025 — ĐÃ TẮT, nhưng vẫn đang áp dụng cho 1 đối tác dùng riêng (minh hoạ luật 3.8).
  · Đại lý cấp 3 — chưa có mức nào, chưa áp dụng cho loại nào.
Loại đối tác:
  · Cộng tác viên (Có sẵn) — theo Đại lý cấp 1 từ 23/10/2026.
  · Công ty lữ hành (Có sẵn) — theo Đại lý cấp 2 từ 01/10/2026 + mức riêng: Nhóm Du thuyền 60.000 đ/khách (được ưu tiên hơn chính sách).
  · Hướng dẫn viên độc lập (Có sẵn) — theo Đại lý cấp 1 từ 01/10/2026.
  · Lễ tân khách sạn (Có sẵn) — chưa theo chính sách nào, không mức riêng ⇒ CẢNH BÁO đơn bị giữ.
  · Tài xế taxi (giới thiệu khách) (Có sẵn) — theo Giới thiệu khách.
  · Đại lý vé tàu (tự thêm) — sắp áp dụng Đại lý cấp 2 từ 01/11/2026 (hôm nay chưa có mức ⇒ cảnh báo tới ngày đó).
  · Đại lý cũ 2024 (tự thêm) — Đã tắt.
Đối tác có mức riêng hoặc chính sách riêng:
  · Khách sạn Biển Xanh (Lễ tân khách sạn) — chính sách riêng Đại lý cấp 1 từ 15/10/2026.
  · Anh Minh (Hướng dẫn viên độc lập) — mức riêng «Tour 4 đảo · Cano» 15%.
  · Công ty Sóng Việt (Công ty lữ hành) — chính sách riêng Bảng 2025 (chính sách đã tắt, vẫn áp).
Hôm nay = 29/10/2026.

7. CẦN VẼ
7.1 HAI HƯỚNG để chủ dự án so, mỗi hướng có điện thoại 390 và máy tính 1040, vẽ cho Kế toán (đủ quyền):
    · Hướng A — dùng đúng dữ liệu máy chủ đang có (danh sách mức, loại, chính sách, các lần áp dụng, Tra nhanh). Làm được ngay.
    · Hướng B — thêm một bảng «loại đối tác × nhóm dịch vụ», mỗi ô là con số đang áp và nguồn của nó, nhìn một lần thấy hết. Con số mỗi ô phải do MÁY CHỦ tính (giao diện không tự chọn mức thắng) ⇒ ghi rõ «cần máy chủ làm thêm».
    Có thể giữ hoặc bỏ hai thẻ «Mức đang áp dụng» / «Thiết lập» — nếu bỏ hay gộp thì giải thích vì sao.
7.2 Một khung cho Bán hàng (chỉ xem + Tra nhanh, không nút ghi) trên điện thoại.
7.3 Các hộp trượt: Thêm mức; lối vào chung Đổi/Sửa (luật 3.11); Ngừng; Áp dụng chính sách cho loại; hộp hỏi lại khi tắt loại (nói hậu quả 3.7); hộp khi tắt chính sách (nói rõ 3.8).
7.4 Trạng thái: đang tải (khung xương); mất mạng («Không kết nối được máy chủ.»); rỗng (chưa có chính sách nào); nhiều dữ liệu (25 loại, 10 chính sách, tên dịch vụ dài — cắt một dòng, số luôn đứng trước); loại có cảnh báo giữ đơn.
7.5 Bảng chữ: liệt kê mọi nhãn, nút, câu trên các khung; đánh dấu «MỚI» chữ chưa có ở trang hiện tại.
7.6 Danh sách «cần máy chủ làm thêm»: mọi số liệu hoặc hành động mà dữ liệu hiện có chưa cung cấp (ví dụ đếm số đối tác của mỗi loại, đếm đơn đang bị giữ, bảng loại × nhóm ở hướng B).
7.7 Một đoạn ngắn đối chiếu: mỗi lỗi a–g ở mục 2 được hướng của bạn giải quyết thế nào.

8. KHÔNG ĐƯỢC LÀM
- Không để giao diện tự tính «mức nào thắng»; chỉ hiện điều máy chủ trả.
- Không vẽ nút xoá, nút cho việc máy chủ không làm được (ví dụ đổi chính sách cho loại đã tắt, tắt loại Có sẵn, Đổi/Ngừng ở dòng Sắp áp dụng), hay lịch sử đầy đủ «ai sửa gì».
- Không đổi luật nghiệp vụ ở mục 3; thấy luật nào gây khó hiểu thì ghi thành câu hỏi cho chủ dự án, không tự đổi.
- Không dùng dữ liệu thử trên ảnh làm dữ liệu mẫu.
