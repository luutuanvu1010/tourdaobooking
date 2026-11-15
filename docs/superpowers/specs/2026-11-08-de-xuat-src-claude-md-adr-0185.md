# Đề xuất sửa hai tệp luật sau ADR-0185 (chờ chủ duyệt)

Ngày 8/11/2026, phiên thi công ADR-0185. **Trạng thái: đề xuất, chưa có hiệu lực.** Cả hai tệp dưới đây là tệp luật hoặc tệp máy phải hỏi chủ trước khi sửa (Hiến pháp N9; `.claude/settings.json` mục `ask`), nên AI chỉ đưa câu đề xuất. Chủ đồng ý thì một phiên sau sửa đúng như dưới, bằng công cụ sửa tệp.

## 1. `src/CLAUDE.md`: thêm ngoại lệ «chỉ siết» thứ ba

**Vì sao.** Mục «Quyền và bảo mật» nói vai trò hồ sơ không bao giờ là điều kiện cho phép, rồi liệt kê hai chỗ dùng vai trò chỉ để TỪ CHỐI (công ty chủ, luật bán). ADR-0185 thêm chỗ thứ ba: Nền tảng từ chối xác nhận đơn khi tài khoản Đối tác chưa có vai trò đối tác. Chỗ này không đọc bảng vai (bài `src/architecture.test.ts` vẫn canh), mà đọc kết quả «người hưởng» do phần hoa hồng tính ra, mà kết quả đó lại suy từ vai trò của hồ sơ. Ghi rõ để AI sau không coi đây là kẽ hở, và không dùng cùng đường để CHO thêm quyền.

**Câu đề xuất**, chèn ngay sau câu kết thúc bằng «…không dùng cho tiền khi chưa có ADR (ADR-0152).», trước câu «Chữ `DRIVER` có ở HAI bảng…»:

```diff
 … đặc điểm không phải điều kiện cho phép, không dùng cho tiền khi chưa có ADR (ADR-0152).
+Ngoại lệ chỉ SIẾT thứ ba (ADR-0185): cổng `congDoiTacChuaCoVaiTro` (`orders/xac-nhan-chung.ts`) TỪ CHỐI xác nhận đơn khi người lập giữ quyền Đối tác mà người hưởng do `pricing` tính ra «không người hưởng» (hồ sơ chưa mang vai trò đối tác). `orders` chỉ đọc kết quả người hưởng của `pricing`, không đọc bảng vai, và không nhánh nào dùng kết quả đó để cho thêm quyền. Ở lớp dữ liệu, trigger LC-1c (migration `0149`) và câu kiểm `R-LC-1c` cũng chỉ từ chối: không mở quyền Đối tác cho hồ sơ thiếu vai trò đối tác.
 Chữ `DRIVER` có ở HAI bảng (ADR-0040): …
```

## 2. Bảng tham chiếu ngôn ngữ: bổ sung cột «Thật sự làm gì» của hai nút

**Vì sao.** ADR-0185 (mục «Kế hoạch thi công», ý 4) có nêu bảng tham chiếu. Kế hoạch thi công đã chọn không sửa vì không thêm nút hay tên mới (câu báo chỉ dùng tên nút đã có). Nhưng cột «Thật sự làm gì» của hai nút nay thiếu một hành vi, mà AI sau tin bảng này. Nguồn là `src/shared/bang-tham-chieu-viec.ts` (sửa xong chạy `npm run tham-chieu` để sinh lại `docs/BANG-THAM-CHIEU.md`); không đổi tên nút, không đổi trạng thái.

- **Gửi đơn** (Chi tiết đơn, đơn nháp của Đối tác), thêm vào cuối `thatSuLam`: «Tài khoản Đối tác chưa được gán vai trò đối tác thì máy chủ không gửi: đơn giữ ở dạng nháp và hiện câu báo do chủ chọn (ADR-0185).»
- **Còn vé, xác nhận đơn** (bảng «Xác nhận đơn» của người kiểm vé), thêm vào cuối `thatSuLam`: «Người lập là tài khoản Đối tác chưa được gán vai trò đối tác thì không xác nhận được; câu báo nói ai gán vai trò ở màn Quản lý tài khoản (ADR-0185).»

Nút «Gửi đơn» của màn Tạo đơn không cần sửa: mô tả hiện có («Lưu xong mà gửi hỏng thì đơn vẫn còn ở nháp») vẫn đúng.

## Chủ cần quyết

Đồng ý cả hai, sửa câu chữ, hay bỏ. Không quyết thì Nền tảng vẫn chạy đúng; chỉ tài liệu hướng dẫn AI thiếu hai ghi chú này.
