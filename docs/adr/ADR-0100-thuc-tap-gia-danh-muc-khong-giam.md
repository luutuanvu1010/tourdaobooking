# ADR-0100: Thực tập theo luật giá của Đối tác — chỉ giá danh mục, không giảm giá

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-10-03: *"BH-08: Thực tập như Đối tác, chỉ giá danh mục, không giảm."* (phương án (A) của câu hỏi ở `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §10.1). AI soạn và ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Trang ghép (lượt C, cùng ADR-0096 Đ3 và ADR-0099): `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-C-TRANG-GHEP.md`. Chưa có người kiểm độc lập đọc văn bản này. Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-03
- **Phạm vi:** module `orders` — chốt giá ở `POST /api/orders`, `PUT /api/orders/:id`, xác nhận đơn (`src/modules/orders/index.ts:185-186, :999-1000`), hàm `src/modules/orders/price-guards.ts`, `holdsPartner` (`src/shared/permissions.ts:298`). Không bảng mới, không cột mới, không đổi ô quyền.
- **Gỡ lỗi:** BH-08 — Thực tập lập đơn đơn giá 100.000 (danh mục 450.000), giảm 400.000/900.000 rồi tự xác nhận → 200; Đối tác cùng thao tác bị chặn 403 (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md` mục 5).

## Bối cảnh

- ADR-0027 Đ2 (`docs/adr/ADR-0027-ngung-nhap-tay-gia-doi-tac-va-moc-ngay-huy-hdv.md`): tài khoản có quyền Đối tác (**"Có quyền Đối tác là áp"**, kể cả kèm quyền khác) — (a) đơn giá mọi dòng = giá danh mục; (b) giảm giá cấp đơn ≤ mức chiết khấu đối tác, **tạm bằng 0** (`PARTNER_DISCOUNT_CAP = 0`, `price-guards.ts:53`); áp ở lập, sửa **và xác nhận** đơn. Câu "Rủi ro còn lại" của ADR-0027: *"Tài khoản Thực tập vẫn đặt được đơn giá thoả thuận và giảm giá như nhân viên nội bộ"*.
- Dịch vụ nhập tay: Thực tập đã không có ô `order.service.manual` (ADR-0061, `:58`) — không đổi.

## Quyết định

1. Luật giá ADR-0027 Đ2 (a) và (b) áp cho tài khoản có quyền **Thực tập** (`INTERN`), ở cùng ba cổng (lập, sửa nháp, xác nhận): đơn giá mọi dòng = **giá danh mục**; giảm giá cấp đơn = **0** (Thực tập không có bảng chiết khấu — khác Đối tác, trần này **không** thay theo ADR-0018 §11).
2. **"Có quyền Thực tập là áp"** — kể cả khi tài khoản kèm quyền nội bộ khác. *Cách AI áp dụng:* theo đúng khuôn lời chủ ở ADR-0027 Đ2 ("Có quyền Đối tác là áp"), để không có đường lách bằng gán thêm quyền; chủ thấy khác (ví dụ Thực tập kèm Bán hàng thì theo Bán hàng) thì sửa một dòng.
3. Câu báo khi bị chặn: dùng lại câu của Đối tác, đổi chủ ngữ: "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác."
4. Đơn Thực tập đã lập trước bản thi công: không rà lại tự động (cùng cách ADR-0027 "luật chỉ có hiệu lực từ nay").
5. Không đổi việc Thực tập tự xác nhận đơn mình lập (ADR-0018 giai đoạn 2 mới đổi; BH-09 chủ chọn giữ như hôm nay).

## Bấm nhầm thì sao

Không có lệnh mới; bị chặn thì sửa lại giá / bỏ giảm giá trên nháp, hoặc nhờ Bán hàng lập đơn.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ, không sửa thân)

| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0027 Đ2, gạch "Nhân viên nội bộ (Bán hàng, Kế toán, Quản trị, Toàn quyền, Thực tập) không đổi gì" | Thực tập không đổi gì | Thực tập theo Đ2 (a), (b) với trần giảm = 0 (ADR-0100) |
| ADR-0027 "Hệ quả và rủi ro còn lại" | "Tài khoản Thực tập vẫn đặt được đơn giá thoả thuận và giảm giá như nhân viên nội bộ" | đã đóng bởi ADR-0100 |

## Cửa một chiều / hai chiều

Hai chiều (luật máy chủ, không đổi dữ liệu).

## Hệ quả

- Bài đỏ trước: route test — Thực tập lập đơn đơn giá thấp hơn danh mục → 403; giảm giá > 0 → 403; xác nhận nháp cũ có giá lệch → 403; Thực tập kèm Bán hàng → 403 (Đ2). e2e `nhap-tay-va-gia-doi-tac` thêm ca Thực tập.
- Giao diện form lập đơn: ô đơn giá / giảm giá với Thực tập hiện như với Đối tác (chỉ đọc giá danh mục) — cùng điều kiện ẩn/hiện đang dùng cho Đối tác.
- Việc lớn (tiền): người kiểm độc lập khi thi công. Xây trên lỗ đang hở: không (không chạm `billing`).
