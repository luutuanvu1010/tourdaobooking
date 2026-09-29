# Bằng chứng giao diện — ADR-0049 + ADR-0050 Phần B (Bảng điều phối lượt 1)

- **Bản vẽ:** `docs/design/van-chuyen-dieu-phoi/` (chủ dự án vẽ 29/9; đọc kèm bản đối chiếu `DOI-CHIEU-2026-09-29.md` — chỗ bản vẽ trái căn cứ đã sửa theo căn cứ).
- **Người chụp:** người thi công Phần B (chưa phải kiểm độc lập). Mọi SĐT, tên, biển số là **GIẢ**.
- **Giới hạn:** Chrome headless trên máy phát triển (390×844 giả lập cảm ứng, 1040×820), D1 tạm, không mạng ngoài. **Chưa thử iPhone thật**, chưa thử dữ liệu thật trên production.
- **Nhật ký thi công giao diện** (đỏ trước, xanh sau, P16 từng kịch bản, lệch bản vẽ, câu hỏi): `docs/superpowers/plans/2026-09-29-adr-0049-giao-dien-nhat-ky.md`.
- **Chưa có:** B1–B6 (Điều phối xe, Chi tiết chuyến, Tạo / sửa chuyến, Cuốc của tôi, Chuyến đang chạy, Xuất bến) — chờ route A13 / A15 của máy chủ.

## Cách chạy

Từ **gốc repo**, sau `npm run build:web`; cần Chrome và một bản `axe-core` NGOÀI repo (`tests/e2e/README.md`, mục "Kiểm giao diện bằng Chrome thật"):

```
AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/<kịch bản>.mjs
```

`OUT` để ghi ảnh ra chỗ khác (không làm bẩn repo). Các kịch bản mới dựng trên `kich-ban/dp-lib.mjs` (khuôn `vc-lib.mjs` của lượt 1a: D1 tạm + wrangler dev riêng, cổng trống). Kho cookie của Chrome dùng chung — mỗi kịch bản mở trang theo thứ tự tài khoản ghi ở đầu tệp.

## Kịch bản

| Kịch bản | Màn | Số bước | Kiểm gì |
|---|---|---|---|
| `chinh-sach-dieu-phoi-smoke.mjs` | B8 — V13 | 14 | Toàn quyền 1040: bốn ô theo bản gieo (giờ / phút), công tắc đủ danh sách bật, hợp đồng khoá tắt, hai điều kiện gieo "Kiểm định — mọi xe", "Bảo hiểm trách nhiệm dân sự — mọi xe", không ô ngày, không "Đang soạn" (chủ Q3), thanh bên có "Chính sách điều phối" + "Lý do điều phối", không "Điều phối xe"; ô ngoài khoảng (F 1–1440, mốc 0 / 49 giờ) → câu lời thường, không gửi; không đổi gì → không lưu; lưu bản mới → thân đúng năm khoá theo phút, lịch sử hai bản khác nhau ở ô F; trang Điều kiện xuất bến (thêm / đóng điều kiện, đổi hạng D1); 390 (lịch sử trong bảng trượt, nút dính đáy, ô ≥ 16px); trang Tôi hai dòng mới; Quản trị: năm nhóm lý do (không "Đặt gấp", "Bỏ chặng"), thêm (mã sinh từ nhãn, trùng → hậu tố), sửa, ngưng; mở thẳng trang chính sách → câu từ chối; 390 "đang thêm" (đếm /80); Bán hàng không có mục nào, mở thẳng bị từ chối; R-P22: lý do hệ thống "Không còn khách ở điểm" không có nút "Ngưng" (có ghi chú), trang giả lập dữ liệu cũ bấm Ngưng → 409 `ly_do_he_thong` → câu lời thường (bước 9b); axe; không lỗi console |
| `dat-gap-smoke.mjs` | B7 — V12 | 12 | Mốc đặt 48 giờ bằng route chính sách (chặng đón ngày mai luôn dưới mốc). Bán hàng: biểu mẫu CHƯA lưu gọi `GET /api/orders/moc-toi-thieu`, dải cảnh báo 7b, đổi ngày thì hết / hiện lại; lưu nháp được; trang đơn khoá "Xác nhận đơn" + "Cần Quản trị duyệt đặt gấp"; 409 khi trang cũ → dải "Còn chặng đón dưới mốc…" có dòng từng chặng; đơn đã đặt gấp: nhãn ĐỦ (văn phòng — H4); sửa chuyến dưới mốc → 409, không khung. Quản trị: nút + khung Đặt gấp (bốn lý do từ `LY_DO_DAT_GAP`, thiếu lý do → câu lỗi, ghi chú /120), duyệt → nhãn 7c, xác nhận được; sửa chuyến dưới mốc → khung trong bảng, gửi lại kèm `datGap`; biểu mẫu CHƯA lưu (390) "Duyệt đặt gấp" = lưu nháp rồi đặt gấp. Đối tác: chỉ "Đặt gấp — Quản trị đã duyệt" ở khối dịch vụ; **bước 10b — bài canh R-P21**: Lịch sử đơn của Đối tác không có nhãn lý do / tên người duyệt (đỏ thật trước khi gộp máy chủ `df32e83`, xanh sau). axe; không lỗi console |
| `moc-chua-co-smoke.mjs` | B7 — 503 | 6 | "Chưa có chính sách" dựng trên D1 TẠM của kịch bản (DROP TRIGGER + DELETE bảng chính sách — không sửa máy chủ): biểu mẫu không cảnh báo mốc, Lưu nháp có giờ đón → 503 → dải đỏ câu máy chủ + dòng việc cần làm; trang đơn không khoá Xác nhận, bấm → 503 (1040 + 390); bảng sửa chuyến → 503, không khung Đặt gấp; Toàn quyền lưu bản chính sách đầu tiên từ trạng thái rỗng → mọi thứ chạy lại |
| `nhat-ky-loc-smoke.mjs` | (Phần A) | — | bộ lọc Nhật ký nhóm "Điều phối xe" — của người thi công máy chủ |

