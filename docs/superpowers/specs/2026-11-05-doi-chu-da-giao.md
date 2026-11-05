# Đổi chữ trạng thái «Đã giao» (2026-11-05)

Hồ sơ có ngày, ghi lại quyết định của chủ để bảng tham chiếu có nguồn ngay trên `main`.

**Quyết định của chủ (5/11/2026, «chốt hướng»; ghi đầu tiên ở `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md` trên nhánh Trả sau; cùng ngày chủ ra lệnh làm ngay):** chữ «Đã giao» trên giao diện đổi thành «Đã thu đủ sau dịch vụ»; chỗ chật ghi «Xong và đủ tiền»; nút ghi «Xác nhận đã thu đủ sau dịch vụ». Mã và cơ sở dữ liệu giữ tên cũ.

**Vì sao:** «Đã giao» dễ bị hiểu là đã giao vé, trong khi bước này nghĩa là đơn đã phục vụ xong và đã thu đủ tiền (ADR-0026 điều 13, ADR-0088).

**Cách làm:** đổi tên thuần theo ADR-0130 (thêm dòng vào bảng từ, không cần ADR mới); thân các ADR cũ không sửa, tên trong ADR-0025 và các ADR sau hiểu là tên cũ của cùng bước.

## Tên nào ở chỗ nào (người thi công tự chọn, chủ xem lại được)

| Chỗ | Chữ |
|---|---|
| Nút trên trang đơn, Hướng dẫn, câu «bấm …» | Xác nhận đã thu đủ sau dịch vụ |
| Huy hiệu trang đơn, biên nhận và ảnh gửi khách, câu báo của máy chủ, nhật ký | Đã thu đủ sau dịch vụ |
| Huy hiệu trên thẻ danh sách đơn, Sổ công nợ, loại phiếu và giai đoạn khoản thu trong sổ | Xong và đủ tiền |

## Cố ý giữ nguyên

- «Đã giao đơn cho … làm Hướng dẫn viên», «vé đã giao cho khách», số «đã giao» ở Kho vé: nghĩa khác.
- «Giảm sau khi giao» trên biên nhận gửi khách: khách đọc được, chờ chủ quyết.
- Câu báo trong trigger của migration (tệp đã áp không sửa được; máy chủ dịch sang câu mới trước khi hiện), mục cũ của nhật ký thay đổi, dòng nhật ký đã ghi.
