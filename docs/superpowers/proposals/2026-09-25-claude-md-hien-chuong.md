# Đề xuất sửa `CLAUDE.md` để trỏ tới Hiến chương kiến trúc lõi

- **Ngày:** 2026-09-25. **Trạng thái:** **chủ dự án cho phép 2026-09-25** ("Cho phép, đồng thời hãy viết ngắn gọn, tường minh") — đã áp vào `CLAUDE.md` (bản rút gọn) trên nhánh `hien-chuong-kien-truc`. Trước đó: AI không tự sửa `CLAUDE.md` (Hiến pháp N9; `CLAUDE.md` §3). Chỉ áp khi chủ dự án duyệt Hiến chương (`docs/ARCHITECTURE.md` Phần I) **và** duyệt đề xuất này.
- **Không đổi nghĩa quy tắc nào hiện có**; chỉ thêm đường dẫn và một câu về thứ tự tra cứu.

## Thay đổi 1 — §2, dòng "Tài liệu chuẩn tắc"

```diff
-- Tài liệu **chuẩn tắc** (Hiến pháp, ADR đã duyệt, luật ở `docs/ARCHITECTURE.md`, `docs/SPEC-tourdao-sales.md` đã duyệt) **thắng mã**: mã lệch là lỗi, sửa mã.
+- Tài liệu **chuẩn tắc** (Hiến pháp, **Hiến chương kiến trúc lõi + luật ở `docs/ARCHITECTURE.md`** (đứng trên mọi ADR), ADR đã duyệt, `docs/SPEC-tourdao-sales.md` đã duyệt) **thắng mã**: mã lệch là lỗi, sửa mã.
+- **Câu hỏi thiết kế mới: tra Hiến chương (`docs/ARCHITECTURE.md` Phần I) trước.** Điều khoản đã trả lời → áp dụng, ghi "theo Hiến chương điều X", không hỏi lại chủ. Chỉ hỏi chủ khi Hiến chương không đủ để quyết, khi muốn lệch (cần ADR "lệch có chủ ý"), hoặc khi là chiến lược kinh doanh.
```

## Thay đổi 2 — §6, bảng "Đọc gì, khi nào"

```diff
-| Kiến trúc: ranh giới module, nơi đặt mã | `docs/ARCHITECTURE.md`; quyết định đã duyệt: mục lục `docs/adr/README.md` rồi ADR liên quan |
+| Thiết kế mới bất kỳ (dữ liệu, vai, quyền, tiền, luồng) — **đọc trước tiên** | Hiến chương: `docs/ARCHITECTURE.md` Phần I (Điều 2 bốn loại thứ, Điều 5 nguyên tắc, bảng thi hành); bản đồ hiện trạng `docs/SYSTEM-DESIGN.md` §17 |
+| Kiến trúc: ranh giới module, nơi đặt mã | `docs/ARCHITECTURE.md` Phần II; quyết định đã duyệt: mục lục `docs/adr/README.md` rồi ADR liên quan |
```

## Cách áp (sau khi chủ duyệt)

AI chép nguyên văn hai thay đổi trên vào `CLAUDE.md` trên một nhánh, ghi ngày duyệt trong thông điệp commit (Hiến pháp N9 phần "Ranh giới", ADR-0012 điều kiện chép); chủ gộp bằng `npm run day-len`.
