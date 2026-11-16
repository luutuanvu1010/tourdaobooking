# Đợt 2 sau kiểm toán — Lấy lại được dữ liệu (đặc tả ngắn, 16/11/2026)

> Trạng thái: **đã duyệt** — chủ dự án 16/11/2026, nút «Duyệt khuyến nghị» cho ba câu ở mục 5 (Mac tự chạy + Google Drive; người thứ hai giữ phong bì, chủ chỉ ghi vai; thư tới địa chỉ nhận Góp ý). Thi công: `docs/superpowers/plans/2026-11-16-dot-2-lay-lai-duoc-du-lieu-thi-cong-nhat-ky.md`. Nguồn: kế hoạch `docs/superpowers/specs/2026-11-14-kiem-toan-tien-ve-du-lieu-va-ke-hoach.md` mục 8, Đợt 2 (LT1–LT4, BM4). Đóng lỗ `HC-5.19` (hạn 31/12). Dùng lại bản thảo `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` (cập nhật cho hiện trạng).

## 1. Việc gì, cho ai, vì sao
Hôm nay nếu dữ liệu hỏng, bị xoá nhầm phát hiện muộn, hoặc mất tài khoản Cloudflare, thì chưa có đường lấy lại nào đã được thử; máy hỏng cũng không ai được báo. Đợt 2 cho chủ dự án: một bản sao dữ liệu ngoài Cloudflare mỗi tuần, đã thử nạp lại được; một lá thư mỗi khi số liệu tiền lệch hoặc việc chạy tự động bị lỗi; và một trang hướng dẫn cho lúc mất tài khoản hay chủ vắng mặt.

## 2. Xong khi (ví dụ nhìn thấy được)
- **Diễn tập:** chủ chạy theo trang hướng dẫn; bản xuất từ production nạp được vào một cơ sở dữ liệu tạm trên máy; bộ soát số liệu chạy trên bản nạp lại **đạt**; năm con số (đơn, dòng tiền, tài khoản, hồ sơ, nhật ký) **khớp** production; ghi được thời gian dựng lại thật (mục tiêu ≤ 1 giờ). Sổ bàn giao có mục «Diễn tập khôi phục» kèm ngày, thời gian, thời hạn Time Travel thật. `HC-5.19` đóng trong `docs/quyen-hoan.json`.
- **Sao lưu hằng tuần:** mỗi Chủ nhật máy Mac của chủ tự xuất dữ liệu D1 (ba tệp nạp lại được) và tệp của năm kho R2, **mã hoá bằng mật khẩu**, cất vào thư mục Google Drive trên máy; giữ 8 bản tuần gần nhất + 1 bản mỗi tháng trong 12 tháng. Máy tắt lúc đến giờ thì lần mở máy sau tự chạy bù. Mở tệp mã hoá không có mật khẩu thì không đọc được.
- **Soát tiền hằng ngày:** 7 giờ sáng máy chủ tự chạy nhóm luật soát tiền và vé (R-BIL-*, R-KY-*, R-VDT-*, R-CRD-*). Có luật lệch ⇒ một thư gửi người nhận thư báo của Nền tảng, nêu **tên luật và số vi phạm** (không tên khách, không số tiền từng đơn). Không lệch ⇒ không gửi gì. Thử: cố ý làm lệch một dòng trên bản thử ⇒ có thư; sửa lại ⇒ hôm sau không có.
- **Báo khi việc tự động lỗi:** đồng bộ Sheet, nhắc hạn trả sau, dọn ảnh vé, dọn phiếu đăng ký ném lỗi ⇒ tối đa **một thư mỗi loại lỗi mỗi ngày**. Hiện các lỗi này chỉ nằm trong log.
- **Trang «mất tài khoản / chủ vắng mặt»:** một trang lời thường: ai làm gì, mở tệp sao lưu thế nào, khôi phục vào đâu, liên hệ ai — đủ để người thứ hai làm theo mà không cần AI.

## 3. Không làm lần này
- Mã hoá cột số căn cước, bằng lái trong cơ sở dữ liệu (BM4): thay bằng mã hoá **cả tệp sao lưu** (phủ mọi dữ liệu cá nhân, không đổi dữ liệu đang chạy). Mã hoá cột cần quản lý khoá và đổi dữ liệu một chiều ⇒ để ADR riêng sau.
- Khôi phục đè lên production; nhập sao kê; tự động hoá bằng máy chủ bên ngoài.
- Không đổi màn hình nào của nhân viên.

## 4. Loại việc
- [x] Việc lớn (dữ liệu, triển khai) ⇒ có người kiểm độc lập. Mọi lệnh `--remote` và việc tạo khoá Cloudflare **do chủ chạy**; AI soạn sẵn từng lệnh.
- Cần ADR không: **không** cho diễn tập và sao lưu (hai chiều, không đổi dữ liệu). Việc soát tự động thêm một **tác nhân tự động** mới (luật HC-5.11, ADR-0186) — chỉ đọc, ghi trong đặc tả này.

## 5. Câu hỏi cho chủ (ba câu)
1. **Sao lưu chạy và cất ở đâu?** (a) **Máy Mac của bạn tự chạy mỗi Chủ nhật, cất vào thư mục Google Drive trên máy — khuyến nghị**: không phải nhớ, Drive tự đẩy lên mây, máy đã đăng nhập Cloudflare sẵn. (b) Lịch nhắc trên điện thoại, bạn tự chạy một lệnh. Chọn (a) thì bạn tạo thêm một khoá chỉ-đọc cho kho tệp R2 (tôi soạn từng bước) và cất mật khẩu mã hoá trong trình quản lý mật khẩu.
2. **Người thứ hai trong trang «chủ vắng mặt» là ai?** Khuyến nghị: **một người tin cậy giữ phong bì niêm phong** (cách khôi phục tài khoản Cloudflare + mật khẩu tệp sao lưu), không có quyền vào hằng ngày. Bạn chỉ cần cho biết vai (ví dụ «Kế toán trưởng», «người nhà»), không cần tên trong tài liệu. Hoặc «chưa có người, ghi là còn thiếu».
3. **Thư báo gửi tới đâu?** Khuyến nghị: **đúng địa chỉ đang nhận thư Góp ý / Báo lỗi** của Nền tảng (đã cài, không thêm bí mật mới). Hoặc một địa chỉ khác bạn chỉ định.

## 6. Điều AI tự quyết (chủ bác được)
- Làm diễn tập **ngay trong Đợt 2** vì bạn vừa ra lệnh «làm Đợt 2»; không đổi hạn sổ 31/12.
- Mục tiêu: mất tối đa 1 tuần dữ liệu nếu mất cả Cloudflare, vài phút nếu chỉ cần quay lại trong thời hạn Time Travel; dựng lại ≤ 1 giờ (theo bản thảo 22/9, bạn chưa sửa).
- Mã hoá tệp bằng `openssl` có sẵn trên máy (AES-256, mật khẩu do bạn đặt); không cài thêm công cụ.
- Soát hằng ngày chạy **trong máy chủ** (lịch chạy sẵn có), chỉ nhóm luật tiền và vé, dùng **chính câu soát** của `scripts/audit-checks.mjs` (một nguồn); tên tác nhân mới `SOAT_TIEN_HANG_NGAY`, không có quyền ghi.
- Thứ tự thi công: (1) công cụ xuất + mã hoá + trang diễn tập, bạn chạy diễn tập; (2) soát hằng ngày + thư báo lỗi, cần một lần triển khai; (3) cài lịch chạy trên Mac; (4) trang «chủ vắng mặt».
