# ADR-0230 — Đơn đối tác toàn vé Tour Đảo hiện vé ngay; hình thức «Trả lúc check-in»; «Vé do ai phát» theo nhóm

- **Trạng thái:** **accepted** 2026-11-22 — chủ dự án trả lời trong phiên điều phối (hồ sơ `docs/superpowers/plans/2026-11-22-quyet-dinh-chu-ke-hoach-16-viec.md` ở nhánh `claude/partner-features-detailed-plan-f32f89`), nguyên văn mục 2: *«Duyệt đề xuất»* (lượt gồm ADR-0230), mục 4: *«ok. Tuy nhiên cần đổi tên nút "Trả với hướng dẫn viên" thành tên khác, đề xuất: Trả lúc check-in»*. Người điều phối ghi cách đọc: chủ chọn **phương án B** (dùng lại dấu «Trả sau theo dịch vụ»), tên hình thức «Trả lúc check-in». Trước đó (21/11) chủ trả lời câu 1 của kế hoạch: *«còn lại áp dụng như khuyến nghị»* — ai chịu nợ và ai được chọn hình thức theo khuyến nghị (Đ2 mục 3–4). Người ghi chép (AI) ghi lại lời chủ, không tự duyệt (Hiến pháp N3). Bản nháp (proposed 21/11) đã đọc lại sau khi chủ chọn B; Đ1 viết lại cho B, nội dung quyết định không đổi.
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều về hành vi (gỡ dấu, gỡ dòng nhóm, bỏ hình thức ở đơn mới); dấu chụp trên đơn ở lại; vé đã mở không lấy lại được (ADR-0153 Đ1 mục 6).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở mục cuối tệp.
- **Số giữ trước:** ADR-0230; migration `0186` (bảng «Vé do ai phát» theo nhóm + bảng dấu Trả sau theo dịch vụ — không đụng `orders`), `0187` (cột `orders.credit_basis` + bảng «Trả lúc check-in» — mọi thay đổi trên `orders` gom một tệp).
- **Xây trên lỗ đang hở:** `HC-4.2`, `HC-5.19`. Chủ 22/11 mục 1: *«Đồng ý khuyến nghị, và bỏ qua việc diễn tập khôi phục dữ liệu - ghi quyết định»* — dòng `xay_tren_cho_phep_adr_0230` ở hai mục của `docs/quyen-hoan.json`; hạn của hai lỗ không đổi ở ADR này.
- **Quan hệ với ADR cũ:**
  - **Thi công** ADR-0178 Đ2, Đ3 («Trả sau theo dịch vụ», duyệt 6/11, chưa có mã) và **sửa** Đ2 mục 1–2 như ghi ở Đ1 dưới đây. Điều kiện trước «chờ ADR-0177» của kế hoạch 6/11 đã hết: ADR-0177 được ADR-0182 thay và ADR-0182 đã lên production.
  - **Sửa** ADR-0175 Đ2.2 và ADR-0170 Đ2 chỉ qua đường sẵn có: đơn Trả sau theo dịch vụ là đơn Trả sau, nên nhánh Trả sau của cổng mở vé (`moVeDuoc`) mở vé Tour Đảo trước tiền. Không thêm nhánh mới vào cổng mở vé.
  - **Bổ sung** ADR-0178 Đ1 và ADR-0225 (đơn đối tác chỉ thu tiền mặt) cho «Trả lúc check-in» (Đ2).
  - **Giữ** ADR-0136 (dịch vụ bật «cần xác nhận» thì đơn chờ văn phòng), ADR-0153 Đ1 mục 6, ADR-0079 điều 3, ADR-0224 (đối tác có Trả sau chỉ thấy «Trả sau»), cột `orders.payment_term` và CHECK của nó (migration `0141`) không đổi.

## Bối cảnh

Hôm nay vé Tour Đảo hiện ngay khi đơn văn phòng xác nhận. Đơn thuộc diện đối tác thì theo tiền: đối tác Trả sau thấy vé trước khi trả, đối tác Thanh toán ngay phải chờ đủ tiền. Chủ muốn đơn toàn vé Tour Đảo hiện vé ngay khi gửi thành công, có thêm hình thức «khách trả tiền mặt khi check-in», và đặt được «Vé do ai phát» cho cả nhóm.

## Đ1 — Đơn đối tác toàn vé Tour Đảo: Trả sau theo dịch vụ, vé mở trước tiền

