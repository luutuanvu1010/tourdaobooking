# src/modules/orders/CLAUDE.md — bẫy chặng đưa đón

> Chỉ thêm ràng buộc cho vùng này, không nới `CLAUDE.md` gốc. Cắt nguyên văn từ `CLAUDE.md` §10 (ADR-0160). Mốc 6 giờ, đặt gấp: `src/modules/van-chuyen/CLAUDE.md`.

- **Giờ đón / điểm đón** nay ở **chặng đưa đón** `ord_transfer_leg` (ADR-0047). Phát hành 1: `order_service.pickup_time/pickup_place` chỉ là **bản sao ghi kép** (đừng đọc); phát hành 2: cột chết. Lưu nháp xoá–chèn lại chặng và hành khách: thứ tự lô cố định (xoá chặng **trước** xoá dịch vụ, chèn chặng **sau** chèn dịch vụ) — `docs/CHANGE-GUIDE.md` công thức chặng.
