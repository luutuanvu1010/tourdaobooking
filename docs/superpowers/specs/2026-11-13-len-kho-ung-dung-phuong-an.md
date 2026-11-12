# Lên App Store và CH Play — phương án để soạn ADR (13/11/2026)

> **Hồ sơ có ngày, bản nháp để chủ chọn hướng.** Đây là **cửa một chiều** (tiền, tài khoản pháp nhân, cam kết duy trì với hai kho) nên
> phải qua **ADR do chủ duyệt** (CLAUDE.md §3, N3). Tờ này chưa phải ADR; chưa đăng ký, chưa trả tiền, chưa sửa mã.
> Kế hoạch kiểm giao diện đi kèm: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md`.

## 1. Hiện trạng

Nền tảng là PWA: Worker Cloudflare + giao diện TypeScript thuần, cài từ Safari («Thêm vào Màn hình chính»). Người dùng: khoảng 30 nhân viên và
khoảng 1.000 đối tác; **mọi tài khoản do Nhân sự / Quản trị tạo**, không có tự đăng ký; phải đăng nhập mới dùng được.
Thiếu cho kho (thấy trong kho mã 13/11): manifest chưa có biểu tượng «maskable» và trường `id`; chưa có trang chính sách quyền riêng tư công khai;
chưa có lối xin xoá tài khoản trong Nền tảng.

## 2. Điều luật kho liên quan (tra 13/11; mục ghi «chưa kiểm» phải đọc lại văn bản gốc khi soạn ADR)

- **Apple 4.2 (chức năng tối thiểu):** từ chối ứng dụng chỉ là trang web đóng gói lại; vỏ web không bị cấm nếu có thêm chức năng, giao diện
  «ra ứng dụng» (thông báo đẩy, Face ID, máy ảnh…). Mức gắt thực tế: nguồn bên ngoài nói khác nhau.
- **Apple 5.1.1(v):** chỉ ứng dụng **cho tạo tài khoản** mới bắt buộc có xoá tài khoản trong ứng dụng ⇒ Nền tảng (tài khoản do công ty tạo)
  có lẽ không bắt buộc, nhưng nên có lối «xin xoá» để an toàn (chưa kiểm cách Apple áp cho tài khoản do tổ chức cấp).
- **Apple — người duyệt cần tài khoản thử** để đăng nhập (chưa kiểm số điều; nguồn bên ngoài nói rõ cho ứng dụng doanh nghiệp).
- **Apple — phát hành không công khai (Unlisted):** dành cho nhóm người hạn chế như «nhân viên, công cụ bán hàng cho đối tác»; vẫn qua duyệt.
  **Ứng dụng riêng qua Apple Business Manager** chỉ hợp khi mọi máy do công ty quản lý — không hợp với 1.000 đối tác.
- **Apple Developer Program dạng tổ chức:** 99 USD/năm, cần số D-U-N-S của công ty (có thể mất tới 30 ngày nếu chưa có).
- **Google Play — TWA (đóng PWA thành ứng dụng Android):** được chấp nhận; cần tệp `/.well-known/assetlinks.json` trên `booking.tourdao.vn`
  (kiểu `application/json`, khớp khoá ký của Play). Tài khoản cá nhân mới phải thử kín 12 người × 14 ngày; tài khoản tổ chức nghe nói được miễn
  (chưa kiểm văn bản Google). Phí đăng ký 25 USD một lần (chưa kiểm lại).

## 3. Rủi ro kỹ thuật phải thử trước khi chốt (chưa thử cái nào)

1. **Face ID (passkey):** trong vỏ iOS cần khai «associated domains» cho `booking.tourdao.vn`; `PASSKEY_RP_ID` giữ nguyên.
2. **Kiểm `Origin` cùng site khi ghi:** vỏ phải nạp trang từ `https://booking.tourdao.vn`; nếu đóng gói trang vào máy (`capacitor://…`) thì mọi
   lệnh ghi bị chặn và cookie phiên hỏng — không nên đóng gói cục bộ.
3. **Turnstile ở Đăng nhập** chạy trong vỏ iOS (WKWebView): chưa thử.
4. **Service worker trong WKWebView** chỉ chạy khi khai «App-Bound Domains»: chưa thử.
5. **Máy ảnh quét vé** trong vỏ: cần câu xin quyền máy ảnh trong cấu hình iOS.
6. Mỗi lần triển khai web vẫn tự lên ứng dụng (vì vỏ nạp trang từ máy chủ); chỉ khi đổi phần vỏ mới phải nộp duyệt lại.

## 4. Phương án

| | Phương án | Được | Mất |
|---|---|---|---|
| A | **Chưa lên kho; làm giao diện cho chuẩn trước, PWA cài từ trình duyệt như nay** | Không tốn tiền, không thêm thứ phải duy trì; mọi công sửa giao diện đều dùng lại được khi lên kho | Chưa có trên kho; nhân viên, đối tác vẫn cài qua Safari / Chrome |
| B | **CH Play trước bằng TWA, iPhone giữ PWA; App Store tính sau** | Rẻ, rủi ro duyệt thấp, gần như không đổi mã (thêm một tệp chứng minh tên miền) | iPhone chưa có trên App Store; thêm một kho phải giữ tài khoản, chính sách |
| C | **Cả hai kho, phát hành không công khai: CH Play bằng TWA + App Store bằng vỏ (Capacitor) có thêm chức năng gốc (thông báo đẩy, Face ID, máy ảnh)** | Có mặt cả hai kho đúng nhóm người dùng | Apple có thể từ chối theo 4.2; thêm một phần mã gốc phải giữ; cần D-U-N-S, 99 USD/năm, tài khoản thử cho người duyệt, trang quyền riêng tư |
| — | Viết lại thành ứng dụng gốc | — | Không đề xuất: trái ràng buộc «không thư viện chạy», viết lại hơn 120 tệp giao diện |

**Khuyến nghị:** đi **A ngay** (chương trình kiểm giao diện) và **soạn ADR theo hướng C chia hai nấc** (CH Play trước, App Store sau khi thử xong
năm rủi ro mục 3). Việc chủ có thể làm sớm vì mất thời gian chờ, không ràng buộc mã: tra xem Công ty TNHH Tour Đảo đã có số D-U-N-S chưa.
