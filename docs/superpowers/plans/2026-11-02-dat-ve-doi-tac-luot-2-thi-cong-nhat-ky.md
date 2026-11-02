# Sổ điều phối: đặt vé của đối tác, lượt 2

Kế hoạch: `docs/superpowers/plans/2026-11-02-dat-ve-doi-tac-luot-2.md`. Nhánh `claude/dat-ve-luot-2`, thư mục `.claude/worktrees/dat-ve-luot-2`, cắt từ `7ed7b18c` (đầu nhánh lượt 1), để lượt 1 nhập vào bản chính độc lập.

## Ruling của điều phối

- **R1 (2026-11-02):** áp bảy câu của kế hoạch theo khuyến nghị (lời chủ 2026-10-02). Sai thì sửa đúng task nêu ở cuối câu. Báo chủ trong báo cáo.
- **R2 (2026-11-02):** thi công theo từng đợt, mỗi đợt một trợ lý tầm trung làm hết các task của đợt, rồi một người kiểm đợt chỉ đọc (lời chủ về điều phối: gộp việc, giữ kiểm). Lỗi nhỏ gom sửa một lần ở cuối đợt.
- **R3 (2026-11-02):** không hỏi chủ giữa chừng trừ bốn trường hợp: thao tác không đảo ngược, an ninh, tác động ra ngoài thư mục này, kế hoạch hỏng tới mức mọi đường đều là đoán. Câu phát sinh chạm dữ liệu hoặc quyền mà ADR đã trả lời nguyên tắc thì áp và ghi ở đây; ADR chưa trả lời thì dừng đúng phần đó, làm tiếp phần khác, gom hỏi một lần (`CLAUDE.md` §3).

- **R6 (2026-11-02, người kiểm N-1, mức Chặn):** lô `db.batch` không lui khi câu xác nhận đổi 0 dòng, nên Còn vé có thể ghi giờ và dấu đặt gấp rồi thua (đơn quá ngày đi); dấu còn lại cho Kế toán xác nhận dưới hạn chốt, trái ADR-0154 Đ1.4. Sửa: chặn trước lô mọi vế của `ORDER_CONFIRM` mà `CON_MO` không phủ, trả đúng câu `chanDoanXacNhan`; không đổi SQL. Sai thì chỉ sửa một chỗ trong route.
- **R7 (2026-11-02, người kiểm N-3):** «lượt đầu» xếp chiều đi trước chiều về, rồi mới tới ngày. Chữ ADR «chặng đầu tiên, không phân biệt chiều» không định thứ tự; nó đòi tính cả dịch vụ chỉ có chiều về, cách xếp mới vẫn đúng. Một lượt về đứng trước lượt đi chỉ là dữ liệu lệch (gửi qua API, hoặc đổi ngày đi để lượt về ở lại), không phải hành trình thật. Đổi cùng lúc ở `changDauCuaDichVu`, câu con `R-ORD-17w`, bài và kế hoạch câu 1. Báo chủ trong báo cáo. Sai thì đổi lại ba chỗ, có bài đối chiếu hai phía canh.
- **R8 (2026-11-02, người kiểm N-2):** thêm bài khoá hai hàng rào chưa ai canh, rồi làm lại sửa cố ý để thấy đỏ.

## Rà mâu thuẫn trước khi giao

| Hai task | Chạm chung | Kết quả |
|---|---|---|
| 1.1 → 1.2 | `cauMoYeuCau`, `YeuCauRow.pickup_time_required` | Khớp |
| 1.2 → 1.3 | `thieuGioChangDau(dichVu: { id, legs }[])` nhận dịch vụ có lượt, còn `legsMoi` ở Còn vé là danh sách phẳng | **Ruling R4:** nhóm `legsMoi` theo dịch vụ trước khi gọi, không đổi chữ ký hàm |
| 1.1 → 1.3 | `CON_MO` phải thêm `export` | Khớp, Task 1.1 khai |
| 1.1 → 1.4 | `R-ORD-17w` đọc `MIN(created_at)` của bảng chính sách; dòng gieo dùng `strftime('now')` theo khuôn 0119 | Khớp: mốc là lúc áp migration trên từng nơi |
| 1.2 → 3.1 | `changDauCuaDichVu` dùng ở máy chủ và form | Khớp, form chuẩn hoá ngày và id trước khi xếp |
| 2.1 → 2.2 | `orders.manifest_exempt`, `OrderDetailDto.manifestExempt`, `anKhachBat` | Khớp |
| 2.1 → 3.1 | `AnThongTinKhachResponse` | Khớp |
| 2.2 → 3.4 | `dieuKienXuatBen`, `nhacDieuKien`, `khongCan` | Khớp. Sau Đợt 2 và trước Task 3.4, màn chi tiết chuyến đếm dòng `khongCan` là chưa đạt; không phát hành giữa chừng nên chấp nhận |
| 1.x, 2.1 → 2.2 | Bước P16 sửa cố ý các bài (a2), (c), (g), (h6) | Khớp, các bài đã có trước Task 2.2 |
| 4.1 → 4.2 | `CapHienHanhDto` | Khớp |

