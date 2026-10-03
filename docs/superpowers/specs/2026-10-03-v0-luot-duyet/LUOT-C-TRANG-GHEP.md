# Lượt duyệt V0-C — trang ghép (CLAUDE.md §9)

> Ba quyết định chủ trả lời trong chat 2026-10-03, sau lượt A và B:
> - **C1** — ADR-0096 **Đ3** (LC-21): giờ hẹn đón không sớm hơn giờ khởi hành — *"HT-06: chặn, gộp vào ADR-0096."* (`docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md`).
> - **C2** — ADR-0099: Bán hàng đang phụ trách ghi được lần thu — *"BH-06: cho ghi như HDV phụ trách (ADR riêng)."*
> - **C3** — ADR-0100: Thực tập chỉ giá danh mục, không giảm — *"BH-08: Thực tập như Đối tác, chỉ giá danh mục, không giảm."*
>
> **Đếm (trần 3):** 3 quyết định chạm quyền/dữ liệu ⇒ đúng trần. HT-06 được tính ở lượt này (không cộng vào lượt A) để lượt A giữ 3.
>
> **Trang ghép này viết SAU lời chủ** (chủ trả lời thẳng các câu hỏi gom). Chủ chưa đọc chữ của C1–C3; đọc trang này và ba ADR rồi nói "Sửa: …" nếu có điểm khác ý.
>
> **Xây trên lỗ đang hở:** C2 chạm sổ giữ hộ ⇒ "xây trên lỗ đang hở: TNV-G4, TNV-VP01, F-03" (và F-02 tới khi xoá khỏi sổ). C1, C3 không.
>
> **Không có quyết định nào ở BH-09:** chủ chọn *"giữ như hôm nay tới ADR-0018 giai đoạn 2"* — không đổi gì, mã nợ `BL-QUYEN-BH09` ghi chờ ADR-0018 giai đoạn 2.

## (1) Bảng nào chứa loại thực thể nào

| Bảng | Thực thể | Quyết định chạm | Đổi gì |
|---|---|---|---|
| `vc_trip`, `vc_trip_allocation` | chuyến, suất (khách / người đi kèm) | C1 | không đổi cấu trúc; thêm lý do giữ đọc giờ hẹn của chặng; trigger cạnh `PLANNED → RUNNING` (nếu đọc được giờ hẹn qua view công bố) |
| `ord_transfer_leg` (module `orders`) qua view công bố `v_ord_*` | chặng đưa đón, giờ hẹn đón | C1 (chỉ đọc) | có thể thêm cột giờ hẹn vào view công bố (đổi hợp đồng đọc giữa module — kế hoạch V3-A chốt, người kiểm độc lập) |
| `bil_payment_receipt`, `bil_debt_line` | lần thu, dòng giữ hộ | C2 | không đổi cấu trúc; thêm một loại người được ghi (Bán hàng phụ trách) ⇒ thêm dòng giữ hộ trên người đó |
| `orders`, `order_service`, `order_item` | đơn, dòng tiền (giá danh mục, giảm giá cấp đơn) | C3 | không đổi cấu trúc; thêm luật chặn khi người lập / sửa / xác nhận có quyền Thực tập |

## (2) Dòng bản đồ quyền chạm các bảng trên (`src/shared/permissions.ts`)

| Ô | Dòng | Hôm nay | Sau lượt C |
|---|---|---|---|
| `payment.receive` | `:103` | Bán hàng `own`, Kế toán `any`, Quản trị `any`, HDV `assigned`, Đối tác `own`, Toàn quyền `any`, Thực tập `own` | **Bán hàng `ownOrAssigned`** (C2); các cột khác không đổi |
| `order.create`, `order.modify` | `:78-79` | Thực tập `any` / `own` | không đổi ô; luật giá Đối tác áp thêm cho người có quyền Thực tập (C3) |
| `trip.dispatch`, `trip.progress` | `:170`, `:175` | — | không đổi; C1 chỉ thêm lý do giữ |
| `ledger.write`, `payment.refund`, `order.complete` | — | — | không đổi (C2 không phải quyền tiền của ADR-0090) |

