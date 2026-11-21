# Đề xuất sửa luật thư mục giao diện (`web/CLAUDE.md`) và tiêu chí chấm giao diện sau ADR-0222 (21/11/2026)

> **Đề xuất, chờ chủ duyệt.** `web/CLAUDE.md` là tệp luật: AI không tự sửa (Hiến pháp N9), chỉ nêu chữ đề xuất ở đây. Hồ sơ có ngày.
> Lý do: ADR-0222 mục «Hệ quả» nêu phải sửa `web/CLAUDE.md` và `docs/TIEU-CHI-GIAO-DIEN.md`. Tới khi chủ duyệt, phiên làm giao diện đọc ADR-0222 và công thức z41 của `docs/CHANGE-GUIDE.md` (đã cập nhật, vì là tài liệu mô tả).

## 1. Thêm một mục vào `web/CLAUDE.md`, ngay sau mục «Thành phần chung v2»

```markdown
## Khung gốc giao diện (ADR-0222, 2026-11-21)
Mỗi màn thuộc đúng một khuôn trang, khai ở `<body data-khung-goc="…">` (bảy khuôn; KHÔNG phải `data-khuon`, thuộc tính đó là của dải nhắc bảo mật). Bố cục chỉ dựng bằng hàm của `web/khung.ts` (khối, lưới 12 cột, cặp nhãn và giá trị, thanh nút, bảng lưới) và số của thang `--kg-*`; công thức: `docs/CHANGE-GUIDE.md` z41.
- **Trang mới phải khai khuôn ngay** và dựng bằng khung; không được thêm tên vào danh sách chưa chuyển (`src/shared/khung-goc.ts`).
- **Không viết thêm luật bề rộng, chia cột, khoảng cách ngoài phần «Khung gốc giao diện» của `public/app.css`**, không thêm token `--w-*`, không thêm mốc `@media` ngoài 641 và 900: năm con số «chưa theo khung» có trần chỉ được hạ (`src/khung-goc.test.ts`). Cần số mới thì sửa thang, mọi màn cùng hưởng.
- **Ngoại lệ phải có tên:** phần không dựng được bằng khung nằm trong `.vung-tu-do` và có mục ở `SO_NGOAI_LE` (lý do, ngày chủ duyệt).
- **Hình của khuôn và số của thang do chủ duyệt bằng ảnh thật**, trước khi sửa mã.
- Sửa màn đã chuyển khuôn: chạy `npm run do-khung -- --tk <tệp tài khoản thử>` (quét 360 tới 1.920) trước khi giao người chấm giao diện.
```

## 2. `docs/TIEU-CHI-GIAO-DIEN.md` và trợ lý đánh giá giao diện (ADR-0222 Đ7c)

Chưa làm trong đợt này. Việc cần: thêm tiêu chí «đúng khuôn» (màn đã khai khuôn thì vùng, chỗ đặt nút chính và mức bề rộng theo khuôn) và cho máy đo `scripts/giao-dien/do-man.mjs` đo thêm bề rộng trung gian (hiện chỉ 390 và 1280). Tệp tiêu chí gắn với bài `src/giao-dien-tieu-chi-khop.test.ts` và định nghĩa trợ lý ở `.claude/agents/`, nên là một việc riêng có lượt duyệt riêng.

## 3. Điều này không đổi gì

Không đổi các luật đang có của `web/CLAUDE.md` (không `innerHTML`, tên nút tra bảng tham chiếu, ô gõ 16 px, token sau dấu mốc PWA). Mục mới chỉ thêm ràng buộc.
