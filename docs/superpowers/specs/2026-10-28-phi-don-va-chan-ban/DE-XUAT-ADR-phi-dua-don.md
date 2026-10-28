# Đề xuất ADR — Phí đưa đón do Quản trị đặt: vùng đón, bảng phí có hiệu lực, dòng phí trên đơn chụp lúc xác nhận

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (Hiến pháp N3). Chép vào `docs/adr/` khi chủ duyệt, **số cấp lúc chép** (28/10: số trống kế tiếp là 0146, vì 0142, 0144, 0145 đang được nhánh hoặc worktree khác giữ). Đọc kèm `TRANG-GHEP.md` cùng thư mục.

- **Ngày:** 2026-10-28. **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** dữ liệu một chiều mềm (bảng chỉ thêm, ở lại); luật và mã đảo được; tắt bằng cách kết thúc «ngày bắt đầu áp».
- **Lời chủ (không hỏi lại):** bảng việc 13/10 (yêu cầu 1, quyết định 2: «phụ thu theo người, theo chặng, theo vùng do Quản trị đặt»); đặc tả `../2026-10-14-dot-2-gia-dua-don.md` §0 và §2 (tám câu hỏi đáp; ba quyết định đều chọn A); 28/10: Quản trị và Toàn quyền đặt phí đón linh hoạt từ màn của mình.
- **Điều kiện mở của đặc tả 14/10 đã đủ:** ADR-0117 lần 2 đã có trên `main` (migration `0097_dung_lai_muc_hoa_hong`); ADR-0118 (lượt 1) đã có trên `main` (migration `0121`).
- **Quan hệ với ADR cũ:** **giữ** ADR-0047 (chặng không mang tiền; tiền nằm ở dòng của đơn); **theo khuôn** ADR-0077 (chọn mức cụ thể nhất, chụp lúc Xác nhận) nhưng phí đón **không** vào hoa hồng; **giữ** ADR-0118 (nhóm tắt đưa đón thì không có chặng, nên không có phí); **bổ sung** ADR-0136 Đ13.3 (thêm một điều kiện vào nhánh A, xem Đ3).
- **Xây trên lỗ đang hở: TNV-G1** (đơn huỷ còn tiền đã thu, hạn 30/11): dòng phí cộng vào tổng đơn và lên biên nhận, đúng vùng của lỗ này. ADR không mở đường tính tiền mới, nhưng theo CLAUDE.md §3 chủ phải ghi «cho xây trên lỗ» kèm lý do (trường `xay_tren_cho_phep` của `docs/quyen-hoan.json`) khi duyệt, hoặc chờ lỗ được vá. Các lỗ HIGH khác (TNV-G3, TNV-G4, HC-4.2, HC-5.11, HC-5.19) không nằm trên đường này (đọc sổ ngày 28/10).

## Tóm tắt cho chủ (lời thường)
1. Quản trị chia điểm đón thành **vùng** ngay ở màn Địa điểm. Điểm chưa xếp vùng và nơi đón gõ tay đều tính là **«Ngoài vùng»**.
2. Quản trị (hoặc Toàn quyền) đặt **bảng phí đón**. Mỗi dòng nói: vùng nào, chiều đi hay về, nhóm dịch vụ nào (bỏ trống là mọi nhóm), đi chung hay xe riêng, thì thu bao nhiêu (mỗi khách, hoặc mỗi chuyến xe riêng), từ ngày nào đến ngày nào. Nhiều dòng cùng khớp thì dòng cụ thể nhất thắng; có nút Thử tra.
3. Đơn có chặng đưa đón thì máy **tự thêm dòng phí đón**; nhân viên không sửa được số. Đơn nháp hiện số «dự kiến»; lúc xác nhận máy chụp lại, nên đổi bảng phí về sau không làm đổi đơn đã xác nhận.
4. Chặng không tìm được mức nào thì đơn **không xác nhận được** và báo rõ «Quản trị cần đặt phí đón cho vùng …». Đơn Đối tác gửi thì không bị kẹt: đơn chuyển sang «chờ xác nhận» để văn phòng xử lý.
5. Phí đón không tính hoa hồng đại lý. Phí chỉ bắt đầu tính từ **ngày Quản trị bật**, sau khi đã đặt đủ mức; trước ngày đó Nền tảng chạy y như hôm nay.

