# ADR-0147 — Phí đưa đón do Quản trị đặt: vùng đón, bảng phí có hiệu lực, dòng phí trên đơn chụp lúc xác nhận

- **Trạng thái:** **accepted** 2026-10-28 — chủ dự án trong chat. Lần duyệt này nối sau ADR-0146 (chính sách bán); xem dòng Trạng thái của ADR-0146 về cách ghi hai lần duyệt nối tiếp.
  - Phiên soạn hỏi «Bạn muốn duyệt lượt nào trước?» (hai nút: chặn bán trước, phí đón trước). Chủ gõ, nguyên văn: *«cả chặn bán và phí đón»*.
  - Hộp chọn cùng ngày, câu «Phí đón thêm một dòng tiền vào đơn, mà phần đó còn dính lỗ «đơn huỷ vẫn hiện tiền còn nợ» (hạn vá 30/11). Bạn có cho xây phí đón trên lỗ này không?». Chủ gõ, ngoài hai phương án được đưa ra («Chưa cho, chờ lỗ vá», «Cho phép, có ghi lý do»), nguyên văn: *«vá luôn lỗi và thêm dòng tiền vào đơn»*. Xem dòng «Xây trên lỗ đang hở».
  - Câu «Có đặt điều kiện «phí đón chỉ được phát hành sau khi đã diễn tập khôi phục dữ liệu» như lần sổ đại lý đợt 2 không?»: chủ chọn *«Không đặt điều kiện này»*.
  - Ba điều chạm dữ liệu hoặc tiền (Đ1, Đ2, Đ3), đúng trần 3 (`CLAUDE.md` §9). Các chỗ đánh dấu **[người soạn]** được duyệt theo khuyến nghị của người soạn. Bốn chỗ người soạn tự chọn đã được nêu với chủ trước khi duyệt: tách giảm giá ra ADR sau; phí đón vào phần của Tour Đảo; vùng theo đầu khách sạn, điểm chưa xếp vùng tính Ngoài vùng; đổi chặng sau xác nhận không tự đổi phí.
  - AI soạn và chép, không tự duyệt (Hiến pháp N3). Người kiểm độc lập chỉ đọc đã soát sự thật bản nguồn một vòng ngày 28/10. Lần sửa cuối của bản nguồn (commit `e7ba6e80`: đổi chặng sau xác nhận không đổi phí) được soát ở vòng kiểm bản chép này.
- **Số và nguồn:** ADR này là đề xuất `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/DE-XUAT-ADR-phi-dua-don.md` (28/10, hồ sơ có ngày, không sửa). Trang ghép: `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md`.
  - Số 0147 kiểm còn trống ngày 28/10. Chính sách bán duyệt trước nên lấy 0146, đúng như dòng đầu của đề xuất đã định.
  - **Phần đầu** do người chép viết theo khuôn ADR-0136. Các dòng Lời chủ, Điều kiện mở, Quan hệ với ADR cũ, Xây trên lỗ đang hở chép từ dòng đầu của đề xuất.
  - **Từ «Tóm tắt cho chủ» trở xuống** giữ từng chữ của bản chủ duyệt. Mọi chữ người chép thêm đánh dấu **[chép 28/10]**, trừ tiêu đề.
- **Ngày:** 2026-10-28. **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** dữ liệu một chiều mềm (bảng chỉ thêm, ở lại); luật và mã đảo được; tắt bằng cách kết thúc «ngày bắt đầu áp».
- **Lời chủ (không hỏi lại):**
  - bảng việc 13/10, yêu cầu 1, quyết định 2: «phụ thu tính theo người, theo chặng, theo vùng do Quản trị đặt trong danh mục»;
  - đặc tả `docs/superpowers/specs/2026-10-14-dot-2-gia-dua-don.md` §0 và §2: tám câu hỏi đáp, ba quyết định đều chọn A;
  - ngày 28/10, do phiên điều phối chuyển lại: Quản trị và Toàn quyền đặt phí đón linh hoạt từ màn của mình.
