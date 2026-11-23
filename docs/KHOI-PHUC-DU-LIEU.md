# Lấy lại dữ liệu: sao lưu, diễn tập, khôi phục, khi chủ vắng mặt

> **Tài liệu sống** (một nơi cho cách sao lưu và khôi phục). Nguồn: đặc tả `docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md` (chủ duyệt 16/11/2026). Bản thảo cũ `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` là hồ sơ có ngày, **đừng làm theo** nữa: công cụ tách tệp của nó cắt sai trigger kiểu mới (sửa 16/11) và nó còn ghi số trigger cũ.
> Mọi lệnh dưới đây chạy ở **thư mục gốc dự án** trên máy Mac của chủ: `cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales`. Các lệnh này **chỉ đọc** production.

## Mục tiêu
Mất cả tài khoản Cloudflare thì mất tối đa **1 tuần** dữ liệu (bản sao lưu tuần gần nhất); chỉ cần quay lại một thời điểm gần thì dùng Time Travel của Cloudflare (mất vài phút dữ liệu). Dựng lại từ bản sao lưu: mục tiêu **≤ 1 giờ**.

## 1. Chuẩn bị một lần

1. **Đặt mật khẩu mã hoá** (ít nhất 12 ký tự, nên là một câu dài). Lệnh sau hỏi mật khẩu hai lần rồi cất vào Keychain của máy (không hiện ra màn hình):
   ```bash
   security add-generic-password -s tourdao-sao-luu -a tourdao -T /usr/bin/security -w
   ```
   Chép mật khẩu này vào trình quản lý mật khẩu của bạn **và** vào phong bì niêm phong (mục 5). **Mất mật khẩu = mọi bản sao lưu thành vô dụng.** Đánh đổi đã chọn: phần `-T /usr/bin/security` cho lịch chạy nền đọc mật khẩu mà không hỏi, nên chương trình nào chạy dưới tài khoản máy của bạn cũng đọc được nó — giữ máy có mật khẩu đăng nhập.
2. **Chọn thư mục cất**: tạo một thư mục riêng trong Google Drive trên máy, ví dụ `/Users/tuanbao/Library/CloudStorage/GoogleDrive-<tài khoản>/My Drive/TourDao-SaoLuu`. Trong các lệnh dưới, gõ **đường dẫn đầy đủ** như vậy (trong ngoặc kép, dấu `~` không được hiểu). Không chia sẻ thư mục này cho ai.
3. **Khoá chỉ-đọc cho kho tệp R2** (để sao lưu cả ảnh giấy tờ, vé, biên lai): Cloudflare → R2 → *Manage R2 API Tokens* → *Create API token* → quyền **Object Read only**, chỉ áp cho 6 kho `tourdao-sales-*` (từ ADR-0232 có thêm kho `tourdao-sales-anh-ban-giao`; khoá tạo trước đó chỉ phủ 5 kho thì phải sửa phạm vi khoá hoặc tạo khoá mới) → lưu lại *Access Key ID*, *Secret Access Key* và địa chỉ *S3 endpoint* (`https://<mã tài khoản>.r2.cloudflarestorage.com`). Rồi chạy, dán đúng giá trị khi được hỏi (vùng gõ `auto`):
   ```bash
   aws configure --profile tourdao-r2
   ```
   ```bash
   aws configure set endpoint_url https://<mã tài khoản>.r2.cloudflarestorage.com --profile tourdao-r2
   ```
   Chưa làm bước 3 thì thêm `--khong-r2` vào các lệnh sao lưu bên dưới (chỉ sao lưu cơ sở dữ liệu).

## 2. Diễn tập khôi phục (lần đầu, rồi mỗi tháng một lần)

1. Tạo một bản sao lưu ngay (thay `<thư mục cất>` bằng thư mục ở bước 1.2, giữ nguyên dấu ngoặc kép):
   ```bash
   node scripts/sao-luu.mjs --dich "<thư mục cất>"
   ```
   Dòng cuối phải là `XONG`. Bản cất có tên `tourdao-NămThángNgày-GiờPhút.tar.gz.enc`.
2. Diễn tập trên bản vừa tạo (giải mã vào chỗ tạm, nạp vào một cơ sở dữ liệu tạm trên máy, soát số liệu, so năm con số với production, rồi xoá chỗ tạm):
   ```bash
   node scripts/dien-tap-khoi-phuc.mjs "<thư mục cất>/<tên tệp vừa tạo>"
   ```
3. Dán cho AI **khối giữa hai dòng `=====`** (không có dữ liệu khách). AI ghi mục «Diễn tập khôi phục» vào `docs/HANDOFF-N1.md`. `KẾT LUẬN: ĐẠT` = nạp được, soát đạt, năm con số khớp. Năm con số lệch nhẹ thường do có người vừa ghi trong lúc diễn tập: chạy lại hai lệnh.

