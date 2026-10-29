# Biên bản: chủ dự án duyệt đặc tả đợt 0 (28/10/2026)

Hồ sơ có ngày — không sửa lại. Người ghi: Main session (phiên điều phối).

## Lời chủ dự án, nguyên văn

> duyệt, tách khung tải sang đợt 0b, đã gộp

Trả lời cho tờ tóm tắt lời thường <https://claude.ai/artifact/USvua5VNcah8rWi3EMktAD> (một câu hỏi, sáu chỗ Main session tự quyết, lệnh gộp).

## Quyết định rút ra

1. **Đặc tả đợt 0 bản 3** (`DAC-TA.md`, commit 1d3c67fd, QA1 ĐẠT lần 3) được **duyệt**. Sáu chỗ Main session tự quyết trong tờ tóm tắt (thứ tự dải «mất mạng»; hộp xác nhận 5 chỗ mẫu + hàng rào; phím `/` sau đợt 0 theo 2A; ADR ngắn mới cho câu trả `/ngoai-mang`; sửa viền ô chọn và công tắc ở mọi trang; hạt giống tài khoản thử đủ 5 bộ) chủ không phản đối → giữ.
2. **Khung tải (ADR-0143) tách thành đợt 0b**, làm sau khi chủ duyệt ADR-0143 và có số đo của bản đợt 0 (mục 3 của đặc tả: theo đề xuất).
3. **Đã gộp:** kiểm `git ls-tree origin/main` lúc 28/10 tối: origin/main = 1d3c67fd chứa `DAC-TA.md`, `DOI-CHIEU-KHUNG-CHUNG-2026-10-28.md`, `TO-CONG-2B-2026-10-28.md`, `QUYET-DINH-CONG-2B-2026-10-28.md`; nhánh `dac-ta-dot-0` không còn commit đi trước main → đã xoá.

## Bước kế

Kế hoạch thi công (`superpowers:writing-plans`) trên nhánh `dot-0-khung-chung` (tách từ origin/main 1d3c67fd) → phiên Code riêng thi công cùng nhánh → QA2 → cổng phát hành đợt 0 (đặc tả mục 12) → chủ gộp → chủ phát hành.