- **Điều kiện mở của đặc tả 14/10 đã đủ.** ADR-0117 lần 2 đã có trên `main` (migration `0097_dung_lai_muc_hoa_hong`). ADR-0118 (lượt 1) cũng đã có (migration `0121`).
- **Quan hệ với ADR cũ:**
  - **giữ** ADR-0047: chặng không mang tiền, tiền nằm ở dòng của đơn;
  - **theo khuôn** ADR-0077: chọn mức cụ thể nhất, chụp lúc Xác nhận; nhưng phí đón **không** vào hoa hồng;
  - **giữ** ADR-0118: nhóm tắt đưa đón thì không có chặng, nên không có phí;
  - **sửa** ADR-0136 Đ13.2 và Đ13.3, chỉ cho trường hợp thiếu phí đón (xem Đ3). Tệp ADR-0136 không sửa; phần sửa chỉ nằm ở ADR này. [chép 28/10]
  - Cổng luật bán của ADR-0146 đứng trước cổng thiếu phí đón (ADR-0146, tiêu chí 12). [chép 28/10]
- **Xây trên lỗ đang hở: TNV-G1** (đơn huỷ còn tiền đã thu, hạn 30/11).
  - Dòng phí cộng vào tổng đơn và lên biên nhận, tức nằm đúng vùng của lỗ này.
  - Chủ phải ghi «cho xây trên lỗ» kèm lý do (trường `xay_tren_cho_phep` của `docs/quyen-hoan.json`) khi duyệt, hoặc chờ lỗ được vá.
  - Các lỗ HIGH khác không nằm trên đường này (đọc sổ ngày 28/10).
  - **Lời chủ 28/10:** *«vá luôn lỗi và thêm dòng tiền vào đơn»* (dòng Trạng thái). Đã ghi vào `xay_tren_cho_phep` của mục TNV-G1. Việc vá lỗ chạy ở một phiên riêng, nhánh riêng. Người chép hiểu lời này là: duyệt phí đón ngay, vá lỗ ngay, và **phí đón không phát hành trước khi mục TNV-G1 được đóng** trong `docs/quyen-hoan.json`. Đây là cách hiểu chặt hơn, đảo được; chủ muốn khác thì sửa bằng một câu. [chép 28/10]
- **Phát hành và thi công** [chép 28/10]:
  - Mã chỉ bắt đầu viết sau khi sổ vàng `golden/phi-dua-don.json` được Kế toán (hoặc chủ thay Kế toán) xác nhận (Hiến chương 5.17; «Điều chủ cần biết» 3).
  - Không đặt điều kiện «phát hành sau diễn tập khôi phục» (lỗ HC-5.19); đó là lựa chọn của chủ ngày 28/10 («Điều chủ cần biết» 5).
  - Không phụ thuộc ADR-0146.
  - Số migration lấy lúc thi công, theo luật từ bản 1.46 (`docs/adr/README.md`).

## Tóm tắt cho chủ (lời thường)
1. Quản trị chia điểm đón thành **vùng** ngay ở màn Địa điểm. Nơi đón gõ tay tính là **«Ngoài vùng»**.
2. Quản trị hoặc Toàn quyền đặt **bảng phí đón**.
   - Mỗi dòng nói: vùng nào, chiều đi hay về, nhóm dịch vụ nào, đi chung hay xe riêng, thì thu bao nhiêu. Phí tính theo mỗi khách, hoặc theo mỗi chuyến nếu là xe riêng. Mỗi dòng có ngày bắt đầu và ngày kết thúc.
   - Nhiều dòng cùng khớp thì dòng cụ thể nhất thắng. Có nút Thử tra.
3. Đơn có chặng đưa đón thì máy **tự thêm dòng phí đón**; nhân viên không sửa được số. Đơn nháp hiện số «dự kiến». Lúc xác nhận máy chụp lại, nên đổi bảng phí về sau không làm đổi đơn đã xác nhận.
4. Chặng không tìm được mức nào thì văn phòng **không xác nhận được** đơn, và máy báo rõ «Quản trị cần đặt phí đón cho vùng …». Đơn do Đối tác gửi thì không bị kẹt: đơn chuyển sang «chờ xác nhận» để văn phòng xử lý.
5. Phí đón không tính hoa hồng đại lý, và trên biên nhận thuộc phần của Tour Đảo.
6. Phí chỉ bắt đầu tính từ **ngày Quản trị bật**, sau khi đã đặt đủ mức. Trước ngày đó Nền tảng chạy y như hôm nay.