Bài kiểm "tập con quyền" và tài liệu vai & quyền sinh tự động phải cập nhật cùng commit thi công C2.

## (3) Cổng nào canh cửa nào — gồm chỗ giao diện ẩn/hiện

| Cửa | Hôm nay | Sau lượt C |
|---|---|---|
| `POST /api/van-chuyen/cuoc-cua-toi/:id/xuat-ben`, `POST /api/van-chuyen/chuyen/:id/xuat-ben` | không so giờ hẹn với giờ khởi hành | + giữ `GIO_HEN_TRUOC_KHOI_HANH` (máy chủ) + trigger nếu đọc được giờ hẹn (C1) |
| Chip "Đạt hết" màn tài xế (`web/cuoc-chuyen.ts:268`) và nút "Xuất bến thay tài xế" (`web/chuyen.ts:60-67`) | "Đạt hết" dù giờ hẹn 06:30 trên chuyến 07:00 | hiện lý do giữ mới, nút khoá (C1) |
| Cảnh báo lịch chung `GIO_HEN_NGOAI_CHUYEN` (`src/shared/dieu-phoi-lich-chung.ts:114-123`) | cảnh báo hai phía | **không đổi** (C1 thêm mã mới, không đổi nghĩa mã cũ) |
| Ghi lần thu `POST …` (`src/modules/billing/index.ts:58-65`, hỏi `can(payment.receive, { ownerId, assigned })`) | Bán hàng phụ trách 403 | 201 (C2); route không đổi |
| Nút "Ghi lần thu" trang đơn (`coTheGhiThu`, `billing/index.ts:51`) | ẩn với Bán hàng phụ trách | **tự hiện** (cùng ô) — đổi nghĩa chỗ ẩn/hiện (C2) |
| `POST /api/orders`, `PUT /api/orders/:id`, xác nhận đơn (`orders/index.ts:185-186, :999-1000`) | chặn giá / giảm giá chỉ với Đối tác (`holdsPartner`) | chặn cả người có quyền Thực tập (C3) |
| Ô đơn giá / giảm giá ở form lập đơn | Thực tập sửa được | chỉ đọc giá danh mục, như Đối tác (C3) |

## (4) Cặp lệnh trên cùng đối tượng

| Đối tượng | Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|---|
| Chuyến kế hoạch | Bán hàng đổi giờ hẹn chặng sớm hơn × Xuất bến | **có thứ tự** — xuất bến đọc giờ hẹn mới nhất; sớm hơn giờ khởi hành ⇒ giữ | `kiemXuatBen` (C1) |
| Chuyến kế hoạch | Sửa giờ khởi hành sớm hơn (khắc phục) × giữ `GIO_HEN_TRUOC_KHOI_HANH` | **có thứ tự** — sửa giờ chuyến xong thì hết giữ, nhưng vẫn chịu cửa sổ xuất bến (Đ2) | `kiemXuatBen` |
| Một đơn | Bán hàng phụ trách ghi lần thu × người lập ghi lần thu cùng khoản | **độc lập theo luật, trùng theo nghiệp vụ** — cảnh báo "có thể trùng" của ADR-0092 đ6a (cùng đơn, cùng số, cùng ngày) | lớp luật trùng nghiệp vụ (ADR-0092 đ6a) + lớp vé (ADR-0094) |
| Một đơn | Bán hàng phụ trách ghi lần thu × Đã giao | **có thứ tự** — sau "Đã giao" không ai ghi lần thu mới (ADR-0026 đ10) | sẵn có |
| Một đơn nháp của Thực tập | Thực tập sửa giá × Thực tập xác nhận | **có thứ tự** — cả hai cổng cùng chặn (C3), nháp cũ có giá lệch không xác nhận được | `orders/index.ts:185-186, :999-1000` |
