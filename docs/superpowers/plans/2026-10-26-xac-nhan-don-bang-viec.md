# Bảng việc — thi công Đợt 2 + Đợt 3 (ADR-0135, ADR-0136) và việc góp ý còn lại

Lập 26/10/2026, theo lệnh chủ: «tạo/cập nhật toàn bộ công việc cụ thể còn làm để bắt đầu lần lượt thực hiện cho đến khi hoàn thành». Đây là **sổ điều phối sống** của đợt: một bảng duy nhất (việc, xong khi, trạng thái), báo cáo theo «xong x / n». Chi tiết từng bước nằm ở kế hoạch `docs/superpowers/plans/2026-10-19-xac-nhan-don.md` (Đợt 2, Đợt 3; đã sửa 25–26/10); không chép lại ở đây. Thêm việc vào bảng phải hỏi chủ; phát hiện không chặn phát hành ghi vào mục «Nợ».

Nhánh thi công: `claude/xac-nhan-don-thi-cong`, dựng từ `origin/main` `968bb603` (bản 2.33). Một nhánh, một thư mục làm việc, các lần giao chạy **lần lượt** (không song song vì cùng chạm `src/modules/orders/`).

## 1. Việc thi công (lần giao gộp, trợ lý tầm trung, người kiểm độc lập chỉ đọc)

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| L1 | Task 2.1 + 2.3: luật thuần «ai đọc/ghi được đơn nháp», áp mọi đường đọc và ghi, số đếm, người phụ trách chọn sẵn, hàng chờ nhận, tin của nháp | bài đỏ→xanh theo từng hàng của trang ghép lượt 1 mục 3; `npm test` + `typecheck` xanh; e2e `orders` | đã làm 26/10 (tự khai), chờ K1 |
| L2 | Task 2.2: nháp không ghi thu (409), QR chỉ đơn đã xác nhận, bỏ ô Thanh toán trước khỏi màn Tạo đơn, sửa chữ hướng dẫn | như trên; kịch bản Chrome màn Tạo đơn hai khổ | đã làm 26/10 (tự khai), chờ K1 |
| K1 | Kiểm độc lập Đợt 2 (`nguoi-kiem-doc-lap`: quyền xem, tiền) rồi sửa | báo cáo kiểm «đạt» hoặc «đạt có điều kiện» đã sửa hết | đang kiểm |
| L3 | Task 3.1 + 3.2 + 3.2b: luật thuần (cần xác nhận ba bước, hạn 15 phút trừ 22–06, ai quyết định), migration `0119` + hai ô quyền `order.confirm.review`, `order.submit`, tách lô xác nhận dùng chung | bài đỏ→xanh; ghim ô quyền ở mọi bài; kiểm lại số migration ngay trước khi tạo tệp | đã làm 26/10 (tự khai), chờ K2 |
| L4 | Task 3.3: route gửi xác nhận / rút lại / quyết định / danh sách chờ / cài đặt cờ, chặn mở yêu cầu khi đơn đã có khoản thu (hàm tiêm từ gốc lắp ráp) | e2e `xac-nhan-don` các ca a–p; bài đua hai người quyết | đã làm 26/10 (tự khai), chờ K2 |
| L5 | Task 3.4: route «Gửi đơn» (nhánh A, nhánh B), 409 `partner_submit_required` chỉ chặn người lập giữ quyền Đối tác | các ca 1–7 của Task 3.4; tài khoản lai đúng bảng ADR-0136 | chưa làm |
| L6 | Task 3.5: giao diện (nút Gửi đơn, Gửi xác nhận / Rút lại, bảng Xác nhận đơn, trang danh sách chờ, thẻ Trang chủ, ảnh xác nhận) và Trợ giúp Đối tác | kịch bản Chrome 390 + 1040 cho Bán hàng, Đối tác, Kế toán, HDV | chưa làm |
| L7 | Task 3.6: kịch bản Chrome cũ chuyển sang «Gửi đơn», nhật ký thay đổi, `SYSTEM-DESIGN` §5–7 và §16 (ba lệch có chủ ý), `CHANGE-GUIDE`, `data-dictionary` + `npm run dict`, `HANDOFF-N1` | `npm test`, `typecheck`, `build:web`, `test:e2e` toàn bộ xanh; `audit-invariants --db local` thoát 0 | chưa làm |
| K2 | Kiểm độc lập toàn nhánh Đợt 2 + 3 (quyền + dữ liệu + tiền) rồi sửa; tự chạy lại lệnh kiểm | báo cáo «đạt»; chỉ báo «xong» theo báo cáo này + test | chưa làm |
| L8 | Việc nhỏ góp ý YC-0013: gỡ ô lọc dịch vụ ở danh sách đơn (đã chốt trong kế hoạch 24/10) | bài lọc xanh; chip lọc đã nhớ vẫn mở được | chưa làm |
| P | Báo chủ bốn mục + lệnh `npm run day-len` một lần, ghi «cần `npm run trien-khai`, có migration 0119» | chủ chạy day-len; AI kiểm GitHub | chưa làm |