## Quyết định (ba điều chạm dữ liệu hoặc tiền, đúng trần 3)
**Đ1 — Vùng đón (dữ liệu, phân hệ `locations`).**
- Thêm bảng `loc_zone` (mã, tên, `active`, không xoá cứng) và cột `loc_location.zone_code` (khoá ngoại; trống nghĩa là chưa xếp vùng). Gieo sẵn mã `NGOAI_VUNG`.
- Vùng của một chặng là vùng của **đầu khách sạn**: nơi đón ở chiều đi, nơi trả ở chiều về. Đây là giả định của đặc tả 14/10 §3.2, **chủ chưa xác nhận**. [chép 28/10: giả định này nằm trong bốn chỗ người soạn tự chọn đã nêu với chủ trước khi duyệt — dòng Trạng thái]
- Chữ gõ tay quy về `NGOAI_VUNG` (chủ chọn A ngày 14/10). Điểm danh mục chưa xếp vùng và đầu khách sạn còn trống cũng quy về đó. [người soạn]
- `locations` công bố view `v_loc_location_zone`. Phân hệ `orders` đọc view này (cạnh `orders → locations` đã có) rồi truyền mã vùng cho `pricing` trong một bộ dữ liệu phẳng, đúng như đặc tả 14/10 §3.2. Như vậy không thêm cạnh phụ thuộc mới.
- Ghi vùng bằng ô `admin.manage` (Quản trị, Toàn quyền), có nhật ký.

**Đ2 — Bảng phí đón (dữ liệu và tiền, phân hệ `pricing`).** Theo khuôn `prc_commission_rule`: ngày hiệu lực, chỉ thêm (bỏ một dòng bằng cách đặt ngày kết thúc; trigger cấm xoá và cấm sửa cột tiền).
- **Mỗi quy tắc** có:
  - `kind`: `PER_PAX` nhân với số khách tính tiền (người lớn, trẻ em, người cao tuổi; không đếm em bé, như ADR-0077 H7), hoặc `PER_TRIP` tính một lần cho chặng xe riêng;
  - `amount`: số nguyên VNĐ, ≥ 0;
  - ngày bắt đầu, ngày kết thúc, ghi chú, dấu vết người tạo.
- **Điều kiện là dòng (khoá, giá trị)**, đúng như chủ chọn 14/10 («thêm giờ, mùa, đối tượng sau mà không đổi bảng»).
  - Khoá lấy từ một **bảng tra cứu có khoá ngoại**, nên CSDL chỉ nhận khoá có trong bảng. Mỗi khoá có một bộ tính trong **một** danh sách đăng ký ở mã, và một bài kiểm bắt hai danh sách phải khớp nhau.
  - Khoá lượt này: vùng (bắt buộc), chiều, nhóm dịch vụ, xe riêng. Giờ, mùa và loại khách đặt thêm sau, mỗi khoá bằng một dòng tra cứu và một bộ tính, kèm ADR, không đổi bảng.
  - Không có trường tự do hay JSON, nên không phạm Hiến chương 5.2. Giá trị điều kiện được kiểm theo từng khoá ở máy chủ. Cái giá: ràng buộc ở CSDL yếu hơn cột riêng.
- **Chọn mức:**
  - **Một** hàm thuần, dòng cụ thể nhất thắng (đếm số điều kiện). Hai dòng cùng bậc mà khác số thì báo xung đột, như hoa hồng.
  - Hiệu lực xét theo **ngày xác nhận**, như ADR-0077.
  - Không khớp dòng nào thì kết quả là «thiếu mức», **không bao giờ lấy 0** (Hiến chương 5.7).