1. **Dấu «Trả sau theo dịch vụ»** (ADR-0178 Đ2 mục 1): bảng chỉ thêm của `billing`, dòng theo nhóm hoặc theo dịch vụ, có số giờ trả và giờ ân hạn. Dấu dịch vụ thắng dấu nhóm của chính dịch vụ đó. Chỉ Toàn quyền đặt/gỡ (ADR-0178 Đ3).
2. **Đơn đủ điều kiện** (sửa ADR-0178 Đ2 mục 2): bên đặt là hồ sơ mang loại đối tác được hưởng hoa hồng; đơn có **ít nhất một** dịch vụ «Có vé» (ADR-0174); **mọi** dịch vụ «Có vé» trong đơn đều có «Vé do ai phát» hiện hành là Tour Đảo (theo Đ3) **và** có dấu; dịch vụ không «Có vé» không cần dấu và không tính; có dòng nhập tay thì không đủ điều kiện. Một dịch vụ vé hãng ngoài, hoặc một dịch vụ vé Tour Đảo không dấu, làm **cả đơn** không đủ điều kiện — đơn đi Thanh toán ngay hoặc Trả sau theo hạn mức như hôm nay. *(AI tự quyết theo chữ «mọi»; «ít nhất một» để đơn toàn dịch vụ không vé không thành nợ không trần.)*
3. **Chụp lúc xác nhận** (ADR-0178 Đ2 mục 2): đơn đủ điều kiện thành `payment_term = 'CREDIT'` với cột mới `credit_basis = 'SERVICE'` và hai mốc giờ; đơn Trả sau cũ có `credit_basis = 'LIMIT'`. CSDL cấm đổi `credit_basis` khi đã có. Sửa dấu hay đổi nhóm sau đó không đổi đơn đã xác nhận. Không kiểm hạn mức, không tính vào nợ dùng hạn mức; vẫn từ chối khi bên đặt có đơn Trả sau bất kỳ loại nào đã hết ân hạn còn nợ. Hạn trả = giờ xác nhận + số giờ nhỏ nhất của các dịch vụ có dấu trong đơn.
4. **Sau xác nhận** mọi luật Trả sau áp nguyên (nhắc, nới hạn, chặn khi quá hạn, hoa hồng sau khi thu đủ). Sửa đơn làm đơn hết đủ điều kiện ⇒ từ chối. Màn nợ tách «theo hạn mức» và «theo dịch vụ»; «còn được dùng» chỉ tính số thứ nhất.
5. **Đối tác thấy gì trên form:** điều kiện tuỳ dịch vụ trong đơn, nên form xét lại mỗi khi thêm/bớt dịch vụ. Đơn đủ điều kiện ⇒ chỉ «Trả sau» (cùng luật ADR-0224 cho đối tác có Trả sau). Không đủ ⇒ như hôm nay (ADR-0224), cộng «Trả lúc check-in» theo Đ2. Máy chủ quyết lại lúc lưu và lúc xác nhận bằng cùng một luật thuần. Đơn có dịch vụ «cần xác nhận» chờ văn phòng; vé hiện khi đơn đã xác nhận.
6. **Danh sách đầu tiên:** chủ chưa nêu. Giả định (điều phối ghi 22/11): cấu hình bằng dữ liệu, ví dụ chủ nêu là dịch vụ «Tour 3 đảo». Dấu cần số giờ trả và ân hạn — con số tiền chưa ai chọn — nên **không gieo trong migration**; Toàn quyền đặt trên màn Dịch vụ & giá. *(Gieo trong migration sẽ mở nợ không trần cho mọi đối tác ngay khi triển khai.)*

## Đ2 — Hình thức «Trả lúc check-in»

1. Lưu bằng **bảng riêng chỉ thêm của `orders`** (một dòng mỗi đơn, chọn khi còn nháp, CSDL khoá sau nháp như `payment_term`). Đơn mang dòng này vẫn `payment_term = 'PREPAID'`. **Không** thêm giá trị vào CHECK của `orders.payment_term` (buộc dựng lại bảng đơn hàng).
2. Ý nghĩa: khách trả tiền mặt khi check-in (hướng dẫn viên hoặc nhân viên Tour Đảo tại nơi đón thu). Hướng dẫn viên phụ trách thấy số cần thu và ghi thu tiền mặt bằng ô sẵn có (`money.view`, `payment.receive` phạm vi đơn phụ trách — không nới ô nào). Máy chủ chỉ nhận khoản khách trả bằng tiền mặt cho đơn này; không QR, không chuyển khoản — dùng chung luật «chỉ tiền mặt» của ADR-0225, không dựng cơ chế thứ hai.
3. **Ai được chọn (chủ đã chốt 21/11):** đơn văn phòng lập và đơn của đối tác **không** có Trả sau dùng được. Đơn đối tác cần công tắc «Khách của đối tác trả cho Công ty» Bật lúc lập (chủ chốt để Bật, chỉ tiền mặt); đơn lập lúc Tắt không có hình thức này. Đơn văn phòng: vé mở lúc xác nhận như hôm nay. Đơn đối tác: vé theo cổng tiền như đơn Thanh toán ngay — mở khi thu đủ lúc check-in.
4. **Khách không trả (chủ đã chốt 21/11):** đơn văn phòng — khách nợ Tour Đảo; đơn đối tác — đối tác nợ Tour Đảo (công nợ đại lý theo ADR-0182, như mọi khoản chưa thu). «Khách đã trả đủ» vẫn đòi thu đủ.

## Đ3 — «Vé do ai phát» theo nhóm

