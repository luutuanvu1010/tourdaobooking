---
paths:
  - "src/modules/orders/**"
  - "src/modules/dispatch/**"
---

<!-- BẢN NHÁP (đề xuất 2026-11-03-rut-gon-claude-md, bước 2): chữ cắt nguyên văn từ mục 10 của CLAUDE.md; chưa có hiệu lực. -->

- `orders` KHÔNG import `dispatch` (và không import `van-chuyen`); "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`), mốc 6 giờ cũng vậy (`ctx.mocToiThieu`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
- **Giờ đón / điểm đón** nay ở **chặng đưa đón** `ord_transfer_leg` (ADR-0047). Phát hành 1: `order_service.pickup_time/pickup_place` chỉ là **bản sao ghi kép** (đừng đọc); phát hành 2: cột chết. Lưu nháp xoá–chèn lại chặng và hành khách: thứ tự lô cố định (xoá chặng **trước** xoá dịch vụ, chèn chặng **sau** chèn dịch vụ) — `docs/CHANGE-GUIDE.md` công thức chặng.
