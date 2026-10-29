# Quyết định chủ dự án: mở 7c và đợt 0b — 2026-10-29

> Hồ sơ có ngày. Viết xong là đóng băng. Nối tiếp `QUYET-DINH-CONG-PHAT-HANH-DOT-0-2026-10-29.md` (đợt 0 đã lên production bản 2.47).

## Lời chủ dự án (nguyên văn, chiều 29/10/2026, Main session 8418e052)

> gộp biên bản, đóng phiên Code và quyết mở 7c cùng đợt 0b.

## Cách Main session đọc (chủ có thể bác bất kỳ dòng nào)

1. **Gộp biên bản:** chủ gộp nhánh `bien-ban-cong-phat-hanh-dot-0` (chỉ tài liệu) bằng `npm run day-len`. Nhánh này chứa cả biên bản cổng phát hành đợt 0 lẫn tờ này.
2. **Đóng phiên Code:** phiên `dot-0-khung-chung` đã xong việc, đang treo; chủ tự đóng (Main session không đóng được phiên khác).
3. **Mở 7c** (LO-TRINH bước 6): chuyển bộ «Island Booking System — Design System v2» (artifact `R7vYe6PdU85WCSYkanWNP5`, bản 8) sang **đồng bộ từ mã**: nguồn duy nhất là `public/app.css`, `web/icons.ts`, `src/shared/muc-giao-dien.ts` trên `main` sau đợt 0; bộ trên Claude là tấm gương, có bản chụp trong kho và một bài kiểm máy so token của bộ với `:root` của `app.css`. Ghi «chưa dùng» cho `--w-sidebar-gon` và «đầu trang tách» (cổng 2b chọn B/A).
4. **Mở đợt 0b khung tải:** đọc là **chủ duyệt ADR-0143** (proposed từ 27/10, trên `main` từ 28/10) theo đúng điều kiện của quyết định 3 cổng 1: đo trước/sau bằng chính kịch bản Chặng 1; không gộp lời gọi dữ liệu (đòn bẩy 7) và không «lưu xong báo ngay» (đòn bẩy 8). Chủ đã nghe hệ quả khi mất mạng (trang chưa từng mở hiện trang «ngoài mạng» thay vì bản cũ) ở cổng 1 và không đổi ý. Đặc tả đợt 0b **được thu hẹp nhưng không mở rộng** so với ADR-0143 Đ0–Đ6; thi công chỉ sau khi chủ duyệt đặc tả và kế hoạch, cùng nhịp đợt 0.

## Hệ quả kỹ thuật ghi trước cho đặc tả 0b

- Trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`, 101.719 byte, còn dư 19 byte): Đ1 tách gói chung làm `orders.js` chỉ còn phần riêng, nên bài này phải **định nghĩa lại** (trần cho gói chung + trần cho phần riêng từng trang) thay vì nới; đặc tả 0b quyết, chủ duyệt cùng đặc tả.
- Khi gộp đợt 0, commit `25f127d1` đưa `/__scheduled` vào `run_worker_first` của `wrangler.jsonc` (để trang 404 không bắt lịch chạy nền): đặc tả 0b phải đọc lại `wrangler.jsonc` hiện hành.
- Nợ chuyển từ đợt 0 vào 0b (biên bản cổng phát hành, mục «Nợ chuyển tiếp» 1–2): CLS Trang chủ / Đơn hàng (Đ6 khung xương), mã đơn bị cắt ở thanh trên 390, ba kiểu huy hiệu thanh bên, khoá phóng `user-scalable=no`.
