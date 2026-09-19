# Nhận xét mockup A2 (vòng 1) và prompt sửa vòng 2

Đối tượng: `output/extracted/Mockup A2 - Canvas.dc.html` (12 artboard) + `Mockup A2 - Prototype.dc.html`, xuất từ Claude Design ngày 2026-09-19. Ảnh tổng quan: `output/screens/canvas-xl.png`. Đã xem toàn bộ Canvas; Prototype mới kiểm cấu trúc (chưa bấm thử).

## 1. Kết luận
Bám đúng prompt và token; dùng được làm nền cho spec giao diện A2. Cần sửa **1 lỗi nội dung thật**, vài lỗi bố cục nhỏ, đồng bộ token với bản trên máy, và bổ sung 3 trạng thái còn thiếu. Chưa nên code cho tới khi chủ dự án chốt 3 quyết định ở mục 5.

## 2. Đã đạt
- Đủ 12 artboard: form (1a toàn form, 1b V1 accordion, 1c V2 luôn mở, 1d ba biến thể thẻ, 1e trạng thái thẻ, 1f banner lỗi/xung đột, 1g bản máy tính), trang đơn (1h nháp, 1i thiếu thông tin chuyến, 1j đã xác nhận, 1k bảng sửa thông tin chuyến), 1l bảng token.
- Trong vỏ PWA đã duyệt (thanh navy, nút "‹", thanh tab, nút Lưu dính đáy, tab ẩn ở form).
- Bộ đếm −/+ 44px, có trạng thái 0; ghi chú loại khách ngay cạnh ô; xem trước dòng tiền có đơn giá sửa được; thẻ nhóm chỉ một ô "Số khách" và "7 khách → 2 lượt".
- Hai phương án thông tin chuyến kèm ưu/nhược và đề nghị: V1 (accordion, dòng tóm tắt "20/09 · 07:30 · đón 07:00 · …") cho điện thoại, V2 cho máy tính.
- Bảng token nêu rõ token nào MỚI: `--c-danger*` (#B01235 / #8E0E2B / #FDE9EE / #F1C3CF, chữ trên nền nhạt 8,6:1), `--c-green-border`, `--counter-btn/-field`, `--price-field`, `--safe-*`. San hô chỉ dùng cho "Xác nhận đơn" và nhãn giá; lỗi và "Huỷ đơn" dùng danger.
- Trang đơn: mỗi dịch vụ một khối; banner đỏ liệt kê thiếu theo dịch vụ kèm liên kết "Sửa"; đơn đã xác nhận có biểu tượng khoá; bảng sửa đặt cảnh báo "bản xác nhận đã gửi có thể lỗi thời" lên đầu.

## 3. Lỗi cần sửa (có bằng chứng)
| # | Vị trí | Vấn đề | Sửa |
|---|---|---|---|
| 1 | 1h (B1), Canvas dòng 807 | Nhãn **"Khác giá danh mục"** gắn vào dịch vụ **nhập tay** "Xe đưa đón riêng". Dịch vụ nhập tay không có giá danh mục (`catalogPrice = null`) nên không bao giờ lệch giá. Nếu code theo mockup sẽ sai luật (`priceDeviation`) | Bỏ nhãn ở dịch vụ nhập tay |
| 2 | 1a (thẻ Phao chuối) | Hàng dòng tiền dịch vụ nhóm: "2 lượt ×" gãy thành 3 dòng ở 390px (ở 1d vẫn một dòng, nên chỉ lệch ở 1a) | Cột nhãn đủ rộng hoặc gộp một dòng |
| 3 | 1c | Placeholder ô Ngày check-in bị cắt: "Cùng ngày khởi hì…" | Rút thành "Cùng ngày" |
| 4 | 1g | Lưới 4 cột cắt "Điểm đón": "Khách sạn Su…"; địa điểm là chuỗi dài | Điểm đón và Nơi check-in rộng hết hàng hoặc 2 cột |
| 5 | 1d | Ký hiệu ⌈ ⌉ không có trong font, hiện "[7 / 5]" | Viết chữ: "7 khách ÷ 5 = 2 lượt (làm tròn lên)" |
| 6 | 1l + Design System | Bảng token ghi `--c-surface-alt #EAF2F8`, `--c-border #D3E1EC`, `--c-primary-soft #DCEBF6` là "bản PWA, khác website". **Sai**: đó chính là giá trị trong `tokens.css` của tourdaovn trên máy. Design System của Claude Design (`_ds/.../tokens/colors.css`, tự ghi "nguyên văn tokens.css@main") đang dùng #F8FAFC / #E2E8F0 / #F0F7FC và `--fs-base` 17px, tức lấy từ GitHub `main` cũ hơn bản trên máy | Đồng bộ Design System với `refs/tourdaovn-tokens.css`; sửa ghi chú ở 1l. Kiểm `github.com/luutuanvu1010/tourdaovn`: có thể bản token mới chưa được đẩy lên |
| 7 | chip mã dịch vụ | "TD04" là mã bịa (chỉ `TTB03` là mã thật) | Chỉ minh hoạ; khi code lấy mã từ dữ liệu, không cố định |

## 4. Còn thiếu (chưa có artboard)
1. **Danh sách kết quả khi gõ vào ô "Chọn từ danh mục"**: tên, đơn vị tính, giá người lớn; rỗng ("Không tìm thấy dịch vụ"); dịch vụ ẩn không hiện. Đây là thao tác thêm dịch vụ chính nhưng cả Canvas lẫn Prototype chưa có.
2. **Form khi chưa có dịch vụ nào**: dòng hướng dẫn thay cho danh sách thẻ trống.
3. **Trang đơn "Đã huỷ"** (huy hiệu xám, không nút, số liệu chỉ đọc) và trạng thái **đang lưu / khoá nút**.

## 5. Quyết định cần chủ dự án chốt
1. **Thông tin chuyến**: V1 (accordion, thu gọn) cho điện thoại, V2 (luôn mở) cho máy tính — như designer đề nghị? Đề xuất của tôi: đồng ý, vì đơn nhiều dịch vụ trên iPhone sẽ dài; đã thử ở 1a (đơn 3 dịch vụ) và vẫn đọc được.
2. **Token màu nguy hiểm mới `--c-danger*`** (#B01235 hồng đào lạnh, tách hẳn san hô). Tourdaovn ghi thêm hệ màu mới là quyết định của chủ dự án. Đề xuất: duyệt, vì app cần lỗi/huỷ và san hô đã giữ vai "hành động chốt".
3. **Nguồn token cho các vòng sau**: cập nhật GitHub `tourdaovn` (hoặc đính kèm `tokens.css` mới nhất) để Design System không lệch bản trên máy.

## 6. Prompt sửa vòng 2 (dán vào cuộc trò chuyện Claude Design hiện có)
```
Cập nhật "Mockup A2 - Canvas" theo các điểm sau, giữ nguyên mọi thứ khác đã duyệt (V1 accordion cho điện thoại, V2 cho máy tính, token danger mới).

SỬA
1. Ở 1h (B1): bỏ nhãn "Khác giá danh mục" khỏi dịch vụ NHẬP TAY "Xe đưa đón riêng". Quy tắc: nhãn chỉ có ở dịch vụ TỪ DANH MỤC khi đơn giá ≠ giá danh mục; dịch vụ nhập tay không có giá danh mục nên không bao giờ có nhãn này.
2. Dòng tiền của dịch vụ theo nhóm ở 1a (thẻ Phao chuối): "2 lượt ×" đang gãy 3 dòng ở 390px — đưa về một dòng "2 lượt × [ô giá] ₫" (cho cột nhãn rộng đủ hoặc rút chữ).
3. Ô Ngày check-in ở 1c: placeholder rút thành "Cùng ngày" (đang bị cắt).
4. Bản máy tính 1g: "Điểm đón" và "Nơi check-in" phải rộng hết hàng hoặc 2 cột, không để lưới 4 cột cắt chữ.
5. Thay ký hiệu ⌈ ⌉ (font không có) bằng chữ: "7 khách ÷ 5 = 2 lượt (làm tròn lên)".
6. Đồng bộ token với tệp tokens.css đính kèm (bản MỚI NHẤT của tourdaovn): --c-primary-soft #DCEBF6, --c-surface-alt #EAF2F8, --c-border #D3E1EC, --fs-base 19px (chỉ để tham chiếu — app nội bộ vẫn dùng 16px). Đây là giá trị chính của tourdaovn, KHÔNG phải "bản PWA khác website": sửa bảng token ở 1l và bỏ ghi chú đó; cập nhật Design System trong project cho khớp.

THÊM
7. Artboard "Chọn từ danh mục": ô tìm đang gõ "phao" với danh sách kết quả (tên dịch vụ, chip đơn vị "theo người / theo nhóm 5 khách/lượt", giá người lớn); một trạng thái rỗng "Không tìm thấy dịch vụ"; ghi chú: dịch vụ đã ẩn không hiện trong kết quả. Chạm một kết quả thì thêm thẻ dịch vụ mới (mở sẵn phần số khách).
8. Form khi CHƯA có dịch vụ nào: dòng hướng dẫn "Chưa có dịch vụ. Chọn từ danh mục hoặc thêm dịch vụ nhập tay." thay cho danh sách thẻ.
9. Trang đơn ĐÃ HUỶ: huy hiệu xám ("Đã huỷ"), không có nút hành động, số liệu chỉ đọc kèm biểu tượng khoá.
10. Trạng thái đang lưu: nút "Lưu đơn nháp" đổi thành "Đang lưu…" và vô hiệu, các ô nhập khoá.

Sau khi sửa, cập nhật bảng token 1l (đánh dấu lại token MỚI).
```

## 7. Bước tiếp theo (sau khi chủ dự án chốt mục 5 và vòng 2 xong)
1. Viết đặc tả giao diện A2 (bổ sung spec §5: thẻ dịch vụ, trang đơn, bảng sửa; token MỚI; bản đồ thành phần ↔ dữ liệu theo DTO `OrderServiceDto`).
2. Quyết định nền thi công: hợp nhánh PWA iPhone (`worktree-pwa-iphone`) với A1 trước, rồi làm A2 trên nền đó (tránh xung đột `public/app.css`, `web/shell.ts`, `web/order*.ts`).
3. Lập kế hoạch A2 bằng `superpowers:writing-plans`.
