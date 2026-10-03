# ADR-0027 — Ngừng dịch vụ nhập tay ở máy chủ; Đối tác theo giá bán lẻ, giảm giá tối đa bằng mức chiết khấu (tạm bằng 0); hướng dẫn viên không huỷ tour đã qua ngày đi

- **Trạng thái:** **accepted** — chủ dự án quyết trực tiếp trong phiên chat 2026-09-26, khi trả lời các câu hỏi vá ba phát hiện kiểm toán còn mở (DK-T3-01, DK-T4-02; `docs/quyen-hoan.json` mục `phat_hien`, hạn 2026-10-05). AI ghi lại, không tự quyết; chỗ nào là **cách AI áp dụng** thì ghi rõ để chủ bác được (tiền lệ ghi quyết định trong chat: ADR-0021). **Điều 2b (trần giảm giá) bị sửa bởi [ADR-0079](ADR-0079-phieu-da-giao-thuong-mai.md)** (duyệt 2026-10-01): trần = hoa hồng của đơn, xét theo người hưởng, áp cả khi nhân viên nhập thay; giảm giá trên đơn có người hưởng do bên đặt chịu. **Thay câu bởi [ADR-0100](ADR-0100-thuc-tap-gia-danh-muc-khong-giam.md)** (accepted 2026-10-03): quyết định 2 — gạch "Nhân viên nội bộ (… Thực tập) không đổi gì": Thực tập theo 2(a), 2(b) với trần giảm = 0 ("có quyền Thực tập là áp"); "rủi ro còn lại" về Thực tập đã đóng.
- **Ngày:** 2026-09-26   **Loại:** cửa **hai chiều** — luật máy chủ + giao diện, không migration, không xoá dữ liệu; gỡ được bằng một commit. Không có bản ghi nào được tạo theo luật mới (luật chỉ **từ chối**), nên gỡ luật không để lại dữ liệu phải dọn.
- **Nguồn:** báo cáo kiểm toán `docs/AUDIT-2026-09-24-DIEM-KHUAT.md` (nhánh `claude/tourdao-sales-audit-62ea81`) mục DK-T3-01, DK-T4-02; nhật ký thi công `docs/superpowers/plans/2026-09-26-va-3-loi-kiem-toan-nhat-ky.md`.

## Lời chủ dự án (nguyên văn)
1. Máy chủ chặn dịch vụ nhập tay cho ai: *"loại bỏ hoàn toàn dịch vụ nhập tay khỏi giao diện, đây là quyết định cuối cùng. Sẽ mở lại khi cần thiết"*.
2. Đối tác được đặt giá và giảm giá đến đâu: *"dù đối tác có giảm giá bao nhiêu đi nữa thì đối tác vẫn phải trả một mức giá cố định cho công ty Tour đảo."* Làm rõ ngay sau đó: *"Đối tác không tự đặt giá, giá luôn là giá công bố (giá bán lẻ), đối tác được quyền giảm giá cho khách nhưng luôn phải trả một mức giá cố định (giá vốn) cho công ty Tour đảo, bất kể là đối tác giảm bao nhiêu . Ở đây, có thể đặt mức giảm tối đa là mức chiết khấu của công ty Tour đảo dành cho đối tác."*
3. Trần giảm giá khi app chưa có bảng mức chiết khấu: chọn phương án *"Tạm không cho giảm"* — chưa có mức chiết khấu thì coi bằng 0, nên Đối tác chưa giảm được; có bảng chiết khấu thì mở theo đúng mức.
4. Hướng dẫn viên có được huỷ đơn sau ngày đi không: chọn phương án *"Chặn khi ngày đi đã qua"* — ngay trong ngày đi vẫn huỷ được (khách không đến bến); từ hôm sau chỉ văn phòng huỷ; sửa số khách giữ như hiện nay.

## Quyết định
**1. Ngừng dịch vụ nhập tay — ở máy chủ, cho mọi tài khoản.** `POST /api/orders` và `PUT /api/orders/:id` không nhận dịch vụ nhập tay mới. Dịch vụ nhập tay **đã lưu** trên đơn cũ: dữ liệu giữ nguyên (không xoá cứng), **tên và dòng tiền bị đóng băng** (gửi khác bản đã lưu → từ chối); thông tin chuyến và số khách của dịch vụ đó vẫn sửa được (đơn chỉ có một ngày cho cả đơn — ADR-0021); bỏ dịch vụ đó khỏi đơn thì được. Form hiện dịch vụ nhập tay cũ ở dạng **chỉ xem**. Mở lại khi chủ quyết.
   - *Cách AI áp dụng:* "loại bỏ hoàn toàn" được hiểu là không sinh mới và không sửa giá; dữ liệu cũ không xoá được (luật dữ liệu: không xoá cứng) nên **đóng băng** thay vì xoá.

