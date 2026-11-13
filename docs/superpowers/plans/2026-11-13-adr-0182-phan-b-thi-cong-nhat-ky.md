# Nhật ký thi công ADR-0182 phần B — khoản nộp của đại lý (2026-11-13)

- **Nhánh:** `claude/vibrant-keller-5d0659` (đã gộp `claude/partner-payment-system-e3f939` @`1b876ed73` — văn bản ADR đã duyệt). Kế hoạch: `2026-11-13-adr-0182-phan-b.md`.
- **Căn cứ:** ADR-0182 phần B accepted 2026-11-13 «Duyệt, phát hành ngay». Xây trên lỗ đang hở **TNV-G1, HC-5.19** (khoá `xay_tren_cho_phep_adr_0182_b`); phát hành KHÔNG chờ diễn tập.
- **Migration:** `0159_khoan_nop_dai_ly.sql` (main tới 0158; không nhánh chưa gộp nào có 0159+). Số bản tạm **2.97** (main 2.96).

## Đã làm

| Việc | Tệp chính |
|---|---|
| Ba ô quyền Đ3 (`dai-ly.nop.ghi` Đối tác own; `dai-ly.nop.xac-nhan` Kế toán, Toàn quyền; `dai-ly.nop.xem` Kế toán, Quản trị, Toàn quyền, Đối tác own) | `src/shared/permissions.ts` |
| Vị từ «đơn có phiếu» `coPhieuNopTien`, trần / số QR `tranNop`, chữ theo khuyến nghị | `src/shared/cong-no-dai-ly.ts` |
| Bảng `bil_agent_remittance`, `bil_remittance_proof`, trigger chặn «Công ty thu» khi có khoản chờ, view `v_ord_order_booker` | `migrations/0159_khoan_nop_dai_ly.sql` |
| SQL nghiêm; ghi / xác nhận / từ chối; kho ảnh dùng chung (`BANG_NOP`) | `billing/khoan-nop-repo.ts`, `billing/khoan-nop.ts`, `billing/kho-bien-lai.ts` |
| Sáu route (ghi, xem ảnh, gỡ ảnh, xác nhận, từ chối, danh sách chờ); hàng chờ dọn kho + chạy lại phủ bảng ảnh mới | `billing/index.ts` |
| Chặn ghi trùng: quyết toán «nộp», «Công ty thu» của người có khoản chờ (máy chủ + trigger); xác nhận kiểm lại trần | `billing/service.ts`, `billing/khoan-nop.ts` |
| Phiếu mang phần khoản nộp (QR = `tranNop`); khe phần A (hoa hồng sửa sau giao) | `receipt/index.ts`, `receipt/rules.ts`, `billing/cong-no-dai-ly.ts`, `billing/tra-sau-repo.ts` |
| B2 cổng vé `tienDonVe` → `moVeTheoGiaDaiLy` | `billing/dat-coc.ts` |
| Giao diện: khối khoản nộp trong phiếu, câu nhắc sau Gửi đơn, danh sách chờ ở Sổ công nợ; tách `chuanBiBienLai` dùng chung | `web/khoan-nop-ui.ts`, `web/order.ts`, `web/so-cong-no.ts`, `web/thu-nho-anh.ts` |
| Sổ dữ liệu, bảng tham chiếu (việc + khái niệm), nhật ký hành động, lịch sử ẩn, Trợ lý, R-PD-1 / R-BIL-BL1, số route 499, route ghi 279, GHI_NHIEU_LAN | các tệp tương ứng |
| e2e `khoan-nop`; kịch bản Chrome `khoan-nop-smoke.mjs`; nhật ký thay đổi 2.97; sổ hàng rào (4 dòng); BACKLOG §71; SYSTEM-DESIGN §(s) + danh mục API; CHANGE-GUIDE bẫy 100 | — |

## Đỏ trước, xanh sau

