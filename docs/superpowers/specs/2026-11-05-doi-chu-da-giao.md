# Đổi chữ trạng thái «Đã giao» (2026-11-05)

Hồ sơ có ngày, ghi lại quyết định của chủ để bảng tham chiếu có nguồn ngay trên `main`.

**Quyết định cuối của chủ (5/11/2026):** bước này hiện cho người dùng là **«Xong và đủ tiền»**, ở mọi chỗ, không tách tên dài và tên ngắn. Chủ chọn trong hộp hỏi, sau khi nhận xét nguyên văn: *«chữ "Đã thu đủ sau dịch vụ" là một câu rất tối nghĩa»*. Mã và cơ sở dữ liệu giữ tên cũ.

**Lịch sử trong ngày:** trước đó chủ «chốt hướng» bộ ba tên: «Đã thu đủ sau dịch vụ», chỗ chật «Xong và đủ tiền», nút «Xác nhận đã thu đủ sau dịch vụ» (`docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`, nhánh Trả sau). Tên dài chưa từng lên production và nay bị cấm trong bảng từ.

**Vì sao đổi:** «Đã giao» dễ bị hiểu là đã giao vé. Bản chất bước này là đơn đã phục vụ xong và khách đã trả đủ tiền (ADR-0026 điều 13, ADR-0088). «sau dịch vụ» lại gợi ý tiền thu sau tour, trong khi khách trả trước đủ vẫn qua bước này.

**Cách làm:** đổi tên thuần theo ADR-0130 (thêm dòng vào bảng từ, không cần ADR mới); thân các ADR cũ không sửa, «Đã giao» trong ADR là tên cũ của cùng bước.

## Tên ở từng chỗ

| Chỗ | Chữ |
|---|---|
| Trạng thái ở mọi màn, biên nhận, ảnh gửi khách, nhật ký, sổ | Xong và đủ tiền |
| Nút trên trang đơn; câu «bấm …» trong Hướng dẫn và câu báo (người thi công viết, theo đề xuất chủ đã đọc) | Xác nhận xong và đủ tiền |
| Câu «chưa Đã giao» (người thi công viết) | chưa tới bước Xong và đủ tiền |

## Cố ý giữ nguyên

- «Đã giao đơn cho … làm Hướng dẫn viên», «vé đã giao cho khách», số «đã giao» ở Kho vé: nghĩa khác.
- «Giảm sau khi giao» trên biên nhận gửi khách: khách đọc được, chờ chủ quyết.
- Câu báo trong trigger của migration (tệp đã áp không sửa được; máy chủ dịch sang câu mới trước khi hiện), mục cũ của nhật ký thay đổi, dòng nhật ký đã ghi.
