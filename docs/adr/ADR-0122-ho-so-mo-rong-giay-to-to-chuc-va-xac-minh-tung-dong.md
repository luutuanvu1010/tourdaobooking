# ADR-0122 — Hồ sơ mở rộng, giấy tờ tổ chức là dữ liệu, xác minh theo từng dòng

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt lượt 3"* (văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-H1; "H1" là số giữ chỗ, nay là 0122). Điều kiện trước (lượt 2, Hiến chương 5.20–5.25) đã duyệt cùng ngày.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (dữ liệu, quyền). **Cửa một chiều** (bảng chỉ-thêm có dữ liệu thật). Cần người kiểm độc lập sau khi thi công; cần trang ghép (`docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/TRANG-GHEP.md`).
- **Quan hệ với ADR cũ:** bổ sung ADR-0010 (hồ sơ bên) và ADR-0040 D2 (giấy tờ của người); không sửa câu nào của hai ADR đó. ADR-0010 điều 2 (không dựng `party_site`) giữ nguyên.
- **Xây trên lỗ đang hở:** không có (không có mục HIGH ở `parties`).
- **Hiến chương áp:** 2.1, 2.2, 4.1, 5.1, 5.2, 5.5, 5.12, 5.20, 5.23. **Lệch có chủ ý:** không.

## Bối cảnh
Chủ cần đủ thông tin để lập hoá đơn, áp chính sách đại lý và chống mạo danh. Hồ sơ hiện thiếu ngày sinh, địa chỉ cá nhân, giấy tờ của tổ chức, và không có khái niệm "đã xác minh".

## Quyết định
1. Ngày sinh là cột `pty_person.birth_date`; địa chỉ cá nhân là loại liên hệ `ADDRESS` (một dòng dữ liệu). Địa chỉ pháp lý và mã số thuế của tổ chức giữ ở `pty_organization` (một nơi, N7).
2. Bảng tra cứu `pty_organization_document_type` (Quản trị sửa) và bảng `pty_organization_document` theo đúng khuôn `pty_person_document` (ADR-0040 D2): gia hạn là dòng mới, huỷ dòng nhầm, không xoá, trigger "một số giấy phép kinh doanh một tổ chức", ngày cấp và nơi cấp nằm trên dòng. Số giấy phép kinh doanh lệch mã số thuế thì đánh cờ cho người xác minh.
3. Kết quả xác minh là bảng chỉ-thêm `pty_verification` theo từng dòng (giấy tờ, liên hệ, thuộc tính). Sửa giá trị đã xác minh thì ghi `CAN_XAC_MINH_LAI` cùng lô. Người xác minh khác người khai, cộng luật tách nhiệm vụ ở ADR-H5 (đề xuất, lượt 4, chưa duyệt).
4. Mọi cột mới mang hạng N0–N4 trong sổ dữ liệu (Hiến chương 5.20); thiếu hạng thì bài kiểm đỏ.
5. **Siết đường đọc:** ngày sinh và liên hệ `ADDRESS` **không** vào DTO của ô `party.view` (Bán hàng, Kế toán đang xem được mọi hồ sơ). Chỉ trả cho chính chủ hoặc người giữ ô mới `party.personal.view` (Quản trị, Toàn quyền). `party.write` không ghi hai trường này khi không giữ ô đó.
6. Mở rộng kiểu viết cứng `ContactKind` (`parties/rules.ts`) và `ContactPointDto.kind` (`contracts.ts`) cho `ADDRESS`. Không dựng `party_site`.

## Hệ quả
Người đang xem hồ sơ bằng `party.view` (Bán hàng, Kế toán) không thấy thêm trường mới: đây là lựa chọn có chủ ý để không mở rộng phạm vi xem của họ. Dữ liệu ngày sinh và địa chỉ chỉ có từ lúc người dùng tự khai (ADR-H3, lượt 4) nên bảng mới ban đầu rỗng.

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau, cho từng bảng, trigger, cột mới; thiếu hạng N0–N4 thì đỏ.
- Bán hàng và Kế toán gọi API hồ sơ: không thấy `birth_date` và `ADDRESS` trong phản hồi; Quản trị và Toàn quyền thấy.
- `party.write` của người không giữ `party.personal.view` ghi hai trường đó thì bị từ chối.
- Gia hạn giấy tờ tổ chức tạo dòng mới, không sửa dòng cũ; trùng số giấy phép bị trigger chặn.
- Nhật ký của mọi thao tác ở đây không chứa số giấy tờ, ngày sinh, địa chỉ; `audit-invariants` và bài `giay-to-khong-lo-so` xanh.