Kịch bản cũ đã sửa theo Phần B: `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs` (bước 2) và `danh-muc-giay-to-smoke.mjs` (bước c) — nhóm VẬN CHUYỂN của Quản trị có thêm "Lý do điều phối"; `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` — vòng 2 làm xanh: xác nhận đơn đón hôm nay qua đường Quản trị đặt gấp (ADR-0049), "Cần xem lại" của Quản trị chỉ dòng Sheet (ADR-0038), thanh bên Quản trị đếm THẬT 16 mục + đúng danh sách nhãn, `/audit` mở bằng Quản trị + Toàn quyền. Cùng vòng: `dot-c-smoke.mjs` (thêm `#push` — ADR-0036), `v1-nguoi-phu-trach.mjs` bước (b) (giao lần đầu cho chính mình = "Tự nhận phụ trách đơn" — ADR-0034 §4.3), `a2-smoke-form.mjs` bước 10g (chờ `#catalog-q`). Nguyên nhân gốc từng cái: nhật ký giao diện mục 8.1.

## Ảnh (`anh/`)

- B8: `b8-chinh-sach-may-tinh.png`, `b8-chinh-sach-loi-khai-lui-may-tinh.png`, `b8-chinh-sach-hai-ban-may-tinh.png`, `b8-dieu-kien-xuat-ben-may-tinh.png`, `b8-chinh-sach-dien-thoai.png`, `b8-chinh-sach-lich-su-dien-thoai.png`, `b8-ly-do-may-tinh.png`, `b8-ly-do-dang-them-dien-thoai.png`, `b8-ly-do-dien-thoai.png`.
- B8 (R-P22): `b8-ly-do-he-thong-409-may-tinh.png`.
- B7 (503): `b7-503-bieu-mau-may-tinh.png`, `b7-503-don-may-tinh.png`, `b7-503-don-dien-thoai.png`, `b7-503-sua-chuyen-may-tinh.png`.
- B7: `b7-bieu-mau-ban-hang-may-tinh.png`, `b7-don-ban-hang-may-tinh.png`, `b7-don-ban-hang-dien-thoai.png`, `b7-dat-gap-quan-tri-may-tinh.png`, `b7-da-dat-gap-quan-tri-may-tinh.png`, `b7-sua-chuyen-dat-gap-may-tinh.png`, `b7-bieu-mau-dat-gap-quan-tri-dien-thoai.png`, `b7-da-dat-gap-dien-thoai.png`, `b7-don-doi-tac-dien-thoai.png`.
- Ảnh cả trang ở 1040 có thanh bên dính lệch chỗ — hiện tượng của cách chụp kéo dài trang (`captureBeyondViewport`), không phải lỗi bố cục.
