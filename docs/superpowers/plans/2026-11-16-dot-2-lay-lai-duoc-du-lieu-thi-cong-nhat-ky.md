# Đợt 2 sau kiểm toán — Lấy lại được dữ liệu: nhật ký thi công (16/11/2026)

Đặc tả: `docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md` (đã duyệt 16/11). Nhánh `claude/financial-data-security-audit-1f92e7`. Hướng dẫn sống cho chủ: `docs/KHOI-PHUC-DU-LIEU.md`.

## Đã làm
| Việc | Tệp | Bằng chứng |
|---|---|---|
| Sao lưu: xuất D1 + R2, mã hoá AES-256 (Keychain), thử mở lại, giữ 8 tuần + 12 tháng, chạy bù | `scripts/sao-luu.mjs`, `scripts/sao-luu-lib.mjs` | `src/sao-luu.test.ts`; chạy thật `--thu-local` trên D1 thử 16/11: XONG, xoá đúng ba bản tháng 9 dư, không đụng tệp lạ, `--neu-cu-hon` bỏ qua đúng |
| Diễn tập: giải mã → D1 tạm → soát `--strict` → năm con số | `scripts/dien-tap-khoi-phuc.mjs` | chạy thật trên bản thử 16/11: **ĐẠT** (sau khi gieo một Quản trị thử; trước đó R-N1-5 đỏ ở CẢ bản gốc thử — đúng); sai mật khẩu ⇒ thoát 1 |
| Sửa bộ tách bản xuất | `scripts/tach-ban-xuat-d1.mjs` | xem Ruling R1; bài `src/sao-luu.test.ts` (schema đầy đủ từ mọi migration) — bỏ đếm CASE ⇒ đỏ 2 bài, hoàn nguyên ⇒ xanh |
| Soát tiền hằng ngày, tác nhân `SOAT_TIEN_HANG_NGAY`, ô `audit.money.daily` | `src/soat-tien-hang-ngay.ts`, `scripts/audit-checks.d.mts`, `src/shared/permissions.ts`, `src/shared/tro-ly-cau-truc-ten.ts` | `src/soat-tien-hang-ngay.test.ts` (6 bài); tháo dây ở `scheduled` ⇒ bài 4 đỏ; đổi bộ lọc nhóm ⇒ bài 1, 4 đỏ |
| Thư báo việc tự động lỗi | `src/bao-loi-dinh-gio.ts`, bốn hàm Cron trả mã lỗi | `src/bao-loi-dinh-gio.test.ts` (4 bài); tháo dây ⇒ bài 2 đỏ |
| Lịch chạy Mac | `scripts/cai-lich-sao-luu.mjs` | chỉ `node --check`; **chưa cài thử** (cài là đổi máy của chủ) |

## Ruling
- **R1 (bộ tách hỏng):** bản 22/9 coi dòng kết thúc bằng `END;` là hết trigger. Schema hôm nay có trigger với `CASE … END;` trên dòng riêng ⇒ trigger bị cắt đôi, một câu `END;` lạc vào tệp cấu trúc ⇒ nạp lỗi «To execute a transaction…». Nghĩa là **bản thảo diễn tập 22/9 làm theo hôm nay sẽ hỏng**. Viết lại bằng bộ đọc từ (bỏ qua chuỗi, chú thích; đếm BEGIN/CASE/END).
- **R2 (thư lỗi không lưu trạng thái):** «tối đa một thư mỗi loại mỗi ngày» làm bằng cách chỉ gửi ở lượt 7 giờ sáng — không cần bảng mới (không migration). Đổi lại lỗi thoáng qua không có thư; ghi ở mục «Còn hở» của hướng dẫn. Bề mặt, đảo ngược được.
- **R3 (tác nhân thứ năm):** đặc tả đã duyệt tên tác nhân; khuôn ADR-0186 «mỗi tác nhân đúng một ô» ⇒ thêm ô `audit.money.daily` (Toàn quyền có vì ADR-0014 điều 2, ghi ở `O_HEP`). Chữ trợ lý «soát tiền hằng ngày (Nền tảng tự làm)» lấy từ tiêu đề đặc tả đã duyệt.
- **R4:** mức `warn` (cảnh báo vĩnh viễn) không vào thư soát; nhóm = đúng mức làm đỏ `--strict`.

## Nợ / chưa kiểm
- Trần gói Đơn hàng 114.890 → 114.978 (+88 byte, dòng bản đồ quyền) — **chờ chủ duyệt con số**.
- Đường production của hai công cụ (xuất `--remote`, đếm `--remote`, đọc thời hạn Time Travel), R2 qua `aws s3 sync`, Keychain thật, lịch launchd, quyền ghi Google Drive của tiến trình nền: **chưa kiểm** — chủ chạy diễn tập theo hướng dẫn mục 2 là lần kiểm đầu.
- Thư soát / thư lỗi trên production: chưa kiểm (cần triển khai; Email Service đã có).
- `HC-5.19` chỉ đóng sau khi chủ dán khối diễn tập ĐẠT từ bản xuất production.
- Người giữ phong bì: chủ chưa ghi vai (hướng dẫn mục 5 ghi «còn thiếu»).
