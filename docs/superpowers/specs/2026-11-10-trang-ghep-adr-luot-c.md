# Trang ghép — ADR lượt C: ADR-0196, ADR-0197 (biên lai chuyển khoản bắt buộc; ô cọc của khách cho đơn Trả sau)

> Trạng thái: **đề xuất, chờ chủ duyệt** cùng hai ADR. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 2 quyết định chạm tiền, dữ liệu (dưới trần 3) và một bảng dùng chung (`bil_payment_receipt`) nhận thêm một loại dữ liệu gắn kèm (ảnh biên lai). Hồ sơ có ngày: duyệt xong thì đóng băng. Kế hoạch gốc: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần IX. Dẫn chứng mã đọc trên `main` @`9dbfbc131`. Kèm sửa thẳng ADR-0183 (proposed) để trỏ về ADR-0197.

## (1) Những bảng / kho này chứa loại thực thể nào

| Bảng / kho | Chứa ai, chứa gì (hôm nay) | ADR | Đổi gì | Điều phải canh |
|---|---|---|---|---|
| `bil_payment_receipt` (0045) | khoản thu và khoản hoàn của mọi đơn; người thu theo vai (`COMPANY`, `BOOKER`, `STAFF`, `SUPPLIER`, `UNKNOWN`…), cách trả, giai đoạn; người ghi là nhân viên hoặc tài khoản Đối tác | 0196, 0197 | **không cột mới**. 0196: khoản «Công ty – chuyển khoản» do Đối tác ghi nay luôn có đúng một dòng ảnh đi kèm. 0197: khoản cọc tự sinh lúc xác nhận nay có cả ở đơn Trả sau (ghi chú dấu «Khách đặt cọc trước», tiền mặt, người thu là người lập) | ảnh không đổi cách tính khoản thu; chuỗi ghi chú dấu không đổi |
| `bil_receipt_recon` (0099) | dấu đối chiếu của khoản thu: `DECLARED` (người không phải Kế toán khai), `CONFIRMED` (Kế toán bấm đã nhận) | 0196 | **không đổi**. Điều kiện ghi `DECLARED` vẫn là `canDoiChieu`; luật bắt buộc ảnh gọi lại chính hàm đó | ảnh không thay dấu `CONFIRMED`; khoản kèm ảnh vẫn «đang đối chiếu» |
| **`bil_receipt_proof` (mới, của `billing`, chỉ thêm)** | **một loại dòng:** ảnh/PDF biên lai của **một** khoản thu đang đối chiếu do Đối tác ghi. Khoá kho, loại, cỡ, băm (N3), ba mốc một chiều (đã lưu / quyết gỡ / đã xoá khỏi kho). Không tên tệp gốc | 0196 | migration mới, bộ cột chép `fbk_attachment` (0124) | chỉ `billing` ghi; trigger chặn xoá, chỉ sửa cột trạng thái tệp; dòng «tải dở dang» / «chờ xoá» thấy được và chạy lại được |
| **Kho R2 `tourdao-sales-bien-lai` (`BIEN_LAI`, mới)** | đối tượng tệp biên lai — **dữ liệu cá nhân và tài chính** (tên người chuyển, số tài khoản, có thể toạ độ chụp trong HEIC/PDF) | 0196 | kho mới do chủ tạo | chỉ `billing` chạm; tải qua Worker, nhật ký trước; không đường dẫn ký sẵn. **Nếu ADR-0182 Đ2 được duyệt**, ảnh «khoản nộp» của đại lý đề xuất dùng chung kho này nhưng bảng ảnh và tập người xem riêng (ADR-0182 có Quản trị chỉ xem; ADR-0196 không) |
| `orders.declared_deposit` (0136) | lời khai cọc của tài khoản Đối tác trên đơn nháp / đang chờ (số nguyên VNĐ ≥ 0); sau xác nhận thành khoản thu và không còn được đọc để hiển thị | 0197 | **không đổi cột**; nay nhận số > 0 cả khi `payment_term = 'CREDIT'` | khai > 0 trên đơn Trả sau không còn 409; lời khai vẫn ≤ tổng sau giảm |
| `orders.payment_term`, `credit_*` (0141, 0143) | hình thức thanh toán, hạn trả | 0197 | không đổi | — |
| `bil_debt_line` (sổ giữ hộ) | dòng nợ giữa các bên theo khoản thu | 0197 | không loại dòng mới; khoản cọc trên đơn Trả sau sinh dòng giữ hộ trên người lập như đơn Thanh toán ngay | Đ4 của 0197 đọc số dư giữ hộ của người thu khoản cọc (qua hàm tiêm, `orders` không đọc `bil_*`) |
| `audit_log` | nhật ký | 0196 (ghi khoản thu kèm ảnh, mở ảnh, gỡ ảnh), 0197 (không loại mới) | — | không ghi nội dung ảnh, số tài khoản, khoá kho |