## 3. Sao lưu tự động hằng tuần
Sau khi diễn tập đạt, cài lịch chạy (máy tự sao lưu mỗi tuần; máy tắt đúng giờ thì lần mở sau chạy bù):
```bash
node scripts/cai-lich-sao-luu.mjs --dich "<thư mục cất>"
```
Lịch giữ 8 bản tuần gần nhất và 1 bản mỗi tháng trong 12 tháng; tệp khác trong thư mục không bị đụng. Riêng kho Ảnh bàn giao (ADR-0232) đi **gói riêng** `tourdao-anh-ban-giao-NămThángNgày-GiờPhút.tar.gz.enc`, cùng mật khẩu, chỉ giữ **4 gói gần nhất** (khoảng một tháng): ảnh vẫn nằm đủ hạn giữ trong kho chính, gói sao lưu chỉ để chống mất kho, và chính sách riêng tư hứa ảnh đã xoá theo yêu cầu không ở lại bản sao lưu quá khoảng một tháng. Gói ảnh chạy SAU khi gói chính đã cất: kho ảnh chưa tạo hoặc khoá chỉ-đọc chưa phủ kho ảnh thì lượt chạy báo HỎNG dù gói chính đã an toàn — sửa khoá (bước 1.3) rồi chạy lại. Lỗi thì góc màn hình hiện thông báo «Tour Đảo: sao lưu HỎNG»; nhật ký ở `~/Library/Logs/tourdao-sao-luu.log`. Lúc vừa đăng nhập máy mà Google Drive chưa mở xong thì có thể hiện một thông báo «không thấy thư mục đích» — lần chạy 10:00 sẽ làm lại. Bản chưa mã hoá chỉ nằm tạm trong máy lúc đang chạy; bị tắt ngang thì lượt sau tự dọn. Lần đầu chạy nền, macOS có thể hỏi cho phép đọc Keychain (bấm *Luôn cho phép*) và cho phép ghi vào Google Drive. Gỡ lịch: `node scripts/cai-lich-sao-luu.mjs --go`.

## 4. Khi có sự cố thật
- **Dữ liệu vừa hỏng, còn trong thời hạn Time Travel** (xem thời hạn ở khối diễn tập): làm theo phần «Hoàn tác» của `docs/HANDOFF-N1.md` (lùi cơ sở dữ liệu về một điểm, lùi Worker cùng lúc). Chủ quyết, chủ chạy.
- **Mất tài khoản Cloudflare hoặc phát hiện hỏng quá muộn**: giải mã bản sao lưu gần nhất (như bước 2.2, công cụ tự làm), tạo cơ sở dữ liệu D1 mới ở tài khoản mới, nạp **cấu trúc → dữ liệu → trigger** từ ba tệp trong thư mục `d1/`, tải các thư mục `r2/<kho>` lên kho mới (kho Ảnh bàn giao lấy từ gói `tourdao-anh-ban-giao-…` gần nhất), rồi triển khai lại mã. Khôi phục cơ sở dữ liệu về trước một lần xoá ảnh theo yêu cầu thì phải chạy lại lần xoá đó (Hiến chương 5.25). Việc này cần AI soạn lệnh theo tình huống; không làm đè lên production đang chạy.

## 5. Khi chủ vắng mặt hoặc mất tài khoản
- **Người thứ hai:** một người tin cậy giữ **phong bì niêm phong**, không có quyền vào Nền tảng hằng ngày. Vai người giữ: **(chủ ghi vai vào đây, không ghi tên — hiện còn thiếu)**.
- **Trong phong bì:** cách khôi phục tài khoản Cloudflare (email đăng nhập, mã khôi phục hai lớp), mật khẩu tệp sao lưu, đường tới thư mục Google Drive chứa bản sao lưu, và một bản in trang này.
- **Người thứ hai làm gì:** (1) giữ phong bì, không mở khi không có sự cố; (2) khi chủ không liên lạc được mà Nền tảng ngừng chạy hoặc mất dữ liệu: mở phong bì, nhờ một người biết máy tính làm theo mục 4 trên một máy Mac có cài Node; (3) mất tài khoản Cloudflare: liên hệ hỗ trợ của Cloudflare bằng email trong phong bì.
- **Mở tệp sao lưu trên máy khác (không có Keychain của chủ):** `node scripts/dien-tap-khoi-phuc.mjs "<tệp>" --khong-so-production` — công cụ hỏi mật khẩu, gõ mật khẩu trong phong bì.

## 6. Thư báo tự động của máy chủ
Mỗi sáng 7 giờ máy chủ tự soát số liệu tiền và vé; có chỗ lệch thì gửi **một thư** tới địa chỉ đang nhận thư Góp ý / Báo lỗi, nêu mã luật và số chỗ lệch (không tên khách, không số tiền). Cùng lúc, việc tự động nào (đồng bộ Sheet, nhắc hạn trả sau, dọn ảnh vé, dọn phiếu đăng ký) đang lỗi thì có **một thư** liệt kê. Không có gì bất thường thì không có thư. Nhận thư: dán nguyên thư cho AI trong dự án tourdao-sales và nhờ tra.

## Còn hở (dựa vào kỷ luật)
Bản sao lưu nằm ở Google Drive của một tài khoản cá nhân; chưa có bản thứ hai ở nơi khác. Lỗi việc tự động chỉ báo khi còn hỏng lúc 7 giờ sáng. Bộ soát hằng ngày chỉ phủ nhóm luật tiền và vé.