Quy ước: mỗi lần giao ghi vào nhật ký thi công `docs/superpowers/plans/2026-10-19-xac-nhan-don-thi-cong-nhat-ky.md` (ruling, lệch kế hoạch). Phát hành chung L1–L8 (chủ chọn A 19/10): không `day-len` riêng Đợt 2.

## 2. Việc của chủ (không làm thay được)

| # | Việc | Khi nào |
|---|---|---|
| C0 | Đếm nháp cũ đã có khoản thu (lệnh ở kế hoạch, Task 2.2 Step 0); > 0 thì quyết cách xử lý | trước khi chạy `trien-khai` |
| C1 | Chạy `npm run day-len`, rồi `npm run trien-khai` (có migration), theo `docs/QUY-TRINH-PHAT-HANH.md` | sau P |
| C2 | Nghiệm thu bản 2.29, 2.30 trên màn hình (chưa làm) | bất kỳ lúc nào |

## 3. Việc chờ chủ quyết — KHÔNG làm trước khi chủ trả lời

| # | Việc | Câu cho chủ |
|---|---|---|
| Q1 | Task 3.3b: sửa tiền khi đơn chờ (Đ8) — **hoãn** | Hướng 1 (cho sửa, xác nhận đọc số đã điều chỉnh) hay Hướng 2 (không cho sửa; Kế toán chọn Huỷ). Bản phát hành tạm chạy Hướng 2 |
| Q2 | YC-0013 vế «còn công nợ» | Có thêm hàm tiêm mới bọc `tienNhieuDon` của `billing` (hợp đồng mới giữa gốc lắp ráp, `orders`, `billing`) không |
| Q3 | YC-0014 ô ghi chú giờ đón | Cần cột mới trên chặng đón ⇒ migration: đồng ý không |
| Q4 | YC-0014 tiền đón là khoản riêng (nháp ADR có sẵn) | Ai đặt mức: người giữ `partner.commission.write` hay Quản trị (lời chủ 14/10) |
| Q5 | Lượt 2: ADR chính sách bán theo loại đối tác (4 điều) | Duyệt; chốt số ADR (0140 còn lệch giữa README và BACKLOG) |
| Q6 | Đề xuất «thư xác nhận kèm QR» (số tạm 0137 đã dùng) | Cấp số mới rồi trình lại |

## 4. Việc sau nhánh này (mỗi việc một phiên riêng, vì chạm cùng tệp với L1–L7)

| # | Việc | Điều kiện bắt đầu |
|---|---|---|
| S1 | Nhánh đưa đón ADR-0118 (`claude/tour-dao-booking-audit-bc6c77`, 23 lần lưu, xung đột ≥ 14 tệp gồm `orders/index.ts`, `orders/service.ts`, `web/order-form.ts`): sửa xung đột trên `main` mới rồi chủ day-len | sau khi nhánh này vào GitHub |
| S2 | YC-0014 tiền đón theo lớp giá đưa đón | sau S1 và Q4 |
| S3 | Sổ công nợ P2 (ADR-0081 đối tác xem sổ), P3 (ADR-0116 hoàn tiền sau giao) | ảnh phác của chủ; kế hoạch `docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach.md` |
| S4 | YC-0021 đăng ký bằng SĐT có Zalo | Zalo OA doanh nghiệp (BACKLOG §16) |
| S5 | YC-0017 đại lý tổ chức nhiều nhân viên | chủ «để sau» (BACKLOG §44) |
| S6 | YC-0022 sản phẩm đóng/mở khi cần | ghi ở BACKLOG §45 (`BL-GOPY-HT-SAN-PHAM-DONG-MO`), chưa có đặc tả; đụng nguồn sự thật danh mục (Google Sheet) |
| S7 | Trả lời người gửi trên phiếu (YC-0016.1 chọn HDV đã có; YC-0013 lọc kế toán cần khoảng ngày ≤ 92 ngày) | Quản trị trả lời trên Nền tảng |

## 5. Nợ ghi nhận (không chặn phát hành)

- Tài khoản lai Bán hàng + Đối tác đọc được đơn chờ của Đối tác khác (dịch vụ, ngày, số khách, giờ đón, tiền; không tên/SĐT/email) — hệ quả «hợp quyền», chủ đã biết 26/10.
- Chữ ADR-0136 Đ13.5 câu thứ ba và tiêu chí 4 hiểu hẹp (chỉ đơn chờ) — ghi ở `SYSTEM-DESIGN` §16 ở L7; chủ ra dòng bổ sung ADR sau.
- Kịch bản Chrome chưa chạy cho các màn của 2.29, 2.30 (BACKLOG §45 `BL-GOPY-HT-CHROME`).
- Kịch bản Chrome còn nhắc ô Trả trước (nhiều khả năng đỏ/cần sửa, chưa chạy): `a2-evidence`, `v1-xac-nhan-png`, `qr-smoke`, `than-gui`, `nhan-noi-safari-smoke`, `thanh-dinh-smoke`.
- `a2-smoke-order` đỏ từ trước ở bước 2 (banner `incomplete_trip`, commit 2ce61247) — không do nhánh này.
