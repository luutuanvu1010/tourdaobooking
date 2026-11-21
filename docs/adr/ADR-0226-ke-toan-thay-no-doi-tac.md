# ADR-0226 — Kế toán thuần xem đơn đối tác theo số nợ với Tour Đảo, không theo giá bán cho khách

- **Trạng thái:** **proposed** 2026-11-21 — chính sách đã được chủ dự án chốt qua phiên điều phối (kế hoạch 16 việc, câu 1 «Đồng ý hết»; bốn câu 6A–6D, nguyên văn «còn lại áp dụng như khuyến nghị»); văn bản ADR này chờ chủ duyệt.
- **Ngày:** 2026-11-21.
- **Nguồn:** kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` (nhánh `claude/partner-features-detailed-plan-f32f89`), mục 4 câu 1(d), mục 5 «Việc 6».
- **Loại:** việc lớn (tiền, quyền xem). **Cửa:** hai chiều — không migration, không đổi dữ liệu; gỡ luật là về hành vi cũ.
- **Quan hệ với ADR cũ:** **giữ** ADR-0182 Đ1 (công thức công nợ đại lý — một chỗ ở `congNoNhieuDon`), ADR-0168 Đ3 (số nợ dùng cho hạn mức không âm), ADR-0135 Đ1 (đơn nháp của người khác không lộ), ADR-0019 điều 2 (route hỏi `money.view` theo đúng phạm vi). **Bổ sung** ADR-0026 đ9: `POST /api/ledger/balances` có thêm trường `noDoiTac` cho một nhóm người xem.
- **Xây trên lỗ đang hở:** không (không chạm vùng nào đang có mục trong `docs/quyen-hoan.json`).

## Bối cảnh
Đơn của đối tác: đối tác nợ Tour Đảo theo giá đại lý; Tour Đảo chỉ chạm tiền khách của đối tác bằng tiền mặt thu hộ (câu 1). Màn Đơn hàng và Trang chủ của Kế toán hôm nay hiện số theo giá đối tác bán cho khách (Tổng, Đã trả, Còn thu). Số Kế toán cần là số đối tác nợ Tour Đảo, hiện chỉ có ở «Phiếu công nợ với Tour Đảo» của từng đơn.

## Quyết định
1. **Đ1 — Ai.** «Kế toán thuần» = tài khoản có quyền Kế toán và **không** có Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền (chủ chọn 6A). Một luật thuần `keToanThuan` ở `src/shared/no-doi-tac-ke-toan.ts`, dùng chung máy chủ. Người khác xem như cũ.
2. **Đ2 — Đơn nào.** «Đơn đối tác» = đúng luật `laDonDaiLy` của phiếu công nợ (bên đặt mang vai được hưởng, hoặc người lập là Đối tác thuần), xét ở mọi trạng thái (`donDaiLyTrongTap` của `orders`). Đơn khách lẻ như cũ.
3. **Đ3 — Máy chủ không gửi số bán lẻ (không chỉ ẩn giao diện).** Với Kế toán thuần và đơn đối tác: `GET /api/orders` và ba ngày «Chuyến đón» của `GET /api/orders/dashboard` bỏ trường `total`; `POST /api/ledger/balances` bỏ đơn đó khỏi `balances` (phải thu, đã thu, còn thu bán lẻ).
4. **Đ4 — Số nợ.** Đơn đối tác đã xác nhận: `noDoiTac[id] = { no, thuHoTienMat, nhan, nhanThuHo }`. `no` = Công nợ còn lại của phiếu công nợ (`congNoNhieuDon`, cùng lượt cho cả trang), **giữ dấu**; âm hiện «Tour Đảo cần trả lại đối tác», dương hoặc 0 hiện «Đối tác nợ Tour Đảo» (nhãn do máy chủ chọn bằng `nhanNoDoiTac`). Số nợ dùng cho hạn mức vẫn không âm (ADR-0168 Đ3) — hai số khác mục đích, không trộn.
5. **Đ5 — «Tour Đảo đã thu hộ tiền mặt»** (chủ chọn 6D) = Σ khoản thu của khách bằng tiền mặt, còn hiệu lực, người thu là Công ty hoặc nhân viên Tour Đảo (không phải bên đặt, không phải quầy nhà cung cấp), không đang chờ Kế toán đối chiếu (`thuHoTienMat`, luật thuần ở `billing/rules.ts`), kẹp trên bằng «Đã thu» của phiếu (khoản khai / cọc còn ở tay người thu đã bị trừ khỏi Đã thu). Chỉ để hiện, không vào số nợ. Lưu ý: khoản do thành viên của tổ chức đối tác ghi với vai nhân viên được tính là thu hộ (cùng cách ADR-0170 Đ2 tin nhân viên cầm hộ); phiên Việc 5 định nghĩa lại thu hộ thì hàm này theo.
6. **Đ6 — Đơn chưa xác nhận / đã huỷ.** Chưa có giá đại lý chụp nên máy chủ không tính nợ, không gửi số nào (chủ chọn 6C). Thử thật cho thấy Kế toán vốn không thấy đơn đối tác chưa xác nhận trong danh sách (ADR-0135 Đ1), nên chữ «Chưa tính nợ — đơn chưa xác nhận» không có chỗ hiện; nếu sau này đơn chờ hiện cho Kế toán thì máy chủ vẫn không gửi Tổng.
7. **Đ7 — Phạm vi màn** (chủ chọn 6B): danh sách Đơn hàng và Trang chủ. Trang chi tiết một đơn giữ như cũ vì Kế toán cần nó để đối chiếu khoản thu, biên nhận — ghi `docs/BACKLOG.md`.

## Trang ghép (CLAUDE.md §9)
- **Dữ liệu chạm tới:** không bảng mới, không cột mới. Đọc thêm cột `method_code` của `bil_payment_receipt` (module `billing`, chủ bảng) trong câu đọc nhiều đơn sẵn có. Phản hồi của ba route đổi hình cho một nhóm người xem.
- **Bản đồ quyền:** không thêm, không bớt ô nào ở `permissions.ts`. Ba route vẫn hỏi đúng các ô cũ (`order.view`, `money.view`, `contact.view`) trước mọi đọc. Luật Đ1 chỉ **siết** (bớt số được gửi), không mở cửa nào: người không thuộc luật nhận đúng phản hồi cũ.
- **Loại tài khoản × màn:**

| Tài khoản | Danh sách Đơn hàng / Trang chủ — đơn đối tác | Đơn khách lẻ | Trang chi tiết đơn |
|---|---|---|---|
| Kế toán thuần (kể cả kiêm Nhân sự) | Số nợ + thu hộ tiền mặt; không Tổng, không Còn thu bán lẻ | như cũ | như cũ |
| Kế toán kiêm Bán hàng / Quản lý bán hàng / Quản trị / Toàn quyền | như cũ (giá bán lẻ) | như cũ | như cũ |
| Bán hàng, Quản trị, Toàn quyền, Đối tác, Hướng dẫn viên, Thực tập | như cũ | như cũ | như cũ |

- **Cổng canh cửa nào:** (1) `GET /api/orders`, `GET /api/orders/dashboard` — `boTongDonDaiLy` bỏ `total` sau khi lọc quyền; (2) `POST /api/ledger/balances` — tách đơn đối tác trước `tienNhieuDon`, chỉ tính số nợ cho đơn đã xác nhận; (3) giao diện: `web/order-card.ts` (`dienTien` nhận thêm `noDoiTac`, «Tổng» chỉ hiện khi có số), `web/home.ts` (ô tiền của «Chuyến đón»). Chỗ ẩn/hiện ở giao diện đi theo DỮ LIỆU máy chủ gửi, không tự xét quyền.
- **Đường còn lộ số bán lẻ cho Kế toán thuần (có chủ ý, Đ7):** trang chi tiết đơn, biên nhận, `GET /api/orders/:id/thuong-mai`, ô «Còn thiếu tiền» của Trang chủ (`/api/ledger/unpaid-summary` — tổng gộp mọi đơn, không theo từng đơn).

## Hệ quả
- Kế toán đối chiếu đơn đối tác bằng số nợ; số bán lẻ còn ở trang chi tiết.
- Mỗi trang danh sách thêm một lượt `congNoNhieuDon` cho các đơn đối tác đã xác nhận (chỉ khi người xem là Kế toán thuần); hàm có một câu đọc khoản khai cho từng đơn.
- Gói trang Đơn hàng lớn thêm khoảng 140 byte (nhãn do máy chủ gửi để giữ gói nhỏ) — cần chủ duyệt nới trần.

## Tiêu chí nghiệm thu (bài `src/no-doi-tac-ke-toan.test.ts`)
- Đơn đối tác thành tiền 5.000.000 đ, hoa hồng 800.000 đ, không phí đón, Tour Đảo đã nhận thật 1.000.000 đ tiền mặt ⇒ Kế toán thuần thấy «Đối tác nợ Tour Đảo» 3.200.000 đ, «Tour Đảo đã thu hộ tiền mặt» 1.000.000 đ; phản hồi không chứa 5.000.000, 4.700.000 hay `phaiThu`.
- Tour Đảo nhận 4.500.000 đ ⇒ số nợ −300.000, nhãn «Tour Đảo cần trả lại đối tác».
- Toàn quyền, Quản trị vẫn thấy Tổng 4.700.000 đ và phải thu như cũ; đơn khách lẻ của Kế toán như cũ.