- **Ngày bắt đầu áp:** một dòng chính sách có hiệu lực, do Quản trị đặt. Chưa có dòng này thì không tính phí và không chặn gì. Máy từ chối đặt ngày bắt đầu khi `NGOAI_VUNG` chưa có mức. [người soạn]
- **Quyền và nhật ký:** ghi bảng và ngày bắt đầu bằng ô `admin.manage`. Mỗi lần thêm hoặc kết thúc có nhật ký, ghi mã vùng, mã nhóm và số tiền; không ghi thông tin cá nhân.

**Đ3 — Dòng phí trên đơn (tiền, phân hệ `orders`).**
- **Loại dòng mới.** `order_item` nhận loại dòng **«phí đưa đón»**: mỗi chặng còn hiệu lực một dòng, trỏ về mã quy tắc đã dùng.
  - Dòng chỉ sinh trong `buildLines` (Hiến chương 5.4). Hàm chọn mức gọi qua `index.ts` của `pricing`; cạnh `orders → pricing` đã có từ trước.
  - Số tiền trình duyệt gửi lên bị bỏ qua.
- **Nháp và lúc xác nhận.**
  - Đơn nháp được tính lại mỗi lần lưu và hiện «dự kiến».
  - Xác nhận (`/status`, Còn vé, Gửi đơn nhánh B) chụp dòng và mã quy tắc trong cùng lô xác nhận.
- **Sau xác nhận** dòng đã chụp không đổi, vì trigger `0081` khoá dòng tiền và **không nới**.
  - **Sửa số khách**: phí theo khách tính lại theo mức đã chụp (như ADR-0133 điều 3), trong cùng hàm tiền hiệu lực `computeEffectiveMoney` mà sửa số khách đang dùng. Không thêm đường ghi nào, và vẫn chỉ người có ô `order.money.edit` làm được.
  - **Thêm, bỏ hoặc thay chặng**: phí đã chụp **giữ nguyên**, không có dòng tiền nào được ghi. Muốn thu thêm hay trả bớt thì dùng điều chỉnh sổ công nợ, có người thứ hai duyệt (ADR-0115). [người soạn; xem «Điều chủ cần biết» 1]
  - Lý do chọn cách này: dòng điều chỉnh `order_money_adjustment` hôm nay chỉ ghi **số khách** theo dịch vụ, chưa có dạng cho chặng. Ô sửa chặng sau xác nhận (`order.trip.edit`) cũng rộng hơn ô sửa tiền (`order.money.edit`): Bán hàng là người phụ trách mà không phải người lập thì sửa được chặng, nhưng không sửa được tiền. Cho chặng tự đổi tiền là mở cho họ một cửa đổi tiền mà họ không có quyền.
- **Thiếu mức.**
  - `/status` và Còn vé nhận 409 `transfer_fee_missing`; đơn ở lại nháp. Câu báo nêu vùng và người phải xử lý.
  - Cửa **Gửi xác nhận** không đi qua hàm cổng chung, nên phải có chốt riêng, trả cùng 409, như ADR-0118 đã làm với nhóm tắt đưa đón.
  - Riêng **Gửi đơn** của Đối tác: cổng này không từ chối mà buộc đơn đi **nhánh A**, tức mở yêu cầu xác nhận có ghi lý do «thiếu phí đón». Đây là chỗ **sửa ADR-0136**: Đ13.2 («cổng trượt thì ở lại nháp») có thêm một ngoại lệ, và Đ13.3 có thêm một điều kiện vào nhánh A. Lý do: Đối tác không tự xếp vùng được. Văn phòng xác nhận sau khi Quản trị đặt mức. Lý do «thiếu phí đón» lưu ở đâu do kế hoạch chọn; nếu phải thêm giá trị vào một ràng buộc có sẵn thì đó là migration.
- **Tiền đi đâu.**
  - Dòng phí không vào hoa hồng (đặc tả 14/10, quyết định 2 = A).
  - Trên biên nhận, và ở hàm chia phần người bán `chiaPhanNguoiBan` (billing dùng cùng hàm này cho trần phần của quầy), phí đón thuộc **phần của Tour Đảo**, không thuộc người bán của dịch vụ có chặng đó. [người soạn; chủ và Kế toán xác nhận ở sổ vàng]
  - Biên nhận có thêm mục «Phí đưa đón» trong danh sách trắng (Hiến chương 4.4).