1. Bảng chỉ thêm mới của `catalog` cùng khuôn ô «Có vé» (`ctl_service_ticket_flag`, `0142`: phạm vi SERVICE hoặc GROUP). Giá trị hiện hành của một dịch vụ = dòng riêng của dịch vụ nếu có, không thì dòng của nhóm hiện tại, không thì như hôm nay.
2. Một view công bố giá trị đã gộp; mọi nơi đọc «Vé do ai phát» theo dịch vụ chuyển sang view gộp. Nguồn của từng vé vẫn lấy từ lô (`vdt_batch.source`), đổi nhóm không đổi vé đã tạo.
3. Ai đặt: cùng ô quyền đang dùng cho «Vé do ai phát» theo dịch vụ.

## Kiểm (tiêu chí nghiệm thu, viết trước khi làm)

- Toàn quyền đặt dấu Trả sau theo dịch vụ 24 giờ cho dịch vụ vé Tour Đảo X. Đối tác không có hạn mức lập đơn 4 vé X → form chỉ có «Trả sau» → gửi → đơn xác nhận, vé hiện ngay, hạn trả = giờ xác nhận + 24 giờ.
- Cùng đơn thêm một dịch vụ vé hãng ngoài → form không còn «Trả sau» theo dịch vụ; gửi thẳng Trả sau lên máy chủ → bị từ chối (đối tác không hạn mức).
- Đơn chỉ có dịch vụ không «Có vé» có dấu → không đủ điều kiện.
- Đối tác có một đơn Trả sau theo dịch vụ hết ân hạn còn nợ → đơn Trả sau mới (hai loại) bị từ chối với lỗi «có đơn quá hạn».
- Gỡ dấu hoặc chuyển dịch vụ khỏi nhóm có dấu sau xác nhận → hạn trả, loại của đơn cũ không đổi; sửa đơn thêm lại dịch vụ đó → 409.
- Nợ Trả sau theo dịch vụ không làm giảm «còn được dùng» của hạn mức.
- Đơn văn phòng chọn «Trả lúc check-in» → hướng dẫn viên phụ trách ghi thu tiền mặt được; ghi thu chuyển khoản → bị từ chối; không có QR.
- Đối tác có Trả sau → không thấy «Trả lúc check-in». Đơn đối tác lập lúc công tắc Tắt → không có hình thức này.
- Đặt «Vé do ai phát = Tour Đảo» cho nhóm → dịch vụ trong nhóm hiện Tour Đảo; dịch vụ có dòng riêng giữ giá trị riêng.
- Sổ vàng tiền: hạn trả theo giờ nhỏ nhất, tách nợ hai loại, chặn khi quá hạn. Hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## Phương án đã loại

- **Thêm giá trị mới vào CHECK của `orders.payment_term`.** Buộc dựng lại cả bảng đơn hàng.
- **Danh sách riêng chỉ để mở vé (phương án A).** Chủ chọn B: A để nợ không có hạn trả, không chặn khi quá hạn, và có hai danh sách gần giống nhau.
- **Mở theo từng vé** (vé Tour Đảo có dấu mở ngay dù đơn có vé hãng ngoài). Lệch chữ «mọi».
- **Gieo dấu «Tour 3 đảo» trong migration.** Mở nợ không trần cho mọi đối tác ngay lúc triển khai, với số giờ chưa ai chọn.

## Hệ quả chủ cần biết

- Vé mở trước tiền ở đơn đối tác ⇒ có thể mất tiền thật nếu đối tác không trả; có hạn trả và chặn đơn mới khi quá hạn, nhưng **không có trần số tiền** (như ADR-0178 đã báo).
- Đặt dấu cho một nhóm là mở Trả sau không trần cho mọi dịch vụ vé Tour Đảo trong nhóm, kể cả dịch vụ thêm vào nhóm sau này.
- Đơn đối tác «Trả lúc check-in» không mở vé trước tiền: khách nhận vé khi đã trả đủ lúc check-in.

## Trang ghép

1. **Bảng chứa loại gì.** Bảng dấu Trả sau theo dịch vụ (mới, `billing`): dòng nhóm hoặc dịch vụ. `orders` thêm `credit_basis` (chụp lúc xác nhận). Bảng hình thức «Trả lúc check-in» (mới, `orders`): chỉ đơn chọn hình thức đó. Bảng «Vé do ai phát» theo nhóm (mới, `catalog`).
2. **Ô quyền chạm bảng.** Đặt/gỡ dấu: `credit.service_rule.write` = `chiToanQuyen()`; xem dấu: Toàn quyền, Kế toán, Quản trị (ADR-0178 Đ3). Ghi «Vé do ai phát» theo nhóm: cùng ô với theo dịch vụ. Chọn «Trả lúc check-in»: cùng ô lập đơn. Ghi thu tiền mặt: `payment.receive` sẵn có. Không nới ô nào.
3. **Cổng canh cửa.** Cổng Trả sau `kiemTraSau` (máy chủ, lúc lưu và lúc xác nhận) quyết loại; cổng mở vé `veMoDuoc` không đổi; cổng người thu `kiemNguoiThuKenh` + trigger chỉ tiền mặt (ADR-0225) thêm đơn «Trả lúc check-in»; giao diện: ô hình thức trên form tạo đơn ẩn/hiện theo cùng luật thuần máy chủ dùng, khối vé trên trang đơn hiện theo cổng máy chủ.
