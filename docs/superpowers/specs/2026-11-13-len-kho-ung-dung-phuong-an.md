# Lên App Store và CH Play — phương án để soạn ADR (13/11/2026)

> **Hồ sơ có ngày. Chủ chọn hướng CÔNG KHAI 13/11 (mục 4); ADR chưa soạn.** Đây là **cửa một chiều** (tiền, tài khoản pháp nhân, cam kết duy trì với hai kho) nên
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

**Khuyến nghị (trước khi chủ trả lời):** đi **A ngay** (chương trình kiểm giao diện) và **soạn ADR theo hướng C chia hai nấc** (CH Play trước,
App Store sau khi thử xong năm rủi ro mục 3). Việc chủ có thể làm sớm vì mất thời gian chờ, không ràng buộc mã: tra xem Công ty TNHH Tour Đảo đã
có số D-U-N-S chưa.

## 4. Chủ chọn 13/11: phát hành CÔNG KHAI — và rủi ro đã nói một lần

Lời chủ (nguyên văn): «Công khai». ADR sẽ soạn theo hướng C nhưng **công khai** trên cả hai kho.

Rủi ro (nói một lần, chủ đã nghe thì thi hành — P18): Apple hay từ chối ứng dụng công khai mà **chỉ người có tài khoản do công ty cấp mới dùng
được**, thường theo điều 3.2 (kinh doanh), rồi đề nghị chuyển sang phát hành không công khai hoặc Apple Business Manager. Nguồn: các chủ đề
diễn đàn nhà phát triển của Apple (chưa đọc văn bản điều 3.2 gốc — phải đọc khi soạn ADR):
https://developer.apple.com/forums/thread/755917, https://developer.apple.com/forums/thread/783892, https://developer.apple.com/forums/thread/122473.
Google Play ít khắt khe hơn ở điểm này (chưa kiểm).

**Cách giảm rủi ro (đưa vào ADR để chủ chọn, chưa quyết):** (a) màn đầu cho người chưa có tài khoản: giới thiệu Tour Đảo, cách đăng ký làm đối tác,
liên hệ — để ứng dụng có giá trị với người lạ; (b) chức năng gốc trên iPhone (thông báo đẩy, Face ID, máy ảnh quét vé) để qua 4.2; (c) **đường lùi**:
bị từ chối theo 3.2 thì chuyển App Store sang không công khai, CH Play vẫn công khai.

## 5. Điều kiện của kho công khai (danh sách để thi công bước 4 — chưa làm)

1. Trang **chính sách quyền riêng tư** và **trang hỗ trợ** công khai trên `booking.tourdao.vn` (nội dung pháp lý: chủ / luật sư duyệt).
2. Khai **nhãn quyền riêng tư** của App Store và mục **An toàn dữ liệu** của Google Play (dữ liệu nào thu: SĐT, tên khách, giấy tờ tài xế…).
3. **Lối xin xoá tài khoản** trong Nền tảng và một địa chỉ web (Google Play đòi đường dẫn web cho ứng dụng có tài khoản — chưa kiểm áp cho tài
   khoản do công ty cấp). Chạm dữ liệu và luật «không xoá cứng» ⇒ cần ADR riêng.
4. **Tài khoản thử cho người duyệt** trên production, dữ liệu giả, không thấy dữ liệu thật — chạm tài khoản và quyền ⇒ chủ duyệt.
5. Biểu tượng đủ cỡ (kể cả «maskable»), màn chờ khi mở, ảnh giới thiệu theo khổ kho, mô tả tiếng Việt.
6. Tài khoản nhà phát triển dạng **tổ chức** (Apple 99 USD/năm + D-U-N-S; Google 25 USD một lần) — chủ tự đăng ký, AI không làm.
7. Tệp `/.well-known/assetlinks.json` cho TWA; cấu hình vỏ iOS (associated domains, App-Bound Domains, quyền máy ảnh) — sau khi thử năm rủi ro mục 3.