## Không làm ở ADR này [người soạn]
- **Giảm tự động và giảm tay có lý do.** Chủ chọn ngày 14/10 cho hai thứ này vào lượt 2. Người soạn tách chúng ra **ADR kế tiếp**, vì lượt này đã đủ trần 3 quyết định, và vì giảm cần luật chồng giảm cùng sổ vàng riêng. Cột `kind` để sẵn chỗ cho loại giảm.
- Mã khuyến mại (chỉ chừa chỗ, gắn với Đợt 4). Phía chi (thuê xe) vẫn tách hẳn. Lãi lỗ theo chuyến.

## Điều chủ cần biết
1. **Đổi chặng sau xác nhận không tự đổi phí.** Khách thêm chặng về sau khi đơn đã xác nhận thì phí chặng đó không tự cộng; văn phòng phải ghi điều chỉnh sổ công nợ, có người thứ hai duyệt. Cách khác là mở rộng dòng điều chỉnh để mang cả phí theo chặng, nhưng cách đó đổi dữ liệu của một bảng tiền đã khoá và phải chốt lại ai được đổi. Người soạn khuyên làm cách đơn giản trước; nếu phát sinh nhiều thì làm ADR riêng.
2. **Thứ tự bật phí đón:**
   1. Quản trị xếp vùng cho các điểm đón.
   2. Đặt mức cho mọi vùng và cho Ngoài vùng. Vùng không thu thì đặt 0 rõ ràng.
   3. Cuối cùng mới đặt ngày bắt đầu áp.
3. **Kế toán chưa đọc.** Sổ vàng `golden/phi-dua-don.json` phải được Kế toán xác nhận **trước khi viết mã** (Hiến chương 5.17). Sổ có khoảng 12 ca: một vùng, hai chặng, có em bé, nơi đón gõ tay, xe riêng, hai dòng chồng nhau, đổi mức sau xác nhận, thêm chặng sau xác nhận, đơn đại lý, chia phần khi dịch vụ do người bán khác bán.
4. **Chưa kiểm dữ liệu thật:** bao nhiêu nơi đón đang là chữ gõ tay. Cần một câu đếm chỉ đọc do chủ chạy trước khi bật.
5. **Chủ tự quyết** có áp điều kiện «chỉ phát hành sau diễn tập khôi phục» (lỗ HC-5.19) cho lượt này hay không. Sổ đại lý đợt 2 từng gắn điều kiện đó cho một phát hành ghi tiền một chiều. [chép 28/10: chủ đã chọn «Không đặt điều kiện này» — dòng Trạng thái]

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)
Giữ các tiêu chí 1, 2, 3, 4, 5, 8 của đặc tả 14/10 §3.5, bỏ phần giảm giá. Hai tiêu chí còn lại đổi như sau:
- **Tiêu chí 6:** thêm một khoá điều kiện giả mà `orders` và `van-chuyen` không phải sửa dòng nào; `van-chuyen` không import `pricing`.
- **Tiêu chí 7:** Bán hàng, Đối tác, Thực tập, Kế toán ghi bảng phí hoặc vùng thì nhận 403; Quản trị, Toàn quyền ghi được, có nhật ký.

Thêm năm tiêu chí:
- Chưa có ngày bắt đầu áp: đơn có chặng xác nhận như hôm nay, không có dòng phí.
- Đối tác Gửi đơn có chặng thiếu mức: đơn vào «chờ xác nhận», không nhận 409. Văn phòng Gửi xác nhận cùng đơn đó: nhận 409 `transfer_fee_missing`.
- Thêm chặng sau xác nhận: không dòng tiền nào được ghi và tổng đơn không đổi. Sửa số khách sau xác nhận: phí theo khách đổi đúng theo mức đã chụp; Bán hàng phụ trách mà không phải người lập thì nhận 403, như hôm nay.
- Biên nhận của đơn có phí đón: mỗi chặng đúng một dòng «Phí đưa đón», đúng số đã chụp, nằm trong phần của Tour Đảo.
- Thử tra trả cùng số với đơn thật.