## (2) Dòng bản đồ quyền chạm các bảng / route trên

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR, SALES_MANAGER (SALES_MANAGER luôn đi kèm SALES).

| Ô | Giá trị hôm nay (theo `src/shared/permissions.ts`) | ADR | Ghép |
|---|---|---|---|
| `payment.receive` | SALES own, ACCOUNTING any, ADMIN any, FIELD assigned, PARTNER own, SUPER any, INTERN own | 0196 | không đổi ô; **siết kết quả** cho cột PARTNER: «Công ty – chuyển khoản» phải kèm ảnh. Các cột khác không đòi ảnh (theo khuyến nghị câu (a)) |
| **`payment.proof.view` (mới)** | ACCOUNTING any, SUPER any, PARTNER own; mọi cột khác none | 0196 | **ô duy nhất được thêm.** PARTNER `own` = ảnh của khoản thu do chính mình ghi. ADMIN, SALES (kể cả phụ trách đơn), FIELD **không** xem |
| `ledger.write` | ACCOUNTING any, SUPER any | 0196, 0197 | 0196: nút «Công ty đã nhận» (`company-receipts/:id/confirm`) — nút «Xem biên lai» đặt cạnh, nhưng hỏi ô xem riêng. 0197: «Nộp về công ty» (`/api/ledger/settlements`) là lối Kế toán xử lý cọc; chặn tài khoản giữ quyền Đối tác (`ghiSoNoiBo`) như cũ |
| `order.handover` | ADMIN any, FIELD assigned, SUPER any (PARTNER none) | 0196 | vì PARTNER none, Đối tác **không** đi cửa «Khách đã trả đủ» kèm khoản thu — không cần đòi ảnh ở cửa đó (theo khuyến nghị) |
| `order.modify` | SALES ownOrAssigned, ADMIN any, PARTNER own, SUPER any, INTERN own | 0197 | huỷ đơn qua `/api/orders/:id/status`. Theo (c1): người giữ quyền Đối tác bị chặn huỷ đơn Trả sau còn cọc ở tay mình; cột khác huỷ được như hôm nay |
| `order.cancel` | FIELD assigned, SUPER any | 0197 | đường huỷ của Hướng dẫn viên (`handler-cancel`) đi qua cùng cổng `congHuyTraSau`; không bị chặn theo (c1) vì không giữ quyền Đối tác |
| `deposit.refund.approve` | ADMIN any, SUPER any | 0197 | không đổi; dùng sau khi đơn huỷ (ADR-0089) |
| `payment.refund` | ACCOUNTING any, SUPER any | 0197 | không đổi; chi hoàn sau duyệt, người khác người duyệt |
| `deposit.transfer.approve` | ACCOUNTING any, ADMIN any, SUPER any | 0197 | không đổi; chuyển cọc sang đơn mới (kể cả đơn Trả sau mới — chưa kiểm, phải có bài) |
| `order.view` | SALES any, ACCOUNTING any, ADMIN any, FIELD assigned, PARTNER own, SUPER any, INTERN own | 0196 | xem danh sách khoản thu của đơn vẫn theo ô này; DTO chỉ mang «có / chưa tải xong / đã gỡ», **không** mang ảnh hay khoá kho — ai xem được đơn chưa chắc xem được ảnh |