## Quyết định (ba điều chạm dữ liệu hoặc tiền, đúng trần 3)
**Đ1 — Vùng đón (dữ liệu, phân hệ `locations`).** Bảng `loc_zone` (mã, tên, `active`, không xoá cứng) và cột `loc_location.zone_code` (khoá ngoại, trống = chưa xếp vùng). Mã gieo sẵn `NGOAI_VUNG`. Vùng của một chặng là vùng của **đầu khách sạn**: nơi đón ở chiều đi, nơi trả ở chiều về (giả định của đặc tả 14/10 §3.2, chủ xác nhận khi duyệt). Điểm chưa xếp vùng và chữ tự gõ đều quy về `NGOAI_VUNG` (chủ chọn A ngày 14/10). `locations` công bố view `v_loc_location_zone`; `pricing` chỉ đọc view. Ghi vùng: ô `admin.manage` (Quản trị, Toàn quyền), có nhật ký.

**Đ2 — Bảng phí đón (dữ liệu và tiền, phân hệ `pricing`).** Theo khuôn `prc_commission_rule`: cột có kiểu, ngày hiệu lực, chỉ thêm (bỏ một dòng bằng cách đặt ngày kết thúc; trigger cấm xoá và cấm sửa cột tiền).
- Mỗi dòng: `kind` gồm `PER_PAX` (nhân số khách tính tiền: người lớn, trẻ em, người cao tuổi, không đếm em bé, như ADR-0077 H7) hoặc `PER_TRIP` (một lần cho chặng xe riêng); `amount` là số nguyên VNĐ, ≥ 0; ngày bắt đầu, ngày kết thúc; ghi chú; dấu vết người tạo.
- Điều kiện là **cột có kiểu**: vùng (bắt buộc), chiều (đi, về, hoặc cả hai), nhóm dịch vụ (trống = mọi nhóm), xe riêng (có hoặc không). Thêm điều kiện về sau (giờ, mùa, loại khách đặt) là thêm một cột có thể để trống bằng migration chỉ thêm, kèm một bộ tính trong **một** danh sách đăng ký. Không dùng bảng «khoá–giá trị» tự do (Hiến chương 5.2). [người soạn; xem «Điều chủ cần biết» 1]
- Chọn mức: **một** hàm thuần, dòng cụ thể nhất thắng (đếm số điều kiện đã điền). Hai dòng cùng bậc mà khác số thì báo xung đột như hoa hồng. Hiệu lực xét theo **ngày xác nhận**, như ADR-0077. Không khớp dòng nào thì kết quả là «thiếu mức», **không bao giờ lấy 0** (Hiến chương 5.7).
- **Ngày bắt đầu áp**: một dòng chính sách có hiệu lực, Quản trị đặt. Chưa có dòng này thì không tính phí và không chặn gì. Máy từ chối đặt ngày bắt đầu khi vùng `NGOAI_VUNG` chưa có mức. [người soạn]
- Ghi bảng và ngày bắt đầu: ô `admin.manage`. Mỗi lần thêm hoặc kết thúc có nhật ký (mã vùng, mã nhóm, số tiền; không có thông tin cá nhân).

