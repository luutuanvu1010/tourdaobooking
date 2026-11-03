---
paths:
  - "src/modules/parties/**"
  - "src/modules/company/**"
  - "src/shared/permissions.ts"
  - "src/giay-to-khong-lo-so.test.ts"
---

<!-- BẢN NHÁP (đề xuất 2026-11-03-rut-gon-claude-md, bước 2): chữ cắt nguyên văn từ mục 10 của CLAUDE.md; chưa có hiệu lực. -->

- **Hồ sơ công ty chủ** (Tour Đảo, vai `OWNER_COMPANY`, migration `0030`): tên/MST/địa chỉ/hotline/email chỉ đọc qua `ownerCompany` của `parties` — `company_profile` đã chết cột pháp lý, đừng đọc lại. Vai này KHÔNG kết thúc được (409); đổi công ty chủ = người giữ `company.legal.write` gán vai cho hồ sơ tổ chức khác. Đổi sang hồ sơ thiếu tên pháp lý/MST/địa chỉ/liên hệ "Hotline" đang dùng bị máy chủ chặn (409 `owner_company_incomplete`); nhưng ĐÓNG liên hệ "Hotline" cuối cùng của công ty chủ hiện tại chưa bị chặn và làm `GET /api/company` 404 → biên nhận báo lỗi (thêm Hotline mới TRƯỚC khi đóng cái cũ). e2e trên D1 chung đừng đổi công ty chủ (không đổi lại được trong ngày). Chi tiết: `docs/CHANGE-GUIDE.md` công thức j, bẫy 48.
- **Giấy tờ của người + chữ `DRIVER`** (ADR-0040, migration `0031`–`0033`): số căn cước / bằng lái **không bao giờ** vào nhật ký, DTO mặc định, câu báo lỗi — chỉ route "xem đủ số" trả số, và ghi nhật ký TRƯỚC; route giấy tờ mới phải thêm ca vào `src/giay-to-khong-lo-so.test.ts`. Gia hạn = dòng mới (không gửi số thì máy chủ chép số cũ); sửa sai chỉ dòng hiện hành, có lý do. Mã QUYỀN `DRIVER` khác mã VAI hồ sơ cũ `DRIVER` (đã ngưng); vai tài xế công ty là `DRIVER_INTERNAL`; tài xế đối tác: vai `DRIVER_EXTERNAL`, quyền `DRIVER_PARTNER` (ADR-0048). Thêm một mã quyền là nhân đôi mọi bài "tập con quyền" (512 hôm nay); thêm mã quyền BÊN NGOÀI thì sửa cả `EXTERNAL_PERMISSIONS` lẫn trigger LC-1 (migration mới). Chi tiết: `docs/CHANGE-GUIDE.md` công thức y.
