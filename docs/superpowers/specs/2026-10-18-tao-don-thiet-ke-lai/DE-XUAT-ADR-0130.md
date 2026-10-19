# Đề xuất ADR-0130: Hàng nhóm dịch vụ chọn MỘT nhóm ở màn Tạo đơn

**Trạng thái: ĐỀ XUẤT, chưa duyệt.** AI soạn, không tự duyệt (Hiến pháp N3). Chủ duyệt thì chép sang `docs/adr/` (đường dẫn này cần hỏi quyền sửa) và đổi Trạng thái. Số 0130 là tạm: 0129 là số lớn nhất đã dùng trên mọi nhánh ngày 18/10/2026; kiểm lại mọi nhánh và worktree ngay trước khi cấp.

- **Ngày:** 2026-10-18. **Loại:** giao diện, đảo được; không chạm dữ liệu máy chủ, quyền, tiền. Không migration.
- **Sửa/bổ sung:** ADR-0058 Điều 8 (bộ lọc ở form đơn) và đợt 1 giao diện Tạo đơn 13/10 (`docs/superpowers/specs/2026-10-13-dot-1-giao-dien-tao-don/README.md` mục 2, điểm 1). Không sửa thân hai hồ sơ đó.

## Bối cảnh

Điều 8 viết "chọn một chip một lúc". Ngày 13/10, theo ý chủ lúc đó, bộ lọc đổi thành nút xổ xuống với bảng tick nhiều nhóm. Ảnh thật 14/10 cho thấy mỗi lần lọc tốn ba chạm và mở bảng thì danh sách dịch vụ biến mất. Ngày 17/10 chủ chốt lại: một hàng nút nhóm, chọn MỘT nhóm, một chạm.

## Quyết định

1. Hàng nút nhóm cuộn ngang trên khung danh sách luôn mở; "Tất cả" đứng đầu, rồi các nhóm theo thứ tự Quản trị đã sắp (`groups` của máy chủ). Chọn MỘT nhóm mỗi lần; chạm là lọc liền, không bảng, không nút "Đóng".
2. Bản nhớ trên máy theo từng tài khoản (khoá `loc-nhom-dv:<mã tài khoản>`) giữ nguyên chỗ lưu. Đọc: lấy nhóm hợp lệ đầu tiên của mảng (bản nhớ cũ có thể nhiều nhóm hoặc một chuỗi); nhóm đã xoá hoặc bộ nhớ bị chặn thì về "Tất cả". Ghi: mảng một phần tử (để bản mã cũ lỡ chạy lại vẫn đọc được).
3. Tìm kiếm tìm trong mọi nhóm; ô tìm chuyển từ trống sang có chữ thì hàng nhóm về "Tất cả"; đã chạm thu hẹp một nhóm thì gõ thêm không nhảy; xoá hết chữ thì về nhóm đã chọn trước khi tìm.
4. Dịch vụ gắn sao: ở "Tất cả" chỉ nằm trong mục "★ Hay dùng"; khi chọn một nhóm thì xếp lên đầu nhóm.
5. Các ý còn lại của Điều 8 giữ nguyên: dịch vụ nhập tay không thuộc nhóm; nhóm "Chưa phân loại" chỉ hiện khi có dịch vụ chưa phân loại; Danh mục (Quản trị) quản nhóm như cũ.

## Hệ quả và cách hoàn tác

Mã đổi ở `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts`. Hoàn tác bằng cách phát hành lại bản trước; bản nhớ ghi dạng mảng nên đọc được ở cả hai phiên bản. Kịch bản Chrome `chip-nhom-smoke` khoá hành vi bảng tick cũ nên được viết lại có chủ đích.