**Đ3 — Dòng phí trên đơn (tiền, phân hệ `orders`).**
- `order_item` nhận một **loại dòng mới «phí đưa đón»**: mỗi chặng còn hiệu lực một dòng, trỏ mã quy tắc đã dùng. Dòng chỉ sinh trong `buildLines` (Hiến chương 5.4). Gốc lắp ráp tiêm hàm tra mức vào `orders` theo kiểu `ctx.mocToiThieu`, nên `orders` không import `pricing`. Số tiền trình duyệt gửi lên bị bỏ qua.
- Nháp: tính lại mỗi lần lưu, hiện «dự kiến». Xác nhận (`/status`, Còn vé, Gửi đơn nhánh B): chụp dòng và mã quy tắc trong cùng lô xác nhận; sau đó không đọc lại bảng phí. Sửa số khách sau xác nhận thì tính lại theo mức đã chụp (như ADR-0133 điều 3). Thay chặng sau xác nhận thì chụp lại theo bảng ngày hôm đó, trong cùng lô với lệnh thay chặng.
- Thiếu mức: cửa xác nhận trả 409 `transfer_fee_missing`, đơn ở lại nháp, câu báo nêu vùng và người phải xử lý. **Bổ sung ADR-0136 Đ13.3:** tài khoản Đối tác bấm Gửi đơn mà có chặng thiếu mức thì đơn đi **nhánh A** (chờ xác nhận), cùng kiểu với «chặng dưới mốc chưa đặt gấp»; văn phòng xác nhận sau khi Quản trị đặt mức.
- Dòng phí không vào hoa hồng (đặc tả 14/10, quyết định 2 = A). Dòng phí lên biên nhận bằng một mục mới trong danh sách trắng của `receipt` (Hiến chương 4.4).

## Không làm ở ADR này [người soạn]
- **Giảm tự động và giảm tay có lý do.** Chủ chọn ngày 14/10 cho hai thứ này vào lượt 2. Người soạn tách chúng ra **ADR kế tiếp**, vì lượt này đã đủ trần 3 quyết định, và vì giảm cần luật chồng giảm cùng sổ vàng riêng. Cột `kind` để sẵn chỗ cho loại giảm.
- Mã khuyến mại (chỉ chừa chỗ, gắn với Đợt 4). Phía chi (thuê xe) vẫn tách hẳn. Lãi lỗ theo chuyến.

## Điều chủ cần biết
1. Đặc tả 14/10 ghi «thêm giờ, mùa, đối tượng sau mà không đổi bảng». Người soạn chọn **cột có kiểu** vì Hiến chương 5.2 cấm trường mở rộng tự do, và bảng hoa hồng cũng đang dùng cột. Cái giá: mỗi loại điều kiện mới cần một migration nhỏ, chỉ thêm, không làm lại lõi. Nếu chủ muốn đúng nghĩa «không đổi bảng» thì nói, người soạn viết lại Đ2 kèm cách vẫn giữ được 5.2.
2. Thứ tự bật: Quản trị xếp vùng, đặt mức cho mọi vùng và cho Ngoài vùng (vùng không thu thì đặt 0 rõ ràng), rồi mới đặt ngày bắt đầu áp.
3. **Kế toán chưa đọc.** Sổ vàng `golden/phi-dua-don.json` (khoảng 10 ca: một vùng, hai chặng, có em bé, nơi đón gõ tay, xe riêng, hai dòng chồng nhau, đổi mức sau xác nhận, đơn đại lý) phải được Kế toán xác nhận **trước khi viết mã** (Hiến chương 5.17).
4. Chưa kiểm dữ liệu thật: bao nhiêu nơi đón đang là chữ gõ tay. Cần một câu đếm chỉ đọc do chủ chạy trước khi bật.

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)
Giữ tiêu chí 1, 2, 3, 4, 5, 6, 8 của đặc tả 14/10 §3.5, bỏ phần giảm giá; tiêu chí 7 đổi thành: Bán hàng, Đối tác, Thực tập, Kế toán ghi bảng phí hoặc vùng thì nhận 403; Quản trị, Toàn quyền ghi được, có nhật ký. Thêm ba tiêu chí:
- Chưa có ngày bắt đầu áp: đơn có chặng xác nhận như hôm nay, không có dòng phí.
- Đối tác Gửi đơn có chặng thiếu mức: đơn vào «chờ xác nhận», không nhận 409.
- Biên nhận của đơn có phí đón hiện đúng một dòng «Phí đưa đón» cho mỗi chặng, đúng số đã chụp.