- `src/migrations-khoan-nop.test.ts`: bỏ tạm migration ⇒ 6/6 đỏ → có migration ⇒ 6/6 xanh.
- `src/khoan-nop-dai-ly.test.ts` (17 ca, gồm sáu ca được giao: 1.000.000/800.000, «Tôi thu» một phần, khách trả thẳng Công ty, bấm hai lần (tuần tự + đua), ghi trùng qua quyết toán, tài khoản Đối tác không có phiếu): viết sau khi có route; đột biến quan sát chặn thật ghi ở `docs/SO-HANG-RAO.md` (bốn dòng 2026-11-13): bỏ siết quyết toán, tắt B2, bỏ khe hoa hồng, bỏ kiểm lại Công nợ còn lại, bỏ phần trừ khoản chờ của `tranNop`, tắt trigger «Công ty thu» ⇒ mỗi lần một ca đỏ → hoàn nguyên → xanh. Bỏ chốt «Công ty thu» ở máy chủ thì bài vẫn xanh vì trigger chặn (hai lớp).
- Kịch bản Chrome bắt một lỗi thật: hộp hỏi lại (`hoiXacNhan`) không mở được khi phiếu đã là bảng trượt ⇒ nút «Xác nhận đã nhận» của Kế toán không làm gì. Đã đổi sang hỏi lại ngay trong dòng; chạy lại xanh.

## Giả định của người thi công (chủ sửa được bằng một câu)

1. Khoản «Khách đã trả bạn X ₫» ghi hình thức «Khác» (đại lý không khai cách khách trả).
2. Trình duyệt gửi lại số X máy chủ đã đưa; lệch ⇒ 409 «tải lại» (không nhận số đại lý tự gõ).
3. Phạm vi nút «Đã chuyển tiền» theo chữ ADR Đ2 mục 11: bên đặt là CHÍNH hồ sơ của tài khoản Đối tác đang xem (kể cả đơn văn phòng lập cho đại lý đó). Cổng vé B2 xét người LẬP.
4. Trần 20 ảnh / giờ đếm riêng bảng ảnh khoản nộp.
5. Ngày ghi sổ của phiếu SETTLEMENT = ngày chuyển đại lý khai (tháng đã khoá ⇒ 409 `period_closed`, Kế toán từ chối / điều chỉnh).
6. Kế toán: danh sách chờ ở trang Sổ công nợ; xác nhận / từ chối trên phiếu của chi tiết đơn (cạnh thẻ Thanh toán có khoản «Công ty thu» chờ). Tên hai nút dùng lại «Xác nhận đã nhận» / «Từ chối» (bảng tham chiếu `cho-chon`).
7. Năm hành động nhật ký mới mặc định ẩn khỏi lịch sử đơn như mọi loại dòng mới; phiếu hiện trạng thái và lý do từ chối.
8. Danh sách việc của đại lý chưa làm (Trang chủ chưa có thẻ việc cho Đối tác) — BACKLOG §71 `BL-KN-VIEC-DAI-LY`.

## Cần chủ quyết

- **Trần gói trang Đơn hàng** +145 byte (111.444 → 111.589) cho ba ô quyền mới trong bản đồ quyền dùng chung; không mã giao diện vào gói đó. Đã gửi câu hỏi qua phiên điều phối. Chưa duyệt thì `src/goi-trang-nhe.test.ts` đỏ (một bài).

## Ghi chú quy trình

- Hai tệp bảng tham chiếu (`src/shared/bang-tham-chieu-viec.ts`, `-khai-niem.ts`) lúc đầu được sửa bằng kịch bản dòng lệnh trước khi hook nhắc; các lần sửa sau bằng công cụ sửa tệp. Nội dung là các dòng mới của phần B (không đổi dòng cũ).

## Bộ kiểm (2026-11-13, trên nhánh)

- `npm run typecheck`: 0 lỗi.
- e2e (nhóm tiền): `khoan-nop cong-no-dai-ly bien-lai qr-thanh-toan so-tien tra-sau chong-ghi-trung ve-dien-tu so-dai-ly-dot-2` — 12/12 kịch bản xanh.
- Kịch bản Chrome `docs/evidence/2026-11-13-khoan-nop-dai-ly/kich-ban/khoan-nop-smoke.mjs`: 10/10 bước xanh ở 390 và 1280, có `AXE_JS`; ảnh ở `…/anh/`.
- `npm test` đủ bộ và người kiểm độc lập: ghi ở mục dưới khi chạy xong.