Không đổi `MATRIX` ở ô nào ngoài việc thêm `payment.proof.view`.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | ADR |
|---|---|---|
| Ghi khoản thu kèm ảnh | `POST /api/orders/:id/payments` (cổng `orders`): `chiNguoiLapGhiNhap` → `payment.receive` → luật mới `canBienLai` (gọi `canDoiChieu` + «người ghi giữ quyền Đối tác, không giữ Kế toán») → kiểm tệp (`kiemTepCuaTin`) → một lô D1 (khoản thu, `DECLARED`, dòng ảnh, nhật ký) → R2 → đánh dấu đã lưu | 0196 |
| «Khách đã trả đủ» kèm khoản thu | `POST /api/orders/:id/delivered`: `order.handover` — Đối tác không tới được; không đòi ảnh | 0196 |
| Sửa khoản thu đã ghi | `POST /api/ledger/receipt-replacements`: `ledger.write` + chặn Đối tác; không ghi `DECLARED`; khoản đang chờ đối chiếu không thay được (`ck_cho_xac_nhan`) — ảnh của khoản cũ nằm im | 0196 |
| Mở ảnh | route mới `GET …/payments/:receiptId/bien-lai`: `sec-fetch-site` → `payment.proof.view` + phạm vi (`own` = người ghi khoản thu) → ảnh thuộc khoản thu của đúng đơn → **nhật ký trước** → R2; `no-store`, `nosniff`, CSP `sandbox` | 0196 |
| Gỡ ảnh | route mới `POST …/bien-lai/go`: chỉ Toàn quyền, `Origin`, lý do bắt buộc, nhật ký; lô D1 rồi xoá R2 | 0196 |
| Hàng chờ tải dở / chờ xoá | route Toàn quyền (khuôn `feedback/tep-cho-xoa`), luật kiểm bất biến mới `R-BIL-…` | 0196 |
| Kho thiếu khi triển khai | cổng 1e `scripts/release-lib.mjs`: `NHAN_KHO.BIEN_LAI`, `HAU_QUA_THIEU_KHO.BIEN_LAI` | 0196 |
| Lưu đơn có cọc khi chọn Trả sau | `congTraSauKhiLuu` → `kiemDon`: **bỏ** 409 `tra_sau_khong_nhan_coc`; giữ chặn thiếu bên đặt và hạn mức | 0197 |
| Xác nhận đơn Trả sau có cọc | `traSauChoXacNhan` → `kiemDon` (bỏ 409 như trên); hạn mức kiểm trên tổng; khoản cọc sinh trong cùng lô qua `cauCocKhiXacNhan` như ADR-0159 | 0197 |
| Huỷ đơn Trả sau còn cọc | cổng mang nhãn `congHuyTraSau` (ba nơi gọi `soanHuyDon`: `/status`, `handler-cancel`, huỷ yêu cầu đang chờ / huỷ để lập lại ở `xac-nhan-route.ts` — nơi thứ ba là đơn chưa xác nhận nên cổng không chặn gì): thêm «người huỷ giữ quyền Đối tác» + «cọc còn ở tay người thu» (hàm tiêm) ⇒ 409 theo (c1), chỉ ở đơn đã xác nhận; luật vé hãng ngoài đã mở còn nợ đứng trước như cũ và chặn cả văn phòng | 0197 |

**Chỗ giao diện ẩn / hiện bị đổi nghĩa** (chủ duyệt 2026-10-01 — không chỉ route máy chủ):

| Chỗ | Hôm nay | Sau | ADR |
|---|---|---|---|
| `web/order-form.ts` `anHienDatCoc` | ẩn ô cọc và gợi ý khi chọn Trả sau | luôn hiện với tài khoản Đối tác (`coODatCoc`), mọi hình thức; thêm câu «cọc ở tay bạn…» | 0197 |
| `web/order-form.ts` lúc lưu (ép `declaredDeposit` về 0 khi Trả sau) | ép 0 | gửi đúng số đã nhập | 0197 |
| Tên ô, dòng tóm tắt, dòng «(chờ xác nhận)», câu hướng dẫn Đối tác | «Khách đặt cọc trước» | tên chủ chọn (ADR-0197 Đ1); chuỗi ghi chú trong CSDL giữ nguyên | 0197 |
| Biên nhận (`src/shared/order-confirmation.ts`) | «Khách đã trả trước» | **giữ nguyên** lượt này | 0197 |
| Nút huỷ đơn của Đối tác trên đơn Trả sau còn cọc | hiện, bấm được | theo (c1): vẫn hiện, máy chủ trả 409 với câu nhờ văn phòng (hoặc ẩn kèm câu — người thi công chọn, máy chủ là cổng thật) | 0197 |
| Form «Ghi khoản thu» (`web/order.ts`) | không có ô tệp | Đối tác chọn «Công ty» + «Chuyển khoản» thì hiện ô chọn ảnh bắt buộc; đổi lựa chọn khác thì ẩn và bỏ tệp | 0196 |
| Dòng khoản thu ở chi tiết đơn | nút «Công ty đã nhận» cho Kế toán | thêm nút «Xem biên lai» — hiện theo ô `payment.proof.view` (Kế toán, Toàn quyền, Đối tác chính chủ), **không** theo `ledger.write`; Quản trị, Bán hàng không thấy nút | 0196 |

## (4) Ghép giữa hai ADR và với văn bản đang chờ

- Hai ADR không chạm cùng một luật: 0196 ở đường ghi khoản thu sau xác nhận; 0197 ở lời khai cọc và cổng huỷ. Chung tệp giao diện `web/order.ts` (6A và 6B) — kế hoạch đã ghi thứ tự cắt nhánh.
- Khoản cọc tự sinh (0197) là tiền mặt, không bao giờ đòi ảnh (0196).
- ADR-0182 (proposed) Đ2: «khoản nộp» có biên lai, khác thực thể với khoản thu của 0196; xem (1). ADR-0183 (proposed): đã sửa để Đ2 trỏ về 0197; Đ3 «Thu hộ» và biên nhận HD-02-DT vẫn chờ lượt sau.
- Lỗ đang hở: 0196 xây trên HC-5.19 (migration + kho); 0197 xây trên TNV-G1 (đơn huỷ có cọc). Khoá xin phép ghi ở dòng «Xây trên lỗ đang hở» của mỗi ADR; chỉ chép vào `docs/quyen-hoan.json` sau khi chủ duyệt.