Mỗi task tự khớp với bài của mình ở mức đọc kế hoạch. `v_stf_quyen_mo` đã có từ migration `0067`, cột `staff_id`, `permission_code`, chỉ quyền còn mở, nên đúng ý câu 3. Còn chưa chạy thử: tên khoá kết quả của khung thử với đơn đối tác, cách bọc `prepare` để đếm câu (kế hoạch mục «Chưa kiểm»).

## Tiến độ

| Đợt | Trạng thái | Người thi công | Người kiểm | Commit |
|---|---|---|---|---|
| 1. Dữ liệu và máy chủ giờ đón | thi công xong, đang kiểm | trợ lý tầm trung | `nguoi-kiem-doc-lap` | `274f1f01`, `949be7ab`, `1f8791b9`, `34c457ae` |
| 2. Công tắc, miễn thiếu tên | chưa | | | |
| 3. Giao diện ADR-0154 | chưa | | | |
| 4. Cột Cấp độ đại lý | chưa | | | |
| 5. Tài liệu, bộ kiểm dài, ảnh thật, kiểm độc lập | chưa | | | |

## Lệch kế hoạch đã có lý do (Đợt 1)

- **Migration tạo lại trigger `orders_delivered_lock`:** kế hoạch nói chỉ thêm, nhưng bài NT-R6 (`src/migrations-orders-da-giao.test.ts`) buộc mọi cột của `orders` nằm trong khoá «Đã giao». Chỉ siết, không sửa tệp cũ. **Ruling R5:** chấp nhận, với điều kiện người kiểm so định nghĩa trigger trước và sau `0133` chỉ khác đúng một vế.
- **Bài (d):** đơn đã vào nhánh A thì `/status` trả 409 `confirm_pending_locked` chứ không phải `partner_submit_required`, vì khoá khi chờ đứng trước cổng Gửi đơn. Tách thành (d1), (d2). Hành vi không đổi.
- **Che ghi chú và `R-ORD-17w` dùng hai nghĩa khác nhau có chủ ý:** che ghi chú xét «hiện giữ» quyền Đối tác (câu 3), kiểm định kỳ xét «từng giữ» (câu 4).

## Bài cũ đổi có chủ đích (Đợt 1)

- `src/modules/orders/chon-don-route.test.ts`: `FIELD` đọc khung giờ từ 403 thành 200 (ADR-0154 Đ1.5), thêm Tài xế công ty 403.
- `tests/e2e/chon-don.mjs`: cùng dòng đó, chưa chạy, chờ Đợt 5.
- `src/modules/orders/dat-gap-sat-gio.test.ts`: siết thêm một dòng.

## Nợ và lỗi nhỏ gom lại

- **Đợt 3 phải xét:** `canXacNhan` trong khối `xacNhan` của `GET /api/orders/:id` chưa biết cờ `CHOT_GIO`. Trước khi dựng form, xem chữ gợi ý cho đối tác có đọc trường này không, tránh báo «xác nhận ngay» rồi đơn lại chờ.
- Nhật ký `confirmed` chỉ ghi lý do đặt gấp đầu tiên; đủ chi tiết ở các dòng `order_leg_short_notice`.
- Che ghi chú chỉ phủ `services[].note`, đúng phạm vi ADR Đ1.6; chưa che `pickupPlace`, `checkinPlace`.
- `tests/audit/redteam.test.mjs`: 8 bài đỏ giống hệt nhau trên `8cb58ae4` và `34c457ae` (người kiểm đã đối chứng), nằm ngoài `npm test`. Nguyên nhân đã truy ở R3b, R4, R8: bài dựng đơn nháp lỗi thời so với ADR-0135 Đ6 (`order_not_confirmed`). Không do lượt này; báo chủ như việc riêng.
- `audit-invariants --db remote` chạy TRƯỚC khi áp `0133` sẽ thoát 2 vì thiếu bảng mới; đúng khuôn các kiểm trước, `npm run trien-khai` chạy nó sau migration nên không chặn phát hành (người kiểm đã đọc trình tự).

## Sửa cố ý đã thấy đỏ (P16)

- 2026-11-02, `R-ORD-17w`: bỏ vế `PARTNER` trong SQL thì bài ca tay đỏ ở đơn văn phòng; bỏ `(l2.direction <> 'OUT')` thì cả hai bài đỏ. Đã hoàn nguyên. Task 5.2 đưa vào sổ hàng rào, không cần làm lại.
