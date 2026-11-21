# Trang ghép — ADR-0233 (Việc 14: ô tệp phiếu đăng ký theo vai)

> Hồ sơ có ngày (21/11/2026), kèm ADR-0233 theo CLAUDE.md §9 «bước ghép khi duyệt»: bảng dùng chung `pty_registration_attachment` / `pty_attachment` nhận thêm một loại dữ liệu («Tệp khác»).

**1. Bảng chứa những gì.**
- `pty_registration_attachment` (tệp chờ của phiếu, `parties` giữ): hôm nay bốn ô — căn cước hai mặt (người), GPKD và giấy phép thêm (tổ chức). Thêm: `TEP_KHAC` (người), `TEP_KHAC_TO_CHUC` (tổ chức). Cùng bốn loại tệp, cùng trần cỡ.
- `pty_attachment` (tệp của hồ sơ): sau duyệt, `TEP_KHAC` thành tệp của hồ sơ NGƯỜI nối dòng căn cước; `TEP_KHAC_TO_CHUC` thành tệp của hồ sơ TỔ CHỨC nối dòng GPKD. Không loại nối mới.
- `dk_role_slot` (mới, `dang-ky` giữ): chỉ cấu hình, không dữ liệu cá nhân.

**2. Dòng bản đồ quyền chạm các bảng này.** Không thêm, không đổi ô quyền nào.
- Người đăng ký (cookie đăng ký, route công khai): tải / gỡ tệp vào ô thuộc phiếu của mình — nay ô hợp lệ đọc từ `dk_role_slot` thay vì hằng. Vẫn không có route đọc tệp bằng cookie đăng ký.
- Người xác minh / người duyệt (`registration.verify`, `registration.approve` — ADR-0219): xem tệp chờ của phiếu như hôm nay; «Tệp khác» đi cùng đường.
- Người xem hồ sơ sau duyệt: theo quyền xem giấy tờ của hồ sơ người / tổ chức hiện có (tệp khác nằm dưới dòng giấy tờ chính nên KHÔNG ai thấy nó mà không thấy được căn cước / GPKD).

**3. Cổng nào canh cửa nào.**
- Máy chủ: `POST /api/dang-ky/phieu/tep` (ô thuộc phiếu theo vai + phần tổ chức mở + «Tệp khác» chỉ khi chính sách riêng tư hiện hành có dấu `covers_other_files`); `POST /api/dang-ky/phieu/gui` (đủ ô bắt buộc, không còn tệp ở ô ngoài phiếu); lô duyệt (danh sách ô của phần tổ chức lấy từ một tệp thuần dùng chung, không chép tay).
- Giao diện (chỉ ẩn/hiện, máy chủ kiểm lại): trang đăng ký vẽ ô theo danh sách máy chủ trả trong cấu hình công khai; hàng chờ xác minh hiện nhãn ô. Trang đăng chính sách riêng tư thêm ô tích «Bản này nêu việc thu tệp khác» — đổi nghĩa chỗ ẩn/hiện: tích ô này là MỞ ô «Tệp khác» cho người lạ.