**2. Giá của tài khoản có quyền Đối tác (`PARTNER`), kể cả khi kèm quyền khác** — chủ chốt thêm trong cùng phiên, sau khi người kiểm độc lập chỉ ra tài khoản Đối tác được gán thêm quyền nội bộ qua màn quản lý cũ thì lọt luật: *"Có quyền Đối tác là áp"*. Ở lập đơn, sửa đơn **và xác nhận đơn** (bước xác nhận đọc lại bản đã lưu, để nháp lập trước bản vá cũng bị bắt):
   - (a) đơn giá mọi dòng = **giá danh mục (giá công bố)** lúc lập dòng; dòng không có giá danh mục (nhập tay) không qua được;
   - (b) giảm giá cấp đơn ≤ **mức chiết khấu Tour Đảo dành cho đối tác**; app chưa có bảng chiết khấu nên **tạm bằng 0** (Đối tác chưa giảm được). Khi bảng chiết khấu có (ADR-0018 §11), thay số 0 bằng mức của đối tác đó.
   - Nhân viên nội bộ (Bán hàng, Kế toán, Quản trị, Toàn quyền, Thực tập) không đổi gì.
   - **Chưa làm:** số đối tác phải trả Tour Đảo (**giá vốn cố định**, không phụ thuộc mức đối tác giảm cho khách) chưa được app tính hay ghi — làm cùng đợt chiết khấu/sổ công nợ (ADR-0018 §11, ADR-0024…0026).

**3. Hướng dẫn viên huỷ đơn qua đường hẹp (`POST /api/orders/:id/handler-cancel`, ADR-0014 điều 11):** máy chủ từ chối khi **ngày đi đã qua** — ngày đi = ngày khởi hành **lớn nhất** trong các dịch vụ của đơn, "đã qua" = trước hôm nay theo giờ Việt Nam. Ngày đi là hôm nay → vẫn huỷ được. Không dịch vụ nào có ngày → không chặn (không chứng minh được là đã qua). Sửa số khách (`handler-money-edit`) và đường huỷ của văn phòng không đổi. Trang "Việc của tôi" không hiện nút huỷ cho đơn đã qua ngày đi.
   - *Cách AI áp dụng:* lấy ngày **lớn nhất** vì dữ liệu vẫn lưu ngày theo từng dịch vụ (ADR-0021 mục "Chưa làm").

## Sửa gì của quyết định cũ
- **ADR-0021 §2** câu "Dịch vụ nhập tay đã lưu trên đơn cũ vẫn hiện và sửa được" → nay **chỉ xem** (tên, dòng tiền đóng băng); mục "Chưa làm" câu "Máy chủ vẫn nhận dịch vụ nhập tay" → đã làm theo quyết định 1.
- **ADR-0014 điều 3** ("ảnh xác nhận/hoá đơn luôn là giá bán lẻ") và **ADR-0018 §9** ("được giảm giá cho khách; phiếu gửi khách luôn theo giá bán lẻ"): hai câu từng bị đọc là mâu thuẫn; nay giải bằng quyết định 2 — đơn giá luôn là giá bán lẻ, giảm giá là dòng riêng, trần = mức chiết khấu (tạm 0).
- **ADR-0014 điều 11** (hướng dẫn viên huỷ, lý do đóng): thêm mốc ngày ở quyết định 3.

## Trang ghép (CLAUDE.md §9 — lượt duyệt này có 3 quyết định chạm quyền/dữ liệu)
1. **Bảng chạm và loại thực thể trong đó:** `order_service`/`order_item` (module `orders`) chứa hai loại dịch vụ — **danh mục** (`catalog_code`, `catalog_price` có giá trị) và **nhập tay** (`catalog_price` NULL); sau quyết định 1 loại nhập tay chỉ còn bản cũ, không sinh mới. `orders.discount` (giảm giá cấp đơn), `orders.status`. Không bảng mới, không cột mới.
2. **Dòng bản đồ quyền (`src/shared/permissions.ts`) và loại áp dụng:** `order.create` (PARTNER `any`) và `order.modify` (PARTNER `own`) → thêm quyết định 2 cho mọi tài khoản có `PARTNER` (kể cả kèm quyền khác); các quyền khác giữ nguyên ô. `order.cancel` (FIELD `assigned`) → thêm mốc ngày ở quyết định 3. Quyết định 1 áp mọi quyền (không phải ô quyền — là luật dữ liệu). Không đổi ô nào của `MATRIX`.
3. **Cổng canh cửa nào:** `POST /api/orders`, `PUT /api/orders/:id` (quyết định 1, 2a, 2b); `POST /api/orders/:id/status` → `confirmed` (2a, 2b); `POST /api/orders/:id/handler-cancel` (3). Không đổi: `handler-money-edit`, `GET /api/catalog` (Đối tác vẫn 403 — Đối tác chưa lập được đơn trên giao diện; mở danh mục cho Đối tác là quyết định riêng).

## Hệ quả và rủi ro còn lại
- Luật chỉ có hiệu lực **từ nay**: đơn Đối tác đã xác nhận trước bản vá (giá lệch, dòng nhập tay, giảm giá) không bị rà lại tự động.
- Tài khoản **Thực tập** vẫn đặt được đơn giá thoả thuận và giảm giá như nhân viên nội bộ (ngoài phạm vi hai phát hiện).
- Đơn nháp cũ của Đối tác có dòng nhập tay chỉ gỡ được bằng cách bỏ dịch vụ đó hoặc nhờ văn phòng sửa.
