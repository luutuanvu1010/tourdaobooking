# ADR-0230 — Đơn đối tác toàn vé Tour Đảo hiện vé ngay; hình thức trả với hướng dẫn viên; «Vé do ai phát» theo nhóm

- **Trạng thái:** **proposed** 2026-11-21 — bản nháp của phiên thi công Việc 11 (kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` ở nhánh `claude/partner-features-detailed-plan-f32f89`). Chủ đã trả lời câu 1 của kế hoạch qua phiên điều phối 21/11, nguyên văn: *«còn lại áp dụng như khuyến nghị»* — tức đồng ý hết, công tắc «Khách của đối tác trả cho Công ty» để Bật nhưng chỉ tiền mặt; với việc 11 áp khuyến nghị của kế hoạch (ghi vào Đ1 mục 5, Đ2 mục 3–4). Còn chờ chủ: chọn phương án A/B và danh sách đầu tiên (câu 3), chọn tên hình thức, rồi duyệt toàn văn. Chưa có mã. Chưa có người kiểm độc lập đọc.
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều về hành vi (gỡ dòng danh sách, gỡ dòng nhóm); vé đã mở không lấy lại được (ADR-0153 Đ1 mục 6) — đây là phần một chiều.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở mục cuối tệp.
- **Số giữ trước:** ADR-0230; migration `0186` (Đ1 + Đ3), `0187` (Đ2). Không dùng số khác.
- **Xây trên lỗ đang hở:** `HC-4.2` (hạn 30/11/2026), `HC-5.19` (mỗi migration cần dòng cho phép riêng). Cần chủ cho xây hoặc gia hạn, như ADR-0178.
- **Quan hệ với ADR cũ (tuỳ phương án chủ chọn ở câu 3):**
  - **Sửa** ADR-0175 Đ2.2 và ADR-0170 Đ2: vé Tour Đảo của đơn thuộc diện đối tác được mở trước tiền khi đơn đủ điều kiện ở Đ1.
  - Phương án **B** (khuyến nghị): **thi công** ADR-0178 Đ2 «Trả sau theo dịch vụ» (đã duyệt 6/11, chưa có mã) và dùng chính dấu đó làm danh sách; chỉ **sửa** ADR-0178 Đ2 ở điểm ghi tại Đ1 dưới đây. Phương án **A**: thêm một danh sách riêng chỉ để mở vé, ADR-0178 Đ2 để nguyên chưa làm.
  - **Bổ sung** ADR-0178 Đ1 cho hình thức trả với hướng dẫn viên (Đ2), tuỳ câu 2.
  - **Giữ** ADR-0136 (dịch vụ bật «cần xác nhận» thì đơn chờ văn phòng, vé hiện sau khi xác nhận), ADR-0153 Đ1 mục 6, ADR-0079 điều 3, cột `orders.payment_term` và CHECK của nó (migration `0141`) không đổi.

## Bối cảnh

Hôm nay vé Tour Đảo hiện ngay khi đơn văn phòng xác nhận. Đơn thuộc diện đối tác thì theo tiền: đối tác Trả sau thấy vé trước khi trả, đối tác Thanh toán ngay phải chờ đủ tiền. Chủ muốn đơn toàn vé Tour Đảo hiện vé ngay khi gửi thành công, có thêm hình thức «khách trả tiền mặt cho hướng dẫn viên khi đi tour», và đặt được «Vé do ai phát» cho cả nhóm thay vì từng dịch vụ.

## Đ1 — Khi nào vé Tour Đảo của đơn đối tác mở trước tiền

1. Đơn đủ điều kiện khi **mọi** dịch vụ có vé trong đơn là vé Tour Đảo và thuộc danh sách (câu 3). Dịch vụ không vé không tính. Đơn có thêm một dịch vụ vé hãng ngoài, hoặc một dịch vụ vé Tour Đảo ngoài danh sách, thì **cả đơn** theo luật cũ: vé hãng ngoài và vé Tour Đảo của đơn đó đều chờ tiền (đúng chữ «mọi»; AI tự quyết, chủ bác được).
2. Đơn vẫn phải đã xác nhận (`confirmed`). Đơn có dịch vụ bật «cần xác nhận» thì chờ văn phòng như hôm nay. Đơn huỷ không bao giờ mở.
3. **Chụp lúc xác nhận** (AI tự quyết, theo khuôn `company_collects_snapshot`): dấu «đủ điều kiện mở vé ngay» ghi lên đơn một lần lúc xác nhận, CSDL cấm đổi. Sửa danh sách hay đổi nhóm sau đó không mở thêm vé của đơn cũ. Cổng mở vé (`veMoDuocTheoVe`) đọc dấu này, không đọc danh sách sống.
4. Phương án B: dấu này chính là loại Trả sau «theo dịch vụ» của ADR-0178 Đ2 — đơn thành Trả sau, có hạn trả theo giờ, quá hạn còn nợ thì đơn mới bị chặn, và nhánh Trả sau sẵn có của cổng mở vé lo phần vé. Sửa ADR-0178 Đ2 mục 2 ở một điểm: dịch vụ không vé không cần dấu (theo Đ1 mục 1). Phương án A: dấu mới chỉ mở vé, đơn vẫn Thanh toán ngay, nợ không có hạn trả và không chặn khi quá hạn.
5. Đối tác đang có Trả sau theo hạn mức (Việc 2) vẫn chỉ thấy «Trả sau»; vé của họ đã mở trước nên Đ1 không đổi gì cho họ.

## Đ2 — Hình thức «trả với hướng dẫn viên» (tên chờ chủ chọn)

1. Lưu bằng **bảng riêng chỉ thêm của `orders`** (mỗi đơn tối đa một dòng hiệu lực, chụp lúc lập hoặc lúc chọn khi còn nháp, khoá sau nháp bằng trigger như `payment_term`). Đơn mang dòng này vẫn có `payment_term = 'PREPAID'`. **Không** thêm giá trị vào CHECK của `orders.payment_term`, vì việc đó buộc dựng lại cả bảng đơn hàng.
2. Ý nghĩa: khách trả tiền mặt cho hướng dẫn viên phụ trách khi đi tour. Màn «Việc của tôi» của hướng dẫn viên hiện số cần thu; ghi thu theo đường tiền mặt sẵn có (người thu = hướng dẫn viên). Không mở QR, không chuyển khoản.
3. **Ai được chọn (chủ đã chốt):** đơn văn phòng lập và đơn của đối tác **không** có Trả sau. Đối tác đang Trả sau chỉ thấy «Trả sau» (Việc 2). Đơn văn phòng: vé đã mở lúc xác nhận như hôm nay, nên hình thức này chỉ đổi nhãn và việc của hướng dẫn viên. Đơn đối tác: cần công tắc «Khách của đối tác trả cho Công ty» Bật (chủ đã chốt để Bật, chỉ tiền mặt); nếu sau này Toàn quyền Tắt thì đơn đối tác lập lúc Tắt không có hình thức này (ADR-0178 Đ1, migration `0144` cấm hướng dẫn viên ghi thu). Vé mở trước tiền chỉ khi đơn đủ điều kiện Đ1.
4. **Khách không trả (chủ đã chốt):** đơn văn phòng — khách nợ Tour Đảo; đơn đối tác — đối tác nợ Tour Đảo (vào công nợ đại lý như mọi khoản chưa thu). «Khách đã trả đủ» vẫn đòi thu đủ như hôm nay.

## Đ3 — «Vé do ai phát» theo nhóm

1. Bảng chỉ thêm mới của `catalog` cùng khuôn `ctl_service_ticket_source` (`0151`), khoá theo mã nhóm. Giá trị hiện hành của một dịch vụ = dòng riêng của dịch vụ nếu có, không thì dòng của nhóm hiện tại, không thì như hôm nay. Dịch vụ thắng nhóm.
2. Một view công bố trả giá trị đã gộp; mọi nơi đang đọc `v_ctl_service_ticket_source` chuyển sang view gộp. Nguồn vé của từng vé vẫn lấy từ lô (`vdt_batch.source`), nên đổi nhóm không đổi vé đã tạo.
3. Ai đặt: giữ ô quyền đang dùng cho «Vé do ai phát» theo dịch vụ, không thêm ô mới.

## Kiểm (tiêu chí nghiệm thu, viết trước khi làm)

- Đối tác Thanh toán ngay lập đơn 4 vé Tour 3 đảo (vé Tour Đảo, trong danh sách) → gửi → đơn xác nhận ngay, vé hiện ngay dù chưa trả.
- Cùng đơn thêm một vé hãng ngoài → cả vé hãng ngoài lẫn vé Tour Đảo chờ tiền như hôm nay.
- Đơn có dịch vụ bật «cần xác nhận» → vé hiện sau khi văn phòng xác nhận.
- Gỡ dịch vụ khỏi danh sách sau khi đơn đã xác nhận → vé của đơn đó không đổi trạng thái; đơn mới sau đó chờ tiền.
- Hướng dẫn viên mở đơn hình thức trả với hướng dẫn viên → ghi thu tiền mặt được; không có QR, không có chuyển khoản.
- Đặt «Vé do ai phát = Tour Đảo» cho nhóm → dịch vụ trong nhóm hiện Tour Đảo; dịch vụ có dòng riêng giữ giá trị riêng.
- Bài tĩnh ở `src/modules/ve-dien-tu/xem-giao-ve.test.ts` (hình dạng `veMoDuoc`, đếm `moVeDuoc(`) đổi **có chủ ý**; hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## Phương án đã loại

- **Thêm giá trị mới vào CHECK của `orders.payment_term`.** Buộc dựng lại cả bảng đơn hàng — rủi ro dữ liệu lớn nhất kế hoạch.
- **Mở theo từng vé** (vé Tour Đảo trong danh sách mở ngay dù đơn có vé hãng ngoài). Lệch chữ «mọi» của kế hoạch; chủ chọn lại được.
- **Đọc danh sách sống ở cổng mở vé.** Sửa danh sách sau xác nhận sẽ mở vé của đơn cũ, vé đã mở không lấy lại được.

## Hệ quả chủ cần biết

- Vé mở trước tiền ở đơn đối tác ⇒ có thể mất tiền thật nếu khách không đi, không trả. Phương án B có hạn trả và chặn đơn mới khi quá hạn; phương án A không có.
- Phương án B lớn hơn (làm luôn phần ADR-0178 Đ2 đã duyệt mà chưa có mã, kèm màn nợ tách hai số).

## Trang ghép

1. **Bảng chứa loại gì.** Bảng «Vé do ai phát» nay có thêm dòng theo nhóm (bảng mới, khoá nhóm). Bảng hình thức trả mới chỉ chứa đơn trả với hướng dẫn viên. Đơn hàng thêm một dấu chụp lúc xác nhận (Đ1).
2. **Ô quyền chạm bảng.** Ghi «Vé do ai phát» theo nhóm: cùng ô với theo dịch vụ. Ghi danh sách mở vé ngay: chỉ Toàn quyền (khuôn `chiToanQuyen()`, như ADR-0178 Đ3). Ghi thu tiền mặt của hướng dẫn viên: ô ghi khoản thu sẵn có, phạm vi đơn đang phụ trách — không nới ô nào.
3. **Cổng canh cửa.** Cổng mở vé `veMoDuoc` (máy chủ, mọi route vé kể cả hai route công khai của đường dẫn khách); cổng người thu `kiemNguoiThuKenh` + trigger `0144` (đơn mang dấu Tắt); giao diện: nút hình thức trả trên form tạo đơn ẩn/hiện theo vai và theo Trả sau (Việc 2), khối vé trên trang đơn hiện theo cùng cổng máy chủ.

## Câu hỏi cho chủ (gửi qua phiên điều phối)

1. ~~Ai chịu nợ~~ — đã chốt 21/11 theo khuyến nghị (Đ2 mục 4).
2. ~~Có áp cho đơn đối tác không~~ — đã chốt 21/11 theo khuyến nghị (Đ2 mục 3).
3. **Còn chờ.** Danh sách sản phẩm/nhóm được mở vé ngay: dùng lại dấu «Trả sau theo dịch vụ» đã duyệt (B, khuyến nghị) hay danh sách riêng chỉ để mở vé (A)? Kèm các nhóm/dịch vụ đầu tiên.
- Kèm chọn tên: «Trả với hướng dẫn viên» / «Trả tiền mặt khi đi tour» / «Thanh toán với hướng dẫn viên».
