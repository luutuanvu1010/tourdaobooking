---
paths:
  - "src/modules/van-chuyen/**"
  - "src/modules/orders/**"
---

<!-- BẢN NHÁP (đề xuất 2026-11-03-rut-gon-claude-md, bước 2): chữ cắt nguyên văn từ mục 10 của CLAUDE.md; chưa có hiệu lực. -->

- **Điều phối xe** (ADR-0049, ADR-0050, ADR-0051, migration `0040`–`0043`): mốc 6 giờ chặn **xác nhận** đơn có chặng dưới mốc tới khi Quản trị/Toàn quyền bấm "Đặt gấp" — mốc KHÔNG tắt được (CSDL chặn 0): bài không kiểm mốc dùng hàm tiêm giả của khung thử, bài kiểm mốc đi đường thật (đặt gấp qua route); chỉ route đặt gấp ghi `short_notice_*`. Luật lõi chuyến ở CẢ trigger lẫn máy chủ; lệnh chuyến là MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái cuối (bài `thu-tu-lo.test.ts`); mỗi suất một câu `INSERT`; **mở suất khách mới phải có mốc giờ hẹn** (`0043` — lô xếp chụp `XEP` khi chặng chưa có mốc; bài / khung thử chèn thẳng suất phải `gieoMocXep` trước). Tên, năm sinh khách chỉ ở chi tiết chuyến của văn phòng và DTO tài xế **trong ngày chạy** (SĐT người liên hệ: chỉ DTO tài xế); phản hồi lệnh ghi / tiến độ không kèm tên. Giờ tiến độ có HAI trục: giờ ghi nhận (máy chủ) và giờ xảy ra (văn phòng bấm thay khai được trong khoảng kẹp; tài xế thì bằng giờ máy chủ) — MỘT mốc giờ mỗi request, luôn `toISOString()` của máy chủ (CSDL so chuỗi). Khoá so sánh nơi (`place_key`, `khoaNoi*`) KHÔNG BAO GIỜ hiển thị. Khung thử đi tới xuất bến phải gieo Kiểm định + Bảo hiểm cho xe (điều kiện gieo sẵn). Chi tiết: `docs/CHANGE-GUIDE.md` công thức z3, bẫy 53.
