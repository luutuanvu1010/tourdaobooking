# Bằng chứng: nhánh PWA iPhone (2026-09-19)

Artifact của bước rà soát `docs/AUDIT-PWA-IPHONE.md` (Hiến pháp §8.2: bằng chứng thay cho lời khai). **Mã được đo: HEAD `37d5c71`** của nhánh `worktree-pwa-iphone`; từ đó đến khi ghi tài liệu này chỉ đổi tài liệu và bằng chứng, không đổi `public/`, `web/`, `src/`, `tests/`, `package.json`.

Đo trên `wrangler dev` cục bộ với D1 tạm và hai tài khoản thử, bằng Chrome headless khổ iPhone 390×844. **Không phải** đo trên iPhone thật, mạng thật hay Workers Assets thật. Bản rà này là tự rà, chưa qua QA độc lập (xem đầu `AUDIT-PWA-IPHONE.md`).

| File | Hạng (GOVERNANCE §5.2) | Là gì |
|---|---|---|
| `kiem-tra-may.txt` | E1 | `npm run typecheck`, `npm test` (55/55), `npm run test:e2e` (6/6, gồm `admin` và `catalog` đọc Google Sheet thật), gắn HEAD |
| `ket-qua-do.json` | E1 | axe-core trên 9 màn hình điện thoại (chỉ còn 2 lỗi nhỏ `empty-table-header` có sẵn từ trước) và thời gian mở màn hình ở 3 tình huống (trung vị 5 lần, 4G giả lập) |
| `nang-cap-sw.json` | E1 | mô phỏng hai lần deploy (mỗi lần khởi động lại máy chủ): cache bản A bị xoá, cache bản B thay thế, app chạy bình thường |
| `nang-cap-sw-mot-may-chu.txt` | E1 | build lại rồi cập nhật trên MỘT máy chủ: với `/sw.js` là `no-store` trình duyệt tự nhận bản mới và xoá cache cũ (với `no-cache` kịch bản này không đạt vì 304, xem `AUDIT-PWA-IPHONE.md` RS13) |
| `kiem-tra-giao-dien.txt` | E1 | đo phần tử: tab theo vai, nút "‹", bảng dịch vụ xếp dọc, nút Lưu dính đáy, service worker, cache không có `/api`, offline, đăng xuất, không lỗi console/CSP trên đủ 8 trang, bản máy tính |
| `anh/` | E2 | ảnh chụp thu nhỏ 50% (390 px chiều ngang), cần người xem |
| `kich-ban/` | — | bốn kịch bản tạo ra các file trên; cách chạy ở đầu mỗi file. Cần `puppeteer-core` và `axe-core` cài **tạm ngoài repo**, không thêm vào `package.json` (`CLAUDE.md` §8 của tourdaovn) |

Tài khoản thử (chỉ có trong D1 local dựng bằng `scripts/create-staff.mjs`, không tồn tại ở nơi khác): admin `0901000001`, nhân viên `0901000002`.
