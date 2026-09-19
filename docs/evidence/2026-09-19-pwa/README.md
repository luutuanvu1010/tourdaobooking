# Bằng chứng: nhánh PWA iPhone (2026-09-19)

Artifact của bước rà soát `docs/AUDIT-PWA-IPHONE.md` (Hiến pháp §8.2: bằng chứng thay cho lời khai). Tất cả đo trên `wrangler dev` cục bộ với D1 tạm và hai tài khoản thử, bằng Chrome headless khổ iPhone 390×844. **Không phải** đo trên iPhone thật hay mạng thật.

| File | Là gì |
|---|---|
| `ket-qua-do.json` | axe-core trên 9 màn hình điện thoại (chỉ còn 2 lỗi nhỏ `empty-table-header` có sẵn từ trước) và thời gian mở màn hình ở 3 tình huống (trung vị 5 lần, 4G giả lập) |
| `kiem-tra-giao-dien.txt` | kết quả đo phần tử: tab theo vai, nút "‹", bảng dịch vụ xếp dọc, nút Lưu dính đáy, service worker, cache không có `/api`, offline, đăng xuất, bản máy tính |
| `anh/` | ảnh chụp thu nhỏ 50% (390 px chiều ngang) |
| `kich-ban/` | hai kịch bản tạo ra các file trên; cách chạy ở đầu mỗi file. Cần `puppeteer-core` và `axe-core` cài **tạm ngoài repo**, không thêm vào `package.json` |

Tài khoản thử (chỉ có trong D1 local dựng bằng `scripts/create-staff.mjs`, không tồn tại ở nơi khác): admin `0901000001`, nhân viên `0901000002`.
